<template>
	<MainLayout active-menu="openSource">
		<view class="open-source-panel">
			<view class="open-source-hero">
				<view class="hero-copy">
					<view class="hero-eyebrow">OPEN SOURCE</view>
					<view class="hero-title">开源项目</view>
					<view class="hero-description">
						本项目采用前后端分离架构，相关代码独立开源，欢迎查看、学习和参与贡献。
					</view>
				</view>
				<view class="hero-mark" aria-hidden="true">
					<view class="hero-mark-brackets">&lt; / &gt;</view>
					<view class="hero-mark-line"></view>
					<view class="hero-mark-caption">BUILD · SHARE · IMPROVE</view>
				</view>
			</view>

			<view class="project-grid">
				<view
					v-for="(project, index) in openSourceProjects"
					:key="project.key"
					class="project-card"
				>
					<view class="card-top">
						<view class="project-icon">{{ project.icon }}</view>
						<view class="project-index">{{ String(index + 1).padStart(2, '0') }}</view>
					</view>

					<view class="project-heading">
						<view class="project-name">{{ project.name }}</view>
						<view class="project-english-name">{{ project.englishName }}</view>
					</view>

					<view class="project-description">{{ project.description }}</view>

					<view class="tech-list">
						<text
							v-for="tech in project.techStack"
							:key="tech"
							class="tech-tag"
						>
							{{ tech }}
						</text>
					</view>

					<view class="card-footer">
						<view
							v-if="project.repository"
							class="repository-link"
							role="link"
							tabindex="0"
							:aria-label="`在新标签页打开 ${project.name} 的 GitHub 仓库`"
							@click="openRepository(project)"
							@keydown.enter.prevent="openRepository(project)"
							@keydown.space.prevent="openRepository(project)"
						>
							<text class="repository-icon">◈</text>
							<text>GitHub 仓库</text>
							<text class="repository-arrow">↗</text>
						</view>
						<view v-else class="repository-pending">
							<text class="pending-dot"></text>
							<text>即将开源</text>
						</view>
					</view>
				</view>
			</view>

			<view class="open-source-note">
				<text class="note-mark">◇</text>
				<text>三个项目独立维护，仓库地址将在确认后更新。</text>
			</view>
		</view>
	</MainLayout>
</template>

<script setup lang="ts">
import MainLayout from '../../layouts/MainLayout.vue';
import { openSourceProjects, type OpenSourceProject } from '../../config/projects';
import { openExternalLink } from '../../utils/externalLink';

function openRepository(project: OpenSourceProject): void {
	if (!project.repository) return;
	openExternalLink(project.repository);
}
</script>

<style>
.open-source-panel {
	width: 100%;
	max-width: 1440px;
	min-height: 70vh;
	margin: 0 auto;
	padding: 34px;
	border: 1px solid rgba(44, 155, 211, 0.18);
	border-radius: 10px;
	background:
		linear-gradient(90deg, rgba(22, 140, 255, 0.05) 1px, transparent 1px),
		linear-gradient(0deg, rgba(22, 140, 255, 0.04) 1px, transparent 1px),
		linear-gradient(105deg, var(--bg-panel), var(--bg-panel-alt));
	background-size: 72px 72px, 72px 72px, auto;
	box-shadow: inset 0 0 14px rgba(24, 119, 171, 0.025);
}

.open-source-hero {
	position: relative;
	padding: 10px 2px 34px;
	display: flex;
	align-items: flex-end;
	justify-content: space-between;
	gap: 40px;
	border-bottom: 1px solid var(--border-subtle);
}

.hero-copy {
	max-width: 760px;
}

.hero-eyebrow {
	margin-bottom: 12px;
	color: var(--accent-text);
	font-size: 11px;
	font-weight: 700;
	letter-spacing: 4px;
}

.hero-title {
	color: var(--text-primary);
	font-size: 38px;
	font-weight: 700;
	letter-spacing: 2px;
	line-height: 1.15;
}

.hero-title::after {
	display: inline-block;
	width: 48px;
	height: 2px;
	margin: 0 0 9px 18px;
	background: linear-gradient(90deg, var(--accent-strong), transparent);
	content: '';
}

.hero-description {
	max-width: 690px;
	margin-top: 16px;
	color: var(--text-muted);
	font-size: 14px;
	line-height: 1.9;
}

.hero-mark {
	min-width: 220px;
	padding: 4px 0 2px;
	text-align: right;
}

.hero-mark-brackets {
	color: var(--accent-text);
	font-family: Consolas, "Courier New", monospace;
	font-size: 28px;
	font-weight: 700;
	letter-spacing: 3px;
	text-shadow: 0 0 16px var(--accent-soft-strong);
}

.hero-mark-line {
	width: 140px;
	height: 1px;
	margin: 12px 0 10px auto;
	background: linear-gradient(90deg, transparent, var(--border-strong));
}

.hero-mark-caption {
	color: var(--text-faint);
	font-size: 9px;
	font-weight: 700;
	letter-spacing: 2.2px;
}

.project-grid {
	margin-top: 30px;
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 20px;
}

.project-card {
	position: relative;
	min-height: 330px;
	padding: 24px;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	border: 1px solid rgba(22, 140, 255, 0.24);
	border-radius: 10px;
	background: linear-gradient(150deg, var(--bg-panel-soft-alt), var(--bg-panel-soft));
	box-shadow: 0 10px 28px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.025);
	transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.project-card::before {
	position: absolute;
	top: 0;
	left: 24px;
	width: 44px;
	height: 2px;
	background: var(--accent-strong);
	box-shadow: 0 0 10px var(--accent-strong);
	content: '';
}

.project-card:hover {
	border-color: var(--border-strong);
	box-shadow: 0 16px 34px rgba(0, 0, 0, 0.18), 0 0 24px var(--accent-soft);
	transform: translateY(-3px);
}

.card-top {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 16px;
}

.project-icon {
	width: 42px;
	height: 42px;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1px solid var(--border-strong);
	border-radius: 8px;
	background: var(--accent-soft);
	color: var(--accent-text);
	font-size: 21px;
	box-shadow: inset 0 0 12px var(--accent-soft);
}

.project-index {
	color: var(--text-faint);
	font-family: Consolas, "Courier New", monospace;
	font-size: 12px;
	letter-spacing: 1px;
}

.project-heading {
	margin-top: 22px;
}

.project-name {
	color: var(--text-primary);
	font-size: 22px;
	font-weight: 700;
	line-height: 1.3;
}

.project-english-name {
	margin-top: 5px;
	color: var(--accent-text);
	font-size: 9px;
	font-weight: 700;
	letter-spacing: 2.4px;
}

.project-description {
	margin-top: 16px;
	color: var(--text-muted);
	font-size: 13px;
	line-height: 1.85;
}

.tech-list {
	margin-top: 20px;
	display: flex;
	flex-wrap: wrap;
	gap: 7px;
}

.tech-tag {
	padding: 4px 9px;
	border: 1px solid var(--border-subtle);
	border-radius: 4px;
	background: var(--bg-panel-soft);
	color: var(--text-secondary);
	font-size: 11px;
	line-height: 1.4;
}

.card-footer {
	margin-top: auto;
	padding-top: 24px;
}

.repository-link {
	width: 100%;
	min-height: 40px;
	padding: 0 13px;
	display: flex;
	align-items: center;
	gap: 8px;
	border: 1px solid var(--border-strong);
	border-radius: 7px;
	background: var(--accent-soft);
	color: var(--accent-text);
	font-size: 13px;
	font-weight: 600;
	cursor: pointer;
	outline: none;
	transition: background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
}

.repository-link:hover,
.repository-link:focus,
.repository-link:focus-visible {
	background: var(--accent);
	box-shadow: 0 0 18px var(--accent-soft-strong);
	color: var(--accent-contrast);
}

.repository-icon {
	font-size: 15px;
}

.repository-arrow {
	margin-left: auto;
	font-size: 16px;
}

.repository-pending {
	min-height: 40px;
	padding: 0 13px;
	display: flex;
	align-items: center;
	gap: 9px;
	border: 1px dashed var(--border-default);
	border-radius: 7px;
	color: var(--text-faint);
	font-size: 12px;
	letter-spacing: 0.5px;
}

.pending-dot {
	width: 6px;
	height: 6px;
	border-radius: 50%;
	background: var(--warning);
	box-shadow: 0 0 8px var(--warning);
}

.open-source-note {
	margin-top: 26px;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 9px;
	color: var(--text-faint);
	font-size: 12px;
}

.note-mark {
	color: var(--accent-text);
	font-size: 15px;
}

@media screen and (max-width: 1100px) {
	.project-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
}

@media screen and (max-width: 700px) {
	.open-source-panel {
		min-height: 70vh;
		padding: 20px 16px;
	}

	.open-source-hero {
		padding-bottom: 24px;
	}

	.hero-title {
		font-size: 28px;
	}

	.hero-description {
		margin-top: 13px;
		font-size: 13px;
		line-height: 1.8;
	}

	.hero-mark {
		display: none;
	}

	.project-grid {
		margin-top: 20px;
		grid-template-columns: 1fr;
		gap: 14px;
	}

	.project-card {
		min-height: 0;
		padding: 20px;
	}

	.project-name {
		font-size: 20px;
	}

	.open-source-note {
		padding: 0 10px;
		line-height: 1.7;
		text-align: center;
	}
}
</style>
