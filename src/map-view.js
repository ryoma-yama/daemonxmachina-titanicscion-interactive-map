// Leaflet display functionality - View layer only

import L from "leaflet";
import { createCategoryIcon } from "./icons.js";
import { validateGeoJSONFeature } from "./validation.js";

export class MapView {
	constructor(containerId, callbacks = {}) {
		this.containerId = containerId;
		this.callbacks = callbacks;
		this.currentMapId = null;
		this.markerRefs = new Map();
		this.currentImageOverlay = null;
		this.currentMarkerLayer = null;

		// Recording mode state
		this.isRecordingMode = false;
		this.RECORDING_MODE_KEY = "KeyR"; // R key for Shift+R combination

		// Initialize Leaflet map
		this.map = L.map(containerId, {
			crs: L.CRS.Simple,
			minZoom: -2,
			maxZoom: 2,
		});

		this.setupEventListeners();
	}

	setupEventListeners() {
		// Recording mode toggle (Shift+R)
		document.addEventListener("keydown", (e) => {
			// Skip if input element has focus
			if (
				e.target.tagName === "INPUT" ||
				e.target.tagName === "TEXTAREA" ||
				e.target.isContentEditable
			) {
				return;
			}

			if (
				e.code === this.RECORDING_MODE_KEY &&
				e.shiftKey &&
				!e.ctrlKey &&
				!e.altKey &&
				!e.metaKey
			) {
				e.preventDefault();
				this.toggleRecordingMode();
			}
		});

		// Map navigation link click events
		document.addEventListener("click", (e) => {
			const link = e.target.closest(".map-link");
			if (link) {
				e.preventDefault();
				if (!link.classList.contains("current")) {
					const mapId = link.getAttribute("data-map");
					if (this.callbacks.onMapSwitch) {
						this.callbacks.onMapSwitch(mapId);
					}
				}
			}
		});

		// Event delegation for popup checkbox interactions
		document.addEventListener("change", (e) => {
			if (
				e.target.type === "checkbox" &&
				e.target.hasAttribute("data-marker-id")
			) {
				const markerId = e.target.getAttribute("data-marker-id");
				if (this.callbacks.onMarkerToggle) {
					this.callbacks.onMarkerToggle(markerId);
				}
			}
		});

		// Map click handler (debug coordinates + recording mode)
		this.map.on("click", (e) => {
			const x = Math.round(e.latlng.lng); // horizontal
			const y = Math.round(e.latlng.lat); // vertical

			if (this.isRecordingMode) {
				// Recording mode: Output JSON and copy to clipboard
				const output = JSON.stringify({ mapId: this.currentMapId, x: x, y: y });
				console.log(output);

				// Copy to clipboard in simple format for GitHub issues
				// Format: {map_id} {x} {y} {category} "{name}" "{description}"
				const clipboardText = `${this.currentMapId} ${x} ${y} <category> "<name>" ""`;
				if (navigator.clipboard?.writeText) {
					navigator.clipboard
						.writeText(clipboardText)
						.then(() => {
							console.log(`Copied to clipboard: ${clipboardText}`);
							console.log(
								'Replace <category>, "<name>", and "" with actual values',
							);
							this.showNotification("Copied!");
						})
						.catch(() => {
							// Silent fail - no fallback as per requirements
						});
				}
			} else {
				// Debug mode: Simple coordinate output
				console.log(`Clicked at: x=${x}, y=${y}`);
			}
		});
	}

	toggleRecordingMode() {
		this.isRecordingMode = !this.isRecordingMode;
		this.updateRecordingBadge();
		console.log(`Recording mode: ${this.isRecordingMode ? "ON" : "OFF"}`);

		if (this.callbacks.onRecordingModeToggle) {
			this.callbacks.onRecordingModeToggle(this.isRecordingMode);
		}
	}

	updateRecordingBadge() {
		const badge = document.getElementById("rec-badge");
		if (badge) {
			badge.style.display = this.isRecordingMode ? "block" : "none";
		}
	}

	showNotification(message) {
		// Create notification element
		const notification = document.createElement("div");
		notification.className = "notification-toast";
		notification.textContent = message;

		// Add to DOM
		document.body.appendChild(notification);

		// Trigger fade-in animation
		setTimeout(() => {
			notification.classList.add("show");
		}, 10);

		// Remove notification after 3 seconds
		setTimeout(() => {
			notification.classList.remove("show");
			// Remove from DOM after fade-out animation completes
			setTimeout(() => {
				if (notification.parentNode) {
					document.body.removeChild(notification);
				}
			}, 300);
		}, 2000);
	}

	getMarkerSize() {
		// Increased marker size for better mobile interaction
		return window.innerWidth <= 768 ? 32 : 28;
	}

	updateMapTitle(mapId) {
		// Update navigation links - remove current class from all links and add to active one
		const mapLinks = document.querySelectorAll(".map-link");
		mapLinks.forEach((link) => {
			const linkMapId = link.getAttribute("data-map");
			if (linkMapId === mapId) {
				link.classList.add("current");
				link.setAttribute("aria-current", "page");
			} else {
				link.classList.remove("current");
				link.removeAttribute("aria-current");
			}
		});
	}

	clearCurrentMap() {
		// Remove current image overlay
		if (this.currentImageOverlay) {
			this.map.removeLayer(this.currentImageOverlay);
			this.currentImageOverlay = null;
		}

		// Remove current marker layer
		if (this.currentMarkerLayer) {
			this.map.removeLayer(this.currentMarkerLayer);
			this.currentMarkerLayer = null;
		}

		// Clear marker references
		this.markerRefs.clear();
	}

	loadMap(mapDefinition, mapId) {
		console.log(`Loading map: ${mapId}`);

		// Update current map ID
		this.currentMapId = mapId;

		// Update UI
		this.updateMapTitle(mapId);

		// Clear current map
		this.clearCurrentMap();

		// Add image overlay
		this.currentImageOverlay = L.imageOverlay(
			mapDefinition.imagePath,
			mapDefinition.bounds,
		);
		this.currentImageOverlay.addTo(this.map);

		// Set map view with padding for better initial display
		this.map.fitBounds(mapDefinition.bounds, {
			padding: [20, 20], // Add 20px padding on all sides
			maxZoom: 1.5, // Prevent over-zooming on initial load
		});
	}

	loadMarkers(markersPath, collectionState) {
		fetch(markersPath)
			.then((response) => {
				if (!response.ok) {
					throw new Error(`HTTP ${response.status}: ${response.statusText}`);
				}
				return response.json();
			})
			.then((data) => {
				// Check basic GeoJSON structure
				if (
					!data ||
					typeof data !== "object" ||
					data.type !== "FeatureCollection" ||
					!Array.isArray(data.features)
				) {
					throw new Error("Invalid GeoJSON structure");
				}

				// Validate each feature
				const validFeatures = data.features.filter((feature, index) => {
					const isValid = validateGeoJSONFeature(feature);
					if (!isValid) {
						console.warn(
							`Skipping invalid feature at index ${index}:`,
							feature,
						);
					}
					return isValid;
				});

				console.log(
					`Loaded ${validFeatures.length} valid features out of ${data.features.length} total for ${this.currentMapId}`,
				);

				// Create marker layer with validated data
				const validData = {
					type: "FeatureCollection",
					features: validFeatures,
				};

				this.currentMarkerLayer = L.geoJSON(validData, {
					pointToLayer: (feature, latlng) => {
						const isCollected = collectionState.isCollected(
							feature.properties.id,
						);
						const markerSize = this.getMarkerSize();
						const marker = L.marker(latlng, {
							icon: createCategoryIcon(
								feature.properties.category,
								markerSize,
								isCollected,
							),
							// Add extra click tolerance for mobile devices
							interactive: true,
							bubblingMouseEvents: false,
						});

						// Store marker reference and feature data
						marker.feature = feature;
						this.markerRefs.set(feature.properties.id, marker);

						return marker;
					},
					onEachFeature: (feature, layer) => {
						const popupContent = this.createPopupContent(
							feature,
							collectionState,
						);

						// Enhanced popup configuration for better UX
						const popupOptions = {
							maxWidth: 280,
							minWidth: 220,
							autoPan: true,
							autoPanPadding: [10, 10],
							closeButton: true,
							autoClose: false,
							keepInView: true,
							// Better positioning for mobile
							offset: [0, -10],
						};

						// Add extra padding on mobile devices
						if (window.innerWidth <= 768) {
							popupOptions.autoPanPadding = [20, 20];
							popupOptions.maxWidth = 300;
						}

						layer.bindPopup(popupContent, popupOptions);
					},
				});

				this.currentMarkerLayer.addTo(this.map);
				console.log(
					`GeoJSON markers loaded successfully for ${this.currentMapId}`,
				);
			})
			.catch((error) => {
				console.error(`Error loading markers for ${this.currentMapId}:`, error);
				// Fallback: Create empty marker layer
				this.currentMarkerLayer = L.geoJSON({
					type: "FeatureCollection",
					features: [],
				});
				this.currentMarkerLayer.addTo(this.map);
			});
	}

	createPopupContent(feature, collectionState) {
		const isCollected = collectionState.isCollected(feature.properties.id);
		const checkboxId = `checkbox-${feature.properties.id}`;

		// Create popup content using safe DOM manipulation
		const container = document.createElement("div");
		container.className = "marker-popup";

		// Title
		const title = document.createElement("h4");
		title.textContent = feature.properties.name;
		container.appendChild(title);

		// Description display (if available)
		if (feature.properties.description?.trim()) {
			const descriptionDiv = document.createElement("div");
			descriptionDiv.className = "marker-description";
			descriptionDiv.textContent = feature.properties.description;
			container.appendChild(descriptionDiv);
		}

		// Collection status section
		const statusDiv = document.createElement("div");
		statusDiv.className = "collection-status";

		const label = document.createElement("label");
		label.htmlFor = checkboxId;
		label.className = "checkbox-label";

		const checkbox = document.createElement("input");
		checkbox.type = "checkbox";
		checkbox.id = checkboxId;
		checkbox.setAttribute("data-marker-id", feature.properties.id);
		checkbox.checked = isCollected;

		const labelText = document.createTextNode(" Collected");

		label.appendChild(checkbox);
		label.appendChild(labelText);
		statusDiv.appendChild(label);
		container.appendChild(statusDiv);

		return container.outerHTML;
	}

	updateMarkerState(markerId, isCollected) {
		const marker = this.markerRefs.get(markerId);
		if (marker) {
			const feature = marker.feature;
			const markerSize = this.getMarkerSize();
			const newIcon = createCategoryIcon(
				feature.properties.category,
				markerSize,
				isCollected,
			);
			marker.setIcon(newIcon);

			// Update checkbox in popup if it's currently open
			const checkboxId = `checkbox-${markerId}`;
			const checkbox = document.getElementById(checkboxId);
			if (checkbox) {
				checkbox.checked = isCollected;
			}
		}
	}

	getCurrentMapId() {
		return this.currentMapId;
	}
}
