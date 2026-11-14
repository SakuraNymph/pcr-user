export interface EmailProviderDeliveryHint {
	name: string;
	domains: string[];
	hint?: string;
}

export const EMAIL_PROVIDER_DELIVERY_HINTS: EmailProviderDeliveryHint[] = [
	{
		name: 'Gmail',
		domains: ['gmail.com', 'googlemail.com'],
	},
];

function extractEmailDomain(email: string): string {
	const normalized = email.trim().toLowerCase();
	const at = normalized.lastIndexOf('@');

	if (at < 0 || at === normalized.length - 1) {
		return '';
	}

	return normalized.slice(at + 1);
}

export function getEmailDeliveryHint(email: string): string | null {
	const domain = extractEmailDomain(email);

	if (!domain) {
		return null;
	}

	const provider = EMAIL_PROVIDER_DELIVERY_HINTS.find((item) => (
		item.domains.includes(domain)
	));

	if (!provider) {
		return null;
	}

	return provider.hint
		?? `${provider.name} 有时会将验证码归入垃圾邮件，请同时检查垃圾箱。`;
}
