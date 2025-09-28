import fs from "node:fs";
import path from "node:path";
import process from "node:process";

interface CliArguments {
        start: number;
        end: number;
        category: string;
        outPath?: string;
}

export interface AuditOptions extends CliArguments {
        markersDir?: string;
        files?: string[];
        cwd?: string;
}

interface FeatureLike {
        id?: unknown;
        name?: unknown;
        properties?: {
                id?: unknown;
                name?: unknown;
                category?: unknown;
        } | null;
}

interface FeatureCollectionLike {
        type?: unknown;
        features?: unknown;
}

export interface AuditEntry {
        id: string | null;
        name: string;
        category: string;
}

export interface AuditCounts {
        total: number;
        withNo: number;
        noPrefix: number;
        outputCategory: number;
}

export interface AuditResult {
        range: { start: number; end: number };
        counts: AuditCounts;
        missingNumbers: string[];
        noNumberPrefix: AuditEntry[];
        sortedByName: AuditEntry[];
        output: AuditEntry[];
        write: { path: string };
}

const NO_PREFIX_REGEX = /^No\.(\d{3})\b/i;

const ensureInteger = (value: string, label: string) => {
        const parsed = Number.parseInt(value, 10);
        if (!Number.isInteger(parsed)) {
                throw new Error(`${label} must be an integer`);
        }
        return parsed;
};

export const parseArguments = (argv: string[]): CliArguments => {
        const args: Partial<CliArguments> = {};
        for (let index = 0; index < argv.length; index += 1) {
                const arg = argv[index];
                switch (arg) {
                        case "--start": {
                                const next = argv[++index];
                                if (!next) {
                                        throw new Error("Missing value for --start");
                                }
                                args.start = ensureInteger(next, "start");
                                break;
                        }
                        case "--end": {
                                const next = argv[++index];
                                if (!next) {
                                        throw new Error("Missing value for --end");
                                }
                                args.end = ensureInteger(next, "end");
                                break;
                        }
                        case "--category": {
                                const next = argv[++index];
                                if (!next) {
                                        throw new Error("Missing value for --category");
                                }
                                args.category = next;
                                break;
                        }
                        case "--out": {
                                const next = argv[++index];
                                if (!next) {
                                        throw new Error("Missing value for --out");
                                }
                                args.outPath = next;
                                break;
                        }
                        default:
                                throw new Error(`Unknown argument: ${arg}`);
                }
        }

        if (args.start === undefined || args.end === undefined || !args.category) {
                throw new Error("Missing required argument");
        }

        return args as CliArguments;
};

const readFeatureCollection = (filePath: string): FeatureCollectionLike => {
        const content = fs.readFileSync(filePath, "utf8");
        return JSON.parse(content) as FeatureCollectionLike;
};

const normalizeString = (value: unknown): string =>
        typeof value === "string" ? value : "";

const normalizeId = (value: unknown): string | null =>
        typeof value === "string" ? value : null;

const resolveOutPath = (category: string, provided?: string): string =>
        provided ?? path.join("tmp", category, "audit.json");

const ensureDirectory = (targetPath: string) => {
        const directory = path.dirname(targetPath);
        fs.mkdirSync(directory, { recursive: true });
};

const resolveMarkersDir = (markersDir?: string): string => {
        const resolved = markersDir ?? path.resolve(process.cwd(), "public", "assets", "data", "markers");
        if (!fs.existsSync(resolved)) {
                throw new Error(`Marker directory not found: ${resolved}`);
        }
        return resolved;
};

const resolveFiles = (directory: string, files?: string[]): string[] => {
        if (files && files.length > 0) {
                return files.map((file) => path.resolve(directory, file));
        }
        const entries = fs.readdirSync(directory, { withFileTypes: true });
        const geojsonFiles = entries
                .filter((entry) => entry.isFile() && entry.name.endsWith(".geojson"))
                .map((entry) => path.resolve(directory, entry.name))
                .sort();
        if (geojsonFiles.length === 0) {
                throw new Error(`No GeoJSON files found in ${directory}`);
        }
        return geojsonFiles;
};

const extractEntries = (filePaths: string[]): AuditEntry[] => {
        const entries: AuditEntry[] = [];
        for (const filePath of filePaths) {
                const collection = readFeatureCollection(filePath);
                if (collection.type !== "FeatureCollection") {
                        throw new Error(`GeoJSON root type must be FeatureCollection: ${filePath}`);
                }
                if (!Array.isArray(collection.features)) {
                        throw new Error(`GeoJSON features must be an array: ${filePath}`);
                }

                for (const feature of collection.features as FeatureLike[]) {
                        const properties = feature.properties ?? {};
                        const id = normalizeId(feature.id ?? properties.id);
                        const name = normalizeString(properties.name ?? feature.name);
                        const category = normalizeString(properties.category);
                        entries.push({ id, name, category });
                }
        }
        return entries;
};

const detectNumbers = (
        entries: AuditEntry[],
        start: number,
        end: number,
): {
        missing: string[];
        noPrefix: AuditEntry[];
        withNo: number;
} => {
        const numbersFound = new Set<string>();
        const noPrefix: AuditEntry[] = [];
        let withNo = 0;

        for (const entry of entries) {
                const match = entry.name.match(NO_PREFIX_REGEX);
                if (match) {
                        withNo += 1;
                        const value = match[1];
                        const numericValue = Number.parseInt(value, 10);
                        if (numericValue >= start && numericValue <= end) {
                                numbersFound.add(value);
                        }
                } else {
                        noPrefix.push(entry);
                }
        }

        const missing: string[] = [];
        for (let value = start; value <= end; value += 1) {
                const padded = value.toString().padStart(3, "0");
                if (!numbersFound.has(padded)) {
                        missing.push(padded);
                }
        }

        return { missing, noPrefix, withNo };
};

export const auditGeojsonNumbers = (options: AuditOptions): AuditResult => {
        const { start, end, category, outPath, markersDir, files, cwd } = options;
        if (start > end) {
                throw new Error("start must be less than or equal to end");
        }
        const baseDir = resolveMarkersDir(markersDir);
        const targetFiles = resolveFiles(baseDir, files);
        const entries = extractEntries(targetFiles);
        const scoped = entries.filter((entry) => entry.category === category);
        const collator = new Intl.Collator("ja", { numeric: false, sensitivity: "base" });
        const sortedByName = [...scoped].sort((a, b) => collator.compare(a.name, b.name));

        const { missing, noPrefix, withNo } = detectNumbers(scoped, start, end);
        const output = scoped;

        const counts: AuditCounts = {
                total: scoped.length,
                withNo,
                noPrefix: noPrefix.length,
                outputCategory: scoped.length,
        };

        const writePath = resolveOutPath(category, outPath);
        const workingDir = cwd ?? process.cwd();
        const resolvedWrite = path.isAbsolute(writePath)
                ? writePath
                : path.resolve(workingDir, writePath);
        ensureDirectory(resolvedWrite);

        const result: AuditResult = {
                range: { start, end },
                counts,
                missingNumbers: missing,
                noNumberPrefix: noPrefix,
                sortedByName,
                output,
                write: { path: writePath },
        };

        fs.writeFileSync(resolvedWrite, `${JSON.stringify(result, null, 2)}\n`, "utf8");
        return result;
};

export const main = (argv = process.argv.slice(2)) => {
        try {
                const args = parseArguments(argv);
                const result = auditGeojsonNumbers(args);
                console.log(JSON.stringify(result, null, 2));
        } catch (error) {
                /* c8 ignore next */
                console.error(error instanceof Error ? error.message : String(error));
                process.exitCode = 1;
        }
};

/* c8 ignore start */
const invokedFromCli =
        typeof process.argv[1] === "string" &&
        import.meta.url === `file://${path.resolve(process.argv[1])}`;

if (invokedFromCli) {
        main();
}
/* c8 ignore stop */
