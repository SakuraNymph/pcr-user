import { del, get, post, put, RequestError } from './request';
import type { ApiEnvelope, CreateCustomTeamPayload, Team } from './types';

export function getTeams(): Promise<ApiEnvelope<Team[]>> {
	return get<ApiEnvelope<Team[]>>('/api/game/teams');
}

export function getUserTeams(): Promise<ApiEnvelope<Team[]>> {
	return get<ApiEnvelope<Team[]>>('/api/user/teams');
}

function assertMutationSuccess(response: ApiEnvelope<unknown> | undefined, fallback: string): void {
	if (response && typeof response.status === 'number' && response.status !== 0) {
		throw new RequestError(response.msg || response.message || fallback, response.code, response);
	}
}

export async function addSystemTeamFavorite(
	systemTeamId: string | number,
	missingRoleId?: string | number,
): Promise<void> {
	const data = missingRoleId === undefined ? {} : { missing_role_id: missingRoleId };
	const response = await post<ApiEnvelope<unknown>, typeof data>(
		`/api/user/teams/from-system/${encodeURIComponent(String(systemTeamId))}`,
		data,
	);
	assertMutationSuccess(response, '收藏失败');
}

export async function removeSystemTeamFavorite(systemTeamId: string | number): Promise<void> {
	const response = await del<ApiEnvelope<unknown>>(
		`/api/user/teams/from-system/${encodeURIComponent(String(systemTeamId))}`,
	);
	assertMutationSuccess(response, '取消收藏失败');
}

export async function createCustomTeam(payload: CreateCustomTeamPayload): Promise<void> {
	const response = await post<ApiEnvelope<unknown>, CreateCustomTeamPayload>(
		'/api/user/teams/custom',
		payload,
	);
	assertMutationSuccess(response, '添加作业失败');
}

export async function updateCustomTeam(
	teamId: string | number,
	payload: CreateCustomTeamPayload,
): Promise<void> {
	const response = await put<ApiEnvelope<unknown>, CreateCustomTeamPayload>(
		`/api/user/teams/custom/${encodeURIComponent(String(teamId))}`,
		payload,
	);
	assertMutationSuccess(response, '修改作业失败');
}

export async function deleteCustomTeam(teamId: string | number): Promise<void> {
	const response = await del<ApiEnvelope<unknown>>(
		`/api/user/teams/custom/${encodeURIComponent(String(teamId))}`,
	);
	assertMutationSuccess(response, '删除作业失败');
}
