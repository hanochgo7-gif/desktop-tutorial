// Builds a single self-contained HTML page (for publishing as a claude.ai Artifact).
// Usage: node build.mjs <output.html>
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const out = process.argv[2] || join(here, "dist.html");
const read = (p) => readFileSync(join(here, p), "utf8");
const safe = (js) => js.replace(/<\/script/gi, "<\\/script");

const lessons = [];
for (let i = 1; i <= 99; i++) {
  const p = `data/lesson-${String(i).padStart(2, "0")}.js`;
  if (existsSync(join(here, p))) lessons.push(read(p));
}

const html = `<title>מלאכות הבנייה</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Assistant:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&family=Karantina:wght@400;700&display=swap">
<style>
${read("app.css")}
</style>
<div id="app" dir="rtl" lang="he"></div>
<script>
${safe(lessons.join("\n"))}
</script>
<script>
${safe(read("diagrams.js"))}
</script>
<script>
${safe(read("app.js"))}
</script>
`;
writeFileSync(out, html);
console.log(`wrote ${out} (${lessons.length} lessons, ${(html.length / 1024).toFixed(0)} KB)`);
