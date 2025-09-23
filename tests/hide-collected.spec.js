import { test, expect } from "@playwright/test";

const captureConsole = (pageErrors) => (msg) => {
	if (msg.type() === "error") {
		pageErrors.push(msg.text());
	}
};

test.describe("hide collected toggle", () => {
	test("hides collected markers from map and search and persists state", async ({ page }) => {
		const pageErrors = [];
		page.on("pageerror", (error) => pageErrors.push(error));
		page.on("console", captureConsole(pageErrors));

		await page.goto("/");

		const hideToggle = page.getByTestId("hide-toggle");
		await expect(hideToggle).toHaveAttribute("aria-pressed", "false");

		const markerLocator = page.locator(
			'.leaflet-marker-icon[data-marker-id="desert-006"]',
		);
		await expect(markerLocator).toHaveCount(1);

		const searchToggle = page.getByRole("button", { name: "Toggle search panel" });
		await searchToggle.click();

		const searchInput = page.getByPlaceholder("Search markers");
		await searchInput.fill("Pierced Heart");

		const targetResult = page
			.locator(".search-panel__result", { hasText: "Pierced Heart" })
			.first();
		await expect(targetResult).toBeVisible();
		await targetResult.click();

		const popup = page.locator(".leaflet-popup");
		await expect(popup).toBeVisible();
		await expect(popup).toContainText("Pierced Heart");

		const collectedCheckbox = popup.getByRole("checkbox", { name: "Collected" });
		await expect(collectedCheckbox).not.toBeChecked();
		await collectedCheckbox.check();

		await hideToggle.click();
		await expect(hideToggle).toHaveAttribute("aria-pressed", "true");
		await expect(markerLocator).toHaveCount(0);

		await searchInput.fill("Pierced Heart");
		await expect(
			page.locator(".search-panel__result", { hasText: "Pierced Heart" }),
		).toHaveCount(0);
		await expect(page.locator("#search-message")).toHaveText("No markers found");

		await page.reload();

		const hideToggleAfterReload = page.getByTestId("hide-toggle");
		await expect(hideToggleAfterReload).toHaveAttribute("aria-pressed", "true");
		await expect(markerLocator).toHaveCount(0);

		await hideToggleAfterReload.click();
		await expect(hideToggleAfterReload).toHaveAttribute("aria-pressed", "false");
		await expect(markerLocator).toHaveCount(1);

		const searchToggleAfterReload = page.getByRole("button", {
			name: "Toggle search panel",
		});
		await searchToggleAfterReload.click();

		const searchInputAfterReload = page.getByPlaceholder("Search markers");
		await searchInputAfterReload.fill("Pierced Heart");

		await expect(
			page.locator(".search-panel__result", { hasText: "Pierced Heart" }),
		).toHaveCount(1);
		await expect(markerLocator).toHaveCount(1);

		expect(pageErrors, "No errors expected during hide toggle flow").toEqual([]);
	});
});
