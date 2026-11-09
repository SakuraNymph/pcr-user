<template>
	<view class="profile-modal-mask" @click="handleMaskClick">
		<view
			class="profile-modal"
			role="dialog"
			aria-modal="true"
			aria-label="修改密码"
			@click.stop
		>
			<view class="profile-modal-header">
				<view>
					<view class="profile-modal-title">{{ modalTitle }}</view>
					<view class="profile-modal-subtitle">{{ modalSubtitle }}</view>
				</view>
				<view class="profile-modal-close" @click="close">×</view>
			</view>

			<view class="profile-modal-body">
				<template v-if="mode === 'change'">
					<view class="field-group">
						<view class="field-label">原密码</view>
						<input
							v-model="currentPassword"
							class="profile-input"
							type="text"
							password
							maxlength="32"
							placeholder="请输入当前密码"
							:disabled="submitting"
						/>
						<view class="forgot-link-row">
							<text class="forgot-link" @click="startForgotFlow">忘记原密码？</text>
						</view>
					</view>

					<view class="field-group">
						<view class="field-label">新密码</view>
						<input
							v-model="newPassword"
							class="profile-input"
							type="text"
							password
							maxlength="16"
							placeholder="请输入 6–16 位新密码"
							:disabled="submitting"
						/>
					</view>

					<view class="field-group">
						<view class="field-label">确认新密码</view>
						<input
							v-model="confirmPassword"
							class="profile-input"
							type="text"
							password
							maxlength="16"
							placeholder="请再次输入新密码"
							:disabled="submitting"
							@confirm="submit"
						/>
					</view>

					<view v-if="errorText" class="profile-error">{{ errorText }}</view>
					<view v-else class="profile-hint">
						新密码长度为 6–16 位，且不能与原密码相同。
					</view>
				</template>

				<template v-else>
					<view class="reset-step">第 {{ forgotStep }} 步 / 共 3 步</view>

					<view class="reset-email-box">
						<view class="field-label">绑定邮箱</view>
						<view class="reset-email">{{ maskedEmail }}</view>
						<view class="reset-email-note">
							验证码只会发送到当前账号绑定的邮箱，无法修改。
						</view>
					</view>

					<template v-if="forgotStep === 1">
						<view class="profile-hint reset-hint">
							点击下方「发送验证码」，我们会向绑定邮箱发送 6 位验证码。
						</view>
					</template>

					<template v-else-if="forgotStep === 2">
						<view class="field-group reset-field">
							<view class="field-label">邮箱验证码</view>
							<input
								v-model="verificationCode"
								class="profile-input"
								type="number"
								maxlength="6"
								placeholder="请输入 6 位验证码"
								:disabled="verifyingCode"
								@confirm="verifyResetCode"
							/>
						</view>
						<view class="reset-resend-row">
							<text
								class="forgot-link"
								:class="{ disabled: countdown > 0 || sendingCode }"
								@click="sendResetCode"
							>
								{{ resendText }}
							</text>
						</view>
					</template>

					<template v-else>
						<view class="field-group reset-field">
							<view class="field-label">新密码</view>
							<input
								v-model="resetPassword"
								class="profile-input"
								type="text"
								password
								maxlength="16"
								placeholder="请输入 6–16 位新密码"
								:disabled="resettingPassword"
							/>
						</view>

						<view class="field-group">
							<view class="field-label">确认新密码</view>
							<input
								v-model="resetPasswordConfirmation"
								class="profile-input"
								type="text"
								password
								maxlength="16"
								placeholder="请再次输入新密码"
								:disabled="resettingPassword"
								@confirm="submitResetPassword"
							/>
						</view>
					</template>

					<view v-if="forgotError" class="profile-error">{{ forgotError }}</view>
					<view v-else-if="forgotNotice" class="profile-success">
						{{ forgotNotice }}
					</view>
				</template>
			</view>

			<view class="profile-modal-footer">
				<template v-if="mode === 'change'">
					<view class="modal-button" @click="close">取消</view>
					<view
						class="modal-button primary"
						:class="{ disabled: !canSubmit }"
						@click="submit"
					>
						{{ submitting ? '保存中...' : '确认修改' }}
					</view>
				</template>
				<template v-else>
					<view class="modal-button" @click="backToChange">返回修改密码</view>
					<view
						class="modal-button primary"
						:class="{ disabled: !canForgotSubmit }"
						@click="handleForgotPrimary"
					>
						{{ forgotPrimaryText }}
					</view>
				</template>
			</view>
		</view>
	</view>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { errorMessage } from '../api/errors';
import {
	resetPasswordWithToken,
	sendPasswordResetCode,
	updateUserPassword,
	verifyPasswordResetCode,
} from '../api/user';

type PasswordModalMode = 'change' | 'forgot';
type ForgotStep = 1 | 2 | 3;

const props = defineProps<{
	email?: string;
}>();

const emit = defineEmits<{
	(event: 'close'): void;
	(event: 'saved'): void;
	(event: 'reset'): void;
}>();

const mode = ref<PasswordModalMode>('change');
const forgotStep = ref<ForgotStep>(1);
const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const submitting = ref(false);
const errorText = ref('');

const verificationCode = ref('');
const resetToken = ref('');
const resetPassword = ref('');
const resetPasswordConfirmation = ref('');
const sendingCode = ref(false);
const verifyingCode = ref(false);
const resettingPassword = ref(false);
const forgotError = ref('');
const forgotNotice = ref('');
const countdown = ref(0);
let countdownTimer: ReturnType<typeof setInterval> | null = null;

const maskedEmail = computed(() => maskEmail(props.email || ''));

const modalTitle = computed(() => {
	if (mode.value === 'change') {
		return '修改密码';
	}
	if (forgotStep.value === 1) {
		return '找回密码';
	}
	if (forgotStep.value === 2) {
		return '验证邮箱';
	}
	return '设置新密码';
});

const modalSubtitle = computed(() => {
	if (mode.value === 'change') {
		return '修改后当前登录状态保持不变';
	}
	if (forgotStep.value === 3) {
		return '重置后其他设备将退出登录';
	}
	return '通过绑定邮箱验证后重置密码';
});

const canSubmit = computed(() => (
	!submitting.value
	&& currentPassword.value.length > 0
	&& newPassword.value.length >= 6
	&& newPassword.value.length <= 16
	&& confirmPassword.value.length > 0
	&& newPassword.value === confirmPassword.value
	&& newPassword.value !== currentPassword.value
));

const resendText = computed(() => {
	if (sendingCode.value) {
		return '发送中...';
	}
	if (countdown.value > 0) {
		return `重新发送（${countdown.value}s）`;
	}
	return '重新发送验证码';
});

const forgotPrimaryText = computed(() => {
	if (forgotStep.value === 1) {
		return sendingCode.value ? '发送中...' : '发送验证码';
	}
	if (forgotStep.value === 2) {
		return verifyingCode.value ? '验证中...' : '验证验证码';
	}
	return resettingPassword.value ? '重置中...' : '确认重置密码';
});

const canForgotSubmit = computed(() => {
	if (forgotStep.value === 1) {
		return !sendingCode.value && countdown.value === 0;
	}
	if (forgotStep.value === 2) {
		return !verifyingCode.value && /^\d{6}$/.test(verificationCode.value);
	}
	return (
		!resettingPassword.value
		&& resetPassword.value.length >= 6
		&& resetPassword.value.length <= 16
		&& resetPassword.value === resetPasswordConfirmation.value
	);
});

watch([currentPassword, newPassword, confirmPassword], () => {
	errorText.value = '';
});

watch(
	[verificationCode, resetPassword, resetPasswordConfirmation],
	() => {
		forgotError.value = '';
	},
);

onBeforeUnmount(() => {
	clearCountdownTimer();
});

function maskEmail(value: string): string {
	const email = value.trim();

	if (!email) {
		return '未绑定邮箱';
	}

	const at = email.indexOf('@');

	if (at <= 0) {
		return email;
	}

	const name = email.slice(0, at);
	const domain = email.slice(at);
	const visibleLength = Math.min(2, name.length);

	return `${name.slice(0, visibleLength)}${'*'.repeat(
		Math.max(2, name.length - visibleLength),
	)}${domain}`;
}

function isBusy(): boolean {
	return (
		submitting.value
		|| sendingCode.value
		|| verifyingCode.value
		|| resettingPassword.value
	);
}

function close(): void {
	if (isBusy()) return;
	clearForgotState();
	mode.value = 'change';
	forgotStep.value = 1;
	currentPassword.value = '';
	newPassword.value = '';
	confirmPassword.value = '';
	errorText.value = '';
	emit('close');
}

function handleMaskClick(): void {
	close();
}

function startForgotFlow(): void {
	if (isBusy()) return;
	clearForgotState();
	mode.value = 'forgot';
	forgotStep.value = 1;
}

function backToChange(): void {
	if (isBusy()) return;
	clearForgotState();
	mode.value = 'change';
	forgotStep.value = 1;
	currentPassword.value = '';
	newPassword.value = '';
	confirmPassword.value = '';
	errorText.value = '';
}

function clearForgotState(): void {
	verificationCode.value = '';
	resetToken.value = '';
	resetPassword.value = '';
	resetPasswordConfirmation.value = '';
	forgotError.value = '';
	forgotNotice.value = '';
	countdown.value = 0;
	clearCountdownTimer();
}

function clearCountdownTimer(): void {
	if (countdownTimer !== null) {
		clearInterval(countdownTimer);
		countdownTimer = null;
	}
}

function startCountdown(seconds: number): void {
	clearCountdownTimer();
	countdown.value = Math.max(0, Math.floor(seconds));

	if (countdown.value === 0) {
		return;
	}

	countdownTimer = setInterval(() => {
		countdown.value = Math.max(0, countdown.value - 1);

		if (countdown.value === 0) {
			clearCountdownTimer();
		}
	}, 1000);
}

function validate(): string {
	if (!currentPassword.value) {
		return '请输入原密码';
	}
	if (newPassword.value.length < 6 || newPassword.value.length > 16) {
		return '新密码长度必须为 6–16 位';
	}
	if (!confirmPassword.value) {
		return '请再次输入新密码';
	}
	if (newPassword.value !== confirmPassword.value) {
		return '两次输入的新密码不一致';
	}
	if (newPassword.value === currentPassword.value) {
		return '新密码不能与原密码相同';
	}
	return '';
}

function validateResetPassword(): string {
	if (resetPassword.value.length < 6 || resetPassword.value.length > 16) {
		return '新密码长度必须为 6–16 位';
	}
	if (!resetPasswordConfirmation.value) {
		return '请再次输入新密码';
	}
	if (resetPassword.value !== resetPasswordConfirmation.value) {
		return '两次输入的新密码不一致';
	}
	return '';
}

async function submit(): Promise<void> {
	if (submitting.value) return;

	const validationError = validate();

	if (validationError) {
		errorText.value = validationError;
		return;
	}

	submitting.value = true;
	errorText.value = '';

	try {
		await updateUserPassword({
			current_password: currentPassword.value,
			new_password: newPassword.value,
			new_password_confirmation: confirmPassword.value,
		});
		currentPassword.value = '';
		newPassword.value = '';
		confirmPassword.value = '';
		emit('saved');
	} catch (error) {
		errorText.value = errorMessage(error, '密码修改失败，请稍后重试');
	} finally {
		submitting.value = false;
	}
}

async function sendResetCode(): Promise<void> {
	if (sendingCode.value || countdown.value > 0) {
		return;
	}

	if (!props.email?.trim()) {
		forgotError.value = '当前账号未绑定邮箱，无法找回密码';
		return;
	}

	sendingCode.value = true;
	forgotError.value = '';
	forgotNotice.value = '';

	try {
		const result = await sendPasswordResetCode();
		const retryAfter = result.retry_after || 60;
		const expiresIn = result.expires_in || 300;
		const minutes = Math.max(1, Math.round(expiresIn / 60));

		startCountdown(retryAfter);
		verificationCode.value = '';
		forgotStep.value = 2;
		forgotNotice.value = `验证码已发送至 ${maskedEmail.value}，${minutes} 分钟内有效`;
	} catch (error) {
		forgotError.value = errorMessage(error, '验证码发送失败，请稍后重试');
	} finally {
		sendingCode.value = false;
	}
}

async function verifyResetCode(): Promise<void> {
	if (verifyingCode.value) {
		return;
	}

	const code = verificationCode.value.trim();

	if (!/^\d{6}$/.test(code)) {
		forgotError.value = '请输入 6 位数字验证码';
		return;
	}

	verifyingCode.value = true;
	forgotError.value = '';
	forgotNotice.value = '';

	try {
		const result = await verifyPasswordResetCode(code);

		resetToken.value = result.reset_token;
		verificationCode.value = '';
		forgotStep.value = 3;
		forgotNotice.value = '验证成功，请设置新密码';
	} catch (error) {
		forgotError.value = errorMessage(error, '验证码验证失败，请稍后重试');
	} finally {
		verifyingCode.value = false;
	}
}

async function submitResetPassword(): Promise<void> {
	if (resettingPassword.value) {
		return;
	}

	const validationError = validateResetPassword();

	if (validationError) {
		forgotError.value = validationError;
		return;
	}

	if (!resetToken.value) {
		forgotError.value = '重置凭证已失效，请重新验证邮箱';
		forgotStep.value = 2;
		return;
	}

	resettingPassword.value = true;
	forgotError.value = '';
	forgotNotice.value = '';

	try {
		await resetPasswordWithToken({
			reset_token: resetToken.value,
			password: resetPassword.value,
			password_confirmation: resetPasswordConfirmation.value,
		});

		clearForgotState();
		mode.value = 'change';
		forgotStep.value = 1;
		currentPassword.value = '';
		newPassword.value = '';
		confirmPassword.value = '';
		emit('reset');
	} catch (error) {
		const message = errorMessage(error, '密码重置失败，请稍后重试');
		forgotError.value = message;

		if (message.includes('重置凭证') || message.includes('过期')) {
			resetToken.value = '';
			resetPassword.value = '';
			resetPasswordConfirmation.value = '';
			forgotStep.value = 2;
		}
	} finally {
		resettingPassword.value = false;
	}
}

function handleForgotPrimary(): void {
	if (forgotStep.value === 1) {
		void sendResetCode();
		return;
	}
	if (forgotStep.value === 2) {
		void verifyResetCode();
		return;
	}
	void submitResetPassword();
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
	width: min(480px, calc(100vw - 36px));
	max-height: min(88vh, 680px);
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
	color: var(--text-muted);
	font-size: 12px;
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

.field-group + .field-group {
	margin-top: 15px;
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

.forgot-link-row {
	margin-top: 9px;
	display: flex;
	justify-content: flex-end;
}

.forgot-link {
	color: var(--accent-text);
	font-size: 12px;
	font-weight: 700;
	cursor: pointer;
}

.forgot-link.disabled {
	color: var(--text-faint);
	cursor: not-allowed;
}

.reset-step {
	margin-bottom: 12px;
	color: var(--text-faint);
	font-size: 11px;
	letter-spacing: 0.04em;
}

.reset-email-box {
	padding: 13px;
	border: 1px solid var(--border-subtle);
	border-radius: 7px;
	background: var(--bg-panel-soft);
}

.reset-email {
	margin-top: 6px;
	overflow-wrap: anywhere;
	color: var(--text-primary);
	font-size: 15px;
	font-weight: 700;
}

.reset-email-note {
	margin-top: 5px;
	color: var(--text-faint);
	font-size: 11px;
	line-height: 1.6;
}

.reset-hint {
	margin-top: 14px;
}

.reset-field {
	margin-top: 16px;
}

.reset-resend-row {
	margin-top: 9px;
	display: flex;
	justify-content: flex-end;
}

.profile-error,
.profile-hint,
.profile-success {
	margin-top: 16px;
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

.profile-success {
	border: 1px solid rgba(79, 208, 138, 0.4);
	background: rgba(79, 208, 138, 0.12);
	color: var(--success);
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
		max-height: 90vh;
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
