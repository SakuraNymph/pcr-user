import { get } from './request';
import type { ApiEnvelope, GameRoleGroup } from './types';

export function getGameRoles(): Promise<ApiEnvelope<GameRoleGroup[]>> {
	return get<ApiEnvelope<GameRoleGroup[]>>('/api/game/roles');
}
