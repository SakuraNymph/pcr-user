<template>
	<MainLayout active-menu="profile">
		<view class="feedback-page">
			<view class="feedback-heading">
				<view class="heading-copy">
					<view class="feedback-title">意见反馈</view>
					<view class="feedback-subtitle">
						提交使用问题与建议，并在这里查看官方回复。
					</view>
				</view>
				<view
					v-if="authState.isAuthenticated"
					class="create-button"
					@click="openCreate"
				>
					新建反馈
				</view>
			</view>

			<view v-if="!authState.isAuthenticated" class="feedback-gate">
				<view class="gate-icon">✉</view>
				<view class="gate-title">登录后使用意见反馈</view>
				<view class="gate-copy">意见反馈仅对正式注册用户开放。</view>
				<view class="gate-actions">
					<view class="gate-button primary" @click="navigateTo(routes.login)">登录</view>
					<view class="gate-button" @click="navigateTo(routes.register)">注册账号</view>
				</view>
			</view>

			<template v-else>
				<view class="feedback-tabs">
					<view
						class="feedback-tab"
						:class="{ active: activeFilter === 'all' }"
						@click="switchFilter('all')"
					>
						全部反馈
					</view>
					<view
						class="feedback-tab"
						:class="{ active: activeFilter === 'unread' }"
						@click="switchFilter('unread')"
					>
						未读
					</view>
				</view>

				<view v-if="loading" class="feedback-state">
					<view class="loading-ring"></view>
					<text>正在加载意见反馈...</text>
				</view>

				<view v-else-if="loadError" class="feedback-state error-state">
					<text>{{ loadError }}</text>
					<view class="state-button" @click="reload">重新加载</view>
				</view>

				<view v-else-if="!items.length" class="feedback-state">
					<view class="empty-icon">✉</view>
					<view class="state-title">
						{{ activeFilter === 'unread' ? '暂无未读回复' : '还没有提交过意见反馈' }}
					</view>
					<view class="state-copy">
						{{ activeFilter === 'unread'
							? '官方回复后，未读消息会出现在这里。'
							: '遇到问题或有建议时，可以提交反馈与官方沟通。' }}
					</view>
					<view
						v-if="activeFilter === 'all'"
						class="state-button primary"
						@click="openCreate"
					>
						新建反馈
					</view>
				</view>

				<view v-else class="feedback-list">
					<view
						v-for="item in items"
						:key="item.id"
						class="feedback-card"
						@click="openDetail(item)"
					>
						<view class="card-head">
							<view class="card-title">{{ item.title }}</view>
							<view
								class="status-badge"
								:class="`tone-${feedbackStatusTone(item.status)}`"
							>
								{{ item.status_name }}
							</view>
						</view>

						<view class="card-meta">
							<text class="category-chip">{{ item.category_name }}</text>
							<text class="meta-text">最近活动：{{ formatDateTime(item.last_message_at) }}</text>
						</view>

						<view class="card-foot">
							<text class="meta-text">提交于 {{ formatDateTime(item.created_at) }}</text>
							<text v-if="item.unread_count > 0" class="unread-badge">
								{{ item.unread_count }} 条未读
							</text>
						</view>
					</view>

					<view class="list-footer">
						<text v-if="loadingMore">正在加载更多...</text>
						<text v-else-if="page < lastPage">上滑加载更多</text>
						<text v-else>没有更多了</text>
					</view>
				</view>
			</template>
		</view>
	</MainLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onReachBottom, onShow } from '@dcloudio/uni-app';
import MainLayout from '../../layouts/MainLayout.vue';
import { getFeedbackList, type FeedbackFilter } from '../../api/feedback';
import { errorMessage } from '../../api/errors';
import { authState } from '../../api/identity';
import type { FeedbackListItem } from '../../api/types';
import { feedbackStatusTone } from '../../utils/feedback';
import { formatDateTime } from '../../utils/text';
import { navigateTo, routes } from '../../router';

const activeFilter = ref<FeedbackFilter>('all');
const items = ref<FeedbackListItem[]>([]);
const page = ref(1);
const lastPage = ref(1);
const loading = ref(false);
const loadingMore = ref(false);
const loadError = ref('');
let requestSeq = 0;

onShow(() => {
	if (!authState.isAuthenticated) {
		resetState();
		return;
	}

	void reload();
});

onReachBottom(() => {
	void loadMore();
});

function resetState(): void {
	items.value = [];
	page.value = 1;
	lastPage.value = 1;
	loading.value = false;
	loadingMore.value = false;
	loadError.value = '';
}

async function reload(): Promise<void> {
	if (!authState.isAuthenticated) return;

	const seq = ++requestSeq;

	loading.value = true;
	loadError.value = '';

	try {
		const result = await getFeedbackList({ page: 1, filter: activeFilter.value });

		if (seq !== requestSeq) return;

		items.value = result.items ?? [];
		page.value = result.page ?? 1;
		lastPage.value = result.last_page ?? 1;
	} catch (error) {
		if (seq !== requestSeq) return;

		loadError.value = errorMessage(error, '加载意见反馈失败');
	} finally {
		if (seq === requestSeq) {
			loading.value = false;
		}
	}
}

async function loadMore(): Promise<void> {
	if (!authState.isAuthenticated || loading.value || loadingMore.value) return;
	if (page.value >= lastPage.value) return;

	const seq = requestSeq;
	loadingMore.value = true;

	try {
		const nextPage = page.value + 1;
		const result = await getFeedbackList({
			page: nextPage,
			filter: activeFilter.value,
		});

		if (seq !== requestSeq) return;

		const existingIds = new Set(items.value.map((item) => item.id));
		const nextItems = (result.items ?? []).filter((item) => !existingIds.has(item.id));

		items.value = [...items.value, ...nextItems];
		page.value = result.page ?? nextPage;
		lastPage.value = result.last_page ?? lastPage.value;
	} catch (error) {
		if (seq !== requestSeq) return;

		uni.showToast({
			title: errorMessage(error, '加载更多失败'),
			icon: 'none',
		});
	} finally {
		loadingMore.value = false;
	}
}

function switchFilter(filter: FeedbackFilter): void {
	if (activeFilter.value === filter) return;

	activeFilter.value = filter;
	items.value = [];
	page.value = 1;
	lastPage.value = 1;
	void reload();
}

function openCreate(): void {
	navigateTo(routes.feedbackCreate);
}

function openDetail(item: FeedbackListItem): void {
	uni.navigateTo({ url: `${routes.feedbackDetail}?id=${item.id}` });
}
</script>

<style scoped>
.feedback-page {
	width: 100%;
	max-width: 1040px;
	margin: 0 auto;
}

.feedback-heading {
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

.feedback-title {
	color: var(--text-primary);
	font-size: 22px;
	font-weight: 800;
}

.feedback-subtitle {
	margin-top: 6px;
	color: var(--text-muted);
	font-size: 12px;
}

.create-button {
	min-height: 34px;
	padding: 0 13px;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1px solid var(--accent);
	border-radius: 6px;
	background: linear-gradient(180deg, var(--accent-strong), var(--accent));
	color: #fff;
	font-size: 12px;
	font-weight: 700;
	white-space: nowrap;
	cursor: pointer;
}

.feedback-gate,
.feedback-state {
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

.gate-icon,
.empty-icon {
	color: var(--accent-text);
	font-size: 34px;
}

.gate-title,
.state-title {
	color: var(--text-primary);
	font-size: 17px;
	font-weight: 800;
}

.gate-copy,
.state-copy {
	padding: 0 18px;
	color: var(--text-muted);
	font-size: 12px;
	line-height: 1.6;
}

.gate-actions {
	display: flex;
	gap: 8px;
}

.gate-button,
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

.gate-button.primary,
.state-button.primary {
	border-color: var(--accent);
	background: linear-gradient(180deg, var(--accent-strong), var(--accent));
	color: #fff;
	font-weight: 700;
}

.feedback-tabs {
	margin-top: 13px;
	padding: 5px;
	display: flex;
	gap: 5px;
	border: 1px solid var(--border-subtle);
	border-radius: 9px;
	background: var(--bg-panel-soft);
}

.feedback-tab {
	min-height: 39px;
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1px solid transparent;
	border-radius: 7px;
	color: var(--text-muted);
	font-size: 13px;
	font-weight: 700;
	cursor: pointer;
}

.feedback-tab.active {
	border-color: var(--border-strong);
	background: var(--accent-soft);
	color: var(--accent-text);
}

.feedback-list {
	margin-top: 10px;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.feedback-card {
	padding: 14px;
	display: flex;
	flex-direction: column;
	gap: 9px;
	border: 1px solid var(--border-default);
	border-radius: 9px;
	background:
		radial-gradient(ellipse at 96% 0%, var(--accent-soft), transparent 48%),
		linear-gradient(120deg, var(--bg-panel), var(--bg-panel-alt));
	cursor: pointer;
	transition: border-color 0.16s ease, background 0.16s ease;
}

.feedback-card:hover {
	border-color: var(--border-strong);
}

.card-head {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 12px;
}

.card-title {
	min-width: 0;
	flex: 1;
	overflow: hidden;
	color: var(--text-primary);
	font-size: 15px;
	font-weight: 800;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.status-badge {
	flex: 0 0 auto;
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

.card-meta {
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

.meta-text {
	color: var(--text-faint);
	font-size: 10px;
	line-height: 1.5;
}

.card-foot {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
}

.unread-badge {
	flex: 0 0 auto;
	min-height: 20px;
	padding: 0 8px;
	display: inline-flex;
	align-items: center;
	border-radius: 999px;
	background: var(--danger);
	color: #fff;
	font-size: 10px;
	font-weight: 700;
}

.list-footer {
	padding: 10px 0 18px;
	color: var(--text-faint);
	font-size: 11px;
	text-align: center;
}

.loading-ring {
	width: 27px;
	height: 27px;
	border: 2px solid var(--border-default);
	border-top-color: var(--accent);
	border-radius: 50%;
	animation: feedback-spin 0.8s linear infinite;
}

.error-state {
	color: var(--danger);
}

@keyframes feedback-spin {
	to {
		transform: rotate(360deg);
	}
}

@media screen and (max-width: 700px) {
	.feedback-heading {
		align-items: flex-start;
		flex-direction: column;
	}

	.feedback-title {
		font-size: 19px;
	}

	.create-button {
		width: 100%;
	}

	.feedback-gate,
	.feedback-state {
		min-height: 300px;
	}

	.feedback-card {
		padding: 13px;
	}

	.card-title {
		font-size: 14px;
	}
}

@media (prefers-reduced-motion: reduce) {
	.loading-ring {
		animation-duration: 0.01ms;
	}
}
</style>
