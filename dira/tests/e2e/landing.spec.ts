import { expect, test } from "@playwright/test";

test.describe("Hebrew browser", () => {
  test.use({ locale: "he-IL" });
  test("root redirects to Hebrew and the hero explains the product", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/he$/);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("תמונות שמביאות טלפונים");
  // The demo is real engine output with measured changes listed.
  await expect(page.getByText(/איזון לבן: 3,800K/)).toBeVisible();
  });
});

test("an English-speaking browser lands on English", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/en$/);
});

test("English version, language switch keeps the page", async ({ page }) => {
  await page.goto("/en/pricing");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Priced by what things actually cost");
  await page.getByRole("link", { name: "לעברית" }).first().click();
  await expect(page).toHaveURL(/\/he\/pricing$/);
});

test("before/after slider works with the keyboard", async ({ page }) => {
  await page.goto("/he");
  const slider = page.getByRole("slider").first();
  await slider.focus();
  await expect(slider).toHaveAttribute("aria-valuenow", "50");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await expect(slider).toHaveAttribute("aria-valuenow", "46");
  await page.keyboard.press("End");
  await expect(slider).toHaveAttribute("aria-valuenow", "100");
});

test("sample switcher swaps the demo photo and its numbers", async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("tab", { name: "Empty bedroom" }).click();
  await expect(page.locator('img[src="/demo/bedroom-after.jpg"]')).toBeVisible();
  await expect(page.getByText(/Exposure \+2 EV/)).toBeVisible();
});

test("trust page lists what is never done", async ({ page }) => {
  await page.goto("/en/trust");
  await expect(page.getByText("Hiding damp, mould, cracks or damage")).toBeVisible();
});
