const HIDE_COLLECTED_KEY = "hide-collected:v1";

const isBoolean = (value: unknown): value is boolean =>
	typeof value === "boolean";

export function loadHideCollectedPreference(): boolean {
	try {
		const stored = localStorage.getItem(HIDE_COLLECTED_KEY);
		if (stored === null) {
			return false;
		}
		const parsed = JSON.parse(stored) as unknown;
		if (isBoolean(parsed)) {
			return parsed;
		}
		console.warn(
			`Invalid hide collected preference value '${stored}', falling back to false`,
		);
	} catch (error) {
		console.warn(
			"Failed to read hide collected preference from localStorage:",
			error,
		);
	}
	return false;
}

export function saveHideCollectedPreference(hideCollected: unknown): boolean {
	try {
		localStorage.setItem(
			HIDE_COLLECTED_KEY,
			JSON.stringify(Boolean(hideCollected)),
		);
		return true;
	} catch (error) {
		console.error("Failed to save hide collected preference:", error);
		return false;
	}
}
