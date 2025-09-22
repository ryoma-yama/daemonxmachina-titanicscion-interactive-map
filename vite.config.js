import { defineConfig } from "vite";

export default defineConfig(({ command }) => {
	return {
		// Set base path for both build and preview
		base:
			command === "build" || command === "serve"
				? "/daemonxmachina-titanicscion-interactive-map/"
				: "/",
		build: {
			outDir: "dist",
			sourcemap: true,
			rollupOptions: {
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
