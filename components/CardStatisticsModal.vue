<template>
	<view class="stats-modal-mask" @click="requestClose">
		<view class="stats-modal" @click.stop>
			<view class="stats-header">
				<view class="stats-heading">
					<view class="stats-title">抽卡统计</view>
					<view class="stats-subtitle">
						{{ displayPoolName }}<text v-if="selectedYear"> · {{ selectedYear }} 年</text>
					</view>
				</view>
				<view class="stats-close" @click="requestClose">×</view>
			</view>

			<view
				v-if="yearMenuOpen"
				class="year-menu-backdrop"
				@click="closeYearMenu"
			></view>

			<view class="stats-toolbar">
				<view class="year-control">
					<text class="toolbar-label">统计年份</text>
					<view class="year-select-wrap">
						<view
							class="year-picker"
							:class="{
								disabled: loading || submitting || exporting,
								open: yearMenuOpen,
							}"
							@click.stop="toggleYearMenu"
						>
							<text>{{ selectedYear || '加载中' }}</text>
							<text class="picker-arrow">▾</text>
						</view>
						<view v-if="yearMenuOpen" class="year-menu">
							<view
								v-for="year in availableYears"
								:key="year"
								class="year-menu-item"
								:class="{ active: year === selectedYear }"
								@click.stop="selectYear(year)"
							>{{ year }}</view>
						</view>
					</view>
				</view>
				<view v-if="draftNotice" class="draft-notice">{{ draftNotice }}</view>
			</view>

			<scroll-view class="stats-content" scroll-y>
				<view v-if="loading" class="stats-state">
					<view class="loading-spinner"></view>
					<text>正在加载抽卡角色...</text>
				</view>

				<view v-else-if="loadError" class="stats-state error-state">
					<text>{{ loadError }}</text>
					<view class="retry-button" @click="retryLoad">重新加载</view>
				</view>

				<template v-else>
					<view v-if="!roles.length" class="stats-state empty-state">
						<text>当前年份没有可记录的抽卡角色</text>
					</view>

					<view v-else class="role-entry-list">
						<view
							v-for="role in roles"
							:key="role.id"
							class="role-entry"
							:class="{ 'entry-error': !!rowErrors[role.id] }"
						>
							<view class="role-avatar-frame">
								<image
									v-if="role.image_url && !failedImageIds.includes(role.id)"
									class="role-avatar"
									:src="role.image_url"
									mode="aspectFill"
									@error="markImageFailed(role.id)"
								/>
								<view v-else class="role-avatar role-avatar-placeholder">
									{{ role.name.slice(0, 1) }}
								</view>
							</view>
							<view class="role-copy">
								<text class="role-name" :title="role.name">{{ role.name }}</text>
								<text v-if="rowErrors[role.id]" class="row-error">
									{{ rowErrors[role.id] }}
								</text>
							</view>
							<view class="count-control">
								<input
									class="count-input"
									type="number"
									inputmode="numeric"
									step="1"
									:value="formValues[role.id] ?? ''"
									placeholder="未记录"
									:disabled="submitting || exporting"
									@input="handleCountInput(role.id, $event)"
								/>
								<text class="count-unit">抽</text>
							</view>
						</view>
					</view>

					<view v-if="reportGenerated" class="report-wrap">
						<view v-if="reportRows.length" class="report-panel">
							<view class="report-head">
								<view>
									<view class="report-eyebrow">PULL REPORT · {{ selectedYear }}</view>
									<view class="report-title">{{ displayPoolName }} 抽卡统计</view>
								</view>
								<view class="report-summary">
									<text>{{ reportRows.length }} 名角色</text>
									<text>合计 {{ totalDraws }} 抽</text>
								</view>
							</view>

							<view class="report-columns">
								<text></text>
								<text>角色 / 抽数进度</text>
								<text>抽数</text>
								<text>评价</text>
							</view>

							<view class="report-list">
								<view
									v-for="row in reportRows"
									:key="row.id"
									class="report-row"
								>
									<view class="report-avatar-frame">
										<image
											v-if="row.image_url && !failedImageIds.includes(row.id)"
											class="report-avatar"
											:src="row.image_url"
											mode="aspectFill"
											@error="markImageFailed(row.id)"
										/>
										<view v-else class="report-avatar report-avatar-placeholder">
											{{ row.name.slice(0, 1) }}
										</view>
									</view>
									<view class="report-main">
										<text class="report-name">{{ row.name }}</text>
										<view class="report-track">
											<view
												v-if="row.count > 0"
												class="report-bar"
												:style="reportBarStyle(row.count)"
											></view>
											<view v-else class="zero-marker"></view>
										</view>
									</view>
									<view class="report-count-cell">
										<text class="report-count">{{ row.count }}</text>
										<text class="report-count-unit">抽</text>
									</view>
									<view
										class="report-evaluation"
										:class="'level-' + evaluationLevel(row)"
									>
										{{ evaluationTitle(row) }}
									</view>
								</view>
							</view>
						</view>
						<view v-else class="stats-state empty-report">
							<text>还没有填写任何抽数，暂无可展示的统计报告</text>
						</view>
					</view>
				</template>
			</scroll-view>

			<view class="stats-footer">
				<view class="footer-tip">编辑内容只会保存在本机草稿，生成报告时才会写入数据库</view>
				<view class="footer-actions">
					<view
						class="footer-button primary"
						:class="{ disabled: submitting || exporting || loading || !!loadError }"
						@click="generateReport"
					>{{ submitting ? '保存中...' : '生成统计报告' }}</view>
					<view
						class="footer-button export"
						:class="{ disabled: exporting || submitting || !reportRows.length }"
						@click="exportReport"
					>{{ exporting ? '导出中...' : '保存为图片' }}</view>
				</view>
			</view>

			<canvas
				:id="EXPORT_CANVAS_ID"
				:canvas-id="EXPORT_CANVAS_ID"
				class="export-canvas"
				:style="{ width: EXPORT_WIDTH + 'px', height: exportHeight + 'px' }"
			></canvas>
		</view>
	</view>
</template>

<script setup lang="ts">
import {
	computed,
	getCurrentInstance,
	nextTick,
	onBeforeUnmount,
	onMounted,
	ref,
} from 'vue';
import { getCardStatisticsRoles, saveCardStatistics } from '../api/cardStatistics';
import { errorMessage } from '../api/errors';
import type {
	CardLuckEvaluation,
	CardStatisticsEntry,
	CardStatisticsReportRole,
	CardStatisticsRole,
} from '../api/types';

const props = defineProps<{
	poolId: number;
	poolName?: string;
	userId: string | number;
}>();

const emit = defineEmits<{ (event: 'close'): void }>();

const EXPORT_CANVAS_ID = 'card-statistics-export';
const EXPORT_WIDTH = 960;
const EXPORT_HEADER_HEIGHT = 138;
const EXPORT_ROW_HEIGHT = 92;
const EXPORT_FOOTER_HEIGHT = 46;
const MAX_EXPORT_DIMENSION = 30000;
const MAX_EXPORT_AREA = 16000000;
const EVALUATION_COLORS = [
	'#6d91b4',
	'#f5c451',
	'#f39a3d',
	'#4fd08a',
	'#62b4ff',
	'#e8b84b',
	'#f06a73',
	'#f06a73',
	'#ffd166',
];
const REPORT_BAR_STOPS: Array<{
	position: number;
	color: [number, number, number];
}> = [
	{ position: 0, color: [47, 202, 121] },
	{ position: 0.35, color: [158, 210, 74] },
	{ position: 0.6, color: [240, 193, 67] },
	{ position: 0.8, color: [239, 124, 56] },
	{ position: 1, color: [228, 71, 82] },
];

const instance = getCurrentInstance();
const roles = ref<CardStatisticsRole[]>([]);
const availableYears = ref<number[]>([]);
const selectedYear = ref<number | null>(null);
const accountNickname = ref('');
const formValues = ref<Record<number, string>>({});
const baselineValues = ref<Record<number, string>>({});
const rowErrors = ref<Record<number, string>>({});
const failedImageIds = ref<number[]>([]);
const loading = ref(true);
const loadError = ref('');
const submitting = ref(false);
const exporting = ref(false);
const reportRows = ref<CardStatisticsReportRole[]>([]);
const reportGenerated = ref(false);
const draftNotice = ref('');
const yearMenuOpen = ref(false);

let loadVersion = 0;

const displayPoolName = computed(() => (
	accountNickname.value || props.poolName || `游戏账号 #${props.poolId}`
));

const totalDraws = computed(() => (
	reportRows.value.reduce((total, row) => total + Number(row.count || 0), 0)
));

const exportHeight = computed(() => (
	EXPORT_HEADER_HEIGHT
	+ Math.max(1, reportRows.value.length) * EXPORT_ROW_HEIGHT
	+ EXPORT_FOOTER_HEIGHT
));

const exportScale = computed(() => {
	const height = exportHeight.value;
	const dimensionScale = MAX_EXPORT_DIMENSION / height;
	const areaScale = Math.sqrt(MAX_EXPORT_AREA / (EXPORT_WIDTH * height));
	return Math.max(0.05, Math.min(2, dimensionScale, areaScale));
});

const hasDirtyDraft = computed(() => isDirty());

onMounted(() => {
	void loadData();
});

onBeforeUnmount(() => {
	loadVersion += 1;
	yearMenuOpen.value = false;
	persistCurrentDraft();
});

async function loadData(year?: number): Promise<void> {
	const currentLoad = ++loadVersion;
	yearMenuOpen.value = false;
	if (year !== undefined) {
		selectedYear.value = year;
	}
	loading.value = true;
	loadError.value = '';
	draftNotice.value = '';
	reportRows.value = [];
	reportGenerated.value = false;
	failedImageIds.value = [];
	roles.value = [];
	formValues.value = {};
	baselineValues.value = {};
	rowErrors.value = {};

	try {
		const data = await getCardStatisticsRoles(props.poolId, year);
		if (currentLoad !== loadVersion) return;

		accountNickname.value = data.account?.nickname || '';
		availableYears.value = Array.isArray(data.available_years)
			? data.available_years.map((item) => Number(item)).filter((item) => item > 0)
			: [];
		selectedYear.value = Number(data.year) || null;
		roles.value = Array.isArray(data.roles) ? data.roles : [];

		const baseline = buildBaseline(roles.value);
		baselineValues.value = baseline;
		formValues.value = baseline;

		const draft = readDraft(selectedYear.value);

		if (draft) {
			const restored = { ...baseline };
			roles.value.forEach((role) => {
				const value = draft[String(role.id)];
				if (typeof value === 'string') {
					restored[role.id] = value;
				}
			});
			formValues.value = restored;

			if (isDirty()) {
				draftNotice.value = '已恢复本机未保存草稿';
			} else {
				clearDraft(selectedYear.value);
			}
		}
	} catch (error) {
		if (currentLoad !== loadVersion) return;
		loadError.value = errorMessage(error, '加载抽卡统计失败，请稍后重试');
	} finally {
		if (currentLoad === loadVersion) {
			loading.value = false;
		}
	}
}

function retryLoad(): void {
	void loadData(selectedYear.value ?? undefined);
}

function toggleYearMenu(): void {
	if (loading.value || submitting.value || exporting.value) return;
	if (!availableYears.value.length) return;
	yearMenuOpen.value = !yearMenuOpen.value;
}

function closeYearMenu(): void {
	yearMenuOpen.value = false;
}

function selectYear(year: number): void {
	yearMenuOpen.value = false;
	if (loading.value || submitting.value || exporting.value) return;
	if (!year || year === selectedYear.value) return;

	persistCurrentDraft();
	void loadData(year);
}

function buildBaseline(list: CardStatisticsRole[]): Record<number, string> {
	const result: Record<number, string> = {};

	list.forEach((role) => {
		result[role.id] = role.saved_count === null
			? ''
			: String(role.saved_count);
	});

	return result;
}

function handleCountInput(roleId: number, event: { detail: { value: string | number } }): void {
	const value = String(event.detail?.value ?? '');
	formValues.value = {
		...formValues.value,
		[roleId]: value,
	};

	const error = validateValue(value);
	rowErrors.value = {
		...rowErrors.value,
		[roleId]: error,
	};

	if (reportGenerated.value && isDirty()) {
		reportGenerated.value = false;
		reportRows.value = [];
	}

	persistCurrentDraft();
}

function validateValue(value: string): string {
	const trimmed = value.trim();

	if (trimmed === '') return '';

	if (!/^\d+$/.test(trimmed)) {
		return '请输入 0～200 的整数';
	}

	const numericValue = Number(trimmed);

	if (!Number.isInteger(numericValue) || numericValue < 0 || numericValue > 200) {
		return '抽数必须在 0～200 之间';
	}

	return '';
}

function validateAll(): boolean {
	const errors: Record<number, string> = {};
	let firstError = '';

	roles.value.forEach((role) => {
		const error = validateValue(formValues.value[role.id] ?? '');
		if (error) {
			errors[role.id] = error;
			if (!firstError) firstError = `${role.name}：${error}`;
		}
	});

	rowErrors.value = errors;

	if (firstError) {
		uni.showToast({ title: firstError, icon: 'none', duration: 2600 });
		return false;
	}

	return true;
}

function buildEntries(): CardStatisticsEntry[] {
	return roles.value
		.map((role) => {
			const value = (formValues.value[role.id] ?? '').trim();
			return value === ''
				? null
				: { id: role.id, count: Number(value) };
		})
		.filter((entry): entry is CardStatisticsEntry => entry !== null);
}

async function generateReport(): Promise<void> {
	if (submitting.value || exporting.value || loading.value || loadError.value) return;

	if (!selectedYear.value) {
		uni.showToast({ title: '请先选择年份', icon: 'none' });
		return;
	}

	if (!validateAll()) return;

	const entries = buildEntries();
	submitting.value = true;
	reportRows.value = [];
	reportGenerated.value = false;

	try {
		const result = await saveCardStatistics({
			account_id: props.poolId,
			year: selectedYear.value,
			data: entries,
		});

		const savedEntries = new Map<number, number>();
		result.data.forEach((entry) => {
			savedEntries.set(Number(entry.id), Number(entry.count));
		});

		const nextBaseline: Record<number, string> = {};
		roles.value.forEach((role) => {
			nextBaseline[role.id] = savedEntries.has(role.id)
				? String(savedEntries.get(role.id))
				: '';
		});

		formValues.value = { ...nextBaseline };
		baselineValues.value = nextBaseline;
		reportRows.value = Array.isArray(result.report) ? result.report : [];
		reportGenerated.value = true;
		clearDraft(selectedYear.value);
		uni.showToast({ title: '已保存并生成报告', icon: 'success' });
	} catch (error) {
		uni.showToast({
			title: errorMessage(error, '保存失败，请稍后重试'),
			icon: 'none',
			duration: 2600,
		});
	} finally {
		submitting.value = false;
	}
}

function requestClose(): void {
	yearMenuOpen.value = false;
	if (submitting.value || exporting.value) {
		uni.showToast({ title: '正在处理，请稍候', icon: 'none' });
		return;
	}

	if (!hasDirtyDraft.value) {
		emit('close');
		return;
	}

	persistCurrentDraft();
	uni.showModal({
		title: '存在未生成报告的修改',
		content: '当前内容已保存在本机草稿，下次打开该账号和年份时可恢复。确定关闭吗？',
		confirmText: '关闭',
		cancelText: '继续编辑',
		success: (result) => {
			if (result.confirm) {
				emit('close');
			}
		},
	});
}

function persistCurrentDraft(): void {
	const year = selectedYear.value;
	if (!year) return;

	if (!isDirty()) {
		clearDraft(year);
		return;
	}

	const snapshot: Record<string, string> = {};
	roles.value.forEach((role) => {
		snapshot[String(role.id)] = formValues.value[role.id] ?? '';
	});

	try {
		uni.setStorageSync(draftKey(year), snapshot);
	} catch {
		draftNotice.value = '本机草稿保存失败，请暂勿关闭页面';
	}
}

function isDirty(): boolean {
	return roles.value.some((role) => (
		canonicalValue(formValues.value[role.id] ?? '')
		!== canonicalValue(baselineValues.value[role.id] ?? '')
	));
}

function canonicalValue(value: string): string {
	const trimmed = value.trim();
	if (trimmed === '') return '';
	return /^\d+$/.test(trimmed) ? String(Number(trimmed)) : trimmed;
}

function draftKey(year: number): string {
	return `pcr.card-statistics.draft:${props.userId}:${props.poolId}:${year}`;
}

function readDraft(year: number | null): Record<string, string> | null {
	if (!year) return null;

	let value: unknown;

	try {
		value = uni.getStorageSync(draftKey(year));
	} catch {
		return null;
	}

	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return null;
	}

	return value as Record<string, string>;
}

function clearDraft(year: number | null): void {
	if (!year) return;

	try {
		uni.removeStorageSync(draftKey(year));
		draftNotice.value = '';
	} catch {
		draftNotice.value = '本机草稿清理失败';
	}
}

function markImageFailed(roleId: number): void {
	if (!failedImageIds.value.includes(roleId)) {
		failedImageIds.value = [...failedImageIds.value, roleId];
	}
}

function evaluationLevel(row: CardStatisticsReportRole): number {
	return row.evaluation?.level ?? 0;
}

function evaluationTitle(row: CardStatisticsReportRole): string {
	return row.evaluation?.title || '暂无评价';
}

function reportBarWidth(count: number): string {
	if (count <= 0) return '0%';
	if (count >= 200) return '100%';
	return `${Math.max(1.5, (count / 200) * 100)}%`;
}

function reportBarColor(count: number): string {
	return interpolateReportBarColor(count / 200).hex;
}

function reportBarStyle(count: number): Record<string, string> {
	const ratio = Math.min(1, Math.max(0, count / 200));
	const start = interpolateReportBarColor(Math.max(0, ratio - 0.14));
	const tip = interpolateReportBarColor(ratio);

	return {
		width: reportBarWidth(count),
		color: tip.hex,
		background: `linear-gradient(90deg, ${start.hex}, ${tip.hex})`,
		boxShadow: `0 0 12px rgba(${tip.rgb}, 0.42)`,
	};
}

function interpolateReportBarColor(ratio: number): {
	hex: string;
	rgb: string;
} {
	const value = Math.min(1, Math.max(0, ratio));
	let start = REPORT_BAR_STOPS[0];
	let end = REPORT_BAR_STOPS[REPORT_BAR_STOPS.length - 1];

	for (let index = 1; index < REPORT_BAR_STOPS.length; index += 1) {
		const candidate = REPORT_BAR_STOPS[index];
		if (value <= candidate.position) {
			start = REPORT_BAR_STOPS[index - 1];
			end = candidate;
			break;
		}
	}

	const span = end.position - start.position;
	const progress = span === 0
		? 0
		: (value - start.position) / span;
	const channels = start.color.map((channel, index) => (
		Math.round(channel + (end.color[index] - channel) * progress)
	));
	const [red, green, blue] = channels;
	const hex = `#${[red, green, blue]
		.map((channel) => channel.toString(16).padStart(2, '0'))
		.join('')}`;

	return {
		hex,
		rgb: `${red}, ${green}, ${blue}`,
	};
}

async function exportReport(): Promise<void> {
	if (exporting.value || submitting.value || !reportRows.value.length) return;

	exporting.value = true;

	try {
		const images = await loadReportImages();
		await nextTick();
		await drawReportCanvas(images);
		const tempFilePath = await canvasToTempFilePath();
		await downloadImage(tempFilePath);
		uni.showToast({ title: '图片已生成并开始下载', icon: 'success' });
	} catch (error) {
		uni.showToast({
			title: errorMessage(error, '导出图片失败，请稍后重试'),
			icon: 'none',
			duration: 2600,
		});
	} finally {
		exporting.value = false;
	}
}

async function loadReportImages(): Promise<Record<number, string | null>> {
	const result: Record<number, string | null> = {};

	await Promise.all(reportRows.value.map(async (row) => {
		if (!row.image_url) {
			result[row.id] = null;
			return;
		}

		try {
			const image = await getImageInfo(row.image_url);
			result[row.id] = image.path || null;
		} catch {
			result[row.id] = null;
		}
	}));

	return result;
}

function getImageInfo(src: string): Promise<{ path: string }> {
	return new Promise((resolve, reject) => {
		uni.getImageInfo({
			src,
			success: (result) => resolve({ path: result.path }),
			fail: (error) => reject(new Error(error.errMsg || '头像加载失败')),
		});
	});
}

async function drawReportCanvas(images: Record<number, string | null>): Promise<void> {
	const ctx = uni.createCanvasContext(EXPORT_CANVAS_ID, instance?.proxy) as any;
	const width = EXPORT_WIDTH;
	const height = exportHeight.value;
	const rows = reportRows.value;

	ctx.setFillStyle('#07182c');
	ctx.fillRect(0, 0, width, height);
	ctx.setFillStyle('#123b5d');
	ctx.fillRect(0, 0, width, 8);

	ctx.setFillStyle('#ecf7ff');
	ctx.setFontSize(30);
	ctx.fillText('抽卡统计报告', 36, 56);

	ctx.setFillStyle('#83a9c7');
	ctx.setFontSize(15);
	fillEllipsizedText(
		ctx,
		`${displayPoolName.value} · ${selectedYear.value} 年 · 合计 ${totalDraws.value} 抽`,
		width - 72,
		36,
		84,
	);

	ctx.setFillStyle('#12314c');
	ctx.fillRect(36, 108, width - 72, 1);

	rows.forEach((row, index) => {
		const y = EXPORT_HEADER_HEIGHT + index * EXPORT_ROW_HEIGHT;
		const level = evaluationLevel(row);
		const evaluationColor = EVALUATION_COLORS[level] || EVALUATION_COLORS[0];

		ctx.setFillStyle(index % 2 === 0 ? '#0b2138' : '#0e2842');
		ctx.fillRect(24, y + 6, width - 48, EXPORT_ROW_HEIGHT - 12);

		const imagePath = images[row.id];
		if (imagePath) {
			ctx.drawImage(imagePath, 42, y + 16, 58, 58);
		} else {
			ctx.setFillStyle('#143c5c');
			ctx.fillRect(42, y + 16, 58, 58);
			ctx.setFillStyle('#b9d9f2');
			ctx.setFontSize(24);
			ctx.fillText(row.name.slice(0, 1), 62, y + 54);
		}

		ctx.setFillStyle('#e6f3ff');
		ctx.setFontSize(20);
		fillEllipsizedText(ctx, row.name, 500, 118, y + 42);

		const trackX = 118;
		const trackY = y + 64;
		const trackWidth = 510;
		const trackHeight = 14;
		ctx.setFillStyle('#173a56');
		ctx.fillRect(trackX, trackY, trackWidth, trackHeight);

		const barWidth = row.count >= 200
			? trackWidth
			: row.count <= 0
				? 0
				: Math.max(10, (row.count / 200) * trackWidth);

		if (barWidth > 0) {
			ctx.setFillStyle(reportBarColor(row.count));
			ctx.fillRect(trackX, trackY, barWidth, trackHeight);
			ctx.setFillStyle('rgba(255, 255, 255, 0.32)');
			ctx.fillRect(
				trackX + 4,
				trackY + 3,
				Math.max(0, barWidth - 8),
				2,
			);
		} else {
			ctx.setFillStyle('#6d91b4');
			ctx.fillRect(trackX, trackY, 8, trackHeight);
		}

		ctx.setFillStyle('#f0f6ff');
		ctx.setFontSize(18);
		ctx.fillText(`${row.count} 抽`, 650, y + 50);

		ctx.setFillStyle(evaluationColor);
		ctx.fillRect(742, y + 23, 174, 42);
		ctx.setFillStyle(level === 1 || level === 2 || level === 8 ? '#10253a' : '#ffffff');
		ctx.setFontSize(16);
		ctx.setTextAlign('center');
		fillEllipsizedText(ctx, evaluationTitle(row), 158, 829, y + 50);
		ctx.setTextAlign('left');
	});

	ctx.setFillStyle('#5f819d');
	ctx.setFontSize(12);
	ctx.fillText('PCR 作业站 · 评价由后端实时计算', 36, height - 20);

	await new Promise<void>((resolve, reject) => {
		let settled = false;
		const timer = setTimeout(() => {
			if (settled) return;
			settled = true;
			reject(new Error('报告绘制超时'));
		}, 12000);

		ctx.draw(false, () => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			resolve();
		});
	});
}

function fillEllipsizedText(
	ctx: any,
	text: string,
	maxWidth: number,
	x: number,
	y: number,
): void {
	const value = String(text || '');

	if (typeof ctx.measureText !== 'function') {
		ctx.fillText(value, x, y);
		return;
	}

	if (ctx.measureText(value).width <= maxWidth) {
		ctx.fillText(value, x, y);
		return;
	}

	let clipped = value;
	while (clipped.length > 1 && ctx.measureText(`${clipped}…`).width > maxWidth) {
		clipped = clipped.slice(0, -1);
	}
	ctx.fillText(`${clipped}…`, x, y);
}

function canvasToTempFilePath(): Promise<string> {
	return new Promise((resolve, reject) => {
		(uni as any).canvasToTempFilePath({
			canvasId: EXPORT_CANVAS_ID,
			x: 0,
			y: 0,
			width: EXPORT_WIDTH,
			height: exportHeight.value,
			destWidth: Math.round(EXPORT_WIDTH * exportScale.value),
			destHeight: Math.round(exportHeight.value * exportScale.value),
			fileType: 'png',
			quality: 1,
			success: (result: { tempFilePath: string }) => {
				if (!result.tempFilePath) {
					reject(new Error('图片生成失败'));
					return;
				}
				resolve(result.tempFilePath);
			},
			fail: (error: { errMsg?: string }) => {
				reject(new Error(error.errMsg || '图片生成失败'));
			},
		}, instance?.proxy);
	});
}

function downloadImage(tempFilePath: string): Promise<void> {
	return new Promise((resolve, reject) => {
		// #ifdef H5
		const doc = (globalThis as any).document;
		if (!doc) {
			reject(new Error('当前环境不支持图片下载'));
			return;
		}

		try {
			const link = doc.createElement('a');
			const safeName = displayPoolName.value.replace(/[\\/:*?"<>|]/g, '_');
			link.href = tempFilePath;
			link.download = `抽卡统计-${safeName}-${selectedYear.value}.png`;
			doc.body.appendChild(link);
			link.click();
			doc.body.removeChild(link);
			resolve();
		} catch (error) {
			reject(error instanceof Error ? error : new Error('图片下载失败'));
		}
		// #endif

		// #ifndef H5
		reject(new Error('当前版本仅支持 H5 保存图片'));
		// #endif
	});
}
</script>

<style scoped>
.stats-modal-mask {
	position: fixed;
	z-index: 1150;
	inset: 0;
	padding: 20px 12px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--mask);
}

.stats-modal {
	position: relative;
	width: min(1120px, 100%);
	height: min(92vh, 980px);
	max-height: 94vh;
	display: flex;
	flex-direction: column;
	border: 1px solid rgba(62, 158, 225, 0.55);
	border-radius: 12px;
	background:
		radial-gradient(circle at 88% 0%, rgba(24, 119, 190, 0.22), transparent 34%),
		linear-gradient(145deg, #071c31, #041426 72%);
	box-shadow: 0 24px 80px rgba(0, 0, 0, 0.62), 0 0 30px rgba(0, 107, 189, 0.16);
	overflow: hidden;
}

.stats-header {
	min-height: 72px;
	padding: 12px 22px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 14px;
	border-bottom: 1px solid rgba(83, 141, 187, 0.24);
}

.stats-heading {
	min-width: 0;
}

.stats-title {
	color: var(--text-primary);
	font-size: 19px;
	font-weight: 800;
	letter-spacing: 0.04em;
}

.stats-subtitle {
	margin-top: 5px;
	overflow: hidden;
	color: var(--text-muted);
	font-size: 12px;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.stats-close {
	width: 34px;
	height: 34px;
	flex: 0 0 34px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 7px;
	background: #d84b57;
	color: #fff;
	font-size: 24px;
	line-height: 1;
	cursor: pointer;
}

.stats-toolbar {
	position: relative;
	z-index: 20;
	min-height: 52px;
	padding: 8px 22px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 14px;
	border-bottom: 1px solid rgba(83, 141, 187, 0.18);
	background: var(--bg-subtle);
}

.year-control {
	display: flex;
	align-items: center;
	gap: 10px;
}

.year-select-wrap {
	position: relative;
}

.toolbar-label {
	color: var(--text-muted);
	font-size: 12px;
}

.year-picker {
	min-width: 116px;
	height: 34px;
	padding: 0 11px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
	border: 1px solid rgba(69, 147, 208, 0.48);
	border-radius: 6px;
	background: var(--bg-panel-soft);
	color: var(--text-secondary);
	font-size: 13px;
	cursor: pointer;
	user-select: none;
}

.year-picker.open {
	border-color: rgba(83, 184, 247, 0.78);
	box-shadow: 0 0 0 2px rgba(43, 142, 215, 0.12);
}

.year-picker.disabled {
	opacity: 0.55;
	cursor: not-allowed;
}

.picker-arrow {
	color: var(--accent-text);
	font-size: 12px;
}

.year-menu-backdrop {
	position: fixed;
	z-index: 10;
	inset: 0;
}

.year-menu {
	position: absolute;
	z-index: 30;
	top: calc(100% + 6px);
	left: 0;
	width: 100%;
	max-height: 244px;
	padding: 5px;
	overflow-y: auto;
	border: 1px solid rgba(76, 158, 219, 0.58);
	border-radius: 7px;
	background: var(--bg-subtle);
	box-shadow: 0 14px 30px var(--shadow);
}

.year-menu-item {
	height: 34px;
	padding: 0 10px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 5px;
	color: var(--text-secondary);
	font-size: 13px;
	cursor: pointer;
}

.year-menu-item:hover,
.year-menu-item.active {
	background: rgba(31, 137, 211, 0.34);
	color: #fff;
}

.draft-notice {
	padding: 5px 10px;
	border: 1px solid rgba(229, 181, 77, 0.36);
	border-radius: 999px;
	background: rgba(173, 122, 26, 0.14);
	color: #f0c96c;
	font-size: 11px;
}

.stats-content {
	flex: 1 1 auto;
	min-height: 0;
	height: 100%;
	padding: 14px 16px 20px;
}

.stats-state {
	min-height: 260px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 13px;
	color: var(--text-muted);
	font-size: 13px;
	text-align: center;
}

.error-state {
	color: var(--danger);
}

.empty-state {
	min-height: 240px;
}

.loading-spinner {
	width: 28px;
	height: 28px;
	border: 2px solid rgba(87, 166, 224, 0.22);
	border-top-color: #45aef2;
	border-radius: 50%;
	animation: stats-spin 0.8s linear infinite;
}

@keyframes stats-spin {
	to { transform: rotate(360deg); }
}

.retry-button {
	padding: 7px 14px;
	border: 1px solid rgba(67, 158, 225, 0.55);
	border-radius: 5px;
	color: var(--accent-text);
	cursor: pointer;
}

.role-entry-list {
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	gap: 8px;
}

.role-entry {
	min-width: 0;
	padding: 9px 10px;
	display: flex;
	align-items: center;
	gap: 10px;
	border: 1px solid rgba(69, 127, 170, 0.26);
	border-radius: 8px;
	background: var(--bg-panel-soft);
}

.role-entry.entry-error {
	border-color: rgba(240, 92, 103, 0.7);
	background: rgba(103, 23, 35, 0.2);
}

.role-avatar-frame {
	width: 54px;
	height: 54px;
	flex: 0 0 54px;
	overflow: hidden;
	border: 1px solid rgba(84, 155, 208, 0.48);
	border-radius: 7px;
	background: var(--bg-subtle);
}

.role-avatar,
.report-avatar {
	width: 100%;
	height: 100%;
	display: block;
}

.role-avatar-placeholder,
.report-avatar-placeholder {
	display: flex;
	align-items: center;
	justify-content: center;
	background: linear-gradient(145deg, var(--bg-subtle), var(--bg-elevated));
	color: var(--text-secondary);
	font-size: 21px;
	font-weight: 700;
}

.role-copy {
	min-width: 0;
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.role-name {
	overflow: hidden;
	color: var(--text-primary);
	font-size: 13px;
	font-weight: 700;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.row-error {
	color: var(--danger);
	font-size: 10px;
}

.count-control {
	width: 96px;
	flex: 0 0 96px;
	height: 36px;
	padding: 0 8px;
	display: flex;
	align-items: center;
	gap: 3px;
	border: 1px solid rgba(88, 143, 184, 0.4);
	border-radius: 6px;
	background: var(--bg-panel-soft);
}

.entry-error .count-control {
	border-color: rgba(240, 92, 103, 0.7);
}

.count-input {
	width: 100%;
	min-width: 0;
	color: var(--text-primary);
	font-size: 14px;
	font-weight: 700;
	text-align: right;
}

.count-input::placeholder {
	color: var(--text-faint);
	font-size: 11px;
	font-weight: 400;
}

.count-unit {
	color: var(--text-muted);
	font-size: 11px;
}

.report-wrap {
	margin-top: 22px;
}

.report-panel {
	padding: 20px;
	border: 1px solid rgba(111, 181, 229, 0.28);
	border-radius: 12px;
	background:
		linear-gradient(120deg, rgba(14, 53, 82, 0.76), rgba(4, 21, 39, 0.94)),
		#06182c;
	box-shadow: inset 0 1px rgba(255, 255, 255, 0.04);
}

.report-head {
	display: flex;
	align-items: flex-end;
	justify-content: space-between;
	gap: 14px;
	padding-bottom: 14px;
	border-bottom: 1px solid rgba(111, 181, 229, 0.2);
}

.report-eyebrow {
	color: var(--accent-text);
	font-size: 10px;
	letter-spacing: 0.16em;
}

.report-title {
	margin-top: 6px;
	color: var(--text-primary);
	font-size: 20px;
	font-weight: 800;
}

.report-summary {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: 3px;
	color: var(--text-muted);
	font-size: 11px;
}

.report-columns {
	padding: 11px 9px 6px;
	display: grid;
	grid-template-columns: 52px minmax(0, 1fr) 74px 150px;
	align-items: center;
	gap: 10px;
	color: var(--text-faint);
	font-size: 10px;
	text-align: right;
}

.report-columns text:nth-child(2) {
	text-align: left;
}

.report-columns text:last-child {
	text-align: center;
}

.report-list {
	display: flex;
	flex-direction: column;
	gap: 7px;
}

.report-row {
	min-width: 0;
	padding: 8px 9px;
	display: grid;
	grid-template-columns: 52px minmax(0, 1fr) 74px 150px;
	align-items: center;
	gap: 10px;
	border-radius: 7px;
	background: var(--bg-panel-soft);
}

.report-row:nth-child(even) {
	background: var(--bg-subtle);
}

.report-avatar-frame {
	width: 52px;
	height: 52px;
	overflow: hidden;
	border: 1px solid rgba(95, 169, 220, 0.46);
	border-radius: 7px;
	background: var(--bg-subtle);
}

.report-main {
	min-width: 0;
}

.report-name {
	display: block;
	overflow: hidden;
	color: var(--text-primary);
	font-size: 13px;
	font-weight: 700;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.report-track {
	position: relative;
	height: 16px;
	margin-top: 8px;
	overflow: visible;
	border-radius: 999px;
	background:
		linear-gradient(180deg, rgba(0, 0, 0, 0.18), transparent),
		var(--bg-subtle);
	box-shadow:
		inset 0 0 0 1px rgba(116, 169, 207, 0.13),
		inset 0 2px 5px rgba(0, 0, 0, 0.18);
}

.report-bar {
	position: relative;
	height: 100%;
	border-radius: 999px;
	transition:
		width 0.45s ease,
		background 0.25s ease,
		box-shadow 0.25s ease;
}

.report-bar::before {
	content: '';
	position: absolute;
	top: 3px;
	right: 5px;
	left: 5px;
	height: 3px;
	border-radius: 999px;
	background: rgba(255, 255, 255, 0.34);
}

.report-bar::after {
	content: '';
	position: absolute;
	top: 50%;
	right: -2px;
	width: 12px;
	height: 12px;
	border-radius: 50%;
	background: currentColor;
	box-shadow: 0 0 10px currentColor;
	transform: translateY(-50%);
}

.zero-marker {
	position: absolute;
	top: 3px;
	left: 3px;
	width: 10px;
	height: 10px;
	border-radius: 50%;
	background: var(--text-faint);
	box-shadow: 0 0 8px rgba(125, 143, 165, 0.24);
}

.report-count-cell {
	min-width: 0;
	display: flex;
	align-items: baseline;
	justify-content: flex-end;
	gap: 2px;
}

.report-count {
	color: var(--text-primary);
	font-size: 18px;
	font-weight: 800;
	line-height: 1;
	text-align: right;
}

.report-count-unit {
	color: var(--text-muted);
	font-size: 10px;
	font-weight: 600;
}

.report-evaluation {
	min-height: 32px;
	padding: 0 10px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 5px;
	border: 1px solid rgba(255, 255, 255, 0.08);
	color: #fff;
	font-size: 11px;
	font-weight: 700;
	text-align: center;
}

.level-0 { background: #6f8296; }
.level-1 { background: #f5c451; color: #1c2a38 !important; }
.level-2 { background: #f39a3d; color: #1c2a38 !important; }
.level-3 { background: var(--success); color: #10291d !important; }
.level-4 { background: var(--accent-text); color: #0b263a !important; }
.level-5 { background: #e8b84b; color: #2d230d !important; }
.level-6 { background: var(--danger); }
.level-7 { background: var(--danger); }
.level-8 { background: var(--warning); color: #2b210b !important; }

.empty-report {
	min-height: 160px;
	border: 1px dashed rgba(111, 181, 229, 0.25);
	border-radius: 10px;
}

.stats-footer {
	min-height: 70px;
	padding: 10px 20px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 14px;
	border-top: 1px solid rgba(83, 141, 187, 0.22);
	background: var(--bg-panel-soft);
}

.footer-tip {
	color: var(--text-faint);
	font-size: 10px;
}

.footer-actions {
	display: flex;
	align-items: center;
	gap: 8px;
}

.footer-button {
	min-height: 38px;
	padding: 0 15px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 6px;
	font-size: 12px;
	font-weight: 700;
	white-space: nowrap;
	cursor: pointer;
	transition:
		transform 0.16s ease,
		filter 0.16s ease,
		box-shadow 0.16s ease,
		opacity 0.16s ease;
}

.footer-button.primary {
	border: 1px solid #f7ce72;
	background: linear-gradient(180deg, #f8cf68, #d99a27);
	box-shadow:
		0 5px 16px rgba(203, 139, 31, 0.24),
		inset 0 1px rgba(255, 255, 255, 0.42);
	color: #33240a;
}

.footer-button.export {
	border: 1px solid #55dbb1;
	background: linear-gradient(180deg, #32c99a, #117c5d);
	box-shadow:
		0 5px 16px rgba(22, 151, 111, 0.22),
		inset 0 1px rgba(255, 255, 255, 0.24);
	color: var(--text-primary);
}

.footer-button:not(.disabled):hover {
	filter: brightness(1.08);
	transform: translateY(-1px);
}

.footer-button:not(.disabled):active {
	transform: translateY(0);
	filter: brightness(0.96);
}

.footer-button.disabled {
	opacity: 0.45;
	cursor: not-allowed;
	box-shadow: none;
}

.export-canvas {
	position: fixed;
	left: -12000px;
	top: 0;
	pointer-events: none;
}

@media screen and (max-width: 900px) {
	.role-entry-list {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	.report-columns,
	.report-row {
		grid-template-columns: 46px minmax(0, 1fr) 64px 132px;
	}

	.report-avatar-frame {
		width: 46px;
		height: 46px;
	}

	.footer-tip {
		display: none;
	}
}

@media screen and (max-width: 700px) {
	.stats-modal-mask {
		padding: 6px 4px;
	}

	.stats-modal {
		width: 100%;
		height: 96vh;
		max-height: 96vh;
		border-radius: 9px;
	}

	.stats-header {
		min-height: 62px;
		padding: 9px 13px;
	}

	.stats-title {
		font-size: 17px;
	}

	.stats-toolbar {
		padding: 7px 13px;
	}

	.stats-content {
		padding: 9px 7px 14px;
	}

	.role-entry-list {
		grid-template-columns: 1fr;
	}

	.role-entry {
		padding: 7px;
		gap: 7px;
	}

	.role-avatar-frame {
		width: 46px;
		height: 46px;
		flex-basis: 46px;
	}

	.count-control {
		width: 84px;
		flex-basis: 84px;
	}

	.report-panel {
		padding: 12px 8px;
	}

	.report-head {
		align-items: flex-start;
		flex-direction: column;
	}

	.report-summary {
		align-items: flex-start;
	}

	.report-title {
		font-size: 17px;
	}

	.report-columns {
		display: none;
	}

	.report-row {
		grid-template-columns: 42px minmax(0, 1fr) 60px;
		gap: 7px;
		padding: 7px 5px;
	}

	.report-avatar-frame {
		width: 42px;
		height: 42px;
	}

	.report-evaluation {
		grid-column: 2 / 4;
		min-height: 28px;
		margin-top: -2px;
	}

	.report-count {
		font-size: 16px;
	}

	.report-count-unit {
		font-size: 9px;
	}

	.report-track {
		height: 14px;
	}

	.stats-footer {
		min-height: 64px;
		padding: 8px;
	}

	.footer-actions {
		width: 100%;
		gap: 5px;
	}

	.footer-button {
		min-width: 0;
		padding: 0 8px;
		flex: 1;
		font-size: 11px;
	}
}
</style>
