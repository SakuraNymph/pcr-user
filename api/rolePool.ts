import { del, get, post, put } from './request';
import { RequestError } from './errors';
import type { ApiEnvelope, UserRolePool, UserRolePoolPayload } from './types';

function assertSuccess<T>(response: ApiEnvelope<T>, fallback: string): T {
	if (!response || response.status !== 0) {
		throw new RequestError(response?.msg || response?.message || fallback, response?.code, response);
	}
	return response.data;
}

export async function getRolePools(): Promise<UserRolePool[]> {
	const response = await get<ApiEnvelope<UserRolePool[]>>('/api/user/role-pools');
	const pools = assertSuccess(response, '获取账号列表失败');
	if (!Array.isArray(pools)) {
		throw new RequestError('账号列表接口返回的数据格式不正确');
	}
	return pools;
}

export async function getRolePool(id: number): Promise<UserRolePool> {
	const response = await get<ApiEnvelope<UserRolePool>>(`/api/user/role-pools/${id}`);
	return assertSuccess(response, '获取账号详情失败');
}

export async function createRolePool(payload: UserRolePoolPayload): Promise<UserRolePool> {
	const response = await post<ApiEnvelope<UserRolePool>, UserRolePoolPayload>(
		'/api/user/role-pools',
		payload,
	);
	return assertSuccess(response, '添加账号失败');
}

export async function updateRolePool(
	id: number,
	payload: UserRolePoolPayload,
): Promise<UserRolePool> {
	const response = await put<ApiEnvelope<UserRolePool>, UserRolePoolPayload>(
		`/api/user/role-pools/${id}`,
		payload,
	);
	return assertSuccess(response, '修改账号失败');
}

export async function deleteRolePool(id: number): Promise<void> {
	const response = await del<ApiEnvelope<null>>(`/api/user/role-pools/${id}`);
	assertSuccess(response, '删除账号失败');
}
