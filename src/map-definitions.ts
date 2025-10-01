import { getAssetPath } from "./asset-path.js";
import type { MapDefinition, MapDefinitions, MapId } from "./types";

export const DEFAULT_MAP_ID: MapId = "desert";
export const LAST_MAP_STORAGE_KEY = "last-selected-map:v1";

export const mapDefinitions: MapDefinitions = {
	forest: {
		name: "Forest Map",
		imagePath: getAssetPath("/assets/maps/forest.jpg"),
		bounds: [
			[0, 0],
			[1230, 1230],
		],
		markersPath: getAssetPath("/assets/data/markers/forest.geojson"),
	},
	desert: {
		name: "Desert Map",
		imagePath: getAssetPath("/assets/maps/desert.jpg"),
		bounds: [
			[0, 0],
			[1230, 1230],
		],
		markersPath: getAssetPath("/assets/data/markers/desert.geojson"),
	},
	mountains: {
		name: "Mountains Map",
		imagePath: getAssetPath("/assets/maps/mountains.jpg"),
		bounds: [
			[0, 0],
			[1230, 1230],
		],
		markersPath: getAssetPath("/assets/data/markers/mountains.geojson"),
	},
	garden: {
		name: "Garden Map",
		imagePath: getAssetPath("/assets/maps/garden.jpg"),
		bounds: [
			[0, 0],
			[1230, 1230],
		],
		markersPath: getAssetPath("/assets/data/markers/garden.geojson"),
	},
};

export function getMapDefinition(mapId: MapId): MapDefinition | null {
	return mapDefinitions[mapId] ?? null;
}

export function getAllMapIds(): MapId[] {
	return Object.keys(mapDefinitions) as MapId[];
}

export function isValidMapId(mapId: unknown): mapId is MapId {
	return typeof mapId === "string" && Object.hasOwn(mapDefinitions, mapId);
}

export function getDefaultMapId(): MapId {
	return DEFAULT_MAP_ID;
}

export function getInitialMapId(): MapId {
	try {
		const stored = localStorage.getItem(LAST_MAP_STORAGE_KEY);
		if (stored && isValidMapId(stored)) {
			return stored;
		}
	} catch (error) {
		console.warn(
			"Failed to retrieve last selected map from localStorage:",
			error,
		);
	}

	return DEFAULT_MAP_ID;
}

export function saveSelectedMap(mapId: MapId): boolean {
	if (!isValidMapId(mapId)) {
		console.error(`Invalid map ID: ${mapId}`);
		return false;
	}

	try {
		localStorage.setItem(LAST_MAP_STORAGE_KEY, mapId);
		return true;
	} catch (error) {
		console.error("Failed to save selected map to localStorage:", error);
		return false;
	}
}
