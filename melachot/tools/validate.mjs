// QA for course content: schema, question keys, source references, diagrams, HTML whitelist, coverage.
// usage: node tools/validate.mjs [--coverage out.md]
import { readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ctx = { window: {} };
vm.createContext(ctx);
const run = (p) => vm.runInContext(readFileSync(p, "utf8"), ctx, { filename: p });
const cdir = join(root, "private/course");
const files = existsSync(cdir) ? readdirSync(cdir).filter((f) => f.endsWith(".js")).sort() : [];
files.filter((f) => f.startsWith("_")).concat(files.filter((f) => !f.startsWith("_"))).forEach((f) => run(join(cdir, f)));
run(join(root, "diagrams.js"));
const tdir = join(root, "private/transcripts");
const sources = existsSync(tdir) ? readdirSync(tdir).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(join(tdir, f), "utf8"))) : [];
const SRC = Object.fromEntries(sources.map((s) => [s.id, s]));
const meta = ctx.window.COURSE_META || { chapters: [] };
const lessons = ctx.window.COURSE_LESSONS || [];
const ids = new Set(lessons.map((l) => l.id));
const D = ctx.window.Diagrams;
const problems = [];
const warn = (l, m) => problems.push(`${l}: ${m}`);
const okTags = /^(b|\/b|em|\/em|ul|\/ul|ol|\/ol|li|\/li|br|p|\/p|span dir="ltr"|\/span)$/;

for (const l of lessons) {
  const where = l.id;
  if (!meta.chapters.some((c) => c.id === l.chapter)) warn(where, `unknown chapter ${l.chapter}`);
  for (const s of l.sources || []) if (!SRC[s]) warn(where, `unknown source ${s}`);
  for (const r of l.related || []) if (!ids.has(r)) warn(where, `related lesson not (yet) present: ${r}`);
  const blocks = [].concat(...["full", "deep"].map((lv) => (l[lv] || []).flatMap((s) => s.blocks || [])));
  for (const b of blocks) {
    if (b.k === "diagram" && !D.has(b.id)) warn(where, `unknown diagram ${b.id}`);
    if (b.k === "image" && !SRC[b.src]) warn(where, `image source missing ${b.src}`);
    if (Array.isArray(b.src)) for (const s of b.src) if (!SRC[s]) warn(where, `block cites unknown source ${s}`);
    if (b.k === "src" && !(b.src || []).length) warn(where, "src block without src");
    for (const m of String(b.html || "").matchAll(/<([^>]+)>/g)) if (!okTags.test(m[1].trim())) warn(where, `html tag not allowed: <${m[1]}>`);
  }
  for (const q of l.questions || []) {
    const t = q.type, tag = `${where} ${t} "${String(q.q || q.text || "").slice(0, 40)}"`;
    if (!q.src && !q.enrich) warn(tag, "question without src or enrich");
    for (const s of q.src || []) if (!SRC[s]) warn(tag, `unknown source ${s}`);
    if (["mcq", "compare", "scenario"].includes(t)) {
      if (!Array.isArray(q.options) || q.options.length !== 4) warn(tag, "needs 4 options");
      if (!(q.answer >= 0 && q.answer < 4)) warn(tag, "bad answer index");
      if (new Set(q.options).size !== q.options.length) warn(tag, "duplicate options");
      if (q.options.some((o) => /כל התשובות|אף תשובה/.test(o))) warn(tag, "all/none of the above option");
    } else if (t === "tf") { if (typeof q.answer !== "boolean") warn(tag, "tf answer must be boolean"); }
    else if (t === "cloze") { const n = (q.text.match(/\{\{[^}]+\}\}/g) || []).length; if (n < 1 || n > 3) warn(tag, `cloze needs 1-3 blanks (has ${n})`); }
    else if (t === "match") { if (!Array.isArray(q.pairs) || q.pairs.length < 4) warn(tag, "match needs >= 4 pairs"); }
    else if (t === "order") { if (!Array.isArray(q.steps) || q.steps.length < 3) warn(tag, "order needs steps"); }
    else if (t === "open") { if (!q.model) warn(tag, "open needs model answer"); }
    else warn(tag, "unknown question type");
    if (!q.explain && t !== "open") warn(tag, "missing explain");
  }
}

// coverage
const used = {};
for (const l of lessons) for (const s of l.sources || []) (used[s] = used[s] || []).push(l.id);
const rows = sources.sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true })).map((s) => {
  const u = used[s.id] || [];
  const status = { full: "פוענחה", partial: "פוענחה חלקית", unclear: "דורשת אימות" }[s.status] || s.status;
  const where = u.length ? u.join(", ") : s.duplicate_of ? `כפילות של ${s.duplicate_of}` : s.no_content || "לא שובץ";
  if (!u.length && !s.duplicate_of && !s.no_content) warn(s.id, "source page not used by any lesson");
  return `| ${s.id} | ${(s.title || "").replace(/\|/g, "/")} | ${status} | ${(s.unclear || []).length} | ${where} |`;
});
const qCount = lessons.reduce((n, l) => n + (l.questions || []).length, 0);
console.log(`lessons ${lessons.length}, questions ${qCount}, sources ${sources.length}, problems ${problems.length}`);
problems.forEach((p) => console.log(" - " + p));
const outIdx = process.argv.indexOf("--coverage");
if (outIdx > -1) {
  const md = ["# דוח כיסוי: עמודי המקור מול האפליקציה", "", `שיעורים: ${lessons.length} · שאלות: ${qCount} · עמודי מקור: ${sources.length}`, "",
    "| עמוד | כותרת | סטטוס | פריטים לא ברורים | מופיע בשיעורים |", "|---|---|---|---|---|", ...rows, "",
    "## פריטים לא ברורים לפי עמוד", "",
    ...sources.filter((s) => (s.unclear || []).length).map((s) => `### ${s.id}: ${s.title || ""}\n` + s.unclear.map((u) => `- ${u.where || ""}: ${u.best_reading || ""}${(u.alternatives || []).length ? " (או: " + u.alternatives.join(" / ") + ")" : ""}`).join("\n") + "\n")];
  writeFileSync(process.argv[outIdx + 1], md.join("\n"));
  console.log("coverage report written to " + process.argv[outIdx + 1]);
}
process.exitCode = problems.length ? 1 : 0;
