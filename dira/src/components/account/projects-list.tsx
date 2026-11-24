"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ToastProvider, useToast } from "@/components/toast";
import { fmt, type Dict, type Locale } from "@/i18n";
import { createProject, deleteProject, getPhotos, listProjects, storageEstimate, type Project } from "@/lib/studio/db";

type Row = Project & { cover?: string; count: number };

function bytes(n: number, lang: Locale) {
  const units = lang === "he" ? ["ב׳", "KB", "MB", "GB"] : ["B", "KB", "MB", "GB"];
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
}

function Inner({ lang, t }: { lang: Locale; t: Dict }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [usage, setUsage] = useState<{ used: number; quota: number } | null>(null);
  const router = useRouter();
  const toast = useToast();

  const fetchRows = async () => {
    const list = await listProjects();
    const out: Row[] = [];
    for (const p of list) {
      const photos = await getPhotos(p.id);
      const first = p.photoIds.map((id) => photos.find((x) => x.id === id)).find((x) => x?.thumb);
      out.push({ ...p, count: photos.length, cover: first?.thumb ? URL.createObjectURL(first.thumb) : undefined });
    }
    return { rows: out, usage: await storageEstimate() };
  };
  const load = () =>
    fetchRows().then(
      (r) => {
        setRows(r.rows);
        setUsage(r.usage);
      },
      () => setRows([]),
    );

  useEffect(() => {
    let alive = true;
    fetchRows().then(
      (r) => {
        if (!alive) return;
        setRows(r.rows);
        setUsage(r.usage);
      },
      () => alive && setRows([]),
    );
    return () => {
      alive = false;
    };
  }, []);

  const dateFmt = new Intl.DateTimeFormat(lang === "he" ? "he-IL" : "en-GB", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 sm:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-[40px]">{t.projects.title}</h1>
          <p className="mt-2 text-[15px] text-ink-2">{t.projects.lead}</p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={async () => {
            const p = await createProject(t.studio.untitled);
            router.push(`/${lang}/studio?p=${p.id}`);
          }}
        >
          {t.projects.new}
        </button>
      </div>

      {rows === null ? (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-56 rounded-[var(--radius-panel)]" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-10 rounded-[var(--radius-panel)] border border-dashed border-line bg-surface px-6 py-16 text-center">
          <p className="text-[19px] font-semibold">{t.projects.empty}</p>
          <p className="mt-2 text-[15px] text-ink-2">{t.projects.emptyLead}</p>
          <Link href={`/${lang}/studio`} className="btn btn-primary mt-6">
            {t.nav.open}
          </Link>
        </div>
      ) : (
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((p) => (
            <li key={p.id} className="panel overflow-hidden">
              <Link href={`/${lang}/studio?p=${p.id}`} className="block aspect-[4/3] bg-stage">
                {p.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.cover} alt="" className="h-full w-full object-cover" />
                ) : null}
              </Link>
              <div className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <Link href={`/${lang}/studio?p=${p.id}`} className="block truncate text-[16px] font-semibold hover:underline">
                    {p.name}
                  </Link>
                  <p className="tnum mt-1 text-[13px] text-ink-3">
                    {p.listing === "sale" ? t.studio.sale : t.studio.rent} · {fmt(t.projects.photos, { n: p.count }, lang)} · {fmt(t.projects.exports, { n: p.exports ?? 0 }, lang)}
                  </p>
                  <p className="mt-0.5 text-[13px] text-ink-3">{fmt(t.projects.updated, { d: dateFmt.format(p.updatedAt) }, lang)}</p>
                </div>
                <button
                  type="button"
                  className="btn btn-quiet btn-sm flex-none"
                  onClick={async () => {
                    if (!window.confirm(t.projects.deleteConfirm)) return;
                    await deleteProject(p.id);
                    toast.show({ text: t.projects.deleted });
                    load();
                  }}
                >
                  {t.projects.delete}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {usage && (
        <p className="tnum mt-8 text-[13px] text-ink-3">{fmt(t.projects.storage, { used: bytes(usage.used, lang), quota: bytes(usage.quota, lang) }, lang)}</p>
      )}
    </div>
  );
}

export function ProjectsList(props: { lang: Locale; t: Dict }) {
  return (
    <ToastProvider>
      <Inner {...props} />
    </ToastProvider>
  );
}
