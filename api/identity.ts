import { reactive } from 'vue';
import { API_BASE_URL } from '../config';
import { RequestError, responseErrorMessage } from './errors';
import type { ApiEnvelope, AuthSession, UserProfile, VisitorSession } from './types';

const storageKeys = {
	userToken: 'pcr.user.access-token',
	visitorToken: 'pcr.visitor.access-token',
	userProfile: 'pcr.user.profile',
	signedOut: 'pcr.user.signed-out',
} as const;

interface AuthState {
	user: UserProfile | null;
	isAuthenticated: boolean;
}

export const authState = reactive<AuthState>({
	user: null,
	isAuthenticated: false,
});

let visitorInitialization: Promise<string> | null = null;

function storedString(key: string): string {
	const value: unknown = uni.getStorageSync(key);
	return typeof value === 'string' ? value : '';
}

function storedUser(): UserProfile | null {
	const value: unknown = uni.getStorageSync(storageKeys.userProfile);
	return value && typeof value === 'object' ? (value as UserProfile) : null;
}

function storedSignedOut(): boolean {
	return uni.getStorageSync(storageKeys.signedOut) === true;
}

function markSignedOut(): void {
	uni.setStorageSync(storageKeys.signedOut, true);
}

function getApiUrl(path: string): string {
	return `${API_BASE_URL.replace(/\/$/, '')}${path}`;
}

export function hydrateIdentity(): void {
	const userToken = storedString(storageKeys.userToken);
	// 用户身份优先级最高；清理上次异常退出或旧版本留下的游客 Token，
	// 避免本地同时保留两种身份。
	if (userToken && storedString(storageKeys.visitorToken)) {
		uni.removeStorageSync(storageKeys.visitorToken);
	}
	if (userToken) {
		uni.removeStorageSync(storageKeys.signedOut);
	}
	authState.user = userToken ? storedUser() : null;
	authState.isAuthenticated = Boolean(userToken);
}

export function activeAccessToken(): string {
	return storedString(storageKeys.userToken) || storedString(storageKeys.visitorToken);
}

function initializeVisitorToken(existingVisitorToken = ''): Promise<string> {
	if (visitorInitialization) {
		return visitorInitialization;
	}

	visitorInitialization = new Promise<string>((resolve, reject) => {
		uni.request({
			url: getApiUrl('/api/user/visitor'),
			method: 'POST',
			header: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				...(existingVisitorToken
					? { Authorization: `Bearer ${existingVisitorToken}` }
					: {}),
			},
			timeout: 15000,
			success: (response) => {
				const envelope = response.data as ApiEnvelope<VisitorSession>;
				const token = envelope?.data?.accessToken;
				if (
					response.statusCode >= 200 &&
					response.statusCode < 300 &&
					envelope?.status === 0 &&
					typeof token === 'string' &&
					token.length > 0
				) {
					uni.setStorageSync(storageKeys.visitorToken, token);
					resolve(token);
					return;
				}

				reject(
					new RequestError(
						responseErrorMessage(response.data) ||
							`游客身份初始化失败（HTTP ${response.statusCode}）`,
						response.statusCode,
						response.data,
					),
				);
			},
			fail: (error) => {
				reject(new RequestError(error.errMsg || '游客身份初始化失败'));
			},
		});
	}).finally(() => {
		visitorInitialization = null;
	});

	return visitorInitialization;
}

export function ensureAccessToken(): Promise<string> {
	// 启动时正在核验游客身份时，页面 API 请求等待同一个结果，
	// 保证首页不会在核验完成前用旧 Token 发请求。
	if (visitorInitialization) {
		return visitorInitialization;
	}
	const token = activeAccessToken();
	if (token) {
		return Promise.resolve(token);
	}
	if (storedSignedOut()) {
		return Promise.resolve('');
	}
	return initializeVisitorToken().catch((error) => {
		// 同一 IP 已绑定正式用户时，后端会拒绝创建游客。保留匿名状态，
		// 让登录和公共游戏接口仍可使用，而不是让整个请求流程失败。
		if (error instanceof RequestError && error.statusCode === 409) {
			markSignedOut();
			return '';
		}
		throw error;
	});
}

export async function bootstrapIdentity(): Promise<void> {
	hydrateIdentity();
	const userToken = storedString(storageKeys.userToken);
	if (userToken) {
		return;
	}

	// 退出登录或旧版本留下的 signed-out 标记不应永久阻断游客身份恢复。
	// 每次冷启动重新尝试；若当前 IP 确实已绑定正式用户，接口会返回 409，
	// 下面的 catch 会再次写入标记，避免本次会话反复请求。
	uni.removeStorageSync(storageKeys.signedOut);

	// 接口会复用请求中携带的有效游客 Token；无 Token 或旧 Token 无效时，
	// 后端会返回新的游客 Token。
	try {
		await initializeVisitorToken(storedString(storageKeys.visitorToken));
	} catch (error) {
		if (error instanceof RequestError && error.statusCode === 409) {
			markSignedOut();
			return;
		}
		throw error;
	}
}

export function saveAuthenticatedSession(session: AuthSession): void {
	uni.setStorageSync(storageKeys.userToken, session.accessToken);
	uni.setStorageSync(storageKeys.userProfile, session.user);
	uni.removeStorageSync(storageKeys.signedOut);
	// 登录、注册均完成身份升级，后续请求只使用正式用户 Token。
	uni.removeStorageSync(storageKeys.visitorToken);
	authState.user = session.user;
	authState.isAuthenticated = true;
}

export function updateAuthenticatedProfile(user: UserProfile): void {
	if (!authState.isAuthenticated) {
		return;
	}
	authState.user = user;
	uni.setStorageSync(storageKeys.userProfile, user);
}

export function clearAuthenticatedSession(): void {
	uni.removeStorageSync(storageKeys.userToken);
	uni.removeStorageSync(storageKeys.userProfile);
	uni.removeStorageSync(storageKeys.visitorToken);
	// 退出正式账号后回到游客身份，避免游客可访问的页面因无 Token 返回 401。
	uni.removeStorageSync(storageKeys.signedOut);
	authState.user = null;
	authState.isAuthenticated = false;
}
