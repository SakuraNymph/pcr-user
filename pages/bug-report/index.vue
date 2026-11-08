<template>
	<MainLayout active-menu="bugReport">
		<view class="report-panel">
			<view class="report-heading">
				<view class="report-title">BUG反馈</view>
				<view class="report-description">
					使用中遇到问题或建议，欢迎扫码加入反馈群反馈。
				</view>
			</view>

			<view class="report-qr">
				<view class="report-qr-label">QQ反馈群</view>
				<image
					class="report-qr-image"
					:src="groupQrSrc"
					mode="widthFix"
					@click="openPreview"
				/>
				<view class="report-qr-tip">点击图片查看大图，长按保存后使用 QQ 扫码加群</view>
			</view>
		</view>

		<view
			v-if="previewVisible"
			class="preview-overlay"
			@click="closePreview"
			@touchmove.stop.prevent
		>
			<view class="preview-box" @click.stop>
				<view class="preview-close" @click="closePreview">×</view>
				<image class="preview-image" :src="groupQrSrc" mode="widthFix" />
			</view>
		</view>
	</MainLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import MainLayout from '../../layouts/MainLayout.vue';
import { BACKEND_ORIGIN, resolveAssetUrl } from '../../config';

const groupQrSrc = resolveAssetUrl(
	`${BACKEND_ORIGIN}/images/others/${encodeURIComponent('BUG反馈群二维码.jpg')}`,
);

const previewVisible = ref(false);

function openPreview(): void {
	previewVisible.value = true;
}

function closePreview(): void {
	previewVisible.value = false;
}
</script>

<style>
.report-panel {
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

.report-heading {
	margin-bottom: 22px;
}

.report-title {
	color: var(--text-primary);
	font-size: 24px;
	font-weight: bold;
}

.report-description {
	margin-top: 8px;
	color: var(--text-muted);
	font-size: 13px;
}

.report-qr {
	width: 300px;
	max-width: 100%;
	margin: 0 auto;
	padding: 18px;
	display: flex;
	flex-direction: column;
	align-items: center;
	border: 1px solid rgba(22, 140, 255, 0.28);
	border-radius: 10px;
	background: var(--bg-card, var(--bg-panel));
	box-shadow: 0 0 12px rgba(0, 125, 255, 0.08);
}

.report-qr-label {
	color: var(--text-primary);
	font-size: 16px;
	font-weight: bold;
	margin-bottom: 14px;
}

.report-qr-image {
	width: 100%;
	border-radius: 8px;
	background: #ffffff;
	cursor: pointer;
}

.report-qr-tip {
	margin-top: 14px;
	color: var(--text-muted);
	font-size: 12px;
	text-align: center;
	line-height: 1.6;
}

.preview-overlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 999;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgba(0, 0, 0, 0.78);
}

.preview-box {
	position: relative;
	max-width: 92vw;
	max-height: 90vh;
	padding: 10px;
	border-radius: 10px;
	background: #ffffff;
	box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5);
}

.preview-close {
	position: absolute;
	top: -40px;
	right: -6px;
	width: 32px;
	height: 32px;
	line-height: 32px;
	text-align: center;
	border-radius: 50%;
	color: #ffffff;
	font-size: 28px;
	background: rgba(0, 0, 0, 0.45);
	cursor: pointer;
}

.preview-image {
	max-width: 88vw;
	max-height: 82vh;
	border-radius: 6px;
}

@media screen and (max-width: 700px) {
	.report-panel {
		min-height: 70vh;
		padding: 18px;
	}

	.report-title {
		font-size: 20px;
	}

	.report-qr {
		width: 260px;
	}
}
</style>
