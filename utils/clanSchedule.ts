import type {
	ClanScheduleCell,
	ClanSchedulePayload,
	ClanSchedulePhase,
} from '../api/types';

export interface ClanSchedulePlayerRow {
	player: string;
	slots: Array<ClanScheduleCell | null>;
}

export interface ClanScheduleBossPosition {
	phase: ClanSchedulePhase;
	round: number;
	boss: number;
}

export interface NewPlayerSlot {
	slot: number;
	phase: ClanSchedulePhase;
	boss: number;
}

export const MAX_PLAYERS = 30;
export const MAX_PLAYER_CELLS = 6;
export const MAX_D_PLAYER_CELLS = 3;
export const MAX_NAME_LENGTH = 32;
export const D_START_ROUND = 23;
export const MAX_D_ROUND = 36;

export const B_ROUNDS = range(1, 6);
export const C_ROUNDS = range(7, 22);
export const D_ROUNDS = range(D_START_ROUND, MAX_D_ROUND);

export const PHASE_MAX_ROWS: Record<ClanSchedulePhase, number> = {
	B: B_ROUNDS.length,
	C: C_ROUNDS.length,
	D: D_ROUNDS.length,
};

export const SLOT_LABELS = [
	'第一刀',
	'第二刀',
	'第三刀',
	'第一刀返还',
	'第二刀返还',
	'第三刀返还',
];

export const HORIZONTAL_SLOT_ORDER = [0, 3, 1, 4, 2, 5];
export const VERTICAL_BASE_SLOTS = [0, 1, 2];
export const VERTICAL_RETURN_SLOTS = [3, 4, 5];

export const HORIZONTAL_HEADERS = [
	'第一刀',
	'第一刀返还',
	'第二刀',
	'第二刀返还',
	'第三刀',
	'第三刀返还',
];

export const VERTICAL_HEADERS = ['第一刀', '第二刀', '第三刀'];

export const BOSS_OPTIONS = createBossOptions();

export const BOSS_COLORS = [
	'#e39a9a',
	'#e7bd7a',
	'#ddd27a',
	'#8fd0a6',
	'#91b4e8',
];

export const PLAYER_COLORS = Array.from({ length: MAX_PLAYERS }, (_, index) => (
	hslToHex(
		(index * 137.508) % 360,
		64 + (index % 3) * 4,
		64 + (index % 4) * 3,
	)
));

export function range(start: number, end: number): number[] {
	const values: number[] = [];
	for (let value = start; value <= end; value += 1) {
		values.push(value);
	}
	return values;
}

export function trimName(value: unknown): string {
	return String(value ?? '')
		.replace(/[\u200B-\u200D\uFEFF]/g, '')
		.trim();
}

export function nameLength(value: string): number {
	return Array.from(value).length;
}

export function isValidName(value: string): boolean {
	const name = trimName(value);
	return (
		name.length > 0
		&& nameLength(name) <= MAX_NAME_LENGTH
		&& !/[\u0000-\u001F\u007F]/.test(name)
	);
}

export function isValidPhase(value: unknown): value is ClanSchedulePhase {
	return value === 'B' || value === 'C' || value === 'D';
}

export function phaseRank(phase: ClanSchedulePhase): number {
	if (phase === 'B') return 1;
	if (phase === 'C') return 2;
	return 3;
}

export function isRoundValid(phase: ClanSchedulePhase, round: number): boolean {
	if (phase === 'B') return round >= 1 && round <= 6;
	if (phase === 'C') return round >= 7 && round <= 22;
	return round >= D_START_ROUND && round <= MAX_D_ROUND;
}

export function positionKey(
	phase: ClanSchedulePhase,
	round: number,
	boss: number,
): string {
	return `${phase}:${round}:${boss}`;
}

export function parsePositionKey(
	key: string,
): ClanScheduleBossPosition | null {
	const parts = key.split(':');
	if (parts.length !== 3) return null;

	const phase = parts[0];
	const round = Number(parts[1]);
	const boss = Number(parts[2]);

	if (!isValidPhase(phase) || !Number.isInteger(round) || !isRoundValid(phase, round)) {
		return null;
	}

	if (!Number.isInteger(boss) || boss < 1 || boss > 5) {
		return null;
	}

	return { phase, round, boss };
}

export function sortCells(cells: ClanScheduleCell[]): ClanScheduleCell[] {
	return cells.slice().sort((left, right) => {
		const phaseDiff = phaseRank(left.phase) - phaseRank(right.phase);
		if (phaseDiff !== 0) return phaseDiff;
		if (left.round !== right.round) return left.round - right.round;
		return left.boss - right.boss;
	});
}

export function sanitizeReturnCells(
	cells: ClanScheduleCell[],
): ClanScheduleCell[] {
	const basePhases = new Map<string, ClanSchedulePhase>();

	cells.forEach((cell) => {
		if (cell.slot < 3) {
			basePhases.set(`${cell.player}\u0000${cell.slot}`, cell.phase);
		}
	});

	return cells.filter((cell) => {
		if (cell.slot < 3) return true;

		const basePhase = basePhases.get(
			`${cell.player}\u0000${cell.slot - 3}`,
		);

		return basePhase === 'B' || basePhase === 'C';
	});
}

export function normalizeCells(raw: unknown): ClanScheduleCell[] {
	if (!Array.isArray(raw)) return [];

	const cells: ClanScheduleCell[] = [];
	const positions = new Set<string>();
	const playerSlots = new Set<string>();

	raw.forEach((item) => {
		if (!item || typeof item !== 'object') return;

		const record = item as Record<string, unknown>;
		const phase = record.phase;
		const round = Number(record.round);
		const boss = Number(record.boss);
		const slot = Number(record.slot);
		const player = trimName(record.player);

		if (!isValidPhase(phase) || !Number.isInteger(round) || !isRoundValid(phase, round)) {
			return;
		}

		if (!Number.isInteger(boss) || boss < 1 || boss > 5) return;
		if (!Number.isInteger(slot) || slot < 0 || slot > 5) return;
		if (!isValidName(player)) return;

		const cellPositionKey = positionKey(phase, round, boss);
		if (positions.has(cellPositionKey)) return;

		const playerSlotKey = `${player}\u0000${slot}`;
		if (playerSlots.has(playerSlotKey)) return;

		positions.add(cellPositionKey);
		playerSlots.add(playerSlotKey);
		cells.push({
			phase,
			round,
			boss,
			player,
			slot,
		});
	});

	return sortCells(sanitizeReturnCells(cells));
}

export function distinctPlayers(cells: ClanScheduleCell[]): string[] {
	const names: string[] = [];

	sortCells(cells).forEach((cell) => {
		if (!names.includes(cell.player)) {
			names.push(cell.player);
		}
	});

	return names;
}

export function normalizePlayerOrder(
	cells: ClanScheduleCell[],
	rawOrder: unknown,
): string[] {
	const names = distinctPlayers(cells);
	const order = Array.isArray(rawOrder) ? rawOrder : [];
	const normalized: string[] = [];

	order.forEach((item) => {
		const name = trimName(item);
		if (names.includes(name) && !normalized.includes(name)) {
			normalized.push(name);
		}
	});

	names.forEach((name) => {
		if (!normalized.includes(name)) {
			normalized.push(name);
		}
	});

	return normalized;
}

export function buildPlayerRows(
	cells: ClanScheduleCell[],
	playerOrder: string[],
): ClanSchedulePlayerRow[] {
	const slotsByPlayer = new Map<string, Array<ClanScheduleCell | null>>();

	cells.forEach((cell) => {
		if (!slotsByPlayer.has(cell.player)) {
			slotsByPlayer.set(
				cell.player,
				Array.from({ length: 6 }, () => null),
			);
		}

		slotsByPlayer.get(cell.player)![cell.slot] = cell;
	});

	return playerOrder
		.filter((player) => slotsByPlayer.has(player))
		.map((player) => ({
			player,
			slots: slotsByPlayer.get(player)!,
		}));
}

export function buildPlayerColorMap(
	players: string[],
): Record<string, string> {
	const sorted = Array.from(new Set(players.filter(Boolean))).sort(compareNames);
	const colors: Record<string, string> = {};

	sorted.forEach((player, index) => {
		colors[player] = PLAYER_COLORS[index % PLAYER_COLORS.length];
	});

	return colors;
}

export function playerColorMapForCells(
	cells: ClanScheduleCell[],
): Record<string, string> {
	return buildPlayerColorMap(distinctPlayers(cells));
}

export function countCellsForPlayer(
	cells: ClanScheduleCell[],
	player: string,
): number {
	return cells.filter((cell) => cell.player === player).length;
}

export function firstFreeSlot(usedSlots: Iterable<number>): number | null {
	const used = new Set(Array.from(usedSlots));

	for (let slot = 0; slot < 6; slot += 1) {
		if (!used.has(slot)) return slot;
	}

	return null;
}

export function firstAvailableSlot(
	cells: ClanScheduleCell[],
	player: string,
): number | null {
	const playerCells = cells.filter((cell) => cell.player === player);
	const used = new Set(playerCells.map((cell) => cell.slot));
	const bySlot = new Map(playerCells.map((cell) => [cell.slot, cell]));

	for (let slot = 0; slot < 6; slot += 1) {
		if (used.has(slot)) continue;

		if (slot >= 3) {
			const base = bySlot.get(slot - 3);
			if (!base || base.phase === 'D') continue;
		}

		return slot;
	}

	return null;
}

export function phaseRounds(phase: ClanSchedulePhase): number[] {
	if (phase === 'B') return B_ROUNDS;
	if (phase === 'C') return C_ROUNDS;
	return D_ROUNDS;
}

export function visiblePhaseRounds(
	phase: ClanSchedulePhase,
	cells: ClanScheduleCell[],
	addedRounds: number[] = [],
): number[] {
	const visible = new Set<number>();

	cells.forEach((cell) => {
		if (cell.phase === phase && isRoundValid(phase, cell.round)) {
			visible.add(cell.round);
		}
	});

	addedRounds.forEach((round) => {
		if (isRoundValid(phase, round)) {
			visible.add(round);
		}
	});

	return phaseRounds(phase).filter((round) => visible.has(round));
}

export function nextPhaseRound(
	phase: ClanSchedulePhase,
	cells: ClanScheduleCell[],
	addedRounds: number[] = [],
): number | null {
	const allRounds = phaseRounds(phase);
	const visible = new Set(visiblePhaseRounds(phase, cells, addedRounds));

	if (visible.size >= allRounds.length) {
		return null;
	}

	const highest = visible.size
		? Math.max(...Array.from(visible))
		: allRounds[0] - 1;
	const nextRound = allRounds.find(
		(round) => round > highest && !visible.has(round),
	);

	if (nextRound !== undefined) {
		return nextRound;
	}

	return allRounds.find((round) => !visible.has(round)) ?? null;
}

export function findBossPosition(
	cells: ClanScheduleCell[],
	player: string,
	slot: number,
	targetPhase: ClanSchedulePhase,
	targetBoss: number,
): ClanScheduleBossPosition | null {
	const current = cells.find(
		(cell) => cell.player === player && cell.slot === slot,
	) ?? null;

	if (
		current
		&& current.phase === targetPhase
		&& current.boss === targetBoss
	) {
		return {
			phase: current.phase,
			round: current.round,
			boss: current.boss,
		};
	}

	const occupied = new Set(
		cells.map((cell) => positionKey(cell.phase, cell.round, cell.boss)),
	);
	const isFree = (round: number): boolean => (
		!occupied.has(positionKey(targetPhase, round, targetBoss))
	);

	if (
		current
		&& current.phase === targetPhase
		&& isRoundValid(targetPhase, current.round)
		&& isFree(current.round)
	) {
		return {
			phase: targetPhase,
			round: current.round,
			boss: targetBoss,
		};
	}

	const rounds = targetPhase === 'B'
		? B_ROUNDS
		: targetPhase === 'C'
			? C_ROUNDS
			: D_ROUNDS;

	for (const round of rounds) {
		if (isFree(round)) {
			return {
				phase: targetPhase,
				round,
				boss: targetBoss,
			};
		}
	}

	return null;
}

export function placePlayerSlots(
	cells: ClanScheduleCell[],
	player: string,
	slots: NewPlayerSlot[],
): { cells: ClanScheduleCell[] | null; error: string | null } {
	const bySlot = new Map<number, NewPlayerSlot>();

	slots.forEach((slot) => {
		if (!isValidPhase(slot.phase)) return;
		if (!Number.isInteger(slot.slot) || slot.slot < 0 || slot.slot > 5) return;
		if (!Number.isInteger(slot.boss) || slot.boss < 1 || slot.boss > 5) return;
		bySlot.set(slot.slot, slot);
	});

	const ordered = Array.from(bySlot.values())
		.sort((left, right) => left.slot - right.slot);

	if (!ordered.length) {
		return { cells: null, error: '请至少选择一个Boss' };
	}

	const dSlots = ordered.filter((slot) => slot.phase === 'D').length;
	if (dSlots > MAX_D_PLAYER_CELLS) {
		return {
			cells: null,
			error: `D阶段最多只能安排 ${MAX_D_PLAYER_CELLS} 次出刀`,
		};
	}

	const baseBySlot = new Map(
		ordered.map((slot) => [slot.slot, slot] as const),
	);

	for (const slot of ordered) {
		if (slot.slot < 3) continue;

		const base = baseBySlot.get(slot.slot - 3);
		if (!base || base.phase === 'D') {
			return {
				cells: null,
				error: '只有对应的基础刀为B或C阶段时才能填写返还刀',
			};
		}
	}

	const nextCells = cells.map((cell) => ({ ...cell }));

	for (const slot of ordered) {
		const position = findBossPosition(
			nextCells,
			player,
			slot.slot,
			slot.phase,
			slot.boss,
		);

		if (!position) {
			return {
				cells: null,
				error: slot.phase === 'D'
					? `D阶段周目已达上限，无法再安排 ${slot.phase}${slot.boss}`
					: `${slot.phase}阶段 ${slot.phase}${slot.boss} 已没有可用格子`,
			};
		}

		nextCells.push({
			phase: position.phase,
			round: position.round,
			boss: position.boss,
			player,
			slot: slot.slot,
		});
	}

	return { cells: sortCells(sanitizeReturnCells(nextCells)), error: null };
}

export function insertPlayerAt(
	playerOrder: string[],
	player: string,
	index?: number,
): string[] {
	const next = playerOrder.filter((name) => name !== player);
	const target = Number.isInteger(index) ? Number(index) : next.length;
	const position = Math.max(0, Math.min(target, next.length));

	next.splice(position, 0, player);

	return next;
}

export function bossLabel(
	phase: ClanSchedulePhase,
	boss: number,
): string {
	return `${phase}${boss}`;
}

export function parseBossLabel(
	label: string,
): { phase: ClanSchedulePhase; boss: number } | null {
	const match = /^([BCD])([1-5])$/.exec(label);
	if (!match) return null;

	return {
		phase: match[1] as ClanSchedulePhase,
		boss: Number(match[2]),
	};
}

export function normalizeShareCode(value: unknown): string {
	return String(value ?? '')
		.toUpperCase()
		.replace(/[\s-]+/g, '');
}

export function isValidShareCode(value: string): boolean {
	return /^[A-HJ-NP-Z2-9]{8}$/.test(normalizeShareCode(value));
}

/**
 * 生成 H5 排刀表分享链接。非 H5 端没有可公开访问的页面地址，
 * 退化为分享码本身，扫码后仍可在“输入分享码”中加入。
 */
export function buildScheduleShareUrl(shareCode: string): string {
	const code = normalizeShareCode(shareCode);
	if (!code) return '';

	// #ifdef H5
	if (typeof window !== 'undefined' && window.location) {
		const { origin, pathname } = window.location;
		let base = pathname.replace(/index\.html?$/i, '');

		if (!base.endsWith('/') && !/\.[a-z0-9]+$/i.test(base)) {
			base = `${base}/`;
		}

		return `${origin}${base}#/pages/schedule/index?shareCode=${code}`;
	}
	// #endif

	return code;
}

export function phaseTitle(phase: ClanSchedulePhase): string {
	if (phase === 'B') return 'B阶段';
	if (phase === 'C') return 'C阶段';
	return 'D阶段';
}

export function phaseSubtitle(phase: ClanSchedulePhase): string {
	if (phase === 'B') return '第1-6周目';
	if (phase === 'C') return '第7-22周目';
	return '第23周目起';
}

export function buildSnapshot(
	cells: ClanScheduleCell[],
	playerOrder: string[],
): ClanSchedulePayload {
	const sorted = sortCells(sanitizeReturnCells(cells));

	return {
		cells: sorted,
		player_order: normalizePlayerOrder(sorted, playerOrder),
	};
}

export function appendPlayerIfMissing(
	playerOrder: string[],
	player: string,
): string[] {
	if (!player || playerOrder.includes(player)) {
		return playerOrder.slice();
	}

	return [...playerOrder, player];
}

export function removePlayerIfEmpty(
	playerOrder: string[],
	cells: ClanScheduleCell[],
	player: string,
): string[] {
	if (!player) return playerOrder.slice();

	return cells.some((cell) => cell.player === player)
		? playerOrder.slice()
		: playerOrder.filter((name) => name !== player);
}

export function replacePlayerInOrder(
	playerOrder: string[],
	oldPlayer: string,
	newPlayer: string,
): string[] {
	const normalized: string[] = [];

	playerOrder.forEach((name) => {
		const replaced = name === oldPlayer ? newPlayer : name;
		if (replaced && !normalized.includes(replaced)) {
			normalized.push(replaced);
		}
	});

	return normalized;
}

function createBossOptions(): string[] {
	const options: string[] = [];

	(['B', 'C', 'D'] as ClanSchedulePhase[]).forEach((phase) => {
		for (let boss = 1; boss <= 5; boss += 1) {
			options.push(`${phase}${boss}`);
		}
	});

	options.push('空白');
	return options;
}

function compareNames(left: string, right: string): number {
	const leftPoints = Array.from(left);
	const rightPoints = Array.from(right);
	const length = Math.min(leftPoints.length, rightPoints.length);

	for (let index = 0; index < length; index += 1) {
		const leftCode = leftPoints[index].codePointAt(0) ?? 0;
		const rightCode = rightPoints[index].codePointAt(0) ?? 0;
		if (leftCode !== rightCode) {
			return leftCode - rightCode;
		}
	}

	return leftPoints.length - rightPoints.length;
}

function hslToHex(
	hue: number,
	saturation: number,
	lightness: number,
): string {
	const normalizedHue = ((hue % 360) + 360) % 360;
	const s = saturation / 100;
	const l = lightness / 100;
	const c = (1 - Math.abs(2 * l - 1)) * s;
	const x = c * (1 - Math.abs(((normalizedHue / 60) % 2) - 1));
	const m = l - c / 2;
	let red = 0;
	let green = 0;
	let blue = 0;

	if (normalizedHue < 60) {
		red = c;
		green = x;
	} else if (normalizedHue < 120) {
		red = x;
		green = c;
	} else if (normalizedHue < 180) {
		green = c;
		blue = x;
	} else if (normalizedHue < 240) {
		green = x;
		blue = c;
	} else if (normalizedHue < 300) {
		red = x;
		blue = c;
	} else {
		red = c;
		blue = x;
	}

	const toHex = (value: number): string => (
		Math.round((value + m) * 255)
			.toString(16)
			.padStart(2, '0')
	);

	return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}
