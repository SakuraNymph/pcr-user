<template>
	<view class="team-operation-mask" @click.stop="emit('close')" @touchmove.stop.prevent>
		<view
			class="team-operation-modal"
			role="dialog"
			aria-modal="true"
			aria-label="作业操作"
			@click.stop
		>
			<view class="team-operation-header">
				<view class="team-operation-title">作业操作</view>
				<view
					class="team-operation-close"
					role="button"
					tabindex="0"
					aria-label="关闭作业操作"
					@click.stop="emit('close')"
					@keydown.enter.prevent="emit('close')"
					@keydown.space.prevent="emit('close')"
				>
					×
				</view>
			</view>

			<view class="team-operation-body">
				<view
					class="team-operation-option team-operation-lock team-guide-target-lock"
					:class="{ 'is-disabled': locked }"
					role="button"
					:tabindex="locked ? -1 : 0"
					:aria-disabled="locked"
					@click.stop="chooseAction('lock')"
					@keydown.enter.prevent="chooseAction('lock')"
					@keydown.space.prevent="chooseAction('lock')"
				>
					<text class="team-operation-option-label">【锁定】</text>
					<text class="team-operation-option-text">套餐将固定此作业</text>
				</view>

				<view
					class="team-operation-option team-operation-unlock"
					:class="{ 'is-disabled': !locked }"
					role="button"
					:tabindex="locked ? 0 : -1"
					:aria-disabled="!locked"
					@click.stop="chooseAction('unlock')"
					@keydown.enter.prevent="chooseAction('unlock')"
					@keydown.space.prevent="chooseAction('unlock')"
				>
					<text class="team-operation-option-label">【解锁】</text>
					<text class="team-operation-option-text">套餐解除锁定状态</text>
				</view>

				<view
					class="team-operation-option team-operation-hide"
					role="button"
					tabindex="0"
					@click.stop="chooseAction('hide')"
					@keydown.enter.prevent="chooseAction('hide')"
					@keydown.space.prevent="chooseAction('hide')"
				>
					<text class="team-operation-option-label">【隐藏】</text>
					<text class="team-operation-option-text">套餐将排除此作业</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup lang="ts">
type TeamOperationAction = 'lock' | 'unlock' | 'hide';

const props = defineProps<{
	locked: boolean;
}>();

const emit = defineEmits<{
	(event: 'close'): void;
	(event: 'lock'): void;
	(event: 'unlock'): void;
	(event: 'hide'): void;
}>();

function chooseAction(action: TeamOperationAction): void {
	if (action === 'lock') {
		if (!props.locked) {
			emit('lock');
		}
		return;
	}

	if (action === 'unlock') {
		if (props.locked) {
			emit('unlock');
		}
		return;
	}

	emit('hide');
}
</script>

<style scoped>
.team-operation-mask {
	position: fixed;
	z-index: 1400;
	inset: 0;
	padding: 18px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgba(2, 10, 22, 0.72);
	backdrop-filter: blur(4px);
}

.team-operation-modal {
	width: min(420px, calc(100vw - 36px));
	overflow: hidden;
	border: 1px solid var(--border-strong);
	border-radius: 12px;
	background:
		radial-gradient(circle at 90% 0%, rgba(28, 167, 255, 0.18), transparent 42%),
		var(--bg-page);
	box-shadow:
		0 24px 72px rgba(0, 0, 0, 0.68),
		0 0 24px rgba(26, 135, 214, 0.22);
}

.team-operation-header {
	position: relative;
	min-height: 64px;
	padding: 12px 58px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-bottom: 1px solid var(--border-subtle);
	background: linear-gradient(100deg, var(--bg-panel), var(--bg-panel-alt));
}

.team-operation-title {
	color: var(--text-primary);
	font-size: 18px;
	font-weight: 800;
	letter-spacing: 0.04em;
	text-align: center;
}

.team-operation-close {
	position: absolute;
	top: 50%;
	right: 14px;
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
	transform: translateY(-50%);
}

.team-operation-body {
	padding: 10px;
	display: flex;
	flex-direction: column;
	gap: 8px;
	background: linear-gradient(145deg, var(--bg-content-start), var(--bg-content-end));
}

.team-operation-option {
	min-height: 54px;
	padding: 10px 14px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 3px;
	border: 1px solid var(--border-default);
	border-radius: 8px;
	background: var(--bg-panel-soft);
	text-align: center;
	cursor: pointer;
	transition: border-color 0.16s ease, background 0.16s ease, transform 0.16s ease;
}

.team-operation-option:hover {
	border-color: var(--border-strong);
	background: var(--accent-soft);
	transform: translateX(2px);
}

.team-operation-option.is-disabled {
	opacity: 0.42;
	cursor: not-allowed;
	transform: none;
}

.team-operation-option-label {
	flex: 0 0 auto;
	font-size: 15px;
	font-weight: 800;
	text-align: center;
}

.team-operation-option-text {
	color: var(--text-secondary);
	font-size: 13px;
	text-align: center;
}

.team-operation-lock .team-operation-option-label {
	color: #f2c45d;
}

.team-operation-unlock .team-operation-option-label {
	color: #58c9ff;
}

.team-operation-hide .team-operation-option-label {
	color: #ff7d88;
}

@media screen and (max-width: 700px) {
	.team-operation-mask {
		padding: 12px;
	}

	.team-operation-modal {
		width: calc(100vw - 24px);
	}

	.team-operation-option {
		align-items: center;
		flex-direction: column;
		gap: 3px;
	}
}
</style>
