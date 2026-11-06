import { get } from './request';
import type { ApiEnvelope, Boss } from './types';

const BOSS_SORTS = [1, 2, 3, 4, 5] as const;

type BossPeriod = 'current' | 'previous';

function getYearMonth(monthOffset = 0): string {
	const date = new Date();
	date.setDate(1);
	date.setMonth(date.getMonth() + monthOffset);
	return String(date.getFullYear()) + String(date.getMonth() + 1).padStart(2, '0');
}

export function createFallbackBosses(yearMonth = getYearMonth()): Boss[] {
	return BOSS_SORTS.map((sort) => ({
		id: `fallback-boss-${sort}`,
		sort,
		file_path: '',
		name: `BOSS ${sort}`,
		year_month: yearMonth,
	}));
}

export function normalizeBosses(items: unknown, yearMonth = getYearMonth()): Boss[] {
	const seats = new Map<number, Boss>();

	if (Array.isArray(items)) {
		for (const item of items) {
			if (!item || typeof item !== 'object') {
				continue;
			}

			const record = item as Partial<Boss>;
			const sort = Number(record.sort);
			if (!Number.isInteger(sort) || sort < 1 || sort > 5 || seats.has(sort)) {
				continue;
			}

			const name = typeof record.name === 'string' ? record.name.trim() : '';
			const filePath = typeof record.file_path === 'string' ? record.file_path.trim() : '';
			const bossYearMonth = typeof record.year_month === 'string'
				&& /^\d{6}$/.test(record.year_month.trim())
				? record.year_month.trim()
				: yearMonth;

			seats.set(sort, {
				id: typeof record.id === 'string' || typeof record.id === 'number'
					? record.id
					: `fallback-boss-${sort}`,
				sort,
				file_path: filePath,
				name: name || `BOSS ${sort}`,
				year_month: bossYearMonth,
			});
		}
	}

	return BOSS_SORTS.map((sort) => seats.get(sort) ?? {
		id: `fallback-boss-${sort}`,
		sort,
		file_path: '',
		name: `BOSS ${sort}`,
		year_month: yearMonth,
	});
}

async function getBosses(period: BossPeriod): Promise<ApiEnvelope<Boss[]>> {
	const yearMonth = getYearMonth(period === 'previous' ? -1 : 0);

	try {
		const response = await get<ApiEnvelope<Boss[]>>(
			'/api/game/bosses',
			{ period },
		);

		if (response && response.status === 0 && Array.isArray(response.data)) {
			return {
				...response,
				data: normalizeBosses(response.data, yearMonth),
			};
		}

		console.warn('BOSS 接口返回的数据格式不正确，已使用占位座位。');
	} catch (error) {
		console.warn('获取 BOSS 列表失败，已使用占位座位：', error);
	}

	return {
		status: 0,
		code: 200,
		msg: 'BOSS 数据不可用，已使用占位座位',
		data: createFallbackBosses(yearMonth),
	};
}

export function getCurrentBosses(): Promise<ApiEnvelope<Boss[]>> {
	return getBosses('current');
}

export function getPreviousMonthBosses(): Promise<ApiEnvelope<Boss[]>> {
	return getBosses('previous');
}
