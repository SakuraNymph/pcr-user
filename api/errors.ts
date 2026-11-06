export class RequestError extends Error {
	statusCode?: number;
	responseData?: unknown;

	constructor(message: string, statusCode?: number, responseData?: unknown) {
		super(message);
		this.name = 'RequestError';
		this.statusCode = statusCode;
		this.responseData = responseData;
	}
}

function asRecord(value: unknown): Record<string, unknown> | null {
	if (value && typeof value === 'object' && !Array.isArray(value)) {
		return value as Record<string, unknown>;
	}
	return null;
}

export function responseErrorMessage(value: unknown): string | undefined {
	const record = asRecord(value);
	if (!record) {
		return undefined;
	}

	if (typeof record.msg === 'string' && record.msg) {
		return record.msg;
	}

	const errors = asRecord(record.errors);
	if (errors) {
		for (const messages of Object.values(errors)) {
			if (typeof messages === 'string' && messages) {
				return messages;
			}
			if (Array.isArray(messages) && typeof messages[0] === 'string') {
				return messages[0];
			}
		}
	}
	if (typeof record.message === 'string' && record.message) {
		return record.message;
	}

	return undefined;
}

export function errorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message) {
		return error.message;
	}
	return fallback;
}
