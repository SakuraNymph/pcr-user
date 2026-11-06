<template>
	<view v-if="visible" class="qr-overlay" @click="close">
		<view class="qr-dialog" @click.stop>
			<view class="qr-header">
				<view class="qr-header-copy">
					<view class="qr-title">分享排刀表</view>
					<view class="qr-subtitle">{{ title }}</view>
				</view>
				<view class="qr-close" @click="close">×</view>
			</view>

			<view class="qr-canvas-wrap">
				<view
					class="qr-stage"
					:style="{ width: canvasSize + 'px', height: canvasSize + 'px' }"
				>
					<canvas
						v-if="stageReady"
						:id="CANVAS_ID"
						:canvas-id="CANVAS_ID"
						class="qr-canvas"
						:style="{ width: canvasSize + 'px', height: canvasSize + 'px' }"
					></canvas>
					<image
						v-if="imageSrc"
						class="qr-image"
						:src="imageSrc"
						mode="scaleToFill"
					/>
					<view v-if="!ready && !qrError" class="qr-loading">
						<view class="qr-spinner"></view>
						<text>正在生成二维码…</text>
					</view>
					<view v-if="qrError" class="qr-error">{{ qrError }}</view>
				</view>
			</view>

			<view class="qr-code-row">
				<text class="qr-code-label">分享码</text>
				<text class="qr-code">{{ shareCode }}</text>
			</view>
			<view class="qr-hint">{{ hintText }}</view>

			<view class="qr-actions">
				<view class="qr-button cancel" @click="close">关闭</view>
				<view
					class="qr-button confirm"
					:class="{ disabled: saving || !ready }"
					@click="saveImage"
				>{{ saving ? '保存中…' : '保存二维码' }}</view>
			</view>
		</view>
	</view>
</template>

<script setup lang="ts">
import {
	computed,
	getCurrentInstance,
	nextTick,
	ref,
	watch,
} from 'vue';
import { createQrMatrix } from '../utils/qrcode';

const props = defineProps<{
	visible: boolean;
	title: string;
	shareCode: string;
	shareUrl: string;
}>();

const emit = defineEmits<{
	(event: 'close'): void;
}>();

const CANVAS_ID = 'clan-schedule-share-qr';
const QUIET_ZONE = 4;
const MAX_CANVAS_SIZE = 280;
const SAVE_SIZE = 1080;

const instance = getCurrentInstance();
const canvasSize = ref(220);
const stageReady = ref(false);
const ready = ref(false);
const saving = ref(false);
const qrError = ref('');
const imageSrc = ref('');

const payload = computed(() => props.shareUrl || props.shareCode);
const isLink = computed(() => /^https?:\/\//i.test(payload.value));
const hintText = computed(() => (
	isLink.value
		? '使用手机扫码打开排刀表，即可共同编辑；长按二维码也可保存图片'
		: '扫码获取分享码，在“输入分享码”中粘贴即可加入'
));

watch(
	() => [props.visible, payload.value] as const,
	() => {
		if (props.visible) {
			void drawQr();
		} else {
			stageReady.value = false;
			ready.value = false;
			qrError.value = '';
			imageSrc.value = '';
		}
	},
	{ immediate: true },
);

async function drawQr(): Promise<void> {
	ready.value = false;
	qrError.value = '';
	imageSrc.value = '';
	stageReady.value = false;

	if (!props.visible || !payload.value) return;

	await nextTick();
	await delay(20);

	try {
		const matrix = createQrMatrix(payload.value);
		const totalModules = matrix.size + QUIET_ZONE * 2;
		const cell = Math.max(2, Math.floor(maxCanvasSize() / totalModules));
		const size = cell * totalModules;

		canvasSize.value = size;
		stageReady.value = true;
		await nextTick();
		await delay(50);

		const ctx = uni.createCanvasContext(CANVAS_ID, instance?.proxy) as any;
		ctx.setFillStyle('#ffffff');
		ctx.fillRect(0, 0, size, size);
		ctx.setFillStyle('#0b1c2e');

		for (let row = 0; row < matrix.size; row += 1) {
			for (let col = 0; col < matrix.size; col += 1) {
				if (!matrix.modules[row][col]) continue;
				ctx.fillRect(
					(col + QUIET_ZONE) * cell,
					(row + QUIET_ZONE) * cell,
					cell,
					cell,
				);
			}
		}

		await new Promise<void>((resolve, reject) => {
			let settled = false;
			const timer = setTimeout(() => {
				if (settled) return;
				settled = true;
				reject(new Error('二维码绘制超时'));
			}, 8000);

			ctx.draw(false, () => {
				if (settled) return;
				settled = true;
				clearTimeout(timer);
				resolve();
			});
		});

		ready.value = true;
		await delay(40);

		try {
			imageSrc.value = await canvasToTempFilePath();
		} catch {
			// The canvas itself is still visible and can be saved.
		}
	} catch (error) {
		qrError.value = error instanceof Error
			? error.message
			: '二维码生成失败';
	}
}

function maxCanvasSize(): number {
	const width = Number(uni.getSystemInfoSync().windowWidth) || 375;
	const overlayPadding = width <= 700 ? 12 : 18;
	const dialogPadding = width <= 700 ? 16 : 20;
	const available = width
		- overlayPadding * 2
		- dialogPadding * 2
		- 10;

	return Math.max(160, Math.min(MAX_CANVAS_SIZE, available));
}

function close(): void {
	if (saving.value) return;
	emit('close');
}

async function saveImage(): Promise<void> {
	if (!ready.value || saving.value) return;

	saving.value = true;

	try {
		const filePath = imageSrc.value || await canvasToTempFilePath();
		await saveTempFile(filePath);
	} catch (error) {
		uni.showToast({
			title: error instanceof Error
				? error.message
				: '保存二维码失败，请稍后重试',
			icon: 'none',
			duration: 2600,
		});
	} finally {
		saving.value = false;
	}
}

function canvasToTempFilePath(): Promise<string> {
	return new Promise((resolve, reject) => {
		(uni as any).canvasToTempFilePath({
			canvasId: CANVAS_ID,
			x: 0,
			y: 0,
			width: canvasSize.value,
			height: canvasSize.value,
			destWidth: SAVE_SIZE,
			destHeight: SAVE_SIZE,
			fileType: 'png',
			quality: 1,
			success: (result: { tempFilePath?: string }) => {
				if (!result.tempFilePath) {
					reject(new Error('二维码图片生成失败'));
					return;
				}
				resolve(result.tempFilePath);
			},
			fail: (error: { errMsg?: string }) => {
				reject(new Error(error.errMsg || '二维码图片生成失败'));
			},
		}, instance?.proxy);
	});
}

function saveTempFile(filePath: string): Promise<void> {
	// #ifdef H5
	return new Promise((resolve, reject) => {
		const doc = (globalThis as any).document;
		if (!doc) {
			reject(new Error('当前环境不支持保存二维码'));
			return;
		}

		try {
			const link = doc.createElement('a');
			link.href = filePath;
			link.download = `共享排刀表-分享二维码-${props.shareCode || 'share'}.png`;
			doc.body.appendChild(link);
			link.click();
			doc.body.removeChild(link);
			uni.showToast({ title: '二维码已保存', icon: 'success' });
			resolve();
		} catch (error) {
			reject(error instanceof Error ? error : new Error('二维码保存失败'));
		}
	});
	// #endif

	// #ifndef H5
	return new Promise((resolve, reject) => {
		uni.saveImageToPhotosAlbum({
			filePath,
			success: () => {
				uni.showToast({ title: '二维码已保存到相册', icon: 'success' });
				resolve();
			},
			fail: (error: { errMsg?: string }) => {
				reject(new Error(error.errMsg || '保存到相册失败'));
			},
		});
	});
	// #endif
}

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}
</script>

<style scoped>
.qr-overlay {
	position: fixed;
	inset: 0;
	z-index: 1100;
	padding: 18px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgba(0, 8, 18, 0.72);
	backdrop-filter: blur(3px);
}

.qr-dialog {
	width: min(380px, 100%);
	max-height: calc(100vh - 36px);
	padding: 20px;
	overflow-y: auto;
	border: 1px solid rgba(61, 166, 236, 0.38);
	border-radius: 10px;
	background: var(--bg-panel);
	box-shadow: 0 22px 60px rgba(0, 0, 0, 0.55);
}

.qr-header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 12px;
}

.qr-header-copy {
	min-width: 0;
}

.qr-title {
	color: var(--text-primary);
	font-size: 16px;
	font-weight: 800;
}

.qr-subtitle {
	margin-top: 4px;
	overflow: hidden;
	color: var(--text-muted);
	font-size: 11px;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.qr-close {
	width: 28px;
	height: 28px;
	display: flex;
	align-items: center;
	justify-content: center;
	flex: 0 0 auto;
	border-radius: 6px;
	color: var(--text-muted);
	font-size: 20px;
	line-height: 1;
	cursor: pointer;
}

.qr-close:hover {
	background: rgba(255, 255, 255, 0.06);
	color: var(--text-primary);
}

.qr-canvas-wrap {
	margin: 16px auto 0;
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 240px;
}

.qr-stage {
	position: relative;
	flex: 0 0 auto;
	overflow: hidden;
	border-radius: 9px;
	background: #ffffff;
	box-shadow: 0 0 0 1px var(--border-subtle);
}

.qr-canvas {
	display: block;
	background: #ffffff;
}

.qr-image {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	display: block;
}

.qr-loading {
	position: absolute;
	inset: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 10px;
	background: #ffffff;
	color: #4d6479;
	font-size: 11px;
}

.qr-spinner {
	width: 24px;
	height: 24px;
	border: 2px solid rgba(24, 132, 212, 0.2);
	border-top-color: #1884d4;
	border-radius: 50%;
	animation: qr-spin 0.8s linear infinite;
}

.qr-error {
	position: absolute;
	inset: 0;
	padding: 16px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: #ffffff;
	color: #b23b48;
	font-size: 12px;
	text-align: center;
}

.qr-code-row {
	margin-top: 13px;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
}

.qr-code-label {
	color: var(--text-faint);
	font-size: 10px;
}

.qr-code {
	padding: 3px 9px;
	border: 1px solid rgba(69, 185, 255, 0.3);
	border-radius: 5px;
	background: rgba(24, 132, 212, 0.12);
	color: #a9e2ff;
	font-size: 14px;
	font-weight: 800;
	letter-spacing: 0.14em;
}

.qr-hint {
	margin-top: 9px;
	color: var(--text-faint);
	font-size: 10px;
	line-height: 1.6;
	text-align: center;
}

.qr-actions {
	margin-top: 16px;
	display: flex;
	justify-content: flex-end;
	gap: 8px;
}

.qr-button {
	min-height: 32px;
	padding: 0 14px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 6px;
	font-size: 11px;
	font-weight: 700;
	cursor: pointer;
}

.qr-button.cancel {
	border: 1px solid var(--border-default);
	color: var(--text-muted);
}

.qr-button.confirm {
	border: 1px solid rgba(69, 185, 255, 0.46);
	background: linear-gradient(180deg, rgba(31, 147, 225, 0.85), rgba(13, 93, 157, 0.9));
	color: #effaff;
}

.qr-button.disabled {
	opacity: 0.45;
	cursor: not-allowed;
}

@keyframes qr-spin {
	to {
		transform: rotate(360deg);
	}
}

@media screen and (max-width: 700px) {
	.qr-overlay {
		padding: 12px;
	}

	.qr-dialog {
		padding: 16px;
	}

	.qr-canvas-wrap {
		min-height: 200px;
	}
}
</style>
