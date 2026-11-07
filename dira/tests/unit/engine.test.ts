import { describe, expect, it } from "vitest";
import { analyze, findings } from "@/lib/engine/analyze";
import { autoRecipe, render } from "@/lib/engine/pipeline";
import { inpaint } from "@/lib/engine/inpaint";
import { correctionHomography, detectVerticalLines, fitVerticals, invert3 } from "@/lib/engine/verticals";
import { lumaPlane } from "@/lib/engine/filters";
import type { Raster } from "@/lib/engine/types";

function solid(w: number, h: number, rgb: [number, number, number]): Raster {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    data[i * 4] = rgb[0]; data[i * 4 + 1] = rgb[1]; data[i * 4 + 2] = rgb[2]; data[i * 4 + 3] = 255;
  }
  return { width: w, height: h, data };
}

/** A "room" with gradients and some texture so the analysis has something to measure. */
function room(w: number, h: number, scale: number, tint: [number, number, number] = [1, 1, 1]): Raster {
  const r = solid(w, h, [0, 0, 0]);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const base = (60 + 120 * (x / w) + 40 * Math.sin(y / 23)) * scale + (rnd() - 0.5) * 6;
    const i = (y * w + x) * 4;
    r.data[i] = base * tint[0]; r.data[i + 1] = base * tint[1]; r.data[i + 2] = base * tint[2];
  }
  return r;
}

/** Vertical stripes seen through a camera tilted by `pitch` and rolled by `roll`. */
function tiltedStripes(w: number, h: number, roll: number, pitch: number): Raster {
  const out = solid(w, h, [200, 200, 200]);
  const H = correctionHomography(w, h, roll, pitch, 0.75); // original -> corrected
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const z = H[6] * x + H[7] * y + H[8];
    const cx = (H[0] * x + H[1] * y + H[2]) / z;
    const band = Math.floor(cx / 40);
    if (band % 2 === 0) {
      const i = (y * w + x) * 4;
      out.data[i] = 40; out.data[i + 1] = 40; out.data[i + 2] = 40;
    }
  }
  return out;
}

describe("analysis", () => {
  it("flags a dark photo and a warm cast", () => {
    const a = analyze(room(320, 240, 0.45, [1.15, 0.95, 0.7]));
    const ids = findings(a).map((f) => f.id);
    expect(a.lightness.p50).toBeLessThan(45);
    expect(ids).toContain("dark");
    expect(ids).toContain("cast");
    expect(a.cast.b).toBeGreaterThan(0);
  });

  it("measures zones that sum to one", () => {
    const a = analyze(room(200, 150, 1));
    expect(a.zones.reduce((s, z) => s + z, 0)).toBeCloseTo(1, 5);
  });
});

describe("vertical correction", () => {
  it("recovers camera tilt from leaning lines", () => {
    const img = tiltedStripes(480, 360, 1.5, 8);
    const lines = detectVerticalLines(lumaPlane(img));
    expect(lines.length).toBeGreaterThan(4);
    const fit = fitVerticals(lines, 480, 360);
    expect(fit).not.toBeNull();
    expect(fit!.confident).toBe(true);
    expect(fit!.leanAfter).toBeLessThan(0.3);
    expect(Math.abs(fit!.pitch - 8)).toBeLessThan(2.5); // straightness is what matters; pitch and focal trade off
    expect(Math.abs(fit!.roll - 1.5)).toBeLessThan(0.5);
  });

  it("does not correct a photo that is already straight", () => {
    const img = tiltedStripes(480, 360, 0, 0);
    const fit = fitVerticals(detectVerticalLines(lumaPlane(img)), 480, 360);
    expect(fit?.confident ?? false).toBe(false);
  });

  it("homography inverse round-trips", () => {
    const H = correctionHomography(400, 300, 2, -6, 0.75);
    const Hi = invert3(H);
    const p = [123, 45, 1];
    const q = [0, 1, 2].map((r) => H[r * 3] * p[0] + H[r * 3 + 1] * p[1] + H[r * 3 + 2]);
    const back = [0, 1, 2].map((r) => Hi[r * 3] * q[0] + Hi[r * 3 + 1] * q[1] + Hi[r * 3 + 2] * q[2]);
    expect(back[0] / back[2]).toBeCloseTo(123, 6);
    expect(back[1] / back[2]).toBeCloseTo(45, 6);
  });
});

describe("render", () => {
  it("brightens a dark photo, keeps its size and is deterministic", () => {
    const src = room(240, 180, 0.4);
    const a = analyze(src);
    const recipe = autoRecipe(a);
    const one = render(src, a, recipe);
    const two = render(src, a, recipe);
    expect(one.raster.width).toBe(240);
    expect(one.raster.height).toBe(180);
    expect(Buffer.from(one.raster.data).equals(Buffer.from(two.raster.data))).toBe(true);
    const after = analyze(one.raster);
    expect(after.lightness.p50).toBeGreaterThan(a.lightness.p50 + 8);
    expect(one.changes.some((c) => c.kind === "exposure" && (c.value ?? 0) > 0)).toBe(true);
  });

  it("neutralises a colour cast", () => {
    const src = room(240, 180, 0.9, [1.2, 1.0, 0.72]);
    const a = analyze(src);
    const out = render(src, a, autoRecipe(a));
    const b = analyze(out.raster);
    expect(Math.abs(b.cast.b)).toBeLessThan(Math.abs(a.cast.b));
  });

  it("strength 0 with no steps leaves the photo nearly unchanged", () => {
    const src = room(120, 90, 0.8);
    const a = analyze(src);
    const r = autoRecipe(a);
    r.strength = 0;
    r.steps = { exposure: false, whiteBalance: false, toneMap: false, verticals: false, denoise: false, sharpen: false };
    const out = render(src, a, r).raster;
    let maxDiff = 0;
    for (let i = 0; i < src.data.length; i++) maxDiff = Math.max(maxDiff, Math.abs(src.data[i] - out.data[i]));
    expect(maxDiff).toBeLessThanOrEqual(2);
  });

  it("doubles the size with the classic enlargement", () => {
    const src = room(100, 80, 0.8);
    const a = analyze(src);
    const r = autoRecipe(a);
    r.upscale = 2;
    const out = render(src, a, r);
    expect(out.raster.width).toBe(200);
    expect(out.changes.some((c) => c.kind === "upscale")).toBe(true);
  });
});

describe("classic object removal", () => {
  it("fills a masked object with the surrounding colour and leaves the rest untouched", () => {
    const src = solid(160, 120, [180, 170, 160]);
    for (let y = 50; y < 70; y++) for (let x = 70; x < 90; x++) {
      const i = (y * 160 + x) * 4;
      src.data[i] = 220; src.data[i + 1] = 20; src.data[i + 2] = 20;
    }
    const mask = new Uint8Array(160 * 120);
    for (let y = 48; y < 72; y++) for (let x = 68; x < 92; x++) mask[y * 160 + x] = 1;
    const out = inpaint(src, mask);
    for (let y = 50; y < 70; y++) for (let x = 70; x < 90; x++) {
      const i = (y * 160 + x) * 4;
      expect(Math.abs(out.data[i] - 180)).toBeLessThan(6);
      expect(Math.abs(out.data[i + 1] - 170)).toBeLessThan(6);
    }
    expect(out.data[0]).toBe(180);
    expect(out.data[(119 * 160 + 159) * 4 + 2]).toBe(160);
  });

  it("never leaves the original object in place, even near the image border", () => {
    const src = solid(60, 40, [100, 120, 140]);
    for (let y = 0; y < 30; y++) for (let x = 0; x < 30; x++) {
      const i = (y * 60 + x) * 4;
      src.data[i] = 250; src.data[i + 1] = 0; src.data[i + 2] = 0;
    }
    const mask = new Uint8Array(60 * 40);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) mask[y * 60 + x] = 1;
    const out = inpaint(src, mask);
    const i = (10 * 60 + 10) * 4;
    expect(out.data[i]).toBeLessThan(160);
  });
});
