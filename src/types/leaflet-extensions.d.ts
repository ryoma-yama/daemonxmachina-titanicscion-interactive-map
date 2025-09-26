import type * as GeoJSON from "geojson";
import type {
	GeoJSON as LeafletGeoJSON,
	GeoJSONOptions,
	Marker,
} from "leaflet";
import type {
	MarkerFeature,
	MarkerFeatureCollection,
	MarkerProperties,
} from "./index";

declare module "leaflet" {
	type DxmMarker = Marker<MarkerProperties>;
	type DxmMarkerFeature = MarkerFeature;
	type DxmMarkerCollection = MarkerFeatureCollection;
	type DxmGeoJsonOptions = GeoJSONOptions<MarkerProperties, GeoJSON.Point>;
	type DxmGeoJsonLayer = LeafletGeoJSON<MarkerFeatureCollection>;
}
