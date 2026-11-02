"use client";

import { useState, useSyncExternalStore } from "react";
import { useCoarsePointer } from "@/components/drop-zone";
import { useToast } from "@/components/toast";
import { fmt, type Dict, type Locale } from "@/i18n";
import { describeChange } from "@/lib/describe";
import { loadBroker, saveBroker } from "@/lib/studio/broker";
import {
  PRESET_ORDER,
  canShareFiles,
  download,
  exportPhotos,
  packResult,
  shareFiles,
  shareable,
  type ExportResult,
  type ManifestItem,
  type PresetId,
} from "@/lib/studio/export";
import type { Studio } from "@/lib/studio/use-studio";
import { track } from "@/lib/track";
import { Switch } from "./panels";

function buildManifest(items: ManifestItem[], t: Dict, lang: Locale, projectName: string) {
  const lines: string[] = [];
  lines.push(`${t.brand.name} — ${projectName}`);
  lines.push(new Date().toISOString().slice(0, 10));
  lines.push("");
  for (const it of items) {
    lines.push(`${it.index}. ${it.name}`);
    if (it.version) {
      const tool = t.ai.tools[it.version.tool].t;
      lines.push(`   - ${fmt(t.changes.ai, { tool, model: it.version.model }, lang)}${it.version.tool === "stage" ? ` — ${t.export.stagedLabel}` : ""}`);
    }
    for (const c of it.changes) lines.push(`   - ${describeChange(c, t, lang)}`);
    if (!it.version && it.changes.length === 0) lines.push(`   - ${t.studio.changesEmpty}`);
    lines.push(`   ${it.files.join(", ")}`);
    lines.push("");
  }
  lines.push(t.trust.lawNote);
  return lines.join("\r\n");
}

const noop = () => () => {};
// Chrome on Android hands at most 10 files to the share sheet per tap.
const SHARE_BATCH = 10;

const presetKey = (listing: string, phone: boolean) => `dira.presets.${listing}.${phone ? "phone" : "computer"}`;
function loadPresets(listing: string, phone: boolean): PresetId[] | null {
  try {
    const v = JSON.parse(localStorage.getItem(presetKey(listing, phone)) ?? "null");
    return Array.isArray(v) ? v.filter((x): x is PresetId => PRESET_ORDER.includes(x)) : null;
  } catch {
    return null;
  }
}
function savePresets(listing: string, phone: boolean, v: PresetId[]) {
  try {
    localStorage.setItem(presetKey(listing, phone), JSON.stringify(v));
  } catch {
    /* storage blocked: the choice just isn't remembered */
  }
}

export function ExportPanel({ s, t, lang }: { s: Studio; t: Dict; lang: Locale }) {
  const toast = useToast();
  const E = t.export;
  const sale = s.project?.listing === "sale";
  const coarse = useCoarsePointer();
  const shareOk = useSyncExternalStore(noop, canShareFiles, () => false);
  // Phones get the share sheet (gallery, WhatsApp); computers get a download.
  const phone = coarse && shareOk;

  const ready = s.photos.filter((p) => p.status === "ready");
  const anyAi = ready.some((p) => p.activeVersion);
  // Last time's choice for this kind of listing on this kind of device; otherwise Yad2 only on a
  // phone (one copy of each photo in the gallery), Yad2 and full size on a computer for sales.
  const listing = s.project?.listing ?? "rent";
  const [presets, setPresets] = useState<PresetId[]>(() => loadPresets(listing, phone) ?? (sale && !phone ? ["portal", "full"] : ["portal"]));
  const [scope, setScope] = useState<"current" | "all">(s.photos.length > 1 ? "all" : "current");
  const [originals, setOriginals] = useState(false);
  const [manifest, setManifest] = useState(anyAi);
  const [saved] = useState(loadBroker);
  const [broker, setBroker] = useState(() => {
    const p = s.project?.broker;
    return { name: p?.name || saved?.name || "", license: p?.license || saved?.license || "", on: Boolean(saved?.on || p?.license) };
  });
  // Brokers advertise rentals too: once a licence is saved, the block shows on every listing.
  const brokerProminent = sale || Boolean(saved?.license);
  const [sharedBatches, setSharedBatches] = useState<number[]>([]);
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<ExportResult | null>(null);

  // Any change to the choices makes the prepared files stale.
  const brokerOn = broker.on;
  const key = `${presets.join()}|${scope}|${originals}|${manifest}|${brokerOn}|${broker.name}|${broker.license}|${s.selected?.id}|${ready.length}`;
  const [preparedFor, setPreparedFor] = useState("");
  const fresh = result && preparedFor === key;

  const targets = scope === "all" ? ready : s.selected && s.selected.status === "ready" ? [s.selected] : [];
  const toggle = (id: PresetId) =>
    setPresets((l) => {
      const next = l.includes(id) ? l.filter((x) => x !== id) : [...l, id];
      savePresets(listing, phone, next);
      return next;
    });
  const imageCount = targets.length * presets.length + (originals ? targets.length : 0);

  const deliver = async (r: ExportResult, how: "download" | "share", batch = 0) => {
    if (how === "share") {
      const files = shareable(r).slice(batch * SHARE_BATCH, (batch + 1) * SHARE_BATCH);
      const res = await shareFiles(files, s.project?.name);
      if (res === "shared") setSharedBatches((l) => (l.includes(batch) ? l : [...l, batch]));
      if (res === "shared") track("share", { photos: files.length > 1 ? "many" : "one" });
      if (res === "failed") toast.show({ text: E.shareFailed, tone: "error" }, 7000);
      return;
    }
    const out = await packResult(r);
    download(out.blob, out.filename);
    track("download", { presets: presets.join("+"), zip: out.filename.endsWith(".zip"), photos: targets.length > 1 ? "many" : "one" });
  };

  const run = async () => {
    if (!s.project || targets.length === 0 || presets.length === 0) return;
    setResult(null);
    setBusy({ done: 0, total: targets.length });
    try {
      const b = { name: broker.name.trim(), license: broker.license.trim() };
      if (brokerOn || saved) saveBroker({ ...b, on: broker.on });
      if (brokerOn) await s.saveProject({ broker: b });
      const out = await exportPhotos(
        s.project,
        targets,
        {
          presets,
          includeOriginals: originals,
          manifest: { include: manifest, filename: E.manifestName, build: (items) => buildManifest(items, t, lang, s.project!.name) },
          overlay: {
            stagedLabel: E.stagedLabel,
            aiLabel: t.ai.aiEdited,
            broker: brokerOn && (b.name || b.license) ? { ...b, licenseLabel: lang === "he" ? "רישיון" : "Licence" } : undefined,
          },
          onProgress: (done, total) => setBusy({ done, total }),
          untitled: t.studio.untitled,
        },
        lang === "he",
      );
      await s.saveProject({ exports: (s.project.exports ?? 0) + 1 });
      setResult(out);
      setPreparedFor(key);
      setSharedBatches([]);
      // A download can start on its own; the share sheet needs a fresh tap, so phones get a button.
      if (!phone) {
        await deliver(out, "download");
        toast.show({ text: E.ready });
      }
    } catch (e) {
      console.error(e);
      toast.show({ text: E.failed, tone: "error" });
    } finally {
      setBusy(null);
    }
  };

  const brokerBlock = (
        <div className="rounded-[10px] border border-line-2 p-3">
          <p className="text-[12.5px] font-semibold text-prussian">{E.brokerFor}</p>
          <Switch label={E.broker} hint={E.brokerHint} checked={brokerOn} onChange={(on) => setBroker((b) => ({ ...b, on }))} />
          {brokerOn && (
            <div className="grid gap-3 pb-1 sm:grid-cols-2 lg:grid-cols-1">
              <div>
                <label className="label" htmlFor="b-name">
                  {E.brokerName}
                </label>
                <input id="b-name" className="field" value={broker.name} onChange={(e) => setBroker((b) => ({ ...b, name: e.target.value }))} maxLength={60} autoComplete="organization" />
              </div>
              <div>
                <label className="label" htmlFor="b-lic">
                  {E.brokerLicense}
                </label>
                <input id="b-lic" className="field ltr" inputMode="numeric" value={broker.license} onChange={(e) => setBroker((b) => ({ ...b, license: e.target.value.replace(/[^\d-]/g, "") }))} maxLength={12} />
              </div>
              <p className="text-[12.5px] text-ink-3 sm:col-span-2 lg:col-span-1">{E.brokerSaved}</p>
            </div>
          )}
        </div>
  );

  const shareCount = fresh ? shareable(result!).length : 0;
  const batches = Math.ceil(shareCount / SHARE_BATCH);

  return (
    <div className="grid gap-6">
      <fieldset>
        <legend className="text-[15px] font-semibold">{E.where}</legend>
        <div className="mt-3 grid gap-1.5">
          {PRESET_ORDER.map((id) => (
            <label
              key={id}
              className={`flex min-h-[52px] cursor-pointer items-center gap-3 rounded-[10px] border px-3 py-2.5 transition-colors ${presets.includes(id) ? "border-prussian bg-prussian-tint" : "border-line-2 bg-surface hover:border-line"}`}
            >
              <input type="checkbox" className="h-[18px] w-[18px] flex-none accent-[var(--color-prussian)]" checked={presets.includes(id)} onChange={() => toggle(id)} />
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold">{E.presets[id].t}</span>
                <span className="block text-[13px] text-ink-3">{E.presets[id].d}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {ready.length > 1 && (
        <fieldset>
          <legend className="text-[15px] font-semibold">{E.which}</legend>
          <div className="segmented mt-3" role="group">
            <button type="button" aria-pressed={scope === "all"} onClick={() => setScope("all")}>
              {fmt(E.all, { n: ready.length }, lang)}
            </button>
            <button type="button" aria-pressed={scope === "current"} onClick={() => setScope("current")}>
              {E.current}
            </button>
          </div>
        </fieldset>
      )}

      {brokerProminent && brokerBlock}

      <details className="group rounded-[10px] border border-line-2 px-3">
        <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between text-[14.5px] font-semibold [&::-webkit-details-marker]:hidden">
          {E.more}
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" className="transition-transform group-open:rotate-180">
            <path d="m3 5 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </summary>
        <div className="divide-y divide-line-2 pb-1">
          <Switch label={E.includeManifest} hint={E.manifestHint} checked={manifest} onChange={setManifest} />
          <Switch label={E.includeOriginals} checked={originals} onChange={setOriginals} />
        </div>
        {!brokerProminent && <div className="pb-3">{brokerBlock}</div>}
      </details>

      {/* Explanations sit above the bar, so the bar itself stays slim on short phones. */}
      {fresh && phone && <p className="-mb-3 text-[13px] text-ink-3">{E.saveShareHint}</p>}
      {!phone && !fresh && imageCount + (manifest ? 1 : 0) > 1 && (
        <p className="-mb-3 text-[13px] text-ink-3">{coarse ? E.noShare : presets.length > 1 ? E.zipFolders : E.zipFlat}</p>
      )}

      {/* The action stays in reach at the bottom of the panel while the options scroll. */}
      <div className="sticky -bottom-4 z-10 -mx-4 grid gap-2 border-t border-line-2 bg-surface px-4 pb-[max(0.625rem,env(safe-area-inset-bottom))] pt-2.5 sm:-bottom-5 sm:-mx-5 sm:px-5">
        {fresh && phone ? (
          <>
            {batches <= 1 ? (
              <button type="button" className="btn btn-primary w-full" onClick={() => deliver(result!, "share")}>
                {fmt(shareCount > 1 ? E.saveShareMany : E.saveShare, { n: shareCount }, lang)}
              </button>
            ) : (
              <>
                <p className="text-[13.5px] font-semibold">{fmt(E.shareBatches, { n: shareCount }, lang)}</p>
                {Array.from({ length: batches }, (_, b) => {
                  const from = b * SHARE_BATCH + 1;
                  const to = Math.min(shareCount, (b + 1) * SHARE_BATCH);
                  const done = sharedBatches.includes(b);
                  return (
                    <button key={b} type="button" className={`btn w-full ${done ? "btn-quiet" : "btn-primary"}`} onClick={() => deliver(result!, "share", b)}>
                      {done ? "✓ " : ""}
                      {fmt(from === to ? E.shareBatchOne : E.shareBatch, { from, to }, lang)}
                    </button>
                  );
                })}
              </>
            )}
            <button type="button" className="justify-self-center py-1 text-[13.5px] font-semibold text-prussian underline underline-offset-4" onClick={() => deliver(result!, "download")}>
              {E.downloadInstead}
            </button>
          </>
        ) : fresh ? (
          <>
            <p className="flex items-center gap-2 text-[14.5px] font-semibold text-ok" role="status">
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <path d="m3 8.5 3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {E.downloaded}
            </p>
            <button type="button" className="btn btn-quiet w-full" onClick={() => deliver(result!, "download")}>
              {E.again}
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-primary w-full" disabled={busy !== null || targets.length === 0 || presets.length === 0} onClick={run}>
            {busy
              ? fmt(E.preparing, { done: busy.done, total: busy.total }, lang)
              : phone
                ? fmt(imageCount > 1 ? E.prepareMany : E.prepareOne, { n: imageCount }, lang)
                : imageCount + (manifest ? 1 : 0) > 1
                  ? E.downloadZip
                  : E.download}
          </button>
        )}
        {presets.length === 0 && <p className="text-[13px] text-err">{E.pickOne}</p>}
        {busy && (
          <div className="h-1.5 overflow-hidden rounded-full bg-line-2" role="progressbar" aria-label={E.preparingLabel} aria-valuemin={0} aria-valuemax={busy.total} aria-valuenow={busy.done}>
            <div className="h-full bg-prussian transition-[width] duration-300" style={{ width: `${Math.max(4, (busy.done / busy.total) * 100)}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}
