// Data validation utilities - Pure functions only

import DOMPurify from "dompurify";
import { colors } from "./icons.js";

/**
 * Check if text contains potentially unsafe HTML content
 * Uses DOMPurify to sanitize and compare with original text
 */
function containsUnsafeHTML(text) {
	if (typeof text !== "string") {
		return false;
	}

	// Sanitize the text and compare with original
	const sanitized = DOMPurify.sanitize(text, {
		ALLOWED_TAGS: [],
		ALLOWED_ATTR: [],
	});
	return sanitized !== text;
}

/**
 * Validate marker ID format
 */
export function validateMarkerId(markerId) {
	if (typeof markerId !== "string") {
		return false;
	}
	// Allow only alphanumeric characters, hyphens, and underscores with length limit
	const validPattern = /^[a-zA-Z0-9_-]{1,50}$/;
	return validPattern.test(markerId);
}

/**
 * Validate GeoJSON feature data
 */
export function validateGeoJSONFeature(feature) {
	// Basic structure check
	if (!feature || typeof feature !== "object") {
		return false;
	}

	// Required properties existence check
	if (!feature.properties || !feature.geometry) {
		return false;
	}

	const props = feature.properties;

	// Properties validation
	if (!props.id || !props.name || !props.category) {
		return false;
	}

	// ID validation
	if (!validateMarkerId(props.id)) {
		return false;
	}

	// Name validation (length limit, HTML tag exclusion)
	if (
		typeof props.name !== "string" ||
		props.name.length === 0 ||
		props.name.length > 100 ||
		containsUnsafeHTML(props.name)
	) {
		return false;
	}

	// Description validation (optional field)
	if (props.description !== undefined) {
		if (
			typeof props.description !== "string" ||
			props.description.length > 500 ||
			containsUnsafeHTML(props.description)
		) {
			return false;
		}
	}

	// Category validation
	const validCategories = Object.keys(colors);
	if (!validCategories.includes(props.category)) {
		return false;
	}

	// Coordinate validation
	if (
		!feature.geometry.coordinates ||
		!Array.isArray(feature.geometry.coordinates) ||
		feature.geometry.coordinates.length !== 2
	) {
		return false;
	}

	const [x, y] = feature.geometry.coordinates;
	if (
		typeof x !== "number" ||
		typeof y !== "number" ||
		x < 0 ||
		y < 0 ||
		x > 2000 ||
		y > 2000
	) {
		return false;
	}

	return true;
}
