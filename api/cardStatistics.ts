import { get, put } from './request';
import { RequestError } from './errors';
import type {
	ApiEnvelope,
	CardStatisticsPayload,
	CardStatisticsRoleResponse,
	CardStatisticsSaveResult,
} from './types';

function assertSuccess<T>(response: ApiEnvelope<T>, fallback: string): T {
	if (!response || response.status !== 0) {
		throw new RequestError(
			response?.msg || response?.message || fallback,
			response?.code,
			response,
		);
	}
	return response.data;
}

export async function getCardStatisticsRoles(
	accountId: number,
	year?: number,
): Promise<CardStatisticsRoleResponse> {
	const response = await get<ApiEnvelope<CardStatisticsRoleResponse>>(
		'/api/user/card-statistics/roles',
		year === undefined ? { account_id: accountId } : { account_id: accountId, year },
	);
	return assertSuccess(response, '获取抽卡统计角色失败');
}

export async function saveCardStatistics(
	payload: CardStatisticsPayload,
): Promise<CardStatisticsSaveResult> {
	const response = await put<
		ApiEnvelope<CardStatisticsSaveResult>,
		CardStatisticsPayload
	>('/api/user/card-statistics', payload);
	return assertSuccess(response, '保存抽卡统计失败');
}
