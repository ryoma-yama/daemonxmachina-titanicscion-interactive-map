import fs from "node:fs";
import type { PathLike } from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import categoryColors from "../src/data/category-colors.json" assert { type: "json" };

export type CategoryId = string;

type Coordinates = [number, number];

export type FeatureGeometry = {
        type?: string;
        coordinates?: Coordinates | number[];
};

export type FeatureLike = {
        type?: string;
        geometry?: FeatureGeometry;
        properties?: Record<string, unknown>;
};

export type FeatureCollectionLike = {
        type: "FeatureCollection";
        features: FeatureLike[];
};

export type MarkerArgumentsBase = {
        dryRun: boolean;
};

export type MarkerArguments = MarkerArgumentsBase & {
        categoriesFlag: false;
        mapId: string;
        x: number;
        y: number;
        category: CategoryId;
        name: string;
        description: string;
};

export type CategoryListArguments = MarkerArgumentsBase & {
        categoriesFlag: true;
        mapId: undefined;
        x: undefined;
        y: undefined;
        category: undefined;
        name: undefined;
        description: "";
};

export type ParsedArguments = MarkerArguments | CategoryListArguments;

export type MarkerInput = {
        dryRun?: boolean;
        mapId?: string;
        x: unknown;
        y: unknown;
        category: unknown;
        name: unknown;
        description?: unknown;
};

export type ValidatedMarkerInput = {
        dryRun?: boolean;
        mapId?: string;
        x: number;
        y: number;
        category: string;
        name: string;
        description: string;
};

export type MarkerFeature = {
        type: "Feature";
        geometry: { type: "Point"; coordinates: Coordinates };
        properties: { id: string; name: string; category: CategoryId; description?: string };
};

const colors = categoryColors as Record<CategoryId, string>;

export const VALID_CATEGORIES = Object.freeze(Object.keys(colors)) as readonly CategoryId[];

export const DEFAULT_MARKERS_DIR = "public/assets/data/markers";

const COORD_SEPARATOR = ":";

const toCoordKey = (x: number, y: number): string => `${Number(x)}${COORD_SEPARATOR}${Number(y)}`;

export function parseArguments(argv: readonly string[] = process.argv.slice(2)): ParsedArguments {
        const options: { dryRun: boolean; categoriesFlag: boolean } = {
                dryRun: false,
                categoriesFlag: false,
        };
        const positional: string[] = [];

        for (const token of argv) {
                if (token === "--dry-run") {
                        options.dryRun = true;
                        continue;
                }

                if (token === "--categories") {
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
                        description: "",
                };
        }

        if (positional.length < 5) {
                const missing = ["map_id", "x", "y", "category", "name"].slice(positional.length);
                throw new Error(`Missing required arguments: ${missing.join(", ")}`);
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

        const description = descriptionParts.length > 0 ? descriptionParts.join(" ") : "";

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

export function showCategories(categories: readonly CategoryId[] = VALID_CATEGORIES): void {
        console.log("Valid marker categories:");
        for (const category of categories) {
                console.log(`  - ${category}`);
        }
}

export function getFilePath(mapId: string, markersDir: string = DEFAULT_MARKERS_DIR): string {
        if (!mapId) {
                throw new Error("Map ID is required");
        }

        return path.resolve(markersDir, `${mapId}.geojson`);
}

export function validateInputs(args: MarkerInput): ValidatedMarkerInput {
        if (typeof args.x !== "number" || typeof args.y !== "number") {
                throw new Error("Coordinates must be numbers");
        }

        if (args.x < 0 || args.y < 0) {
                throw new Error(`Coordinates must be non-negative. Got x=${args.x}, y=${args.y}`);
        }

        if (typeof args.category !== "string") {
                throw new Error(`Invalid category: ${String(args.category)}`);
        }

        if (!VALID_CATEGORIES.includes(args.category)) {
                throw new Error(`Invalid category: ${args.category}`);
        }

        const trimmedName = typeof args.name === "string" ? args.name.trim() : "";
        if (!trimmedName) {
                throw new Error("Marker name cannot be empty");
        }

        const trimmedDescription = typeof args.description === "string" ? args.description.trim() : "";

        const mapId = typeof args.mapId === "string" ? args.mapId : undefined;

        return {
                dryRun: Boolean(args.dryRun),
                mapId,
                x: args.x,
                y: args.y,
                category: args.category,
                name: trimmedName,
                description: trimmedDescription,
        };
}

export function loadGeojson(filePath: PathLike): FeatureCollectionLike {
        if (fs.existsSync(filePath)) {
                try {
                        const raw = fs.readFileSync(filePath, "utf-8");
                        const data = JSON.parse(raw) as FeatureCollectionLike;

                        if (!data || data.type !== "FeatureCollection") {
                                throw new Error("File is not a valid GeoJSON FeatureCollection");
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

        return {
                type: "FeatureCollection",
                features: [],
        };
}

export function saveGeojson(filePath: PathLike, data: FeatureCollectionLike): true {
        if (typeof filePath !== "string") {
                throw new TypeError("filePath must be a string path");
        }

        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        try {
                fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
                return true;
        } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                throw new Error(`Error writing file: ${message}`);
        }
}

export function extractExistingData(geojsonData: { features?: FeatureLike[] }): {
        existingIds: Set<string>;
        existingCoords: Set<string>;
} {
        const existingIds = new Set<string>();
        const existingCoords = new Set<string>();

        for (const feature of geojsonData.features ?? []) {
                const properties = feature?.properties ?? {};
                const geometry = feature?.geometry ?? {};

                if (typeof properties.id === "string") {
                        existingIds.add(properties.id);
                }

                if (Array.isArray(geometry.coordinates) && geometry.coordinates.length >= 2) {
                        const [x, y] = geometry.coordinates as Coordinates;
                        existingCoords.add(toCoordKey(x, y));
                }
        }

        return { existingIds, existingCoords };
}

export function generateNextId(mapId: string, existingIds: Iterable<string>): string {
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
        return `${prefix}${nextNumber.toString().padStart(3, "0")}`;
}

export function checkDuplicates(
        markerId: string,
        x: number,
        y: number,
        existingIds: Set<string>,
        existingCoords: Set<string>,
): string[] {
        const warnings: string[] = [];

        if (existingIds.has(markerId)) {
                warnings.push(`ID '${markerId}' already exists`);
        }

        if (existingCoords.has(toCoordKey(x, y))) {
                warnings.push(`Coordinates (${x}, ${y}) already exist`);
        }

        return warnings;
}

export function createMarkerFeature(
        markerId: string,
        name: string,
        category: CategoryId,
        x: number,
        y: number,
        description: string = "",
): MarkerFeature {
        const feature: MarkerFeature = {
                type: "Feature",
                geometry: {
                        type: "Point",
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

export function addMarkerToGeojson<T extends { features?: FeatureLike[] }>(
        geojsonData: T,
        markerFeature: FeatureLike,
): T & { features: FeatureLike[] } {
        if (!Array.isArray(geojsonData.features)) {
                geojsonData.features = [];
        }

        geojsonData.features.push(markerFeature);
        geojsonData.features.sort((a, b) => {
                const idA = typeof a?.properties?.id === "string" ? (a.properties.id as string) : "";
                const idB = typeof b?.properties?.id === "string" ? (b.properties.id as string) : "";
                return idA.localeCompare(idB);
        });

        return geojsonData as T & { features: FeatureLike[] };
}

export function displayMarkerPreview(markerFeature: MarkerFeature, filePath: string): void {
        const { properties, geometry } = markerFeature;
        console.log("\nMarker to be added:");
        console.log(`  ID: ${properties.id}`);
        console.log(`  Name: ${properties.name}`);
        console.log(`  Category: ${properties.category}`);
        console.log(`  Coordinates: (${geometry.coordinates[0]}, ${geometry.coordinates[1]})`);
        if (properties.description) {
                console.log(`  Description: ${properties.description}`);
        }
        console.log(`  Target file: ${filePath}`);
        console.log("\nJSON representation:");
        console.log(JSON.stringify(markerFeature, null, 2));
}

export function main(
        argv: readonly string[] = process.argv.slice(2),
        markersDir: string = DEFAULT_MARKERS_DIR,
): void {
        const args = parseArguments(argv);

        if (args.categoriesFlag) {
                showCategories();
                return;
        }

        const validated = validateInputs(args);
        if (!validated.mapId) {
                throw new Error("Map ID is required");
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
                console.error("Error: Duplicate data detected:");
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
                console.log("\n[DRY RUN] No files will be modified");
                displayMarkerPreview(markerFeature, filePath);
                return;
        }

        const updatedGeojson = addMarkerToGeojson(geojsonData, markerFeature);

        console.log(`\nSaving updated GeoJSON to ${filePath}...`);
        saveGeojson(filePath, updatedGeojson);

        console.log(`✓ Marker '${validated.name}' successfully added with ID '${markerId}'`);
        console.log(`✓ Total markers in file: ${updatedGeojson.features.length}`);
}

export function isExecutedDirectly(
        entry: string | null | undefined = process.argv[1],
        moduleUrl: string = import.meta.url,
): boolean {
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
