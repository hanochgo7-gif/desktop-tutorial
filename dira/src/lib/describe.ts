// Turns engine output (findings, changes) into lines in the user's language: plain words for the
// interface, and the exact numbers for the "numbers" view and the change log in downloads.

import { fmt, type Dict, type Locale } from "@/i18n";
import type { Finding } from "@/lib/engine/analyze";
import type { Change } from "@/lib/engine/types";

/** Signed numbers keep their sign on the left inside Hebrew text (Unicode LTR isolate). */
const signed = (v: number, lang: Locale) => {
  const s = v > 0 ? `+${v}` : `${v}`;
  return lang === "he" ? `⁦${s}⁩` : s;
};

export function describeChange(c: Change, t: Dict, lang: Locale): string {
  const T = t.changes;
  switch (c.kind) {
    case "exposure":
      return fmt(T.exposure, { v: signed(c.value ?? 0, lang) }, lang);
    case "whiteBalance":
      return fmt(T.whiteBalance, { from: c.from ?? 0, to: c.to ?? 0 }, lang);
    case "toneMap":
      return fmt(T.toneMap, { v: c.value ?? 0 }, lang);
    case "contrast":
      return fmt(T.contrast, { v: signed(c.value ?? 0, lang) }, lang);
    case "color":
      return fmt(T.color, { v: signed(c.value ?? 0, lang) }, lang);
    case "verticals":
      return fmt(T.verticals, { from: c.from ?? 0, to: c.to ?? 0 }, lang);
    case "crop":
      return fmt(T.crop, { v: c.value ?? 0 }, lang);
    case "denoise":
      return fmt(T.denoise, { v: c.value ?? 0 }, lang);
    case "sharpen":
      return T.sharpen;
    case "removal":
      return fmt(T.removal, { count: c.count ?? 0 }, lang);
    case "upscale":
      return fmt(T.upscale, { v: c.value ?? 2 }, lang);
  }
}

/** The same change in plain words, for people who don't edit photos. */
export function describeChangePlain(c: Change, t: Dict, lang: Locale): string {
  const D = t.done;
  switch (c.kind) {
    case "exposure":
      return (c.value ?? 0) >= 0 ? D.exposureUp : D.exposureDown;
    case "whiteBalance":
      return (c.to ?? 0) > (c.from ?? 0) ? D.whiteBalance : D.whiteBalanceCool;
    case "toneMap":
      return D.toneMap;
    case "contrast":
      return D.contrast;
    case "color":
      return D.color;
    case "verticals":
      return D.verticals;
    case "crop":
      return D.crop;
    case "denoise":
      return D.denoise;
    case "sharpen":
      return D.sharpen;
    case "removal":
      return fmt(D.removal, { count: c.count ?? 0 }, lang);
    case "upscale":
      return fmt(D.upscale, { v: c.value ?? 2 }, lang);
  }
}

export function describeFinding(f: Finding, t: Dict, lang: Locale): { title: string; detail: string; numbers: string } {
  const F = t.findings;
  const pick = (x: { t: string; d: string; n: string }, values: Record<string, string | number> = {}) => ({
    title: x.t,
    detail: x.d,
    numbers: x.n ? fmt(x.n, values, lang) : "",
  });
  switch (f.id) {
    case "dark":
      return pick(F.dark, { v: Math.round(f.value) });
    case "bright":
      return pick(F.bright, { v: Math.round(f.value) });
    case "cast": {
      if (f.kelvin === null) return pick(F.castUnknown);
      return pick(f.warm ? F.castWarm : F.castCool, { k: f.kelvin.toLocaleString("en-US") });
    }
    case "lean":
      return pick(F.lean, { v: f.degrees });
    case "noise":
      return pick(F.noise, { v: f.value });
    case "blown":
      return pick(F.blown, { v: Math.round(f.share * 1000) / 10 });
    case "flat":
      return pick(F.flat);
    case "lowres":
      return pick(F.lowres, { v: f.megapixels });
  }
}
