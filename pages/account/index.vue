<template>
	<MainLayout active-menu="account">
		<view class="account-page" :class="{ 'is-empty-state': isAccountListEmpty }">
			<view class="account-hero">
				<view>
					<view class="account-eyebrow">MY ACCOUNTS</view>
					<view class="account-page-title">我的账号</view>
					<view class="account-page-description">
						管理你的账号角色池，添加多个账号并分别配置各自持有的角色。
					</view>
				</view>
				<view class="account-hero-actions">
					<view
						v-if="!listLoading && !listError && pools.length"
						class="account-count"
					>
						{{ pools.length }} 个账号
					</view>
					<view class="add-button account-guide-target-add" @click="handleAddAccount">＋ 添加账号</view>
				</view>
			</view>

			<view class="account-panel">
				<view class="table-wrap">
					<view class="table-header">
						<view class="name-column">昵称</view>
						<view class="features-column">功能</view>
						<view class="actions-column">操作</view>
					</view>
					<view v-if="listLoading" class="list-state">正在加载账号...</view>
					<view v-else-if="listError" class="list-state error-state">
						<text>{{ listError }}</text>
						<view class="retry-button" @click="loadPools">重新加载</view>
					</view>
					<view v-else-if="!authState.isAuthenticated" class="list-state guest-list-state">
						<view class="guest-icon">♙</view>
						<view class="guest-title">登录后即可管理账号角色池</view>
						<view class="guest-description">角色池仅对正式账号开放，请登录或注册后继续。</view>
						<view class="account-actions">
							<view class="action-button primary" @click="navigateTo(routes.login)">登录</view>
							<view class="action-button" @click="navigateTo(routes.register)">注册账号</view>
						</view>
					</view>
					<view v-else-if="!pools.length" class="list-state">暂无账号，点击右上角添加账号。</view>
					<view v-else class="pool-list">
						<view v-for="pool in pools" :key="pool.id" class="pool-row">
							<view class="name-column pool-name">{{ pool.nickname }}</view>
							<view class="features-column feature-buttons">
								<view
									v-for="feature in features"
									:key="feature"
									class="feature-button"
									@click="openFeature(feature, pool)"
								>{{ feature }}</view>
							</view>
							<view class="actions-column row-actions">
								<view class="text-action edit-action" @click="openEdit(pool)">修改</view>
								<view class="text-action delete-action" @click="confirmDelete(pool)">删除</view>
							</view>
						</view>
					</view>
				</view>
			</view>
		</view>

		<Transition :name="editorTransitionName" appear @after-enter="handleEditorAfterEnter">
			<view v-if="editorVisible" class="modal-mask" @click="closeEditor">
				<view
					class="editor-modal"
					:class="{ 'is-guide-open': guideVisible }"
					@click.stop
				>
				<view class="modal-header">
					<view class="modal-title">{{ editingId === null ? '添加账号' : '修改账号' }}</view>
					<view class="close-button" @click="closeEditor">×</view>
				</view>
				<view class="editor-body">
					<view class="form-section nickname-section">
						<view class="section-title"><text class="section-dot">●</text> 账号昵称</view>
						<input
							v-model="nickname"
							class="nickname-input account-guide-target-nickname"
							maxlength="64"
							placeholder="请输入账号昵称"
							:disabled="editorLoading || submitting"
							@input="clearSaveSuccessMessage"
						/>
					</view>

					<view class="form-section role-section">
						<view class="section-title"><text class="section-dot">●</text> 角色池</view>
						<view class="role-search-row">
							<view class="search-box account-guide-target-role-search">
								<text class="search-icon">⌕</text>
								<input v-model="searchText" class="search-input" placeholder="搜索角色名称..." :disabled="editorLoading" />
							</view>
							<view class="reset-button" @click="resetRoleFilters">⟳ 重置</view>
						</view>
						<view class="element-tabs">
							<view
								v-for="element in elementOptions"
								:key="element.value"
								class="element-tab"
								:class="[{ active: selectedElement === element.value }, 'element-' + element.value]"
								@click="selectedElement = element.value"
							>{{ element.label }}</view>
						</view>

						<view v-if="editorLoading" class="role-state">正在加载角色...</view>
						<view v-else-if="roleError" class="role-state error-state">
							<text>{{ roleError }}</text>
							<view class="retry-button" @click="retryEditorLoad">重新加载</view>
						</view>
						<scroll-view v-else class="role-grid-scroll" scroll-y>
							<view v-if="visibleRoles.length" class="role-grid">
								<view
									v-for="(role, roleIndex) in visibleRoles"
									:key="role.id"
									class="role-option"
									:class="{
										selected: isRoleSelected(role.id),
										'account-guide-target-role-avatar': roleIndex === 0,
									}"
									:title="role.name"
									@click="toggleRole(role.id)"
								>
									<image v-if="role.image_url" class="role-image" :src="role.image_url" mode="aspectFill" />
									<view v-else class="role-image role-placeholder">{{ role.name.slice(0, 1) }}</view>
									<text class="role-name">{{ role.name }}</text>
								</view>
							</view>
							<view v-else class="role-state no-role-state">没有符合条件的角色</view>
						</scroll-view>
						<view class="selection-summary">已选择 {{ selectedRoleIds.length }} 个角色</view>
					</view>
				</view>

				<view
					class="save-success-tip"
					:class="{ 'is-visible': saveSuccessMessage }"
				>
					<text>✓ {{ saveSuccessMessage || '修改成功，角色顺序已按持有状态更新' }}</text>
				</view>
				<view class="modal-footer">
					<view class="select-all-button account-guide-target-select-all" :class="{ disabled: editorLoading || !selectableRoles.length }" @click="selectAllRoles">一键全选</view>
					<view class="cancel-button" @click="closeEditor">取消</view>
					<view class="save-button account-guide-target-save" :class="{ disabled: submitting || editorLoading || !editorReady || !!roleError }" @click="savePool">
						{{ submitting ? '保存中...' : '保存配置' }}
					</view>
				</view>
			</view>
			</view>
		</Transition>

		<view v-if="guideVisible" class="account-guide-overlay">
			<view class="account-guide-spotlight" :style="guideSpotlightStyle"></view>
			<view class="account-guide-card" :style="guideCardStyle">
				<view class="account-guide-progress">新手引导　{{ guideStep + 1 }} / {{ accountGuideSteps.length }}</view>
				<view class="account-guide-title">{{ currentGuideStep.title }}</view>
				<view class="account-guide-description">{{ currentGuideStep.description }}</view>
				<view class="account-guide-actions">
					<view class="account-guide-skip" @click.stop="skipAccountGuide">跳过</view>
					<view class="account-guide-next" @click.stop="nextAccountGuideStep">
						{{ guideStep === accountGuideSteps.length - 1 ? '完成' : '下一步' }}
					</view>
				</view>
			</view>
		</view>

		<Transition name="feature-dialog" appear>
			<MasterCoinShopModal
				v-if="coinShopVisible"
				:pool-id="coinShopPoolId"
				:pool-name="coinShopPoolName"
				@close="closeCoinShop"
			/>
		</Transition>

		<Transition name="feature-dialog" appear>
			<CardStatisticsModal
				v-if="statisticsVisible"
				:pool-id="statisticsPoolId"
				:pool-name="statisticsPoolName"
				:user-id="authState.user?.id ?? 0"
				@close="closeStatistics"
			/>
		</Transition>

		<Transition name="feature-dialog" appear>
			<HitSetPackageModal
				v-if="packageModalKind"
				:kind="packageModalKind"
				:pool-name="packagePoolName"
				:pool-id="packagePoolId"
				guide-enabled
				import-guide-enabled
				@close="closePackageModal"
			/>
		</Transition>
	</MainLayout>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { onHide, onShow } from '@dcloudio/uni-app';
import { authState } from '../../api/identity';
import { errorMessage } from '../../api/errors';
import { createRolePool, deleteRolePool, getRolePool, getRolePools, updateRolePool } from '../../api/rolePool';
import { getGameRoles } from '../../api/gameRole';
import { getGuideConfig, saveGuideConfig } from '../../api/user';
import type { GameRoleOption, UserRolePool } from '../../api/types';
import CardStatisticsModal from '../../components/CardStatisticsModal.vue';
import HitSetPackageModal from '../../components/HitSetPackageModal.vue';
import MasterCoinShopModal from '../../components/MasterCoinShopModal.vue';
import MainLayout from '../../layouts/MainLayout.vue';
import { navigateTo, routes } from '../../router';

const features = ['D面分刀', '首日满补', '大师币商店', '抽卡统计'];
const elementOptions = [
	{ label: '全部', value: 0 },
	{ label: '🔥 火', value: 1 },
	{ label: '💧 水', value: 2 },
	{ label: '🍃 风', value: 3 },
	{ label: '☀️ 光', value: 4 },
	{ label: '🌑 暗', value: 5 },
];

type AccountGuideStepKey = 'add' | 'nickname' | 'role-search' | 'role-avatar' | 'select-all' | 'save';

interface AccountGuideStep {
	key: AccountGuideStepKey;
	target: string;
	fallbacks?: string[];
	title: string;
	description: string;
}

interface GuideRect {
	left: number;
	top: number;
	right: number;
	bottom: number;
	width: number;
	height: number;
}

const accountGuideSteps: AccountGuideStep[] = [
	{
		key: 'add',
		target: '.account-guide-target-add',
		title: '添加游戏账号',
		description: '点击“添加账号”，为角色池建立一个游戏账号。',
	},
	{
		key: 'nickname',
		target: '.account-guide-target-nickname',
		title: '填写账号昵称',
		description: '填写便于识别的账号昵称，最多 64 个字符。',
	},
	{
		key: 'role-search',
		target: '.account-guide-target-role-search',
		title: '搜索角色',
		description: '输入角色名称可快速筛选，点击“重置”可恢复全部角色。',
	},
	{
		key: 'role-avatar',
		target: '.account-guide-target-role-avatar',
		fallbacks: ['.role-grid-scroll', '.role-section'],
		title: '选择角色头像',
		description: '点击角色头像将该角色加入账号角色池，再次点击可取消。',
	},
	{
		key: 'select-all',
		target: '.account-guide-target-select-all',
		title: '一键全选',
		description: '快速选中当前筛选范围内的全部角色，再按需取消。',
	},
	{
		key: 'save',
		target: '.account-guide-target-save',
		title: '保存配置',
		description: '确认昵称和角色后点击“保存配置”；保存成功后引导会自动结束。',
	},
];

const pools = ref<UserRolePool[]>([]);
const listLoading = ref(false);
const listError = ref('');
const editorVisible = ref(false);
const editorLoading = ref(false);
const editorReady = ref(false);
const roleError = ref('');
const submitting = ref(false);
const saveSuccessMessage = ref('');
const editingId = ref<number | null>(null);
const nickname = ref('');
const searchText = ref('');
const selectedElement = ref(0);
const selectedRoleIds = ref<number[]>([]);
const roleGroups = ref<Array<{ element: number; roles: GameRoleOption[] }>>([]);
const roleDisplayOrder = ref<GameRoleOption[]>([]);
const packageModalKind = ref<'three' | 'six' | null>(null);
const packagePoolName = ref('');
const packagePoolId = ref(0);
const coinShopVisible = ref(false);
const coinShopPoolId = ref(0);
const coinShopPoolName = ref('');
const statisticsVisible = ref(false);
const statisticsPoolId = ref(0);
const statisticsPoolName = ref('');
let editorLoadVersion = 0;

const guideConfigLoaded = ref(false);
const guideConfigEnabled = ref(false);
const guideMarkedSeen = ref(false);
const guideVisible = ref(false);
const guideStep = ref(0);
const guideDeferredUntilShow = ref(false);
const guideSpotlightStyle = ref({
	left: '12px',
	top: '90px',
	width: 'calc(100vw - 24px)',
	height: '100px',
});
const guideCardStyle = ref({
	left: '16px',
	top: '210px',
	width: 'calc(100vw - 32px)',
});
let guideConfigLoading: Promise<void> | null = null;
let guideRepositionTimer: ReturnType<typeof setTimeout> | null = null;
let accountGuideUnmounted = false;

const allRoles = computed(() => roleGroups.value.flatMap((group) => group.roles));
const isAccountListEmpty = computed(() => (
	listLoading.value ||
	!!listError.value ||
	!authState.isAuthenticated ||
	!pools.value.length
));
const selectableRoles = computed(() => (
	selectedElement.value === 0
		? allRoles.value
		: allRoles.value.filter((role) => Number(role.element) === selectedElement.value)
));
const visibleRoles = computed(() => {
	const keyword = searchText.value.trim().toLocaleLowerCase();
	return roleDisplayOrder.value.filter((role) => {
		const matchesElement = selectedElement.value === 0 || Number(role.element) === selectedElement.value;
		const matchesName = !keyword || role.name.toLocaleLowerCase().includes(keyword);
		return matchesElement && matchesName;
	});
});
const currentGuideStep = computed(() => (
	accountGuideSteps[guideStep.value] || accountGuideSteps[0]
));
const editorTransitionName = computed(() => (
	guideVisible.value && guideStep.value > 0
		? 'account-editor-guide'
		: 'account-editor'
));

onShow(() => {
	guideDeferredUntilShow.value = false;
	void loadPools();
	if (guideVisible.value) {
		scheduleGuidePosition();
	} else {
		maybeStartAccountGuide();
	}
});

onHide(() => {
	if (guideVisible.value) {
		hideAccountGuideWithoutSaving();
	}
});

watch(
	() => authState.isAuthenticated,
	(authenticated) => {
		if (!authenticated) {
			hideAccountGuideWithoutSaving();
			return;
		}
		maybeStartAccountGuide();
	},
);

onBeforeUnmount(() => {
	accountGuideUnmounted = true;
	clearGuideRepositionTimer();
});

function handleAddAccount(): void {
	if (!authState.isAuthenticated) {
		navigateTo(routes.login);
		return;
	}
	openCreate();
	if (guideVisible.value && guideStep.value === 0) {
		guideStep.value = 1;
		scheduleGuidePositionAfterEditorOpen();
	}
}

function clearGuideRepositionTimer(): void {
	if (guideRepositionTimer !== null) {
		clearTimeout(guideRepositionTimer);
		guideRepositionTimer = null;
	}
}

function scheduleGuidePosition(delay: number = 0): void {
	clearGuideRepositionTimer();
	if (delay > 0) {
		guideRepositionTimer = setTimeout(() => {
			guideRepositionTimer = null;
			positionAccountGuideTarget();
		}, delay);
		return;
	}
	void nextTick(() => {
		if (!accountGuideUnmounted) {
			positionAccountGuideTarget();
		}
	});
}

function scheduleGuidePositionAfterScroll(): void {
	clearGuideRepositionTimer();
	guideRepositionTimer = setTimeout(() => {
		guideRepositionTimer = null;
		positionAccountGuideTarget(false);
	}, 350);
}

function scheduleGuidePositionAfterEditorOpen(): void {
	clearGuideRepositionTimer();
	void nextTick(() => {
		if (!accountGuideUnmounted && guideVisible.value) {
			positionAccountGuideTarget(false);
		}
	});
	guideRepositionTimer = setTimeout(() => {
		guideRepositionTimer = null;
		positionAccountGuideTarget(false);
	}, 520);
}

function handleEditorAfterEnter(): void {
	if (guideVisible.value) {
		scheduleGuidePosition();
	}
}

async function loadAccountGuideConfig(): Promise<void> {
	if (guideConfigLoaded.value) {
		return;
	}
	if (guideConfigLoading) {
		return guideConfigLoading;
	}

	const pendingConfig = (async (): Promise<void> => {
		try {
			const enabled = await getGuideConfig('account');
			if (!guideMarkedSeen.value) {
				guideConfigEnabled.value = enabled;
			}
		} catch (error) {
			console.error('获取我的账号新手引导配置失败：', error);
		} finally {
			guideConfigLoaded.value = true;
			guideConfigLoading = null;
		}
	})();

	guideConfigLoading = pendingConfig;
	return pendingConfig;
}

function maybeStartAccountGuide(): void {
	if (
		accountGuideUnmounted ||
		!authState.isAuthenticated ||
		guideDeferredUntilShow.value ||
		guideMarkedSeen.value ||
		guideVisible.value ||
		(editorVisible.value && editingId.value !== null)
	) {
		return;
	}

	if (!guideConfigLoaded.value) {
		void loadAccountGuideConfig().then(() => {
			if (!accountGuideUnmounted) {
				maybeStartAccountGuide();
			}
		});
		return;
	}

	if (!guideConfigEnabled.value) {
		return;
	}

	void nextTick(() => {
		if (
			accountGuideUnmounted ||
			!authState.isAuthenticated ||
			guideDeferredUntilShow.value ||
			guideMarkedSeen.value ||
			guideVisible.value ||
			(editorVisible.value && editingId.value !== null) ||
			!guideConfigEnabled.value
		) {
			return;
		}

		guideStep.value = editorVisible.value ? 1 : 0;
		guideVisible.value = true;
		if (editorVisible.value) {
			scheduleGuidePositionAfterEditorOpen();
		} else {
			scheduleGuidePosition();
		}
	});
}

function hideAccountGuideWithoutSaving(): void {
	guideVisible.value = false;
	guideStep.value = 0;
	clearGuideRepositionTimer();
}

function deferAccountGuideForPageAction(): void {
	if (!guideVisible.value) {
		return;
	}
	hideAccountGuideWithoutSaving();
	guideDeferredUntilShow.value = true;
}

function finishAccountGuide(showError: boolean = true): void {
	hideAccountGuideWithoutSaving();
	if (guideMarkedSeen.value) {
		return;
	}

	guideMarkedSeen.value = true;
	guideConfigEnabled.value = false;
	guideConfigLoaded.value = true;
	void persistAccountGuideConfig(showError);
}

async function persistAccountGuideConfig(showError: boolean): Promise<void> {
	try {
		await saveGuideConfig('account');
	} catch (error) {
		console.error('保存我的账号新手引导状态失败：', error);
		if (showError) {
			uni.showToast({
				title: error instanceof Error ? error.message : '保存新手引导状态失败',
				icon: 'none',
			});
		}
	}
}

function nextAccountGuideStep(): void {
	if (guideStep.value >= accountGuideSteps.length - 1) {
		finishAccountGuide();
		return;
	}

	if (guideStep.value === 0) {
		if (!editorVisible.value) {
			openCreate();
		}
		guideStep.value = 1;
		scheduleGuidePositionAfterEditorOpen();
		return;
	}

	guideStep.value += 1;
	scheduleGuidePosition();
}

function skipAccountGuide(): void {
	finishAccountGuide();
}

function positionAccountGuideTarget(allowScroll: boolean = true): void {
	if (!guideVisible.value || accountGuideUnmounted) {
		return;
	}

	const step = currentGuideStep.value;
	if (!step) {
		return;
	}

	const selectors = [step.target, ...(step.fallbacks || [])];
	const windowHeight = uni.getSystemInfoSync().windowHeight || 700;

	// #ifdef H5
	let h5Target: Element | null = null;
	for (const selector of selectors) {
		const element = document.querySelector(selector);
		if (element) {
			h5Target = element;
			break;
		}
	}
	if (h5Target) {
		const rect = h5Target.getBoundingClientRect();
		const needsScroll = allowScroll && (
			rect.top < 12 ||
			rect.bottom > windowHeight - 80
		);
		const canScrollTarget = Boolean(
			h5Target.closest('.editor-body')
			|| h5Target.closest('.role-grid-scroll'),
		);
		if (
			needsScroll &&
			canScrollTarget
		) {
			h5Target.scrollIntoView({ behavior: 'smooth', block: 'center' });
			scheduleGuidePositionAfterScroll();
			return;
		}
		applyGuidePosition(rect);
		return;
	}
	// #endif

	const query = uni.createSelectorQuery();
	selectors.forEach((selector) => query.select(selector).boundingClientRect());
	query.exec((rects) => {
		const rect = (rects || []).find((item) => Boolean(item));
		if (rect) {
			applyGuidePosition(rect as GuideRect);
		}
	});
}

function applyGuidePosition(rect: GuideRect): void {
	if (!guideVisible.value) {
		return;
	}

	const windowInfo = uni.getSystemInfoSync();
	const windowWidth = windowInfo.windowWidth || 375;
	const windowHeight = windowInfo.windowHeight || 700;

	guideSpotlightStyle.value = {
		left: rect.left + 'px',
		top: rect.top + 'px',
		width: rect.width + 'px',
		height: rect.height + 'px',
	};

	const cardWidth = Math.min(320, windowWidth - 32);
	const cardLeft = Math.min(
		Math.max(12, rect.left + rect.width / 2 - cardWidth / 2),
		windowWidth - cardWidth - 12,
	);
	const estimatedCardHeight = 210;
	const belowTop = rect.bottom + 16;
	const aboveTop = rect.top - estimatedCardHeight - 16;
	let cardTop = Math.max(
		12,
		Math.min(windowHeight - estimatedCardHeight - 12, belowTop),
	);
	if (belowTop + estimatedCardHeight <= windowHeight - 12) {
		cardTop = belowTop;
	} else if (aboveTop >= 12) {
		cardTop = aboveTop;
	}

	guideCardStyle.value = {
		left: cardLeft + 'px',
		top: cardTop + 'px',
		width: cardWidth + 'px',
	};
}

async function loadPools(): Promise<void> {
	if (!authState.isAuthenticated) {
		pools.value = [];
		return;
	}
	listLoading.value = true;
	listError.value = '';
	try {
		pools.value = await getRolePools();
	} catch (error) {
		listError.value = errorMessage(error, '获取账号列表失败，请稍后重试');
	} finally {
		listLoading.value = false;
	}
}

function resetEditor(): void {
	editorLoadVersion += 1;
	editingId.value = null;
	nickname.value = '';
	searchText.value = '';
	selectedElement.value = 0;
	selectedRoleIds.value = [];
	roleDisplayOrder.value = [];
	editorLoading.value = false;
	editorReady.value = false;
	roleError.value = '';
	saveSuccessMessage.value = '';
}

async function loadRoleOptions(): Promise<void> {
	if (!roleGroups.value.length) {
		const response = await getGameRoles();
		if (!response || response.status !== 0 || !Array.isArray(response.data)) {
			throw new Error(response?.msg || response?.message || '角色列表接口返回的数据格式不正确');
		}
		roleGroups.value = response.data;
	}
}

function openCreate(): void {
	resetEditor();
	editorVisible.value = true;
	void loadEditorData();
}

async function openEdit(pool: UserRolePool): Promise<void> {
	deferAccountGuideForPageAction();
	resetEditor();
	editingId.value = pool.id;
	editorVisible.value = true;
	await loadEditorData(pool.id);
}

async function loadEditorData(poolId?: number): Promise<void> {
	const loadVersion = ++editorLoadVersion;
	editorLoading.value = true;
	editorReady.value = false;
	roleError.value = '';
	saveSuccessMessage.value = '';
	try {
		const [roleResult, detailResult] = await Promise.all([
			loadRoleOptions()
				.then(() => ({ success: true as const, error: null }))
				.catch((error) => ({ success: false as const, error })),
			poolId === undefined
				? Promise.resolve({ success: true as const, detail: null, error: null })
				: getRolePool(poolId)
					.then((detail) => ({ success: true as const, detail, error: null }))
					.catch((error) => ({ success: false as const, detail: null, error })),
		]);
		if (loadVersion !== editorLoadVersion) return;
		if (!roleResult.success) {
			roleError.value = errorMessage(roleResult.error, '加载游戏角色失败');
			return;
		}
		if (!detailResult.success) {
			roleError.value = errorMessage(detailResult.error, '加载账号详情失败');
			return;
		}
		const roleIds = normalizeRoleIds(detailResult.detail?.roles);
		nickname.value = detailResult.detail?.nickname || '';
		selectedRoleIds.value = roleIds;
		roleDisplayOrder.value = sortRolesForDisplay(allRoles.value, roleIds);
		editorReady.value = true;
	} finally {
		if (loadVersion === editorLoadVersion) {
			editorLoading.value = false;
		}
		if (guideVisible.value) {
			scheduleGuidePosition(50);
		}
	}
}

function retryEditorLoad(): void {
	const poolId = editingId.value ?? undefined;
	void loadEditorData(poolId);
}

function closeEditor(): void {
	if (submitting.value) return;
	if (guideVisible.value) {
		hideAccountGuideWithoutSaving();
		guideDeferredUntilShow.value = true;
	}
	editorLoadVersion += 1;
	editorLoading.value = false;
	editorReady.value = false;
	saveSuccessMessage.value = '';
	editorVisible.value = false;
}

function clearSaveSuccessMessage(): void {
	saveSuccessMessage.value = '';
}

function normalizeRoleId(id: string | number): number | null {
	const numericId = Number(id);
	return Number.isInteger(numericId) && numericId > 0 ? numericId : null;
}

function normalizeRoleIds(ids: Array<string | number> | null | undefined): number[] {
	const normalizedIds: number[] = [];
	const seen = new Set<number>();
	(ids || []).forEach((id) => {
		const numericId = normalizeRoleId(id);
		if (numericId === null || seen.has(numericId)) return;
		seen.add(numericId);
		normalizedIds.push(numericId);
	});
	return normalizedIds;
}

function sortRolesForDisplay(
	roles: GameRoleOption[],
	selectedIds: Array<string | number>,
): GameRoleOption[] {
	const selected = new Set(normalizeRoleIds(selectedIds));
	return roles
		.map((role, index) => ({ role, index }))
		.sort((left, right) => {
			const leftId = normalizeRoleId(left.role.id);
			const rightId = normalizeRoleId(right.role.id);
			const leftSelected = leftId !== null && selected.has(leftId);
			const rightSelected = rightId !== null && selected.has(rightId);
			if (leftSelected !== rightSelected) {
				return leftSelected ? -1 : 1;
			}
			if (leftId !== null && rightId !== null && leftId !== rightId) {
				return leftId - rightId;
			}
			return left.index - right.index;
		})
		.map(({ role }) => role);
}

function isRoleSelected(id: string | number): boolean {
	const numericId = normalizeRoleId(id);
	return numericId !== null && selectedRoleIds.value.includes(numericId);
}

function toggleRole(id: string | number): void {
	const numericId = normalizeRoleId(id);
	if (numericId === null) return;
	if (selectedRoleIds.value.includes(numericId)) {
		selectedRoleIds.value = selectedRoleIds.value.filter((selectedId) => selectedId !== numericId);
	} else {
		selectedRoleIds.value = [...selectedRoleIds.value, numericId];
	}
	clearSaveSuccessMessage();
}

function selectAllRoles(): void {
	if (editorLoading.value || !selectableRoles.value.length) return;
	const ids = new Set(selectedRoleIds.value);
	selectableRoles.value.forEach((role) => {
		const roleId = normalizeRoleId(role.id);
		if (roleId !== null) ids.add(roleId);
	});
	selectedRoleIds.value = [...ids];
	clearSaveSuccessMessage();
}

function resetRoleFilters(): void {
	searchText.value = '';
	selectedElement.value = 0;
}

async function savePool(): Promise<void> {
	if (submitting.value || editorLoading.value || !editorReady.value || roleError.value) return;
	const normalizedNickname = nickname.value.trim();
	if (!normalizedNickname) {
		uni.showToast({ title: '请输入账号昵称', icon: 'none' });
		return;
	}
	if (normalizedNickname.length > 64) {
		uni.showToast({ title: '账号昵称不能超过 64 个字符', icon: 'none' });
		return;
	}
	const roles = normalizeRoleIds(selectedRoleIds.value);
	clearSaveSuccessMessage();
	submitting.value = true;
	try {
		const payload = { nickname: normalizedNickname, roles };
		if (editingId.value === null) {
			await createRolePool(payload);
			if (guideVisible.value) {
				finishAccountGuide(false);
			}
			uni.showToast({ title: '添加成功', icon: 'success' });
			editorVisible.value = false;
			await loadPools();
		} else {
			const savedPool = await updateRolePool(editingId.value, payload);
			const savedRoleIds = normalizeRoleIds(savedPool.roles);
			nickname.value = savedPool.nickname || normalizedNickname;
			selectedRoleIds.value = savedRoleIds;
			roleDisplayOrder.value = sortRolesForDisplay(allRoles.value, savedRoleIds);
			const poolIndex = pools.value.findIndex((pool) => pool.id === editingId.value);
			if (poolIndex !== -1) {
				pools.value = pools.value.map((pool, index) => (
					index === poolIndex ? { ...pool, ...savedPool } : pool
				));
			}
			saveSuccessMessage.value = '修改成功，角色顺序已按持有状态更新';
			uni.showToast({ title: '修改成功', icon: 'success' });
		}
	} catch (error) {
		uni.showToast({ title: errorMessage(error, '保存失败，请稍后重试'), icon: 'none' });
	} finally {
		submitting.value = false;
	}
}

function confirmDelete(pool: UserRolePool): void {
	deferAccountGuideForPageAction();
	uni.showModal({
		title: '删除账号',
		content: `确认删除“${pool.nickname}”吗？`,
		confirmText: '删除',
		confirmColor: '#e45c68',
		success: async (result) => {
			if (!result.confirm) return;
			try {
				await deleteRolePool(pool.id);
				uni.showToast({ title: '删除成功', icon: 'success' });
				await loadPools();
			} catch (error) {
				uni.showToast({ title: errorMessage(error, '删除失败，请稍后重试'), icon: 'none' });
			}
		},
	});
}

function openFeature(feature: string, pool: UserRolePool): void {
	deferAccountGuideForPageAction();
	if (feature === 'D面分刀') {
		packageModalKind.value = 'three';
		packagePoolName.value = pool.nickname;
		packagePoolId.value = pool.id;
		return;
	}
	if (feature === '首日满补') {
		packageModalKind.value = 'six';
		packagePoolName.value = pool.nickname;
		packagePoolId.value = pool.id;
		return;
	}
	if (feature === '大师币商店') {
		coinShopPoolId.value = pool.id;
		coinShopPoolName.value = pool.nickname;
		coinShopVisible.value = true;
		return;
	}
	if (feature === '抽卡统计') {
		statisticsPoolId.value = pool.id;
		statisticsPoolName.value = pool.nickname;
		statisticsVisible.value = true;
		return;
	}
}

function closePackageModal(): void {
	packageModalKind.value = null;
	packagePoolName.value = '';
	packagePoolId.value = 0;
}

function closeCoinShop(): void {
	coinShopVisible.value = false;
	coinShopPoolId.value = 0;
	coinShopPoolName.value = '';
}

function closeStatistics(): void {
	statisticsVisible.value = false;
	statisticsPoolId.value = 0;
	statisticsPoolName.value = '';
}
</script>

<style scoped>
.account-hero {
	padding: 18px 20px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	flex-wrap: wrap;
	gap: 16px;
	border: 1px solid var(--border-default);
	border-radius: 11px;
	background:
		radial-gradient(ellipse at 88% 0%, var(--accent-soft), transparent 52%),
		linear-gradient(115deg, var(--bg-panel), var(--bg-panel-alt));
}

.account-eyebrow {
	color: var(--accent-text);
	font-size: 10px;
	font-weight: 800;
	letter-spacing: 0.18em;
}

.account-page-title {
	margin-top: 5px;
	color: var(--text-primary);
	font-size: 24px;
	font-weight: 800;
}

.account-page-description {
	max-width: 680px;
	margin-top: 7px;
	color: var(--text-muted);
	font-size: 12px;
	line-height: 1.7;
}

.account-hero-actions {
	display: flex;
	align-items: center;
	gap: 8px;
}

.account-page {
	width: 100%;
	max-width: 1120px;
	margin: 0 auto;
}

.account-page.is-empty-state {
	flex: 1 0 auto;
	min-height: 0;
	display: flex;
	flex-direction: column;
}

.account-panel {
	width: 100%;
	min-height: 300px;
	margin-top: 14px;
	padding: 0;
	border: 1px solid rgba(44, 155, 211, 0.2);
	border-radius: 10px;
	background: linear-gradient(105deg, var(--bg-panel), var(--bg-panel-alt));
	box-shadow: inset 0 0 14px rgba(24, 119, 171, 0.04);
	overflow: hidden;
}

.account-page.is-empty-state .account-panel {
	flex: 1 1 auto;
	min-height: 0;
	display: flex;
	flex-direction: column;
}

.account-count {
	padding: 4px 9px;
	border: 1px solid var(--border-default);
	border-radius: 999px;
	background: var(--bg-subtle);
	color: var(--text-muted);
	font-size: 11px;
	font-weight: 700;
}

.add-button,
.save-button {
	padding: 10px 18px;
	border: 1px solid #147fe0;
	border-radius: 6px;
	background: linear-gradient(180deg, #168cff, #0865bf);
	color: #fff;
	font-size: 13px;
	font-weight: 700;
	text-align: center;
	cursor: pointer;
}

.table-wrap {
	width: 100%;
	border: 0;
	border-radius: 0;
	overflow: hidden;
}

.account-page.is-empty-state .table-wrap {
	flex: 1 1 auto;
	min-height: 0;
	display: flex;
	flex-direction: column;
}

.table-header,
.pool-row {
	display: flex;
	align-items: center;
	gap: 12px;
}

.name-column {
	width: 19%;
	flex: 0 0 19%;
}

.features-column {
	min-width: 0;
	flex: 1 1 auto;
}

.actions-column {
	width: 112px;
	flex: 0 0 112px;
}

.table-header {
	min-height: 44px;
	padding: 0 16px;
	background: var(--table-header);
	color: var(--text-secondary);
	font-size: 13px;
	font-weight: 700;
}

.table-header .features-column {
	text-align: center;
}

.pool-row {
	min-height: 66px;
	padding: 10px 16px;
	border-top: 1px solid var(--border-subtle);
	background: var(--bg-panel-soft);
}

.pool-row:nth-child(even) {
	background: var(--bg-panel-soft-alt);
}

.pool-name {
	color: var(--text-primary);
	font-size: 14px;
	font-weight: 700;
	word-break: break-all;
}

.feature-buttons,
.row-actions {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 8px;
}

.feature-buttons {
	justify-content: center;
}

.feature-button {
	min-height: 31px;
	padding: 0 10px;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1px solid var(--border-default);
	border-radius: 5px;
	background: var(--bg-subtle);
	color: var(--text-secondary);
	font-size: 12px;
	white-space: nowrap;
	cursor: pointer;
}

.feature-button:active,
.text-action:active,
.add-button:active {
	filter: brightness(1.2);
}

.row-actions {
	gap: 14px;
}

.text-action {
	min-width: 42px;
	padding: 6px 9px;
	border: 1px solid rgba(72, 133, 190, 0.28);
	border-radius: 5px;
	background: var(--bg-subtle);
	font-size: 13px;
	text-align: center;
	cursor: pointer;
}

.edit-action {
	color: var(--accent-text);
}

.delete-action {
	color: var(--danger);
}

.list-state,
.role-state {
	min-height: 120px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 12px;
	color: var(--text-muted);
	font-size: 13px;
}

.account-page.is-empty-state .table-wrap > .list-state {
	flex: 1 1 0;
	min-height: 0;
	max-height: 75vh;
}

.retry-button {
	padding: 6px 12px;
	border: 1px solid var(--border-strong);
	border-radius: 5px;
	color: var(--accent-text);
	cursor: pointer;
}

.error-state {
	color: var(--danger);
}

.guest-list-state {
	min-height: 230px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	border-top: 1px solid var(--border-subtle);
	background: radial-gradient(ellipse at center, var(--accent-soft), var(--bg-panel-soft) 65%);
}

.guest-icon {
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

.guest-title {
	color: #e4f2ff;
	font-size: 15px;
	font-weight: 700;
}

.guest-description {
	margin-top: 7px;
	color: var(--text-muted);
	font-size: 13px;
}

.account-actions {
	margin-top: 22px;
	display: flex;
	gap: 10px;
}

.action-button {
	min-width: 112px;
	padding: 10px 18px;
	border: 1px solid rgba(44, 155, 211, 0.42);
	border-radius: 6px;
	color: var(--text-secondary);
	font-size: 13px;
	text-align: center;
	cursor: pointer;
}

.action-button.primary {
	border-color: #147fe0;
	background: linear-gradient(180deg, #168cff, #0865bf);
	color: #fff;
}

.modal-mask {
	position: fixed;
	z-index: 1000;
	inset: 0;
	padding: 24px 12px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--mask);
}

.editor-modal {
	width: min(820px, 100%);
	max-height: min(92vh, 900px);
	display: flex;
	flex-direction: column;
	border: 1px solid rgba(50, 144, 213, 0.48);
	border-radius: 10px;
	background: var(--bg-elevated);
	box-shadow: 0 18px 60px var(--shadow), 0 0 24px rgba(0, 105, 190, 0.16);
	overflow: hidden;
}

.account-editor-enter-active {
	transition: opacity 0.3s ease;
}

.account-editor-leave-active {
	transition: opacity 0.2s ease;
}

.account-editor-enter-active .editor-modal {
	transition:
		opacity 0.34s ease,
		transform 0.48s cubic-bezier(0.16, 1, 0.3, 1);
}

.account-editor-leave-active .editor-modal {
	transition:
		opacity 0.2s ease,
		transform 0.24s ease;
}

.account-editor-enter-from,
.account-editor-leave-to {
	opacity: 0;
}

.account-editor-enter-from .editor-modal {
	opacity: 0;
	transform: translate3d(0, 20px, 0) scale(0.975);
}

.account-editor-leave-to .editor-modal {
	opacity: 0;
	transform: translate3d(0, 10px, 0) scale(0.99);
}

.account-editor-guide-enter-active,
.account-editor-guide-leave-active,
.account-editor-guide-enter-active .editor-modal,
.account-editor-guide-leave-active .editor-modal {
	transition: opacity 0.16s ease;
}

.account-editor-guide-enter-from,
.account-editor-guide-leave-to,
.account-editor-guide-enter-from .editor-modal,
.account-editor-guide-leave-to .editor-modal {
	opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
	.account-editor-enter-active,
	.account-editor-leave-active,
	.account-editor-enter-active .editor-modal,
	.account-editor-leave-active .editor-modal {
		transition-duration: 0.01ms;
	}
}

.modal-header {
	min-height: 58px;
	padding: 0 18px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	border-bottom: 1px solid var(--border-subtle);
}

.modal-title {
	color: var(--text-primary);
	font-size: 16px;
	font-weight: 700;
}

.close-button {
	width: 32px;
	height: 32px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 6px;
	background: var(--danger-strong);
	color: #fff;
	font-size: 23px;
	line-height: 1;
	cursor: pointer;
}

.editor-body {
	min-height: 0;
	padding: 12px;
	display: flex;
	flex-direction: column;
	gap: 12px;
	overflow-y: auto;
}

.form-section {
	padding: 18px;
	border: 1px solid var(--border-subtle);
	border-radius: 8px;
	background: var(--bg-panel-soft);
}

.section-title {
	margin-bottom: 16px;
	color: var(--text-primary);
	font-size: 15px;
	font-weight: 700;
}

.section-dot {
	margin-right: 5px;
	color: #5d82ff;
	font-size: 12px;
}

.nickname-input,
.search-input {
	width: 100%;
	min-width: 0;
	color: var(--text-primary);
	font-size: 13px;
}

.nickname-input {
	height: 43px;
	padding: 0 13px;
	border: 1px solid var(--border-default);
	border-radius: 6px;
	background: var(--bg-input);
}

.nickname-input::placeholder,
.search-input::placeholder {
	color: var(--text-placeholder);
}

.role-search-row {
	margin-bottom: 12px;
	display: flex;
	gap: 10px;
}

.search-box {
	min-width: 0;
	flex: 1;
	height: 40px;
	padding: 0 12px;
	display: flex;
	align-items: center;
	gap: 9px;
	border: 1px solid var(--border-default);
	border-radius: 6px;
	background: var(--bg-input);
}

.search-icon {
	color: var(--text-muted);
	font-size: 22px;
}

.reset-button,
.select-all-button,
.cancel-button {
	min-height: 38px;
	padding: 0 14px;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1px solid var(--border-default);
	border-radius: 6px;
	background: rgba(79, 96, 117, 0.18);
	color: var(--text-secondary);
	font-size: 12px;	
	white-space: nowrap;
	cursor: pointer;
}

.element-tabs {
	min-height: 44px;
	display: grid;
	grid-template-columns: repeat(6, minmax(0, 1fr));
	border: 1px solid var(--border-default);
	border-radius: 6px 6px 0 0;
	overflow: hidden;
}

.element-tab {
	min-width: 0;
	min-height: 42px;
	padding: 0 3px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-right: 1px solid var(--border-subtle);
	color: var(--text-secondary);
	font-size: 12px;
	white-space: nowrap;
	cursor: pointer;
}

.element-tab:last-child {
	border-right: 0;
}

.element-tab.active {
	background: rgba(20, 111, 207, 0.32);
	color: var(--accent-text);
	box-shadow: inset 0 -2px #208eff;
}

.element-tab.element-1.active { box-shadow: inset 0 -2px #ff626c; color: #ff9ca2; }
.element-tab.element-2.active { box-shadow: inset 0 -2px #48a8ff; color: #88caff; }
.element-tab.element-3.active { box-shadow: inset 0 -2px #40cd94; color: var(--success); }
.element-tab.element-4.active { box-shadow: inset 0 -2px #e9c34b; color: #f3dc86; }
.element-tab.element-5.active { box-shadow: inset 0 -2px #b279ff; color: #d0aaff; }

.role-grid-scroll {
	width: 100%;
	height: min(35vh, 300px);
	min-height: 170px;
	border: 1px solid var(--border-default);
	border-top: 0;
	border-radius: 0 0 6px 6px;
	background: var(--bg-panel-soft);
}

.role-grid {
	padding: 10px;
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(74px, 1fr));
	gap: 8px;
}

.role-option {
	position: relative;
	min-width: 0;
	padding: 6px 4px;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 5px;
	border: 1px solid transparent;
	border-radius: 7px;
	background: var(--bg-subtle);
	cursor: pointer;
}

.role-option.selected {
	border-color: #278ff0;
	background: var(--bg-selected);
	box-shadow: 0 0 9px rgba(24, 132, 234, 0.22);
}

.role-option:not(.selected) .role-image {
	filter: saturate(0.58) brightness(1.16);
	opacity: 0.76;
}

.role-option.selected .role-image {
	filter: none;
	opacity: 1;
}

.role-image {
	width: 58px;
	height: 58px;
	border: 1px solid rgba(104, 157, 203, 0.48);
	border-radius: 7px;
	background: var(--bg-subtle);
}

.role-placeholder {
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--text-secondary);
	font-size: 20px;
}

.role-name {
	width: 100%;
	overflow: hidden;
	color: var(--text-secondary);
	font-size: 10px;
	text-align: center;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.no-role-state {
	min-height: 160px;
}

.selection-summary {
	padding-top: 8px;
	color: var(--text-muted);
	font-size: 11px;
	text-align: right;
}

.save-success-tip {
	box-sizing: border-box;
	height: 35px;
	padding: 0 18px;
	display: flex;
	align-items: center;
	border-top: 1px solid transparent;
	background: transparent;
	color: var(--success);
	font-size: 12px;
	visibility: hidden;
}

.save-success-tip.is-visible {
	border-top-color: rgba(64, 205, 148, 0.24);
	background: rgba(64, 205, 148, 0.08);
	visibility: visible;
}

.modal-footer {
	min-height: 64px;
	padding: 10px 18px;
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 10px;
	border-top: 1px solid var(--border-subtle);
}

.modal-footer .select-all-button {
	margin-right: auto;
}

.select-all-button {
	border-color: rgba(58, 119, 232, 0.68);
	color: var(--accent-text);
}

.cancel-button {
	min-width: 76px;
}

.save-button {
	min-width: 94px;
	padding: 10px 14px;
}

.disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.account-guide-overlay {
	position: fixed;
	inset: 0;
	z-index: 100001;
	pointer-events: none;
}

.account-guide-spotlight {
	position: fixed;
	box-sizing: border-box;
	border: 2px solid #ffd34e;
	border-radius: 10px;
	box-shadow: 0 0 0 9999px var(--mask), 0 0 22px rgba(255, 198, 48, 0.72);
	pointer-events: none;
}

.account-guide-card {
	position: fixed;
	z-index: 2;
	box-sizing: border-box;
	padding: 16px;
	border: 1px solid rgba(255, 211, 78, 0.65);
	border-radius: 12px;
	background: linear-gradient(145deg, var(--bg-elevated), var(--bg-elevated));
	box-shadow: 0 10px 32px var(--shadow), 0 0 18px rgba(255, 194, 36, 0.12);
	color: var(--text-primary);
	pointer-events: auto;
}

.account-guide-progress {
	margin-bottom: 7px;
	color: #ffd34e;
	font-size: 11px;
}

.account-guide-title {
	margin-bottom: 7px;
	font-size: 16px;
	font-weight: bold;
}

.account-guide-description {
	min-height: 38px;
	color: var(--text-secondary);
	font-size: 13px;
	line-height: 1.6;
}

.account-guide-actions {
	margin-top: 13px;
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 10px;
}

.account-guide-skip,
.account-guide-next {
	min-width: 72px;
	height: 32px;
	padding: 0 12px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 7px;
	font-size: 12px;
	cursor: pointer;
}

.account-guide-skip {
	border: 1px solid var(--border-default);
	color: var(--text-secondary);
}

.account-guide-next {
	background: #087df5;
	color: #fff;
	font-weight: bold;
}

.feature-dialog-enter-active {
	transition: opacity 0.32s ease;
}

.feature-dialog-leave-active {
	transition: opacity 0.2s ease;
}

.feature-dialog-enter-from,
.feature-dialog-leave-to {
	opacity: 0;
}

.feature-dialog-enter-active :deep(.coin-modal),
.feature-dialog-enter-active :deep(.stats-modal),
.feature-dialog-enter-active :deep(.package-modal) {
	transition:
		opacity 0.36s ease,
		transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.feature-dialog-leave-active :deep(.coin-modal),
.feature-dialog-leave-active :deep(.stats-modal),
.feature-dialog-leave-active :deep(.package-modal) {
	transition:
		opacity 0.2s ease,
		transform 0.24s ease;
}

.feature-dialog-enter-from :deep(.coin-modal),
.feature-dialog-enter-from :deep(.stats-modal),
.feature-dialog-enter-from :deep(.package-modal) {
	opacity: 0;
	transform: translate3d(0, 22px, 0) scale(0.965);
}

.feature-dialog-leave-to :deep(.coin-modal),
.feature-dialog-leave-to :deep(.stats-modal),
.feature-dialog-leave-to :deep(.package-modal) {
	opacity: 0;
	transform: translate3d(0, 10px, 0) scale(0.985);
}

@media (prefers-reduced-motion: reduce) {
	.feature-dialog-enter-active,
	.feature-dialog-leave-active,
	.feature-dialog-enter-active :deep(.coin-modal),
	.feature-dialog-enter-active :deep(.stats-modal),
	.feature-dialog-enter-active :deep(.package-modal),
	.feature-dialog-leave-active :deep(.coin-modal),
	.feature-dialog-leave-active :deep(.stats-modal),
	.feature-dialog-leave-active :deep(.package-modal) {
		transition-duration: 0.01ms;
	}
}

@media screen and (max-width: 900px) {
	.account-panel {
		padding: 0;
	}

	.table-header,
	.pool-row {
		gap: 8px;
	}

	.table-header,
	.pool-row {
		padding-left: 10px;
		padding-right: 10px;
	}

	.feature-buttons {
		gap: 5px;
	}

	.name-column {
		width: 15%;
		flex-basis: 15%;
	}

	.actions-column {
		width: 96px;
		flex-basis: 96px;
	}

	.feature-button {
		padding: 0 7px;
		font-size: 11px;
	}
}

@media screen and (max-width: 700px) {
	.account-hero {
		padding: 15px;
	}

	.account-page-title {
		font-size: 21px;
	}

	.account-hero-actions {
		width: 100%;
	}

	.account-hero-actions .add-button {
		flex: 1;
	}

	.account-panel {
		min-height: 260px;
		margin-top: 10px;
		padding: 0;
		border: 0;
		box-shadow: none;
	}

	.table-header {
		display: none;
	}

	.table-wrap {
		width: 100%;
		margin-left: 0;
		border: 0;
		border-radius: 0;
		overflow: visible;
	}

	.guest-list-state {
		border-top: 0;
	}

	.pool-list {
		padding: 12px 13px 13px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.pool-row {
		padding: 12px;
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		align-items: stretch;
		gap: 8px;
		border: 1px solid var(--border-default);
		border-radius: 8px;
		background: var(--bg-panel-soft);
	}

	.pool-row:nth-child(even) {
		background: var(--bg-panel-soft);
	}

	.name-column {
		width: auto;
		flex-basis: auto;
		grid-column: 1 / -1;
	}

	.features-column,
	.actions-column,
	.feature-buttons,
	.row-actions {
		display: contents;
	}

	.feature-button,
	.text-action {
		min-height: 48px;
		padding: 0 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 6px;
		font-size: 13px;
		text-align: center;
	}

	.text-action {
		min-width: 0;
	}

	.edit-action {
		border-color: rgba(22, 140, 255, 0.5);
		background: var(--accent-soft);
	}

	.delete-action {
		border-color: rgba(196, 72, 87, 0.5);
		background: var(--danger-soft);
	}

	.modal-mask {
		padding: 10px 6px;
	}

	.editor-modal {
		max-height: 96vh;
	}

	.editor-modal.is-guide-open {
		height: calc(100vh - 20px);
		max-height: calc(100vh - 20px);
	}

	.editor-body {
		padding: 8px;
		gap: 8px;
	}

	.form-section {
		padding: 13px 10px;
	}

	.section-title {
		margin-bottom: 11px;
		font-size: 14px;
	}

	.element-tab {
		font-size: 10px;
	}

	.role-grid-scroll {
		height: 32vh;
		min-height: 150px;
	}

	.role-grid {
		grid-template-columns: repeat(auto-fill, minmax(66px, 1fr));
		gap: 5px;
		padding: 7px;
	}

	.role-image {
		width: 51px;
		height: 51px;
	}

	.modal-footer {
		min-height: 58px;
		padding: 8px;
		gap: 6px;
	}

	.select-all-button,
	.cancel-button {
		padding: 0 9px;
		font-size: 11px;
	}

	.save-button {
		min-width: 82px;
		padding: 9px 10px;
		font-size: 12px;
	}
}
</style>
