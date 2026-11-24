// Self-hosted web fonts (Frank Ruhl Libre, IBM Plex Sans Hebrew; SIL Open Font License), so each
// language preloads only the files its first screen needs: Hebrew pages the Hebrew subset, English
// pages the Latin one. Generated from Google Fonts' CSS; the files are in public/fonts. Frank Ruhl
// Libre is a variable font: one file per subset covers weights 500–700.

export type FontFace = { family: string; weight: number | string; subset: "hebrew" | "latin" | "latin-ext"; file: string; range: string };

export const FONT_FACES: FontFace[] = [
  {
    "family": "Frank Ruhl Libre",
    "weight": "500 700",
    "subset": "hebrew",
    "file": "/fonts/frank-500-hebrew.woff2",
    "range": "U+0307-0308, U+0590-05FF, U+200C-2010, U+20AA, U+25CC, U+FB1D-FB4F"
  },
  {
    "family": "Frank Ruhl Libre",
    "weight": "500 700",
    "subset": "latin-ext",
    "file": "/fonts/frank-500-latin-ext.woff2",
    "range": "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF"
  },
  {
    "family": "Frank Ruhl Libre",
    "weight": "500 700",
    "subset": "latin",
    "file": "/fonts/frank-500-latin.woff2",
    "range": "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD"
  },
  {
    "family": "IBM Plex Sans Hebrew",
    "weight": 400,
    "subset": "hebrew",
    "file": "/fonts/plex-400-hebrew.woff2",
    "range": "U+0307-0308, U+0590-05FF, U+200C-2010, U+20AA, U+25CC, U+FB1D-FB4F"
  },
  {
    "family": "IBM Plex Sans Hebrew",
    "weight": 400,
    "subset": "latin-ext",
    "file": "/fonts/plex-400-latin-ext.woff2",
    "range": "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF"
  },
  {
    "family": "IBM Plex Sans Hebrew",
    "weight": 400,
    "subset": "latin",
    "file": "/fonts/plex-400-latin.woff2",
    "range": "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD"
  },
  {
    "family": "IBM Plex Sans Hebrew",
    "weight": 600,
    "subset": "hebrew",
    "file": "/fonts/plex-600-hebrew.woff2",
    "range": "U+0307-0308, U+0590-05FF, U+200C-2010, U+20AA, U+25CC, U+FB1D-FB4F"
  },
  {
    "family": "IBM Plex Sans Hebrew",
    "weight": 600,
    "subset": "latin-ext",
    "file": "/fonts/plex-600-latin-ext.woff2",
    "range": "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF"
  },
  {
    "family": "IBM Plex Sans Hebrew",
    "weight": 600,
    "subset": "latin",
    "file": "/fonts/plex-600-latin.woff2",
    "range": "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD"
  },
  {
    "family": "IBM Plex Sans Hebrew",
    "weight": 700,
    "subset": "hebrew",
    "file": "/fonts/plex-700-hebrew.woff2",
    "range": "U+0307-0308, U+0590-05FF, U+200C-2010, U+20AA, U+25CC, U+FB1D-FB4F"
  },
  {
    "family": "IBM Plex Sans Hebrew",
    "weight": 700,
    "subset": "latin-ext",
    "file": "/fonts/plex-700-latin-ext.woff2",
    "range": "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF"
  },
  {
    "family": "IBM Plex Sans Hebrew",
    "weight": 700,
    "subset": "latin",
    "file": "/fonts/plex-700-latin.woff2",
    "range": "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD"
  }
];

/** The faces the first screen paints with: display 500, text 400 and 600. */
export const FIRST_PAINT = [
  { family: "Frank Ruhl Libre", weight: 500 },
  { family: "IBM Plex Sans Hebrew", weight: 400 },
  { family: "IBM Plex Sans Hebrew", weight: 600 },
];

/** Metric-matched fallbacks (from next/font), so text barely moves when the real font arrives. */
export const FALLBACK_FACES = `@font-face{font-family:"Frank Ruhl Libre Fallback";src:local("Times New Roman");ascent-override:88.56%;descent-override:30.91%;line-gap-override:0%;size-adjust:108.06%}
@font-face{font-family:"IBM Plex Sans Hebrew Fallback";src:local("Arial");ascent-override:101.32%;descent-override:27.18%;line-gap-override:0%;size-adjust:101.17%}`;

/** @font-face rules with the site's base path, plus the fallbacks and the two family variables. */
export function fontCss(url: (path: string) => string) {
  const faces = FONT_FACES.map(
    (f) => `@font-face{font-family:"${f.family}";font-style:normal;font-weight:${f.weight};font-display:swap;src:url(${url(f.file)}) format("woff2");unicode-range:${f.range}}`,
  ).join("\n");
  return `${faces}\n${FALLBACK_FACES}\n:root{--font-frank:"Frank Ruhl Libre","Frank Ruhl Libre Fallback";--font-plex:"IBM Plex Sans Hebrew","IBM Plex Sans Hebrew Fallback"}`;
}

/** Files to preload for a language's first screen. (Preloading the Latin face on Hebrew pages too
 *  cut a 0.03 layout shift to 0.003 but pushed the hero past 2 s on a slow phone: not worth it.) */
export function firstPaintFiles(lang: "he" | "en") {
  const subset = lang === "he" ? "hebrew" : "latin";
  const extra: string[] = [];
  return [...FIRST_PAINT.map((p) => FONT_FACES.find((f) => f.family === p.family && f.subset === subset && String(f.weight).split(" ").includes(String(p.weight)))!.file).filter(
    (v, i, a) => a.indexOf(v) === i,
  ), ...extra];
}
