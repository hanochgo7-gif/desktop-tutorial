// QA for course content: schema, question keys, source references, diagrams, HTML whitelist, coverage,
// plus the teaching extras: chapter extras, cases, study plan, AI media and diagram step captions (anim).
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
const chapterIds = new Set(meta.chapters.map((c) => c.id));
const D = ctx.window.Diagrams;
const problems = [];
const notes = [];
const warn = (l, m) => problems.push(`${l}: ${m}`);
const okTags = /^(b|\/b|em|\/em|ul|\/ul|ol|\/ol|li|\/li|br|p|\/p|span dir="ltr"|\/span)$/;
const UNCLEAR = /\[\?\]|לא קריא/;
const checkSrc = (where, src) => { for (const s of [].concat(src || [])) if (!SRC[s]) warn(where, `unknown source ${s}`); };
const checkHtml = (where, html) => { for (const m of String(html || "").matchAll(/<([^>]+)>/g)) if (!okTags.test(m[1].trim())) warn(where, `html tag not allowed: <${m[1]}>`); };
// a source-backed short fact: needs src (existing) or expl:true, and no uncertain reading
const checkFact = (where, x, text) => {
  if (!(x.src || []).length && !x.expl) warn(where, "needs src or expl:true");
  checkSrc(where, x.src);
  if (x.src && UNCLEAR.test(text || "")) warn(where, "uncertain reading ([?]/לא קריא) used as a cited fact");
};

// one question, lesson schema (also used for chapter pretests and case steps)
function checkQuestion(q, where) {
  const t = q.type, tag = `${where} ${t} "${String(q.q || q.text || "").slice(0, 40)}"`;
  if (!q.src && !q.enrich) warn(tag, "question without src or enrich");
  for (const s of q.src || []) if (!SRC[s]) warn(tag, `unknown source ${s}`);
  if (UNCLEAR.test(JSON.stringify([q.q, q.text, q.options, q.pairs, q.steps, q.model]))) warn(tag, "question built on an uncertain reading ([?]/לא קריא)");
  if (["mcq", "compare", "scenario"].includes(t)) {
    if (!Array.isArray(q.options) || q.options.length !== 4) warn(tag, "needs 4 options");
    if (!(q.answer >= 0 && q.answer < 4)) warn(tag, "bad answer index");
    if (new Set(q.options).size !== (q.options || []).length) warn(tag, "duplicate options");
    if ((q.options || []).some((o) => /כל התשובות|אף תשובה/.test(o))) warn(tag, "all/none of the above option");
  } else if (t === "tf") { if (typeof q.answer !== "boolean") warn(tag, "tf answer must be boolean"); }
  else if (t === "cloze") {
    const n = (String(q.text || "").match(/\{\{[^}]+\}\}/g) || []).length;
    if (n < 1 || n > 3) warn(tag, `cloze needs 1-3 blanks (has ${n})`);
    if (q.anyOrder !== undefined && q.anyOrder !== true) {
      const ok = Array.isArray(q.anyOrder) && q.anyOrder.every((g) => Array.isArray(g) && g.length >= 2 && g.every((i) => Number.isInteger(i) && i >= 0 && i < n));
      if (!ok) warn(tag, "anyOrder must be true or groups of >=2 blank indexes in range");
    }
  }
  else if (t === "match") { if (!Array.isArray(q.pairs) || q.pairs.length < 4) warn(tag, "match needs >= 4 pairs"); }
  else if (t === "order") { if (!Array.isArray(q.steps) || q.steps.length < 3) warn(tag, "order needs steps"); }
  else if (t === "open") { if (!q.model) warn(tag, "open needs model answer"); }
  else warn(tag, "unknown question type");
  if (!q.explain && t !== "open") warn(tag, "missing explain");
}

// ---------------------------------------------------------------- lessons
for (const l of lessons) {
  const where = l.id;
  if (!chapterIds.has(l.chapter)) warn(where, `unknown chapter ${l.chapter}`);
  for (const s of l.sources || []) if (!SRC[s]) warn(where, `unknown source ${s}`);
  for (const r of l.related || []) if (!ids.has(r)) warn(where, `related lesson not (yet) present: ${r}`);
  const blocks = [].concat(...["full", "deep"].map((lv) => (l[lv] || []).flatMap((s) => s.blocks || [])));
  for (const b of blocks) {
    if (b.k === "diagram" && !D.has(b.id)) warn(where, `unknown diagram ${b.id}`);
    if (b.k === "image" && !SRC[b.src]) warn(where, `image source missing ${b.src}`);
    if (Array.isArray(b.src)) for (const s of b.src) if (!SRC[s]) warn(where, `block cites unknown source ${s}`);
    if (b.k === "src" && !(b.src || []).length) warn(where, "src block without src");
    if (b.k === "src" && UNCLEAR.test(b.html || "")) warn(where, "src block contains an uncertain reading; use a verify block");
    checkHtml(where, b.html);
  }
  for (const [i, r] of (l.remember || []).entries()) checkFact(`${where} remember[${i}]`, r, r.t);
  for (const [i, c] of (l.cards || []).entries()) { checkFact(`${where} card[${i}]`, c, c.q + " " + c.a); }
  for (const q of l.questions || []) checkQuestion(q, where);
}

// ---------------------------------------------------------------- chapter extras (_chapters-*.js)
const X = ctx.window.COURSE_CHAPTER_EXTRAS || {};
let nCheat = 0, nLinks = 0, nPre = 0, nMn = 0;
for (const [ch, x] of Object.entries(X)) {
  const where = `chapter ${ch}`;
  if (!chapterIds.has(ch)) warn(where, "extras for unknown chapter");
  for (const [i, c] of (x.cheatsheet || []).entries()) {
    nCheat++;
    if (!(c.src || []).length) warn(`${where} cheatsheet[${i}]`, "cheatsheet fact without src");
    checkFact(`${where} cheatsheet[${i}]`, c, c.t);
  }
  if (x.compare) {
    if (!(x.compare.src || []).length) warn(`${where} compare`, "compare table without src");
    checkSrc(`${where} compare`, x.compare.src);
    const w = (x.compare.head || []).length;
    for (const [i, r] of (x.compare.rows || []).entries()) if (r.length !== w) warn(`${where} compare row ${i}`, `has ${r.length} cells, head has ${w}`);
  }
  for (const [i, k] of (x.links || []).entries()) {
    nLinks++;
    if (!k.a || !k.b || !k.rel) warn(`${where} link[${i}]`, "link needs a, b and rel");
    checkFact(`${where} link[${i}]`, k, k.rel);
  }
  for (const [i, m] of (x.mnemonics || []).entries()) {
    nMn++;
    if (!ids.has(m.for)) warn(`${where} mnemonic[${i}]`, `for: unknown lesson ${m.for}`);
    else if (lessons.find((l) => l.id === m.for).chapter !== ch) warn(`${where} mnemonic[${i}]`, `lesson ${m.for} is not in this chapter`);
    if (m.src) warn(`${where} mnemonic[${i}]`, "mnemonics are memory hooks (expl), not cited facts");
  }
  for (const q of x.pretest || []) { nPre++; checkQuestion(q, `${where} pretest`); }
}

// ---------------------------------------------------------------- cases (_cases.js)
const CASES = ctx.window.COURSE_CASES || [];
const caseIds = new Set();
let nSteps = 0;
for (const c of CASES) {
  const where = c.id || "case ?";
  if (!/^case-/.test(c.id || "")) warn(where, "case id must start with case-");
  if (caseIds.has(c.id)) warn(where, "duplicate case id");
  caseIds.add(c.id);
  if (!/בדוי|הומצא/.test(c.story || "")) warn(where, "story must say the project is fictional (בדוי)");
  for (const ch of c.chapters || []) if (!chapterIds.has(ch)) warn(where, `unknown chapter ${ch}`);
  for (const l of c.lessons || []) if (!ids.has(l)) warn(where, `unknown lesson ${l}`);
  checkHtml(where, c.story); checkHtml(where, c.debrief);
  for (const [i, s] of (c.steps || []).entries()) {
    nSteps++;
    const sw = `${where} step[${i}]`;
    if (!(s.src || []).length) warn(sw, "step without src");
    checkSrc(sw, s.src);
    if (s.lesson && !ids.has(s.lesson)) warn(sw, `unknown lesson ${s.lesson}`);
    if (!s.lesson) warn(sw, "step without lesson");
    checkHtml(sw, s.html);
    if (s.question) checkQuestion(s.question, sw); else warn(sw, "step without question");
  }
}

// ---------------------------------------------------------------- study plan (_plan.js)
const PLAN = ctx.window.COURSE_PLAN;
const TYPES = { lesson: ids, cards: null, practice: null, exam: chapterIds, case: caseIds, summary: chapterIds };
let nDays = 0;
if (PLAN) {
  const seen = new Set();
  for (const d of PLAN.days || []) {
    nDays++;
    const dw = `plan day ${d.day}`;
    if (seen.has(d.day)) warn(dw, "duplicate day number");
    seen.add(d.day);
    let sum = 0;
    for (const [i, t] of (d.tasks || []).entries()) {
      const tw = `${dw} task[${i}] ${t.type}`;
      if (!(t.type in TYPES)) { warn(tw, "unknown task type"); continue; }
      if (typeof t.min !== "number") warn(tw, "task without min"); else sum += t.min;
      if (t.ref) {
        const ok = t.type === "cards" || t.type === "practice" ? ids.has(t.ref) || chapterIds.has(t.ref) : TYPES[t.type].has(t.ref);
        if (!ok) warn(tw, `unknown ref ${t.ref}`);
      } else {
        if (t.type === "exam" && t.mode !== "full") warn(tw, "exam without ref needs mode 'full'");
        if (t.type === "practice" && t.mode !== "mistakes") warn(tw, "practice without ref needs mode 'mistakes'");
        if (["lesson", "case", "summary"].includes(t.type)) warn(tw, "task needs a ref");
      }
    }
    if (sum !== d.minutes) warn(dw, `task minutes sum ${sum} != day minutes ${d.minutes}`);
  }
}

// ---------------------------------------------------------------- AI media (_media.js)
const MEDIA = ctx.window.COURSE_MEDIA || {};
let nWarn = 0, nHide = 0;
for (const [k, m] of Object.entries(MEDIA)) {
  const mw = `media ${k}`;
  if (!(k === "dashboard" || ids.has(k) || chapterIds.has(k) || CASES.some((c) => c.id === k))) warn(mw, "key is not a lesson, chapter, case or 'dashboard'");
  for (const f of ["file", "small"]) {
    if (!m[f]) warn(mw, `missing ${f}`);
    else if (!existsSync(join(root, "private", m[f]))) warn(mw, `${f} not on disk: ${m[f]}`);
  }
  if (m.anim && !existsSync(join(root, "private", m.anim))) warn(mw, `anim not on disk: ${m.anim}`);
  if (!String(m.alt || "").trim()) warn(mw, "empty alt");
  if (!String(m.caption || "").trim()) warn(mw, "empty caption");
  if (m.warn !== undefined) { nWarn++; if (!String(m.warn).trim()) warn(mw, "empty warn"); }
  if (m.hide !== undefined) { if (typeof m.hide !== "boolean") warn(mw, "hide must be boolean"); else if (m.hide) nHide++; }
}

// ---------------------------------------------------------------- diagram step captions (_anim.js)
const ANIM = ctx.window.COURSE_ANIM || {};
let nAnimSteps = 0;
for (const [id, a] of Object.entries(ANIM)) {
  const aw = `anim ${id}`;
  if (!D.has(id)) { warn(aw, "unknown diagram id"); continue; }
  const parts = (D.parts && D.parts(id)) || null;
  const nums = new Set((parts || []).map((p) => p.n));
  const steps = a.steps || [];
  if (steps.length < 3 || steps.length > 6) warn(aw, `needs 3-6 steps (has ${steps.length})`);
  let partsIgnored = false;
  for (const [i, s] of steps.entries()) {
    nAnimSteps++;
    const sw = `${aw} step[${i}]`;
    if (!String(s.t || "").trim()) warn(sw, "empty caption");
    checkFact(sw, s, s.t);
    if (!Array.isArray(s.parts)) warn(sw, "parts must be an array ([] = none)");
    else if (parts) { for (const n of s.parts) if (!nums.has(n)) warn(sw, `part ${n} is not in the diagram`); }
    else if (s.parts.length) partsIgnored = true;
  }
  if (partsIgnored) notes.push(`anim ${id}: diagram has no parts[] yet, step highlights are ignored until it does`);
}

// ---------------------------------------------------------------- coverage
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
console.log(`extras: chapters ${Object.keys(X).length} (cheatsheet ${nCheat}, links ${nLinks}, mnemonics ${nMn}, pretest ${nPre}), cases ${CASES.length} (steps ${nSteps}), plan days ${nDays}, media ${Object.keys(MEDIA).length} (warn ${nWarn}, hidden ${nHide}), anim ${Object.keys(ANIM).length} (steps ${nAnimSteps})`);
notes.forEach((n) => console.log(" note: " + n));
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
