<template>
	<view class="sidebar">
		<view
			v-for="item in menuItems"
			:key="item.key"
			class="menu-item"
			:class="{ active: activeMenu === item.key, 'menu-item-extra': item.extra }"
			@click="handleItemClick(item)"
		>
			<text class="menu-icon">{{ item.icon }}</text>
			<text class="menu-label">{{ item.label }}</text>
		</view>

		<view class="more-menu-wrap">
			<view
				class="menu-item more-menu-trigger"
				:class="{ active: moreMenuActive }"
				role="button"
				tabindex="0"
				aria-haspopup="menu"
				:aria-expanded="moreOpen"
				@click.stop="toggleMoreMenu"
				@keydown.enter.prevent="toggleMoreMenu"
				@keydown.space.prevent="toggleMoreMenu"
				@keydown.esc.stop="closeMoreMenu"
			>
				<text class="menu-label">更多</text>
				<text class="more-chevron">{{ moreOpen ? '⌃' : '⌄' }}</text>
			</view>

			<Transition name="more-menu">
				<view v-if="moreOpen" class="more-menu-popover" role="menu" @click.stop>
					<view
						v-for="item in moreMenuItems"
						:key="item.key"
						class="more-menu-row"
						:class="{ active: activeMenu === item.key }"
						role="menuitem"
						tabindex="0"
						@click="selectMoreItem(item)"
						@keydown.enter.prevent="selectMoreItem(item)"
						@keydown.space.prevent="selectMoreItem(item)"
					>
						<text class="more-menu-icon">{{ item.icon }}</text>
						<text class="more-menu-label">{{ item.label }}</text>
						<text v-if="item.externalUrl" class="more-menu-external">↗</text>
					</view>
				</view>
			</Transition>
		</view>
	</view>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
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
	extra?: boolean;
}

const menuItems: NavItem[] = [
	{ key: 'home', label: '作业列表', icon: '⌂', path: routes.home },
	{ key: 'jobs', label: '我的作业', icon: '☑', path: routes.jobs },
	{ key: 'threeHitSet', label: 'D面套餐', icon: '⌘', path: routes.threeHitSet },
	{ key: 'sixHitSet', label: '满补套餐', icon: '♧', path: routes.sixHitSet },
	{ key: 'guild', label: '我的公会', icon: '◇', path: routes.guild, extra: true },
	{ key: 'account', label: '我的账号', icon: '♙', path: routes.account },
	{ key: 'help', label: '使用说明', icon: '⊞', path: routes.help },
	{ key: 'tutorial', label: '使用教程', icon: '▤', path: routes.tutorial, extra: true },
	{ key: 'bugReport', label: 'BUG反馈', icon: '⚠', path: routes.bugReport, extra: true },
	{ key: 'support', label: '支持作者', icon: '♥', path: routes.support, extra: true },
	{ key: 'github', label: 'GitHub', icon: '◈', path: null, externalUrl: externalLinks.github, extra: true },
];

const moreMenuItems: NavItem[] = [
	{ key: 'guild', label: '我的公会', icon: '◇', path: routes.guild },
	{ key: 'tutorial', label: '使用教程', icon: '▤', path: routes.tutorial },
	{ key: 'bugReport', label: 'BUG反馈', icon: '⚠', path: routes.bugReport },
	{ key: 'support', label: '支持作者', icon: '♥', path: routes.support },
	{ key: 'github', label: 'GitHub', icon: '◈', path: null, externalUrl: externalLinks.github },
];

const moreMenuKeys = ['guild', 'tutorial', 'bugReport', 'support'];
const moreOpen = ref(false);
const moreMenuActive = computed(() => moreOpen.value || moreMenuKeys.includes(props.activeMenu));

function toggleMoreMenu(): void {
	moreOpen.value = !moreOpen.value;
}

function handleItemClick(item: NavItem): void {
	if (item.externalUrl) {
		openExternalLink(item.externalUrl);
		return;
	}
	if (item.path) {
		redirectTo(item.path);
	}
}

function closeMoreMenu(): void {
	moreOpen.value = false;
}

function selectMoreItem(item: NavItem): void {
	moreOpen.value = false;
	if (item.externalUrl) {
		openExternalLink(item.externalUrl);
		return;
	}
	if (item.path) {
		redirectTo(item.path);
	}
}

function handleDocumentClick(): void {
	closeMoreMenu();
}

function handleDocumentKeydown(event: KeyboardEvent): void {
	if (event.key === 'Escape') {
		closeMoreMenu();
	}
}

onMounted(() => {
	if (typeof document !== 'undefined') {
		document.addEventListener('click', handleDocumentClick);
		document.addEventListener('keydown', handleDocumentKeydown);
	}
});

onBeforeUnmount(() => {
	if (typeof document !== 'undefined') {
		document.removeEventListener('click', handleDocumentClick);
		document.removeEventListener('keydown', handleDocumentKeydown);
	}
});
</script>

<style>
.sidebar {
	width: 100%;
	height: 64px;
	min-width: 0;
	display: flex;
	align-items: stretch;
	justify-content: flex-start;
	gap: 4px;
	background: transparent;
}

.menu-item {
	position: relative;
	height: 64px;
	min-height: 64px;
	padding: 0 13px;
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--header-nav-text);
	font-size: 14px;
	font-weight: 600;
	cursor: pointer;
	white-space: nowrap;
	transition: color 0.18s ease, background 0.18s ease;
}

.menu-item.active {
	position: relative;
	background: linear-gradient(180deg, rgba(0, 80, 175, 0.22), rgba(0, 43, 102, 0.08));
	color: #a9eaff;
	font-weight: 700;
	text-shadow: 0 0 4px rgba(69, 185, 255, 0.95), 0 0 10px rgba(0, 145, 255, 0.78), 0 0 20px rgba(0, 114, 255, 0.45);
}

.menu-item.active::before {
	position: absolute;
	left: 10px;
	right: 10px;
	bottom: 17px;
	height: 2px;
	border-radius: 3px;
	background: #52c8ff;
	box-shadow: 0 0 4px 1px rgba(83, 202, 255, 0.95), 0 0 10px 2px rgba(0, 139, 255, 0.8), 0 0 19px rgba(0, 139, 255, 0.48);
	content: '';
}

.menu-icon {
	display: none;
}

.more-menu-wrap {
	position: relative;
	display: none;
	height: 64px;
	align-items: stretch;
}

.more-chevron {
	margin-left: 4px;
	font-size: 12px;
	line-height: 1;
}

.more-menu-popover {
	position: absolute;
	top: calc(100% + 4px);
	right: 0;
	z-index: 95;
	width: 186px;
	padding: 6px;
	border: 1px solid var(--border-strong);
	border-radius: 9px;
	background: var(--bg-elevated);
	box-shadow: 0 16px 38px var(--shadow), 0 0 18px var(--accent-soft);
}

.more-menu-row {
	min-height: 40px;
	padding: 0 10px;
	display: flex;
	align-items: center;
	gap: 9px;
	border-radius: 6px;
	color: var(--text-secondary);
	font-size: 13px;
	cursor: pointer;
	white-space: nowrap;
}

.more-menu-row:hover,
.more-menu-row:focus,
.more-menu-row:focus-visible,
.more-menu-row.active {
	background: var(--bg-hover);
	color: var(--text-primary);
	outline: none;
}

.more-menu-icon {
	width: 18px;
	flex: 0 0 18px;
	color: var(--accent-text);
	font-size: 15px;
	text-align: center;
}

.more-menu-label {
	min-width: 0;
	flex: 1;
}

.more-menu-external {
	color: var(--text-faint);
	font-size: 13px;
}

.more-menu-enter-active,
.more-menu-leave-active {
	transition: opacity 0.16s ease, transform 0.16s ease;
}

.more-menu-enter-from,
.more-menu-leave-to {
	opacity: 0;
	transform: translateY(-4px);
}

@media screen and (max-width: 1200px) {
	.menu-item {
		padding: 0 9px;
		font-size: 13px;
	}
}

@media screen and (max-width: 1359px) {
	.menu-item-extra {
		display: none;
	}

	.more-menu-wrap {
		display: flex;
	}
}

@media screen and (min-width: 1001px) and (max-width: 1100px) {
	.menu-item {
		padding: 0 7px;
		font-size: 12px;
	}
}

@media screen and (min-width: 1360px) and (max-width: 1600px) {
	.menu-item {
		padding: 0 8px;
		font-size: 13px;
	}
}

@media screen and (min-width: 701px) and (max-width: 820px) {
	.menu-item {
		padding: 0 6px;
		font-size: 12px;
	}
}
</style>
