import type { PathLike } from "node:fs";

export type CategoryId = string;

export interface MarkerProperties extends Record<string, unknown> {
        id: string;
        name: string;
        category: CategoryId;
        description?: string;
}

export interface MarkerGeometry {
        type: "Point";
        coordinates: [number, number];
}

export interface MarkerFeature extends FeatureLike {
        type: "Feature";
        geometry: MarkerGeometry;
        properties: MarkerProperties;
}

export interface FeatureLike {
        type?: string;
        geometry?: {
                type?: string;
                coordinates?: [number, number] | number[];
        };
        properties?: Record<string, unknown>;
}

export interface FeatureCollectionLike {
        type: "FeatureCollection";
        features: FeatureLike[];
}

export interface MarkerArgumentsBase {
        dryRun: boolean;
}

export interface MarkerArguments extends MarkerArgumentsBase {
        categoriesFlag: false;
        mapId: string;
        x: number;
        y: number;
        category: CategoryId;
        name: string;
        description: string;
}

export interface CategoryListArguments extends MarkerArgumentsBase {
        categoriesFlag: true;
        mapId: undefined;
        x: undefined;
        y: undefined;
        category: undefined;
        name: undefined;
        description: "";
}

export type ParsedArguments = MarkerArguments | CategoryListArguments;

export interface MarkerInput {
        dryRun?: boolean;
        mapId?: string;
        x: unknown;
        y: unknown;
        category: unknown;
        name: unknown;
        description?: unknown;
}

export interface ValidatedMarkerInput {
        dryRun?: boolean;
        mapId?: string;
        x: number;
        y: number;
        category: string;
        name: string;
        description: string;
}

export const VALID_CATEGORIES: readonly CategoryId[];
export const DEFAULT_MARKERS_DIR: string;
export function parseArguments(argv?: string[]): ParsedArguments;
export function showCategories(categories?: readonly CategoryId[]): void;
export function getFilePath(mapId: string, markersDir?: string): string;
export function validateInputs(args: MarkerInput): ValidatedMarkerInput;
export function loadGeojson(filePath: PathLike): FeatureCollectionLike;
export function saveGeojson(filePath: PathLike, data: FeatureCollectionLike): true;
export function extractExistingData(
        geojsonData: FeatureCollectionLike | { features?: FeatureLike[] | undefined },
): { existingIds: Set<string>; existingCoords: Set<string> };
export function generateNextId(mapId: string, existingIds: Iterable<string>): string;
export function checkDuplicates(
        markerId: string,
        x: number,
        y: number,
        existingIds: Set<string>,
        existingCoords: Set<string>,
): string[];
export function createMarkerFeature(
        markerId: string,
        name: string,
        category: CategoryId,
        x: number,
        y: number,
        description?: string,
): MarkerFeature;
export function addMarkerToGeojson<T extends { features?: FeatureLike[] | undefined }>(
        geojsonData: T,
        markerFeature: FeatureLike,
): T & { features: FeatureLike[] };
export function displayMarkerPreview(markerFeature: MarkerFeature, filePath: string): void;
export function main(argv?: string[], markersDir?: string): void;
export function isExecutedDirectly(entry?: string | null, moduleUrl?: string): boolean;
