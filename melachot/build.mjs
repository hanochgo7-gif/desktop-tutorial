// Build helper for melachot.
//   node build.mjs bundle                 -> private/bundle.js (course meta + sources + lessons) for index.html
//   node build.mjs artifact <out-dir> [page.html] -> <out-dir>/<page.html> (one page for claude.ai) + src-img/ + media/
//   node build.mjs web <out-dir>          -> <out-dir>/index.html (standalone static site: PWA, offline, noindex) + src-img/ + media/ + web/*
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
} else if (mode === "artifact" || mode === "web") {
  // artifact: one page for claude.ai (the host adds the document skeleton).
  // web: a standalone static site (full document, PWA manifest, offline service worker, noindex) for any static host.
  const web = mode === "web";
  const out = outArg || join(here, "dist");
  const page = web ? "index.html" : pageName;
  mkdirSync(join(out, "src-img"), { recursive: true });
  const fonts = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Assistant:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&family=Karantina:wght@400;700&display=swap">`;
  const head = web
    ? `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow, noarchive">
<meta name="description" content="אפליקציית לימוד למלאכות הבנייה, מבוססת על שקפי הקורס.">
<meta name="theme-color" content="#EBECE7" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#131618" media="(prefers-color-scheme: dark)">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="מלאכות הבנייה">
<title>מלאכות הבנייה</title>
<link rel="icon" href="icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="icon-192.png">
<link rel="manifest" href="manifest.webmanifest">
${fonts}`
    : `<title>מלאכות הבנייה</title>
<meta name="claude:viewport-fit-sides" content="cover">
${fonts}`;
  const html = `${head}
<style>
${read("app.css")}
</style>
${web ? "</head>\n<body>\n" : ""}<div id="app" dir="rtl" lang="he"></div>
<script>window.SRC_IMG_BASE = "src-img/"; window.MEDIA_BASE = "";</script>
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
${web ? `<script>if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(function () {});</script>
</body>
</html>
` : ""}`;
  writeFileSync(join(out, page), html);
  const imgDir = join(here, "private/src-img");
  let n = 0;
  if (existsSync(imgDir)) for (const f of readdirSync(imgDir)) { copyFileSync(join(imgDir, f), join(out, "src-img", f)); n++; }
  const mediaDir = join(here, "private/media");
  let m = 0;
  if (existsSync(mediaDir)) { mkdirSync(join(out, "media"), { recursive: true }); for (const f of readdirSync(mediaDir)) { copyFileSync(join(mediaDir, f), join(out, "media", f)); m++; } }
  if (web) {
    for (const f of readdirSync(join(here, "web"))) copyFileSync(join(here, "web", f), join(out, f));
    // the service worker cache name changes with every build, so a new deploy replaces the old offline copy
    const sw = read("web/sw.js").replace("__BUILD__", String(Date.now()));
    writeFileSync(join(out, "sw.js"), sw);
  }
  console.log(`wrote ${join(out, page)} (${(html.length / 1024).toFixed(0)} KB), ${n} source images, ${m} media files`);
}
