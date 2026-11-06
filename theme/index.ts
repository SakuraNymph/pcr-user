import { reactive } from 'vue';

export type ThemeMode = 'dark' | 'light';
export type ThemePreference = ThemeMode | 'system';

const storageKey = 'pcr.theme.mode';
let systemThemeListenerAttached = false;

function storedThemePreference(): ThemePreference {
	const value: unknown = uni.getStorageSync(storageKey);
	return value === 'light' || value === 'system' ? value : 'dark';
}

function normalizeSystemTheme(value: unknown): ThemeMode {
	return value === 'light' ? 'light' : 'dark';
}

function detectedSystemThemeMode(): ThemeMode {
	if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
		return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	}

	try {
		const systemInfo = uni.getSystemInfoSync() as { osTheme?: string; theme?: string };
		return normalizeSystemTheme(systemInfo.osTheme || systemInfo.theme);
	} catch {
		return 'dark';
	}
}

function resolvedThemeMode(preference: ThemePreference): ThemeMode {
	return preference === 'system' ? detectedSystemThemeMode() : preference;
}

function syncSystemTheme(): void {
	if (themeState.preference === 'system') {
		themeState.mode = detectedSystemThemeMode();
	}
}

function ensureSystemThemeListener(): void {
	if (systemThemeListenerAttached) return;
	systemThemeListenerAttached = true;

	if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
		const colorScheme = window.matchMedia('(prefers-color-scheme: dark)');
		if (typeof colorScheme.addEventListener === 'function') {
			colorScheme.addEventListener('change', syncSystemTheme);
		} else {
			colorScheme.addListener(syncSystemTheme);
		}
		return;
	}

	type ThemeChangeResult = { theme?: string };
	const themeAwareUni = uni as typeof uni & {
		onThemeChange?: (listener: (result: ThemeChangeResult) => void) => void;
	};
	themeAwareUni.onThemeChange?.((result) => {
		if (themeState.preference === 'system') {
			themeState.mode = normalizeSystemTheme(result.theme);
		}
	});
}

const initialPreference = storedThemePreference();

export const themeState = reactive<{ preference: ThemePreference; mode: ThemeMode }>({
	preference: initialPreference,
	mode: resolvedThemeMode(initialPreference),
});

export function hydrateTheme(): void {
	themeState.preference = storedThemePreference();
	themeState.mode = resolvedThemeMode(themeState.preference);
	ensureSystemThemeListener();
}

export function setThemePreference(preference: ThemePreference): void {
	themeState.preference = preference;
	themeState.mode = resolvedThemeMode(preference);
	uni.setStorageSync(storageKey, preference);
	ensureSystemThemeListener();
}
