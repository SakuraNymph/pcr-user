<template>
	<MainLayout active-menu="home">
		<view class="demo-page">
			<view class="demo-heading">
				<view>
					<view class="demo-eyebrow">INTERACTION PREVIEW</view>
					<view class="demo-title">作业链接箭头分页</view>
					<view class="demo-description">
						每页展示 4 个链接，通过右上角收藏按钮下方的左右箭头切换，不出现横向滚动条。
					</view>
				</view>

				<view class="demo-legend">
					<view class="legend-item">
						<view class="legend-dot"></view>
						<text>每页 4 个链接</text>
					</view>
					<view class="legend-item">
						<text class="legend-arrow">‹ ›</text>
						<text>独立翻页</text>
					</view>
				</view>
			</view>

			<view class="list-header">
				<view class="header-boss">⚔ BOSS</view>
				<view class="header-damage">伤害</view>
				<view class="header-mode">模式</view>
				<view class="header-roles">角色阵容</view>
				<view class="header-links">作业链接</view>
				<view class="header-action">操作</view>
			</view>

			<view class="team-list">
				<view
					v-for="team in teams"
					:key="team.id"
					class="team-card"
				>
					<view class="team-boss">
						<view class="boss-cover">
							<view class="boss-orbit"></view>
							<view class="stage-tag" :style="{ background: team.accent }">
								{{ team.stage }}
							</view>
						</view>
						<view class="boss-detail">
							<text class="boss-number">{{ team.boss }}</text>
							<text class="boss-name">{{ team.links.length }} 个作业链接</text>
						</view>
					</view>

					<view class="team-damage">
						<text class="damage-icon">⚔</text>
						<text class="damage-number">
							{{ formatDamage(team.damage) }}<text class="damage-unit">万</text>
						</text>
					</view>

					<view class="team-mode">
						<view class="mode-tag" :class="{ manual: team.mode === '手动' }">
							{{ team.mode }}
						</view>
					</view>

					<view class="team-roles">
						<view
							v-for="role in team.roles"
							:key="`${team.id}-${role.name}`"
							class="role-avatar"
							:style="{ background: role.background }"
						>
							{{ role.name }}
						</view>
					</view>

					<view class="team-links">
						<view class="links-grid" :aria-label="`${team.boss}的作业链接`">
							<button
								v-for="link in pagedLinks(team)"
								:key="link.id"
								type="button"
								class="link-card"
								:class="`tone-${link.tone}`"
								@click="openLink(team, link)"
							>
								<text class="link-author">{{ link.author }}</text>
								<text class="link-difficulty">{{ link.difficulty }}</text>
								<text class="link-damage">{{ formatDamage(link.damage) }}</text>
							</button>
						</view>
					</view>

					<view class="team-action">
						<button
							type="button"
							class="star-button"
							:class="{ active: isFavorite(team.id) }"
							:aria-label="isFavorite(team.id) ? '取消收藏作业' : '收藏作业'"
							@click="toggleFavorite(team.id)"
						>
							{{ isFavorite(team.id) ? '✦' : '✧' }}
						</button>

						<view class="link-nav" :aria-label="`${team.boss}的链接翻页`">
							<button
								type="button"
								class="nav-button"
								:disabled="currentPage(team) === 0"
								:aria-label="`${team.boss}的上一页链接`"
								@click="changePage(team, -1)"
							>
								‹
							</button>
							<text class="page-indicator">
								{{ currentPage(team) + 1 }}/{{ pageCount(team) }}
							</text>
							<button
								type="button"
								class="nav-button"
								:disabled="currentPage(team) >= pageCount(team) - 1"
								:aria-label="`${team.boss}的下一页链接`"
								@click="changePage(team, 1)"
							>
								›
							</button>
						</view>
					</view>
				</view>
			</view>

			<view class="demo-footer">
				<text>8 条作业数据 · 其中 2 条各包含 10 个链接</text>
				<text class="mode-note">链接区域固定为 4 格，超出部分使用左右箭头翻页</text>
			</view>
		</view>
	</MainLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import MainLayout from '../../layouts/MainLayout.vue';

type LinkTone = 'auto' | 'set' | 'switch' | 'easy' | 'manual';

interface DemoRole {
	name: string;
	background: string;
}

interface DemoLink {
	id: number;
	author: string;
	difficulty: string;
	damage: number;
	tone: LinkTone;
}

interface DemoTeam {
	id: number;
	stage: string;
	boss: string;
	damage: number;
	mode: 'Auto' | '手动';
	accent: string;
	roles: DemoRole[];
	links: DemoLink[];
}

const linksPerPage = 4;
const favoriteTeamIds = ref<number[]>([]);
const pageIndexes = ref<Record<number, number>>({});

const roleSets: DemoRole[][] = [
	[
		{ name: '克', background: 'linear-gradient(160deg, #355f9d, #15213f)' },
		{ name: '晶', background: 'linear-gradient(160deg, #7c4f9f, #2c1b43)' },
		{ name: '似', background: 'linear-gradient(160deg, #2c7b82, #102f38)' },
		{ name: '咲', background: 'linear-gradient(160deg, #8a5c3d, #352116)' },
		{ name: '优', background: 'linear-gradient(160deg, #8d425f, #361725)' },
	],
	[
		{ name: '镜', background: 'linear-gradient(160deg, #315f72, #132b33)' },
		{ name: '华', background: 'linear-gradient(160deg, #704d91, #281a38)' },
		{ name: '凪', background: 'linear-gradient(160deg, #2d6c9b, #132b43)' },
		{ name: '忍', background: 'linear-gradient(160deg, #84513e, #322018)' },
		{ name: '美', background: 'linear-gradient(160deg, #87516e, #341b2b)' },
	],
	[
		{ name: '真', background: 'linear-gradient(160deg, #466792, #19283d)' },
		{ name: '香', background: 'linear-gradient(160deg, #79507b, #2e1c30)' },
		{ name: '凛', background: 'linear-gradient(160deg, #356d67, #142d2b)' },
		{ name: '茉', background: 'linear-gradient(160deg, #7b6141, #30251a)' },
		{ name: '静', background: 'linear-gradient(160deg, #7c4554, #301b22)' },
	],
	[
		{ name: '佩', background: 'linear-gradient(160deg, #3c578b, #18233b)' },
		{ name: '凯', background: 'linear-gradient(160deg, #6f4d88, #291b33)' },
		{ name: '露', background: 'linear-gradient(160deg, #336f7b, #152d33)' },
		{ name: '霞', background: 'linear-gradient(160deg, #865945, #34231b)' },
		{ name: '怜', background: 'linear-gradient(160deg, #84475f, #331b25)' },
	],
];

const linkTemplates: Array<{ difficulty: string; tone: LinkTone }> = [
	{ difficulty: '纯 AUTO', tone: 'auto' },
	{ difficulty: '简单 SET', tone: 'set' },
	{ difficulty: '开关 SET', tone: 'switch' },
	{ difficulty: '简单目押', tone: 'easy' },
	{ difficulty: '目押', tone: 'manual' },
];

const authors = [
	'Evexy',
	'Kira',
	'Mika',
	'Aster',
	'Nox',
	'Rin',
	'Luna',
	'Sora',
	'Yuki',
	'Mio',
	'Aoi',
	'Rei',
];

function makeLinks(teamId: number, count: number, baseDamage: number): DemoLink[] {
	return Array.from({ length: count }, (_, index) => {
		const template = linkTemplates[index % linkTemplates.length];

		return {
			id: teamId * 100 + index + 1,
			author: authors[index % authors.length],
			difficulty: template.difficulty,
			damage: baseDamage - index * 35,
			tone: template.tone,
		};
	});
}

const teams: DemoTeam[] = [
	{
		id: 1,
		stage: 'B 阶段',
		boss: 'BOSS 03 · 巨蟹座',
		damage: 4200,
		mode: 'Auto',
		accent: '#087cf5',
		roles: roleSets[0],
		links: makeLinks(1, 10, 4200),
	},
	{
		id: 2,
		stage: 'C 阶段',
		boss: 'BOSS 05 · 飞龙',
		damage: 6100,
		mode: '手动',
		accent: '#7045d5',
		roles: roleSets[1],
		links: makeLinks(2, 5, 6100),
	},
	{
		id: 3,
		stage: 'B 阶段',
		boss: 'BOSS 02 · 双子座',
		damage: 3800,
		mode: 'Auto',
		accent: '#087cf5',
		roles: roleSets[2],
		links: makeLinks(3, 3, 3800),
	},
	{
		id: 4,
		stage: 'B 阶段',
		boss: 'BOSS 01 · 哥布林',
		damage: 7500,
		mode: 'Auto',
		accent: '#087cf5',
		roles: roleSets[3],
		links: makeLinks(4, 10, 7500),
	},
	{
		id: 5,
		stage: 'C 阶段',
		boss: 'BOSS 04 · 狮鹫',
		damage: 3200,
		mode: '手动',
		accent: '#7045d5',
		roles: roleSets[0],
		links: makeLinks(5, 6, 3200),
	},
	{
		id: 6,
		stage: 'B 阶段',
		boss: 'BOSS 05 · 飞龙',
		damage: 5900,
		mode: 'Auto',
		accent: '#087cf5',
		roles: roleSets[1],
		links: makeLinks(6, 4, 5900),
	},
	{
		id: 7,
		stage: 'C 阶段',
		boss: 'BOSS 03 · 巨蟹座',
		damage: 4100,
		mode: 'Auto',
		accent: '#087cf5',
		roles: roleSets[2],
		links: makeLinks(7, 2, 4100),
	},
	{
		id: 8,
		stage: 'B 阶段',
		boss: 'BOSS 01 · 哥布林',
		damage: 7200,
		mode: '手动',
		accent: '#7045d5',
		roles: roleSets[3],
		links: makeLinks(8, 7, 7200),
	},
];

function formatDamage(value: number): string {
	return Number(value).toLocaleString('en-US');
}

function pageCount(team: DemoTeam): number {
	return Math.max(1, Math.ceil(team.links.length / linksPerPage));
}

function currentPage(team: DemoTeam): number {
	return pageIndexes.value[team.id] ?? 0;
}

function pagedLinks(team: DemoTeam): DemoLink[] {
	const start = currentPage(team) * linksPerPage;
	return team.links.slice(start, start + linksPerPage);
}

function changePage(team: DemoTeam, direction: number): void {
	const nextPage = currentPage(team) + direction;

	if (nextPage < 0 || nextPage >= pageCount(team)) {
		return;
	}

	pageIndexes.value = {
		...pageIndexes.value,
		[team.id]: nextPage,
	};
}

function isFavorite(teamId: number): boolean {
	return favoriteTeamIds.value.includes(teamId);
}

function toggleFavorite(teamId: number): void {
	favoriteTeamIds.value = isFavorite(teamId)
		? favoriteTeamIds.value.filter((id) => id !== teamId)
		: [...favoriteTeamIds.value, teamId];

	uni.showToast({
		title: isFavorite(teamId) ? '演示：已收藏作业' : '演示：已取消收藏',
		icon: 'none',
	});
}

function openLink(team: DemoTeam, link: DemoLink): void {
	uni.showToast({
		title: `演示：打开 ${team.boss} / ${link.author} 的${link.difficulty}链接`,
		icon: 'none',
	});
}
</script>

<style>
.demo-page {
	width: 100%;
	max-width: 1500px;
	margin: 0 auto;
	padding: 16px;
}

.demo-heading {
	display: flex;
	align-items: flex-end;
	justify-content: space-between;
	gap: 20px;
	margin-bottom: 14px;
}

.demo-eyebrow {
	margin-bottom: 3px;
	color: #5ba9da;
	font-size: 11px;
	letter-spacing: 0.16em;
}

.demo-title {
	color: var(--text-primary);
	font-size: 22px;
	font-weight: 600;
}

.demo-description {
	margin-top: 5px;
	color: #7698b8;
	font-size: 12px;
}

.demo-legend {
	display: flex;
	align-items: center;
	gap: 14px;
	padding: 8px 12px;
	border: 1px solid rgba(53, 145, 201, 0.18);
	border-radius: 9px;
	background: var(--bg-panel-soft);
	color: var(--text-muted);
	font-size: 11px;
}

.legend-item {
	display: flex;
	align-items: center;
	gap: 6px;
	white-space: nowrap;
}

.legend-dot {
	width: 7px;
	height: 7px;
	border-radius: 50%;
	background: #55c8ff;
	box-shadow: 0 0 8px rgba(85, 200, 255, 0.7);
}

.legend-arrow {
	color: var(--accent-text);
	font-size: 16px;
	letter-spacing: 1px;
}

.list-header,
.team-card {
	display: grid;
	grid-template-columns: minmax(150px, 1.55fr) minmax(90px, 0.9fr) minmax(68px, 0.7fr) minmax(185px, 2fr) minmax(250px, 3.15fr) 82px;
}

.list-header {
	min-height: 32px;
	align-items: center;
	margin-bottom: 7px;
	padding: 0 10px;
	border: 1px solid rgba(43, 128, 182, 0.14);
	border-radius: 7px;
	background: var(--bg-panel-soft);
	color: #6990b2;
	font-size: 11px;
	text-align: center;
}

.list-header > view {
	min-width: 0;
}

.header-links {
	padding-left: 8px;
	text-align: left;
}

.team-list {
	display: flex;
	flex-direction: column;
	gap: 7px;
}

.team-card {
	position: relative;
	align-items: stretch;
	min-height: 102px;
	border: 1px solid rgba(44, 151, 207, 0.24);
	border-radius: 10px;
	background: linear-gradient(105deg, var(--bg-panel), var(--bg-elevated) 70%, var(--bg-panel));
	box-shadow: 0 0 16px rgba(27, 151, 216, 0.07), inset 0 0 14px rgba(24, 119, 171, 0.025);
	overflow: hidden;
}

.team-card::before {
	position: absolute;
	inset: 0;
	background:
		repeating-linear-gradient(90deg, rgba(73, 196, 247, 0.1) 0 24px, rgba(95, 211, 255, 0.22) 24px 48px, rgba(66, 177, 228, 0.1) 48px 72px) top / 100% 1px no-repeat,
		repeating-linear-gradient(90deg, rgba(66, 177, 228, 0.09) 0 24px, rgba(95, 211, 255, 0.18) 24px 48px, rgba(73, 196, 247, 0.08) 48px 72px) bottom / 100% 1px no-repeat;
	content: '';
	pointer-events: none;
}

.team-card > view {
	position: relative;
	display: flex;
	align-items: center;
	min-width: 0;
	padding: 8px 9px;
}

.team-card > view:not(:last-child)::after {
	position: absolute;
	top: 22%;
	right: 0;
	width: 1px;
	height: 56%;
	background: linear-gradient(transparent, rgba(54, 155, 214, 0.28), transparent);
	content: '';
}

.team-boss {
	gap: 10px;
}

.boss-cover {
	position: relative;
	width: 70px;
	height: 78px;
	flex: 0 0 70px;
	overflow: hidden;
	border: 1px solid rgba(42, 154, 224, 0.66);
	border-radius: 8px;
	background:
		radial-gradient(circle at 50% 43%, rgba(71, 178, 255, 0.32), transparent 26%),
		linear-gradient(145deg, #0c3458, #061a2e 65%, #09253f);
	box-shadow: inset 0 0 18px rgba(47, 163, 237, 0.16);
}

.boss-cover::before {
	position: absolute;
	top: 16px;
	left: 50%;
	width: 38px;
	height: 38px;
	border: 1px solid rgba(113, 209, 255, 0.5);
	border-radius: 50%;
	background: radial-gradient(circle at 34% 30%, #8be0ff, #1676bd 25%, #0b3159 60%, #04111f 72%);
	box-shadow: 0 0 15px rgba(64, 187, 255, 0.25);
	content: '';
	transform: translateX(-50%);
}

.boss-orbit {
	position: absolute;
	top: 32px;
	left: 50%;
	width: 55px;
	height: 14px;
	border: 1px solid rgba(114, 203, 255, 0.35);
	border-radius: 50%;
	transform: translateX(-50%) rotate(-16deg);
}

.stage-tag {
	position: absolute;
	top: 5px;
	left: 5px;
	z-index: 1;
	padding: 2px 5px;
	border-radius: 4px;
	color: #fff;
	font-size: 9px;
}

.boss-detail {
	display: flex;
	min-width: 0;
	flex-direction: column;
	gap: 4px;
}

.boss-number {
	color: var(--text-primary);
	font-size: 12px;
	white-space: nowrap;
}

.boss-name {
	color: var(--text-muted);
	font-size: 10px;
}

.team-damage {
	justify-content: center;
	gap: 6px;
}

.damage-icon {
	color: #57bfff;
	font-size: 21px;
	text-shadow: 0 0 9px rgba(8, 127, 255, 0.7);
}

.damage-number {
	color: #fff;
	font-size: 19px;
	font-weight: 600;
	white-space: nowrap;
}

.damage-unit {
	margin-left: 2px;
	color: var(--text-muted);
	font-size: 10px;
	font-weight: 400;
}

.team-mode {
	justify-content: center;
}

.mode-tag {
	padding: 6px 10px;
	border: 1px solid rgba(79, 214, 171, 0.22);
	border-radius: 12px;
	background: linear-gradient(180deg, rgba(11, 155, 111, 0.9), rgba(7, 113, 83, 0.88));
	color: #fff;
	font-size: 11px;
	white-space: nowrap;
}

.mode-tag.manual {
	border-color: rgba(181, 138, 255, 0.25);
	background: linear-gradient(180deg, rgba(112, 69, 213, 0.9), rgba(78, 43, 157, 0.88));
}

.team-roles {
	justify-content: center;
	gap: 5px;
}

.role-avatar {
	display: flex;
	width: 35px;
	height: 44px;
	align-items: center;
	justify-content: center;
	border: 1px solid rgba(71, 166, 229, 0.4);
	border-radius: 50% 50% 9px 9px;
	color: var(--text-primary);
	font-size: 12px;
	font-weight: 600;
	box-shadow: inset 0 0 11px rgba(152, 224, 255, 0.08);
}

.team-links {
	align-items: stretch !important;
	padding: 8px !important;
}

.links-grid {
	display: grid;
	width: 100%;
	min-width: 0;
	grid-template-columns: repeat(4, minmax(58px, 76px));
	align-items: center;
	justify-content: start;
	gap: 6px;
	overflow: hidden;
}

.link-card {
	display: flex;
	width: 100%;
	height: 68px;
	min-width: 0;
	flex-direction: column;
	align-items: flex-start;
	justify-content: center;
	gap: 2px;
	padding: 6px 5px;
	border: 1px solid var(--border-default);
	border-radius: 6px;
	background: var(--bg-panel-soft);
	color: var(--text-secondary);
	font-size: 10px;
	line-height: 1.25;
	text-align: left;
}

.link-card::after {
	border: 0;
}

.link-card:active {
	filter: brightness(1.18);
}

.tone-auto {
	border-color: rgba(48, 190, 142, 0.48);
	background: rgba(7, 62, 58, 0.75);
}

.tone-set {
	border-color: rgba(54, 146, 255, 0.48);
	background: var(--bg-subtle);
}

.tone-switch {
	border-color: rgba(207, 151, 66, 0.5);
	background: rgba(70, 52, 24, 0.74);
}

.tone-easy {
	border-color: rgba(157, 112, 255, 0.48);
	background: rgba(46, 34, 80, 0.76);
}

.tone-manual {
	border-color: rgba(207, 76, 126, 0.52);
	background: rgba(68, 27, 51, 0.78);
}

.link-author,
.link-difficulty {
	width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.link-author {
	color: var(--text-primary);
	font-weight: 500;
}

.link-difficulty {
	color: var(--text-muted);
}

.link-damage {
	color: #fff;
	font-size: 12px;
	font-weight: 600;
	white-space: nowrap;
}

.team-action {
	flex-direction: column;
	align-items: flex-end;
	justify-content: flex-start;
	gap: 7px;
	padding: 7px 8px !important;
}

.team-action::after {
	display: none;
}

.star-button {
	width: 28px;
	height: 28px;
	padding: 0;
	border: 0;
	background: transparent;
	color: var(--text-muted);
	font-family: 'Segoe UI Symbol', sans-serif;
	font-size: 24px;
	line-height: 28px;
	text-shadow: none;
}

.star-button.active {
	color: #ffd45a;
	text-shadow: 0 0 7px rgba(255, 194, 36, 0.52);
}

.star-button::after {
	border: 0;
}

.link-nav {
	display: flex;
	align-items: center;
	gap: 3px;
}

.nav-button {
	display: flex;
	width: 24px;
	height: 24px;
	align-items: center;
	justify-content: center;
	padding: 0;
	border: 1px solid var(--border-default);
	border-radius: 6px;
	background: var(--bg-panel-soft-alt);
	color: var(--text-secondary);
	font-size: 18px;
	line-height: 22px;
}

.nav-button::after {
	border: 0;
}

.nav-button[disabled] {
	border-color: var(--border-subtle);
	background: var(--bg-panel-soft);
	color: var(--text-faint);
}

.page-indicator {
	min-width: 21px;
	color: var(--text-muted);
	font-size: 9px;
	text-align: center;
	white-space: nowrap;
}

.demo-footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	margin-top: 10px;
	color: #6485a4;
	font-size: 11px;
}

.mode-note {
	color: #7fb6d9;
}

@media screen and (max-width: 900px) {
	.list-header {
		display: none;
	}

	.team-card {
		grid-template-columns: minmax(0, 1fr) minmax(88px, 0.55fr) minmax(66px, 0.42fr) 82px;
		grid-template-areas:
			'boss damage mode action'
			'roles roles roles roles'
			'links links links links';
	}

	.team-boss {
		grid-area: boss;
	}

	.team-damage {
		grid-area: damage;
	}

	.team-mode {
		grid-area: mode;
	}

	.team-roles {
		grid-area: roles;
		justify-content: flex-start;
		border-top: 1px solid var(--border-subtle);
	}

	.team-links {
		grid-area: links;
		border-top: 1px solid var(--border-subtle);
	}

	.team-action {
		grid-area: action;
	}

	.team-card > view:not(:last-child)::after {
		display: none;
	}
}

@media screen and (max-width: 700px) {
	.demo-page {
		padding: 8px 2px;
	}

	.demo-heading {
		align-items: stretch;
		flex-direction: column;
		gap: 10px;
	}

	.demo-title {
		font-size: 19px;
	}

	.demo-legend {
		justify-content: space-between;
	}

	.team-card {
		grid-template-columns: minmax(0, 1fr) minmax(0, 0.8fr) 82px;
		grid-template-areas:
			'boss boss action'
			'damage mode mode'
			'roles roles roles'
			'links links links';
	}

	.team-damage {
		justify-content: flex-start;
		padding-left: 13px;
		border-top: 1px solid var(--border-subtle);
	}

	.team-mode {
		border-top: 1px solid var(--border-subtle);
	}

	.team-links {
		padding-right: 8px !important;
	}

	.links-grid {
		grid-template-columns: repeat(4, minmax(0, 1fr));
	}

	.link-card {
		width: 100%;
	}

	.demo-footer {
		align-items: flex-start;
		flex-direction: column;
		gap: 4px;
	}
}
</style>
