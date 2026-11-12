import { errorMessage } from '../api/errors';
import { resetGuideConfig } from '../api/user';
import { reLaunch, routes } from '../router';

let resettingGuide = false;

export function confirmGuideReset(): void {
	if (resettingGuide) {
		return;
	}

	uni.showModal({
		title: '重新观看使用教程',
		content: '将重新开启所有新手引导，并返回作业列表。是否继续？',
		confirmText: '重新开始',
		confirmColor: '#168cff',
		success: (result) => {
			if (result.confirm) {
				void resetGuideAndGoHome();
			}
		},
	});
}

async function resetGuideAndGoHome(): Promise<void> {
	if (resettingGuide) {
		return;
	}

	resettingGuide = true;
	uni.showLoading({ title: '重置中...', mask: true });

	try {
		await resetGuideConfig();
		uni.hideLoading();
		uni.showToast({ title: '使用教程已重置', icon: 'success' });
		setTimeout(() => {
			resettingGuide = false;
			reLaunch(routes.home);
		}, 300);
	} catch (error) {
		uni.hideLoading();
		resettingGuide = false;
		uni.showToast({
			title: errorMessage(error, '重置使用教程失败，请稍后重试'),
			icon: 'none',
		});
	}
}
