<template>
	<MainLayout active-menu="schedule">
		<view class="schedule-page">
			<view class="schedule-hero">
				<view class="hero-copy">
					<view class="hero-eyebrow">CLAN BATTLE SCHEDULE</view>
					<view class="hero-title">共享排刀表</view>
					<view class="hero-description">
					表格1与表格2共用同一份排刀数据，任意一侧修改都会自动保存并同步；输入分享码可加入他人的排刀表。本功能仅对正式注册用户开放。
					</view>
				</view>
				<view v-if="authState.isAuthenticated && activeView === 'player'" class="hero-stats">
					<view class="hero-stat">
						<text class="hero-stat-value">{{ playerCount }}</text>
						<text class="hero-stat-label">/ {{ MAX_PLAYERS }} 名玩家</text>
					</view>
					<view class="hero-stat">
						<text class="hero-stat-value">{{ cells.length }}</text>
						<text class="hero-stat-label">/ {{ MAX_PLAYERS * MAX_PLAYER_CELLS }} 次出刀</text>
					</view>
				</view>
			</view>

			<view v-if="!authState.isAuthenticated" class="schedule-guest-gate">
				<view class="schedule-guest-icon">♙</view>
				<view class="schedule-guest-title">登录后即可使用共享排刀表</view>
				<view class="schedule-guest-description">
					排刀表仅对正式注册用户开放，访客无法查看或编辑。请登录或注册后继续。
				</view>
				<view class="schedule-guest-actions">
					<view class="schedule-guest-button primary" @click="goLogin">登录</view>
					<view class="schedule-guest-button" @click="goRegister">注册账号</view>
				</view>
			</view>

			<ClanScheduleSwitcher
				v-if="authState.isAuthenticated"
				:current="currentSchedule"
				:own="ownSchedule"
				:shared="sharedSchedules"
				:busy="switching || clearInProgress || loading"
				@select="handleSelectSchedule"
				@join="handleJoinSchedule"
				@generate-share-code="handleGenerateShareCode"
				@leave="handleLeaveSharedSchedule"
			/>

			<view v-if="authState.isAuthenticated" class="schedule-toolbar">
				<view class="view-tabs">
					<view
						class="view-tab"
						:class="{ active: activeView === 'boss' }"
						@click="switchView('boss')"
					>
						<text class="view-tab-index">01</text>
						<text>表格1 · Boss视角</text>
					</view>
					<view
						class="view-tab"
						:class="{ active: activeView === 'player' }"
						@click="switchView('player')"
					>
						<text class="view-tab-index">02</text>
						<text>表格2 · 玩家视角</text>
					</view>
				</view>

				<view class="toolbar-actions">
					<view v-if="activeView === 'player' && !isMobile" class="layout-toggle">
						<view
							class="layout-option"
							:class="{ active: pcLayout === 'horizontal' }"
							@click="setPcLayout('horizontal')"
						>横向</view>
						<view
							class="layout-option"
							:class="{ active: pcLayout === 'vertical' }"
							@click="setPcLayout('vertical')"
						>竖向</view>
					</view>

					<view class="save-state" :class="`save-${saveStatus}`">
						<text class="save-dot"></text>
						<text>{{ saveStatusText }}</text>
						<view
							v-if="saveStatus === 'error' && !clearInProgress"
							class="save-retry"
							@click="retrySave"
						>重试</view>
					</view>

					<view
						class="tool-button export-button"
						:class="{ disabled: exporting || loading || clearInProgress || switching }"
						@click="exportCurrent"
					>{{ exporting ? '生成中…' : '生成图片' }}</view>
					<view
						v-if="canClearCurrent"
						class="tool-button clear-button"
						:class="{ disabled: clearInProgress || loading || switching }"
						@click="confirmClear"
					>{{ clearInProgress ? '清空中…' : '一键清空' }}</view>
				</view>
			</view>

			<view
				v-if="authState.isAuthenticated && saveStatus === 'error' && saveError"
				class="save-error-banner"
			>
				<view class="save-error-copy">
					<text class="save-error-title">保存失败，当前修改仍保留在页面中</text>
					<text class="save-error-message">{{ saveError }}</text>
				</view>
				<view class="banner-retry" @click="retrySave">重新保存</view>
			</view>

			<view v-if="authState.isAuthenticated && loadError" class="load-error-banner">
				<text>{{ loadError }}</text>
				<view class="banner-retry" @click="retryLoad">重新加载</view>
			</view>

			<view v-if="authState.isAuthenticated" class="schedule-content">
				<view v-if="loading" class="schedule-state">
					<view class="loading-spinner"></view>
					<text>正在加载排刀表…</text>
				</view>

				<template v-else>
					<ClanScheduleBossTable
						v-if="activeView === 'boss'"
						ref="bossTableRef"
						:cells="cells"
						:colors="playerColors"
						:added-rounds="addedRounds"
						:disabled="clearInProgress || switching"
						@commit-cells="handleBossCellChanges"
						@add-row="handleAddPhaseRow"
						@delete-last-row="handleDeleteLastRow"
					/>

					<ClanSchedulePlayerTable
						v-show="activeView === 'player'"
						ref="playerTableRef"
						:rows="playerRows"
						:layout="effectiveLayout"
						:disabled="clearInProgress || switching"
						:max-rows="MAX_PLAYERS"
						@rename-players="handleRenamePlayers"
						@change-boss="handleBossChange"
						@reorder="handleReorder"
						@create-player="handleCreatePlayer"
					/>
				</template>
			</view>

			<view v-if="authState.isAuthenticated" class="schedule-footnote">
				<text>提示：表格1按阶段添加行，填写当前行后才能添加下一行，可删除最后一行；B/C/D 分别最多 6/16/14 行。</text>
				<text>表格2点击“添加一行”录入新玩家；返还刀只有在对应基础刀为B或C阶段时才可填写，最多30名玩家。分享码可邀请其他用户共同编辑当前排刀表。</text>
			</view>
		</view>

		<ScheduleExportCanvas
			ref="exportRef"
			:mode="activeView"
			:cells="cells"
			:rows="playerRows"
			:layout="effectiveLayout"
			:colors="playerColors"
			:added-rounds="addedRounds"
		/>
	</MainLayout>
</template>

<script setup lang="ts">
import {
	computed,
	nextTick,
	onBeforeUnmount,
	onMounted,
	ref,
} from 'vue';
import { onHide, onLoad, onShow, onUnload } from '@dcloudio/uni-app';
import MainLayout from '../../layouts/MainLayout.vue';
import ClanScheduleBossTable from '../../components/ClanScheduleBossTable.vue';
import ClanSchedulePlayerTable from '../../components/ClanSchedulePlayerTable.vue';
import ClanScheduleSwitcher from '../../components/ClanScheduleSwitcher.vue';
import ScheduleExportCanvas from '../../components/ScheduleExportCanvas.vue';
import {
	clearClanSchedule,
	clearSharedClanSchedule,
	generateClanScheduleShareCode,
	getClanSchedule,
	getClanScheduleList,
	getSharedClanSchedule,
	joinClanSchedule,
	leaveSharedClanSchedule,
	saveClanSchedule,
	saveSharedClanSchedule,
} from '../../api/clanSchedule';
import { RequestError, errorMessage } from '../../api/errors';
import { authState } from '../../api/identity';
import { navigateTo, routes } from '../../router';
import type {
	ClanScheduleCell,
	ClanScheduleData,
	ClanScheduleList,
	ClanSchedulePhase,
	ClanScheduleSummary,
} from '../../api/types';
import type { NewPlayerSlot } from '../../utils/clanSchedule';
import {
	MAX_PLAYER_CELLS,
	MAX_PLAYERS,
	MAX_D_PLAYER_CELLS,
	PHASE_MAX_ROWS,
	buildPlayerRows,
	buildSnapshot,
	countCellsForPlayer,
	distinctPlayers,
	findBossPosition,
	firstAvailableSlot,
	insertPlayerAt,
	isValidName,
	isValidShareCode,
	normalizeCells,
	normalizePlayerOrder,
	normalizeShareCode,
	nextPhaseRound,
	parseBossLabel,
	placePlayerSlots,
	playerColorMapForCells,
	replacePlayerInOrder,
	sanitizeReturnCells,
	sortCells,
	trimName,
} from '../../utils/clanSchedule';

interface BossCellChange {
	phase: ClanSchedulePhase;
	round: number;
	boss: number;
	player: string;
}

interface PlayerRename {
	oldPlayer: string;
	newPlayer: string;
}

interface BossChange {
	player: string;
	slot: number;
	label: string;
}

interface NewPlayerPayload {
	player: string;
	slots: NewPlayerSlot[];
	index?: number;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
type PlayerLayout = 'horizontal' | 'vertical';

const PLAYER_LAYOUT_KEY = 'pcr.clan-schedule.player-layout';
const SAVE_DEBOUNCE_MS = 500;

const cells = ref<ClanScheduleCell[]>([]);
const playerOrder = ref<string[]>([]);
const ownSchedule = ref<ClanScheduleSummary | null>(null);
const sharedSchedules = ref<ClanScheduleSummary[]>([]);
const currentSchedule = ref<ClanScheduleSummary | null>(null);
const loading = ref(true);
const loadError = ref('');
const hasLoaded = ref(false);
const activeView = ref<'boss' | 'player'>('boss');
const pcLayout = ref<PlayerLayout>(readStoredLayout());
const addedRounds = ref<Record<ClanSchedulePhase, number[]>>({
	B: [],
	C: [],
	D: [],
});
const windowWidth = ref(Number(uni.getSystemInfoSync().windowWidth) || 1200);
const saveStatus = ref<SaveStatus>('idle');
const saveError = ref('');
const saving = ref(false);
const exporting = ref(false);
const clearInProgress = ref(false);
const switching = ref(false);
const bossTableRef = ref<any>(null);
const playerTableRef = ref<any>(null);
const exportRef = ref<any>(null);

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let activeSavePromise: Promise<void> | null = null;
let dirty = false;
let editVersion = 0;
let operationEpoch = 0;
let loadVersion = 0;
let pendingShareCode = '';
let handledShareCode = '';
let shareCodeJoinInProgress = false;

const isMobile = computed(() => windowWidth.value <= 700);
const effectiveLayout = computed<PlayerLayout>(() => (
	isMobile.value ? 'vertical' : pcLayout.value
));
const players = computed(() => normalizePlayerOrder(cells.value, playerOrder.value));
const playerCount = computed(() => players.value.length);
const playerColors = computed(() => playerColorMapForCells(cells.value));
const playerRows = computed(() => buildPlayerRows(cells.value, players.value));
const canClearCurrent = computed(() => currentSchedule.value?.role === 'owner');
const saveStatusText = computed(() => {
	if (clearInProgress.value) return '清空中…';
	if (saveStatus.value === 'saving') return '保存中…';
	if (saveStatus.value === 'error') return '保存失败';
	if (saveStatus.value === 'saved') return '已保存';
	return '自动保存已开启';
});

onMounted(() => {
	uni.onWindowResize(handleWindowResize);
});

onLoad((options) => {
	rememberShareCode(options?.shareCode ?? options?.share_code ?? '');
});

onShow(() => {
	rememberShareCode(readShareCodeFromLocation());

	if (!authState.isAuthenticated) {
		resetGuestState();
		return;
	}

	if (!hasLoaded.value) {
		void loadWorkspace(true);
		return;
	}

	if (
		!loading.value
		&& !saving.value
		&& !switching.value
		&& !dirty
		&& saveStatus.value !== 'error'
		&& !clearInProgress.value
	) {
		void loadWorkspace(false);
		return;
	}

	void maybeConsumePendingShareCode();
});

onHide(() => {
	flushDrafts();
	void flushSave();
});

onUnload(() => {
	flushDrafts();
	void flushSave();
});

onBeforeUnmount(() => {
	uni.offWindowResize(handleWindowResize);
	cancelSaveTimer();
	flushDrafts();
	void flushSave();
});

function handleWindowResize(event: { size?: { windowWidth?: number } }): void {
	const width = Number(event?.size?.windowWidth);
	if (width > 0) {
		windowWidth.value = width;
	}
}

function resetGuestState(): void {
	loadVersion += 1;
	operationEpoch += 1;
	cancelSaveTimer();
	loading.value = false;
	hasLoaded.value = false;
	loadError.value = '';
	saveStatus.value = 'idle';
	saveError.value = '';
	dirty = false;
	cells.value = [];
	playerOrder.value = [];
	ownSchedule.value = null;
	sharedSchedules.value = [];
	currentSchedule.value = null;
	addedRounds.value = { B: [], C: [], D: [] };
	playerTableRef.value?.resetNewPlayerDraft?.();
}

function rememberShareCode(value: unknown): void {
	const code = normalizeShareCode(value);
	if (isValidShareCode(code)) {
		pendingShareCode = code;
	}
}

function readShareCodeFromLocation(): string {
	// #ifdef H5
	if (typeof window !== 'undefined' && window.location) {
		const hash = window.location.hash || '';
		const hashQueryIndex = hash.indexOf('?');
		const hashQuery = hashQueryIndex >= 0
			? hash.slice(hashQueryIndex + 1)
			: '';
		const params = new URLSearchParams(hashQuery || window.location.search || '');
		return params.get('shareCode') ?? '';
	}
	// #endif

	return '';
}

async function maybeConsumePendingShareCode(): Promise<void> {
	const code = pendingShareCode;

	if (
		!authState.isAuthenticated
		|| !code
		|| shareCodeJoinInProgress
		|| loading.value
		|| switching.value
		|| clearInProgress.value
		|| code === handledShareCode
	) {
		return;
	}

	pendingShareCode = '';
	handledShareCode = code;
	shareCodeJoinInProgress = true;

	try {
		await handleJoinSchedule(code);
	} finally {
		shareCodeJoinInProgress = false;
	}
}

function readStoredLayout(): PlayerLayout {
	try {
		const stored = uni.getStorageSync(PLAYER_LAYOUT_KEY);
		if (stored === 'horizontal' || stored === 'vertical') {
			return stored;
		}
	} catch {
		// Ignore local storage failures and fall back to the default layout.
	}
	return 'horizontal';
}

function setPcLayout(layout: PlayerLayout): void {
	if (pcLayout.value === layout) return;
	pcLayout.value = layout;
	try {
		uni.setStorageSync(PLAYER_LAYOUT_KEY, layout);
	} catch {
		// Layout persistence is optional; the current selection still applies.
	}
}

function handleAddPhaseRow(phase: ClanSchedulePhase): void {
	const nextRound = nextPhaseRound(
		phase,
		cells.value,
		addedRounds.value[phase],
	);

	if (nextRound === null) {
		showToast(`${phase}阶段最多添加 ${PHASE_MAX_ROWS[phase]} 行`);
		return;
	}

	if (!addedRounds.value[phase].includes(nextRound)) {
		addedRounds.value = {
			...addedRounds.value,
			[phase]: [...addedRounds.value[phase], nextRound],
		};
	}
}

function handleDeleteLastRow(
	phase: ClanSchedulePhase,
	round: number,
): void {
	const changes: BossCellChange[] = [];

	for (let boss = 1; boss <= 5; boss += 1) {
		changes.push({
			phase,
			round,
			boss,
			player: '',
		});
	}

	handleBossCellChanges(changes);
	addedRounds.value = {
		...addedRounds.value,
		[phase]: addedRounds.value[phase].filter((item) => item !== round),
	};
}

function switchView(view: 'boss' | 'player'): void {
	if (
		activeView.value === view
		|| clearInProgress.value
		|| switching.value
	) return;
	flushDrafts();
	activeView.value = view;
}

function flushDrafts(): void {
	bossTableRef.value?.flushDrafts?.();
	playerTableRef.value?.flushNameDrafts?.();
}

async function loadWorkspace(showLoading: boolean): Promise<void> {
	if (!authState.isAuthenticated) {
		resetGuestState();
		return;
	}

	const version = ++loadVersion;
	const versionAtStart = editVersion;
	const previous = currentSchedule.value;

	if (showLoading) {
		loading.value = true;
	}
	loadError.value = '';

	try {
		const list = await getClanScheduleList();
		if (version !== loadVersion) return;

		ownSchedule.value = list.own;
		sharedSchedules.value = list.shared;

		let target = pickCurrentSummary(list);
		if (previous?.role === 'member' && target.role === 'owner') {
			showToast('当前共享排刀表已不可访问，已返回我的排刀表');
		}

		let data: ClanScheduleData;
		try {
			data = await fetchScheduleData(target);
		} catch (error) {
			if (
				target.role !== 'owner'
				&& error instanceof RequestError
				&& error.statusCode === 404
			) {
				target = list.own;
				data = await fetchScheduleData(target);
				showToast('当前共享排刀表已不可访问，已返回我的排刀表');
			} else {
				throw error;
			}
		}

		if (version !== loadVersion) return;
		if (editVersion !== versionAtStart || saving.value || dirty) {
			hasLoaded.value = true;
			return;
		}

		currentSchedule.value = data;
		updateSummaryFromData(data);
		applyScheduleSnapshot(data);
		hasLoaded.value = true;
	} catch (error) {
		if (version !== loadVersion) return;
		loadError.value = errorMessage(error, '加载排刀表失败，请稍后重试');
		hasLoaded.value = true;
	} finally {
		if (version === loadVersion) {
			loading.value = false;
			void maybeConsumePendingShareCode();
		}
	}
}

function pickCurrentSummary(list: ClanScheduleList): ClanScheduleSummary {
	const current = currentSchedule.value;

	if (current?.role === 'owner') {
		return list.own;
	}

	if (current?.role === 'member') {
		const shared = list.shared.find((item) => item.id === current.id);
		if (shared) return shared;
	}

	return list.own;
}

async function fetchScheduleData(
	summary: ClanScheduleSummary,
): Promise<ClanScheduleData> {
	if (summary.role === 'owner') {
		return getClanSchedule();
	}

	if (summary.id === null) {
		throw new Error('共享排刀表标识缺失');
	}

	return getSharedClanSchedule(summary.id);
}

function applyScheduleSnapshot(data: ClanScheduleData): void {
	const normalized = normalizeCells(data.cells);
	cells.value = normalized;
	playerOrder.value = normalizePlayerOrder(normalized, data.player_order);
	addedRounds.value = { B: [], C: [], D: [] };
	playerTableRef.value?.resetNewPlayerDraft?.();
	dirty = false;
	saveStatus.value = 'idle';
	saveError.value = '';
	loadError.value = '';
}

function summaryKey(summary: ClanScheduleSummary | null): string {
	if (!summary || summary.role === 'owner') return 'own';
	return `shared:${summary.id ?? 'virtual'}`;
}

function updateSummaryFromData(data: ClanScheduleData): void {
	if (data.role === 'owner') {
		ownSchedule.value = data;
	} else {
		const index = sharedSchedules.value.findIndex(
			(item) => item.id === data.id,
		);
		if (index >= 0) {
			sharedSchedules.value[index] = data;
		} else {
			sharedSchedules.value = [...sharedSchedules.value, data];
		}
	}

	if (
		currentSchedule.value
		&& summaryKey(currentSchedule.value) === summaryKey(data)
	) {
		currentSchedule.value = data;
	}
}

function retryLoad(): void {
	void loadWorkspace(true);
}

function markDirty(): void {
	if (clearInProgress.value || switching.value) return;

	editVersion += 1;
	dirty = true;

	if (saveStatus.value !== 'saving') {
		saveStatus.value = 'idle';
		saveError.value = '';
	}

	scheduleSave();
}

function scheduleSave(): void {
	cancelSaveTimer();
	saveTimer = setTimeout(() => {
		saveTimer = null;
		void flushSave();
	}, SAVE_DEBOUNCE_MS);
}

function cancelSaveTimer(): void {
	if (saveTimer !== null) {
		clearTimeout(saveTimer);
		saveTimer = null;
	}
}

async function flushSave(force = false): Promise<void> {
	cancelSaveTimer();

	if (clearInProgress.value) return;
	if (saving.value) {
		dirty = true;
		return;
	}
	if (!dirty && !force) return;

	const snapshot = buildSnapshot(cells.value, playerOrder.value);
	const version = editVersion;
	const epoch = operationEpoch;
	const scheduleKey = summaryKey(currentSchedule.value);

	dirty = false;
	saving.value = true;
	saveStatus.value = 'saving';
	saveError.value = '';

	const task = performSave(snapshot, version, epoch, scheduleKey);
	activeSavePromise = task;

	try {
		await task;
	} finally {
		if (activeSavePromise === task) {
			activeSavePromise = null;
		}
	}
}

async function performSave(
	snapshot: ReturnType<typeof buildSnapshot>,
	version: number,
	epoch: number,
	scheduleKey: string,
): Promise<void> {
	try {
		const result = await saveCurrentSchedule(snapshot);

		if (
			epoch !== operationEpoch
			|| clearInProgress.value
			|| scheduleKey !== summaryKey(currentSchedule.value)
		) return;

		if (version === editVersion) {
			const normalized = normalizeCells(result.cells);
			cells.value = normalized;
			playerOrder.value = normalizePlayerOrder(normalized, result.player_order);
			updateSummaryFromData(result);
			dirty = false;
			saveStatus.value = 'saved';
			saveError.value = '';
		}
	} catch (error) {
		if (
			epoch !== operationEpoch
			|| clearInProgress.value
			|| scheduleKey !== summaryKey(currentSchedule.value)
		) return;

		dirty = true;
		saveStatus.value = 'error';
		saveError.value = errorMessage(error, '保存失败，请检查网络后重试');
	} finally {
		saving.value = false;

		if (
			epoch === operationEpoch
			&& !clearInProgress.value
			&& scheduleKey === summaryKey(currentSchedule.value)
			&& dirty
			&& saveStatus.value !== 'error'
		) {
			void flushSave();
		}
	}
}

async function saveCurrentSchedule(
	snapshot: ReturnType<typeof buildSnapshot>,
): Promise<ClanScheduleData> {
	const summary = currentSchedule.value;

	if (!summary || summary.role === 'owner') {
		return saveClanSchedule(snapshot);
	}

	if (summary.id === null) {
		throw new Error('共享排刀表标识缺失');
	}

	return saveSharedClanSchedule(summary.id, snapshot);
}

function retrySave(): void {
	if (saving.value || clearInProgress.value || switching.value) return;
	dirty = true;
	saveStatus.value = 'idle';
	saveError.value = '';
	void flushSave(true);
}

async function prepareForScheduleChange(): Promise<boolean> {
	if (clearInProgress.value || switching.value) return false;

	flushDrafts();
	cancelSaveTimer();

	if (activeSavePromise) {
		try {
			await activeSavePromise;
		} catch {
			// The save state below decides whether the user may switch.
		}
	}

	while (saving.value) {
		await delay(20);
	}

	if (dirty && saveStatus.value !== 'error') {
		await flushSave(true);
	}

	while (saving.value) {
		await delay(20);
	}

	if (dirty || saveStatus.value === 'error') {
		showToast('当前排刀表保存失败，请先重试保存');
		return false;
	}

	return true;
}

async function handleSelectSchedule(summary: ClanScheduleSummary): Promise<void> {
	if (switching.value || clearInProgress.value || loading.value) return;
	if (summaryKey(summary) === summaryKey(currentSchedule.value)) return;
	if (!(await prepareForScheduleChange())) return;

	switching.value = true;
	loading.value = true;
	loadError.value = '';
	const version = ++loadVersion;
	operationEpoch += 1;

	try {
		const data = await fetchScheduleData(summary);
		if (version !== loadVersion) return;

		currentSchedule.value = data;
		updateSummaryFromData(data);
		applyScheduleSnapshot(data);
	} catch (error) {
		if (version !== loadVersion) return;
		loadError.value = errorMessage(error, '切换排刀表失败，请稍后重试');
		showToast(loadError.value);
	} finally {
		if (version === loadVersion) {
			loading.value = false;
		}
		switching.value = false;
	}
}

async function handleJoinSchedule(shareCode: string): Promise<void> {
	if (switching.value || clearInProgress.value || loading.value) return;
	if (!(await prepareForScheduleChange())) return;

	switching.value = true;
	const version = ++loadVersion;
	operationEpoch += 1;

	try {
		const data = await joinClanSchedule(shareCode);
		if (version !== loadVersion) return;

		currentSchedule.value = data;
		updateSummaryFromData(data);
		applyScheduleSnapshot(data);
		await refreshScheduleList();
		showToast('已加入共享排刀表');
	} catch (error) {
		showToast(errorMessage(error, '加入排刀表失败，请稍后重试'));
	} finally {
		switching.value = false;
	}
}

async function handleGenerateShareCode(): Promise<void> {
	if (switching.value || clearInProgress.value || loading.value) return;
	if (currentSchedule.value?.role !== 'owner') return;
	if (!(await prepareForScheduleChange())) return;

	switching.value = true;
	const version = ++loadVersion;
	operationEpoch += 1;

	try {
		const data = await generateClanScheduleShareCode();
		if (version !== loadVersion) return;

		currentSchedule.value = data;
		updateSummaryFromData(data);
		showToast('分享码已生成');
	} catch (error) {
		showToast(errorMessage(error, '生成分享码失败，请稍后重试'));
	} finally {
		switching.value = false;
	}
}

function handleLeaveSharedSchedule(): void {
	const summary = currentSchedule.value;
	if (
		switching.value
		|| clearInProgress.value
		|| loading.value
		|| summary?.role !== 'member'
		|| summary.id === null
	) {
		return;
	}

	uni.showModal({
		title: '退出共享排刀表',
		content: '确认退出这张共享排刀表吗？退出后需要重新输入分享码才能访问，排刀表本身不会被删除。',
		confirmText: '确认退出',
		confirmColor: '#e45c68',
		cancelText: '取消',
		success: (result) => {
			if (result.confirm) {
				void performLeaveShared(summary.id as number);
			}
		},
	});
}

async function performLeaveShared(scheduleId: number): Promise<void> {
	if (!(await prepareForScheduleChange())) return;

	switching.value = true;
	operationEpoch += 1;

	try {
		await leaveSharedClanSchedule(scheduleId);
		sharedSchedules.value = sharedSchedules.value.filter(
			(item) => item.id !== scheduleId,
		);
		await loadWorkspace(true);
		showToast('已退出共享排刀表');
	} catch (error) {
		showToast(errorMessage(error, '退出共享排刀表失败，请稍后重试'));
	} finally {
		switching.value = false;
	}
}

async function refreshScheduleList(): Promise<void> {
	try {
		const list = await getClanScheduleList();
		ownSchedule.value = list.own;
		sharedSchedules.value = list.shared;
	} catch {
		// The selected schedule is already loaded; the list can refresh later.
	}
}

function handleBossCellChanges(changes: BossCellChange[]): void {
	if (!changes.length) return;

	let nextCells = cells.value.map((cell) => ({ ...cell }));
	const nextOrder = playerOrder.value.slice();
	let changed = false;
	let firstError = '';

	changes.forEach((change) => {
		const result = applyBossCellChange(nextCells, nextOrder, change);
		changed = changed || result.changed;
		if (!result.ok && !firstError) {
			firstError = result.message || '该修改无法应用';
		}
	});

	if (changed) {
		nextCells = sanitizeReturnCells(nextCells);
		const sorted = sortCells(nextCells);
		cells.value = sorted;
		playerOrder.value = normalizePlayerOrder(sorted, nextOrder);
		markDirty();
	}

	if (firstError) {
		showToast(firstError);
	}
}

function applyBossCellChange(
	nextCells: ClanScheduleCell[],
	nextOrder: string[],
	change: BossCellChange,
): { ok: boolean; changed: boolean; message?: string } {
	const index = nextCells.findIndex((cell) => (
		cell.phase === change.phase
		&& cell.round === change.round
		&& cell.boss === change.boss
	));
	const current = index >= 0 ? nextCells[index] : null;
	const newName = trimName(change.player);

	if (newName === '') {
		if (!current) return { ok: true, changed: false };

		const oldPlayer = current.player;
		nextCells.splice(index, 1);
		removePlayerIfEmptyInPlace(nextOrder, nextCells, oldPlayer);
		return { ok: true, changed: true };
	}

	if (!isValidName(newName)) {
		return {
			ok: false,
			changed: false,
			message: '玩家名称最多32个字符，且不能包含换行或控制字符',
		};
	}

	if (current && current.player === newName) {
		return { ok: true, changed: false };
	}

	const names = distinctPlayers(nextCells);
	const targetExists = names.includes(newName);
	const targetCells = nextCells.filter((cell) => cell.player === newName);
	const oldPlayer = current?.player ?? '';
	const oldCount = oldPlayer ? countCellsForPlayer(nextCells, oldPlayer) : 0;
	const oldDisappears = !!oldPlayer && oldCount === 1;

	if (targetExists && targetCells.length >= MAX_PLAYER_CELLS) {
		return {
			ok: false,
			changed: false,
			message: `玩家“${newName}”已有 ${MAX_PLAYER_CELLS} 次出刀，无法再加入`,
		};
	}

	if (
		change.phase === 'D'
		&& targetCells.filter((cell) => cell.phase === 'D').length
			>= MAX_D_PLAYER_CELLS
	) {
		return {
			ok: false,
			changed: false,
			message: `玩家“${newName}”在D阶段最多只能安排 ${MAX_D_PLAYER_CELLS} 次出刀`,
		};
	}

	if (!targetExists) {
		const resultingCount = names.length + (oldDisappears ? 0 : 1);
		if (resultingCount > MAX_PLAYERS) {
			return {
				ok: false,
				changed: false,
				message: `最多只能添加 ${MAX_PLAYERS} 名不同玩家`,
			};
		}
	}

	let slot: number | null;

	if (targetExists) {
		slot = firstAvailableSlot(nextCells, newName);
		if (slot === null) {
			return {
				ok: false,
				changed: false,
				message: `玩家“${newName}”没有可用的出刀槽位（返还刀需要对应的基础刀为B或C阶段）`,
			};
		}
	} else {
		slot = firstAvailableSlot(nextCells, newName) ?? 0;
	}

	if (current) {
		nextCells[index] = {
			...current,
			player: newName,
			slot,
		};
	} else {
		nextCells.push({
			phase: change.phase,
			round: change.round,
			boss: change.boss,
			player: newName,
			slot,
		});
	}

	if (!targetExists && !nextOrder.includes(newName)) {
		nextOrder.push(newName);
	}

	if (oldDisappears) {
		removePlayerIfEmptyInPlace(nextOrder, nextCells, oldPlayer);
	}

	return { ok: true, changed: true };
}

function handleRenamePlayers(changes: PlayerRename[]): void {
	if (!changes.length) return;

	let nextCells = cells.value.map((cell) => ({ ...cell }));
	let nextOrder = playerOrder.value.slice();
	let changed = false;
	let firstError = '';

	changes.forEach((change) => {
		const oldName = trimName(change.oldPlayer);
		const newName = trimName(change.newPlayer);

		if (oldName === newName) return;

		if (newName === '') {
			const before = nextCells.length;
			nextCells = nextCells.filter((cell) => cell.player !== oldName);
			removeNameInPlace(nextOrder, oldName);
			changed = changed || nextCells.length !== before;
			return;
		}

		if (!isValidName(newName)) {
			if (!firstError) {
				firstError = '玩家名称最多32个字符，且不能包含换行或控制字符';
			}
			return;
		}

		if (distinctPlayers(nextCells).includes(newName)) {
			if (!firstError) {
				firstError = `玩家名称“${newName}”已存在`;
			}
			return;
		}

		let renamed = false;
		nextCells.forEach((cell) => {
			if (cell.player === oldName) {
				cell.player = newName;
				renamed = true;
			}
		});

		if (renamed) {
			nextOrder = replacePlayerInOrder(nextOrder, oldName, newName);
			changed = true;
		}
	});

	if (changed) {
		const sorted = sortCells(nextCells);
		cells.value = sorted;
		playerOrder.value = normalizePlayerOrder(sorted, nextOrder);
		markDirty();
	}

	if (firstError) {
		showToast(firstError);
	}
}

function handleBossChange(change: BossChange): void {
	if (clearInProgress.value) return;

	let nextCells = cells.value.map((cell) => ({ ...cell }));
	const nextOrder = playerOrder.value.slice();
	const commitNextCells = (forceChanged: boolean): void => {
		const sanitized = sanitizeReturnCells(nextCells);
		if (!forceChanged && sanitized.length === nextCells.length) return;

		nextCells = sanitized;
		cells.value = sortCells(nextCells);
		playerOrder.value = normalizePlayerOrder(cells.value, nextOrder);
		markDirty();
	};

	if (change.slot >= 3) {
		const base = nextCells.find((cell) => (
			cell.player === change.player && cell.slot === change.slot - 3
		));

		if (!base || base.phase === 'D') {
			showToast('只有对应的基础刀为B或C阶段时才能填写返还刀');
			return;
		}
	}

	if (change.label === '空白') {
		const index = nextCells.findIndex((cell) => (
			cell.player === change.player && cell.slot === change.slot
		));
		if (index < 0) return;

		nextCells.splice(index, 1);
		removePlayerIfEmptyInPlace(nextOrder, nextCells, change.player);
		commitNextCells(true);
		return;
	}

	const parsed = parseBossLabel(change.label);
	if (!parsed) return;

	let returnRemoved = false;

	if (parsed.phase === 'D' && change.slot < 3) {
		const returnIndex = nextCells.findIndex((cell) => (
			cell.player === change.player && cell.slot === change.slot + 3
		));

		if (returnIndex >= 0) {
			nextCells.splice(returnIndex, 1);
			returnRemoved = true;
		}
	}

	const index = nextCells.findIndex((cell) => (
		cell.player === change.player && cell.slot === change.slot
	));
	const current = index >= 0 ? nextCells[index] : null;

	if (
		current
		&& current.phase === parsed.phase
		&& current.boss === parsed.boss
	) {
		commitNextCells(returnRemoved);
		return;
	}

	if (parsed.phase === 'D') {
		const dCount = nextCells.filter((cell) => (
			cell.player === change.player
			&& cell.phase === 'D'
			&& cell.slot !== change.slot
		)).length;

		if (dCount >= MAX_D_PLAYER_CELLS) {
			showToast(`D阶段最多只能安排 ${MAX_D_PLAYER_CELLS} 次出刀`);
			return;
		}
	}

	const position = findBossPosition(
		nextCells,
		change.player,
		change.slot,
		parsed.phase,
		parsed.boss,
	);

	if (!position) {
		showToast(
			parsed.phase === 'D'
				? 'D阶段周目已达上限，无法再安排该Boss'
				: `${parsed.phase}阶段 ${change.label} 已没有可用格子`,
		);
		return;
	}

	if (current) {
		nextCells[index] = {
			...current,
			phase: position.phase,
			round: position.round,
			boss: position.boss,
		};
	} else {
		nextCells.push({
			phase: position.phase,
			round: position.round,
			boss: position.boss,
			player: change.player,
			slot: change.slot,
		});
		if (!nextOrder.includes(change.player)) {
			nextOrder.push(change.player);
		}
	}

	commitNextCells(true);
}

function handleCreatePlayer(payload: NewPlayerPayload): void {
	if (clearInProgress.value) return;

	const player = trimName(payload.player);

	if (!isValidName(player)) {
		showToast('玩家名称最多32个字符，且不能包含换行或控制字符');
		return;
	}

	if (distinctPlayers(cells.value).includes(player)) {
		showToast(`玩家名称“${player}”已存在`);
		return;
	}

	if (players.value.length >= MAX_PLAYERS) {
		showToast(`最多只能添加 ${MAX_PLAYERS} 名不同玩家`);
		return;
	}

	const result = placePlayerSlots(cells.value, player, payload.slots);
	if (result.error || !result.cells) {
		showToast(result.error || '无法添加该玩家');
		return;
	}

	const nextOrder = insertPlayerAt(playerOrder.value, player, payload.index);
	cells.value = result.cells;
	playerOrder.value = normalizePlayerOrder(result.cells, nextOrder);
	markDirty();
	showToast(`已添加玩家“${player}”`);
}

function handleReorder(order: string[]): void {
	if (clearInProgress.value) return;
	playerOrder.value = normalizePlayerOrder(cells.value, order);
	markDirty();
}

function removeNameInPlace(order: string[], name: string): void {
	const index = order.indexOf(name);
	if (index >= 0) {
		order.splice(index, 1);
	}
}

function removePlayerIfEmptyInPlace(
	order: string[],
	nextCells: ClanScheduleCell[],
	player: string,
): void {
	if (!player) return;
	if (!nextCells.some((cell) => cell.player === player)) {
		removeNameInPlace(order, player);
	}
}

function confirmClear(): void {
	if (clearInProgress.value || switching.value) return;
	if (!canClearCurrent.value) {
		showToast('只有创建者可以清空共享排刀表');
		return;
	}
	if (!cells.value.length) {
		showToast('当前排刀表已经是空的');
		return;
	}

	uni.showModal({
		title: '清空共享排刀表',
		content: '确认清空整张排刀表吗？表格1和表格2的所有玩家与出刀记录都会被删除，且无法撤销。',
		confirmText: '确认清空',
		confirmColor: '#e45c68',
		cancelText: '取消',
		success: (result) => {
			if (result.confirm) {
				void performClear();
			}
		},
	});
}

async function performClear(): Promise<void> {
	if (clearInProgress.value) return;
	if (!canClearCurrent.value) {
		showToast('只有创建者可以清空共享排刀表');
		return;
	}

	clearInProgress.value = true;
	operationEpoch += 1;
	cancelSaveTimer();
	flushDrafts();
	dirty = false;
	editVersion += 1;

	if (activeSavePromise) {
		try {
			await activeSavePromise;
		} catch {
			// The clear operation will surface its own error if it fails.
		}
	}

	while (saving.value) {
		await delay(30);
	}

	dirty = false;
	saveStatus.value = 'saving';
	saveError.value = '';

	try {
		const summary = currentSchedule.value;
		if (summary?.role === 'member' && summary.id !== null) {
			await clearSharedClanSchedule(summary.id);
		} else {
			await clearClanSchedule();
		}
		cells.value = [];
		playerOrder.value = [];
		addedRounds.value = { B: [], C: [], D: [] };
		playerTableRef.value?.resetNewPlayerDraft?.();
		dirty = false;
		saveStatus.value = 'idle';
		saveError.value = '';
		loadError.value = '';
		uni.showToast({ title: '排刀表已清空', icon: 'success' });
	} catch (error) {
		dirty = true;
		saveStatus.value = 'error';
		saveError.value = errorMessage(error, '清空失败，请稍后重试');
		showToast(saveError.value);
	} finally {
		clearInProgress.value = false;
	}
}

async function exportCurrent(): Promise<void> {
	if (
		exporting.value
		|| loading.value
		|| clearInProgress.value
		|| switching.value
	) return;

	flushDrafts();
	await nextTick();

	if (activeView.value === 'boss' && !cells.value.length) {
		showToast('暂无排刀数据可生成图片');
		return;
	}
	if (activeView.value === 'player' && !playerRows.value.length) {
		showToast('暂无玩家数据可生成图片');
		return;
	}

	exporting.value = true;

	try {
		if (!exportRef.value?.exportImage) {
			throw new Error('图片导出组件尚未就绪');
		}
		await exportRef.value.exportImage();
		uni.showToast({ title: '图片已生成并开始下载', icon: 'success' });
	} catch (error) {
		showToast(errorMessage(error, '生成图片失败，请稍后重试'));
	} finally {
		exporting.value = false;
	}
}

function showToast(title: string): void {
	uni.showToast({
		title,
		icon: 'none',
		duration: 2600,
	});
}

function goLogin(): void {
	navigateTo(routes.login);
}

function goRegister(): void {
	navigateTo(routes.register);
}

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}
</script>

<style scoped>
.schedule-page {
	width: 100%;
	max-width: 1440px;
	margin: 0 auto;
}

.schedule-hero {
	position: relative;
	padding: 22px 24px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 24px;
	border: 1px solid rgba(52, 154, 219, 0.26);
	border-radius: 11px;
	background:
		radial-gradient(circle at 88% 0%, rgba(24, 132, 212, 0.22), transparent 42%),
		linear-gradient(115deg, var(--bg-panel), var(--bg-panel-alt));
	box-shadow: inset 0 1px rgba(255, 255, 255, 0.04);
	overflow: hidden;
}

.schedule-hero::after {
	position: absolute;
	top: -60px;
	right: 18%;
	width: 190px;
	height: 190px;
	border: 1px solid rgba(68, 181, 245, 0.14);
	border-radius: 50%;
	content: '';
	pointer-events: none;
}

.hero-copy {
	position: relative;
	z-index: 1;
	min-width: 0;
}

.hero-eyebrow {
	color: var(--accent-text);
	font-size: 10px;
	font-weight: 700;
	letter-spacing: 0.2em;
}

.hero-title {
	margin-top: 6px;
	color: var(--text-primary);
	font-size: 27px;
	font-weight: 800;
	letter-spacing: 0.04em;
}

.hero-description {
	max-width: 720px;
	margin-top: 7px;
	color: var(--text-muted);
	font-size: 12px;
	line-height: 1.6;
}

.hero-stats {
	position: relative;
	z-index: 1;
	display: flex;
	gap: 10px;
}

.hero-stat {
	min-width: 112px;
	padding: 12px 14px;
	display: flex;
	flex-direction: column;
	gap: 3px;
	border: 1px solid var(--border-subtle);
	border-radius: 8px;
	background: rgba(0, 13, 29, 0.32);
}

.hero-stat-value {
	color: #b8e9ff;
	font-size: 24px;
	font-weight: 800;
	line-height: 1;
}

.hero-stat-label {
	color: var(--text-faint);
	font-size: 10px;
	white-space: nowrap;
}

.schedule-guest-gate {
	min-height: 320px;
	margin-top: 12px;
	padding: 40px 24px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	border: 1px solid var(--border-default);
	border-radius: 10px;
	background:
		radial-gradient(ellipse at center, var(--accent-soft), transparent 68%),
		var(--bg-panel-soft);
	text-align: center;
}

.schedule-guest-icon {
	width: 48px;
	height: 48px;
	margin-bottom: 12px;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1px solid rgba(69, 181, 255, 0.55);
	border-radius: 50%;
	background: linear-gradient(145deg, #147bd1, #084079);
	color: #fff;
	font-size: 22px;
}

.schedule-guest-title {
	color: var(--text-primary);
	font-size: 16px;
	font-weight: 700;
}

.schedule-guest-description {
	max-width: 520px;
	margin-top: 8px;
	color: var(--text-muted);
	font-size: 13px;
	line-height: 1.7;
}

.schedule-guest-actions {
	margin-top: 22px;
	display: flex;
	gap: 10px;
}

.schedule-guest-button {
	min-width: 112px;
	padding: 10px 18px;
	border: 1px solid rgba(44, 155, 211, 0.42);
	border-radius: 6px;
	color: var(--text-secondary);
	font-size: 13px;
	text-align: center;
	cursor: pointer;
}

.schedule-guest-button.primary {
	border-color: #147fe0;
	background: linear-gradient(180deg, #168cff, #0865bf);
	color: #fff;
}

.schedule-toolbar {
	margin-top: 12px;
	padding: 10px 12px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	border: 1px solid var(--border-default);
	border-radius: 9px;
	background: var(--bg-panel-soft);
	box-shadow: inset 0 1px rgba(255, 255, 255, 0.03);
}

.view-tabs {
	min-width: 0;
	padding: 3px;
	display: flex;
	gap: 3px;
	border: 1px solid var(--border-subtle);
	border-radius: 7px;
	background: rgba(0, 13, 29, 0.28);
}

.view-tab {
	min-height: 36px;
	padding: 0 14px;
	display: flex;
	align-items: center;
	gap: 7px;
	border-radius: 5px;
	color: var(--text-muted);
	font-size: 12px;
	font-weight: 700;
	white-space: nowrap;
	cursor: pointer;
	transition: background 0.16s ease, color 0.16s ease, box-shadow 0.16s ease;
}

.view-tab-index {
	color: var(--text-faint);
	font-size: 9px;
	letter-spacing: 0.06em;
}

.view-tab.active {
	background: linear-gradient(180deg, rgba(22, 140, 255, 0.38), rgba(8, 84, 158, 0.26));
	color: #dff4ff;
	box-shadow: inset 0 0 0 1px rgba(83, 190, 255, 0.42), 0 0 14px rgba(24, 132, 212, 0.14);
}

.view-tab.active .view-tab-index {
	color: #7ed4ff;
}

.toolbar-actions {
	min-width: 0;
	display: flex;
	align-items: center;
	justify-content: flex-end;
	flex-wrap: wrap;
	gap: 8px;
}

.layout-toggle {
	padding: 3px;
	display: flex;
	gap: 2px;
	border: 1px solid var(--border-subtle);
	border-radius: 6px;
	background: rgba(0, 13, 29, 0.28);
}

.layout-option {
	min-height: 29px;
	padding: 0 9px;
	display: flex;
	align-items: center;
	border-radius: 4px;
	color: var(--text-muted);
	font-size: 11px;
	cursor: pointer;
}

.layout-option.active {
	background: var(--bg-selected);
	color: var(--accent-text);
	box-shadow: inset 0 0 0 1px rgba(61, 166, 236, 0.34);
}

.save-state {
	min-height: 31px;
	padding: 0 10px;
	display: flex;
	align-items: center;
	gap: 6px;
	border: 1px solid var(--border-subtle);
	border-radius: 999px;
	background: rgba(0, 13, 29, 0.26);
	color: var(--text-muted);
	font-size: 10px;
	white-space: nowrap;
}

.save-dot {
	width: 7px;
	height: 7px;
	border-radius: 50%;
	background: var(--text-faint);
}

.save-saving .save-dot {
	background: #58c5ff;
	box-shadow: 0 0 8px #58c5ff;
	animation: save-pulse 1s ease-in-out infinite;
}

.save-saved {
	color: var(--success);
	border-color: rgba(79, 208, 138, 0.32);
}

.save-saved .save-dot {
	background: var(--success);
	box-shadow: 0 0 7px rgba(79, 208, 138, 0.7);
}

.save-error {
	color: var(--danger);
	border-color: rgba(240, 106, 115, 0.42);
	background: var(--danger-soft);
}

.save-error .save-dot {
	background: var(--danger);
	box-shadow: 0 0 7px rgba(240, 106, 115, 0.7);
}

.save-retry {
	margin-left: 2px;
	padding: 1px 6px;
	border-radius: 999px;
	background: rgba(240, 106, 115, 0.18);
	color: #ffd9dc;
	cursor: pointer;
}

@keyframes save-pulse {
	0%, 100% { opacity: 1; transform: scale(1); }
	50% { opacity: 0.45; transform: scale(0.82); }
}

.tool-button {
	min-height: 33px;
	padding: 0 12px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 6px;
	font-size: 11px;
	font-weight: 700;
	white-space: nowrap;
	cursor: pointer;
	transition: filter 0.16s ease, transform 0.16s ease, opacity 0.16s ease;
}

.tool-button:not(.disabled):hover {
	filter: brightness(1.08);
	transform: translateY(-1px);
}

.tool-button:not(.disabled):active {
	transform: translateY(0);
	filter: brightness(0.96);
}

.tool-button.disabled {
	opacity: 0.42;
	cursor: not-allowed;
}

.export-button {
	border: 1px solid #48c8b2;
	background: linear-gradient(180deg, #2fc4a8, #117b69);
	box-shadow: 0 5px 16px rgba(20, 151, 127, 0.18), inset 0 1px rgba(255, 255, 255, 0.22);
	color: #f1fffb;
}

.clear-button {
	border: 1px solid rgba(228, 92, 104, 0.62);
	background: linear-gradient(180deg, rgba(203, 73, 86, 0.86), rgba(132, 38, 52, 0.88));
	box-shadow: 0 5px 16px rgba(160, 42, 55, 0.18), inset 0 1px rgba(255, 255, 255, 0.14);
	color: #ffecef;
}

.save-error-banner,
.load-error-banner {
	margin-top: 10px;
	padding: 10px 12px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	border-radius: 7px;
	font-size: 11px;
}

.save-error-banner {
	border: 1px solid rgba(240, 106, 115, 0.4);
	background: var(--danger-soft);
	color: #ffd6d9;
}

.load-error-banner {
	border: 1px solid rgba(255, 209, 102, 0.36);
	background: rgba(173, 122, 26, 0.14);
	color: #f0c96c;
}

.save-error-copy {
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 3px;
}

.save-error-title {
	font-weight: 700;
}

.save-error-message {
	overflow: hidden;
	color: rgba(255, 214, 217, 0.72);
	font-size: 10px;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.banner-retry {
	min-height: 28px;
	padding: 0 10px;
	display: flex;
	align-items: center;
	border: 1px solid currentColor;
	border-radius: 5px;
	font-size: 10px;
	font-weight: 700;
	white-space: nowrap;
	cursor: pointer;
}

.schedule-content {
	margin-top: 12px;
	min-height: 280px;
}

.schedule-state {
	min-height: 320px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 13px;
	border: 1px dashed var(--border-default);
	border-radius: 9px;
	color: var(--text-muted);
	font-size: 12px;
}

.loading-spinner {
	width: 28px;
	height: 28px;
	border: 2px solid rgba(87, 166, 224, 0.22);
	border-top-color: #45aef2;
	border-radius: 50%;
	animation: schedule-spin 0.8s linear infinite;
}

@keyframes schedule-spin {
	to { transform: rotate(360deg); }
}

.schedule-footnote {
	margin-top: 12px;
	padding: 10px 12px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	border-top: 1px solid var(--border-subtle);
	color: var(--text-faint);
	font-size: 10px;
}

@media screen and (max-width: 1200px) {
	.schedule-hero {
		padding: 18px 18px;
	}

	.schedule-toolbar {
		gap: 10px;
	}

	.view-tab {
		padding: 0 10px;
	}

	.toolbar-actions {
		gap: 6px;
	}

	.layout-option {
		padding: 0 7px;
	}

	.save-state {
		padding: 0 8px;
	}

	.tool-button {
		padding: 0 10px;
	}
}

@media screen and (max-width: 1000px) {
	.hero-title {
		font-size: 24px;
	}

	.hero-stat {
		min-width: 96px;
		padding: 10px 11px;
	}

	.hero-stat-value {
		font-size: 21px;
	}

	.schedule-footnote {
		align-items: flex-start;
		flex-direction: column;
		gap: 4px;
	}
}

@media screen and (max-width: 700px) {
	.schedule-hero {
		padding: 15px 13px;
		align-items: flex-start;
		flex-direction: column;
		gap: 13px;
		border-radius: 8px;
	}

	.hero-eyebrow {
		font-size: 8px;
	}

	.hero-title {
		font-size: 22px;
	}

	.hero-description {
		font-size: 11px;
	}

	.hero-stats {
		width: 100%;
	}

	.hero-stat {
		min-width: 0;
		flex: 1;
		padding: 9px 10px;
	}

	.hero-stat-value {
		font-size: 19px;
	}

	.schedule-toolbar {
		margin-top: 8px;
		padding: 7px;
		gap: 7px;
		align-items: stretch;
		flex-direction: column;
		border-radius: 7px;
	}

	.view-tabs {
		width: 100%;
	}

	.view-tab {
		min-width: 0;
		min-height: 34px;
		padding: 0 8px;
		flex: 1;
		justify-content: center;
		font-size: 11px;
	}

	.view-tab-index {
		display: none;
	}

	.toolbar-actions {
		width: 100%;
		gap: 5px;
		justify-content: flex-start;
	}

	.save-state {
		min-width: 0;
		min-height: 32px;
		padding: 0 8px;
		flex: 1 1 auto;
	}

	.tool-button {
		min-height: 32px;
		padding: 0 9px;
		flex: 0 0 auto;
		font-size: 10px;
	}

	.schedule-content {
		margin-top: 8px;
	}

	.schedule-state {
		min-height: 240px;
	}

	.save-error-banner,
	.load-error-banner {
		margin-top: 7px;
		padding: 8px 9px;
	}

	.save-error-message {
		white-space: normal;
		word-break: break-all;
	}
}
</style>
