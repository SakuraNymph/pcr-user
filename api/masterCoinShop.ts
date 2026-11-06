import { get, put } from './request';
import { RequestError } from './errors';
import type {
	ApiEnvelope,
	MasterCoinShopPoolConfig,
	MasterCoinShopRole,
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

export async function getMasterCoinShopRoles(): Promise<MasterCoinShopRole[]> {
	const response = await get<ApiEnvelope<MasterCoinShopRole[]>>(
		'/api/user/master-coin-shop/roles',
	);
	const roles = assertSuccess(response, '获取大师币角色失败');
	if (!Array.isArray(roles)) {
		throw new RequestError('大师币角色接口返回的数据格式不正确');
	}
	return roles;
}

export async function getPoolMasterCoinShop(
	poolId: number,
): Promise<MasterCoinShopPoolConfig> {
	const response = await get<ApiEnvelope<MasterCoinShopPoolConfig>>(
		`/api/user/role-pools/${poolId}/master-coin-shop`,
	);
	return assertSuccess(response, '获取大师币配置失败');
}

export async function updatePoolMasterCoinShop(
	poolId: number,
	roles: number[],
): Promise<MasterCoinShopPoolConfig> {
	const response = await put<
		ApiEnvelope<MasterCoinShopPoolConfig>,
		{ roles: number[] }
	>(`/api/user/role-pools/${poolId}/master-coin-shop`, { roles });
	return assertSuccess(response, '保存大师币配置失败');
}
