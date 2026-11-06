import { API_BASE_URL, resolveAssetUrl } from '../config';
import { ensureAccessToken } from './identity';
import { RequestError, responseErrorMessage } from './errors';
export { RequestError } from './errors';

export type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface RequestOptions<TData = unknown> {
	url: string;
	method?: RequestMethod;
	data?: TData;
	header?: Record<string, string>;
	timeout?: number;
}

function getApiUrl(path: string): string {
	return `${API_BASE_URL.replace(/\/$/, '')}${path}`;
}

function normalizeBackendUrls<T>(value: T): T {
	if (typeof value === 'string') {
		return resolveAssetUrl(value) as T;
	}
	if (Array.isArray(value)) {
		return value.map((item) => normalizeBackendUrls(item)) as T;
	}
	if (value && typeof value === 'object') {
		const normalized: Record<string, unknown> = {};
		for (const [key, item] of Object.entries(value)) {
			normalized[key] = normalizeBackendUrls(item);
		}
		return normalized as T;
	}
	return value;
}

export async function request<TResponse, TData = unknown>(
	options: RequestOptions<TData>,
): Promise<TResponse> {
	const token = await ensureAccessToken();

	return new Promise<TResponse>((resolve, reject) => {
		uni.request({
			url: getApiUrl(options.url),
			method: options.method || 'GET',
			data: options.data,
			header: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				...options.header,
				...(token ? { Authorization: `Bearer ${token}` } : {}),
			},
			timeout: options.timeout || 15000,
			success: (response) => {
				if (response.statusCode >= 200 && response.statusCode < 300) {
					resolve(normalizeBackendUrls(response.data as TResponse));
					return;
				}

				reject(
					new RequestError(
						responseErrorMessage(response.data) ||
							`接口请求失败（HTTP ${response.statusCode}）`,
						response.statusCode,
						response.data,
					),
				);
			},
			fail: (error) => reject(new RequestError(error.errMsg || '网络请求失败')),
		});
	});
}

export function get<TResponse>(
	url: string,
	data?: Record<string, string | number | boolean>,
): Promise<TResponse> {
	return request<TResponse>({ url, method: 'GET', data });
}

export function post<TResponse, TData = Record<string, unknown>>(
	url: string,
	data?: TData,
): Promise<TResponse> {
	return request<TResponse, TData>({ url, method: 'POST', data });
}

export function put<TResponse, TData = Record<string, unknown>>(
	url: string,
	data?: TData,
): Promise<TResponse> {
	return request<TResponse, TData>({ url, method: 'PUT', data });
}

export function del<TResponse>(url: string): Promise<TResponse> {
	return request<TResponse>({ url, method: 'DELETE' });
}
