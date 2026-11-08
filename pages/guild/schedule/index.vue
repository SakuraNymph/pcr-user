<template>
	<MainLayout active-menu="guild">
		<view class="guild-schedule-page">
			<view v-if="!authState.isAuthenticated" class="schedule-gate">
				<view class="gate-title">登录后查看公会排刀</view>
				<view class="gate-copy">公会排刀仅对当前公会成员开放。</view>
				<view class="gate-actions">
					<view class="gate-button primary" @click="navigateTo(routes.login)">登录</view>
					<view class="gate-button" @click="navigateTo(routes.register)">注册账号</view>
				</view>
			</view>

			<view v-else-if="loading" class="schedule-state">
				<view class="loading-ring"></view>
				<text>正在加载公会排刀...</text>
			</view>

			<view v-else-if="loadError" class="schedule-state error-state">
				<view class="state-title">{{ loadError }}</view>
				<view class="state-button" @click="loadSchedule">重新加载</view>
			</view>

			<template v-else-if="schedule">
				<view class="schedule-hero">
					<view class="schedule-guild">
						<view class="schedule-avatar">
							<image
								v-if="schedule.guild.avatar_url"
								class="schedule-avatar-image"
								:src="schedule.guild.avatar_url"
								mode="aspectFill"
							/>
							<text v-else>{{ guildAvatarText(schedule.guild.name) }}</text>
						</view>
						<view class="schedule-guild-copy">
							<view class="schedule-guild-name">{{ schedule.guild.name }}</view>
							<view class="schedule-guild-meta">
								<text>会长：{{ schedule.guild.owner_nickname || '未设置' }}</text>
								<text>{{ schedule.members.length }} 名成员</text>
								<text :class="schedule.is_current_month ? 'current-badge' : 'history-badge'">
									{{ schedule.is_current_month ? '本月可编辑' : '历史月份只读' }}
								</text>
							</view>
						</view>
					</view>

					<view class="schedule-toolbar">
						<view class="back-button" @click="goBack">‹ 公会详情</view>
						<view class="month-controls">
							<view
								class="month-arrow"
								:class="{ disabled: !canShiftPrevious }"
								@click="shiftMonth(1)"
							>‹</view>
							<picker
								mode="selector"
								:range="monthLabels"
								:value="monthIndex"
								@change="handleMonthPicker"
							>
								<view class="month-picker">{{ formatGuildMonth(schedule.month) }}</view>
							</picker>
							<view
								class="month-arrow"
								:class="{ disabled: !canShiftNext }"
								@click="shiftMonth(-1)"
							>›</view>
						</view>
						<view class="toolbar-actions">
							<view
								v-if="schedule.permissions.can_clear_schedule"
								class="clear-button"
								@click="confirmClear"
							>一键清空本月</view>
							<view
								v-if="schedule.permissions.can_edit_others && schedule.is_current_month"
								class="copy-button"
								@click="openCopy"
							>复制排刀</view>
						</view>
					</view>
				</view>

				<view v-if="!schedule.is_current_month" class="history-notice">
					当前正在查看历史月份。历史排刀对所有成员只读，会长和副会长也不能修改或清空。
				</view>

				<GuildScheduleQuickPanel
					:schedule="schedule"
					:guild-id="guildId"
					:viewer-uid="viewerUid"
					@updated="handleScheduleUpdated"
					@reload="loadSchedule"
				/>

				<GuildScheduleTable
					:schedule="schedule"
					:guild-id="guildId"
					:viewer-uid="viewerUid"
					@updated="handleScheduleUpdated"
					@reload="loadSchedule"
				/>

				<GuildScheduleCopyModal
					v-if="copyVisible"
					:schedule="schedule"
					:guild-id="guildId"
					@close="closeCopy"
					@updated="handleCopyUpdated"
				/>
			</template>
		</view>
	</MainLayout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import MainLayout from '../../../layouts/MainLayout.vue';
import GuildScheduleTable from '../../../components/GuildScheduleTable.vue';
import GuildScheduleQuickPanel from '../../../components/GuildScheduleQuickPanel.vue';
import GuildScheduleCopyModal from '../../../components/GuildScheduleCopyModal.vue';
import {
	clearGuildSchedule,
	getGuildSchedule,
} from '../../../api/guild';
import { errorMessage } from '../../../api/errors';
import { authState } from '../../../api/identity';
import type { GuildSchedule } from '../../../api/types';
import {
	formatGuildMonth,
	guildAvatarText,
} from '../../../utils/guild';
import { navigateTo, routes } from '../../../router';

const guildId = ref(0);
const schedule = ref<GuildSchedule | null>(null);
const loading = ref(false);
const loadError = ref('');
const selectedMonth = ref('');
const clearPending = ref(false);
const copyVisible = ref(false);
let scheduleRequestSequence = 0;

const viewerUid = computed(() => Number(authState.user?.id || 0));
const monthLabels = computed(() => (
	schedule.value?.available_months.map((month) => formatGuildMonth(month)) || []
));
const monthIndex = computed(() => {
	const months = schedule.value?.available_months || [];
	const index = months.indexOf(selectedMonth.value);
	return index >= 0 ? index : 0;
});
const canShiftPrevious = computed(() => {
	const months = schedule.value?.available_months || [];
	return monthIndex.value < months.length - 1;
});
const canShiftNext = computed(() => monthIndex.value > 0);

onLoad((query) => {
	const id = Number(query?.id || 0);
	if (!Number.isInteger(id) || id <= 0) {
		loadError.value = '公会 ID 无效';
		return;
	}
	guildId.value = id;
});

onShow(() => {
	if (!authState.isAuthenticated) {
		scheduleRequestSequence++;
		schedule.value = null;
		selectedMonth.value = '';
		loadError.value = '';
		loading.value = false;
		return;
	}
	if (guildId.value > 0) {
		void loadSchedule();
	}
});

async function loadSchedule(): Promise<void> {
	if (!authState.isAuthenticated || !guildId.value) return;
	const sequence = ++scheduleRequestSequence;
	loading.value = true;
	loadError.value = '';

	try {
		const next = await getGuildSchedule(
			guildId.value,
			selectedMonth.value || undefined,
		);
		if (sequence !== scheduleRequestSequence) return;
		schedule.value = next;
		selectedMonth.value = next.month;
	} catch (error) {
		if (sequence !== scheduleRequestSequence) return;
		loadError.value = errorMessage(error, '加载公会排刀失败');
	} finally {
		if (sequence === scheduleRequestSequence) {
			loading.value = false;
		}
	}
}

function goBack(): void {
	uni.navigateTo({ url: `${routes.guildDetail}?id=${guildId.value}` });
}

function handleScheduleUpdated(next: GuildSchedule): void {
	scheduleRequestSequence++;
	schedule.value = next;
	selectedMonth.value = next.month;
	loading.value = false;
	loadError.value = '';
}

function openCopy(): void {
	copyVisible.value = true;
}

function closeCopy(): void {
	copyVisible.value = false;
}

function handleCopyUpdated(next: GuildSchedule): void {
	closeCopy();
	handleScheduleUpdated(next);
}

function handleMonthPicker(event: { detail: { value: string | number } }): void {
	const index = Number(event.detail.value);
	const month = schedule.value?.available_months[index];
	if (!month || month === selectedMonth.value) return;
	selectedMonth.value = month;
	void loadSchedule();
}

function shiftMonth(offset: number): void {
	const months = schedule.value?.available_months || [];
	const nextIndex = monthIndex.value + offset;
	const month = months[nextIndex];
	if (!month) return;
	selectedMonth.value = month;
	void loadSchedule();
}

function confirmClear(): void {
	if (!schedule.value || clearPending.value) return;

	uni.showModal({
		title: '清空本月公会排刀',
		content: '将清空当前月份全部成员的主刀和返还刀作业，不删除成员和历史月份数据，也不影响个人排刀。',
		confirmText: '确认清空',
		confirmColor: '#f06a73',
		success: async (result) => {
			if (!result.confirm) return;
			clearPending.value = true;
			try {
				const next = await clearGuildSchedule(
					guildId.value,
					schedule.value?.month,
				);
				handleScheduleUpdated(next);
				uni.showToast({ title: '本月排刀已清空', icon: 'success' });
			} catch (error) {
				uni.showToast({
					title: errorMessage(error, '清空公会排刀失败'),
					icon: 'none',
				});
			} finally {
				clearPending.value = false;
			}
		},
	});
}
</script>

<style scoped>
.guild-schedule-page {
	width: 100%;
	max-width: 1280px;
	margin: 0 auto;
}

.schedule-gate,
.schedule-state {
	min-height: 380px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 11px;
	border: 1px solid var(--border-subtle);
	border-radius: 11px;
	background: var(--bg-panel-soft);
	color: var(--text-muted);
	text-align: center;
}

.gate-title,
.state-title {
	color: var(--text-primary);
	font-size: 17px;
	font-weight: 800;
}

.gate-copy {
	color: var(--text-muted);
	font-size: 12px;
}

.gate-actions {
	display: flex;
	gap: 8px;
}

.gate-button,
.state-button {
	min-width: 108px;
	min-height: 37px;
	padding: 0 13px;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1px solid var(--border-default);
	border-radius: 7px;
	background: var(--bg-panel-soft);
	color: var(--text-secondary);
	font-size: 12px;
	cursor: pointer;
}

.gate-button.primary {
	border-color: var(--accent);
	background: linear-gradient(180deg, var(--accent-strong), var(--accent));
	color: #fff;
	font-weight: 700;
}

.loading-ring {
	width: 28px;
	height: 28px;
	border: 2px solid var(--border-default);
	border-top-color: var(--accent);
	border-radius: 50%;
	animation: schedule-spin 0.8s linear infinite;
}

.error-state {
	color: var(--danger);
}

.schedule-hero {
	padding: 14px;
	border: 1px solid var(--border-default);
	border-radius: 10px;
	background:
		radial-gradient(ellipse at 90% 0%, var(--accent-soft), transparent 50%),
		linear-gradient(115deg, var(--bg-panel), var(--bg-panel-alt));
}

.schedule-guild {
	display: flex;
	align-items: center;
	gap: 11px;
}

.schedule-avatar {
	width: 52px;
	height: 52px;
	flex: 0 0 52px;
	overflow: hidden;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1px solid var(--border-strong);
	border-radius: 9px;
	background: var(--bg-subtle);
	color: var(--accent-text);
	font-size: 19px;
	font-weight: 800;
}

.schedule-avatar-image {
	width: 100%;
	height: 100%;
	display: block;
}

.schedule-guild-copy {
	min-width: 0;
	flex: 1;
}

.schedule-guild-name {
	color: var(--text-primary);
	font-size: 18px;
	font-weight: 800;
}

.schedule-guild-meta {
	margin-top: 6px;
	display: flex;
	flex-wrap: wrap;
	gap: 5px 13px;
	color: var(--text-faint);
	font-size: 10px;
}

.current-badge {
	color: var(--success);
}

.history-badge {
	color: var(--warning);
}

.schedule-toolbar {
	margin-top: 12px;
	padding-top: 11px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	flex-wrap: wrap;
	gap: 8px;
	border-top: 1px solid var(--border-subtle);
}

.back-button,
.clear-button,
.copy-button {
	min-height: 34px;
	padding: 0 11px;
	display: flex;
	align-items: center;
	border: 1px solid var(--border-default);
	border-radius: 6px;
	background: var(--bg-panel-soft);
	color: var(--accent-text);
	font-size: 11px;
	font-weight: 700;
	cursor: pointer;
}

.clear-button {
	border-color: rgba(240, 106, 115, 0.48);
	background: var(--danger-soft);
	color: var(--danger);
}

.copy-button {
	border-color: var(--accent);
	background: var(--accent-soft);
	color: var(--accent-text);
}

.toolbar-actions {
	display: flex;
	align-items: center;
	gap: 8px;
	flex-wrap: wrap;
}

.month-controls {
	display: flex;
	align-items: center;
	gap: 4px;
}

.month-arrow {
	width: 30px;
	height: 31px;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1px solid var(--border-default);
	border-radius: 6px;
	background: var(--bg-panel-soft);
	color: var(--accent-text);
	font-size: 18px;
	cursor: pointer;
}

.month-arrow.disabled {
	opacity: 0.35;
	cursor: not-allowed;
}

.month-picker {
	min-width: 132px;
	height: 31px;
	padding: 0 12px;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1px solid var(--border-strong);
	border-radius: 6px;
	background: var(--accent-soft);
	color: var(--text-primary);
	font-size: 12px;
	font-weight: 700;
	cursor: pointer;
}

.history-notice {
	margin-top: 10px;
	padding: 9px 11px;
	border: 1px solid rgba(255, 209, 102, 0.35);
	border-radius: 7px;
	background: rgba(255, 209, 102, 0.07);
	color: var(--warning);
	font-size: 11px;
	line-height: 1.55;
}

@keyframes schedule-spin {
	to {
		transform: rotate(360deg);
	}
}

@media screen and (max-width: 700px) {
	.schedule-guild-name {
		font-size: 16px;
	}

	.schedule-toolbar {
		align-items: stretch;
	}

	.month-controls {
		order: 1;
		flex: 1;
		justify-content: center;
	}

	.clear-button,
	.copy-button {
		justify-content: center;
	}
}
</style>

