<template>
	<view class="module-panel">
		<view class="module-heading">
			<view class="module-title">{{ title }}</view>
			<view class="module-description">{{ description }}</view>
		</view>
		<view class="module-empty">
			<view class="empty-icon">✦</view>
			<text>页面已创建，功能待接入</text>
		</view>
	</view>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ title: string; description?: string }>(), {
	description: '页面结构已就绪，待业务接口和交互规则确定后接入。',
});
</script>

<style>
.module-panel {
	width: 100%;
	max-width: 1440px;
	min-height: 70vh;
	margin: 0 auto;
	padding: 26px;
	display: flex;
	flex-direction: column;
	border: 1px solid rgba(44, 155, 211, 0.18);
	border-radius: 10px;
	background: linear-gradient(105deg, var(--bg-panel), var(--bg-panel-alt));
	box-shadow: inset 0 0 14px rgba(24, 119, 171, 0.025);
}

.module-title {
	color: var(--text-primary);
	font-size: 24px;
	font-weight: bold;
}

.module-description {
	margin-top: 8px;
	color: var(--text-muted);
	font-size: 13px;
}

.module-empty {
	flex: 1;
	min-height: 245px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 12px;
	color: var(--text-muted);
	font-size: 14px;
}

.empty-icon {
	color: #168cff;
	font-size: 32px;
	text-shadow: 0 0 12px rgba(0, 125, 255, 0.65);
}

@media screen and (max-width: 700px) {
	.module-panel {
		min-height: 70vh;
		padding: 18px;
	}

	.module-title {
		font-size: 20px;
	}

	.module-empty {
		min-height: 200px;
	}
}
</style>
