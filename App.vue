<script lang="ts">
	import { bootstrapIdentity } from './api/identity';
	import { hydrateTheme } from './theme';

	function initializeIdentity(): void {
		void bootstrapIdentity().catch((error) => {
			console.error('初始化用户身份失败：', error);
		});
	}

	export default {
	onLaunch() {
		hydrateTheme();
		// 应用打开时先恢复用户身份；没有任何 Token 时创建游客身份。
		initializeIdentity();
	},
	onShow() {
		hydrateTheme();
	},
	onHide() {
		console.log('App Hide');
	},
	}
</script>

<style>
page {
	min-height: 100%;
	background: var(--bg-page, #00142d);
	color: var(--text-primary, #e8f1ff);
	font-family: Arial, "Microsoft YaHei", sans-serif;
	font-size: 14px;
}

view,
text,
button,
input {
	box-sizing: border-box;
}

.theme-dark {
	color-scheme: dark;
	--bg-page: #00142d;
	--bg-content-start: #000f21;
	--bg-content-end: #000b18;
	--bg-panel: rgba(4, 25, 47, 0.96);
	--bg-panel-alt: rgba(2, 18, 35, 0.96);
	--bg-panel-soft: rgba(0, 16, 35, 0.42);
	--bg-panel-soft-alt: rgba(11, 31, 53, 0.48);
	--bg-elevated: #061a30;
	--bg-input: rgba(0, 13, 29, 0.6);
	--bg-subtle: rgba(0, 29, 64, 0.8);
	--bg-hover: rgba(5, 65, 107, 0.92);
	--bg-selected: rgba(8, 104, 192, 0.24);
	--text-primary: #f0f6ff;
	--text-secondary: #d1e3ff;
	--text-muted: #91afd2;
	--text-faint: #6d91b4;
	--text-placeholder: #7894b2;
	--border-subtle: rgba(66, 116, 164, 0.18);
	--border-default: rgba(72, 124, 174, 0.32);
	--border-strong: rgba(56, 160, 222, 0.55);
	--accent: #087df5;
	--accent-strong: #168cff;
	--accent-text: #62b4ff;
	--accent-soft: rgba(8, 125, 245, 0.12);
	--accent-soft-strong: rgba(8, 125, 245, 0.24);
	--accent-contrast: #fff;
	--danger: #f06a73;
	--danger-strong: #c44857;
	--danger-soft: rgba(196, 72, 87, 0.2);
	--success: #4fd08a;
	--warning: #ffd166;
	--shadow: rgba(0, 0, 0, 0.48);
	--mask: rgba(0, 7, 18, 0.78);
	--table-header: rgba(12, 47, 82, 0.92);
	--difficulty-1-bg: rgba(7, 62, 58, 0.66);
	--difficulty-3-bg: rgba(70, 52, 24, 0.66);
	--difficulty-4-bg: rgba(46, 34, 80, 0.68);
	--difficulty-5-bg: rgba(68, 27, 51, 0.7);
	--header-text: #fff;
	--header-subtitle: #a9d0ff;
	--header-button-text: #eaf5ff;
	--header-nav-text: rgba(222, 238, 255, 0.86);
	--header-link: #78bbff;
	--link: #78bbff;
	--footer-text: #54769d;
}

.theme-light {
	color-scheme: light;
	--bg-page: #edf5ff;
	--bg-content-start: #f9fcff;
	--bg-content-end: #edf5ff;
	--bg-panel: rgba(255, 255, 255, 0.97);
	--bg-panel-alt: rgba(244, 250, 255, 0.97);
	--bg-panel-soft: rgba(255, 255, 255, 0.72);
	--bg-panel-soft-alt: rgba(232, 243, 255, 0.82);
	--bg-elevated: #fff;
	--bg-input: rgba(255, 255, 255, 0.9);
	--bg-subtle: rgba(230, 242, 255, 0.9);
	--bg-hover: rgba(216, 235, 255, 0.96);
	--bg-selected: rgba(8, 125, 245, 0.1);
	--text-primary: #14263d;
	--text-secondary: #294a69;
	--text-muted: #5b7691;
	--text-faint: #7890a8;
	--text-placeholder: #8095aa;
	--border-subtle: rgba(84, 126, 166, 0.2);
	--border-default: rgba(67, 111, 153, 0.3);
	--border-strong: rgba(8, 125, 245, 0.45);
	--accent: #087df5;
	--accent-strong: #0872dd;
	--accent-text: #0868c9;
	--accent-soft: rgba(8, 125, 245, 0.08);
	--accent-soft-strong: rgba(8, 125, 245, 0.16);
	--accent-contrast: #fff;
	--danger: #c73f55;
	--danger-strong: #b83248;
	--danger-soft: rgba(196, 72, 87, 0.12);
	--success: #188b5c;
	--warning: #a66c00;
	--shadow: rgba(32, 70, 110, 0.16);
	--mask: rgba(18, 37, 58, 0.42);
	--table-header: #e4f1ff;
	--difficulty-1-bg: #d8f7ee;
	--difficulty-3-bg: #fff1d6;
	--difficulty-4-bg: #eee6ff;
	--difficulty-5-bg: #ffe4eb;
	--header-text: #fff;
	--header-subtitle: #d8edff;
	--header-button-text: #eaf5ff;
	--header-nav-text: rgba(222, 238, 255, 0.9);
	--header-link: #a9d7ff;
	--link: #0868c9;
	--footer-text: #7189a2;
}
</style>
