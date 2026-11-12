<template>
	<view v-if="guideVisible" class="guide-overlay" @click.stop>
		<view class="guide-spotlight" :style="guideSpotlightStyle"></view>
		<view class="guide-card" :style="guideCardStyle">
			<view class="guide-progress">新手引导　{{ guideStepIndex + 1 }} / {{ guideSteps.length }}</view>
			<view class="guide-title">{{ currentGuideStep.title }}</view>
			<view class="guide-description">{{ currentGuideStep.description }}</view>
			<view class="guide-actions">
				<view class="guide-skip" @click.stop="skipGuide">跳过</view>
				<view class="guide-next" @click.stop="nextGuideStep">
					{{ isLastGuideStep ? '完成' : '下一步' }}
				</view>
			</view>
		</view>
	</view>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { getGuideConfig, saveGuideConfig } from '../api/user';

const props = withDefaults(defineProps<{
	active?: boolean;
	operationOpen?: boolean;
	includeImport?: boolean;
	importCompleted?: boolean;
	location?: 'team' | 'group';
	packageKind?: 'three' | 'six';
}>(), {
	active: false,
	operationOpen: false,
	includeImport: false,
	importCompleted: false,
	location: 'team',
	packageKind: 'three',
});

const emit = defineEmits<{
	(event: 'close-operation'): void;
}>();

type GuideStepKey = 'boss' | 'filters' | 'import' | 'roles' | 'lock' | 'links';

interface GuideStep {
	key: GuideStepKey;
	target: string;
	fallback?: string;
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

const guideConfigLoaded = ref(false);
const guideConfigEnabled = ref(false);
const guideMarkedSeen = ref(false);
const guideVisible = ref(false);
const guideStepKey = ref<GuideStepKey>('boss');
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

const bossGuideStep = computed<GuideStep>(() => ({
	key: 'boss',
	target: '.team-guide-target-boss',
	title: '选择目标 BOSS',
	description: props.packageKind === 'six'
		? '低阶段与高阶段各三排 BOSS，可分别指定每刀目标；再次点击已选 BOSS 可取消筛选。'
		: '三排 BOSS 可分别指定每刀的目标；再次点击已选 BOSS 可取消筛选。',
}));
const filtersGuideStep = computed<GuideStep>(() => ({
	key: 'filters',
	target: '.team-guide-target-filters',
	title: props.packageKind === 'six' ? '设置难度与阶段' : '设置难度',
	description: props.packageKind === 'six'
		? '选择难度，并按 B/C 阶段缩小套餐范围；难度只要求 D 面三刀各自包含，B/C 阶段不受限制。'
		: '选择难度，缩小三刀套餐范围；三刀需各自包含所选难度。',
}));
const importGuideStep = computed<GuideStep>(() => ({
	key: 'import',
	target: '.team-guide-target-import',
	title: '导入到排刀',
	description: props.packageKind === 'six'
		? '最后点击套餐右上角的“导入到排刀”，将三刀及返还刀写入公会本月快捷排刀；已有数据时会先询问是否覆盖。'
		: '最后点击套餐右上角的“导入到排刀”，将这三刀写入公会本月快捷排刀；已有数据时会先询问是否覆盖。',
}));
const rolesGuideStep: GuideStep = {
	key: 'roles',
	target: '.team-guide-target-roles',
	title: '查看角色阵容',
	description: '点击任意作业中的角色阵容，打开作业操作；如果不需要操作，可直接点击“下一步”查看作业链接。',
};
const lockGuideStep: GuideStep = {
	key: 'lock',
	target: '.team-guide-target-lock',
	title: '锁定作业',
	description: '在作业操作弹窗中点击【锁定】，将这份作业固定到套餐；也可以关闭弹窗后继续查看作业链接。',
};
const linksGuideStep: GuideStep = {
	key: 'links',
	target: '.team-guide-target-link',
	fallback: '.three-set-hit-links',
	title: '查看作业链接',
	description: '点击作业链接可查看对应作业详情；完成或跳过后，本引导不再自动显示。',
};

const guideSteps = computed<GuideStep[]>(() => {
	const steps = [
		bossGuideStep.value,
		filtersGuideStep.value,
		rolesGuideStep,
	];

	if (props.operationOpen) {
		steps.push(lockGuideStep);
	}

	steps.push(linksGuideStep);

	if (props.includeImport) {
		steps.push(importGuideStep.value);
	}

	return steps;
});
const guideStepIndex = computed(() => {
	const index = guideSteps.value.findIndex((step) => step.key === guideStepKey.value);
	return index >= 0 ? index : Math.max(0, guideSteps.value.length - 1);
});
const currentGuideStep = computed<GuideStep>(() => (
	guideSteps.value[guideStepIndex.value] || bossGuideStep.value
));
const isLastGuideStep = computed(() => (
	guideStepIndex.value === guideSteps.value.length - 1
));

let guideConfigPromise: Promise<void> | null = null;
let repositionTimer: ReturnType<typeof setTimeout> | null = null;
let unmounted = false;

function clearRepositionTimer(): void {
	if (repositionTimer !== null) {
		clearTimeout(repositionTimer);
		repositionTimer = null;
	}
}

function hideGuideWithoutSaving(): void {
	guideVisible.value = false;
	guideStepKey.value = 'boss';
	clearRepositionTimer();
}

async function ensureGuideConfig(): Promise<void> {
	if (guideConfigLoaded.value) {
		return;
	}

	if (guideConfigPromise) {
		return guideConfigPromise;
	}

	const pendingConfig = (async (): Promise<void> => {
		try {
			const enabled = await getGuideConfig(props.location);
			guideConfigLoaded.value = true;
			if (!guideMarkedSeen.value) {
				guideConfigEnabled.value = enabled;
			}
		} catch (error) {
			console.error(
				`获取${props.packageKind === 'six' ? '满补套餐' : 'D 面套餐'}新手引导配置失败：`,
				error,
			);
			guideConfigLoaded.value = true;
		} finally {
			guideConfigPromise = null;
		}
	})();

	guideConfigPromise = pendingConfig;
	return pendingConfig;
}

function maybeStartGuide(): void {
	if (
		!props.active
		|| props.operationOpen
		|| guideVisible.value
		|| guideMarkedSeen.value
	) {
		return;
	}

	if (!guideConfigLoaded.value) {
		void ensureGuideConfig().then(() => {
			if (!unmounted) {
				maybeStartGuide();
			}
		});
		return;
	}

	if (!guideConfigEnabled.value) {
		return;
	}

	void nextTick(() => {
		if (
			unmounted
			|| !props.active
			|| !guideConfigEnabled.value
			|| guideVisible.value
			|| guideMarkedSeen.value
		) {
			return;
		}

		guideStepKey.value = 'boss';
		guideVisible.value = true;
		void nextTick(() => positionGuideTarget());
	});
}

function positionGuideTarget(allowScroll: boolean = true): void {
	if (!guideVisible.value) {
		return;
	}

	const step = currentGuideStep.value;
	if (!step) {
		return;
	}

	// #ifdef H5
	const h5Target = [step.target, step.fallback]
		.filter((selector): selector is string => Boolean(selector))
		.map((selector) => document.querySelector(selector))
		.find((element): element is Element => Boolean(element));
	if (h5Target) {
		applyGuidePosition(h5Target.getBoundingClientRect(), h5Target, allowScroll);
		return;
	}
	// #endif

	const selectors = [step.target, step.fallback]
		.filter((selector): selector is string => Boolean(selector));
	const query = uni.createSelectorQuery();
	selectors.forEach((selector) => query.select(selector).boundingClientRect());
	query.exec((rects) => {
		const rect = (rects || []).find((item) => Boolean(item));
		if (rect) {
			applyGuidePosition(rect, null, false);
		}
	});
}

function applyGuidePosition(
	rect: GuideRect,
	target: Element | null,
	allowScroll: boolean,
): void {
	const windowInfo = uni.getSystemInfoSync();
	const windowWidth = windowInfo.windowWidth || 375;
	const windowHeight = windowInfo.windowHeight || 700;

	if (
		allowScroll
		&& (rect.top < 12 || rect.bottom > windowHeight - 80)
		&& target
	) {
		// #ifdef H5
		target.scrollIntoView({ behavior: 'auto', block: 'center' });
		clearRepositionTimer();
		repositionTimer = setTimeout(() => {
			repositionTimer = null;
			positionGuideTarget(false);
		}, 50);
		return;
		// #endif
	}

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
	const estimatedCardHeight = 190;
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

function nextGuideStep(): void {
	const steps = guideSteps.value;
	const index = guideStepIndex.value;
	const currentStep = steps[index];

	if (currentStep?.key === 'lock' && props.operationOpen) {
		emit('close-operation');
	}

	if (index >= steps.length - 1) {
		finishGuide();
		return;
	}

	const nextStep = steps[index + 1];
	if (!nextStep) {
		finishGuide();
		return;
	}

	guideStepKey.value = (
		nextStep.key === 'roles' && props.operationOpen
			? 'lock'
			: nextStep.key
	);
	void nextTick(() => positionGuideTarget());
}

function skipGuide(): void {
	finishGuide();
}

function finishGuide(showError: boolean = true): void {
	hideGuideWithoutSaving();
	if (guideMarkedSeen.value) {
		return;
	}

	guideMarkedSeen.value = true;
	guideConfigEnabled.value = false;
	guideConfigLoaded.value = true;
	void persistGuideConfig(showError);
}

async function persistGuideConfig(showError: boolean): Promise<void> {
	try {
		await saveGuideConfig(props.location);
	} catch (error) {
		console.error(
			`保存${props.packageKind === 'six' ? '满补套餐' : 'D 面套餐'}新手引导状态失败：`,
			error,
		);
		if (showError) {
			uni.showToast({
				title: error instanceof Error ? error.message : '保存新手引导状态失败',
				icon: 'none',
			});
		}
	}
}

watch(
	() => props.active,
	(active) => {
		if (active) {
			maybeStartGuide();
			return;
		}

		if (guideVisible.value) {
			hideGuideWithoutSaving();
		}
	},
	{ immediate: true },
);

watch(
	() => props.operationOpen,
	(open) => {
		if (!guideVisible.value) {
			if (!open) {
				maybeStartGuide();
			}
			return;
		}

		if (
			open
			&& guideStepKey.value !== 'lock'
			&& guideStepKey.value !== 'links'
			&& guideStepKey.value !== 'import'
		) {
			guideStepKey.value = 'lock';
			void nextTick(() => positionGuideTarget());
			return;
		}

		if (!open && guideStepKey.value === 'lock') {
			guideStepKey.value = 'links';
			void nextTick(() => positionGuideTarget());
		}
	},
);

watch(
	() => props.importCompleted,
	(completed) => {
		if (
			!completed
			|| !guideVisible.value
			|| guideStepKey.value !== 'import'
		) {
			return;
		}

		finishGuide();
	},
);

onBeforeUnmount(() => {
	unmounted = true;
	clearRepositionTimer();
});
</script>

<style scoped>
.guide-overlay {
	position: fixed;
	inset: 0;
	z-index: 100001;
	pointer-events: none;
}

.guide-spotlight {
	position: fixed;
	box-sizing: border-box;
	border: 2px solid #ffd34e;
	border-radius: 10px;
	box-shadow: 0 0 0 9999px var(--mask), 0 0 22px rgba(255, 198, 48, 0.72);
	pointer-events: none;
}

.guide-card {
	position: fixed;
	z-index: 2;
	box-sizing: border-box;
	padding: 16px;
	border: 1px solid rgba(255, 211, 78, 0.65);
	border-radius: 12px;
	background: var(--bg-elevated);
	box-shadow: 0 10px 32px var(--shadow), 0 0 18px rgba(255, 194, 36, 0.12);
	color: var(--text-primary);
	pointer-events: auto;
}

.guide-progress {
	margin-bottom: 7px;
	color: #ffd34e;
	font-size: 11px;
}

.guide-title {
	margin-bottom: 7px;
	font-size: 16px;
	font-weight: bold;
}

.guide-description {
	min-height: 38px;
	color: var(--text-secondary);
	font-size: 13px;
	line-height: 1.6;
}

.guide-actions {
	margin-top: 13px;
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 10px;
}

.guide-skip,
.guide-next {
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

.guide-skip {
	border: 1px solid var(--border-default);
	color: var(--text-secondary);
}

.guide-next {
	background: #087df5;
	color: #fff;
	font-weight: bold;
}
</style>
