/**
 * 计算字符串的 UTF-8 字节长度，与后端 strlen 保持一致。
 */
export function utf8ByteLength(value: string): number {
	let bytes = 0;

	for (const char of value) {
		const codePoint = char.codePointAt(0) ?? 0;

		if (codePoint <= 0x7f) {
			bytes += 1;
		} else if (codePoint <= 0x7ff) {
			bytes += 2;
		} else if (codePoint <= 0xffff) {
			bytes += 3;
		} else {
			bytes += 4;
		}
	}

	return bytes;
}

/**
 * 将后端返回的 `YYYY-MM-DD HH:mm:ss` 格式化为 `YYYY-MM-DD HH:mm`。
 * 空值显示占位符，无法解析时原样返回，避免丢失后端信息。
 */
export function formatDateTime(value?: string | null): string {
	if (!value) return '—';

	const date = new Date(value.replace(' ', 'T'));
	if (Number.isNaN(date.getTime())) return value;

	const pad = (input: number): string => String(input).padStart(2, '0');

	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
		date.getHours(),
	)}:${pad(date.getMinutes())}`;
}
