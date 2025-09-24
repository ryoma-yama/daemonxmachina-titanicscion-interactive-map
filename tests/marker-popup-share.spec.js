import { expect, test } from "@playwright/test";

const mapId = "desert";
const markerId = "desert-054";
const storageKey = `collect-map:v1:${mapId}`;

async function setupClipboardMock(page) {
	await page.addInitScript(() => {
		const calls = [];
		const existing = window.navigator.clipboard ?? {};
		const clipboard = {
			...existing,
			writeText: (text) => {
				calls.push(text);
				return Promise.resolve();
			},
		};
		Object.defineProperty(window.navigator, "clipboard", {
			configurable: true,
			value: clipboard,
		});
		window.__clipboardCalls = calls;
	});
}

async function openPopup(page, options = {}) {
	await setupClipboardMock(page);
	await page.goto(`/?map=${mapId}&marker=${markerId}&zoom=1.25`);

	if (Object.hasOwn(options, "initialDone")) {
		const state = options.initialDone
			? { [markerId]: true }
			: { [markerId]: false };
		await page.evaluate(
			({ key, value }) => {
				localStorage.setItem(key, JSON.stringify(value));
			},
			{ key: storageKey, value: state },
		);
		await page.reload();
	}

	const popup = page.locator(".leaflet-popup");
	await expect(popup).toBeVisible();
	return popup;
}

async function getMaskImage(locator) {
	return locator.evaluate((element) => {
		const styles = window.getComputedStyle(element);
		return styles.maskImage || styles.webkitMaskImage || "";
	});
}

test.describe("marker popup actions", () => {
	test("popup shows copy link button with tooltip and layout", async ({
		page,
	}) => {
		const popup = await openPopup(page);
		const button = popup.getByRole("button", { name: "Copy marker link" });
		await expect(button).toBeVisible();

		const describedBy = await button.getAttribute("aria-describedby");
		expect(describedBy).toBeTruthy();

		const tooltip = popup.locator(`#${describedBy}`);
		await expect(tooltip).toHaveAttribute("role", "tooltip");
		await expect(tooltip).toHaveText("Copy link");

		const parentClass = await button.evaluate(
			(el) => el.parentElement?.className,
		);
		expect(parentClass ?? "").toContain("marker-actions");

		const siblings = button.evaluate((el) => {
			const parent = el.parentElement;
			if (!parent) {
				return [];
			}
			return Array.from(parent.children).map((child) => child.className);
		});
		const classList = await siblings;
		expect(classList[0]).toContain("marker-done-toggle");
	});

	test("done toggle exposes default state", async ({ page }) => {
		const popup = await openPopup(page, { initialDone: false });
		const doneButton = popup.getByRole("button", { name: "Mark as done" });
		await expect(doneButton).toHaveAttribute("aria-pressed", "false");

		const tooltipId = await doneButton.getAttribute("aria-describedby");
		const tooltip = popup.locator(`#${tooltipId}`);
		await expect(tooltip).toHaveText("Mark as done");

		const icon = popup.locator(
			".marker-done-toggle .marker-action-button__icon",
		);
		const mask = await getMaskImage(icon);
		expect(mask).toContain("square.svg");
	});

	test("done toggle reflects stored true state", async ({ page }) => {
		const popup = await openPopup(page, { initialDone: true });
		const doneButton = popup.getByRole("button", { name: "Unmark done" });
		await expect(doneButton).toHaveAttribute("aria-pressed", "true");

		const tooltipId = await doneButton.getAttribute("aria-describedby");
		const tooltip = popup.locator(`#${tooltipId}`);
		await expect(tooltip).toHaveText("Unmark done");

		const icon = popup.locator(
			".marker-done-toggle .marker-action-button__icon",
		);
		const mask = await getMaskImage(icon);
		expect(mask).toContain("square-check.svg");
	});

	test("toggle updates state, shows toast once, and persists", async ({
		page,
	}) => {
		const popup = await openPopup(page, { initialDone: false });
		const doneButton = popup.locator(".marker-done-toggle");

		await expect(doneButton).toHaveAttribute("aria-pressed", "false");
		await doneButton.click();
		await expect(doneButton).toHaveAttribute("aria-pressed", "true");

		const toast = page.locator(".notification-toast");
		await expect(toast).toContainText("Done!");
		await toast.waitFor({ state: "detached" });

		const tooltipId = await doneButton.getAttribute("aria-describedby");
		const tooltip = popup.locator(`#${tooltipId}`);
		await expect(tooltip).toHaveText("Unmark done");

		const icon = popup.locator(
			".marker-done-toggle .marker-action-button__icon",
		);
		const mask = await getMaskImage(icon);
		expect(mask).toContain("square-check.svg");

		const storedAfterCheck = await page.evaluate(
			({ key }) => {
				const raw = localStorage.getItem(key);
				return raw ? JSON.parse(raw) : null;
			},
			{ key: storageKey },
		);
		expect(storedAfterCheck?.[markerId]).toBe(true);

		await page.reload();
		const popupAfterReload = page.locator(".leaflet-popup");
		await expect(popupAfterReload).toBeVisible();
		const toggleAfterReload = popupAfterReload.locator(".marker-done-toggle");
		await expect(toggleAfterReload).toHaveAttribute("aria-pressed", "true");

		await toggleAfterReload.click();
		await expect(toggleAfterReload).toHaveAttribute("aria-pressed", "false");
		await expect(page.locator(".notification-toast")).toHaveCount(0, {
			timeout: 500,
		});

		const storedAfterUncheck = await page.evaluate(
			({ key }) => {
				const raw = localStorage.getItem(key);
				return raw ? JSON.parse(raw) : null;
			},
			{ key: storageKey },
		);
		expect(storedAfterUncheck?.[markerId]).toBe(false);
	});

	test("click copies share url and shows toast", async ({ page }) => {
		await openPopup(page);
		const button = page.getByRole("button", { name: "Copy marker link" });
		await button.click();

		const toast = page.locator(".notification-toast");
		await expect(toast).toContainText("Link copied!");

		const clipboardCalls = await page.evaluate(
			() => window.__clipboardCalls ?? [],
		);
		expect(clipboardCalls).toHaveLength(1);

		const copiedUrl = clipboardCalls[0];
		const parsed = new URL(copiedUrl);
		expect(parsed.searchParams.get("map")).toBe(mapId);
		expect(parsed.searchParams.get("marker")).toBe(markerId);
		expect(parsed.searchParams.has("zoom")).toBe(true);

		const currentZoom = await page.evaluate(
			() => window.__DXM_MAP_VIEW__?.getZoomLevel() ?? null,
		);
		if (currentZoom !== null) {
			const zoomParam = Number.parseFloat(
				parsed.searchParams.get("zoom") ?? "NaN",
			);
			expect(Number.isNaN(zoomParam)).toBe(false);
			expect(zoomParam).toBeCloseTo(currentZoom, 2);
		}
	});

	test("keyboard activation copies share url", async ({ page }) => {
		await openPopup(page);
		const button = page.getByRole("button", { name: "Copy marker link" });
		await button.focus();
		await page.keyboard.press("Enter");

		const clipboardCalls = await page.evaluate(
			() => window.__clipboardCalls ?? [],
		);
		expect(clipboardCalls).toHaveLength(1);
	});
});
