/**
 * 开源项目仓库地址集中配置。仓库确定后只需修改这里。
 */
export const openSourceRepositories = {
	pcrAdmin: 'https://github.com/SakuraNymph/pcr-admin',
	userClient: '',
	backendApi: '',
} as const;

export interface OpenSourceProject {
	key: string;
	name: string;
	englishName: string;
	icon: string;
	description: string;
	techStack: string[];
	repository: string;
}

export const openSourceProjects: OpenSourceProject[] = [
	{
		key: 'pcr-admin',
		name: 'PcrAdmin',
		englishName: 'ADMIN CONSOLE',
		icon: '⊞',
		description: '平台管理后台，负责游戏数据、作业、公会、用户及平台配置管理。',
		techStack: ['Vue 3', 'TypeScript', 'Vben Admin', 'Element Plus'],
		repository: openSourceRepositories.pcrAdmin,
	},
	{
		key: 'user-client',
		name: '用户端',
		englishName: 'PLAYER CLIENT',
		icon: '◉',
		description: '面向玩家的游戏辅助平台，提供作业浏览、作业管理及相关游戏辅助功能。',
		techStack: ['uni-app', 'Vue 3'],
		repository: openSourceRepositories.userClient,
	},
	{
		key: 'backend-api',
		name: '后端 API',
		englishName: 'BACKEND API',
		icon: '⌘',
		description: '提供平台业务接口、用户认证及数据管理服务。',
		techStack: ['Laravel', 'PHP'],
		repository: openSourceRepositories.backendApi,
	},
];
