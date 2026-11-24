"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CompareMode } from "@/components/compare-view";
import { DropZone, useCoarsePointer, type Rejected } from "@/components/drop-zone";
import { LogoMark } from "@/components/logo";
import { LanguageLink } from "@/components/site-header";
import { ToastProvider, useToast } from "@/components/toast";
import { fmt, type Dict, type Locale } from "@/i18n";
import { AI_LIVE, MAX_PHOTOS, asset } from "@/lib/site";
import { takeHandoff } from "@/lib/studio/db";
import { useStudio } from "@/lib/studio/use-studio";
import { sampleFile } from "@/lib/sample";
import { countBucket, track } from "@/lib/track";
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
  const [initial] = useState(() => ({ fresh: !!search.get("new"), files: search.get("new") ? takeHandoff() : null, projectId: search.get("p") }));
  const s = useStudio({ projectId: initial.projectId, newProjectName: t.studio.untitled, initialFiles: initial.files, fresh: initial.fresh });
  const [tab, setTab] = useState<Tab>("fix");
  const coarse = useCoarsePointer();
  // A thin brush by default: a tight mark leaves the cleanest fill.
  const [radius, setRadius] = useState(0.006);
  // The erase tool switches one photo to "after"; every other photo (and any return) starts split.
  const [view, setView] = useState<{ id: string | null; mode: CompareMode }>({ id: null, mode: "split" });
  const viewMode: CompareMode = view.id === s.selectedId ? view.mode : "split";
  const setViewMode = (mode: CompareMode) => setView({ id: s.selectedId, mode });
  // Erase tab: paint on the original, then look at the result.
  const [brushView, setBrushView] = useState<"paint" | "result">("paint");
  const unsupported = useSyncExternalStore(
    noop,
    () => typeof Worker === "undefined" || typeof OffscreenCanvas === "undefined" || typeof indexedDB === "undefined",
    () => false,
  );

  // A pull-down on the panel must not reload the page (and drop an unsaved stroke).
  useEffect(() => {
    const el = document.documentElement;
    const prev = el.style.overscrollBehaviorY;
    el.style.overscrollBehaviorY = "none";
    return () => {
      el.style.overscrollBehaviorY = prev;
    };
  }, []);

  // Keep the project in the address so a refresh or a bookmark reopens it.
  useEffect(() => {
    if (s.project && search.get("p") !== s.project.id) router.replace(`/${lang}/studio?p=${s.project.id}`, { scroll: false });
  }, [s.project, search, router, lang]);

  const reportRejected = (rej: Rejected[], added: number, offered: number) => {
    for (const r of rej) toast.show({ text: fmt(r.reason === "tooBig" ? t.studio.tooBig : t.studio.notImage, { name: r.name }, lang), tone: "error" }, 7000);
    if (added < offered) toast.show({ text: fmt(t.studio.limit, { n: MAX_PHOTOS }, lang), tone: "error" });
  };

  const onAdd = async (files: File[], rej: Rejected[]) => {
    if (files.length) track("upload_start", { count: countBucket(files.length), source: "studio" });
    const added = await s.addFiles(files);
    reportRejected(rej, added ?? 0, files.length);
  };

  const onRemove = async (id: string) => {
    const removed = await s.removePhoto(id);
    if (removed) toast.show({ text: t.studio.undoRemoved, action: { label: t.studio.undo, run: () => s.restorePhoto(removed.photo, removed.index) } }, 7000);
  };

  // The moment the product delivers: the first corrected photo of the visit (counted once).
  const readySent = useRef(false);
  useEffect(() => {
    if (readySent.current || s.counts.ready === 0) return;
    readySent.current = true;
    track("correction_ready", { count: countBucket(s.counts.total) });
  }, [s.counts.ready, s.counts.total]);

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
  const brush = tab === "remove" && ready && brushView === "paint" ? {
    active: true,
    radius,
    onStroke: (st: Parameters<typeof s.setRecipe>[1]["removals"][number]) => {
      s.setRecipe(photo!.id, { ...photo!.recipe!, removals: [...photo!.recipe!.removals, st] });
      // Show the whole result: on a split view the erased spot often sits on the "before" half.
      setBrushView("result");
      setViewMode("after");
    },
  } : null;

  const tabs: { id: Tab; label: string }[] = [
    { id: "fix", label: t.studio.tabs.fix },
    { id: "adjust", label: t.studio.tabs.adjust },
    { id: "remove", label: t.studio.tabs.remove },
    // The AI tab appears once those tools are switched on.
    ...(AI_LIVE ? [{ id: "ai" as const, label: t.studio.tabs.ai }] : []),
    { id: "export", label: t.studio.tabs.export },
  ];
  const panelRef = useRef<HTMLDivElement>(null);
  const goSave = () => {
    setTab("export");
    // On phones the panel is below the photo: bring it into view.
    requestAnimationFrame(() => panelRef.current?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }));
  };
  // A new property starts in a fresh project (full load, so nothing from this one carries over).
  const newProject = () => window.location.assign(asset(`/${lang}/studio/?new=1`));

  const empty = s.loaded && s.photos.length === 0;

  return (
    // Phones held upright: the app fills the screen and only the panel scrolls, so the photo stays
    // in view while it is being adjusted. Short screens (a phone on its side) scroll as a page.
    <div className="flex min-h-dvh flex-col tall:h-dvh tall:overflow-hidden land:h-dvh land:overflow-hidden lg:h-dvh lg:overflow-hidden">
      {/* App bar */}
      <header className="flex h-14 flex-none items-center gap-3 border-b border-line-2 bg-paper px-3 sm:px-4">
        <Link prefetch={false} href={`/${lang}`} aria-label={t.brand.name} className="flex-none">
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
          <div className="segmented segmented-sm flex-none" role="group" aria-label={t.studio.listing}>
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
        <nav className="ms-auto flex items-center gap-0.5">
          {!empty && s.loaded && (
            <button type="button" onClick={newProject} className="flex min-h-[40px] items-center gap-1.5 rounded-md px-2 text-[14px] text-ink-2 hover:text-ink sm:px-2.5" title={t.studio.newProject}>
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <span className="sr-only sm:not-sr-only">{t.studio.newProject}</span>
            </button>
          )}
          <Link prefetch={false} href={`/${lang}/projects`} className="hidden min-h-[40px] items-center rounded-md px-2.5 text-[14px] text-ink-2 hover:text-ink sm:flex">
            {t.nav.projects}
          </Link>
          <LanguageLink lang={lang} t={t} className="hidden rounded-md px-2.5 py-2 text-[14px] text-ink-2 hover:text-ink md:inline-block" />
          {AI_LIVE && (
            <Link prefetch={false} href={`/${lang}/account`} className="hidden rounded-md px-2.5 py-2 text-[14px] text-ink-2 hover:text-ink sm:inline-block">
              {t.nav.account}
            </Link>
          )}
          <Link prefetch={false} href={`/${lang}/projects`} aria-label={t.nav.projects} className="flex h-10 w-10 items-center justify-center rounded-md text-ink-2 hover:text-ink sm:hidden">
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
              <rect x="3" y="3" width="6" height="6" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <rect x="11" y="3" width="6" height="6" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <rect x="3" y="11" width="6" height="6" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <rect x="11" y="11" width="6" height="6" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
            </svg>
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
            <p className="mx-auto mt-3 max-w-md text-[16px] text-white/70">{coarse ? t.studio.emptyLeadTouch : t.studio.emptyLead}</p>
            <div className="mt-8">
              <DropZone
                variant="stage"
                labels={{ drop: t.landing.drop, dropTouch: t.landing.dropTouch, or: t.landing.dropOr, choose: t.landing.choose, camera: t.landing.camera, hint: t.landing.dropHint }}
                onFiles={onAdd}
              />
            </div>
            <button
              type="button"
              className="mt-4 text-[14.5px] font-semibold text-white/85 underline underline-offset-4 hover:no-underline"
              onClick={async () => {
                track("upload_start", { count: "1", source: "sample-studio" });
                await s.addFiles([await sampleFile(asset, t.landing.sampleBadge)]);
              }}
            >
              {t.landing.trySample}
            </button>
            <p className="mt-6 text-[13px] text-white/50">{t.studio.storageWarning}</p>
          </div>
        </main>
      ) : (
        <main
          aria-labelledby="studio-title"
          id="main"
          className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] grid-rows-[auto_auto_minmax(0,1fr)] land:grid-cols-[minmax(0,1.1fr)_minmax(330px,1fr)] land:grid-rows-[minmax(0,1fr)_auto] lg:grid-cols-[120px_minmax(0,1fr)_392px] lg:grid-rows-[minmax(0,1fr)]"
        >
          <h1 id="studio-title" className="sr-only">
            {s.project?.name ?? t.studio.title}
          </h1>
          {/* Filmstrip: a column on desktop, a row on phones (below the stage). */}
          <div className="on-stage order-2 min-h-0 min-w-0 border-stage-line bg-stage land:col-start-1 land:row-start-2 lg:order-none lg:border-e">
            <Filmstrip s={s} t={t} onAdd={onAdd} onRemove={onRemove} />
          </div>

          {/* Phones: sized for a landscape room photo plus the toolbar, not a tall black box. */}
          <div className="order-1 h-[clamp(190px,38svh,calc(75vw+52px))] min-w-0 land:col-start-1 land:row-start-1 land:h-full land:min-h-0 lg:order-none lg:h-full lg:min-h-0">
            <Stage s={s} t={t} lang={lang} brush={brush} mode={viewMode} setMode={setViewMode} />
          </div>

          <aside
            ref={panelRef}
            className="order-3 flex min-h-0 min-w-0 scroll-mt-14 flex-col border-line-2 bg-surface land:col-start-2 land:row-span-2 land:row-start-1 land:border-s lg:order-none lg:border-s"
            aria-label={t.studio.title}
          >
            <div
              role="tablist"
              aria-label={t.studio.title}
              className="sticky top-0 z-10 flex flex-none gap-1 overflow-x-auto border-b border-line-2 bg-surface px-2 pt-2"
              onKeyDown={(e) => {
                // Arrow keys move between tabs in reading direction; Home/End jump to the ends.
                const ids = tabs.map((x) => x.id);
                const k = ids.indexOf(tab);
                const next = lang === "he" ? "ArrowLeft" : "ArrowRight";
                const prev = lang === "he" ? "ArrowRight" : "ArrowLeft";
                let j = k;
                if (e.key === next) j = (k + 1) % ids.length;
                else if (e.key === prev) j = (k - 1 + ids.length) % ids.length;
                else if (e.key === "Home") j = 0;
                else if (e.key === "End") j = ids.length - 1;
                else return;
                e.preventDefault();
                if (tab === "remove" && ids[j] !== "remove") setViewMode("split");
                setTab(ids[j]);
                if (ids[j] === "remove") setBrushView("paint");
                document.getElementById(`tab-${ids[j]}`)?.focus();
              }}
            >
              {tabs.map((x) => (
                <button
                  key={x.id}
                  id={`tab-${x.id}`}
                  role="tab"
                  type="button"
                  aria-selected={tab === x.id}
                  aria-controls={`panel-${x.id}`}
                  tabIndex={tab === x.id ? 0 : -1}
                  aria-label={x.label}
                  onClick={() => {
                    if (tab === "remove" && x.id !== "remove") setViewMode("split");
                    setTab(x.id);
                    if (x.id === "remove") setBrushView("paint");
                  }}
                  className={`relative min-h-[44px] flex-none px-2.5 text-[14px] font-semibold transition-colors max-[359px]:px-2 max-[359px]:text-[13px] sm:px-3 sm:text-[14.5px] ${tab === x.id ? "text-ink" : "text-ink-3 hover:text-ink-2"}`}
                >
                  {x.id === "export" ? (
                    <>
                      <span className="sm:hidden">{t.studio.tabs.exportShort}</span>
                      <span className="hidden sm:inline">{x.label}</span>
                    </>
                  ) : (
                    x.label
                  )}
                  {tab === x.id && <span className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-prussian" />}
                </button>
              ))}
            </div>
            <div key={tab} id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
              {!s.loaded || !photo ? (
                <div className="grid gap-3">
                  <div className="skeleton h-5 w-1/3 rounded" />
                  <div className="skeleton h-16 rounded-[10px]" />
                  <div className="skeleton h-16 rounded-[10px]" />
                </div>
              ) : tab === "export" ? (
                <ExportPanel key={s.project?.listing} s={s} t={t} lang={lang} />
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
                <FixPanel s={s} t={t} lang={lang} photo={photo} onSave={goSave} />
              ) : tab === "adjust" ? (
                <AdjustPanel s={s} t={t} lang={lang} photo={photo} />
              ) : tab === "remove" ? (
                <RemovePanel s={s} t={t} lang={lang} photo={photo} radius={radius} setRadius={setRadius} view={brushView} setView={setBrushView} />
              ) : (
                <AiPanel s={s} t={t} lang={lang} photo={photo} />
              )}
            </div>
            {/* Phones: the way out is always one tap away. */}
            {tab !== "export" && s.counts.ready > 0 && (
              <div className="sticky bottom-0 z-10 flex-none border-t border-line-2 bg-surface px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 lg:hidden">
                <button type="button" className="btn btn-primary w-full" onClick={goSave}>
                  {s.counts.ready > 1 ? fmt(t.studio.saveAll, { n: s.counts.ready }, lang) : t.studio.saveNow}
                </button>
              </div>
            )}
          </aside>
        </main>
      )}
    </div>
  );
}
