<template>
	<view class="package-modal-mask" @click="emit('close')">
		<view
			class="package-modal"
			role="dialog"
			aria-modal="true"
			:aria-label="title"
			@click.stop
		>
			<view class="package-modal-header">
				<view class="package-modal-heading">
					<view class="package-modal-title">{{ title }}</view>
					<view class="package-modal-subtitle">{{ displayPoolName }}</view>
				</view>
				<view class="package-modal-close" @click="emit('close')">×</view>
			</view>

			<scroll-view class="package-modal-body" scroll-y>
				<ThreeHitSetContent
					v-if="kind === 'three'"
					period="current-month"
					:source="source"
					:account-id="poolId"
				/>
				<SixHitSetContent
					v-else
					:account-id="poolId"
				/>
			</scroll-view>
		</view>
	</view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import SixHitSetContent from './SixHitSetContent.vue';
import ThreeHitSetContent from './ThreeHitSetContent.vue';

const props = defineProps<{
	kind: 'three' | 'six';
	poolName?: string;
	poolId?: number;
	source?: 'system' | 'user';
}>();

const emit = defineEmits<{ (event: 'close'): void }>();

const title = computed(() => (props.kind === 'three' ? '三刀套餐' : '六刀套餐'));
const displayPoolName = computed(() => props.poolName || '当前账号');
</script>

<style scoped>
.package-modal-mask {
	position: fixed;
	z-index: 1200;
	inset: 0;
	padding: 18px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--mask);
	backdrop-filter: blur(3px);
}

.package-modal {
	width: min(1440px, calc(100vw - 36px));
	height: min(94vh, 1100px);
	display: flex;
	flex-direction: column;
	overflow: hidden;
	border: 1px solid var(--border-strong);
	border-radius: 12px;
	background:
		radial-gradient(ellipse at 72% 0%, rgba(0, 95, 190, 0.18), transparent 46%),
		var(--bg-page);
	box-shadow: 0 24px 80px rgba(0, 0, 0, 0.66), 0 0 28px rgba(0, 105, 190, 0.2);
}

.package-modal-header {
	min-height: 64px;
	padding: 0 18px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 18px;
	border-bottom: 1px solid var(--border-subtle);
	background: linear-gradient(90deg, var(--bg-panel), var(--bg-panel-alt));
}

.package-modal-heading {
	min-width: 0;
	display: flex;
	align-items: baseline;
	gap: 12px;
}

.package-modal-title {
	color: var(--text-primary);
	font-size: 18px;
	font-weight: 700;
	white-space: nowrap;
}

.package-modal-subtitle {
	min-width: 0;
	overflow: hidden;
	color: var(--text-muted);
	font-size: 13px;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.package-modal-close {
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

.package-modal-close:active {
	filter: brightness(1.16);
}

.package-modal-body {
	min-height: 0;
	flex: 1;
	background: linear-gradient(145deg, var(--bg-content-start) 0%, var(--bg-content-end) 100%);
}

@media screen and (max-width: 700px) {
	.package-modal-mask {
		padding: 0;
	}

	.package-modal {
		width: 100%;
		height: 100vh;
		border: 0;
		border-radius: 0;
	}

	.package-modal-header {
		min-height: 58px;
		padding: 0 10px;
		gap: 10px;
	}

	.package-modal-heading {
		align-items: flex-start;
		flex-direction: column;
		gap: 3px;
	}

	.package-modal-title {
		font-size: 16px;
	}

	.package-modal-subtitle {
		max-width: calc(100vw - 72px);
		font-size: 11px;
	}
}
</style>
