import DOMPurify from "dompurify";
import { colors } from "./constants.js";
import type { MarkerCategory, MarkerFeature, MarkerId } from "./types";

type GeoJSONPoint = {
	type: "Point";
	coordinates: [number, number];
};

type GeoJSONFeatureLike = {
	type?: string;
	properties?: Record<string, unknown>;
	geometry?: GeoJSONPoint | null | undefined;
};

const VALID_MARKER_ID = /^[a-zA-Z0-9_-]{1,50}$/;
const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_COORDINATE = 2000;

function containsUnsafeHTML(text: unknown): boolean {
	if (typeof text !== "string") {
		return false;
	}
	const sanitized = DOMPurify.sanitize(text, {
		ALLOWED_TAGS: [],
		ALLOWED_ATTR: [],
	});
	return sanitized !== text;
}

export function validateMarkerId(markerId: unknown): markerId is MarkerId {
	if (typeof markerId !== "string") {
		return false;
	}
	return VALID_MARKER_ID.test(markerId);
}

function isValidCategory(category: unknown): category is MarkerCategory {
	return (
		typeof category === "string" &&
		(Object.keys(colors) as MarkerCategory[]).includes(
			category as MarkerCategory,
		)
	);
}

function isValidCoordinatePair(value: unknown): value is [number, number] {
	return (
		Array.isArray(value) &&
		value.length === 2 &&
		value.every(
			(coordinate) =>
				typeof coordinate === "number" &&
				Number.isFinite(coordinate) &&
				coordinate >= 0 &&
				coordinate <= MAX_COORDINATE,
		)
	);
}

export function validateGeoJSONFeature(
	feature: unknown,
): feature is MarkerFeature {
	if (!feature || typeof feature !== "object") {
		return false;
	}

	const { properties, geometry } = feature as GeoJSONFeatureLike;
	if (!properties || typeof properties !== "object" || !geometry) {
		return false;
	}

	const { id, name, category, description } = properties;
	if (!validateMarkerId(id)) {
		return false;
	}

	if (
		typeof name !== "string" ||
		name.length === 0 ||
		name.length > MAX_NAME_LENGTH ||
		containsUnsafeHTML(name)
	) {
		return false;
	}

	if (
		description !== undefined &&
		(typeof description !== "string" ||
			description.length > MAX_DESCRIPTION_LENGTH ||
			containsUnsafeHTML(description))
	) {
		return false;
	}

	if (!isValidCategory(category)) {
		return false;
	}

	if (!geometry?.coordinates || !isValidCoordinatePair(geometry.coordinates)) {
		return false;
	}

	return true;
}
