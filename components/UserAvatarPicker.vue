<template>
	<view class="avatar-picker-mask" @click="handleMaskClick">
		<view
			class="avatar-picker"
			role="dialog"
			aria-modal="true"
			aria-label="更换头像"
			@click.stop
		>
			<view class="avatar-picker-header">
				<view>
					<view class="avatar-picker-title">更换头像</view>
					<view class="avatar-picker-subtitle">从游戏角色头像中选择</view>
				</view>
				<view class="avatar-picker-close" @click="close">×</view>
			</view>

			<view class="avatar-picker-controls">
				<input
					v-model="searchText"
					class="avatar-search"
					type="text"
					placeholder="搜索角色名称或昵称..."
					:disabled="submitting"
				/>

				<view class="tab-row star-tabs">
					<view
						v-for="star in starOptions"
						:key="star.value"
						class="tab-item star-tab"
						:class="{ active: selectedStar === star.value }"
						@click="selectStar(star.value)"
					>
						{{ star.label }}
					</view>
				</view>

				<view class="tab-row element-tabs">
					<view
						v-for="element in elementOptions"
						:key="element.value"
						class="tab-item element-tab"
						:class="[
							{ active: selectedElement === element.value },
							'element-' + element.value,
						]"
						@click="selectedElement = element.value"
					>
						{{ element.label }}
					</view>
				</view>
			</view>

			<scroll-view class="avatar-picker-body" scroll-y>
				<view v-if="loading" class="picker-state">
					<view class="picker-state-icon loading-icon">◌</view>
					<view class="picker-state-title">正在加载头像...</view>
				</view>

				<view v-else-if="loadError" class="picker-state">
					<view class="picker-state-icon error-icon">!</view>
					<view class="picker-state-title">{{ loadError }}</view>
					<view class="picker-retry" @click="loadOptions">重新加载</view>
				</view>

				<view v-else-if="!visibleRoles.length" class="picker-state">
					<view class="picker-state-icon">⌕</view>
					<view class="picker-state-title">没有找到匹配的角色头像</view>
					<view class="picker-state-description">请尝试其他星级、属性或搜索词</view>
				</view>

				<view v-else class="avatar-grid">
					<view
						v-for="role in visibleRoles"
						:key="role.id"
						class="avatar-card"
						:class="{
							selected: isSelected(role),
							current: isCurrent(role),
						}"
						@click="selectRole(role)"
					>
						<view class="avatar-frame">
							<image
								v-if="hasAvatar(role) && !imageFailed(role)"
								class="avatar-image"
								:src="avatarUrlFor(role)"
								mode="aspectFill"
								@error="markImageFailed(avatarIdFor(role))"
							/>
							<view v-else class="avatar-image avatar-placeholder">
								{{ role.name.slice(0, 1) }}
							</view>
							<view v-if="isCurrent(role)" class="avatar-current-badge">当前</view>
							<view v-if="isSelected(role)" class="avatar-selected-badge">✓</view>
						</view>
						<view class="avatar-name">{{ role.name }}</view>
						<view v-if="role.nickname" class="avatar-nickname">{{ role.nickname }}</view>
					</view>
				</view>
			</scroll-view>

			<view class="avatar-picker-footer">
				<view v-if="saveError" class="avatar-save-error">{{ saveError }}</view>
				<view class="avatar-footer-actions">
					<view class="picker-button" @click="close">取消</view>
					<view
						class="picker-button primary"
						:class="{ disabled: selectedAvatarId === null }"
						@click="confirmSelection"
					>
						{{ submitting ? '保存中...' : '确认选择' }}
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { errorMessage } from '../api/errors';
import { getAvatarOptions, updateUserProfile } from '../api/user';
import type {
	AvatarVariant,
	UserAvatarOption,
	UserProfile,
} from '../api/types';

type StarLevel = 1 | 3 | 6;

const props = defineProps<{
	currentAvatarId: number | null;
}>();

const emit = defineEmits<{
	(event: 'close'): void;
	(event: 'saved', user: UserProfile): void;
}>();

const starOptions: Array<{ value: StarLevel; label: string }> = [
	{ value: 1, label: '1 星' },
	{ value: 3, label: '3 星' },
	{ value: 6, label: '6 星' },
];

const elementOptions = [
	{ label: '全部', value: 0 },
	{ label: '🔥 火', value: 1 },
	{ label: '💧 水', value: 2 },
	{ label: '🍃 风', value: 3 },
	{ label: '☀️ 光', value: 4 },
	{ label: '🌑 暗', value: 5 },
];

const options = ref<UserAvatarOption[]>([]);
const loading = ref(true);
const loadError = ref('');
const searchText = ref('');
const selectedStar = ref<StarLevel>(3);
const selectedElement = ref(0);
const selectedAvatarId = ref<number | null>(null);
const failedAvatarIds = ref<number[]>([]);
const submitting = ref(false);
const saveError = ref('');

const visibleRoles = computed(() => {
	const keyword = searchText.value.trim().toLocaleLowerCase();

	return options.value.filter((role) => {
		const variant = avatarFor(role);

		if (!variant) {
			return false;
		}
		if (selectedElement.value !== 0 && role.element !== selectedElement.value) {
			return false;
		}
		if (!keyword) {
			return true;
		}

		return (
			role.name.toLocaleLowerCase().includes(keyword)
			|| role.nickname.toLocaleLowerCase().includes(keyword)
		);
	});
});

onMounted(() => {
	void loadOptions();
});

async function loadOptions(): Promise<void> {
	loading.value = true;
	loadError.value = '';

	try {
		options.value = await getAvatarOptions();
		const matchedStar = findStarForAvatar(props.currentAvatarId);
		selectedStar.value = matchedStar ?? 3;
		selectedAvatarId.value = matchedStar === null
			? null
			: props.currentAvatarId;
	} catch (error) {
		loadError.value = errorMessage(error, '获取头像选项失败，请稍后重试');
	} finally {
		loading.value = false;
	}
}

function avatarFor(role: UserAvatarOption): AvatarVariant | null {
	if (selectedStar.value === 1) {
		return role.avatar_1;
	}
	if (selectedStar.value === 3) {
		return role.avatar_3;
	}
	return role.avatar_6;
}

function findStarForAvatar(avatarId: number | null): StarLevel | null {
	if (avatarId === null) {
		return null;
	}

	for (const role of options.value) {
		if (role.avatar_1?.id === avatarId) return 1;
		if (role.avatar_3?.id === avatarId) return 3;
		if (role.avatar_6?.id === avatarId) return 6;
	}

	return null;
}

function selectStar(star: StarLevel): void {
	if (selectedStar.value === star) return;

	selectedStar.value = star;

	if (
		selectedAvatarId.value !== null
		&& !options.value.some(
			(role) => avatarFor(role)?.id === selectedAvatarId.value,
		)
	) {
		selectedAvatarId.value = null;
	}
}

function selectRole(role: UserAvatarOption): void {
	const variant = avatarFor(role);

	if (variant) {
		selectedAvatarId.value = variant.id;
		saveError.value = '';
	}
}

function hasAvatar(role: UserAvatarOption): boolean {
	return avatarFor(role) !== null;
}

function avatarUrlFor(role: UserAvatarOption): string {
	return avatarFor(role)?.url || '';
}

function avatarIdFor(role: UserAvatarOption): number {
	return avatarFor(role)?.id || 0;
}

function imageFailed(role: UserAvatarOption): boolean {
	const avatarId = avatarFor(role)?.id;
	return avatarId !== undefined && failedAvatarIds.value.includes(avatarId);
}

function isSelected(role: UserAvatarOption): boolean {
	return avatarFor(role)?.id === selectedAvatarId.value;
}

function isCurrent(role: UserAvatarOption): boolean {
	return avatarFor(role)?.id === props.currentAvatarId;
}

function markImageFailed(avatarId: number): void {
	if (!failedAvatarIds.value.includes(avatarId)) {
		failedAvatarIds.value = [...failedAvatarIds.value, avatarId];
	}
}

function close(): void {
	if (submitting.value) return;
	emit('close');
}

function handleMaskClick(): void {
	close();
}

async function confirmSelection(): Promise<void> {
	if (selectedAvatarId.value === null || submitting.value) {
		return;
	}

	submitting.value = true;
	saveError.value = '';

	try {
		const user = await updateUserProfile({
			avatar: selectedAvatarId.value,
		});
		emit('saved', user);
	} catch (error) {
		saveError.value = errorMessage(error, '头像保存失败，请稍后重试');
	} finally {
		submitting.value = false;
	}
}
</script>

<style scoped>
.avatar-picker-mask {
	position: fixed;
	z-index: 1300;
	inset: 0;
	padding: 18px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--mask);
	backdrop-filter: blur(3px);
}

.avatar-picker {
	width: min(1120px, calc(100vw - 36px));
	height: min(88vh, 900px);
	display: flex;
	flex-direction: column;
	overflow: hidden;
	border: 1px solid var(--border-strong);
	border-radius: 12px;
	background:
		radial-gradient(ellipse at 72% 0%, rgba(0, 95, 190, 0.2), transparent 46%),
		var(--bg-page);
	box-shadow: 0 24px 80px rgba(0, 0, 0, 0.66), 0 0 28px rgba(0, 105, 190, 0.2);
}

.avatar-picker-header {
	min-height: 64px;
	padding: 0 18px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 18px;
	border-bottom: 1px solid var(--border-subtle);
	background: linear-gradient(90deg, var(--bg-panel), var(--bg-panel-alt));
}

.avatar-picker-title {
	color: var(--text-primary);
	font-size: 18px;
	font-weight: 700;
}

.avatar-picker-subtitle {
	margin-top: 5px;
	color: var(--text-muted);
	font-size: 12px;
}

.avatar-picker-close {
	width: 34px;
	height: 34px;
	flex: 0 0 34px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 7px;
	background: var(--danger-strong);
	color: #fff;
	font-size: 24px;
	line-height: 1;
	cursor: pointer;
}

.avatar-picker-controls {
	padding: 14px 18px;
	display: flex;
	flex-direction: column;
	gap: 10px;
	border-bottom: 1px solid var(--border-subtle);
	background: var(--bg-panel);
}

.avatar-search {
	width: 100%;
	height: 40px;
	padding: 0 12px;
	box-sizing: border-box;
	border: 1px solid var(--border-default);
	border-radius: 7px;
	outline: none;
	background: var(--bg-panel-soft);
	color: var(--text-primary);
	font-size: 13px;
}

.avatar-search:focus {
	border-color: var(--accent);
	box-shadow: 0 0 0 2px var(--accent-soft);
}

.avatar-search::placeholder {
	color: var(--text-placeholder);
}

.tab-row {
	display: flex;
	align-items: center;
	gap: 7px;
	overflow-x: auto;
}

.tab-item {
	flex: 0 0 auto;
	min-height: 30px;
	padding: 0 12px;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1px solid var(--border-subtle);
	border-radius: 6px;
	background: var(--bg-panel-soft);
	color: var(--text-muted);
	font-size: 12px;
	cursor: pointer;
	white-space: nowrap;
}

.tab-item.active {
	border-color: var(--border-strong);
	background: var(--accent-soft);
	color: var(--accent-text);
	font-weight: 700;
}

.element-tab.element-1.active { box-shadow: inset 0 -2px #ff626c; color: #ff9ca2; }
.element-tab.element-2.active { box-shadow: inset 0 -2px #48a8ff; color: #88caff; }
.element-tab.element-3.active { box-shadow: inset 0 -2px #40cd94; color: var(--success); }
.element-tab.element-4.active { box-shadow: inset 0 -2px #e9c34b; color: #f3dc86; }
.element-tab.element-5.active { box-shadow: inset 0 -2px #b279ff; color: #d0aaff; }

.avatar-picker-body {
	min-height: 0;
	flex: 1;
	padding: 16px 18px;
	box-sizing: border-box;
	background: linear-gradient(145deg, var(--bg-content-start) 0%, var(--bg-content-end) 100%);
}

.avatar-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
	gap: 12px;
}

.avatar-card {
	min-width: 0;
	padding: 7px;
	box-sizing: border-box;
	border: 1px solid var(--border-subtle);
	border-radius: 8px;
	background: var(--bg-panel-soft);
	cursor: pointer;
	transition: border-color 0.16s ease, background 0.16s ease, transform 0.16s ease;
}

.avatar-card:hover {
	border-color: var(--border-strong);
	transform: translateY(-1px);
}

.avatar-card.current {
	border-color: rgba(76, 198, 255, 0.75);
}

.avatar-card.selected {
	border-color: var(--accent);
	background: var(--accent-soft);
	box-shadow: 0 0 0 2px var(--accent-soft-strong);
}

.avatar-frame {
	position: relative;
	width: 100%;
	padding-top: 100%;
	overflow: hidden;
	border: 1px solid rgba(104, 157, 203, 0.42);
	border-radius: 5px;
	background: var(--bg-subtle);
}

.avatar-image {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	display: block;
}

.avatar-placeholder {
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--text-secondary);
	font-size: 25px;
	font-weight: 700;
}

.avatar-current-badge,
.avatar-selected-badge {
	position: absolute;
	z-index: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 999px;
	font-size: 10px;
	font-weight: 700;
}

.avatar-current-badge {
	top: 5px;
	left: 5px;
	min-height: 19px;
	padding: 0 7px;
	background: rgba(5, 25, 48, 0.86);
	color: #9edcff;
}

.avatar-selected-badge {
	top: 5px;
	right: 5px;
	width: 21px;
	height: 21px;
	background: var(--accent);
	color: #fff;
	font-size: 13px;
}

.avatar-name {
	margin-top: 7px;
	overflow: hidden;
	color: var(--text-secondary);
	font-size: 12px;
	font-weight: 700;
	text-align: center;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.avatar-nickname {
	margin-top: 3px;
	overflow: hidden;
	color: var(--text-faint);
	font-size: 10px;
	text-align: center;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.picker-state {
	min-height: 280px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 10px;
	color: var(--text-muted);
	text-align: center;
}

.picker-state-icon {
	width: 46px;
	height: 46px;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1px solid var(--border-strong);
	border-radius: 50%;
	background: var(--accent-soft);
	color: var(--accent-text);
	font-size: 22px;
	font-weight: 700;
}

.loading-icon {
	animation: avatar-picker-spin 0.9s linear infinite;
}

.error-icon {
	border-color: var(--danger);
	background: var(--danger-soft);
	color: var(--danger);
}

.picker-state-title {
	color: var(--text-primary);
	font-size: 15px;
	font-weight: 700;
}

.picker-state-description {
	color: var(--text-muted);
	font-size: 12px;
}

.picker-retry {
	min-height: 34px;
	padding: 0 14px;
	display: flex;
	align-items: center;
	border: 1px solid var(--border-default);
	border-radius: 7px;
	background: var(--bg-panel-soft);
	color: var(--text-secondary);
	font-size: 12px;
	cursor: pointer;
}

.avatar-picker-footer {
	padding: 12px 18px;
	border-top: 1px solid var(--border-subtle);
	background: var(--bg-panel-alt);
}

.avatar-save-error {
	margin-bottom: 9px;
	padding: 8px 10px;
	border: 1px solid rgba(255, 92, 108, 0.45);
	border-radius: 6px;
	background: var(--danger-soft);
	color: var(--danger);
	font-size: 12px;
}

.avatar-footer-actions {
	display: flex;
	justify-content: flex-end;
	gap: 10px;
}

.picker-button {
	min-width: 100px;
	min-height: 38px;
	padding: 0 16px;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1px solid var(--border-default);
	border-radius: 7px;
	background: var(--bg-panel-soft);
	color: var(--text-secondary);
	font-size: 13px;
	cursor: pointer;
}

.picker-button.primary {
	border-color: var(--accent);
	background: linear-gradient(180deg, var(--accent-strong), var(--accent));
	color: #fff;
	font-weight: 700;
}

.picker-button.disabled {
	cursor: not-allowed;
	filter: grayscale(0.4);
	opacity: 0.58;
}

@keyframes avatar-picker-spin {
	to {
		transform: rotate(360deg);
	}
}

@media screen and (max-width: 700px) {
	.avatar-picker-mask {
		padding: 0;
	}

	.avatar-picker {
		width: 100%;
		height: 100vh;
		border: 0;
		border-radius: 0;
	}

	.avatar-picker-header {
		min-height: 58px;
		padding: 0 12px;
	}

	.avatar-picker-title {
		font-size: 16px;
	}

	.avatar-picker-controls {
		padding: 10px 12px;
		gap: 8px;
	}

	.avatar-picker-body {
		padding: 10px 12px;
	}

	.avatar-grid {
		grid-template-columns: repeat(auto-fill, minmax(82px, 1fr));
		gap: 8px;
	}

	.avatar-card {
		padding: 5px;
	}

	.avatar-name {
		font-size: 11px;
	}

	.avatar-picker-footer {
		padding: 10px 12px;
	}
}

@media (prefers-reduced-motion: reduce) {
	.loading-icon {
		animation-duration: 0.01ms;
	}
}
</style>
