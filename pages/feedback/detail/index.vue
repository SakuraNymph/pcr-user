<template>
	<MainLayout active-menu="profile">
		<view class="feedback-detail-page">
			<view class="detail-heading">
				<view class="heading-copy">
					<view class="detail-title">{{ detail?.title || '反馈详情' }}</view>
					<view v-if="detail" class="detail-meta">
						<text class="category-chip">{{ detail.category_name }}</text>
						<text
							class="status-badge"
							:class="`tone-${feedbackStatusTone(detail.status)}`"
						>
							{{ detail.status_name }}
						</text>
						<text class="meta-text">提交于 {{ formatDateTime(detail.created_at) }}</text>
						<text class="meta-text">最近活动：{{ formatDateTime(detail.last_message_at) }}</text>
					</view>
				</view>
				<view class="heading-actions">
					<view class="ghost-button" @click="goBack">返回列表</view>
					<view class="ghost-button" @click="loadDetail">刷新</view>
				</view>
			</view>

			<view v-if="!authState.isAuthenticated" class="detail-state">
				<view class="state-icon">✉</view>
				<view class="state-title">登录后查看反馈详情</view>
				<view class="state-copy">意见反馈仅对正式注册用户开放。</view>
				<view class="state-actions">
					<view class="state-button primary" @click="navigateTo(routes.login)">登录</view>
					<view class="state-button" @click="navigateTo(routes.register)">注册账号</view>
				</view>
			</view>

			<view v-else-if="loading && !detail" class="detail-state">
				<view class="loading-ring"></view>
				<text>正在加载反馈详情...</text>
			</view>

			<view v-else-if="loadError && !detail" class="detail-state error-state">
				<text>{{ loadError }}</text>
				<view class="state-actions">
					<view class="state-button primary" @click="loadDetail">重新加载</view>
					<view class="state-button" @click="goBack">返回列表</view>
				</view>
			</view>

			<template v-else-if="detail">
				<view class="message-list">
					<view
						v-for="message in detail.messages"
						:key="message.id"
						class="message-row"
						:class="message.sender_type === 1 ? 'mine' : 'official'"
					>
						<view class="message-bubble">
							<view class="message-head">
								<text class="sender-label">
									{{ message.sender_type === 1 ? '我' : '官方回复' }}
								</text>
								<text class="message-time">{{ formatDateTime(message.created_at) }}</text>
							</view>

							<view v-if="message.content" class="message-content">
								{{ message.content }}
							</view>

							<view v-if="message.images?.length" class="message-images">
								<image
									v-for="(image, index) in message.images"
									:key="image.id"
									class="message-image"
									:src="image.url"
									mode="aspectFill"
									@click="previewMessageImages(message, index)"
								/>
							</view>
						</view>
					</view>
				</view>

				<view class="composer">
					<view class="composer-head">
						<view class="composer-title">追加消息</view>
						<view class="composer-count">{{ draftLength }}/1000</view>
					</view>

					<textarea
						v-model="draft"
						class="composer-input"
						:maxlength="1000"
						placeholder="补充说明或继续沟通（也可以只发送图片）"
					/>

					<view v-if="draftImages.length" class="composer-images">
						<view
							v-for="(image, index) in draftImages"
							:key="image.key"
							class="composer-image-item"
						>
							<image
								class="composer-image"
								:src="image.previewUrl"
								mode="aspectFill"
								@click="previewDraftImages(index)"
							/>
							<view class="image-remove" @click.stop="removeDraftImage(index)">×</view>
						</view>
					</view>

					<view class="composer-bar">
						<view class="composer-tools">
							<view
								class="tool-button"
								:class="{ disabled: sending }"
								@click="chooseDraftImages"
							>
								＋ 图片 {{ draftImages.length }}/{{ MAX_FEEDBACK_IMAGES }}
							</view>
							<text v-if="sending" class="send-progress">
								{{ uploadPercent === null ? '发送中...' : `上传中 ${uploadPercent}%` }}
							</text>
						</view>
						<view
							class="send-button"
							:class="{ disabled: sending }"
							@click="send"
						>
							{{ sending ? '发送中...' : '发送' }}
						</view>
					</view>

					<view class="composer-tip">
						消息发送后不可修改或删除；图片链接有时效，停留过久可点击右上角刷新。
					</view>
					<view v-if="detail.status === 3" class="composer-tip warning">
						该反馈已关闭，发送消息后会重新进入处理中。
					</view>
				</view>
			</template>
		</view>
	</MainLayout>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import MainLayout from '../../../layouts/MainLayout.vue';
import {
	appendFeedbackMessage,
	getFeedbackDetail,
	markFeedbackRead,
} from '../../../api/feedback';
import { errorMessage } from '../../../api/errors';
import { authState } from '../../../api/identity';
import type { FeedbackDetail, FeedbackMessage } from '../../../api/types';
import {
	feedbackStatusTone,
	MAX_FEEDBACK_IMAGES,
	pickFeedbackImages,
	type SelectedFeedbackImage,
} from '../../../utils/feedback';
import { formatDateTime } from '../../../utils/text';
import { navigateTo, routes } from '../../../router';

const feedbackId = ref(0);
const detail = ref<FeedbackDetail | null>(null);
const loading = ref(false);
const loadError = ref('');
const draft = ref('');
const draftImages = ref<SelectedFeedbackImage[]>([]);
const sending = ref(false);
const uploadPercent = ref<number | null>(null);
const readInFlight = ref(false);
const scrolledOnce = ref(false);

const draftLength = computed(() => Array.from(draft.value).length);

onLoad((query) => {
	const raw = Number(query?.id);
	feedbackId.value = Number.isFinite(raw) && raw > 0 ? raw : 0;

	if (!feedbackId.value) {
		loadError.value = '反馈 ID 不正确';
	}
});

onShow(() => {
	if (!authState.isAuthenticated || !feedbackId.value) return;
	void loadDetail();
});

async function loadDetail(): Promise<void> {
	if (!authState.isAuthenticated) return;

	if (!feedbackId.value) {
		loadError.value = '反馈 ID 不正确';
		return;
	}

	if (loading.value) return;

	loading.value = true;
	loadError.value = '';

	try {
		detail.value = await getFeedbackDetail(feedbackId.value);
		await nextTick();
		scrollToBottom();
		void markReadIfNeeded();
	} catch (error) {
		const message = errorMessage(error, '加载反馈详情失败');

		if (detail.value) {
			uni.showToast({ title: message, icon: 'none' });
		} else {
			loadError.value = message;
		}
	} finally {
		loading.value = false;
	}
}

async function markReadIfNeeded(): Promise<void> {
	const current = detail.value;

	if (!current || readInFlight.value || current.unread_count <= 0) return;

	const messageIds = current.messages.map((message) => message.id);
	if (!messageIds.length) return;

	const throughMessageId = Math.max(...messageIds);
	readInFlight.value = true;

	try {
		const result = await markFeedbackRead(current.id, throughMessageId);

		if (detail.value && detail.value.id === current.id) {
			detail.value = { ...detail.value, unread_count: result.unread_count };
		}
	} catch {
		// 已读失败不打断阅读，下次进入详情会再次尝试。
	} finally {
		readInFlight.value = false;
	}
}

function scrollToBottom(): void {
	if (scrolledOnce.value) return;
	scrolledOnce.value = true;
	uni.pageScrollTo({ scrollTop: 999999, duration: 0 });
}

function goBack(): void {
	const pages = getCurrentPages();

	if (pages.length > 1) {
		uni.navigateBack({ delta: 1 });
		return;
	}

	uni.reLaunch({ url: routes.feedback });
}

function previewMessageImages(message: FeedbackMessage, index: number): void {
	const urls = message.images.map((image) => image.url).filter(Boolean);
	const current = message.images[index]?.url;

	if (!urls.length || !current) return;

	uni.previewImage({ urls, current });
}

async function chooseDraftImages(): Promise<void> {
	if (sending.value) return;

	const selected = await pickFeedbackImages(draftImages.value.length);

	if (selected.length) {
		draftImages.value = [...draftImages.value, ...selected].slice(0, MAX_FEEDBACK_IMAGES);
	}
}

function removeDraftImage(index: number): void {
	if (sending.value) return;
	draftImages.value = draftImages.value.filter((_, itemIndex) => itemIndex !== index);
}

function previewDraftImages(index: number): void {
	const urls = draftImages.value.map((image) => image.previewUrl).filter(Boolean);
	const current = draftImages.value[index]?.previewUrl;

	if (!urls.length || !current) return;

	uni.previewImage({ urls, current });
}

async function send(): Promise<void> {
	if (sending.value || !detail.value) return;

	const content = draft.value.trim();

	if (!content && !draftImages.value.length) {
		uni.showToast({ title: '请输入回复内容或至少上传一张图片', icon: 'none' });
		return;
	}

	sending.value = true;
	uploadPercent.value = null;

	try {
		const result = await appendFeedbackMessage(
			detail.value.id,
			{
				content,
				images: draftImages.value.map((image) => image.file),
			},
			(percent) => {
				uploadPercent.value = percent;
			},
		);

		if (detail.value) {
			detail.value = {
				...detail.value,
				messages: [...detail.value.messages, result.message],
				status: result.status,
				status_name: result.status_name,
				last_message_at: result.last_message_at,
			};
		}

		draft.value = '';
		draftImages.value = [];

		await nextTick();
		uni.pageScrollTo({ scrollTop: 999999, duration: 200 });
	} catch (error) {
		uni.showToast({
			title: errorMessage(error, '发送失败，请稍后重试'),
			icon: 'none',
		});
	} finally {
		sending.value = false;
		uploadPercent.value = null;
	}
}
</script>

<style scoped>
.feedback-detail-page {
	width: 100%;
	max-width: 1040px;
	margin: 0 auto;
}

.detail-heading {
	padding: 17px 19px;
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 14px;
	border: 1px solid var(--border-default);
	border-radius: 10px;
	background:
		radial-gradient(ellipse at 90% 0%, var(--accent-soft), transparent 50%),
		linear-gradient(115deg, var(--bg-panel), var(--bg-panel-alt));
}

.heading-copy {
	min-width: 0;
	flex: 1;
}

.detail-title {
	overflow: hidden;
	color: var(--text-primary);
	font-size: 21px;
	font-weight: 800;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.detail-meta {
	margin-top: 9px;
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 6px 12px;
}

.category-chip {
	min-height: 20px;
	padding: 0 8px;
	display: inline-flex;
	align-items: center;
	border: 1px solid var(--border-subtle);
	border-radius: 5px;
	background: var(--bg-subtle);
	color: var(--text-secondary);
	font-size: 10px;
}

.status-badge {
	min-height: 22px;
	padding: 0 9px;
	display: inline-flex;
	align-items: center;
	border: 1px solid var(--border-default);
	border-radius: 999px;
	font-size: 11px;
	font-weight: 700;
	white-space: nowrap;
}

.status-badge.tone-pending {
	border-color: rgba(240, 106, 115, 0.45);
	background: var(--danger-soft);
	color: var(--danger);
}

.status-badge.tone-processing {
	border-color: var(--border-strong);
	background: var(--accent-soft);
	color: var(--accent-text);
}

.status-badge.tone-replied {
	border-color: rgba(86, 196, 148, 0.45);
	background: rgba(86, 196, 148, 0.12);
	color: #6fd6a3;
}

.status-badge.tone-closed {
	background: var(--bg-subtle);
	color: var(--text-faint);
}

.meta-text {
	color: var(--text-faint);
	font-size: 10px;
}

.heading-actions {
	display: flex;
	gap: 7px;
}

.ghost-button {
	min-height: 34px;
	padding: 0 11px;
	display: flex;
	align-items: center;
	border: 1px solid var(--border-default);
	border-radius: 6px;
	background: var(--bg-panel-soft);
	color: var(--accent-text);
	font-size: 11px;
	font-weight: 700;
	white-space: nowrap;
	cursor: pointer;
}

.detail-state {
	min-height: 320px;
	margin-top: 13px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 10px;
	border: 1px solid var(--border-subtle);
	border-radius: 10px;
	background: var(--bg-panel-soft);
	color: var(--text-muted);
	text-align: center;
}

.state-icon {
	color: var(--accent-text);
	font-size: 34px;
}

.state-title {
	color: var(--text-primary);
	font-size: 17px;
	font-weight: 800;
}

.state-copy {
	color: var(--text-muted);
	font-size: 12px;
}

.state-actions {
	display: flex;
	gap: 8px;
}

.state-button {
	min-width: 108px;
	min-height: 37px;
	padding: 0 13px;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1px solid var(--border-default);
	border-radius: 7px;
	background: var(--bg-panel-soft);
	color: var(--text-secondary);
	font-size: 12px;
	cursor: pointer;
}

.state-button.primary {
	border-color: var(--accent);
	background: linear-gradient(180deg, var(--accent-strong), var(--accent));
	color: #fff;
	font-weight: 700;
}

.loading-ring {
	width: 27px;
	height: 27px;
	border: 2px solid var(--border-default);
	border-top-color: var(--accent);
	border-radius: 50%;
	animation: feedback-detail-spin 0.8s linear infinite;
}

.error-state {
	color: var(--danger);
}

.message-list {
	margin-top: 13px;
	padding: 16px;
	display: flex;
	flex-direction: column;
	gap: 12px;
	border: 1px solid var(--border-subtle);
	border-radius: 10px;
	background: var(--bg-panel-soft);
}

.message-row {
	display: flex;
}

.message-row.mine {
	justify-content: flex-end;
}

.message-row.official {
	justify-content: flex-start;
}

.message-bubble {
	max-width: min(78%, 620px);
	padding: 11px 13px;
	border: 1px solid var(--border-default);
	border-radius: 9px;
	background: var(--bg-panel);
}

.message-row.mine .message-bubble {
	border-color: rgba(76, 198, 255, 0.45);
	background: linear-gradient(160deg, rgba(0, 82, 160, 0.42), rgba(0, 45, 96, 0.32));
}

.message-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 14px;
}

.sender-label {
	color: var(--accent-text);
	font-size: 11px;
	font-weight: 700;
}

.message-time {
	color: var(--text-faint);
	font-size: 10px;
}

.message-content {
	margin-top: 7px;
	color: var(--text-secondary);
	font-size: 13px;
	line-height: 1.7;
	white-space: pre-wrap;
	word-break: break-word;
}

.message-images {
	margin-top: 9px;
	display: flex;
	flex-wrap: wrap;
	gap: 7px;
}

.message-image {
	width: 96px;
	height: 96px;
	border: 1px solid var(--border-default);
	border-radius: 7px;
	background: var(--bg-subtle);
	cursor: pointer;
}

.composer {
	margin-top: 13px;
	padding: 16px;
	border: 1px solid var(--border-default);
	border-radius: 10px;
	background: linear-gradient(120deg, var(--bg-panel), var(--bg-panel-alt));
}

.composer-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	margin-bottom: 9px;
}

.composer-title {
	color: var(--text-primary);
	font-size: 14px;
	font-weight: 700;
}

.composer-count {
	color: var(--text-faint);
	font-size: 10px;
}

.composer-input {
	width: 100%;
	box-sizing: border-box;
	min-height: 92px;
	padding: 10px 12px;
	border: 1px solid var(--border-default);
	border-radius: 7px;
	background: var(--bg-input);
	color: var(--text-primary);
	font-size: 13px;
	line-height: 1.6;
	outline: none;
}

.composer-input:focus {
	border-color: var(--border-strong);
}

.composer-images {
	margin-top: 9px;
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.composer-image-item {
	position: relative;
	width: 74px;
	height: 74px;
	overflow: hidden;
	border: 1px solid var(--border-default);
	border-radius: 7px;
	background: var(--bg-subtle);
}

.composer-image {
	width: 100%;
	height: 100%;
	display: block;
}

.image-remove {
	position: absolute;
	top: 3px;
	right: 3px;
	width: 18px;
	height: 18px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 50%;
	background: rgba(0, 0, 0, 0.62);
	color: #fff;
	font-size: 13px;
	line-height: 1;
	cursor: pointer;
}

.composer-bar {
	margin-top: 11px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
}

.composer-tools {
	display: flex;
	align-items: center;
	gap: 10px;
	flex-wrap: wrap;
}

.tool-button {
	min-height: 32px;
	padding: 0 11px;
	display: flex;
	align-items: center;
	border: 1px solid var(--border-default);
	border-radius: 6px;
	background: var(--bg-panel-soft);
	color: var(--text-secondary);
	font-size: 11px;
	cursor: pointer;
}

.tool-button.disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.send-progress {
	color: var(--text-muted);
	font-size: 11px;
}

.send-button {
	min-width: 92px;
	min-height: 34px;
	padding: 0 15px;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1px solid var(--accent);
	border-radius: 6px;
	background: linear-gradient(180deg, var(--accent-strong), var(--accent));
	color: #fff;
	font-size: 12px;
	font-weight: 700;
	cursor: pointer;
}

.send-button.disabled {
	opacity: 0.55;
	cursor: not-allowed;
}

.composer-tip {
	margin-top: 8px;
	color: var(--text-faint);
	font-size: 10px;
	line-height: 1.6;
}

.composer-tip.warning {
	color: var(--danger);
}

@keyframes feedback-detail-spin {
	to {
		transform: rotate(360deg);
	}
}

@media screen and (max-width: 700px) {
	.detail-heading {
		flex-direction: column;
	}

	.detail-title {
		font-size: 18px;
		white-space: normal;
	}

	.heading-actions {
		width: 100%;
	}

	.ghost-button {
		flex: 1;
		justify-content: center;
	}

	.message-list,
	.composer {
		padding: 13px;
	}

	.message-bubble {
		max-width: 88%;
	}

	.message-image {
		width: 82px;
		height: 82px;
	}

	.composer-bar {
		flex-direction: column;
		align-items: stretch;
	}

	.send-button {
		width: 100%;
	}
}

@media (prefers-reduced-motion: reduce) {
	.loading-ring {
		animation-duration: 0.01ms;
	}
}
</style>
