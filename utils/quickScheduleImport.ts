import { errorMessage } from '../api/errors';
import { getGuildOverview, getGuildSchedule, saveGuildScheduleMember } from '../api/guild';
import { authState } from '../api/identity';
import type { GuildSchedule, GuildScheduleMember } from '../api/types';

export interface QuickScheduleSlots {
	team_1: number | null;
	team_1_return: number | null;
	team_2: number | null;
	team_2_return: number | null;
	team_3: number | null;
	team_3_return: number | null;
}

interface QuickScheduleImportContext {
	guildId: number;
	guildName: string;
	uid: number;
	version: number;
	hasExisting: boolean;
}

class GuildRequiredError extends Error {}

const SLOT_KEYS = [
	'team_1',
	'team_1_return',
	'team_2',
	'team_2_return',
	'team_3',
	'team_3_return',
] as const;

const MAIN_SLOT_KEYS = ['team_1', 'team_2', 'team_3'] as const;

function isValidTeamId(value: number | null): boolean {
	return value === null || (Number.isInteger(value) && value > 0);
}

function hasExistingSlots(member: GuildScheduleMember): boolean {
	return SLOT_KEYS.some((key) => member[key] !== null);
}

function slotsAreValid(slots: QuickScheduleSlots): boolean {
	return MAIN_SLOT_KEYS.every((key) => slots[key] !== null)
		&& SLOT_KEYS.every((key) => isValidTeamId(slots[key]));
}

async function prepareQuickScheduleImport(): Promise<QuickScheduleImportContext> {
	const uid = Number(authState.user?.id || 0);

	if (!authState.isAuthenticated || uid <= 0) {
		throw new Error('请先登录后再导入排刀');
	}

	const overview = await getGuildOverview();
	const guild = overview?.guild;

	if (!guild) {
		throw new GuildRequiredError('还未加入公会');
	}

	const schedule = await getGuildSchedule(Number(guild.id));

	if (!schedule?.is_current_month) {
		throw new Error('只能导入当前月份的快捷排刀');
	}

	const member = schedule.members.find((item) => Number(item.uid) === uid);

	if (!member) {
		throw new Error('当前公会排刀中没有你的成员记录，请刷新后重试');
	}

	if (!member.can_edit) {
		throw new Error('当前快捷排刀不可编辑，请刷新后重试');
	}

	return {
		guildId: Number(guild.id),
		guildName: guild.name,
		uid,
		version: Number(member.version),
		hasExisting: hasExistingSlots(member),
	};
}

function confirmOverwrite(guildName: string): Promise<boolean> {
	return new Promise((resolve) => {
		uni.showModal({
			title: '覆盖快捷排刀',
			content: `“${guildName}”的快捷排刀已有数据。导入后将清空并覆盖第一/二/三刀及返还刀，是否继续？`,
			confirmText: '覆盖导入',
			confirmColor: '#e45c68',
			cancelText: '取消',
			success: (result) => resolve(Boolean(result.confirm)),
			fail: () => resolve(false),
		});
	});
}

function promptJoinGuild(): Promise<void> {
	return new Promise((resolve) => {
		uni.showModal({
			title: '还未加入公会',
			content: '导入排刀需要先加入公会，请先加入公会后重试。',
			showCancel: false,
			confirmText: '知道了',
			complete: () => resolve(),
		});
	});
}

async function writeQuickSchedule(
	context: QuickScheduleImportContext,
	slots: QuickScheduleSlots,
): Promise<GuildSchedule> {
	return saveGuildScheduleMember(context.guildId, context.uid, {
		version: context.version,
		...slots,
	});
}

export async function importGuildQuickSchedule(slots: QuickScheduleSlots): Promise<boolean> {
	if (!slotsAreValid(slots)) {
		uni.showToast({ title: '套餐数据不完整', icon: 'none' });
		return false;
	}

	try {
		const context = await prepareQuickScheduleImport();

		if (context.hasExisting && !(await confirmOverwrite(context.guildName))) {
			return false;
		}

		await writeQuickSchedule(context, slots);
		uni.showToast({ title: '已导入到排刀', icon: 'success' });
		return true;
	} catch (error) {
		if (error instanceof GuildRequiredError) {
			await promptJoinGuild();
			return false;
		}

		uni.showToast({ title: errorMessage(error, '导入排刀失败'), icon: 'none' });
		return false;
	}
}
