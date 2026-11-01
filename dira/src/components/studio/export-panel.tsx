"use client";

import { useState } from "react";
import { useToast } from "@/components/toast";
import { fmt, type Dict, type Locale } from "@/i18n";
import { describeChange } from "@/lib/describe";
import { PRESETS, download, exportPhotos, shareFiles, type ManifestItem, type PresetId } from "@/lib/studio/export";
import type { Studio } from "@/lib/studio/use-studio";
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

export function ExportPanel({ s, t, lang }: { s: Studio; t: Dict; lang: Locale }) {
  const toast = useToast();
  const [presets, setPresets] = useState<PresetId[]>(s.project?.listing === "sale" ? ["full", "portal"] : ["portal", "whatsapp"]);
  const [scope, setScope] = useState<"current" | "all">(s.photos.length > 1 ? "all" : "current");
  const [originals, setOriginals] = useState(false);
  const [manifest, setManifest] = useState(true);
  const [broker, setBroker] = useState(Boolean(s.project?.broker?.license));
  const [bName, setBName] = useState(s.project?.broker?.name ?? "");
  const [bLicense, setBLicense] = useState(s.project?.broker?.license ?? "");
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);

  const ready = s.photos.filter((p) => p.status === "ready");
  const targets = scope === "all" ? ready : s.selected && s.selected.status === "ready" ? [s.selected] : [];
  const toggle = (id: PresetId) => setPresets((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));

  const run = async () => {
    if (!s.project || targets.length === 0 || presets.length === 0) return;
    setResult(null);
    setBusy({ done: 0, total: targets.length });
    try {
      if (broker) await s.saveProject({ broker: { name: bName.trim(), license: bLicense.trim() } });
      const ordered = (Object.keys(PRESETS) as PresetId[]).filter((p) => presets.includes(p));
      const out = await exportPhotos(
        s.project,
        targets,
        {
          presets: ordered,
          includeOriginals: originals,
          manifest: { include: manifest, filename: t.export.manifestName, build: (items) => buildManifest(items, t, lang, s.project!.name) },
          overlay: {
            stagedLabel: t.export.stagedLabel,
            aiLabel: t.ai.aiEdited,
            broker: broker && (bName.trim() || bLicense.trim()) ? { name: bName.trim(), license: bLicense.trim(), licenseLabel: lang === "he" ? "רישיון" : "Licence" } : undefined,
          },
          onProgress: (done, total) => setBusy({ done, total }),
        },
        lang === "he",
      );
      await s.saveProject({ exports: (s.project.exports ?? 0) + 1 });
      setResult(out);
      download(out.blob, out.filename);
      toast.show({ text: t.export.ready });
    } catch (e) {
      console.error(e);
      toast.show({ text: t.export.failed, tone: "error" });
    } finally {
      setBusy(null);
    }
  };

  const canShare = typeof navigator !== "undefined" && "canShare" in navigator;

  return (
    <div className="grid gap-6">
      <p className="text-[14px] text-ink-2">{t.export.lead}</p>
      <fieldset>
        <legend className="text-[13px] font-semibold text-ink-3">{t.export.title}</legend>
        <div className="mt-2 grid gap-1.5">
          {(Object.keys(PRESETS) as PresetId[]).map((id) => (
            <label key={id} className={`flex cursor-pointer items-start gap-3 rounded-[10px] border p-3 transition-colors ${presets.includes(id) ? "border-prussian bg-prussian-tint" : "border-line-2 bg-surface hover:border-line"}`}>
              <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--color-prussian)]" checked={presets.includes(id)} onChange={() => toggle(id)} />
              <span>
                <span className="block text-[15px] font-semibold">{t.export.presets[id].t}</span>
                <span className="block text-[13px] text-ink-3">{t.export.presets[id].d}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-[13px] font-semibold text-ink-3">{t.export.which}</legend>
        <div className="segmented mt-2" role="group">
          <button type="button" aria-pressed={scope === "current"} onClick={() => setScope("current")}>
            {t.export.current}
          </button>
          <button type="button" aria-pressed={scope === "all"} onClick={() => setScope("all")}>
            {fmt(t.export.all, { n: ready.length }, lang)}
          </button>
        </div>
      </fieldset>

      <div className="divide-y divide-line-2">
        <Switch label={t.export.includeManifest} checked={manifest} onChange={setManifest} />
        <Switch label={t.export.includeOriginals} checked={originals} onChange={setOriginals} />
        <Switch label={t.export.broker} hint={t.export.brokerHint} checked={broker} onChange={setBroker} />
      </div>
      {broker && (
        <div className="grid gap-3">
          <div>
            <label className="label" htmlFor="b-name">
              {t.export.brokerName}
            </label>
            <input id="b-name" className="field" value={bName} onChange={(e) => setBName(e.target.value)} maxLength={60} autoComplete="organization" />
          </div>
          <div>
            <label className="label" htmlFor="b-lic">
              {t.export.brokerLicense}
            </label>
            <input id="b-lic" className="field ltr" inputMode="numeric" value={bLicense} onChange={(e) => setBLicense(e.target.value.replace(/[^\d-]/g, ""))} maxLength={12} />
          </div>
        </div>
      )}

      <div className="grid gap-2">
        <button type="button" className="btn btn-primary w-full" disabled={busy !== null || targets.length === 0 || presets.length === 0} onClick={run}>
          {busy
            ? fmt(t.export.preparing, { done: busy.done, total: busy.total }, lang)
            : targets.length * presets.length + (originals ? targets.length : 0) + (manifest ? 1 : 0) > 1
              ? t.export.downloadZip
              : t.export.download}
        </button>
        {busy && (
          <div className="h-1.5 overflow-hidden rounded-full bg-line-2" role="progressbar" aria-valuemin={0} aria-valuemax={busy.total} aria-valuenow={busy.done}>
            <div className="h-full bg-prussian transition-[width] duration-300" style={{ width: `${Math.max(4, (busy.done / busy.total) * 100)}%` }} />
          </div>
        )}
        {result && canShare && (
          <button type="button" className="btn btn-quiet w-full sm:hidden" onClick={() => shareFiles(result.blob, result.filename)}>
            {t.export.share}
          </button>
        )}
      </div>
    </div>
  );
}
