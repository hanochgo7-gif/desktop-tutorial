// Runs the Studio Enhance engine on photos from the command line (same code as the browser).
// Usage: npx tsx scripts/run-engine.ts <input.jpg> <output.jpg> [--json analysis.json] [--no-verticals]
import sharp from "sharp";
import { writeFileSync } from "node:fs";
import { analyze, findings } from "../src/lib/engine/analyze";
import { autoRecipe, render } from "../src/lib/engine/pipeline";
import type { Raster } from "../src/lib/engine/types";

export async function load(path: string): Promise<Raster> {
  const { data, info } = await sharp(path).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { width: info.width, height: info.height, data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.length) };
}

export async function save(r: Raster, path: string, quality = 90) {
  await sharp(Buffer.from(r.data.buffer, r.data.byteOffset, r.data.length), { raw: { width: r.width, height: r.height, channels: 4 } })
    .removeAlpha()
    .jpeg({ quality, mozjpeg: true })
    .toFile(path);
}

async function main() {
  const [input, output, ...rest] = process.argv.slice(2);
  const src = await load(input);
  let t = performance.now();
  const a = analyze(src);
  const tA = performance.now() - t;
  const recipe = autoRecipe(a);
  if (rest.includes("--no-verticals")) recipe.steps.verticals = false;
  t = performance.now();
  const { raster, changes } = render(src, a, recipe);
  const tR = performance.now() - t;
  await save(raster, output);
  const { zones, ...summary } = a;
  console.log(JSON.stringify({ summary, zones: zones.map((z) => Math.round(z * 1000) / 10), findings: findings(a), changes, ms: { analyze: Math.round(tA), render: Math.round(tR) } }, null, 1));
  const j = rest.indexOf("--json");
  if (j >= 0) writeFileSync(rest[j + 1], JSON.stringify({ analysis: a, recipe, changes }, null, 2));
}

if (process.argv[1]?.endsWith("run-engine.ts")) main();
