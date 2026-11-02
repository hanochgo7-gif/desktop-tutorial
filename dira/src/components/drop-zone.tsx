"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { MAX_FILE_BYTES } from "@/lib/site";

const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif";

export type Rejected = { name: string; reason: "tooBig" | "notImage" };

export function validateFiles(list: FileList | File[]): { ok: File[]; rejected: Rejected[] } {
  const ok: File[] = [];
  const rejected: Rejected[] = [];
  for (const f of Array.from(list)) {
    const isImage = f.type.startsWith("image/") || /\.(heic|heif|jpe?g|png|webp)$/i.test(f.name);
    if (!isImage) rejected.push({ name: f.name, reason: "notImage" });
    else if (f.size > MAX_FILE_BYTES) rejected.push({ name: f.name, reason: "tooBig" });
    else ok.push(f);
  }
  return { ok, rejected };
}

type Props = {
  onFiles: (files: File[], rejected: Rejected[]) => void;
  labels: { drop: string; dropTouch?: string; or: string; choose: string; camera: string; hint: string };
  variant?: "hero" | "panel" | "stage";
};

const coarseQuery = "(pointer: coarse)";
const subscribeCoarse = (cb: () => void) => {
  const m = window.matchMedia(coarseQuery);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};

/** True on touch-first devices, where "drag here" makes no sense. */
export function useCoarsePointer() {
  return useSyncExternalStore(subscribeCoarse, () => window.matchMedia(coarseQuery).matches, () => false);
}

export function DropZone({ onFiles, labels, variant = "panel" }: Props) {
  const coarse = useCoarsePointer();
  const input = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const depth = useRef(0);

  const take = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const { ok, rejected } = validateFiles(list);
    onFiles(ok, rejected);
  };

  const dark = variant === "stage";
  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault();
        depth.current++;
        setOver(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => {
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        depth.current = 0;
        setOver(false);
        take(e.dataTransfer.files);
      }}
      className={[
        "relative flex flex-col items-center justify-center rounded-[var(--radius-panel)] border-2 border-dashed text-center transition-colors duration-200",
        variant === "hero" ? "px-5 py-7" : "px-6 py-10",
        dark
          ? over
            ? "border-[#9db4ee] bg-white/5"
            : "border-stage-line"
          : over
            ? "border-prussian bg-prussian-tint"
            : "border-line bg-surface",
      ].join(" ")}
    >
      <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true" className={dark ? "text-white/60" : "text-prussian"}>
        <rect x="4" y="8" width="28" height="21" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="m4 24 8-7 6 5 5-4 9 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <circle cx="24" cy="14" r="2.4" fill="currentColor" />
      </svg>
      <p className={`mt-3 text-[17px] font-semibold ${dark ? "text-white" : "text-ink"}`}>{coarse && labels.dropTouch ? labels.dropTouch : labels.drop}</p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
        <button type="button" className="btn btn-primary" onClick={() => input.current?.click()}>
          {labels.choose}
        </button>
        <button type="button" className={`btn ${dark ? "btn-stage" : "btn-quiet"} sm:hidden`} onClick={() => camera.current?.click()}>
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 8h3l2-3h6l2 3h3v11H4z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            <circle cx="12" cy="13" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
          </svg>
          {labels.camera}
        </button>
      </div>
      <p className={`mt-3 text-[13px] ${dark ? "text-white/55" : "text-ink-3"}`}>{labels.hint}</p>
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          take(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={camera}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          take(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
