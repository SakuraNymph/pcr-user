import { saveAuthenticatedSession, updateAuthenticatedProfile } from './identity';
import { RequestError } from './errors';
import { get, post, put } from './request';
import type {
	ApiEnvelope,
	AuthSession,
	UserAvatarOption,
	UserProfile,
} from './types';

export interface LoginPayload {
	email: string;
	password: string;
}

export interface RegisterPayload {
	nickname: string;
	email: string;
	code: string;
	password: string;
	password_confirmation: string;
}

export interface UpdateUserProfilePayload {
	nickname?: string;
	avatar?: number;
}

export interface UpdateUserPasswordPayload {
	current_password: string;
	new_password: string;
	new_password_confirmation: string;
}

export interface PasswordResetCodeResult {
	retry_after: number;
	expires_in: number;
}

export interface PasswordResetVerifyResult {
	reset_token: string;
	expires_in: number;
}

export interface ResetPasswordPayload {
	reset_token: string;
	password: string;
	password_confirmation: string;
}

export type GuideLocation = 'list' | 'post' | 'team' | 'account' | 'group';

function assertSuccess<T>(response: ApiEnvelope<T>, fallback: string): T {
	if (response?.status !== 0) {
		throw new RequestError(response?.msg || response?.message || fallback, response?.code, response);
	}
	return response.data;
}

function acceptSession(response: ApiEnvelope<AuthSession>): UserProfile {
	const session = assertSuccess(response, '身份验证失败');
	if (!session || typeof session.accessToken !== 'string' || !session.accessToken || !session.user) {
		throw new RequestError('服务端未返回有效的用户身份信息', response?.code, response);
	}

	saveAuthenticatedSession(session);
	return session.user;
}

export async function sendRegisterCode(email: string): Promise<void> {
	const response = await post<ApiEnvelope<unknown>, { email: string }>(
		'/api/user/send-register-code',
		{ email },
	);
	assertSuccess(response, '验证码发送失败');
}

export async function loginUser(payload: LoginPayload): Promise<UserProfile> {
	const response = await post<ApiEnvelope<AuthSession>, LoginPayload>('/api/user/login', payload);
	return acceptSession(response);
}

export async function registerUser(payload: RegisterPayload): Promise<UserProfile> {
	const response = await post<ApiEnvelope<AuthSession>, RegisterPayload>(
		'/api/user/register',
		payload,
	);
	return acceptSession(response);
}

export async function getCurrentUser(): Promise<UserProfile> {
	const response = await get<ApiEnvelope<UserProfile>>('/api/user/me');
	const user = assertSuccess(response, '获取用户信息失败');
	updateAuthenticatedProfile(user);
	return user;
}

export async function getAvatarOptions(): Promise<UserAvatarOption[]> {
	const response = await get<ApiEnvelope<UserAvatarOption[]>>(
		'/api/user/avatar-options',
	);
	return assertSuccess(response, '获取头像选项失败');
}

export async function updateUserProfile(
	payload: UpdateUserProfilePayload,
): Promise<UserProfile> {
	const response = await put<
		ApiEnvelope<UserProfile>,
		UpdateUserProfilePayload
	>('/api/user/profile', payload);
	const user = assertSuccess(response, '更新个人资料失败');
	updateAuthenticatedProfile(user);
	return user;
}

export async function updateUserPassword(
	payload: UpdateUserPasswordPayload,
): Promise<void> {
	const response = await put<
		ApiEnvelope<unknown>,
		UpdateUserPasswordPayload
	>('/api/user/password', payload);
	assertSuccess(response, '修改密码失败');
}

export async function sendPasswordResetCode(): Promise<PasswordResetCodeResult> {
	const response = await post<ApiEnvelope<PasswordResetCodeResult>>(
		'/api/user/password/reset-code',
	);
	return assertSuccess(response, '验证码发送失败');
}

export async function verifyPasswordResetCode(
	code: string,
): Promise<PasswordResetVerifyResult> {
	const response = await post<
		ApiEnvelope<PasswordResetVerifyResult>,
		{ code: string }
	>('/api/user/password/verify-code', { code });
	return assertSuccess(response, '验证码验证失败');
}

export async function resetPasswordWithToken(
	payload: ResetPasswordPayload,
): Promise<void> {
	const response = await put<
		ApiEnvelope<unknown>,
		ResetPasswordPayload
	>('/api/user/password/reset', payload);
	assertSuccess(response, '密码重置失败');
}

export async function logoutUser(): Promise<void> {
	const response = await post<ApiEnvelope<unknown>>('/api/user/logout');
	assertSuccess(response, '退出登录失败');
}

export async function getGuideConfig(location: GuideLocation): Promise<boolean> {
	const response = await get<unknown>('/api/user/guide-config', { location });
	if (typeof response !== 'boolean') {
		throw new RequestError('新手引导配置接口返回的数据格式不正确');
	}
	return response;
}

export async function saveGuideConfig(location: GuideLocation): Promise<void> {
	await post<unknown, { location: GuideLocation }>('/api/user/guide-config', { location });
}

export async function resetGuideConfig(): Promise<void> {
	const response = await post<ApiEnvelope<unknown>>('/api/user/guide-config/reset');
	assertSuccess(response, '重置使用教程失败');
}
