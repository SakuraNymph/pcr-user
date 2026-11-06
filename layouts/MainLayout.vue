<template>
	<view class="page" :class="`theme-${themeState.mode}`">
		<AppHeader>
			<AppMenu :active-menu="activeMenu" />
		</AppHeader>
		<view class="main-layout">
			<view class="content">
				<slot />
				<AppFooter />
			</view>
		</view>
		<AppBottomNav :active-menu="activeMenu" />
		<slot name="overlay" />
	</view>
</template>

<script setup lang="ts">
import AppHeader from '../components/AppHeader.vue';
import AppMenu from '../components/AppMenu.vue';
import AppFooter from '../components/AppFooter.vue';
import AppBottomNav from '../components/AppBottomNav.vue';
import { themeState } from '../theme';

defineProps<{ activeMenu: string }>();
</script>

<style>
.page {
	min-height: 100vh;
	background: radial-gradient(ellipse at 65% 0%, rgba(0, 95, 190, 0.18), transparent 48%), var(--bg-page);
	color: var(--text-primary);
}

.main-layout {
	display: flex;
	min-height: calc(100vh - 74px);
}

.content {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	padding: 10px 18px 20px;
	overflow: hidden;
	background: linear-gradient(145deg, var(--bg-content-start) 0%, var(--bg-content-end) 100%);
}

.content > .page-footer {
	margin-top: auto;
}

@media screen and (max-width: 1200px) {
	.content {
		padding: 10px;
	}
}

@media screen and (min-width: 701px) and (max-width: 1000px) {
	.main-layout {
		min-height: calc(100vh - 138px);
	}
}

@media screen and (max-width: 700px) {
	.main-layout {
		min-height: calc(100vh - 60px);
	}

	.content {
		padding: 8px 6px calc(72px + env(safe-area-inset-bottom, 0px));
	}
}
</style>
