/**
 * 集中配置后端服务地址。按「平台 × 环境」统一管理，避免各 API 文件单独维护域名。
 *
 * 环境判定依据 uni-app 编译器（HBuilderX 的 @dcloudio/vite-plugin-uni）注入的
 * process.env.NODE_ENV：HBuilderX「运行」为 development，「发行」为 production，
 * 且会在 H5 / APP / 微信小程序等所有平台编译期静态替换，因此无需手动改生产常量。
 */

// @dcloudio/types 未安装，这里补一个最小声明；process.env.NODE_ENV 会在编译期被替换为字面量。
declare const process: { env: Record<string, string | undefined> };

/**
 * 开发环境后端。H5 开发通过 manifest.json 的 devServer 代理转发到该地址；
 * 同时用于识别后端在开发期返回的绝对资源地址。
 */
export const BACKEND_ORIGIN = 'http://lara.test';

/** 生产环境 API 域名。 */
const PROD_ORIGIN = 'https://api.saololi.site';

/** 测试环境占位：接入测试环境时填写，并将 BUILD_CHANNEL 设为 'test'。 */
const TEST_ORIGIN = PROD_ORIGIN;

/**
 * 非 H5（APP / 微信小程序）开发环境地址。
 * 当前选择「开发构建也连生产 API」，故与生产一致；
 * 将来改用局域网 IP / 内网穿透域名时，只需修改此常量。
 */
const NON_H5_DEV_ORIGIN = PROD_ORIGIN;

/** 'auto' 按 NODE_ENV 自动区分开发/生产；'test' 强制使用 TEST_ORIGIN。 */
type BuildChannel = 'auto' | 'test';
const BUILD_CHANNEL: BuildChannel = 'auto';

/**
 * 判断是否为生产构建。
 * 优先使用 uni-app 在编译期注入的 process.env.NODE_ENV；
 * 缺失时（如个别 H5 运行环境）回退到 import.meta.env，并遵循 fail-closed。
 */
function isProductionBuild(): boolean {
	if (process.env.NODE_ENV === 'production') {
		return true;
	}
	if (process.env.NODE_ENV === 'development') {
		return false;
	}

	// #ifdef H5
	try {
		if (import.meta.env.DEV === true) {
			return false;
		}
		if (import.meta.env.PROD === false) {
			return false;
		}
		if (import.meta.env.MODE === 'production') {
			return true;
		}
	} catch {
		// 运行环境未注入 import.meta.env 时无法确认环境，按开发处理。
		return false;
	}
	// #endif

	return false;
}

// #ifndef H5
/** 拼接资源基址与前缀路径，避免双斜杠或重复域名。 */
function joinOrigin(origin: string, path: string): string {
	const normalizedPath = path.startsWith('/') ? path : `/${path}`;
	if (!origin) {
		return normalizedPath;
	}
	return `${origin.replace(/\/+$/, '')}${normalizedPath}`;
}
// #endif

// #ifdef H5
// H5 开发走相对地址（由 manifest.json 代理转发）；H5 生产使用正式域名。
export const API_ORIGIN = BUILD_CHANNEL === 'test'
	? TEST_ORIGIN
	: (isProductionBuild() ? PROD_ORIGIN : '');
// H5 保持既有行为：相对资源路径不变，绝对地址原样返回。
export const RESOURCE_ORIGIN = '';
// #endif
// #ifndef H5
// APP / 微信小程序：开发与生产均使用可访问的绝对地址（当前都指向生产）。
export const API_ORIGIN = BUILD_CHANNEL === 'test'
	? TEST_ORIGIN
	: (isProductionBuild() ? PROD_ORIGIN : NON_H5_DEV_ORIGIN);
export const RESOURCE_ORIGIN = API_ORIGIN;
// #endif

export const API_BASE_URL = API_ORIGIN;

/**
 * 归一化后端返回的资源地址。
 * - 空值返回空串；
 * - H5 保持既有行为（开发域名转相对路径交给代理，其余原样返回）；
 * - 非 H5 把开发域名前缀与相对路径统一指向 RESOURCE_ORIGIN，绝对地址与协议相对地址原样返回。
 */
export function resolveAssetUrl(url?: string | null): string {
	if (!url) {
		return '';
	}

	const value = String(url);

	// #ifdef H5
	if (value === BACKEND_ORIGIN) {
		return '/';
	}
	if (value.startsWith(`${BACKEND_ORIGIN}/`)) {
		return value.slice(BACKEND_ORIGIN.length);
	}
	// #endif

	// #ifndef H5
	if (value === BACKEND_ORIGIN) {
		return RESOURCE_ORIGIN;
	}
	if (value.startsWith(`${BACKEND_ORIGIN}/`)) {
		return joinOrigin(RESOURCE_ORIGIN, value.slice(BACKEND_ORIGIN.length));
	}
	// 协议相对地址（//host/...）保持原样，不拼接域名。
	if (value.startsWith('//')) {
		return value;
	}
	if (value.startsWith('/')) {
		return joinOrigin(RESOURCE_ORIGIN, value);
	}
	// #endif

	return value;
}
