<template>
	<MainLayout active-menu="guild">
		<view class="guild-page">
			<view class="guild-hero">
				<view>
					<view class="guild-eyebrow">MY GUILD</view>
					<view class="guild-page-title">我的公会</view>
					<view class="guild-page-description">
						创建或加入公会，与成员共同维护每月公会排刀。每位正式用户最多加入一个正常运营的公会。
					</view>
				</view>
				<view class="guild-hero-actions">
					<view class="hero-button" @click="navigateTo(routes.guildSearch)">搜索公会</view>
					<view
						class="hero-button invite-button"
						@click="navigateTo(routes.guildInvitations)"
					>
						公会邀请
						<text v-if="overview?.received_invitation_count" class="invite-badge">
							{{ overview.received_invitation_count }}
						</text>
					</view>
				</view>
			</view>

			<view v-if="!authState.isAuthenticated" class="guild-gate">
				<view class="guild-gate-icon">♙</view>
				<view class="guild-gate-title">登录后使用我的公会</view>
				<view class="guild-gate-copy">公会功能仅对正式注册用户开放。</view>
				<view class="guild-gate-actions">
					<view class="gate-button primary" @click="navigateTo(routes.login)">登录</view>
					<view class="gate-button" @click="navigateTo(routes.register)">注册账号</view>
				</view>
			</view>

			<view v-else-if="loading" class="guild-state">
				<view class="loading-ring"></view>
				<text>正在加载公会信息...</text>
			</view>

			<view v-else-if="loadError" class="guild-state error-state">
				<view class="state-title">{{ loadError }}</view>
				<view class="state-button" @click="loadOverview">重新加载</view>
			</view>

			<template v-else-if="overview">
				<GuildSummaryCard
					v-if="overview.guild"
					:guild="overview.guild"
					:membership="overview.membership"
					clickable
					@click="openGuildDetail"
				/>

				<view v-if="overview.guild" class="guild-actions-grid">
					<view class="guild-action-card primary" @click="goSchedule">
						<view class="action-icon">▦</view>
						<view class="action-copy">
							<view class="action-title">公会排刀表</view>
							<view class="action-desc">查看本月排刀，支持切换历史月份</view>
						</view>
						<view class="action-arrow">›</view>
					</view>
					<view
						v-if="overview.permissions.can_invite"
						class="guild-action-card"
						@click="inviteVisible = true"
					>
						<view class="action-icon">＋</view>
						<view class="action-copy">
							<view class="action-title">邀请成员</view>
							<view class="action-desc">通过 UID 搜索正式用户并发送邀请</view>
						</view>
						<view class="action-arrow">›</view>
					</view>
					<view
						v-if="overview.permissions.can_review_applications"
						class="guild-action-card"
						@click="goApplications"
					>
						<view class="action-icon">☑</view>
						<view class="action-copy">
							<view class="action-title">
								加入申请（{{ overview.guild.pending_application_count }}）
							</view>
							<view class="action-desc">审核用户提交的加入申请</view>
						</view>
						<view class="action-arrow">›</view>
					</view>
					<view class="guild-action-card" @click="navigateTo(routes.guildInvitations)">
						<view class="action-icon">✉</view>
						<view class="action-copy">
							<view class="action-title">公会邀请</view>
							<view class="action-desc">
								收到 {{ overview.received_invitation_count }} 个待处理邀请
							</view>
						</view>
						<view class="action-arrow">›</view>
					</view>
					<view
						v-if="overview.permissions.can_update_profile"
						class="guild-action-card"
						@click="openProfileEditor"
					>
						<view class="action-icon">✎</view>
						<view class="action-copy">
							<view class="action-title">修改公会资料</view>
							<view class="action-desc">修改公会名称和简介</view>
						</view>
						<view class="action-arrow">›</view>
					</view>
				</view>

				<view v-if="overview.guild" class="guild-danger-zone">
					<view class="danger-copy">
						<view class="danger-title">公会关系操作</view>
						<view class="danger-desc">
							{{ overview.membership?.role === 1
								? '会长可解散公会；解散后所有成员将失去公会访问权限。'
								: '退出公会后，你将无法继续访问原公会及历史排刀。' }}
						</view>
					</view>
					<view
						v-if="overview.membership?.role === 1"
						class="danger-button"
						@click="confirmDissolve"
					>解散公会</view>
					<view
						v-else
						class="danger-button"
						@click="confirmLeave"
					>退出公会</view>
				</view>

				<view v-else class="guild-empty">
					<view class="empty-mark">◇</view>
					<view class="empty-title">你还没有加入公会</view>
					<view class="empty-copy">
						可以创建一个新公会，也可以搜索现有公会并申请加入，或等待会长或副会长邀请。
					</view>

					<view v-if="!createVisible" class="empty-actions">
						<view class="empty-button primary" @click="createVisible = true">创建公会</view>
						<view class="empty-button" @click="navigateTo(routes.guildSearch)">搜索公会</view>
					</view>

					<view v-else class="create-form">
						<view class="create-field">
							<view class="create-label">公会名称</view>
							<input
								v-model="createName"
								class="create-input"
								maxlength="32"
								placeholder="请输入公会名称"
								:disabled="creating"
							/>
						</view>
						<view class="create-field">
							<view class="create-label">公会简介（选填）</view>
							<textarea
								v-model="createDescription"
								class="create-textarea"
								maxlength="255"
								placeholder="介绍一下你的公会"
								:disabled="creating"
							/>
						</view>
						<view v-if="createError" class="create-error">{{ createError }}</view>
						<view class="create-actions">
							<view class="empty-button" @click="cancelCreate">取消</view>
							<view
								class="empty-button primary"
								:class="{ disabled: !canCreate }"
								@click="submitCreate"
							>
								{{ creating ? '创建中...' : '创建并进入排刀' }}
							</view>
						</view>
					</view>
				</view>
			</template>
		</view>

		<GuildProfileModal
			v-if="profileModalGuild"
			:guild="profileModalGuild"
			@close="profileModalGuild = null"
			@saved="handleProfileSaved"
		/>
		<GuildInviteSearchModal
			v-if="inviteVisible && overview?.guild"
			:guild-id="overview.guild.id"
			@close="inviteVisible = false"
			@sent="handleInvitationSent"
		/>
	</MainLayout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import MainLayout from '../../layouts/MainLayout.vue';
import GuildSummaryCard from '../../components/GuildSummaryCard.vue';
import GuildProfileModal from '../../components/GuildProfileModal.vue';
import GuildInviteSearchModal from '../../components/GuildInviteSearchModal.vue';
import {
	createGuild,
	dissolveGuild,
	getGuildDetail,
	getGuildOverview,
	leaveGuild,
} from '../../api/guild';
import { errorMessage } from '../../api/errors';
import { authState } from '../../api/identity';
import type {
	GuildDetail,
	GuildInvitation,
	GuildOverview,
} from '../../api/types';
import { navigateTo, routes } from '../../router';

const overview = ref<GuildOverview | null>(null);
const loading = ref(false);
const loadError = ref('');
const createVisible = ref(false);
const createName = ref('');
const createDescription = ref('');
const creating = ref(false);
const createError = ref('');
const profileModalGuild = ref<GuildDetail | null>(null);
const inviteVisible = ref(false);

const canCreate = computed(() => (
	!creating.value
	&& createName.value.trim().length > 0
	&& Array.from(createName.value.trim()).length <= 32
	&& Array.from(createDescription.value.trim()).length <= 255
));

onShow(() => {
	if (!authState.isAuthenticated) {
		overview.value = null;
		loading.value = false;
		loadError.value = '';
		return;
	}
	void loadOverview();
});

async function loadOverview(): Promise<void> {
	if (!authState.isAuthenticated || loading.value) return;
	loading.value = true;
	loadError.value = '';

	try {
		overview.value = await getGuildOverview();
	} catch (error) {
		loadError.value = errorMessage(error, '加载公会概览失败');
	} finally {
		loading.value = false;
	}
}

function cancelCreate(): void {
	if (creating.value) return;
	resetCreateForm();
}

async function submitCreate(): Promise<void> {
	if (!canCreate.value) {
		if (!createName.value.trim()) createError.value = '公会名称不能为空';
		return;
	}

	creating.value = true;
	createError.value = '';

	try {
		const guild = await createGuild({
			name: createName.value.trim(),
			description: createDescription.value.trim(),
		});
		overview.value = await getGuildOverview();
		resetCreateForm();
		uni.showToast({ title: '公会创建成功', icon: 'success' });
		uni.navigateTo({ url: `${routes.guildSchedule}?id=${guild.id}` });
	} catch (error) {
		createError.value = errorMessage(error, '创建公会失败');
	} finally {
		creating.value = false;
	}
}

function resetCreateForm(): void {
	createVisible.value = false;
	createName.value = '';
	createDescription.value = '';
	createError.value = '';
}

function goSchedule(): void {
	if (!overview.value?.guild) return;
	uni.navigateTo({
		url: `${routes.guildSchedule}?id=${overview.value.guild.id}`,
	});
}

function goApplications(): void {
	if (!overview.value?.guild) return;
	uni.navigateTo({
		url: `${routes.guildApplications}?id=${overview.value.guild.id}`,
	});
}

function openGuildDetail(): void {
	if (!overview.value?.guild) return;
	uni.navigateTo({
		url: `${routes.guildDetail}?id=${overview.value.guild.id}`,
	});
}

async function openProfileEditor(): Promise<void> {
	if (!overview.value?.guild) return;

	try {
		profileModalGuild.value = await getGuildDetail(overview.value.guild.id);
	} catch (error) {
		uni.showToast({
			title: errorMessage(error, '获取公会资料失败'),
			icon: 'none',
		});
	}
}

function handleProfileSaved(guild: GuildDetail): void {
	profileModalGuild.value = null;
	if (overview.value?.guild) {
		overview.value = {
			...overview.value,
			guild: {
				...overview.value.guild,
				name: guild.name,
				description: guild.description,
			},
		};
	}
	uni.showToast({ title: '公会资料已更新', icon: 'success' });
}

function handleInvitationSent(_invitation: GuildInvitation): void {
	inviteVisible.value = false;
	uni.showToast({ title: '邀请已发送', icon: 'success' });
	void loadOverview();
}

function confirmLeave(): void {
	if (!overview.value?.guild) return;
	const guildId = overview.value.guild.id;

	uni.showModal({
		title: '确认退出公会',
		content: '退出后将无法继续访问原公会及历史排刀数据，且需要重新获得邀请才能加入。',
		confirmText: '确认退出',
		confirmColor: '#f06a73',
		success: async (result) => {
			if (!result.confirm) return;
			try {
				await leaveGuild(guildId);
				uni.showToast({ title: '已退出公会', icon: 'success' });
				await loadOverview();
			} catch (error) {
				uni.showToast({
					title: errorMessage(error, '退出公会失败'),
					icon: 'none',
				});
			}
		},
	});
}

function confirmDissolve(): void {
	if (!overview.value?.guild) return;
	const guildId = overview.value.guild.id;

	uni.showModal({
		title: '确认解散公会',
		content: '解散后所有成员将立即失去公会及历史排刀访问权限。排刀数据会保留在数据库中，但不再对成员展示。',
		confirmText: '确认解散',
		confirmColor: '#f06a73',
		success: async (result) => {
			if (!result.confirm) return;
			try {
				await dissolveGuild(guildId);
				uni.showToast({ title: '公会已解散', icon: 'success' });
				await loadOverview();
			} catch (error) {
				uni.showToast({
					title: errorMessage(error, '解散公会失败'),
					icon: 'none',
				});
			}
		},
	});
}
</script>

<style scoped>
.guild-page {
	width: 100%;
	max-width: 1120px;
	margin: 0 auto;
}

.guild-hero {
	padding: 18px 20px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	flex-wrap: wrap;
	gap: 16px;
	border: 1px solid var(--border-default);
	border-radius: 11px;
	background:
		radial-gradient(ellipse at 88% 0%, var(--accent-soft), transparent 52%),
		linear-gradient(115deg, var(--bg-panel), var(--bg-panel-alt));
}

.guild-eyebrow {
	color: var(--accent-text);
	font-size: 10px;
	font-weight: 800;
	letter-spacing: 0.18em;
}

.guild-page-title {
	margin-top: 5px;
	color: var(--text-primary);
	font-size: 24px;
	font-weight: 800;
}

.guild-page-description {
	max-width: 680px;
	margin-top: 7px;
	color: var(--text-muted);
	font-size: 12px;
	line-height: 1.7;
}

.guild-hero-actions {
	display: flex;
	gap: 8px;
}

.hero-button {
	position: relative;
	min-height: 37px;
	padding: 0 13px;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1px solid var(--border-default);
	border-radius: 7px;
	background: var(--bg-panel-soft);
	color: var(--accent-text);
	font-size: 12px;
	font-weight: 700;
	cursor: pointer;
}

.invite-badge {
	position: absolute;
	top: -7px;
	right: -7px;
	min-width: 19px;
	height: 19px;
	padding: 0 5px;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1px solid var(--bg-page);
	border-radius: 999px;
	background: var(--danger);
	color: #fff;
	font-size: 9px;
	font-weight: 800;
}

.guild-gate,
.guild-state {
	min-height: 360px;
	margin-top: 14px;
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

.guild-gate-icon {
	width: 58px;
	height: 58px;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1px solid var(--border-strong);
	border-radius: 50%;
	background: var(--accent-soft);
	color: var(--accent-text);
	font-size: 26px;
}

.guild-gate-title,
.state-title {
	color: var(--text-primary);
	font-size: 17px;
	font-weight: 800;
}

.guild-gate-copy {
	color: var(--text-muted);
	font-size: 13px;
}

.guild-gate-actions,
.empty-actions,
.create-actions {
	display: flex;
	gap: 9px;
}

.gate-button,
.empty-button,
.state-button {
	min-width: 112px;
	min-height: 38px;
	padding: 0 14px;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1px solid var(--border-default);
	border-radius: 7px;
	background: var(--bg-panel-soft);
	color: var(--text-secondary);
	font-size: 13px;
	cursor: pointer;
}

.gate-button.primary,
.empty-button.primary {
	border-color: var(--accent);
	background: linear-gradient(180deg, var(--accent-strong), var(--accent));
	color: #fff;
	font-weight: 700;
}

.empty-button.disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.loading-ring {
	width: 28px;
	height: 28px;
	border: 2px solid var(--border-default);
	border-top-color: var(--accent);
	border-radius: 50%;
	animation: guild-spin 0.8s linear infinite;
}

.error-state {
	color: var(--danger);
}

.guild-actions-grid {
	margin-top: 14px;
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 9px;
}

.guild-action-card {
	min-height: 82px;
	padding: 13px 14px;
	display: flex;
	align-items: center;
	gap: 12px;
	border: 1px solid var(--border-subtle);
	border-radius: 9px;
	background: var(--bg-panel-soft);
	cursor: pointer;
	transition: border-color 0.16s ease, background 0.16s ease;
}

.guild-action-card:hover {
	border-color: var(--border-strong);
	background: var(--accent-soft);
}

.guild-action-card.primary {
	border-color: var(--border-strong);
	background: var(--accent-soft);
}

.action-icon {
	width: 39px;
	height: 39px;
	flex: 0 0 39px;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1px solid var(--border-strong);
	border-radius: 8px;
	background: var(--bg-subtle);
	color: var(--accent-text);
	font-size: 19px;
}

.action-copy {
	min-width: 0;
	flex: 1;
}

.action-title {
	color: var(--text-primary);
	font-size: 14px;
	font-weight: 700;
}

.action-desc {
	margin-top: 5px;
	color: var(--text-muted);
	font-size: 11px;
	line-height: 1.5;
}

.action-arrow {
	color: var(--accent-text);
	font-size: 22px;
}

.guild-danger-zone {
	margin-top: 14px;
	padding: 13px 15px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
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

.guild-empty {
	min-height: 380px;
	margin-top: 14px;
	padding: 26px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 11px;
	border: 1px solid var(--border-subtle);
	border-radius: 11px;
	background:
		radial-gradient(ellipse at center, var(--accent-soft), transparent 58%),
		var(--bg-panel-soft);
	text-align: center;
}

.empty-mark {
	color: var(--accent-text);
	font-size: 42px;
}

.empty-title {
	color: var(--text-primary);
	font-size: 18px;
	font-weight: 800;
}

.empty-copy {
	max-width: 520px;
	color: var(--text-muted);
	font-size: 12px;
	line-height: 1.7;
}

.create-form {
	width: min(520px, 100%);
	margin-top: 8px;
	padding: 15px;
	border: 1px solid var(--border-default);
	border-radius: 9px;
	background: var(--bg-panel);
	text-align: left;
}

.create-field + .create-field {
	margin-top: 12px;
}

.create-label {
	margin-bottom: 6px;
	color: var(--text-muted);
	font-size: 11px;
	font-weight: 700;
}

.create-input,
.create-textarea {
	width: 100%;
	padding: 0 11px;
	border: 1px solid var(--border-default);
	border-radius: 7px;
	outline: none;
	background: var(--bg-input);
	color: var(--text-primary);
	font-size: 13px;
}

.create-input {
	height: 40px;
}

.create-textarea {
	height: 100px;
	padding-top: 9px;
	line-height: 1.6;
	resize: none;
}

.create-error {
	margin-top: 11px;
	padding: 9px 10px;
	border: 1px solid rgba(240, 106, 115, 0.45);
	border-radius: 7px;
	background: var(--danger-soft);
	color: var(--danger);
	font-size: 11px;
}

.create-actions {
	margin-top: 13px;
	justify-content: flex-end;
}

@keyframes guild-spin {
	to {
		transform: rotate(360deg);
	}
}

@media screen and (max-width: 1000px) {
	.guild-actions-grid {
		grid-template-columns: 1fr;
	}
}

@media screen and (max-width: 700px) {
	.guild-hero {
		padding: 15px;
	}

	.guild-page-title {
		font-size: 21px;
	}

	.guild-hero-actions {
		width: 100%;
	}

	.hero-button {
		flex: 1;
	}

	.guild-danger-zone {
		align-items: flex-start;
		flex-direction: column;
	}

	.danger-button {
		width: 100%;
		justify-content: center;
	}
}
</style>
