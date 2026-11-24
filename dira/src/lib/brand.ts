// The Dira Ready mark, from the logo designed in Canva (design DAHZvssYAkE): a house with two
// windows, one lit and one dark — the same room before and after. Geometry measured from the Canva
// export so the vector matches it exactly. Shared by the header logo and the generated app icons.

export const BRAND = {
  blue: "#093484",
  yellow: "#F9C23A",
};

/** House outline (outer and inner contour, even-odd fill) in a 715 × 792 box. */
export const HOUSE_PATH = "M358 0 715 298V792H0V298Z M358 74 658 325V735H57V325Z";
export const WINDOW_LIT = { x: 157, y: 412, w: 174, h: 176 };
export const WINDOW_DARK = { x: 386, y: 412, w: 175, h: 176 };
export const MARK_BOX = { w: 715, h: 792 };

/** Standalone SVG: the mark alone, or centred on a white rounded tile (favicons, app icons). */
export function markSvg(opts: { tile?: boolean; size?: number } = {}): string {
  const { tile = false, size = 512 } = opts;
  const art = `<path d="${HOUSE_PATH}" fill="${BRAND.blue}" fill-rule="evenodd"/><rect x="${WINDOW_LIT.x}" y="${WINDOW_LIT.y}" width="${WINDOW_LIT.w}" height="${WINDOW_LIT.h}" fill="${BRAND.yellow}"/><rect x="${WINDOW_DARK.x}" y="${WINDOW_DARK.y}" width="${WINDOW_DARK.w}" height="${WINDOW_DARK.h}" fill="${BRAND.blue}"/>`;
  if (!tile) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MARK_BOX.w} ${MARK_BOX.h}" width="${size}" height="${Math.round((size * MARK_BOX.h) / MARK_BOX.w)}">${art}</svg>`;
  }
  // 1024 tile, mark at ~62% height, optically centred (the roof carries visual weight).
  const scale = 0.8;
  const tx = (1024 - MARK_BOX.w * scale) / 2;
  const ty = (1024 - MARK_BOX.h * scale) / 2 - 8;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="${size}" height="${size}"><rect width="1024" height="1024" rx="224" fill="#ffffff"/><g transform="translate(${tx} ${ty}) scale(${scale})">${art}</g></svg>`;
}
