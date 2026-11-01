"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { DropZone, type Rejected } from "@/components/drop-zone";
import { LogoMark } from "@/components/logo";
import { LanguageLink } from "@/components/site-header";
import { ToastProvider, useToast } from "@/components/toast";
import { fmt, type Dict, type Locale } from "@/i18n";
import { MAX_PHOTOS } from "@/lib/site";
import { takeHandoff } from "@/lib/studio/db";
import { useStudio } from "@/lib/studio/use-studio";
import { AiPanel } from "./ai-panel";
import { ExportPanel } from "./export-panel";
import { Filmstrip } from "./filmstrip";
import { AdjustPanel, FixPanel, RemovePanel } from "./panels";
import { Stage } from "./stage";

type Tab = "fix" | "adjust" | "remove" | "ai" | "export";

const noop = () => () => {};

export function StudioApp(props: { lang: Locale; t: Dict }) {
  return (
    <ToastProvider>
      <StudioInner {...props} />
    </ToastProvider>
  );
}

function StudioInner({ lang, t }: { lang: Locale; t: Dict }) {
  const search = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  // Files handed over from the landing page, and which project to open.
  const [initial] = useState(() => ({ files: search.get("new") ? takeHandoff() : null, projectId: search.get("p") }));
  const s = useStudio({ projectId: initial.projectId, newProjectName: t.studio.untitled, initialFiles: initial.files });
  const [tab, setTab] = useState<Tab>("fix");
  const [radius, setRadius] = useState(0.018);
  const unsupported = useSyncExternalStore(
    noop,
    () => typeof Worker === "undefined" || typeof OffscreenCanvas === "undefined" || typeof indexedDB === "undefined",
    () => false,
  );

  // Keep the project in the address so a refresh or a bookmark reopens it.
  useEffect(() => {
    if (s.project && search.get("p") !== s.project.id) router.replace(`/${lang}/studio?p=${s.project.id}`, { scroll: false });
  }, [s.project, search, router, lang]);

  const reportRejected = (rej: Rejected[], added: number, offered: number) => {
    for (const r of rej) toast.show({ text: fmt(r.reason === "tooBig" ? t.studio.tooBig : t.studio.notImage, { name: r.name }, lang), tone: "error" }, 7000);
    if (added < offered) toast.show({ text: fmt(t.studio.limit, { n: MAX_PHOTOS }, lang), tone: "error" });
  };

  const onAdd = async (files: File[], rej: Rejected[]) => {
    const added = await s.addFiles(files);
    reportRejected(rej, added ?? 0, files.length);
  };

  const onRemove = async (id: string) => {
    const removed = await s.removePhoto(id);
    if (removed) toast.show({ text: t.studio.undoRemoved, action: { label: t.studio.undo, run: () => s.restorePhoto(removed.photo, removed.index) } }, 7000);
  };

  // Surface failed photos once, with the reason.
  const errorShown = useRef(new Set<string>());
  useEffect(() => {
    for (const p of s.photos) {
      if (p.status === "error" && !errorShown.current.has(p.id)) {
        errorShown.current.add(p.id);
        const msg = p.error === "decode" ? t.studio.decodeFailed : p.error === "memory" ? t.studio.memoryFailed : t.studio.decodeFailed;
        toast.show({ text: fmt(msg, { name: p.name }, lang), tone: "error", action: { label: t.studio.retry, run: () => s.retry(p.id) } }, 9000);
      }
    }
  }, [s.photos, errorShown, t, lang, toast, s]);

  const photo = s.selected;
  const ready = photo?.status === "ready" && photo.recipe && photo.analysis;
  const brush = tab === "remove" && ready ? {
    active: true,
    radius,
    onStroke: (st: Parameters<typeof s.setRecipe>[1]["removals"][number]) => s.setRecipe(photo!.id, { ...photo!.recipe!, removals: [...photo!.recipe!.removals, st] }),
  } : null;

  const tabs: { id: Tab; label: string }[] = [
    { id: "fix", label: t.studio.tabs.fix },
    { id: "adjust", label: t.studio.tabs.adjust },
    { id: "remove", label: t.studio.tabs.remove },
    { id: "ai", label: t.studio.tabs.ai },
    { id: "export", label: t.studio.tabs.export },
  ];

  const empty = s.loaded && s.photos.length === 0;

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh lg:overflow-hidden">
      {/* App bar */}
      <header className="flex h-14 flex-none items-center gap-3 border-b border-line-2 bg-paper px-3 sm:px-4">
        <Link href={`/${lang}`} aria-label={t.brand.name} className="flex-none">
          <LogoMark />
        </Link>
        {s.project ? (
          <input
            key={s.project.id}
            aria-label={t.studio.rename}
            defaultValue={s.project.name}
            onBlur={(e) => s.renameProject(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            className="min-w-0 max-w-[14rem] flex-1 truncate rounded-md border border-transparent bg-transparent px-2 py-1.5 text-[15px] font-semibold hover:border-line focus:border-prussian focus:outline-none sm:flex-none"
            maxLength={80}
          />
        ) : (
          <span className="skeleton h-6 w-36 rounded" />
        )}
        {s.project && (
          <div className="segmented hidden sm:inline-flex" role="group" aria-label={t.studio.listing}>
            {(["rent", "sale"] as const).map((l) => (
              <button key={l} type="button" aria-pressed={s.project!.listing === l} onClick={() => s.setListing(l)}>
                {l === "rent" ? t.studio.rent : t.studio.sale}
              </button>
            ))}
          </div>
        )}
        <span className="hidden text-[13px] text-ink-3 md:inline" aria-live="polite">
          {s.counts.busy ? fmt(t.studio.batch, { done: s.counts.ready, total: s.counts.total }, lang) : s.saving ? t.studio.saving : s.loaded ? t.studio.saved : ""}
        </span>
        <nav className="ms-auto flex items-center gap-1">
          <Link href={`/${lang}/projects`} className="rounded-md px-2.5 py-2 text-[14px] text-ink-2 hover:text-ink">
            {t.nav.projects}
          </Link>
          <LanguageLink lang={lang} t={t} className="hidden rounded-md px-2.5 py-2 text-[14px] text-ink-2 hover:text-ink sm:inline-block" />
          <Link href={`/${lang}/account`} className="rounded-md px-2.5 py-2 text-[14px] text-ink-2 hover:text-ink">
            {t.nav.account}
          </Link>
        </nav>
      </header>

      {unsupported && <p role="alert" className="bg-err-tint px-4 py-3 text-[14px] text-err">{t.studio.unsupported}</p>}

      {!s.loaded ? (
        <main id="main" className="on-stage flex flex-1 items-center justify-center bg-stage" aria-busy="true">
          <span className="sr-only">{t.common.loading}</span>
          <div className="stage-skeleton h-2 w-40 rounded-full" />
        </main>
      ) : empty ? (
        <main id="main" className="on-stage flex flex-1 items-center justify-center bg-stage p-4">
          <div className="w-full max-w-xl text-center">
            <h1 className="display text-[34px] text-white sm:text-[42px]">{t.studio.emptyTitle}</h1>
            <p className="mx-auto mt-3 max-w-md text-[16px] text-white/70">{t.studio.emptyLead}</p>
            <div className="mt-8">
              <DropZone
                variant="stage"
                labels={{ drop: t.landing.drop, or: t.landing.dropOr, choose: t.landing.choose, camera: t.landing.camera, hint: t.landing.dropHint }}
                onFiles={onAdd}
              />
            </div>
            <p className="mt-6 text-[13px] text-white/50">{t.studio.storageWarning}</p>
          </div>
        </main>
      ) : (
        <main id="main" className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] lg:grid-cols-[120px_minmax(0,1fr)_392px] lg:grid-rows-[minmax(0,1fr)]">
          {/* Filmstrip: a column on desktop, a row on phones (below the stage). */}
          <div className="on-stage order-2 min-h-0 min-w-0 border-stage-line bg-stage lg:order-none lg:border-e">
            <Filmstrip s={s} t={t} onAdd={onAdd} onRemove={onRemove} />
          </div>

          <div className="order-1 h-[58vh] min-h-[320px] min-w-0 lg:order-none lg:h-full lg:min-h-0">
            <Stage s={s} t={t} lang={lang} brush={brush} />
          </div>

          <aside className="order-3 flex min-h-0 min-w-0 flex-col border-line-2 bg-surface lg:order-none lg:border-s" aria-label={t.studio.title}>
            <div role="tablist" aria-label={t.studio.title} className="sticky top-0 z-10 flex flex-none gap-1 overflow-x-auto border-b border-line-2 bg-surface px-2 pt-2">
              {tabs.map((x) => (
                <button
                  key={x.id}
                  id={`tab-${x.id}`}
                  role="tab"
                  type="button"
                  aria-selected={tab === x.id}
                  aria-controls={`panel-${x.id}`}
                  onClick={() => setTab(x.id)}
                  className={`relative min-h-[44px] flex-none px-3 text-[14.5px] font-semibold transition-colors ${tab === x.id ? "text-ink" : "text-ink-3 hover:text-ink-2"}`}
                >
                  {x.label}
                  {tab === x.id && <span className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-prussian" />}
                </button>
              ))}
            </div>
            <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
              {!s.loaded || !photo ? (
                <div className="grid gap-3">
                  <div className="skeleton h-5 w-1/3 rounded" />
                  <div className="skeleton h-16 rounded-[10px]" />
                  <div className="skeleton h-16 rounded-[10px]" />
                </div>
              ) : tab === "export" ? (
                <ExportPanel s={s} t={t} lang={lang} />
              ) : !ready ? (
                photo.status === "error" ? (
                  <div className="grid gap-3">
                    <p className="text-[14.5px] text-err">{fmt(photo.error === "memory" ? t.studio.memoryFailed : t.studio.decodeFailed, { name: photo.name }, lang)}</p>
                    <button type="button" className="btn btn-quiet btn-sm" onClick={() => s.retry(photo.id)}>
                      {t.studio.retry}
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-3" aria-busy="true">
                    <p className="text-[14px] text-ink-3">{t.studio.analyzing}</p>
                    <div className="skeleton h-16 rounded-[10px]" />
                    <div className="skeleton h-28 rounded-[10px]" />
                  </div>
                )
              ) : tab === "fix" ? (
                <FixPanel s={s} t={t} lang={lang} photo={photo} />
              ) : tab === "adjust" ? (
                <AdjustPanel s={s} t={t} lang={lang} photo={photo} />
              ) : tab === "remove" ? (
                <RemovePanel s={s} t={t} lang={lang} photo={photo} radius={radius} setRadius={setRadius} />
              ) : (
                <AiPanel s={s} t={t} lang={lang} photo={photo} />
              )}
            </div>
          </aside>
        </main>
      )}
    </div>
  );
}
