// Builds the landing-page demo from real engine output: the "after" images and every number shown
// next to them are produced here by the same code that runs in the browser. Re-run after engine changes:
//   npx tsx scripts/build-demo.ts
import sharp from "sharp";
import { writeFileSync } from "node:fs";
import { analyze, findings } from "../src/lib/engine/analyze";
import { autoRecipe, render } from "../src/lib/engine/pipeline";
import { load, save } from "./run-engine";

const SAMPLES = [
  { id: "living", file: "samples/apt1-before.jpg" },
  { id: "kitchen", file: "samples/apt2-before.jpg" },
  { id: "bedroom", file: "samples/apt3-before.jpg" },
];

async function main() {
  const out: Record<string, unknown>[] = [];
  for (const s of SAMPLES) {
    const src = await load(s.file);
    const a = analyze(src);
    const recipe = autoRecipe(a);
    const { raster, changes } = render(src, a, recipe);
    const after = analyze(raster);
    await save(src, `public/demo/${s.id}-before.jpg`, 86);
    await save(raster, `public/demo/${s.id}-after.jpg`, 86);
    out.push({
      id: s.id,
      width: src.width,
      height: src.height,
      findings: findings(a),
      changes,
      zonesBefore: a.zones.map((z) => Math.round(z * 1000) / 1000),
      zonesAfter: after.zones.map((z) => Math.round(z * 1000) / 1000),
      kelvin: a.kelvin,
      medianBefore: a.lightness.p50,
      medianAfter: after.lightness.p50,
    });
  }
  writeFileSync("src/lib/demo-data.json", JSON.stringify(out, null, 1) + "\n");

  // Social preview: before | after of the first sample with the brand line.
  const w = 1200, h = 630;
  const half = await Promise.all(
    ["before", "after"].map((k) => sharp(`public/demo/living-${k}.jpg`).resize(600, 630, { fit: "cover" }).toBuffer()),
  );
  const label = (text: string, x: number) =>
    `<g><rect x="${x}" y="24" rx="6" width="${text.length * 13 + 28}" height="38" fill="rgba(20,25,34,.78)"/><text x="${x + 14}" y="50" font-family="sans-serif" font-size="20" font-weight="600" fill="#fff">${text}</text></g>`;
  const overlay = Buffer.from(
    `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><rect x="598" y="0" width="4" height="${h}" fill="#fff"/>${label("Before", 24)}${label("After", 624)}</svg>`,
  );
  await sharp({ create: { width: w, height: h, channels: 3, background: "#1d1f23" } })
    .composite([{ input: half[0], left: 0, top: 0 }, { input: half[1], left: 600, top: 0 }, { input: overlay, left: 0, top: 0 }])
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile("public/og.jpg");

  const mark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#1a3a8c"/><path d="M16 6.2 26.2 14.6v10.6H5.8V14.6Z" fill="none" stroke="#fff" stroke-width="2.1" stroke-linejoin="round"/><rect x="9" y="16.6" width="5.9" height="4.8" rx="1" fill="#fff"/><rect x="17.1" y="16.6" width="5.9" height="4.8" rx="1" fill="#fff" opacity=".38"/></svg>`;
  writeFileSync("public/icon.svg", mark);
  await sharp(Buffer.from(mark)).resize(180, 180).png().toFile("public/apple-icon.png");
  await sharp(Buffer.from(mark)).resize(512, 512).png().toFile("public/icon-512.png");
  await sharp(Buffer.from(mark)).resize(192, 192).png().toFile("public/icon-192.png");
  console.log(JSON.stringify(out.map((o) => ({ id: o.id, changes: o.changes })), null, 0));
}
main();
