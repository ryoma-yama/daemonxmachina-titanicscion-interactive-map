import { expect, test } from "@playwright/test";

const MUSIC_MARKER_13 = "No.013-Engage";
const MUSIC_MARKER_14 = "No.014-Overkill";
const MUSIC_MARKER_18 = "No.018-Arms Of Immortal";
const MUSIC_MARKER_19 = "No.019-The Neun";
const MUSIC_MARKER_17 = "No.017-Assault Impact";

const captureConsole = (pageErrors) => (msg) => {
	if (msg.type() === "error") {
		pageErrors.push(msg.text());
	}
};

test.describe("search panel", () => {
	test("search can find markers by item entry", async ({ page }) => {
		const pageErrors = [];
		page.on("pageerror", (error) => pageErrors.push(error));
		page.on("console", captureConsole(pageErrors));

		await page.route("**/assets/data/markers/desert.geojson", async (route) => {
			const mockMarkers = {
				type: "FeatureCollection",
				features: [
					{
						type: "Feature",
						geometry: {
							type: "Point",
							coordinates: [600, 600],
						},
						properties: {
							id: "desert-test-001",
							name: "Sealed Vault",
							category: "dungeon",
							description: "Guarded by automatons.",
							items: ["Unique Relic"],
						},
					},
				],
			};

			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(mockMarkers),
			});
		});

		await page.goto("/");

		const toggleButton = page.getByRole("button", {
			name: "Toggle search panel",
		});
		await toggleButton.click();

		const searchInput = page.getByPlaceholder("Search markers");
		await searchInput.fill("relic");

		const firstResult = page
			.locator(".search-panel__result", { hasText: "Sealed Vault" })
			.first();
		await expect(firstResult).toBeVisible();

		await expect(page.locator("#search-message")).toHaveText("1 result");

		expect(
			pageErrors,
			"No errors expected when searching markers by item entry",
		).toEqual([]);
	});

	test("single marker focus updates URL without errors", async ({ page }) => {
		const pageErrors = [];
		page.on("pageerror", (error) => pageErrors.push(error));
		page.on("console", captureConsole(pageErrors));

		await page.goto("/");

		const toggleButton = page.getByRole("button", {
			name: "Toggle search panel",
		});
		await toggleButton.click();

		const searchInput = page.getByPlaceholder("Search markers");
		await searchInput.fill("No.014-Overkill");

		await page
			.locator(".search-panel__result", { hasText: "No.014-Overkill" })
			.first()
			.click();

		await expect(page).toHaveURL(/marker=.+/);
		await page.waitForTimeout(200);

		expect(
			pageErrors,
			"No errors expected when focusing single marker",
		).toEqual([]);
	});

	test("navigating between markers after filtering does not recurse", async ({
		page,
	}) => {
		const pageErrors = [];
		page.on("pageerror", (error) => pageErrors.push(error));
		page.on("console", captureConsole(pageErrors));

		await page.goto("/");

		const toggleButton = page.getByRole("button", {
			name: "Toggle search panel",
		});
		await toggleButton.click();

		const searchInput = page.getByPlaceholder("Search markers");
		await searchInput.fill("music");

		const firstResult = page
			.locator(".search-panel__result", { hasText: MUSIC_MARKER_13 })
			.first();
		await expect(firstResult).toBeVisible();
		await firstResult.click();

		const secondResult = page
			.locator(".search-panel__result", { hasText: MUSIC_MARKER_14 })
			.first();
		await expect(secondResult).toBeVisible();
		await secondResult.click();
		await page.waitForTimeout(250);

		expect(
			pageErrors,
			"No recursion errors expected when focusing multiple markers",
		).toEqual([]);
	});

	test("later music markers in sequence avoid recursion", async ({ page }) => {
		const pageErrors = [];
		page.on("pageerror", (error) => pageErrors.push(error));
		page.on("console", captureConsole(pageErrors));

		await page.goto("/");

		const toggleButton = page.getByRole("button", {
			name: "Toggle search panel",
		});
		await toggleButton.click();

		const searchInput = page.getByPlaceholder("Search markers");
		await searchInput.fill("music");

		const firstResult = page
			.locator(".search-panel__result", { hasText: MUSIC_MARKER_18 })
			.first();
		await expect(firstResult).toBeVisible();
		await firstResult.click();

		const secondResult = page
			.locator(".search-panel__result", { hasText: MUSIC_MARKER_19 })
			.first();
		await expect(secondResult).toBeVisible();
		await secondResult.click();
		await page.waitForTimeout(250);

		expect(
			pageErrors,
			"No errors expected when moving between later music markers",
		).toEqual([]);
	});

	test("reopening the same music marker avoids recursion", async ({ page }) => {
		const pageErrors = [];
		page.on("pageerror", (error) => pageErrors.push(error));
		page.on("console", captureConsole(pageErrors));

		await page.goto("/");

		const toggleButton = page.getByRole("button", {
			name: "Toggle search panel",
		});
		await toggleButton.click();

		const searchInput = page.getByPlaceholder("Search markers");
		await searchInput.fill("music");

		const targetResult = page
			.locator(".search-panel__result", { hasText: MUSIC_MARKER_19 })
			.first();
		await expect(targetResult).toBeVisible();
		await targetResult.click();
		await page.waitForTimeout(150);
		await targetResult.click();
		await page.waitForTimeout(250);

		expect(
			pageErrors,
			"No errors expected when reopening the same marker",
		).toEqual([]);
	});

	test("rapid repeated clicks on a music marker do not crash", async ({
		page,
	}) => {
		const pageErrors = [];
		page.on("pageerror", (error) => pageErrors.push(error));
		page.on("console", captureConsole(pageErrors));

		await page.goto("/");

		const toggleButton = page.getByRole("button", {
			name: "Toggle search panel",
		});
		await toggleButton.click();

		const searchInput = page.getByPlaceholder("Search markers");
		await searchInput.fill("music");

		const targetResult = page
			.locator(".search-panel__result", { hasText: MUSIC_MARKER_19 })
			.first();
		await expect(targetResult).toBeVisible();

		await targetResult.evaluate((element) => {
			for (let i = 0; i < 5; i += 1) {
				element.click();
			}
		});

		await page.waitForTimeout(300);

		expect(
			pageErrors,
			"No errors expected after rapid repeated clicks",
		).toEqual([]);
	});

	test("only the last searched marker popup remains open", async ({ page }) => {
		const pageErrors = [];
		page.on("pageerror", (error) => pageErrors.push(error));
		page.on("console", captureConsole(pageErrors));

		await page.goto("/");

		const toggleButton = page.getByRole("button", {
			name: "Toggle search panel",
		});
		await toggleButton.click();

		const searchInput = page.getByPlaceholder("Search markers");
		await searchInput.fill("music");

		const firstResult = page
			.locator(".search-panel__result", { hasText: MUSIC_MARKER_17 })
			.first();
		await expect(firstResult).toBeVisible();
		await firstResult.click();

		let popups = page.locator(".leaflet-popup");
		await expect(popups).toHaveCount(1);
		await expect(popups.first()).toContainText(MUSIC_MARKER_17);

		const secondResult = page
			.locator(".search-panel__result", { hasText: MUSIC_MARKER_18 })
			.first();
		await expect(secondResult).toBeVisible();
		await secondResult.click();

		popups = page.locator(".leaflet-popup");
		await expect(popups).toHaveCount(1);
		await expect(popups.first()).toContainText(MUSIC_MARKER_18);

		expect(
			pageErrors,
			"No errors expected when switching marker popups",
		).toEqual([]);
	});
});
