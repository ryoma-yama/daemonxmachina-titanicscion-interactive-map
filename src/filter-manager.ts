export interface FilterManagerOptions {
	storageKey?: string;
	storage?: Storage | null;
	eventTarget?: EventTarget | null;
}

interface StoredSelection {
	selected: string[];
	known: string[] | null;
}

export interface FilterChangedDetail {
	selectedCategories: string[];
}

type FilterEntry = { category: string } & Record<string, unknown>;

const DEFAULT_STORAGE_KEY = "filter-categories:v1";

function isStringArray(value: unknown): value is string[] {
	return (
		Array.isArray(value) && value.every((item) => typeof item === "string")
	);
}

function normalizeCategoryList(categories: unknown[]): string[] {
	const result: string[] = [];
	const seen = new Set<string>();
	categories.forEach((category) => {
		if (typeof category !== "string") {
			return;
		}
		const trimmed = category.trim();
		if (!trimmed || seen.has(trimmed)) {
			return;
		}
		seen.add(trimmed);
		result.push(trimmed);
	});
	return result;
}

function sortCategoryList(categories: string[]): string[] {
	return [...categories].sort((a, b) => {
		const aLower = a.toLowerCase();
		const bLower = b.toLowerCase();
		if (aLower < bLower) {
			return -1;
		}
		if (aLower > bLower) {
			return 1;
		}
		return a.localeCompare(b);
	});
}

function createFilterChangedEvent(
	selectedCategories: string[],
): CustomEvent<FilterChangedDetail> {
	if (typeof CustomEvent === "function") {
		return new CustomEvent<FilterChangedDetail>("filter:changed", {
			detail: { selectedCategories: [...selectedCategories] },
		});
	}

	const event = new Event("filter:changed") as CustomEvent<FilterChangedDetail>;
	Object.defineProperty(event, "detail", {
		configurable: true,
		enumerable: true,
		value: { selectedCategories: [...selectedCategories] },
	});
	return event;
}

function getDefaultStorage(): Storage | null {
	if (typeof localStorage !== "undefined") {
		return localStorage;
	}
	return null;
}

function getDefaultEventTarget(): EventTarget | null {
	if (typeof document !== "undefined" && document instanceof EventTarget) {
		return document;
	}
	return null;
}

export const FILTER_STORAGE_KEY = DEFAULT_STORAGE_KEY;

export class FilterManager {
	private storageKey: string;

	private storage: Storage | null;

	private eventTarget: EventTarget | null;

	private availableCategories: string[];

	private selectedCategories: string[];

	private initialSelection: string[] | null;

	private initialKnownCategories: string[] | null;

	private ready: boolean;

	constructor({
		storageKey = DEFAULT_STORAGE_KEY,
		storage = getDefaultStorage(),
		eventTarget = getDefaultEventTarget(),
	}: FilterManagerOptions = {}) {
		this.storageKey = storageKey;
		this.storage = storage;
		this.eventTarget = eventTarget;
		this.availableCategories = [];
		this.selectedCategories = [];
		const stored = this.readStoredSelection();
		this.initialSelection = stored?.selected ?? null;
		this.initialKnownCategories = stored?.known ?? null;
		this.ready = false;
	}

	initializeCategories(categories: string[]): void {
		const normalized = sortCategoryList(normalizeCategoryList(categories));
		this.availableCategories = normalized;

		const storedSelection = this.initialSelection;
		let resolvedInitial: string[];
		if (!isStringArray(storedSelection) || !storedSelection.length) {
			resolvedInitial = [...normalized];
		} else {
			const allowed = new Set(normalized);
			const filteredInitial = normalizeCategoryList(storedSelection).filter(
				(category) => allowed.has(category),
			);

			if (isStringArray(this.initialKnownCategories)) {
				const previouslyKnown = new Set(
					normalizeCategoryList(this.initialKnownCategories),
				);
				normalized.forEach((category) => {
					if (
						!filteredInitial.includes(category) &&
						!previouslyKnown.has(category)
					) {
						filteredInitial.push(category);
					}
				});
			}

			resolvedInitial = filteredInitial;
		}

		this.initialSelection = null;
		this.initialKnownCategories = null;
		this.ready = true;
		this.updateSelection(resolvedInitial, { force: true });
	}

	private readStoredSelection(): StoredSelection | null {
		if (!this.storage || !this.storageKey) {
			return null;
		}
		try {
			const raw = this.storage.getItem(this.storageKey);
			if (!raw) {
				return null;
			}
			const parsed = JSON.parse(raw) as unknown;
			if (isStringArray(parsed)) {
				return { selected: parsed, known: null };
			}
			if (
				parsed &&
				typeof parsed === "object" &&
				isStringArray((parsed as StoredSelection).selected)
			) {
				const known = isStringArray((parsed as StoredSelection).known)
					? normalizeCategoryList((parsed as StoredSelection).known ?? [])
					: null;
				return {
					selected: normalizeCategoryList((parsed as StoredSelection).selected),
					known,
				};
			}
			console.warn(
				"Invalid filter preference encountered in storage, falling back to defaults",
			);
		} catch (error) {
			console.warn("Failed to parse filter preference from storage", error);
		}
		return null;
	}

	private persistSelection(): void {
		if (!this.storage || !this.storageKey) {
			return;
		}
		try {
			this.storage.setItem(
				this.storageKey,
				JSON.stringify({
					selected: this.selectedCategories,
					known: this.availableCategories,
				}),
			);
		} catch (error) {
			console.error("Failed to persist filter preference", error);
		}
	}

	updateSelection(
		nextSelection: string[] | null | undefined,
		{ force = false } = {},
	): boolean {
		const normalized = this.normalizeSelection(nextSelection);
		if (
			!force &&
			this.areSelectionsEqual(this.selectedCategories, normalized)
		) {
			return false;
		}

		this.selectedCategories = normalized;
		this.persistSelection();
		this.emitChange();
		return true;
	}

	private normalizeSelection(selection: string[] | null | undefined): string[] {
		const allowed = new Set(this.availableCategories);
		const source = Array.isArray(selection) ? selection : [];
		const filtered: string[] = [];
		this.availableCategories.forEach((category) => {
			if (source.includes(category) && allowed.has(category)) {
				filtered.push(category);
			}
		});
		return filtered;
	}

	private areSelectionsEqual(a: string[], b: string[]): boolean {
		if (a.length !== b.length) {
			return false;
		}
		for (let index = 0; index < a.length; index += 1) {
			if (a[index] !== b[index]) {
				return false;
			}
		}
		return true;
	}

	private emitChange(): void {
		if (!this.eventTarget) {
			return;
		}
		try {
			const event = createFilterChangedEvent(this.selectedCategories);
			this.eventTarget.dispatchEvent(event);
		} catch (error) {
			console.error("Failed to dispatch filter change event", error);
		}
	}

	getSelectedCategories(): string[] {
		return [...this.selectedCategories];
	}

	getAvailableCategories(): string[] {
		return [...this.availableCategories];
	}

	isCategorySelected(category: string): boolean {
		return this.selectedCategories.includes(category);
	}

	toggleCategory(category: string): boolean {
		if (!this.ready || !this.availableCategories.includes(category)) {
			return false;
		}
		if (this.isCategorySelected(category)) {
			const next = this.selectedCategories.filter(
				(current) => current !== category,
			);
			return this.updateSelection(next);
		}
		const next = [...this.selectedCategories, category];
		return this.updateSelection(next);
	}

	selectAll(): boolean {
		if (!this.ready) {
			return false;
		}
		return this.updateSelection([...this.availableCategories]);
	}

	selectNone(): boolean {
		if (!this.ready) {
			return false;
		}
		return this.updateSelection([]);
	}

	isReady(): boolean {
		return this.ready;
	}

	shouldIncludeCategory(category: string): boolean {
		if (!this.ready) {
			return true;
		}
		if (!this.selectedCategories.length) {
			return false;
		}
		return this.selectedCategories.includes(category);
	}

	filterEntries<T extends FilterEntry>(entries: T[]): T[] {
		if (!Array.isArray(entries)) {
			return [];
		}
		if (!this.ready) {
			return [...entries];
		}
		if (!this.selectedCategories.length) {
			return [];
		}
		return entries.filter((entry) =>
			this.shouldIncludeCategory(entry.category),
		);
	}
}
