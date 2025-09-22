// Map definitions - Static data only
export const mapDefinitions = {
  forest: {
    name: 'Forest Map',
    imagePath: 'assets/maps/forest.jpg',
    bounds: [[0, 0], [1230, 1230]],
    markersPath: 'assets/data/markers/forest.geojson'
  },
  desert: {
    name: 'Desert Map',
    imagePath: 'assets/maps/desert.jpg',
    bounds: [[0, 0], [1230, 1230]],
    markersPath: 'assets/data/markers/desert.geojson'
  },
  mountains: {
    name: 'Mountains Map',
    imagePath: 'assets/maps/mountains.jpg',
    bounds: [[0, 0], [1230, 1230]],
    markersPath: 'assets/data/markers/mountains.geojson'
  }
};

/**
 * Get map definition by ID
 */
export function getMapDefinition(mapId) {
  return mapDefinitions[mapId] || null;
}

/**
 * Get all available map IDs
 */
export function getAllMapIds() {
  return Object.keys(mapDefinitions);
}

/**
 * Validate map ID
 */
export function isValidMapId(mapId) {
  return mapId && mapDefinitions.hasOwnProperty(mapId);
}