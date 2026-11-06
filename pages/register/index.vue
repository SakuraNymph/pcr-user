<template>
	<AuthLayout>
		<view class="auth-title">创建账号</view>
		<view class="auth-subtitle">注册 PCR 作业站账号</view>
		<view class="field-label">邮箱</view>
		<input v-model="email" class="auth-input" type="text" maxlength="255" placeholder="请输入邮箱" />
		<view class="field-label">验证码</view>
		<view class="code-row">
			<input v-model="code" class="auth-input code-input" type="text" maxlength="6" placeholder="请输入 6 位验证码" />
			<button
				class="code-button"
				:class="{ 'countdown-active': codeCountdown > 0 }"
				:disabled="!canSendCode"
				@click="sendCode"
			>
				{{ codeCountdown > 0 ? codeCountdown + 's 后重试' : (sendingCode ? '发送中...' : '发送验证码') }}
			</button>
		</view>
		<view class="field-label">密码</view>
		<input v-model="password" class="auth-input" type="text" password maxlength="32" placeholder="请设置 8–16 位密码" />
		<view class="field-label">确认密码</view>
		<input v-model="confirmPassword" class="auth-input" type="text" password maxlength="32" placeholder="请再次输入密码" />
		<view class="field-label">昵称</view>
		<input v-model="nickname" class="auth-input" type="text" maxlength="64" placeholder="请输入昵称（最多 32 个字符）" />
		<view class="submit-button" :class="{ disabled: submitting }" @click="submit">
			{{ submitting ? '注册中...' : '注册' }}
		</view>
		<view class="auth-switch">
			已有账号？<text class="auth-link" @click="navigateTo(routes.login)">返回登录</text>
		</view>
	</AuthLayout>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue';
import { errorMessage } from '../../api/errors';
import { registerUser, sendRegisterCode } from '../../api/user';
import AuthLayout from '../../layouts/AuthLayout.vue';
import { navigateTo, redirectTo, routes } from '../../router';

const email = ref('');
const code = ref('');
const password = ref('');
const confirmPassword = ref('');
const nickname = ref('');
const sendingCode = ref(false);
const submitting = ref(false);
const codeCountdown = ref(0);

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isEmailValid = computed(() =>
	emailPattern.test(email.value.trim()) && Array.from(email.value.trim()).length <= 255,
);
const canSendCode = computed(() =>
	isEmailValid.value &&
	!sendingCode.value &&
	codeCountdown.value === 0,
);

let countdownTimer: ReturnType<typeof setInterval> | null = null;

function startCodeCountdown(): void {
	if (countdownTimer) {
		clearInterval(countdownTimer);
	}
	codeCountdown.value = 60;
	countdownTimer = setInterval(() => {
		if (codeCountdown.value <= 1) {
			codeCountdown.value = 0;
			if (countdownTimer) {
				clearInterval(countdownTimer);
				countdownTimer = null;
			}
			return;
		}
		codeCountdown.value -= 1;
	}, 1000);
}

onUnmounted(() => {
	if (countdownTimer) {
		clearInterval(countdownTimer);
	}
});

async function sendCode(): Promise<void> {
	if (!canSendCode.value) {
		if (!isEmailValid.value) {
			uni.showToast({ title: '请先输入有效的邮箱地址', icon: 'none' });
		}
		return;
	}

	sendingCode.value = true;
	try {
		await sendRegisterCode(email.value.trim());
		startCodeCountdown();
		uni.showToast({ title: '验证码已发送，请查收邮件', icon: 'success' });
	} catch (error) {
		uni.showToast({ title: errorMessage(error, '验证码发送失败，请稍后重试'), icon: 'none' });
	} finally {
		sendingCode.value = false;
	}
}

function validateForm(): boolean {
	const normalizedEmail = email.value.trim();
	const normalizedNickname = nickname.value.trim();
	if (!normalizedEmail || !code.value.trim() || !password.value || !confirmPassword.value || !normalizedNickname) {
		uni.showToast({ title: '请填写全部必填项', icon: 'none' });
		return false;
	}
	if (Array.from(normalizedEmail).length > 255 || !emailPattern.test(normalizedEmail)) {
		uni.showToast({ title: '请输入有效的邮箱地址', icon: 'none' });
		return false;
	}
	if (!/^\d{6}$/.test(code.value.trim())) {
		uni.showToast({ title: '请输入 6 位数字验证码', icon: 'none' });
		return false;
	}
	const passwordLength = Array.from(password.value).length;
	if (passwordLength < 8 || passwordLength > 16) {
		uni.showToast({ title: '密码长度需为 8–16 位', icon: 'none' });
		return false;
	}
	if (password.value !== confirmPassword.value) {
		uni.showToast({ title: '两次输入的密码不一致', icon: 'none' });
		return false;
	}
	if (Array.from(normalizedNickname).length > 32) {
		uni.showToast({ title: '昵称不能超过 32 个字符', icon: 'none' });
		return false;
	}
	return true;
}

async function submit(): Promise<void> {
	if (submitting.value || !validateForm()) {
		return;
	}

	submitting.value = true;
	try {
		await registerUser({
			nickname: nickname.value.trim(),
			email: email.value.trim(),
			code: code.value.trim(),
			password: password.value,
			password_confirmation: confirmPassword.value,
		});
		uni.showToast({ title: '注册成功', icon: 'success' });
		redirectTo(routes.home);
	} catch (error) {
		uni.showToast({ title: errorMessage(error, '注册失败，请稍后重试'), icon: 'none' });
	} finally {
		submitting.value = false;
	}
}
</script>

<style scoped>
.auth-title {
	color: #fff;
	font-size: 25px;
	font-weight: bold;
}

.auth-subtitle {
	margin: 8px 0 26px;
	color: var(--text-muted);
	font-size: 13px;
}

.field-label {
	margin: 18px 0 8px;
	color: var(--text-secondary);
	font-size: 13px;
}

.auth-input {
	width: 100%;
	height: 44px;
	padding: 0 13px;
	border: 1px solid var(--border-strong);
	border-radius: 7px;
	background: var(--bg-input);
	color: #fff;
	font-size: 14px;
}

.code-row {
	display: flex;
	align-items: center;
	gap: 8px;
}

.code-input {
	flex: 1;
	min-width: 0;
}

.code-button {
	width: 122px;
	min-width: 122px;
	height: 44px;
	margin: 0;
	padding: 0 8px;
	border: 1px solid rgba(55, 125, 183, 0.55);
	border-radius: 7px;
	background: var(--bg-subtle);
	color: var(--text-primary);
	font-size: 12px;
	line-height: 42px;
}

.code-button::after {
	border: none;
}

.code-button[disabled] {
	opacity: 0.5;
}

.code-button.countdown-active[disabled] {
	opacity: 1;
	border-color: rgba(86, 139, 181, 0.4);
	background: var(--bg-panel);
	color: var(--warning);
}

.submit-button {
	height: 44px;
	margin-top: 26px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 7px;
	background: #087cf5;
	color: #fff;
	font-weight: bold;
	cursor: pointer;
}

.submit-button.disabled {
	opacity: 0.65;
}

.auth-switch {
	margin-top: 20px;
	color: var(--text-muted);
	font-size: 13px;
	text-align: center;
}

.auth-link {
	margin-left: 5px;
	color: var(--link);
	cursor: pointer;
}
</style>
