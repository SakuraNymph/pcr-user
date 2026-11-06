<template>
	<view class="profile-modal-mask" @click="handleMaskClick">
		<view
			class="profile-modal"
			role="dialog"
			aria-modal="true"
			aria-label="修改昵称"
			@click.stop
		>
			<view class="profile-modal-header">
				<view>
					<view class="profile-modal-title">修改昵称</view>
					<view class="profile-modal-subtitle">
						当前昵称：{{ currentNickname || '未设置' }}
					</view>
				</view>
				<view class="profile-modal-close" @click="close">×</view>
			</view>

			<view class="profile-modal-body">
				<view class="field-label">新昵称</view>
				<input
					v-model="nickname"
					class="profile-input"
					type="text"
					maxlength="20"
					placeholder="请输入 2–20 个字符"
					:disabled="submitting"
					@confirm="submit"
				/>
				<view class="field-meta">
					<text>昵称长度为 2–20 个字符</text>
					<text>{{ nicknameLength }}/20</text>
				</view>
				<view v-if="errorText" class="profile-error">{{ errorText }}</view>
				<view v-else class="profile-hint">
					首次修改不受限制，之后每 30 天可修改一次。
				</view>
			</view>

			<view class="profile-modal-footer">
				<view class="modal-button" @click="close">取消</view>
				<view
					class="modal-button primary"
					:class="{ disabled: !canSubmit }"
					@click="submit"
				>
					{{ submitting ? '保存中...' : '确认修改' }}
				</view>
			</view>
		</view>
	</view>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { errorMessage } from '../api/errors';
import { updateUserProfile } from '../api/user';
import type { UserProfile } from '../api/types';

const props = defineProps<{
	currentNickname: string;
}>();

const emit = defineEmits<{
	(event: 'close'): void;
	(event: 'saved', user: UserProfile): void;
}>();

const nickname = ref('');
const submitting = ref(false);
const errorText = ref('');

const normalizedNickname = computed(() => nickname.value.trim());
const nicknameLength = computed(() => Array.from(normalizedNickname.value).length);
const canSubmit = computed(() => (
	!submitting.value
	&& nicknameLength.value >= 2
	&& nicknameLength.value <= 20
	&& normalizedNickname.value !== props.currentNickname.trim()
));

watch(nickname, () => {
	errorText.value = '';
});

function close(): void {
	if (submitting.value) return;
	emit('close');
}

function handleMaskClick(): void {
	close();
}

async function submit(): Promise<void> {
	if (submitting.value) return;

	if (!canSubmit.value) {
		if (nicknameLength.value < 2) {
			errorText.value = '昵称长度不能少于 2 个字符';
		} else if (nicknameLength.value > 20) {
			errorText.value = '昵称长度不能超过 20 个字符';
		} else if (normalizedNickname.value === props.currentNickname.trim()) {
			errorText.value = '新昵称与当前昵称相同';
		}
		return;
	}

	submitting.value = true;
	errorText.value = '';

	try {
		const user = await updateUserProfile({
			nickname: normalizedNickname.value,
		});
		emit('saved', user);
	} catch (error) {
		errorText.value = errorMessage(error, '昵称修改失败，请稍后重试');
	} finally {
		submitting.value = false;
	}
}
</script>

<style scoped>
.profile-modal-mask {
	position: fixed;
	z-index: 1300;
	inset: 0;
	padding: 18px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--mask);
	backdrop-filter: blur(3px);
}

.profile-modal {
	width: min(460px, calc(100vw - 36px));
	max-height: min(86vh, 620px);
	display: flex;
	flex-direction: column;
	overflow: hidden;
	border: 1px solid var(--border-strong);
	border-radius: 12px;
	background:
		radial-gradient(ellipse at 80% 0%, var(--accent-soft), transparent 48%),
		var(--bg-panel);
	box-shadow: 0 24px 70px rgba(0, 0, 0, 0.58), 0 0 24px var(--accent-soft);
}

.profile-modal-header {
	min-height: 62px;
	padding: 0 18px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 14px;
	border-bottom: 1px solid var(--border-subtle);
	background: linear-gradient(90deg, var(--bg-panel), var(--bg-panel-alt));
}

.profile-modal-title {
	color: var(--text-primary);
	font-size: 18px;
	font-weight: 700;
}

.profile-modal-subtitle {
	margin-top: 5px;
	overflow: hidden;
	color: var(--text-muted);
	font-size: 12px;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.profile-modal-close {
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
	line-height: 1;
	cursor: pointer;
}

.profile-modal-body {
	min-height: 0;
	padding: 20px 18px;
	overflow-y: auto;
}

.field-label {
	color: var(--text-muted);
	font-size: 12px;
}

.profile-input {
	width: 100%;
	height: 42px;
	margin-top: 8px;
	padding: 0 12px;
	box-sizing: border-box;
	border: 1px solid var(--border-default);
	border-radius: 7px;
	outline: none;
	background: var(--bg-panel-soft);
	color: var(--text-primary);
	font-size: 14px;
}

.profile-input:focus {
	border-color: var(--accent);
	box-shadow: 0 0 0 2px var(--accent-soft);
}

.profile-input::placeholder {
	color: var(--text-placeholder);
}

.field-meta {
	margin-top: 7px;
	display: flex;
	justify-content: space-between;
	gap: 12px;
	color: var(--text-faint);
	font-size: 11px;
}

.profile-error,
.profile-hint {
	margin-top: 14px;
	padding: 10px 12px;
	border-radius: 7px;
	font-size: 12px;
	line-height: 1.6;
}

.profile-error {
	border: 1px solid rgba(255, 92, 108, 0.45);
	background: var(--danger-soft);
	color: var(--danger);
}

.profile-hint {
	border: 1px solid var(--border-subtle);
	background: var(--bg-panel-soft);
	color: var(--text-muted);
}

.profile-modal-footer {
	padding: 14px 18px;
	display: flex;
	justify-content: flex-end;
	gap: 10px;
	border-top: 1px solid var(--border-subtle);
	background: var(--bg-panel-alt);
}

.modal-button {
	min-width: 96px;
	min-height: 38px;
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

.modal-button.primary {
	border-color: var(--accent);
	background: linear-gradient(180deg, var(--accent-strong), var(--accent));
	color: #fff;
	font-weight: 700;
}

.modal-button.disabled {
	cursor: not-allowed;
	filter: grayscale(0.4);
	opacity: 0.58;
}

@media screen and (max-width: 700px) {
	.profile-modal-mask {
		padding: 14px;
	}

	.profile-modal {
		width: 100%;
		max-height: 88vh;
	}

	.profile-modal-header {
		min-height: 58px;
		padding: 0 14px;
	}

	.profile-modal-body {
		padding: 17px 14px;
	}

	.profile-modal-footer {
		padding: 12px 14px;
	}
}
</style>
