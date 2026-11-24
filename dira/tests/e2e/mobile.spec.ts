import { expect, test, type Page } from "@playwright/test";
import { sample } from "./helpers";

/** A real finger swipe (CDP touch events), so the browser's own touch-action rules apply. */
async function swipe(page: Page, x: number, y0: number, y1: number) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: y0 }] });
  for (let i = 1; i <= 10; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y0 + ((y1 - y0) * i) / 10 }] });
    await page.waitForTimeout(16);
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForTimeout(400);
}

test("landing on a phone: upload on the first screen, no sideways scroll, a way to start everywhere", async ({ page }) => {
  await page.goto("/he");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  const upload = (await page.getByRole("button", { name: "העלאת תמונות" }).first().boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(upload.y + upload.height).toBeLessThan(viewport.height);
  await expect(page.getByRole("button", { name: "צילום עכשיו" }).first()).toBeVisible();
  await expect(page.getByRole("banner").getByRole("link", { name: "לשפר תמונות", exact: true })).toBeVisible();

  // Further down the page, a bar with the same action appears.
  await page.locator("#how").scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: "לשפר תמונות בחינם" })).toBeVisible();
});

test("a vertical swipe that starts on the demo photo scrolls the page", async ({ page }) => {
  await page.goto("/he");
  const photo = page.getByRole("slider").first();
  await photo.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => scrollY);
  const box = (await photo.boundingBox())!;
  await swipe(page, box.x + 40, box.y + 60, box.y - 200);
  const after = await page.evaluate(() => scrollY);
  expect(after - before).toBeGreaterThan(100);
});

test("studio on a phone: the photo stays on screen while the panel scrolls", async ({ page }) => {
  await page.goto("/he/studio");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.locator("input[type=file]").first().setInputFiles([sample(1)]);
  const slider = page.locator("[role=slider][aria-valuenow]").first();
  await expect(slider).toBeVisible({ timeout: 45_000 });
  // The app fills the screen; the page itself doesn't scroll.
  const dims = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth - innerWidth, sh: document.documentElement.scrollHeight - innerHeight }));
  expect(dims.sw).toBeLessThanOrEqual(0);
  expect(dims.sh).toBeLessThanOrEqual(1);
  // Reaching the last control in the panel keeps the photo in view.
  await page.getByText("כיוונון מתקדם").scrollIntoViewIfNeeded();
  await expect(slider).toBeInViewport();
  // The save button is always reachable and opens the export.
  await page.getByRole("button", { name: "לשמירה ושליחה" }).last().click();
  await expect(page.getByRole("tab", { name: "שמירה ושליחה" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("button", { name: /הורדת התמונה|הכנת התמונה/ })).toBeInViewport();
  // Touch targets are at least 44px tall.
  const tab = (await page.getByRole("tab", { name: "תיקון" }).boundingBox())!;
  expect(tab.height).toBeGreaterThanOrEqual(44);
});

test("phone export hands plain JPEGs to the share sheet, at most 10 per tap", async ({ page }) => {
  // Headless Chromium has no share sheet: record what the page would hand to it.
  await page.addInitScript(() => {
    const w = window as unknown as { __shared: number[] };
    w.__shared = [];
    Object.defineProperty(navigator, "canShare", { value: () => true, configurable: true });
    Object.defineProperty(navigator, "share", {
      value: async (d: ShareData) => {
        w.__shared.push(d.files?.filter((f) => f.type === "image/jpeg").length ?? 0);
      },
      configurable: true,
    });
  });
  await page.goto("/he/studio");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.locator("input[type=file]").first().setInputFiles(Array.from({ length: 11 }, (_, i) => sample((i % 3) + 1)));
  await page.getByRole("button", { name: "לשמירה ושליחה של 11 תמונות" }).click({ timeout: 80_000 });
  await page.getByRole("button", { name: "הכנת 11 תמונות" }).click();
  await page.getByRole("button", { name: /קבוצה 1 מתוך 2 \(תמונות 1–10\)/ }).click({ timeout: 60_000 });
  await page.getByRole("button", { name: /קבוצה 2 מתוך 2 \(תמונה 11\)/ }).click();
  await expect(page.getByRole("button", { name: /כל 2 הקבוצות נשלחו/ })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __shared: number[] }).__shared)).toEqual([10, 1]);
});
