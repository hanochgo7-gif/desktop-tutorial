"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Dict, Locale } from "@/i18n";
import { api, useAccount } from "@/lib/client/account";
import type { ProductId } from "@/lib/plans";
import { whatsappLink } from "@/lib/site";

export function BuyButton({ product, label, featured, lang, t }: { product: ProductId; label: string; featured?: boolean; lang: Locale; t: Dict }) {
  const { config, me, loading } = useAccount();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const cls = `btn w-full ${featured ? "btn-primary" : "btn-quiet"}`;

  if (loading || !config) return <span className={`${cls} skeleton`} aria-hidden="true" />;
  // No online payments here yet: say so and offer the manual route that works today.
  if (!config.payments) {
    return (
      <a className={cls} href={whatsappLink(`${label} — ${product}`)} target="_blank" rel="noopener noreferrer">
        {t.pricing.whatsapp}
      </a>
    );
  }
  if (!me) {
    return (
      <button type="button" className={cls} onClick={() => router.push(`/${lang}/account?next=pricing&buy=${product}`)}>
        {label}
      </button>
    );
  }
  return (
    <div>
      <button
        type="button"
        className={cls}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(false);
          const r = await api<{ url?: string }>("/api/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ product, lang }) });
          if (r.ok && r.data.url) window.location.assign(r.data.url);
          else {
            setError(true);
            setBusy(false);
          }
        }}
      >
        {busy ? t.common.loading : label}
      </button>
      {error && <p role="alert" className="mt-2 text-[13px] text-err">{t.account.error}</p>}
    </div>
  );
}

export function PaymentsNotice({ t }: { t: Dict }) {
  const { config } = useAccount();
  if (!config || config.payments) return null;
  return <p className="mt-6 rounded-[10px] bg-warn-tint px-4 py-3 text-[14.5px] text-warn">{t.pricing.paymentsOff}</p>;
}
