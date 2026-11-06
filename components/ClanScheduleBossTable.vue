<template>
	<view class="boss-table-root">
		<view
			v-for="phase in phaseGroups"
			:key="phase.key"
			class="phase-block"
		>
			<view class="phase-head">
				<view class="phase-heading">
					<text class="phase-title">{{ phase.title }}</text>
					<text class="phase-subtitle">{{ phase.subtitle }}</text>
				</view>
				<view class="phase-actions">
					<text class="phase-row-count">{{ phase.rounds.length }} / {{ phase.maxRows }} 行</text>
					<view
						class="delete-row-button"
						:class="{ disabled: !phase.rounds.length || disabled }"
						@click="requestDeleteLastRow(phase.key)"
					>删除最后一行</view>
					<view
						class="add-round-button"
						:class="{ disabled: !canAddRow(phase) || disabled }"
						@click="requestAddRow(phase.key)"
					>＋ 添加一行</view>
				</view>
			</view>

			<scroll-view class="boss-scroll" scroll-x>
				<view class="boss-grid">
					<view class="boss-grid-row boss-grid-head">
						<view
							v-for="boss in 5"
							:key="`head-${phase.key}-${boss}`"
							class="boss-grid-cell boss-head"
						>
							<text class="boss-dot" :style="{ backgroundColor: BOSS_COLORS[boss - 1] }"></text>
							<text>{{ phase.key }}{{ boss }}</text>
						</view>
					</view>

					<view
						v-for="round in phase.rounds"
						:key="`${phase.key}-${round}`"
						class="boss-grid-row"
					>
						<view
							v-for="boss in 5"
							:key="`${phase.key}-${round}-${boss}`"
							class="boss-grid-cell input-cell"
							:class="{ filled: !!cellAt(phase.key, round, boss) }"
							:style="cellStyle(phase.key, round, boss)"
						>
							<input
								class="boss-name-input"
								type="text"
								:value="draftAt(phase.key, round, boss)"
								:disabled="disabled"
								maxlength="32"
								placeholder="填写玩家"
								placeholder-class="boss-input-placeholder"
								@input="handleInput(phase.key, round, boss, $event)"
								@focus="handleFocus(phase.key, round, boss)"
								@blur="commitCell(phase.key, round, boss)"
								@confirm="commitCell(phase.key, round, boss)"
							/>
						</view>
					</view>
					<view v-if="!phase.rounds.length" class="phase-empty-row">
						暂无排刀行，点击“添加一行”开始
					</view>
				</view>
			</scroll-view>
		</view>

		<view v-if="!hasVisibleRows" class="boss-empty-hint">
			点击各阶段“添加一行”后填写玩家名称即可开始排刀；同一个玩家最多可占用 6 个格子。
		</view>
	</view>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import type { ClanScheduleCell, ClanSchedulePhase } from '../api/types';
import {
	BOSS_COLORS,
	PHASE_MAX_ROWS,
	trimName,
	positionKey,
	visiblePhaseRounds,
} from '../utils/clanSchedule';

interface BossCellChange {
	phase: ClanSchedulePhase;
	round: number;
	boss: number;
	player: string;
}

interface PhaseGroup {
	key: ClanSchedulePhase;
	title: string;
	subtitle: string;
	rounds: number[];
	maxRows: number;
}

const props = defineProps<{
	cells: ClanScheduleCell[];
	colors: Record<string, string>;
	addedRounds?: Partial<Record<ClanSchedulePhase, number[]>>;
	disabled?: boolean;
}>();

const emit = defineEmits<{
	(event: 'commit-cells', changes: BossCellChange[]): void;
	(event: 'add-row', phase: ClanSchedulePhase): void;
	(event: 'delete-last-row', phase: ClanSchedulePhase, round: number): void;
}>();

const drafts = ref<Record<string, string>>({});
const focusedKey = ref('');

const cellMap = computed(() => {
	const map = new Map<string, ClanScheduleCell>();
	props.cells.forEach((cell) => {
		map.set(positionKey(cell.phase, cell.round, cell.boss), cell);
	});
	return map;
});

const phaseGroups = computed<PhaseGroup[]>(() => [
	{
		key: 'B',
		title: 'B 阶段',
		subtitle: '第 1 - 6 周目',
		rounds: visiblePhaseRounds('B', props.cells, props.addedRounds?.B ?? []),
		maxRows: PHASE_MAX_ROWS.B,
	},
	{
		key: 'C',
		title: 'C 阶段',
		subtitle: '第 7 - 22 周目',
		rounds: visiblePhaseRounds('C', props.cells, props.addedRounds?.C ?? []),
		maxRows: PHASE_MAX_ROWS.C,
	},
	{
		key: 'D',
		title: 'D 阶段',
		subtitle: '第 23 周目起',
		rounds: visiblePhaseRounds('D', props.cells, props.addedRounds?.D ?? []),
		maxRows: PHASE_MAX_ROWS.D,
	},
]);

const hasVisibleRows = computed(() => (
	phaseGroups.value.some((phase) => phase.rounds.length > 0)
));

watch(
	[() => props.cells, () => props.addedRounds],
	() => syncDrafts(),
	{ deep: true, immediate: true },
);

onBeforeUnmount(() => {
	flushDrafts();
});

function keyOf(phase: ClanSchedulePhase, round: number, boss: number): string {
	return positionKey(phase, round, boss);
}

function cellAt(
	phase: ClanSchedulePhase,
	round: number,
	boss: number,
): ClanScheduleCell | null {
	return cellMap.value.get(keyOf(phase, round, boss)) ?? null;
}

function draftAt(
	phase: ClanSchedulePhase,
	round: number,
	boss: number,
): string {
	const key = keyOf(phase, round, boss);
	return drafts.value[key] ?? '';
}

function cellStyle(
	phase: ClanSchedulePhase,
	round: number,
	boss: number,
): Record<string, string> {
	const cell = cellAt(phase, round, boss);
	if (!cell) return {};
	const color = props.colors[cell.player];
	return color ? { backgroundColor: color } : {};
}

function syncDrafts(): void {
	const next: Record<string, string> = {};

	phaseGroups.value.forEach((phase) => {
		phase.rounds.forEach((round) => {
			for (let boss = 1; boss <= 5; boss += 1) {
				const key = keyOf(phase.key, round, boss);
				const current = cellMap.value.get(key)?.player ?? '';
				next[key] = focusedKey.value === key
					? (drafts.value[key] ?? current)
					: current;
			}
		});
	});

	drafts.value = next;
}

function handleInput(
	phase: ClanSchedulePhase,
	round: number,
	boss: number,
	event: { detail?: { value?: string | number } },
): void {
	const key = keyOf(phase, round, boss);
	drafts.value = {
		...drafts.value,
		[key]: String(event.detail?.value ?? ''),
	};
}

function handleFocus(
	phase: ClanSchedulePhase,
	round: number,
	boss: number,
): void {
	focusedKey.value = keyOf(phase, round, boss);
}

function commitCell(
	phase: ClanSchedulePhase,
	round: number,
	boss: number,
): void {
	if (props.disabled) return;

	const key = keyOf(phase, round, boss);
	const current = cellMap.value.get(key)?.player ?? '';
	const raw = drafts.value[key] ?? '';
	const normalized = trimName(raw);

	if (normalized === current) {
		drafts.value = { ...drafts.value, [key]: current };
		focusedKey.value = '';
		return;
	}

	emit('commit-cells', [{
		phase,
		round,
		boss,
		player: raw,
	}]);

	focusedKey.value = '';
	drafts.value = { ...drafts.value, [key]: current };
}

function flushDrafts(): void {
	const changes: BossCellChange[] = [];

	phaseGroups.value.forEach((phase) => {
		phase.rounds.forEach((round) => {
			for (let boss = 1; boss <= 5; boss += 1) {
				const key = keyOf(phase.key, round, boss);
				const current = cellMap.value.get(key)?.player ?? '';
				const raw = drafts.value[key] ?? '';

				if (trimName(raw) !== current) {
					changes.push({
						phase: phase.key,
						round,
						boss,
						player: raw,
					});
				}
			}
		});
	});

	if (changes.length) {
		emit('commit-cells', changes);
	}

	focusedKey.value = '';
	syncDrafts();
}

async function requestAddRow(phase: ClanSchedulePhase): Promise<void> {
	if (props.disabled) return;

	flushDrafts();
	await nextTick();

	const group = phaseGroups.value.find((item) => item.key === phase);

	if (!group) return;

	if (group.rounds.length >= group.maxRows) {
		uni.showToast({
			title: `${phase} 阶段最多添加 ${group.maxRows} 行`,
			icon: 'none',
		});
		return;
	}

	if (!canAddRow(group)) {
		uni.showToast({
			title: '请先填写当前行内容，再添加下一行',
			icon: 'none',
		});
		return;
	}

	emit('add-row', phase);
}

function rowHasContent(phase: ClanSchedulePhase, round: number): boolean {
	for (let boss = 1; boss <= 5; boss += 1) {
		const key = keyOf(phase, round, boss);
		if (
			cellAt(phase, round, boss)
			|| trimName(drafts.value[key] ?? '') !== ''
		) {
			return true;
		}
	}
	return false;
}

function canAddRow(group: PhaseGroup): boolean {
	if (group.rounds.length >= group.maxRows) return false;
	if (!group.rounds.length) return true;

	return rowHasContent(
		group.key,
		group.rounds[group.rounds.length - 1],
	);
}

async function requestDeleteLastRow(phase: ClanSchedulePhase): Promise<void> {
	if (props.disabled) return;

	flushDrafts();
	await nextTick();

	const group = phaseGroups.value.find((item) => item.key === phase);
	if (!group || !group.rounds.length) return;

	const round = group.rounds[group.rounds.length - 1];

	const deleteRow = (): void => {
		emit('delete-last-row', phase, round);
	};

	if (!rowHasContent(phase, round)) {
		deleteRow();
		return;
	}

	uni.showModal({
		title: `删除${phase}阶段最后一行`,
		content: '该行所有Boss格子中的玩家都会被清空，是否继续？',
		confirmText: '确认删除',
		confirmColor: '#e45c68',
		cancelText: '取消',
		success: (result) => {
			if (result.confirm) {
				deleteRow();
			}
		},
	});
}

defineExpose({ flushDrafts });
</script>

<style scoped>
.boss-table-root {
	width: 100%;
}

.phase-block {
	width: 100%;
	padding: 14px;
	border: 1px solid var(--border-default);
	border-radius: 10px;
	background: linear-gradient(120deg, var(--bg-panel), var(--bg-panel-alt));
	box-shadow: inset 0 1px rgba(255, 255, 255, 0.03);
}

.phase-block + .phase-block {
	margin-top: 30px;
}

.phase-head {
	min-height: 36px;
	margin-bottom: 10px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
}

.phase-heading {
	min-width: 0;
	display: flex;
	align-items: baseline;
	gap: 10px;
}

.phase-title {
	color: var(--text-primary);
	font-size: 17px;
	font-weight: 800;
	letter-spacing: 0.04em;
}

.phase-subtitle {
	color: var(--text-muted);
	font-size: 11px;
}

.phase-actions {
	display: flex;
	align-items: center;
	gap: 10px;
	flex-wrap: wrap;
}

.phase-row-count {
	color: var(--text-faint);
	font-size: 11px;
}

.add-round-button,
.delete-row-button {
	min-height: 30px;
	padding: 0 10px;
	display: flex;
	align-items: center;
	border: 1px solid rgba(69, 158, 225, 0.48);
	border-radius: 5px;
	background: var(--bg-subtle);
	color: var(--accent-text);
	font-size: 11px;
	font-weight: 700;
	white-space: nowrap;
	cursor: pointer;
}

.delete-row-button {
	border-color: rgba(228, 92, 104, 0.42);
	background: rgba(228, 92, 104, 0.08);
	color: #f0a4ab;
}

.add-round-button.disabled,
.delete-row-button.disabled {
	opacity: 0.45;
	cursor: not-allowed;
}

.boss-scroll {
	width: 100%;
	border: 1px solid var(--border-subtle);
	border-radius: 7px;
	background: var(--bg-panel-soft);
}

.boss-grid {
	min-width: 760px;
}

.boss-grid-row {
	display: grid;
	grid-template-columns: repeat(5, minmax(120px, 1fr));
}

.boss-grid-row + .boss-grid-row {
	border-top: 1px solid var(--border-subtle);
}

.boss-grid-cell {
	min-width: 0;
	min-height: 42px;
	padding: 4px 6px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-right: 1px solid var(--border-subtle);
	font-size: 12px;
}

.boss-grid-cell:last-child {
	border-right: 0;
}

.boss-grid-head {
	background: var(--table-header);
	color: var(--text-secondary);
	font-size: 12px;
	font-weight: 800;
}

.boss-grid-head .boss-grid-cell {
	min-height: 38px;
}

.boss-head {
	gap: 7px;
}

.boss-dot {
	width: 8px;
	height: 8px;
	flex: 0 0 8px;
	border-radius: 50%;
	box-shadow: 0 0 7px rgba(255, 255, 255, 0.18);
}

.input-cell {
	padding: 3px;
	background: var(--bg-input);
	transition: background 0.16s ease, box-shadow 0.16s ease;
}

.input-cell.filled {
	box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.14);
}

.boss-name-input {
	width: 100%;
	height: 34px;
	padding: 0 8px;
	border: 1px solid transparent;
	border-radius: 4px;
	background: transparent;
	color: #10253a;
	font-size: 12px;
	font-weight: 700;
	text-align: center;
}

.input-cell:not(.filled) .boss-name-input {
	color: var(--text-primary);
}

.boss-name-input:focus {
	border-color: rgba(69, 185, 255, 0.75);
	outline: none;
	background: rgba(0, 13, 29, 0.18);
}

.boss-name-input::placeholder {
	color: var(--text-placeholder);
	font-size: 11px;
	font-weight: 400;
}

.boss-input-placeholder {
	color: var(--text-placeholder);
	font-size: 11px;
	font-weight: 400;
}

.phase-empty-row {
	padding: 16px 12px;
	border-top: 1px solid var(--border-subtle);
	color: var(--text-faint);
	font-size: 11px;
	text-align: center;
}

.boss-empty-hint {
	margin-top: 14px;
	padding: 12px 14px;
	border: 1px dashed var(--border-default);
	border-radius: 8px;
	color: var(--text-muted);
	font-size: 12px;
	text-align: center;
}

@media screen and (max-width: 1000px) {
	.phase-block {
		padding: 10px;
	}

	.phase-block + .phase-block {
		margin-top: 24px;
	}

	.boss-grid {
		min-width: 0;
		width: 100%;
	}

	.boss-grid-row {
		grid-template-columns: repeat(5, minmax(0, 1fr));
	}
}

@media screen and (max-width: 700px) {
	.phase-block {
		padding: 8px;
		border-radius: 8px;
	}

	.phase-block + .phase-block {
		margin-top: 20px;
	}

	.phase-head {
		align-items: flex-start;
		flex-direction: column;
		gap: 7px;
	}

	.phase-title {
		font-size: 15px;
	}

	.phase-actions {
		width: 100%;
		justify-content: space-between;
	}

	.boss-grid {
		min-width: 0;
		width: 100%;
	}

	.boss-grid-row {
		grid-template-columns: repeat(5, minmax(0, 1fr));
	}

	.boss-grid-cell {
		min-height: 40px;
		padding: 2px 3px;
		font-size: 11px;
	}

	.boss-grid-head {
		font-size: 10px;
	}

	.boss-head {
		gap: 3px;
	}

	.boss-dot {
		width: 6px;
		height: 6px;
		flex-basis: 6px;
	}

	.boss-name-input {
		height: 32px;
		padding: 0 3px;
		font-size: 10px;
	}

	.boss-name-input::placeholder,
	.boss-input-placeholder {
		font-size: 9px;
	}
}
</style>
