import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const MARKERS_DIR = path.join(ROOT_DIR, "public", "assets", "data", "markers");

interface MarkerSummary {
        mapId: string;
        id: string;
        name: string;
}

const categoryToMarkers = new Map<string, MarkerSummary[]>();

for (const file of fs.readdirSync(MARKERS_DIR)) {
	if (!file.endsWith(".geojson")) {
		continue;
	}
	const mapId = path.basename(file, ".geojson");
	const content = fs.readFileSync(path.join(MARKERS_DIR, file), "utf8");
	const data = JSON.parse(content);
	for (const feature of data.features) {
		const category = feature.properties.category;
                if (!categoryToMarkers.has(category)) {
                        categoryToMarkers.set(category, []);
                }
                categoryToMarkers.get(category)?.push({
                        mapId,
                        id: feature.properties.id,
                        name: feature.properties.name || feature.properties.id,
                });
        }
}

const ALL_CATEGORIES = Array.from(categoryToMarkers.keys());
const PRIMARY_CATEGORY = ALL_CATEGORIES.includes("music")
        ? "music"
        : ALL_CATEGORIES[0];
const PRIMARY_DESERT_MARKER =
        categoryToMarkers
                .get(PRIMARY_CATEGORY)
                ?.find((marker) => marker.mapId === "desert") ||
        categoryToMarkers.get(PRIMARY_CATEGORY)?.[0];
if (!PRIMARY_DESERT_MARKER) {
        throw new Error("No markers available for primary category");
}
const PRIMARY_MARKER: MarkerSummary = PRIMARY_DESERT_MARKER;
const SECONDARY_MAP_ID = PRIMARY_MARKER.mapId === "forest" ? "mountains" : "forest";
const SECONDARY_MARKER = categoryToMarkers
        .get(PRIMARY_CATEGORY)
        ?.find((marker) => marker.mapId === SECONDARY_MAP_ID);
const CARD_MARKER = categoryToMarkers
        .get("card")
        ?.find((marker) => marker.mapId === "desert");

declare global {
        interface Window {
                __filterEvents?: Array<{ selectedCategories?: string[] }>;
                __filterListener?: (event: CustomEvent<{ selectedCategories?: string[] }>) => void;
        }
}

async function openFilterPane(page: Page): Promise<void> {
        await page.getByTestId("filter-toggle").click();
        await expect(page.getByTestId("filter-pane")).toBeVisible();
        for (const category of ALL_CATEGORIES) {
                await page.getByTestId(`filter-item-${category}`).waitFor();
        }
}

async function openSearchPanel(page: Page) {
        const toggle = page.getByRole("button", { name: "Toggle search panel" });
        await toggle.click();
        const input = page.getByPlaceholder("Search markers");
        await expect(input).toBeVisible();
        return input;
}

test.describe("filter pane", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
	});

	test("pane toggle shows all controls", async ({ page }) => {
		await expect(page.getByTestId("filter-pane")).toBeHidden();
		await openFilterPane(page);

		await expect(page.getByTestId("filter-all")).toBeVisible();
		await expect(page.getByTestId("filter-none")).toBeVisible();

		for (const category of ALL_CATEGORIES) {
			await expect(page.getByTestId(`filter-item-${category}`)).toBeVisible();
		}
	});

	test("default state keeps all categories active", async ({ page }) => {
		await openFilterPane(page);

		for (const category of ALL_CATEGORIES) {
			const checkbox = page
				.getByTestId(`filter-item-${category}`)
				.locator("input[type=checkbox]");
			await expect(checkbox).toBeChecked();
		}

                await expect(
                        page.locator(`[data-marker-id="${PRIMARY_MARKER.id}"]`),
                ).toBeVisible();

                const searchInput = await openSearchPanel(page);
                await searchInput.fill(PRIMARY_MARKER.name.slice(0, 5));
		await expect(page.getByTestId("search-result-item").first()).toBeVisible();
	});

	test("toggling a single category hides related markers and results", async ({
		page,
	}) => {
		test.skip(
                        !PRIMARY_MARKER,
                        "No marker available for primary category",
                );

		await openFilterPane(page);
		const targetRow = page.getByTestId(`filter-item-${PRIMARY_CATEGORY}`);
		await targetRow.click();

		await expect(targetRow.locator("input[type=checkbox]")).not.toBeChecked();
                await expect(
                        page.locator(`[data-marker-id="${PRIMARY_MARKER.id}"]`),
                ).toHaveCount(0);

		const searchInput = await openSearchPanel(page);
                await searchInput.fill(PRIMARY_MARKER.name);
		await expect(page.getByTestId("search-result-item")).toHaveCount(0);
		await expect(page.locator("#search-message")).toContainText(
			"No markers found",
		);
	});

	test("all button re-enables every category", async ({ page }) => {
		await openFilterPane(page);
		const toggles = [
			PRIMARY_CATEGORY,
			CARD_MARKER?.id ? "card" : ALL_CATEGORIES[1],
		];

		for (const category of toggles) {
			if (!category) continue;
			await page.getByTestId(`filter-item-${category}`).click();
		}

		await page.getByTestId("filter-all").click();

		for (const category of ALL_CATEGORIES) {
			await expect(
				page
					.getByTestId(`filter-item-${category}`)
					.locator("input[type=checkbox]"),
			).toBeChecked();
		}

                await expect(
                        page.locator(`[data-marker-id="${PRIMARY_MARKER.id}"]`),
                ).toBeVisible();
	});

	test("none button clears all markers and results", async ({ page }) => {
		await openFilterPane(page);
		await page.getByTestId("filter-none").click();

		for (const category of ALL_CATEGORIES) {
			await expect(
				page
					.getByTestId(`filter-item-${category}`)
					.locator("input[type=checkbox]"),
			).not.toBeChecked();
		}

		await expect(page.getByTestId("map-marker")).toHaveCount(0);

		const searchInput = await openSearchPanel(page);
                await searchInput.fill(PRIMARY_MARKER.name);
                await expect(page.getByTestId("search-result-item")).toHaveCount(0);
                await expect(page.locator("#search-message")).toContainText(
                        "No markers found",
                );
	});

	test("preferences persist after reload", async ({ page }) => {
		await openFilterPane(page);
		await page.getByTestId(`filter-item-${PRIMARY_CATEGORY}`).click();
                await expect(
                        page.locator(`[data-marker-id="${PRIMARY_MARKER.id}"]`),
                ).toHaveCount(0);

		await page.reload();
		await openFilterPane(page);

                await expect(
                        page
                                .getByTestId(`filter-item-${PRIMARY_CATEGORY}`)
                                .locator("input[type=checkbox]"),
                ).not.toBeChecked();
                await expect(
                        page.locator(`[data-marker-id="${PRIMARY_MARKER.id}"]`),
                ).toHaveCount(0);
	});

        test("filter selection is shared across maps", async ({ page }) => {
                test.skip(
                        !SECONDARY_MARKER,
                        "No secondary marker available for selected category",
                );
                const secondaryMarker = SECONDARY_MARKER as MarkerSummary;
                await openFilterPane(page);
                await page.getByTestId(`filter-item-${PRIMARY_CATEGORY}`).click();

                await page.locator(`.map-link[data-map="${SECONDARY_MAP_ID}"]`).click();

                await expect(
                        page.locator(`[data-marker-id="${secondaryMarker.id}"]`),
                ).toHaveCount(0);
		await expect(
			page
				.getByTestId(`filter-item-${PRIMARY_CATEGORY}`)
				.locator("input[type=checkbox]"),
		).not.toBeChecked();
	});

	test("keyboard navigation toggles items", async ({ page }) => {
		await openFilterPane(page);
		const firstCategory = ALL_CATEGORIES[0];
		const secondCategory = ALL_CATEGORIES[1] || ALL_CATEGORIES[0];
		const firstRow = page.getByTestId(`filter-item-${firstCategory}`);
		await firstRow.focus();
		await page.keyboard.press("Space");
		await expect(firstRow.locator("input[type=checkbox]")).not.toBeChecked();

		await page.keyboard.press("ArrowDown");
		const secondRow = page.getByTestId(`filter-item-${secondCategory}`);
		await secondRow.focus();
		await page.keyboard.press("Enter");
		await expect(secondRow.locator("input[type=checkbox]")).not.toBeChecked();
	});

	test("filter changed event emits payload", async ({ page }) => {
                await page.evaluate(() => {
                        window.__filterEvents = [];
                        const listener = (
                                event: CustomEvent<{ selectedCategories?: string[] }>,
                        ) => {
                                (window.__filterEvents ??= []).push(event.detail);
                        };
                        window.__filterListener = listener;
                        document.addEventListener(
                                "filter:changed",
                                listener as EventListener,
                        );
                });

		await openFilterPane(page);
                await page.getByTestId(`filter-item-${PRIMARY_CATEGORY}`).click();
                await page.getByTestId("filter-all").click();

                const events = await page.evaluate(() => window.__filterEvents ?? []);
                expect(events.length).toBeGreaterThanOrEqual(2);
                expect(events[events.length - 1]?.selectedCategories).toBeDefined();
                expect(Array.isArray(events[events.length - 1].selectedCategories)).toBe(
                        true,
                );
        });

        test("search results exclude filtered categories", async ({ page }) => {
                await openFilterPane(page);
                await page.getByTestId(`filter-item-${PRIMARY_CATEGORY}`).click();

                const searchInput = await openSearchPanel(page);
                await searchInput.fill(PRIMARY_MARKER.name);
                await expect(page.getByTestId("search-result-item")).toHaveCount(0);

                await page.getByTestId("filter-all").click();
                await searchInput.fill("");
                await searchInput.fill(PRIMARY_MARKER.name);
                await expect(page.getByTestId("search-result-item").first()).toBeVisible();
        });
});
