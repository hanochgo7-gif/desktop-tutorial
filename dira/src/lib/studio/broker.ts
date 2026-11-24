"use client";
// A broker's name and licence number are the same on every property, so they are kept on this
// device (not on the server) and filled in for each new project.

export type BrokerProfile = { name: string; license: string; on: boolean };

const KEY = "dira.broker";

export function loadBroker(): BrokerProfile | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<BrokerProfile>;
    return { name: String(v.name ?? "").slice(0, 60), license: String(v.license ?? "").replace(/[^\d-]/g, "").slice(0, 12), on: Boolean(v.on) };
  } catch {
    return null;
  }
}

export function saveBroker(p: BrokerProfile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // Private mode or storage blocked: the fields still work for this export.
  }
}
