<template>
	<view class="copy-mask" @click="close" @touchmove.stop.prevent>
		<view
			class="copy-modal"
			role="dialog"
			aria-modal="true"
			aria-label="复制成员排刀"
			@click.stop
		>
			<view class="copy-header">
				<view>
					<view class="copy-title">复制排刀</view>
					<view class="copy-subtitle">将来源成员的 6 刀作业原样复制到目标成员</view>
				</view>
				<view class="copy-close" @click="close">×</view>
			</view>

			<view class="copy-body" @touchmove.stop>
				<view class="member-pickers">
					<view class="member-field">
						<text class="field-label">来源成员</text>
						<view
							class="member-value"
							@click="toggleSourceDropdown"
						>
							<text>{{ sourceLabel }}</text>
							<text class="member-arrow">▾</text>
						</view>
						<view
							v-if="sourceDropdownOpen"
							class="member-dropdown"
						>
							<view
								v-for="(member, index) in members"
								:key="member.uid"
								class="member-option"
								:class="{ active: index === sourceIndex }"
								@click="selectSource(index)"
							>{{ memberLabel(member) }}</view>
						</view>
					</view>

					<view class="transfer-icon">→</view>

					<view class="member-field">
						<text class="field-label">目标成员</text>
						<view
							class="member-value"
							@click="toggleTargetDropdown"
						>
							<text>{{ targetLabel }}</text>
							<text class="member-arrow">▾</text>
						</view>
						<view
							v-if="targetDropdownOpen"
							class="member-dropdown"
						>
							<view
								v-for="(member, index) in targetMembers"
								:key="member.uid"
								class="member-option"
								:class="{ active: index === targetIndex }"
								@click="selectTarget(index)"
							>{{ memberLabel(member) }}</view>
							<view v-if="!targetMembers.length" class="member-option disabled">
								无可复制目标
							</view>
						</view>
					</view>
				</view>

				<view v-if="sourceWarning" class="empty-warning">
					来源成员当前没有排刀数据，无法复制。
				</view>

				<view class="preview">
					<view class="preview-title">来源成员排刀预览</view>
					<view
						v-for="(row, rowIndex) in previewRows"
						:key="rowIndex"
						class="preview-row"
					>
						<view
							v-for="slot in row"
							:key="slot.key"
							class="preview-cell"
						>
							<text class="preview-slot-name">{{ slotName(slot) }}</text>
							<template v-if="cellFilled(slot)">
								<text class="preview-team-label">{{ cellMeta(slot) }}</text>
								<view class="preview-roles">
									<template
										v-for="(role, roleIndex) in cellRoleSlots(slot)"
										:key="roleIndex"
									>
										<image
											v-if="role"
											class="preview-role-avatar"
											:src="role.image_url || ''"
											mode="aspectFill"
										/>
										<view v-else class="preview-role-seat" />
									</template>
								</view>
							</template>
							<text
								v-else
								class="preview-slot-value"
								:class="{ empty: slot.team_id === null }"
							>{{ slotText(slot) }}</text>
						</view>
					</view>
				</view>
			</view>

			<view class="copy-footer">
				<view class="copy-footer-button" @click="close">取消</view>
				<view
					class="copy-footer-button primary"
					:class="{ disabled: !canCopy }"
					@click="confirmCopy"
				>{{ saving ? '复制中…' : '确认复制' }}</view>
			</view>
		</view>
	</view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { copyGuildScheduleMember } from '../api/guild';
import { errorMessage } from '../api/errors';
import type {
	GuildSchedule,
	GuildScheduleMember,
	GuildScheduleSlot,
	TeamRole,
} from '../api/types';
import { stageName } from '../utils/guild';

const props = defineProps<{
	schedule: GuildSchedule;
	guildId: number;
}>();

const emit = defineEmits<{
	(event: 'close'): void;
	(event: 'updated', schedule: GuildSchedule): void;
}>();

const CN_NUMBERS = ['一', '二', '三'];

const sourceIndex = ref(0);
const targetIndex = ref(0);
const saving = ref(false);
const sourceDropdownOpen = ref(false);
const targetDropdownOpen = ref(false);

const members = computed<GuildScheduleMember[]>(() => props.schedule.members);

const sourceMember = computed(() => members.value[sourceIndex.value] ?? null);

const targetMembers = computed(() => (
	members.value.filter((member) => (
		!sourceMember.value || member.uid !== sourceMember.value.uid
	))
));

const targetMember = computed(() => (
	targetMembers.value[targetIndex.value] ?? null
));

const sourceLabel = computed(() => (
	sourceMember.value ? memberLabel(sourceMember.value) : '无成员'
));

const targetLabel = computed(() => (
	targetMember.value ? memberLabel(targetMember.value) : '无可复制目标'
));

const previewRows = computed<GuildScheduleSlot[][]>(() => {
	const byKey = new Map<string, GuildScheduleSlot>();
	(sourceMember.value?.slots ?? []).forEach((slot) => {
		byKey.set(slot.key, slot);
	});
	return [
		['team_1', 'team_1_return'],
		['team_2', 'team_2_return'],
		['team_3', 'team_3_return'],
	].map((keys) => keys
		.map((key) => byKey.get(key))
		.filter((slot): slot is GuildScheduleSlot => Boolean(slot)));
});

const sourceHasTeams = computed(() => (
	previewRows.value.some((row) => (
		row.some((slot) => slot.team_id !== null)
	))
));

const sourceWarning = computed(() => (
	Boolean(sourceMember.value) && !sourceHasTeams.value
));

const canCopy = computed(() => (
	Boolean(sourceMember.value)
	&& Boolean(targetMember.value)
	&& sourceHasTeams.value
	&& !saving.value
));

function memberLabel(member: GuildScheduleMember): string {
	return `${member.nickname || `UID ${member.uid}`}（${member.role_name}）`;
}

function slotName(slot: GuildScheduleSlot): string {
	const base = `第${CN_NUMBERS[slot.position - 1] || slot.position}刀`;
	return slot.kind === 'return' ? `${base}返还` : base;
}

function slotText(slot: GuildScheduleSlot): string {
	if (slot.team_id === null) return '空白';
	if (slot.deleted || !slot.team) return '已删除';
	return cellHead(slot);
}

function cellFilled(slot: GuildScheduleSlot): boolean {
	return slot.team_id !== null && !slot.deleted && !!slot.team;
}

function cellHead(slot: GuildScheduleSlot): string {
	if (!slot.team) return '';
	const stage = stageName(Number(slot.team.stage)).replace('阶段', '');
	return `${stage}${Number(slot.team.boss)}王`;
}

function cellRoleSlots(slot: GuildScheduleSlot): Array<TeamRole | null> {
	const roles = slot.team && Array.isArray(slot.team.team)
		? slot.team.team.slice(0, 5)
		: [];
	return [
		...Array.from({ length: Math.max(0, 5 - roles.length) }, () => null),
		...roles,
	];
}

function cellMeta(slot: GuildScheduleSlot): string {
	if (!slot.team) return '';
	return `${stageName(Number(slot.team.stage))} · ${Number(slot.team.boss)}王 · ${cellDamage(slot)}`;
}

function cellDamage(slot: GuildScheduleSlot): string {
	const damage = Number(slot.team?.damage || 0);
	return `${damage.toLocaleString('en-US')} 万`;
}

function toggleSourceDropdown(): void {
	sourceDropdownOpen.value = !sourceDropdownOpen.value;
	targetDropdownOpen.value = false;
}

function toggleTargetDropdown(): void {
	targetDropdownOpen.value = !targetDropdownOpen.value;
	sourceDropdownOpen.value = false;
}

function selectSource(index: number): void {
	if (index < 0 || index >= members.value.length) return;
	sourceIndex.value = index;
	targetIndex.value = 0;
	sourceDropdownOpen.value = false;
}

function selectTarget(index: number): void {
	if (index < 0 || index >= targetMembers.value.length) return;
	targetIndex.value = index;
	targetDropdownOpen.value = false;
}

async function confirmCopy(): Promise<void> {
	if (!canCopy.value) return;
	const source = sourceMember.value;
	const target = targetMember.value;
	if (!source || !target) return;

	saving.value = true;
	try {
		const next = await copyGuildScheduleMember(props.guildId, {
			source_uid: source.uid,
			target_uid: target.uid,
		});
		emit('updated', next);
		emit('close');
	} catch (error) {
		uni.showToast({ title: errorMessage(error, '复制排刀失败'), icon: 'none' });
	} finally {
		saving.value = false;
	}
}

function close(): void {
	emit('close');
}
</script>

<style scoped>
.copy-mask {
	position: fixed;
	z-index: 1450;
	inset: 0;
	padding: 18px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--mask);
	backdrop-filter: blur(4px);
}

.copy-modal {
	width: min(640px, calc(100vw - 36px));
	max-height: 86vh;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	border: 1px solid var(--border-strong);
	border-radius: 12px;
	background:
		radial-gradient(ellipse at 88% 0%, var(--accent-soft), transparent 48%),
		var(--bg-panel);
	box-shadow: 0 26px 80px var(--shadow), 0 0 26px var(--accent-soft);
}

.copy-header {
	min-height: 64px;
	padding: 12px 18px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 14px;
	border-bottom: 1px solid var(--border-subtle);
}

.copy-title {
	color: var(--text-primary);
	font-size: 18px;
	font-weight: 800;
}

.copy-subtitle {
	margin-top: 5px;
	color: var(--text-muted);
	font-size: 12px;
}

.copy-close {
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
	cursor: pointer;
}

.copy-body {
	min-height: 0;
	padding: 14px 18px;
	overflow-y: auto;
	overscroll-behavior: contain;
	-webkit-overflow-scrolling: touch;
}

.member-pickers {
	display: flex;
	align-items: flex-end;
	gap: 12px;
}

.member-field {
	min-width: 0;
	flex: 1;
	position: relative;
}

.field-label {
	display: block;
	margin-bottom: 6px;
	color: var(--text-muted);
	font-size: 11px;
	font-weight: 700;
}

.member-value {
	min-height: 36px;
	padding: 0 11px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	border: 1px solid var(--border-strong);
	border-radius: 7px;
	background: var(--accent-soft);
	color: var(--text-primary);
	font-size: 13px;
	font-weight: 700;
	cursor: pointer;
}

.member-arrow {
	color: var(--text-faint);
	font-size: 12px;
	line-height: 1;
}

.member-dropdown {
	position: absolute;
	top: calc(100% + 5px);
	left: 0;
	right: 0;
	z-index: 12;
	max-height: 220px;
	overflow-y: auto;
	border: 1px solid var(--border-strong);
	border-radius: 8px;
	background: var(--bg-panel);
	box-shadow: 0 14px 40px var(--shadow);
}

.member-option {
	min-height: 36px;
	padding: 0 11px;
	display: flex;
	align-items: center;
	border-bottom: 1px solid var(--border-subtle);
	color: var(--text-secondary);
	font-size: 12px;
	font-weight: 700;
	cursor: pointer;
}

.member-option:last-child {
	border-bottom: 0;
}

.member-option.active {
	background: var(--bg-selected);
	color: var(--accent-text);
}

.member-option.disabled {
	color: var(--text-faint);
	font-weight: 400;
	cursor: not-allowed;
}

.transfer-icon {
	padding-bottom: 4px;
	color: var(--accent-text);
	font-size: 22px;
	line-height: 1;
}

.empty-warning {
	margin-top: 12px;
	padding: 8px 11px;
	border: 1px solid rgba(255, 209, 102, 0.4);
	border-radius: 7px;
	background: rgba(255, 209, 102, 0.08);
	color: var(--warning);
	font-size: 11px;
	line-height: 1.5;
}

.preview {
	margin-top: 14px;
	border: 1px solid var(--border-subtle);
	border-radius: 8px;
	background: var(--bg-panel-soft);
	overflow: hidden;
}

.preview-title {
	padding: 8px 11px;
	border-bottom: 1px solid var(--border-subtle);
	color: var(--text-muted);
	font-size: 11px;
	font-weight: 800;
}

.preview-row {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 7px;
	padding: 10px 10px 0;
}

.preview-row:last-child {
	padding-bottom: 10px;
}

.preview-cell {
	min-width: 0;
	padding: 7px 8px;
	border: 1px solid var(--border-default);
	border-radius: 6px;
	background: var(--bg-panel-alt);
}

.preview-slot-name {
	display: block;
	color: var(--text-faint);
	font-size: 10px;
	font-weight: 700;
}

.preview-team-label {
	display: block;
	margin-top: 4px;
	color: var(--accent-text);
	font-size: 12px;
	font-weight: 800;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.preview-roles {
	margin-top: 5px;
	display: flex;
	align-items: center;
	gap: 3px;
	flex-wrap: nowrap;
}

.preview-role-avatar {
	width: 26px;
	height: 26px;
	flex: 0 0 26px;
	border: 1px solid rgba(83, 190, 255, 0.35);
	border-radius: 5px;
	background: var(--bg-subtle);
}

.preview-role-seat {
	width: 26px;
	height: 26px;
	flex: 0 0 26px;
	box-sizing: border-box;
	border: 1px dashed var(--border-default);
	border-radius: 5px;
	background: var(--bg-panel-soft);
}

.preview-slot-value {
	display: block;
	margin-top: 4px;
	color: var(--accent-text);
	font-size: 12px;
	font-weight: 800;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.preview-slot-value.empty {
	color: var(--text-faint);
	font-weight: 400;
}

.copy-footer {
	padding: 12px 16px;
	display: flex;
	justify-content: flex-end;
	gap: 9px;
	border-top: 1px solid var(--border-subtle);
	background: var(--bg-panel-alt);
}

.copy-footer-button {
	min-width: 96px;
	min-height: 36px;
	padding: 0 14px;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1px solid var(--border-default);
	border-radius: 7px;
	background: var(--bg-panel-soft);
	color: var(--text-secondary);
	font-size: 13px;
	font-weight: 700;
	cursor: pointer;
}

.copy-footer-button.primary {
	border-color: var(--accent);
	background: linear-gradient(180deg, var(--accent-strong), var(--accent));
	color: #fff;
}

.copy-footer-button.primary.disabled {
	opacity: 0.45;
	cursor: not-allowed;
}

@media screen and (max-width: 560px) {
	.copy-mask {
		padding: 8px;
	}

	.copy-modal {
		width: 100%;
		max-height: 92vh;
	}

	.member-pickers {
		flex-direction: column;
		align-items: stretch;
	}

	.transfer-icon {
		display: none;
	}

	.preview-row {
		gap: 6px;
		padding: 8px 8px 0;
	}

	.preview-row:last-child {
		padding-bottom: 8px;
	}

	.preview-cell {
		padding: 5px;
	}

	.preview-team-label {
		font-size: 10px;
	}

	.preview-roles {
		gap: 2px;
	}

	.preview-role-avatar,
	.preview-role-seat {
		width: auto;
		height: 24px;
		flex: 1 1 0;
		min-width: 0;
		max-width: 24px;
	}
}
</style>
