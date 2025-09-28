import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const ADD_MARKER_SCRIPT = path.resolve("scripts/add_marker.ts");

const markerPattern = /^(\w+)\s+(\d+)\s+(\d+)\s+(\w+)\s+"([^"]*)"(?:\s+"([^"]*)")?$/u;

interface MarkerCommand {
        mapId: string;
        x: string;
        y: string;
        category: string;
        name: string;
        description: string;
}

interface BatchArguments {
        inputFile: string;
        dryRun: boolean;
}

interface AddMarkerResult {
        success: boolean;
        output: string;
}

const resolveTsxExecutable = (): string => {
        const executableName = process.platform === "win32" ? "tsx.cmd" : "tsx";
        const localPath = path.resolve("node_modules", ".bin", executableName);

        if (fs.existsSync(localPath)) {
                return localPath;
        }

        return executableName;
};

const TSX_EXECUTABLE = resolveTsxExecutable();

function parseMarkerLine(line: string): MarkerCommand | null {
        const trimmed = line.trim();
        if (trimmed === "" || trimmed.startsWith("#")) {
                return null;
        }

        const match = trimmed.match(markerPattern);
        if (!match) {
                console.warn(`Warning: Could not parse line: ${line.trimEnd()}`);
                return null;
        }

        const [, mapId, x, y, category, name, description] = match;
        return {
                mapId,
                x,
                y,
                category,
                name,
                description: description ?? "",
        };
}

function runAddMarker(markerData: MarkerCommand, dryRun: boolean): AddMarkerResult {
        const args = [
                ADD_MARKER_SCRIPT,
                markerData.mapId,
                markerData.x,
                markerData.y,
                markerData.category,
                markerData.name,
        ];

        if (markerData.description) {
                args.push(markerData.description);
        }

        if (dryRun) {
                args.push("--dry-run");
        }

        const result = spawnSync(TSX_EXECUTABLE, args, { encoding: "utf-8" });

        return {
                success: result.status === 0,
                output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
        };
}

function parseArguments(argv: readonly string[] = process.argv.slice(2)): BatchArguments {
        if (argv.length === 0) {
                throw new Error("Usage: tsx scripts/batch_add_markers.ts <input_file> [--dry-run]");
        }

        const args = [...argv];
        const dryRunIndex = args.indexOf("--dry-run");
        const dryRun = dryRunIndex !== -1;

        if (dryRun) {
                args.splice(dryRunIndex, 1);
        }

        const [inputFile] = args;
        if (!inputFile) {
                throw new Error("Input file path is required");
        }

        return { inputFile: path.resolve(inputFile), dryRun };
}

export function main(argv: readonly string[] = process.argv.slice(2)): void {
        let parsed: BatchArguments;
        try {
                parsed = parseArguments(argv);
        } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                console.error(message);
                process.exitCode = 1;
                return;
        }

        const { inputFile, dryRun } = parsed;

        if (!fs.existsSync(inputFile)) {
                console.error(`Error: File ${inputFile} does not exist`);
                process.exitCode = 1;
                return;
        }

        console.log(`Processing markers from: ${inputFile}`);
        if (dryRun) {
                console.log("DRY RUN mode - no files will be modified");
        }
        console.log("");

        const lines = fs.readFileSync(inputFile, "utf-8").split("\n");
        let successCount = 0;
        let errorCount = 0;

        lines.forEach((line, index) => {
                const marker = parseMarkerLine(line);
                if (!marker) {
                        return;
                }

                console.log(`Processing line ${index + 1}: ${marker.name}`);
                const { success, output } = runAddMarker(marker, dryRun);

                if (success) {
                        successCount += 1;
                        if (!dryRun) {
                                console.log("  ✓ Added successfully");
                        }
                } else {
                        errorCount += 1;
                        console.log(`  ✗ Failed`);
                }

                if (dryRun || !success) {
                        const trimmedOutput = output.trim();
                        if (trimmedOutput) {
                                const snippet = trimmedOutput.length > 200
                                        ? `${trimmedOutput.slice(0, 200)}...`
                                        : trimmedOutput;
                                console.log(`    Output: ${snippet}`);
                        }
                }
                console.log("");
        });

        const totalProcessed = successCount + errorCount;
        console.log("Summary:");
        console.log(`  Successful: ${successCount}`);
        console.log(`  Errors: ${errorCount}`);
        console.log(`  Total processed: ${totalProcessed}`);
}

function isExecutedDirectly(
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

if (isExecutedDirectly()) {
        try {
                main();
        } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                console.error(`Error: ${message}`);
                process.exit(1);
        }
}
