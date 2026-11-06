<template>
	<MainLayout active-menu="guild">
		<view class="guild-detail-page">
			<view v-if="!authState.isAuthenticated" class="detail-gate">
				<view class="gate-title">登录后查看公会详情</view>
				<view class="gate-copy">访客不能查看公会详情和成员列表。</view>
				<view class="gate-actions">
					<view class="gate-button primary" @click="navigateTo(routes.login)">登录</view>
					<view class="gate-button" @click="navigateTo(routes.register)">注册账号</view>
				</view>
			</view>

			<view v-else-if="loading" class="detail-state">
				<view class="loading-ring"></view>
				<text>正在加载公会详情...</text>
			</view>

			<view v-else-if="loadError" class="detail-state error-state">
				<view class="state-title">{{ loadError }}</view>
				<view class="state-button" @click="loadDetail">重新加载</view>
			</view>

			<template v-else-if="detail">
				<view class="detail-toolbar">
					<view class="back-button" @click="navigateTo(routes.guildSearch)">‹ 返回搜索</view>
					<view class="toolbar-actions">
						<view
							v-if="detail.permissions.can_invite"
							class="toolbar-button"
							@click="inviteVisible = true"
						>邀请成员</view>
						<view
							v-if="detail.permissions.can_update_profile"
							class="toolbar-button"
							@click="profileVisible = true"
						>修改资料</view>
						<view
							v-if="detail.permissions.can_review_applications"
							class="toolbar-button"
							@click="goApplications"
						>加入申请（{{ detail.pending_application_count }}）</view>
						<view
							v-if="detail.permissions.is_member"
							class="toolbar-button primary"
							@click="goSchedule"
						>进入公会排刀</view>
					</view>
				</view>

				<GuildSummaryCard
					:guild="detail"
					:membership="detail.viewer_membership"
				/>

				<view class="detail-info-grid">
					<view class="info-card">
						<view class="info-label">公会身份</view>
						<view class="info-value">
							{{ detail.viewer_membership?.role_name || '非公会成员' }}
						</view>
					</view>
					<view class="info-card">
						<view class="info-label">当前成员</view>
						<view class="info-value">{{ detail.member_count }} / {{ GUILD_CAPACITY }}</view>
					</view>
					<view class="info-card">
						<view class="info-label">可用名额</view>
						<view class="info-value">
							{{ capacityLabel(detail.capacity_status, detail.remaining_slots, detail.member_count) }}
						</view>
					</view>
					<view class="info-card">
						<view class="info-label">邀请预留</view>
						<view class="info-value">{{ detail.pending_invitation_count }} 人</view>
					</view>
					<view class="info-card">
						<view class="info-label">申请预留</view>
						<view class="info-value">{{ detail.pending_application_count }} 人</view>
					</view>
				</view>

				<view v-if="detail.permissions.is_member" class="detail-section">
					<view class="section-heading">
						<view>
							<view class="section-title">成员列表</view>
							<view class="section-subtitle">
								完整成员名单仅当前公会成员可见，昵称统一使用个人中心昵称。
							</view>
						</view>
						<view class="section-count">{{ detail.members?.length || 0 }} 人</view>
					</view>

					<GuildMemberList
						:members="detail.members || []"
						:permissions="detail.permissions"
						:viewer-uid="viewerUid"
						@appoint-vice="handleAppointVice"
						@revoke-vice="handleRevokeVice"
						@kick="handleKick"
						@transfer="handleTransfer"
					/>
				</view>

				<view v-else class="members-private">
					<view class="private-icon">◇</view>
					<view class="private-title">成员列表仅公会成员可见</view>
					<view class="private-copy">加入公会后可以查看完整成员名单和公会排刀表。</view>
				</view>

				<view v-if="!detail.permissions.is_member" class="apply-panel">
					<view class="apply-copy">
						<view class="apply-title">{{ applyTitle }}</view>
						<view class="apply-description">{{ applyDescription }}</view>
						<view v-if="detail.viewer_application" class="apply-meta">
							<text>申请时间：{{ formatGuildDate(detail.viewer_application.created_at) }}</text>
							<text>有效期至：{{ formatGuildDate(detail.viewer_application.expires_at) }}</text>
						</view>
					</view>
					<view class="apply-actions">
						<view
							v-if="detail.can_apply"
							class="apply-button primary"
							:class="{ disabled: actionPending }"
							@click="confirmApply"
						>申请加入</view>
						<view
							v-else-if="detail.viewer_application"
							class="apply-button danger"
							:class="{ disabled: actionPending }"
							@click="confirmWithdrawApplication"
						>撤销申请</view>
						<view
							v-else-if="detail.apply_blocked_reason === 'pending_invitation'"
							class="apply-button"
							@click="goInvitations"
						>前往公会邀请</view>
						<view v-else class="apply-button disabled">不可申请</view>
					</view>
				</view>

				<view v-if="detail.permissions.is_member" class="detail-danger-zone">
					<view class="danger-copy">
						<view class="danger-title">公会关系操作</view>
						<view class="danger-desc">
							{{ detail.viewer_membership?.role === 1
								? '解散公会后，所有成员会立即失去公会及历史排刀访问权限。'
								: '退出公会后，你将无法继续访问该公会及历史排刀数据。' }}
						</view>
					</view>
					<view
						class="danger-button"
						@click="detail.viewer_membership?.role === 1 ? confirmDissolve() : confirmLeave()"
					>
						{{ detail.viewer_membership?.role === 1 ? '解散公会' : '退出公会' }}
					</view>
				</view>
			</template>
		</view>

		<GuildProfileModal
			v-if="profileVisible && detail"
			:guild="detail"
			@close="profileVisible = false"
			@saved="handleProfileSaved"
		/>
		<GuildInviteSearchModal
			v-if="inviteVisible && detail"
			:guild-id="detail.id"
			@close="inviteVisible = false"
			@sent="handleInvitationSent"
		/>
	</MainLayout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import MainLayout from '../../../layouts/MainLayout.vue';
import GuildSummaryCard from '../../../components/GuildSummaryCard.vue';
import GuildMemberList from '../../../components/GuildMemberList.vue';
import GuildProfileModal from '../../../components/GuildProfileModal.vue';
import GuildInviteSearchModal from '../../../components/GuildInviteSearchModal.vue';
import {
	appointGuildVice,
	applyToGuild,
	dissolveGuild,
	getGuildDetail,
	leaveGuild,
	kickGuildMember,
	revokeGuildVice,
	transferGuildOwner,
	withdrawGuildApplication,
} from '../../../api/guild';
import { errorMessage } from '../../../api/errors';
import { authState } from '../../../api/identity';
import type {
	GuildDetail,
	GuildInvitation,
	GuildMemberSummary,
} from '../../../api/types';
import {
	GUILD_CAPACITY,
	capacityLabel,
	formatGuildDate,
} from '../../../utils/guild';
import { navigateTo, routes } from '../../../router';

const guildId = ref(0);
const detail = ref<GuildDetail | null>(null);
const loading = ref(false);
const loadError = ref('');
const profileVisible = ref(false);
const inviteVisible = ref(false);
const actionPending = ref(false);

const viewerUid = computed(() => Number(authState.user?.id || 0));
const applyTitle = computed(() => {
	if (!detail.value) return '申请加入';
	if (detail.value.viewer_application) return '已申请，等待审核';
	if (detail.value.viewer_has_guild) return '已有公会';
	if (detail.value.apply_blocked_reason === 'pending_invitation') {
		return '已收到该公会邀请';
	}
	if (detail.value.apply_blocked_reason === 'no_slots') return '暂无可用名额';
	return '申请加入该公会';
});
const applyDescription = computed(() => {
	if (!detail.value) return '';
	if (detail.value.viewer_application) {
		return '会长或副会长审核通过后即可加入公会。';
	}
	if (detail.value.viewer_has_guild) {
		return '你已有公会，请先退出当前公会后再申请。';
	}
	if (detail.value.apply_blocked_reason === 'pending_invitation') {
		return '该公会已向你发送邀请，请前往公会邀请页面处理。';
	}
	if (detail.value.apply_blocked_reason === 'no_slots') {
		return '当前公会暂无可用名额，待名额释放后可以再次申请。';
	}
	return '提交申请后需要会长或副会长审核，申请有效期为 7 天。';
});

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
		loading.value = false;
		loadError.value = '';
		return;
	}
	if (guildId.value > 0) {
		void loadDetail();
	}
});

async function loadDetail(): Promise<void> {
	if (!authState.isAuthenticated || !guildId.value || loading.value) return;
	loading.value = true;
	loadError.value = '';

	try {
		detail.value = await getGuildDetail(guildId.value);
	} catch (error) {
		loadError.value = errorMessage(error, '加载公会详情失败');
	} finally {
		loading.value = false;
	}
}

function goSchedule(): void {
	uni.navigateTo({
		url: `${routes.guildSchedule}?id=${guildId.value}`,
	});
}

function goApplications(): void {
	uni.navigateTo({
		url: `${routes.guildApplications}?id=${guildId.value}`,
	});
}

function goInvitations(): void {
	navigateTo(routes.guildInvitations);
}

function confirmApply(): void {
	confirmAction(
		'申请加入公会',
		`确认申请加入「${detail.value?.name || '该公会'}」？申请有效期为 7 天，需等待会长或副会长审核。`,
		async () => {
			await applyToGuild(guildId.value);
			await loadDetail();
			uni.showToast({
				title: '申请已提交，请等待会长或副会长审核',
				icon: 'none',
			});
		},
		'确认申请',
	);
}

function confirmWithdrawApplication(): void {
	const application = detail.value?.viewer_application;
	if (!application) return;

	confirmAction(
		'撤销加入申请',
		'确认撤销本次加入申请？撤销后可以重新提交申请。',
		async () => {
			await withdrawGuildApplication(application.id);
			await loadDetail();
			uni.showToast({ title: '申请已撤销', icon: 'success' });
		},
		'确认撤销',
	);
}

function handleProfileSaved(guild: GuildDetail): void {
	detail.value = guild;
	profileVisible.value = false;
	uni.showToast({ title: '公会资料已更新', icon: 'success' });
}

function handleInvitationSent(_invitation: GuildInvitation): void {
	inviteVisible.value = false;
	uni.showToast({ title: '邀请已发送', icon: 'success' });
	void loadDetail();
}

function handleAppointVice(member: GuildMemberSummary): void {
	confirmAction(
		'任命副会长',
		`确认任命 ${member.nickname || `UID ${member.uid}`} 为副会长？`,
		async () => {
			detail.value = await appointGuildVice(guildId.value, member.uid);
			uni.showToast({ title: '任命成功', icon: 'success' });
		},
	);
}

function handleRevokeVice(member: GuildMemberSummary): void {
	confirmAction(
		'撤销副会长',
		`确认撤销 ${member.nickname || `UID ${member.uid}`} 的副会长身份？`,
		async () => {
			detail.value = await revokeGuildVice(guildId.value, member.uid);
			uni.showToast({ title: '已撤销副会长', icon: 'success' });
		},
	);
}

function handleKick(member: GuildMemberSummary): void {
	confirmAction(
		'移出成员',
		`确认将 ${member.nickname || `UID ${member.uid}`} 移出公会？该成员将立即失去公会访问权限。`,
		async () => {
			await kickGuildMember(guildId.value, member.uid);
			await loadDetail();
			uni.showToast({ title: '成员已移出', icon: 'success' });
		},
		'确认移出',
	);
}

function handleTransfer(member: GuildMemberSummary): void {
	confirmAction(
		'转让会长',
		`确认把会长转让给 ${member.nickname || `UID ${member.uid}`}？转让后你将变为普通成员。`,
		async () => {
			detail.value = await transferGuildOwner(guildId.value, member.uid);
			uni.showToast({ title: '会长转让成功', icon: 'success' });
		},
		'确认转让',
	);
}

function confirmLeave(): void {
	confirmAction(
		'确认退出公会',
		'退出后将无法继续访问原公会及历史排刀数据，且需要重新获得邀请才能加入。',
		async () => {
			await leaveGuild(guildId.value);
			uni.showToast({ title: '已退出公会', icon: 'success' });
			navigateTo(routes.guild);
		},
		'确认退出',
	);
}

function confirmDissolve(): void {
	confirmAction(
		'确认解散公会',
		'解散后所有成员将立即失去公会及历史排刀访问权限。排刀数据会保留在数据库中，但不再对成员展示。',
		async () => {
			await dissolveGuild(guildId.value);
			uni.showToast({ title: '公会已解散', icon: 'success' });
			navigateTo(routes.guild);
		},
		'确认解散',
	);
}

function confirmAction(
	title: string,
	content: string,
	action: () => Promise<void>,
	confirmText = '确认',
): void {
	if (actionPending.value) return;

	uni.showModal({
		title,
		content,
		confirmText,
		confirmColor: '#f06a73',
		success: async (result) => {
			if (!result.confirm) return;
			actionPending.value = true;
			try {
				await action();
			} catch (error) {
				uni.showToast({
					title: errorMessage(error, '操作失败'),
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
.guild-detail-page {
	width: 100%;
	max-width: 1120px;
	margin: 0 auto;
}

.detail-gate,
.detail-state {
	min-height: 380px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 11px;
	border: 1px solid var(--border-subtle);
	border-radius: 11px;
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

.gate-copy {
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

.loading-ring {
	width: 28px;
	height: 28px;
	border: 2px solid var(--border-default);
	border-top-color: var(--accent);
	border-radius: 50%;
	animation: detail-spin 0.8s linear infinite;
}

.error-state {
	color: var(--danger);
}

.detail-toolbar {
	margin-bottom: 10px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	flex-wrap: wrap;
	gap: 8px;
}

.back-button,
.toolbar-button {
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

.toolbar-actions {
	display: flex;
	flex-wrap: wrap;
	gap: 7px;
}

.toolbar-button.primary {
	border-color: var(--accent);
	background: linear-gradient(180deg, var(--accent-strong), var(--accent));
	color: #fff;
}

.detail-info-grid {
	margin-top: 10px;
	display: grid;
	grid-template-columns: repeat(5, minmax(0, 1fr));
	gap: 8px;
}

.info-card {
	padding: 12px;
	border: 1px solid var(--border-subtle);
	border-radius: 8px;
	background: var(--bg-panel-soft);
}

.info-label {
	color: var(--text-faint);
	font-size: 10px;
}

.info-value {
	margin-top: 6px;
	color: var(--text-primary);
	font-size: 14px;
	font-weight: 700;
}

.detail-section {
	margin-top: 14px;
	padding: 14px;
	border: 1px solid var(--border-subtle);
	border-radius: 10px;
	background: var(--bg-panel-soft);
}

.section-heading {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
}

.section-title {
	color: var(--text-primary);
	font-size: 16px;
	font-weight: 800;
}

.section-subtitle {
	margin-top: 5px;
	color: var(--text-muted);
	font-size: 11px;
}

.section-count {
	color: var(--accent-text);
	font-size: 12px;
	font-weight: 700;
}

.members-private {
	min-height: 180px;
	margin-top: 14px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 8px;
	border: 1px dashed var(--border-default);
	border-radius: 10px;
	background: var(--bg-panel-soft);
	text-align: center;
}

.private-icon {
	color: var(--accent-text);
	font-size: 30px;
}

.private-title {
	color: var(--text-primary);
	font-size: 15px;
	font-weight: 700;
}

.private-copy {
	color: var(--text-muted);
	font-size: 11px;
}

.apply-panel {
	margin-top: 12px;
	padding: 14px 15px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
	border: 1px solid var(--border-default);
	border-radius: 9px;
	background:
		radial-gradient(ellipse at 92% 0%, var(--accent-soft), transparent 55%),
		var(--bg-panel-soft);
}

.apply-title {
	color: var(--text-primary);
	font-size: 14px;
	font-weight: 800;
}

.apply-description {
	margin-top: 5px;
	color: var(--text-muted);
	font-size: 11px;
	line-height: 1.6;
}

.apply-meta {
	margin-top: 6px;
	display: flex;
	flex-wrap: wrap;
	gap: 4px 14px;
	color: var(--text-faint);
	font-size: 10px;
}

.apply-actions {
	flex: 0 0 auto;
	display: flex;
	gap: 8px;
}

.apply-button {
	min-width: 112px;
	min-height: 36px;
	padding: 0 13px;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1px solid var(--border-default);
	border-radius: 7px;
	background: var(--bg-panel);
	color: var(--accent-text);
	font-size: 12px;
	font-weight: 700;
	cursor: pointer;
}

.apply-button.primary {
	border-color: var(--accent);
	background: linear-gradient(180deg, var(--accent-strong), var(--accent));
	color: #fff;
}

.apply-button.danger {
	border-color: rgba(240, 106, 115, 0.5);
	background: var(--danger-soft);
	color: var(--danger);
}

.apply-button.disabled {
	opacity: 0.55;
	cursor: not-allowed;
}

.detail-danger-zone {
	margin-top: 14px;
	padding: 13px 15px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 14px;
	border: 1px solid rgba(240, 106, 115, 0.28);
	border-radius: 9px;
	background: rgba(240, 106, 115, 0.05);
}

.danger-title {
	color: var(--danger);
	font-size: 13px;
	font-weight: 700;
}

.danger-desc {
	margin-top: 4px;
	color: var(--text-muted);
	font-size: 11px;
	line-height: 1.55;
}

.danger-button {
	flex: 0 0 auto;
	min-height: 33px;
	padding: 0 11px;
	display: flex;
	align-items: center;
	border: 1px solid rgba(240, 106, 115, 0.5);
	border-radius: 6px;
	background: var(--danger-soft);
	color: var(--danger);
	font-size: 11px;
	font-weight: 700;
	cursor: pointer;
}

@keyframes detail-spin {
	to {
		transform: rotate(360deg);
	}
}

@media screen and (max-width: 1000px) {
	.detail-info-grid {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}
}

@media screen and (max-width: 700px) {
	.detail-toolbar {
		align-items: flex-start;
		flex-direction: column;
	}

	.toolbar-actions {
		width: 100%;
	}

	.toolbar-button {
		flex: 1;
		justify-content: center;
	}

	.detail-danger-zone {
		align-items: flex-start;
		flex-direction: column;
	}

	.detail-info-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.apply-panel {
		align-items: flex-start;
		flex-direction: column;
	}

	.apply-actions,
	.apply-button {
		width: 100%;
	}

	.danger-button {
		width: 100%;
		justify-content: center;
	}
}
</style>
