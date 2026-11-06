/**
 * 集中配置后端服务地址。后端部署环境确定后只需在这里调整。
 */
export const BACKEND_ORIGIN = 'http://lara.test';

// #ifdef H5
export const API_BASE_URL = '';
// #endif
// #ifndef H5
export const API_BASE_URL = BACKEND_ORIGIN;
// #endif

export function resolveAssetUrl(url?: string | null): string {
	if (!url) {
		return '';
	}

	// #ifdef H5
	if (url === BACKEND_ORIGIN) {
		return '/';
	}
	if (url.startsWith(`${BACKEND_ORIGIN}/`)) {
		return url.slice(BACKEND_ORIGIN.length);
	}
	// #endif

	return url;
}
