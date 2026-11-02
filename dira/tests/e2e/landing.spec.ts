import { expect, test } from "@playwright/test";

test.describe("Hebrew browser", () => {
  test.use({ locale: "he-IL" });
  test("root redirects to Hebrew and the hero explains the product", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/he\/?$/);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("תמונות לדירה שמביאות טלפונים");
    // The demo is real engine output: plain words first, the measured numbers on request.
    await expect(page.getByText("הבהרנו את התמונה").first()).toBeVisible();
    await page.getByText("מה בדיוק תוקן, במספרים").click();
    await expect(page.getByText(/איזון לבן: מ-/)).toBeVisible();
  });
});

test("an English-speaking browser lands on English", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/en\/?$/);
});

test("English version, language switch keeps the page", async ({ page }) => {
  await page.goto("/en/pricing");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Editing is free");
  await page.getByRole("link", { name: "לעברית" }).first().click();
  await expect(page).toHaveURL(/\/he\/pricing\/?$/);
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

test("sample tabs switch the demo with clicks and arrow keys", async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("tab", { name: "Kitchen" }).click();
  await expect(page.locator('img[src="/demo/kitchen-after.jpg"]')).toBeVisible();
  await page.keyboard.press("Home");
  await expect(page.getByRole("tab", { name: "Living room" })).toBeFocused();
  await expect(page.getByRole("tab", { name: "Living room" })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator('img[src="/demo/living-after.jpg"]')).toBeVisible();
});

test("in-page links land below the sticky header", async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("navigation").first().getByRole("link", { name: "How it works" }).click();
  await page.waitForTimeout(900);
  const top = await page.locator("#how h2").evaluate((el) => el.getBoundingClientRect().top);
  expect(top).toBeGreaterThan(64);
});

test("trust page lists what is never done", async ({ page }) => {
  await page.goto("/en/trust");
  await expect(page.getByText("Hiding damp, mould, cracks or damage")).toBeVisible();
});

test("in Hebrew the slider handle sits on its line", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/he");
  const handle = page.getByRole("slider").first();
  const pos = await handle.evaluate((el) => {
    const line = el.previousElementSibling!.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return Math.abs(r.left + r.width / 2 - (line.left + line.width / 2));
  });
  expect(pos).toBeLessThan(2);
});
