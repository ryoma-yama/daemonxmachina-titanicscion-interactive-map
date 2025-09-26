import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import categoryColors from "../src/data/category-colors.json" assert { type: 'json' };

const colors = /** @type {Record<string, string>} */ (categoryColors);

/**
 * @typedef {Object} FeatureGeometry
 * @property {string} [type]
 * @property {(number[] | [number, number])} [coordinates]
 */

/**
 * @typedef {Object} FeatureLike
 * @property {string} [type]
 * @property {FeatureGeometry} [geometry]
 * @property {Record<string, unknown>} [properties]
 */

/**
 * @typedef {Object} FeatureCollectionLike
 * @property {"FeatureCollection"} type
 * @property {FeatureLike[]} features
 */

/**
 * @typedef {Object} MarkerArgumentsBase
 * @property {boolean} dryRun
 */

/**
 * @typedef {MarkerArgumentsBase & {
 *   categoriesFlag: false;
 *   mapId: string;
 *   x: number;
 *   y: number;
 *   category: string;
 *   name: string;
 *   description: string;
 * }} MarkerArguments
 */

/**
 * @typedef {MarkerArgumentsBase & {
 *   categoriesFlag: true;
 *   mapId: undefined;
 *   x: undefined;
 *   y: undefined;
 *   category: undefined;
 *   name: undefined;
 *   description: "";
 * }} CategoryListArguments
 */

/**
 * @typedef {MarkerArguments | CategoryListArguments} ParsedArguments
 */

/**
 * @typedef {Object} MarkerInput
 * @property {boolean} [dryRun]
 * @property {string} [mapId]
 * @property {unknown} x
 * @property {unknown} y
 * @property {unknown} category
 * @property {unknown} name
 * @property {unknown} [description]
 */

/**
 * @typedef {Object} ValidatedMarkerInput
 * @property {boolean} [dryRun]
 * @property {string} [mapId]
 * @property {number} x
 * @property {number} y
 * @property {string} category
 * @property {string} name
 * @property {string} description
 */

/**
 * @typedef {Object} MarkerFeature
 * @property {"Feature"} type
 * @property {{ type: "Point"; coordinates: [number, number] }} geometry
 * @property {{ id: string; name: string; category: string; description?: string }} properties
 */

export const VALID_CATEGORIES = Object.freeze(Object.keys(colors));

export const DEFAULT_MARKERS_DIR = 'public/assets/data/markers';

const COORD_SEPARATOR = ':';

/**
 * @param {number} x
 * @param {number} y
 * @returns {string}
 */
const toCoordKey = (x, y) => `${Number(x)}${COORD_SEPARATOR}${Number(y)}`;

/**
 * @param {string[]} [argv]
 * @returns {ParsedArguments}
 */
export function parseArguments(argv = process.argv.slice(2)) {
  const options = { dryRun: false, categoriesFlag: false };
  const positional = [];

  for (const token of argv) {
    if (token === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (token === '--categories') {
      options.categoriesFlag = true;
      continue;
    }

    positional.push(token);
  }

  if (options.categoriesFlag) {
    return {
      dryRun: options.dryRun,
      categoriesFlag: true,
      mapId: undefined,
      x: undefined,
      y: undefined,
      category: undefined,
      name: undefined,
      description: '',
    };
  }

  if (positional.length < 5) {
    const missing = ['map_id', 'x', 'y', 'category', 'name'].slice(positional.length);
    throw new Error(`Missing required arguments: ${missing.join(', ')}`);
  }

  const [mapId, xRaw, yRaw, category, name, ...descriptionParts] = positional;

  const x = Number.parseInt(xRaw, 10);
  const y = Number.parseInt(yRaw, 10);

  if (!Number.isFinite(x) || Number.isNaN(x)) {
    throw new Error(`Invalid x coordinate: ${xRaw}`);
  }

  if (!Number.isFinite(y) || Number.isNaN(y)) {
    throw new Error(`Invalid y coordinate: ${yRaw}`);
  }

  const description = descriptionParts.length > 0 ? descriptionParts.join(' ') : '';

  return {
    dryRun: options.dryRun,
    categoriesFlag: false,
    mapId,
    x,
    y,
    category,
    name,
    description,
  };
}

/**
 * @param {readonly string[]} [categories]
 * @returns {void}
 */
export function showCategories(categories = VALID_CATEGORIES) {
  console.log('Valid marker categories:');
  for (const category of categories) {
    console.log(`  - ${category}`);
  }
}

/**
 * @param {string} mapId
 * @param {string} [markersDir]
 * @returns {string}
 */
export function getFilePath(mapId, markersDir = DEFAULT_MARKERS_DIR) {
  if (!mapId) {
    throw new Error('Map ID is required');
  }

  return path.resolve(markersDir, `${mapId}.geojson`);
}

/**
 * @param {MarkerInput} args
 * @returns {ValidatedMarkerInput}
 */
export function validateInputs(args) {
  if (typeof args.x !== 'number' || typeof args.y !== 'number') {
    throw new Error('Coordinates must be numbers');
  }

  if (args.x < 0 || args.y < 0) {
    throw new Error(`Coordinates must be non-negative. Got x=${args.x}, y=${args.y}`);
  }

  if (typeof args.category !== 'string') {
    throw new Error(`Invalid category: ${String(args.category)}`);
  }

  if (!VALID_CATEGORIES.includes(args.category)) {
    throw new Error(`Invalid category: ${args.category}`);
  }

  const trimmedName = typeof args.name === 'string' ? args.name.trim() : '';
  if (!trimmedName) {
    throw new Error('Marker name cannot be empty');
  }

  const trimmedDescription = typeof args.description === 'string' ? args.description.trim() : '';

  const mapId = typeof args.mapId === 'string' ? args.mapId : undefined;

  return /** @type {ValidatedMarkerInput} */ ({
    dryRun: Boolean(args.dryRun),
    mapId,
    x: args.x,
    y: args.y,
    category: args.category,
    name: trimmedName,
    description: trimmedDescription,
  });
}

/**
 * @param {import('node:fs').PathLike} filePath
 * @returns {FeatureCollectionLike}
 */
export function loadGeojson(filePath) {
  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw);

      if (!data || data.type !== 'FeatureCollection') {
        throw new Error('File is not a valid GeoJSON FeatureCollection');
      }

      if (!Array.isArray(data.features)) {
        throw new Error("Invalid GeoJSON: 'features' must be an array");
      }

      return data;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON format: ${error.message}`);
      }

      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Error reading file: ${message}`);
    }
  }

  return /** @type {FeatureCollectionLike} */ ({
    type: 'FeatureCollection',
    features: [],
  });
}

/**
 * @param {import('node:fs').PathLike} filePath
 * @param {FeatureCollectionLike} data
 * @returns {true}
 */
export function saveGeojson(filePath, data) {
  if (typeof filePath !== 'string') {
    throw new TypeError('filePath must be a string path');
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  try {
    fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Error writing file: ${message}`);
  }
}

/**
 * @param {{ features?: FeatureLike[] }} geojsonData
 * @returns {{ existingIds: Set<string>; existingCoords: Set<string> }}
 */
export function extractExistingData(geojsonData) {
  const existingIds = new Set();
  const existingCoords = new Set();

  for (const feature of geojsonData.features ?? []) {
    const properties = feature?.properties ?? {};
    const geometry = feature?.geometry ?? {};

    if (typeof properties.id === 'string') {
      existingIds.add(properties.id);
    }

    if (Array.isArray(geometry.coordinates) && geometry.coordinates.length >= 2) {
      const [x, y] = geometry.coordinates;
      existingCoords.add(toCoordKey(x, y));
    }

  }

  return { existingIds, existingCoords };
}

/**
 * @param {string} mapId
 * @param {Iterable<string>} existingIds
 * @returns {string}
 */
export function generateNextId(mapId, existingIds) {
  const prefix = `${mapId}-`;
  let maxNumber = 0;

  for (const existingId of existingIds) {
    if (existingId.startsWith(prefix)) {
      const suffix = existingId.slice(prefix.length);
      if (/^\d+$/.test(suffix)) {
        maxNumber = Math.max(maxNumber, Number.parseInt(suffix, 10));
      }
    }
  }

  const nextNumber = maxNumber + 1;
  return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
}

/**
 * @param {string} markerId
 * @param {number} x
 * @param {number} y
 * @param {Set<string>} existingIds
 * @param {Set<string>} existingCoords
 * @returns {string[]}
 */
export function checkDuplicates(markerId, x, y, existingIds, existingCoords) {
  const warnings = [];

  if (existingIds.has(markerId)) {
    warnings.push(`ID '${markerId}' already exists`);
  }

  if (existingCoords.has(toCoordKey(x, y))) {
    warnings.push(`Coordinates (${x}, ${y}) already exist`);
  }

  return warnings;
}

/**
 * @param {string} markerId
 * @param {string} name
 * @param {string} category
 * @param {number} x
 * @param {number} y
 * @param {string} [description]
 * @returns {MarkerFeature}
 */
export function createMarkerFeature(markerId, name, category, x, y, description = '') {
  /** @type {MarkerFeature} */
  const feature = {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [x, y],
    },
    properties: {
      id: markerId,
      name,
      category,
    },
  };

  if (description) {
    feature.properties.description = description;
  }

  return feature;
}

/**
 * @template T
 * @param {T & { features?: FeatureLike[] }} geojsonData
 * @param {FeatureLike} markerFeature
 * @returns {T & { features: FeatureLike[] }}
 */
export function addMarkerToGeojson(geojsonData, markerFeature) {
  if (!Array.isArray(geojsonData.features)) {
    geojsonData.features = [];
  }

  geojsonData.features.push(markerFeature);
  geojsonData.features.sort((a, b) => {
    const idA = typeof a?.properties?.id === 'string' ? a.properties.id : '';
    const idB = typeof b?.properties?.id === 'string' ? b.properties.id : '';
    return idA.localeCompare(idB);
  });

  return /** @type {T & { features: FeatureLike[] }} */ (geojsonData);
}

/**
 * @param {MarkerFeature} markerFeature
 * @param {string} filePath
 * @returns {void}
 */
export function displayMarkerPreview(markerFeature, filePath) {
  const { properties, geometry } = markerFeature;
  console.log('\nMarker to be added:');
  console.log(`  ID: ${properties.id}`);
  console.log(`  Name: ${properties.name}`);
  console.log(`  Category: ${properties.category}`);
  console.log(`  Coordinates: (${geometry.coordinates[0]}, ${geometry.coordinates[1]})`);
  if (properties.description) {
    console.log(`  Description: ${properties.description}`);
  }
  console.log(`  Target file: ${filePath}`);
  console.log('\nJSON representation:');
  console.log(JSON.stringify(markerFeature, null, 2));
}

/**
 * @param {string[]} [argv]
 * @param {string} [markersDir]
 * @returns {void}
 */
export function main(argv = process.argv.slice(2), markersDir = DEFAULT_MARKERS_DIR) {
  const args = parseArguments(argv);

  if (args.categoriesFlag) {
    showCategories();
    return;
  }

  const validated = validateInputs(args);
  if (!validated.mapId) {
    throw new Error('Map ID is required');
  }

  const filePath = getFilePath(validated.mapId, markersDir);

  console.log(`Target file: ${filePath}`);
  console.log(`Map ID: ${validated.mapId}`);
  console.log(`Coordinates: (${validated.x}, ${validated.y})`);
  console.log(`Category: ${validated.category}`);
  console.log(`Name: ${validated.name}`);
  if (validated.description) {
    console.log(`Description: ${validated.description}`);
  }

  console.log(`\nLoading GeoJSON data from ${filePath}...`);
  const geojsonData = loadGeojson(filePath);
  const { existingIds, existingCoords } = extractExistingData(geojsonData);
  console.log(`Found ${existingIds.size} existing markers`);

  const markerId = generateNextId(validated.mapId, existingIds);
  console.log(`Generated ID: ${markerId}`);

  const warnings = checkDuplicates(
    markerId,
    validated.x,
    validated.y,
    existingIds,
    existingCoords,
  );

  if (warnings.length > 0) {
    console.error('Error: Duplicate data detected:');
    for (const warning of warnings) {
      console.error(`  - ${warning}`);
    }
    process.exitCode = 1;
    return;
  }

  const markerFeature = createMarkerFeature(
    markerId,
    validated.name,
    validated.category,
    validated.x,
    validated.y,
    validated.description,
  );

  if (validated.dryRun) {
    console.log('\n[DRY RUN] No files will be modified');
    displayMarkerPreview(markerFeature, filePath);
    return;
  }

  const updatedGeojson = addMarkerToGeojson(geojsonData, markerFeature);

  console.log(`\nSaving updated GeoJSON to ${filePath}...`);
  saveGeojson(filePath, updatedGeojson);

  console.log(`✓ Marker '${validated.name}' successfully added with ID '${markerId}'`);
  console.log(`✓ Total markers in file: ${updatedGeojson.features.length}`);
}

/**
 * @param {string | null | undefined} [entry]
 * @param {string} [moduleUrl]
 * @returns {boolean}
 */
export function isExecutedDirectly(entry = process.argv[1], moduleUrl = import.meta.url) {
  if (!entry) {
    return false;
  }
  try {
    return pathToFileURL(entry).href === moduleUrl;
  } catch {
    return false;
  }
}

/* c8 ignore start */
const runFromCli = isExecutedDirectly();

if (runFromCli) {
  try {
    main();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    process.exit(1);
  }
}
/* c8 ignore end */
