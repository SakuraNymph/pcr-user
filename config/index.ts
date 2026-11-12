/**
 * 集中配置后端服务地址。后端部署环境确定后只需在这里调整。
 */
export const BACKEND_ORIGIN = 'http://lara.test';

// #ifdef H5
// 生产构建的正式 API 域名。只有明确判定为生产构建时才会使用。
const H5_PRODUCTION_API_BASE_URL = 'https://api.saololi.site';

/**
 * 判断当前 H5 运行环境是否为生产构建。
 *
 * 必须直接书写 `import.meta.env.X`，构建工具才能在编译期静态替换；
 * 不能用类型断言或先取 `import.meta.env` 对象再读属性，否则替换失效。
 *
 * 判断规则（fail closed）：
 * - 任一信号表明是开发运行，即返回 false；
 * - 只有构建模式明确为 production 时才返回 true；
 * - 信号缺失、读取异常或相互冲突时统一返回 false，使用本地相对地址，
 *   避免开发运行误连生产 API。
 */
function isH5ProductionBuild(): boolean {
	try {
		if (import.meta.env.DEV === true) {
			return false;
		}

		if (import.meta.env.PROD === false) {
			return false;
		}

		return import.meta.env.MODE === 'production';
	} catch {
		// 运行环境未注入 import.meta.env 时无法确认环境，按开发处理。
		return false;
	}
}

export const API_BASE_URL = isH5ProductionBuild() ? H5_PRODUCTION_API_BASE_URL : '';
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
