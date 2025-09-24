const DEFAULT_STORAGE_KEY = "filter-categories:v1";

function isStringArray(value) {
        return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function normalizeCategoryList(categories) {
        const result = [];
        const seen = new Set();
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

function sortCategoryList(categories) {
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

function createFilterChangedEvent(selectedCategories) {
        if (typeof CustomEvent === "function") {
                return new CustomEvent("filter:changed", {
                        detail: { selectedCategories: [...selectedCategories] },
                });
        }

        const event = new Event("filter:changed");
        event.detail = { selectedCategories: [...selectedCategories] };
        return event;
}

function getDefaultStorage() {
        if (typeof localStorage !== "undefined") {
                return localStorage;
        }
        return null;
}

function getDefaultEventTarget() {
        if (typeof document !== "undefined" && document instanceof EventTarget) {
                return document;
        }
        return null;
}

export const FILTER_STORAGE_KEY = DEFAULT_STORAGE_KEY;

export class FilterManager {
        constructor({
                storageKey = DEFAULT_STORAGE_KEY,
                storage = getDefaultStorage(),
                eventTarget = getDefaultEventTarget(),
        } = {}) {
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

        initializeCategories(categories) {
                const normalized = sortCategoryList(normalizeCategoryList(categories));
                this.availableCategories = normalized;

                let initial = this.initialSelection;
                if (!isStringArray(initial) || !initial.length) {
                        initial = [...normalized];
                } else {
                        initial = normalizeCategoryList(initial);
                        const allowed = new Set(normalized);
                        initial = initial.filter((category) => allowed.has(category));

                        if (isStringArray(this.initialKnownCategories)) {
                                const previouslyKnown = new Set(
                                        normalizeCategoryList(this.initialKnownCategories),
                                );
                                normalized.forEach((category) => {
                                        if (
                                                !initial.includes(category) &&
                                                !previouslyKnown.has(category)
                                        ) {
                                                initial.push(category);
                                        }
                                });
                        }
                }

                this.initialSelection = null;
                this.initialKnownCategories = null;
                this.ready = true;
                this.updateSelection(initial, { force: true });
        }

        readStoredSelection() {
                if (!this.storage || !this.storageKey) {
                        return null;
                }
                try {
                        const raw = this.storage.getItem(this.storageKey);
                        if (!raw) {
                                return null;
                        }
                        const parsed = JSON.parse(raw);
                        if (isStringArray(parsed)) {
                                return { selected: parsed, known: null };
                        }
                        if (
                                parsed &&
                                typeof parsed === "object" &&
                                isStringArray(parsed.selected)
                        ) {
                                const known = isStringArray(parsed.known)
                                        ? normalizeCategoryList(parsed.known)
                                        : null;
                                return {
                                        selected: normalizeCategoryList(parsed.selected),
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

        persistSelection() {
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

        updateSelection(nextSelection, { force = false } = {}) {
                const normalized = this.normalizeSelection(nextSelection);
                if (!force && this.areSelectionsEqual(this.selectedCategories, normalized)) {
                                return false;
                }

                this.selectedCategories = normalized;
                this.persistSelection();
                this.emitChange();
                return true;
        }

        normalizeSelection(selection) {
                const allowed = new Set(this.availableCategories);
                const source = Array.isArray(selection) ? selection : [];
                const filtered = [];
                this.availableCategories.forEach((category) => {
                        if (source.includes(category) && allowed.has(category)) {
                                filtered.push(category);
                        }
                });
                return filtered;
        }

        areSelectionsEqual(a, b) {
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

        emitChange() {
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

        getSelectedCategories() {
                return [...this.selectedCategories];
        }

        getAvailableCategories() {
                return [...this.availableCategories];
        }

        isCategorySelected(category) {
                return this.selectedCategories.includes(category);
        }

        toggleCategory(category) {
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

        selectAll() {
                if (!this.ready) {
                        return false;
                }
                return this.updateSelection([...this.availableCategories]);
        }

        selectNone() {
                if (!this.ready) {
                        return false;
                }
                return this.updateSelection([]);
        }

        isReady() {
                return this.ready;
        }

        shouldIncludeCategory(category) {
                if (!this.ready) {
                        return true;
                }
                if (!this.selectedCategories.length) {
                        return false;
                }
                return this.selectedCategories.includes(category);
        }

        filterEntries(entries) {
                if (!Array.isArray(entries)) {
                        return [];
                }
                if (!this.ready) {
                        return [...entries];
                }
                if (!this.selectedCategories.length) {
                        return [];
                }
                return entries.filter((entry) => this.shouldIncludeCategory(entry.category));
        }
}
