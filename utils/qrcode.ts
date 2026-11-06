/**
 * 轻量二维码编码器（QR Code Model 2、Byte 模式、纠错等级 M）。
 * 仅用于把排刀表分享链接绘制成二维码，不引入第三方依赖。
 */

export interface QrMatrix {
	size: number;
	modules: boolean[][];
}

interface QrBlockSpec {
	ecCodewords: number;
	groups: Array<{ count: number; dataCodewords: number }>;
}

const MAX_VERSION = 10;
const EC_LEVEL_BITS = 0;

const BLOCK_SPECS: Record<number, QrBlockSpec> = {
	1: { ecCodewords: 10, groups: [{ count: 1, dataCodewords: 16 }] },
	2: { ecCodewords: 16, groups: [{ count: 1, dataCodewords: 28 }] },
	3: { ecCodewords: 26, groups: [{ count: 1, dataCodewords: 44 }] },
	4: { ecCodewords: 18, groups: [{ count: 2, dataCodewords: 32 }] },
	5: { ecCodewords: 24, groups: [{ count: 2, dataCodewords: 43 }] },
	6: { ecCodewords: 16, groups: [{ count: 4, dataCodewords: 27 }] },
	7: { ecCodewords: 18, groups: [{ count: 4, dataCodewords: 31 }] },
	8: {
		ecCodewords: 22,
		groups: [
			{ count: 2, dataCodewords: 38 },
			{ count: 2, dataCodewords: 39 },
		],
	},
	9: {
		ecCodewords: 22,
		groups: [
			{ count: 3, dataCodewords: 36 },
			{ count: 2, dataCodewords: 37 },
		],
	},
	10: {
		ecCodewords: 26,
		groups: [
			{ count: 4, dataCodewords: 43 },
			{ count: 1, dataCodewords: 44 },
		],
	},
};

const ALIGNMENT_POSITIONS: Record<number, number[]> = {
	1: [],
	2: [6, 18],
	3: [6, 22],
	4: [6, 26],
	5: [6, 30],
	6: [6, 34],
	7: [6, 22, 38],
	8: [6, 24, 42],
	9: [6, 26, 46],
	10: [6, 28, 50],
};

const EXP_TABLE = new Uint8Array(512);
const LOG_TABLE = new Uint8Array(256);

let expValue = 1;
for (let index = 0; index < 255; index += 1) {
	EXP_TABLE[index] = expValue;
	LOG_TABLE[expValue] = index;
	expValue <<= 1;
	if (expValue & 0x100) {
		expValue ^= 0x11d;
	}
}
for (let index = 255; index < 512; index += 1) {
	EXP_TABLE[index] = EXP_TABLE[index - 255];
}

function gfMultiply(left: number, right: number): number {
	if (left === 0 || right === 0) return 0;
	return EXP_TABLE[LOG_TABLE[left] + LOG_TABLE[right]];
}

function rsGenerator(ecCodewords: number): number[] {
	let polynomial = [1];

	for (let index = 0; index < ecCodewords; index += 1) {
		const next = new Array<number>(polynomial.length + 1).fill(0);
		const factor = EXP_TABLE[index];

		for (let position = 0; position < polynomial.length; position += 1) {
			next[position] ^= polynomial[position];
			next[position + 1] ^= gfMultiply(polynomial[position], factor);
		}

		polynomial = next;
	}

	return polynomial.slice(1);
}

function rsEncode(data: number[], ecCodewords: number): number[] {
	const generator = rsGenerator(ecCodewords);
	const remainder = new Array<number>(ecCodewords).fill(0);

	data.forEach((value) => {
		const factor = value ^ remainder[0];
		remainder.shift();
		remainder.push(0);

		for (let index = 0; index < ecCodewords; index += 1) {
			remainder[index] ^= gfMultiply(generator[index], factor);
		}
	});

	return remainder;
}

function bchDigit(value: number): number {
	let digit = 0;
	let current = value;

	while (current !== 0) {
		digit += 1;
		current >>>= 1;
	}

	return digit;
}

function bchTypeInfo(data: number): number {
	const generator = 0x537;
	let remainder = data << 10;

	while (bchDigit(remainder) - bchDigit(generator) >= 0) {
		remainder ^= generator << (bchDigit(remainder) - bchDigit(generator));
	}

	return ((data << 10) | remainder) ^ 0x5412;
}

function bchVersionInfo(version: number): number {
	const generator = 0x1f25;
	let remainder = version << 12;

	while (bchDigit(remainder) - bchDigit(generator) >= 0) {
		remainder ^= generator << (bchDigit(remainder) - bchDigit(generator));
	}

	return (version << 12) | remainder;
}

function utf8Bytes(text: string): number[] {
	const bytes: number[] = [];

	Array.from(text).forEach((character) => {
		const code = character.codePointAt(0) ?? 0;

		if (code < 0x80) {
			bytes.push(code);
		} else if (code < 0x800) {
			bytes.push(
				0xc0 | (code >> 6),
				0x80 | (code & 0x3f),
			);
		} else if (code < 0x10000) {
			bytes.push(
				0xe0 | (code >> 12),
				0x80 | ((code >> 6) & 0x3f),
				0x80 | (code & 0x3f),
			);
		} else {
			bytes.push(
				0xf0 | (code >> 18),
				0x80 | ((code >> 12) & 0x3f),
				0x80 | ((code >> 6) & 0x3f),
				0x80 | (code & 0x3f),
			);
		}
	});

	return bytes;
}

function dataCodewordCount(version: number): number {
	const spec = BLOCK_SPECS[version];
	return spec.groups.reduce(
		(total, group) => total + group.count * group.dataCodewords,
		0,
	);
}

function pickVersion(byteLength: number): number {
	for (let version = 1; version <= MAX_VERSION; version += 1) {
		const countBits = version < 10 ? 8 : 16;
		const requiredBits = 4 + countBits + byteLength * 8;

		if (requiredBits <= dataCodewordCount(version) * 8) {
			return version;
		}
	}

	throw new Error('分享链接过长，无法生成二维码');
}

function buildCodewords(bytes: number[], version: number): number[] {
	const spec = BLOCK_SPECS[version];
	const capacityBits = dataCodewordCount(version) * 8;
	const countBits = version < 10 ? 8 : 16;
	const bits: number[] = [];

	const append = (value: number, length: number): void => {
		for (let offset = length - 1; offset >= 0; offset -= 1) {
			bits.push((value >>> offset) & 1);
		}
	};

	append(0b0100, 4);
	append(bytes.length, countBits);
	bytes.forEach((value) => append(value, 8));

	for (let index = 0; index < 4 && bits.length < capacityBits; index += 1) {
		bits.push(0);
	}
	while (bits.length % 8 !== 0) {
		bits.push(0);
	}

	const data: number[] = [];
	for (let index = 0; index < bits.length; index += 8) {
		let value = 0;
		for (let offset = 0; offset < 8; offset += 1) {
			value = (value << 1) | bits[index + offset];
		}
		data.push(value);
	}

	const pads = [0xec, 0x11];
	let padIndex = 0;
	while (data.length < dataCodewordCount(version)) {
		data.push(pads[padIndex % 2]);
		padIndex += 1;
	}

	const blocks: Array<{ data: number[]; ec: number[] }> = [];
	let offset = 0;

	spec.groups.forEach((group) => {
		for (let index = 0; index < group.count; index += 1) {
			const blockData = data.slice(offset, offset + group.dataCodewords);
			offset += group.dataCodewords;
			blocks.push({
				data: blockData,
				ec: rsEncode(blockData, spec.ecCodewords),
			});
		}
	});

	const maxDataLength = Math.max(...blocks.map((block) => block.data.length));
	const codewords: number[] = [];

	for (let index = 0; index < maxDataLength; index += 1) {
		blocks.forEach((block) => {
			if (index < block.data.length) {
				codewords.push(block.data[index]);
			}
		});
	}

	for (let index = 0; index < spec.ecCodewords; index += 1) {
		blocks.forEach((block) => {
			codewords.push(block.ec[index]);
		});
	}

	return codewords;
}

function createEmptyMatrix(size: number): Array<Array<boolean | null>> {
	return Array.from({ length: size }, () => (
		new Array<boolean | null>(size).fill(null)
	));
}

function placeFinder(
	modules: Array<Array<boolean | null>>,
	row: number,
	col: number,
): void {
	const size = modules.length;

	for (let rowOffset = -1; rowOffset <= 7; rowOffset += 1) {
		for (let colOffset = -1; colOffset <= 7; colOffset += 1) {
			const targetRow = row + rowOffset;
			const targetCol = col + colOffset;

			if (
				targetRow < 0
				|| targetRow >= size
				|| targetCol < 0
				|| targetCol >= size
			) {
				continue;
			}

			const inside = (
				rowOffset >= 0
				&& rowOffset <= 6
				&& colOffset >= 0
				&& colOffset <= 6
			);
			const dark = inside && (
				rowOffset === 0
				|| rowOffset === 6
				|| colOffset === 0
				|| colOffset === 6
				|| (
					rowOffset >= 2
					&& rowOffset <= 4
					&& colOffset >= 2
					&& colOffset <= 4
				)
			);

			modules[targetRow][targetCol] = dark;
		}
	}
}

function placeFunctionPatterns(
	modules: Array<Array<boolean | null>>,
	version: number,
): void {
	const size = modules.length;

	placeFinder(modules, 0, 0);
	placeFinder(modules, 0, size - 7);
	placeFinder(modules, size - 7, 0);

	for (let index = 8; index < size - 8; index += 1) {
		const dark = index % 2 === 0;
		modules[6][index] = dark;
		modules[index][6] = dark;
	}

	const alignment = ALIGNMENT_POSITIONS[version] ?? [];
	alignment.forEach((row) => {
		alignment.forEach((col) => {
			if (
				(row === 6 && col === 6)
				|| (row === 6 && col === size - 7)
				|| (row === size - 7 && col === 6)
			) {
				return;
			}

			for (let rowOffset = -2; rowOffset <= 2; rowOffset += 1) {
				for (let colOffset = -2; colOffset <= 2; colOffset += 1) {
					const dark = Math.max(
						Math.abs(rowOffset),
						Math.abs(colOffset),
					) !== 1;
					modules[row + rowOffset][col + colOffset] = dark;
				}
			}
		});
	});

	for (let index = 0; index < 15; index += 1) {
		if (index < 6) {
			modules[index][8] = false;
		} else if (index < 8) {
			modules[index + 1][8] = false;
		} else {
			modules[size - 15 + index][8] = false;
		}
	}

	for (let index = 0; index < 15; index += 1) {
		if (index < 8) {
			modules[8][size - index - 1] = false;
		} else if (index < 9) {
			modules[8][7] = false;
		} else {
			modules[8][15 - index - 1] = false;
		}
	}

	if (version >= 7) {
		for (let index = 0; index < 18; index += 1) {
			modules[Math.floor(index / 3)][size - 11 + (index % 3)] = false;
			modules[size - 11 + (index % 3)][Math.floor(index / 3)] = false;
		}
	}

	modules[size - 8][8] = true;
}

function maskApplies(mask: number, row: number, col: number): boolean {
	switch (mask) {
		case 0:
			return (row + col) % 2 === 0;
		case 1:
			return row % 2 === 0;
		case 2:
			return col % 3 === 0;
		case 3:
			return (row + col) % 3 === 0;
		case 4:
			return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0;
		case 5:
			return ((row * col) % 2) + ((row * col) % 3) === 0;
		case 6:
			return (((row * col) % 2) + ((row * col) % 3)) % 2 === 0;
		default:
			return (((row + col) % 2) + ((row * col) % 3)) % 2 === 0;
	}
}

function placeData(
	modules: Array<Array<boolean | null>>,
	codewords: number[],
	mask: number,
): void {
	const size = modules.length;
	let row = size - 1;
	let direction = -1;
	let byteIndex = 0;
	let bitIndex = 7;

	for (let col = size - 1; col > 0; col -= 2) {
		if (col === 6) col -= 1;

		while (true) {
			for (let offset = 0; offset < 2; offset += 1) {
				const targetCol = col - offset;

				if (modules[row][targetCol] !== null) continue;

				let dark = false;
				if (byteIndex < codewords.length) {
					dark = ((codewords[byteIndex] >>> bitIndex) & 1) === 1;
				}

				if (maskApplies(mask, row, targetCol)) {
					dark = !dark;
				}

				modules[row][targetCol] = dark;
				bitIndex -= 1;

				if (bitIndex < 0) {
					byteIndex += 1;
					bitIndex = 7;
				}
			}

			row += direction;
			if (row < 0 || row >= size) {
				row -= direction;
				direction = -direction;
				break;
			}
		}
	}
}

function placeFormatInfo(
	modules: boolean[][],
	size: number,
	mask: number,
): void {
	const bits = bchTypeInfo((EC_LEVEL_BITS << 3) | mask);

	for (let index = 0; index < 15; index += 1) {
		const dark = ((bits >> index) & 1) === 1;

		if (index < 6) {
			modules[index][8] = dark;
		} else if (index < 8) {
			modules[index + 1][8] = dark;
		} else {
			modules[size - 15 + index][8] = dark;
		}
	}

	for (let index = 0; index < 15; index += 1) {
		const dark = ((bits >> index) & 1) === 1;

		if (index < 8) {
			modules[8][size - index - 1] = dark;
		} else if (index < 9) {
			modules[8][7] = dark;
		} else {
			modules[8][15 - index - 1] = dark;
		}
	}
}

function placeVersionInfo(
	modules: boolean[][],
	size: number,
	version: number,
): void {
	if (version < 7) return;

	const bits = bchVersionInfo(version);

	for (let index = 0; index < 18; index += 1) {
		const dark = ((bits >> index) & 1) === 1;
		modules[Math.floor(index / 3)][size - 11 + (index % 3)] = dark;
		modules[size - 11 + (index % 3)][Math.floor(index / 3)] = dark;
	}
}

function penaltyScore(modules: boolean[][]): number {
	const size = modules.length;
	let score = 0;

	for (let row = 0; row < size; row += 1) {
		let runColor = modules[row][0];
		let runLength = 1;

		for (let col = 1; col < size; col += 1) {
			if (modules[row][col] === runColor) {
				runLength += 1;
			} else {
				if (runLength >= 5) score += 3 + runLength - 5;
				runColor = modules[row][col];
				runLength = 1;
			}
		}
		if (runLength >= 5) score += 3 + runLength - 5;
	}

	for (let col = 0; col < size; col += 1) {
		let runColor = modules[0][col];
		let runLength = 1;

		for (let row = 1; row < size; row += 1) {
			if (modules[row][col] === runColor) {
				runLength += 1;
			} else {
				if (runLength >= 5) score += 3 + runLength - 5;
				runColor = modules[row][col];
				runLength = 1;
			}
		}
		if (runLength >= 5) score += 3 + runLength - 5;
	}

	for (let row = 0; row < size - 1; row += 1) {
		for (let col = 0; col < size - 1; col += 1) {
			const color = modules[row][col];
			if (
				modules[row][col + 1] === color
				&& modules[row + 1][col] === color
				&& modules[row + 1][col + 1] === color
			) {
				score += 3;
			}
		}
	}

	const finderPattern = [true, false, true, true, true, false, true];

	for (let row = 0; row < size; row += 1) {
		for (let col = 0; col <= size - 7; col += 1) {
			let matches = true;
			for (let offset = 0; offset < 7; offset += 1) {
				if (modules[row][col + offset] !== finderPattern[offset]) {
					matches = false;
					break;
				}
			}
			if (matches) score += 40;
		}
	}

	for (let col = 0; col < size; col += 1) {
		for (let row = 0; row <= size - 7; row += 1) {
			let matches = true;
			for (let offset = 0; offset < 7; offset += 1) {
				if (modules[row + offset][col] !== finderPattern[offset]) {
					matches = false;
					break;
				}
			}
			if (matches) score += 40;
		}
	}

	let darkCount = 0;
	modules.forEach((row) => {
		row.forEach((dark) => {
			if (dark) darkCount += 1;
		});
	});

	const percent = (darkCount * 100) / (size * size);
	score += Math.floor(Math.abs(percent - 50) / 5) * 10;

	return score;
}

function buildMatrix(
	version: number,
	codewords: number[],
	mask: number,
	test: boolean,
): boolean[][] {
	const size = version * 4 + 17;
	const modules = createEmptyMatrix(size);

	placeFunctionPatterns(modules, version);
	placeData(modules, codewords, mask);

	const resolved = modules.map((row) => row.map((value) => value === true));

	if (!test) {
		placeFormatInfo(resolved, size, mask);
		placeVersionInfo(resolved, size, version);
	}

	return resolved;
}

export function createQrMatrix(text: string): QrMatrix {
	const bytes = utf8Bytes(text);
	const version = pickVersion(bytes.length);
	const codewords = buildCodewords(bytes, version);

	let bestMask = 0;
	let bestScore = Number.POSITIVE_INFINITY;

	for (let mask = 0; mask < 8; mask += 1) {
		const candidate = buildMatrix(version, codewords, mask, true);
		const score = penaltyScore(candidate);

		if (score < bestScore) {
			bestScore = score;
			bestMask = mask;
		}
	}

	return {
		size: version * 4 + 17,
		modules: buildMatrix(version, codewords, bestMask, false),
	};
}
