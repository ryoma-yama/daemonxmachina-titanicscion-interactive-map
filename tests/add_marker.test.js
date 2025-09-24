import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	addMarkerToGeojson,
	checkDuplicates,
	createMarkerFeature,
	displayMarkerPreview,
	extractExistingData,
	generateNextId,
	getFilePath,
	isExecutedDirectly,
	loadGeojson,
	main,
	parseArguments,
	saveGeojson,
	showCategories,
	VALID_CATEGORIES,
	validateInputs,
} from "../scripts/add_marker.js";

const createTempDir = () =>
	fs.mkdtempSync(path.join(os.tmpdir(), "add-marker-"));

afterEach(() => {
	vi.restoreAllMocks();
	process.exitCode = undefined;
});

describe("parseArguments", () => {
	it("parses positional arguments with optional description", () => {
		const args = parseArguments([
			"forest",
			"100",
			"200",
			"card",
			"Marker",
			"Detailed description",
		]);
		expect(args).toMatchObject({
			mapId: "forest",
			x: 100,
			y: 200,
			category: "card",
			name: "Marker",
			description: "Detailed description",
			dryRun: false,
			categoriesFlag: false,
		});
	});

	it("supports --dry-run flag", () => {
		const args = parseArguments([
			"--dry-run",
			"forest",
			"10",
			"20",
			"card",
			"Name",
		]);
		expect(args.dryRun).toBe(true);
	});

	it("returns early when --categories is provided", () => {
		const args = parseArguments(["--categories", "--dry-run"]);
		expect(args.categoriesFlag).toBe(true);
		expect(args.dryRun).toBe(true);
	});

	it("throws when required arguments are missing", () => {
		expect(() => parseArguments(["forest"])).toThrow(
			"Missing required arguments",
		);
	});

	it("throws when coordinates are not numbers", () => {
		expect(() =>
			parseArguments(["forest", "a", "100", "card", "Name"]),
		).toThrow("Invalid x coordinate");
		expect(() =>
			parseArguments(["forest", "100", "b", "card", "Name"]),
		).toThrow("Invalid y coordinate");
	});
});

describe("showCategories", () => {
	it("logs category list", () => {
		const log = vi.spyOn(console, "log").mockImplementation(() => {});
		showCategories(["alpha", "beta"]);
		expect(log).toHaveBeenCalledWith("Valid marker categories:");
		expect(log).toHaveBeenCalledWith("  - alpha");
		expect(log).toHaveBeenCalledWith("  - beta");
	});
});

describe("getFilePath", () => {
	it("resolves file path for map id", () => {
		const resolved = getFilePath("forest", "relative/path");
		expect(resolved).toContain(path.join("relative", "path", "forest.geojson"));
	});

	it("throws when map id is missing", () => {
		expect(() => getFilePath("")).toThrow("Map ID is required");
	});
});

describe("validateInputs", () => {
	it("normalizes and validates input fields", () => {
		const validated = validateInputs({
			mapId: "forest",
			x: 10,
			y: 20,
			category: VALID_CATEGORIES[0],
			name: "  Marker  ",
			description: "  Desc  ",
			dryRun: false,
		});
		expect(validated.name).toBe("Marker");
		expect(validated.description).toBe("Desc");
	});

	it("rejects non-number coordinates", () => {
		expect(() =>
			validateInputs({ x: "10", y: 10, category: "card", name: "Name" }),
		).toThrow("Coordinates must be numbers");
	});

	it("rejects negative coordinates", () => {
		expect(() =>
			validateInputs({ x: -1, y: 0, category: "card", name: "Name" }),
		).toThrow("Coordinates must be non-negative");
	});

	it("rejects invalid categories", () => {
		expect(() =>
			validateInputs({ x: 0, y: 0, category: "invalid", name: "Name" }),
		).toThrow("Invalid category");
	});

	it("rejects non-string names", () => {
		expect(() =>
			validateInputs({ x: 0, y: 0, category: "card", name: null }),
		).toThrow("Marker name cannot be empty");
	});

	it("rejects empty names", () => {
		expect(() =>
			validateInputs({ x: 0, y: 0, category: "card", name: "   " }),
		).toThrow("Marker name cannot be empty");
	});

	it("normalizes non-string descriptions to empty string", () => {
		const validated = validateInputs({
			x: 0,
			y: 0,
			category: "card",
			name: "Name",
			description: null,
		});
		expect(validated.description).toBe("");
	});
});

describe("loadGeojson", () => {
	it("returns empty structure when file does not exist", () => {
		const tempPath = path.join(createTempDir(), "missing.geojson");
		expect(loadGeojson(tempPath)).toEqual({
			type: "FeatureCollection",
			features: [],
		});
	});

	it("loads existing valid file", () => {
		const tempDir = createTempDir();
		const filePath = path.join(tempDir, "file.geojson");
		const data = { type: "FeatureCollection", features: [] };
		fs.writeFileSync(filePath, JSON.stringify(data));
		expect(loadGeojson(filePath)).toEqual(data);
	});

	it("throws on invalid JSON syntax", () => {
		const tempDir = createTempDir();
		const filePath = path.join(tempDir, "file.geojson");
		fs.writeFileSync(filePath, "{");
		expect(() => loadGeojson(filePath)).toThrow("Invalid JSON format");
	});

	it("throws when GeoJSON type is incorrect", () => {
		const tempDir = createTempDir();
		const filePath = path.join(tempDir, "file.geojson");
		fs.writeFileSync(filePath, JSON.stringify({ type: "Other", features: [] }));
		expect(() => loadGeojson(filePath)).toThrow(
			"File is not a valid GeoJSON FeatureCollection",
		);
	});

	it("throws when features is not an array", () => {
		const tempDir = createTempDir();
		const filePath = path.join(tempDir, "file.geojson");
		fs.writeFileSync(
			filePath,
			JSON.stringify({ type: "FeatureCollection", features: {} }),
		);
		expect(() => loadGeojson(filePath)).toThrow(
			"Invalid GeoJSON: 'features' must be an array",
		);
	});

	it("wraps unexpected read errors", () => {
		const _spy = vi.spyOn(fs, "existsSync").mockReturnValue(true);
		vi.spyOn(fs, "readFileSync").mockImplementation(() => {
			throw new Error("boom");
		});
		expect(() => loadGeojson("path")).toThrow("Error reading file: boom");
	});
});

describe("saveGeojson", () => {
	it("writes file with trailing newline", () => {
		const tempDir = createTempDir();
		const filePath = path.join(tempDir, "file.geojson");
		const data = { type: "FeatureCollection", features: [] };
		saveGeojson(filePath, data);
		expect(fs.readFileSync(filePath, "utf-8")).toBe(
			`${JSON.stringify(data, null, 2)}\n`,
		);
	});

	it("wraps write errors", () => {
		const spy = vi.spyOn(fs, "writeFileSync").mockImplementation(() => {
			throw new Error("fail");
		});
		expect(() => saveGeojson("file", {})).toThrow("Error writing file: fail");
		spy.mockRestore();
	});
});

describe("extractExistingData", () => {
	it("collects ids and coordinates", () => {
		const data = {
			type: "FeatureCollection",
			features: [
				{
					properties: { id: "forest-001", name: "A" },
					geometry: { coordinates: [100, 200] },
				},
				{
					properties: { id: "forest-002", name: "B" },
					geometry: { coordinates: [300, 400] },
				},
			],
		};
		const { existingIds, existingCoords } = extractExistingData(data);
		expect(existingIds.has("forest-001")).toBe(true);
		expect(existingCoords.has("100:200")).toBe(true);
	});

	it("handles missing fields gracefully", () => {
		const { existingIds, existingCoords } = extractExistingData({
			type: "FeatureCollection",
			features: [{}],
		});
		expect(existingIds.size).toBe(0);
		expect(existingCoords.size).toBe(0);
	});

	it("returns empty sets when features are absent", () => {
		const { existingIds, existingCoords } = extractExistingData({});
		expect(existingIds.size).toBe(0);
		expect(existingCoords.size).toBe(0);
	});
});

describe("generateNextId", () => {
	it("generates sequential ids with padding", () => {
		expect(generateNextId("forest", new Set())).toBe("forest-001");
		expect(
			generateNextId("forest", new Set(["forest-001", "forest-002"])),
		).toBe("forest-003");
	});

	it("ignores ids from other maps and non-numeric suffixes", () => {
		const existing = new Set(["desert-010", "forest-alpha", "forest-005"]);
		expect(generateNextId("forest", existing)).toBe("forest-006");
	});
});

describe("checkDuplicates", () => {
	it("returns warnings for duplicates", () => {
		const warnings = checkDuplicates(
			"forest-001",
			100,
			200,
			new Set(["forest-001"]),
			new Set(["100:200"]),
		);
		expect(warnings).toEqual([
			"ID 'forest-001' already exists",
			"Coordinates (100, 200) already exist",
		]);
	});

	it("returns empty array when there are no duplicates", () => {
		expect(checkDuplicates("forest-002", 1, 2, new Set(), new Set())).toEqual(
			[],
		);
	});
});

describe("createMarkerFeature", () => {
	it("creates feature without description", () => {
		const feature = createMarkerFeature("forest-001", "Name", "card", 1, 2);
		expect(feature.properties).not.toHaveProperty("description");
	});

	it("adds description when provided", () => {
		const feature = createMarkerFeature(
			"forest-002",
			"Name",
			"card",
			1,
			2,
			"Desc",
		);
		expect(feature.properties.description).toBe("Desc");
	});
});

describe("addMarkerToGeojson", () => {
	it("initializes missing feature array", () => {
		const result = addMarkerToGeojson(
			{},
			createMarkerFeature("forest-002", "Name", "card", 1, 2),
		);
		expect(result.features).toHaveLength(1);
	});

	it("keeps markers sorted by id", () => {
		const data = {
			features: [createMarkerFeature("forest-010", "A", "card", 1, 1)],
		};
		addMarkerToGeojson(
			data,
			createMarkerFeature("forest-002", "B", "card", 2, 2),
		);
		expect(data.features[0].properties.id).toBe("forest-002");
	});

	it("handles items without ids during sorting", () => {
		const data = { features: [{}] };
		addMarkerToGeojson(
			data,
			createMarkerFeature("forest-002", "Name", "card", 1, 1),
		);
		expect(data.features).toHaveLength(2);
		expect(
			data.features.some((feature) => feature?.properties?.id === "forest-002"),
		).toBe(true);
	});

	it("supports markers without ids", () => {
		const data = {
			features: [createMarkerFeature("forest-001", "Existing", "card", 0, 0)],
		};
		const anonymousFeature = {
			type: "Feature",
			geometry: { type: "Point", coordinates: [1, 1] },
			properties: {},
		};
		addMarkerToGeojson(data, anonymousFeature);
		expect(data.features).toHaveLength(2);
		expect(
			data.features.some((feature) => feature.properties?.id === undefined),
		).toBe(true);
	});
});

describe("displayMarkerPreview", () => {
	it("logs marker preview including optional description", () => {
		const log = vi.spyOn(console, "log").mockImplementation(() => {});
		const feature = createMarkerFeature(
			"forest-001",
			"Name",
			"card",
			1,
			2,
			"Desc",
		);
		displayMarkerPreview(feature, "/tmp/file.geojson");
		expect(log).toHaveBeenCalledWith("  Description: Desc");
	});
});

describe("isExecutedDirectly", () => {
	it("returns false when entry is missing", () => {
		expect(isExecutedDirectly(null, "file:///module")).toBe(false);
	});

	it("returns false when path conversion throws", () => {
		expect(isExecutedDirectly({})).toBe(false);
	});

	it("returns true when entry matches module url", () => {
		const entry = path.join("tmp", "file.js");
		const moduleUrl = pathToFileURL(entry).href;
		expect(isExecutedDirectly(entry, moduleUrl)).toBe(true);
	});
});

describe("main", () => {
	const captureLogs = () => {
		const log = vi.spyOn(console, "log").mockImplementation(() => {});
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		return { log, error };
	};

	it("shows categories and exits without error", () => {
		const { log } = captureLogs();
		main(["--categories"], createTempDir());
		expect(log).toHaveBeenCalledWith("Valid marker categories:");
		expect(process.exitCode).toBeUndefined();
	});

	it("stops when duplicate coordinates are detected", () => {
		const markersDir = createTempDir();
		const filePath = getFilePath("forest", markersDir);
		const existingFeature = createMarkerFeature(
			"forest-001",
			"Existing",
			"card",
			100,
			200,
		);
		saveGeojson(filePath, {
			type: "FeatureCollection",
			features: [existingFeature],
		});

		const { error } = captureLogs();
		main(["forest", "100", "200", "card", "New Name"], markersDir);
		expect(error).toHaveBeenCalledWith("Error: Duplicate data detected:");
		expect(process.exitCode).toBe(1);
	});

	it("allows markers with duplicate names", () => {
		const markersDir = createTempDir();
		const filePath = getFilePath("forest", markersDir);
		const existingFeature = createMarkerFeature(
			"forest-001",
			"Duplicate",
			"card",
			100,
			200,
		);
		saveGeojson(filePath, {
			type: "FeatureCollection",
			features: [existingFeature],
		});

		const { log, error } = captureLogs();
		main(["forest", "300", "400", "card", "Duplicate"], markersDir);
		expect(error).not.toHaveBeenCalledWith("Error: Duplicate data detected:");
		expect(process.exitCode).toBeUndefined();
		expect(log).toHaveBeenCalledWith("✓ Total markers in file: 2");
		const saved = JSON.parse(fs.readFileSync(filePath, "utf-8"));
		expect(saved.features).toHaveLength(2);
		expect(
			saved.features.filter(
				(feature) => feature.properties?.name === "Duplicate",
			),
		).toHaveLength(2);
	});

	it("prints preview on dry run", () => {
		const markersDir = createTempDir();
		const { log } = captureLogs();
		main(
			["--dry-run", "forest", "10", "20", "card", "Name", " Description "],
			markersDir,
		);
		expect(log).toHaveBeenCalledWith("\n[DRY RUN] No files will be modified");
		expect(log).toHaveBeenCalledWith("  Description: Description");
	});

	it("adds marker to file when no duplicates", () => {
		const markersDir = createTempDir();
		const { log } = captureLogs();
		main(["forest", "10", "20", "card", "Name"], markersDir);
		const markerPath = getFilePath("forest", markersDir);
		const saved = JSON.parse(fs.readFileSync(markerPath, "utf-8"));
		expect(saved.features).toHaveLength(1);
		expect(log).toHaveBeenCalledWith("✓ Total markers in file: 1");
		expect(saved.features[0].properties).not.toHaveProperty("description");
	});
});
