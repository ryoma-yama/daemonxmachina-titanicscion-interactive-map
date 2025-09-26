// Collection state management - localStorage and state handling

import { getDefaultMapId, isValidMapId } from "./map-definitions.js";
import { validateMarkerId } from "./validation.js";

export class CollectionManager {
	/**
	 * @param {import("./types").MapId} [mapId]
	 */
	constructor(mapId = getDefaultMapId()) {
		/** @type {import("./types").MapId} */
		this.mapId = this.validateMapId(mapId);
		this.storageKey = `collect-map:v1:${this.mapId}`;
		/** @type {import("./types").CollectionState} */
		this.collectedItems = this.loadFromStorage();
	}

	/**
	 * Validate map ID
	 * @param {unknown} mapId
	 * @returns {import("./types").MapId}
	 */
	validateMapId(mapId) {
		if (!isValidMapId(mapId)) {
			console.warn(
				`Invalid mapId: ${mapId}, defaulting to '${getDefaultMapId()}'`,
			);
			return getDefaultMapId();
		}
		return mapId;
	}

	/**
	 * @returns {import("./types").CollectionState}
	 */
	loadFromStorage() {
		try {
			const stored = localStorage.getItem(this.storageKey);
			if (!stored) {
				return {};
			}

			const parsed = JSON.parse(stored);

			// Type check: ensure it's an object and not null
			if (
				typeof parsed !== "object" ||
				parsed === null ||
				Array.isArray(parsed)
			) {
				console.warn(
					"Invalid localStorage data format, resetting to empty object",
				);
				this.clearStorage();
				return {};
			}

			// Properties validation
			/** @type {import("./types").CollectionState} */
			const validated = {};
			for (const [key, value] of Object.entries(parsed)) {
				// Marker ID validation and value type check
				if (validateMarkerId(key) && typeof value === "boolean") {
					validated[key] = value;
				} else {
					console.warn(`Skipping invalid localStorage entry: ${key}=${value}`);
				}
			}

			return validated;
		} catch (error) {
			console.error("Error loading collection data:", error);
			this.clearStorage();
			return {};
		}
	}

	/**
	 * @returns {boolean}
	 */
	saveToStorage() {
		try {
			// Data size limit (under 5MB)
			const jsonString = JSON.stringify(this.collectedItems);
			if (jsonString.length > 5 * 1024 * 1024) {
				console.error("Collection data too large for localStorage");
				return false;
			}

			localStorage.setItem(this.storageKey, jsonString);
			return true;
		} catch (error) {
			console.error("Error saving collection data:", error);
			// In case of storage quota error, clear old data
			if (error.name === "QuotaExceededError") {
				this.clearStorage();
			}
			return false;
		}
	}

	/**
	 * Clear storage data
	 */
	clearStorage() {
		try {
			localStorage.removeItem(this.storageKey);
		} catch (error) {
			console.error("Error clearing storage:", error);
		}
	}

	/**
	 * @param {import("./types").MarkerId} markerId
	 * @returns {boolean}
	 */
	isCollected(markerId) {
		if (!validateMarkerId(markerId)) {
			return false;
		}
		return Boolean(this.collectedItems[markerId]);
	}

	/**
	 * @param {import("./types").MarkerId} markerId
	 * @returns {boolean}
	 */
	toggleCollection(markerId) {
		if (!validateMarkerId(markerId)) {
			console.error(`Invalid marker ID: ${markerId}`);
			return false;
		}

		this.collectedItems[markerId] = !this.isCollected(markerId);
		const saved = this.saveToStorage();

		if (!saved) {
			// If save failed, revert memory changes
			this.collectedItems[markerId] = !this.collectedItems[markerId];
			return false;
		}

		return this.collectedItems[markerId];
	}

	/**
	 * @param {import("./types").MarkerId} markerId
	 * @param {boolean} isCollected
	 * @returns {boolean}
	 */
	setCollected(markerId, isCollected) {
		if (!validateMarkerId(markerId)) {
			console.error(`Invalid marker ID: ${markerId}`);
			return false;
		}

		this.collectedItems[markerId] = Boolean(isCollected);
		return this.saveToStorage();
	}
}
