<template>
	<AuthLayout>
		<view class="auth-title">欢迎回来</view>
		<view class="auth-subtitle">登录 PCR 作业站</view>
		<view class="field-label">邮箱</view>
		<input v-model="email" class="auth-input" type="text" maxlength="255" placeholder="请输入邮箱" />
		<view class="field-label">密码</view>
		<input v-model="password" class="auth-input" type="text" password placeholder="请输入密码" />
		<view class="submit-button" :class="{ disabled: submitting }" @click="submit">
			{{ submitting ? '登录中...' : '登录' }}
		</view>
		<view class="auth-switch">
			还没有账号？<text class="auth-link" @click="navigateTo(routes.register)">立即注册</text>
		</view>
	</AuthLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { errorMessage } from '../../api/errors';
import { loginUser } from '../../api/user';
import AuthLayout from '../../layouts/AuthLayout.vue';
import { navigateTo, redirectTo, routes } from '../../router';

const email = ref('');
const password = ref('');
const submitting = ref(false);

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


async function submit(): Promise<void> {
	if (submitting.value) {
		return;
	}
	const normalizedEmail = email.value.trim();
	if (!normalizedEmail || !password.value) {
		uni.showToast({ title: '请输入邮箱和密码', icon: 'none' });
		return;
	}
	if (normalizedEmail.length > 255 || !emailPattern.test(normalizedEmail)) {
		uni.showToast({ title: '请输入有效的邮箱地址', icon: 'none' });
		return;
	}

	submitting.value = true;
	try {
		await loginUser({ email: normalizedEmail, password: password.value });
		uni.showToast({ title: '登录成功', icon: 'success' });
		redirectTo(routes.home);
	} catch (error) {
		uni.showToast({ title: errorMessage(error, '登录失败，请稍后重试'), icon: 'none' });
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
