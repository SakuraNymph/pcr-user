<template>
	<view class="guild-schedule-table">
		<view class="gst-table-scroll">
			<view class="gst-table">
				<view class="gst-row gst-head">
					<view class="gst-name-head">成员</view>
					<view
						v-for="(label, index) in SLOT_HEADERS"
						:key="index"
						class="gst-cell-head"
					>{{ label }}</view>
				</view>

				<view
					v-for="member in members"
					:key="member.uid"
					class="gst-row"
					:class="{ 'is-self': member.uid === viewerUid }"
				>
					<view class="gst-name-cell">
						<view class="gst-name">
							<text class="gst-nickname">{{ member.nickname || `UID ${member.uid}` }}</text>
							<text v-if="member.uid === viewerUid" class="gst-self-tag">我</text>
						</view>
						<view class="gst-meta">
							<text class="gst-uid">UID {{ member.uid }}</text>
							<text class="gst-role">{{ member.role_name }}</text>
						</view>
					</view>

					<view
						v-for="slot in member.slots"
						:key="slot.key"
						class="gst-cell"
						:class="[`state-${cellState(slot)}`, { clickable: isCellClickable(slot) }]"
						@click="openPicker(member, slot)"
					>
						<text class="gst-cell-text">{{ cellText(slot) }}</text>
					</view>
				</view>

				<view v-if="!members.length" class="gst-empty">当前月份暂无成员排刀数据</view>
			</view>
		</view>

		<view v-if="saving" class="gst-saving">正在保存...</view>

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
import { computed, ref } from "vue";
import GuildTeamPickerModal from "./GuildTeamPickerModal.vue";
import { saveGuildScheduleMember } from "../api/guild";
import { errorMessage } from "../api/errors";
import type {
	GuildSchedule,
	GuildScheduleMember,
	GuildScheduleSlot,
	Team,
} from "../api/types";
import { stageName } from "../utils/guild";

const props = defineProps<{
	schedule: GuildSchedule;
	viewerUid: number;
	guildId: number;
}>();

const emit = defineEmits<{
	(event: "updated", schedule: GuildSchedule): void;
	(event: "reload"): void;
}>();

const SLOT_HEADERS = [
	"第一刀",
	"第一刀返还",
	"第二刀",
	"第二刀返还",
	"第三刀",
	"第三刀返还",
];

const members = computed<GuildScheduleMember[]>(() => props.schedule.members);

const saving = ref(false);
const pickerVisible = ref(false);
const activeMember = ref<GuildScheduleMember | null>(null);
const activeSlot = ref<GuildScheduleSlot | null>(null);

const pickerTitle = computed(() => {
	const slot = activeSlot.value;
	if (!slot) return "选择作业";
	const name = activeMember.value?.nickname || "成员";
	const header = SLOT_HEADERS[slot.position - 1] || "作业";
	return `${name} · ${header}`;
});

function cellState(slot: GuildScheduleSlot): "empty" | "filled" | "deleted" | "locked" {
	if (!slot.editable) return "locked";
	if (slot.team_id === null) return "empty";
	if (slot.deleted) return "deleted";
	return "filled";
}

function isCellClickable(slot: GuildScheduleSlot): boolean {
	return slot.editable;
}

function cellText(slot: GuildScheduleSlot): string {
	if (slot.editable === false) {
		return slot.team_id === null ? "—" : (slot.deleted ? "作业已删除" : teamLabel(slot.team));
	}
	if (slot.team_id === null) return "空白";
	if (slot.deleted) return "作业已删除";
	return teamLabel(slot.team);
}

function teamLabel(team: Team | null): string {
	if (!team) return "作业已删除";
	const stage = stageName(Number(team.stage)).replace("阶段", "");
	return `${stage}${Number(team.boss)}`;
}

function openPicker(member: GuildScheduleMember, slot: GuildScheduleSlot): void {
	if (!slot.editable) return;
	activeMember.value = member;
	activeSlot.value = slot;
	pickerVisible.value = true;
}

function closePicker(): void {
	pickerVisible.value = false;
	activeMember.value = null;
	activeSlot.value = null;
}

async function handleSelect(team: Team): Promise<void> {
	await persistSlot(Number(team.id));
}

async function handleClear(): Promise<void> {
	await persistSlot(null);
}

async function persistSlot(teamId: number | null): Promise<void> {
	const member = activeMember.value;
	const slot = activeSlot.value;
	if (!member || !slot || saving.value) return;

	saving.value = true;
	const key = slot.key as "team_1" | "team_1_return" | "team_2" | "team_2_return" | "team_3" | "team_3_return";

	try {
		const next = await saveGuildScheduleMember(props.guildId, member.uid, {
			version: member.version,
			month: props.schedule.month,
			[key]: teamId,
		});
		emit("updated", next);
		closePicker();
	} catch (error) {
		closePicker();
		uni.showToast({ title: errorMessage(error, "保存失败"), icon: "none" });
		emit("reload");
	} finally {
		saving.value = false;
	}
}
</script>

<style scoped>
.guild-schedule-table {
	width: 100%;
}

.gst-table-scroll {
	width: 100%;
	overflow-x: auto;
	border: 1px solid var(--border-default);
	border-radius: 9px;
	background: var(--bg-panel-soft);
	-webkit-overflow-scrolling: touch;
}

.gst-table {
	min-width: 640px;
}

.gst-row {
	display: grid;
	grid-template-columns: minmax(160px, 1.4fr) repeat(6, minmax(88px, 1fr));
	border-top: 1px solid var(--border-subtle);
	background: var(--bg-panel-soft);
}

.gst-row:first-child {
	border-top: 0;
}

.gst-head {
	position: sticky;
	top: 0;
	z-index: 3;
	min-height: 44px;
	background: var(--table-header);
	color: var(--text-secondary);
	font-size: 11px;
	font-weight: 800;
}

.gst-name-head,
.gst-cell-head {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0 8px;
	border-right: 1px solid var(--border-subtle);
	text-align: center;
}

.gst-name-head {
	justify-content: flex-start;
	padding-left: 12px;
}

.gst-name-cell {
	display: flex;
	flex-direction: column;
	justify-content: center;
	gap: 4px;
	padding: 0 12px;
	border-right: 1px solid var(--border-subtle);
}

.gst-name {
	display: flex;
	align-items: center;
	gap: 6px;
	min-width: 0;
}

.gst-nickname {
	color: var(--text-primary);
	font-size: 13px;
	font-weight: 800;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.gst-self-tag {
	flex: 0 0 auto;
	padding: 0 5px;
	border-radius: 4px;
	background: var(--accent-soft);
	color: var(--accent-text);
	font-size: 10px;
	font-weight: 700;
}

.gst-meta {
	display: flex;
	align-items: center;
	gap: 8px;
	color: var(--text-faint);
	font-size: 10px;
}

.gst-role {
	color: var(--text-muted);
}

.gst-cell {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0 6px;
	min-height: 46px;
	border-right: 1px solid var(--border-subtle);
}

.gst-cell:last-child {
	border-right: 0;
}

.gst-cell.clickable {
	cursor: pointer;
	transition: background 0.16s ease;
}

.gst-cell.clickable:hover {
	background: var(--bg-hover);
}

.gst-cell-text {
	font-size: 12px;
	font-weight: 700;
	text-align: center;
}

.state-empty .gst-cell-text {
	color: var(--text-faint);
	font-weight: 400;
}

.state-filled .gst-cell-text {
	color: var(--accent-text);
}

.state-deleted .gst-cell-text {
	color: var(--warning);
	font-size: 11px;
}

.state-locked {
	background: rgba(0, 0, 0, 0.14);
}

.state-locked .gst-cell-text {
	color: var(--text-faint);
	font-weight: 400;
}

.gst-empty {
	padding: 30px 12px;
	text-align: center;
	color: var(--text-muted);
	font-size: 12px;
}

.gst-saving {
	margin-top: 10px;
	padding: 8px 10px;
	border-radius: 6px;
	border: 1px solid var(--accent);
	background: var(--accent-soft);
	color: var(--accent-text);
	font-size: 11px;
	text-align: center;
}

@media screen and (max-width: 700px) {
	.gst-table {
		min-width: 560px;
	}

	.gst-head {
		font-size: 10px;
	}

	.gst-cell,
	.gst-name-cell {
		padding: 0 5px;
	}

	.gst-cell-text {
		font-size: 11px;
	}
}
</style>
