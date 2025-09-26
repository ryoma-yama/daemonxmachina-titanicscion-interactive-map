import L from "leaflet";
import type { AppController } from "./app-controller.js";
import { getAssetPath } from "./asset-path.js";
import { colors } from "./constants.js";
import type { FilterManager } from "./filter-manager.js";
import { isValidMapId, mapDefinitions } from "./map-definitions.js";
import type { MapView } from "./map-view.js";
import type { MapId, MarkerCategory, MarkerId } from "./types";
import { updateUrlState } from "./url-state.js";
import { validateGeoJSONFeature } from "./validation.js";

const MAX_RESULTS = 100;
const FOCUS_ZOOM = 1;
const MAX_VERTICAL_OFFSET = 220;

const normalizeText = (text?: string | null): string =>
	text?.toLowerCase() ?? "";

interface SearchPanelDependencies {
	appController: AppController;
	filterManager?: FilterManager;
}

interface MarkerIndexEntry {
	mapId: MapId;
	markerId: MarkerId;
	name: string;
	nameNormalized: string;
	category: MarkerCategory;
	categoryNormalized: string;
	description: string;
	descriptionNormalized: string;
	items: string[];
	itemsNormalized: string[];
	iconUrl: string;
}

export class SearchPanel {
	private appController: AppController;

	private filterManager?: FilterManager;

	private mapView: MapView;

	private map: L.Map;

	private isPanelOpen: boolean;

	private markerIndex: MarkerIndexEntry[];

	private indexPromise: Promise<void>;

	private hideCollected: boolean;

	private panelElement!: HTMLElement;

	private searchInput!: HTMLInputElement;

	private messageElement!: HTMLElement;

	private resultsList!: HTMLElement;

	private toggleButton!: HTMLButtonElement;

	private toggleWrapper: HTMLElement | null;

	private hideToggleButton!: HTMLButtonElement;

	private hideToggleIcon!: HTMLElement;

	constructor({ appController, filterManager }: SearchPanelDependencies) {
		this.appController = appController;
		this.filterManager = filterManager;
		this.mapView = appController.mapView;
		this.map = this.mapView.getLeafletMap();

		this.isPanelOpen = false;
		this.markerIndex = [];
		this.indexPromise = this.loadMarkerIndex();
		this.hideCollected = false;

		this.toggleWrapper = null;

		this.initializeDomReferences();
		this.attachGlobalHandlers();
		this.bindEvents();
	}

	private initializeDomReferences(): void {
		const panelElement = document.getElementById("search-panel");
		const searchInput = document.getElementById("search-input");
		const messageElement = document.getElementById("search-message");
		const resultsList = document.getElementById("search-results");
		const toggleButton = document.getElementById("search-toggle");
		const hideToggleButton = document.getElementById("hide-collected-toggle");
		const hideToggleIcon = hideToggleButton?.querySelector(
			".hide-toggle-control__icon",
		);
		const closeButton = document.getElementById("search-close");

		if (
			!(panelElement instanceof HTMLElement) ||
			!(searchInput instanceof HTMLInputElement) ||
			!(messageElement instanceof HTMLElement) ||
			!(resultsList instanceof HTMLElement) ||
			!(toggleButton instanceof HTMLButtonElement) ||
			!(hideToggleButton instanceof HTMLButtonElement) ||
			!(hideToggleIcon instanceof HTMLElement) ||
			!(closeButton instanceof HTMLButtonElement)
		) {
			throw new Error("Search panel markup is missing required elements");
		}

		this.panelElement = panelElement;
		this.searchInput = searchInput;
		this.messageElement = messageElement;
		this.resultsList = resultsList;
		this.toggleButton = toggleButton;
		this.hideToggleButton = hideToggleButton;
		this.hideToggleIcon = hideToggleIcon;

		this.toggleWrapper = this.toggleButton.closest(".search-toggle-control");
		const container = this.map.getContainer();
		const topLeft = container.querySelector(".leaflet-top.leaflet-left");
		if (
			this.toggleWrapper &&
			topLeft instanceof HTMLElement &&
			!topLeft.contains(this.toggleWrapper)
		) {
			topLeft.appendChild(this.toggleWrapper);
		}

		closeButton.addEventListener("click", () => this.closePanel());
	}

	private attachGlobalHandlers(): void {
		document.addEventListener("keydown", (event) => {
			if (event.key === "Escape" && this.isPanelOpen) {
				event.stopPropagation();
				this.closePanel();
			}
		});

		L.DomEvent.disableScrollPropagation(this.panelElement);
		L.DomEvent.disableClickPropagation(this.panelElement);
	}

	private bindEvents(): void {
		this.searchInput.addEventListener(
			"input",
			() => void this.handleSearchInput(),
		);
		this.searchInput.addEventListener("keydown", (event) =>
			this.handleSearchKeydown(event),
		);
		this.toggleButton.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			if (this.isPanelOpen) {
				this.closePanel();
			} else {
				this.openPanel();
			}
		});

		this.hideToggleButton.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			const nextState = !this.appController.getHideCollected();
			this.appController.setHideCollected(nextState);
		});

		document.addEventListener("filter:changed", () => {
			void this.refreshResults();
		});

		L.DomEvent.disableClickPropagation(this.toggleButton);
		L.DomEvent.disableScrollPropagation(this.toggleButton);
		L.DomEvent.disableClickPropagation(this.hideToggleButton);
		L.DomEvent.disableScrollPropagation(this.hideToggleButton);
	}

	private async loadMarkerIndex(): Promise<void> {
		const entries = Object.entries(mapDefinitions) as [
			MapId,
			(typeof mapDefinitions)[MapId],
		][];
		const index: MarkerIndexEntry[] = [];
		const categoriesInOrder: MarkerCategory[] = [];

		await Promise.all(
			entries.map(async ([mapId, definition]) => {
				try {
					const response = await fetch(definition.markersPath);
					if (!response.ok) {
						throw new Error(`HTTP ${response.status}`);
					}
					const data = (await response.json()) as unknown;
					if (
						!data ||
						typeof data !== "object" ||
						!Array.isArray((data as { features?: unknown[] }).features)
					) {
						throw new Error("Invalid GeoJSON structure");
					}

					(data as { features: unknown[] }).features.forEach(
						(feature, featureIndex) => {
							if (!validateGeoJSONFeature(feature)) {
								console.warn(
									`Skipping invalid search feature ${mapId}#${featureIndex}`,
								);
								return;
							}

							const props = feature.properties;
							const name = props.name || props.id;
							const category = props.category as MarkerCategory;
							const description = props.description || "";
							const items: string[] = [];
							const itemsNormalized: string[] = [];
							if (Array.isArray(props.items)) {
								for (const rawItem of props.items) {
									if (typeof rawItem !== "string") {
										continue;
									}
									const trimmedItem = rawItem.trim();
									if (!trimmedItem) {
										continue;
									}
									items.push(trimmedItem);
									itemsNormalized.push(normalizeText(trimmedItem));
								}
							}
							const iconUrl = getAssetPath(`/assets/icons/${category}.svg`);

							index.push({
								mapId,
								markerId: props.id,
								name,
								nameNormalized: normalizeText(name),
								category,
								categoryNormalized: normalizeText(category),
								description,
								descriptionNormalized: normalizeText(description),
								items,
								itemsNormalized,
								iconUrl,
							});

							if (!categoriesInOrder.includes(category)) {
								categoriesInOrder.push(category);
							}
						},
					);
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

		if (this.filterManager && categoriesInOrder.length) {
			this.filterManager.initializeCategories(categoriesInOrder);
		}
	}

	private getFilteredMarkers(query: string): MarkerIndexEntry[] {
		const normalized = normalizeText(query);
		if (!normalized) {
			return [];
		}

		return this.markerIndex
			.filter((entry) => {
				const matchesName = entry.nameNormalized.includes(normalized);
				const matchesCategory = entry.categoryNormalized.includes(normalized);
				const matchesDescription =
					entry.descriptionNormalized.includes(normalized);
				const matchesItem = entry.itemsNormalized.some((item) =>
					item.includes(normalized),
				);

				return (
					matchesName || matchesCategory || matchesDescription || matchesItem
				);
			})
			.filter((entry) => this.shouldIncludeEntry(entry))
			.slice(0, MAX_RESULTS);
	}

	private async handleSearchInput(): Promise<void> {
		const query = this.searchInput.value;
		await this.indexPromise;

		const results = this.getFilteredMarkers(query);
		this.renderResults(results);
	}

	private handleSearchKeydown(event: KeyboardEvent): void {
		if (event.key === "Enter") {
			const firstResult = this.resultsList.querySelector(
				".search-panel__result",
			) as HTMLElement | null;
			if (firstResult) {
				const mapId = firstResult.dataset.mapId;
				const markerId = firstResult.dataset.markerId;
				if (mapId && markerId) {
					void this.activateResult(mapId, markerId);
				}
			}
		}
	}

	private renderResults(results: MarkerIndexEntry[]): void {
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
			item.setAttribute("data-testid", "search-result-item");
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
			.querySelectorAll<HTMLElement>(".search-panel__result")
			.forEach((resultItem) => {
				resultItem.addEventListener("click", () => {
					const { mapId, markerId } = resultItem.dataset;
					void this.activateResult(mapId, markerId);
				});
			});
	}

	private async activateResult(
		mapIdValue: string | undefined,
		markerIdValue: string | undefined,
	): Promise<void> {
		if (!mapIdValue || !markerIdValue || !isValidMapId(mapIdValue)) {
			return;
		}

		const mapId: MapId = mapIdValue;
		const markerId = markerIdValue as MarkerId;

		let panOffset: [number, number] | undefined;
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
		} as const;

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

	private openPanel(): void {
		this.isPanelOpen = true;
		this.panelElement.classList.add("search-panel--open");
		this.panelElement.removeAttribute("aria-hidden");
		this.panelElement.removeAttribute("inert");
		this.toggleButton.setAttribute("aria-expanded", "true");
		this.searchInput.focus();
	}

	private closePanel(): void {
		this.isPanelOpen = false;
		this.panelElement.classList.remove("search-panel--open");
		this.panelElement.setAttribute("aria-hidden", "true");
		this.panelElement.setAttribute("inert", "");
		if (
			document.activeElement &&
			this.panelElement.contains(document.activeElement)
		) {
			(document.activeElement as HTMLElement).blur();
		}
		this.toggleButton.setAttribute("aria-expanded", "false");
		this.toggleButton.focus();
	}

	private shouldIncludeEntry(entry: MarkerIndexEntry): boolean {
		if (
			this.filterManager &&
			!this.filterManager.shouldIncludeCategory(entry.category)
		) {
			return false;
		}

		if (!this.hideCollected) {
			return true;
		}
		return !this.appController.isMarkerCollected(entry.mapId, entry.markerId);
	}

	setHideCollectedState(hideCollected: boolean): void {
		this.hideCollected = Boolean(hideCollected);
		const pressed = this.hideCollected ? "true" : "false";
		const label = this.hideCollected
			? "Show collected markers"
			: "Hide collected markers";
		this.hideToggleButton.setAttribute("aria-pressed", pressed);
		this.hideToggleButton.setAttribute("aria-label", label);
		this.hideToggleButton.setAttribute("title", label);

		this.hideToggleIcon.classList.toggle(
			"hide-toggle-control__icon--hidden",
			this.hideCollected,
		);

		void this.refreshResults();
	}

	async refreshResults(): Promise<void> {
		await this.indexPromise;
		const query = this.searchInput.value;
		const results = this.getFilteredMarkers(query);
		this.renderResults(results);
	}
}
