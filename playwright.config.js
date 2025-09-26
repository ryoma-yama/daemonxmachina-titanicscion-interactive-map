import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
        testDir: "./tests",
        testMatch: "**/*.spec.ts",
	timeout: 60_000,
	expect: {
		timeout: 10_000,
	},
	retries: 0,
	use: {
		baseURL: "http://127.0.0.1:4173",
		headless: true,
		trace: "retain-on-failure",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
	webServer: {
		command: "pnpm build && pnpm preview --host 127.0.0.1 --port 4173",
		url: "http://127.0.0.1:4173",
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
	},
});
