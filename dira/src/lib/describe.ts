// Turns engine output (findings, changes) into plain-language lines in the user's language.

import { fmt, type Dict, type Locale } from "@/i18n";
import type { Finding } from "@/lib/engine/analyze";
import type { Change } from "@/lib/engine/types";

const signed = (v: number) => (v > 0 ? `+${v}` : `${v}`);

export function describeChange(c: Change, t: Dict, lang: Locale): string {
  const T = t.changes;
  switch (c.kind) {
    case "exposure":
      return fmt(T.exposure, { v: signed(c.value ?? 0) }, lang);
    case "whiteBalance":
      return fmt(T.whiteBalance, { from: c.from ?? 0, to: c.to ?? 0 }, lang);
    case "toneMap":
      return fmt(T.toneMap, { v: c.value ?? 0 }, lang);
    case "contrast":
      return fmt(T.contrast, { v: signed(c.value ?? 0) }, lang);
    case "color":
      return fmt(T.color, { v: signed(c.value ?? 0) }, lang);
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

export function describeFinding(f: Finding, t: Dict, lang: Locale): { title: string; detail: string } {
  const F = t.findings;
  switch (f.id) {
    case "dark":
      return { title: F.dark.t, detail: fmt(F.dark.d, { v: Math.round(f.value) }, lang) };
    case "bright":
      return { title: F.bright.t, detail: fmt(F.bright.d, { v: Math.round(f.value) }, lang) };
    case "cast": {
      if (f.kelvin === null) return { title: F.castUnknown.t, detail: F.castUnknown.d };
      const which = f.warm ? F.castWarm : F.castCool;
      return { title: which.t, detail: fmt(which.d, { k: f.kelvin.toLocaleString("en-US") }, lang) };
    }
    case "lean":
      return { title: F.lean.t, detail: fmt(F.lean.d, { v: f.degrees }, lang) };
    case "noise":
      return { title: F.noise.t, detail: fmt(F.noise.d, { v: f.value }, lang) };
    case "blown":
      return { title: F.blown.t, detail: fmt(F.blown.d, { v: Math.round(f.share * 1000) / 10 }, lang) };
    case "flat":
      return { title: F.flat.t, detail: F.flat.d };
    case "lowres":
      return { title: F.lowres.t, detail: fmt(F.lowres.d, { v: f.megapixels }, lang) };
  }
}
