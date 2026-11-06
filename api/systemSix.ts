import { RequestError } from './errors';
import { request } from './request';
import type {
	ApiEnvelope,
	SystemSixHitPackage,
	SystemSixHitRequest,
} from './types';

const CURRENT_SYSTEM_SIX_URL = '/api/user/game/teams/six/system';
const PREVIOUS_MONTH_SYSTEM_SIX_URL =
	'/api/user/game/teams/six/system/previous-month';

export async function getCurrentSystemSixHitPackages(
	payload: SystemSixHitRequest,
): Promise<SystemSixHitPackage[]> {
	return requestSystemSix(
		CURRENT_SYSTEM_SIX_URL,
		payload,
		'获取本月系统六刀组合失败',
	);
}

export async function getPreviousMonthSystemSixHitPackages(
	payload: SystemSixHitRequest,
): Promise<SystemSixHitPackage[]> {
	return requestSystemSix(
		PREVIOUS_MONTH_SYSTEM_SIX_URL,
		payload,
		'获取上月系统六刀组合失败',
	);
}

async function requestSystemSix(
	url: string,
	payload: SystemSixHitRequest,
	fallbackMessage: string,
): Promise<SystemSixHitPackage[]> {
	const response = await request<
		ApiEnvelope<SystemSixHitPackage[]>,
		SystemSixHitRequest
	>({
		url,
		method: 'POST',
		data: payload,
		timeout: 60000,
	});

	if (response?.status !== 0 || !Array.isArray(response.data)) {
		throw new RequestError(
			response?.msg || response?.message || fallbackMessage,
			response?.code,
			response,
		);
	}

	return response.data;
}
