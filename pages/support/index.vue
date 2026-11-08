<template>
	<MainLayout active-menu="support">
		<view class="support-panel">
			<view class="support-heading">
				<view class="support-title">支持作者</view>
				<view class="support-description">
					如果这个工具帮到了你，欢迎扫描下方收款码支持作者与项目维护。
				</view>
			</view>

			<view class="qr-grid">
				<view v-for="item in qrCodes" :key="item.key" class="qr-card">
					<view class="qr-label">{{ item.label }}</view>
					<image class="qr-image" :src="item.src" mode="widthFix" @click="openPreview(item.src)" />
					<view class="qr-tip">{{ item.tip }}</view>
				</view>
			</view>
		</view>

		<view
			v-if="previewSrc"
			class="preview-overlay"
			@click="closePreview"
			@touchmove.stop.prevent
		>
			<view class="preview-box" @click.stop>
				<view class="preview-close" @click="closePreview">×</view>
				<image class="preview-image" :src="previewSrc" mode="widthFix" />
			</view>
		</view>
	</MainLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import MainLayout from '../../layouts/MainLayout.vue';
import { BACKEND_ORIGIN, resolveAssetUrl } from '../../config';

const qrCodes = [
	{
		key: 'wechat',
		label: '微信收款码',
		tip: '点击图片查看大图，长按保存后用微信「扫一扫」扫码支持',
		src: resolveAssetUrl(`${BACKEND_ORIGIN}/images/others/vx.png`),
	},
	{
		key: 'alipay',
		label: '支付宝收款码',
		tip: '点击图片查看大图，长按保存后用支付宝「扫一扫」扫码支持',
		src: resolveAssetUrl(`${BACKEND_ORIGIN}/images/others/zfb.jpg`),
	},
];

const previewSrc = ref<string | null>(null);

function openPreview(src: string): void {
	previewSrc.value = src;
}

function closePreview(): void {
	previewSrc.value = null;
}
</script>

<style>
.support-panel {
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

.support-heading {
	margin-bottom: 22px;
}

.support-title {
	color: var(--text-primary);
	font-size: 24px;
	font-weight: bold;
}

.support-description {
	margin-top: 8px;
	color: var(--text-muted);
	font-size: 13px;
}

.qr-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 20px;
}

.qr-card {
	padding: 18px;
	display: flex;
	flex-direction: column;
	align-items: center;
	border: 1px solid rgba(22, 140, 255, 0.28);
	border-radius: 10px;
	background: var(--bg-card, var(--bg-panel));
	box-shadow: 0 0 12px rgba(0, 125, 255, 0.08);
}

.qr-label {
	color: var(--text-primary);
	font-size: 16px;
	font-weight: bold;
	margin-bottom: 14px;
}

.qr-image {
	width: 260px;
	border-radius: 8px;
	background: #ffffff;
	cursor: pointer;
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

.qr-tip {
	margin-top: 14px;
	color: var(--text-muted);
	font-size: 12px;
	text-align: center;
	line-height: 1.6;
}

@media screen and (max-width: 700px) {
	.support-panel {
		min-height: 70vh;
		padding: 18px;
	}

	.support-title {
		font-size: 20px;
	}

	.qr-grid {
		grid-template-columns: 1fr;
	}

	.qr-image {
		width: 220px;
	}
}
</style>
