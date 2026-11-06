import { RequestError } from './errors';
import { post } from './request';
import type {
	ApiEnvelope,
	SystemTripleCombination,
	SystemTripleRequest,
} from './types';

const SYSTEM_TRIPLE_URL = '/api/user/game/teams/triple/system';
const PREVIOUS_MONTH_SYSTEM_TRIPLE_URL =
	'/api/user/game/teams/triple/system/previous-month';
const USER_TRIPLE_URL = '/api/user/game/teams/triple/user';

export async function getSystemTripleCombinations(
	payload: SystemTripleRequest,
): Promise<SystemTripleCombination[]> {
	return requestSystemTriple(
		SYSTEM_TRIPLE_URL,
		payload,
		'获取系统三刀组合失败',
	);
}

export async function getPreviousMonthSystemTripleCombinations(
	payload: SystemTripleRequest,
): Promise<SystemTripleCombination[]> {
	return requestSystemTriple(
		PREVIOUS_MONTH_SYSTEM_TRIPLE_URL,
		payload,
		'获取上月系统三刀组合失败',
	);
}

export async function getUserTripleCombinations(
	payload: SystemTripleRequest,
): Promise<SystemTripleCombination[]> {
	return requestSystemTriple(
		USER_TRIPLE_URL,
		payload,
		'获取用户三刀组合失败',
	);
}

async function requestSystemTriple(
	url: string,
	payload: SystemTripleRequest,
	fallbackMessage: string,
): Promise<SystemTripleCombination[]> {
	const response = await post<
		ApiEnvelope<SystemTripleCombination[]>,
		SystemTripleRequest
	>(url, payload);

	if (response?.status !== 0 || !Array.isArray(response.data)) {
		throw new RequestError(
			response?.msg || response?.message || fallbackMessage,
			response?.code,
			response,
		);
	}

	return response.data;
}
