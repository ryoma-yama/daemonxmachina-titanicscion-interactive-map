// Map definitions - Static data only

// Default configuration constants
export const DEFAULT_MAP_ID = "desert";
export const LAST_MAP_STORAGE_KEY = "last-selected-map:v1";

// Get base URL for assets (handles both dev and production builds)
const getAssetPath = (path) => {
	const baseUrl = import.meta.env.BASE_URL || "/";
	return baseUrl.endsWith("/") ? baseUrl + path.slice(1) : baseUrl + path;
};

export const mapDefinitions = {
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
};

/**
 * Get map definition by ID
 */
export function getMapDefinition(mapId) {
	return mapDefinitions[mapId] || null;
}

/**
 * Get all available map IDs
 */
export function getAllMapIds() {
	return Object.keys(mapDefinitions);
}

/**
 * Validate map ID
 */
export function isValidMapId(mapId) {
	return mapId && Object.hasOwn(mapDefinitions, mapId);
}

/**
 * Get default map ID
 */
export function getDefaultMapId() {
	return DEFAULT_MAP_ID;
}

/**
 * Get last selected map from localStorage, fallback to default
 */
export function getInitialMapId() {
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

/**
 * Save map selection to localStorage
 */
export function saveSelectedMap(mapId) {
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
