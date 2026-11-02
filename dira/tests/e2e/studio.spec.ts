import { expect, test } from "@playwright/test";
import { readZip, sample, uploadToStudio } from "./helpers";

test("upload → plain findings → adjust → ZIP with a folder per destination and a change log", async ({ page }) => {
  await uploadToStudio(page, [sample(1), sample(3)]);
  // The studio says what it found and fixed in plain words.
  await expect(page.getByText("התמונה כבר תוקנה")).toBeVisible();
  await expect(page.getByText("התמונה צהובה מהנורות", { exact: true })).toBeVisible();
  await expect(page.getByRole("option")).toHaveCount(2);
  await expect(page.getByText("נשמר במכשיר")).toBeVisible({ timeout: 30_000 });

  // Adjust brightness; the exact numbers are one tap away.
  await page.getByRole("tab", { name: "בהירות וצבע" }).click();
  await page.getByLabel("בהירות", { exact: true }).fill("40");
  await page.getByRole("tab", { name: "תיקון" }).click();
  await page.getByText("פרטים מספריים").click();
  await expect(page.getByText(/חשיפה .*1\.5.*סטופ/)).toBeVisible({ timeout: 20_000 });

  // Export both photos for Yad2 and WhatsApp, with the change log.
  await page.getByRole("tab", { name: "שמירה ושליחה" }).click();
  await page.getByText("וואטסאפ", { exact: true }).click();
  await page.getByText("אפשרויות נוספות").click();
  await page.getByRole("switch", { name: "לצרף רשימת שינויים" }).click();
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "הורדה כקובץ ZIP" }).click()]);
  const entries = readZip((await download.path())!);
  // Latin-only names survive every browser and Windows' built-in unzip.
  expect(download.suggestedFilename()).toMatch(/^\d{4}-\d{2}-\d{2}-rent-dira-photos\.zip$/);
  const folder = download.suggestedFilename().replace(/\.zip$/, "");
  expect([...entries.keys()].sort()).toEqual(
    [`${folder}/yad2-madlan/01.jpg`, `${folder}/yad2-madlan/02.jpg`, `${folder}/whatsapp/01.jpg`, `${folder}/whatsapp/02.jpg`, `${folder}/photo-changes.txt`].sort(),
  );
  const manifest = entries.get(`${folder}/photo-changes.txt`)!.toString("utf8");
  expect(manifest).toContain("פרויקט חדש");
  expect(manifest).toContain("apt1-before.jpg");
  // JPEGs are real images without camera metadata (canvas re-encode strips EXIF/GPS).
  const jpg = entries.get(`${folder}/yad2-madlan/01.jpg`)!;
  expect(jpg.subarray(0, 3).toString("hex")).toBe("ffd8ff");
  expect(jpg.includes(Buffer.from("Exif"))).toBe(false);
  await expect(page.getByText("התמונות ירדו לתיקיית ההורדות")).toBeVisible();
});

test("erasing: paint a mark, see the result, the change is listed", async ({ page }) => {
  await uploadToStudio(page, [sample(3)]);
  await page.getByRole("tab", { name: "מחיקת חפץ" }).click();
  const canvas = page.locator("canvas.cursor-crosshair");
  await expect(canvas).toBeVisible();
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.17, box.y + box.height * 0.66);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.21, box.y + box.height * 0.68, { steps: 6 });
  await page.mouse.up();
  // After the stroke the result is shown, not the brush.
  await expect(page.getByRole("tabpanel").getByRole("button", { name: "תוצאה" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText(/^נמחק\./)).toBeVisible({ timeout: 30_000 });
  await page.getByRole("tab", { name: "תיקון" }).click();
  await expect(page.getByText("מחקנו 1 חפצים קטנים")).toBeVisible();
});

test("a broker's licence is remembered for the next sale listing", async ({ page }) => {
  await uploadToStudio(page, [sample(2)]);
  await page.getByRole("button", { name: "מכירה" }).click();
  await page.getByRole("tab", { name: "שמירה ושליחה" }).click();
  await page.getByRole("switch", { name: "שם ומספר רישיון על התמונות" }).click();
  await page.getByLabel("שם המשרד או המתווך").fill("נדל״ן כהן");
  await page.getByLabel("מספר רישיון תיווך").fill("31234567");
  await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /הורדה/ }).click()]);

  // A new property starts clean, and the broker details are already filled in.
  await page.goto("/he/studio?new=1");
  await expect(page.getByRole("heading", { level: 1, name: "מתחילים מהתמונות" })).toBeVisible();
  await page.locator("input[type=file]").first().setInputFiles([sample(1)]);
  await expect(page.locator("[role=slider][aria-valuenow]").first()).toBeVisible({ timeout: 45_000 });
  await expect(page.getByRole("option")).toHaveCount(1);
  await page.getByRole("button", { name: "מכירה" }).click();
  await page.getByRole("tab", { name: "שמירה ושליחה" }).click();
  await expect(page.getByLabel("מספר רישיון תיווך")).toHaveValue("31234567");
});

test("any photo can be made the cover, and the order is kept", async ({ page }) => {
  await uploadToStudio(page, [sample(1), sample(3)]);
  await page.getByRole("option").nth(1).click();
  await page.getByRole("button", { name: /להפוך לתמונה הראשית במודעה/ }).click();
  await expect(page.getByRole("option").first()).toHaveAccessibleName(/apt3-before\.jpg/);
  await page.reload();
  await expect(page.getByRole("option").first()).toHaveAccessibleName(/apt3-before\.jpg/, { timeout: 30_000 });
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
