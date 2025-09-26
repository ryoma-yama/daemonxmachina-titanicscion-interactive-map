import L from "leaflet";
import { categoryItemLabels } from "./constants.js";
import { createCategoryIcon } from "./icons.js";
import type {
	CollectionStore,
	MapDefinition,
	MapId,
	MapViewCallbacks,
	MarkerCategory,
	MarkerFeature,
	MarkerFeatureCollection,
	MarkerFocusOptions,
	MarkerId,
	MarkerShareOptions,
} from "./types";
import { createShareUrl } from "./url-state.js";
import { validateGeoJSONFeature } from "./validation.js";

interface FocusOptions extends MarkerFocusOptions {
	panOffset?: [number, number];
}

interface PopupRenderContext {
	feature: MarkerFeature;
	collectionState: CollectionStore;
}

const MARKER_LAYER_STYLE = {
	maxWidth: 280,
	minWidth: 220,
	autoPan: true,
	autoPanPadding: [10, 10] as [number, number],
	closeButton: true,
	autoClose: false,
	keepInView: true,
	offset: [0, -10] as [number, number],
};

export class MapView {
	private callbacks: MapViewCallbacks;

	private currentMapId: MapId | null;

	private markerRefs: Map<MarkerId, L.Marker>;

	private currentImageOverlay: L.ImageOverlay | null;

	private currentMarkerLayer: L.GeoJSON | null;

	private markerFetchToken: symbol | null;

	private currentCollectionState: CollectionStore | null;

	private hideCollected: boolean;

	private activeCategories: Set<MarkerCategory> | null;

	private forcedVisibleMarkers: Set<MarkerId>;

	private isRecordingMode: boolean;

	private readonly RECORDING_MODE_KEY = "KeyR";

	private map: L.Map;

	constructor(containerId: string, callbacks: MapViewCallbacks = {}) {
		this.callbacks = callbacks;
		this.currentMapId = null;
		this.markerRefs = new Map();
		this.currentImageOverlay = null;
		this.currentMarkerLayer = null;
		this.markerFetchToken = null;
		this.currentCollectionState = null;
		this.hideCollected = false;
		this.activeCategories = null;
		this.forcedVisibleMarkers = new Set();
		this.isRecordingMode = false;

		this.map = L.map(containerId, {
			crs: L.CRS.Simple,
			minZoom: -2,
			maxZoom: 2,
			zoomSnap: 0.25,
			zoomDelta: 0.25,
		});

		if (typeof window !== "undefined") {
			(
				window as typeof window & { __DXM_MAP_VIEW__?: MapView }
			).__DXM_MAP_VIEW__ = this;
		}

		this.setupEventListeners();
	}

	getLeafletMap(): L.Map {
		return this.map;
	}

	getZoomLevel(): number {
		return this.map.getZoom();
	}

	private setupEventListeners(): void {
		document.addEventListener("keydown", (event) => {
			const target = event.target as HTMLElement | null;
			if (
				target?.tagName === "INPUT" ||
				target?.tagName === "TEXTAREA" ||
				target?.isContentEditable
			) {
				return;
			}

			if (
				event.code === this.RECORDING_MODE_KEY &&
				event.shiftKey &&
				!event.ctrlKey &&
				!event.altKey &&
				!event.metaKey
			) {
				event.preventDefault();
				this.toggleRecordingMode();
			}
		});

		document.addEventListener("click", (event) => {
			const target = event.target as HTMLElement | null;
			const link = target?.closest<HTMLElement>(".map-link");
			if (link) {
				event.preventDefault();
				if (!link.classList.contains("current")) {
					const mapId = link.getAttribute("data-map");
					if (mapId && this.callbacks.onMapSwitch) {
						this.callbacks.onMapSwitch(mapId as MapId);
					}
				}
				return;
			}

			const shareButton =
				target?.closest<HTMLButtonElement>(".share-link-button");
			if (!shareButton) {
				return;
			}

			const markerId = shareButton.getAttribute(
				"data-marker-id",
			) as MarkerId | null;
			const mapId =
				(shareButton.getAttribute("data-map-id") as MapId | null) ||
				this.currentMapId;
			if (!markerId || !mapId) {
				return;
			}

			if (!navigator.clipboard?.writeText) {
				this.showNotification("Failed to copy link", { type: "error" });
				return;
			}

			const zoom = this.getZoomLevel();
			const shareUrl = createShareUrl({ mapId, markerId, zoom });

			navigator.clipboard
				.writeText(shareUrl)
				.then(() => {
					this.showNotification("Link copied!");
				})
				.catch(() => {
					this.showNotification("Failed to copy link", {
						type: "error",
					});
				});
		});

		document.addEventListener("change", (event) => {
			const target = event.target as HTMLInputElement | null;
			if (
				target?.type === "checkbox" &&
				target.hasAttribute("data-marker-id")
			) {
				const markerId = target.getAttribute(
					"data-marker-id",
				) as MarkerId | null;
				if (markerId && this.callbacks.onMarkerToggle) {
					this.callbacks.onMarkerToggle(markerId);
				}
			}
		});

		this.map.on("click", (event: L.LeafletMouseEvent) => {
			const x = Math.round(event.latlng.lng);
			const y = Math.round(event.latlng.lat);

			if (this.isRecordingMode) {
				const output = JSON.stringify({ mapId: this.currentMapId, x, y });
				console.log(output);

				const clipboardText = `${this.currentMapId} ${x} ${y} category "name" ""`;
				if (navigator.clipboard?.writeText) {
					navigator.clipboard
						.writeText(clipboardText)
						.then(() => {
							console.log(`Copied to clipboard: ${clipboardText}`);
							console.log(
								'Replace category, "name", and "" with actual values',
							);
							this.showNotification("Copied!");
						})
						.catch(() => {
							// Silent fail per original behaviour
						});
				}
			} else {
				console.log(`Clicked at: x=${x}, y=${y}`);
			}
		});
	}

	private toggleRecordingMode(): void {
		this.isRecordingMode = !this.isRecordingMode;
		this.updateRecordingBadge();
		console.log(`Recording mode: ${this.isRecordingMode ? "ON" : "OFF"}`);

		if (this.callbacks.onRecordingModeToggle) {
			this.callbacks.onRecordingModeToggle(this.isRecordingMode);
		}
	}

	private updateRecordingBadge(): void {
		const badge = document.getElementById("rec-badge");
		if (badge instanceof HTMLElement) {
			badge.style.display = this.isRecordingMode ? "block" : "none";
		}
	}

	showNotification(
		message: string,
		{ type = "info" }: { type?: "info" | "error" } = {},
	): void {
		const notification = document.createElement("div");
		const classes = ["notification-toast"];
		if (type === "error") {
			classes.push("notification-toast--error");
		}
		notification.className = classes.join(" ");
		notification.textContent = message;

		document.body.appendChild(notification);

		setTimeout(() => {
			notification.classList.add("show");
		}, 10);

		setTimeout(() => {
			notification.classList.remove("show");
			setTimeout(() => {
				notification.remove();
			}, 300);
		}, 2000);
	}

	private getMarkerSize(): number {
		return window.innerWidth <= 768 ? 32 : 28;
	}

	private updateMapTitle(mapId: MapId): void {
		const mapLinks = document.querySelectorAll<HTMLElement>(".map-link");
		mapLinks.forEach((link) => {
			const linkMapId = link.getAttribute("data-map") as MapId | null;
			if (linkMapId === mapId) {
				link.classList.add("current");
				link.setAttribute("aria-current", "page");
			} else {
				link.classList.remove("current");
				link.removeAttribute("aria-current");
			}
		});
	}

	private clearCurrentMap(): void {
		if (this.currentImageOverlay) {
			this.map.removeLayer(this.currentImageOverlay);
			this.currentImageOverlay = null;
		}

		if (this.currentMarkerLayer) {
			this.map.removeLayer(this.currentMarkerLayer);
			this.currentMarkerLayer = null;
		}

		this.markerRefs.clear();
		this.currentCollectionState = null;
		this.forcedVisibleMarkers.clear();
	}

	loadMap(mapDefinition: MapDefinition, mapId: MapId): void {
		console.log(`Loading map: ${mapId}`);

		this.currentMapId = mapId;

		this.updateMapTitle(mapId);

		this.clearCurrentMap();

		this.currentImageOverlay = L.imageOverlay(
			mapDefinition.imagePath,
			mapDefinition.bounds,
		);
		this.currentImageOverlay.addTo(this.map);

		this.map.fitBounds(mapDefinition.bounds, {
			padding: [20, 20],
			maxZoom: 1.5,
		});
	}

	async loadMarkers(
		markersPath: string,
		collectionState: CollectionStore,
	): Promise<boolean> {
		const fetchToken = Symbol("markerFetch");
		this.markerFetchToken = fetchToken;
		this.currentCollectionState = collectionState;

		try {
			const response = await fetch(markersPath);
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}
			const data = (await response.json()) as unknown;

			if (
				!data ||
				typeof data !== "object" ||
				(data as { type?: string }).type !== "FeatureCollection" ||
				!Array.isArray((data as { features?: unknown[] }).features)
			) {
				throw new Error("Invalid GeoJSON structure");
			}

			if (this.markerFetchToken !== fetchToken) {
				return false;
			}

			const validFeatures: MarkerFeature[] = [];
			(data as { features: unknown[] }).features.forEach((feature, index) => {
				if (validateGeoJSONFeature(feature)) {
					validFeatures.push(feature);
				} else {
					console.warn(`Skipping invalid feature at index ${index}:`, feature);
				}
			});

			console.log(
				`Loaded ${validFeatures.length} valid features out of ${
					(data as { features: unknown[] }).features.length
				} total for ${this.currentMapId}`,
			);

			if (this.markerFetchToken !== fetchToken) {
				return false;
			}

			const validData: MarkerFeatureCollection = {
				type: "FeatureCollection",
				features: validFeatures,
			};

			this.markerRefs.clear();
			this.currentMarkerLayer = L.geoJSON(validData, {
				pointToLayer: (feature, latlng) => {
					const typedFeature = feature as MarkerFeature;
					const isCollected = collectionState.isCollected(
						typedFeature.properties.id,
					);
					const markerSize = this.getMarkerSize();
					const marker = L.marker(latlng, {
						icon: createCategoryIcon(
							typedFeature.properties.category,
							markerSize,
							isCollected,
							typedFeature.properties.id,
						),
						interactive: true,
						bubblingMouseEvents: false,
					});

					(marker as L.Marker & { feature?: MarkerFeature }).feature =
						typedFeature;
					this.markerRefs.set(typedFeature.properties.id, marker);

					return marker;
				},
				onEachFeature: (feature, layer) => {
					const typedFeature = feature as MarkerFeature;
					const popupContent = this.createPopupContent({
						feature: typedFeature,
						collectionState,
					});

					const popupOptions = { ...MARKER_LAYER_STYLE };
					if (window.innerWidth <= 768) {
						popupOptions.autoPanPadding = [20, 20];
						popupOptions.maxWidth = 300;
					}

					layer.bindPopup(popupContent, popupOptions);
				},
			});

			if (this.markerFetchToken !== fetchToken) {
				return false;
			}

			this.applyVisibilityFilters();
			this.currentMarkerLayer.addTo(this.map);
			console.log(
				`GeoJSON markers loaded successfully for ${this.currentMapId}`,
			);
			return true;
		} catch (error) {
			console.error("Failed to load markers:", error);
			return false;
		}
	}

	private createPopupContent({
		feature,
		collectionState,
	}: PopupRenderContext): HTMLDivElement {
		const container = document.createElement("div");
		container.className = "marker-popup";
		container.setAttribute("data-marker-id", feature.properties.id);

		const header = document.createElement("div");
		header.className = "marker-popup__header";

		const title = document.createElement("h3");
		title.className = "marker-popup__title";
		title.textContent = feature.properties.name || feature.properties.id;

                const checkboxLabel = document.createElement("label");
                checkboxLabel.className = "marker-popup__checkbox-label checkbox-label";

                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.className = "marker-popup__checkbox";
                checkbox.checked = collectionState.isCollected(feature.properties.id);
                checkbox.setAttribute("data-marker-id", feature.properties.id);

                const checkboxText = document.createElement("span");
                checkboxText.textContent = "Collected";

                checkboxLabel.appendChild(checkbox);
                checkboxLabel.appendChild(checkboxText);

                const shareButton = document.createElement("button");
                shareButton.type = "button";
                shareButton.className = "share-link-button";
                shareButton.setAttribute("aria-label", "Copy marker link");
                shareButton.setAttribute("data-marker-id", feature.properties.id);
                if (this.currentMapId) {
                        shareButton.setAttribute("data-map-id", this.currentMapId);
                }

                const tooltipId = `share-tooltip-${feature.properties.id}`;
                shareButton.setAttribute("aria-describedby", tooltipId);

                const iconSpan = document.createElement("span");
                iconSpan.className = "share-link-button__icon";
                shareButton.appendChild(iconSpan);

                const tooltip = document.createElement("span");
                tooltip.id = tooltipId;
                tooltip.className = "share-link-button__tooltip";
                tooltip.setAttribute("role", "tooltip");
                tooltip.textContent = "Copy link";
                shareButton.appendChild(tooltip);

                header.appendChild(title);
                header.appendChild(checkboxLabel);
                header.appendChild(shareButton);
                container.appendChild(header);

		if (feature.properties.description) {
			const description = document.createElement("p");
			description.className = "marker-popup__description";
			description.textContent = feature.properties.description;
			container.appendChild(description);
		}

		const items = feature.properties.items;
		if (Array.isArray(items) && items.length) {
			const section = document.createElement("section");
			section.className = "marker-popup__items";

			const sectionTitle = document.createElement("h4");
			sectionTitle.className = "marker-popup__items-title";
			const label = categoryItemLabels[feature.properties.category];
			sectionTitle.textContent = label || "Items";

			const list = document.createElement("ul");
			list.className = "marker-popup__items-list";
			items.forEach((item) => {
				if (typeof item !== "string") {
					return;
				}
				const listItem = document.createElement("li");
				listItem.textContent = item;
				list.appendChild(listItem);
			});

			section.appendChild(sectionTitle);
			section.appendChild(list);
			container.appendChild(section);
		}

		return container;
	}

	setHideCollected(hide: boolean, collectionState: CollectionStore): void {
		this.hideCollected = hide;
		this.currentCollectionState = collectionState;
		this.applyVisibilityFilters();
	}

	setActiveCategories(categories: string[]): void {
		this.activeCategories = new Set(categories as MarkerCategory[]);
		this.applyVisibilityFilters();
	}

        private applyVisibilityFilters(): void {
                if (!this.currentMarkerLayer) {
                        return;
                }

                this.markerRefs.forEach((_, markerId) => {
                        this.updateMarkerVisibility(markerId);
                });
        }

        private updateMarkerVisibility(markerId: MarkerId): void {
                if (!this.currentMarkerLayer) {
                        return;
                }

                const marker = this.markerRefs.get(markerId);
                if (!marker) {
                        return;
                }

                const feature = (marker as L.Marker & { feature?: MarkerFeature }).feature;
                if (!feature) {
                        return;
                }

                const category = feature.properties.category;
                const isForcedVisible = this.forcedVisibleMarkers.has(markerId);
                const categoryAllowed =
                        !this.activeCategories || this.activeCategories.has(category);
                const isCollected = this.currentCollectionState?.isCollected(markerId) ?? false;
                const shouldHide =
                        !isForcedVisible &&
                        (!categoryAllowed || (this.hideCollected && isCollected));
                const hasLayer = this.currentMarkerLayer.hasLayer(marker);

                if (shouldHide && hasLayer) {
                        this.currentMarkerLayer.removeLayer(marker);
                        marker.closePopup();
                } else if (!shouldHide && !hasLayer) {
                        this.currentMarkerLayer.addLayer(marker);
                }
        }

        private forceMarkerVisibility(markerId: MarkerId, shouldForce: boolean): void {
                if (!markerId) {
                        return;
                }

                if (shouldForce) {
                        this.forcedVisibleMarkers.clear();
                        this.forcedVisibleMarkers.add(markerId);
                } else {
                        this.forcedVisibleMarkers.delete(markerId);
                }

                this.updateMarkerVisibility(markerId);
        }

        focusMarker(markerId: MarkerId, options: FocusOptions = {}): boolean {
                const marker = this.markerRefs.get(markerId);
                if (!marker) {
                        return false;
                }

                if (options.forceVisibility) {
                        this.forceMarkerVisibility(markerId, true);
                } else if (
                        this.currentMarkerLayer &&
                        !this.currentMarkerLayer.hasLayer(marker)
                ) {
                        return false;
                }

                const latlng = marker.getLatLng();
                const zoom =
                        typeof options.zoom === "number" ? options.zoom : this.map.getZoom();

		if (options.panOffset) {
			const point = this.map.latLngToContainerPoint(latlng);
			const offsetPoint = L.point(
				point.x - options.panOffset[0],
				point.y - options.panOffset[1],
			);
			const newLatLng = this.map.containerPointToLatLng(offsetPoint);
			this.map.setView(newLatLng, zoom);
		} else {
			this.map.setView(latlng, zoom);
		}

		if (marker?.getPopup()) {
			marker.openPopup();
		}

		return true;
	}

	updateMarkerState(markerId: MarkerId, isCollected: boolean): void {
		const marker = this.markerRefs.get(markerId);
		if (!marker) {
			return;
		}
		const feature = (marker as L.Marker & { feature?: MarkerFeature }).feature;
		if (!feature) {
			return;
		}

		const markerSize = this.getMarkerSize();
		marker.setIcon(
			createCategoryIcon(
				feature.properties.category,
				markerSize,
				isCollected,
				feature.properties.id,
			),
		);

                this.updateMarkerVisibility(markerId);
        }

	highlightMarker(markerId: MarkerId): void {
		const marker = this.markerRefs.get(markerId);
		if (!marker) {
			return;
		}
		const element = marker.getElement();
		if (!element) {
			return;
		}
		element.classList.add("marker--highlighted");
		setTimeout(() => {
			element.classList.remove("marker--highlighted");
		}, 2000);
	}

	createShareOptions(markerId: MarkerId): MarkerShareOptions | null {
		if (!this.currentMapId) {
			return null;
		}
		const zoom = this.getZoomLevel();
		return {
			markerId,
			mapId: this.currentMapId,
			zoom,
		};
	}
}
