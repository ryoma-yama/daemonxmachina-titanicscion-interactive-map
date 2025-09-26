import { getDefaultMapId, isValidMapId } from "./map-definitions.js";
import type {
	CollectionState,
	CollectionStore,
	MapId,
	MarkerId,
} from "./types";
import { validateMarkerId } from "./validation.js";

export class CollectionManager implements CollectionStore {
	private mapId: MapId;

	private storageKey: string;

	private collectedItems: CollectionState;

	constructor(mapId: MapId = getDefaultMapId()) {
		this.mapId = this.validateMapId(mapId);
		this.storageKey = `collect-map:v1:${this.mapId}`;
		this.collectedItems = this.loadFromStorage();
	}

	private validateMapId(mapId: unknown): MapId {
		if (!isValidMapId(mapId)) {
			console.warn(
				`Invalid mapId: ${mapId}, defaulting to '${getDefaultMapId()}'`,
			);
			return getDefaultMapId();
		}
		return mapId;
	}

	private loadFromStorage(): CollectionState {
		try {
			const stored = localStorage.getItem(this.storageKey);
			if (!stored) {
				return {};
			}

			const parsed = JSON.parse(stored) as unknown;
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

			const validated: CollectionState = {};
			for (const [key, value] of Object.entries(parsed)) {
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

	private saveToStorage(): boolean {
		try {
			const jsonString = JSON.stringify(this.collectedItems);
			if (jsonString.length > 5 * 1024 * 1024) {
				console.error("Collection data too large for localStorage");
				return false;
			}

			localStorage.setItem(this.storageKey, jsonString);
			return true;
		} catch (error) {
			console.error("Error saving collection data:", error);
			if ((error as DOMException)?.name === "QuotaExceededError") {
				this.clearStorage();
			}
			return false;
		}
	}

	clearStorage(): void {
		try {
			localStorage.removeItem(this.storageKey);
		} catch (error) {
			console.error("Error clearing storage:", error);
		}
	}

	isCollected(markerId: MarkerId): boolean {
		if (!validateMarkerId(markerId)) {
			return false;
		}
		return Boolean(this.collectedItems[markerId]);
	}

	toggleCollection(markerId: MarkerId): boolean {
		if (!validateMarkerId(markerId)) {
			console.error(`Invalid marker ID: ${markerId}`);
			return false;
		}

		this.collectedItems[markerId] = !this.isCollected(markerId);
		const saved = this.saveToStorage();

		if (!saved) {
			this.collectedItems[markerId] = !this.collectedItems[markerId];
			return false;
		}

		return this.collectedItems[markerId];
	}

	setCollected(markerId: MarkerId, isCollected: boolean): boolean {
		if (!validateMarkerId(markerId)) {
			console.error(`Invalid marker ID: ${markerId}`);
			return false;
		}

		this.collectedItems[markerId] = Boolean(isCollected);
		return this.saveToStorage();
	}
}
