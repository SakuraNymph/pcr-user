<template>
	<view
		class="player-table-root"
		:class="[
			`layout-${layout}`,
			{
				'is-dragging': dragging,
				'is-disabled': disabled,
			},
		]"
		@touchmove="handleTouchMove"
		@touchend="handleDragEnd"
		@touchcancel="handleDragEnd"
	>
		<view :id="scrollId" class="player-table-scroll">
			<view class="player-grid" :class="`grid-${layout}`">
				<view class="ptable-head">
					<view class="head-cell seq-head">
						<text class="head-drag">⠿</text>
						<text>序号</text>
					</view>
					<view class="head-cell name-head">玩家名称</view>
					<template v-if="layout === 'horizontal'">
						<view
							v-for="header in HORIZONTAL_HEADERS"
							:key="header"
							class="head-cell boss-head-cell"
						>{{ header }}</view>
					</template>
					<template v-else>
						<view
							v-for="header in VERTICAL_HEADERS"
							:key="header"
							class="head-cell boss-head-cell"
						>{{ header }}</view>
					</template>
				</view>

				<template v-if="layout === 'horizontal'">
					<view
						v-for="item in tableSlots"
						:key="item.key"
						class="h-row"
						:class="[
							item.editable ? 'new-player-row' : '',
							!item.row && !item.editable ? 'placeholder-row selectable-placeholder' : '',
							item.row && dragging && dragIndex === item.rowIndex ? 'drag-row' : '',
						]"
						:title="!item.row && !item.editable ? '在此序号插入玩家' : undefined"
						@click="handleRowClick(item)"
					>
						<template v-if="item.editable">
							<view class="seq-cell">
								<text class="new-row-plus">＋</text>
								<text class="seq-number">{{ item.seq }}</text>
							</view>
							<view class="name-cell">
								<input
									class="player-name-input new-player-name-input"
									type="text"
									:value="newPlayerName"
									:focus="newRowFocus"
									:disabled="disabled || creating"
									maxlength="32"
									placeholder="输入新玩家"
									placeholder-class="player-name-placeholder"
									@input="handleNewNameInput"
									@focus="newRowFocus = true"
									@blur="handleNewNameBlur"
									@confirm="commitNewPlayerName"
								/>
							</view>
							<view
								v-for="slot in HORIZONTAL_SLOT_ORDER"
								:key="`new-${slot}`"
								class="boss-cell"
							>
								<picker
									mode="selector"
									:range="BOSS_OPTIONS"
									:value="newBossIndex(slot)"
									:disabled="disabled || creating || newReturnLocked(slot)"
									@change="handleNewBossChange(slot, $event)"
								>
									<view
										class="boss-select"
										:class="{
											empty: !newSlots[slot],
											locked: newReturnLocked(slot),
										}"
										:style="newBossCellStyle(slot)"
									>{{ newReturnLocked(slot) ? '—' : newBossText(slot) }}</view>
								</picker>
							</view>
						</template>
						<template v-else-if="item.row">
							<view class="seq-cell">
								<view
									class="drag-handle"
									title="拖动排序"
									@mousedown.stop.prevent="handleDragStart(item.rowIndex, $event)"
									@touchstart.stop.prevent="handleDragStart(item.rowIndex, $event)"
								>⠿</view>
								<text
									class="seq-number clickable-seq"
									title="点击序号在此处插入玩家"
									@click.stop="selectNewRow(item.seq)"
								>{{ item.seq }}</text>
							</view>
							<view
								class="name-cell"
							>
								<input
									class="player-name-input"
									type="text"
									:value="nameDraft(item.row.player)"
									:disabled="disabled || dragging"
									maxlength="32"
									placeholder="玩家名称"
									placeholder-class="player-name-placeholder"
									@input="handleNameInput(item.row.player, $event)"
									@focus="focusedPlayer = item.row.player"
									@blur="commitName(item.row.player)"
									@confirm="commitName(item.row.player)"
								/>
							</view>
							<view
								v-for="slot in HORIZONTAL_SLOT_ORDER"
								:key="`${item.row.player}-${slot}`"
								class="boss-cell"
							>
								<picker
									mode="selector"
									:range="BOSS_OPTIONS"
									:value="bossIndex(item.row, slot)"
									:disabled="disabled || dragging || isReturnLocked(item.row, slot)"
									@change="handleBossChange(item.row, slot, $event)"
								>
									<view
										class="boss-select"
										:class="{
											empty: !item.row.slots[slot],
											locked: isReturnLocked(item.row, slot),
										}"
										:style="bossCellStyle(item.row, slot)"
									>{{ isReturnLocked(item.row, slot) ? '—' : bossText(item.row, slot) }}</view>
								</picker>
							</view>
						</template>
						<template v-else>
							<view class="seq-cell">
								<text class="seq-number">{{ item.seq }}</text>
							</view>
							<view class="name-cell placeholder-cell">—</view>
							<view
								v-for="slot in HORIZONTAL_SLOT_ORDER"
								:key="`${item.key}-${slot}`"
								class="boss-cell"
							>
								<view class="boss-select empty placeholder-boss">—</view>
							</view>
						</template>
					</view>
				</template>

				<template v-else>
					<view
						v-for="item in tableSlots"
						:key="item.key"
						class="v-group"
						:class="[
							item.editable ? 'new-player-row' : '',
							!item.row && !item.editable ? 'placeholder-row selectable-placeholder' : '',
							item.row && dragging && dragIndex === item.rowIndex ? 'drag-row' : '',
						]"
						:title="!item.row && !item.editable ? '在此序号插入玩家' : undefined"
						@click="handleRowClick(item)"
					>
						<template v-if="item.editable">
							<view class="seq-cell merged-cell">
								<text class="new-row-plus">＋</text>
								<text class="seq-number">{{ item.seq }}</text>
							</view>
							<view class="name-cell merged-cell">
								<input
									class="player-name-input new-player-name-input"
									type="text"
									:value="newPlayerName"
									:focus="newRowFocus"
									:disabled="disabled || creating"
									maxlength="32"
									placeholder="输入新玩家"
									placeholder-class="player-name-placeholder"
									@input="handleNewNameInput"
									@focus="newRowFocus = true"
									@blur="handleNewNameBlur"
									@confirm="commitNewPlayerName"
								/>
							</view>
							<view
								v-for="slot in VERTICAL_BASE_SLOTS"
								:key="`new-base-${slot}`"
								class="boss-cell base-cell"
							>
								<picker
									mode="selector"
									:range="BOSS_OPTIONS"
									:value="newBossIndex(slot)"
									:disabled="disabled || creating"
									@change="handleNewBossChange(slot, $event)"
								>
									<view
										class="boss-select"
										:class="{ empty: !newSlots[slot] }"
										:style="newBossCellStyle(slot)"
									>{{ newBossText(slot) }}</view>
								</picker>
							</view>
							<view
								v-for="slot in VERTICAL_RETURN_SLOTS"
								:key="`new-return-${slot}`"
								class="boss-cell return-cell"
							>
								<text class="return-tag">返还</text>
								<picker
									mode="selector"
									:range="BOSS_OPTIONS"
									:value="newBossIndex(slot)"
									:disabled="disabled || creating || newReturnLocked(slot)"
									@change="handleNewBossChange(slot, $event)"
								>
									<view
										class="boss-select"
										:class="{
											empty: !newSlots[slot],
											locked: newReturnLocked(slot),
										}"
										:style="newBossCellStyle(slot)"
									>{{ newReturnLocked(slot) ? '—' : newBossText(slot) }}</view>
								</picker>
							</view>
						</template>
						<template v-else-if="item.row">
							<view class="seq-cell merged-cell">
								<view
									class="drag-handle"
									title="拖动排序"
									@mousedown.stop.prevent="handleDragStart(item.rowIndex, $event)"
									@touchstart.stop.prevent="handleDragStart(item.rowIndex, $event)"
								>⠿</view>
								<text
									class="seq-number clickable-seq"
									title="点击序号在此处插入玩家"
									@click.stop="selectNewRow(item.seq)"
								>{{ item.seq }}</text>
							</view>
							<view
								class="name-cell merged-cell"
							>
								<input
									class="player-name-input"
									type="text"
									:value="nameDraft(item.row.player)"
									:disabled="disabled || dragging"
									maxlength="32"
									placeholder="玩家名称"
									placeholder-class="player-name-placeholder"
									@input="handleNameInput(item.row.player, $event)"
									@focus="focusedPlayer = item.row.player"
									@blur="commitName(item.row.player)"
									@confirm="commitName(item.row.player)"
								/>
							</view>
							<view
								v-for="slot in VERTICAL_BASE_SLOTS"
								:key="`base-${item.row.player}-${slot}`"
								class="boss-cell base-cell"
							>
								<picker
									mode="selector"
									:range="BOSS_OPTIONS"
									:value="bossIndex(item.row, slot)"
									:disabled="disabled || dragging"
									@change="handleBossChange(item.row, slot, $event)"
								>
									<view
										class="boss-select"
										:class="{ empty: !item.row.slots[slot] }"
										:style="bossCellStyle(item.row, slot)"
									>{{ bossText(item.row, slot) }}</view>
								</picker>
							</view>
							<view
								v-for="slot in VERTICAL_RETURN_SLOTS"
								:key="`return-${item.row.player}-${slot}`"
								class="boss-cell return-cell"
							>
								<text class="return-tag">返还</text>
								<picker
									mode="selector"
									:range="BOSS_OPTIONS"
									:value="bossIndex(item.row, slot)"
									:disabled="disabled || dragging || isReturnLocked(item.row, slot)"
									@change="handleBossChange(item.row, slot, $event)"
								>
									<view
										class="boss-select"
										:class="{
											empty: !item.row.slots[slot],
											locked: isReturnLocked(item.row, slot),
										}"
										:style="bossCellStyle(item.row, slot)"
									>{{ isReturnLocked(item.row, slot) ? '—' : bossText(item.row, slot) }}</view>
								</picker>
							</view>
						</template>
						<template v-else>
							<view class="seq-cell merged-cell">
								<text class="seq-number">{{ item.seq }}</text>
							</view>
							<view class="name-cell merged-cell placeholder-cell">—</view>
							<view
								v-for="slot in VERTICAL_BASE_SLOTS"
								:key="`${item.key}-base-${slot}`"
								class="boss-cell base-cell"
							>
								<view class="boss-select empty placeholder-boss">—</view>
							</view>
							<view
								v-for="slot in VERTICAL_RETURN_SLOTS"
								:key="`${item.key}-return-${slot}`"
								class="boss-cell return-cell"
							>
								<text class="return-tag">返还</text>
								<view class="boss-select empty placeholder-boss">—</view>
							</view>
						</template>
					</view>
				</template>
			</view>
		</view>

		<view class="player-table-actions">
			<view
				v-if="!showNewRow && rows.length < maxRowCount"
				class="add-player-button"
				@click="startAddRow"
			>
				<text class="add-player-plus">＋</text>
				<text>添加一行</text>
			</view>
			<view
				v-else-if="showNewRow"
				class="cancel-player-button"
				@mousedown="suppressNewRowCommit = true"
				@touchstart="suppressNewRowCommit = true"
				@click="cancelAddRow"
			>取消添加</view>
			<text class="player-row-limit">
				已添加 {{ rows.length }} / {{ maxRowCount }} 名玩家
			</text>
		</view>

		<view v-if="newPlayerHint" class="new-player-hint">{{ newPlayerHint }}</view>
	</view>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import type { ClanSchedulePhase } from '../api/types';
import type {
	ClanSchedulePlayerRow,
	NewPlayerSlot,
} from '../utils/clanSchedule';
import {
	BOSS_COLORS,
	BOSS_OPTIONS,
	HORIZONTAL_HEADERS,
	HORIZONTAL_SLOT_ORDER,
	MAX_PLAYERS,
	VERTICAL_BASE_SLOTS,
	VERTICAL_HEADERS,
	VERTICAL_RETURN_SLOTS,
	parseBossLabel,
	trimName,
} from '../utils/clanSchedule';

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

const props = defineProps<{
	rows: ClanSchedulePlayerRow[];
	layout: 'horizontal' | 'vertical';
	disabled?: boolean;
	maxRows?: number;
}>();

const emit = defineEmits<{
	(event: 'rename-players', changes: PlayerRename[]): void;
	(event: 'change-boss', change: BossChange): void;
	(event: 'reorder', order: string[]): void;
	(event: 'create-player', payload: NewPlayerPayload): void;
}>();

const scrollId = `clan-player-table-${Math.random().toString(36).slice(2, 10)}`;
const HORIZONTAL_ROW_HEIGHT = 46;
const VERTICAL_GROUP_HEIGHT = 88;

const localOrder = ref<string[]>([]);
const nameDrafts = ref<Record<string, string>>({});
const focusedPlayer = ref('');
const newPlayerName = ref('');
const addingNewRow = ref(false);
const suppressNewRowCommit = ref(false);
const newSlots = ref<Array<{ phase: ClanSchedulePhase; boss: number } | null>>(
	Array.from({ length: 6 }, () => null),
);
const creating = ref(false);
const newRowIndex = ref(0);
const newRowFocus = ref(false);
const lastRowCount = ref(0);

const dragging = ref(false);
const dragIndex = ref(-1);
const dragFromIndex = ref(-1);
const dragStartY = ref(0);
const dragStartScrollTop = ref(0);
const dragStep = ref(HORIZONTAL_ROW_HEIGHT);
const dragOrder = ref<string[]>([]);
const dragMoved = ref(false);

const rowMap = computed(() => {
	const map = new Map<string, ClanSchedulePlayerRow>();
	props.rows.forEach((row) => {
		map.set(row.player, row);
	});
	return map;
});

const displayRows = computed<ClanSchedulePlayerRow[]>(() => (
	localOrder.value
		.map((player) => rowMap.value.get(player) ?? null)
		.filter((row): row is ClanSchedulePlayerRow => row !== null)
));

const maxRowCount = computed(() => props.maxRows ?? MAX_PLAYERS);

const showNewRow = computed(() => (
	addingNewRow.value && props.rows.length < maxRowCount.value
));

const activeNewRowIndex = computed(() => {
	if (!showNewRow.value) {
		return 0;
	}

	return Math.max(
		0,
		Math.min(newRowIndex.value, props.rows.length),
	);
});

const tableSlots = computed(() => {
	const rows = displayRows.value;
	const items: Array<{
		key: string;
		seq: number;
		row: ClanSchedulePlayerRow | null;
		rowIndex: number;
		editable: boolean;
	}> = [];
	let rowIndex = 0;
	const totalRows = rows.length + (showNewRow.value ? 1 : 0);

	for (let seq = 1; seq <= totalRows; seq += 1) {
		if (showNewRow.value && seq - 1 === activeNewRowIndex.value) {
			items.push({
				key: `new-${seq}`,
				seq,
				row: null,
				rowIndex: -1,
				editable: true,
			});
			continue;
		}

		const row = rows[rowIndex];
		items.push({
			key: `row-${row.player}`,
			seq,
			row,
			rowIndex,
			editable: false,
		});
		rowIndex += 1;
	}

	return items;
});

const hasNewSlots = computed(() => newSlots.value.some((slot) => slot !== null));

const newPlayerHint = computed(() => {
	if (!showNewRow.value) return '';

	const hasName = trimName(newPlayerName.value) !== '';
	if (hasName && !hasNewSlots.value) return '请选择至少一个Boss后保存该玩家';
	if (!hasName && hasNewSlots.value) return '请填写玩家名称';
	return '';
});

watch(
	() => props.rows,
	(rows) => {
		const names = rows.map((row) => row.player);
		const rowCountChanged = rows.length !== lastRowCount.value;
		lastRowCount.value = rows.length;

		if (!dragging.value) {
			localOrder.value = names;
		} else {
			const kept = localOrder.value.filter((name) => names.includes(name));
			names.forEach((name) => {
				if (!kept.includes(name)) kept.push(name);
			});
			localOrder.value = kept;
		}

		if (rowCountChanged) {
			newRowIndex.value = rows.length;
			newRowFocus.value = false;
		}

		if (rows.length >= maxRowCount.value) {
			resetNewPlayerDraft();
		}
	},
	{ deep: true, immediate: true },
);

watch(
	() => props.rows,
	(rows) => {
		const next: Record<string, string> = {};
		rows.forEach((row) => {
			next[row.player] = focusedPlayer.value === row.player
				? (nameDrafts.value[row.player] ?? row.player)
				: row.player;
		});
		nameDrafts.value = next;
	},
	{ deep: true, immediate: true },
);

onBeforeUnmount(() => {
	flushNameDrafts();
	removeMouseListeners();
});

function nameDraft(player: string): string {
	return nameDrafts.value[player] ?? player;
}

function bossIndex(row: ClanSchedulePlayerRow, slot: number): number {
	const cell = row.slots[slot];
	if (!cell) return BOSS_OPTIONS.length - 1;
	const index = BOSS_OPTIONS.indexOf(`${cell.phase}${cell.boss}`);
	return index >= 0 ? index : BOSS_OPTIONS.length - 1;
}

function bossText(row: ClanSchedulePlayerRow, slot: number): string {
	const cell = row.slots[slot];
	return cell ? `${cell.phase}${cell.boss}` : '空白';
}

function isReturnLocked(row: ClanSchedulePlayerRow, slot: number): boolean {
	if (slot < 3) return false;

	const base = row.slots[slot - 3];
	return !base || base.phase === 'D';
}

function bossCellStyle(
	row: ClanSchedulePlayerRow,
	slot: number,
): Record<string, string> {
	const cell = row.slots[slot];
	if (!cell) return {};
	return {
		backgroundColor: BOSS_COLORS[cell.boss - 1] ?? BOSS_COLORS[0],
		color: '#10253a',
	};
}

function newBossIndex(slot: number): number {
	const value = newSlots.value[slot];
	if (!value) return BOSS_OPTIONS.length - 1;
	const index = BOSS_OPTIONS.indexOf(`${value.phase}${value.boss}`);
	return index >= 0 ? index : BOSS_OPTIONS.length - 1;
}

function newBossText(slot: number): string {
	const value = newSlots.value[slot];
	return value ? `${value.phase}${value.boss}` : '空白';
}

function newReturnLocked(slot: number): boolean {
	if (slot < 3) return false;

	const base = newSlots.value[slot - 3];
	return !base || base.phase === 'D';
}

function newBossCellStyle(slot: number): Record<string, string> {
	const value = newSlots.value[slot];
	if (!value) return {};
	return {
		backgroundColor: BOSS_COLORS[value.boss - 1] ?? BOSS_COLORS[0],
		color: '#10253a',
	};
}

function resetNewPlayerDraft(): void {
	newPlayerName.value = '';
	newSlots.value = Array.from({ length: 6 }, () => null);
	newRowIndex.value = props.rows.length;
	newRowFocus.value = false;
	addingNewRow.value = false;
}

async function startAddRow(): Promise<void> {
	if (props.disabled || creating.value || props.rows.length >= maxRowCount.value) {
		return;
	}

	addingNewRow.value = true;
	newRowIndex.value = props.rows.length;
	newRowFocus.value = false;
	await nextTick();

	const scrollElement = getScrollElement();
	if (scrollElement) {
		scrollElement.scrollTop = scrollElement.scrollHeight;
	}

	newRowFocus.value = true;
}

function cancelAddRow(): void {
	if (creating.value) return;
	suppressNewRowCommit.value = false;
	resetNewPlayerDraft();
}

async function selectNewRow(seq: number): Promise<void> {
	if (
		props.disabled
		|| creating.value
		|| props.rows.length >= maxRowCount.value
	) {
		return;
	}

	addingNewRow.value = true;
	newRowIndex.value = Math.max(
		0,
		Math.min(seq - 1, props.rows.length),
	);
	newRowFocus.value = false;
	await nextTick();
	newRowFocus.value = true;
}

function handleRowClick(item: {
	row: ClanSchedulePlayerRow | null;
	editable: boolean;
	seq: number;
}): void {
	if (!item.row && !item.editable) {
		void selectNewRow(item.seq);
	}
}

function handleNewNameInput(
	event: { detail?: { value?: string | number } },
): void {
	if (creating.value) return;

	const value = String(event.detail?.value ?? '');
	newPlayerName.value = value;

	if (
		trimName(value) === ''
		&& newSlots.value.some((slot) => slot !== null)
	) {
		newSlots.value = Array.from({ length: 6 }, () => null);
	}
}

async function commitNewPlayerName(): Promise<void> {
	if (props.disabled || creating.value) return;
	await tryCreatePlayer();
}

function handleNewNameBlur(): void {
	newRowFocus.value = false;

	if (suppressNewRowCommit.value) {
		suppressNewRowCommit.value = false;
		return;
	}

	void commitNewPlayerName();
}

async function tryCreatePlayer(): Promise<void> {
	if (props.disabled || creating.value) return;

	const player = trimName(newPlayerName.value);
	if (!player) return;

	const slots: NewPlayerSlot[] = [];
	newSlots.value.forEach((value, slot) => {
		if (value) {
			slots.push({
				slot,
				phase: value.phase,
				boss: value.boss,
			});
		}
	});

	if (!slots.length) return;

	creating.value = true;
	emit('create-player', {
		player,
		slots,
		index: activeNewRowIndex.value,
	});
	await nextTick();
	creating.value = false;

	if (props.rows.some((row) => row.player === player)) {
		resetNewPlayerDraft();
	}
}

function handleNewBossChange(
	slot: number,
	event: { detail?: { value?: string | number } },
): void {
	if (props.disabled || creating.value) return;
	if (slot >= 3 && newReturnLocked(slot)) return;

	const index = Number(event.detail?.value ?? BOSS_OPTIONS.length - 1);
	const parsed = parseBossLabel(BOSS_OPTIONS[index] ?? '空白');
	const next = newSlots.value.slice();
	next[slot] = parsed
		? { phase: parsed.phase, boss: parsed.boss }
		: null;

	if (slot < 3 && (!next[slot] || next[slot]?.phase === 'D')) {
		next[slot + 3] = null;
	}

	newSlots.value = next;

	void tryCreatePlayer();
}

function handleBossChange(
	row: ClanSchedulePlayerRow,
	slot: number,
	event: { detail?: { value?: string | number } },
): void {
	if (props.disabled || dragging.value) return;
	if (slot >= 3 && isReturnLocked(row, slot)) return;

	const index = Number(event.detail?.value ?? BOSS_OPTIONS.length - 1);
	emit('change-boss', {
		player: row.player,
		slot,
		label: BOSS_OPTIONS[index] ?? '空白',
	});
}

function handleNameInput(
	player: string,
	event: { detail?: { value?: string | number } },
): void {
	nameDrafts.value = {
		...nameDrafts.value,
		[player]: String(event.detail?.value ?? ''),
	};
}

function commitName(player: string): void {
	if (props.disabled) return;

	const raw = nameDrafts.value[player] ?? '';
	const normalized = trimName(raw);

	if (normalized === player) {
		nameDrafts.value = { ...nameDrafts.value, [player]: player };
		focusedPlayer.value = '';
		return;
	}

	emit('rename-players', [{
		oldPlayer: player,
		newPlayer: raw,
	}]);

	focusedPlayer.value = '';
	nameDrafts.value = { ...nameDrafts.value, [player]: player };
}

function flushNameDrafts(): void {
	const changes: PlayerRename[] = [];

	props.rows.forEach((row) => {
		const raw = nameDrafts.value[row.player] ?? '';
		if (trimName(raw) !== row.player) {
			changes.push({
				oldPlayer: row.player,
				newPlayer: raw,
			});
		}
	});

	if (changes.length) {
		emit('rename-players', changes);
	}

	const next: Record<string, string> = {};
	props.rows.forEach((row) => {
		next[row.player] = row.player;
	});
	nameDrafts.value = next;
	focusedPlayer.value = '';

	void tryCreatePlayer();
}

function getClientY(event: any): number {
	const touch = event?.touches?.[0] ?? event?.changedTouches?.[0];
	return Number(
		touch?.clientY
		?? event?.clientY
		?? event?.pageY
		?? 0,
	);
}

function getScrollElement(): HTMLElement | null {
	if (typeof document === 'undefined') return null;
	return document.getElementById(scrollId) as HTMLElement | null;
}

function handleDragStart(index: number, event: any): void {
	if (props.disabled || props.rows.length < 2) return;

	if (activeNewRowIndex.value < displayRows.value.length) {
		newRowIndex.value = displayRows.value.length;
	}

	event?.preventDefault?.();
	dragging.value = true;
	dragIndex.value = index;
	dragFromIndex.value = index;
	dragStartY.value = getClientY(event);
	dragStartScrollTop.value = getScrollElement()?.scrollTop ?? 0;
	dragStep.value = props.layout === 'horizontal'
		? HORIZONTAL_ROW_HEIGHT
		: (uni.getSystemInfoSync().windowWidth <= 700
			? 82
			: VERTICAL_GROUP_HEIGHT);
	dragOrder.value = displayRows.value.map((row) => row.player);
	localOrder.value = dragOrder.value.slice();
	dragMoved.value = false;

	addMouseListeners();
}

function handleDragMove(clientY: number): void {
	if (!dragging.value) return;

	const scrollElement = getScrollElement();
	const scrollDelta = scrollElement
		? scrollElement.scrollTop - dragStartScrollTop.value
		: 0;
	const offset = Math.round(
		(clientY - dragStartY.value + scrollDelta) / dragStep.value,
	);
	const target = Math.max(
		0,
		Math.min(dragOrder.value.length - 1, dragFromIndex.value + offset),
	);

	if (target !== dragIndex.value) {
		const next = localOrder.value.slice();
		const [moved] = next.splice(dragIndex.value, 1);
		next.splice(target, 0, moved);
		localOrder.value = next;
		dragIndex.value = target;
		dragMoved.value = true;
	}

	autoScroll(clientY, scrollElement);
}

function autoScroll(clientY: number, scrollElement: HTMLElement | null): void {
	if (!scrollElement) return;

	const rect = scrollElement.getBoundingClientRect();
	const edge = 52;

	if (clientY < rect.top + edge) {
		scrollElement.scrollTop = Math.max(0, scrollElement.scrollTop - 16);
	} else if (clientY > rect.bottom - edge) {
		scrollElement.scrollTop += 16;
	}
}

function handleTouchMove(event: any): void {
	if (!dragging.value) return;
	event?.preventDefault?.();
	handleDragMove(getClientY(event));
}

function handleMouseMove(event: MouseEvent): void {
	event.preventDefault();
	handleDragMove(event.clientY);
}

function handleDragEnd(): void {
	if (!dragging.value) return;

	removeMouseListeners();
	dragging.value = false;
	dragIndex.value = -1;
	dragFromIndex.value = -1;

	const orderChanged = dragOrder.value.some(
		(name, index) => localOrder.value[index] !== name,
	);

	if (dragMoved.value && orderChanged) {
		emit('reorder', localOrder.value.slice());
	}
	dragOrder.value = [];
	dragMoved.value = false;
}

function addMouseListeners(): void {
	if (typeof document === 'undefined') return;
	document.addEventListener('mousemove', handleMouseMove);
	document.addEventListener('mouseup', handleDragEnd);
}

function removeMouseListeners(): void {
	if (typeof document === 'undefined') return;
	document.removeEventListener('mousemove', handleMouseMove);
	document.removeEventListener('mouseup', handleDragEnd);
}

defineExpose({ flushNameDrafts, resetNewPlayerDraft });
</script>

<style scoped>
.player-table-root {
	width: 100%;
}

.player-table-scroll {
	width: 100%;
	max-height: min(68vh, 760px);
	overflow: auto;
	border: 1px solid var(--border-default);
	border-radius: 9px;
	background: var(--bg-panel-soft);
	-webkit-overflow-scrolling: touch;
}

.player-grid {
	min-width: 760px;
}

.grid-horizontal {
	--ptable-columns: 58px minmax(120px, 1.25fr) repeat(6, minmax(104px, 1fr));
}

.grid-vertical {
	--ptable-columns: 54px minmax(96px, 1.2fr) repeat(3, minmax(96px, 1fr));
}

.ptable-head,
.h-row {
	display: grid;
	grid-template-columns: var(--ptable-columns);
}

.ptable-head {
	position: sticky;
	top: 0;
	z-index: 4;
	min-height: 42px;
	background: var(--table-header);
	color: var(--text-secondary);
	font-size: 11px;
	font-weight: 800;
}

.head-cell {
	min-width: 0;
	padding: 0 6px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-right: 1px solid var(--border-subtle);
	text-align: center;
}

.head-cell:last-child {
	border-right: 0;
}

.seq-head {
	gap: 4px;
}

.head-drag {
	color: var(--text-faint);
	font-size: 15px;
}

.name-head,
.head-cell:nth-child(2) {
	justify-content: flex-start;
	padding-left: 10px;
}

.h-row {
	height: 46px;
	border-top: 1px solid var(--border-subtle);
	background: var(--bg-panel-soft);
	transition: background 0.16s ease, box-shadow 0.16s ease;
}

.h-row:nth-child(odd) {
	background: var(--bg-panel-soft-alt);
}

.v-group {
	display: grid;
	grid-template-columns: var(--ptable-columns);
	grid-template-rows: 43px 43px;
	height: 88px;
	border-top: 1px solid var(--border-subtle);
	background: var(--bg-panel-soft);
	transition: background 0.16s ease, box-shadow 0.16s ease;
}

.v-group:nth-child(odd) {
	background: var(--bg-panel-soft-alt);
}

.drag-row {
	position: relative;
	z-index: 8;
	background: var(--bg-hover) !important;
	box-shadow: 0 8px 22px rgba(0, 0, 0, 0.32), inset 0 0 0 1px rgba(80, 190, 255, 0.55);
}

.seq-cell,
.name-cell,
.boss-cell {
	min-width: 0;
	display: flex;
	align-items: center;
	border-right: 1px solid var(--border-subtle);
}

.seq-cell {
	position: relative;
	justify-content: center;
	gap: 5px;
	color: var(--text-muted);
	font-size: 12px;
	font-weight: 800;
}

.drag-handle {
	width: 22px;
	height: 30px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 4px;
	color: var(--text-faint);
	font-size: 17px;
	line-height: 1;
	cursor: grab;
	touch-action: none;
	user-select: none;
}

.drag-handle:active {
	cursor: grabbing;
	background: var(--bg-subtle);
	color: var(--accent-text);
}

.seq-number {
	min-width: 12px;
	text-align: center;
}

.clickable-seq {
	cursor: pointer;
}

.clickable-seq:hover {
	color: var(--accent-text);
}

.name-cell {
	padding: 0 7px;
	transition: background 0.16s ease;
}

.player-name-input {
	width: 100%;
	height: 32px;
	padding: 0 7px;
	border: 1px solid transparent;
	border-radius: 4px;
	background: rgba(255, 255, 255, 0.04);
	color: var(--text-primary);
	font-size: 12px;
	font-weight: 800;
}

.player-name-input:focus {
	border-color: rgba(255, 255, 255, 0.52);
	outline: none;
	background: rgba(255, 255, 255, 0.12);
}

.player-name-input::placeholder {
	color: var(--text-faint);
	font-size: 10px;
	font-weight: 400;
}

.player-name-placeholder {
	color: var(--text-faint);
	font-size: 10px;
	font-weight: 400;
}

.boss-cell {
	position: relative;
	padding: 3px 5px;
	justify-content: center;
	background: var(--bg-panel-soft);
}

.boss-cell picker {
	width: 100%;
}

.boss-select {
	width: 100%;
	min-height: 30px;
	padding: 0 5px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 4px;
	font-size: 11px;
	font-weight: 800;
	line-height: 1.1;
	text-align: center;
	white-space: nowrap;
	cursor: pointer;
}

.boss-select.empty {
	border: 1px dashed var(--border-default);
	background: transparent;
	color: var(--text-faint);
	font-weight: 400;
}

.boss-select.locked {
	border: 1px dashed rgba(255, 255, 255, 0.16);
	background: rgba(0, 0, 0, 0.16);
	color: var(--text-faint);
	font-weight: 400;
	cursor: not-allowed;
}

.merged-cell {
	grid-row: 1 / span 2;
	border-bottom: 0;
}

.base-cell {
	background: var(--bg-panel-soft);
}

.return-cell {
	background: rgba(8, 61, 99, 0.2);
}

.return-tag {
	position: absolute;
	top: 2px;
	left: 6px;
	z-index: 2;
	color: var(--text-faint);
	font-size: 8px;
	line-height: 1;
	pointer-events: none;
}

.player-empty {
	margin-top: 12px;
	padding: 22px 14px;
	border: 1px dashed var(--border-default);
	border-radius: 8px;
	color: var(--text-muted);
	font-size: 12px;
	text-align: center;
}

.h-row.new-player-row,
.v-group.new-player-row {
	background: rgba(24, 132, 212, 0.1);
	box-shadow: inset 0 0 0 1px rgba(69, 185, 255, 0.32);
}

.new-row-plus {
	color: var(--accent-text);
	font-size: 13px;
	font-weight: 800;
	line-height: 1;
}

.new-player-name-input {
	background: rgba(255, 255, 255, 0.1);
}

.h-row.placeholder-row,
.v-group.placeholder-row {
	opacity: 0.42;
	background: transparent;
}

.h-row.selectable-placeholder,
.v-group.selectable-placeholder {
	cursor: pointer;
}

.h-row.selectable-placeholder:hover,
.v-group.selectable-placeholder:hover {
	opacity: 0.82;
	background: rgba(24, 132, 212, 0.1);
}

.placeholder-row .seq-cell,
.placeholder-row .name-cell,
.placeholder-row .boss-cell {
	color: var(--text-faint);
	font-weight: 400;
}

.placeholder-cell {
	justify-content: center;
	color: var(--text-faint);
	font-size: 11px;
}

.placeholder-boss {
	border: 0;
	background: transparent;
	color: var(--text-faint);
	font-weight: 400;
	cursor: default;
}

.player-table-actions {
	display: flex;
	align-items: center;
	gap: 10px;
	flex-wrap: wrap;
	margin-top: 10px;
}

.add-player-button,
.cancel-player-button {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 5px;
	min-height: 32px;
	padding: 0 13px;
	border-radius: 6px;
	font-size: 12px;
	font-weight: 800;
	cursor: pointer;
	user-select: none;
}

.add-player-button {
	border: 1px solid rgba(69, 185, 255, 0.42);
	background: rgba(24, 132, 212, 0.16);
	color: var(--accent-text);
}

.add-player-button:hover {
	background: rgba(24, 132, 212, 0.26);
}

.add-player-plus {
	font-size: 15px;
	line-height: 1;
}

.cancel-player-button {
	border: 1px solid var(--border-default);
	background: transparent;
	color: var(--text-muted);
}

.cancel-player-button:hover {
	background: var(--bg-hover);
	color: var(--text-secondary);
}

.player-row-limit {
	margin-left: auto;
	color: var(--text-faint);
	font-size: 11px;
}

.new-player-hint {
	margin-top: 8px;
	padding: 7px 10px;
	border: 1px dashed rgba(69, 185, 255, 0.32);
	border-radius: 6px;
	color: var(--text-muted);
	font-size: 11px;
	text-align: center;
}

.is-disabled {
	opacity: 0.72;
}

.is-dragging .boss-cell,
.is-dragging .name-cell {
	pointer-events: none;
}

@media screen and (max-width: 1200px) {
	.grid-horizontal {
		--ptable-columns: 54px minmax(110px, 1.2fr) repeat(6, minmax(94px, 1fr));
	}
}

@media screen and (max-width: 700px) {
	.player-table-scroll {
		max-height: 64vh;
		min-height: 280px;
		border-radius: 7px;
	}

	.player-grid {
		min-width: 0;
	}

	.grid-vertical {
		--ptable-columns: 42px minmax(78px, 1.15fr) repeat(3, minmax(64px, 1fr));
	}

	.ptable-head {
		min-height: 38px;
		font-size: 10px;
	}

	.head-cell {
		padding: 0 3px;
	}

	.name-head {
		padding-left: 5px;
	}

	.head-drag {
		display: none;
	}

	.v-group {
		grid-template-rows: 40px 40px;
		height: 82px;
	}

	.seq-cell {
		flex-direction: column;
		gap: 0;
		font-size: 10px;
	}

	.drag-handle {
		width: 26px;
		height: 24px;
		font-size: 15px;
	}

	.name-cell {
		padding: 0 4px;
	}

	.player-name-input {
		height: 30px;
		padding: 0 4px;
		font-size: 11px;
	}

	.boss-cell {
		padding: 2px 3px;
	}

	.boss-select {
		min-height: 28px;
		padding: 0 2px;
		font-size: 10px;
	}

	.return-tag {
		top: 1px;
		left: 3px;
		font-size: 7px;
	}

	.player-table-actions {
		gap: 8px;
	}

	.player-row-limit {
		width: 100%;
		margin-left: 0;
		text-align: right;
	}
}
</style>
