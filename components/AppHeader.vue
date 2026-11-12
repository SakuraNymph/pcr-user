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
				<image
					v-if="avatarUrl && !avatarLoadFailed"
					class="user-avatar"
					:src="avatarUrl"
					mode="aspectFill"
					@error="handleAvatarError"
				/>
				<view v-else class="user-avatar user-avatar-placeholder">{{ avatarText }}</view>
				<text class="user-nickname">{{ displayNickname }}</text>
				<text class="user-menu-chevron">⌄</text>
			</view>

			<Transition name="user-menu">
				<view
					v-if="userMenuOpen"
					class="user-menu-popover"
					role="menu"
					@click.stop
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
						<text class="user-menu-label">{{ loggingOut ? '退出中...' : '退出登录' }}</text>
					</view>
				</view>
			</Transition>
		</view>
		<view v-else class="auth-actions">
			<view class="auth-button login-button" @click="navigateTo(routes.login)">登录</view>
		</view>
	</view>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { authState, clearAuthenticatedSession } from '../api/identity';
import { errorMessage, RequestError } from '../api/errors';
import { logoutUser } from '../api/user';
import { navigateTo, redirectTo, routes } from '../router';

const userMenuOpen = ref(false);
const loggingOut = ref(false);
const avatarLoadFailed = ref(false);

const displayNickname = computed(() => authState.user?.nickname?.trim() || '用户');
const avatarUrl = computed(() => authState.user?.avatar_url?.trim() || '');
const avatarText = computed(() => Array.from(displayNickname.value)[0] || '用');

watch(avatarUrl, () => {
	avatarLoadFailed.value = false;
});

function toggleUserMenu(): void {
	if (!authState.isAuthenticated || loggingOut.value) return;
	userMenuOpen.value = !userMenuOpen.value;
}

function closeUserMenu(): void {
	userMenuOpen.value = false;
}

function openProfile(): void {
	closeUserMenu();
	navigateTo(routes.profile);
}

function handleAvatarError(): void {
	avatarLoadFailed.value = true;
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

.user-avatar {
	width: 30px;
	height: 30px;
	flex: 0 0 30px;
	overflow: hidden;
	border: 1px solid rgba(127, 190, 255, 0.55);
	border-radius: 50%;
	background: rgba(2, 30, 62, 0.7);
}

.user-avatar-placeholder {
	display: flex;
	align-items: center;
	justify-content: center;
	background: linear-gradient(145deg, var(--accent-strong), #064c94);
	color: #fff;
	font-size: 13px;
	font-weight: 700;
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
.user-menu-leave-active {
	transition: opacity 0.16s ease, transform 0.16s ease;
}

.user-menu-enter-from,
.user-menu-leave-to {
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

	.auth-actions {
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

	.user-nickname {
		max-width: 90px;
		font-size: 12px;
	}

	.user-menu-trigger {
		min-height: 30px;
		padding: 0 7px 0 6px;
		gap: 6px;
	}

	.user-avatar {
		width: 26px;
		height: 26px;
		flex-basis: 26px;
		font-size: 12px;
	}

	.user-menu-popover {
		right: -4px;
		width: min(190px, calc(100vw - 24px));
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
