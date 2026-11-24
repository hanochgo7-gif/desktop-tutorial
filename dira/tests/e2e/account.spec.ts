import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { devSignIn, readZip, sample, uploadToStudio } from "./helpers";

test("sign-up bonus, AI job (test provider), labelled version, staged export", async ({ page }) => {
  const email = `ai-${Date.now()}@example.com`;
  await devSignIn(page, email);
  await expect(page.getByText(/^3$/)).toBeVisible();

  await uploadToStudio(page, [sample(3)]);
  await page.getByRole("tab", { name: "AI" }).click();
  await expect(page.getByText("3 קרדיטים")).toBeVisible();
  await page.getByRole("radio", { name: /הלבשה וירטואלית/ }).check();
  await page.getByLabel("סוג החדר").selectOption("bedroom");
  await page.getByRole("button", { name: /הפעלה/ }).click();
  await expect(page.getByText("TEST")).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText("2 קרדיטים")).toBeVisible();
  // The stage labels the AI version as staging.
  await expect(page.getByText("הדמיה — ריהוט וירטואלי").first()).toBeVisible();

  // With an AI version in the set, the change log is included by default.
  await page.getByRole("tab", { name: "שמירה ושליחה" }).click();
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "הורדה כקובץ ZIP" }).click()]);
  const entries = readZip((await download.path())!);
  const manifest = [...entries.entries()].find(([n]) => n.endsWith(".txt"))![1].toString("utf8");
  expect(manifest).toContain("הלבשה וירטואלית");
  expect(manifest).toContain("הדמיה — ריהוט וירטואלי");
});

test("checkout credits the account exactly once", async ({ page }) => {
  await devSignIn(page, `buy-${Date.now()}@example.com`);
  await page.goto("/he/pricing");
  await page.getByRole("button", { name: "לקנות חבילה" }).click();
  await expect(page).toHaveURL(/\/he\/pay\/mock\//);
  await page.getByRole("button", { name: "אישור תשלום בדיקה" }).click();
  await expect(page).toHaveURL(/\/he\/account\/?\?paid=/);
  await expect(page.getByText(/^13$/)).toBeVisible();
  await expect(page.getByText("רכישה")).toBeVisible();
});

test("API: no access without sign-in, no access to other people's jobs, no credits → 402", async ({ request }) => {
  expect((await request.get("/api/me")).status()).toBe(401);
  expect((await request.post("/api/ai/jobs", { multipart: { tool: "stage", key: crypto.randomUUID() } })).status()).toBe(401);

  const a = await (await request.post("/api/dev/login", { data: { email: `a-${Date.now()}@example.com` } })).json();
  const b = await (await request.post("/api/dev/login", { data: { email: `b-${Date.now()}@example.com` } })).json();
  const auth = (t: string) => ({ authorization: `Bearer ${t}` });
  const img = { name: "x.jpg", mimeType: "image/jpeg", buffer: readFileSync(sample(1)) };

  // A forged token is rejected.
  expect((await request.get("/api/me", { headers: auth(a.token.slice(0, -2) + "xx") })).status()).toBe(401);
  // A text file posing as an image is rejected.
  const bad = await request.post("/api/ai/jobs", { headers: auth(a.token), multipart: { tool: "stage", key: crypto.randomUUID(), image: { name: "x.jpg", mimeType: "image/jpeg", buffer: Buffer.from("<svg>") } } });
  expect(bad.status()).toBe(400);

  const job = await (await request.post("/api/ai/jobs", { headers: auth(a.token), multipart: { tool: "declutter", key: crypto.randomUUID(), image: img } })).json();
  expect(job.id).toBeTruthy();
  expect((await request.get(`/api/ai/jobs/${job.id}`, { headers: auth(b.token) })).status()).toBe(404);
  expect((await request.get(`/api/ai/jobs/${job.id}`, { headers: auth(a.token) })).status()).toBe(200);

  // Spend the rest; the 4th job must be refused.
  for (let i = 0; i < 2; i++) await request.post("/api/ai/jobs", { headers: auth(a.token), multipart: { tool: "declutter", key: crypto.randomUUID(), image: img } });
  const broke = await request.post("/api/ai/jobs", { headers: auth(a.token), multipart: { tool: "declutter", key: crypto.randomUUID(), image: img } });
  expect(broke.status()).toBe(402);

  // Same idempotency key twice → one job, one charge.
  const key = crypto.randomUUID();
  const c = await (await request.post("/api/dev/login", { data: { email: `c-${Date.now()}@example.com` } })).json();
  const r1 = await (await request.post("/api/ai/jobs", { headers: auth(c.token), multipart: { tool: "sky", key, image: img } })).json();
  const r2 = await (await request.post("/api/ai/jobs", { headers: auth(c.token), multipart: { tool: "sky", key, image: img } })).json();
  expect(r1.id).toBe(r2.id);
  expect((await (await request.get("/api/me", { headers: auth(c.token) })).json()).credits).toBe(2);

  // Signed file links can't be forged.
  expect((await request.get(`/api/files/u/x/y/output.jpg?exp=9999999999&sig=nope`)).status()).toBe(403);
  // Mock payment for someone else's purchase is refused.
  expect((await request.post("/api/payments/mock", { headers: auth(b.token), data: { id: "00000000-0000-0000-0000-000000000000" } })).status()).toBe(404);
});
