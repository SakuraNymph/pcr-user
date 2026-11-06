<template>
	<view
		class="guild-summary-card"
		:class="{ clickable }"
		@click="clickable && emit('click')"
	>
		<view class="guild-avatar-wrap">
			<image
				v-if="guild.avatar_url && !avatarFailed"
				class="guild-avatar"
				:src="guild.avatar_url"
				mode="aspectFill"
				@error="avatarFailed = true"
			/>
			<view v-else class="guild-avatar-placeholder">
				{{ guildAvatarText(guild.name) }}
			</view>
		</view>

		<view class="guild-summary-copy">
			<view class="guild-summary-heading">
				<view class="guild-summary-name">{{ guild.name }}</view>
				<view
					class="guild-capacity"
					:class="capacityClass(guild.capacity_status)"
				>
					{{ capacityLabel(guild.capacity_status, guild.remaining_slots, guild.member_count) }}
				</view>
			</view>

			<view class="guild-summary-description">
				{{ guild.description || '暂无公会简介' }}
			</view>

			<view class="guild-summary-meta">
				<text>会长：{{ guild.owner_nickname || `UID ${guild.owner_uid}` }}</text>
				<text>{{ guild.member_count }} / {{ GUILD_CAPACITY }} 人</text>
				<text v-if="guild.pending_invitation_count">
					{{ guild.pending_invitation_count }} 个邀请预留
				</text>
				<text v-if="guild.pending_application_count">
					{{ guild.pending_application_count }} 个申请预留
				</text>
				<text v-if="membership">{{ membership.role_name }}</text>
			</view>
		</view>

		<view v-if="clickable" class="guild-summary-arrow">›</view>
	</view>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { GuildMembership, GuildSummary } from '../api/types';
import {
	GUILD_CAPACITY,
	capacityClass,
	capacityLabel,
	guildAvatarText,
} from '../utils/guild';

const props = withDefaults(defineProps<{
	guild: GuildSummary;
	membership?: GuildMembership | null;
	clickable?: boolean;
}>(), {
	membership: null,
	clickable: false,
});

const emit = defineEmits<{ (event: 'click'): void }>();
const avatarFailed = ref(false);

watch(
	() => props.guild.avatar_url,
	() => {
		avatarFailed.value = false;
	},
);
</script>

<style scoped>
.guild-summary-card {
	min-height: 112px;
	padding: 16px;
	display: flex;
	align-items: center;
	gap: 15px;
	border: 1px solid var(--border-default);
	border-radius: 10px;
	background:
		radial-gradient(ellipse at 92% 0%, var(--accent-soft), transparent 50%),
		linear-gradient(120deg, var(--bg-panel), var(--bg-panel-alt));
	box-shadow: inset 0 0 18px var(--accent-soft), 0 8px 24px var(--shadow);
}

.guild-summary-card.clickable {
	cursor: pointer;
	transition: border-color 0.16s ease, transform 0.16s ease;
}

.guild-summary-card.clickable:hover {
	border-color: var(--border-strong);
	transform: translateY(-2px);
}

.guild-avatar-wrap {
	width: 72px;
	height: 72px;
	flex: 0 0 72px;
	overflow: hidden;
	border: 1px solid rgba(76, 198, 255, 0.72);
	border-radius: 10px;
	background: linear-gradient(145deg, var(--accent-strong), #064c94);
	box-shadow: 0 0 18px var(--accent-soft-strong);
}

.guild-avatar {
	width: 100%;
	height: 100%;
	display: block;
}

.guild-avatar-placeholder {
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	color: #fff;
	font-size: 27px;
	font-weight: 800;
}

.guild-summary-copy {
	min-width: 0;
	flex: 1;
}

.guild-summary-heading {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 9px;
}

.guild-summary-name {
	overflow: hidden;
	color: var(--text-primary);
	font-size: 19px;
	font-weight: 800;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.guild-capacity {
	min-height: 23px;
	padding: 0 8px;
	display: inline-flex;
	align-items: center;
	border: 1px solid var(--border-default);
	border-radius: 999px;
	background: var(--bg-panel-soft);
	color: var(--text-muted);
	font-size: 11px;
	font-weight: 700;
	white-space: nowrap;
}

.guild-capacity.capacity-available {
	border-color: rgba(79, 208, 138, 0.45);
	background: rgba(79, 208, 138, 0.1);
	color: var(--success);
}

.guild-capacity.capacity-reserved {
	border-color: rgba(255, 209, 102, 0.42);
	background: rgba(255, 209, 102, 0.1);
	color: var(--warning);
}

.guild-capacity.capacity-full {
	border-color: rgba(240, 106, 115, 0.45);
	background: var(--danger-soft);
	color: var(--danger);
}

.guild-summary-description {
	margin-top: 8px;
	overflow: hidden;
	color: var(--text-muted);
	font-size: 12px;
	line-height: 1.6;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.guild-summary-meta {
	margin-top: 9px;
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 8px 16px;
	color: var(--text-faint);
	font-size: 11px;
}

.guild-summary-arrow {
	flex: 0 0 auto;
	color: var(--accent-text);
	font-size: 26px;
}

@media screen and (max-width: 700px) {
	.guild-summary-card {
		padding: 13px;
		align-items: flex-start;
		gap: 11px;
	}

	.guild-avatar-wrap {
		width: 58px;
		height: 58px;
		flex-basis: 58px;
	}

	.guild-summary-name {
		font-size: 16px;
	}

	.guild-summary-description {
		white-space: normal;
	}

	.guild-summary-meta {
		gap: 5px 10px;
	}
}
</style>
