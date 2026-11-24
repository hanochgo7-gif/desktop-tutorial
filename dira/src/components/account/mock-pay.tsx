"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Dict, Locale } from "@/i18n";
import { api } from "@/lib/client/account";

// Development-only checkout page. The API refuses it unless the mock payment provider is active.
export function MockPay({ id, lang, t }: { id: string; lang: Locale; t: Dict }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  return (
    <div className="mx-auto max-w-[480px] px-4 py-16 sm:px-6">
      <h1 className="display text-[36px]">{t.checkout.mockTitle}</h1>
      <p className="mt-3 rounded-md bg-warn-tint px-3 py-2 text-[14px] text-warn">{t.checkout.mockLead}</p>
      <button
        type="button"
        className="btn btn-primary mt-8 w-full"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const r = await api<{ ok?: boolean }>("/api/payments/mock", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
          if (r.ok) router.replace(`/${lang}/account?paid=${id}`);
          else {
            setError(true);
            setBusy(false);
          }
        }}
      >
        {t.checkout.mockPay}
      </button>
      {error && <p role="alert" className="mt-3 text-[14px] text-err">{t.account.error}</p>}
    </div>
  );
}
