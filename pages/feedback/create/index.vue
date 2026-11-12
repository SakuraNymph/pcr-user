<template>
	<MainLayout active-menu="profile">
		<view class="feedback-create-page">
			<view class="create-heading">
				<view class="heading-copy">
					<view class="create-title">提交意见反馈</view>
					<view class="create-subtitle">
						请尽量描述清楚问题出现的步骤和期望结果，便于官方定位。
					</view>
				</view>
				<view class="back-button" @click="goBack">返回列表</view>
			</view>

			<view v-if="!authState.isAuthenticated" class="create-gate">
				<view class="gate-icon">✉</view>
				<view class="gate-title">登录后提交意见反馈</view>
				<view class="gate-copy">意见反馈仅对正式注册用户开放。</view>
				<view class="gate-actions">
					<view class="gate-button primary" @click="navigateTo(routes.login)">登录</view>
					<view class="gate-button" @click="navigateTo(routes.register)">注册账号</view>
				</view>
			</view>

			<view v-else class="create-card">
				<view class="field">
					<view class="field-head">
						<view class="field-label">反馈分类</view>
						<view class="field-required">必选</view>
					</view>
					<view class="category-grid">
						<view
							v-for="option in FEEDBACK_CATEGORIES"
							:key="option.value"
							class="category-option"
							:class="{ active: category === option.value }"
							@click="selectCategory(option.value)"
						>
							<view class="category-name">{{ option.label }}</view>
							<view class="category-desc">{{ option.description }}</view>
						</view>
					</view>
				</view>

				<view class="field">
					<view class="field-head">
						<view class="field-label">反馈标题</view>
						<view class="field-count">{{ titleLength }}/30</view>
					</view>
					<input
						v-model="title"
						class="text-input"
						type="text"
						:maxlength="30"
						placeholder="用一句话描述问题或建议"
					/>
					<view class="field-tip">2～30 个字符。</view>
				</view>

				<view class="field">
					<view class="field-head">
						<view class="field-label">反馈内容</view>
						<view class="field-count">{{ contentLength }}/1000</view>
					</view>
					<textarea
						v-model="content"
						class="text-area"
						:maxlength="1000"
						placeholder="请描述出现问题的步骤、期望的结果，或你希望新增的功能"
					/>
					<view class="field-tip">5～1000 个字符。</view>
				</view>

				<view class="field">
					<view class="field-head">
						<view class="field-label">图片（选填）</view>
						<view class="field-count">{{ images.length }}/{{ MAX_FEEDBACK_IMAGES }}</view>
					</view>
					<view class="image-grid">
						<view
							v-for="(image, index) in images"
							:key="image.key"
							class="image-item"
						>
							<image
								class="image-thumb"
								:src="image.previewUrl"
								mode="aspectFill"
								@click="previewImages(index)"
							/>
							<view class="image-remove" @click.stop="removeImage(index)">×</view>
						</view>
						<view
							v-if="images.length < MAX_FEEDBACK_IMAGES"
							class="image-add"
							@click="chooseImages"
						>
							<text class="add-icon">＋</text>
							<text class="add-label">添加图片</text>
						</view>
					</view>
					<view class="field-tip">
						支持 JPG、JPEG、PNG、WEBP，单张不超过 5MB，最多 3 张。
					</view>
				</view>

				<view class="submit-bar">
					<view v-if="submitting" class="submit-progress">
						{{ uploadPercent === null ? '提交中...' : `上传中 ${uploadPercent}%` }}
					</view>
					<view
						class="submit-button"
						:class="{ disabled: submitting }"
						@click="submit"
					>
						{{ submitting ? '提交中...' : '提交反馈' }}
					</view>
				</view>
			</view>
		</view>
	</MainLayout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import MainLayout from '../../../layouts/MainLayout.vue';
import { createFeedback } from '../../../api/feedback';
import { errorMessage } from '../../../api/errors';
import { authState } from '../../../api/identity';
import type { FeedbackCategory } from '../../../api/types';
import {
	FEEDBACK_CATEGORIES,
	MAX_FEEDBACK_IMAGES,
	pickFeedbackImages,
	type SelectedFeedbackImage,
} from '../../../utils/feedback';
import { navigateTo, routes } from '../../../router';

const category = ref<FeedbackCategory | 0>(0);
const title = ref('');
const content = ref('');
const images = ref<SelectedFeedbackImage[]>([]);
const submitting = ref(false);
const uploadPercent = ref<number | null>(null);

const titleLength = computed(() => countCharacters(title.value));
const contentLength = computed(() => countCharacters(content.value));

function countCharacters(value: string): number {
	return Array.from(value).length;
}

function selectCategory(value: FeedbackCategory): void {
	category.value = value;
}

function goBack(): void {
	const pages = getCurrentPages();

	if (pages.length > 1) {
		uni.navigateBack({ delta: 1 });
		return;
	}

	uni.reLaunch({ url: routes.feedback });
}

async function chooseImages(): Promise<void> {
	if (submitting.value) return;

	const selected = await pickFeedbackImages(images.value.length);

	if (selected.length) {
		images.value = [...images.value, ...selected].slice(0, MAX_FEEDBACK_IMAGES);
	}
}

function removeImage(index: number): void {
	if (submitting.value) return;
	images.value = images.value.filter((_, itemIndex) => itemIndex !== index);
}

function previewImages(index: number): void {
	const urls = images.value.map((image) => image.previewUrl).filter(Boolean);
	const current = images.value[index]?.previewUrl;

	if (!urls.length || !current) return;

	uni.previewImage({ urls, current });
}

async function submit(): Promise<void> {
	if (submitting.value) return;

	if (!authState.isAuthenticated) {
		uni.showToast({ title: '请先登录后再提交反馈', icon: 'none' });
		return;
	}

	if (!category.value) {
		uni.showToast({ title: '请选择反馈分类', icon: 'none' });
		return;
	}

	const trimmedTitle = title.value.trim();
	const trimmedContent = content.value.trim();
	const titleSize = countCharacters(trimmedTitle);
	const contentSize = countCharacters(trimmedContent);

	if (titleSize < 2 || titleSize > 30) {
		uni.showToast({ title: '反馈标题需要 2～30 个字符', icon: 'none' });
		return;
	}

	if (contentSize < 5 || contentSize > 1000) {
		uni.showToast({ title: '反馈内容需要 5～1000 个字符', icon: 'none' });
		return;
	}

	submitting.value = true;
	uploadPercent.value = null;

	try {
		const id = await createFeedback(
			{
				category: category.value as FeedbackCategory,
				title: trimmedTitle,
				content: trimmedContent,
				images: images.value.map((image) => image.file),
			},
			(percent) => {
				uploadPercent.value = percent;
			},
		);

		uni.showToast({ title: '反馈提交成功', icon: 'success' });
		setTimeout(() => {
			uni.redirectTo({ url: `${routes.feedbackDetail}?id=${id}` });
		}, 300);
	} catch (error) {
		submitting.value = false;
		uploadPercent.value = null;
		uni.showToast({
			title: errorMessage(error, '反馈提交失败，请稍后重试'),
			icon: 'none',
		});
	}
}
</script>

<style scoped>
.feedback-create-page {
	width: 100%;
	max-width: 1040px;
	margin: 0 auto;
}

.create-heading {
	padding: 17px 19px;
	display: flex;
	align-items: center;
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
}

.create-title {
	color: var(--text-primary);
	font-size: 22px;
	font-weight: 800;
}

.create-subtitle {
	margin-top: 6px;
	color: var(--text-muted);
	font-size: 12px;
	line-height: 1.6;
}

.back-button {
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

.create-gate {
	min-height: 340px;
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

.gate-icon {
	color: var(--accent-text);
	font-size: 34px;
}

.gate-title {
	color: var(--text-primary);
	font-size: 17px;
	font-weight: 800;
}

.gate-copy {
	color: var(--text-muted);
	font-size: 12px;
}

.gate-actions {
	display: flex;
	gap: 8px;
}

.gate-button {
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

.gate-button.primary {
	border-color: var(--accent);
	background: linear-gradient(180deg, var(--accent-strong), var(--accent));
	color: #fff;
	font-weight: 700;
}

.create-card {
	margin-top: 13px;
	padding: 19px;
	display: flex;
	flex-direction: column;
	gap: 20px;
	border: 1px solid var(--border-default);
	border-radius: 10px;
	background: linear-gradient(120deg, var(--bg-panel), var(--bg-panel-alt));
}

.field-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	margin-bottom: 9px;
}

.field-label {
	color: var(--text-primary);
	font-size: 14px;
	font-weight: 700;
}

.field-required {
	color: var(--danger);
	font-size: 10px;
	font-weight: 700;
}

.field-count {
	color: var(--text-faint);
	font-size: 10px;
}

.field-tip {
	margin-top: 7px;
	color: var(--text-faint);
	font-size: 10px;
	line-height: 1.6;
}

.category-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 8px;
}

.category-option {
	padding: 11px 13px;
	border: 1px solid var(--border-subtle);
	border-radius: 8px;
	background: var(--bg-panel-soft);
	cursor: pointer;
	transition: border-color 0.16s ease, background 0.16s ease;
}

.category-option.active {
	border-color: var(--accent);
	background: var(--accent-soft);
}

.category-name {
	color: var(--text-secondary);
	font-size: 13px;
	font-weight: 700;
}

.category-option.active .category-name {
	color: var(--accent-text);
}

.category-desc {
	margin-top: 4px;
	color: var(--text-faint);
	font-size: 10px;
	line-height: 1.5;
}

.text-input,
.text-area {
	width: 100%;
	box-sizing: border-box;
	padding: 10px 12px;
	border: 1px solid var(--border-default);
	border-radius: 7px;
	background: var(--bg-input);
	color: var(--text-primary);
	font-size: 13px;
	line-height: 1.6;
	outline: none;
}

.text-input {
	height: 40px;
}

.text-area {
	min-height: 140px;
}

.text-input:focus,
.text-area:focus {
	border-color: var(--border-strong);
}

.image-grid {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.image-item {
	position: relative;
	width: 92px;
	height: 92px;
	overflow: hidden;
	border: 1px solid var(--border-default);
	border-radius: 8px;
	background: var(--bg-subtle);
}

.image-thumb {
	width: 100%;
	height: 100%;
	display: block;
}

.image-remove {
	position: absolute;
	top: 3px;
	right: 3px;
	width: 20px;
	height: 20px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 50%;
	background: rgba(0, 0, 0, 0.62);
	color: #fff;
	font-size: 15px;
	line-height: 1;
	cursor: pointer;
}

.image-add {
	width: 92px;
	height: 92px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 4px;
	border: 1px dashed var(--border-strong);
	border-radius: 8px;
	background: var(--bg-panel-soft);
	color: var(--text-muted);
	cursor: pointer;
}

.add-icon {
	color: var(--accent-text);
	font-size: 20px;
	line-height: 1;
}

.add-label {
	font-size: 10px;
}

.submit-bar {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 12px;
}

.submit-progress {
	color: var(--text-muted);
	font-size: 11px;
}

.submit-button {
	min-width: 132px;
	min-height: 40px;
	padding: 0 18px;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1px solid var(--accent);
	border-radius: 7px;
	background: linear-gradient(180deg, var(--accent-strong), var(--accent));
	color: #fff;
	font-size: 13px;
	font-weight: 700;
	cursor: pointer;
}

.submit-button.disabled {
	opacity: 0.55;
	cursor: not-allowed;
}

@media screen and (max-width: 700px) {
	.create-heading {
		align-items: flex-start;
		flex-direction: column;
	}

	.create-title {
		font-size: 19px;
	}

	.create-card {
		padding: 14px;
		gap: 17px;
	}

	.category-grid {
		grid-template-columns: minmax(0, 1fr);
	}

	.image-item,
	.image-add {
		width: calc((100% - 16px) / 3);
		height: auto;
		aspect-ratio: 1 / 1;
	}

	.submit-bar {
		flex-direction: column;
		align-items: stretch;
	}

	.submit-button {
		width: 100%;
	}
}
</style>
