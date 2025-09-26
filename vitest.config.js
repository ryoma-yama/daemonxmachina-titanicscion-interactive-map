import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		include: ["tests/**/*.test.ts"],
		pool: "threads",
		poolOptions: {
			threads: {
				minThreads: 1,
				maxThreads: 1,
			},
		},
		coverage: {
			provider: "v8",
			all: true,
			include: ["scripts/add_marker.js"],
			reporter: ["text", "json-summary"],
			thresholds: {
				branches: 100,
				functions: 100,
				lines: 100,
				statements: 100,
			},
		},
	},
});
