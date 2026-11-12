import { API_BASE_URL, resolveAssetUrl } from '../config';
import type { UploadImageFile } from '../utils/feedback';
import { RequestError, responseErrorMessage } from './errors';
import { ensureAccessToken } from './identity';
import { get, post } from './request';
import type {
	ApiEnvelope,
	FeedbackCategory,
	FeedbackDetail,
	FeedbackListPage,
	FeedbackMessage,
	FeedbackReadResult,
	FeedbackReplyResult,
} from './types';

const FEEDBACK_PATH = '/api/user/feedback';

export type FeedbackFilter = 'all' | 'unread';

export type UploadProgressHandler = (percent: number) => void;

export interface FeedbackListQuery {
	page?: number;
	filter?: FeedbackFilter;
}

export interface CreateFeedbackPayload {
	category: FeedbackCategory;
	title: string;
	content: string;
	images?: UploadImageFile[];
}

export interface AppendFeedbackMessagePayload {
	content?: string;
	images?: UploadImageFile[];
}

function assertSuccess<T>(response: ApiEnvelope<T>, fallback: string): T {
	if (response?.status !== 0) {
		throw new RequestError(
			response?.msg || response?.message || fallback,
			response?.code,
			response,
		);
	}

	return response.data;
}

function normalizeMessage(message: FeedbackMessage): FeedbackMessage {
	return {
		...message,
		images: (message.images ?? []).map((image) => ({
			...image,
			url: resolveAssetUrl(image.url),
		})),
	};
}

function parseUploadBody(data: unknown): unknown {
	if (typeof data !== 'string') return data;

	try {
		return JSON.parse(data);
	} catch {
		return data;
	}
}

function isSuccessEnvelope(value: unknown): boolean {
	return Boolean(value)
		&& typeof value === 'object'
		&& (value as { status?: unknown }).status === 0;
}

/**
 * H5 multipart 上传。仅本模块使用，不修改全局 JSON 请求封装。
 */
function uploadMultipart<T>(
	path: string,
	fields: Record<string, string>,
	files: UploadImageFile[],
	onProgress?: UploadProgressHandler,
): Promise<T> {
	return (async () => {
		const token = await ensureAccessToken();

		if (!token) {
			throw new RequestError('登录状态已失效，请重新登录', 401);
		}

		return new Promise<T>((resolve, reject) => {
			const task = uni.uploadFile({
				url: `${API_BASE_URL.replace(/\/$/, '')}${path}`,
				files: files.map((file, index) => ({
					name: `images[${index}]`,
					uri: file.path ?? '',
					file,
				})),
				formData: fields,
				header: {
					Accept: 'application/json',
					Authorization: `Bearer ${token}`,
				},
				timeout: 60000,
				success: (result) => {
					const parsed = parseUploadBody(result.data);

					if (
						result.statusCode >= 200
						&& result.statusCode < 300
						&& isSuccessEnvelope(parsed)
					) {
						resolve((parsed as ApiEnvelope<T>).data);
						return;
					}

					reject(
						new RequestError(
							responseErrorMessage(parsed)
								|| `接口请求失败（HTTP ${result.statusCode}）`,
							result.statusCode,
							parsed,
						),
					);
				},
				fail: (error) => {
					reject(new RequestError(error.errMsg || '网络请求失败'));
				},
			});

			if (onProgress) {
				task.onProgressUpdate((event) => onProgress(event.progress));
			}
		});
	})();
}

export async function getFeedbackList(
	query: FeedbackListQuery = {},
): Promise<FeedbackListPage> {
	const response = await get<ApiEnvelope<FeedbackListPage>>(FEEDBACK_PATH, {
		page: query.page && query.page > 0 ? query.page : 1,
		filter: query.filter ?? 'all',
	});

	return assertSuccess(response, '获取意见反馈列表失败');
}

export async function getFeedbackDetail(id: number): Promise<FeedbackDetail> {
	const response = await get<ApiEnvelope<FeedbackDetail>>(`${FEEDBACK_PATH}/${id}`);
	const detail = assertSuccess(response, '获取意见反馈详情失败');

	return {
		...detail,
		messages: (detail.messages ?? []).map(normalizeMessage),
	};
}

export async function createFeedback(
	payload: CreateFeedbackPayload,
	onProgress?: UploadProgressHandler,
): Promise<number> {
	const images = payload.images ?? [];

	if (!images.length) {
		const response = await post<ApiEnvelope<{ id: number }>, Record<string, unknown>>(
			FEEDBACK_PATH,
			{
				category: payload.category,
				title: payload.title,
				content: payload.content,
				client_type: 'h5',
			},
		);

		return assertSuccess(response, '提交意见反馈失败')?.id ?? 0;
	}

	const result = await uploadMultipart<{ id: number }>(
		FEEDBACK_PATH,
		{
			category: String(payload.category),
			title: payload.title,
			content: payload.content,
			client_type: 'h5',
		},
		images,
		onProgress,
	);

	return result?.id ?? 0;
}

export async function appendFeedbackMessage(
	id: number,
	payload: AppendFeedbackMessagePayload,
	onProgress?: UploadProgressHandler,
): Promise<FeedbackReplyResult> {
	const content = (payload.content ?? '').trim();
	const images = payload.images ?? [];

	if (!content && !images.length) {
		throw new RequestError('请输入回复内容或至少上传一张图片');
	}

	const path = `${FEEDBACK_PATH}/${id}/messages`;

	if (!images.length) {
		const response = await post<
			ApiEnvelope<FeedbackReplyResult>,
			{ content: string }
		>(path, { content });
		const result = assertSuccess(response, '回复提交失败');

		return { ...result, message: normalizeMessage(result.message) };
	}

	const result = await uploadMultipart<FeedbackReplyResult>(
		path,
		content ? { content } : {},
		images,
		onProgress,
	);

	return { ...result, message: normalizeMessage(result.message) };
}

export async function markFeedbackRead(
	id: number,
	throughMessageId: number,
): Promise<FeedbackReadResult> {
	const response = await post<
		ApiEnvelope<FeedbackReadResult>,
		{ through_message_id: number }
	>(`${FEEDBACK_PATH}/${id}/read`, { through_message_id: throughMessageId });

	return assertSuccess(response, '标记已读失败');
}
