import type { Feature, FeatureCollection, Point } from "geojson";

export type MapId = "forest" | "desert" | "mountains";

export type MarkerCategory =
	| "music"
	| "card"
	| "decal"
	| "chest"
	| "enemy"
	| "boss"
	| "dungeon"
	| "log"
	| "duelist"
	| "shop";

export interface MarkerProperties {
	id: string;
	name: string;
	category: MarkerCategory;
	description?: string;
	notes?: string;
	[key: string]: unknown;
}

export type MarkerFeature = Feature<Point, MarkerProperties>;

export type MarkerFeatureCollection = FeatureCollection<
	Point,
	MarkerProperties
>;

export type MarkerId = MarkerProperties["id"];

export type MapBounds = [[number, number], [number, number]];

export interface MapDefinition {
	name: string;
	imagePath: string;
	bounds: MapBounds;
	markersPath: string;
}

export type MapDefinitions = Record<MapId, MapDefinition>;

export type CollectionState = Record<MarkerId, boolean>;

export interface CollectionStore {
	isCollected(markerId: MarkerId): boolean;
	toggleCollection(markerId: MarkerId): boolean;
	setCollected(markerId: MarkerId, collected: boolean): boolean;
}

export interface MarkerFocusOptions {
	zoom?: number;
	panOffset?: [number, number];
	forceVisibility?: boolean;
}

export interface MarkerShareOptions {
	markerId: MarkerId;
	mapId: MapId;
	zoom?: number;
}

export interface MapViewCallbacks {
	onMarkerToggle?: (markerId: MarkerId) => void;
	onMapSwitch?: (mapId: MapId) => void;
	onRecordingModeToggle?: (isRecording: boolean) => void;
}
