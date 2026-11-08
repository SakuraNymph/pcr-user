<template>
	<view class="guild-schedule-table">
		<view class="gst-bar">
			<view class="save-state" :class="`save-${saveState}`">
				<text class="save-dot"></text>
				<text>{{ saveStateText }}</text>
			</view>

			<view class="layout-toggle">
				<view
					class="layout-option"
					:class="{ active: effectiveLayout === 'horizontal' }"
					@click="setLayout('horizontal')"
				>横向</view>
				<view
					class="layout-option"
					:class="{ active: effectiveLayout === 'vertical' }"
					@click="setLayout('vertical')"
				>竖向</view>
			</view>
		</view>

		<view
			v-if="tableRows.length"
			class="player-table-root"
			:class="[`layout-${effectiveLayout}`, { 'is-disabled': saving }]"
		>
			<view class="player-table-scroll">
				<view class="player-grid">
					<view class="ptable-head">
						<view class="head-cell seq-head">
							<text class="head-drag">⠿</text>
							<text>序号</text>
						</view>
						<view class="head-cell name-head">成员</view>
						<template v-if="effectiveLayout === 'horizontal'">
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

					<template v-if="effectiveLayout === 'horizontal'">
						<view
							v-for="(member, index) in tableRows"
							:key="`h-${member.uid}`"
							class="h-row"
							:class="{ 'is-self': member.uid === viewerUid }"
						>
							<view class="seq-cell">
								<text class="seq-number">{{ index + 1 }}</text>
							</view>
							<view class="name-cell">
								<view class="member-name">
									<text class="member-nickname">{{ memberLabel(member) }}</text>
									<text v-if="member.uid === viewerUid" class="member-self-tag">我</text>
								</view>
								<view class="member-meta">
									<text class="member-uid">UID {{ member.uid }}</text>
									<text class="member-role">{{ member.role_name }}</text>
								</view>
							</view>
							<view
								v-for="slotIndex in HORIZONTAL_SLOT_ORDER"
								:key="`${member.uid}-cell-${slotIndex}`"
								class="boss-cell"
							>
								<view
									class="boss-select"
									:class="cellClass(member.slots[slotIndex])"
									:title="cellTitle(member.slots[slotIndex])"
									@click="openPicker(member, member.slots[slotIndex])"
								>
									<template v-if="cellFilled(member.slots[slotIndex])">
										<view class="cell-summary">
											<text class="cell-head">{{ cellHead(member.slots[slotIndex]) }}</text>
											<view v-if="cellRoleAvatars(member.slots[slotIndex]).length" class="cell-roles">
												<image
													v-for="(role, roleIndex) in cellRoleAvatars(member.slots[slotIndex])"
													:key="roleIndex"
													class="cell-role-avatar"
													:src="role.image_url || ''"
													mode="aspectFill"
												/>
											</view>
										</view>
									</template>
									<template v-else>{{ cellText(member.slots[slotIndex]) }}</template>
								</view>
							</view>
						</view>
					</template>

					<template v-else>
						<view
							v-for="(member, index) in tableRows"
							:key="`v-${member.uid}`"
							class="v-group"
							:class="{ 'is-self': member.uid === viewerUid }"
						>
							<view class="seq-cell merged-cell">
								<text class="seq-number">{{ index + 1 }}</text>
							</view>
							<view class="name-cell merged-cell">
								<view class="member-name">
									<text class="member-nickname">{{ memberLabel(member) }}</text>
									<text v-if="member.uid === viewerUid" class="member-self-tag">我</text>
								</view>
								<view class="member-meta">
									<text class="member-uid">UID {{ member.uid }}</text>
									<text class="member-role">{{ member.role_name }}</text>
								</view>
							</view>
							<view
								v-for="slotIndex in VERTICAL_BASE_SLOTS"
								:key="`${member.uid}-base-${slotIndex}`"
								class="boss-cell base-cell"
							>
								<view
									class="boss-select"
									:class="cellClass(member.slots[slotIndex])"
									:title="cellTitle(member.slots[slotIndex])"
									@click="openPicker(member, member.slots[slotIndex])"
								>
									<template v-if="cellFilled(member.slots[slotIndex])">
										<view class="cell-summary">
											<text class="cell-head">{{ cellHead(member.slots[slotIndex]) }}</text>
											<view v-if="cellRoleAvatars(member.slots[slotIndex]).length" class="cell-roles">
												<image
													v-for="(role, roleIndex) in cellRoleAvatars(member.slots[slotIndex])"
													:key="roleIndex"
													class="cell-role-avatar"
													:src="role.image_url || ''"
													mode="aspectFill"
												/>
											</view>
										</view>
									</template>
									<template v-else>{{ cellText(member.slots[slotIndex]) }}</template>
								</view>
							</view>
							<view
								v-for="slotIndex in VERTICAL_RETURN_SLOTS"
								:key="`${member.uid}-return-${slotIndex}`"
								class="boss-cell return-cell"
							>
								<text class="return-tag">返还</text>
								<view
									class="boss-select"
									:class="cellClass(member.slots[slotIndex])"
									:title="cellTitle(member.slots[slotIndex])"
									@click="openPicker(member, member.slots[slotIndex])"
								>
									<template v-if="cellFilled(member.slots[slotIndex])">
										<view class="cell-summary">
											<text class="cell-head">{{ cellHead(member.slots[slotIndex]) }}</text>
											<view v-if="cellRoleAvatars(member.slots[slotIndex]).length" class="cell-roles">
												<image
													v-for="(role, roleIndex) in cellRoleAvatars(member.slots[slotIndex])"
													:key="roleIndex"
													class="cell-role-avatar"
													:src="role.image_url || ''"
													mode="aspectFill"
												/>
											</view>
										</view>
									</template>
									<template v-else>{{ cellText(member.slots[slotIndex]) }}</template>
								</view>
							</view>
						</view>
					</template>
				</view>
			</view>
		</view>

		<view v-else class="player-empty">当前月份暂无成员排刀数据</view>

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
import { computed, onBeforeUnmount, ref } from 'vue';
import GuildTeamPickerModal from './GuildTeamPickerModal.vue';
import { saveGuildScheduleMember } from '../api/guild';
import { errorMessage } from '../api/errors';
import type {
	GuildSchedule,
	GuildScheduleMember,
	GuildScheduleSlot,
	GuildScheduleTeamSnapshot,
	Team,
	TeamRole,
} from '../api/types';
import { stageName, teamSummary } from '../utils/guild';
import {
	HORIZONTAL_HEADERS,
	HORIZONTAL_SLOT_ORDER,
	VERTICAL_BASE_SLOTS,
	VERTICAL_HEADERS,
	VERTICAL_RETURN_SLOTS,
} from '../utils/clanSchedule';

type SlotKey =
	| 'team_1'
	| 'team_2'
	| 'team_3'
	| 'team_1_return'
	| 'team_2_return'
	| 'team_3_return';

interface GuildScheduleRow {
	uid: number;
	nickname: string | null;
	role_name: string;
	member_slot: number;
	version: number;
	can_edit: boolean;
	slots: GuildScheduleSlot[];
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';
type PlayerLayout = 'horizontal' | 'vertical';

const props = defineProps<{
	schedule: GuildSchedule;
	viewerUid: number;
	guildId: number;
}>();

const emit = defineEmits<{
	(event: 'updated', schedule: GuildSchedule): void;
	(event: 'reload'): void;
}>();

const GST_LAYOUT_KEY = 'pcr.guild-schedule.layout';
const SLOT_INDEX_KEYS: SlotKey[] = [
	'team_1',
	'team_2',
	'team_3',
	'team_1_return',
	'team_2_return',
	'team_3_return',
];
const CN_NUMBERS = ['一', '二', '三'];
const SAVED_RESET_MS = 2000;

const layout = ref<PlayerLayout>(readStoredLayout());
const saveState = ref<SaveState>('idle');
const pickerVisible = ref(false);
const activeRow = ref<GuildScheduleRow | null>(null);
const activeSlot = ref<GuildScheduleSlot | null>(null);

let savedTimer: ReturnType<typeof setTimeout> | null = null;

const effectiveLayout = computed<PlayerLayout>(() => layout.value);
const saving = computed(() => saveState.value === 'saving');
const saveStateText = computed(() => {
	if (saveState.value === 'saving') return '保存中…';
	if (saveState.value === 'error') return '保存失败，已刷新数据';
	if (saveState.value === 'saved') return '已保存';
	if (!props.schedule.is_current_month) return '历史月份只读';
	if (!canManage.value) return '仅会长/副会长可编辑';
	return '点选即存';
});

const canManage = computed(() => !!props.schedule.permissions?.can_edit_others);

const tableRows = computed<GuildScheduleRow[]>(() => (
	props.schedule.members.map((member) => ({
		uid: member.uid,
		nickname: member.nickname,
		role_name: member.role_name,
		member_slot: member.member_slot,
		version: member.version,
		can_edit: member.can_edit,
		slots: normalizeSlots(member),
	}))
));

const pickerTitle = computed(() => {
	const slot = activeSlot.value;
	if (!slot) return '选择作业';
	const name = activeRow.value ? memberLabel(activeRow.value) : '成员';
	return `${name} · ${slotHeader(slot)}`;
});

onBeforeUnmount(() => {
	clearSavedTimer();
});

function readStoredLayout(): PlayerLayout {
	try {
		const stored = uni.getStorageSync(GST_LAYOUT_KEY);
		if (stored === 'horizontal' || stored === 'vertical') {
			return stored;
		}
	} catch {
		// Ignore local storage failures and fall back to the default layout.
	}
	return 'horizontal';
}

function setLayout(value: PlayerLayout): void {
	if (layout.value === value) return;
	layout.value = value;
	try {
		uni.setStorageSync(GST_LAYOUT_KEY, value);
	} catch {
		// Layout persistence is optional; the current selection still applies.
	}
}

function emptySlot(
	key: SlotKey,
	position: number,
	kind: 'main' | 'return',
): GuildScheduleSlot {
	return {
		key,
		kind,
		position,
		team_id: null,
		team: null,
		deleted: false,
		editable: false,
		return_editable: false,
	};
}

function normalizeSlots(member: GuildScheduleMember): GuildScheduleSlot[] {
	const byKey = new Map<string, GuildScheduleSlot>();
	member.slots.forEach((slot) => {
		byKey.set(slot.key, slot);
	});

	return SLOT_INDEX_KEYS.map((key, index) => (
		byKey.get(key)
			?? emptySlot(key, (index % 3) + 1, index < 3 ? 'main' : 'return')
	));
}

function memberLabel(member: GuildScheduleRow): string {
	return member.nickname || `UID ${member.uid}`;
}

function slotHeader(slot: GuildScheduleSlot): string {
	const base = `${CN_NUMBERS[slot.position - 1] || slot.position}刀`;
	return slot.kind === 'return' ? `${base}返还` : base;
}

function cellLabel(team: GuildScheduleTeamSnapshot): string {
	const stage = stageName(Number(team.stage)).replace('阶段', '');
	return `${stage}${Number(team.boss)}`;
}

function cellText(slot: GuildScheduleSlot): string {
	if (slot.team_id === null) {
		return slot.editable ? '空白' : '—';
	}
	if (slot.deleted || !slot.team) return '已删除';
	return '';
}

function cellFilled(slot: GuildScheduleSlot): boolean {
	return !!slot.team
		&& slot.team_id !== null
		&& !slot.deleted
		&& !!slot.team.team;
}

function cellHead(slot: GuildScheduleSlot): string {
	if (!slot.team) return '';
	return cellLabel(slot.team);
}

function cellRoleAvatars(slot: GuildScheduleSlot): TeamRole[] {
	if (!slot.team || !Array.isArray(slot.team.team)) return [];
	return slot.team.team;
}

function cellClass(slot: GuildScheduleSlot): Record<string, boolean> {
	const deleted = slot.team_id !== null && (slot.deleted || !slot.team);
	const filled = slot.team_id !== null && !deleted;
	return {
		'is-clickable': slot.editable && canManage.value,
		'is-locked': !slot.editable || !canManage.value,
		'state-empty': slot.team_id === null,
		'state-deleted': deleted,
		'state-filled': filled,
		'is-multiline': filled,
	};
}

function cellTitle(slot: GuildScheduleSlot): string {
	if (slot.team) return teamSummary(slot.team);
	return slot.team_id === null ? '' : '作业已删除';
}

function openPicker(member: GuildScheduleRow, slot: GuildScheduleSlot): void {
	if (!canManage.value || !slot.editable || saving.value) return;
	activeRow.value = member;
	activeSlot.value = slot;
	pickerVisible.value = true;
}

function closePicker(): void {
	pickerVisible.value = false;
	activeRow.value = null;
	activeSlot.value = null;
}

function handleSelect(team: Team): Promise<void> {
	return persistSlot(Number(team.id));
}

function handleClear(): Promise<void> {
	return persistSlot(null);
}

function clearSavedTimer(): void {
	if (savedTimer !== null) {
		clearTimeout(savedTimer);
		savedTimer = null;
	}
}

async function persistSlot(teamId: number | null): Promise<void> {
	const member = activeRow.value;
	const slot = activeSlot.value;
	if (!member || !slot || saving.value) return;

	clearSavedTimer();
	saveState.value = 'saving';
	const key = slot.key as SlotKey;

	try {
		const next = await saveGuildScheduleMember(props.guildId, member.uid, {
			version: member.version,
			month: props.schedule.month,
			[key]: teamId,
		});
		emit('updated', next);
		closePicker();
		saveState.value = 'saved';
		savedTimer = setTimeout(() => {
			if (saveState.value === 'saved') {
				saveState.value = 'idle';
			}
		}, SAVED_RESET_MS);
	} catch (error) {
		closePicker();
		saveState.value = 'error';
		uni.showToast({ title: errorMessage(error, '保存失败'), icon: 'none' });
		emit('reload');
	}
}
</script>

<style scoped>
.guild-schedule-table {
	width: 100%;
}

.gst-bar {
	margin-bottom: 10px;
	padding: 8px 11px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
	flex-wrap: wrap;
	border: 1px solid var(--border-default);
	border-radius: 8px;
	background: var(--bg-panel-soft);
}

.save-state {
	min-height: 29px;
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
	animation: gst-save-pulse 1s ease-in-out infinite;
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

.layout-horizontal .player-grid {
	--gst-columns: 58px minmax(84px, 0.9fr) repeat(6, minmax(104px, 1fr));
}

.layout-vertical .player-grid {
	min-width: 540px;
	--gst-columns: 54px minmax(76px, 0.9fr) repeat(3, minmax(96px, 1fr));
}

.ptable-head,
.h-row {
	display: grid;
	grid-template-columns: var(--gst-columns);
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

.name-head {
	justify-content: flex-start;
	padding-left: 10px;
}

.h-row {
	height: 42px;
	border-top: 1px solid var(--border-subtle);
	background: var(--bg-panel-soft);
	transition: background 0.16s ease, box-shadow 0.16s ease;
}

.h-row:nth-child(odd),
.v-group:nth-child(odd) {
	background: var(--bg-panel-soft-alt);
}

.v-group {
	display: grid;
	grid-template-columns: var(--gst-columns);
	grid-template-rows: 42px 42px;
	height: 86px;
	border-top: 1px solid var(--border-subtle);
	background: var(--bg-panel-soft);
	transition: background 0.16s ease, box-shadow 0.16s ease;
}

.h-row.is-self,
.v-group.is-self {
	box-shadow: inset 3px 0 0 var(--accent);
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
	justify-content: center;
	color: var(--text-muted);
	font-size: 12px;
	font-weight: 800;
}

.seq-number {
	min-width: 12px;
	text-align: center;
}

.name-cell {
	flex-direction: column;
	align-items: flex-start;
	justify-content: center;
	gap: 3px;
	padding: 0 9px;
}

.member-name {
	max-width: 100%;
	min-width: 0;
	display: flex;
	align-items: center;
	gap: 6px;
}

.member-nickname {
	min-width: 0;
	overflow: hidden;
	color: var(--text-primary);
	font-size: 12px;
	font-weight: 800;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.member-self-tag {
	flex: 0 0 auto;
	padding: 0 5px;
	border-radius: 4px;
	background: var(--accent-soft);
	color: var(--accent-text);
	font-size: 10px;
	font-weight: 700;
}

.member-meta {
	max-width: 100%;
	display: flex;
	align-items: center;
	gap: 8px;
	overflow: hidden;
	color: var(--text-faint);
	font-size: 10px;
	white-space: nowrap;
}

.merged-cell {
	grid-row: 1 / span 2;
	border-bottom: 0;
}

.boss-cell {
	position: relative;
	padding: 3px 5px;
	justify-content: center;
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
	padding: 3px 6px;
	align-items: flex-start;
	justify-content: center;
	flex-direction: column;
	text-align: left;
	white-space: normal;
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
	gap: 2px;
	overflow: hidden;
}

.cell-role-avatar {
	height: 18px;
	flex: 1 1 18px;
	min-width: 0;
	border: 1px solid rgba(83, 190, 255, 0.35);
	border-radius: 4px;
	background: var(--bg-subtle);
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

.player-empty {
	margin-top: 10px;
	padding: 26px 14px;
	border: 1px dashed var(--border-default);
	border-radius: 8px;
	background: var(--bg-panel-soft);
	color: var(--text-muted);
	font-size: 12px;
	text-align: center;
}

.is-disabled {
	opacity: 0.82;
}

@keyframes gst-save-pulse {
	0%,
	100% {
		opacity: 1;
	}

	50% {
		opacity: 0.35;
	}
}

@media screen and (max-width: 1200px) {
	.layout-horizontal .player-grid {
		--gst-columns: 54px minmax(74px, 0.9fr) repeat(6, minmax(94px, 1fr));
	}
}

@media screen and (max-width: 700px) {
	.player-table-scroll {
		max-height: 64vh;
		min-height: 280px;
		border-radius: 7px;
	}

	.player-grid,
	.layout-vertical .player-grid {
		min-width: 0;
	}

	.layout-vertical .player-grid {
		--gst-columns: 42px minmax(56px, 0.9fr) repeat(3, minmax(64px, 1fr));
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
		grid-template-rows: 38px 38px;
		height: 78px;
	}

	.seq-cell {
		font-size: 10px;
	}

	.name-cell {
		gap: 2px;
		padding: 0 5px;
	}

	.member-nickname {
		font-size: 11px;
	}

	.member-meta {
		gap: 5px;
		font-size: 9px;
	}

	.boss-cell {
		padding: 2px 3px;
	}

	.boss-select {
		min-height: 28px;
		padding: 0 2px;
		font-size: 10px;
	}

	.boss-select.is-multiline {
		min-height: 32px;
		padding: 2px 5px;
	}

	.cell-head {
		font-size: 10px;
	}

	.return-tag {
		top: 1px;
		left: 3px;
		font-size: 7px;
	}
}
</style>
