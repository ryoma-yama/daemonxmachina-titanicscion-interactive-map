// Application controller - Coordinator between all components

import { CollectionManager } from "./collection-store.js";
import {
	getAllMapIds,
	getInitialMapId,
	getMapDefinition,
	saveSelectedMap,
} from "./map-definitions.js";
import { MapView } from "./map-view.js";

export class AppController {
	constructor() {
		this.currentMapId = getInitialMapId();
		this.collectionManagers = new Map();

		// Initialize collection managers for all maps
		getAllMapIds().forEach((mapId) => {
			this.collectionManagers.set(mapId, new CollectionManager(mapId));
		});

		// Initialize map view with callbacks
		this.mapView = new MapView("map", {
			onMarkerToggle: (markerId) => this.handleMarkerToggle(markerId),
			onMapSwitch: (mapId) => this.handleMapNavigation(mapId),
			onRecordingModeToggle: (isRecording) =>
				this.handleRecordingModeToggle(isRecording),
		});

		// Load initial map
		this.switchToMap(this.currentMapId);
	}

	getCurrentCollectionManager() {
		return this.collectionManagers.get(this.currentMapId);
	}

	switchToMap(mapId) {
		const mapDefinition = getMapDefinition(mapId);
		if (!mapDefinition) {
			console.error(`Map definition not found for: ${mapId}`);
			return;
		}

		console.log(`Switching to map: ${mapId}`);

		// Update current map ID
		this.currentMapId = mapId;

		// Load map in view
		this.mapView.loadMap(mapDefinition, mapId);

		// Load markers with collection state
		const collectionManager = this.getCurrentCollectionManager();
		this.mapView.loadMarkers(mapDefinition.markersPath, collectionManager);
	}

	handleMarkerToggle(markerId) {
		const collectionManager = this.getCurrentCollectionManager();
		const isNowCollected = collectionManager.toggleCollection(markerId);
		console.log(`Marker ${markerId} collection status: ${isNowCollected}`);

		// Update marker appearance in view
		this.mapView.updateMarkerState(markerId, isNowCollected);
	}

	handleMapNavigation(mapId) {
		if (mapId !== this.currentMapId) {
			this.switchToMap(mapId);

			// Save selected map to localStorage for next session
			saveSelectedMap(mapId);
		}
	}
}
