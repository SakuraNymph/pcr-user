/**
 * 打开站外链接：H5 新窗口、App 系统浏览器，其余平台复制链接。
 */
export function openExternalLink(url: string): void {
	if (!url) {
		uni.showToast({
			title: '链接暂未配置',
			icon: 'none',
		});
		return;
	}

	// #ifdef H5
	window.open(url, '_blank', 'noopener,noreferrer');
	// #endif

	// #ifdef APP-PLUS
	plus.runtime.openURL(url);
	// #endif

	// #ifndef H5
	// #ifndef APP-PLUS
	uni.setClipboardData({
		data: url,
		success: () => {
			uni.showToast({
				title: '链接已复制',
				icon: 'success',
			});
		},
	});
	// #endif
	// #endif
}
