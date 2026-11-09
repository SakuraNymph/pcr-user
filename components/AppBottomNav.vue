<template>
	<view class="bottom-nav-root">
		<view class="bottom-nav">
			<view
				v-for="item in navItems"
				:key="item.key"
				class="bottom-nav-item"
				:class="{ active: activeKey === item.key }"
				role="button"
				:aria-label="item.label"
				@click="handleNav(item)"
			>
				<text class="bottom-nav-icon">{{ item.icon }}</text>
				<text class="bottom-nav-label">{{ item.label }}</text>
			</view>
		</view>

		<Transition name="more-sheet">
			<view v-if="moreOpen" class="more-mask" @click="closeMore">
				<view class="more-panel" @click.stop>
					<view class="more-handle"></view>
					<view class="more-heading">更多功能</view>
					<view
						v-for="item in moreItems"
						:key="item.key"
						class="more-item"
						role="menuitem"
						tabindex="0"
						@click="selectMore(item)"
					>
						<text class="more-icon">{{ item.icon }}</text>
						<text class="more-label">{{ item.label }}</text>
						<text class="more-arrow">›</text>
					</view>
					<view class="more-cancel" @click="closeMore">取消</view>
				</view>
			</view>
		</Transition>
	</view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { redirectTo, routes, type AppRoute } from '../router';
import { externalLinks } from '../config/links';
import { openExternalLink } from '../utils/externalLink';

const props = defineProps<{ activeMenu: string }>();

interface NavItem {
	key: string;
	label: string;
	icon: string;
	path: AppRoute | null;
	externalUrl?: string;
}

const moreOpen = ref(false);

const navItems: NavItem[] = [
	{ key: 'home', label: '作业列表', icon: '⌂', path: routes.home },
	{ key: 'jobs', label: '我的作业', icon: '☑', path: routes.jobs },
	{ key: 'account', label: '我的账号', icon: '♙', path: routes.account },
	{ key: 'more', label: '更多', icon: '⋯', path: null },
];

const moreItems: NavItem[] = [
	{ key: 'threeHitSet', label: 'D面套餐（上月数据，仅供体验）', icon: '⌘', path: routes.threeHitSet },
	{ key: 'sixHitSet', label: '满补套餐（上月数据，仅供体验）', icon: '♧', path: routes.sixHitSet },
	{ key: 'help', label: '使用说明', icon: '⊞', path: routes.help },
	{ key: 'guild', label: '我的公会', icon: '◇', path: routes.guild },
	{ key: 'tutorial', label: '使用教程', icon: '▤', path: routes.tutorial },
	{ key: 'bugReport', label: 'BUG反馈', icon: '⚠', path: routes.bugReport },
	{ key: 'support', label: '支持作者', icon: '♥', path: routes.support },
	{ key: 'github', label: 'GitHub', icon: '◈', path: null, externalUrl: externalLinks.github },
];

const activeGroupByMenu: Record<string, string> = {
	home: 'home',
	teamLinksDemo: 'home',
	jobs: 'jobs',
	account: 'account',
	profile: 'account',
	coinShop: 'account',
	gachaStats: 'account',
	threeHitSet: 'more',
	sixHitSet: 'more',
	help: 'more',
	guild: 'more',
	guildSearch: 'more',
	guildDetail: 'more',
	guildInvitations: 'more',
	guildApplications: 'more',
	guildSchedule: 'more',
	tutorial: 'more',
	bugReport: 'more',
	support: 'more',
};

const activeKey = computed(() => (moreOpen.value ? 'more' : activeGroupByMenu[props.activeMenu] ?? ''));

function handleNav(item: NavItem): void {
	if (item.key === 'more') {
		moreOpen.value = !moreOpen.value;
		return;
	}
	if (!item.path) return;
	moreOpen.value = false;
	redirectTo(item.path);
}

function selectMore(item: NavItem): void {
	if (item.externalUrl) {
		moreOpen.value = false;
		openExternalLink(item.externalUrl);
		return;
	}
	if (!item.path) return;
	moreOpen.value = false;
	redirectTo(item.path);
}

function closeMore(): void {
	moreOpen.value = false;
}
</script>

<style>
.bottom-nav {
	display: none;
}

.more-mask {
	position: fixed;
	top: 0;
	right: 0;
	bottom: 0;
	left: 0;
	z-index: 1050;
	display: flex;
	align-items: flex-end;
	background: var(--mask);
}

.more-panel {
	width: 100%;
	max-height: 82vh;
	padding: 10px 16px calc(12px + env(safe-area-inset-bottom, 0px));
	overflow-y: auto;
	-webkit-overflow-scrolling: touch;
	border-top: 1px solid var(--border-strong);
	border-radius: 16px 16px 0 0;
	background: var(--bg-elevated);
	box-shadow: 0 -12px 40px var(--shadow);
}

.more-handle {
	width: 38px;
	height: 4px;
	margin: 0 auto 10px;
	border-radius: 999px;
	background: var(--border-default);
}

.more-heading {
	padding: 2px 4px 10px;
	color: var(--text-primary);
	font-size: 15px;
	font-weight: 700;
}

.more-item {
	min-height: 50px;
	padding: 0 12px;
	display: flex;
	align-items: center;
	gap: 12px;
	border-radius: 8px;
	color: var(--text-secondary);
	font-size: 14px;
	cursor: pointer;
}

.more-item:active {
	background: var(--bg-hover);
}

.more-icon {
	width: 22px;
	flex: 0 0 22px;
	color: var(--accent-text);
	font-size: 18px;
	text-align: center;
}

.more-label {
	min-width: 0;
	flex: 1;
}

.more-arrow {
	color: var(--text-faint);
	font-size: 18px;
	line-height: 1;
}

.more-cancel {
	min-height: 46px;
	margin-top: 10px;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1px solid var(--border-default);
	border-radius: 8px;
	background: var(--bg-subtle);
	color: var(--text-secondary);
	font-size: 14px;
	cursor: pointer;
}

.more-sheet-enter-active,
.more-sheet-leave-active {
	transition: opacity 0.2s ease;
}

.more-sheet-enter-active .more-panel,
.more-sheet-leave-active .more-panel {
	transition: transform 0.24s ease;
}

.more-sheet-enter-from,
.more-sheet-leave-to {
	opacity: 0;
}

.more-sheet-enter-from .more-panel,
.more-sheet-leave-to .more-panel {
	transform: translateY(100%);
}

@media screen and (max-width: 700px) {
	.bottom-nav {
		position: fixed;
		right: 0;
		bottom: 0;
		left: 0;
		z-index: 100;
		height: calc(56px + env(safe-area-inset-bottom, 0px));
		padding-bottom: env(safe-area-inset-bottom, 0px);
		display: flex;
		align-items: stretch;
		border-top: 1px solid var(--border-default);
		background: var(--bg-elevated);
		box-shadow: 0 -6px 20px rgba(0, 0, 0, 0.28);
	}

	.bottom-nav-item {
		position: relative;
		min-width: 0;
		flex: 1 1 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2px;
		color: var(--text-muted);
		font-size: 11px;
		cursor: pointer;
	}

	.bottom-nav-item.active {
		color: var(--accent-text);
		font-weight: 700;
	}

	.bottom-nav-item.active::before {
		position: absolute;
		top: 0;
		left: 50%;
		width: 28px;
		height: 2px;
		border-radius: 0 0 3px 3px;
		background: var(--accent);
		box-shadow: 0 0 8px var(--accent);
		transform: translateX(-50%);
		content: '';
	}

	.bottom-nav-icon {
		font-size: 19px;
		line-height: 1;
	}

	.bottom-nav-label {
		line-height: 1.2;
	}
}
</style>
