// URL query parameter helpers for map, marker, and zoom state

import { isValidMapId } from "./map-definitions.js";
import { validateMarkerId } from "./validation.js";

const MAP_PARAM = "map";
const MARKER_PARAM = "marker";
const ZOOM_PARAM = "zoom";

function getCurrentUrl() {
	return new URL(window.location.href);
}

function sanitizeZoomParam(value) {
	const parsed = Number.parseFloat(value);
	return Number.isFinite(parsed) ? parsed : null;
}

export function parseUrlState() {
	if (typeof window === "undefined") {
		return {};
	}

	const url = getCurrentUrl();
	const state = {};

	const mapId = url.searchParams.get(MAP_PARAM);
	if (mapId && isValidMapId(mapId)) {
		state.mapId = mapId;
	}

	const markerId = url.searchParams.get(MARKER_PARAM);
	if (markerId && validateMarkerId(markerId)) {
		state.markerId = markerId;
	}

	const zoomParam = url.searchParams.get(ZOOM_PARAM);
	const zoom = zoomParam ? sanitizeZoomParam(zoomParam) : null;
	if (zoom !== null) {
		state.zoom = zoom;
	}

	return state;
}

export function updateUrlState({ mapId, markerId, zoom }) {
	if (typeof window === "undefined") {
		return;
	}

	const url = getCurrentUrl();

	if (mapId === null) {
		url.searchParams.delete(MAP_PARAM);
	} else if (mapId && isValidMapId(mapId)) {
		url.searchParams.set(MAP_PARAM, mapId);
	}

	if (markerId === null) {
		url.searchParams.delete(MARKER_PARAM);
	} else if (markerId && validateMarkerId(markerId)) {
		url.searchParams.set(MARKER_PARAM, markerId);
	}

	if (zoom === null) {
		url.searchParams.delete(ZOOM_PARAM);
	} else if (typeof zoom === "number" && Number.isFinite(zoom)) {
		url.searchParams.set(ZOOM_PARAM, zoom.toString());
	}

	const newUrl = `${url.pathname}${url.search}${url.hash}`;
	const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
	if (newUrl !== current) {
		history.replaceState(null, "", newUrl);
	}
}
