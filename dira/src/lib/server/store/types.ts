import type { AiToolId } from "@/lib/server/ai/registry";
import type { ProductId } from "@/lib/plans";

export type LedgerReason = "signup_bonus" | "purchase" | "ai_job" | "ai_refund" | "admin";
export type LedgerEntry = { delta: number; reason: LedgerReason; ref: string | null; balance_after: number; created_at: string };

export type Account = { user_id: string; email: string; credits: number; pro_until: string | null; created_at: string };

export type PurchaseStatus = "pending" | "paid" | "failed" | "refunded";
export type Purchase = {
  id: string;
  user_id: string;
  product: ProductId;
  amount_ils: number;
  credits: number;
  pro_days: number;
  provider: "grow" | "mock" | "manual";
  status: PurchaseStatus;
  process_token: string | null;
  provider_ref: string | null;
  created_at: string;
  paid_at: string | null;
};

export type JobStatus = "queued" | "running" | "finalizing" | "succeeded" | "failed" | "canceled";
export type Job = {
  id: string;
  user_id: string;
  tool: AiToolId;
  params: Record<string, string>;
  model: string;
  provider: "replicate" | "mock";
  provider_id: string | null;
  status: JobStatus;
  cost: number;
  input_path: string | null;
  mask_path: string | null;
  output_path: string | null;
  error: string | null;
  test: boolean;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
  files_deleted: boolean;
};

export type ApplyResult = "applied" | "duplicate" | "insufficient";

export interface Store {
  ensureAccount(userId: string, email: string, bonus: number): Promise<Account>;
  getAccount(userId: string): Promise<Account | null>;
  /** Atomic and idempotent: the same key never applies twice; balance never goes below zero. */
  applyCredits(userId: string, delta: number, reason: LedgerReason, ref: string, key: string): Promise<{ result: ApplyResult; balance: number }>;
  ledger(userId: string, limit?: number): Promise<LedgerEntry[]>;

  createPurchase(p: Omit<Purchase, "id" | "created_at" | "paid_at" | "status" | "provider_ref">): Promise<Purchase>;
  getPurchase(id: string): Promise<Purchase | null>;
  setPurchaseToken(id: string, token: string): Promise<void>;
  /** Marks a pending purchase paid and grants its credits in one step. False if it was not pending. */
  markPurchasePaid(id: string, providerRef: string): Promise<boolean>;
  purchases(userId: string, limit?: number): Promise<Purchase[]>;

  createJob(j: Omit<Job, "created_at" | "updated_at" | "files_deleted">): Promise<Job>;
  getJob(id: string): Promise<Job | null>;
  getJobByKey(userId: string, key: string): Promise<Job | null>;
  getJobByProviderId(providerId: string): Promise<Job | null>;
  updateJob(id: string, patch: Partial<Job>): Promise<Job | null>;
  /** Moves a running job to "finalizing" if nobody else has; true when this caller won. */
  claimJob(id: string): Promise<boolean>;
  jobs(userId: string, limit?: number): Promise<Job[]>;
  jobsWithFilesBefore(isoDate: string, limit: number): Promise<Job[]>;

  putFile(path: string, data: Uint8Array, contentType: string): Promise<void>;
  /** A short-lived URL a browser or the AI provider can fetch. */
  fileUrl(path: string, seconds: number, origin: string): Promise<string>;
  deleteFiles(paths: string[]): Promise<void>;

  deleteAccount(userId: string): Promise<void>;
}
