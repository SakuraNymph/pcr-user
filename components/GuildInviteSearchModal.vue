<template>
	<view class="guild-modal-mask" @click="close" @touchmove.stop.prevent>
		<view class="guild-modal" role="dialog" aria-modal="true" aria-label="邀请公会成员" @click.stop>
			<view class="guild-modal-header">
				<view>
					<view class="guild-modal-title">邀请新成员</view>
					<view class="guild-modal-subtitle">通过平台 UID 搜索正式注册用户</view>
				</view>
				<view class="guild-modal-close" @click="close">×</view>
			</view>

			<view class="guild-modal-body">
				<view class="invite-search-row">
					<input
						v-model="uidText"
						class="guild-input"
						type="number"
						placeholder="请输入用户 UID"
						:disabled="searching || sending"
						@confirm="search"
					/>
					<view
						class="invite-search-button"
						:class="{ disabled: !canSearch }"
						@click="search"
					>
						{{ searching ? '搜索中...' : '搜索' }}
					</view>
				</view>

				<view v-if="searchError" class="guild-modal-error">{{ searchError }}</view>

				<view v-if="candidate" class="candidate-card">
					<view class="candidate-avatar">
						<image
							v-if="candidate.avatar_url"
							class="candidate-avatar-image"
							:src="candidate.avatar_url"
							mode="aspectFill"
						/>
						<text v-else>{{ guildAvatarText(candidate.nickname) }}</text>
					</view>
					<view class="candidate-copy">
						<view class="candidate-name">{{ candidate.nickname || '未找到用户' }}</view>
						<view class="candidate-meta">UID {{ candidate.uid }}</view>
						<view
							class="candidate-state"
							:class="{ eligible: candidate.eligible }"
						>
							{{ candidate.eligible ? '可以邀请' : candidate.reason }}
						</view>
					</view>
					<view
						v-if="candidate.eligible"
						class="invite-send-button"
						:class="{ disabled: sending }"
						@click="send"
					>
						{{ sending ? '发送中...' : '发送邀请' }}
					</view>
				</view>

				<view v-if="sendError" class="guild-modal-error">{{ sendError }}</view>
			</view>

			<view class="guild-modal-footer">
				<view class="guild-modal-button" @click="close">关闭</view>
			</view>
		</view>
	</view>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
	getGuildInvitationCandidate,
	sendGuildInvitation,
} from '../api/guild';
import { errorMessage } from '../api/errors';
import type { GuildInvitation, GuildInvitationCandidate } from '../api/types';
import { guildAvatarText } from '../utils/guild';

const props = defineProps<{ guildId: number }>();

const emit = defineEmits<{
	(event: 'close'): void;
	(event: 'sent', invitation: GuildInvitation): void;
}>();

const uidText = ref('');
const searching = ref(false);
const sending = ref(false);
const candidate = ref<GuildInvitationCandidate | null>(null);
const searchError = ref('');
const sendError = ref('');

const uid = computed(() => {
	const value = Number(uidText.value);
	return Number.isInteger(value) && value > 0 ? value : 0;
});
const canSearch = computed(() => !searching.value && !sending.value && uid.value > 0);

watch(uidText, () => {
	candidate.value = null;
	searchError.value = '';
	sendError.value = '';
});

function close(): void {
	if (!searching.value && !sending.value) emit('close');
}

async function search(): Promise<void> {
	if (!canSearch.value) {
		searchError.value = '请输入有效的用户 UID';
		return;
	}

	searching.value = true;
	searchError.value = '';
	sendError.value = '';
	candidate.value = null;

	try {
		candidate.value = await getGuildInvitationCandidate(
			props.guildId,
			uid.value,
		);
	} catch (error) {
		searchError.value = errorMessage(error, '搜索用户失败');
	} finally {
		searching.value = false;
	}
}

async function send(): Promise<void> {
	if (!candidate.value?.eligible || sending.value) return;

	sending.value = true;
	sendError.value = '';

	try {
		const invitation = await sendGuildInvitation(
			props.guildId,
			candidate.value.uid,
		);
		emit('sent', invitation);
	} catch (error) {
		sendError.value = errorMessage(error, '发送邀请失败');
	} finally {
		sending.value = false;
	}
}
</script>

<style scoped>
.guild-modal-mask {
	position: fixed;
	z-index: 1400;
	inset: 0;
	padding: 18px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--mask);
	backdrop-filter: blur(3px);
}

.guild-modal {
	width: min(520px, calc(100vw - 36px));
	max-height: min(88vh, 640px);
	display: flex;
	flex-direction: column;
	overflow: hidden;
	border: 1px solid var(--border-strong);
	border-radius: 12px;
	background:
		radial-gradient(ellipse at 85% 0%, var(--accent-soft), transparent 48%),
		var(--bg-panel);
	box-shadow: 0 24px 72px var(--shadow), 0 0 24px var(--accent-soft);
}

.guild-modal-header {
	min-height: 64px;
	padding: 12px 18px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 14px;
	border-bottom: 1px solid var(--border-subtle);
}

.guild-modal-title {
	color: var(--text-primary);
	font-size: 18px;
	font-weight: 800;
}

.guild-modal-subtitle {
	margin-top: 5px;
	color: var(--text-muted);
	font-size: 12px;
}

.guild-modal-close {
	width: 34px;
	height: 34px;
	flex: 0 0 34px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 7px;
	background: var(--danger-strong);
	color: #fff;
	font-size: 24px;
	cursor: pointer;
}

.guild-modal-body {
	min-height: 0;
	padding: 18px;
	overflow-y: auto;
}

.invite-search-row {
	display: flex;
	gap: 9px;
}

.guild-input {
	min-width: 0;
	height: 42px;
	flex: 1;
	padding: 0 12px;
	border: 1px solid var(--border-default);
	border-radius: 7px;
	outline: none;
	background: var(--bg-input);
	color: var(--text-primary);
	font-size: 14px;
}

.guild-input:focus {
	border-color: var(--accent);
	box-shadow: 0 0 0 2px var(--accent-soft);
}

.invite-search-button,
.invite-send-button {
	min-width: 92px;
	min-height: 42px;
	padding: 0 12px;
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

.invite-send-button {
	min-height: 34px;
	margin-left: auto;
}

.invite-search-button.disabled,
.invite-send-button.disabled {
	opacity: 0.48;
	cursor: not-allowed;
}

.candidate-card {
	margin-top: 18px;
	padding: 14px;
	display: flex;
	align-items: center;
	gap: 12px;
	border: 1px solid var(--border-default);
	border-radius: 9px;
	background: var(--bg-panel-soft);
}

.candidate-avatar {
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

.candidate-avatar-image {
	width: 100%;
	height: 100%;
	display: block;
}

.candidate-copy {
	min-width: 0;
	flex: 1;
}

.candidate-name {
	color: var(--text-primary);
	font-size: 15px;
	font-weight: 700;
}

.candidate-meta {
	margin-top: 4px;
	color: var(--text-faint);
	font-size: 11px;
}

.candidate-state {
	margin-top: 7px;
	color: var(--danger);
	font-size: 12px;
}

.candidate-state.eligible {
	color: var(--success);
}

.guild-modal-error {
	margin-top: 13px;
	padding: 10px 12px;
	border: 1px solid rgba(240, 106, 115, 0.45);
	border-radius: 7px;
	background: var(--danger-soft);
	color: var(--danger);
	font-size: 12px;
}

.guild-modal-footer {
	padding: 13px 18px;
	display: flex;
	justify-content: flex-end;
	border-top: 1px solid var(--border-subtle);
	background: var(--bg-panel-alt);
}

.guild-modal-button {
	min-width: 92px;
	min-height: 38px;
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

@media screen and (max-width: 700px) {
	.guild-modal-mask {
		padding: 14px;
	}

	.guild-modal {
		width: 100%;
	}

	.candidate-card {
		align-items: flex-start;
		flex-wrap: wrap;
	}

	.invite-send-button {
		width: 100%;
		margin-left: 0;
	}
}
</style>
