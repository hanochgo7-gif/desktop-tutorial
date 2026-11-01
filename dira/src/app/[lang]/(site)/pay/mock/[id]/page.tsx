import { notFound } from "next/navigation";
import { MockPay } from "@/components/account/mock-pay";
import { getDict, isLocale } from "@/i18n";

export const metadata = { robots: { index: false } };

export default async function MockPayPage({ params }: PageProps<"/[lang]/pay/mock/[id]">) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();
  return <MockPay id={id} lang={lang} t={getDict(lang)} />;
}
