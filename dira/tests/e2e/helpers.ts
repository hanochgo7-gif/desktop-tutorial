import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, type Page } from "@playwright/test";

export const SAMPLES = path.join(__dirname, "..", "..", "samples");
export const sample = (n: number) => path.join(SAMPLES, `apt${n}-before.jpg`);

/** Opens the studio and uploads photos; resolves when the first preview is on the stage. */
export async function uploadToStudio(page: Page, files: string[], lang = "he") {
  await page.goto(`/${lang}/studio`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.locator('input[type=file]').first().setInputFiles(files);
  await expect(page.locator("[role=slider][aria-valuenow]").first()).toBeVisible({ timeout: 45_000 });
}

/** The photo strip's items, and each item's select button (named "1. file.jpg"). */
export const photoItems = (page: Page) => page.getByRole("list", { name: "תמונות" }).getByRole("listitem");
export const photoButton = (page: Page, i: number) => photoItems(page).nth(i).getByRole("button", { name: /^\d+\. / });

/** Reads entry names and text files from a stored (uncompressed) ZIP. */
export function readZip(file: string): Map<string, Buffer> {
  const buf = readFileSync(file);
  const out = new Map<string, Buffer>();
  let i = 0;
  while (buf.readUInt32LE(i) === 0x04034b50) {
    const size = buf.readUInt32LE(i + 18);
    const nameLen = buf.readUInt16LE(i + 26);
    const extra = buf.readUInt16LE(i + 28);
    const name = buf.subarray(i + 30, i + 30 + nameLen).toString("utf8");
    const start = i + 30 + nameLen + extra;
    out.set(name, buf.subarray(start, start + size));
    i = start + size;
  }
  return out;
}

export async function devSignIn(page: Page, email: string, lang = "he") {
  await page.goto(`/${lang}/account`);
  await page.getByLabel(/אימייל|Email/).fill(email);
  await page.getByRole("button", { name: /שליחת קוד|Send code/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: /חשבון|Account/ })).toBeVisible();
}
