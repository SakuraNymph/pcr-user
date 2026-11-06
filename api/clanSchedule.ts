import { del, get, post, put } from './request';
import { RequestError } from './errors';
import type {
	ApiEnvelope,
	ClanScheduleData,
	ClanScheduleList,
	ClanSchedulePayload,
} from './types';

function assertSuccess<T>(
	response: ApiEnvelope<T>,
	fallback: string,
): T {
	if (!response || response.status !== 0) {
		throw new RequestError(
			response?.msg || response?.message || fallback,
			response?.code,
			response,
		);
	}

	return response.data;
}

export async function getClanSchedule(): Promise<ClanScheduleData> {
	const response = await get<ApiEnvelope<ClanScheduleData>>(
		'/api/user/clan-schedule',
	);

	return assertSuccess(response, '获取排刀表失败');
}

export async function saveClanSchedule(
	payload: ClanSchedulePayload,
): Promise<ClanScheduleData> {
	const response = await put<
		ApiEnvelope<ClanScheduleData>,
		ClanSchedulePayload
	>('/api/user/clan-schedule', payload);

	return assertSuccess(response, '保存排刀表失败');
}

export async function clearClanSchedule(): Promise<void> {
	const response = await del<ApiEnvelope<null>>(
		'/api/user/clan-schedule',
	);

	assertSuccess(response, '清空排刀表失败');
}

export async function getClanScheduleList(): Promise<ClanScheduleList> {
	const response = await get<ApiEnvelope<ClanScheduleList>>(
		'/api/user/clan-schedules',
	);

	return assertSuccess(response, '获取排刀表列表失败');
}

export async function generateClanScheduleShareCode(): Promise<ClanScheduleData> {
	const response = await post<ApiEnvelope<ClanScheduleData>>(
		'/api/user/clan-schedules/share-code',
	);

	return assertSuccess(response, '生成分享码失败');
}

export async function joinClanSchedule(
	shareCode: string,
): Promise<ClanScheduleData> {
	const response = await post<
		ApiEnvelope<ClanScheduleData>,
		{ share_code: string }
	>('/api/user/clan-schedules/join', {
		share_code: shareCode,
	});

	return assertSuccess(response, '加入排刀表失败');
}

export async function getSharedClanSchedule(
	scheduleId: number,
): Promise<ClanScheduleData> {
	const response = await get<ApiEnvelope<ClanScheduleData>>(
		`/api/user/clan-schedules/${scheduleId}`,
	);

	return assertSuccess(response, '获取共享排刀表失败');
}

export async function saveSharedClanSchedule(
	scheduleId: number,
	payload: ClanSchedulePayload,
): Promise<ClanScheduleData> {
	const response = await put<
		ApiEnvelope<ClanScheduleData>,
		ClanSchedulePayload
	>(`/api/user/clan-schedules/${scheduleId}`, payload);

	return assertSuccess(response, '保存共享排刀表失败');
}

export async function clearSharedClanSchedule(
	scheduleId: number,
): Promise<void> {
	const response = await del<ApiEnvelope<null>>(
		`/api/user/clan-schedules/${scheduleId}`,
	);

	assertSuccess(response, '清空共享排刀表失败');
}

export async function leaveSharedClanSchedule(
	scheduleId: number,
): Promise<void> {
	const response = await del<ApiEnvelope<null>>(
		`/api/user/clan-schedules/${scheduleId}/membership`,
	);

	assertSuccess(response, '退出共享排刀表失败');
}
