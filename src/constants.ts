import categoryColors from "./data/category-colors.json";
import type { MarkerCategory } from "./types";

export const colors = categoryColors satisfies Record<MarkerCategory, string>;

export const categoryItemLabels: Partial<Record<MarkerCategory, string>> = {
	duelist: "Rewards",
	enemy: "Drops",
	dungeon: "Loot",
	shop: "Items",
};
