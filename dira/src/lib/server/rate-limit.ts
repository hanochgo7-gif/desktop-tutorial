import "server-only";
import { HttpError } from "./auth";

// Per-instance sliding windows. Stops a single script from draining credits or flooding the AI
// provider; a Vercel firewall rule can add a site-wide limit on top.
type W = { count: number; resetAt: number };
const windows = new Map<string, W>();

export const LIMITS = {
  aiJob: { max: 30, windowMs: 60 * 60 * 1000 },
  aiPoll: { max: 600, windowMs: 10 * 60 * 1000 },
  checkout: { max: 20, windowMs: 60 * 60 * 1000 },
  login: { max: 10, windowMs: 15 * 60 * 1000 },
} as const;

export function clientIp(h: Headers) {
  return h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export function limit(name: keyof typeof LIMITS, who: string, now = Date.now()) {
  if (windows.size > 5000) for (const [k, w] of windows) if (w.resetAt <= now) windows.delete(k);
  const { max, windowMs } = LIMITS[name];
  const key = `${name}:${who}`;
  const w = windows.get(key);
  if (!w || w.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  w.count++;
  if (w.count > max * (Number(process.env.RATE_LIMIT_MULTIPLIER) || 1)) throw new HttpError(429, "rate_limited");
}
