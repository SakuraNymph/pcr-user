<template>
	<view class="three-set-page">
			<view class="three-set-filter-panel">
				<view class="six-set-filter-body">
		<!-- BOSS 两组并排 -->
		<view class="six-set-boss-section">
			<view class="six-set-boss-groups">
				<view class="six-set-boss-group" v-for="group in bossFilterGroups" :key="group.key">
					<view class="three-set-boss-group-title">{{ group.label }}</view>
					<view class="three-set-boss-filters">
						<view v-for="(selectedBoss, rowIndex) in group.selectedBosses" :key="rowIndex" class="three-set-boss-row">
							<view class="three-set-boss-options">
								<view v-for="boss in bosses" :key="boss.sort"
									  class="three-set-boss-option"
									  :class="{ selected: selectedBoss === boss.sort }"
									  @click="toggleBoss(group.key, rowIndex, boss.sort)"
									  @keydown.enter.prevent="toggleBoss(group.key, rowIndex, boss.sort)"
									  @keydown.space.prevent="toggleBoss(group.key, rowIndex, boss.sort)">
									<image v-if="boss.file_path && !failedBossImages.includes(boss.sort)"
										   class="three-set-boss-thumb"
										   :src="boss.file_path"
										   mode="aspectFill"
										   @error="markBossImageFailed(boss.sort)" />
									<view v-else class="three-set-boss-thumb three-set-boss-placeholder">BOSS {{ boss.sort }}</view>
								</view>
							</view>
						</view>
					</view>
				</view>
			</view>
		</view>

		<!-- 三组筛选项横向排列 -->
		<view class="six-set-filter-options">
			<view class="three-set-filter-bottom">
				<view class="three-set-filter-group three-set-mode-filter">
					<view class="three-set-filter-label">作业模式</view>
					<view class="three-set-choice-list">
						<view v-for="mode in modeOptions" :key="mode.value"
							  class="three-set-choice"
							  :class="[{ active: selectedMode === mode.value }, 'mode-choice-' + mode.value]"
							  @click="toggleMode(mode.value)"
							  @keydown.enter.prevent="toggleMode(mode.value)"
							  @keydown.space.prevent="toggleMode(mode.value)">
							{{ mode.label }}
						</view>
					</view>
				</view>

				<view class="three-set-filter-group three-set-stage-filter">
					<view class="three-set-filter-label">阶段</view>
					<view class="three-set-choice-list">
						<view v-for="opt in stageOptions" :key="opt.value"
							  class="three-set-choice"
							  :class="{ active: selectedStage === opt.value }"
							  @click="selectStage(opt.value)"
							  @keydown.enter.prevent="selectStage(opt.value)"
							  @keydown.space.prevent="selectStage(opt.value)">
							{{ opt.label }}
						</view>
					</view>
				</view>

				<view class="three-set-filter-group three-set-attack-filter">
					<view class="three-set-filter-label">攻击类型</view>
					<view class="three-set-choice-list">
						<view v-for="option in attackOptions" :key="option.value"
							  class="three-set-choice"
							  :class="[{ active: selectedAttack === option.value }, 'attack-choice-' + option.value]"
							  @click="selectedAttack = option.value"
							  @keydown.enter.prevent="selectedAttack = option.value"
							  @keydown.space.prevent="selectedAttack = option.value">
							{{ option.label }}
						</view>
					</view>
				</view>
			</view>
		</view>
	</view>
</view>
		<PreviousMonthDataNotice v-if="props.showMonthNotice" />
			<view v-if="loading && !operationRefreshing" class="three-set-empty">
				<view class="three-set-empty-icon is-loading">◌</view>
				<view class="three-set-empty-title">正在匹配{{ periodLabel }}系统六刀组合</view>
				<view class="three-set-empty-hint">请稍候，正在按当前筛选条件计算</view>
			</view>
			<view v-else-if="loadError" class="three-set-empty">
				<view class="three-set-empty-icon">!</view>
				<view class="three-set-empty-title">获取组合失败</view>
				<view class="three-set-empty-hint">{{ loadError }}</view>
				<view class="three-set-empty-reset" @click="retryLoad">重新加载</view>
			</view>
			<view v-else-if="displayPackages.length" class="three-set-grid">
				<view
					v-for="pkg in displayPackages"
					:key="pkg.id"
					:id="'six-set-package-' + pkg.stableKey"
					class="three-set-package"
				>
					<view class="three-set-hit-list">
						<view
							v-for="(hitPair, pairIndex) in getHitPairs(pkg.hits)"
							:key="'pair-' + pairIndex"
							class="three-set-hit-pair-group"
							:class="'three-set-hit-pair-group-' + (pairIndex + 1)"
						>
						<view
							v-for="hit in hitPair"
							:key="hit.id"
							class="three-set-hit"
						>
							<view class="three-set-hit-boss">
								<view class="three-set-boss-cover-wrap">
									<image
										v-if="getBossImage(hit.bossSort) && !failedBossImages.includes(hit.bossSort)"
										class="three-set-hit-boss-image"
										:src="getBossImage(hit.bossSort)"
										mode="aspectFill"
										@error="markBossImageFailed(hit.bossSort)"
									/>
									<view v-else class="three-set-hit-boss-image three-set-hit-boss-fallback">
										BOSS {{ hit.bossSort }}
									</view>
									<view class="three-set-stage-tag">{{ stageName(hit.stage) }}</view>
								</view>
								<view class="three-set-hit-boss-detail">
									<text class="three-set-hit-boss-name">BOSS {{ hit.bossSort }}</text>
									<text class="three-set-hit-stage">{{ getBossName(hit.bossSort) }}</text>
								</view>
							</view>

							<view class="three-set-hit-damage">
								<text class="three-set-hit-damage-icon">⚔</text>
								<text class="three-set-hit-damage-value">{{ formatDamage(hit.damage) }}</text>
							</view>

							<view class="three-set-hit-roles">
								<view class="three-set-role-main">
									<template
										v-for="(role, slotIndex) in getRoleSlots(hit.roles.slice(0, 5), 5)"
										:key="role ? `${role.id}-${slotIndex}` : `empty-${hit.id}-${slotIndex}`"
									>
										<view
											class="three-set-role three-set-role-clickable"
											:class="{
												'three-set-role-empty': !role,
												'three-set-role-locked': isTeamLocked(hit.id),
											}"
											:title="role ? role.name : '作业操作'"
											role="button"
											tabindex="0"
											:aria-label="`打开作业 ${hit.id} 的操作菜单`"
											@click.stop="openTeamOperation(hit)"
											@keydown.enter.prevent="openTeamOperation(hit)"
											@keydown.space.prevent="openTeamOperation(hit)"
										>
											<image
												v-if="role && role.image_url && !failedRoleImages.includes(String(role.id))"
												class="three-set-role-image"
												:src="role.image_url"
												mode="aspectFill"
												@error="markRoleImageFailed(role.id)"
											/>
											<view v-else-if="role" class="three-set-role-image three-set-role-fallback">{{ role.name.slice(0, 1) }}</view>
										</view>
									</template>
								</view>
								<view class="three-set-borrow-group">
									<text class="three-set-borrow-label">借</text>
									<view
										v-if="hit.borrowedRole"
										class="three-set-role three-set-borrowed-role"
										:title="hit.borrowedRole.name + '（借用）'"
									>
										<image
											v-if="hit.borrowedRole.image_url && !failedRoleImages.includes(String(hit.borrowedRole.id))"
											class="three-set-role-image"
											:src="hit.borrowedRole.image_url || ''"
											mode="aspectFill"
											@error="markRoleImageFailed(hit.borrowedRole.id)"
										/>
										<view v-else class="three-set-role-image three-set-role-fallback">{{ hit.borrowedRole.name.slice(0, 1) }}</view>
									</view>
									<view
										v-else-if="hit.borrowId > 0"
										class="three-set-role three-set-borrow-state three-set-borrow-state-error"
										title="借人角色信息缺失"
									>?</view>
									<view
										v-else
										class="three-set-role three-set-borrow-state"
										title="无需借人，可借本刀任一角色"
									>
										<view class="three-set-borrow-state-title">
											<text>任选</text>
											<text>其一</text>
										</view>
									</view>
								</view>
							</view>

							<view
								class="three-set-hit-links"
								:class="{ 'three-set-links-no-nav': getLinkPageCount(hit) <= 1 }"
							>
								<view
									v-if="hit.links.length"
									class="three-set-links-grid"
									:class="`links-page-${linksPerPage}`"
								>
									<view
										v-for="link in getPagedLinks(hit)"
										:key="link.id"
										class="three-set-link-wrap"
									>
										<view
											class="three-set-link-row"
											:class="'link-difficulty-' + Number(link.difficulty || 0)"
											role="button"
											tabindex="0"
											@click.stop="openTeamLink(link)"
											@keydown.enter.prevent="openTeamLink(link)"
											@keydown.space.prevent="openTeamLink(link)"
										>
											<text class="three-set-link-author">{{ link.author || '匿名作者' }}</text>
											<text class="three-set-link-difficulty">{{ difficultyName(link.difficulty) }}</text>
											<text class="three-set-link-damage">{{ formatDamage(link.damage) }}</text>
										</view>
									</view>
								</view>
								<view v-else class="three-set-empty-links">暂无作业链接</view>
								<view
									v-if="getLinkPageCount(hit) > 1"
									class="three-set-link-nav"
									:aria-label="`${getBossName(hit.bossSort)}的作业链接翻页`"
								>
									<button
										type="button"
										class="three-set-link-nav-button"
										:disabled="getLinkPage(hit) === 0"
										aria-label="上一页作业链接"
										@click.stop="changeLinkPage(hit, -1)"
									>
										‹
									</button>
									<text class="three-set-link-page-indicator">
										{{ getLinkPage(hit) + 1 }}/{{ getLinkPageCount(hit) }}
									</text>
									<button
										type="button"
										class="three-set-link-nav-button"
										:disabled="getLinkPage(hit) >= getLinkPageCount(hit) - 1"
										aria-label="下一页作业链接"
										@click.stop="changeLinkPage(hit, 1)"
									>
										›
									</button>
								</view>
							</view>
						</view>
						</view>
					</view>
				</view>
			</view>
			<view v-else class="three-set-empty">
				<view class="three-set-empty-icon">⌕</view>
				<view class="three-set-empty-title">没有找到符合条件的套餐</view>
				<view class="three-set-empty-hint">调整 BOSS 或筛选条件后再试试</view>
				<view class="three-set-empty-reset" @click="resetFilters">清除筛选条件</view>
			</view>

			<TeamOperationModal
				v-if="operationHit"
				:locked="operationLocked"
				@close="closeTeamOperation"
				@lock="lockOperationTeam"
				@unlock="unlockOperationTeam"
				@hide="hideOperationTeam"
			/>
	</view>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type {
	Boss,
	GameRoleOption,
	SystemSixHitMode,
	SystemSixHitPackage,
	SystemSixHitStage,
	SystemTripleAttackType,
	SystemTripleLink,
	SystemTripleTeam,
} from '../api/types';
import { getCurrentBosses, getPreviousMonthBosses } from '../api/boss';
import { errorMessage } from '../api/errors';
import { getGameRoles } from '../api/gameRole';
import {
	getCurrentSystemSixHitPackages,
	getPreviousMonthSystemSixHitPackages,
} from '../api/systemSix';
import PreviousMonthDataNotice from './PreviousMonthDataNotice.vue';
import TeamOperationModal from './TeamOperationModal.vue';

type SixHitPeriod = 'current-month' | 'previous-month';
type BossGroupKey = 'low' | 'high';
type AttackFilter = 'all' | '3p' | '2p' | '2m' | '3m';

const props = withDefaults(defineProps<{
	period?: SixHitPeriod;
	showMonthNotice?: boolean;
	bossPeriod?: 'current' | 'previous';
	accountId?: number;
}>(), {
	period: 'current-month',
	showMonthNotice: false,
	bossPeriod: 'current',
	accountId: 0,
});

interface DisplayRole {
	id: number;
	roleId: number;
	imageId: number | null;
	image_url: string | null;
	name: string;
	status: number;
	borrowed: boolean;
}

interface DisplayHit {
	id: number;
	pageKey: string;
	bossSort: number;
	stage: number;
	damage: number;
	atkValue: number;
	roles: DisplayRole[];
	borrowId: number;
	borrowedRole: DisplayRole | null;
	links: SystemTripleLink[];
}

interface DisplayPackage {
	id: string;
	stableKey: string;
	hits: DisplayHit[];
}

const fallbackBosses: Boss[] = [1, 2, 3, 4, 5].map((sort) => ({
	id: 'demo-boss-' + sort,
	sort,
	file_path: '',
	name: 'BOSS ' + sort,
}));

const bosses = ref<Boss[]>(fallbackBosses);
const roleOptions = ref<GameRoleOption[]>([]);
const selectedLowBosses = ref<Array<number | null>>([null, null, null]);
const selectedHighBosses = ref<Array<number | null>>([null, null, null]);
const selectedMode = ref<SystemSixHitMode>(1);
const selectedStage = ref<SystemSixHitStage>(0);
const selectedAttack = ref<AttackFilter>('all');
const failedBossImages = ref<number[]>([]);
const failedRoleImages = ref<string[]>([]);
const packages = ref<SystemSixHitPackage[]>([]);
const loading = ref(false);
const loadError = ref('');
const linksPerPage = ref(4);
const linkPages = ref<Record<string, number>>({});
const lockedIds = ref<number[]>([]);
const hiddenIds = ref<number[]>([]);
const lockedTeamStages = ref<Record<number, number>>({});
const operationHit = ref<DisplayHit | null>(null);
const operationRefreshing = ref(false);

interface ScrollAnchor {
	packageKey: string;
	viewportTop: number;
	scrollTop: number;
	container: HTMLElement | Window | null;
}

let scrollAnchor: ScrollAnchor | null = null;

const modeOptions: Array<{ label: string; value: SystemSixHitMode }> = [
	{ label: '自动', value: 1 },
	{ label: '手动', value: 2 },
];

const stageOptions: Array<{
	label: string;
	value: SystemSixHitStage;
}> = [
	{ label: '不限', value: 0 },
	{ label: 'B阶段', value: 2 },
	{ label: 'C阶段', value: 3 },
];

const attackOptions: Array<{
	label: string;
	value: AttackFilter;
	apiValue: SystemTripleAttackType;
}> = [
	{ label: '不限', value: 'all', apiValue: 0 },
	{ label: '3物理', value: '3p', apiValue: 1 },
	{ label: '2物理', value: '2p', apiValue: 2 },
	{ label: '2魔法', value: '2m', apiValue: 3 },
	{ label: '3魔法', value: '3m', apiValue: 4 },
];

const bossFilterGroups = computed(() => [
	{
		key: 'low' as BossGroupKey,
		label: '低阶段',
		selectedBosses: selectedLowBosses.value,
	},
	{
		key: 'high' as BossGroupKey,
		label: '高阶段',
		selectedBosses: selectedHighBosses.value,
	},
]);

const isPreviousMonth = computed(() => props.period === 'previous-month');
const periodLabel = computed(() => (isPreviousMonth.value ? '上月' : '本月'));
const roleById = computed(() => new Map(
	roleOptions.value.map((role) => [Number(role.id), role]),
));
const displayPackages = computed<DisplayPackage[]>(() =>
	packages.value.map((pkg, packageIndex) =>
		buildDisplayPackage(pkg, packageIndex),
	),
);
const operationLocked = computed(() => (
	operationHit.value !== null
	&& lockedIds.value.includes(operationHit.value.id)
));

let requestTimer: ReturnType<typeof setTimeout> | null = null;
let loadSequence = 0;

watch(
	[
		selectedLowBosses,
		selectedHighBosses,
		selectedMode,
		selectedStage,
		selectedAttack,
		lockedIds,
		hiddenIds,
		() => props.period,
		() => props.accountId,
	],
	() => scheduleLoad(),
	{ deep: true },
);

onMounted(() => {
	updateLinksPerPage();
	uni.onWindowResize(handleWindowResize);
	void loadVisualAssets();
	scheduleLoad(0);
});

onBeforeUnmount(() => {
	uni.offWindowResize(handleWindowResize);

	if (requestTimer) {
		clearTimeout(requestTimer);
		requestTimer = null;
	}

	loadSequence += 1;
});

function buildDisplayPackage(
	pkg: SystemSixHitPackage,
	packageIndex: number,
): DisplayPackage {
	const hits = pkg.pairs.flatMap((pair, pairIndex) => [
		buildDisplayHit(pair.low, `package-${packageIndex}-pair-${pairIndex}-low`),
		buildDisplayHit(pair.high, `package-${packageIndex}-pair-${pairIndex}-high`),
	]);

	return {
		id: `${packageIndex}-${hits.map((hit) => hit.id).join('-')}`,
		stableKey: hits.map((hit) => hit.id).sort((left, right) => left - right).join('-'),
		hits,
	};
}

function buildDisplayHit(team: SystemTripleTeam, pageKey: string): DisplayHit {
	const borrowId = Number(team.borrow || 0);
	const roles = team.roles.map((role): DisplayRole => {
		const roleId = Number(role.role_id);
		const roleOption = roleById.value.get(roleId);

		return {
			id: roleId,
			roleId,
			imageId: role.image_id,
			image_url: role.image_url || roleOption?.image_url || null,
			name: roleOption?.name || '角色 ' + roleId,
			status: Number(role.status),
			borrowed: roleId === borrowId,
		};
	});

	return {
		id: Number(team.id),
		pageKey,
		bossSort: Number(team.boss),
		stage: Number(team.stage),
		damage: Number(team.damage),
		atkValue: Number(team.atk_value),
		roles,
		borrowId,
		borrowedRole: roles.find((role) => role.borrowed) || null,
		links: Array.isArray(team.link) ? team.link : [],
	};
}

async function loadVisualAssets(): Promise<void> {
	const bossRequest = props.bossPeriod === 'previous'
		? getPreviousMonthBosses()
		: getCurrentBosses();
	const [bossResult, roleResult] = await Promise.allSettled([
		bossRequest,
		getGameRoles(),
	]);

	if (bossResult.status === 'fulfilled' && bossResult.value?.status === 0 && Array.isArray(bossResult.value.data)) {
		const currentBosses = bossResult.value.data
			.slice()
			.sort((left, right) => Number(left.sort) - Number(right.sort))
			.slice(0, 5);

		if (currentBosses.length) {
			bosses.value = fallbackBosses.map((fallback) =>
				currentBosses.find((boss) => Number(boss.sort) === fallback.sort) || fallback,
			);
		}
	}

	if (roleResult.status === 'fulfilled' && roleResult.value?.status === 0 && Array.isArray(roleResult.value.data)) {
		roleOptions.value = roleResult.value.data
			.flatMap((group) => Array.isArray(group.roles) ? group.roles : []);
	}
}

function scheduleLoad(delay = 180): void {
	loadSequence += 1;

	if (requestTimer) {
		clearTimeout(requestTimer);
	}

	requestTimer = setTimeout(() => {
		requestTimer = null;
		void loadPackages();
	}, delay);
}

async function loadPackages(): Promise<void> {
	const sequence = ++loadSequence;

	if (!isPreviousMonth.value && props.accountId <= 0) {
		packages.value = [];
		loading.value = false;
		operationRefreshing.value = false;
		loadError.value = '请选择游戏账号后重试';
		return;
	}

	loading.value = true;
	loadError.value = '';

	const attackType = attackOptions.find(
		(option) => option.value === selectedAttack.value,
	)?.apiValue ?? 0;

	try {
		const payload = {
			lowBosses: normalizeBossSelection(selectedLowBosses.value),
			highBosses: normalizeBossSelection(selectedHighBosses.value),
			mode: selectedMode.value,
			stage: selectedStage.value,
			atkType: attackType,
			lockedIds: [...lockedIds.value],
			hiddenIds: [...hiddenIds.value],
		};
		const data = isPreviousMonth.value
			? await getPreviousMonthSystemSixHitPackages(payload)
			: await getCurrentSystemSixHitPackages({
				...payload,
				accountId: props.accountId,
			});

		if (sequence !== loadSequence) {
			return;
		}

		packages.value = data;
		linkPages.value = {};

		if (operationRefreshing.value) {
			await restoreScrollAnchor();
		}
	} catch (error) {
		if (sequence !== loadSequence) {
			return;
		}

		packages.value = [];
		loadError.value = errorMessage(
			error,
			`获取${periodLabel.value}系统六刀组合失败，请稍后重试`,
		);
	} finally {
		if (sequence === loadSequence) {
			loading.value = false;
			operationRefreshing.value = false;
		}
	}
}

function normalizeBossSelection(
	selection: Array<number | null>,
): number[] {
	return selection.filter((boss): boss is number => boss !== null);
}

function isTeamLocked(teamId: number): boolean {
	return lockedIds.value.includes(teamId);
}

function openTeamOperation(hit: DisplayHit): void {
	operationHit.value = hit;
}

function closeTeamOperation(): void {
	operationHit.value = null;
}

function getLockGroup(stage: number): 'low' | 'high' {
	return stage === 4 ? 'high' : 'low';
}

function countLockedInGroup(group: 'low' | 'high'): number {
	return Object.values(lockedTeamStages.value)
		.filter((stage) => getLockGroup(stage) === group)
		.length;
}

function evictOldestLockedInGroup(group: 'low' | 'high'): void {
	const oldestTeamId = lockedIds.value.find((teamId) => {
		const stage = lockedTeamStages.value[teamId];
		return stage !== undefined && getLockGroup(stage) === group;
	});

	if (oldestTeamId === undefined) {
		return;
	}

	lockedIds.value = lockedIds.value.filter((teamId) => teamId !== oldestTeamId);
	const nextStages = { ...lockedTeamStages.value };
	delete nextStages[oldestTeamId];
	lockedTeamStages.value = nextStages;
}

function clearLockedTeams(): void {
	lockedIds.value = [];
	lockedTeamStages.value = {};
}

function lockOperationTeam(): void {
	const hit = operationHit.value;
	if (!hit || lockedIds.value.includes(hit.id)) {
		closeTeamOperation();
		return;
	}

	beginOperationRefresh(hit);
	const group = getLockGroup(hit.stage);
	if (countLockedInGroup(group) >= 2) {
		evictOldestLockedInGroup(group);
		uni.showToast({ title: '已自动解锁最早锁定的作业', icon: 'none' });
	}

	lockedIds.value = [...lockedIds.value, hit.id];
	lockedTeamStages.value = {
		...lockedTeamStages.value,
		[hit.id]: hit.stage,
	};
	closeTeamOperation();
}

function unlockOperationTeam(): void {
	const hit = operationHit.value;
	if (!hit) {
		return;
	}

	beginOperationRefresh(hit);
	lockedIds.value = lockedIds.value.filter((teamId) => teamId !== hit.id);
	const nextStages = { ...lockedTeamStages.value };
	delete nextStages[hit.id];
	lockedTeamStages.value = nextStages;
	closeTeamOperation();
}

function hideOperationTeam(): void {
	const hit = operationHit.value;
	if (!hit) {
		return;
	}

	beginOperationRefresh(hit);
	if (!hiddenIds.value.includes(hit.id)) {
		hiddenIds.value = [...hiddenIds.value, hit.id];
	}
	lockedIds.value = lockedIds.value.filter((teamId) => teamId !== hit.id);
	const nextStages = { ...lockedTeamStages.value };
	delete nextStages[hit.id];
	lockedTeamStages.value = nextStages;
	closeTeamOperation();
}

function applyMode(mode: SystemSixHitMode): void {
	if (selectedMode.value === mode) {
		return;
	}

	if (lockedIds.value.length) {
		clearLockedTeams();
		uni.showToast({ title: '模式已切换，锁定已清除', icon: 'none' });
	}
	selectedMode.value = mode;
}

function toggleBoss(
	group: BossGroupKey,
	rowIndex: number,
	bossSort: number,
): void {
	const target = group === 'low' ? selectedLowBosses : selectedHighBosses;
	target.value = target.value.map((value, index) =>
		index === rowIndex ? (value === bossSort ? null : bossSort) : value,
	);
}

function toggleMode(mode: SystemSixHitMode): void {
	applyMode(mode);
}

function selectStage(stage: SystemSixHitStage): void {
	if (selectedStage.value === stage) {
		return;
	}

	if (stage !== 0 && lockedIds.value.length) {
		const invalidIds = lockedIds.value.filter((teamId) => {
			const lockedStage = lockedTeamStages.value[teamId];
			return (lockedStage === 2 || lockedStage === 3) && lockedStage !== stage;
		});

		if (invalidIds.length) {
			lockedIds.value = lockedIds.value.filter((teamId) => !invalidIds.includes(teamId));
			const nextStages = { ...lockedTeamStages.value };
			invalidIds.forEach((teamId) => {
				delete nextStages[teamId];
			});
			lockedTeamStages.value = nextStages;
			uni.showToast({ title: '已自动解锁与当前阶段不符的作业', icon: 'none' });
		}
	}

	selectedStage.value = stage;
}

function resetFilters(): void {
	selectedLowBosses.value = [null, null, null];
	selectedHighBosses.value = [null, null, null];
	applyMode(1);
	selectedStage.value = 0;
	selectedAttack.value = 'all';
	scheduleLoad(0);
}

function retryLoad(): void {
	scheduleLoad(0);
}

function getHitPairs(hits: DisplayHit[]): DisplayHit[][] {
	const pairs: DisplayHit[][] = [];

	for (let index = 0; index < hits.length; index += 2) {
		pairs.push(hits.slice(index, index + 2));
	}

	return pairs;
}

function openTeamLink(link: SystemTripleLink): void {
	if (!link?.url) {
		uni.showToast({ title: '该作业暂无链接', icon: 'none' });
		return;
	}

	// #ifdef H5
	window.open(link.url, '_blank', 'noopener,noreferrer');
	// #endif

	// #ifndef H5
	// #ifdef APP-PLUS
	plus.runtime.openURL(link.url);
	// #endif
	// #ifndef APP-PLUS
	uni.setClipboardData({
		data: link.url,
		success: () => uni.showToast({ title: '链接已复制', icon: 'success' }),
	});
	// #endif
	// #endif
}

function getBossImage(bossSort: number): string {
	return bosses.value.find((boss) => Number(boss.sort) === bossSort)?.file_path || '';
}

function getBossName(bossSort: number): string {
	return bosses.value.find((boss) => Number(boss.sort) === bossSort)?.name || 'BOSS ' + bossSort;
}

function getRoleSlots<T>(items: T[], count: number): Array<T | null> {
	const visibleItems = items.slice(0, count);

	return [
		...Array.from({ length: Math.max(0, count - visibleItems.length) }, () => null),
		...visibleItems,
	];
}

function resolveLinksPerPage(windowWidth: number): number {
	if (windowWidth <= 700) {
		return 2;
	}

	if (windowWidth <= 900) {
		return 2;
	}

	if (windowWidth <= 1200) {
		return 3;
	}

	return 4;
}

function updateLinksPerPage(): void {
	const nextValue = resolveLinksPerPage(uni.getSystemInfoSync().windowWidth);

	if (nextValue !== linksPerPage.value) {
		linksPerPage.value = nextValue;
		linkPages.value = {};
	}
}

function handleWindowResize(): void {
	updateLinksPerPage();
}

function getPackageElementId(packageKey: string): string {
	return 'six-set-package-' + packageKey;
}

function findPackageKey(hit: DisplayHit): string | null {
	const target = displayPackages.value.find((pkg) =>
		pkg.hits.some((item) => item.pageKey === hit.pageKey),
	);

	return target ? target.stableKey : null;
}

// #ifdef H5
function findScrollContainer(element: HTMLElement): HTMLElement | Window {
	let parent = element.parentElement;

	while (parent && parent !== document.body && parent !== document.documentElement) {
		const overflowY = window.getComputedStyle(parent).overflowY;

		if (
			(overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay')
			&& parent.scrollHeight > parent.clientHeight + 1
		) {
			return parent;
		}

		parent = parent.parentElement;
	}

	return window;
}

function readScrollTop(container: HTMLElement | Window): number {
	if (container === window) {
		return window.scrollY || document.documentElement.scrollTop || 0;
	}

	return container.scrollTop;
}

function writeScrollTop(container: HTMLElement | Window, value: number): void {
	const nextValue = Math.max(0, value);

	if (container === window) {
		window.scrollTo(0, nextValue);
		return;
	}

	container.scrollTop = nextValue;
}
// #endif

function beginOperationRefresh(hit: DisplayHit): void {
	operationRefreshing.value = true;
	const packageKey = findPackageKey(hit);

	if (!packageKey) {
		return;
	}

	// #ifdef H5
	const element = document.getElementById(getPackageElementId(packageKey));

	if (!element) {
		return;
	}

	const container = findScrollContainer(element);
	scrollAnchor = {
		packageKey,
		viewportTop: element.getBoundingClientRect().top,
		scrollTop: readScrollTop(container),
		container,
	};
	// #endif
}

async function restoreScrollAnchor(): Promise<void> {
	const anchor = scrollAnchor;
	scrollAnchor = null;

	if (!anchor) {
		return;
	}

	await nextTick();

	// #ifdef H5
	await new Promise<void>((resolve) => {
		if (typeof requestAnimationFrame === 'function') {
			requestAnimationFrame(() => resolve());
			return;
		}

		setTimeout(resolve, 0);
	});

	const element = document.getElementById(getPackageElementId(anchor.packageKey));

	if (element) {
		const container = findScrollContainer(element);
		const delta = element.getBoundingClientRect().top - anchor.viewportTop;
		writeScrollTop(container, readScrollTop(container) + delta);
		return;
	}

	if (anchor.container) {
		writeScrollTop(anchor.container, anchor.scrollTop);
	}
	// #endif
}

function getLinkPageCount(hit: DisplayHit): number {
	return Math.max(1, Math.ceil(hit.links.length / linksPerPage.value));
}

function getLinkPage(hit: DisplayHit): number {
	const page = linkPages.value[hit.pageKey] || 0;
	return Math.min(page, getLinkPageCount(hit) - 1);
}

function getPagedLinks(hit: DisplayHit): SystemTripleLink[] {
	const start = getLinkPage(hit) * linksPerPage.value;
	return hit.links.slice(start, start + linksPerPage.value);
}

function changeLinkPage(hit: DisplayHit, direction: number): void {
	const nextPage = getLinkPage(hit) + direction;

	if (nextPage < 0 || nextPage >= getLinkPageCount(hit)) {
		return;
	}

	linkPages.value = {
		...linkPages.value,
		[hit.pageKey]: nextPage,
	};
}

function markBossImageFailed(bossSort: number): void {
	if (!failedBossImages.value.includes(bossSort)) {
		failedBossImages.value = [...failedBossImages.value, bossSort];
	}
}

function markRoleImageFailed(roleId: string | number): void {
	const key = String(roleId);
	if (!failedRoleImages.value.includes(key)) {
		failedRoleImages.value = [...failedRoleImages.value, key];
	}
}

function stageName(stage: number): string {
	return ['未知阶段', 'A 阶段', 'B 阶段', 'C 阶段', 'D 阶段', 'E 阶段'][stage] || '未知阶段';
}

function difficultyName(difficulty: number): string {
	return ['未设置', '纯 AUTO', '简单 SET', '开关 SET', '简单目押', '目押'][difficulty] || '未设置';
}

function formatDamage(damage: number): string {
	return Number(damage || 0).toLocaleString('en-US') + ' 万';
}
</script>

<style scoped>
.three-set-page {
	flex: 1 0 auto;
	width: 100%;
	max-width: 1440px;
	min-height: 0;
	margin: 0 auto;
	padding: 0 0 26px;
	display: flex;
	flex-direction: column;
	color: var(--text-primary);
}

.three-set-filter-panel {
	position: relative;
	flex-shrink: 0;
	padding: 6px 16px;
	border: 1px solid var(--border-subtle);
	border-radius: 10px;
	background: linear-gradient(105deg, var(--bg-panel), var(--bg-panel-alt) 70%, var(--bg-panel));
	box-shadow: 0 0 7px rgba(27, 151, 216, 0.045), inset 0 0 14px rgba(24, 119, 171, 0.025);
}

.three-set-empty-reset:hover {
	border-color: rgba(54, 161, 255, 0.7);
	background: var(--accent-soft);
	color: var(--text-secondary);
}

.three-set-filter-body {
	display: grid;
	grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
	align-items: center;
	gap: 12px;
}

.three-set-boss-column {
	min-width: 0;
	padding-right: 14px;
	border-right: 1px solid var(--border-default);
}

.three-set-boss-filters {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.three-set-boss-row {
	min-width: 0;
	display: block;
}

.three-set-boss-options {
	min-width: 0;
	display: grid;
	grid-template-columns: repeat(5, minmax(0, 1fr));
	gap: 5px;
}

.three-set-boss-option {
	position: relative;
	min-width: 0;
	height: 34px;
	padding: 2px;
	display: flex;
	align-items: center;
	justify-content: center;
	overflow: hidden;
	border: 1px solid var(--border-strong);
	border-radius: 7px;
	background: var(--bg-subtle);
	cursor: pointer;
	transition: border-color 0.16s ease, background 0.16s ease, box-shadow 0.16s ease;
}

.three-set-boss-option:hover {
	border-color: var(--border-strong);
}

.three-set-boss-option.selected {
	border: 2px solid #168cff;
	background: #087df5;
	box-shadow: 0 0 13px rgba(0, 119, 255, 0.7);
}

.three-set-boss-thumb {
	width: 100%;
	height: 30px;
	display: block;
	border-radius: 5px;
	background: var(--bg-subtle);
}

.three-set-boss-option:not(.selected) .three-set-boss-thumb {
	filter: grayscale(1) brightness(0.62);
}

.three-set-boss-option.selected .three-set-boss-thumb {
	filter: none;
}

.three-set-boss-placeholder {
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--accent-text);
	font-size: 9px;
	font-weight: 700;
	letter-spacing: -0.02em;
	white-space: nowrap;
}

.three-set-filter-options {
	min-width: 0;
	display: flex;
	align-items: center;
	overflow-x: auto;
}

.three-set-filter-bottom {
	width: max-content;
	min-width: 100%;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 14px;
}

.three-set-filter-group {
	min-width: 0;
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 8px;
}

.three-set-filter-label {
	color: var(--text-primary);
	font-size: 14px;
	font-weight: bold;
	white-space: nowrap;
}

.three-set-filter-icon {
	margin-right: 5px;
	color: var(--accent-text);
}

.three-set-choice-list {
	min-width: 0;
	display: flex;
	flex-wrap: nowrap;
	gap: 5px;
}

.three-set-attack-filter {
	flex: 1 1 auto;
	min-width: 0;
}

.three-set-attack-filter .three-set-choice-list {
	flex: 1;
}

.three-set-attack-filter .three-set-choice {
	flex: 0 0 70px;
}

.three-set-choice {
	width: 70px;
	min-width: 70px;
	height: 36px;
	flex: 0 0 70px;
	padding: 0 8px;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1px solid #07549a;
	border-radius: 8px;
	background: var(--bg-subtle);
	color: var(--text-secondary);
	font-size: 12px;
	cursor: pointer;
	transition: all 0.16s ease;
}

.three-set-choice:hover {
	border-color: var(--border-strong);
	color: var(--text-secondary);
}

.three-set-choice.active {
	border-color: #087df5;
	background: #087df5;
	color: #fff;
	font-weight: bold;
	box-shadow: 0 0 10px rgba(0, 112, 255, 0.22);
}

.three-set-choice.mode-choice-1.active {
	border-color: #087df5;
	background: #087df5;
	color: #fff;
	font-weight: bold;
	box-shadow: 0 0 10px rgba(0, 112, 255, 0.22);
}

.three-set-choice.mode-choice-2.active {
	border-color: #087df5;
	background: #087df5;
	color: #fff;
	font-weight: bold;
	box-shadow: 0 0 10px rgba(0, 112, 255, 0.22);
}

.three-set-grid {
	margin-top: 12px;
	display: grid;
	grid-template-columns: minmax(0, 1fr);
	align-items: stretch;
	gap: 10px;
}

.three-set-package {
	position: relative;
	min-width: 0;
	display: flex;
	flex-direction: column;
	overflow: visible;
	border: 1px solid var(--border-subtle);
	border-radius: 9px;
	background: linear-gradient(105deg, var(--bg-panel), var(--bg-panel-alt) 70%, var(--bg-panel));
	box-shadow: 0 0 7px rgba(27, 151, 216, 0.045), inset 0 0 12px rgba(24, 119, 171, 0.02);
}

.three-set-package::before {
	position: absolute;
	inset: 0;
	border-radius: inherit;
	background:
		repeating-linear-gradient(90deg, rgba(74, 194, 244, 0.045) 0 24px, rgba(89, 207, 255, 0.11) 24px 48px, rgba(66, 177, 228, 0.06) 48px 72px) top / 100% 1px no-repeat,
		repeating-linear-gradient(90deg, rgba(66, 177, 228, 0.05) 0 24px, rgba(89, 207, 255, 0.1) 24px 48px, rgba(74, 194, 244, 0.045) 48px 72px) bottom / 100% 1px no-repeat,
		repeating-linear-gradient(180deg, rgba(74, 194, 244, 0.18) 0 24px, rgba(89, 207, 255, 0.27) 24px 48px, rgba(66, 177, 228, 0.19) 48px 72px) left / 1px 100% no-repeat,
		repeating-linear-gradient(180deg, rgba(66, 177, 228, 0.17) 0 24px, rgba(89, 207, 255, 0.26) 24px 48px, rgba(74, 194, 244, 0.18) 48px 72px) right / 1px 100% no-repeat;
	content: '';
	pointer-events: none;
}

.three-set-hit-list {
	padding: 0 12px;
}

.three-set-hit {
	min-width: 0;
	min-height: 98px;
	padding: 5px 4px;
	display: flex;
	align-items: center;
	gap: 0;
	border-bottom: 1px solid var(--border-subtle);
}

.three-set-hit:last-child {
	border-bottom: 0;
}

.three-set-hit-main {
	width: 27%;
	min-width: 210px;
	align-self: stretch;
	padding: 5px 10px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	border-right: 1px solid var(--border-subtle);
}

.three-set-hit-boss {
	min-width: 0;
	display: flex;
	align-items: center;
	gap: 8px;
}

.three-set-hit-boss-image {
	width: 72px;
	height: 68px;
	flex: 0 0 72px;
	overflow: visible;
	border: 1px solid var(--border-strong);
	border-radius: 6px;
	background: var(--bg-subtle);
}

.three-set-hit-boss-fallback {
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--accent-text);
	font-size: 12px;
	font-weight: 700;
}

.three-set-hit-boss-text {
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.three-set-hit-boss-name {
	overflow: hidden;
	color: var(--text-secondary);
	font-size: 13px;
	font-weight: 600;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.three-set-hit-stage {
	color: var(--text-muted);
	font-size: 12px;
}

.three-set-hit-damage {
	width: 15%;
	min-width: 130px;
	align-self: stretch;
	flex: 0 0 15%;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	padding: 5px;
}

.three-set-hit-damage-label {
	color: var(--accent-text);
	font-size: 20px;
}

.three-set-hit-damage-value {
	color: var(--text-primary);
	font-size: 15px;
	font-weight: 700;
	white-space: nowrap;
}

.three-set-hit-footer {
	min-width: 0;
	flex: 1;
	align-self: stretch;
	padding: 7px 10px 7px 9px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
}

.three-set-role-layout {
	min-width: 0;
	display: flex;
	align-items: center;
	gap: 7px;
}

.three-set-role-list {
	min-width: 0;
	display: flex;
	align-items: center;
	gap: 5px;
}

.three-set-role {
	position: relative;
	width: 52px;
	height: 52px;
	flex: 0 0 52px;
}

.three-set-role-image {
	width: 52px;
	height: 52px;
	display: block;
	overflow: hidden;
	border: 1px solid var(--border-strong);
	border-radius: 6px;
	background: var(--bg-subtle);
}

.three-set-role-fallback {
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--text-secondary);
	font-size: 16px;
	font-weight: 700;
	background: linear-gradient(145deg, var(--accent-soft-strong), var(--bg-panel-alt));
}

.three-set-role-order {
	position: absolute;
	right: -3px;
	bottom: -3px;
	width: 15px;
	height: 15px;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1px solid var(--bg-subtle);
	border-radius: 50%;
	background: #147cc7;
	color: #fff;
	font-size: 10px;
	line-height: 1;
}

.three-set-borrow-label {
	flex: 0 0 auto;
	color: var(--accent-text);
	font-size: 14px;
	font-weight: 800;
	text-shadow: 0 0 8px rgba(57, 174, 240, 0.45);
}

.three-set-borrowed-role-list {
	padding-left: 7px;
	border-left: 1px solid var(--border-default);
}

.three-set-borrowed-role {
	border: 1px solid var(--border-strong);
	border-radius: 8px;
	box-shadow: 0 0 9px var(--border-subtle);
}

.three-set-link-area {
	position: relative;
	flex: 0 0 auto;
}

.three-set-link-trigger {
	position: relative;
	min-height: 28px;
	padding: 0 7px;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 4px;
	border: 1px solid var(--border-default);
	border-radius: 5px;
	background: var(--bg-subtle);
	color: var(--text-muted);
	font-size: 11px;
	cursor: pointer;
	white-space: nowrap;
}

.three-set-link-trigger:hover,
.three-set-link-trigger:focus,
.three-set-link-trigger.open {
	border-color: var(--border-strong);
	background: var(--bg-hover);
	color: var(--text-secondary);
	outline: none;
}

.three-set-link-chain {
	color: var(--accent-text);
	font-size: 12px;
}

.three-set-link-count {
	color: var(--accent-text);
	font-weight: 700;
}

.three-set-link-popover {
	position: absolute;
	right: 0;
	bottom: calc(100% + 8px);
	z-index: 20;
	width: 250px;
	max-width: min(250px, 76vw);
	padding: 10px;
	display: none;
	border: 1px solid var(--border-strong);
	border-radius: 8px;
	background: var(--bg-elevated);
	box-shadow: 0 10px 28px var(--shadow), 0 0 15px rgba(0, 115, 190, 0.12);
	white-space: normal;
}

.three-set-link-trigger:hover .three-set-link-popover,
.three-set-link-trigger:focus .three-set-link-popover,
.three-set-link-trigger.open .three-set-link-popover {
	display: block;
}

.three-set-popover-title {
	margin-bottom: 7px;
	color: var(--text-secondary);
	font-size: 11px;
	font-weight: 700;
}

.three-set-popover-item {
	padding: 7px 0;
	border-top: 1px solid var(--border-subtle);
}

.three-set-popover-meta {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 10px;
}

.three-set-popover-author {
	overflow: hidden;
	color: var(--text-secondary);
	text-overflow: ellipsis;
	white-space: nowrap;
}

.three-set-popover-difficulty {
	flex: 0 0 auto;
	color: var(--accent-text);
}

.three-set-popover-damage {
	margin-left: auto;
	flex: 0 0 auto;
	color: var(--text-primary);
}

.three-set-popover-url {
	margin-top: 4px;
	display: block;
	overflow-wrap: anywhere;
	color: var(--text-faint);
	font-size: 9px;
	line-height: 1.4;
}

.three-set-empty {
	flex: 1 1 0;
	min-height: 0;
	max-height: 75vh;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 8px;
	border: 1px dashed var(--border-subtle);
	border-radius: 10px;
	background: var(--bg-panel-soft);
}

.three-set-empty-icon {
	color: var(--accent-text);
	font-size: 30px;
}

.three-set-empty-icon.is-loading {
	animation: three-set-loading-spin 0.9s linear infinite;
}

@keyframes three-set-loading-spin {
	to {
		transform: rotate(360deg);
	}
}

.three-set-empty-title {
	color: var(--text-secondary);
	font-size: 14px;
	font-weight: 600;
}

.three-set-empty-hint {
	color: var(--text-muted);
	font-size: 11px;
}

.three-set-empty-reset {
	margin-top: 6px;
	padding: 6px 11px;
	border: 1px solid var(--border-default);
	border-radius: 6px;
	color: var(--text-secondary);
	font-size: 11px;
	cursor: pointer;
}

@media screen and (max-width: 1200px) {
	.three-set-hit-main {
		width: 34%;
		min-width: 220px;
	}
}

@media screen and (max-width: 700px) {
	.three-set-page {
		padding: 0 0 18px;
	}

	.three-set-filter-panel {
		padding: 8px 9px;
	}

	.three-set-filter-body {
		grid-template-columns: minmax(0, 1fr);
		gap: 12px;
	}

	.three-set-boss-column {
		padding-right: 0;
		padding-bottom: 9px;
		border-right: 0;
		border-bottom: 1px solid rgba(57, 117, 164, 0.24);
	}

	.three-set-boss-row {
		display: block;
	}

	.three-set-boss-options {
		gap: 4px;
	}

	.three-set-boss-option {
		height: 42px;
		padding: 1px;
		justify-content: center;
	}

	.three-set-boss-thumb {
		height: 34px;
	}

	.three-set-filter-bottom {
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		gap: 10px;
	}

	.three-set-attack-filter {
		grid-template-columns: 1fr;
		gap: 6px;
	}

	.three-set-attack-filter .three-set-choice-list {
		flex-wrap: wrap;
	}

	.three-set-choice-list {
		gap: 5px;
	}

	.three-set-choice {
		min-width: 55px;
		height: 29px;
		padding: 0 8px;
		font-size: 10px;
	}

	.three-set-grid {
		grid-template-columns: minmax(0, 1fr);
		gap: 10px;
	}

	.three-set-hit {
		min-height: 0;
		align-items: stretch;
		flex-direction: column;
		gap: 10px;
	}

	.three-set-hit-main {
		width: 100%;
		min-width: 0;
		padding: 5px 3px;
		border-right: 0;
		border-bottom: 1px solid var(--border-subtle);
	}

	.three-set-hit-damage {
		width: auto;
		min-width: 0;
		flex: 0 0 auto;
		padding-right: 4px;
		border-right: 0;
	}

	.three-set-hit-list {
		padding-right: 10px;
		padding-left: 10px;
	}

	.three-set-role-list {
		gap: 3px;
	}

	.three-set-role,
	.three-set-role-image {
		width: 42px;
		height: 42px;
		flex-basis: 42px;
	}

	.three-set-role-layout {
		gap: 5px;
		flex: 1 0 100%;
		justify-content: space-between;
	}

	.three-set-hit-footer {
		flex-wrap: wrap;
		flex: none;
		padding: 4px 0 7px;
	}

	.three-set-link-area {
		margin-left: auto;
		margin-top: 2px;
	}

	.three-set-borrowed-role-list {
		padding-left: 5px;
	}

	.three-set-borrow-label {
		font-size: 12px;
	}

	.three-set-link-trigger {
		min-height: 30px;
		padding: 0 5px;
		font-size: 10px;
	}

	.three-set-link-popover {
		right: -3px;
		width: 230px;
	}
}

@media screen and (max-width: 380px) {
	.three-set-role,
	.three-set-role-image {
		width: 36px;
		height: 36px;
		flex-basis: 36px;
	}
}

/* Keep the three-hit rows visually aligned with the jobs list TeamCard. */
.three-set-package {
	position: relative;
	padding: 5px;
	border: 1px solid var(--border-subtle);
	border-radius: 10px;
	background: var(--bg-panel-soft);
}

.three-set-package::before {
	content: none;
}

.three-set-hit-list {
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.three-set-hit {
	position: relative;
	min-height: 98px;
	padding: 0;
	align-items: stretch;
	gap: 0;
	border: 1px solid var(--border-subtle);
	border-radius: 9px;
	background: linear-gradient(105deg, var(--bg-panel), var(--bg-panel-alt) 70%, var(--bg-panel));
	box-shadow: 0 0 7px rgba(27, 151, 216, 0.045), inset 0 0 12px rgba(24, 119, 171, 0.02);
	transition: transform 0.22s ease;
}

.three-set-hit:hover {
	transform: translateY(-2px);
}

.three-set-hit::after {
	position: absolute;
	inset: 0;
	z-index: 1;
	border-radius: inherit;
	background:
		repeating-linear-gradient(90deg, rgba(74, 194, 244, 0.045) 0 24px, rgba(89, 207, 255, 0.11) 24px 48px, rgba(66, 177, 228, 0.06) 48px 72px) top / 100% 1px no-repeat,
		repeating-linear-gradient(90deg, rgba(66, 177, 228, 0.05) 0 24px, rgba(89, 207, 255, 0.1) 24px 48px, rgba(74, 194, 244, 0.045) 48px 72px) bottom / 100% 1px no-repeat,
		repeating-linear-gradient(180deg, rgba(74, 194, 244, 0.18) 0 24px, rgba(89, 207, 255, 0.27) 24px 48px, rgba(66, 177, 228, 0.19) 48px 72px) left / 1px 100% no-repeat,
		repeating-linear-gradient(180deg, rgba(66, 177, 228, 0.17) 0 24px, rgba(89, 207, 255, 0.26) 24px 48px, rgba(74, 194, 244, 0.18) 48px 72px) right / 1px 100% no-repeat;
	content: '';
	pointer-events: none;
}

.three-set-hit > view {
	min-width: 0;
	box-sizing: border-box;
}

.three-set-hit-boss {
	position: relative;
	width: 16%;
	min-width: 190px;
	flex-shrink: 0;
	gap: 12px;
	padding: 5px 10px;
}

.three-set-boss-cover-wrap {
	position: relative;
	width: 96px;
	height: 86px;
	flex-shrink: 0;
	overflow: hidden;
	border: 1px solid #1677c5;
	border-radius: 8px;
}

.three-set-hit-boss-image {
	width: 100%;
	height: 100%;
	display: block;
	background: var(--bg-subtle);
}

.three-set-hit-boss-fallback {
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--text-secondary);
}

.three-set-stage-tag {
	position: absolute;
	top: 5px;
	left: 5px;
	padding: 4px 9px;
	border-radius: 5px;
	background: #087cf5;
	color: #fff;
	font-size: 11px;
	font-weight: bold;
}

.three-set-hit-boss-detail {
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 9px;
}

.three-set-hit-boss-name {
	color: var(--text-primary);
	font-size: 13px;
	white-space: nowrap;
}

.three-set-hit-stage {
	color: var(--text-secondary);
	font-size: 12px;
}

.three-set-hit-damage {
	position: relative;
	width: 13%;
	min-width: 150px;
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 10px;
	padding: 5px;
	transform: translateX(-10px);
}

.three-set-hit-damage-icon {
	color: var(--accent-text);
	font-size: 30px;
	text-shadow: 0 0 9px #087fff;
}

.three-set-hit-damage-value {
	color: #fff;
	font-size: 18px;
	white-space: nowrap;
}

.three-set-hit-roles {
	position: relative;
	width: 34%;
	box-sizing: border-box;
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 6px;
	transform: none;
}

.three-set-role-main {
	width: auto;
	min-width: 0;
	flex: 0 0 auto;
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 7px;
}

.three-set-borrow-group {
	position: relative;
	flex: 0 0 auto;
	margin-left: 11px;
	padding-left: 0;
	display: flex;
	align-items: center;
	gap: 11px;
}

.three-set-hit-boss::after,
.three-set-hit-damage::after,
.three-set-hit-roles::after {
	position: absolute;
	top: 23%;
	right: 0;
	width: 1px;
	height: 54%;
	background: rgba(83, 149, 194, 0.38);
	content: '';
	pointer-events: none;
}

.three-set-role {
	width: 60px;
	height: 60px;
	flex: 0 0 60px;
	border: 2px solid #2376b9;
	border-radius: 8px;
	background: var(--bg-subtle);
}

.three-set-role-empty {
	border: 1px dashed var(--border-default);
	background: var(--bg-panel-soft);
}

.three-set-role-image {
	width: 100%;
	height: 100%;
	display: block;
	background: var(--bg-subtle);
}

.three-set-role-fallback {
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--text-secondary);
	font-size: 18px;
	font-weight: 700;
}

.three-set-role-order {
	right: 0;
	bottom: 0;
	width: auto;
	min-width: 15px;
	height: auto;
	padding: 1px 2px;
	border: 0;
	border-radius: 5px 0 0 0;
	background: var(--bg-panel-alt);
	font-size: 10px;
}

.three-set-borrow-label {
	flex: 0 0 auto;
	color: var(--text-secondary);
	font-size: 14px;
	font-weight: 700;
}

.three-set-borrowed-role {
	border-color: var(--accent-text);
}

.three-set-borrow-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 1px;
	border: 1px dashed var(--border-strong);
	background: var(--bg-subtle);
	color: var(--text-secondary);
}

.three-set-borrow-state-title {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 2px;
	color: var(--text-secondary);
	font-size: 12px;
	font-weight: 700;
	line-height: 1;
}

.three-set-borrow-state-error {
	border-color: rgba(228, 92, 104, 0.68);
	color: var(--danger);
}

.three-set-hit-links {
	position: relative;
	flex: 1;
	min-width: 0;
	box-sizing: border-box;
	align-self: stretch;
	padding: 8px 9px;
	display: flex;
	align-items: center;
	flex-wrap: nowrap;
	gap: 8px;
	overflow: visible;
}

.three-set-link-wrap {
	position: relative;
	width: 80px;
	height: 72px;
	flex: 0 0 80px;
}

.three-set-link-wrap:hover,
.three-set-link-wrap:focus-within {
	z-index: 3;
}

.three-set-link-row {
	box-sizing: border-box;
	width: 80px;
	height: 72px;
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	justify-content: center;
	gap: 3px;
	padding: 6px 5px;
	border: 1px solid var(--border-default);
	border-radius: 6px;
	background: var(--bg-panel-soft);
	color: var(--text-secondary);
	font-size: 11px;
	cursor: pointer;
	transition: filter 0.16s ease, box-shadow 0.16s ease;
}

.three-set-link-row:hover,
.three-set-link-row:focus,
.three-set-link-row.open {
	filter: brightness(1.2);
	box-shadow: 0 0 8px rgba(62, 171, 255, 0.12);
	outline: none;
}

.three-set-link-row.link-difficulty-1 { border-color: rgba(48, 190, 142, 0.42); background: var(--difficulty-1-bg); }
.three-set-link-row.link-difficulty-2 { border-color: rgba(54, 146, 255, 0.42); background: var(--bg-panel-soft-alt); }
.three-set-link-row.link-difficulty-3 { border-color: rgba(207, 151, 66, 0.44); background: var(--difficulty-3-bg); }
.three-set-link-row.link-difficulty-4 { border-color: rgba(157, 112, 255, 0.43); background: var(--difficulty-4-bg); }
.three-set-link-row.link-difficulty-5 { border-color: rgba(207, 76, 126, 0.48); background: var(--difficulty-5-bg); }
.three-set-link-row.link-difficulty-0 { border-color: var(--border-default); background: var(--bg-panel-soft); }

.three-set-link-author,
.three-set-link-difficulty {
	width: 100%;
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.three-set-link-difficulty { color: var(--text-secondary); }

.three-set-link-damage {
	width: 100%;
	max-width: 100%;
	text-align: left;
	white-space: nowrap;
}

.three-set-link-popover {
	position: absolute;
	left: 50%;
	right: auto;
	bottom: calc(100% + 8px);
	z-index: 20;
	width: 220px;
	max-width: min(220px, 76vw);
	padding: 9px;
	display: none;
	transform: translateX(-50%);
	border: 1px solid var(--border-strong);
	border-radius: 7px;
	background: var(--bg-elevated);
	box-shadow: 0 10px 28px var(--shadow), 0 0 15px rgba(0, 115, 190, 0.12);
	white-space: normal;
}

.three-set-link-row:hover .three-set-link-popover,
.three-set-link-row:focus .three-set-link-popover,
.three-set-link-row.open .three-set-link-popover {
	display: block;
}

.three-set-popover-url {
	margin: 0;
	font-size: 10px;
}

.three-set-boss-column {
	display: flex;
	align-items: center;
}

.three-set-boss-filters {
	width: 100%;
}

.three-set-grid {
	gap: 16px;
}

.three-set-package {
	padding: 7px;
}

.three-set-package:nth-child(odd) {
	border-color: var(--border-strong);
	background: var(--bg-subtle);
	box-shadow: 0 0 9px rgba(24, 106, 184, 0.1);
}

.three-set-package:nth-child(even) {
	border-color: var(--danger-soft);
	background: rgba(59, 23, 34, 0.76);
	box-shadow: 0 0 9px rgba(174, 50, 68, 0.1);
}

.three-set-package:nth-child(even) .three-set-hit {
	border-color: var(--danger-soft);
	background: linear-gradient(105deg, var(--bg-panel), var(--bg-panel-alt) 70%, var(--bg-panel));
}

.three-set-package:nth-child(even) .three-set-stage-tag {
	background: var(--danger-strong);
}

.three-set-package:nth-child(even) .three-set-boss-cover-wrap {
	border-color: var(--danger-strong);
}

.three-set-package:nth-child(even) .three-set-hit-damage-icon {
	color: var(--danger-strong);
	text-shadow: 0 0 9px var(--danger-soft);
}

/* 偶数组角色边框改为红色 */
.three-set-package:nth-child(even) .three-set-role {
	border-color: var(--danger-strong);
}

.three-set-package:nth-child(even) .three-set-hit-boss::after,
.three-set-package:nth-child(even) .three-set-hit-damage::after,
.three-set-package:nth-child(even) .three-set-hit-roles::after {
	background: var(--danger-soft);
}

@media screen and (max-width: 1360px) {
	.three-set-role {
		width: 43px;
		height: 43px;
		flex-basis: 43px;
	}

	.three-set-borrow-state-title {
		font-size: 10px;
	}
}

@media screen and (max-width: 1200px) {
	.three-set-filter-body { grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr); }
	.three-set-hit-boss { width: 19%; min-width: 190px; }
	.three-set-hit-damage { width: 13%; min-width: 145px; }
	.three-set-hit-roles { width: 34%; min-width: 340px; }
	.three-set-role-main { width: auto; flex: 0 0 auto; gap: 4px; }
	.three-set-hit-damage { transform: translateX(-8px); }
	.three-set-hit-roles { transform: none; }
	.three-set-role { width: 43px; height: 43px; flex-basis: 43px; }
	.three-set-hit-links { overflow-x: auto; overflow-y: hidden; }
}

@media screen and (max-width: 700px) {
	.three-set-filter-body { grid-template-columns: minmax(0, 1fr); align-items: stretch; }
	.three-set-filter-options { overflow-x: auto; }
	.three-set-filter-bottom { width: max-content; min-width: 100%; gap: 12px; }
	.three-set-attack-filter { min-width: max-content; }
	.three-set-package { padding: 5px; }
	.three-set-hit { flex-direction: row; flex-wrap: wrap; min-height: 0; padding: 5px; }
	.three-set-hit-boss { width: 50%; min-width: 0; min-height: 88px; padding: 3px; gap: 6px; }
	.three-set-boss-cover-wrap { width: 68px; height: 68px; }
	.three-set-stage-tag { top: 2px; left: 2px; padding: 2px 4px; font-size: 9px; }
	.three-set-hit-boss-name { font-size: 11px; }
	.three-set-hit-stage { font-size: 10px; }
	.three-set-hit-damage { width: auto; min-width: 0; margin-left: 66px; padding: 0; font-size: 12px; transform: none; }
	.three-set-hit-damage-icon { font-size: 18px; }
	.three-set-hit-damage-value { font-size: 11px; }
	.three-set-hit-roles { order: 4; width: 100%; min-width: 0; min-height: 62px; justify-content: center; gap: 4px; padding: 6px 2px; border-top: 1px solid rgba(0, 100, 184, 0.38); transform: none; }
	.three-set-role-main { width: auto; flex: 0 0 auto; }
	.three-set-borrow-group { position: relative; flex: 0 0 auto; margin-left: 4px; padding-left: 8px; }
	.three-set-hit-boss::after,
	.three-set-hit-damage::after,
	.three-set-hit-roles::after { display: none; }
	.three-set-role { width: 43px; height: 43px; flex-basis: 43px; }
	.three-set-hit-links { order: 5; flex: 0 0 100%; width: 100%; padding: 4px 0; }
	.three-set-link-wrap,
	.three-set-link-row { width: 80px; min-width: 80px; }
}

@media screen and (max-width: 380px) {
	.three-set-role { width: 36px; height: 36px; flex-basis: 36px; }
	.three-set-role-main { gap: 3px; }
	.three-set-hit-damage { margin-left: 44px; }
	.three-set-borrow-state-title { font-size: 9px; }
}

/* 六刀链接保持固定 80px 宽度，分页固定在作业右下角。 */
.three-set-hit-links {
	padding: 8px 82px 8px 24px;
	justify-content: flex-start;
	overflow: hidden;
}

.three-set-links-grid {
	width: 100%;
	max-width: 338px;
	display: grid;
	grid-template-columns: repeat(4, 80px);
	align-items: center;
	gap: 6px;
}

.three-set-links-grid.links-page-2 {
	max-width: 166px;
	grid-template-columns: repeat(2, 80px);
}

.three-set-links-grid.links-page-3 {
	max-width: 252px;
	grid-template-columns: repeat(3, 80px);
}

.three-set-hit-links .three-set-link-wrap {
	width: 80px;
	min-width: 80px;
	height: 72px;
	flex: 0 0 80px;
}

.three-set-hit-links .three-set-link-row {
	width: 80px;
	min-width: 80px;
	height: 72px;
}

.three-set-link-nav {
	position: absolute;
	top: auto;
	right: 8px;
	bottom: 8px;
	z-index: 4;
	padding: 1px;
	display: flex;
	align-items: center;
	gap: 2px;
	border-radius: 5px;
	background: var(--bg-elevated);
}

.three-set-link-nav-button {
	width: 22px;
	height: 22px;
	min-width: 22px;
	padding: 0;
	border: 1px solid var(--border-default);
	border-radius: 5px;
	background: var(--bg-panel-soft-alt);
	color: var(--text-secondary);
	font-size: 16px;
	line-height: 20px;
	text-align: center;
}

.three-set-link-nav-button::after {
	border: 0;
}

.three-set-link-nav-button[disabled] {
	border-color: var(--border-subtle);
	background: var(--bg-panel-soft);
	color: var(--text-faint);
}

.three-set-link-page-indicator {
	min-width: 20px;
	color: var(--text-muted);
	font-size: 9px;
	text-align: center;
	white-space: nowrap;
}

.three-set-empty-links {
	color: var(--text-muted);
	font-size: 12px;
}

@media screen and (max-width: 700px) {
	.three-set-hit-links {
		order: 5;
		flex: 0 0 100%;
		width: 100%;
		padding: 4px 8px 30px;
		overflow: hidden;
	}

	.three-set-hit-links.three-set-links-no-nav {
		padding-bottom: 4px;
	}

	.three-set-links-grid,
	.three-set-links-grid.links-page-2 {
		max-width: none;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 4px;
	}

	.three-set-hit-links .three-set-link-wrap {
		width: 100%;
		min-width: 0;
		height: 30px;
		flex: none;
	}

	.three-set-hit-links .three-set-link-row {
		width: 100%;
		min-width: 0;
		height: 30px;
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		align-items: center;
		gap: 4px;
		padding: 3px 5px;
		font-size: 9px;
	}

	.three-set-link-author,
	.three-set-link-difficulty,
	.three-set-link-damage {
		width: auto;
		max-width: none;
		min-width: 0;
		overflow: hidden;
		text-align: left;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.three-set-link-nav {
		top: auto;
		right: 4px;
		bottom: 4px;
	}
}


/* 让 filter-body 变成垂直流 */
.three-set-filter-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* BOSS 两组并排 */
.three-set-boss-section { width: 100%; }
.three-set-boss-groups { display: flex; gap: 20px; flex-wrap: wrap; }
.three-set-boss-group { flex: 1 1 45%; min-width: 0; }
.three-set-boss-group-title {
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 6px;
}

/* 去掉旧的右边框 */
.three-set-boss-column { border-right: none; padding-right: 0; }

/* 筛选项行自动换行，高度固定 */
.three-set-filter-bottom { flex-wrap: wrap; gap: 12px; align-items: center; }
.three-set-filter-group { flex: 1 1 auto; min-width: 140px; }
.three-set-attack-filter .three-set-choice,
.three-set-stage-filter .three-set-choice { flex: 0 0 70px; }

/* 六刀套餐：每两个作业为一个内部分组，使用绿、金、紫三色区分 */
.three-set-hit-pair-group {
	box-sizing: border-box;
	width: 100%;
	padding: 5px;
	display: flex;
	flex-direction: column;
	gap: 4px;
	border: 1px solid;
	border-radius: 11px;
	background: var(--bg-panel-soft);
	box-shadow: inset 0 0 12px rgba(255, 255, 255, 0.025);
}

.three-set-hit-pair-group-1 {
	border-color: var(--success);
	background: linear-gradient(135deg, rgba(18, 103, 76, 0.3), var(--bg-panel-soft));
}

.three-set-hit-pair-group-2 {
	border-color: #e0ad45;
	background: linear-gradient(135deg, rgba(117, 82, 20, 0.3), var(--bg-panel-soft));
}

.three-set-hit-pair-group-3 {
	border-color: #a878e8;
	background: linear-gradient(135deg, rgba(83, 51, 135, 0.32), var(--bg-panel-soft));
}

.three-set-hit-pair-group.three-set-hit-pair-group-1 .three-set-hit {
	border-color: rgba(53, 201, 143, 0.62);
	background: linear-gradient(105deg, var(--bg-panel), var(--bg-panel-alt));
}

.three-set-hit-pair-group.three-set-hit-pair-group-2 .three-set-hit {
	border-color: rgba(224, 173, 69, 0.62);
	background: linear-gradient(105deg, rgba(53, 40, 15, 0.96), var(--bg-panel-alt));
}

.three-set-hit-pair-group.three-set-hit-pair-group-3 .three-set-hit {
	border-color: rgba(168, 120, 232, 0.64);
	background: linear-gradient(105deg, rgba(39, 25, 65, 0.96), var(--bg-panel-alt));
}

.three-set-hit-pair-group.three-set-hit-pair-group-1 .three-set-stage-tag {
	background: #219d6d;
}

.three-set-hit-pair-group.three-set-hit-pair-group-2 .three-set-stage-tag {
	background: #b07b20;
}

.three-set-hit-pair-group.three-set-hit-pair-group-3 .three-set-stage-tag {
	background: #8054c2;
}

.three-set-hit-pair-group.three-set-hit-pair-group-1 .three-set-hit-damage-icon {
	color: var(--success);
	text-shadow: 0 0 9px rgba(53, 201, 143, 0.65);
}

.three-set-hit-pair-group.three-set-hit-pair-group-2 .three-set-hit-damage-icon {
	color: #e0ad45;
	text-shadow: 0 0 9px rgba(224, 173, 69, 0.65);
}

.three-set-hit-pair-group.three-set-hit-pair-group-3 .three-set-hit-damage-icon {
	color: #a878e8;
	text-shadow: 0 0 9px rgba(168, 120, 232, 0.68);
}

.three-set-hit-pair-group.three-set-hit-pair-group-1 .three-set-role {
	border-color: var(--success);
}

.three-set-hit-pair-group.three-set-hit-pair-group-2 .three-set-role {
	border-color: #e0ad45;
}

.three-set-hit-pair-group.three-set-hit-pair-group-3 .three-set-role {
	border-color: #a878e8;
}

/* 偶数套餐使用青、橙、紫红三色，与奇数套餐的绿、金、紫明确区分 */
.three-set-package:nth-child(even) .three-set-hit-pair-group.three-set-hit-pair-group-1 {
	border-color: #2ecbd6;
	background: linear-gradient(135deg, rgba(12, 91, 103, 0.3), var(--bg-panel-soft));
}

.three-set-package:nth-child(even) .three-set-hit-pair-group.three-set-hit-pair-group-1 .three-set-hit {
	border-color: rgba(46, 203, 214, 0.62);
	background: linear-gradient(105deg, var(--bg-panel), var(--bg-panel-alt));
}

.three-set-package:nth-child(even) .three-set-hit-pair-group.three-set-hit-pair-group-1 .three-set-stage-tag {
	background: #178e98;
}

.three-set-package:nth-child(even) .three-set-hit-pair-group.three-set-hit-pair-group-1 .three-set-hit-damage-icon {
	color: #2ecbd6;
	text-shadow: 0 0 9px rgba(46, 203, 214, 0.65);
}

.three-set-package:nth-child(even) .three-set-hit-pair-group.three-set-hit-pair-group-1 .three-set-role {
	border-color: #2ecbd6;
}

.three-set-package:nth-child(even) .three-set-hit-pair-group.three-set-hit-pair-group-2 {
	border-color: #ef9848;
	background: linear-gradient(135deg, rgba(112, 59, 20, 0.3), var(--bg-panel-soft));
}

.three-set-package:nth-child(even) .three-set-hit-pair-group.three-set-hit-pair-group-2 .three-set-hit {
	border-color: rgba(239, 152, 72, 0.62);
	background: linear-gradient(105deg, rgba(56, 31, 10, 0.96), var(--bg-panel-alt));
}

.three-set-package:nth-child(even) .three-set-hit-pair-group.three-set-hit-pair-group-2 .three-set-stage-tag {
	background: #b46d27;
}

.three-set-package:nth-child(even) .three-set-hit-pair-group.three-set-hit-pair-group-2 .three-set-hit-damage-icon {
	color: #ef9848;
	text-shadow: 0 0 9px rgba(239, 152, 72, 0.65);
}

.three-set-package:nth-child(even) .three-set-hit-pair-group.three-set-hit-pair-group-2 .three-set-role {
	border-color: #ef9848;
}

.three-set-package:nth-child(even) .three-set-hit-pair-group.three-set-hit-pair-group-3 {
	border-color: #d36ac2;
	background: linear-gradient(135deg, rgba(92, 34, 80, 0.3), var(--bg-panel-soft));
}

.three-set-package:nth-child(even) .three-set-hit-pair-group.three-set-hit-pair-group-3 .three-set-hit {
	border-color: rgba(211, 106, 194, 0.64);
	background: linear-gradient(105deg, rgba(46, 18, 42, 0.96), var(--bg-panel-alt));
}

.three-set-package:nth-child(even) .three-set-hit-pair-group.three-set-hit-pair-group-3 .three-set-stage-tag {
	background: #984a8c;
}

.three-set-package:nth-child(even) .three-set-hit-pair-group.three-set-hit-pair-group-3 .three-set-hit-damage-icon {
	color: #d36ac2;
	text-shadow: 0 0 9px rgba(211, 106, 194, 0.68);
}

.three-set-package:nth-child(even) .three-set-hit-pair-group.three-set-hit-pair-group-3 .three-set-role {
	border-color: #d36ac2;
}

.three-set-package:nth-child(even) .three-set-hit-pair-group.three-set-hit-pair-group-1 .three-set-hit-boss::after,
.three-set-package:nth-child(even) .three-set-hit-pair-group.three-set-hit-pair-group-1 .three-set-hit-damage::after,
.three-set-package:nth-child(even) .three-set-hit-pair-group.three-set-hit-pair-group-1 .three-set-hit-roles::after {
	background: rgba(46, 203, 214, 0.45);
}

.three-set-package:nth-child(even) .three-set-hit-pair-group.three-set-hit-pair-group-2 .three-set-hit-boss::after,
.three-set-package:nth-child(even) .three-set-hit-pair-group.three-set-hit-pair-group-2 .three-set-hit-damage::after,
.three-set-package:nth-child(even) .three-set-hit-pair-group.three-set-hit-pair-group-2 .three-set-hit-roles::after {
	background: rgba(239, 152, 72, 0.45);
}

.three-set-package:nth-child(even) .three-set-hit-pair-group.three-set-hit-pair-group-3 .three-set-hit-boss::after,
.three-set-package:nth-child(even) .three-set-hit-pair-group.three-set-hit-pair-group-3 .three-set-hit-damage::after,
.three-set-package:nth-child(even) .three-set-hit-pair-group.three-set-hit-pair-group-3 .three-set-hit-roles::after {
	background: rgba(211, 106, 194, 0.45);
}

/* 加粗六个作业套餐的外层边框，并拉开相邻套餐的上下距离 */
.three-set-grid {
	gap: 15px;
}

.three-set-package {
	border-width: 2px;
}

/* 六个作业套餐中隐藏单个作业边框，只保留两两分组和六人套餐外框 */
.three-set-hit-pair-group .three-set-hit {
	border: none !important;
}

/* 隐藏两两分组自身的边框线，保留分组背景和内部强调色 */
.three-set-hit-pair-group {
	border: none !important;
}

/* 六刀页面独立布局：两组 BOSS 在左侧，按钮筛选项在右侧 */
.six-set-filter-body {
	display: grid;
	grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
	align-items: start;
	gap: 18px;
}

.six-set-boss-section {
	width: 100%;
	min-width: 0;
}

.six-set-boss-groups {
	display: flex;
	flex-direction: row;
	gap: 12px;
}

.six-set-boss-group {
	width: calc(50% - 6px);
	min-width: 0;
}

.six-set-filter-options {
	min-width: 0;
	display: flex;
	align-items: stretch;
	overflow: visible;
}

.six-set-filter-options .three-set-filter-bottom {
	width: 100%;
	min-width: 0;
	display: grid;
	grid-template-columns: repeat(5, minmax(0, 1fr));
	align-items: start;
	gap: 14px 6px;
}

.six-set-filter-options .three-set-filter-group {
	width: 100%;
	min-width: 0;
}

.six-set-filter-options .three-set-mode-filter {
	grid-column: 1 / 3;
}

.six-set-filter-options .three-set-stage-filter {
	grid-column: 3 / 6;
}

.six-set-filter-options .three-set-attack-filter {
	grid-column: 1 / -1;
}

.six-set-filter-options .three-set-choice {
	width: 100%;
	min-width: 0;
	flex: 1 1 0;
	padding: 0 3px;
	font-size: clamp(10px, 0.8vw, 12px);
}

.six-set-filter-options .three-set-choice-list {
	width: 100%;
	min-width: 0;
	display: grid;
	gap: 4px;
}

.six-set-filter-options .three-set-mode-filter .three-set-choice-list {
	grid-template-columns: repeat(2, minmax(0, 1fr));
}

.six-set-filter-options .three-set-stage-filter .three-set-choice-list {
	grid-template-columns: repeat(3, minmax(0, 1fr));
}

.six-set-filter-options .three-set-attack-filter .three-set-choice-list {
	grid-template-columns: repeat(5, minmax(0, 1fr));
}

@media screen and (max-width: 700px) {
	.six-set-filter-body {
		grid-template-columns: minmax(0, 1fr);
	}

	.six-set-boss-groups {
		flex-direction: column;
	}

	.six-set-boss-group {
		width: 100%;
	}

	.six-set-filter-options .three-set-filter-bottom {
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: 12px 4px;
	}

	.six-set-filter-options .three-set-choice {
		padding: 0 2px;
		font-size: 10px;
	}
}

.three-set-role-main .three-set-role-clickable {
	overflow: hidden;
	cursor: pointer;
}

.three-set-role-main .three-set-role-clickable:hover {
	filter: brightness(1.08);
}

.three-set-role-main .three-set-role-clickable:focus-visible {
	outline: 2px solid rgba(87, 199, 255, 0.92);
	outline-offset: 2px;
}

.three-set-role-main .three-set-role.three-set-role-locked {
	border-style: solid;
	border-color: rgba(255, 214, 96, 0.96);
	background: linear-gradient(
		90deg,
		#f4c95d 0%,
		#68d8ff 28%,
		#f4c95d 52%,
		#68d8ff 76%,
		#f4c95d 100%
	);
	background-size: 260% 100%;
	box-shadow:
		0 0 9px rgba(244, 201, 93, 0.72),
		0 0 15px rgba(73, 190, 255, 0.38);
	animation:
		six-set-role-marquee 1.6s linear infinite,
		six-set-role-glow 1.6s ease-in-out infinite alternate;
}

.three-set-role-main .three-set-role-locked .three-set-role-image {
	width: calc(100% - 4px);
	height: calc(100% - 4px);
	margin: 2px;
	border: 0;
	border-radius: 5px;
}

@keyframes six-set-role-marquee {
	from {
		background-position: 0% 50%;
	}

	to {
		background-position: 100% 50%;
	}
}

@keyframes six-set-role-glow {
	from {
		box-shadow:
			0 0 7px rgba(244, 201, 93, 0.58),
			0 0 12px rgba(73, 190, 255, 0.28);
	}

	to {
		box-shadow:
			0 0 11px rgba(244, 201, 93, 0.82),
			0 0 18px rgba(73, 190, 255, 0.5);
	}
}

/* PC 竖屏窄窗口：隐藏 BOSS 文字，压缩 BOSS 图与伤害列，把省下的空间让给角色阵容与作业链接 */
@media screen and (orientation: portrait) and (min-width: 701px) {
	.three-set-hit {
		--three-set-seat-line-gap: 14px;
	}

	.three-set-hit-boss {
		width: auto;
		min-width: 0;
		gap: 8px;
		padding: 5px 8px;
	}

	.three-set-hit-boss-detail {
		display: none;
	}

	.three-set-boss-cover-wrap {
		width: 64px;
		height: 58px;
	}

	.three-set-stage-tag {
		top: 3px;
		left: 3px;
		padding: 2px 5px;
		font-size: 9px;
	}

	.three-set-hit-damage {
		width: auto;
		min-width: 100px;
		flex: 0 0 100px;
		gap: 6px;
		padding: 4px 2px;
		transform: none;
	}

	.three-set-hit-damage-icon {
		font-size: 20px;
	}

	.three-set-hit-damage-value {
		font-size: 14px;
	}

	.three-set-hit-roles {
		width: auto;
		min-width: 0;
		flex: 0 0 auto;
		padding: 6px 14px;
		transform: none;
	}

	.three-set-role-main {
		gap: 5px;
	}

	.three-set-borrow-group {
		margin-left: 8px;
		gap: 8px;
	}

	.three-set-role {
		width: 46px;
		height: 46px;
		flex: 0 0 46px;
	}

	.three-set-hit-links {
		flex: 1;
		padding: 8px 74px 8px 14px;
	}
}

@media (prefers-reduced-motion: reduce) {
	.three-set-role-main .three-set-role.three-set-role-locked {
		animation: none;
	}
}
</style>

