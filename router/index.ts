export const routes = {
	home: '/pages/index/index',
	jobs: '/pages/jobs/index',
	threeHitSet: '/pages/three-hit-set/index',
	sixHitSet: '/pages/six-hit-set/index',
	coinShop: '/pages/coin-shop/index',
	gachaStats: '/pages/gacha-stats/index',
	account: '/pages/account/index',
	profile: '/pages/profile/index',
	help: '/pages/help/index',
	guild: '/pages/guild/index',
	guildSearch: '/pages/guild/search/index',
	guildDetail: '/pages/guild/detail/index',
	guildInvitations: '/pages/guild/invitations/index',
	guildApplications: '/pages/guild/applications/index',
	guildSchedule: '/pages/guild/schedule/index',
	tutorial: '/pages/tutorial/index',
	bugReport: '/pages/bug-report/index',
	feedback: '/pages/feedback/index',
	feedbackCreate: '/pages/feedback/create/index',
	feedbackDetail: '/pages/feedback/detail/index',
	support: '/pages/support/index',
	openSource: '/pages/open-source/index',
	login: '/pages/login/index',
	register: '/pages/register/index',
	teamLinksDemo: '/pages/team-links-demo/index',
} as const;

export type AppRoute = (typeof routes)[keyof typeof routes];

export function navigateTo(path: AppRoute): void {
	uni.navigateTo({ url: path });
}

export function redirectTo(path: AppRoute): void {
	uni.redirectTo({ url: path });
}

export function reLaunch(path: AppRoute): void {
	uni.reLaunch({ url: path });
}
