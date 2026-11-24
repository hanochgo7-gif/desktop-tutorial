import { createHmac } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("zip writer", () => {
  it("produces an archive that unzip accepts, with UTF-8 (Hebrew) names", async () => {
    const { buildZip, crc32 } = await import("@/lib/studio/zip");
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
    const blob = buildZip([
      { name: "דירה/01-portal.jpg", data: new Uint8Array([1, 2, 3, 4]) },
      { name: "דירה/שינויים.txt", data: new TextEncoder().encode("שלום") },
    ]);
    const dir = mkdtempSync(path.join(tmpdir(), "zip-"));
    const file = path.join(dir, "t.zip");
    writeFileSync(file, Buffer.from(await blob.arrayBuffer()));
    const out = execFileSync("python3", ["-c", "import zipfile,sys; z=zipfile.ZipFile(sys.argv[1]); print(z.testzip()); print('|'.join(z.namelist())); print(z.read(z.namelist()[1]).decode())", file]).toString();
    const [bad, names, text] = out.trim().split("\n");
    expect(bad).toBe("None");
    expect(names).toBe("דירה/01-portal.jpg|דירה/שינויים.txt");
    expect(text).toBe("שלום");
  });
});

describe("replicate webhook verification", () => {
  it("accepts a correct signature and rejects tampering or stale timestamps", async () => {
    const key = Buffer.from("test-key-material-123").toString("base64");
    process.env.REPLICATE_WEBHOOK_SECRET = `whsec_${key}`;
    const { verifyWebhook } = await import("@/lib/server/ai/replicate");
    const body = JSON.stringify({ id: "p1", status: "succeeded" });
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = createHmac("sha256", Buffer.from(key, "base64")).update(`msg_1.${ts}.${body}`).digest("base64");
    const h = (s: string, t = ts) => new Headers({ "webhook-id": "msg_1", "webhook-timestamp": t, "webhook-signature": `v1,${s}` });
    expect(await verifyWebhook(h(sig), body)).toBe(true);
    expect(await verifyWebhook(h(sig), body.replace("succeeded", "failed"))).toBe(false);
    expect(await verifyWebhook(h(sig, String(Number(ts) - 3600)), body)).toBe(false);
    expect(await verifyWebhook(new Headers(), body)).toBe(false);
  });
});

describe("local store credits", () => {
  it("never goes below zero under concurrent spending and never applies a key twice", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "store-"));
    const cwd = process.cwd();
    process.chdir(dir);
    try {
      vi.resetModules();
      const { localStore } = await import("@/lib/server/store/local");
      await localStore.ensureAccount("u1", "a@b.co", 3);
      const results = await Promise.all(Array.from({ length: 8 }, (_, i) => localStore.applyCredits("u1", -1, "ai_job", `j${i}`, `job:j${i}`)));
      expect(results.filter((r) => r.result === "applied")).toHaveLength(3);
      expect(results.filter((r) => r.result === "insufficient")).toHaveLength(5);
      expect((await localStore.getAccount("u1"))!.credits).toBe(0);
      const again = await localStore.applyCredits("u1", 1, "ai_refund", "j0", "refund:j0");
      const dup = await localStore.applyCredits("u1", 1, "ai_refund", "j0", "refund:j0");
      expect(again.result).toBe("applied");
      expect(dup.result).toBe("duplicate");
      // Sign-up bonus is granted once only.
      await localStore.ensureAccount("u1", "a@b.co", 3);
      expect((await localStore.getAccount("u1"))!.credits).toBe(1);
      // A purchase is credited exactly once.
      const p = await localStore.createPurchase({ user_id: "u1", product: "pack10", amount_ils: 39, credits: 10, pro_days: 0, provider: "mock", process_token: null });
      expect(await localStore.markPurchasePaid(p.id, "x")).toBe(true);
      expect(await localStore.markPurchasePaid(p.id, "x")).toBe(false);
      expect((await localStore.getAccount("u1"))!.credits).toBe(11);
    } finally {
      process.chdir(cwd);
    }
  });
});

describe("image sniffing", () => {
  it("trusts bytes, not names", async () => {
    const { sniffImage } = await import("@/lib/server/files");
    expect(sniffImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0]))).toBe("image/jpeg");
    expect(sniffImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe("image/png");
    expect(sniffImage(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
  });
});
