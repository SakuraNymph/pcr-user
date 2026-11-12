<template>
	<MainLayout active-menu="home">

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
								:class="{ selected: selectedBoss === boss.sort }"
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
						:added="isTeamAdded(team)"
						:pending="Boolean(favoritePendingByTeam[String(team.id)])"
						@toggle-role="toggleRoleDisabled(team, $event.role, $event.index)"
						@open-link="openTeamLink"
						@toggle-add="toggleTeamAdd(team)"
					/>
				</view>
				<!-- 空数据 -->
				<view v-else class="state-message">
					<text>没有找到符合条件的作业</text>
					<text class="empty-hint">可以尝试更换 BOSS 或筛选条件</text>
				</view>


		<template #overlay>

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
import { addSystemTeamFavorite, getTeams, removeSystemTeamFavorite } from '../../api/team';
import { getGuideConfig, saveGuideConfig } from '../../api/user';
import type { Boss, Team, TeamLink, TeamRole } from '../../api/types';
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
	components: { MainLayout, TeamCard },
	data() {
		return {
			// BOSS 与作业数据
			bosses: createFallbackBosses() as Boss[],
			teams: [] as Team[],
			failedBossImages: [] as number[],

			// 页面状态
			loading: false,
			errorMessage: '',

			// 筛选条件
			selectedBoss: 1,
			selectedDifficulty: 0,
			selectedAttack: 0,

			// 排序
			sortField: null as 'damage' | 'team' | null,
			sortDesc: true,

			// 当前页面中每个作业所选的不可用角色，以及收藏请求状态
			roleDisabledByTeam: {} as Record<string, string>,
			favoritePendingByTeam: {} as Record<string, boolean>,

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
					description: '按作业链接的难度筛选，例如 AUTO、SET 或目押。',
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
				{ label: 'AUTO', value: 1 },
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
				if (this.selectedBoss && Number(team.boss) !== this.selectedBoss) {
					return false;
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

			Promise.all([getCurrentBosses(), getTeams()])
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
						if (
							normalizeFavoriteFlag(team.has_add) &&
							team.missing_role_id !== undefined &&
							team.missing_role_id !== null
						) {
							result[String(team.id)] = String(team.missing_role_id);
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

		/**
		 * 根据 BOSS 序号获取 BOSS 数据
		 */
		getBoss(bossNumber: number): Boss | undefined {
			return this.bosses.find(
				(item) => Number(item.sort) === Number(bossNumber),
			);
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

		/** 获取角色在当前作业中的状态键 */
		getRoleStateKey(role: TeamRole, index: number): string {
			if (role.role_id !== undefined && role.role_id !== null) {
				return String(role.role_id);
			}

			if (role.id !== undefined && role.id !== null) {
				return String(role.id);
			}

			return String(index);
		},

		/** 判断角色是否为灰色状态 */
		isRoleDisabled(team: Team, role: TeamRole, index: number): boolean {
			const selectedRoleKey = this.roleDisabledByTeam[String(team.id)];
			return selectedRoleKey === this.getRoleStateKey(role, index);
		},

		/** 每个作业最多标记一个灰色角色，再次点击可取消 */
		toggleRoleDisabled(team: Team, role: TeamRole, index: number) {
			const teamKey = String(team.id);
			const roleKey = this.getRoleStateKey(role, index);
			const nextRoleDisabledByTeam = { ...this.roleDisabledByTeam };

			if (nextRoleDisabledByTeam[teamKey] === roleKey) {
				delete nextRoleDisabledByTeam[teamKey];
			} else {
				nextRoleDisabledByTeam[teamKey] = roleKey;
			}

			this.roleDisabledByTeam = nextRoleDisabledByTeam;
		},

		isTeamAdded(team: Team): boolean {
			return normalizeFavoriteFlag(team.has_add);
		},

		isFavoritePending(team: Team): boolean {
			return Boolean(this.favoritePendingByTeam[String(team.id)]);
		},

		getMissingRoleId(team: Team): string | number | undefined {
			const selectedRoleKey = this.roleDisabledByTeam[String(team.id)];
			if (selectedRoleKey === undefined) {
				return undefined;
			}

			const selectedRole = this.getSortedRoles(team).find((role, index) => {
				return this.getRoleStateKey(role, index) === selectedRoleKey;
			});
			return selectedRole?.role_id ?? selectedRole?.id;
		},

		/** 通过服务端接口切换收藏状态 */
		async toggleTeamAdd(team: Team) {
			if (this.isFavoritePending(team)) {
				return;
			}

			const teamKey = String(team.id);
			const systemTeamId = team.system_team_id ?? team.id;
			const wasAdded = this.isTeamAdded(team);
			this.favoritePendingByTeam = { ...this.favoritePendingByTeam, [teamKey]: true };

			try {
				if (wasAdded) {
					await removeSystemTeamFavorite(systemTeamId);
					team.has_add = false;
					team.missing_role_id = null;
					const nextRoleDisabledByTeam = { ...this.roleDisabledByTeam };
					delete nextRoleDisabledByTeam[teamKey];
					this.roleDisabledByTeam = nextRoleDisabledByTeam;
					uni.showToast({ title: '取消收藏', icon: 'success' });
				} else {
					const missingRoleId = this.getMissingRoleId(team);
					await addSystemTeamFavorite(systemTeamId, missingRoleId);
					team.has_add = true;
					team.missing_role_id = missingRoleId ?? null;
					uni.showToast({ title: '收藏成功', icon: 'success' });
				}
			} catch (error) {
				console.error(wasAdded ? '取消收藏失败：' : '收藏失败：', error);
				uni.showToast({
					title: error instanceof Error ? error.message : (wasAdded ? '取消收藏失败' : '收藏失败'),
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
	width: 0;
	padding: 0 !important;
	border-right: none !important;
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
		margin-top: 18px;
		gap: 8px;
	}
}
@media screen and (max-width: 350px) {
	.filter-option {
		padding: 0 2px;
		font-size: 8px;
	}
	.difficulty-group .option-list,
	.attack-group .option-list {
		gap: 3px;
	}
}
@media screen and (orientation: portrait) and (min-width: 701px) and (max-width: 1719px) {
	.header-boss {
		width: 13%;
		padding: 0 8px;
	}
	.header-team {
		width: 31%;
	}
	:deep(.team-boss) {
		width: 13%;
		gap: 7px;
		padding: 5px 7px;
	}
	:deep(.boss-cover-wrap) {
		width: 74px;
		height: 66px;
	}
	:deep(.boss-detail) {
		display: none;
	}
	:deep(.team-roles) {
		width: 31%;
		gap: 2px;
		padding: 4px;
	}
}
</style>
