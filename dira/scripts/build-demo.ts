// Builds the landing-page demo from real engine output: the "after" images and every number shown
// next to them are produced here by the same code that runs in the browser. Re-run after engine changes:
//   npx tsx scripts/build-demo.ts
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

  // Link-preview cards: node scripts/build-og.cjs
  // App icons come from scripts/build-icons.ts (the Canva logo mark).
  console.log(JSON.stringify(out.map((o) => ({ id: o.id, changes: o.changes })), null, 0));
}
main();
