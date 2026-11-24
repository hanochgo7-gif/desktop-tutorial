import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, LOCALES } from "@/i18n";

// Pages live under /he or /en. A visitor arriving without a language is sent to their saved
// choice, else to English when their browser prefers it, else to Hebrew.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasLocale = LOCALES.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (hasLocale) return NextResponse.next();

  const saved = request.cookies.get("lang")?.value;
  let locale: string = DEFAULT_LOCALE;
  if (saved && (LOCALES as readonly string[]).includes(saved)) locale = saved;
  else {
    const accept = request.headers.get("accept-language") ?? "";
    const first = accept.split(",")[0]?.trim().toLowerCase() ?? "";
    if (first.startsWith("en")) locale = "en";
  }
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except API routes, Next internals and files with an extension.
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
