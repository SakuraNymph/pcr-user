import type {
	GuildCapacityStatus,
	GuildScheduleMember,
	GuildScheduleSlot,
	GuildScheduleTeamSnapshot,
	Team,
} from '../api/types';

export const GUILD_CAPACITY = 30;

export function guildRoleName(role: number): string {
	if (Number(role) === 1) return '会长';
	if (Number(role) === 2) return '副会长';
	return '普通成员';
}

export function capacityLabel(
	status: GuildCapacityStatus,
	remaining: number,
	memberCount: number,
): string {
	if (status === 'full' || memberCount >= GUILD_CAPACITY) return '已满员';
	if (status === 'reserved' || remaining <= 0) return '暂无可用名额';
	return `剩余 ${remaining} 个名额`;
}

export function capacityClass(status: GuildCapacityStatus): string {
	return `capacity-${status}`;
}

export function formatGuildDate(value?: string | null): string {
	if (!value) return '—';
	const date = new Date(value.replace(' ', 'T'));
	if (Number.isNaN(date.getTime())) return value;

	return new Intl.DateTimeFormat('zh-CN', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	}).format(date);
}

export function formatGuildMonth(value: string): string {
	const match = /^(\d{4})-(\d{2})$/.exec(value);
	if (!match) return value;
	return `${match[1]}年${Number(match[2])}月`;
}

export function currentGuildMonth(): string {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function shiftGuildMonth(month: string, offset: number): string {
	const match = /^(\d{4})-(\d{2})$/.exec(month);
	if (!match) return currentGuildMonth();
	const date = new Date(Number(match[1]), Number(match[2]) - 1 + offset, 1);
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function stageName(stage: number): string {
	return (
		{
			2: 'B阶段',
			3: 'C阶段',
			4: 'D阶段',
		} as Record<number, string>
	)[Number(stage)] || '未知阶段';
}

export function teamTitle(team?: GuildScheduleTeamSnapshot | Team | null): string {
	if (!team) return '未选择';
	return `${stageName(Number(team.stage))} · ${Number(team.boss)}王`;
}

export function teamSummary(team?: GuildScheduleTeamSnapshot | Team | null): string {
	if (!team) return '';
	if (team.deleted) return '作业已删除';
	const damage = Number(team.damage || 0).toLocaleString('en-US');
	return `${teamTitle(team)} · ${damage} 万`;
}

export function findScheduleSlot(
	member: GuildScheduleMember,
	key: string,
): GuildScheduleSlot | undefined {
	return member.slots.find((slot) => slot.key === key);
}

export function guildAvatarText(name?: string | null): string {
	return Array.from(name?.trim() || '公')[0] || '公';
}

export function isRequestConflict(error: unknown): boolean {
	return Boolean(
		error
		&& typeof error === 'object'
		&& 'statusCode' in error
		&& Number((error as { statusCode?: number }).statusCode) === 409,
	);
}
