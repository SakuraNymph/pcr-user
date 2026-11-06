<template>
	<canvas
		:id="CANVAS_ID"
		:canvas-id="CANVAS_ID"
		class="schedule-export-canvas"
		:style="{ width: canvasWidth + 'px', height: canvasHeight + 'px' }"
	></canvas>
</template>

<script setup lang="ts">
import {
	getCurrentInstance,
	nextTick,
	ref,
} from 'vue';
import type { ClanScheduleCell, ClanSchedulePhase } from '../api/types';
import type { ClanSchedulePlayerRow } from '../utils/clanSchedule';
import {
	BOSS_COLORS,
	HORIZONTAL_HEADERS,
	HORIZONTAL_SLOT_ORDER,
	PHASE_MAX_ROWS,
	VERTICAL_BASE_SLOTS,
	VERTICAL_HEADERS,
	VERTICAL_RETURN_SLOTS,
	distinctPlayers,
	positionKey,
	visiblePhaseRounds,
} from '../utils/clanSchedule';

const props = defineProps<{
	mode: 'boss' | 'player';
	cells: ClanScheduleCell[];
	rows: ClanSchedulePlayerRow[];
	layout: 'horizontal' | 'vertical';
	colors: Record<string, string>;
	addedRounds?: Partial<Record<ClanSchedulePhase, number[]>>;
}>();

const CANVAS_ID = 'clan-schedule-export';
const PADDING = 36;
const HEADER_HEIGHT = 112;
const FOOTER_HEIGHT = 38;
const PHASE_TITLE_HEIGHT = 52;
const TABLE_HEAD_HEIGHT = 44;
const BOSS_ROW_HEIGHT = 46;
const PLAYER_HEAD_HEIGHT = 48;
const PLAYER_ROW_HEIGHT = 46;
const PLAYER_GROUP_HEIGHT = 88;
const MAX_EXPORT_DIMENSION = 30000;
const MAX_EXPORT_AREA = 16000000;
const MIN_EXPORT_SCALE = 0.3;

const instance = getCurrentInstance();
const canvasWidth = ref(1200);
const canvasHeight = ref(800);

interface ExportLayout {
	width: number;
	height: number;
	scale: number;
}

interface PhaseGroup {
	key: ClanSchedulePhase;
	title: string;
	subtitle: string;
	rounds: number[];
}

async function exportImage(): Promise<void> {
	// #ifndef H5
	throw new Error('当前版本仅支持 H5 生成图片');
	// #endif

	if (!props.cells.length) {
		throw new Error('暂无排刀数据可生成图片');
	}

	const layout = resolveLayout();
	canvasWidth.value = layout.width;
	canvasHeight.value = layout.height;
	await nextTick();
	await delay(30);

	const ctx = uni.createCanvasContext(CANVAS_ID, instance?.proxy) as any;
	drawCanvas(ctx, layout);

	await new Promise<void>((resolve, reject) => {
		let settled = false;
		const timer = setTimeout(() => {
			if (settled) return;
			settled = true;
			reject(new Error('图片绘制超时'));
		}, 15000);

		ctx.draw(false, () => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			resolve();
		});
	});

	const tempFilePath = await canvasToTempFilePath(layout);
	await downloadImage(tempFilePath);
}

function resolveLayout(): ExportLayout {
	let width = 1200;
	let height = 0;

	if (props.mode === 'boss') {
		const phases = bossPhases();
		height = HEADER_HEIGHT
			+ phases.reduce((total, phase) => (
				total
				+ PHASE_TITLE_HEIGHT
				+ TABLE_HEAD_HEIGHT
				+ phase.rounds.length * BOSS_ROW_HEIGHT
				+ 26
			), 0)
			+ FOOTER_HEIGHT;
	} else if (props.layout === 'horizontal') {
		width = 1320;
		height = HEADER_HEIGHT
			+ PLAYER_HEAD_HEIGHT
			+ Math.max(1, props.rows.length) * PLAYER_ROW_HEIGHT
			+ FOOTER_HEIGHT;
	} else {
		width = 1000;
		height = HEADER_HEIGHT
			+ PLAYER_HEAD_HEIGHT
			+ Math.max(1, props.rows.length) * PLAYER_GROUP_HEIGHT
			+ FOOTER_HEIGHT;
	}

	if (height > MAX_EXPORT_DIMENSION || width > MAX_EXPORT_DIMENSION) {
		throw new Error('表格内容过大，无法生成完整图片，请减少显示的行数');
	}

	const scale = Math.min(
		1,
		MAX_EXPORT_DIMENSION / height,
		Math.sqrt(MAX_EXPORT_AREA / (width * height)),
	);

	if (scale < MIN_EXPORT_SCALE) {
		throw new Error('表格内容过大，图片缩放后无法保证清晰，请减少显示的行数');
	}

	return { width, height, scale };
}

function drawCanvas(ctx: any, layout: ExportLayout): void {
	ctx.setFillStyle('#07182c');
	ctx.fillRect(0, 0, layout.width, layout.height);
	ctx.setFillStyle('#123b5d');
	ctx.fillRect(0, 0, layout.width, 8);

	const title = props.mode === 'boss'
		? '共享排刀表 · 表格1（Boss视角）'
		: `共享排刀表 · 表格2（玩家视角 · ${props.layout === 'horizontal' ? '横向' : '竖向'}）`;
	const subtitle = props.mode === 'boss'
		? `B阶段最多${PHASE_MAX_ROWS.B}行 · C阶段最多${PHASE_MAX_ROWS.C}行 · D阶段最多${PHASE_MAX_ROWS.D}行 · ${distinctPlayers(props.cells).length}名玩家`
		: `${props.rows.length}名玩家 · 每名玩家最多3次基础刀和3次返还刀`;

	drawText(ctx, title, PADDING, 56, 29, '#ecf7ff', 'left', true);
	drawText(ctx, subtitle, PADDING, 84, 13, '#83a9c7');
	fillRect(ctx, PADDING, 100, layout.width - PADDING * 2, 1, '#173a56');

	if (props.mode === 'boss') {
		drawBossTable(ctx, layout);
	} else if (props.layout === 'horizontal') {
		drawHorizontalPlayerTable(ctx, layout);
	} else {
		drawVerticalPlayerTable(ctx, layout);
	}

	drawText(
		ctx,
		'PCR 作业站 · 共享排刀表',
		PADDING,
		layout.height - 16,
		11,
		'#5f819d',
	);
}

function bossPhases(): PhaseGroup[] {
	return [
		{
			key: 'B',
			title: 'B 阶段',
			subtitle: '第 1 - 6 周目',
			rounds: visiblePhaseRounds('B', props.cells, props.addedRounds?.B ?? []),
		},
		{
			key: 'C',
			title: 'C 阶段',
			subtitle: '第 7 - 22 周目',
			rounds: visiblePhaseRounds('C', props.cells, props.addedRounds?.C ?? []),
		},
		{
			key: 'D',
			title: 'D 阶段',
			subtitle: '第 23 周目起',
			rounds: visiblePhaseRounds('D', props.cells, props.addedRounds?.D ?? []),
		},
	];
}

function drawBossTable(ctx: any, layout: ExportLayout): void {
	const contentWidth = layout.width - PADDING * 2;
	const bossWidth = contentWidth / 5;
	const cellMap = new Map<string, ClanScheduleCell>();
	props.cells.forEach((cell) => {
		cellMap.set(positionKey(cell.phase, cell.round, cell.boss), cell);
	});

	let y = HEADER_HEIGHT;

	bossPhases().forEach((phase) => {
		drawText(ctx, phase.title, PADDING, y + 24, 20, '#ecf7ff', 'left', true);
		drawText(
			ctx,
			phase.subtitle,
			layout.width - PADDING,
			y + 23,
			12,
			'#83a9c7',
			'right',
		);
		y += PHASE_TITLE_HEIGHT;

		fillRect(ctx, PADDING, y, contentWidth, TABLE_HEAD_HEIGHT, '#123b5d');
		for (let boss = 1; boss <= 5; boss += 1) {
			const x = PADDING + (boss - 1) * bossWidth;
			fillRect(ctx, x + 18, y + 17, 8, 8, BOSS_COLORS[boss - 1]);
			drawText(
				ctx,
				`${phase.key}${boss}`,
				x + bossWidth / 2 + 8,
				y + 28,
				13,
				'#d1e3ff',
				'center',
				true,
			);
		}
		y += TABLE_HEAD_HEIGHT;

		phase.rounds.forEach((round, rowIndex) => {
			fillRect(
				ctx,
				PADDING,
				y,
				contentWidth,
				BOSS_ROW_HEIGHT,
				rowIndex % 2 === 0 ? '#0b2138' : '#0e2842',
			);

			for (let boss = 1; boss <= 5; boss += 1) {
				const x = PADDING + (boss - 1) * bossWidth;
				const cell = cellMap.get(positionKey(phase.key, round, boss));

				if (cell) {
					fillRect(
						ctx,
						x + 4,
						y + 4,
						bossWidth - 8,
						BOSS_ROW_HEIGHT - 8,
						props.colors[cell.player] || '#8fd0a6',
					);
					drawText(
						ctx,
						cell.player,
						x + bossWidth / 2,
						y + 29,
						12,
						'#10253a',
						'center',
						true,
						bossWidth - 24,
					);
				} else {
					drawText(
						ctx,
						'—',
						x + bossWidth / 2,
						y + 29,
						12,
						'#5f819d',
						'center',
					);
				}
			}

			drawRowLines(ctx, PADDING, y, contentWidth, BOSS_ROW_HEIGHT, [
				...Array.from({ length: 4 }, (_, index) => bossWidth * (index + 1)),
			]);
			y += BOSS_ROW_HEIGHT;
		});

		y += 26;
	});
}

function drawHorizontalPlayerTable(ctx: any, layout: ExportLayout): void {
	const contentWidth = layout.width - PADDING * 2;
	const seqWidth = 64;
	const nameWidth = 200;
	const bossWidth = (contentWidth - seqWidth - nameWidth) / 6;
	let y = HEADER_HEIGHT;

	fillRect(ctx, PADDING, y, contentWidth, PLAYER_HEAD_HEIGHT, '#123b5d');
	drawText(ctx, '序号', PADDING + seqWidth / 2, y + 30, 12, '#d1e3ff', 'center', true);
	drawText(ctx, '玩家名称', PADDING + seqWidth + 12, y + 30, 12, '#d1e3ff', 'left', true);
	HORIZONTAL_HEADERS.forEach((header, index) => {
		const x = PADDING + seqWidth + nameWidth + index * bossWidth;
		drawText(ctx, header, x + bossWidth / 2, y + 30, 11, '#d1e3ff', 'center', true);
	});
	y += PLAYER_HEAD_HEIGHT;

	if (!props.rows.length) {
		fillRect(ctx, PADDING, y, contentWidth, PLAYER_ROW_HEIGHT, '#0b2138');
		drawText(ctx, '暂无玩家记录', layout.width / 2, y + 29, 13, '#5f819d', 'center');
		y += PLAYER_ROW_HEIGHT;
	} else {
		props.rows.forEach((row, rowIndex) => {
			fillRect(
				ctx,
				PADDING,
				y,
				contentWidth,
				PLAYER_ROW_HEIGHT,
				rowIndex % 2 === 0 ? '#0b2138' : '#0e2842',
			);
			drawText(
				ctx,
				String(rowIndex + 1),
				PADDING + seqWidth / 2,
				y + 29,
				12,
				'#83a9c7',
				'center',
				true,
			);

			drawText(
				ctx,
				row.player,
				PADDING + seqWidth + 12,
				y + 29,
				12,
				'#ecf7ff',
				'left',
				true,
				nameWidth - 30,
			);

			HORIZONTAL_SLOT_ORDER.forEach((slot, index) => {
				const x = PADDING + seqWidth + nameWidth + index * bossWidth;
				drawPlayerBossCell(ctx, row, slot, x, y, bossWidth, PLAYER_ROW_HEIGHT);
			});

			drawRowLines(ctx, PADDING, y, contentWidth, PLAYER_ROW_HEIGHT, [
				seqWidth,
				seqWidth + nameWidth,
				...Array.from({ length: 5 }, (_, index) => (
					seqWidth + nameWidth + bossWidth * (index + 1)
				)),
			]);
			y += PLAYER_ROW_HEIGHT;
		});
	}
}

function drawVerticalPlayerTable(ctx: any, layout: ExportLayout): void {
	const contentWidth = layout.width - PADDING * 2;
	const seqWidth = 64;
	const nameWidth = 180;
	const bossWidth = (contentWidth - seqWidth - nameWidth) / 3;
	let y = HEADER_HEIGHT;

	fillRect(ctx, PADDING, y, contentWidth, PLAYER_HEAD_HEIGHT, '#123b5d');
	drawText(ctx, '序号', PADDING + seqWidth / 2, y + 30, 12, '#d1e3ff', 'center', true);
	drawText(ctx, '玩家名称', PADDING + seqWidth + 12, y + 30, 12, '#d1e3ff', 'left', true);
	VERTICAL_HEADERS.forEach((header, index) => {
		const x = PADDING + seqWidth + nameWidth + index * bossWidth;
		drawText(ctx, header, x + bossWidth / 2, y + 30, 12, '#d1e3ff', 'center', true);
	});
	y += PLAYER_HEAD_HEIGHT;

	if (!props.rows.length) {
		fillRect(ctx, PADDING, y, contentWidth, PLAYER_GROUP_HEIGHT, '#0b2138');
		drawText(ctx, '暂无玩家记录', layout.width / 2, y + 50, 13, '#5f819d', 'center');
		y += PLAYER_GROUP_HEIGHT;
	} else {
		props.rows.forEach((row, rowIndex) => {
			fillRect(
				ctx,
				PADDING,
				y,
				contentWidth,
				PLAYER_GROUP_HEIGHT,
				rowIndex % 2 === 0 ? '#0b2138' : '#0e2842',
			);

			drawText(
				ctx,
				String(rowIndex + 1),
				PADDING + seqWidth / 2,
				y + 52,
				13,
				'#83a9c7',
				'center',
				true,
			);

			drawText(
				ctx,
				row.player,
				PADDING + seqWidth + 12,
				y + 52,
				13,
				'#ecf7ff',
				'left',
				true,
				nameWidth - 30,
			);

			VERTICAL_BASE_SLOTS.forEach((slot, index) => {
				const x = PADDING + seqWidth + nameWidth + index * bossWidth;
				drawPlayerBossCell(ctx, row, slot, x, y, bossWidth, PLAYER_GROUP_HEIGHT / 2);
			});
			VERTICAL_RETURN_SLOTS.forEach((slot, index) => {
				const x = PADDING + seqWidth + nameWidth + index * bossWidth;
				const cellY = y + PLAYER_GROUP_HEIGHT / 2;
				fillRect(ctx, x, cellY, bossWidth, PLAYER_GROUP_HEIGHT / 2, '#0a2a45');
				const cell = row.slots[slot];
				if (cell) {
					fillRect(
						ctx,
						x + 4,
						cellY + 4,
						bossWidth - 8,
						PLAYER_GROUP_HEIGHT / 2 - 8,
						BOSS_COLORS[cell.boss - 1] ?? BOSS_COLORS[0],
					);
				}
				drawText(ctx, '返还', x + 9, cellY + 13, 9, '#5f819d', 'left', true);
				drawText(
					ctx,
					cell ? `${cell.phase}${cell.boss}` : '—',
					x + bossWidth / 2,
					cellY + 30,
					12,
					cell ? '#10253a' : '#5f819d',
					'center',
					!!cell,
				);
			});

			fillRect(ctx, PADDING, y + PLAYER_GROUP_HEIGHT / 2, contentWidth, 1, '#173a56');
			drawRowLines(ctx, PADDING, y, contentWidth, PLAYER_GROUP_HEIGHT, [
				seqWidth,
				seqWidth + nameWidth,
				...Array.from({ length: 2 }, (_, index) => (
					seqWidth + nameWidth + bossWidth * (index + 1)
				)),
			]);
			y += PLAYER_GROUP_HEIGHT;
		});
	}
}

function drawPlayerBossCell(
	ctx: any,
	row: ClanSchedulePlayerRow,
	slot: number,
	x: number,
	y: number,
	width: number,
	height: number,
): void {
	const cell = row.slots[slot];

	if (cell) {
		fillRect(
			ctx,
			x + 4,
			y + 4,
			width - 8,
			height - 8,
			BOSS_COLORS[cell.boss - 1] ?? BOSS_COLORS[0],
		);
		drawText(
			ctx,
			`${cell.phase}${cell.boss}`,
			x + width / 2,
			y + height / 2 + 5,
			12,
			'#10253a',
			'center',
			true,
		);
	} else {
		drawText(
			ctx,
			'—',
			x + width / 2,
			y + height / 2 + 5,
			12,
			'#5f819d',
			'center',
		);
	}
}

function drawRowLines(
	ctx: any,
	x: number,
	y: number,
	width: number,
	height: number,
	offsets: number[],
): void {
	offsets.forEach((offset) => {
		fillRect(ctx, x + offset, y, 1, height, '#173a56');
	});
	fillRect(ctx, x, y + height - 1, width, 1, '#173a56');
}

function fillRect(
	ctx: any,
	x: number,
	y: number,
	width: number,
	height: number,
	color: string,
): void {
	ctx.setFillStyle(color);
	ctx.fillRect(x, y, width, height);
}

function drawText(
	ctx: any,
	value: unknown,
	x: number,
	y: number,
	size: number,
	color: string,
	align: 'left' | 'center' | 'right' = 'left',
	bold = false,
	maxWidth?: number,
): void {
	ctx.setFillStyle(color);
	ctx.setFontSize(size);
	ctx.setTextAlign(align);

	let text = String(value ?? '');
	if (maxWidth && typeof ctx.measureText === 'function') {
		while (text.length > 1 && ctx.measureText(text).width > maxWidth) {
			text = text.slice(0, -1);
		}
		if (text !== String(value ?? '')) {
			text = `${text}…`;
		}
	}

	ctx.fillText(text, x, y);
	ctx.setTextAlign('left');
}

function canvasToTempFilePath(layout: ExportLayout): Promise<string> {
	return new Promise((resolve, reject) => {
		(uni as any).canvasToTempFilePath({
			canvasId: CANVAS_ID,
			x: 0,
			y: 0,
			width: layout.width,
			height: layout.height,
			destWidth: Math.round(layout.width * layout.scale),
			destHeight: Math.round(layout.height * layout.scale),
			fileType: 'png',
			quality: 1,
			success: (result: { tempFilePath?: string }) => {
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
			const modeName = props.mode === 'boss'
				? '表格1-Boss视角'
				: `表格2-玩家视角-${props.layout === 'horizontal' ? '横向' : '竖向'}`;
			link.href = tempFilePath;
			link.download = `共享排刀表-${modeName}-${dateStamp()}.png`;
			doc.body.appendChild(link);
			link.click();
			doc.body.removeChild(link);
			resolve();
		} catch (error) {
			reject(error instanceof Error ? error : new Error('图片下载失败'));
		}
		// #endif

		// #ifndef H5
		reject(new Error('当前版本仅支持 H5 生成图片'));
		// #endif
	});
}

function dateStamp(): string {
	const date = new Date();
	const pad = (value: number): string => String(value).padStart(2, '0');
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

defineExpose({ exportImage });
</script>

<style scoped>
.schedule-export-canvas {
	position: fixed;
	top: 0;
	left: -14000px;
	pointer-events: none;
}
</style>
