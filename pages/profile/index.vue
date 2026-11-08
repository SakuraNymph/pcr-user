<template>
	<MainLayout active-menu="profile">
		<view class="profile-page">
			<view class="profile-panel">
				<view class="profile-heading">
					<view>
						<view class="profile-title">个人中心</view>
					</view>
				</view>

				<view v-if="!authState.isAuthenticated" class="profile-state guest-state">
					<view class="state-icon">♙</view>
					<view class="state-title">登录后查看个人资料</view>
					<view class="state-description">个人中心仅对正式账号开放。</view>
					<view class="state-actions">
						<view class="state-button primary" @click="navigateTo(routes.login)">登录</view>
						<view class="state-button" @click="navigateTo(routes.register)">注册账号</view>
					</view>
				</view>

				<view v-else-if="loading" class="profile-state">
					<view class="state-icon loading-icon">◌</view>
					<view class="state-title">正在加载个人资料...</view>
				</view>

				<view v-else-if="loadError" class="profile-state error-state">
					<view class="state-icon">!</view>
					<view class="state-title">{{ loadError }}</view>
					<view class="state-button primary" @click="loadProfile">重新加载</view>
				</view>

				<template v-else-if="user">
					<view class="identity-card">
						<view class="avatar-trigger" @click="openAvatarPicker">
							<image
								v-if="user.avatar_url && !avatarLoadFailed"
								class="profile-avatar"
								:src="user.avatar_url"
								mode="aspectFill"
								@error="handleAvatarError"
							/>
							<view v-else class="profile-avatar-placeholder">
								{{ avatarText }}
							</view>
						</view>

						<view class="identity-copy">
							<view class="identity-name">{{ displayNickname }}</view>
							<view class="identity-meta">
								<text class="status-pill">正式用户</text>
								<text class="identity-id">UID {{ user.public_uid ?? user.id }}</text>
							</view>
						</view>

						<view class="avatar-action" @click="openAvatarPicker">更换头像</view>
					</view>

					<view class="profile-section">
						<view class="section-heading">
							<view>
								<view class="section-title">账户资料</view>
								<view class="section-subtitle">管理昵称和登录密码</view>
							</view>
						</view>

						<view class="action-list">
							<view class="action-row" @click="nicknameModalVisible = true">
								<view class="action-copy">
									<view class="action-title">修改昵称</view>
									<view class="action-description">当前昵称：{{ displayNickname }}</view>
								</view>
								<view class="action-arrow">→</view>
							</view>
							<view class="action-row" @click="passwordModalVisible = true">
								<view class="action-copy">
									<view class="action-title">修改密码</view>
									<view class="action-description">验证原密码后设置新密码</view>
								</view>
								<view class="action-arrow">→</view>
							</view>
						</view>
					</view>

					<view class="profile-section">
						<view class="section-heading">
							<view>
								<view class="section-title">我的公会</view>
								<view class="section-subtitle">管理公会关系与成员邀请</view>
							</view>
						</view>
						<view class="action-list">
							<view class="action-row" @click="navigateTo(routes.guild)">
								<view class="action-copy">
									<view class="action-title">我的公会</view>
									<view class="action-description">
										{{ guildOverview?.guild
											? `${guildOverview.guild.name} · ${guildOverview.membership?.role_name || '成员'}`
											: '创建公会或搜索并加入公会' }}
									</view>
								</view>
								<view class="action-arrow">→</view>
							</view>
							<view class="action-row" @click="navigateTo(routes.guildInvitations)">
								<view class="action-copy">
									<view class="action-title">
										公会邀请
										<text
											v-if="guildOverview?.received_invitation_count"
											class="invitation-badge"
										>
											{{ guildOverview.received_invitation_count }}
										</text>
									</view>
									<view class="action-description">
										查看收到和发出的待处理邀请
									</view>
								</view>
								<view class="action-arrow">→</view>
							</view>
						</view>
					</view>

					<view class="profile-section">
						<view class="section-heading">
							<view>
								<view class="section-title">其他功能</view>
								<view class="section-subtitle">更多账号能力将陆续开放</view>
							</view>
						</view>
						<view class="other-panel">
							<view class="other-note">这里将用于承载后续账号相关功能。</view>
							<view class="account-link" @click="navigateTo(routes.account)">前往我的账号 →</view>
						</view>
					</view>
				</template>
			</view>
		</view>

		<UserAvatarPicker
			v-if="avatarPickerVisible"
			:current-avatar-id="currentAvatarId"
			@close="avatarPickerVisible = false"
			@saved="handleProfileSaved"
		/>
		<UserNicknameModal
			v-if="nicknameModalVisible"
			:current-nickname="displayNickname"
			@close="nicknameModalVisible = false"
			@saved="handleProfileSaved"
		/>
		<UserPasswordModal
			v-if="passwordModalVisible"
			:email="user?.email || ''"
			@close="passwordModalVisible = false"
			@saved="handlePasswordSaved"
		/>
	</MainLayout>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { authState } from '../../api/identity';
import { errorMessage } from '../../api/errors';
import { getGuildOverview } from '../../api/guild';
import { getCurrentUser } from '../../api/user';
import type { GuildOverview, UserProfile } from '../../api/types';
import UserAvatarPicker from '../../components/UserAvatarPicker.vue';
import UserNicknameModal from '../../components/UserNicknameModal.vue';
import UserPasswordModal from '../../components/UserPasswordModal.vue';
import MainLayout from '../../layouts/MainLayout.vue';
import { navigateTo, routes } from '../../router';

const user = ref<UserProfile | null>(null);
const guildOverview = ref<GuildOverview | null>(null);
const loading = ref(false);
const loadError = ref('');
const avatarLoadFailed = ref(false);
const avatarPickerVisible = ref(false);
const nicknameModalVisible = ref(false);
const passwordModalVisible = ref(false);

const displayNickname = computed(
	() => user.value?.nickname?.trim() || authState.user?.nickname || '用户',
);
const avatarText = computed(
	() => Array.from(displayNickname.value)[0] || '用',
);
const currentAvatarId = computed(() => user.value?.avatar ?? null);

watch(
	() => user.value?.avatar_url,
	() => {
		avatarLoadFailed.value = false;
	},
);

onShow(() => {
	if (!authState.isAuthenticated) {
		user.value = null;
		guildOverview.value = null;
		loadError.value = '';
		loading.value = false;
		closeModals();
		return;
	}
	void loadProfile();
	void loadGuildOverview();
});

async function loadProfile(): Promise<void> {
	if (!authState.isAuthenticated || loading.value) return;
	loading.value = true;
	loadError.value = '';
	try {
		user.value = await getCurrentUser();
		avatarLoadFailed.value = false;
	} catch (error) {
		loadError.value = errorMessage(error, '获取个人资料失败，请稍后重试');
	} finally {
		loading.value = false;
	}
}

async function loadGuildOverview(): Promise<void> {
	if (!authState.isAuthenticated) {
		guildOverview.value = null;
		return;
	}

	try {
		guildOverview.value = await getGuildOverview();
	} catch {
		guildOverview.value = null;
	}
}

function openAvatarPicker(): void {
	if (!user.value) return;
	avatarLoadFailed.value = false;
	avatarPickerVisible.value = true;
}

function handleAvatarError(): void {
	avatarLoadFailed.value = true;
}

function handleProfileSaved(updatedUser: UserProfile): void {
	user.value = updatedUser;
	avatarLoadFailed.value = false;
	closeModals();
	uni.showToast({ title: '资料已更新', icon: 'success' });
}

function handlePasswordSaved(): void {
	passwordModalVisible.value = false;
	uni.showToast({ title: '密码修改成功', icon: 'success' });
}

function closeModals(): void {
	avatarPickerVisible.value = false;
	nicknameModalVisible.value = false;
	passwordModalVisible.value = false;
}
</script>

<style scoped>
.profile-page {
	width: 100%;
	max-width: 1100px;
	margin: 0 auto;
}

.profile-panel {
	min-height: 480px;
	padding: 24px;
	border: 1px solid var(--border-subtle);
	border-radius: 12px;
	background:
		radial-gradient(ellipse at 85% 0%, var(--accent-soft), transparent 46%),
		linear-gradient(125deg, var(--bg-panel), var(--bg-panel-alt));
	box-shadow: inset 0 0 18px var(--accent-soft), 0 12px 34px var(--shadow);
}

.profile-heading {
	padding-bottom: 18px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
	border-bottom: 1px solid var(--border-subtle);
}

.profile-title {
	color: var(--text-primary);
	font-size: 23px;
	font-weight: 700;
}

.status-pill {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	border: 1px solid var(--border-strong);
	border-radius: 999px;
	background: var(--accent-soft);
	color: var(--accent-text);
	font-weight: 700;
}

.identity-card {
	margin-top: 24px;
	padding: 22px;
	display: flex;
	align-items: center;
	gap: 18px;
	border: 1px solid var(--border-default);
	border-radius: 10px;
	background: linear-gradient(120deg, var(--bg-panel-soft-alt), var(--bg-panel));
}

.avatar-trigger {
	width: 82px;
	height: 82px;
	flex: 0 0 82px;
	overflow: hidden;
	border: 1px solid rgba(76, 198, 255, 0.75);
	border-radius: 50%;
	background: linear-gradient(145deg, var(--accent-strong), #064c94);
	box-shadow: 0 0 22px var(--accent-soft-strong);
	cursor: pointer;
}

.profile-avatar {
	width: 100%;
	height: 100%;
	display: block;
}

.profile-avatar-placeholder {
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	color: #fff;
	font-size: 30px;
	font-weight: 700;
}

.identity-copy {
	min-width: 0;
}

.identity-name {
	overflow: hidden;
	color: var(--text-primary);
	font-size: 24px;
	font-weight: 700;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.identity-meta {
	margin-top: 10px;
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 10px;
}

.status-pill {
	min-height: 24px;
	padding: 0 9px;
	font-size: 11px;
}

.identity-id {
	color: var(--text-faint);
	font-size: 12px;
}

.avatar-action {
	min-height: 32px;
	margin-left: auto;
	padding: 0 12px;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1px solid var(--border-default);
	border-radius: 7px;
	background: var(--bg-panel-soft);
	color: var(--accent-text);
	font-size: 12px;
	font-weight: 700;
	white-space: nowrap;
	cursor: pointer;
}

.profile-section {
	margin-top: 22px;
	padding-top: 20px;
	border-top: 1px solid var(--border-subtle);
}

.section-heading {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
}

.section-title {
	color: var(--text-primary);
	font-size: 17px;
	font-weight: 700;
}

.section-subtitle {
	margin-top: 5px;
	color: var(--text-muted);
	font-size: 12px;
}

.action-list {
	margin-top: 16px;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.action-row {
	min-height: 64px;
	padding: 12px 15px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 14px;
	border: 1px solid var(--border-subtle);
	border-radius: 8px;
	background: var(--bg-panel-soft);
	cursor: pointer;
	transition: border-color 0.16s ease, background 0.16s ease;
}

.action-row:hover {
	border-color: var(--border-strong);
	background: var(--accent-soft);
}

.action-copy {
	min-width: 0;
}

.action-title {
	color: var(--text-secondary);
	font-size: 14px;
	font-weight: 700;
}

.invitation-badge {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 18px;
	height: 18px;
	margin-left: 6px;
	padding: 0 5px;
	border-radius: 999px;
	background: var(--danger);
	color: #fff;
	font-size: 9px;
	line-height: 1;
	vertical-align: 1px;
}

.action-description {
	margin-top: 5px;
	overflow: hidden;
	color: var(--text-muted);
	font-size: 12px;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.action-arrow {
	flex: 0 0 auto;
	color: var(--accent-text);
	font-size: 18px;
	font-weight: 700;
}

.other-panel {
	margin-top: 14px;
	padding: 16px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
	border: 1px solid var(--border-subtle);
	border-radius: 8px;
	background: var(--bg-panel-soft);
}

.other-note {
	color: var(--text-faint);
	font-size: 12px;
}

.account-link {
	flex: 0 0 auto;
	color: var(--accent-text);
	font-size: 13px;
	font-weight: 700;
	cursor: pointer;
}

.profile-state {
	min-height: 340px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 12px;
	color: var(--text-muted);
	text-align: center;
}

.state-icon {
	width: 54px;
	height: 54px;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1px solid var(--border-strong);
	border-radius: 50%;
	background: var(--accent-soft);
	color: var(--accent-text);
	font-size: 24px;
	font-weight: 700;
}

.loading-icon {
	animation: profile-loading-spin 0.9s linear infinite;
}

.state-title {
	color: var(--text-primary);
	font-size: 16px;
	font-weight: 700;
}

.state-description {
	color: var(--text-muted);
	font-size: 13px;
}

.state-actions {
	margin-top: 8px;
	display: flex;
	gap: 10px;
}

.state-button {
	min-width: 112px;
	min-height: 40px;
	padding: 0 16px;
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

.state-button.primary {
	border-color: var(--accent);
	background: linear-gradient(180deg, var(--accent-strong), var(--accent));
	color: #fff;
	font-weight: 700;
}

.error-state .state-icon {
	border-color: var(--danger);
	background: var(--danger-soft);
	color: var(--danger);
}

@keyframes profile-loading-spin {
	to {
		transform: rotate(360deg);
	}
}

@media screen and (max-width: 700px) {
	.profile-panel {
		min-height: 420px;
		padding: 16px;
	}

	.profile-title {
		font-size: 20px;
	}

	.identity-card {
		padding: 17px;
		align-items: flex-start;
		flex-wrap: wrap;
	}

	.avatar-trigger {
		width: 64px;
		height: 64px;
		flex-basis: 64px;
	}

	.profile-avatar-placeholder {
		font-size: 25px;
	}

	.identity-copy {
		flex: 1;
	}

	.identity-name {
		font-size: 20px;
	}

	.avatar-action {
		width: 100%;
		margin-left: 0;
	}

	.other-panel {
		align-items: flex-start;
		flex-direction: column;
	}
}

@media (prefers-reduced-motion: reduce) {
	.loading-icon {
		animation-duration: 0.01ms;
	}
}
</style>
