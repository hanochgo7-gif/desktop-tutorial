import { expect, test } from "@playwright/test";
import { sample } from "./helpers";

test("landing on a phone: no horizontal scroll, demo before the upload box", async ({ page }) => {
  await page.goto("/he");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  const demo = await page.getByRole("slider").first().boundingBox();
  const drop = await page.getByRole("button", { name: "בחירת תמונות" }).first().boundingBox();
  expect(demo!.y).toBeLessThan(drop!.y);
  await expect(page.getByRole("button", { name: "צילום עכשיו" }).first()).toBeVisible();
});

test("studio on a phone: upload, compare by touch, tabs reachable", async ({ page }) => {
  await page.goto("/he/studio");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.locator("input[type=file]").first().setInputFiles([sample(1)]);
  const slider = page.locator("[role=slider][aria-valuenow]").first();
  await expect(slider).toBeVisible({ timeout: 45_000 });
  const stage = (await slider.boundingBox())!;
  await page.touchscreen.tap(stage.x - 80, stage.y);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await page.getByRole("tab", { name: "הורדה" }).click();
  await expect(page.getByRole("button", { name: /הורדה|הורדת ZIP/ })).toBeVisible();
  // Touch targets are at least 44px tall.
  const btn = await page.getByRole("tab", { name: "תיקון" }).boundingBox();
  expect(btn!.height).toBeGreaterThanOrEqual(44);
});
