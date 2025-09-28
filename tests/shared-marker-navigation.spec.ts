import { expect, type Page, test } from "@playwright/test";

const markerId = "desert-054";
const markerName = "Gunfort";

async function clearStorage(page: Page): Promise<void> {
	await page.evaluate(() => {
		localStorage.clear();
		sessionStorage.clear();
	});
}

test.describe("shared marker navigation", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		await clearStorage(page);
		await page.reload();
	});

	test("opens targeted marker even when category is hidden", async ({
		page,
	}) => {
		const filterToggle = page.getByTestId("filter-toggle");
		await filterToggle.click();

		const bossCheckbox = page.locator("#filter-checkbox-boss");
		await expect(bossCheckbox).toBeChecked();
		await bossCheckbox.setChecked(false);

		const markerLocator = page.locator(`#map [data-marker-id="${markerId}"]`);
		await expect(markerLocator).toHaveCount(0);

		await page.goto(`/?map=desert&marker=${markerId}&zoom=1`);

		await expect(markerLocator).not.toHaveCount(0);
		await expect(markerLocator.first()).toBeVisible();
		const popup = page.locator(".leaflet-popup");
		await expect(popup).toBeVisible();
		await expect(popup).toContainText(markerName);

		const reopenFilterToggle = page.getByTestId("filter-toggle");
		await reopenFilterToggle.click();
		const bossCheckboxAfterNavigation = page.locator("#filter-checkbox-boss");
		await expect(bossCheckboxAfterNavigation).not.toBeChecked();
	});

	test("opens targeted marker even when hide collected is enabled", async ({
		page,
	}) => {
		const searchToggle = page.getByRole("button", {
			name: "Toggle search panel",
		});
		await searchToggle.click();

		const searchInput = page.getByPlaceholder("Search markers");
		await searchInput.fill(markerName);

		const result = page
			.locator(".search-panel__result", { hasText: markerName })
			.first();
		await expect(result).toBeVisible();
		await result.click();

		const popup = page.locator(".leaflet-popup");
		await expect(popup).toBeVisible();

		const collectedCheckbox = popup.getByRole("checkbox", {
			name: "Collected",
		});
		await collectedCheckbox.check();

		const hideToggle = page.getByTestId("hide-toggle");
		await hideToggle.click();
		await expect(hideToggle).toHaveAttribute("aria-pressed", "true");

		const markerLocator = page.locator(`#map [data-marker-id="${markerId}"]`);
		await expect(markerLocator).toHaveCount(0);

		await page.goto(`/?map=desert&marker=${markerId}&zoom=1`);

		await expect(markerLocator).not.toHaveCount(0);
		await expect(markerLocator.first()).toBeVisible();
		const popupAfterNavigation = page.locator(".leaflet-popup");
		await expect(popupAfterNavigation).toBeVisible();
		await expect(popupAfterNavigation).toContainText(markerName);

		const hideToggleAfterNavigation = page.getByTestId("hide-toggle");
		await expect(hideToggleAfterNavigation).toHaveAttribute(
			"aria-pressed",
			"true",
		);
	});

	test("shows error toast when marker id is invalid", async ({ page }) => {
		await page.goto("/?map=desert&marker=invalid-id&zoom=1");

		const toast = page.locator(".notification-toast");
		await expect(toast).toHaveClass(/notification-toast--error/);
		await expect(toast).toContainText("Marker not found");
	});

	test("respects zoom parameter from shared url", async ({ page }) => {
		await page.goto(`/?map=desert&marker=${markerId}&zoom=1.25`);

		const markerLocator = page.locator(`#map [data-marker-id="${markerId}"]`);
		await expect(markerLocator).not.toHaveCount(0);
		await expect(markerLocator.first()).toBeVisible();
		const popup = page.locator(".leaflet-popup");
		await expect(popup).toBeVisible();

		await expect
			.poll(async () => {
				return page.evaluate(() => window.__DXM_MAP_VIEW__?.getZoomLevel());
			})
			.toBeCloseTo(1.25, 2);
	});
});
