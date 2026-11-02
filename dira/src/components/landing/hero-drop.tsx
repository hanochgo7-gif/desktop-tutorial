"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DropZone, type Rejected } from "@/components/drop-zone";
import { fmt, type Dict, type Locale } from "@/i18n";
import { setHandoff } from "@/lib/studio/db";
import { countBucket, track } from "@/lib/track";

export function HeroDrop({ lang, t, variant = "hero" }: { lang: Locale; t: Dict; variant?: "hero" | "panel" }) {
  const router = useRouter();
  const [rejected, setRejected] = useState<Rejected[]>([]);
  return (
    <div>
      <DropZone
        variant={variant}
        labels={{ drop: t.landing.drop, or: t.landing.dropOr, choose: t.landing.choose, camera: t.landing.camera, hint: t.landing.dropHint }}
        onFiles={(files, rej) => {
          setRejected(rej);
          if (files.length) {
            track("upload_start", { count: countBucket(files.length), source: "landing" });
            setHandoff(files);
            router.push(`/${lang}/studio?new=1`);
          }
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
