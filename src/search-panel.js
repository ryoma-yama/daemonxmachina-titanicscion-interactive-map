// Search panel for locating markers across maps

import L from "leaflet";
import { mapDefinitions } from "./map-definitions.js";
import { colors } from "./icons.js";
import { validateGeoJSONFeature } from "./validation.js";
import { updateUrlState } from "./url-state.js";

const MAX_RESULTS = 100;
const FOCUS_ZOOM = 1;
const MAX_VERTICAL_OFFSET = 220;

const baseUrl = import.meta.env.BASE_URL || "/";
const getAssetPath = (path) => (baseUrl.endsWith("/") ? baseUrl + path.slice(1) : baseUrl + path);
const searchIconPath = getAssetPath("/assets/icons/search.svg");
const closeIconPath = getAssetPath("/assets/icons/close.svg");

function normalizeText(text) {
	return text?.toLowerCase() ?? "";
}

export class SearchPanel {
	constructor({ appController }) {
		this.appController = appController;
		this.mapView = appController.mapView;
		this.map = this.mapView.getLeafletMap();

		this.isPanelOpen = false;
		this.markerIndex = [];
		this.indexPromise = this.loadMarkerIndex();

		this.createPanel();
		this.createToggleControl();
		this.attachGlobalHandlers();
	}

	createPanel() {
		const appRoot = document.getElementById("app");
		if (!appRoot) {
			throw new Error("App root element not found for search panel");
		}

		this.panelElement = document.createElement("aside");
		this.panelElement.className = "search-panel";
		this.panelElement.setAttribute("aria-hidden", "true");
		this.panelElement.setAttribute("inert", "");
		this.panelElement.setAttribute("aria-label", "Marker search panel");

		const header = document.createElement("div");
		header.className = "search-panel__header";

		this.searchInput = document.createElement("input");
		this.searchInput.type = "search";
		this.searchInput.className = "search-panel__input";
		this.searchInput.placeholder = "Search markers";
		this.searchInput.setAttribute("aria-label", "Search markers by name or category");

		const closeButton = document.createElement("button");
		closeButton.type = "button";
		closeButton.className = "search-panel__close";
		closeButton.setAttribute("aria-label", "Close search panel");

		const closeIcon = document.createElement("img");
		closeIcon.src = closeIconPath;
		closeIcon.alt = "";
		closeIcon.setAttribute("aria-hidden", "true");
		closeButton.appendChild(closeIcon);

		header.appendChild(this.searchInput);
		header.appendChild(closeButton);

		this.messageElement = document.createElement("div");
		this.messageElement.className = "search-panel__message";
		this.messageElement.textContent = "Loading markers...";

		this.resultsList = document.createElement("ul");
		this.resultsList.className = "search-panel__results";

		this.panelElement.appendChild(header);
		this.panelElement.appendChild(this.messageElement);
		this.panelElement.appendChild(this.resultsList);

		appRoot.appendChild(this.panelElement);

		closeButton.addEventListener("click", () => this.closePanel());
		this.searchInput.addEventListener("input", () => this.handleSearchInput());
		this.searchInput.addEventListener("keydown", (event) => this.handleSearchKeydown(event));
	}

	createToggleControl() {
		const control = L.control({ position: "topleft" });
		control.onAdd = () => {
			const container = L.DomUtil.create(
				"div",
				"leaflet-bar leaflet-control search-toggle-control",
			);
			const button = L.DomUtil.create("button", "search-toggle-control__button", container);
			button.type = "button";
			button.setAttribute("aria-expanded", "false");
			button.setAttribute("aria-label", "Toggle search panel");

			const icon = L.DomUtil.create("img", "search-toggle-control__icon", button);
			icon.src = searchIconPath;
			icon.alt = "";
			icon.setAttribute("aria-hidden", "true");

			L.DomEvent.disableClickPropagation(button);
			L.DomEvent.disableScrollPropagation(button);

			button.addEventListener("click", (event) => {
				event.preventDefault();
				event.stopPropagation();
				if (this.isPanelOpen) {
					this.closePanel();
				} else {
					this.openPanel();
				}
			});

			this.toggleButton = button;
			return container;
		};

		control.addTo(this.map);
		this.toggleControl = control;
	}

	attachGlobalHandlers() {
		document.addEventListener("keydown", (event) => {
			if (event.key === "Escape" && this.isPanelOpen) {
				event.stopPropagation();
				this.closePanel();
			}
		});

		L.DomEvent.disableScrollPropagation(this.panelElement);
		L.DomEvent.disableClickPropagation(this.panelElement);
	}

	async loadMarkerIndex() {
		const entries = Object.entries(mapDefinitions);
		const index = [];

		await Promise.all(
			entries.map(async ([mapId, definition]) => {
				try {
					const response = await fetch(definition.markersPath);
					if (!response.ok) {
						throw new Error(`HTTP ${response.status}`);
					}
					const data = await response.json();
					if (!data?.features || !Array.isArray(data.features)) {
						throw new Error("Invalid GeoJSON structure");
					}

					data.features.forEach((feature, featureIndex) => {
						if (!validateGeoJSONFeature(feature)) {
							console.warn(
								`Skipping invalid search feature ${mapId}#${featureIndex}`,
							);
							return;
						}

						const props = feature.properties;
						const name = props.name || props.id;
						const category = props.category || "unknown";
						const iconUrl = getAssetPath(`/assets/icons/${category}.svg`);

						index.push({
							mapId,
							markerId: props.id,
							name,
							nameNormalized: normalizeText(name),
							category,
							categoryNormalized: normalizeText(category),
							iconUrl,
						});
					});
				} catch (error) {
					console.error(`Failed to load markers for ${mapId}:`, error);
				}
			}),
		);

		index.sort((a, b) => a.name.localeCompare(b.name));
		this.markerIndex = index;
		this.messageElement.textContent = index.length
			? "Type to search markers"
			: "No markers available";
	}

	getFilteredMarkers(query) {
		const normalized = normalizeText(query);
		if (!normalized) {
			return [];
		}

		return this.markerIndex
			.filter(
				(entry) =>
					entry.nameNormalized.includes(normalized) ||
					entry.categoryNormalized.includes(normalized),
			)
			.slice(0, MAX_RESULTS);
	}

	async handleSearchInput() {
		const query = this.searchInput.value;
		await this.indexPromise;

		const results = this.getFilteredMarkers(query);
		this.renderResults(results);
	}

	handleSearchKeydown(event) {
		if (event.key === "Enter") {
			const firstResult = this.resultsList.querySelector(
				".search-panel__result",
			);
			if (firstResult) {
				this.activateResult(firstResult.dataset.mapId, firstResult.dataset.markerId);
			}
		}
	}

	renderResults(results) {
		this.resultsList.innerHTML = "";

		if (!results.length) {
			this.messageElement.textContent = this.searchInput.value
				? "No markers found"
				: "Type to search markers";
			return;
		}

		this.messageElement.textContent = `${results.length} result${
			results.length === 1 ? "" : "s"
		}`;

		results.forEach((entry) => {
			const item = document.createElement("li");
			item.className = "search-panel__result";
			item.dataset.mapId = entry.mapId;
			item.dataset.markerId = entry.markerId;
			item.title = `${entry.name} (${entry.category})`;

			const icon = document.createElement("div");
			icon.className = "search-panel__result-icon";
			const color = colors[entry.category] || "#ffffff";
			icon.style.backgroundColor = color;
			icon.style.mask = `url('${entry.iconUrl}') center / contain no-repeat`;
			icon.style.webkitMask = `url('${entry.iconUrl}') center / contain no-repeat`;

			const name = document.createElement("span");
			name.className = "search-panel__result-name";
			name.textContent = entry.name;

			item.appendChild(icon);
			item.appendChild(name);
			this.resultsList.appendChild(item);
		});

		this.resultsList
			.querySelectorAll(".search-panel__result")
			.forEach((resultItem) => {
				resultItem.addEventListener("click", () =>
					this.activateResult(
						resultItem.dataset.mapId,
						resultItem.dataset.markerId,
					),
				);
			});
	}

	async activateResult(mapId, markerId) {
		if (!mapId || !markerId) {
			return;
		}

		let panOffset;
		if (this.isPanelOpen) {
			const panelHeight = this.panelElement?.offsetHeight ?? 0;
			const verticalOffset = Math.min(
				MAX_VERTICAL_OFFSET,
				Math.max(panelHeight / 2, 0),
			);
			if (verticalOffset > 0) {
				panOffset = [0, verticalOffset];
			}
		}
		const focusOptions = {
			zoom: FOCUS_ZOOM,
			panOffset,
		};

		if (mapId === this.appController.currentMapId) {
			const focused = await this.appController.focusMarkerOnCurrentMap(
				markerId,
				focusOptions,
			);
			if (focused) {
				const zoomLevel = this.appController.mapView.getZoomLevel();
				updateUrlState({ mapId, markerId, zoom: zoomLevel });
			}
		} else {
			await this.appController.switchToMap(mapId, {
				focusMarkerId: markerId,
				zoom: FOCUS_ZOOM,
				panOffset,
			});
		}
	}

	openPanel() {
		this.isPanelOpen = true;
		this.panelElement.classList.add("search-panel--open");
		this.panelElement.removeAttribute("aria-hidden");
		this.panelElement.removeAttribute("inert");
		if (this.toggleButton) {
			this.toggleButton.setAttribute("aria-expanded", "true");
		}
		this.searchInput.focus();
	}

	closePanel() {
		this.isPanelOpen = false;
		this.panelElement.classList.remove("search-panel--open");
		this.panelElement.setAttribute("aria-hidden", "true");
		this.panelElement.setAttribute("inert", "");
		if (
			document.activeElement &&
			this.panelElement.contains(document.activeElement)
		) {
			document.activeElement.blur();
		}
		if (this.toggleButton) {
			this.toggleButton.setAttribute("aria-expanded", "false");
			this.toggleButton.focus();
		}
	}
}
