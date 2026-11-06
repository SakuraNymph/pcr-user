<template>
	<view class="schedule-switcher">
		<view class="switcher-current">
			<view class="switcher-mark">表</view>
			<view class="switcher-copy">
				<view class="switcher-title-row">
					<text class="switcher-title">{{ currentLabel }}</text>
					<text class="switcher-role" :class="currentRoleClass">{{ currentRoleLabel }}</text>
				</view>
				<text class="switcher-subtitle">{{ currentSubtitle }}</text>
			</view>
		</view>

		<view class="switcher-actions">
			<view
				class="switcher-button primary"
				:class="{ disabled: busy }"
				@click="toggleMenu"
			>切换</view>
			<view
				v-if="currentShareCode"
				class="switcher-button"
				@click="copyShareCode"
			>复制码</view>
			<view
				v-if="currentShareCode"
				class="switcher-button"
				@click="openQr"
			>二维码</view>
			<view
				v-else-if="canGenerate"
				class="switcher-button accent"
				:class="{ disabled: busy }"
				@click="generateShareCode"
			>生成分享码</view>
			<view
				v-if="isMember"
				class="switcher-button danger"
				:class="{ disabled: busy }"
				@click="leaveShared"
			>退出共享</view>
			<view
				class="switcher-button"
				:class="{ disabled: busy }"
				@click="openJoin"
			>输入分享码</view>
		</view>

		<view v-if="menuOpen" class="switcher-menu">
			<view class="switcher-menu-title">切换排刀表</view>
			<view
				v-for="item in options"
				:key="optionKey(item)"
				class="schedule-option"
				:class="{ active: isCurrent(item) }"
				@click="selectSchedule(item)"
			>
				<view class="option-copy">
					<view class="option-title-row">
						<text class="option-title">{{ optionLabel(item) }}</text>
						<text class="option-role">{{ item.role === 'owner' ? '自有' : '共享' }}</text>
					</view>
					<text class="option-subtitle">{{ optionSubtitle(item) }}</text>
				</view>
				<text v-if="isCurrent(item)" class="option-current">当前</text>
			</view>
			<view class="schedule-option join-option" @click="openJoin">
				<text class="join-plus">＋</text>
				<text>输入分享码加入其他排刀表</text>
			</view>
		</view>
	</view>

	<view v-if="joinOpen" class="switcher-overlay" @click="closeJoin">
		<view class="join-dialog" @click.stop>
			<view class="join-title">加入共享排刀表</view>
			<view class="join-description">
				输入创建者提供的 8 位分享码，加入后可以与其共同编辑同一张排刀表。
			</view>
			<input
				class="join-input"
				type="text"
				:value="joinCode"
				:focus="joinFocus"
				maxlength="16"
				placeholder="例如 ABCD2345"
				placeholder-class="join-placeholder"
				@input="handleJoinInput"
				@confirm="submitJoin"
			/>
			<view v-if="joinError" class="join-error">{{ joinError }}</view>
			<view class="join-actions">
				<view class="join-button cancel" @click="closeJoin">取消</view>
				<view
					class="join-button confirm"
					:class="{ disabled: busy }"
					@click="submitJoin"
				>加入</view>
			</view>
		</view>
	</view>

	<ClanScheduleQrDialog
		:visible="qrOpen"
		:title="currentLabel"
		:share-code="currentShareCode"
		:share-url="shareUrl"
		@close="qrOpen = false"
	/>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import type { ClanScheduleSummary } from '../api/types';
import ClanScheduleQrDialog from './ClanScheduleQrDialog.vue';
import { buildScheduleShareUrl } from '../utils/clanSchedule';

const props = defineProps<{
	current: ClanScheduleSummary | null;
	own: ClanScheduleSummary | null;
	shared: ClanScheduleSummary[];
	busy?: boolean;
}>();

const emit = defineEmits<{
	(event: 'select', schedule: ClanScheduleSummary): void;
	(event: 'join', shareCode: string): void;
	(event: 'generate-share-code'): void;
	(event: 'leave'): void;
}>();

const menuOpen = ref(false);
const joinOpen = ref(false);
const joinFocus = ref(false);
const joinCode = ref('');
const joinError = ref('');
const qrOpen = ref(false);

const options = computed<ClanScheduleSummary[]>(() => {
	const values: ClanScheduleSummary[] = [];
	if (props.own) values.push(props.own);
	props.shared.forEach((item) => values.push(item));
	return values;
});

const currentShareCode = computed(() => props.current?.share_code ?? '');
const shareUrl = computed(() => (
	currentShareCode.value
		? buildScheduleShareUrl(currentShareCode.value)
		: ''
));
const isMember = computed(() => props.current?.role === 'member');
const canGenerate = computed(() => {
	const current = props.current;
	return (
		!!current
		&& current.role === 'owner'
		&& !current.share_code
		&& !props.busy
	);
});

const currentLabel = computed(() => {
	if (!props.current) return '排刀表加载中';
	if (props.current.role === 'owner') return '我的排刀表';
	return props.current.owner_nickname || '共享排刀表';
});

const currentRoleLabel = computed(() => {
	if (!props.current) return '';
	return props.current.role === 'owner' ? '自有' : '共享';
});

const currentRoleClass = computed(() => {
	if (!props.current) return '';
	return props.current.role === 'owner' ? 'role-owner' : 'role-member';
});

const currentSubtitle = computed(() => {
	if (!props.current) return '正在读取可访问的排刀表';
	if (props.current.share_code) {
		return `分享码 ${props.current.share_code}`;
	}
	return props.current.role === 'owner'
		? '尚未生成分享码'
		: '共享排刀表';
});

function optionKey(item: ClanScheduleSummary): string {
	return `${item.role}:${item.id ?? 'virtual'}`;
}

function optionLabel(item: ClanScheduleSummary): string {
	if (item.role === 'owner') return '我的排刀表';
	return item.owner_nickname || '共享排刀表';
}

function optionSubtitle(item: ClanScheduleSummary): string {
	if (item.share_code) return `分享码 ${item.share_code}`;
	return item.role === 'owner' ? '尚未生成分享码' : '共享排刀表';
}

function isCurrent(item: ClanScheduleSummary): boolean {
	if (!props.current) return false;
	return props.current.role === item.role && props.current.id === item.id;
}

function toggleMenu(): void {
	if (props.busy) return;
	menuOpen.value = !menuOpen.value;
}

function selectSchedule(item: ClanScheduleSummary): void {
	if (props.busy) return;
	menuOpen.value = false;
	emit('select', item);
}

function generateShareCode(): void {
	if (props.busy) return;
	emit('generate-share-code');
}

function leaveShared(): void {
	if (props.busy) return;
	emit('leave');
}

function copyShareCode(): void {
	const code = props.current?.share_code;
	if (!code) return;

	uni.setClipboardData({
		data: code,
		success: () => {
			uni.showToast({
				title: '分享码已复制',
				icon: 'none',
			});
		},
	});
}

function openQr(): void {
	if (!currentShareCode.value) return;
	menuOpen.value = false;
	qrOpen.value = true;
}

async function openJoin(): Promise<void> {
	if (props.busy) return;
	menuOpen.value = false;
	joinCode.value = '';
	joinError.value = '';
	joinOpen.value = true;
	joinFocus.value = false;
	await nextTick();
	joinFocus.value = true;
}

function closeJoin(): void {
	joinOpen.value = false;
	joinFocus.value = false;
	joinError.value = '';
}

function normalizeShareCode(value: unknown): string {
	return String(value ?? '')
		.toUpperCase()
		.replace(/[\s-]+/g, '');
}

function handleJoinInput(event: { detail?: { value?: string | number } }): void {
	joinCode.value = normalizeShareCode(event.detail?.value);
	joinError.value = '';
}

function submitJoin(): void {
	if (props.busy) return;

	const code = normalizeShareCode(joinCode.value);
	joinCode.value = code;

	if (!/^[A-HJ-NP-Z2-9]{8}$/.test(code)) {
		joinError.value = '请输入正确的 8 位分享码';
		return;
	}

	closeJoin();
	emit('join', code);
}
</script>

<style scoped>
.schedule-switcher {
	position: relative;
	margin-top: 12px;
	padding: 10px 12px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 14px;
	border: 1px solid var(--border-default);
	border-radius: 9px;
	background: var(--bg-panel-soft);
	box-shadow: inset 0 1px rgba(255, 255, 255, 0.03);
}

.switcher-current {
	min-width: 0;
	display: flex;
	align-items: center;
	gap: 10px;
}

.switcher-mark {
	width: 34px;
	height: 34px;
	display: flex;
	align-items: center;
	justify-content: center;
	flex: 0 0 auto;
	border: 1px solid rgba(76, 178, 240, 0.38);
	border-radius: 8px;
	background: rgba(24, 132, 212, 0.18);
	color: #a9e2ff;
	font-size: 13px;
	font-weight: 800;
}

.switcher-copy {
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 3px;
}

.switcher-title-row,
.option-title-row {
	min-width: 0;
	display: flex;
	align-items: center;
	gap: 7px;
}

.switcher-title {
	overflow: hidden;
	color: var(--text-primary);
	font-size: 13px;
	font-weight: 800;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.switcher-role,
.option-role {
	padding: 1px 5px;
	border-radius: 999px;
	font-size: 9px;
	font-weight: 700;
	white-space: nowrap;
}

.role-owner {
	border: 1px solid rgba(73, 201, 143, 0.34);
	background: rgba(73, 201, 143, 0.1);
	color: #7be0b0;
}

.role-member {
	border: 1px solid rgba(94, 173, 236, 0.36);
	background: rgba(94, 173, 236, 0.1);
	color: #8fd4ff;
}

.switcher-subtitle {
	overflow: hidden;
	color: var(--text-faint);
	font-size: 10px;
	letter-spacing: 0.04em;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.switcher-actions {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	flex-wrap: wrap;
	gap: 6px;
}

.switcher-button {
	min-height: 31px;
	padding: 0 10px;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1px solid var(--border-default);
	border-radius: 6px;
	background: rgba(255, 255, 255, 0.03);
	color: var(--text-secondary);
	font-size: 10px;
	font-weight: 700;
	white-space: nowrap;
	cursor: pointer;
}

.switcher-button:hover {
	border-color: rgba(76, 178, 240, 0.42);
	background: rgba(24, 132, 212, 0.12);
	color: var(--accent-text);
}

.switcher-button.primary {
	border-color: rgba(69, 185, 255, 0.42);
	background: rgba(24, 132, 212, 0.18);
	color: var(--accent-text);
}

.switcher-button.accent {
	border-color: rgba(72, 200, 178, 0.44);
	background: rgba(47, 196, 168, 0.12);
	color: #8fe6d6;
}

.switcher-button.danger {
	border-color: rgba(228, 92, 104, 0.42);
	background: rgba(203, 73, 86, 0.1);
	color: #ffb8bf;
}

.switcher-button.disabled,
.join-button.disabled {
	opacity: 0.45;
	cursor: not-allowed;
}

.switcher-menu {
	position: absolute;
	top: calc(100% + 7px);
	left: 12px;
	z-index: 30;
	width: min(420px, calc(100vw - 48px));
	padding: 7px;
	border: 1px solid rgba(61, 166, 236, 0.34);
	border-radius: 8px;
	background: var(--bg-panel);
	box-shadow: 0 14px 38px rgba(0, 0, 0, 0.46);
}

.switcher-menu-title {
	padding: 6px 8px 8px;
	color: var(--text-faint);
	font-size: 9px;
	font-weight: 800;
	letter-spacing: 0.12em;
}

.schedule-option {
	padding: 8px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
	border-radius: 6px;
	cursor: pointer;
}

.schedule-option:hover,
.schedule-option.active {
	background: rgba(24, 132, 212, 0.14);
}

.option-copy {
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 3px;
}

.option-title {
	overflow: hidden;
	color: var(--text-primary);
	font-size: 11px;
	font-weight: 700;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.option-subtitle {
	overflow: hidden;
	color: var(--text-faint);
	font-size: 9px;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.option-current {
	color: var(--accent-text);
	font-size: 9px;
	font-weight: 700;
}

.join-option {
	margin-top: 4px;
	border-top: 1px solid var(--border-subtle);
	color: var(--accent-text);
	font-size: 10px;
	font-weight: 700;
}

.join-plus {
	margin-right: 5px;
	font-size: 15px;
	line-height: 1;
}

.switcher-overlay {
	position: fixed;
	inset: 0;
	z-index: 1000;
	padding: 18px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgba(0, 8, 18, 0.68);
	backdrop-filter: blur(3px);
}

.join-dialog {
	width: min(410px, 100%);
	padding: 20px;
	border: 1px solid rgba(61, 166, 236, 0.38);
	border-radius: 10px;
	background: var(--bg-panel);
	box-shadow: 0 22px 60px rgba(0, 0, 0, 0.55);
}

.join-title {
	color: var(--text-primary);
	font-size: 16px;
	font-weight: 800;
}

.join-description {
	margin-top: 7px;
	color: var(--text-muted);
	font-size: 11px;
	line-height: 1.6;
}

.join-input {
	width: 100%;
	height: 42px;
	margin-top: 14px;
	padding: 0 12px;
	border: 1px solid rgba(69, 185, 255, 0.38);
	border-radius: 7px;
	background: rgba(0, 13, 29, 0.4);
	color: #bdeaff;
	font-size: 16px;
	font-weight: 800;
	letter-spacing: 0.12em;
}

.join-placeholder {
	color: var(--text-faint);
	font-size: 12px;
	font-weight: 400;
	letter-spacing: 0;
}

.join-error {
	margin-top: 7px;
	color: #ff9ca5;
	font-size: 10px;
}

.join-actions {
	margin-top: 16px;
	display: flex;
	justify-content: flex-end;
	gap: 8px;
}

.join-button {
	min-height: 32px;
	padding: 0 14px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 6px;
	font-size: 11px;
	font-weight: 700;
	cursor: pointer;
}

.join-button.cancel {
	border: 1px solid var(--border-default);
	color: var(--text-muted);
}

.join-button.confirm {
	border: 1px solid rgba(69, 185, 255, 0.46);
	background: linear-gradient(180deg, rgba(31, 147, 225, 0.85), rgba(13, 93, 157, 0.9));
	color: #effaff;
}

@media screen and (max-width: 700px) {
	.schedule-switcher {
		margin-top: 8px;
		padding: 8px;
		align-items: stretch;
		flex-direction: column;
		gap: 8px;
		border-radius: 7px;
	}

	.switcher-mark {
		width: 30px;
		height: 30px;
	}

	.switcher-actions {
		width: 100%;
		justify-content: flex-start;
		gap: 5px;
	}

	.switcher-button {
		min-height: 30px;
		padding: 0 8px;
		font-size: 9px;
	}

	.switcher-menu {
		left: 8px;
		width: calc(100vw - 34px);
	}

	.join-dialog {
		padding: 17px;
	}
}
</style>
