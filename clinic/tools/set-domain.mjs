// קובע את הדומיין הציבורי של האתר בכל המקומות שצריכים כתובת מוחלטת:
// robots.txt, sitemap.xml, canonical, og:url ו-og:image בכל עמוד, ונתונים מובנים.
// הרצה: node tools/set-domain.mjs https://www.rotem-clinic.co.il   (מתוך clinic/)
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const domain = (process.argv[2] || "").replace(/\/+$/, "");
if (!/^https:\/\/[a-z0-9.-]+$/i.test(domain)) { console.error("שימוש: node tools/set-domain.mjs https://your-domain.co.il"); process.exit(1); }
const old = (readFileSync(resolve(root, "robots.txt"), "utf8").match(/Sitemap:\s*(https?:\/\/[^/\s]+)/) || [, "https://example.com"])[1];
writeFileSync(resolve(root, "robots.txt"), `User-agent: *\nAllow: /\nDisallow: /server/\nDisallow: /social/\nDisallow: /tools/\nSitemap: ${domain}/sitemap.xml\n`);
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); if (["node_modules", "server", "social", "tools", "preview", ".git"].includes(f)) return []; return statSync(p).isDirectory() ? walk(p) : p.endsWith(".html") ? [p] : []; });
let n = 0;
for (const file of walk(root)) {
  const relPath = relative(root, file).replace(/\\/g, "/"); const url = `${domain}/${relPath === "index.html" ? "" : relPath}`;
  const depth = relPath.split("/").length - 1; const pre = "../".repeat(depth);
  let s = readFileSync(file, "utf8"); const before = s;
  s = s.replace(new RegExp(old.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), domain);
  s = s.replace(/\s*<link rel="canonical" href="[^"]*">/g, "").replace(/\s*<meta property="og:url" content="[^"]*">/g, "");
  if (!/name="robots" content="noindex"/.test(s)) s = s.replace("</head>", `  <link rel="canonical" href="${url}">\n  <meta property="og:url" content="${url}">\n</head>`);
  s = s.replace(/<meta property="og:image" content="(?:\.\.\/)*(images\/[^"]+)">/g, `<meta property="og:image" content="${domain}/$1">`);
  s = s.replace(/"image":\s*"(?:\.\.\/)*(images\/[^"]+)"/g, `"image": "${domain}/$1"`);
  if (s !== before) { writeFileSync(file, s); n++; }
}
execSync("node tools/build-products.mjs", { cwd: root, stdio: "inherit" });
console.log(`domain set to ${domain} in ${n} pages`);
