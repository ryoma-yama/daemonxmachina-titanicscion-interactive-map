import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as auditModule from "../scripts/audit_geojson_numbers.ts";
import { createTempDir, fixturePath, removeDir } from "./helpers/fs-mock.ts";

const { auditGeojsonNumbers, parseArguments, main } = auditModule;
type AuditResult = auditModule.AuditResult;

describe("auditGeojsonNumbers", () => {
	let cwd: string | undefined;

	const readResultFile = (result: AuditResult, baseDir: string) => {
		const absolutePath = path.isAbsolute(result.write.path)
			? result.write.path
			: path.join(baseDir, result.write.path);
		const written = fs.readFileSync(absolutePath, "utf8");
		return JSON.parse(written) as AuditResult;
	};

	afterEach(() => {
		if (cwd) {
			removeDir(cwd);
			cwd = undefined;
		}
		vi.restoreAllMocks();
		process.exitCode = undefined;
	});

	it("aggregates GeoJSON files, scopes to category, and writes audit report", () => {
		cwd = createTempDir();
		const result = auditGeojsonNumbers({
			start: 1,
			end: 10,
			category: "log",
			markersDir: fixturePath("markers"),
			cwd,
		});

		expect(result.range).toEqual({ start: 1, end: 10 });
		expect(result.counts).toEqual({
			total: 8,
			withNo: 6,
			noPrefix: 2,
			outputCategory: 8,
		});
		expect(result.counts.total).toBe(
			result.counts.withNo + result.counts.noPrefix,
		);
		expect(result.missingNumbers).toEqual(["002", "003", "004", "006", "009"]);
		expect(result.noNumberPrefix).toEqual([
			{ id: null, name: "Beta without number", category: "log" },
			{ id: "mountains-003", name: "Gamma without number", category: "log" },
		]);
		expect(
			result.noNumberPrefix.every((entry) => entry.category === "log"),
		).toBe(true);
		expect(result.output).toHaveLength(8);
		expect(result.output.every((item) => item.category === "log")).toBe(true);
		expect(result.sortedByName.map((entry) => entry.name)).toEqual([
			"Beta without number",
			"Gamma without number",
			"No.001 Alpha",
			"No.005 Desert Log",
			"No.007 Zeta",
			"no.008 lowercase",
			"No.010 さくら",
			"No.300 Outside Range",
		]);
		expect(result.sortedByName.every((entry) => entry.category === "log")).toBe(
			true,
		);
		expect(result.write.path).toBe("tmp/log/audit.json");

		if (!cwd) {
			throw new Error("Temporary directory was not created");
		}
		const saved = readResultFile(result, cwd);
		expect(saved).toEqual(result);
	});

	it("allows overriding output path and only emits requested category", () => {
		cwd = createTempDir();
		const outPath = "reports/custom-output.json";
		const result = auditGeojsonNumbers({
			start: 1,
			end: 10,
			category: "card",
			markersDir: fixturePath("markers"),
			cwd,
			outPath,
		});

		expect(result.counts.total).toBe(1);
		expect(result.counts.noPrefix).toBe(0);
		expect(result.counts.outputCategory).toBe(1);
		expect(result.output).toEqual([
			{ id: "forest-002", name: "No.002 Card", category: "card" },
		]);
		expect(result.write.path).toBe(outPath);
		if (!cwd) {
			throw new Error("Temporary directory was not created");
		}
		const saved = readResultFile(result, cwd);
		expect(saved.output).toEqual(result.output);
	});

	it("filters decal category independently", () => {
		cwd = createTempDir();
		const result = auditGeojsonNumbers({
			start: 10,
			end: 12,
			category: "decal",
			markersDir: fixturePath("markers"),
			cwd,
		});

		expect(result.counts).toEqual({
			total: 2,
			withNo: 1,
			noPrefix: 1,
			outputCategory: 2,
		});
		expect(result.counts.total).toBe(
			result.counts.withNo + result.counts.noPrefix,
		);
		expect(result.missingNumbers).toEqual(["010", "012"]);
		expect(result.noNumberPrefix).toEqual([
			{ id: "decal-002", name: "Sticker", category: "decal" },
		]);
		expect(result.sortedByName.map((entry) => entry.name)).toEqual([
			"No.011 Vinyl",
			"Sticker",
		]);
		expect(
			result.sortedByName.every((entry) => entry.category === "decal"),
		).toBe(true);
		expect(result.output).toEqual([
			{ id: "decal-001", name: "No.011 Vinyl", category: "decal" },
			{ id: "decal-002", name: "Sticker", category: "decal" },
		]);
	});

	it("writes to absolute output paths without rejoining cwd", () => {
		cwd = createTempDir();
		const absoluteOut = path.join(cwd, "absolute-output.json");
		const result = auditGeojsonNumbers({
			start: 1,
			end: 10,
			category: "log",
			markersDir: fixturePath("markers"),
			cwd,
			outPath: absoluteOut,
		});

		expect(result.write.path).toBe(absoluteOut);
		expect(fs.existsSync(absoluteOut)).toBe(true);
	});

	it("normalizes missing properties to empty strings", () => {
		cwd = createTempDir();
		const outFile = path.join(cwd, "normalized.json");
		const result = auditGeojsonNumbers({
			start: 1,
			end: 5,
			category: "",
			markersDir: fixturePath("nonstring"),
			files: ["mixed.geojson"],
			cwd,
			outPath: outFile,
		});

		expect(result.counts.total).toBe(2);
		expect(result.output).toEqual([
			{ id: null, name: "", category: "" },
			{ id: null, name: "", category: "" },
		]);
		expect(result.noNumberPrefix).toEqual([
			{ id: null, name: "", category: "" },
			{ id: null, name: "", category: "" },
		]);
		expect(fs.existsSync(outFile)).toBe(true);
	});

	it("throws when start is greater than end", () => {
		expect(() =>
			auditGeojsonNumbers({
				start: 5,
				end: 1,
				category: "log",
				markersDir: fixturePath("markers"),
			}),
		).toThrow("start must be less than or equal to end");
	});

	it("throws when marker directory is missing", () => {
		expect(() =>
			auditGeojsonNumbers({
				start: 1,
				end: 10,
				category: "log",
				markersDir: path.join(process.cwd(), "tests", "fixtures", "missing"),
			}),
		).toThrow(/Marker directory/);
	});

	it("throws when marker directory has no GeoJSON files", () => {
		const tempRoot = createTempDir();
		cwd = tempRoot;
		const emptyDir = path.join(tempRoot, "empty");
		fs.mkdirSync(emptyDir, { recursive: true });
		expect(() =>
			auditGeojsonNumbers({
				start: 1,
				end: 10,
				category: "log",
				markersDir: emptyDir,
			}),
		).toThrow("No GeoJSON files found");
	});

	it("throws when GeoJSON root is invalid", () => {
		expect(() =>
			auditGeojsonNumbers({
				start: 1,
				end: 10,
				category: "log",
				markersDir: fixturePath("invalid"),
				files: ["invalid_root.json"],
			}),
		).toThrow("FeatureCollection");
	});

	it("throws when GeoJSON features is not an array", () => {
		expect(() =>
			auditGeojsonNumbers({
				start: 1,
				end: 10,
				category: "log",
				markersDir: fixturePath("invalid"),
				files: ["invalid_features.json"],
			}),
		).toThrow("features must be an array");
	});

	it("parseArguments enforces required flags and integer bounds", () => {
		expect(() =>
			parseArguments(["--start", "a", "--end", "10", "--category", "log"]),
		).toThrow("start must be an integer");
		expect(() => parseArguments(["--start"])).toThrow(
			"Missing value for --start",
		);
		expect(() => parseArguments(["--start", "1", "--end"])).toThrow(
			"Missing value for --end",
		);
		expect(() =>
			parseArguments(["--start", "1", "--end", "2", "--category"]),
		).toThrow("Missing value for --category");
		expect(() => parseArguments(["--start", "1", "--category", "log"])).toThrow(
			"Missing required argument",
		);
		expect(() => parseArguments(["--unknown", "value"])).toThrow(
			"Unknown argument: --unknown",
		);
		expect(() =>
			parseArguments([
				"--start",
				"1",
				"--end",
				"2",
				"--category",
				"log",
				"--out",
			]),
		).toThrow("Missing value for --out");
		expect(
			parseArguments([
				"--start",
				"5",
				"--end",
				"15",
				"--category",
				"log",
				"--out",
				"custom.json",
			]),
		).toEqual({ start: 5, end: 15, category: "log", outPath: "custom.json" });
	});

	it("main logs audit output when execution succeeds", () => {
		const projectRoot = createTempDir();
		cwd = projectRoot;
		const markersRoot = path.join(
			projectRoot,
			"public",
			"assets",
			"data",
			"markers",
		);
		fs.mkdirSync(markersRoot, { recursive: true });
		for (const file of [
			"desert.geojson",
			"forest.geojson",
			"mountains.geojson",
		]) {
			fs.copyFileSync(
				fixturePath("markers", file),
				path.join(markersRoot, file),
			);
		}

		const outPath = "reports/audit.json";
		const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(projectRoot);

		main([
			"--start",
			"1",
			"--end",
			"10",
			"--category",
			"log",
			"--out",
			outPath,
		]);

		expect(errorSpy).not.toHaveBeenCalled();
		expect(logSpy).toHaveBeenCalledTimes(1);
		const logged = logSpy.mock.calls[0][0];
		const parsed = JSON.parse(logged as string) as AuditResult;
		expect(parsed.write.path).toBe(outPath);
		const writtenFile = path.join(projectRoot, outPath);
		expect(fs.existsSync(writtenFile)).toBe(true);
		expect(process.exitCode).toBeUndefined();

		cwdSpy.mockRestore();
	});

	it("main reports errors and sets exit code", () => {
		const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		main(["--start", "1", "--category", "log"]);

		expect(logSpy).not.toHaveBeenCalled();
		expect(errorSpy).toHaveBeenCalledWith("Missing required argument");
		expect(process.exitCode).toBe(1);
	});
});
