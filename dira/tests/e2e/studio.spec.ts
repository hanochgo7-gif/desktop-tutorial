import { expect, test } from "@playwright/test";
import { readZip, sample, uploadToStudio } from "./helpers";

test("upload → analysis → adjust → ZIP export with change log", async ({ page }) => {
  await uploadToStudio(page, [sample(1), sample(3)]);
  // Findings come from the on-device analysis of the selected photo.
  await expect(page.getByText("גוון צהוב מתאורת נורות")).toBeVisible();
  await expect(page.getByText("הקירות נוטים")).toBeVisible();
  // Both photos analysed.
  await expect(page.getByRole("option")).toHaveCount(2);
  await expect(page.getByText("נשמר במכשיר")).toBeVisible({ timeout: 30_000 });

  // Adjust brightness; the preview re-renders and the change log records it.
  await page.getByRole("tab", { name: "כיוון" }).click();
  await page.getByLabel("בהירות").fill("40");
  await page.getByRole("tab", { name: "תיקון" }).click();
  await expect(page.getByText(/חשיפה \+1\.5 סטופ/)).toBeVisible({ timeout: 20_000 });

  // Export both photos for portals and WhatsApp, with the change log.
  await page.getByRole("tab", { name: "הורדה" }).click();
  await page.getByRole("button", { name: /כל 2 התמונות/ }).click();
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "הורדת ZIP" }).click()]);
  const file = await download.path();
  const entries = readZip(file!);
  // Latin-only file names: they survive every browser and Windows' built-in unzip.
  expect(download.suggestedFilename()).toMatch(/^dira-photos-\d{4}-\d{2}-\d{2}\.zip$/);
  const folder = download.suggestedFilename().replace(/\.zip$/, "");
  const names = [...entries.keys()].sort();
  expect(names).toEqual([`${folder}/01-portal.jpg`, `${folder}/01-whatsapp.jpg`, `${folder}/02-portal.jpg`, `${folder}/02-whatsapp.jpg`, `${folder}/photo-changes.txt`].sort());
  const manifest = entries.get(`${folder}/photo-changes.txt`)!.toString("utf8");
  expect(manifest).toContain("פרויקט חדש");
  expect(manifest).toContain("יישור קירות");
  expect(manifest).toContain("apt1-before.jpg");
  // JPEGs are real images without camera metadata (canvas re-encode strips EXIF/GPS).
  const jpg = entries.get(`${folder}/01-portal.jpg`)!;
  expect(jpg.subarray(0, 3).toString("hex")).toBe("ffd8ff");
  expect(jpg.includes(Buffer.from("Exif"))).toBe(false);
});

test("classic removal records brush strokes and lists the change", async ({ page }) => {
  await uploadToStudio(page, [sample(3)]);
  await page.getByRole("tab", { name: "הסרה" }).click();
  const canvas = page.locator("canvas.cursor-crosshair");
  await expect(canvas).toBeVisible();
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.17, box.y + box.height * 0.66);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.21, box.y + box.height * 0.68, { steps: 6 });
  await page.mouse.up();
  await expect(page.getByText("1 סימונים")).toBeVisible();
  await page.getByRole("tab", { name: "תיקון" }).click();
  await expect(page.getByText(/הסרת 1 חפצים קטנים/)).toBeVisible({ timeout: 30_000 });
});

test("projects persist on the device and can be reopened", async ({ page }) => {
  await uploadToStudio(page, [sample(2)]);
  const name = page.getByLabel("שינוי שם הפרויקט");
  await name.fill("דירה ברחביה");
  await name.press("Enter");
  await page.goto("/he/projects");
  await expect(page.getByRole("link", { name: "דירה ברחביה" })).toBeVisible();
  await page.getByRole("link", { name: "דירה ברחביה" }).click();
  await expect(page.locator("[role=slider][aria-valuenow]").first()).toBeVisible({ timeout: 30_000 });
});

test("a broken file is reported, not silently dropped", async ({ page }) => {
  await page.goto("/he/studio");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.locator("input[type=file]").first().setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
  await expect(page.getByText("notes.txt: זה לא קובץ תמונה")).toBeVisible();
  await page.locator("input[type=file]").first().setInputFiles({ name: "broken.jpg", mimeType: "image/jpeg", buffer: Buffer.from("not really a jpeg") });
  await expect(page.getByRole("alert").filter({ hasText: /broken\.jpg: הדפדפן לא מצליח לפתוח/ })).toBeVisible({ timeout: 20_000 });
});
