<template>
	<view class="team-card">
		<view class="team-summary">
			<view class="team-boss">
				<view class="boss-code">{{ bossCode }}</view>
				<view class="boss-cover-wrap">
					<image
						v-if="boss"
						class="boss-cover"
						:src="boss.file_path"
						mode="aspectFill"
					/>
					<view v-else class="boss-cover boss-placeholder">BOSS</view>
					<view class="stage-tag">{{ stageName(team.stage) }}</view>
				</view>

				<view class="boss-detail">
					<text class="boss-number">BOSS {{ boss?.sort ?? team.boss }}</text>
					<text class="boss-detail-name">{{ boss?.name || '未知 BOSS' }}</text>
				</view>
			</view>

			<view class="team-mode">
				<view class="mode-tag" :class="modeClass(mainMode)">
					{{ modeName(mainMode) }}
				</view>
			</view>

			<view class="team-damage">
				<text class="damage-icon">⚔</text>
				<text class="damage-number">{{ formatDamage(team.damage) }}</text>
			</view>
		</view>

		<view class="team-roles guide-target-roles">
			<template v-for="(slot, slotIndex) in roleSlots" :key="slot ? `${slot.role.role_id || slot.role.id || slot.index}-${slot.index}` : `empty-${slotIndex}`">
				<RoleAvatar
					v-if="slot"
					:role="slot.role"
					:disabled="isDisabled(slot.role, slot.index)"
					:interactive="rolesInteractive"
					@toggle="emit('toggle-role', { role: slot.role, index: slot.index })"
				/>
				<view v-else class="role-seat-empty" aria-hidden="true" />
			</template>
			<view v-if="!displayRoles.length" class="no-roles">暂无角色</view>
		</view>

		<view
			class="team-links guide-target-links"
			:class="{ 'team-links-has-remark': showRemark, 'team-links-no-pager': pageCount <= 1 }"
		>
			<view
				v-if="showRemark"
				class="team-remark"
				:class="{ 'team-remark-empty': !remarkText }"
				:title="remarkText || '暂无备注'"
			>
				<text class="team-remark-text">{{ remarkText || '暂无备注' }}</text>
			</view>
			<view v-if="!showRemark" class="links-grid" :class="`links-page-${linksPerPage}`">
				<view
					v-for="(link, index) in pagedLinks"
					:key="link.id"
					class="link-row"
					:class="[difficultyClass(link.difficulty), { 'guide-target-link': index === 0 }]"
					@click="emit('open-link', link)"
				>
					<text class="link-author">{{ link.author || '匿名作者' }}</text>
					<text class="link-difficulty">{{ difficultyName(link.difficulty) }}</text>
					<text class="link-damage">{{ formatDamage(link.damage) }}</text>
				</view>
			</view>
			<view v-if="!showRemark && !links.length" class="empty-links">暂无作业链接</view>

			<view
				v-if="showAction || showEdit || showDelete"
				class="team-action"
				:class="{ 'team-action-edit': !showAction }"
			>
				<button
					v-if="showAction"
					type="button"
					class="star-toggle guide-target-star"
					:class="{ 'star-added': added, 'star-pending': pending }"
					:aria-label="added ? '取消收藏作业' : '收藏作业'"
					:aria-pressed="added"
					@click="!pending && emit('toggle-add')"
				>
					<Star :size="22" color="#F5CE65" :filled="added" />
					<text class="star-label">收藏</text>
				</button>
				<template v-else>
					<view
						v-if="showEdit"
						class="team-edit-button"
						title="修改自定义作业"
						@click.stop="emit('edit')"
					>修改</view>
					<view
						v-if="showDelete"
						class="team-delete-button"
						:class="{ pending: deletePending }"
						title="删除自定义作业"
						@click.stop="!deletePending && emit('delete')"
					>{{ deletePending ? '删除中' : '删除' }}</view>
				</template>
			</view>

			<view v-if="pageCount > 1" class="link-nav" :aria-label="`${boss?.name || team.boss}的链接翻页`">
				<button
					type="button"
					class="link-nav-button"
					:disabled="currentPage === 0"
					:aria-label="`${boss?.name || team.boss}的上一页链接`"
					@click.stop="changePage(-1)"
				>
					‹
				</button>
				<text class="page-indicator">{{ currentPage + 1 }}/{{ pageCount }}</text>
				<button
					type="button"
					class="link-nav-button"
					:disabled="currentPage >= pageCount - 1"
					:aria-label="`${boss?.name || team.boss}的下一页链接`"
					@click.stop="changePage(1)"
				>
					›
				</button>
			</view>
		</view>
	</view>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import RoleAvatar from './RoleAvatar.vue';
import Star from './Star.vue';
import type { Boss, Team, TeamLink, TeamRole } from '../api/types';

const props = withDefaults(defineProps<{
	team: Team;
	boss?: Boss;
	disabledRoleKey?: string;
	added: boolean;
	pending?: boolean;
	showAction?: boolean;
	showEdit?: boolean;
	showDelete?: boolean;
	deletePending?: boolean;
	rolesInteractive?: boolean;
	showRemark?: boolean;
}>(), {
	showAction: true,
	showEdit: false,
	showDelete: false,
	deletePending: false,
	rolesInteractive: true,
	showRemark: false,
});

const showAction = computed(() => props.showAction);

const emit = defineEmits<{
	(event: 'toggle-role', payload: { role: TeamRole; index: number }): void;
	(event: 'open-link', link: TeamLink): void;
	(event: 'toggle-add'): void;
	(event: 'edit'): void;
	(event: 'delete'): void;
}>();

// 接口已按 search_area_width 排序，展示时保留接口顺序，避免二次排序改变阵容。
const displayRoles = computed(() => (Array.isArray(props.team.team) ? props.team.team : []));
const roleSlots = computed<Array<{ role: TeamRole; index: number } | null>>(() => {
	const roles = displayRoles.value
		.map((role, index) => ({ role, index }))
		.slice(0, 5);

	return [
		...Array.from({ length: Math.max(0, 5 - roles.length) }, () => null),
		...roles,
	];
});
const links = computed(() => (Array.isArray(props.team.link) ? props.team.link : []));
const remarkText = computed(() => String(props.team.remark || '').trim());
const mainMode = computed(() => Number(props.team.mode || 0));
const bossCode = computed(() => {
	const stageLetters = ['A', 'B', 'C', 'D', 'E'];
	const stage = Number(props.team.stage);
	const letter = stageLetters[stage - 1] || 'D';
	const sort = Number(props.boss?.sort ?? props.team.boss);

	return `${letter}${sort}`;
});
const currentPage = ref(0);
const linksPerPage = ref(resolveLinksPerPage(uni.getSystemInfoSync().windowWidth));

const pageCount = computed(() => Math.max(
	1,
	Math.ceil(links.value.length / linksPerPage.value),
));

const pagedLinks = computed(() => {
	const start = currentPage.value * linksPerPage.value;
	return links.value.slice(start, start + linksPerPage.value);
});

function resolveLinksPerPage(windowWidth: number): number {
	if (windowWidth <= 700) {
		return 2;
	}

	if (windowWidth <= 900) {
		return 2;
	}

	if (windowWidth <= 1200) {
		return 3;
	}

	return 4;
}

function updateLinksPerPage(): void {
	const nextValue = resolveLinksPerPage(uni.getSystemInfoSync().windowWidth);

	if (nextValue !== linksPerPage.value) {
		linksPerPage.value = nextValue;
		currentPage.value = 0;
	}
}

function handleWindowResize(): void {
	updateLinksPerPage();
}

function changePage(direction: number): void {
	const nextPage = currentPage.value + direction;

	if (nextPage >= 0 && nextPage < pageCount.value) {
		currentPage.value = nextPage;
	}
}

onMounted(() => {
	updateLinksPerPage();
	uni.onWindowResize(handleWindowResize);
});

onBeforeUnmount(() => {
	uni.offWindowResize(handleWindowResize);
});

watch(() => props.team.id, () => {
	currentPage.value = 0;
});

watch(() => links.value.length, () => {
	if (currentPage.value >= pageCount.value) {
		currentPage.value = pageCount.value - 1;
	}
});

const difficultyNames: Record<number, string> = {
	1: '纯 AUTO', 2: '简单 SET', 3: '开关 SET', 4: '简单目押', 5: '目押',
};
const modeNames: Record<number, string> = {
	1: 'Auto',
	2: '手动',
};
const modeClasses: Record<number, string> = {
	1: 'mode-auto',
	2: 'mode-manual',
};
const stageNames: Record<number, string> = {
	1: 'A 阶段', 2: 'B 阶段', 3: 'C 阶段', 4: 'D 阶段', 5: 'E 阶段',
};

function difficultyName(value: number): string {
	return difficultyNames[Number(value)] || '未设置';
}

function difficultyClass(value: number): string {
	return `link-difficulty-${Number(value) || 0}`;
}

function modeName(value: number): string {
	return modeNames[Number(value)] || '未设置';
}

function modeClass(value: number): string {
	return modeClasses[Number(value)] || 'mode-default';
}

function stageName(value: number): string {
	return stageNames[Number(value)] || '未知阶段';
}

function formatDamage(value: number): string {
	return Number(value || 0).toLocaleString('en-US') + ' 万';
}

function isDisabled(role: TeamRole, index: number): boolean {
	const roleKey = role.role_id ?? role.id ?? index;
	return props.disabledRoleKey === String(roleKey);
}
</script>

<style>
.team-card {
	position: relative;
	min-height: 98px;
	display: flex;
	align-items: stretch;
	border: 1px solid var(--border-subtle);
	border-radius: 9px;
	background: linear-gradient(105deg, var(--bg-panel), var(--bg-panel-alt) 70%, var(--bg-panel));
	box-shadow: 0 0 7px rgba(27, 151, 216, 0.045), inset 0 0 12px rgba(24, 119, 171, 0.02);
	overflow: hidden;
	transition: transform 0.24s cubic-bezier(0.22, 1, 0.36, 1);
	-webkit-tap-highlight-color: transparent;
}

@media (hover: hover) and (pointer: fine) {
	.team-card:hover {
		transform: translateY(-3px);
	}
}

@media (hover: none) {
	.team-card {
		cursor: pointer;
		will-change: transform;
	}
	.team-card:active {
		transform: translateY(-2px);
	}
}
.team-card::after {
	position: absolute;
	inset: 0;
	border-radius: inherit;
	background:
	repeating-linear-gradient(90deg, rgba(74, 194, 244, 0.045) 0 24px, rgba(89, 207, 255, 0.11) 24px 48px, rgba(66, 177, 228, 0.06) 48px 72px) top / 100% 1px no-repeat,
	repeating-linear-gradient(90deg, rgba(66, 177, 228, 0.05) 0 24px, rgba(89, 207, 255, 0.1) 24px 48px, rgba(74, 194, 244, 0.045) 48px 72px) bottom / 100% 1px no-repeat,
	repeating-linear-gradient(180deg, rgba(74, 194, 244, 0.18) 0 24px, rgba(89, 207, 255, 0.27) 24px 48px, rgba(66, 177, 228, 0.19) 48px 72px) left / 1px 100% no-repeat,
	repeating-linear-gradient(180deg, rgba(66, 177, 228, 0.17) 0 24px, rgba(89, 207, 255, 0.26) 24px 48px, rgba(74, 194, 244, 0.18) 48px 72px) right / 1px 100% no-repeat;
	filter: drop-shadow(0 0 1px var(--border-subtle));
	content: '';
	pointer-events: none;
}
.team-card > view {
	min-width: 0;
}
.team-summary {
	display: contents;
}
.team-summary > view {
	min-width: 0;
}
.boss-code {
	display: none;
	height: 26px;
	padding: 0 8px;
	align-items: center;
	justify-content: center;
	border: 1px solid rgba(76, 166, 255, 0.72);
	border-radius: 6px;
	background: linear-gradient(145deg, #168dff, #075fce);
	color: #fff;
	font-size: 12px;
	font-weight: 700;
	line-height: 1;
	white-space: nowrap;
	box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2);
}
.team-boss {
	position: relative;
	width: 16%;
	flex-shrink: 0;
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 5px 10px;
	border-right: none;
}
.boss-cover-wrap {
	position: relative;
	width: 96px;
	height: 86px;
	flex-shrink: 0;
	overflow: hidden;
	border: 1px solid #1677c5;
	border-radius: 8px;
}
.boss-cover {
	width: 100%;
	height: 100%;
	display: block;
}
.boss-placeholder {
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--bg-subtle);
	color: var(--text-secondary);
}
.stage-tag {
	position: absolute;
	top: 5px;
	left: 5px;
	padding: 4px 9px;
	border-radius: 5px;
	background: #087cf5;
	color: #fff;
	font-size: 11px;
	font-weight: bold;
}
.boss-detail {
	display: flex;
	flex-direction: column;
	gap: 9px;
	overflow: hidden;
}
.boss-number {
	color: var(--text-primary);
	font-size: 13px;
	white-space: nowrap;
}
.boss-detail-name {
	color: var(--text-secondary);
	font-size: 12px;
	overflow-wrap: anywhere;
}
.team-damage {
	position: relative;
	width: 10%;
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	padding: 5px;
	border-right: none;
}
.damage-icon {
	font-size: 25px;
	color: var(--accent-text);
	text-shadow: 0 0 9px #087fff;
}
.damage-number {
	font-size: 15px;
	color: var(--text-primary);
	white-space: nowrap;
}
.team-mode {
	position: relative;
	width: 10%;
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 5px;
	border-right: none;
}
.mode-tag {
	padding: 8px 12px;
	border-radius: 12px;
	font-size: 12px;
	color: #fff;
	white-space: nowrap;
	text-align: center;
}
.mode-auto {
	background: #0b9b6f;
}
.mode-manual {
	background: #7045d5;
}
.mode-default {
	background: #36516f;
}
.team-roles {
	position: relative;
	width: 26%;
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 7px;
	padding: 6px;
	border-right: none;
}
.role-seat-empty {
	width: 60px;
	height: 60px;
	flex: 0 0 60px;
	box-sizing: border-box;
	border: 1px dashed var(--border-default);
	border-radius: 8px;
	background: var(--bg-panel-soft);
}
.no-roles {
	position: absolute;
	inset: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 12px;
	color: var(--text-muted);
	pointer-events: none;
}
.team-links {
	position: relative;
	flex: 1;
	min-width: 0;
	align-self: stretch;
	padding: 8px 82px 8px 24px;
	display: flex;
	align-items: center;
	overflow: hidden;
}
.links-grid {
	display: grid;
	width: 100%;
	max-width: 392px;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	align-items: center;
	gap: 6px;
}
.links-page-2 {
	max-width: 193px;
	grid-template-columns: repeat(2, minmax(0, 1fr));
}
.links-page-3 {
	max-width: 293px;
	grid-template-columns: repeat(3, minmax(0, 1fr));
}
.link-row {
	width: 100%;
	min-width: 0;
	height: 72px;
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	justify-content: center;
	gap: 3px;
	padding: 6px 5px;
	border: 1px solid var(--border-default);
	border-radius: 6px;
	background: var(--bg-panel-soft);
	color: var(--text-secondary);
	font-size: 11px;
	cursor: pointer;
	transition: background-color 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
}
.link-difficulty-1 {
	border-color: rgba(48, 190, 142, 0.42);
	background: var(--difficulty-1-bg);
}
.link-difficulty-2 {
	border-color: rgba(54, 146, 255, 0.42);
	background: var(--bg-panel-soft-alt);
}
.link-difficulty-3 {
	border-color: rgba(207, 151, 66, 0.44);
	background: var(--difficulty-3-bg);
}
.link-difficulty-4 {
	border-color: rgba(157, 112, 255, 0.43);
	background: var(--difficulty-4-bg);
}
.link-difficulty-5 {
	border-color: rgba(207, 76, 126, 0.48);
	background: var(--difficulty-5-bg);
}
.link-difficulty-0 {
	border-color: var(--border-default);
	background: var(--bg-panel-soft);
}
.link-row:active {
	filter: brightness(1.18);
}
.link-row:hover {
	filter: brightness(1.2);
	box-shadow: 0 0 8px rgba(62, 171, 255, 0.12);
}
.link-author {
	width: 100%;
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.link-difficulty {
	width: 100%;
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.link-damage {
	width: 100%;
	max-width: 100%;
	text-align: left;
	white-space: nowrap;
}
.empty-links {
	flex: 0 0 auto;
	padding: 5px;
	color: var(--text-muted);
	font-size: 12px;
}
.team-remark {
	box-sizing: border-box;
	width: 100%;
	min-height: 72px;
	padding: 8px 10px;
	display: flex;
	align-items: flex-start;
	border: 1px solid var(--border-default);
	border-radius: 6px;
	background: var(--bg-panel-soft);
	color: var(--text-secondary);
	font-size: 12px;
	line-height: 1.55;
}
.team-remark-text {
	display: block;
	overflow-wrap: anywhere;
	white-space: pre-wrap;
}
.team-remark-empty {
	align-items: center;
	justify-content: center;
	color: var(--text-muted);
}
.team-action {
	position: absolute;
	top: 8px;
	right: 10px;
	z-index: 2;
	display: flex;
	align-items: flex-end;
	justify-content: flex-start;
	padding: 0;
}
.team-action-edit {
	top: 0;
	height: 100%;
	flex-direction: column;
	align-items: flex-end;
	justify-content: center;
	gap: 5px;
}
.star-toggle {
	box-sizing: border-box;
	width: auto;
	height: 28px;
	margin: 0;
	padding: 0 8px;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 4px;
	border: 1px solid transparent;
	border-radius: 6px;
	background: transparent;
	color: var(--text-secondary);
	font-size: 12px;
	line-height: 1;
	cursor: pointer;
	transition: color 0.18s ease, transform 0.18s ease, border-color 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease;
}
.star-toggle::after {
	border: 0;
}
.star-label {
	white-space: nowrap;
}
.star-toggle.star-pending {
	opacity: 0.55;
	cursor: wait;
}
.star-toggle:hover {
	transform: translateY(-1px);
	border-color: transparent;
	background: transparent;
	color: var(--text-primary);
}
.star-toggle.star-added {
	border-color: transparent;
	background: transparent;
	color: #f5ce65;
	box-shadow: none;
}
.link-nav {
	position: absolute;
	right: 10px;
	bottom: 8px;
	z-index: 3;
	display: flex;
	align-items: center;
	gap: 2px;
}
.link-nav-button {
	width: 22px;
	height: 22px;
	min-width: 22px;
	padding: 0;
	border: 1px solid var(--border-default);
	border-radius: 5px;
	background: var(--bg-panel-soft-alt);
	color: var(--text-secondary);
	font-size: 16px;
	line-height: 20px;
	text-align: center;
}
.link-nav-button::after {
	border: 0;
}
.link-nav-button[disabled] {
	border-color: var(--border-subtle);
	background: var(--bg-panel-soft);
	color: var(--text-faint);
}
.page-indicator {
	min-width: 20px;
	color: var(--text-muted);
	font-size: 9px;
	text-align: center;
	white-space: nowrap;
}
.team-edit-button,
.team-delete-button {
	box-sizing: border-box;
	min-width: 44px;
	height: 26px;
	padding: 0 7px;
	border: 1px solid rgba(66, 161, 255, 0.58);
	border-radius: 6px;
	background: var(--accent-soft);
	color: var(--accent-text);
	font-size: 11px;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	transition: background-color 0.18s ease, border-color 0.18s ease, color 0.18s ease;
}
.team-delete-button {
	border-color: rgba(220, 86, 100, 0.55);
	background: rgba(103, 31, 43, 0.38);
	color: var(--danger);
}
.team-edit-button:hover {
	border-color: #50adff;
	background: var(--accent-soft-strong);
	color: #fff;
}
.team-delete-button:hover {
	border-color: #ee6a78;
	background: rgba(176, 49, 65, 0.34);
	color: #fff;
}
.team-delete-button.pending {
	opacity: 0.58;
	cursor: wait;
}
@media screen and (max-width: 1360px) {
	.team-roles {
		gap: 3px;
	}
	.role-seat-empty {
		width: 43px;
		height: 43px;
		flex-basis: 43px;
	}
}
@media screen and (max-width: 1200px) {
	.team-boss {
		width: 19%;
	}
}
@media screen and (max-width: 1200px) {
	.team-damage {
		width: 11%;
	}
}
@media screen and (max-width: 1200px) {
	.team-mode {
		width: 11%;
	}
}
@media screen and (max-width: 1200px) {
	.team-roles {
		width: 26%;
		gap: 3px;
	}
	.role-seat-empty {
		width: 43px;
		height: 43px;
		flex-basis: 43px;
	}
}
@media screen and (orientation: portrait) and (min-width: 701px) {
	.team-mode {
		width: 9%;
	}
	.team-roles {
		width: 30%;
		gap: 2px;
		padding: 4px;
	}
	.mode-tag {
		padding: 8px;
	}
}
@media screen and (orientation: portrait) and (min-width: 701px) and (max-width: 780px) {
	.team-roles .role-avatar-wrap {
		width: 38px;
		height: 38px;
	}
	.role-seat-empty {
		width: 38px;
		height: 38px;
		flex-basis: 38px;
	}
}
@media screen and (max-width: 700px) {
	.team-card {
		flex-wrap: wrap;
		padding: 5px;
	}
}
@media screen and (max-width: 700px) {
	.team-summary {
		order: 0;
		width: 100%;
		flex: 0 0 100%;
		min-height: 34px;
		padding: 4px 38px 4px 6px;
		display: flex;
		align-items: center;
		flex-wrap: nowrap;
		gap: 6px;
		border: 1px solid var(--border-subtle);
		border-radius: 8px;
		background: var(--bg-panel-soft);
	}
	.team-summary .team-boss {
		order: 0;
		width: auto;
		min-height: 0;
		padding: 0;
		gap: 0;
		flex-shrink: 0;
	}
	.team-summary .boss-cover-wrap,
	.team-summary .boss-detail {
		display: none;
	}
	.team-summary .boss-code {
		display: flex;
	}
	.team-summary .team-damage {
		order: 2;
		width: auto;
		padding: 0;
		flex-shrink: 0;
		gap: 6px;
	}
	.team-summary .team-mode {
		order: 1;
		width: auto;
		padding: 0;
		flex-shrink: 0;
	}
}
@media screen and (max-width: 700px) {
	.team-boss {
		width: 40%;
		min-height: 56px;
		padding: 2px 3px;
		gap: 6px;
		border-right: none;
	}
	.boss-detail {
		gap: 3px;
	}
}
@media screen and (max-width: 700px) {
	.boss-cover-wrap {
		width: 52px;
		height: 52px;
		flex-shrink: 0;
		border: 1px solid #1677c5;
		border-radius: 8px;
		overflow: hidden;
	}
	.boss-cover {
		display: block;
	}
}
@media screen and (max-width: 700px) {
	.stage-tag {
		position: absolute;
		top: 2px;
		left: 2px;
		display: block;
		align-items: center;
		justify-content: center;
		padding: 2px 4px;
		font-size: 9px;
		white-space: nowrap;
	}
}
@media screen and (max-width: 700px) {
	.boss-number {
		font-size: 11px;
	}
}
@media screen and (max-width: 700px) {
	.boss-detail-name {
		font-size: 10px;
	}
}
@media screen and (max-width: 700px) {
	.team-damage {
		width: 45%;
		justify-content: flex-start;
		padding: 5px 6px 5px 4px;
		border-right: none;
		font-size: 12px;
	}
}
@media screen and (max-width: 700px) {
	.damage-icon {
		font-size: 18px;
	}
}
@media screen and (max-width: 700px) {
	.damage-number {
		font-size: 11px;
	}
}
@media screen and (max-width: 700px) {
	.team-mode {
		width: 15%;
		justify-content: flex-start;
		padding-left: 4px;
		border-right: none;
	}
}
@media screen and (max-width: 700px) {
	.mode-tag {
		padding: 6px;
		font-size: 10px;
		white-space: normal;
	}
}
@media screen and (max-width: 700px) {
	.team-roles {
		order: 4;
		width: 100%;
		min-height: 58px;
		gap: 3px;
		padding: 3px 6px;
		justify-content: center;
		border-right: none;
	}
	.role-seat-empty {
		width: 52px;
		height: 52px;
		flex-basis: 52px;
	}
}
@media screen and (max-width: 700px) {
	.team-links {
		position: static;
		order: 5;
		flex: 0 0 100%;
		width: 100%;
		padding: 4px 8px 32px;
		overflow: visible;
	}
	.team-links-has-remark {
		position: relative;
	}
	.team-links-no-pager {
		padding-bottom: 4px;
	}
	.links-grid {
		max-width: none;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 4px;
	}
	.team-remark {
		width: calc(100% - 62px);
	}
}
@media screen and (max-width: 700px) {
	.link-row {
		height: 30px;
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		align-items: center;
		gap: 4px;
		padding: 3px 5px;
		overflow: hidden;
		font-size: 9px;
		line-height: 1.2;
	}
	.link-author,
	.link-difficulty,
	.link-damage {
		width: auto;
		max-width: none;
		min-width: 0;
		overflow: hidden;
		text-align: left;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.link-author {
		flex: none;
	}
}
@media screen and (max-width: 700px) {
	.team-action {
		top: 9px;
		left: auto;
		right: 28px;
		bottom: auto;
		padding: 0;
	}
	.team-action .star-toggle {
		width: 27px;
		height: 27px;
		padding: 0;
	}
	.team-action .star-label {
		display: none;
	}
	.team-action-edit {
		top: 4px;
		left: auto;
		right: 8px;
		bottom: auto;
		height: 72px;
	}
}
@media screen and (max-width: 700px) {
	.star-toggle {
		height: 27px;
		padding: 0 7px;
		font-size: 11px;
	}
	.team-edit-button,
	.team-delete-button {
		height: 25px;
		font-size: 10px;
	}
	.link-nav {
		right: 8px;
		bottom: 4px;
	}
}
.team-boss::after,
.team-damage::after,
.team-mode::after,
.team-roles::after {
	position: absolute;
	top: 23%;
	right: 0;
	width: 1px;
	height: 54%;
	background: var(--bg-subtle);
	content: '';
}
@media screen and (max-width: 700px) {
	.team-boss::after,
	.team-damage::after,
	.team-mode::after,
	.team-roles::after {
		display: none;
	}
}
@media screen and (max-width: 350px) {
	.links-grid {
		gap: 3px;
	}
	.link-row {
		gap: 3px;
		padding: 2px 4px;
		font-size: 8px;
	}
}
</style>
