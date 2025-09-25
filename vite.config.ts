import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig(({ command }) => {
	const isBuild = command === "build";

	return {
		base: isBuild ? "/daemonxmachina-titanicscion-interactive-map/" : "/",
		esbuild: isBuild ? { pure: ["console.log"] } : undefined,
		build: {
			outDir: "dist",
			sourcemap: true,
			rollupOptions: {
				input: {
					main: resolve(projectRoot, "index.html"),
					about: resolve(projectRoot, "about.html"),
				},
				output: {
					manualChunks: {
						// Separate Leaflet as vendor chunk
						leaflet: ["leaflet"],
					},
				},
			},
		},
		server: {
			port: 3000,
			host: true, // GitHub Codespace support
		},
		preview: {
			port: 4173,
			host: true,
		},
	};
});
