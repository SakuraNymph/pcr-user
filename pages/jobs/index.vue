<template>
	<MainLayout active-menu="jobs">

				<!-- 筛选面板 -->
				<view class="filter-panel">
					<!-- BOSS 选择 -->
					<view
						class="boss-section guide-target-boss"
						:class="{ 'guide-filter-focus': guideVisible && guideStep === 0 }"
					>
						<view class="boss-list">
							<view
								v-for="boss in bosses"
								:key="boss.sort"
								class="boss-item"
								:class="{ selected: selectedBoss === Number(boss.sort) }"
								@click="selectBoss(boss.sort)"
							>
								<image
									v-if="boss.file_path && !failedBossImages.includes(boss.sort)"
									class="boss-image"
									:src="boss.file_path"
									mode="aspectFill"
									@error="markBossImageFailed(boss.sort)"
								/>
								<view v-else class="boss-image boss-image-placeholder">BOSS {{ boss.sort }}</view>
								<view class="boss-name">BOSS {{ boss.sort }}</view>
							</view>
						</view>
					</view>

					<!-- 难度与攻击类型左右排列 -->
					<view class="filter-options">
						<view
							class="filter-group difficulty-group guide-target-difficulty"
							:class="{ 'guide-filter-focus': guideVisible && guideStep === 1 }"
						>
							<view class="section-title">难度</view>
							<view class="option-list">
								<view
									v-for="item in difficultyOptions"
									:key="item.value"
									class="filter-option"
									:class="{ chosen: selectedDifficulty === item.value }"
									@click="selectDifficulty(item.value)"
								>
									{{ item.label }}
								</view>
							</view>
						</view>

						<view
							class="filter-group attack-group guide-target-attack"
							:class="{ 'guide-filter-focus': guideVisible && guideStep === 2 }"
						>
							<view class="section-title">攻击类型</view>
							<view class="option-list">
								<view
									v-for="item in attackOptions"
									:key="item.value"
									class="filter-option"
									:class="{ chosen: selectedAttack === item.value }"
									@click="selectAttack(item.value)"
								>
									{{ item.label }}
								</view>
							</view>
						</view>
					</view>
				</view>

				<!-- 作业操作 -->
				<view class="jobs-actions">
					<button
						type="button"
						class="jobs-action-button jobs-action-add"
						@click="openAddJobList"
					>
						<svg
							class="jobs-action-icon"
							viewBox="0 0 24 24"
							fill="none"
							aria-hidden="true"
						>
							<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
						</svg>
						<text class="jobs-action-label">添加作业</text>
					</button>
					<button
						type="button"
						class="jobs-action-button jobs-action-split"
						@click="openOneClickSplit"
					>
						<svg
							class="jobs-action-icon"
							viewBox="0 0 24 24"
							fill="none"
							aria-hidden="true"
						>
							<path d="m12 3-9 4.5L12 12l9-4.5L12 3Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
							<path d="m3 12 9 4.5 9-4.5M3 16.5 12 21l9-4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
						</svg>
						<text class="jobs-action-label">一键分刀</text>
					</button>
				</view>

				<!-- 排序栏 -->
				<view class="list-header">
					<view class="header-boss">⚔　BOSS</view>
					<view class="header-mode">模式</view>
					<view class="header-damage sort-cell" @click="changeSort('damage')">
						伤害
						<text>{{ sortField === 'damage' ? (sortDesc ? '↓' : '↑') : '↕' }}</text>
					</view>
					<view class="header-team sort-cell" @click="changeSort('team')">
						角色阵容
						<text>{{ sortField === 'team' ? (sortDesc ? '↓' : '↑') : '↕' }}</text>
					</view>
					<view class="header-links">作业链接</view>
					<!-- 保留表头占位列，维持作业列表原有列宽。 -->
					<view class="header-action"></view>
				</view>

				<!-- 加载状态 -->
				<view v-if="loading" class="state-message">
					正在加载作业数据...
				</view>

				<!-- 请求失败 -->
				<view v-else-if="errorMessage" class="state-message error-message">
					<text>{{ errorMessage }}</text>
					<view class="retry-button" @click="loadData">重新加载</view>
				</view>

				<!-- 作业列表 -->
				<view v-else-if="filteredTeams.length" class="team-list">
					<TeamCard
						v-for="team in filteredTeams"
						:key="team.id"
						:team="team"
						:boss="getBoss(team.boss)"
						:disabled-role-key="roleDisabledByTeam[String(team.id)]"
						:roles-interactive="false"
						:show-remark="!isSystemTeam(team)"
						:added="isTeamAdded(team)"
						:show-action="isSystemTeam(team)"
						:show-edit="!isSystemTeam(team)"
						:show-delete="!isSystemTeam(team)"
						:delete-pending="customDeletePendingId !== null && String(customDeletePendingId) === String(team.id)"
						:pending="Boolean(favoritePendingByTeam[String(team.id)])"
						@open-link="openTeamLink"
						@toggle-add="toggleTeamAdd(team)"
						@edit="openEditJobList(team)"
						@delete="requestDeleteCustomTeam(team)"
					/>
				</view>
				<!-- 空数据 -->
				<view v-else class="state-message">
					<text>没有找到符合条件的作业</text>
					<text class="empty-hint">可以尝试更换 BOSS 或筛选条件</text>
				</view>


		<template #overlay>
		<HitSetPackageModal
			v-if="oneClickSplitVisible"
			kind="three"
			source="user"
			@close="closeOneClickSplit"
		/>

		<view v-if="customAddVisible" class="custom-team-overlay" @click.self="closeAddTeamModal">
			<view class="custom-team-modal" @click.stop>
				<view class="custom-team-modal-header">
					<view>
						<view class="custom-team-title">{{ customEditingTeamId === null ? '添加自定义作业' : '修改自定义作业' }}</view>
						<view v-if="customEditingTeamId !== null" class="custom-team-subtitle">修改作业信息和角色阵容</view>
					</view>
					<view class="custom-team-close" @click="closeAddTeamModal">×</view>
				</view>

				<view class="custom-team-body">
					<view class="custom-form-section">
						<view class="custom-form-label">BOSS <text class="required-mark">*</text></view>
						<view class="boss-list custom-boss-list">
							<view
								v-for="boss in bosses"
								:key="boss.sort"
								class="boss-item"
								:class="{ selected: String(customBossId) === String(boss.id) }"
								@click="customBossId = boss.id"
							>
								<image
									v-if="boss.file_path && !failedBossImages.includes(boss.sort)"
									class="boss-image"
									:src="boss.file_path"
									mode="aspectFill"
									@error="markBossImageFailed(boss.sort)"
								/>
								<view v-else class="boss-image boss-image-placeholder">
									BOSS {{ boss.sort }}
								</view>
								<view class="boss-name">BOSS {{ boss.sort }}</view>
							</view>
						</view>
					</view>

					<view class="custom-quick-row">
						<view class="custom-form-section custom-damage-section">
							<view class="custom-form-label">伤害 <text class="required-mark">*</text></view>
							<input
								v-model="customDamage"
								class="custom-input"
								type="number"
								maxlength="5"
								placeholder="1–99999"
							/>
						</view>

						<view class="custom-role-preview-compact">
							<view class="custom-role-preview-heading">阵容</view>
							<view class="custom-role-preview-list">
								<view
									v-for="(role, index) in previewSlots"
									:key="role ? role.id : `empty-${index}`"
									class="custom-role-preview-item"
								>
									<image v-if="role && role.image_url" class="custom-role-preview-image" :src="role.image_url" mode="aspectFill" />
									<view v-else-if="role" class="custom-role-preview-image role-image-placeholder">{{ role.name.slice(0, 1) }}</view>
									<view v-else class="custom-role-preview-image custom-role-preview-slot" />
									<text v-if="role && isCustomRoleMissing(role)" class="custom-preview-missing-badge">缺</text>
								</view>
							</view>
						</view>

						<view class="custom-form-section custom-mode-section">
							<view class="custom-form-label">操作方式 <text class="required-mark">*</text></view>
							<view class="custom-radio-options">
								<view
									class="custom-radio-option"
									:class="{ chosen: customMode === 1 }"
									@click="customMode = 1"
								>自动</view>
								<view
									class="custom-radio-option"
									:class="{ chosen: customMode === 2 }"
									@click="customMode = 2"
								>手动</view>
							</view>
						</view>
					</view>

					<view class="custom-form-section">
						<view class="custom-form-label">备注</view>
						<textarea
							v-model="customRemark"
							class="custom-textarea custom-textarea-compact"
							maxlength="255"
							placeholder="补充说明（选填，最多 255 字）"
						/>
					</view>

					<view class="custom-form-section custom-role-selection-section">
						<view class="custom-form-label">
							选择角色 <text class="required-mark">*</text>
						</view>
						<view class="custom-element-tabs">
							<view
								v-for="element in elementOptions"
								:key="element.value"
								class="custom-element-tab"
								:class="[{ active: selectedElement === element.value }, 'element-' + element.value]"
								@click="selectedElement = element.value"
							>{{ element.label }}</view>
						</view>

						<view v-if="roleLoading" class="custom-role-state">正在加载角色...</view>
						<view v-else-if="roleError" class="custom-role-state role-error">
							<text>{{ roleError }}</text>
							<view class="retry-button" @click="loadRoleOptions">重新加载</view>
						</view>
						<scroll-view v-else-if="activeRoleOptions.length" class="custom-role-list-scroll" scroll-y>
							<view class="custom-role-grid">
								<view
									v-for="role in activeRoleOptions"
									:key="role.id"
									class="custom-role-option"
									:title="role.name"
									:class="{
										selected: isCustomRoleSelected(role),
										'missing-role': isCustomRoleMissing(role),
									}"
									@click="toggleCustomRole(role)"
								>
									<image v-if="role.image_url" class="custom-role-image" :src="role.image_url" mode="aspectFill" />
									<view v-else class="custom-role-image role-image-placeholder">{{ role.name.slice(0, 1) }}</view>
									<text class="custom-role-name">{{ role.name }}</text>
									<text v-if="isCustomRoleMissing(role)" class="custom-missing-badge">缺</text>
								</view>
							</view>
						</scroll-view>
						<view v-else-if="!roleError" class="custom-role-state">该属性暂无可选角色</view>
						<view class="custom-role-hint">选满 5 人后，点击已选角色可标记“缺”；再次点击会移除该角色。</view>
					</view>
				</view>

				<view class="custom-team-modal-footer">
					<view class="custom-cancel-button" @click="closeAddTeamModal">取消</view>
					<view
						class="custom-submit-button"
						:class="{ disabled: customSubmitting }"
						@click="submitCustomTeam"
					>{{ customSubmitting ? '提交中...' : (customEditingTeamId === null ? '添加作业' : '保存修改') }}</view>
				</view>
			</view>
		</view>

		<!-- 新手引导：guideFinished 为 false 时自动开启 -->
		<view v-if="guideVisible" class="guide-overlay">
			<view class="guide-spotlight" :style="guideSpotlightStyle"></view>
			<view class="guide-card" :style="guideCardStyle">
				<view class="guide-progress">新手引导　{{ guideStep + 1 }} / {{ guideSteps.length }}</view>
				<view class="guide-title">{{ guideSteps[guideStep].title }}</view>
				<view class="guide-description">{{ guideSteps[guideStep].description }}</view>
				<view class="guide-actions">
					<view class="guide-skip" @click.stop="skipGuide">跳过</view>
					<view class="guide-next" @click.stop="nextGuideStep">
						{{ guideStep === guideSteps.length - 1 ? '完成' : '下一步' }}
					</view>
				</view>
			</view>
		</view>
		</template>
	</MainLayout>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { createFallbackBosses, getCurrentBosses } from '../../api/boss';
import { getGameRoles } from '../../api/gameRole';
import {
	createCustomTeam,
	deleteCustomTeam as deleteCustomTeamApi,
	getUserTeams,
	removeSystemTeamFavorite,
	updateCustomTeam,
} from '../../api/team';
import { getGuideConfig, saveGuideConfig } from '../../api/user';
import type {
	Boss,
	GameRoleGroup,
	GameRoleOption,
	Team,
	TeamLink,
	TeamRole,
} from '../../api/types';
import HitSetPackageModal from '../../components/HitSetPackageModal.vue';
import MainLayout from '../../layouts/MainLayout.vue';
import TeamCard from '../../components/TeamCard.vue';

interface GuideStep {
	target: string;
	parts?: string[];
	fallback?: string;
	title: string;
	description: string;
}

interface GuideRect {
	left: number;
	top: number;
	right: number;
	bottom: number;
	width: number;
	height: number;
}

function normalizeFavoriteFlag(value: Team['has_add']): boolean {
	return value === true || value === 1 || value === '1';
}

export default defineComponent({
	components: { HitSetPackageModal, MainLayout, TeamCard },
	data() {
		return {
			// BOSS 与作业数据
			bosses: createFallbackBosses() as Boss[],
			teams: [] as Team[],
			failedBossImages: [] as number[],

			// 页面状态
			loading: false,
			errorMessage: '',
			oneClickSplitVisible: false,

			// 筛选条件
			selectedBoss: 1,
			selectedDifficulty: 0,
			selectedAttack: 0,

			// 排序
			sortField: null as 'damage' | 'team' | null,
			sortDesc: true,

			// 后端返回的不可用角色状态，以及收藏请求状态
			roleDisabledByTeam: {} as Record<string, string>,
			favoritePendingByTeam: {} as Record<string, boolean>,

			// 自定义作业表单
			customAddVisible: false,
			customEditingTeamId: null as string | number | null,
			customEditingTeam: null as Team | null,
			customBossId: '' as string | number,
			customDamage: '',
			customRemark: '',
			customMode: 1 as 1 | 2,
			customRoles: [] as GameRoleOption[],
			customMissingRoleId: null as string | number | null,
			selectedElement: 1,
			roleGroups: [] as GameRoleGroup[],
			roleLoading: false,
			roleLoadPromise: null as Promise<void> | null,
			roleError: '',
			customSubmitting: false,
			customDeletePendingId: null as string | number | null,
			elementOptions: [
				{ label: '火', value: 1 },
				{ label: '水', value: 2 },
				{ label: '风', value: 3 },
				{ label: '光', value: 4 },
				{ label: '暗', value: 5 },
			],

			guideConfigEnabled: false,
			guideDataReady: false,
			guideStarted: false,
			guideFinished: false,
			guideVisible: false,
			guideStep: 0,
			guideSpotlightStyle: { left: '12px', top: '90px', width: 'calc(100vw - 24px)', height: '100px' },
			guideCardStyle: { left: '16px', top: '210px', width: 'calc(100vw - 32px)' },
			guideSteps: [
				{
					target: '.guide-target-boss',
					parts: ['.guide-target-boss .boss-list'],
					fallback: '.filter-panel',
					title: '选择 BOSS',
					description: '点击 BOSS 卡片，筛选对应 BOSS 的作业。',
				},
				{
					target: '.filter-group.difficulty-group.guide-target-difficulty',
					title: '难度筛选',
					description: '按作业链接的难度筛选，例如纯 AUTO、SET 或目押。',
				},
				{
					target: '.filter-group.attack-group.guide-target-attack',
					title: '攻击方式筛选',
					description: '选择物理或魔法，快速找到对应攻击类型的作业。',
				},
				{
					target: '.guide-target-role',
					fallback: '.team-list',
					title: '角色状态',
					description: '点击角色头像可以标记为不可用；同一作业最多标记一个角色，再点可恢复。',
				},
				{
					target: '.guide-target-link',
					fallback: '.guide-target-links',
					title: '打开作业链接',
					description: '点击链接卡片可在新的浏览器窗口打开作业详情。',
				},
				{
					target: '.guide-target-star',
					fallback: '.team-action',
					title: '收藏作业',
					description: '点击星芒收藏或取消收藏，收藏状态会同步到账号。',
				},
			] as GuideStep[],

			// 难度选项
			difficultyOptions: [
				{ label: '全部', value: 0 },
				{ label: '纯 AUTO', value: 1 },
				{ label: '简单 SET', value: 2 },
				{ label: '开关 SET', value: 3 },
				{ label: '简单目押', value: 4 },
				{ label: '目押', value: 5 },
			],

			// 攻击类型
			attackOptions: [
				{ label: '全部', value: 0 },
				{ label: '物理', value: 1 },
				{ label: '魔法', value: 2 },
			],
		};
	},

	computed: {
		activeRoleOptions(): GameRoleOption[] {
			return this.roleGroups.find((group) => Number(group.element) === this.selectedElement)?.roles || [];
		},

		previewRoles(): GameRoleOption[] {
			return this.customRoles.slice().sort((a, b) => {
				return Number(b.search_area_width || 0) - Number(a.search_area_width || 0);
			});
		},

		previewSlots(): Array<GameRoleOption | null> {
			return [...Array(Math.max(0, 5 - this.previewRoles.length)).fill(null), ...this.previewRoles];
		},

		filteredTeams(): Team[] {
			let list = this.teams.filter((team) => {
				// 默认仅显示 D 阶段
				if (Number(team.stage) !== 4) {
					return false;
				}

				// 当前月份
				if (!this.isCurrentMonth(team)) {
					return false;
				}

				// BOSS 筛选
				if (this.selectedBoss) {
					const teamBoss = this.getBoss(team.boss);
					if (Number(teamBoss?.sort ?? team.boss) !== this.selectedBoss) {
						return false;
					}
				}

				// 难度筛选：以该作业下的链接难度为准
				if (this.selectedDifficulty) {
					const links = this.getLinks(team);
					if (!links.some((link) => {
						return Number(link.difficulty) === this.selectedDifficulty;
					})) {
						return false;
					}
				}

				// 攻击类型筛选
				if (this.selectedAttack) {
					const atkValue = Number(team.atk_value || 0);

					// 约定：正数为物理，负数为魔法，0 为两种都支持
					if (this.selectedAttack === 1 && atkValue < 0) {
						return false;
					}

					if (this.selectedAttack === 2 && atkValue > 0) {
						return false;
					}
				}

				return true;
			});

			// 初始及用户未选择排序时，保留接口返回顺序；仅在点击表头后排序。
			if (this.sortField) {
				list = list.slice().sort((a, b) => {
					let result = 0;

					if (this.sortField === 'damage') {
						result = Number(a.damage || 0) - Number(b.damage || 0);
					} else {
						result = this.getRoleKey(a).localeCompare(this.getRoleKey(b));
					}

					return this.sortDesc ? -result : result;
				});
			}

			return list;
		},
	},

	onLoad() {
		this.loadData();
		this.loadGuideConfig();
	},

	methods: {
		/**
		 * 加载 BOSS 和作业列表
		 */
		loadData(): void {
			this.loading = true;
			this.errorMessage = '';

			Promise.all([getCurrentBosses(), getUserTeams()])
				.then(([bossResponse, teamResponse]) => {
					if (
						!bossResponse ||
						bossResponse.status !== 0 ||
						!Array.isArray(bossResponse.data)
					) {
						throw new Error('BOSS 接口返回的数据格式不正确');
					}

					if (
						!teamResponse ||
						teamResponse.status !== 0 ||
						!Array.isArray(teamResponse.data)
					) {
						throw new Error('作业列表接口返回的数据格式不正确');
					}

					this.bosses = bossResponse.data
						.slice()
						.sort((a, b) => Number(a.sort) - Number(b.sort));

					this.teams = teamResponse.data;
					this.roleDisabledByTeam = this.teams.reduce((result, team) => {
						const missingRole = team.team?.find((role) => Number(role.status) === 0);
						const missingRoleId = missingRole?.role_id ?? missingRole?.id ?? team.missing_role_id;
						if (missingRoleId !== undefined && missingRoleId !== null) {
							result[String(team.id)] = String(missingRoleId);
						}
						return result;
					}, {} as Record<string, string>);

					// 如果当前没有 BOSS 1，则选择第一个可用 BOSS
					if (
						this.bosses.length &&
						!this.bosses.some((boss) => Number(boss.sort) === this.selectedBoss)
					) {
						this.selectedBoss = Number(this.bosses[0].sort);
					}
					if (this.customAddVisible && !this.customBossId) {
						const formBoss = this.bosses.find(
							(boss) => Number(boss.sort) === this.selectedBoss,
						) ?? this.bosses[0];
						this.customBossId = formBoss?.id ?? '';
					}
				})
				.catch((error) => {
					console.error('加载作业数据失败：', error);
					this.errorMessage =
						error instanceof Error
							? error.message
							: '加载数据失败，请检查本地接口是否正常';
				})
				.finally(() => {
					this.loading = false;
					this.guideDataReady = true;
					this.maybeStartGuide();
				});
		},

		async loadGuideConfig(): Promise<void> {
			try {
				this.guideConfigEnabled = await getGuideConfig('list');
			} catch (error) {
				console.error('获取新手引导配置失败：', error);
			} finally {
				this.maybeStartGuide();
			}
		},

		maybeStartGuide(): void {
			if (
				!this.guideConfigEnabled ||
				!this.guideDataReady ||
				this.guideStarted ||
				this.guideFinished
			) {
				return;
			}

			this.guideStarted = true;
			this.$nextTick(() => this.startGuide());
		},

		/**
		 * 判断作业是否属于当前月份
		 */
		isCurrentMonth(team: Team): boolean {
			if (!team.created_at) {
				return false;
			}

			const date = new Date(team.created_at);
			if (Number.isNaN(date.getTime())) {
				return false;
			}

			const yearMonth =
				date.getFullYear().toString() +
				String(date.getMonth() + 1).padStart(2, '0');

			return this.bosses.some((boss) => boss.year_month === yearMonth);
		},

		/**
		 * 选择 BOSS
		 */
		selectBoss(sort: number) {
			this.selectedBoss = Number(sort);
		},

		markBossImageFailed(sort: number): void {
			const bossSort = Number(sort);
			if (!this.failedBossImages.includes(bossSort)) {
				this.failedBossImages = [...this.failedBossImages, bossSort];
			}
		},

		/**
		 * 选择难度
		 */
		selectDifficulty(value: number) {
			this.selectedDifficulty = Number(value);
		},

		/**
		 * 选择攻击类型
		 */
		selectAttack(value: number) {
			this.selectedAttack = Number(value);
		},

		/**
		 * 切换排序
		 */
		changeSort(field: 'damage' | 'team') {
			if (this.sortField === field) {
				this.sortDesc = !this.sortDesc;
			} else {
				this.sortField = field;
				this.sortDesc = true;
			}
		},

		/** 打开自定义作业表单，不修改当前筛选条件。 */
		openAddJobList(): void {
			this.customEditingTeamId = null;
			this.customEditingTeam = null;
			const selectedBoss = this.bosses.find(
				(boss) => Number(boss.sort) === this.selectedBoss,
			);
			this.customBossId = selectedBoss?.id ?? this.bosses[0]?.id ?? '';
			this.customDamage = '';
			this.customRemark = '';
			this.customMode = 1;
			this.customRoles = [];
			this.customMissingRoleId = null;
			this.selectedElement = 1;
			this.roleError = '';
			this.customAddVisible = true;
			if (!this.roleGroups.length) {
				void this.loadRoleOptions();
			}
		},

		/** 一键分刀入口，复用我的账号中的 D 面分刀弹窗。 */
		openOneClickSplit(): void {
			this.oneClickSplitVisible = true;
		},

		closeOneClickSplit(): void {
			this.oneClickSplitVisible = false;
		},

		/** 用作业列表字段预填表单；角色名称和头像从角色接口按 ID 补齐。 */
		async openEditJobList(team: Team): Promise<void> {
			this.customEditingTeamId = team.id;
			this.customEditingTeam = team;
			this.customBossId = team.boss;
			this.customDamage = String(team.damage);
			this.customRemark = team.remark || '';
			this.customMode = Number(team.mode) === 2 ? 2 : 1;
			this.customRoles = [];
			const missingRole = team.team?.find((role) => Number(role.status) === 0);
			this.customMissingRoleId = missingRole?.role_id ?? missingRole?.id ?? null;
			this.selectedElement = 1;
			this.roleError = '';
			this.customAddVisible = true;

			if (!this.roleGroups.length) {
				await this.loadRoleOptions();
			} else {
				this.restoreCustomRoleSelection(team);
			}
		},

		restoreCustomRoleSelection(team: Team): void {
			const rolesById = new Map(
				this.roleGroups.flatMap((group) => group.roles)
					.map((role) => [String(role.id), role] as const),
			);
			const savedRoleIds = (team.team || [])
				.map((role) => role.role_id ?? role.id)
				.filter((roleId): roleId is string | number => roleId !== undefined && roleId !== null);
			this.customRoles = savedRoleIds
				.map((roleId) => rolesById.get(String(roleId)))
				.filter((role): role is GameRoleOption => role !== undefined);
			if (
				this.customMissingRoleId !== null
				&& !this.customRoles.some((role) => String(role.id) === String(this.customMissingRoleId))
			) {
				this.customMissingRoleId = null;
			}
			this.selectedElement = Number(this.customRoles[0]?.element) || 1;
			if (this.customRoles.length !== 5) {
				uni.showToast({ title: '部分原角色信息未能加载，请检查后补全阵容', icon: 'none' });
			}
		},

		closeAddTeamModal(): void {
			if (!this.customSubmitting) {
				this.customAddVisible = false;
				this.customEditingTeamId = null;
				this.customEditingTeam = null;
			}
		},

		loadRoleOptions(): Promise<void> {
			if (this.roleLoadPromise) {
				return this.roleLoadPromise;
			}
			this.roleLoading = true;
			this.roleError = '';
			const loadPromise = (async (): Promise<void> => {
				try {
					const response = await getGameRoles();
					if (!response || response.status !== 0 || !Array.isArray(response.data)) {
						throw new Error('游戏角色接口返回的数据格式不正确');
					}
					this.roleGroups = response.data;
					if (this.customEditingTeam) {
						this.restoreCustomRoleSelection(this.customEditingTeam);
					}
				} catch (error) {
					console.error('加载游戏角色失败：', error);
					this.roleError = error instanceof Error ? error.message : '加载游戏角色失败';
				} finally {
					this.roleLoading = false;
					this.roleLoadPromise = null;
				}
			})();
			this.roleLoadPromise = loadPromise;
			return loadPromise;
		},

		isCustomRoleSelected(role: GameRoleOption): boolean {
			return this.customRoles.some((item) => String(item.id) === String(role.id));
		},

		isCustomRoleMissing(role: GameRoleOption): boolean {
			return this.customMissingRoleId !== null && String(this.customMissingRoleId) === String(role.id);
		},

		toggleCustomRole(role: GameRoleOption): void {
			const roleId = String(role.id);
			const selectedIndex = this.customRoles.findIndex((item) => String(item.id) === roleId);

			if (selectedIndex >= 0) {
				if (String(this.customMissingRoleId) === roleId) {
					this.customRoles = this.customRoles.filter((item) => String(item.id) !== roleId);
					this.customMissingRoleId = null;
				} else {
					// 对已选角色再次点击标记缺失；同一时间最多标记一名。
					this.customMissingRoleId = role.id;
				}
				return;
			}

			if (this.customRoles.length >= 5) {
				const removedRole = this.customRoles[0];
				if (removedRole && String(this.customMissingRoleId) === String(removedRole.id)) {
					this.customMissingRoleId = null;
				}
				this.customRoles = [...this.customRoles.slice(1), role];
				return;
			}

			this.customRoles = [...this.customRoles, role];
		},

		async submitCustomTeam(): Promise<void> {
			if (this.customSubmitting) {
				return;
			}

			const damage = Number(this.customDamage);
			if (!this.customBossId) {
				uni.showToast({ title: '请选择 BOSS', icon: 'none' });
				return;
			}
			if (!/^\d{1,5}$/.test(String(this.customDamage).trim()) || !Number.isInteger(damage) || damage < 1 || damage > 99999) {
				uni.showToast({ title: '伤害必须是 1–99999 的整数', icon: 'none' });
				return;
			}
			if (this.customRoles.length !== 5) {
				uni.showToast({ title: '请恰好选择 5 个角色', icon: 'none' });
				return;
			}

			const payload = {
				boss: this.customBossId,
				damage,
				mode: this.customMode,
				roles: this.customRoles.map((role) => role.id),
				...(this.customRemark.trim() ? { remark: this.customRemark.trim() } : {}),
				...(this.customMissingRoleId !== null
					? { missing_role_id: this.customMissingRoleId }
					: {}),
			};

			this.customSubmitting = true;
			try {
				const editingTeamId = this.customEditingTeamId;
				if (editingTeamId === null) {
					await createCustomTeam(payload);
				} else {
					await updateCustomTeam(editingTeamId, payload);
				}
				this.customAddVisible = false;
				this.customEditingTeamId = null;
				this.customEditingTeam = null;
				uni.showToast({
					title: editingTeamId === null ? '作业添加成功' : '作业修改成功',
					icon: 'success',
				});
				this.loadData();
			} catch (error) {
				console.error(this.customEditingTeamId === null ? '添加自定义作业失败：' : '修改自定义作业失败：', error);
				uni.showToast({
					title: error instanceof Error
						? error.message
						: (this.customEditingTeamId === null ? '添加作业失败' : '修改作业失败'),
					icon: 'none',
				});
			} finally {
				this.customSubmitting = false;
			}
		},

		/** 自定义作业只做软删除，确认后由后端将 status 改为 0。 */
		async requestDeleteCustomTeam(team: Team): Promise<void> {
			if (this.customDeletePendingId !== null) {
				return;
			}

			const confirmed = await new Promise<boolean>((resolve) => {
				uni.showModal({
					title: '删除自定义作业',
					content: '删除后该作业会从“我的作业”中隐藏，原始数据仍会保留。',
					confirmText: '删除',
					confirmColor: '#d95d6a',
					cancelText: '取消',
					success: (result) => resolve(Boolean(result.confirm)),
					fail: () => resolve(false),
				});
			});

			if (!confirmed) {
				return;
			}

			const teamKey = String(team.id);
			this.customDeletePendingId = team.id;

			try {
				await deleteCustomTeamApi(team.id);
				uni.showToast({ title: '作业已删除', icon: 'success' });
				await this.loadData();
			} catch (error) {
				console.error('删除自定义作业失败：', error);
				uni.showToast({
					title: error instanceof Error ? error.message : '删除作业失败',
					icon: 'none',
				});
			} finally {
				if (String(this.customDeletePendingId) === teamKey) {
					this.customDeletePendingId = null;
				}
			}
		},

		/**
		 * 根据 BOSS 序号获取 BOSS 数据
		 */
		getBoss(bossKey: string | number): Boss | undefined {
			return this.bosses.find((item) => String(item.id) === String(bossKey))
				?? this.bosses.find((item) => Number(item.sort) === Number(bossKey));
		},

		/**
		 * 获取作业链接
		 */
		getLinks(team: Team): TeamLink[] {
			return Array.isArray(team.link) ? team.link : [];
		},

		/**
		 * 按角色站位排序
		 */
		getSortedRoles(team: Team): TeamRole[] {
			if (!Array.isArray(team.team)) {
				return [];
			}

			return team.team.slice().sort((a, b) => {
				return (
					Number(b.search_area_width || 0) -
					Number(a.search_area_width || 0)
				);
			});
		},

		getRoleKey(team: Team): string {
			return this.getSortedRoles(team)
				.map((role) => String(role.role_id))
				.join(',');
		},

		/**
		 * 打开作业链接
		 */
		openTeamLink(link: TeamLink) {
			if (!link || !link.url) {
				uni.showToast({
					title: '该作业暂无链接',
					icon: 'none',
				});
				return;
			}

			// H5 环境打开外部链接
			// #ifdef H5
			window.open(link.url, '_blank', 'noopener,noreferrer');
			// #endif

			// 非 H5 环境暂时提示
			// #ifndef H5
			// #ifdef APP-PLUS
			plus.runtime.openURL(link.url);
			// #endif
			// #ifndef APP-PLUS
			uni.setClipboardData({
				data: link.url,
				success: () => {
					uni.showToast({
						title: '链接已复制',
						icon: 'success',
					});
				},
			});
			// #endif
			// #endif
		},

		startGuide() {
			if (!this.guideConfigEnabled || this.guideFinished || !this.guideSteps.length) {
				return;
			}

			this.guideStep = 0;
			this.guideVisible = true;
			this.$nextTick(() => this.positionGuideTarget());
		},

		positionGuideTarget(allowScroll: boolean = true) {
			if (!this.guideVisible) {
				return;
			}

			const step = this.guideSteps[this.guideStep];
			// H5 用原生视口坐标测量，确保 fixed 高亮框与 DOM 元素一一对齐
			// #ifdef H5
			const h5Targets = [step.target, ...(step.parts || [])]
				.map((selector) => document.querySelector(selector))
				.filter((element): element is Element => Boolean(element));
			const h5Fallback = step.fallback ? document.querySelector(step.fallback) : null;
			const h5Target = h5Targets[0] || h5Fallback;
			const h5Rects = h5Targets.length
				? h5Targets.map((element) => element.getBoundingClientRect())
				: (h5Fallback ? [h5Fallback.getBoundingClientRect()] : []);
			const h5Rect = this.combineGuideRects(h5Rects);
			if (h5Target && h5Rect) {
				this.applyGuidePosition(h5Rect, h5Target, allowScroll);
				return;
			}
			// #endif

			const partSelectors = step.parts || [];
			const selectors = [step.target, ...partSelectors, step.fallback]
				.filter((selector): selector is string => Boolean(selector));
			const query = uni.createSelectorQuery().in(this);
			selectors.forEach((selector) => query.select(selector).boundingClientRect());

			query.exec((rects) => {
				const primaryRects = (rects || []).slice(0, partSelectors.length + 1).filter(Boolean);
				const fallbackRect = step.fallback ? (rects || [])[partSelectors.length + 1] : null;
				const rect = this.combineGuideRects(primaryRects.length ? primaryRects : [fallbackRect]);
				const targetSelector = primaryRects.length ? step.target : step.fallback;

				if (!rect || !targetSelector) {
					return;
				}

				this.applyGuidePosition(rect, targetSelector, allowScroll);
			});
		},

		combineGuideRects(rects: Array<GuideRect | null | undefined>): GuideRect | null {
			const validRects = (rects || []).filter(Boolean);
			if (!validRects.length) {
				return null;
			}

			const left = Math.min(...validRects.map((rect) => rect.left));
			const top = Math.min(...validRects.map((rect) => rect.top));
			const right = Math.max(...validRects.map((rect) => rect.right));
			const bottom = Math.max(...validRects.map((rect) => rect.bottom));
			return { left, top, right, bottom, width: right - left, height: bottom - top };
		},

		applyGuidePosition(rect: GuideRect, target: Element | string, allowScroll: boolean = true) {
			const windowInfo = uni.getSystemInfoSync();
			const windowWidth = windowInfo.windowWidth || 375;
			const windowHeight = windowInfo.windowHeight || 700;
			if (allowScroll && (rect.bottom > windowHeight - 190 || rect.top < 40)) {
				// #ifdef H5
				if (typeof target !== 'string' && target.scrollIntoView) {
					target.scrollIntoView({ behavior: 'smooth', block: 'center' });
				}
				// #endif
				// #ifndef H5
				uni.pageScrollTo({
					selector: typeof target === 'string' ? target : '',
					offset: -100,
					duration: 250,
				});
				// #endif
				setTimeout(() => this.positionGuideTarget(false), 350);
				return;
			}

			// 高亮框直接使用目標元素的視口邊界，不額外擴大或偏移
			this.guideSpotlightStyle = {
				left: rect.left + 'px',
				top: rect.top + 'px',
				width: rect.width + 'px',
				height: rect.height + 'px',
			};

			const cardWidth = Math.min(320, windowWidth - 32);
			const cardLeft = Math.min(
				Math.max(16, rect.left + rect.width / 2 - cardWidth / 2),
				windowWidth - cardWidth - 16,
			);
			const cardTop = rect.bottom + 20 + 170 < windowHeight
				? rect.bottom + 20
				: Math.max(12, rect.top - 180);
			this.guideCardStyle = {
				left: cardLeft + 'px',
				top: cardTop + 'px',
				width: cardWidth + 'px',
			};
		},

		nextGuideStep() {
			if (this.guideStep >= this.guideSteps.length - 1) {
				this.finishGuide();
				return;
			}

			this.guideStep += 1;
			this.$nextTick(() => this.positionGuideTarget());
		},

		skipGuide() {
			this.finishGuide();
		},

		finishGuide() {
			this.guideFinished = true;
			this.guideVisible = false;
			if (this.guideConfigEnabled) {
				void this.persistGuideConfig();
			}
		},

		async persistGuideConfig(): Promise<void> {
			try {
				await saveGuideConfig('list');
			} catch (error) {
				console.error('保存新手引导状态失败：', error);
				uni.showToast({
					title: error instanceof Error ? error.message : '保存新手引导状态失败',
					icon: 'none',
				});
			}
		},

		isTeamAdded(team: Team): boolean {
			return this.isSystemTeam(team)
				|| normalizeFavoriteFlag(team.has_add);
		},

		isSystemTeam(team: Team): boolean {
			return team.source_team_id !== undefined
				&& team.source_team_id !== null
				&& Number(team.source_team_id) > 0;
		},

		isFavoritePending(team: Team): boolean {
			return Boolean(this.favoritePendingByTeam[String(team.id)]);
		},

		/** 通过服务端接口切换收藏状态 */
		async toggleTeamAdd(team: Team) {
			if (this.isFavoritePending(team) || !this.isSystemTeam(team)) {
				return;
			}

			const teamKey = String(team.id);
			const systemTeamId = team.source_team_id;
			this.favoritePendingByTeam = { ...this.favoritePendingByTeam, [teamKey]: true };

			try {
				await removeSystemTeamFavorite(systemTeamId);
				uni.showToast({ title: '已从作业管理中移除', icon: 'success' });
				this.loadData();
			} catch (error) {
				console.error('取消收藏失败：', error);
				uni.showToast({
					title: error instanceof Error ? error.message : '取消收藏失败',
					icon: 'none',
				});
			} finally {
				const nextPending = { ...this.favoritePendingByTeam };
				delete nextPending[teamKey];
				this.favoritePendingByTeam = nextPending;
			}
		},

	},
});
</script>

<style scoped>
.filter-panel,
.list-header,
.team-list,
.state-message {
	width: 100%;
	max-width: 1440px;
	margin-left: auto;
	margin-right: auto;
}
.jobs-actions {
	width: 100%;
	max-width: 1440px;
	margin: 12px auto 0;
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: 12px;
}
.jobs-action-button {
	box-sizing: border-box;
	width: 96px;
	height: 62px;
	margin: 0;
	padding: 7px 6px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 5px;
	border: 1px solid transparent;
	border-radius: 6px;
	color: #fff;
	line-height: 1;
	cursor: pointer;
	transition: filter 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
}
.jobs-action-button::after {
	border: 0;
}
.jobs-action-button:hover {
	filter: brightness(1.12);
	transform: translateY(-1px);
	box-shadow: 0 6px 16px rgba(0, 8, 20, 0.34);
}
.jobs-action-button:active {
	filter: brightness(0.94);
	transform: translateY(0);
}
.jobs-action-button:focus-visible {
	outline: 2px solid rgba(148, 218, 255, 0.9);
	outline-offset: 2px;
}
.jobs-action-add {
	border-color: rgba(76, 166, 255, 0.72);
	background: linear-gradient(145deg, #168dff, #075fce);
	box-shadow: 0 4px 12px rgba(0, 91, 203, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.2);
}
.jobs-action-split {
	border-color: rgba(71, 218, 207, 0.64);
	background: linear-gradient(145deg, #12aaa5, #076f81);
	box-shadow: 0 4px 12px rgba(0, 92, 102, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.18);
}
.jobs-action-icon {
	width: 20px;
	height: 20px;
	display: block;
	flex: 0 0 auto;
}
.jobs-action-label {
	color: #fff;
	font-size: 13px;
	font-weight: 700;
	line-height: 1;
	letter-spacing: 0.5px;
	white-space: nowrap;
}
.add-job-button {
	min-width: 88px;
	height: 29px;
	padding: 0 10px;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1px solid #087df5;
	border-radius: 6px;
	background: #087df5;
	color: #fff;
	font-size: 12px;
	font-weight: 700;
	cursor: pointer;
	white-space: nowrap;
}
.add-job-button:active {
	border-color: #066bd5;
	background: #066bd5;
}
.filter-panel {
	position: relative;
	display: flex;
	align-items: stretch;
	min-height: 0;
	padding: 6px 16px;
	border: 1px solid var(--border-subtle);
	border-radius: 10px;
	background: linear-gradient(105deg, var(--bg-panel), var(--bg-panel-alt) 70%, var(--bg-panel));
	box-shadow: 0 0 7px rgba(27, 151, 216, 0.045), inset 0 0 14px rgba(24, 119, 171, 0.025);
}
.boss-section {
	width: calc(36% - 5px);
	min-width: 350px;
	padding-right: 14px;
	border-right: 1px solid var(--border-default);
}
.section-title {
	margin-bottom: 7px;
	color: var(--text-primary);
	font-size: 15px;
	font-weight: bold;
}
.boss-list {
	display: flex;
	gap: 12px;
}
.custom-boss-list {
	max-width: 490px;
}
.custom-boss-list .boss-item {
	height: 64px;
}
.custom-boss-list .boss-image {
	height: 40px;
}
.custom-boss-list .boss-name {
	height: 22px;
}
.boss-item {
	width: 97px;
	height: 88px;
	flex: 1;
	min-width: 0;
	overflow: hidden;
	border: 1px solid var(--border-strong);
	border-radius: 9px;
	background: var(--bg-subtle);
	cursor: pointer;
	text-align: center;
}
.boss-item.selected {
	border: 2px solid #168cff;
	box-shadow: 0 0 13px rgba(0, 119, 255, 0.7);
}
.boss-image {
	display: block;
	width: 100%;
	height: 58px;
	filter: grayscale(1) brightness(0.62);
}
.boss-image-placeholder {
	display: flex;
	align-items: center;
	justify-content: center;
	color: rgba(219, 236, 255, 0.72);
	background:
		linear-gradient(135deg, rgba(20, 64, 106, 0.82), rgba(8, 31, 56, 0.96));
	font-size: 13px;
	font-weight: 700;
	letter-spacing: 0.02em;
	white-space: nowrap;
}
.boss-item.selected .boss-image {
	filter: none;
}
.boss-name {
	height: 28px;
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--text-secondary);
	font-size: 12px;
}
.boss-item.selected .boss-name {
	color: #fff;
	background: #087cf4;
}
.filter-options {
	flex: 1;
	min-width: 0;
	display: flex;
	align-items: stretch;
	gap: 16px;
	padding-left: 20px;
}
.filter-group {
	min-width: 0;
	display: flex;
	flex-direction: column;
	justify-content: center;
	text-align: left;
}
.filter-group .option-list {
	margin-top: 0;
	margin-bottom: 0;
}
.difficulty-group {
	flex: 2 1 0;
}
.attack-group {
	flex: 1 1 0;
	min-width: 0;
	padding-left: 16px;
	border-left: 1px solid var(--border-default);
}
.guide-filter-focus {
	position: relative;
	z-index: 1;
	border-radius: 8px;
	background-color: rgba(255, 204, 64, 0.045);
	box-shadow: 0 0 0 1px rgba(255, 211, 78, 0.82), 0 0 18px rgba(255, 196, 54, 0.38);
}
.option-list {
	display: grid;
	grid-template-columns: repeat(6, minmax(0, 1fr));
	min-width: 0;
	gap: 8px;
}
.filter-option {
	min-width: 0;
	height: 36px;
	padding: 0 8px;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1px solid #07549a;
	border-radius: 8px;
	background: var(--bg-subtle);
	color: var(--text-secondary);
	font-size: 12px;
	white-space: nowrap;
	cursor: pointer;
}
.difficulty-group .filter-option {
	width: 100%;
}
.attack-group .filter-option {
	width: 100%;
}
.attack-group .option-list {
	grid-template-columns: repeat(3, minmax(0, 1fr));
}
.filter-option.chosen {
	color: #fff;
	background: #087df5;
	border-color: #087df5;
	font-weight: bold;
	box-shadow: 0 0 10px rgba(0, 112, 255, 0.22);
}
.list-header {
	position: relative;
	height: 44px;
	margin-top: 12px;
	display: flex;
	align-items: center;
	border: 1px solid var(--border-subtle);
	border-radius: 8px 8px 0 0;
	background: linear-gradient(90deg, var(--bg-panel), var(--bg-panel-alt));
	box-shadow: 0 0 7px rgba(27, 151, 216, 0.04);
	color: var(--text-secondary);
	font-size: 13px;
}
.list-header > view {
	height: 25px;
	display: flex;
	align-items: center;
	padding: 0 12px;
	border-right: 1px solid var(--border-subtle);
}
.header-boss {
	width: 16%;
}
.header-damage {
	width: 10%;
	justify-content: center;
	text-align: center;
}
.header-mode {
	width: 10%;
	justify-content: center;
	text-align: center;
}
.header-team {
	width: 26%;
	justify-content: center;
	text-align: center;
}
.header-links {
	flex: 1;
}
.header-action {
	width: 108px;
	padding: 0 !important;
	border-right: none !important;
	justify-content: center;
}
.sort-cell {
	cursor: pointer;
	gap: 5px;
}
.sort-cell text {
	color: var(--accent-text);
	font-size: 16px;
}
.team-list {
	display: flex;
	flex-direction: column;
	gap: 4px;
}
.filter-panel::after,
.list-header::after {
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
.guide-overlay {
	position: fixed;
	inset: 0;
	z-index: 99999;
	pointer-events: none;
}
.guide-spotlight {
	position: fixed;
	box-sizing: border-box;
	border: 2px solid #ffd34e;
	border-radius: 10px;
	box-shadow: 0 0 0 9999px var(--mask), 0 0 22px rgba(255, 198, 48, 0.72);
	transition: left 0.22s ease, top 0.22s ease, width 0.22s ease, height 0.22s ease;
	pointer-events: none;
}
.guide-card {
	position: fixed;
	z-index: 2;
	padding: 16px;
	border: 1px solid rgba(255, 211, 78, 0.65);
	border-radius: 12px;
	background: linear-gradient(145deg, var(--bg-elevated), var(--bg-elevated));
	box-shadow: 0 10px 32px var(--shadow), 0 0 18px rgba(255, 194, 36, 0.12);
	color: var(--text-primary);
	pointer-events: auto;
}
.guide-progress {
	margin-bottom: 7px;
	color: #ffd34e;
	font-size: 11px;
}
.guide-title {
	margin-bottom: 7px;
	font-size: 16px;
	font-weight: bold;
}
.guide-description {
	min-height: 38px;
	color: var(--text-secondary);
	font-size: 13px;
	line-height: 1.6;
}
.guide-actions {
	margin-top: 13px;
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 10px;
}
.guide-skip,
.guide-next {
	min-width: 72px;
	height: 32px;
	padding: 0 12px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 7px;
	font-size: 12px;
	cursor: pointer;
}
.guide-skip {
	border: 1px solid var(--border-default);
	color: var(--text-secondary);
}
.guide-next {
	background: #087df5;
	color: #fff;
	font-weight: bold;
}
.state-message {
	flex: 1 1 0;
	min-height: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 12px;
	border: 1px solid #075b9e;
	border-radius: 8px;
	background: var(--bg-subtle);
	color: var(--text-secondary);
	font-size: 14px;
}
.error-message {
	color: var(--danger);
}
.custom-team-overlay {
	position: fixed;
	inset: 0;
	z-index: 100000;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 20px;
	background: var(--mask);
	backdrop-filter: blur(5px);
}
.custom-team-modal {
	box-sizing: border-box;
	width: min(840px, 100%);
	max-width: 100%;
	height: min(92vh, 900px);
	max-height: min(92vh, 900px);
	display: flex;
	flex-direction: column;
	border: 1px solid rgba(44, 151, 207, 0.5);
	border-radius: 14px;
	background: linear-gradient(145deg, var(--bg-panel), var(--bg-elevated) 62%, var(--bg-panel-alt));
	box-shadow: 0 24px 80px var(--shadow), 0 0 28px rgba(19, 133, 205, 0.14);
	color: var(--text-primary);
	overflow: hidden;
}
.custom-team-modal-header,
.custom-team-modal-footer {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 16px 20px;
	border-bottom: 1px solid var(--border-default);
}
.custom-team-title {
	font-size: 19px;
	font-weight: 700;
}
.custom-team-subtitle {
	margin-top: 4px;
	color: var(--text-muted);
	font-size: 12px;
}
.custom-team-close {
	width: 32px;
	height: 32px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 7px;
	color: var(--text-secondary);
	font-size: 25px;
	cursor: pointer;
}
.custom-team-close:hover,
.custom-cancel-button:hover {
	background: rgba(111, 163, 210, 0.12);
}
.custom-team-body {
	flex: 1;
	min-height: 0;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	box-sizing: border-box;
	padding: 4px 20px 16px;
}
.custom-team-body .custom-form-section {
	margin-top: 10px;
}
.custom-team-body .custom-quick-row {
	margin-top: 8px;
}
.custom-form-section {
	margin-top: 16px;
}
.custom-damage-section {
	grid-column: 1;
	width: auto;
	min-width: 0;
	margin-top: 0;
}
.custom-quick-row {
	margin-top: 12px;
	display: grid;
	grid-template-columns: repeat(5, minmax(0, 1fr));
	align-items: end;
	column-gap: 9px;
}
.custom-mode-section {
	grid-column: 5;
	width: 100%;
	margin-top: 0;
}
.custom-form-row {
	display: flex;
	gap: 16px;
}
.custom-form-half {
	flex: 1;
	min-width: 0;
}
.custom-form-label {
	margin-bottom: 9px;
	color: var(--text-secondary);
	font-size: 13px;
	font-weight: 700;
}
.required-mark {
	color: var(--danger);
}
.custom-boss-options {
	display: grid;
	grid-template-columns: repeat(5, minmax(0, 1fr));
	gap: 9px;
}
.custom-boss-option {
	min-width: 0;
	padding: 7px;
	display: flex;
	align-items: center;
	gap: 8px;
	border: 1px solid var(--border-default);
	border-radius: 8px;
	background: var(--bg-panel-soft);
	color: var(--text-secondary);
	font-size: 12px;
	cursor: pointer;
}
.custom-boss-option.chosen,
.custom-radio-option.chosen {
	border-color: #168cff;
	background: var(--accent-soft);
	color: var(--text-primary);
	box-shadow: inset 0 0 0 1px var(--accent-soft-strong);
}
.custom-boss-image {
	width: 39px;
	height: 39px;
	flex-shrink: 0;
	border-radius: 6px;
	background: var(--bg-subtle);
}
.custom-boss-image-placeholder {
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--text-secondary);
	font-size: 8px;
	font-weight: 700;
	letter-spacing: -0.02em;
	white-space: nowrap;
}
.custom-boss-image.boss-image-unselected {
	filter: grayscale(1);
	opacity: 0.58;
}
.custom-input,
.custom-textarea {
	box-sizing: border-box;
	width: 100%;
	border: 1px solid rgba(75, 132, 187, 0.42);
	border-radius: 8px;
	background: var(--bg-input);
	color: var(--text-primary);
	font-size: 14px;
}
.custom-input {
	height: 42px;
	padding: 0 12px;
}
.custom-textarea {
	min-height: 82px;
	padding: 10px 12px;
	line-height: 1.5;
}
.custom-textarea-compact {
	height: 48px;
	min-height: 48px;
	padding: 7px 10px;
}
.custom-input::placeholder,
.custom-textarea::placeholder {
	color: var(--text-faint);
}
.custom-radio-options {
	width: 100%;
	display: flex;
	gap: 8px;
}
.custom-radio-option {
	box-sizing: border-box;
	width: auto;
	min-width: 0;
	flex: 1 1 0;
	height: 42px;
	padding: 0 8px;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1px solid rgba(75, 132, 187, 0.42);
	border-radius: 8px;
	color: var(--text-muted);
	font-size: 13px;
	cursor: pointer;
}
.custom-role-preview-compact {
	grid-column: 2 / span 3;
	justify-self: center;
	flex: 0 1 auto;
	min-width: 0;
	margin-bottom: 0;
	padding: 0;
}
.custom-role-preview-heading {
	margin-bottom: 3px;
	color: var(--text-muted);
	font-size: 11px;
	text-align: center;
}
.custom-role-preview-list {
	display: flex;
	align-items: center;
	gap: 4px;
}
.custom-role-preview-item {
	position: relative;
	width: 58px;
	height: 58px;
	flex: 0 0 58px;
}
.custom-role-preview-image {
	display: block;
	box-sizing: border-box;
	width: 58px;
	height: 58px;
	border: 1px solid var(--border-strong);
	border-radius: 5px;
	background: var(--bg-subtle);
}
.custom-role-preview-slot {
	border-style: dashed;
	border-color: rgba(90, 153, 207, 0.38);
	background: var(--bg-panel-soft);
}
.custom-preview-missing-badge {
	position: absolute;
	right: -3px;
	bottom: -3px;
	padding: 0 3px;
	border-radius: 3px;
	background: var(--danger-strong);
	color: #fff;
	font-size: 9px;
	font-weight: 700;
}
.custom-element-tabs {
	width: 100%;
	margin-bottom: 12px;
	display: flex;
	justify-content: center;
	gap: 10px;
}
.custom-element-tab {
	box-sizing: border-box;
	min-width: 0;
	max-width: 120px;
	flex: 1 1 0;
	height: 32px;
	padding: 0 12px;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1px solid var(--border-default);
	border-radius: 7px;
	color: var(--text-muted);
	font-size: 12px;
	cursor: pointer;
}
.custom-element-tab.active {
	border-width: 2px;
	color: var(--text-primary);
	font-weight: 700;
	transform: translateY(-1px);
}
.custom-element-tab.element-1 {
	border-color: rgba(255, 91, 99, 0.52);
	background: rgba(255, 91, 99, 0.1);
}
.custom-element-tab.element-1.active {
	border-color: #ff5b63;
	background: rgba(255, 91, 99, 0.42);
	box-shadow: 0 0 12px rgba(255, 91, 99, 0.38), inset 0 0 0 1px rgba(255, 255, 255, 0.12);
}
.custom-element-tab.element-2 {
	border-color: rgba(75, 157, 255, 0.52);
	background: rgba(75, 157, 255, 0.1);
}
.custom-element-tab.element-2.active {
	border-color: #4b9dff;
	background: rgba(75, 157, 255, 0.42);
	box-shadow: 0 0 12px rgba(75, 157, 255, 0.38), inset 0 0 0 1px rgba(255, 255, 255, 0.12);
}
.custom-element-tab.element-3 {
	border-color: rgba(54, 201, 138, 0.52);
	background: rgba(54, 201, 138, 0.1);
}
.custom-element-tab.element-3.active {
	border-color: #36c98a;
	background: rgba(54, 201, 138, 0.42);
	box-shadow: 0 0 12px rgba(54, 201, 138, 0.38), inset 0 0 0 1px rgba(255, 255, 255, 0.12);
}
.custom-element-tab.element-4 {
	border-color: rgba(242, 201, 76, 0.55);
	background: rgba(242, 201, 76, 0.1);
}
.custom-element-tab.element-4.active {
	border-color: #f2c94c;
	background: rgba(242, 201, 76, 0.4);
	box-shadow: 0 0 12px rgba(242, 201, 76, 0.38), inset 0 0 0 1px rgba(255, 255, 255, 0.12);
}
.custom-element-tab.element-5 {
	border-color: rgba(181, 122, 255, 0.55);
	background: rgba(181, 122, 255, 0.1);
}
.custom-element-tab.element-5.active {
	border-color: #b57aff;
	background: rgba(181, 122, 255, 0.4);
	box-shadow: 0 0 12px rgba(181, 122, 255, 0.38), inset 0 0 0 1px rgba(255, 255, 255, 0.12);
}
.custom-role-list-scroll {
	box-sizing: border-box;
	flex: 1 1 auto;
	width: 100%;
	min-width: 0;
	height: 0;
	min-height: 0;
	overflow-x: hidden;
	overflow-y: auto;
}
.custom-role-selection-section {
	flex: 1 1 auto;
	display: flex;
	flex-direction: column;
	min-height: 0;
	margin-top: 12px;
}
.custom-role-selection-section > .custom-role-state {
	flex: 1 1 auto;
	min-height: 0;
}
.custom-role-grid {
	box-sizing: border-box;
	width: 100%;
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(76px, 1fr));
	gap: 9px;
}
.custom-role-option {
	position: relative;
	min-width: 0;
	padding: 7px 5px;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 5px;
	border: 1px solid transparent;
	border-radius: 8px;
	background: var(--bg-panel-soft);
	cursor: pointer;
}
.custom-role-option.selected {
	border-color: #1889ef;
	background: var(--accent-soft);
}
.custom-role-option.missing-role .custom-role-image {
	filter: grayscale(1) brightness(0.58);
}
.custom-role-image {
	width: 54px;
	height: 54px;
	border: 1px solid var(--border-strong);
	border-radius: 8px;
	background: var(--bg-subtle);
}
.role-image-placeholder {
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--text-secondary);
	font-size: 20px;
}
.custom-role-name {
	width: 100%;
	overflow: hidden;
	color: var(--text-secondary);
	font-size: 10px;
	text-align: center;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.custom-missing-badge {
	position: absolute;
	right: 3px;
	bottom: 23px;
	padding: 1px 4px;
	border-radius: 4px;
	background: var(--danger-strong);
	color: #fff;
	font-size: 10px;
	font-weight: 700;
}
.custom-role-state {
	min-height: 54px;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 10px;
	color: var(--text-muted);
	font-size: 12px;
}
.role-error {
	flex-direction: column;
	color: var(--danger);
}
.custom-role-hint {
	margin-top: 10px;
	color: var(--text-muted);
	font-size: 11px;
	line-height: 1.5;
}
.custom-team-modal-footer {
	flex-shrink: 0;
	justify-content: flex-end;
	gap: 10px;
	border-top: 1px solid var(--border-default);
	border-bottom: 0;
}
.custom-cancel-button,
.custom-submit-button {
	min-width: 94px;
	height: 36px;
	padding: 0 16px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 7px;
	font-size: 13px;
	cursor: pointer;
}
.custom-cancel-button {
	border: 1px solid rgba(111, 163, 210, 0.32);
	color: var(--text-secondary);
}
.custom-submit-button {
	background: #087df5;
	color: #fff;
	font-weight: 700;
}
.custom-submit-button.disabled {
	opacity: 0.65;
	cursor: wait;
}
.empty-hint {
	font-size: 12px;
	color: var(--text-muted);
}
.retry-button {
	padding: 8px 20px;
	border-radius: 6px;
	background: #087df5;
	color: #fff;
	cursor: pointer;
}
@media screen and (min-width: 1720px) {
	.jobs-actions {
		position: fixed;
		top: 50%;
		right: calc((100vw - 1440px) / 4 - 48px);
		z-index: 30;
		width: 96px;
		max-width: none;
		margin: 0;
		transform: translateY(-50%);
	}
}
@media screen and (max-width: 1200px) {
	.filter-panel {
		flex-wrap: wrap;
		gap: 15px;
	}
	.boss-section {
		width: 100%;
		min-width: 0;
		padding-right: 0;
		padding-bottom: 12px;
		border-right: none;
		border-bottom: 1px solid var(--border-default);
	}
	.filter-options {
		width: 100%;
		padding-left: 0;
	}
	.header-boss {
		width: 19%;
	}
	.header-damage {
		width: 11%;
	}
	.header-mode {
		width: 11%;
	}
	.header-team {
		width: 26%;
	}
}
@media screen and (max-width: 700px) {
	.custom-team-overlay {
		padding: 0;
	}
	.custom-team-modal {
		width: 100%;
		height: 100vh;
		height: 100dvh;
		max-height: 100vh;
		max-height: 100dvh;
		border: 0;
		border-radius: 0;
	}
	.custom-team-modal-header,
	.custom-team-modal-footer {
		padding: 13px 14px;
	}
	.custom-team-body {
		flex: 1 1 auto;
		min-height: 0;
		padding: 2px 14px 14px;
	}
	.custom-boss-options {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}
	.custom-boss-option {
		gap: 5px;
		padding: 5px;
		font-size: 10px;
	}
	.custom-boss-image {
		width: 31px;
		height: 31px;
	}
	.custom-damage-section {
		grid-column: 1;
	}
	.custom-quick-row {
		grid-template-columns: minmax(76px, 1fr) auto minmax(76px, 1fr);
		column-gap: 4px;
	}
	.custom-mode-section {
		grid-column: 3;
		width: 100%;
	}
	.custom-mode-section .custom-radio-options {
		gap: 4px;
	}
	.custom-quick-row .custom-form-label {
		font-size: 11px;
		margin-bottom: 6px;
	}
	.custom-role-preview-compact {
		grid-column: 2;
		justify-self: center;
		flex: 0 1 auto;
		min-width: 0;
	}
	.custom-role-preview-item {
		width: 30px;
		height: 42px;
		flex-basis: 30px;
	}
	.custom-role-preview-image {
		width: 30px;
		height: 42px;
	}
	.custom-role-preview-list {
		gap: 2px;
	}
	.custom-role-preview-heading {
		font-size: 10px;
	}
	.custom-mode-section .custom-radio-option {
		padding: 0 3px;
		font-size: 11px;
	}
	.custom-mode-section .custom-form-label {
		white-space: nowrap;
		text-align: right;
	}
	.custom-element-tab {
		max-width: none;
		padding: 0 4px;
	}
	.custom-role-grid {
		grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
		gap: 6px;
	}
	.custom-role-image {
		width: 48px;
		height: 48px;
	}
	.custom-missing-badge {
		bottom: 22px;
	}
	.jobs-actions {
		margin-top: 8px;
		flex-direction: row;
		align-items: center;
		justify-content: center;
		gap: 8px;
	}
	.jobs-action-button {
		width: auto;
		height: 32px;
		padding: 0 10px;
		flex-direction: row;
		gap: 4px;
	}
	.jobs-action-icon {
		width: 16px;
		height: 16px;
	}
	.jobs-action-label {
		font-size: 12px;
		letter-spacing: 0;
	}
	.filter-panel {
		padding: 10px;
	}
	.boss-list {
		gap: 5px;
	}
	.boss-item {
		height: 80px;
	}
	.boss-image {
		height: 52px;
	}
	.boss-name {
		height: 25px;
		font-size: 10px;
	}
	.filter-options {
		flex: 0 0 auto;
		flex-direction: column;
		gap: 8px;
		overflow: visible;
		padding-bottom: 0;
	}
	.difficulty-group {
		flex: 0 0 auto;
		width: 100%;
	}
	.attack-group {
		flex: 0 0 auto;
		width: 100%;
		padding-left: 0;
		border-left: 0;
	}
	.filter-option {
		min-width: 0;
		height: 31px;
		padding: 0 3px;
		font-size: 9px;
	}
	.difficulty-group .option-list {
		gap: 4px;
	}
	.attack-group .option-list {
		gap: 4px;
	}
	.list-header {
		display: none;
	}
	.team-list {
		margin-top: 10px;
		gap: 8px;
	}
}
@media screen and (max-width: 350px) {
	.custom-damage-section {
		width: 72px;
		flex-basis: 72px;
	}
	.custom-role-preview-item,
	.custom-role-preview-image {
		width: 24px;
		height: 32px;
	}
	.custom-role-preview-item {
		flex-basis: 24px;
	}
	.custom-mode-section .custom-radio-option {
		width: 34px;
		min-width: 34px;
		padding: 0 2px;
	}
	.custom-quick-row {
		grid-template-columns: minmax(72px, 1fr) auto minmax(72px, 1fr);
		column-gap: 3px;
	}
	.custom-mode-section {
		width: 100%;
	}
	.filter-option {
		padding: 0 2px;
		font-size: 8px;
	}
	.difficulty-group .option-list,
	.attack-group .option-list {
		gap: 3px;
	}
}
</style>
