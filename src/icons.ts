import L from "leaflet";
import { getAssetPath } from "./asset-path.js";
import { colors } from "./constants.js";
import type { MarkerCategory, MarkerId } from "./types";

type MarkerCategoryLike = MarkerCategory | (string & Record<never, never>);

export function createCategoryIcon(
	category: MarkerCategoryLike,
	size = 24,
	isCollected = false,
	markerId?: MarkerId,
): L.DivIcon {
	const color = colors[category as MarkerCategory] ?? "#FFFFFF";
	const url = getAssetPath(`/assets/icons/${category}.svg`);

	const opacity = isCollected ? 0.5 : 1.0;
	const filter = isCollected ? "grayscale(50%)" : "none";
	const border = isCollected ? "2px solid #00FF00" : "none";
	const dataAttributes = ['data-testid="map-marker"'];
	if (markerId) {
		dataAttributes.push(`data-marker-id="${markerId}"`);
	}
	if (category) {
		dataAttributes.push(`data-marker-category="${category}"`);
	}
	const attributes = dataAttributes.join(" ");

	const html = `
    <div ${attributes} style="
      width:${size}px;height:${size}px;background-color:${color};
      -webkit-mask:url('${url}') center / contain no-repeat;
      mask:url('${url}') center / contain no-repeat;
      opacity:${opacity};
      filter:${filter};
      border:${border};
      border-radius:50%;
      box-sizing:border-box;
      ">
    </div>`;

	return L.divIcon({
		html,
		className: "dmx-icon",
		iconSize: [size, size],
		iconAnchor: [size / 2, size / 2],
		popupAnchor: [0, -size / 2],
	});
}
