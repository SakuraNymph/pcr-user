/**
 * H5 构建环境变量声明（由 Vite 注入）。
 * 仅在 H5 平台使用，用于在 config/index.ts 中区分开发运行与生产构建。
 */
interface ImportMetaEnv {
	readonly MODE: string;
	readonly DEV: boolean;
	readonly PROD: boolean;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
