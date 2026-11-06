<template>
	<MainLayout active-menu="guild">
		<view class="guild-search-page">
			<view class="search-heading">
				<view>
					<view class="search-title">搜索公会</view>
					<view class="search-subtitle">按公会名称查找正常运营的公会，点击进入详情。</view>
				</view>
				<view class="back-button" @click="navigateTo(routes.guild)">返回我的公会</view>
			</view>

			<view v-if="!authState.isAuthenticated" class="search-gate">
				<view class="gate-title">登录后搜索公会</view>
				<view class="gate-copy">访客不能搜索或查看公会详情。</view>
				<view class="gate-actions">
					<view class="gate-button primary" @click="navigateTo(routes.login)">登录</view>
					<view class="gate-button" @click="navigateTo(routes.register)">注册账号</view>
				</view>
			</view>

			<template v-else>
				<view class="search-bar">
					<input
						v-model="keyword"
						class="search-input"
						placeholder="输入公会名称关键词"
						maxlength="32"
						confirm-type="search"
						@confirm="runSearch(1)"
					/>
					<view class="search-button" @click="runSearch(1)">搜索</view>
				</view>

				<view class="search-meta">
					<text>共 {{ result?.total || 0 }} 个公会</text>
					<text v-if="keyword.trim()">关键词：{{ keyword.trim() }}</text>
					<text v-else>当前显示全部正常运营公会</text>
				</view>

				<view v-if="loading" class="search-state">
					<view class="loading-ring"></view>
					<text>正在搜索公会...</text>
				</view>

				<view v-else-if="errorText" class="search-state error-state">
					<text>{{ errorText }}</text>
					<view class="state-button" @click="runSearch(page)">重新搜索</view>
				</view>

				<view v-else-if="!items.length" class="search-state">
					<view class="empty-icon">◇</view>
					<view class="state-title">没有找到匹配的公会</view>
					<view class="state-copy">尝试更换关键词，或清空关键词查看全部公会。</view>
				</view>

				<view v-else class="search-results">
					<GuildSummaryCard
						v-for="guild in items"
						:key="guild.id"
						:guild="guild"
						clickable
						@click="openDetail(guild.id)"
					/>
				</view>

				<view v-if="result && result.last_page > 1" class="pagination">
					<view
						class="page-button"
						:class="{ disabled: page <= 1 || loading }"
						@click="changePage(page - 1)"
					>上一页</view>
					<view class="page-indicator">
						{{ page }} / {{ result.last_page }}
					</view>
					<view
						class="page-button"
						:class="{ disabled: page >= result.last_page || loading }"
						@click="changePage(page + 1)"
					>下一页</view>
				</view>
			</template>
		</view>
	</MainLayout>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import MainLayout from '../../../layouts/MainLayout.vue';
import GuildSummaryCard from '../../../components/GuildSummaryCard.vue';
import { searchGuilds } from '../../../api/guild';
import { errorMessage } from '../../../api/errors';
import { authState } from '../../../api/identity';
import type { GuildSearchPage, GuildSummary } from '../../../api/types';
import { navigateTo, routes } from '../../../router';

const keyword = ref('');
const page = ref(1);
const result = ref<GuildSearchPage | null>(null);
const items = ref<GuildSummary[]>([]);
const loading = ref(false);
const errorText = ref('');
let searchTimer: ReturnType<typeof setTimeout> | null = null;
let loadedOnce = false;
let requestSequence = 0;

watch(keyword, () => {
	if (!authState.isAuthenticated) return;
	if (searchTimer) clearTimeout(searchTimer);
	searchTimer = setTimeout(() => {
		void runSearch(1);
	}, 350);
});

onShow(() => {
	if (!authState.isAuthenticated) {
		items.value = [];
		result.value = null;
		loading.value = false;
		loadedOnce = false;
		requestSequence++;
		return;
	}
	if (!loadedOnce) {
		loadedOnce = true;
		void runSearch(1);
	}
});

onBeforeUnmount(() => {
	if (searchTimer) clearTimeout(searchTimer);
});

async function runSearch(targetPage: number): Promise<void> {
	if (!authState.isAuthenticated) return;
	if (targetPage < 1) return;
	if (result.value && targetPage > result.value.last_page) return;

	const sequence = ++requestSequence;
	loading.value = true;
	errorText.value = '';

	try {
		const next = await searchGuilds(keyword.value.trim(), targetPage);
		if (sequence !== requestSequence) return;
		result.value = next;
		items.value = next.items;
		page.value = next.page;
	} catch (error) {
		if (sequence !== requestSequence) return;
		errorText.value = errorMessage(error, '搜索公会失败');
	} finally {
		if (sequence === requestSequence) {
			loading.value = false;
		}
	}
}

function openDetail(guildId: number): void {
	uni.navigateTo({ url: `${routes.guildDetail}?id=${guildId}` });
}

function changePage(targetPage: number): void {
	if (loading.value) return;
	void runSearch(targetPage);
}
</script>

<style scoped>
.guild-search-page {
	width: 100%;
	max-width: 1080px;
	margin: 0 auto;
}

.search-heading {
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

.search-title {
	color: var(--text-primary);
	font-size: 22px;
	font-weight: 800;
}

.search-subtitle {
	margin-top: 6px;
	color: var(--text-muted);
	font-size: 12px;
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
	cursor: pointer;
}

.search-gate,
.search-state {
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

.gate-title,
.state-title {
	color: var(--text-primary);
	font-size: 17px;
	font-weight: 800;
}

.gate-copy,
.state-copy {
	color: var(--text-muted);
	font-size: 12px;
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

.gate-button.primary {
	border-color: var(--accent);
	background: linear-gradient(180deg, var(--accent-strong), var(--accent));
	color: #fff;
	font-weight: 700;
}

.search-bar {
	margin-top: 13px;
	padding: 10px;
	display: flex;
	gap: 8px;
	border: 1px solid var(--border-subtle);
	border-radius: 9px;
	background: var(--bg-panel-soft);
}

.search-input {
	min-width: 0;
	height: 41px;
	flex: 1;
	padding: 0 12px;
	border: 1px solid var(--border-default);
	border-radius: 7px;
	outline: none;
	background: var(--bg-input);
	color: var(--text-primary);
	font-size: 13px;
}

.search-input:focus {
	border-color: var(--accent);
	box-shadow: 0 0 0 2px var(--accent-soft);
}

.search-button {
	min-width: 90px;
	min-height: 41px;
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

.search-meta {
	margin: 10px 2px 0;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
	color: var(--text-faint);
	font-size: 11px;
}

.search-results {
	margin-top: 10px;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.loading-ring {
	width: 27px;
	height: 27px;
	border: 2px solid var(--border-default);
	border-top-color: var(--accent);
	border-radius: 50%;
	animation: search-spin 0.8s linear infinite;
}

.error-state {
	color: var(--danger);
}

.empty-icon {
	color: var(--accent-text);
	font-size: 34px;
}

.pagination {
	margin-top: 14px;
	padding: 10px;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 14px;
	border: 1px solid var(--border-subtle);
	border-radius: 8px;
	background: var(--bg-panel-soft);
}

.page-button {
	min-width: 80px;
	min-height: 33px;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1px solid var(--border-default);
	border-radius: 6px;
	background: var(--bg-panel-soft-alt);
	color: var(--accent-text);
	font-size: 11px;
	cursor: pointer;
}

.page-button.disabled {
	opacity: 0.4;
	cursor: not-allowed;
}

.page-indicator {
	color: var(--text-muted);
	font-size: 11px;
}

@keyframes search-spin {
	to {
		transform: rotate(360deg);
	}
}

@media screen and (max-width: 700px) {
	.search-heading {
		align-items: flex-start;
		flex-direction: column;
	}

	.search-title {
		font-size: 19px;
	}

	.search-meta {
		align-items: flex-start;
		flex-direction: column;
		gap: 4px;
	}
}
</style>
