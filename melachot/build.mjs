// Build helper for melachot.
//   node build.mjs bundle                 -> private/bundle.js (course meta + sources + lessons) for index.html
//   node build.mjs artifact <out-dir> [page.html] -> <out-dir>/<page.html> (one self-contained page) + <out-dir>/src-img/*.jpg
// The private/ folder holds the student's own course material and is not committed to the public repo.
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(join(here, p), "utf8");
const safe = (js) => js.replace(/<\/script/gi, "<\\/script");
const [mode = "bundle", outArg, pageName = "index.html"] = process.argv.slice(2);

function sourcesJs() {
  const dir = join(here, "private/transcripts");
  if (!existsSync(dir)) return "window.SOURCES = [];\n";
  const metaTxt = existsSync(join(here, "private/course/_meta.js")) ? read("private/course/_meta.js") : "";
  const order = (metaTxt.match(/groupOrder:\s*\[([^\]]*)\]/) || [, '"rec3","rec1","rec2"'])[1].replace(/["'\s]/g, "").split(",");
  const items = readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")));
  const key = (s) => { const [g, n] = s.id.split("-"); return order.indexOf(g) * 1000 + Number(n); };
  items.sort((a, b) => key(a) - key(b));
  const keep = ["id", "status", "kind", "title", "duplicate_of", "blocks", "tables", "english_terms", "numbers", "figures", "unclear", "notes", "footer", "no_content", "items"];
  const slim = items.map((s) => Object.fromEntries(keep.filter((k) => s[k] !== undefined && s[k] !== null).map((k) => [k, s[k]])));
  return "window.SOURCES = " + JSON.stringify(slim) + ";\n";
}
function courseJs() {
  const dir = join(here, "private/course");
  if (!existsSync(dir)) return "";
  const files = readdirSync(dir).filter((f) => f.endsWith(".js")).sort();
  const meta = files.filter((f) => f.startsWith("_"));
  const lessons = files.filter((f) => !f.startsWith("_"));
  return meta.concat(lessons).map((f) => readFileSync(join(dir, f), "utf8")).join("\n");
}
function lessonsJs() {
  const out = [];
  for (let i = 1; i <= 99; i++) {
    const p = `data/lesson-${String(i).padStart(2, "0")}.js`;
    if (existsSync(join(here, p))) out.push(read(p));
  }
  return out.join("\n");
}

if (mode === "bundle") {
  const js = courseJs() + "\n" + sourcesJs();
  writeFileSync(join(here, "private/bundle.js"), js);
  console.log(`wrote private/bundle.js (${(js.length / 1024).toFixed(0)} KB)`);
} else if (mode === "artifact") {
  const out = outArg || join(here, "dist");
  mkdirSync(join(out, "src-img"), { recursive: true });
  const html = `<title>מלאכות הבנייה</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Assistant:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&family=Karantina:wght@400;700&display=swap">
<style>
${read("app.css")}
</style>
<div id="app" dir="rtl" lang="he"></div>
<script>window.SRC_IMG_BASE = "src-img/";</script>
<script>
${safe(lessonsJs())}
</script>
<script>
${safe(courseJs())}
${safe(sourcesJs())}
</script>
<script>
${safe(read("diagrams.js"))}
</script>
<script>
${safe(read("app.js"))}
</script>
`;
  writeFileSync(join(out, pageName), html);
  const imgDir = join(here, "private/src-img");
  let n = 0;
  if (existsSync(imgDir)) for (const f of readdirSync(imgDir)) { copyFileSync(join(imgDir, f), join(out, "src-img", f)); n++; }
  const mediaDir = join(here, "private/media");
  let m = 0;
  if (existsSync(mediaDir)) { mkdirSync(join(out, "media"), { recursive: true }); for (const f of readdirSync(mediaDir)) { copyFileSync(join(mediaDir, f), join(out, "media", f)); m++; } }
  console.log(`wrote ${join(out, pageName)} (${(html.length / 1024).toFixed(0)} KB), ${n} source images, ${m} media files`);
}
