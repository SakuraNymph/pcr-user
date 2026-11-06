<template>
	<view class="top-header">
		<view class="brand" @click="redirectTo(routes.home)">
			<view class="brand-icon">⚔</view>
			<view class="brand-info">
				<view class="brand-title">PCR 作业站</view>
				<view class="brand-subtitle">公主连结 · 公会战作业查询</view>
			</view>
		</view>
		<view class="header-navigation">
			<slot />
		</view>

		<view
			v-if="authState.isAuthenticated"
			class="user-menu"
			@mouseenter="openUserMenu"
			@mouseleave="scheduleCloseUserMenu"
			@keydown.esc.stop="closeUserMenu"
		>
			<view
				class="user-menu-trigger"
				:class="{ open: userMenuOpen }"
				role="button"
				tabindex="0"
				aria-haspopup="menu"
				:aria-expanded="userMenuOpen"
				@click.stop="toggleUserMenu"
				@keydown.enter.prevent="toggleUserMenu"
				@keydown.space.prevent="toggleUserMenu"
			>
				<text class="user-nickname">{{ authState.user?.nickname || '用户' }}</text>
				<text class="user-menu-chevron">⌄</text>
			</view>

			<Transition name="user-menu">
				<view
					v-if="userMenuOpen"
					class="user-menu-popover"
					role="menu"
					@click.stop
					@mouseenter="cancelCloseUserMenu"
				>
					<view
						class="user-menu-item"
						role="menuitem"
						tabindex="0"
						@click="openProfile"
						@keydown.enter.prevent="openProfile"
						@keydown.space.prevent="openProfile"
					>
						<text class="user-menu-icon">♙</text>
						<text class="user-menu-label">个人中心</text>
					</view>
					<view
						class="user-menu-item"
						:class="{ active: themePanelOpen }"
						role="menuitem"
						tabindex="0"
						aria-haspopup="menu"
						:aria-expanded="themePanelOpen"
						@click="toggleThemePanel"
						@keydown.enter.prevent="toggleThemePanel"
						@keydown.space.prevent="toggleThemePanel"
					>
						<text class="user-menu-icon">◐</text>
						<text class="user-menu-label">主题设置</text>
						<text class="user-menu-arrow">{{ themePanelOpen ? '⌃' : '›' }}</text>
					</view>
					<Transition name="theme-options">
						<view v-if="themePanelOpen" class="theme-options" role="menu">
							<view
								class="theme-option"
								:class="{ selected: themeState.preference === 'dark' }"
								role="menuitemradio"
								tabindex="0"
								:aria-checked="themeState.preference === 'dark'"
								@click="selectThemePreference('dark')"
								@keydown.enter.prevent="selectThemePreference('dark')"
								@keydown.space.prevent="selectThemePreference('dark')"
							>
								<text class="theme-swatch dark-swatch"></text>
								<text class="theme-option-label">深色</text>
								<text v-if="themeState.preference === 'dark'" class="theme-check">✓</text>
							</view>
							<view
								class="theme-option"
								:class="{ selected: themeState.preference === 'light' }"
								role="menuitemradio"
								tabindex="0"
								:aria-checked="themeState.preference === 'light'"
								@click="selectThemePreference('light')"
								@keydown.enter.prevent="selectThemePreference('light')"
								@keydown.space.prevent="selectThemePreference('light')"
							>
								<text class="theme-swatch light-swatch"></text>
								<text class="theme-option-label">浅色</text>
								<text v-if="themeState.preference === 'light'" class="theme-check">✓</text>
							</view>
							<view
								class="theme-option"
								:class="{ selected: themeState.preference === 'system' }"
								role="menuitemradio"
								tabindex="0"
								:aria-checked="themeState.preference === 'system'"
								@click="selectThemePreference('system')"
								@keydown.enter.prevent="selectThemePreference('system')"
								@keydown.space.prevent="selectThemePreference('system')"
							>
								<text class="theme-swatch system-swatch"></text>
								<text class="theme-option-label">跟随系统</text>
								<text v-if="themeState.preference === 'system'" class="theme-check">✓</text>
							</view>
						</view>
					</Transition>
					<view class="user-menu-divider"></view>
					<view
						class="user-menu-item logout-item"
						:class="{ disabled: loggingOut }"
						role="menuitem"
						tabindex="0"
						@click="confirmLogout"
						@keydown.enter.prevent="confirmLogout"
						@keydown.space.prevent="confirmLogout"
					>
						<text class="user-menu-icon">⇥</text>
						<text class="user-menu-label">{{ loggingOut ? '退出中...' : '退出' }}</text>
					</view>
				</view>
			</Transition>
		</view>
		<view v-else class="auth-actions">
			<view class="auth-button login-button" @click="navigateTo(routes.login)">登录</view>
			<view class="auth-button register-button" @click="navigateTo(routes.register)">注册</view>
		</view>
	</view>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { authState, clearAuthenticatedSession } from '../api/identity';
import { errorMessage, RequestError } from '../api/errors';
import { logoutUser } from '../api/user';
import { navigateTo, redirectTo, routes } from '../router';
import { setThemePreference, themeState } from '../theme';
import type { ThemePreference } from '../theme';

const userMenuOpen = ref(false);
const themePanelOpen = ref(false);
const loggingOut = ref(false);
let closeTimer: ReturnType<typeof setTimeout> | null = null;

function cancelCloseUserMenu(): void {
	if (closeTimer) {
		clearTimeout(closeTimer);
		closeTimer = null;
	}
}

function openUserMenu(): void {
	if (!supportsHover() || !authState.isAuthenticated || loggingOut.value) return;
	cancelCloseUserMenu();
	userMenuOpen.value = true;
}

function scheduleCloseUserMenu(): void {
	if (!supportsHover()) return;
	cancelCloseUserMenu();
	if (loggingOut.value) return;
	closeTimer = setTimeout(() => {
		userMenuOpen.value = false;
		themePanelOpen.value = false;
		closeTimer = null;
	}, 160);
}

function supportsHover(): boolean {
	return typeof window !== 'undefined'
		&& typeof window.matchMedia === 'function'
		&& window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

function toggleUserMenu(): void {
	if (!authState.isAuthenticated || loggingOut.value) return;
	cancelCloseUserMenu();
	userMenuOpen.value = !userMenuOpen.value;
	if (!userMenuOpen.value) {
		themePanelOpen.value = false;
	}
}

function toggleThemePanel(): void {
	themePanelOpen.value = !themePanelOpen.value;
}

function selectThemePreference(preference: ThemePreference): void {
	setThemePreference(preference);
	closeUserMenu();
}

function closeUserMenu(): void {
	cancelCloseUserMenu();
	userMenuOpen.value = false;
	themePanelOpen.value = false;
}

function openProfile(): void {
	closeUserMenu();
	navigateTo(routes.profile);
}

function confirmLogout(): void {
	if (loggingOut.value) return;
	closeUserMenu();
	uni.showModal({
		title: '退出登录',
		content: '确认退出当前账号吗？',
		confirmText: '退出',
		confirmColor: '#c44857',
		success: (result) => {
			if (result.confirm) {
				void performLogout();
			}
		},
	});
}

async function performLogout(): Promise<void> {
	if (loggingOut.value) return;
	loggingOut.value = true;
	try {
		await logoutUser();
	} catch (error) {
		if (!(error instanceof RequestError && error.statusCode === 401)) {
			uni.showToast({
				title: errorMessage(error, '退出失败，请稍后重试'),
				icon: 'none',
			});
			loggingOut.value = false;
			return;
		}
	}

	clearAuthenticatedSession();
	uni.showToast({ title: '已退出登录', icon: 'success' });
	setTimeout(() => redirectTo(routes.home), 250);
	loggingOut.value = false;
}

function handleDocumentClick(): void {
	if (userMenuOpen.value) {
		closeUserMenu();
	}
}

onMounted(() => {
	if (typeof document !== 'undefined') {
		document.addEventListener('click', handleDocumentClick);
	}
});

onBeforeUnmount(() => {
	cancelCloseUserMenu();
	if (typeof document !== 'undefined') {
		document.removeEventListener('click', handleDocumentClick);
	}
});
</script>

<style>
.top-header {
	height: 74px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 28px;
	background:
		linear-gradient(90deg, rgba(0, 16, 40, 0.58), rgba(0, 36, 80, 0.2) 48%, rgba(0, 16, 40, 0.62)),
		url('/static/images/top-banner.png') center center / cover no-repeat;
	box-shadow: 0 4px 18px rgba(0, 100, 255, 0.12);
}

.brand {
	display: flex;
	align-items: center;
	gap: 18px;
	cursor: pointer;
	flex-shrink: 0;
}

.header-navigation {
	flex: 1;
	min-width: 0;
	margin: 0 24px;
}

.brand-icon {
	font-size: 38px;
	color: #fff;
	text-shadow: 0 0 12px #0788ff;
}

.brand-title {
	font-size: 27px;
	font-weight: bold;
	letter-spacing: 1px;
	color: #fff;
	text-shadow: 0 0 10px rgba(0, 125, 255, 0.75);
}

.brand-subtitle {
	margin-top: 3px;
	font-size: 13px;
	color: var(--header-subtitle);
}

.auth-actions {
	display: flex;
	align-items: center;
	gap: 10px;
}

.user-menu {
	position: relative;
	z-index: 80;
	flex: 0 0 auto;
	display: flex;
	align-items: center;
	align-self: center;
}

.user-menu-trigger {
	min-height: 36px;
	padding: 0 9px 0 12px;
	display: flex;
	align-items: center;
	gap: 6px;
	border: 1px solid transparent;
	border-radius: 7px;
	color: var(--header-button-text);
	cursor: pointer;
	outline: none;
	transition: border-color 0.18s ease, background 0.18s ease;
}

.user-menu-trigger:hover,
.user-menu-trigger:focus,
.user-menu-trigger:focus-visible,
.user-menu-trigger.open {
	border-color: rgba(127, 190, 255, 0.5);
	background: rgba(2, 30, 62, 0.68);
}

.user-nickname {
	max-width: 180px;
	overflow: hidden;
	color: var(--header-button-text);
	font-size: 14px;
	font-weight: 600;
	line-height: 1;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.user-menu-chevron {
	color: #8fcfff;
	font-size: 13px;
	line-height: 1;
	transition: transform 0.18s ease;
}

.user-menu-trigger.open .user-menu-chevron {
	transform: rotate(180deg);
}

.user-menu-popover {
	position: absolute;
	top: calc(100% + 10px);
	right: 0;
	z-index: 90;
	width: 190px;
	padding: 7px;
	border: 1px solid var(--border-strong);
	border-radius: 9px;
	background: var(--bg-elevated);
	box-shadow: 0 16px 38px var(--shadow), 0 0 18px var(--accent-soft);
	color: var(--text-primary);
}

.user-menu-popover::before {
	position: absolute;
	top: -11px;
	right: 0;
	left: 0;
	height: 11px;
	content: '';
}

.user-menu-item {
	min-height: 38px;
	padding: 0 10px;
	display: flex;
	align-items: center;
	gap: 9px;
	border-radius: 6px;
	color: var(--text-secondary);
	font-size: 13px;
	cursor: pointer;
	transition: background 0.16s ease, color 0.16s ease;
}

.user-menu-item:hover,
.user-menu-item:focus,
.user-menu-item:focus-visible,
.user-menu-item.active {
	background: var(--bg-hover);
	color: var(--text-primary);
	outline: none;
}

.user-menu-icon {
	width: 18px;
	color: var(--accent-text);
	font-size: 15px;
	text-align: center;
}

.user-menu-label {
	min-width: 0;
	flex: 1;
}

.user-menu-arrow {
	color: var(--text-faint);
	font-size: 17px;
	line-height: 1;
}

.theme-options {
	margin: 3px 0 5px 27px;
	padding: 4px;
	border: 1px solid var(--border-subtle);
	border-radius: 7px;
	background: var(--bg-panel-alt);
}

.theme-option {
	min-height: 34px;
	padding: 0 8px;
	display: flex;
	align-items: center;
	gap: 8px;
	border-radius: 5px;
	color: var(--text-muted);
	font-size: 12px;
	cursor: pointer;
}

.theme-option:hover,
.theme-option:focus,
.theme-option:focus-visible,
.theme-option.selected {
	background: var(--accent-soft);
	color: var(--text-primary);
}

.theme-swatch {
	width: 15px;
	height: 15px;
	flex: 0 0 15px;
	border: 1px solid var(--border-default);
	border-radius: 50%;
}

.dark-swatch {
	background: linear-gradient(145deg, #0a3158, var(--bg-page));
}

.light-swatch {
	background: linear-gradient(145deg, #fff, #dcecff);
}

.system-swatch {
	background: linear-gradient(135deg, #0a3158 0 50%, #dcecff 50% 100%);
}

.theme-option-label {
	flex: 1;
}

.theme-check {
	color: var(--accent);
	font-size: 12px;
	font-weight: 700;
}

.user-menu-divider {
	height: 1px;
	margin: 5px 7px;
	background: var(--border-subtle);
}

.logout-item {
	color: var(--danger);
}

.logout-item .user-menu-icon {
	color: var(--danger);
}

.logout-item:hover,
.logout-item:focus {
	background: var(--danger-soft);
	color: var(--danger-strong);
}

.user-menu-item.disabled {
	opacity: 0.55;
	cursor: not-allowed;
}

.user-menu-enter-active,
.user-menu-leave-active,
.theme-options-enter-active,
.theme-options-leave-active {
	transition: opacity 0.16s ease, transform 0.16s ease;
}

.user-menu-enter-from,
.user-menu-leave-to,
.theme-options-enter-from,
.theme-options-leave-to {
	opacity: 0;
	transform: translateY(-4px);
}

.auth-button {
	min-width: 72px;
	height: 36px;
	padding: 0 16px;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1px solid rgba(127, 190, 255, 0.55);
	border-radius: 7px;
	color: var(--text-primary);
	font-size: 14px;
	cursor: pointer;
}

.register-button {
	border-color: #0786ff;
	background: #087cf5;
	color: #fff;
	font-weight: bold;
	box-shadow: 0 0 12px rgba(0, 119, 255, 0.38);
}

@media screen and (max-width: 700px) {
	.top-header {
		position: -webkit-sticky;
		position: sticky;
		top: 0;
		z-index: 100;
		min-height: 60px;
		height: auto;
		flex-wrap: wrap;
		padding: 0 12px;
	}

	.header-navigation {
		display: none;
	}

	.brand {
		gap: 8px;
	}

	.brand-icon {
		font-size: 28px;
	}

	.brand-title {
		font-size: 19px;
	}

	.brand-subtitle {
		font-size: 10px;
	}

	.auth-actions {
		gap: 5px;
	}

	.user-nickname {
		max-width: 110px;
		font-size: 12px;
	}

	.user-menu-trigger {
		min-height: 30px;
		padding: 0 7px 0 9px;
	}

	.user-menu-popover {
		right: -4px;
		width: min(190px, calc(100vw - 24px));
	}

	.auth-button {
		min-width: 48px;
		height: 30px;
		padding: 0 9px;
		font-size: 12px;
	}
}

@media screen and (min-width: 701px) and (max-width: 1000px) {
	.top-header {
		height: auto;
		min-height: 74px;
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		grid-template-rows: 74px 64px;
		align-items: center;
		padding: 0 18px;
	}

	.brand {
		grid-column: 1;
		grid-row: 1;
	}

	.header-navigation {
		grid-column: 1;
		grid-row: 2;
		width: 100%;
		margin: 0;
	}

	.user-menu,
	.auth-actions {
		grid-column: 2;
		grid-row: 1 / span 2;
		align-self: center;
		justify-self: end;
	}

	.user-nickname {
		max-width: 140px;
	}
}

</style>
