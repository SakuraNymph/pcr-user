<template>
	<view class="team-picker-mask" @click="close" @touchmove.stop.prevent>
		<view class="team-picker-modal" role="dialog" aria-modal="true" aria-label="选择公会排刀作业" @click.stop>
			<view class="team-picker-header">
				<view>
					<view class="team-picker-title">{{ title }}</view>
					<view class="team-picker-subtitle">B / C / D 阶段系统作业，点击后立即保存</view>
				</view>
				<view class="team-picker-close" @click="close">×</view>
			</view>

			<view class="team-picker-toolbar">
				<view class="stage-tabs">
					<view
						v-for="stage in stages"
						:key="stage.stage"
						class="stage-tab"
						:class="{ active: selectedStage === stage.stage }"
						@click="selectedStage = stage.stage"
					>
						{{ stage.name }}
					</view>
				</view>

				<view class="boss-tabs">
					<view
						class="boss-tab"
						:class="{ active: selectedBoss === 0 }"
						@click="selectedBoss = 0"
					>全部</view>
					<view
						v-for="boss in [1, 2, 3, 4, 5]"
						:key="boss"
						class="boss-tab"
						:class="{ active: selectedBoss === boss }"
						@click="selectedBoss = boss"
					>{{ boss }}王</view>
				</view>
			</view>

			<view class="team-picker-body">
				<view v-if="loading" class="picker-state">正在加载作业...</view>
				<view v-else-if="errorText" class="picker-state error">
					<text>{{ errorText }}</text>
					<view class="picker-retry" @click="loadOptions">重新加载</view>
				</view>
				<view v-else-if="!filteredTeams.length" class="picker-state">
					当前阶段和 BOSS 暂无可用作业
				</view>
				<view v-else class="team-option-list">
					<view
						v-for="team in filteredTeams"
						:key="team.id"
						class="team-option"
						@click="emit('select', team)"
					>
						<TeamCard
							:team="team"
							:added="false"
							:show-action="false"
							:roles-interactive="false"
						/>
					</view>
				</view>
			</view>

			<view class="team-picker-footer">
				<view
					v-if="allowClear"
					class="picker-footer-button danger"
					@click="emit('clear')"
				>清空此位置</view>
				<view class="picker-footer-button" @click="close">取消</view>
			</view>
		</view>
	</view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import TeamCard from './TeamCard.vue';
import { getGuildTeamOptions } from '../api/guild';
import { errorMessage } from '../api/errors';
import type { GuildTeamOptionStage, Team } from '../api/types';

const props = withDefaults(defineProps<{
	guildId: number;
	title?: string;
	allowClear?: boolean;
}>(), {
	title: '选择作业',
	allowClear: false,
});

const emit = defineEmits<{
	(event: 'close'): void;
	(event: 'select', team: Team): void;
	(event: 'clear'): void;
}>();

const loading = ref(true);
const errorText = ref('');
const teams = ref<Team[]>([]);
const stages = ref<GuildTeamOptionStage[]>([
	{ stage: 2, name: 'B阶段' },
	{ stage: 3, name: 'C阶段' },
	{ stage: 4, name: 'D阶段' },
]);
const selectedStage = ref<2 | 3 | 4>(2);
const selectedBoss = ref(0);

const filteredTeams = computed(() => teams.value.filter((team) => (
	Number(team.stage) === selectedStage.value
	&& (selectedBoss.value === 0 || Number(team.boss) === selectedBoss.value)
)));

onMounted(() => {
	void loadOptions();
});

async function loadOptions(): Promise<void> {
	loading.value = true;
	errorText.value = '';

	try {
		const result = await getGuildTeamOptions(props.guildId);
		teams.value = result.teams;
		if (result.stages.length) {
			stages.value = result.stages;
			selectedStage.value = result.stages[0].stage;
		}
	} catch (error) {
		errorText.value = errorMessage(error, '获取作业选项失败');
	} finally {
		loading.value = false;
	}
}

function close(): void {
	emit('close');
}
</script>

<style scoped>
.team-picker-mask {
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

.team-picker-modal {
	width: min(980px, calc(100vw - 36px));
	height: min(86vh, 820px);
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

.team-picker-header {
	min-height: 64px;
	padding: 12px 18px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 14px;
	border-bottom: 1px solid var(--border-subtle);
}

.team-picker-title {
	color: var(--text-primary);
	font-size: 18px;
	font-weight: 800;
}

.team-picker-subtitle {
	margin-top: 5px;
	color: var(--text-muted);
	font-size: 12px;
}

.team-picker-close {
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

.team-picker-toolbar {
	padding: 10px 14px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	flex-wrap: wrap;
	gap: 9px;
	border-bottom: 1px solid var(--border-subtle);
	background: var(--bg-panel-alt);
}

.stage-tabs,
.boss-tabs {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 5px;
}

.stage-tab,
.boss-tab {
	min-height: 31px;
	padding: 0 11px;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1px solid var(--border-default);
	border-radius: 6px;
	background: var(--bg-panel-soft);
	color: var(--text-muted);
	font-size: 12px;
	cursor: pointer;
}

.stage-tab.active,
.boss-tab.active {
	border-color: var(--accent);
	background: var(--accent-soft-strong);
	color: var(--accent-text);
	font-weight: 700;
}

.team-picker-body {
	min-height: 0;
	flex: 1;
	padding: 12px;
	overflow-y: auto;
}

.team-option-list {
	display: flex;
	flex-direction: column;
	gap: 9px;
}

.team-option {
	border-radius: 9px;
	cursor: pointer;
	transition: transform 0.15s ease, filter 0.15s ease;
}

.team-option:hover {
	filter: brightness(1.08);
	transform: translateY(-1px);
}

.picker-state {
	min-height: 260px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 11px;
	color: var(--text-muted);
	font-size: 13px;
}

.picker-state.error {
	color: var(--danger);
}

.picker-retry {
	min-height: 34px;
	padding: 0 13px;
	display: flex;
	align-items: center;
	border: 1px solid var(--border-default);
	border-radius: 6px;
	background: var(--bg-panel-soft);
	color: var(--accent-text);
	cursor: pointer;
}

.team-picker-footer {
	padding: 12px 16px;
	display: flex;
	justify-content: flex-end;
	gap: 9px;
	border-top: 1px solid var(--border-subtle);
	background: var(--bg-panel-alt);
}

.picker-footer-button {
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
	cursor: pointer;
}

.picker-footer-button.danger {
	border-color: rgba(240, 106, 115, 0.45);
	background: var(--danger-soft);
	color: var(--danger);
}

@media screen and (max-width: 700px) {
	.team-picker-mask {
		padding: 8px;
	}

	.team-picker-modal {
		width: 100%;
		height: 92vh;
	}

	.team-picker-toolbar {
		align-items: flex-start;
		flex-direction: column;
	}

	.team-picker-body {
		padding: 8px;
	}
}
</style>
