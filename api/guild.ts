import { del, get, post, put } from './request';
import { RequestError } from './errors';
import type {
	ApiEnvelope,
	GuildApplication,
	GuildApplicationList,
	GuildDetail,
	GuildInvitation,
	GuildInvitationCandidate,
	GuildInvitationList,
	GuildOverview,
	GuildSchedule,
	GuildSearchPage,
	GuildTeamOptions,
	GuildViewerApplication,
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

export async function getGuildOverview(): Promise<GuildOverview> {
	const response = await get<ApiEnvelope<GuildOverview>>(
		'/api/user/guilds/overview',
	);
	return assertSuccess(response, '获取公会概览失败');
}

export async function searchGuilds(
	keyword: string,
	page = 1,
): Promise<GuildSearchPage> {
	const response = await get<ApiEnvelope<GuildSearchPage>>(
		'/api/user/guilds',
		{ keyword, page },
	);
	return assertSuccess(response, '搜索公会失败');
}

export async function getGuildDetail(guildId: number): Promise<GuildDetail> {
	const response = await get<ApiEnvelope<GuildDetail>>(
		`/api/user/guilds/${guildId}`,
	);
	return assertSuccess(response, '获取公会详情失败');
}

export async function createGuild(payload: {
	name: string;
	description?: string;
}): Promise<GuildDetail> {
	const response = await post<ApiEnvelope<GuildDetail>, typeof payload>(
		'/api/user/guilds',
		payload,
	);
	return assertSuccess(response, '创建公会失败');
}

export async function updateGuild(
	guildId: number,
	payload: { name?: string; description?: string | null },
): Promise<GuildDetail> {
	const response = await put<ApiEnvelope<GuildDetail>, typeof payload>(
		`/api/user/guilds/${guildId}`,
		payload,
	);
	return assertSuccess(response, '更新公会资料失败');
}

export async function dissolveGuild(guildId: number): Promise<void> {
	const response = await del<ApiEnvelope<null>>(
		`/api/user/guilds/${guildId}`,
	);
	assertSuccess(response, '解散公会失败');
}

export async function leaveGuild(guildId: number): Promise<void> {
	const response = await del<ApiEnvelope<null>>(
		`/api/user/guilds/${guildId}/members/me`,
	);
	assertSuccess(response, '退出公会失败');
}

export async function kickGuildMember(
	guildId: number,
	uid: number,
): Promise<void> {
	const response = await del<ApiEnvelope<null>>(
		`/api/user/guilds/${guildId}/members/${uid}`,
	);
	assertSuccess(response, '移出成员失败');
}

export async function appointGuildVice(
	guildId: number,
	uid: number,
): Promise<GuildDetail> {
	const response = await put<ApiEnvelope<GuildDetail>>(
		`/api/user/guilds/${guildId}/members/${uid}/vice`,
	);
	return assertSuccess(response, '任命副会长失败');
}

export async function revokeGuildVice(
	guildId: number,
	uid: number,
): Promise<GuildDetail> {
	const response = await del<ApiEnvelope<GuildDetail>>(
		`/api/user/guilds/${guildId}/members/${uid}/vice`,
	);
	return assertSuccess(response, '撤销副会长失败');
}

export async function transferGuildOwner(
	guildId: number,
	targetUid: number,
): Promise<GuildDetail> {
	const response = await put<
		ApiEnvelope<GuildDetail>,
		{ target_uid: number }
	>(`/api/user/guilds/${guildId}/owner`, { target_uid: targetUid });
	return assertSuccess(response, '转让会长失败');
}

export async function getGuildInvitationCandidate(
	guildId: number,
	uid: number,
): Promise<GuildInvitationCandidate> {
	const response = await get<ApiEnvelope<GuildInvitationCandidate>>(
		`/api/user/guilds/${guildId}/invitation-candidates`,
		{ uid },
	);
	return assertSuccess(response, '查询用户失败');
}

export async function sendGuildInvitation(
	guildId: number,
	inviteeUid: number,
): Promise<GuildInvitation> {
	const response = await post<
		ApiEnvelope<GuildInvitation>,
		{ invitee_uid: number }
	>(`/api/user/guilds/${guildId}/invitations`, {
		invitee_uid: inviteeUid,
	});
	return assertSuccess(response, '发送邀请失败');
}

export async function getGuildInvitations(
	type: 'received' | 'sent',
): Promise<GuildInvitationList> {
	const response = await get<ApiEnvelope<GuildInvitationList>>(
		'/api/user/guild-invitations',
		{ type },
	);
	return assertSuccess(response, '获取公会邀请失败');
}

export async function revokeGuildInvitation(
	invitationId: number,
): Promise<void> {
	const response = await del<ApiEnvelope<null>>(
		`/api/user/guild-invitations/${invitationId}`,
	);
	assertSuccess(response, '撤销邀请失败');
}

export async function acceptGuildInvitation(
	invitationId: number,
): Promise<GuildDetail> {
	const response = await post<ApiEnvelope<GuildDetail>>(
		`/api/user/guild-invitations/${invitationId}/accept`,
	);
	return assertSuccess(response, '接受邀请失败');
}

export async function rejectGuildInvitation(
	invitationId: number,
): Promise<void> {
	const response = await post<ApiEnvelope<null>>(
		`/api/user/guild-invitations/${invitationId}/reject`,
	);
	assertSuccess(response, '拒绝邀请失败');
}

export async function applyToGuild(
	guildId: number,
): Promise<GuildViewerApplication> {
	const response = await post<ApiEnvelope<GuildViewerApplication>>(
		`/api/user/guilds/${guildId}/applications`,
	);
	return assertSuccess(response, '提交加入申请失败');
}

export async function withdrawGuildApplication(
	applicationId: number,
): Promise<void> {
	const response = await del<ApiEnvelope<null>>(
		`/api/user/guild-applications/${applicationId}`,
	);
	assertSuccess(response, '撤销申请失败');
}

export async function getGuildApplications(
	guildId: number,
): Promise<GuildApplicationList> {
	const response = await get<ApiEnvelope<GuildApplicationList>>(
		`/api/user/guilds/${guildId}/applications`,
	);
	return assertSuccess(response, '获取加入申请失败');
}

export async function approveGuildApplication(
	guildId: number,
	applicationId: number,
): Promise<GuildDetail> {
	const response = await post<ApiEnvelope<GuildDetail>>(
		`/api/user/guilds/${guildId}/applications/${applicationId}/approve`,
	);
	return assertSuccess(response, '同意加入申请失败');
}

export async function rejectGuildApplication(
	guildId: number,
	applicationId: number,
): Promise<GuildDetail> {
	const response = await post<ApiEnvelope<GuildDetail>>(
		`/api/user/guilds/${guildId}/applications/${applicationId}/reject`,
	);
	return assertSuccess(response, '拒绝加入申请失败');
}

export async function getGuildSchedule(
	guildId: number,
	month?: string,
): Promise<GuildSchedule> {
	const response = await get<ApiEnvelope<GuildSchedule>>(
		`/api/user/guilds/${guildId}/schedule`,
		month ? { month } : undefined,
	);
	return assertSuccess(response, '获取公会排刀失败');
}

export async function getGuildTeamOptions(
	guildId: number,
): Promise<GuildTeamOptions> {
	const response = await get<ApiEnvelope<GuildTeamOptions>>(
		`/api/user/guilds/${guildId}/schedule/team-options`,
	);
	return assertSuccess(response, '获取作业选项失败');
}

export async function saveGuildScheduleMember(
	guildId: number,
	uid: number,
	payload: {
		version: number;
		month?: string;
		team_1?: number | null;
		team_1_return?: number | null;
		team_2?: number | null;
		team_2_return?: number | null;
		team_3?: number | null;
		team_3_return?: number | null;
	},
): Promise<GuildSchedule> {
	const response = await put<ApiEnvelope<GuildSchedule>, typeof payload>(
		`/api/user/guilds/${guildId}/schedule/members/${uid}`,
		payload,
	);
	return assertSuccess(response, '保存排刀失败');
}

export async function copyGuildScheduleMember(
	guildId: number,
	payload: { source_uid: number; target_uid: number },
): Promise<GuildSchedule> {
	const response = await post<ApiEnvelope<GuildSchedule>, typeof payload>(
		`/api/user/guilds/${guildId}/schedule/copy`,
		payload,
	);
	return assertSuccess(response, '复制排刀失败');
}

export async function clearGuildSchedule(
	guildId: number,
	month?: string,
): Promise<GuildSchedule> {
	const query = month ? `?month=${encodeURIComponent(month)}` : '';
	const response = await del<ApiEnvelope<GuildSchedule>>(
		`/api/user/guilds/${guildId}/schedule${query}`,
	);
	return assertSuccess(response, '清空公会排刀失败');
}
