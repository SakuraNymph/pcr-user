<template>
	<MainLayout active-menu="guild">
		<view class="guild-invitations-page">
			<view class="invitations-heading">
				<view>
					<view class="invitations-title">公会邀请</view>
					<view class="invitations-subtitle">
						第一版只展示仍有效的待处理邀请。邀请有效期为 7 天。
					</view>
				</view>
				<view class="back-button" @click="navigateTo(routes.guild)">返回我的公会</view>
			</view>

			<view v-if="!authState.isAuthenticated" class="invitations-gate">
				<view class="gate-title">登录后查看公会邀请</view>
				<view class="gate-copy">公会邀请仅对正式注册用户开放。</view>
				<view class="gate-actions">
					<view class="gate-button primary" @click="navigateTo(routes.login)">登录</view>
					<view class="gate-button" @click="navigateTo(routes.register)">注册账号</view>
				</view>
			</view>

			<template v-else>
				<view class="invitation-tabs">
					<view
						class="invitation-tab"
						:class="{ active: activeTab === 'received' }"
						@click="activeTab = 'received'"
					>
						收到的邀请
						<text class="tab-count">{{ received.items.length }}</text>
					</view>
					<view
						class="invitation-tab"
						:class="{ active: activeTab === 'sent' }"
						@click="activeTab = 'sent'"
					>
						发出的邀请
						<text class="tab-count">{{ sent.items.length }}</text>
					</view>
				</view>

				<view v-if="loading" class="invitations-state">
					<view class="loading-ring"></view>
					<text>正在加载公会邀请...</text>
				</view>

				<view v-else-if="loadError" class="invitations-state error-state">
					<text>{{ loadError }}</text>
					<view class="state-button" @click="loadInvitations">重新加载</view>
				</view>

				<view v-else-if="!currentItems.length" class="invitations-state">
					<view class="empty-icon">✉</view>
					<view class="state-title">
						{{ activeTab === 'received' ? '暂无待处理邀请' : '暂无发出的待处理邀请' }}
					</view>
					<view class="state-copy">
						{{ activeTab === 'received'
							? '公会会长或副会长邀请你后会显示在这里。'
							: '你可以在公会详情页通过 UID 邀请新成员。' }}
					</view>
				</view>

				<view v-else class="invitation-list">
					<view
						v-for="invitation in currentItems"
						:key="invitation.id"
						class="invitation-card"
					>
						<view class="invitation-avatar">
							<image
								v-if="invitation.guild_avatar_url"
								class="invitation-avatar-image"
								:src="invitation.guild_avatar_url"
								mode="aspectFill"
							/>
							<text v-else>{{ guildAvatarText(invitation.guild_name) }}</text>
						</view>

						<view class="invitation-copy">
							<view class="invitation-title">
								{{ activeTab === 'received'
									? invitation.guild_name || '未知公会'
									: invitation.invitee_nickname || `UID ${invitation.invitee_uid}` }}
							</view>
							<view class="invitation-meta">
								<template v-if="activeTab === 'received'">
									<text>邀请人：{{ invitation.inviter_nickname || `UID ${invitation.inviter_uid}` }}</text>
									<text>邀请时间：{{ formatGuildDate(invitation.created_at) }}</text>
								</template>
								<template v-else>
									<text>UID {{ invitation.invitee_uid }}</text>
									<text>邀请时间：{{ formatGuildDate(invitation.created_at) }}</text>
									<text>状态：{{ invitation.status_name }}</text>
								</template>
								<text>有效期至：{{ formatGuildDate(invitation.expires_at) }}</text>
							</view>
						</view>

						<view class="invitation-actions">
							<template v-if="activeTab === 'received'">
								<view
									class="invitation-action primary"
									:class="{ disabled: actionPending }"
									@click="acceptInvitation(invitation)"
								>接受</view>
								<view
									class="invitation-action"
									:class="{ disabled: actionPending }"
									@click="rejectInvitation(invitation)"
								>拒绝</view>
							</template>
							<view
								v-else
								class="invitation-action danger"
								:class="{ disabled: actionPending }"
								@click="revokeInvitation(invitation)"
							>撤销邀请</view>
						</view>
					</view>
				</view>
			</template>
		</view>
	</MainLayout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import MainLayout from '../../../layouts/MainLayout.vue';
import {
	acceptGuildInvitation,
	getGuildInvitations,
	rejectGuildInvitation,
	revokeGuildInvitation,
} from '../../../api/guild';
import { errorMessage } from '../../../api/errors';
import { authState } from '../../../api/identity';
import type {
	GuildInvitation,
	GuildInvitationList,
} from '../../../api/types';
import {
	formatGuildDate,
	guildAvatarText,
} from '../../../utils/guild';
import { navigateTo, routes } from '../../../router';

type InvitationTab = 'received' | 'sent';

const activeTab = ref<InvitationTab>('received');
const received = ref<GuildInvitationList>({ items: [], count: 0 });
const sent = ref<GuildInvitationList>({ items: [], count: 0 });
const loading = ref(false);
const loadError = ref('');
const actionPending = ref(false);

const currentItems = computed(() => (
	activeTab.value === 'received' ? received.value.items : sent.value.items
));

onShow(() => {
	if (!authState.isAuthenticated) {
		received.value = { items: [], count: 0 };
		sent.value = { items: [], count: 0 };
		loading.value = false;
		return;
	}
	void loadInvitations();
});

async function loadInvitations(): Promise<void> {
	if (!authState.isAuthenticated || loading.value) return;
	loading.value = true;
	loadError.value = '';

	try {
		const [receivedList, sentList] = await Promise.all([
			getGuildInvitations('received'),
			getGuildInvitations('sent'),
		]);
		received.value = receivedList;
		sent.value = sentList;
	} catch (error) {
		loadError.value = errorMessage(error, '加载公会邀请失败');
	} finally {
		loading.value = false;
	}
}

function acceptInvitation(invitation: GuildInvitation): void {
	if (actionPending.value) return;

	uni.showModal({
		title: '接受公会邀请',
		content: `确认加入「${invitation.guild_name || '该公会'}」？加入后将占用一个公会成员名额。`,
		confirmText: '确认加入',
		success: async (result) => {
			if (!result.confirm) return;
			actionPending.value = true;
			try {
				const guild = await acceptGuildInvitation(invitation.id);
				uni.showToast({ title: '已加入公会', icon: 'success' });
				await loadInvitations();
				uni.navigateTo({
					url: `${routes.guildDetail}?id=${guild.id}`,
				});
			} catch (error) {
				uni.showToast({
					title: errorMessage(error, '接受邀请失败'),
					icon: 'none',
				});
			} finally {
				actionPending.value = false;
			}
		},
	});
}

async function rejectInvitation(invitation: GuildInvitation): Promise<void> {
	if (actionPending.value) return;
	actionPending.value = true;

	try {
		await rejectGuildInvitation(invitation.id);
		uni.showToast({ title: '已拒绝邀请', icon: 'success' });
		await loadInvitations();
	} catch (error) {
		uni.showToast({
			title: errorMessage(error, '拒绝邀请失败'),
			icon: 'none',
		});
	} finally {
		actionPending.value = false;
	}
}

function revokeInvitation(invitation: GuildInvitation): void {
	if (actionPending.value) return;

	uni.showModal({
		title: '撤销邀请',
		content: `确认撤销发给 ${invitation.invitee_nickname || `UID ${invitation.invitee_uid}`} 的邀请？`,
		confirmText: '确认撤销',
		confirmColor: '#f06a73',
		success: async (result) => {
			if (!result.confirm) return;
			actionPending.value = true;
			try {
				await revokeGuildInvitation(invitation.id);
				uni.showToast({ title: '邀请已撤销', icon: 'success' });
				await loadInvitations();
			} catch (error) {
				uni.showToast({
					title: errorMessage(error, '撤销邀请失败'),
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
.guild-invitations-page {
	width: 100%;
	max-width: 1040px;
	margin: 0 auto;
}

.invitations-heading {
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

.invitations-title {
	color: var(--text-primary);
	font-size: 22px;
	font-weight: 800;
}

.invitations-subtitle {
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

.invitations-gate,
.invitations-state {
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

.invitation-tabs {
	margin-top: 13px;
	padding: 5px;
	display: flex;
	gap: 5px;
	border: 1px solid var(--border-subtle);
	border-radius: 9px;
	background: var(--bg-panel-soft);
}

.invitation-tab {
	min-height: 39px;
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 7px;
	border: 1px solid transparent;
	border-radius: 7px;
	color: var(--text-muted);
	font-size: 13px;
	font-weight: 700;
	cursor: pointer;
}

.invitation-tab.active {
	border-color: var(--border-strong);
	background: var(--accent-soft);
	color: var(--accent-text);
}

.tab-count {
	min-width: 19px;
	height: 19px;
	padding: 0 5px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 999px;
	background: var(--bg-subtle);
	color: var(--text-secondary);
	font-size: 9px;
}

.invitation-list {
	margin-top: 10px;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.invitation-card {
	padding: 13px;
	display: flex;
	align-items: center;
	gap: 12px;
	border: 1px solid var(--border-default);
	border-radius: 9px;
	background:
		radial-gradient(ellipse at 96% 0%, var(--accent-soft), transparent 48%),
		linear-gradient(120deg, var(--bg-panel), var(--bg-panel-alt));
}

.invitation-avatar {
	width: 54px;
	height: 54px;
	flex: 0 0 54px;
	overflow: hidden;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1px solid var(--border-strong);
	border-radius: 9px;
	background: var(--bg-subtle);
	color: var(--accent-text);
	font-size: 20px;
	font-weight: 800;
}

.invitation-avatar-image {
	width: 100%;
	height: 100%;
	display: block;
}

.invitation-copy {
	min-width: 0;
	flex: 1;
}

.invitation-title {
	color: var(--text-primary);
	font-size: 15px;
	font-weight: 800;
}

.invitation-meta {
	margin-top: 6px;
	display: flex;
	flex-wrap: wrap;
	gap: 4px 13px;
	color: var(--text-faint);
	font-size: 10px;
	line-height: 1.5;
}

.invitation-actions {
	display: flex;
	align-items: center;
	gap: 6px;
}

.invitation-action {
	min-width: 62px;
	min-height: 32px;
	padding: 0 9px;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1px solid var(--border-default);
	border-radius: 6px;
	background: var(--bg-panel-soft);
	color: var(--text-secondary);
	font-size: 11px;
	font-weight: 700;
	cursor: pointer;
}

.invitation-action.primary {
	border-color: var(--accent);
	background: linear-gradient(180deg, var(--accent-strong), var(--accent));
	color: #fff;
}

.invitation-action.danger {
	border-color: rgba(240, 106, 115, 0.45);
	background: var(--danger-soft);
	color: var(--danger);
}

.invitation-action.disabled {
	opacity: 0.45;
	cursor: not-allowed;
}

.loading-ring {
	width: 27px;
	height: 27px;
	border: 2px solid var(--border-default);
	border-top-color: var(--accent);
	border-radius: 50%;
	animation: invitation-spin 0.8s linear infinite;
}

.error-state {
	color: var(--danger);
}

.empty-icon {
	color: var(--accent-text);
	font-size: 34px;
}

@keyframes invitation-spin {
	to {
		transform: rotate(360deg);
	}
}

@media screen and (max-width: 700px) {
	.invitations-heading {
		align-items: flex-start;
		flex-direction: column;
	}

	.invitations-title {
		font-size: 19px;
	}

	.invitation-card {
		align-items: flex-start;
		flex-wrap: wrap;
	}

	.invitation-actions {
		width: 100%;
		padding-left: 66px;
	}

	.invitation-action {
		flex: 1;
	}
}
</style>
