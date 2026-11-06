export interface ApiEnvelope<T> {
	status: number;
	code?: number;
	data: T;
	msg?: string;
	message?: string;
}

export interface UserProfile {
	id: string | number;
	nickname?: string | null;
	status: number;
	is_subscribe?: boolean;
	email?: string;
	country?: string | null;
	province?: string | null;
	city?: string | null;
	avatar?: number | null;
	avatar_url?: string | null;
	nickname_updated_at?: string | null;
}

export interface AvatarVariant {
	id: number;
	url: string;
}

export interface UserAvatarOption {
	id: number;
	name: string;
	nickname: string;
	element: number;
	avatar_1: AvatarVariant | null;
	avatar_3: AvatarVariant | null;
	avatar_6: AvatarVariant | null;
}

export interface AuthSession {
	user: UserProfile;
	accessToken: string;
}

export interface VisitorSession {
	visitor: {
		id: string | number;
		status: number;
	};
	accessToken: string;
}

export type ClanSchedulePhase = 'B' | 'C' | 'D';

export interface ClanScheduleCell {
	phase: ClanSchedulePhase;
	round: number;
	boss: number;
	player: string;
	slot: number;
}

export interface ClanSchedulePayload {
	cells: ClanScheduleCell[];
	player_order: string[];
}

export type ClanScheduleRole = 'owner' | 'member';

export interface ClanScheduleSummary {
	id: number | null;
	share_code: string | null;
	owner_nickname: string | null;
	role: ClanScheduleRole;
	can_clear: boolean;
	updated_at: string | null;
}

export interface ClanScheduleData extends ClanSchedulePayload, ClanScheduleSummary {}

export interface ClanScheduleList {
	own: ClanScheduleSummary;
	shared: ClanScheduleSummary[];
}

export type GuildRole = 1 | 2 | 3;
export type GuildCapacityStatus = 'available' | 'reserved' | 'full';

export interface GuildPermissions {
	is_member: boolean;
	can_view_members: boolean;
	can_edit_self: boolean;
	can_edit_others: boolean;
	can_invite: boolean;
	can_appoint_vice: boolean;
	can_revoke_vice: boolean;
	can_kick: boolean;
	can_clear_schedule: boolean;
	can_transfer_owner: boolean;
	can_dissolve: boolean;
	can_update_profile: boolean;
	can_review_applications: boolean;
}

export interface GuildSummary {
	id: number;
	name: string;
	description: string;
	avatar_url: string | null;
	owner_uid: number;
	owner_nickname: string | null;
	member_count: number;
	pending_invitation_count: number;
	pending_application_count: number;
	remaining_slots: number;
	capacity_status: GuildCapacityStatus;
	status: number;
	created_at: string | null;
}

export interface GuildMembership {
	role: GuildRole;
	role_name: string;
	member_slot: number;
	joined_at: string | null;
}

export interface GuildMemberSummary {
	uid: number;
	nickname: string | null;
	avatar_url: string | null;
	role: GuildRole;
	role_name: string;
	member_slot: number;
	joined_at: string | null;
}

export interface GuildDetail extends GuildSummary {
	viewer_membership: GuildMembership | null;
	permissions: GuildPermissions;
	viewer_has_guild: boolean;
	viewer_application: GuildViewerApplication | null;
	can_apply: boolean;
	apply_blocked_reason: GuildApplyBlockedReason | null;
	members?: GuildMemberSummary[];
}

export type GuildApplyBlockedReason =
	| 'member'
	| 'pending_application'
	| 'has_guild'
	| 'pending_invitation'
	| 'no_slots';

export interface GuildViewerApplication {
	id: number;
	status: number;
	status_name: string;
	created_at: string | null;
	expires_at: string | null;
}

export interface GuildApplication {
	id: number;
	guild_id: number;
	applicant_uid: number;
	applicant_nickname: string | null;
	applicant_avatar_url: string | null;
	status: number;
	status_name: string;
	created_at: string | null;
	expires_at: string | null;
}

export interface GuildApplicationList {
	items: GuildApplication[];
	count: number;
}

export interface GuildOverview {
	guild: GuildSummary | null;
	membership: GuildMembership | null;
	permissions: GuildPermissions;
	received_invitation_count: number;
	sent_invitation_count: number;
}

export interface GuildSearchPage {
	items: GuildSummary[];
	page: number;
	per_page: number;
	total: number;
	last_page: number;
}

export interface GuildInvitation {
	id: number;
	guild_id: number;
	guild_name: string | null;
	guild_avatar_url: string | null;
	inviter_uid: number;
	inviter_nickname: string | null;
	invitee_uid: number;
	invitee_nickname: string | null;
	status: number;
	status_name: string;
	created_at: string | null;
	expires_at: string | null;
}

export interface GuildInvitationList {
	items: GuildInvitation[];
	count: number;
}

export interface GuildInvitationCandidate {
	uid: number;
	nickname: string | null;
	avatar_url: string | null;
	eligible: boolean;
	reason: string | null;
}

export interface GuildScheduleTeamSnapshot extends Team {
	deleted?: boolean;
}

export interface GuildScheduleSlot {
	key: string;
	kind: 'main' | 'return';
	position: number;
	team_id: number | null;
	team: GuildScheduleTeamSnapshot | null;
	deleted: boolean;
	editable: boolean;
	return_editable: boolean;
}

export interface GuildScheduleMember {
	uid: number;
	nickname: string | null;
	role: GuildRole;
	role_name: string;
	member_slot: number;
	version: number;
	can_edit: boolean;
	team_1: number | null;
	team_1_return: number | null;
	team_2: number | null;
	team_2_return: number | null;
	team_3: number | null;
	team_3_return: number | null;
	slots: GuildScheduleSlot[];
}

export interface GuildSchedule {
	guild: {
		id: number;
		name: string;
		avatar_url: string | null;
		owner_nickname: string | null;
	};
	month: string;
	is_current_month: boolean;
	initialized: boolean;
	available_months: string[];
	permissions: GuildPermissions;
	members: GuildScheduleMember[];
}

export interface GuildTeamOptionStage {
	stage: 2 | 3 | 4;
	name: string;
}

export interface GuildTeamOptions {
	stages: GuildTeamOptionStage[];
	teams: Team[];
}

export interface Boss {
	id: string | number;
	sort: number;
	file_path: string;
	name?: string;
	year_month?: string;
}

export interface TeamRole {
	role_id?: string | number;
	id?: string | number;
	search_area_width?: number;
	image_url?: string | null;
	status?: number;
	disabled?: boolean;
}

export interface GameRoleOption {
	id: string | number;
	element: number;
	name: string;
	search_area_width: number;
	image_url: string | null;
}

export interface GameRoleGroup {
	element: number;
	roles: GameRoleOption[];
}

export interface UserRolePool {
	id: number;
	nickname: string;
	roles: Array<string | number>;
	created_at?: string;
	updated_at?: string;
}

export interface UserRolePoolPayload {
	nickname: string;
	roles: number[];
}

export interface MasterCoinShopRole {
	id: number;
	type: 1 | 2;
	name: string;
	image_url: string | null;
}

export interface MasterCoinShopPoolConfig {
	id: number;
	nickname: string;
	coin: number[];
}

export interface CardLuckEvaluation {
	title: string;
	level: number;
}

export interface CardStatisticsRole {
	id: number;
	image_id: number | null;
	image_url: string | null;
	name: string;
	probability: 1 | 2;
	up_time: string;
	year: number;
	saved_count: number | null;
	evaluation: CardLuckEvaluation | null;
}

export interface CardStatisticsRoleResponse {
	account: {
		id: number;
		nickname: string;
	};
	available_years: number[];
	year: number;
	roles: CardStatisticsRole[];
}

export interface CardStatisticsEntry {
	id: number;
	count: number;
}

export interface CardStatisticsReportRole {
	id: number;
	image_id: number | null;
	image_url: string | null;
	name: string;
	probability: 1 | 2;
	up_time: string;
	year: number;
	count: number;
	evaluation: CardLuckEvaluation | null;
}

export interface CardStatisticsPayload {
	account_id: number;
	year: number;
	data: CardStatisticsEntry[];
}

export interface CardStatisticsSaveResult {
	account_id: number;
	year: number;
	data: CardStatisticsEntry[];
	report: CardStatisticsReportRole[];
}

export interface CreateCustomTeamPayload {
	boss: string | number;
	damage: number;
	mode: 1 | 2;
	roles: Array<string | number>;
	remark?: string;
	missing_role_id?: string | number;
}

export interface TeamLink {
	id: string | number;
	author?: string;
	difficulty: number;
	damage: number;
	url?: string;
}

export interface Team {
	id: string | number;
	system_team_id?: string | number;
	source_team_id?: string | number | null;
	stage: number;
	boss: number;
	damage: number;
	remark?: string | null;
	mode?: number | string;
	atk_value?: number;
	created_at?: string;
	has_add?: boolean | number | string;
	missing_role_id?: string | number | null;
	team?: TeamRole[];
	link?: TeamLink[];
}

export type SystemTripleMode = 1 | 2;

export type SystemTripleAttackType = 0 | 1 | 2 | 3 | 4;

export interface SystemTripleRequest {
	row1: number;
	row2: number;
	row3: number;
	type: SystemTripleMode;
	atk: SystemTripleAttackType;
	lockedIds: number[];
	hiddenIds: number[];
	accountId?: number;
}

export interface SystemTripleRole {
	image_id: number | null;
	image_url: string | null;
	role_id: number;
	status: number;
}

export interface SystemTripleLink {
	id: number;
	url?: string | null;
	author?: string | null;
	difficulty: number;
	damage: number;
	note?: string | null;
	status?: number;
}

export interface SystemTripleTeam {
	id: number;
	boss: number;
	damage: number;
	atk_value: number;
	roles: SystemTripleRole[];
	borrow: number;
	remark: string;
	stage: number;
	link: SystemTripleLink[];
}

export type SystemTripleCombination = SystemTripleTeam[];

export type SystemSixHitMode = 1 | 2;

export type SystemSixHitStage = 0 | 2 | 3;

export interface SystemSixHitRequest {
	lowBosses: number[];
	highBosses: number[];
	mode: SystemSixHitMode;
	stage: SystemSixHitStage;
	atkType: SystemTripleAttackType;
	accountId?: number;
	lockedIds: number[];
	hiddenIds: number[];
}

export interface SystemSixHitPair {
	low: SystemTripleTeam;
	high: SystemTripleTeam;
}

export interface SystemSixHitPackage {
	score: number;
	borrow_count: number;
	overlap: number;
	permutation_index: number;
	pairs: SystemSixHitPair[];
}
