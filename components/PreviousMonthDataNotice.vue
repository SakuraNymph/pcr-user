<template>
	<view
		class="previous-month-data-notice"
		role="note"
		aria-label="数据均为上月数据，仅做展示体验使用"
	>
		<view class="previous-month-data-notice-mark" aria-hidden="true">i</view>
		<view class="previous-month-data-notice-content">
			<text class="previous-month-data-notice-title">数据均为上月数据</text>
			<text class="previous-month-data-notice-hint">仅做展示体验使用</text>
		</view>
	</view>
</template>

<style scoped>
.previous-month-data-notice {
	margin-top: 12px;
	padding: 10px 14px;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	border: 1px solid rgba(207, 151, 66, 0.38);
	border-radius: 8px;
	background: linear-gradient(90deg, rgba(207, 151, 66, 0.13), var(--bg-panel-soft));
	color: var(--text-secondary);
}

.previous-month-data-notice-mark {
	width: 22px;
	height: 22px;
	flex: 0 0 22px;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1px solid rgba(207, 151, 66, 0.5);
	border-radius: 50%;
	color: var(--warning);
	font-size: 12px;
	font-weight: 700;
	line-height: 1;
}

.previous-month-data-notice-content {
	min-width: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-wrap: nowrap;
	gap: 5px 10px;
	text-align: center;
}

.previous-month-data-notice-title {
	color: var(--text-primary);
	font-size: 13px;
	font-weight: 700;
	white-space: nowrap;
}

.previous-month-data-notice-hint {
	color: var(--text-muted);
	font-size: 12px;
	white-space: nowrap;
}

@media screen and (max-width: 700px) {
	.previous-month-data-notice {
		padding: 9px 10px;
	}
}
</style>
