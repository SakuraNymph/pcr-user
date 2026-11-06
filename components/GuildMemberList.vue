<template>
	<view class="guild-member-list">
		<view
			v-for="member in members"
			:key="member.uid"
			class="guild-member-row"
		>
			<view class="guild-member-avatar">
				<image
					v-if="member.avatar_url"
					class="guild-member-avatar-image"
					:src="member.avatar_url"
					mode="aspectFill"
				/>
				<text v-else>{{ guildAvatarText(member.nickname) }}</text>
			</view>

			<view class="guild-member-copy">
				<view class="guild-member-name">
					{{ member.nickname || '未设置昵称' }}
					<text v-if="member.uid === viewerUid" class="guild-member-self">我</text>
				</view>
				<view class="guild-member-meta">
					<text>UID {{ member.uid }}</text>
					<text>{{ member.role_name }}</text>
				</view>
			</view>

			<view class="guild-member-actions">
				<template v-if="permissions.can_appoint_vice && member.role === 3 && member.uid !== viewerUid">
					<view class="member-action" @click="emit('appoint-vice', member)">任命副会</view>
				</template>
				<template v-if="permissions.can_revoke_vice && member.role === 2">
					<view class="member-action" @click="emit('revoke-vice', member)">撤销副会</view>
				</template>
				<template v-if="permissions.can_kick && member.uid !== viewerUid && member.role !== 1">
					<view class="member-action danger" @click="emit('kick', member)">移出</view>
				</template>
				<template v-if="permissions.can_transfer_owner && member.uid !== viewerUid">
					<view class="member-action transfer" @click="emit('transfer', member)">转让会长</view>
				</template>
			</view>
		</view>
	</view>
</template>

<script setup lang="ts">
import type { GuildMemberSummary, GuildPermissions } from '../api/types';
import { guildAvatarText } from '../utils/guild';

defineProps<{
	members: GuildMemberSummary[];
	permissions: GuildPermissions;
	viewerUid: number;
}>();

const emit = defineEmits<{
	(event: 'appoint-vice', member: GuildMemberSummary): void;
	(event: 'revoke-vice', member: GuildMemberSummary): void;
	(event: 'kick', member: GuildMemberSummary): void;
	(event: 'transfer', member: GuildMemberSummary): void;
}>();
</script>

<style scoped>
.guild-member-list {
	display: flex;
	flex-direction: column;
	gap: 7px;
}

.guild-member-row {
	min-height: 64px;
	padding: 9px 11px;
	display: flex;
	align-items: center;
	gap: 11px;
	border: 1px solid var(--border-subtle);
	border-radius: 8px;
	background: var(--bg-panel-soft);
}

.guild-member-avatar {
	width: 42px;
	height: 42px;
	flex: 0 0 42px;
	overflow: hidden;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1px solid var(--border-strong);
	border-radius: 8px;
	background: var(--bg-subtle);
	color: var(--accent-text);
	font-size: 16px;
	font-weight: 800;
}

.guild-member-avatar-image {
	width: 100%;
	height: 100%;
	display: block;
}

.guild-member-copy {
	min-width: 0;
	flex: 1;
}

.guild-member-name {
	overflow: hidden;
	color: var(--text-primary);
	font-size: 14px;
	font-weight: 700;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.guild-member-self {
	margin-left: 6px;
	padding: 1px 6px;
	border-radius: 999px;
	background: var(--accent-soft);
	color: var(--accent-text);
	font-size: 10px;
}

.guild-member-meta {
	margin-top: 5px;
	display: flex;
	flex-wrap: wrap;
	gap: 5px 12px;
	color: var(--text-faint);
	font-size: 11px;
}

.guild-member-actions {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	flex-wrap: wrap;
	gap: 5px;
}

.member-action {
	min-height: 29px;
	padding: 0 8px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	border: 1px solid var(--border-default);
	border-radius: 6px;
	background: var(--bg-panel-soft-alt);
	color: var(--accent-text);
	font-size: 11px;
	cursor: pointer;
	white-space: nowrap;
}

.member-action.danger {
	border-color: rgba(240, 106, 115, 0.42);
	background: var(--danger-soft);
	color: var(--danger);
}

.member-action.transfer {
	border-color: rgba(255, 209, 102, 0.42);
	background: rgba(255, 209, 102, 0.08);
	color: var(--warning);
}

@media screen and (max-width: 700px) {
	.guild-member-row {
		align-items: flex-start;
		flex-wrap: wrap;
	}

	.guild-member-actions {
		width: 100%;
		padding-left: 53px;
		justify-content: flex-start;
	}
}
</style>
