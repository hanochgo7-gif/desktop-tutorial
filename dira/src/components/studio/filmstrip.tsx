"use client";

import { useRef, useState } from "react";
import { validateFiles, type Rejected } from "@/components/drop-zone";
import type { Dict } from "@/i18n";
import type { Studio } from "@/lib/studio/use-studio";

type Props = { s: Studio; t: Dict; onAdd: (files: File[], rejected: Rejected[]) => void; onRemove: (id: string) => void };

export function Filmstrip({ s, t, onAdd, onRemove }: Props) {
  const input = useRef<HTMLInputElement>(null);
  // Drag a thumbnail onto another to reorder (mouse); the ★ button sets the cover (any device).
  const dragId = useRef<string | null>(null);
  const [over, setOver] = useState<number | null>(null);
  return (
    <div className="flex min-h-0 gap-2 overflow-x-auto p-2 lg:h-full lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden" role="listbox" aria-label={t.studio.photos}>
      {s.photos.map((p, i) => {
        const thumb = s.url(p.thumb);
        const selected = p.id === s.selectedId;
        const busy = p.status === "new" || p.status === "analyzing";
        const staged = p.versions.find((v) => v.id === p.activeVersion)?.tool === "stage";
        return (
          <div
            key={p.id}
            className={`group relative flex-none rounded-[8px] ${over === i ? "outline-2 outline-offset-2 outline-dashed outline-[#9db4ee]" : ""}`}
            draggable={s.photos.length > 1}
            onDragStart={(e) => {
              dragId.current = p.id;
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/x-dira-photo", p.id);
            }}
            onDragOver={(e) => {
              if (!dragId.current) return;
              e.preventDefault();
              if (over !== i) setOver(i);
            }}
            onDragLeave={() => setOver((o) => (o === i ? null : o))}
            onDrop={(e) => {
              if (!dragId.current) return;
              e.preventDefault();
              s.movePhoto(dragId.current, i);
              dragId.current = null;
              setOver(null);
            }}
            onDragEnd={() => {
              dragId.current = null;
              setOver(null);
            }}
          >
            <button
              type="button"
              role="option"
              aria-selected={selected}
              aria-label={`${i + 1}. ${p.name}${p.status === "error" ? ` — ${t.studio.failed}` : busy ? ` — ${t.studio.analyzing}` : ""}`}
              onClick={() => s.setSelectedId(p.id)}
              className={`relative block h-[52px] w-[70px] overflow-hidden sm:h-[64px] sm:w-[86px] rounded-[6px] bg-stage-2 outline-offset-2 lg:h-[72px] lg:w-[96px] ${selected ? "ring-2 ring-[#9db4ee]" : "opacity-80 hover:opacity-100"}`}
            >
              {thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumb} alt="" className="h-full w-full object-cover" draggable={false} />
              ) : (
                <span className="stage-skeleton absolute inset-0" />
              )}
              <span className="tnum absolute bottom-1 start-1 rounded bg-black/60 px-1 text-[11px] text-white">{i === 0 && s.photos.length > 1 ? `★ ${t.studio.cover}` : i + 1}</span>
              {busy && <span className="absolute inset-x-0 bottom-0 h-[3px] animate-pulse bg-[#9db4ee]" />}
              {p.status === "error" && (
                <span className="absolute inset-0 grid place-items-center bg-err/70 text-[12px] font-semibold text-white">{t.studio.failed}</span>
              )}
              {staged && <span className="absolute end-1 top-1 h-2 w-2 rounded-full bg-[#9db4ee]" aria-hidden="true" />}
            </button>
            <button
              type="button"
              aria-label={`${t.studio.remove}: ${p.name}`}
              onClick={() => onRemove(p.id)}
              className="absolute -end-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-ink text-white opacity-100 shadow after:absolute after:-inset-2.5 after:content-[''] sm:opacity-0 sm:focus:opacity-100 sm:group-hover:opacity-100"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                <path d="M3 3l6 6M9 3 3 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
            {selected && i > 0 && (
              <button
                type="button"
                aria-label={`${t.studio.makeCover}: ${p.name}`}
                title={t.studio.makeCover}
                onClick={() => s.movePhoto(p.id, 0)}
                className="absolute -bottom-1.5 -end-1.5 grid h-6 w-6 place-items-center rounded-full bg-daylight text-[13px] leading-none text-ink shadow after:absolute after:-inset-2.5 after:content-['']"
              >
                ★
              </button>
            )}
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="grid h-[52px] w-[70px] flex-none place-items-center sm:h-[64px] sm:w-[86px] rounded-[6px] border border-dashed border-stage-line text-white/70 hover:border-white/50 hover:text-white lg:h-[72px] lg:w-[96px]"
        aria-label={t.studio.add}
      >
        <span className="flex flex-col items-center gap-1 text-[12px]">
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          {t.studio.add}
        </span>
      </button>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          if (e.target.files) {
            const { ok, rejected } = validateFiles(e.target.files);
            onAdd(ok, rejected);
          }
          e.target.value = "";
        }}
      />
    </div>
  );
}
