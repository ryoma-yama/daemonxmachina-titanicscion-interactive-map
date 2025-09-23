// Application controller - Coordinator between all components

import { CollectionManager } from "./collection-store.js";
import {
	getAllMapIds,
	getInitialMapId,
	getMapDefinition,
	saveSelectedMap,
} from "./map-definitions.js";
import { MapView } from "./map-view.js";
import {
	loadHideCollectedPreference,
	saveHideCollectedPreference,
} from "./preferences-store.js";
import { SearchPanel } from "./search-panel.js";
import { parseUrlState, updateUrlState } from "./url-state.js";

export class AppController {
	constructor() {
		this.urlState = parseUrlState();
		this.currentMapId = this.urlState.mapId || getInitialMapId();
		this.collectionManagers = new Map();
		this.markerLoadPromise = Promise.resolve(false);
		this.hideCollected = loadHideCollectedPreference();

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

		this.searchPanel = new SearchPanel({ appController: this });
		this.searchPanel.setHideCollectedState(this.hideCollected);

		// Load initial map and optionally focus marker from URL state
		void this.switchToMap(this.currentMapId, {
			focusMarkerId: this.urlState.markerId,
			zoom: this.urlState.zoom,
			skipUrlUpdate: true,
		});
	}

	getCurrentCollectionManager() {
		return this.collectionManagers.get(this.currentMapId);
	}

	async switchToMap(mapId, options = {}) {
		const { focusMarkerId, zoom, skipUrlUpdate = false, panOffset } = options;

		const mapDefinition = getMapDefinition(mapId);
		if (!mapDefinition) {
			console.error(`Map definition not found for: ${mapId}`);
			return;
		}

		console.log(`Switching to map: ${mapId}`);

		this.currentMapId = mapId;
		this.mapView.loadMap(mapDefinition, mapId);

		const collectionManager = this.getCurrentCollectionManager();
		this.mapView.setHideCollected(this.hideCollected, collectionManager);
		this.markerLoadPromise = this.mapView.loadMarkers(
			mapDefinition.markersPath,
			collectionManager,
		);
		const markersLoaded = await this.markerLoadPromise;

		let focused = false;
		if (markersLoaded && focusMarkerId) {
			focused = this.mapView.focusMarker(focusMarkerId, {
				zoom,
				panOffset,
			});
			if (!focused) {
				console.warn(`Marker ${focusMarkerId} not found on map ${mapId}`);
			}
		} else if (focusMarkerId && !markersLoaded) {
			console.warn(
				`Markers failed to load for ${mapId}, unable to focus ${focusMarkerId}`,
			);
		}

		saveSelectedMap(mapId);

		if (!skipUrlUpdate) {
			if (focusMarkerId && focused) {
				const zoomToPersist =
					typeof zoom === "number" && Number.isFinite(zoom)
						? zoom
						: this.mapView.getZoomLevel();
				updateUrlState({
					mapId,
					markerId: focusMarkerId,
					zoom: zoomToPersist,
				});
			} else {
				updateUrlState({ mapId, markerId: null, zoom: null });
			}
		}
	}

	handleMarkerToggle(markerId) {
		const collectionManager = this.getCurrentCollectionManager();
		const isNowCollected = collectionManager.toggleCollection(markerId);
		console.log(`Marker ${markerId} collection status: ${isNowCollected}`);

		this.mapView.updateMarkerState(markerId, isNowCollected);
		if (this.hideCollected) {
			void this.searchPanel.refreshResults();
		}
	}

	handleMapNavigation(mapId) {
		if (mapId !== this.currentMapId) {
			void this.switchToMap(mapId);
			saveSelectedMap(mapId);
		}
	}

	handleRecordingModeToggle(_isRecording) {
		// Intentionally left blank; implement if needed
	}

	getHideCollected() {
		return this.hideCollected;
	}

	setHideCollected(hideCollected) {
		const normalized = Boolean(hideCollected);
		const previous = this.hideCollected;
		this.hideCollected = normalized;
		if (previous !== normalized) {
			saveHideCollectedPreference(normalized);
		}

		const collectionManager = this.getCurrentCollectionManager();
		if (collectionManager) {
			this.mapView.setHideCollected(normalized, collectionManager);
		}

		if (this.searchPanel) {
			this.searchPanel.setHideCollectedState(normalized);
		}
	}

	isMarkerCollected(mapId, markerId) {
		const manager = this.collectionManagers.get(mapId);
		return manager ? manager.isCollected(markerId) : false;
	}

	async focusMarkerOnCurrentMap(markerId, options = {}) {
		const markersLoaded = await this.markerLoadPromise;
		if (!markersLoaded) {
			console.warn(
				`Markers not loaded for ${this.currentMapId}, cannot focus ${markerId}`,
			);
			return false;
		}

		const focused = this.mapView.focusMarker(markerId, options);
		if (!focused) {
			console.warn(
				`Marker ${markerId} not found on current map ${this.currentMapId}`,
			);
		}
		return focused;
	}
}
