import type { FeedbackCategory } from '../api/types';

export interface FeedbackCategoryOption {
	value: FeedbackCategory;
	label: string;
	description: string;
}

export interface UploadImageFile extends File {
	path?: string;
}

export interface SelectedFeedbackImage {
	key: string;
	file: UploadImageFile;
	previewUrl: string;
}

export type FeedbackStatusTone = 'pending' | 'processing' | 'replied' | 'closed';

export const FEEDBACK_CATEGORIES: FeedbackCategoryOption[] = [
	{ value: 1, label: '使用问题', description: '功能异常、报错或操作受阻' },
	{ value: 2, label: '功能建议', description: '希望新增的功能' },
	{ value: 3, label: '改进建议', description: '对现有功能的优化建议' },
	{ value: 4, label: '其他', description: '其他想反馈的内容' },
];

export const MAX_FEEDBACK_IMAGES = 3;
export const MAX_FEEDBACK_IMAGE_BYTES = 5 * 1024 * 1024;

const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ACCEPTED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

export function feedbackStatusTone(status: number): FeedbackStatusTone {
	switch (Number(status)) {
		case 1:
			return 'processing';
		case 2:
			return 'replied';
		case 3:
			return 'closed';
		default:
			return 'pending';
	}
}

export function validateFeedbackImage(file: {
	size?: number;
	type?: string;
	name?: string;
}): string | null {
	const size = typeof file.size === 'number' ? file.size : 0;

	if (size <= 0) return '图片读取失败，请重新选择';
	if (size > MAX_FEEDBACK_IMAGE_BYTES) return '单张图片不能超过 5MB';

	const type = (file.type || '').toLowerCase();
	if (type) {
		return ACCEPTED_MIME_TYPES.includes(type)
			? null
			: '仅支持 JPG、JPEG、PNG、WEBP 格式的图片';
	}

	const extension = (file.name || '').split('.').pop()?.toLowerCase() ?? '';
	return ACCEPTED_EXTENSIONS.includes(extension)
		? null
		: '仅支持 JPG、JPEG、PNG、WEBP 格式的图片';
}

/**
 * H5 图片选择：返回已通过大小与格式校验的文件，用户取消选择时返回空数组。
 */
export function pickFeedbackImages(currentCount: number): Promise<SelectedFeedbackImage[]> {
	const count = MAX_FEEDBACK_IMAGES - currentCount;

	if (count <= 0) return Promise.resolve([]);

	return new Promise((resolve) => {
		uni.chooseImage({
			count,
			sizeType: ['compressed'],
			sourceType: ['album', 'camera'],
			success: (result) => {
				const files = (result.tempFiles ?? []) as unknown as UploadImageFile[];
				const paths = result.tempFilePaths ?? [];
				const selected: SelectedFeedbackImage[] = [];

				files.forEach((file, index) => {
					const error = validateFeedbackImage(file);

					if (error) {
						uni.showToast({ title: error, icon: 'none' });
						return;
					}

					selected.push({
						key: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
						file,
						previewUrl: file.path || paths[index] || '',
					});
				});

				resolve(selected.slice(0, count));
			},
			fail: () => resolve([]),
		});
	});
}
