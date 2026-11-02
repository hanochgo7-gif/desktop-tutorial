"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DropZone, type Rejected } from "@/components/drop-zone";
import { fmt, type Dict, type Locale } from "@/i18n";
import { asset } from "@/lib/site";
import { setHandoff } from "@/lib/studio/db";
import { countBucket, track } from "@/lib/track";

export function useStartStudio(lang: Locale) {
  const router = useRouter();
  return (files: File[], source: string) => {
    track("upload_start", { count: countBucket(files.length), source });
    setHandoff(files);
    router.push(`/${lang}/studio?new=1`);
  };
}

/** Opens the studio with one of our real sample photos, for visitors whose photos are elsewhere. */
export function SampleButton({ lang, t, dark = false }: { lang: Locale; t: Dict; dark?: boolean }) {
  const start = useStartStudio(lang);
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      className={`mt-3 text-[14.5px] font-semibold underline underline-offset-4 hover:no-underline ${dark ? "text-white/85" : "text-prussian"}`}
      onClick={async () => {
        setBusy(true);
        try {
          const res = await fetch(asset("/demo/bedroom-before.jpg"));
          const blob = await res.blob();
          start([new File([blob], `${t.landing.sampleBadge}.jpg`, { type: "image/jpeg" })], "sample");
        } finally {
          setBusy(false);
        }
      }}
    >
      {t.landing.trySample}
    </button>
  );
}

export function HeroDrop({ lang, t, variant = "hero" }: { lang: Locale; t: Dict; variant?: "hero" | "panel" | "stage" }) {
  const start = useStartStudio(lang);
  const [rejected, setRejected] = useState<Rejected[]>([]);
  return (
    <div>
      <DropZone
        variant={variant}
        labels={{
          drop: t.landing.drop,
          dropTouch: t.landing.dropTouch,
          or: t.landing.dropOr,
          choose: t.landing.choose,
          camera: t.landing.camera,
          hint: t.landing.dropHint,
        }}
        onFiles={(files, rej) => {
          setRejected(rej);
          if (files.length) start(files, variant === "hero" ? "landing" : "landing-final");
        }}
      />
      {rejected.length > 0 && (
        <ul role="alert" className="mt-3 grid gap-1 text-[14px] text-err">
          {rejected.map((r) => (
            <li key={r.name}>{fmt(r.reason === "tooBig" ? t.studio.tooBig : t.studio.notImage, { name: r.name }, lang)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
