// Data validation utilities - Pure functions only
import { colors } from './icons.js';

/**
 * Validate marker ID format
 */
export function validateMarkerId(markerId) {
  if (typeof markerId !== 'string') {
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
  if (!feature || typeof feature !== 'object') {
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
  if (typeof props.name !== 'string' ||
    props.name.length === 0 ||
    props.name.length > 100 ||
    /<[^>]*>/g.test(props.name)) {
    return false;
  }

  // Category validation
  const validCategories = Object.keys(colors);
  if (!validCategories.includes(props.category)) {
    return false;
  }

  // Coordinate validation
  if (!feature.geometry.coordinates ||
    !Array.isArray(feature.geometry.coordinates) ||
    feature.geometry.coordinates.length !== 2) {
    return false;
  }

  const [x, y] = feature.geometry.coordinates;
  if (typeof x !== 'number' || typeof y !== 'number' ||
    x < 0 || y < 0 || x > 2000 || y > 2000) {
    return false;
  }

  return true;
}