import { beforeEach, describe, expect, it } from "vitest";
import { FilterManager, FILTER_STORAGE_KEY } from "../src/filter-manager.js";

class MemoryStorage {
        constructor(initial = {}) {
                this.store = { ...initial };
        }

        getItem(key) {
                return Object.prototype.hasOwnProperty.call(this.store, key)
                        ? this.store[key]
                        : null;
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

                expect(manager.getSelectedCategories()).toEqual([
                        "music",
                        "card",
                        "enemy",
                ]);
                expect(storage.getItem(FILTER_STORAGE_KEY)).toBe(
                        JSON.stringify({
                                selected: ["music", "card", "enemy"],
                                known: ["music", "card", "enemy"],
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

                expect(manager.getSelectedCategories()).toEqual(["music", "card"]);
                expect(storage.getItem(FILTER_STORAGE_KEY)).toBe(
                        JSON.stringify({
                                selected: ["music", "card"],
                                known: ["music", "card"],
                        }),
                );
        });

        it("recovers from invalid stored value", () => {
                storage.setItem(FILTER_STORAGE_KEY, "not-json");
                const manager = new FilterManager({ storage, eventTarget });

                manager.initializeCategories(["boss", "npc"]);

                expect(manager.getSelectedCategories()).toEqual(["boss", "npc"]);
                expect(storage.getItem(FILTER_STORAGE_KEY)).toBe(
                        JSON.stringify({
                                selected: ["boss", "npc"],
                                known: ["boss", "npc"],
                        }),
                );
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
                expect(manager.getSelectedCategories()).toEqual(["card", "boss"]);

                manager.toggleCategory("music");
                expect(manager.getSelectedCategories()).toEqual([
                        "music",
                        "card",
                        "boss",
                ]);
        });

        it("selects none and then restores all", () => {
                manager.selectNone();
                expect(manager.getSelectedCategories()).toEqual([]);

                manager.selectAll();
                expect(manager.getSelectedCategories()).toEqual([
                        "music",
                        "card",
                        "boss",
                ]);
        });

        it("ignores invalid categories during toggle", () => {
                manager.toggleCategory("unknown");
                expect(manager.getSelectedCategories()).toEqual([
                        "music",
                        "card",
                        "boss",
                ]);
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

                expect(received).toEqual([
                        ["music", "card"],
                        ["music"],
                ]);
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
