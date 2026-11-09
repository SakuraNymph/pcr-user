<template>
	<view v-if="panelVisible" class="guild-quick-panel">
		<view class="gqp-bar" @click="toggleCollapsed">
			<view class="gqp-title">
				<text class="gqp-title-icon">⚡</text>
				<text>快捷排刀</text>
			</view>
			<view v-if="saving" class="gqp-status saving">
				<text class="gqp-save-dot"></text>
				<text>保存中…</text>
			</view>
			<text class="gqp-count">已选 {{ selectedCount }} / 6</text>
			<text class="gqp-arrow">{{ collapsed ? '▸' : '▾' }}</text>
		</view>

		<view v-if="!collapsed" class="gqp-body">
			<view
				v-for="field in SLOT_FIELDS"
				:key="field.key"
				class="gqp-field"
				:class="`gqp-field-${field.key}`"
			>
				<text class="gqp-field-label">{{ field.label }}</text>
				<view
					class="boss-select"
					:class="cellClass(field.key)"
					:title="cellTitle(field.key)"
					@click="openPicker(field.key)"
				>
					<template v-if="cellFilled(field.key)">
						<view class="cell-summary">
							<text class="cell-head">{{ cellHead(field.key) }}</text>
							<view class="cell-roles">
								<template
									v-for="(role, roleIndex) in cellRoleSlots(field.key)"
									:key="roleIndex"
								>
									<image
										v-if="role"
										class="cell-role-avatar"
										:src="role.image_url || ''"
										mode="aspectFill"
									/>
									<view v-else class="cell-role-seat" />
								</template>
							</view>
						</view>
					</template>
					<template v-else>{{ cellText(field.key) }}</template>
				</view>
			</view>
		</view>

		<GuildTeamPickerModal
			v-if="pickerVisible"
			:guild-id="guildId"
			:allow-clear="true"
			:title="pickerTitle"
			@close="closePicker"
			@select="handleSelect"
			@clear="handleClear"
		/>
	</view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import GuildTeamPickerModal from './GuildTeamPickerModal.vue';
import { saveGuildScheduleMember } from '../api/guild';
import { errorMessage } from '../api/errors';
import type {
	GuildSchedule,
	GuildScheduleMember,
	GuildScheduleSlot,
	Team,
	TeamRole,
} from '../api/types';
import { stageName, teamSummary } from '../utils/guild';

const props = defineProps<{
	schedule: GuildSchedule;
	viewerUid: number;
	guildId: number;
}>();

const emit = defineEmits<{
	(event: 'updated', schedule: GuildSchedule): void;
	(event: 'reload'): void;
}>();

const SLOT_FIELDS = [
	{ key: 'team_1', label: '第一刀' },
	{ key: 'team_2', label: '第二刀' },
	{ key: 'team_3', label: '第三刀' },
	{ key: 'team_1_return', label: '第一刀返还' },
	{ key: 'team_2_return', label: '第二刀返还' },
	{ key: 'team_3_return', label: '第三刀返还' },
] as const;

type SlotKey = typeof SLOT_FIELDS[number]['key'];

const saving = ref(false);
const collapsed = ref(false);
const pickerVisible = ref(false);
const activeKey = ref<SlotKey | null>(null);

const viewerRow = computed<GuildScheduleMember | null>(() => (
	props.schedule.members.find((member) => member.uid === props.viewerUid) ?? null
));

const panelVisible = computed(() => (
	props.schedule.is_current_month && viewerRow.value !== null
));

const viewerSlots = computed<Record<string, GuildScheduleSlot | undefined>>(() => {
	const map: Record<string, GuildScheduleSlot | undefined> = {};
	(viewerRow.value?.slots ?? []).forEach((slot) => {
		map[slot.key] = slot;
	});
	return map;
});

const allEmpty = computed(() => (
	!viewerRow.value
	|| SLOT_FIELDS.every((field) => {
		const slot = viewerSlots.value[field.key];
		return !slot || slot.team_id === null;
	})
));

const selectedCount = computed(() => (
	SLOT_FIELDS.filter((field) => {
		const slot = viewerSlots.value[field.key];
		return !!slot && slot.team_id !== null;
	}).length
));

const pickerTitle = computed(() => {
	const field = SLOT_FIELDS.find((item) => item.key === activeKey.value);
	return field ? `${field.label} · 选择作业` : '选择作业';
});

onMounted(() => {
	collapsed.value = !allEmpty.value;
});

function toggleCollapsed(): void {
	collapsed.value = !collapsed.value;
}

function slotOf(key: SlotKey): GuildScheduleSlot | undefined {
	return viewerSlots.value[key];
}

function cellFilled(key: SlotKey): boolean {
	const slot = slotOf(key);
	return !!slot && slot.team_id !== null && !slot.deleted && !!slot.team;
}

function cellClass(key: SlotKey): Record<string, boolean> {
	const slot = slotOf(key);
	if (!slot) return { 'is-locked': true };
	const filled = cellFilled(key);
	const deleted = slot.team_id !== null && (slot.deleted || !slot.team);
	return {
		'is-clickable': slot.editable && !saving.value,
		'is-locked': !slot.editable || saving.value,
		'state-empty': slot.team_id === null,
		'state-deleted': deleted,
		'state-filled': filled,
		'is-multiline': filled,
	};
}

function cellText(key: SlotKey): string {
	const slot = slotOf(key);
	if (!slot) return '—';
	if (slot.team_id === null) return slot.editable ? '空白' : '—';
	if (slot.deleted || !slot.team) return '已删除';
	return '';
}

function cellHead(key: SlotKey): string {
	const slot = slotOf(key);
	if (!slot || !slot.team) return '';
	return `${stageName(Number(slot.team.stage))} · ${Number(slot.team.boss)}王`;
}

function cellRoleSlots(key: SlotKey): Array<TeamRole | null> {
	const slot = slotOf(key);
	const roles = slot && slot.team && Array.isArray(slot.team.team)
		? slot.team.team.slice(0, 5)
		: [];
	return [
		...Array.from({ length: Math.max(0, 5 - roles.length) }, () => null),
		...roles,
	];
}

function cellTitle(key: SlotKey): string {
	const slot = slotOf(key);
	if (!slot) return '';
	if (slot.team) return teamSummary(slot.team);
	return slot.team_id === null ? '' : '作业已删除';
}

function openPicker(key: SlotKey): void {
	const slot = slotOf(key);
	if (!slot || !slot.editable || saving.value) return;
	activeKey.value = key;
	pickerVisible.value = true;
}

function closePicker(): void {
	pickerVisible.value = false;
	activeKey.value = null;
}

function handleSelect(team: Team): Promise<void> {
	const key = activeKey.value;
	if (!key) return Promise.resolve();
	return persist(key, Number(team.id));
}

function handleClear(): Promise<void> {
	const key = activeKey.value;
	if (!key) return Promise.resolve();
	return persist(key, null);
}

async function persist(key: SlotKey, teamId: number | null): Promise<void> {
	const row = viewerRow.value;
	if (!row || saving.value) return;

	saving.value = true;
	try {
		const next = await saveGuildScheduleMember(props.guildId, row.uid, {
			version: row.version,
			month: props.schedule.month,
			[key]: teamId,
		});
		saving.value = false;
		closePicker();
		emit('updated', next);
	} catch (error) {
		saving.value = false;
		closePicker();
		uni.showToast({ title: errorMessage(error, '保存失败'), icon: 'none' });
		emit('reload');
	}
}
</script>

<style scoped>
.guild-quick-panel {
	margin-top: 10px;
	margin-bottom: 10px;
	border: 1px solid var(--border-default);
	border-radius: 8px;
	background: var(--bg-panel-soft);
	overflow: hidden;
}

.gqp-bar {
	padding: 8px 12px;
	display: flex;
	align-items: center;
	gap: 10px;
	flex-wrap: wrap;
	cursor: pointer;
	user-select: none;
}

.gqp-title {
	display: flex;
	align-items: center;
	gap: 6px;
	color: var(--text-primary);
	font-size: 13px;
	font-weight: 800;
}

.gqp-title-icon {
	color: var(--accent-text);
	font-size: 13px;
}

.gqp-status {
	min-height: 26px;
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

.gqp-save-dot {
	width: 7px;
	height: 7px;
	border-radius: 50%;
	background: #58c5ff;
	box-shadow: 0 0 8px #58c5ff;
	animation: gqp-save-pulse 1s ease-in-out infinite;
}

.gqp-count {
	margin-left: auto;
	color: var(--text-faint);
	font-size: 11px;
}

.gqp-arrow {
	color: var(--text-faint);
	font-size: 14px;
}

.gqp-body {
	padding: 4px 12px 12px;
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 9px 12px;
	border-top: 1px solid var(--border-subtle);
}

.gqp-field-label {
	display: block;
	margin-bottom: 5px;
	color: var(--text-muted);
	font-size: 11px;
	font-weight: 700;
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
}

.boss-select.is-multiline {
	min-height: 34px;
	padding: 3px 7px;
	align-items: flex-start;
	justify-content: center;
	flex-direction: column;
	text-align: left;
	white-space: normal;
}

.boss-select.is-clickable {
	cursor: pointer;
}

.boss-select.is-clickable:hover {
	box-shadow: inset 0 0 0 1px rgba(83, 190, 255, 0.6);
}

.boss-select.state-empty {
	border: 1px dashed var(--border-default);
	background: transparent;
	color: var(--text-faint);
	font-weight: 400;
}

.boss-select.state-filled {
	border: 1px solid var(--border-strong);
	background: var(--bg-panel-alt);
	color: var(--text-primary);
}

.boss-select.state-deleted {
	border: 1px dashed rgba(255, 209, 102, 0.44);
	background: rgba(255, 209, 102, 0.08);
	color: var(--warning);
	font-size: 10px;
	font-weight: 700;
}

.boss-select.is-locked {
	cursor: not-allowed;
}

.boss-select.is-locked.is-multiline {
	opacity: 0.6;
}

.boss-select.is-locked.state-empty {
	background: rgba(0, 0, 0, 0.16);
}

.cell-summary {
	width: 100%;
	min-width: 0;
	display: flex;
	align-items: center;
	gap: 5px;
	overflow: hidden;
}

.cell-head {
	flex: 0 0 auto;
	color: var(--accent-text);
	font-size: 11px;
	font-weight: 800;
	white-space: nowrap;
}

.cell-roles {
	flex: 1 1 auto;
	min-width: 0;
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 2px;
	overflow: hidden;
}

.cell-role-avatar {
	height: 18px;
	flex: 1 1 0;
	min-width: 0;
	max-width: 18px;
	box-sizing: border-box;
	border: 1px solid rgba(83, 190, 255, 0.35);
	border-radius: 4px;
	background: var(--bg-subtle);
}

.cell-role-seat {
	height: 18px;
	flex: 1 1 0;
	min-width: 0;
	max-width: 18px;
	box-sizing: border-box;
	border: 1px dashed var(--border-default);
	border-radius: 4px;
	background: var(--bg-panel-soft);
}

@media screen and (min-width: 901px) {
	.boss-select {
		min-height: 40px;
	}

	.boss-select.is-multiline {
		min-height: 46px;
	}

	.cell-roles {
		gap: 3px;
	}

	.cell-role-avatar,
	.cell-role-seat {
		height: 28px;
		max-width: 28px;
	}
}

@media screen and (min-width: 1200px) {
	.boss-select.is-multiline {
		min-height: 52px;
	}

	.cell-role-avatar,
	.cell-role-seat {
		height: 34px;
		max-width: 34px;
	}
}

@keyframes gqp-save-pulse {
	0%,
	100% {
		opacity: 1;
	}

	50% {
		opacity: 0.35;
	}
}

@media screen and (max-width: 1000px) {
	.gqp-body {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.gqp-field-team_1 {
		order: 1;
	}

	.gqp-field-team_1_return {
		order: 2;
	}

	.gqp-field-team_2 {
		order: 3;
	}

	.gqp-field-team_2_return {
		order: 4;
	}

	.gqp-field-team_3 {
		order: 5;
	}

	.gqp-field-team_3_return {
		order: 6;
	}
}

@media screen and (max-width: 700px) {
	.gqp-bar {
		padding: 6px 10px;
		gap: 8px;
		flex-wrap: nowrap;
	}

	.gqp-body {
		padding: 4px 10px 10px;
		gap: 8px 10px;
	}

	.gqp-count {
		width: auto;
		flex: 0 0 auto;
		margin-left: auto;
		text-align: right;
	}
}
</style>
