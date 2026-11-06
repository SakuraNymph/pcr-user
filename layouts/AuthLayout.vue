<template>
	<view class="auth-page" :class="`theme-${themeState.mode}`">
		<view class="auth-topbar">
			<view class="auth-brand" @click="redirectTo(routes.home)">⚔ PCR 作业站</view>
			<view class="back-home" @click="redirectTo(routes.home)">返回首页</view>
		</view>
		<view class="auth-card">
			<slot />
		</view>
	</view>
</template>

<script setup lang="ts">
import { redirectTo, routes } from '../router';
import { themeState } from '../theme';
</script>

<style>
.auth-page {
	min-height: 100vh;
	display: flex;
	flex-direction: column;
	background: radial-gradient(ellipse at 50% 15%, rgba(0, 95, 190, 0.18), transparent 48%), var(--bg-page);
	color: var(--text-primary);
}

.auth-topbar {
	min-height: 70px;
	padding: 0 28px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	background: linear-gradient(90deg, rgba(0, 24, 57, 0.96), rgba(0, 66, 140, 0.72), rgba(0, 20, 48, 0.96));
}

.auth-brand {
	color: #fff;
	font-size: 20px;
	font-weight: bold;
	cursor: pointer;
}

.back-home {
	color: var(--header-link);
	cursor: pointer;
}

.auth-card {
	width: calc(100% - 32px);
	max-width: 420px;
	margin: auto;
	padding: 34px;
	border: 1px solid var(--border-default);
	border-radius: 14px;
	background: linear-gradient(145deg, var(--bg-panel), var(--bg-panel-alt));
	box-shadow: 0 16px 45px var(--shadow);
}

@media screen and (max-width: 700px) {
	.auth-topbar {
		min-height: 60px;
		padding: 0 16px;
	}

	.auth-card {
		padding: 26px 22px;
	}
}
</style>
