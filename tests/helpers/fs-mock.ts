import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const createTempDir = (prefix = "audit-geojson-") =>
	fs.mkdtempSync(path.join(os.tmpdir(), prefix));

export const removeDir = (dir: string) => {
	fs.rmSync(dir, { recursive: true, force: true });
};

export const fixturePath = (...segments: string[]) =>
	path.resolve(process.cwd(), "tests", "fixtures", ...segments);
