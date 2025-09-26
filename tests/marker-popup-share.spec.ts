import { expect, type Page, test } from "@playwright/test";

declare global {
	interface Window {
		__clipboardCalls?: string[];
	}
}

const mapId = "desert";
const markerId = "desert-054";

async function setupClipboardMock(page: Page): Promise<void> {
	await page.addInitScript(() => {
		const calls: string[] = [];
		const existing = window.navigator.clipboard ?? {};
		const clipboard = {
			...existing,
			writeText: (text: string) => {
				calls.push(text);
				return Promise.resolve();
			},
		} as Pick<Clipboard, "writeText">;
		Object.defineProperty(window.navigator, "clipboard", {
			configurable: true,
			value: clipboard,
		});
		window.__clipboardCalls = calls;
	});
}

test.describe("marker popup share link", () => {
	test.beforeEach(async ({ page }) => {
		await setupClipboardMock(page);
		await page.goto(`/?map=${mapId}&marker=${markerId}&zoom=1.25`);
		await expect(page.locator(".leaflet-popup")).toBeVisible();
	});

	test("popup shows copy link button with tooltip and layout", async ({
		page,
	}) => {
		const popup = page.locator(".leaflet-popup");
		const button = popup.getByRole("button", { name: "Copy marker link" });
		await expect(button).toBeVisible();

		const describedBy = await button.getAttribute("aria-describedby");
		expect(describedBy).toBeTruthy();

		if (describedBy) {
			const tooltip = popup.locator(`#${describedBy}`);
			await expect(tooltip).toHaveAttribute("role", "tooltip");
			await expect(tooltip).toHaveText("Copy link");
		}

		const sharesParentWithLabel = await button.evaluate((element) => {
			const parent = element.parentElement;
			if (!parent) {
				return false;
			}
			return Array.from(parent.children).some((child) =>
				child.matches("label.checkbox-label"),
			);
		});
		expect(sharesParentWithLabel).toBe(true);
	});

	test("click copies share url and shows toast", async ({ page }) => {
		const button = page.getByRole("button", { name: "Copy marker link" });
		await button.click();

		const toast = page.locator(".notification-toast");
		await expect(toast).toContainText("Link copied!");

		const clipboardCalls = await page.evaluate(
			() => window.__clipboardCalls ?? [],
		);
		expect(clipboardCalls).toHaveLength(1);

		const [copiedUrl] = clipboardCalls;
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
		const button = page.getByRole("button", { name: "Copy marker link" });
		await button.focus();
		await page.keyboard.press("Enter");

		const clipboardCalls = await page.evaluate(
			() => window.__clipboardCalls ?? [],
		);
		expect(clipboardCalls).toHaveLength(1);
	});
});
