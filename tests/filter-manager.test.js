import { beforeEach, describe, expect, it, vi } from "vitest";
import { FILTER_STORAGE_KEY, FilterManager } from "../src/filter-manager.js";

class MemoryStorage {
	constructor(initial = {}) {
		this.store = { ...initial };
	}

	getItem(key) {
		return Object.hasOwn(this.store, key) ? this.store[key] : null;
	}

	setItem(key, value) {
		this.store[key] = String(value);
	}

	removeItem(key) {
		delete this.store[key];
	}

	clear() {
		this.store = {};
	}
}

describe("FilterManager storage handling", () => {
	let storage;
	let eventTarget;

	beforeEach(() => {
		storage = new MemoryStorage();
		eventTarget = new EventTarget();
	});

	it("initializes with all categories when storage is empty", () => {
		const manager = new FilterManager({ storage, eventTarget });

		manager.initializeCategories(["music", "card", "enemy"]);

		expect(manager.getSelectedCategories()).toEqual(["card", "enemy", "music"]);
		expect(storage.getItem(FILTER_STORAGE_KEY)).toBe(
			JSON.stringify({
				selected: ["card", "enemy", "music"],
				known: ["card", "enemy", "music"],
			}),
		);
	});

	it("restores valid selection and includes new categories", () => {
		storage.setItem(
			FILTER_STORAGE_KEY,
			JSON.stringify({ selected: ["music"], known: ["music"] }),
		);
		const manager = new FilterManager({ storage, eventTarget });

		manager.initializeCategories(["music", "card"]);

		expect(manager.getSelectedCategories()).toEqual(["card", "music"]);
		expect(storage.getItem(FILTER_STORAGE_KEY)).toBe(
			JSON.stringify({
				selected: ["card", "music"],
				known: ["card", "music"],
			}),
		);
	});

	it("recovers from invalid stored value", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

		storage.setItem(FILTER_STORAGE_KEY, "not-json");
		const manager = new FilterManager({ storage, eventTarget });

		manager.initializeCategories(["boss", "duelist"]);

		expect(manager.getSelectedCategories()).toEqual(["boss", "duelist"]);
		expect(storage.getItem(FILTER_STORAGE_KEY)).toBe(
			JSON.stringify({
				selected: ["boss", "duelist"],
				known: ["boss", "duelist"],
			}),
		);

		warnSpy.mockRestore();
	});

	it("sorts categories alphabetically regardless of input order", () => {
		const manager = new FilterManager({ storage, eventTarget });

		manager.initializeCategories(["decal", "Music", "card", "boss"]);

		expect(manager.getAvailableCategories()).toEqual([
			"boss",
			"card",
			"decal",
			"Music",
		]);
		expect(manager.getSelectedCategories()).toEqual([
			"boss",
			"card",
			"decal",
			"Music",
		]);
	});
});

describe("FilterManager state transitions", () => {
	let manager;
	let storage;
	let eventTarget;

	beforeEach(() => {
		storage = new MemoryStorage();
		eventTarget = new EventTarget();
		manager = new FilterManager({ storage, eventTarget });
		manager.initializeCategories(["music", "card", "boss"]);
	});

	it("toggles individual categories", () => {
		manager.toggleCategory("music");
		expect(manager.getSelectedCategories()).toEqual(["boss", "card"]);

		manager.toggleCategory("music");
		expect(manager.getSelectedCategories()).toEqual(["boss", "card", "music"]);
	});

	it("selects none and then restores all", () => {
		manager.selectNone();
		expect(manager.getSelectedCategories()).toEqual([]);

		manager.selectAll();
		expect(manager.getSelectedCategories()).toEqual(["boss", "card", "music"]);
	});

	it("ignores invalid categories during toggle", () => {
		manager.toggleCategory("unknown");
		expect(manager.getSelectedCategories()).toEqual(["boss", "card", "music"]);
	});
});

describe("FilterManager event dispatch", () => {
	it("emits filter:changed with selected categories", () => {
		const storage = new MemoryStorage();
		const eventTarget = new EventTarget();
		const received = [];
		eventTarget.addEventListener("filter:changed", (event) => {
			received.push(event.detail?.selectedCategories);
		});

		const manager = new FilterManager({ storage, eventTarget });
		manager.initializeCategories(["music", "card"]);
		manager.toggleCategory("card");

		expect(received).toEqual([["card", "music"], ["music"]]);
	});
});

describe("FilterManager filtering helpers", () => {
	it("filters entries by selected categories", () => {
		const storage = new MemoryStorage();
		const eventTarget = new EventTarget();
		const manager = new FilterManager({ storage, eventTarget });
		manager.initializeCategories(["music", "card", "boss"]);
		manager.toggleCategory("card");

		const entries = [
			{ id: "a", category: "music" },
			{ id: "b", category: "card" },
			{ id: "c", category: "boss" },
		];

		expect(manager.filterEntries(entries)).toEqual([
			{ id: "a", category: "music" },
			{ id: "c", category: "boss" },
		]);
	});
});
