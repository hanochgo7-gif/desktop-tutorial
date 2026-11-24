"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { fmt, type Dict, type Locale } from "@/i18n";
import { api, sendCode, signOut, useAccount, verifyCode } from "@/lib/client/account";

export function AccountView({ lang, t }: { lang: Locale; t: Dict }) {
  const { config, me, loading, refresh } = useAccount();
  const search = useSearchParams();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const paid = search.get("paid");
  const next = search.get("next");

  // After signing in, continue where the person came from.
  useEffect(() => {
    if (!me || !next) return;
    if (next === "studio") router.replace(`/${lang}/studio`);
    if (next === "pricing") router.replace(`/${lang}/pricing`);
  }, [me, next, router, lang]);

  // Returning from the payment page: the credits arrive with the provider's callback, so check a few times.
  useEffect(() => {
    if (!paid) return;
    let n = 0;
    const id = setInterval(() => {
      refresh();
      if (++n > 10) clearInterval(id);
    }, 3000);
    return () => clearInterval(id);
  }, [paid, refresh]);

  const dt = new Intl.DateTimeFormat(lang === "he" ? "he-IL" : "en-GB", { dateStyle: "medium", timeStyle: "short" });

  if (loading || !config) {
    return (
      <div className="mx-auto max-w-[760px] px-4 py-16 sm:px-6">
        <div className="skeleton h-10 w-48 rounded" />
        <div className="skeleton mt-6 h-40 rounded-[var(--radius-panel)]" />
      </div>
    );
  }

  if (!config.accounts) {
    return (
      <div className="mx-auto max-w-[760px] px-4 py-16 sm:px-6">
        <h1 className="display text-[40px]">{t.account.title}</h1>
        <p className="mt-6 rounded-[10px] bg-line-2 p-4 text-[15px] text-ink-2">{t.account.off}</p>
        <Link href={`/${lang}/studio`} className="btn btn-primary mt-6">
          {t.nav.open}
        </Link>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="mx-auto max-w-[480px] px-4 py-16 sm:px-6">
        <h1 className="display text-[40px]">{t.account.signInTitle}</h1>
        <p className="mt-3 text-[15.5px] text-ink-2">{t.account.signInLead}</p>
        {config.accounts === "local" && <p className="mt-4 rounded-md bg-warn-tint px-3 py-2 text-[13.5px] text-warn">{t.account.devNotice}</p>}
        <form
          className="mt-8 grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            if (step === "email") {
              const r = await sendCode(email.trim());
              if (r === "sent") setStep("code");
              else if (r === "error") setError(t.account.error);
            } else {
              const ok = await verifyCode(email.trim(), code.trim());
              if (!ok) setError(t.account.badCode);
            }
            setBusy(false);
            refresh();
          }}
        >
          <div>
            <label className="label" htmlFor="email">
              {t.account.email}
            </label>
            <input id="email" type="email" className="field ltr" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={step === "code"} />
          </div>
          {step === "code" && (
            <div>
              <p className="mb-3 text-[14px] text-ink-2" role="status">
                {fmt(t.account.codeSent, { email }, lang)}
              </p>
              <label className="label" htmlFor="code">
                {t.account.code}
              </label>
              <input id="code" inputMode="numeric" autoComplete="one-time-code" className="field ltr tnum tracking-[0.3em]" maxLength={8} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
            </div>
          )}
          {error && (
            <p role="alert" className="text-[14px] text-err">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? t.common.loading : step === "email" ? t.account.sendCode : t.account.verify}
          </button>
        </form>
      </div>
    );
  }

  const reason = (r: string) => t.account.reasons[r as keyof typeof t.account.reasons] ?? r;
  return (
    <div className="mx-auto max-w-[900px] px-4 py-14 sm:px-6">
      {config.testMode && <p className="mb-6 rounded-md bg-warn-tint px-3 py-2 text-[13.5px] text-warn">{t.account.devNotice}</p>}
      {paid && (
        <p role="status" className="mb-6 rounded-[10px] bg-ok-tint px-4 py-3 text-[15px] text-ok">
          {t.checkout.success}
        </p>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-[40px]">{t.account.title}</h1>
          <p className="ltr mt-1 text-[15px] text-ink-2">{me.email}</p>
        </div>
        <button
          type="button"
          className="btn btn-quiet btn-sm"
          onClick={async () => {
            await signOut();
            refresh();
          }}
        >
          {t.account.signOut}
        </button>
      </div>

      <div className="mt-8 grid gap-px overflow-hidden rounded-[var(--radius-panel)] border border-line-2 bg-line-2 sm:grid-cols-2">
        <div className="bg-surface p-6">
          <p className="text-[13px] font-semibold text-ink-3">{t.account.balance}</p>
          <p className="display tnum mt-2 text-[44px]">{me.credits}</p>
          <Link href={`/${lang}/pricing`} className="mt-3 inline-block text-[14.5px] font-semibold text-prussian underline underline-offset-4">
            {t.ai.buy}
          </Link>
        </div>
        <div className="bg-surface p-6">
          <p className="text-[13px] font-semibold text-ink-3">{t.account.plan}</p>
          <p className="mt-2 text-[20px] font-semibold">{me.proUntil ? fmt(t.account.planPro, { d: dt.format(new Date(me.proUntil)) }, lang) : t.account.planFree}</p>
        </div>
      </div>

      <section className="mt-12">
        <h2 className="text-[19px] font-semibold">{t.account.history}</h2>
        {me.ledger.length === 0 ? (
          <p className="mt-3 text-[14.5px] text-ink-3">{t.account.none}</p>
        ) : (
          <ul className="mt-3 divide-y divide-line-2 rounded-[var(--radius-panel)] border border-line-2 bg-surface">
            {me.ledger.map((l, i) => (
              <li key={i} className="tnum flex items-center justify-between gap-4 px-4 py-3 text-[14.5px]">
                <span>{reason(l.reason)}</span>
                <span className="flex items-center gap-4">
                  <span className={l.delta > 0 ? "text-ok" : "text-ink-2"}>{l.delta > 0 ? `+${l.delta}` : l.delta}</span>
                  <span className="w-36 text-end text-[13px] text-ink-3">{dt.format(new Date(l.created_at))}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-[19px] font-semibold">{t.account.purchases}</h2>
        {me.purchases.length === 0 ? (
          <p className="mt-3 text-[14.5px] text-ink-3">{t.account.none}</p>
        ) : (
          <ul className="mt-3 divide-y divide-line-2 rounded-[var(--radius-panel)] border border-line-2 bg-surface">
            {me.purchases.map((p) => (
              <li key={p.id} className="tnum flex items-center justify-between gap-4 px-4 py-3 text-[14.5px]">
                <span>
                  {p.product} · {p.credits} · ₪{p.amount}
                </span>
                <span className="flex items-center gap-4 text-[13px] text-ink-3">
                  <span>{p.status}</span>
                  <span className="w-36 text-end">{dt.format(new Date(p.created_at))}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-[19px] font-semibold">{t.account.jobs}</h2>
        {me.jobs.length === 0 ? (
          <p className="mt-3 text-[14.5px] text-ink-3">{t.account.none}</p>
        ) : (
          <ul className="mt-3 divide-y divide-line-2 rounded-[var(--radius-panel)] border border-line-2 bg-surface">
            {me.jobs.map((j) => (
              <li key={j.id} className="flex items-center justify-between gap-4 px-4 py-3 text-[14.5px]">
                <span>
                  {t.ai.tools[j.tool as keyof typeof t.ai.tools]?.t ?? j.tool}
                  {j.test && <span className="ms-2 rounded bg-warn-tint px-1.5 py-0.5 text-[11.5px] font-semibold text-warn">TEST</span>}
                </span>
                <span className="tnum flex items-center gap-4 text-[13px] text-ink-3">
                  <span>{j.status}</span>
                  <span className="w-36 text-end">{dt.format(new Date(j.created_at))}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-16 border-t border-line-2 pt-6">
        <button
          type="button"
          className="text-[14.5px] font-semibold text-err underline underline-offset-4"
          onClick={async () => {
            if (!window.confirm(t.account.deleteConfirm)) return;
            const r = await api("/api/me", { method: "DELETE" });
            if (r.ok) {
              await signOut();
              router.replace(`/${lang}`);
            } else setError(t.account.error);
          }}
        >
          {t.account.deleteAccount}
        </button>
        {error && <p className="mt-2 text-[14px] text-err">{error}</p>}
      </section>
    </div>
  );
}
