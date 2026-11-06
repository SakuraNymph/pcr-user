<template>
	<view class="guild-modal-mask" @click="close" @touchmove.stop.prevent>
		<view class="guild-modal" role="dialog" aria-modal="true" aria-label="修改公会资料" @click.stop>
			<view class="guild-modal-header">
				<view>
					<view class="guild-modal-title">修改公会资料</view>
					<view class="guild-modal-subtitle">公会名称和简介仅会长可以修改</view>
				</view>
				<view class="guild-modal-close" @click="close">×</view>
			</view>

			<view class="guild-modal-body">
				<view class="guild-field">
					<view class="guild-field-label">公会名称</view>
					<input
						v-model="name"
						class="guild-input"
						maxlength="32"
						placeholder="请输入公会名称"
						:disabled="submitting"
					/>
					<view class="guild-field-meta">{{ nameLength }}/32</view>
				</view>

				<view class="guild-field">
					<view class="guild-field-label">公会简介（选填）</view>
					<textarea
						v-model="description"
						class="guild-textarea"
						maxlength="255"
						placeholder="介绍一下你的公会"
						:disabled="submitting"
					/>
					<view class="guild-field-meta">{{ descriptionLength }}/255</view>
				</view>

				<view v-if="errorText" class="guild-modal-error">{{ errorText }}</view>
			</view>

			<view class="guild-modal-footer">
				<view class="guild-modal-button" @click="close">取消</view>
				<view
					class="guild-modal-button primary"
					:class="{ disabled: !canSubmit }"
					@click="submit"
				>
					{{ submitting ? '保存中...' : '保存' }}
				</view>
			</view>
		</view>
	</view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { updateGuild } from '../api/guild';
import { errorMessage } from '../api/errors';
import type { GuildDetail } from '../api/types';

const props = defineProps<{ guild: GuildDetail }>();

const emit = defineEmits<{
	(event: 'close'): void;
	(event: 'saved', guild: GuildDetail): void;
}>();

const name = ref(props.guild.name);
const description = ref(props.guild.description || '');
const submitting = ref(false);
const errorText = ref('');

const nameLength = computed(() => Array.from(name.value.trim()).length);
const descriptionLength = computed(() => Array.from(description.value.trim()).length);
const canSubmit = computed(() => (
	!submitting.value
	&& nameLength.value > 0
	&& nameLength.value <= 32
	&& descriptionLength.value <= 255
	&& (
		name.value.trim() !== props.guild.name
		|| description.value.trim() !== (props.guild.description || '')
	)
));

function close(): void {
	if (!submitting.value) emit('close');
}

async function submit(): Promise<void> {
	if (!canSubmit.value) {
		if (nameLength.value === 0) errorText.value = '公会名称不能为空';
		return;
	}

	submitting.value = true;
	errorText.value = '';

	try {
		const guild = await updateGuild(props.guild.id, {
			name: name.value.trim(),
			description: description.value.trim(),
		});
		emit('saved', guild);
	} catch (error) {
		errorText.value = errorMessage(error, '保存公会资料失败');
	} finally {
		submitting.value = false;
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
	width: min(500px, calc(100vw - 36px));
	max-height: min(88vh, 680px);
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

.guild-field + .guild-field {
	margin-top: 18px;
}

.guild-field-label {
	margin-bottom: 7px;
	color: var(--text-muted);
	font-size: 12px;
	font-weight: 700;
}

.guild-input,
.guild-textarea {
	width: 100%;
	padding: 0 12px;
	border: 1px solid var(--border-default);
	border-radius: 7px;
	outline: none;
	background: var(--bg-input);
	color: var(--text-primary);
	font-size: 14px;
}

.guild-input {
	height: 42px;
}

.guild-textarea {
	height: 126px;
	padding-top: 10px;
	resize: none;
	line-height: 1.65;
}

.guild-input:focus,
.guild-textarea:focus {
	border-color: var(--accent);
	box-shadow: 0 0 0 2px var(--accent-soft);
}

.guild-field-meta {
	margin-top: 5px;
	color: var(--text-faint);
	font-size: 11px;
	text-align: right;
}

.guild-modal-error {
	margin-top: 14px;
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
	gap: 9px;
	border-top: 1px solid var(--border-subtle);
	background: var(--bg-panel-alt);
}

.guild-modal-button {
	min-width: 96px;
	min-height: 38px;
	padding: 0 15px;
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

.guild-modal-button.primary {
	border-color: var(--accent);
	background: linear-gradient(180deg, var(--accent-strong), var(--accent));
	color: #fff;
	font-weight: 700;
}

.guild-modal-button.disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

@media screen and (max-width: 700px) {
	.guild-modal-mask {
		padding: 14px;
	}

	.guild-modal {
		width: 100%;
	}
}
</style>
