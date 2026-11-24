import "server-only";
// Development store: one JSON file plus a folder of files under .data/. Same semantics as the
// Supabase store (atomic credits, idempotency keys) so the app behaves identically in tests.

import { createHmac, randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { localSecret } from "@/lib/server/config";
import type { Account, ApplyResult, Job, LedgerEntry, LedgerReason, Purchase, Store } from "./types";

const ROOT = path.join(process.cwd(), ".data");
const DB = path.join(ROOT, "db.json");
const FILES = path.join(ROOT, "files");

type Data = {
  accounts: Record<string, Account>;
  ledger: (LedgerEntry & { user_id: string; key: string })[];
  purchases: Record<string, Purchase>;
  jobs: Record<string, Job>;
};

let lock: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const run = lock.then(fn, fn);
  lock = run.catch(() => undefined);
  return run;
}

async function load(): Promise<Data> {
  try {
    return JSON.parse(await readFile(DB, "utf8")) as Data;
  } catch {
    return { accounts: {}, ledger: [], purchases: {}, jobs: {} };
  }
}

async function save(d: Data) {
  await mkdir(ROOT, { recursive: true });
  await writeFile(DB, JSON.stringify(d));
}

const now = () => new Date().toISOString();

function safePath(p: string) {
  const full = path.join(FILES, p);
  if (!full.startsWith(FILES + path.sep)) throw new Error("bad path");
  return full;
}

export function signFile(p: string, exp: number) {
  return createHmac("sha256", localSecret()).update(`${p}:${exp}`).digest("base64url");
}

export async function readLocalFile(p: string) {
  return readFile(safePath(p));
}

export const localStore: Store = {
  ensureAccount: (userId, email, bonus) =>
    serial(async () => {
      const d = await load();
      if (!d.accounts[userId]) {
        d.accounts[userId] = { user_id: userId, email, credits: 0, pro_until: null, created_at: now() };
        if (bonus > 0) {
          d.accounts[userId].credits = bonus;
          d.ledger.push({ user_id: userId, key: `signup:${userId}`, delta: bonus, reason: "signup_bonus", ref: null, balance_after: bonus, created_at: now() });
        }
        await save(d);
      }
      return d.accounts[userId];
    }),

  getAccount: async (userId) => (await load()).accounts[userId] ?? null,

  applyCredits: (userId, delta, reason: LedgerReason, ref, key) =>
    serial(async () => {
      const d = await load();
      const acc = d.accounts[userId];
      if (!acc) throw new Error("no account");
      if (d.ledger.some((l) => l.key === key)) return { result: "duplicate" as ApplyResult, balance: acc.credits };
      if (acc.credits + delta < 0) return { result: "insufficient" as ApplyResult, balance: acc.credits };
      acc.credits += delta;
      d.ledger.push({ user_id: userId, key, delta, reason, ref, balance_after: acc.credits, created_at: now() });
      await save(d);
      return { result: "applied" as ApplyResult, balance: acc.credits };
    }),

  ledger: async (userId, limit = 50) =>
    (await load()).ledger
      .filter((l) => l.user_id === userId)
      .slice(-limit)
      .reverse()
      .map(({ delta, reason, ref, balance_after, created_at }) => ({ delta, reason, ref, balance_after, created_at })),

  createPurchase: (p) =>
    serial(async () => {
      const d = await load();
      const rec: Purchase = { ...p, id: randomUUID(), status: "pending", provider_ref: null, created_at: now(), paid_at: null };
      d.purchases[rec.id] = rec;
      await save(d);
      return rec;
    }),

  getPurchase: async (id) => (await load()).purchases[id] ?? null,

  setPurchaseToken: (id, token) =>
    serial(async () => {
      const d = await load();
      if (d.purchases[id]) d.purchases[id].process_token = token;
      await save(d);
    }),

  markPurchasePaid: (id, providerRef) =>
    serial(async () => {
      const d = await load();
      const p = d.purchases[id];
      if (!p || p.status !== "pending") return false;
      const acc = d.accounts[p.user_id];
      if (!acc) return false;
      p.status = "paid";
      p.paid_at = now();
      p.provider_ref = providerRef;
      const key = `purchase:${id}`;
      if (!d.ledger.some((l) => l.key === key)) {
        acc.credits += p.credits;
        d.ledger.push({ user_id: p.user_id, key, delta: p.credits, reason: "purchase", ref: id, balance_after: acc.credits, created_at: now() });
      }
      if (p.pro_days > 0) {
        const base = Math.max(Date.now(), acc.pro_until ? Date.parse(acc.pro_until) : 0);
        acc.pro_until = new Date(base + p.pro_days * 86400_000).toISOString();
      }
      await save(d);
      return true;
    }),

  purchases: async (userId, limit = 50) =>
    Object.values((await load()).purchases)
      .filter((p) => p.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit),

  createJob: (j) =>
    serial(async () => {
      const d = await load();
      const rec: Job = { ...j, created_at: now(), updated_at: now(), files_deleted: false };
      d.jobs[rec.id] = rec;
      await save(d);
      return rec;
    }),

  getJob: async (id) => (await load()).jobs[id] ?? null,
  getJobByKey: async (userId, key) => Object.values((await load()).jobs).find((j) => j.user_id === userId && j.idempotency_key === key) ?? null,
  getJobByProviderId: async (pid) => Object.values((await load()).jobs).find((j) => j.provider_id === pid) ?? null,

  updateJob: (id, patch) =>
    serial(async () => {
      const d = await load();
      if (!d.jobs[id]) return null;
      d.jobs[id] = { ...d.jobs[id], ...patch, id, updated_at: now() };
      await save(d);
      return d.jobs[id];
    }),

  claimJob: (id) =>
    serial(async () => {
      const d = await load();
      const j = d.jobs[id];
      if (!j || (j.status !== "running" && j.status !== "queued")) return false;
      j.status = "finalizing";
      j.updated_at = now();
      await save(d);
      return true;
    }),

  jobs: async (userId, limit = 50) =>
    Object.values((await load()).jobs)
      .filter((j) => j.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit),

  jobsWithFilesBefore: async (iso, limit) =>
    Object.values((await load()).jobs)
      .filter((j) => !j.files_deleted && j.created_at < iso)
      .slice(0, limit),

  putFile: async (p, data) => {
    const full = safePath(p);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data);
  },

  fileUrl: async (p, seconds, origin) => {
    const exp = Math.floor(Date.now() / 1000) + seconds;
    return `${origin}/api/files/${p.split("/").map(encodeURIComponent).join("/")}?exp=${exp}&sig=${signFile(p, exp)}`;
  },

  deleteFiles: async (paths) => {
    for (const p of paths) await rm(safePath(p), { force: true });
  },

  deleteAccount: (userId) =>
    serial(async () => {
      const d = await load();
      delete d.accounts[userId];
      d.ledger = d.ledger.filter((l) => l.user_id !== userId);
      for (const [k, p] of Object.entries(d.purchases)) if (p.user_id === userId) delete d.purchases[k];
      for (const [k, j] of Object.entries(d.jobs)) if (j.user_id === userId) delete d.jobs[k];
      await save(d);
      await rm(path.join(FILES, "u", userId), { recursive: true, force: true });
    }),
};
