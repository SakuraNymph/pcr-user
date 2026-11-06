<template>
	<view class="coin-modal-mask" @click="requestClose">
		<view class="coin-modal" @click.stop>
			<view class="modal-header">
				<view class="modal-heading">
					<view class="modal-title">大师币商店</view>
					<view class="modal-subtitle">
						{{ displayNickname }} · 点击头像即时保存
					</view>
				</view>
				<view class="close-button" @click="requestClose">×</view>
			</view>

			<view class="summary-bar">
				<text>已选择 {{ selectedIds.length }} 个角色</text>
				<text
					class="save-status"
					:class="{
						'save-status-saving': saveState === 'saving',
						'save-status-error': saveState === 'recovering',
					}"
				>{{ statusText }}</text>
			</view>

			<view class="modal-body">
				<view v-if="loading" class="modal-state">
					<view class="loading-spinner"></view>
					<text>正在加载大师币角色...</text>
				</view>

				<view v-else-if="loadError" class="modal-state error-state">
					<text>{{ loadError }}</text>
					<view class="retry-button" @click="loadData">重新加载</view>
				</view>

				<scroll-view v-else class="roles-scroll" scroll-y>
					<view v-if="roles.length" class="role-grid">
						<view
							v-for="role in roles"
							:key="role.id"
							class="role-card"
							:class="{
								selected: selectedIds.includes(role.id),
								'save-locked': saveState === 'recovering',
							}"
							@click="toggleRole(role.id)"
						>
							<view class="role-avatar-frame">
								<image
									v-if="role.image_url && !failedImageIds.includes(role.id)"
									class="role-avatar"
									:src="role.image_url"
									mode="aspectFill"
									@error="markImageFailed(role.id)"
								/>
								<view v-else class="role-avatar role-placeholder">
									{{ role.name.slice(0, 1) }}
								</view>
							</view>
							<text class="role-name" :title="role.name">{{ role.name }}</text>
						</view>
					</view>
					<view v-else class="modal-state empty-state">
						暂无可选择的大师币角色
					</view>
				</scroll-view>
			</view>
		</view>
	</view>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { errorMessage } from '../api/errors';
import {
	getMasterCoinShopRoles,
	getPoolMasterCoinShop,
	updatePoolMasterCoinShop,
} from '../api/masterCoinShop';
import type { MasterCoinShopRole } from '../api/types';

const props = defineProps<{
	poolId: number;
	poolName?: string;
}>();

const emit = defineEmits<{ (event: 'close'): void }>();

const roles = ref<MasterCoinShopRole[]>([]);
const selectedIds = ref<number[]>([]);
const loading = ref(true);
const loadError = ref('');
const saveStatus = ref('');
const saveState = ref<'idle' | 'saving' | 'recovering'>('idle');
const nickname = ref(props.poolName || '');
const failedImageIds = ref<number[]>([]);

let sessionVersion = 0;
let loadVersion = 0;
let saveWorker: Promise<void> | null = null;
let pendingSnapshot: number[] | null = null;

const displayNickname = computed(() => (
	nickname.value || props.poolName || `游戏账号 #${props.poolId}`
));

const statusText = computed(() => {
	if (saveState.value === 'saving') return '保存中...';
	if (saveState.value === 'recovering') return '正在恢复服务端配置...';
	return saveStatus.value || '点击头像即时保存';
});

onMounted(() => {
	sessionVersion += 1;
	void loadData();
});

onBeforeUnmount(() => {
	sessionVersion += 1;
	pendingSnapshot = null;
});

function normalizeIds(values: unknown): number[] {
	if (!Array.isArray(values)) return [];

	const normalized: number[] = [];
	const seen = new Set<number>();
	values.forEach((value) => {
		const numericId = Number(value);
		if (!Number.isInteger(numericId) || numericId <= 0 || seen.has(numericId)) {
			return;
		}
		seen.add(numericId);
		normalized.push(numericId);
	});
	return normalized;
}

function filterConfiguredIds(values: unknown): number[] {
	const configuredIds = new Set(roles.value.map((role) => Number(role.id)));
	return normalizeIds(values).filter((id) => configuredIds.has(id));
}

async function loadData(): Promise<void> {
	const currentLoad = ++loadVersion;
	loading.value = true;
	loadError.value = '';

	try {
		const [systemRoles, config] = await Promise.all([
			getMasterCoinShopRoles(),
			getPoolMasterCoinShop(props.poolId),
		]);
		if (currentLoad !== loadVersion) return;

		roles.value = systemRoles;
		nickname.value = config.nickname || props.poolName || '';
		failedImageIds.value = [];
		selectedIds.value = filterConfiguredIds(config.coin);
		saveStatus.value = '';
		saveState.value = 'idle';
	} catch (error) {
		if (currentLoad !== loadVersion) return;
		loadError.value = errorMessage(error, '加载大师币商店失败，请稍后重试');
	} finally {
		if (currentLoad === loadVersion) {
			loading.value = false;
		}
	}
}

function markImageFailed(roleId: number): void {
	if (!failedImageIds.value.includes(roleId)) {
		failedImageIds.value = [...failedImageIds.value, roleId];
	}
}

function canToggleRole(): boolean {
	return !loading.value && !loadError.value && saveState.value !== 'recovering';
}

function toggleRole(roleId: number): void {
	if (!canToggleRole()) {
		if (saveState.value === 'recovering') {
			uni.showToast({ title: '正在恢复配置，请稍候', icon: 'none' });
		}
		return;
	}

	selectedIds.value = selectedIds.value.includes(roleId)
		? selectedIds.value.filter((id) => id !== roleId)
		: [...selectedIds.value, roleId];

	pendingSnapshot = [...selectedIds.value];
	queueSave();
}

function queueSave(): void {
	if (pendingSnapshot === null) return;

	saveState.value = 'saving';
	saveStatus.value = '保存中...';

	if (saveWorker) return;

	const workerVersion = sessionVersion;
	saveWorker = drainSaveQueue(workerVersion).finally(() => {
		if (workerVersion === sessionVersion) {
			saveWorker = null;
			if (pendingSnapshot !== null) {
				queueSave();
			}
		} else {
			saveWorker = null;
		}
	});
}

async function drainSaveQueue(workerVersion: number): Promise<void> {
	while (workerVersion === sessionVersion && pendingSnapshot !== null) {
		const snapshot = pendingSnapshot;
		pendingSnapshot = null;
		saveState.value = 'saving';
		saveStatus.value = '保存中...';

		try {
			const saved = await updatePoolMasterCoinShop(props.poolId, snapshot);
			if (workerVersion !== sessionVersion) return;

			// 有更新操作等待时保留最新界面，最后一批保存完成后再以服务端为准。
			if (pendingSnapshot === null) {
				selectedIds.value = filterConfiguredIds(saved.coin);
				saveStatus.value = '已保存';
			}
		} catch (error) {
			if (workerVersion !== sessionVersion) return;

			pendingSnapshot = null;
			saveState.value = 'recovering';
			saveStatus.value = '保存失败';
			uni.showToast({
				title: errorMessage(error, '保存失败，正在恢复服务端配置'),
				icon: 'none',
				duration: 2400,
			});

			try {
				const serverConfig = await getPoolMasterCoinShop(props.poolId);
				if (workerVersion !== sessionVersion) return;
				nickname.value = serverConfig.nickname || props.poolName || '';
				selectedIds.value = filterConfiguredIds(serverConfig.coin);
				saveStatus.value = '已恢复服务端配置';
			} catch (reloadError) {
				if (workerVersion !== sessionVersion) return;
				loadError.value = errorMessage(
					reloadError,
					'保存失败，且无法重新获取服务端配置，请重新加载',
				);
				saveStatus.value = '';
			} finally {
				if (workerVersion === sessionVersion) {
					saveState.value = 'idle';
				}
			}
			return;
		}
	}

	if (workerVersion === sessionVersion) {
		saveState.value = 'idle';
		if (saveStatus.value === '保存中...') {
			saveStatus.value = '已保存';
		}
	}
}

function requestClose(): void {
	if (saveState.value !== 'idle' || saveWorker !== null || pendingSnapshot !== null) {
		uni.showToast({ title: '正在保存，请稍候', icon: 'none' });
		return;
	}
	emit('close');
}
</script>

<style scoped>
.coin-modal-mask {
	position: fixed;
	z-index: 1100;
	inset: 0;
	padding: 24px 12px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--mask);
}

.coin-modal {
	width: min(820px, 100%);
	height: min(90vh, 900px);
	max-height: 92vh;
	display: flex;
	flex-direction: column;
	border: 1px solid var(--border-strong);
	border-radius: 10px;
	background:
		radial-gradient(circle at 92% 0%, rgba(23, 112, 185, 0.2), transparent 36%),
		var(--bg-elevated);
	box-shadow: 0 18px 60px rgba(0, 0, 0, 0.58), 0 0 24px rgba(0, 105, 190, 0.16);
	overflow: hidden;
}

.modal-header {
	min-height: 64px;
	padding: 10px 18px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 14px;
	border-bottom: 1px solid var(--border-subtle);
}

.modal-heading {
	min-width: 0;
}

.modal-title {
	color: var(--text-primary);
	font-size: 17px;
	font-weight: 700;
}

.modal-subtitle {
	margin-top: 5px;
	overflow: hidden;
	color: var(--text-muted);
	font-size: 11px;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.close-button {
	width: 32px;
	height: 32px;
	flex: 0 0 32px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 6px;
	background: var(--danger-strong);
	color: #fff;
	font-size: 23px;
	line-height: 1;
	cursor: pointer;
}

.summary-bar {
	min-height: 40px;
	padding: 0 18px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	border-bottom: 1px solid var(--border-subtle);
	background: var(--bg-panel-soft);
	color: var(--text-secondary);
	font-size: 12px;
}

.save-status {
	color: #6fa9d7;
	font-size: 11px;
}

.save-status-saving {
	color: #f2c86b;
}

.save-status-error {
	color: var(--danger);
}

.modal-body {
	flex: 1 1 auto;
	min-height: 0;
	padding: 12px;
	display: flex;
	overflow: hidden;
}

.roles-scroll {
	flex: 1 1 auto;
	width: 100%;
	height: 100%;
	min-height: 0;
	max-height: none;
}

.role-grid {
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	column-gap: 4px;
	row-gap: 8px;
	align-items: start;
}

.role-card {
	position: relative;
	min-width: 0;
	padding: 5px;
	border: 1px solid rgba(61, 113, 158, 0.35);
	border-radius: 8px;
	background: transparent;
	cursor: pointer;
	transition: border-color 0.16s ease, background 0.16s ease, transform 0.16s ease;
}

.role-card:active {
	transform: translateY(1px);
}

.role-card.selected {
	border-color: #2c98f0;
	background: transparent;
	box-shadow: 0 0 12px rgba(26, 132, 226, 0.2);
}

.role-card.save-locked {
	cursor: wait;
}

.role-avatar-frame {
	position: relative;
	width: 50%;
	padding-top: 50%;
	margin: 0 auto;
	overflow: hidden;
	border: 1px solid rgba(104, 157, 203, 0.42);
	border-radius: 7px;
	background: var(--bg-subtle);
}

.role-avatar {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	display: block;
	transition: filter 0.16s ease, opacity 0.16s ease;
}

.role-card:not(.selected) .role-avatar {
	filter: grayscale(100%) brightness(0.72);
	opacity: 0.78;
}

.role-card.selected .role-avatar {
	filter: none;
	opacity: 1;
}

.role-placeholder {
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--text-secondary);
	font-size: 25px;
	font-weight: 700;
}

.role-name {
	margin-top: 5px;
	display: block;
	overflow: hidden;
	color: var(--text-secondary);
	font-size: 11px;
	text-align: center;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.modal-state {
	min-height: 240px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 13px;
	color: var(--text-muted);
	font-size: 13px;
}

.error-state {
	color: var(--danger);
}

.empty-state {
	min-height: 260px;
}

.loading-spinner {
	width: 26px;
	height: 26px;
	border: 2px solid rgba(91, 166, 225, 0.24);
	border-top-color: #45a9f4;
	border-radius: 50%;
	animation: coin-shop-spin 0.8s linear infinite;
}

@keyframes coin-shop-spin {
	to {
		transform: rotate(360deg);
	}
}

.retry-button {
	padding: 7px 13px;
	border: 1px solid var(--border-strong);
	border-radius: 5px;
	color: var(--accent-text);
	cursor: pointer;
}

@media screen and (orientation: portrait) {
	.coin-modal {
		height: 94vh;
		max-height: 94vh;
	}
}

@media screen and (max-width: 700px) {
	.coin-modal-mask {
		padding: 8px 5px;
	}

	.coin-modal {
		height: 94vh;
		max-height: 94vh;
	}

	.modal-header {
		min-height: 58px;
		padding: 8px 11px;
	}

	.modal-title {
		font-size: 15px;
	}

	.summary-bar {
		padding: 0 11px;
	}

	.modal-body {
		padding: 6px;
	}

	.roles-scroll {
		height: 100%;
		min-height: 0;
	}

	.role-grid {
		column-gap: 2px;
		row-gap: 4px;
	}

	.role-card {
		padding: 3px;
		border-radius: 6px;
	}

	.role-name {
		margin-top: 3px;
		font-size: 10px;
	}
}
</style>
