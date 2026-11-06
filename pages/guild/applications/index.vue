<template>
	<MainLayout active-menu="guild">
		<view class="guild-applications-page">
			<view class="applications-heading">
				<view>
					<view class="applications-title">加入申请</view>
					<view class="applications-subtitle">
						{{ guildName || '当前公会' }} · 仅展示待处理申请，申请有效期为 7 天。
					</view>
				</view>
				<view class="back-button" @click="goBack">返回公会</view>
			</view>

			<view v-if="!authState.isAuthenticated" class="applications-gate">
				<view class="gate-title">登录后审核加入申请</view>
				<view class="gate-copy">加入申请仅对公会会长和副会长开放。</view>
				<view class="gate-actions">
					<view class="gate-button primary" @click="navigateTo(routes.login)">登录</view>
					<view class="gate-button" @click="navigateTo(routes.register)">注册账号</view>
				</view>
			</view>

			<view v-else-if="loading" class="applications-state">
				<view class="loading-ring"></view>
				<text>正在加载加入申请...</text>
			</view>

			<view v-else-if="loadError" class="applications-state error-state">
				<text>{{ loadError }}</text>
				<view class="state-button" @click="loadApplications">重新加载</view>
			</view>

			<view v-else-if="!canReview" class="applications-state">
				<view class="empty-icon">◇</view>
				<view class="state-title">无权审核加入申请</view>
				<view class="state-copy">只有公会会长和副会长可以查看并处理加入申请。</view>
			</view>

			<view v-else-if="!applications.length" class="applications-state">
				<view class="empty-icon">✉</view>
				<view class="state-title">暂无待处理申请</view>
				<view class="state-copy">
					用户申请加入公会后会显示在这里，同意后会自动创建当前月份的 6 个空排刀位置。
				</view>
			</view>

			<view v-else class="application-list">
				<view
					v-for="application in applications"
					:key="application.id"
					class="application-card"
				>
					<view class="application-avatar">
						<image
							v-if="application.applicant_avatar_url"
							class="application-avatar-image"
							:src="application.applicant_avatar_url"
							mode="aspectFill"
						/>
						<text v-else>
							{{ guildAvatarText(application.applicant_nickname || `UID ${application.applicant_uid}`) }}
						</text>
					</view>

					<view class="application-copy">
						<view class="application-title">
							{{ application.applicant_nickname || `UID ${application.applicant_uid}` }}
						</view>
						<view class="application-meta">
							<text>UID {{ application.applicant_uid }}</text>
							<text>申请时间：{{ formatGuildDate(application.created_at) }}</text>
							<text>有效期至：{{ formatGuildDate(application.expires_at) }}</text>
							<text>状态：{{ application.status_name }}</text>
						</view>
					</view>

					<view class="application-actions">
						<view
							class="application-action primary"
							:class="{ disabled: actionPending }"
							@click="approveApplication(application)"
						>同意</view>
						<view
							class="application-action"
							:class="{ disabled: actionPending }"
							@click="rejectApplication(application)"
						>拒绝</view>
					</view>
				</view>
			</view>
		</view>
	</MainLayout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import MainLayout from '../../../layouts/MainLayout.vue';
import {
	approveGuildApplication,
	getGuildApplications,
	getGuildDetail,
	rejectGuildApplication,
} from '../../../api/guild';
import { errorMessage } from '../../../api/errors';
import { authState } from '../../../api/identity';
import type {
	GuildApplication,
	GuildDetail,
} from '../../../api/types';
import {
	formatGuildDate,
	guildAvatarText,
} from '../../../utils/guild';
import { navigateTo, routes } from '../../../router';

const guildId = ref(0);
const detail = ref<GuildDetail | null>(null);
const applications = ref<GuildApplication[]>([]);
const loading = ref(false);
const loadError = ref('');
const actionPending = ref(false);

const guildName = computed(() => detail.value?.name || '');
const canReview = computed(() => Boolean(
	detail.value?.permissions.can_review_applications,
));

onLoad((query) => {
	const id = Number(query?.id || 0);
	if (!Number.isInteger(id) || id <= 0) {
		loadError.value = '公会 ID 无效';
		return;
	}
	guildId.value = id;
});

onShow(() => {
	if (!authState.isAuthenticated) {
		detail.value = null;
		applications.value = [];
		loading.value = false;
		return;
	}
	if (guildId.value > 0) {
		void loadApplications();
	}
});

async function loadApplications(): Promise<void> {
	if (!authState.isAuthenticated || !guildId.value || loading.value) return;
	loading.value = true;
	loadError.value = '';

	try {
		const guildDetail = await getGuildDetail(guildId.value);
		detail.value = guildDetail;
		if (!guildDetail.permissions.can_review_applications) {
			applications.value = [];
			return;
		}

		const list = await getGuildApplications(guildId.value);
		applications.value = list.items;
	} catch (error) {
		loadError.value = errorMessage(error, '加载加入申请失败');
	} finally {
		loading.value = false;
	}
}

function goBack(): void {
	if (guildId.value > 0) {
		uni.navigateTo({
			url: `${routes.guildDetail}?id=${guildId.value}`,
		});
		return;
	}
	navigateTo(routes.guild);
}

function approveApplication(application: GuildApplication): void {
	if (actionPending.value) return;

	uni.showModal({
		title: '同意加入申请',
		content: `确认同意 ${application.applicant_nickname || `UID ${application.applicant_uid}`} 加入公会？对方将立即获得公会访问权限。`,
		confirmText: '确认同意',
		success: async (result) => {
			if (!result.confirm) return;
			actionPending.value = true;
			try {
				await approveGuildApplication(guildId.value, application.id);
				uni.showToast({ title: '已同意加入申请', icon: 'success' });
				await loadApplications();
			} catch (error) {
				uni.showToast({
					title: errorMessage(error, '同意加入申请失败'),
					icon: 'none',
				});
			} finally {
				actionPending.value = false;
			}
		},
	});
}

function rejectApplication(application: GuildApplication): void {
	if (actionPending.value) return;

	uni.showModal({
		title: '拒绝加入申请',
		content: `确认拒绝 ${application.applicant_nickname || `UID ${application.applicant_uid}`} 的加入申请？对方之后仍可重新申请。`,
		confirmText: '确认拒绝',
		confirmColor: '#f06a73',
		success: async (result) => {
			if (!result.confirm) return;
			actionPending.value = true;
			try {
				await rejectGuildApplication(guildId.value, application.id);
				uni.showToast({ title: '已拒绝加入申请', icon: 'success' });
				await loadApplications();
			} catch (error) {
				uni.showToast({
					title: errorMessage(error, '拒绝加入申请失败'),
					icon: 'none',
				});
			} finally {
				actionPending.value = false;
			}
		},
	});
}
</script>

<style scoped>
.guild-applications-page {
	width: 100%;
	max-width: 1040px;
	margin: 0 auto;
}

.applications-heading {
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

.applications-title {
	color: var(--text-primary);
	font-size: 22px;
	font-weight: 800;
}

.applications-subtitle {
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

.applications-gate,
.applications-state {
	min-height: 360px;
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
	max-width: 520px;
	color: var(--text-muted);
	font-size: 12px;
	line-height: 1.7;
}

.gate-actions {
	display: flex;
	gap: 9px;
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

.loading-ring {
	width: 28px;
	height: 28px;
	border: 2px solid var(--border-default);
	border-top-color: var(--accent);
	border-radius: 50%;
	animation: applications-spin 0.8s linear infinite;
}

.error-state {
	color: var(--danger);
}

.empty-icon {
	color: var(--accent-text);
	font-size: 34px;
}

.application-list {
	margin-top: 12px;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.application-card {
	padding: 14px;
	display: flex;
	align-items: center;
	gap: 13px;
	border: 1px solid var(--border-subtle);
	border-radius: 9px;
	background: var(--bg-panel-soft);
}

.application-avatar {
	width: 52px;
	height: 52px;
	flex: 0 0 52px;
	overflow: hidden;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1px solid var(--border-strong);
	border-radius: 9px;
	background: var(--accent-soft);
	color: var(--accent-text);
	font-size: 19px;
	font-weight: 800;
}

.application-avatar-image {
	width: 100%;
	height: 100%;
	display: block;
}

.application-copy {
	min-width: 0;
	flex: 1;
}

.application-title {
	overflow: hidden;
	color: var(--text-primary);
	font-size: 15px;
	font-weight: 700;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.application-meta {
	margin-top: 7px;
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 5px 14px;
	color: var(--text-faint);
	font-size: 11px;
}

.application-actions {
	flex: 0 0 auto;
	display: flex;
	gap: 7px;
}

.application-action {
	min-height: 33px;
	padding: 0 12px;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1px solid var(--border-default);
	border-radius: 6px;
	background: var(--bg-panel);
	color: var(--text-secondary);
	font-size: 11px;
	font-weight: 700;
	cursor: pointer;
}

.application-action.primary {
	border-color: var(--accent);
	background: linear-gradient(180deg, var(--accent-strong), var(--accent));
	color: #fff;
}

.application-action.disabled {
	opacity: 0.55;
	cursor: not-allowed;
}

@keyframes applications-spin {
	to {
		transform: rotate(360deg);
	}
}

@media screen and (max-width: 700px) {
	.applications-heading {
		align-items: flex-start;
		flex-direction: column;
	}

	.application-card {
		align-items: flex-start;
		flex-wrap: wrap;
	}

	.application-actions {
		width: 100%;
	}

	.application-action {
		flex: 1;
	}
}
</style>
