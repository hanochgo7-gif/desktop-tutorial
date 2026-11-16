/* מלאכות הבנייה: course study app.
   Course content (source-based) comes from window.COURSE_META, window.COURSE_LESSONS and window.SOURCES.
   Chapter extras, field cases, the 14-day plan, AI illustrations and diagram steps come from
   window.COURSE_CHAPTER_EXTRAS, COURSE_CASES, COURSE_PLAN, COURSE_MEDIA and COURSE_ANIM (all optional).
   The enrichment library (general syllabus, not from the course slides) comes from window.LESSONS. */
(function () {
  "use strict";

  // =============================================================== utils
  var DAY = 86400000;
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  // the same shuffle on every load (seeded): generated questions must keep their options, or a resumed exam's answers change meaning
  function seededShuffle(a, seed) {
    var h = 2166136261 >>> 0; seed = String(seed);
    for (var k = 0; k < seed.length; k++) { h ^= seed.charCodeAt(k); h = Math.imul(h, 16777619) >>> 0; }
    var rnd = function () { h = (h + 0x6D2B79F5) >>> 0; var t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var x = a[i]; a[i] = a[j]; a[j] = x; }
    return a;
  }
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function dayKey(d) { d = d || new Date(); return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
  function today() { return dayKey(); }
  function startOfToday() { var d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }
  function keyToDate(k) { var p = String(k).split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(k, n) { var d = keyToDate(k); d.setDate(d.getDate() + n); return dayKey(d); }
  function daysBetween(a, b) { return Math.round((keyToDate(b) - keyToDate(a)) / DAY); }
  function pct(x) { return Math.round(Math.max(0, Math.min(1, x || 0)) * 100); }
  function stripTags(s) { return String(s == null ? "" : s).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); }
  function strHash(s) { s = String(s); var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
  function uniq(base, map) { var id = base, n = 2; while (map[id]) id = base + "-" + n++; return id; }
  function plural(n, one, many) { return n === 1 ? one : n + " " + many; }
  // measuring-tape progress; with a key the fill animates from the last value seen (M7)
  function tape(p, thin, key) {
    return '<div class="tape' + (thin ? " tape-thin" : "") + '" role="img" aria-label="' + p + ' אחוז"' + (key ? ' data-tk="' + esc(key) + '" data-p="' + p + '"' : "") + '><i style="width:' + p + '%"></i></div>';
  }
  function fmtDate(t) { return new Date(t).toLocaleDateString("he-IL", { day: "numeric", month: "numeric", year: "2-digit" }); }
  function fmtDay(k) { return keyToDate(k).toLocaleDateString("he-IL", { day: "numeric", month: "long" }); }
  function fmtDur(sec) { sec = Math.max(0, Math.round(sec)); return Math.floor(sec / 60) + ":" + pad2(sec % 60); }
  function avg(a) { return a.length ? a.reduce(function (s, x) { return s + x; }, 0) / a.length : 0; }
  function isObj(x) { return !!x && typeof x === "object" && !Array.isArray(x); }
  // string similarity (Dice coefficient over character bigrams), used to avoid printing a summary twice
  function sim(a, b) {
    a = String(a || "").replace(/\s+/g, " ").trim(); b = String(b || "").replace(/\s+/g, " ").trim();
    if (a.length < 2 || b.length < 2) return a === b ? 1 : 0;
    var grams = {}, hit = 0, i;
    for (i = 0; i < a.length - 1; i++) { var g = a.substr(i, 2); grams[g] = (grams[g] || 0) + 1; }
    for (i = 0; i < b.length - 1; i++) { var h = b.substr(i, 2); if (grams[h]) { grams[h]--; hit++; } }
    return 2 * hit / (a.length - 1 + b.length - 1);
  }

  // =============================================================== settings (this device only, never synced)
  var SETKEY = "melachot-settings";
  var SET = (function () {
    var d = { theme: "auto", text: "m", motion: "auto" };
    try { var o = JSON.parse(localStorage.getItem(SETKEY) || "{}"); if (isObj(o)) Object.assign(d, o); } catch (e) { /* storage blocked */ }
    return d;
  })();
  function applySettings() {
    var r = document.documentElement;
    if (SET.theme === "light" || SET.theme === "dark") r.setAttribute("data-theme", SET.theme); else r.removeAttribute("data-theme");
    r.setAttribute("data-text", SET.text === "l" ? "l" : "m");
    if (SET.motion === "reduce") r.setAttribute("data-motion", "reduce"); else r.removeAttribute("data-motion");
  }
  function saveSettings() { try { localStorage.setItem(SETKEY, JSON.stringify(SET)); } catch (e) { /* storage blocked */ } applySettings(); }
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } }
  function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* storage blocked */ } }

  // =============================================================== motion (§9): every JS animation goes through anim()
  var RM = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  function motionOK() { return !(RM && RM.matches) && SET.motion !== "reduce"; }
  function anim(el, kf, opts) {
    if (!el || typeof el.animate !== "function" || !motionOK()) return null;
    try { return el.animate(kf, opts); } catch (e) { return null; }
  }
  var EASE = "cubic-bezier(.2,.7,.2,1)", EASE_IO = "cubic-bezier(.45,0,.25,1)", EASE_BACK = "cubic-bezier(.34,1.45,.64,1)";
  function haptic() { if (motionOK() && navigator.vibrate) { try { navigator.vibrate(12); } catch (e) { /* unsupported */ } } }
  // =============================================================== content
  var META = window.COURSE_META || { title: "מלאכות הבנייה", chapters: [], groups: {} };
  var SOURCES = (window.SOURCES || []).slice();
  var SRC = {}; SOURCES.forEach(function (s) { SRC[s.id] = s; });
  var IMG_BASE = window.SRC_IMG_BASE || "private/src-img/";
  var RAW = (window.COURSE_LESSONS || []).slice();

  var CH = META.chapters.map(function (c, ci) {
    var ls = RAW.filter(function (l) { return l.chapter === c.id; }).sort(function (a, b) { return a.order - b.order; });
    return Object.assign({}, c, { idx: ci, lessons: ls });
  }).filter(function (c) { return c.lessons.length; });
  var HEB = ["א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט", "י", "יא", "יב"];
  CH.forEach(function (c, i) { c.letter = HEB[i]; c.idx = i; });
  var CHID = {}; CH.forEach(function (c) { CHID[c.id] = c; });
  var LESSONS = [];
  CH.forEach(function (c) {
    c.lessons.forEach(function (l, k) { l.ch = c; l.code = c.letter + "." + (k + 1); l.idx = LESSONS.length; LESSONS.push(l); });
  });
  var L = {}; LESSONS.forEach(function (l) { L[l.id] = l; });

  var LIB = (window.LESSONS || []).slice().sort(function (a, b) { return a.num - b.num; });
  var LIBID = {}; LIB.forEach(function (l) { LIBID[l.id] = l; });

  function srcLabel(id) {
    var m = /^rec(\d)-(\d+)$/.exec(id || "");
    if (!m) return id;
    var g = (META.groups || {})["rec" + m[1]];
    return (g ? g.short : "הקלטה " + m[1]) + " · " + (+m[2]);
  }
  function srcChips(list) {
    list = (list || []).filter(Boolean);
    if (!list.length) return "";
    return '<span class="src-chips">' + list.map(function (id) {
      return '<a class="src-chip" href="#source-' + esc(id) + '" title="מעבר לעמוד המקור">' + esc(srcLabel(id)) + "</a>";
    }).join("") + "</span>";
  }

  // terms
  var TERMS = [], TERMID = {};
  LESSONS.forEach(function (l) {
    (l.terms || []).forEach(function (t) {
      var id = uniq("tm-" + strHash(t.he), TERMID);
      var o = Object.assign({ id: id, lesson: l.id, chapter: l.ch.id, enrich: false }, t);
      TERMID[id] = o; TERMS.push(o);
    });
  });
  var seenHe = {}; TERMS.forEach(function (t) { seenHe[t.he] = 1; });
  LIB.forEach(function (l) {
    (l.terms || []).forEach(function (t) {
      if (seenHe[t.term]) return;
      var id = uniq("tm-" + strHash(t.term), TERMID);
      var o = { id: id, he: t.term, en: "", def: t.def, lesson: l.id, lib: true, enrich: true };
      TERMID[id] = o; TERMS.push(o);
    });
  });

  // flashcards
  var CARDS = [], CARD = {};
  function addCard(c) { c.id = uniq(c.id, CARD); CARD[c.id] = c; CARDS.push(c); }
  LESSONS.forEach(function (l) {
    (l.terms || []).forEach(function (t) {
      addCard({ id: l.id + ":t:" + strHash(t.he), lesson: l.id, kind: "term", front: t.he + (t.en ? " · " + t.en : ""), back: t.def, src: t.src, scope: "course" });
    });
    (l.cards || []).forEach(function (c) {
      addCard({ id: l.id + ":c:" + strHash(c.q), lesson: l.id, kind: "q", front: c.q, back: c.a, src: c.src, expl: !!c.expl && !(c.src || []).length, scope: "course" });
    });
  });
  LIB.forEach(function (l) {
    (l.terms || []).forEach(function (t) { addCard({ id: l.id + ":t:" + strHash(t.term), lesson: l.id, kind: "term", front: t.term, back: t.def, scope: "lib" }); });
    (l.cards || []).forEach(function (c) { addCard({ id: l.id + ":c:" + strHash(c.q), lesson: l.id, kind: "q", front: c.q, back: c.a, scope: "lib" }); });
  });

  // questions
  var TYPE_NAME = { mcq: "אמריקאית", tf: "נכון / לא נכון", open: "שאלה פתוחה", match: "התאמה", cloze: "השלמה", compare: "השוואה", scenario: "תרחיש מהשטח", order: "סדר פעולות", identify: "זיהוי בשרטוט" };
  var AUTO_TYPES = { mcq: 1, tf: 1, match: 1, cloze: 1, compare: 1, scenario: 1, order: 1, identify: 1 };
  var QUESTIONS = [], Q = {};
  function addQ(q) { q.id = uniq(q.id, Q); Q[q.id] = q; QUESTIONS.push(q); }
  function lessonDiagrams(l) {
    var ids = [];
    ["full", "deep"].forEach(function (lv) {
      (l[lv] || []).forEach(function (s) { (s.blocks || []).forEach(function (b) { if (b.k === "diagram" && ids.indexOf(b.id) === -1) ids.push(b.id); }); });
    });
    return ids;
  }
  LESSONS.forEach(function (l) {
    (l.questions || []).forEach(function (q) {
      var key = q.q || q.text || JSON.stringify(q.pairs || q.steps || "");
      addQ(Object.assign({}, q, { id: l.id + ":" + q.type + ":" + strHash(key), lesson: l.id, chapter: l.ch.id, scope: "course", difficulty: q.difficulty || 2 }));
    });
    // "identify the component" questions, generated from the labelled teaching diagrams of the lesson
    lessonDiagrams(l).forEach(function (did) {
      var parts = window.Diagrams && window.Diagrams.parts(did);
      if (!parts || parts.length < 3 || (window.Diagrams.quizzable && !window.Diagrams.quizzable(did))) return;
      parts.forEach(function (p) {
        var seed = l.id + "|" + did + "|" + p.n;
        var others = seededShuffle(parts.filter(function (x) { return x.name !== p.name; }), seed).slice(0, 3).map(function (x) { return x.name; });
        if (others.length < 3) return;
        var opts = seededShuffle([p.name].concat(others), seed + "|o");
        addQ({ id: l.id + ":identify:" + strHash(did + p.n), type: "identify", lesson: l.id, chapter: l.ch.id, scope: "course", difficulty: 1,
          diagram: did, marker: p.n, q: "מה מסומן במספר " + p.n + " בשרטוט?", options: opts, answer: opts.indexOf(p.name),
          explain: (p.hint || p.name + ".") , src: window.Diagrams.src(did) });
      });
    });
  });
  LIB.forEach(function (l) {
    (l.quiz || []).forEach(function (q) {
      addQ({ id: l.id + ":q:" + strHash(q.q), type: "mcq", lesson: l.id, lib: true, scope: "lib", enrich: true, difficulty: 2, q: q.q, options: q.options, answer: q.answer, explain: q.explain });
    });
    (l.order || []).forEach(function (o, i) {
      addQ({ id: l.id + ":o:" + i, type: "order", lesson: l.id, lib: true, scope: "lib", enrich: true, difficulty: 2, q: o.title, steps: o.steps, explain: "" });
    });
  });
  var QBYL = {}, CBYL = {};
  QUESTIONS.forEach(function (q) { (QBYL[q.lesson] = QBYL[q.lesson] || []).push(q); });
  CARDS.forEach(function (c) { (CBYL[c.lesson] = CBYL[c.lesson] || []).push(c); });
  function lessonQs(lid) { return QBYL[lid] || []; }
  function lessonCards(lid) { return CBYL[lid] || []; }
  function lessonTitle(lid) { return L[lid] ? L[lid].code + " " + L[lid].title : LIBID[lid] ? "העשרה " + LIBID[lid].num + ": " + LIBID[lid].title : ""; }
  function lessonHref(lid) { return L[lid] ? "#lesson-" + lid : "#lib-" + lid; }

  // =============================================================== new content: chapter extras, cases, plan, media, steps
  var EXTRAS = isObj(window.COURSE_CHAPTER_EXTRAS) ? window.COURSE_CHAPTER_EXTRAS : {};
  function X(chId) { var x = EXTRAS[chId]; return isObj(x) && CHID[chId] ? x : null; }
  function arr(a) { return Array.isArray(a) ? a : []; }
  var CASES = arr(window.COURSE_CASES).filter(function (c) { return c && c.id && Array.isArray(c.steps) && c.steps.length; });
  var CASEID = {}; CASES.forEach(function (c) { CASEID[c.id] = c; });
  var PLAN = isObj(window.COURSE_PLAN) && Array.isArray(window.COURSE_PLAN.days) && window.COURSE_PLAN.days.length ? window.COURSE_PLAN : null;
  var PLAN_N = PLAN ? PLAN.days.length : 0;
  var MEDIA = isObj(window.COURSE_MEDIA) ? window.COURSE_MEDIA : {};
  var MEDIA_BASE = typeof window.MEDIA_BASE === "string" ? window.MEDIA_BASE : "private/";
  // diagram step captions (optional file); read lazily so a late-loaded file still works
  function ANIM(id) { var a = window.COURSE_ANIM; return isObj(a) && isObj(a[id]) && Array.isArray(a[id].steps) && a[id].steps.length ? a[id] : null; }
  function qOK(q) {
    if (!q || !q.type) return false;
    if (q.type === "tf") return typeof q.answer === "boolean" && !!q.q;
    if (q.type === "mcq" || q.type === "compare" || q.type === "scenario" || q.type === "identify") return Array.isArray(q.options) && q.options.length >= 2 && q.answer >= 0 && q.answer < q.options.length;
    if (q.type === "cloze") return typeof q.text === "string" && /\{\{[^}]+\}\}/.test(q.text);
    if (q.type === "match") return Array.isArray(q.pairs) && q.pairs.length >= 2;
    if (q.type === "order") return Array.isArray(q.steps) && q.steps.length >= 2;
    if (q.type === "open") return !!q.q;
    return false;
  }
  // pretest and case questions are reachable by id (the question engine renders them) but never enter practice pools or exams
  var PRETEST = {}, CASEQ = {};
  Object.keys(EXTRAS).forEach(function (ch) {
    var x = X(ch); if (!x) return;
    PRETEST[ch] = arr(x.pretest).map(function (q, i) {
      var o = Object.assign({}, q, { id: "pre:" + ch + ":" + i, lesson: null, chapter: ch, scope: "pretest", difficulty: (q && q.difficulty) || 2 });
      return qOK(o) ? (Q[o.id] = o) : null;
    }).filter(Boolean);
  });
  CASES.forEach(function (c) {
    c.steps.forEach(function (s, i) {
      if (!s || !s.question) return;
      var lid = L[s.lesson] ? s.lesson : null;
      var o = Object.assign({}, s.question, { id: "case:" + c.id + ":" + i, lesson: lid, chapter: lid ? L[lid].ch.id : arr(c.chapters)[0] || "", scope: "case", difficulty: s.question.difficulty || 2 });
      if (!qOK(o)) return;
      Q[o.id] = o;
      if (lid) (CASEQ[lid] = CASEQ[lid] || []).push(o);
    });
  });
  function casesFor(o) {
    return CASES.filter(function (c) { return (o.ch && arr(c.chapters).indexOf(o.ch) !== -1) || (o.lesson && arr(c.lessons).indexOf(o.lesson) !== -1); });
  }

  // =============================================================== state
  var KEY = "melachot-progress-v1";
  function blankPlan() { return { start: "", mode: "", done: {}, shift: 0, carry: null, t: 0 }; }
  function blank() {
    return { v: 3, updatedAt: 0, read: {}, done: {}, cards: {}, qstats: {}, mistakes: {}, order: {}, days: {}, newDay: { d: "", n: 0 },
      bookmarks: {}, exams: [], last: null, lvl: {}, lastLesson: null,
      // v3 (UX spec §3.4): plan, resume-to-section, section reads, pretests, cases, resumable run, celebrations once,
      // one-time hints, and the dates activities were last finished (drives plan auto-ticks)
      plan: blankPlan(), pos: {}, secRead: {}, pretest: {}, cases: {}, activeRun: null, celebrated: {}, seen: {}, acts: {}, auto: null };
  }
  function normalize(o) {
    var b = blank();
    if (!isObj(o)) return b;
    Object.keys(b).forEach(function (k) {
      var v = o[k];
      if (v === undefined || v === null) return;
      if (isObj(b[k]) && !isObj(v)) return;
      if (Array.isArray(b[k]) && !Array.isArray(v)) return;
      b[k] = v;
    });
    b.plan = Object.assign(blankPlan(), isObj(o.plan) ? o.plan : {});
    if (!isObj(b.plan.done)) b.plan.done = {};
    if (typeof b.plan.start !== "string" || (b.plan.start && !/^\d{4}-\d{2}-\d{2}$/.test(b.plan.start))) b.plan.start = "";
    if (typeof b.plan.shift !== "number" || !isFinite(b.plan.shift)) b.plan.shift = 0;
    if (!isObj(b.activeRun) || !Array.isArray(b.activeRun.items)) b.activeRun = null;
    if (!isObj(b.auto)) b.auto = null;
    // a damaged store (hand edits, an old bug, a partial cloud write) must never break a view: drop malformed entries
    ["cards", "qstats", "bookmarks", "pos", "cases", "pretest", "order"].forEach(function (k) {
      Object.keys(b[k]).forEach(function (id) { if (!isObj(b[k][id])) delete b[k][id]; });
    });
    Object.keys(b.bookmarks).forEach(function (id) { var x = b.bookmarks[id]; if (typeof x.lesson !== "string" || typeof x.anchor !== "string") delete b.bookmarks[id]; });
    ["done", "read", "secRead", "celebrated", "seen", "mistakes", "days", "lvl", "acts"].forEach(function (k) {
      Object.keys(b[k]).forEach(function (id) { var v = b[k][id]; if (v === null || typeof v === "object") delete b[k][id]; });
    });
    b.exams = b.exams.filter(function (e) { return isObj(e) && e.id; });
    if (!isObj(b.last) || typeof b.last.lesson !== "string") b.last = null;
    if (!isObj(b.newDay)) b.newDay = { d: "", n: 0 };
    b.v = 3;
    return b;
  }
  function loadLocal() {
    try { var raw = localStorage.getItem(KEY); if (raw) return normalize(JSON.parse(raw)); } catch (e) { /* storage blocked or bad JSON */ }
    return blank();
  }
  var S = loadLocal();
  function save() {
    S.updatedAt = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage blocked */ }
    cloud.schedule();
  }
  function newerOf(a, b, f) { return (a[f] && b[f]) ? ((a[f].t || 0) >= (b[f].t || 0) ? a[f] : b[f]) : (a[f] || b[f]); }
  function mergeByT(x, y, fld) {
    var m = Object.assign({}, x);
    Object.keys(y || {}).forEach(function (id) { var p = m[id], q = y[id]; if (!p || (q && (q[fld] || 0) > (p[fld] || 0))) m[id] = q; });
    return m;
  }
  function maxMap(x, y) {
    var m = Object.assign({}, x);
    Object.keys(y || {}).forEach(function (k) { if (m[k] === undefined || y[k] > m[k]) m[k] = y[k]; });
    return m;
  }
  function merge(a, b) {
    a = normalize(a); b = normalize(b);
    var newer = (a.updatedAt || 0) >= (b.updatedAt || 0) ? a : b;
    var m = blank();
    m.updatedAt = Math.max(a.updatedAt || 0, b.updatedAt || 0);
    m.read = Object.assign({}, a.read, b.read);
    m.done = Object.assign({}, a.done, b.done);
    m.mistakes = Object.assign({}, newer.mistakes);
    m.bookmarks = Object.assign({}, newer.bookmarks);
    m.lvl = Object.assign({}, a.lvl, b.lvl);
    m.cards = mergeByT(a.cards, b.cards, "last");
    m.qstats = mergeByT(a.qstats, b.qstats, "t");
    m.order = mergeByT(a.order, b.order, "t");
    m.days = Object.assign({}, a.days);
    Object.keys(b.days).forEach(function (d) { m.days[d] = Math.max(m.days[d] || 0, b.days[d] || 0); });
    var ex = {}; a.exams.concat(b.exams).forEach(function (e) { ex[e.id] = e; });
    m.exams = Object.keys(ex).map(function (k) { return ex[k]; }).sort(function (x, y) { return y.t - x.t; }).slice(0, 60);
    m.newDay = newer.newDay;
    m.last = newerOf(a, b, "last");
    m.lastLesson = newer.lastLesson;
    // v3: plan / activeRun / auto session = newer wins (plan ticks are unioned); everything else per key
    var np = (a.plan.t || 0) >= (b.plan.t || 0) ? a.plan : b.plan;
    m.plan = Object.assign(blankPlan(), np);
    m.plan.done = {};
    [a.plan.done, b.plan.done].forEach(function (d) { Object.keys(d || {}).forEach(function (day) { m.plan.done[day] = maxMap(m.plan.done[day] || {}, d[day]); }); });
    m.pos = mergeByT(a.pos, b.pos, "t");
    m.secRead = maxMap(a.secRead, b.secRead);
    m.pretest = {};
    Object.keys(Object.assign({}, a.pretest, b.pretest)).forEach(function (ch) {
      var x = a.pretest[ch] || {}, y = b.pretest[ch] || {}, o = {};
      ["pre", "post"].forEach(function (k) { var v = newerOf(x, y, k); if (v) o[k] = v; });
      m.pretest[ch] = o;
    });
    m.cases = mergeByT(a.cases, b.cases, "t");
    m.activeRun = newer.activeRun;
    m.celebrated = maxMap(a.celebrated, b.celebrated);
    m.seen = maxMap(a.seen, b.seen);
    m.acts = maxMap(a.acts, b.acts);
    m.auto = newer.auto;
    return m;
  }
  function act(key) { S.acts[key] = today(); }
  var cloud = {
    ref: null, on: false, timer: null, writing: false, again: false,
    init: function () {
      var self = this;
      if (!window.claude || typeof window.claude.use !== "function") return;
      Promise.all([window.claude.use("db"), window.claude.use("user")]).then(function (r) {
        var db = r[0], user = r[1];
        if (!db || !user) return null;
        return user.id().then(function (uid) {
          if (!uid) return null;
          self.ref = db.doc("data/users/" + uid + "/progress");
          var timeout = new Promise(function (res) { setTimeout(function () { res("timeout"); }, 10000); });
          return Promise.race([self.ref.get(), timeout]);
        });
      }).then(function (snap) {
        if (!snap || snap === "timeout" || !self.ref) return;
        self.on = true;
        if (snap.exists) {
          var body = snap.data();
          if (body && body.p) {
            var before = JSON.stringify(S);
            S = merge(JSON.parse(JSON.stringify(body.p)), S);
            try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage blocked */ }
            if (JSON.stringify(S) !== before && !run) render();
            if ((S.updatedAt || 0) > (body.updatedAt || 0)) self.schedule();
          }
        } else if (S.updatedAt) self.schedule();
        var el = document.getElementById("save-status"); if (el) el.textContent = saveStatusText();
      }).catch(function () { self.ref = null; self.on = false; });
      document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "hidden" && self.timer) { clearTimeout(self.timer); self.flush(); }
      });
    },
    schedule: function () {
      var self = this;
      if (!this.ref || this.timer) return;   // throttle: a write goes out at most 2.5 s after the first unsaved change
      this.timer = setTimeout(function () { self.flush(); }, 2500);
    },
    flush: function () {
      var self = this;
      this.timer = null;
      if (!this.ref) return;
      if (this.writing) { this.again = true; return; }
      this.writing = true;
      this.ref.set({ p: JSON.parse(JSON.stringify(S)), updatedAt: S.updatedAt || Date.now() }).catch(function (e) {
        if (e && (e.code === "invalid_argument" || e.code === "revoked" || e.code === "not_granted")) { self.ref = null; self.on = false; }
      }).then(function () { self.writing = false; if (self.again) { self.again = false; self.schedule(); } });
    }
  };
  function saveStatusText() { return cloud.on ? "ההתקדמות נשמרת בחשבון שלך ועוברת בין מכשירים" : "ההתקדמות נשמרת בדפדפן הזה"; }

  function touchDay() { var k = dayKey(); S.days[k] = (S.days[k] || 0) + 1; }
  function streak() {
    var d = new Date(), n = 0;
    if (!S.days[dayKey(d)]) d.setDate(d.getDate() - 1);
    while (S.days[dayKey(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  // =============================================================== spaced repetition (SM-2, simplified)
  var NEW_PER_DAY = 20;
  function nextState(st, r) {
    st = st ? Object.assign({}, st) : { reps: 0, ivl: 0, ef: 2.5, lapses: 0 };
    st.first = st.first || Date.now();
    if (r === "again") {
      st.reps = 0; st.ivl = 0; st.lapses = (st.lapses || 0) + 1; st.ef = Math.max(1.3, st.ef - 0.2);
      st.due = Date.now() + 10 * 60000;
    } else {
      var ivl;
      if (r === "hard") { ivl = st.reps === 0 ? 1 : Math.max(1, Math.round(st.ivl * 1.2)); st.ef = Math.max(1.3, st.ef - 0.15); }
      else if (r === "good") { ivl = st.reps === 0 ? 1 : st.reps === 1 ? 3 : Math.round(st.ivl * st.ef); }
      else { ivl = st.reps === 0 ? 3 : st.reps === 1 ? 5 : Math.round(st.ivl * st.ef * 1.3); st.ef = st.ef + 0.15; }
      st.ivl = Math.max(1, ivl); st.reps += 1;
      st.due = startOfToday() + st.ivl * DAY;
    }
    st.last = Date.now();
    return st;
  }
  function ivlLabel(st, r) {
    var n = nextState(st, r);
    if (r === "again") return "10 דק׳";
    if (n.ivl === 1) return "מחר";
    if (n.ivl < 30) return n.ivl + " ימים";
    return Math.round(n.ivl / 30) + " חוד׳";
  }
  function isDue(c) { var st = S.cards[c.id]; return !!st && st.due <= Date.now(); }
  function isNew(c) { return !S.cards[c.id]; }
  // P1-5: a lesson's cards unlock when it is completed or at least one of its sections was read (not merely opened)
  function readMap() { var m = {}; Object.keys(S.secRead).forEach(function (k) { m[k.split("|")[0]] = 1; }); return m; }
  function cardOpen(c, rm) { return c.scope === "course" ? !!(S.done[c.lesson] || (rm || readMap())[c.lesson]) : !!S.read[c.lesson]; }
  function newLeftToday() { return S.newDay.d === dayKey() ? Math.max(0, NEW_PER_DAY - S.newDay.n) : NEW_PER_DAY; }
  function pickNew(limit, pool) {
    var rm = readMap();
    return (pool || CARDS).filter(function (c) { return isNew(c) && cardOpen(c, rm); }).slice(0, limit);
  }
  function dueCards(pool) { return (pool || CARDS).filter(isDue); }
  function dailyQueueSize() { return dueCards().length + pickNew(newLeftToday()).length; }

  // =============================================================== completion and mastery (P0-1: never mixed)
  // evidence: auto-graded answers (lesson + its case questions) and reviewed cards
  function evid(lid) {
    var e = { qn: 0, qr: 0, cn: 0, cr: 0, spaced: false };
    lessonQs(lid).concat(CASEQ[lid] || []).forEach(function (q) {
      if (!AUTO_TYPES[q.type]) return;
      var s = S.qstats[q.id]; if (!s) return;
      e.qn++; if (s.last === 1) e.qr++;
    });
    lessonCards(lid).forEach(function (c) {
      var st = S.cards[c.id]; if (!st) return;
      e.cn++;
      if ((st.ivl || 0) >= 3) e.cr++;
      if (st.first ? (st.last || 0) - st.first >= 3 * DAY : st.reps >= 3) e.spaced = true;
    });
    return e;
  }
  function masteryOf(e) {
    if (e.qn < 3 && e.cn < 3) return null;
    var qa = e.qn ? e.qr / e.qn : null, cr = e.cn ? e.cr / e.cn : null;
    if (qa !== null && cr !== null) return 0.6 * qa + 0.4 * cr;
    return qa !== null ? qa : cr;
  }
  function mLevel(m, spaced) { return m === null || m === undefined ? 0 : m < 0.6 ? 1 : m < 0.72 ? 2 : m < 0.85 ? 3 : spaced ? 4 : 3; }
  var MLABEL = ["טרם נבדק", "צריך חיזוק", "בדרך", "בדרך", "שולט"];
  var MTIP_NONE = "עוד אין מספיק תשובות כדי לדעת. תרגלו 3 שאלות או 3 כרטיסיות.";
  function lessonM(lid) { var e = evid(lid), m = masteryOf(e); return { m: m, lv: mLevel(m, e.spaced), e: e }; }
  function chapterM(c) {
    var ms = c.lessons.map(function (l) { return lessonM(l.id); }).filter(function (x) { return x.m !== null; });
    if (!ms.length) return { m: null, lv: 0, n: 0 };
    var m = avg(ms.map(function (x) { return x.m; }));
    return { m: m, lv: mLevel(m, ms.every(function (x) { return x.lv === 4; }) && ms.length === c.lessons.length), n: ms.length };
  }
  // ruler glyph: 4 ticks, filled from the inline start (right in RTL)
  function glyph(x, short) {
    var lv = x.lv || 0, tip = lv ? "שליטה " + pct(x.m) + "%" : MTIP_NONE;
    var ticks = "";
    for (var i = 0; i < 4; i++) { var px = 12 - i * 3.6, h = i === 0 || i === 3 ? 12 : 8; ticks += '<rect x="' + px.toFixed(1) + '" y="' + (12 - h) + '" width="1.8" height="' + h + '" class="' + (i < lv ? "on" : "off") + '"/>'; }
    return '<span class="mg mg-' + lv + '" title="' + esc(tip) + '"' + (short ? ' role="img" aria-label="שליטה: ' + MLABEL[lv] + '"' : "") + '><svg viewBox="0 0 14 12" aria-hidden="true">' + ticks + '</svg>' + (short ? "" : "<span>" + MLABEL[lv] + "</span>") + "</span>";
  }
  function lessonOpened(lid) { return !!(S.pos[lid] || S.lvl[lid] || (S.last && S.last.lesson === lid) || readMap()[lid]); }
  function lessonState(lid) {
    if (S.done[lid]) return lessonM(lid).lv === 4 ? ["master", "שולט"] : ["done", "הושלם"];
    return lessonOpened(lid) ? ["open", "בלמידה"] : ["new", "לא התחיל"];
  }
  function stateChip(lid) { var s = lessonState(lid); return '<span class="chip st-' + s[0] + '">' + (s[0] === "done" || s[0] === "master" ? "✓ " : "") + s[1] + "</span>"; }
  function completion(list) { list = list || LESSONS; var d = list.filter(function (l) { return S.done[l.id]; }).length; return { d: d, n: list.length, p: pct(list.length ? d / list.length : 0) }; }
  function answeredAuto() { return Object.keys(S.qstats).filter(function (id) { var q = Q[id]; return q && AUTO_TYPES[q.type] && (q.scope === "course" || q.scope === "case"); }).length; }
  function readiness() {
    var n = answeredAuto();
    if (n < 40 && !S.exams.length) return null;
    var ms = LESSONS.map(function (l) { return lessonM(l.id); }).filter(function (x) { return x.m !== null; });
    if (!ms.length) return null;
    var m = avg(ms.map(function (x) { return x.m; }));
    return { m: m, lv: mLevel(m, ms.every(function (x) { return x.lv === 4; })), n: n };
  }
  function openMistakes(lid) { return Object.keys(S.mistakes).filter(function (k) { return Q[k] && Q[k].scope === "course" && (!lid || Q[k].lesson === lid); }); }
  // P0-1.4: "to strengthen" only with evidence; never a lesson finished in the last 24h unless its check failed
  function weakLessons(n) {
    var now = Date.now(), td = today();
    return LESSONS.map(function (l) { return { l: l, x: lessonM(l.id), mis: openMistakes(l.id).length }; }).filter(function (o) {
      if (!((o.x.m !== null && o.x.m < 0.6) || o.mis >= 2)) return false;
      if (S.done[o.l.id] && now - S.done[o.l.id] < DAY && S.acts["checkfail:" + o.l.id] !== td) return false;
      return true;
    }).sort(function (a, b) { return (a.x.m === null ? 1 : a.x.m) - (b.x.m === null ? 1 : b.x.m); }).slice(0, n || 99);
  }
  function hasActivity() {
    return !!(Object.keys(S.done).length || Object.keys(S.qstats).length || Object.keys(S.cards).length || Object.keys(S.days).length || S.exams.length || Object.keys(S.pos).length || Object.keys(S.read).length);
  }

  // =============================================================== 14-day plan and today's session (P0-2, §8.3)
  function planOn() { return !!(PLAN && S.plan.mode === "plan" && S.plan.start); }
  // day number for a date key: 0 = not started yet, PLAN_N + 1 = finished
  function planDayFor(k) {
    if (!planOn()) return 0;
    var n = daysBetween(S.plan.start, k) - (S.plan.shift || 0) + 1;
    return n < 1 ? 0 : n > PLAN_N ? PLAN_N + 1 : n;
  }
  function planDayNow() { return planDayFor(today()); }
  function planDate(n) { return addDays(S.plan.start, n - 1 + (S.plan.shift || 0)); }
  function chRefName(ref) { return CHID[ref] ? "פרק " + CHID[ref].letter : L[ref] ? "שיעור " + L[ref].code : ""; }
  function taskTitle(t) {
    switch (t.type) {
      case "lesson": return L[t.ref] ? "לקרוא: " + L[t.ref].code + " " + L[t.ref].title : "שיעור";
      case "cards": return "כרטיסיות: " + (t.ref ? chRefName(t.ref) : "חזרה יומית") + (t.n ? " (" + t.n + ")" : "");
      case "practice": return "תרגול: " + (t.mode === "mistakes" ? "שאלות שטעיתי בהן" : chRefName(t.ref) || "מעורב") + " · " + (t.mode === "mistakes" ? Math.min(15, Math.max(1, t.n || openMistakes().length)) : 10) + " שאלות";
      case "exam": return t.ref && CHID[t.ref] ? "מבחן פרק " + CHID[t.ref].letter : "מבחן כולל";
      case "case": return "מקרה שטח: " + (CASEID[t.ref] ? CASEID[t.ref].title : "");
      case "summary": return "דף סיכום: " + chRefName(t.ref);
      default: return "";
    }
  }
  function taskOK(t) {
    if (!t || !t.type) return false;
    if (t.type === "lesson") return !!L[t.ref];
    if (t.type === "case") return !!CASEID[t.ref];
    if (t.type === "summary") return !!(CHID[t.ref] && X(t.ref));
    if (t.type === "exam") return !t.ref || !!CHID[t.ref];
    if (t.type === "practice") return t.mode === "mistakes" || !!(CHID[t.ref] || L[t.ref]);
    return t.type === "cards";
  }
  // link attributes that open the task in its real flow
  function taskLink(t) {
    switch (t.type) {
      case "lesson": return 'href="#lesson-' + t.ref + '" data-act="resume" data-id="' + t.ref + '"';
      case "cards": return 'href="#review' + (t.ref ? (CHID[t.ref] ? "-ch-" + t.ref : "-" + t.ref) : "") + '"';
      case "practice": return 'href="#run" data-act="start-scope" data-scope="' + (t.mode === "mistakes" ? "mistakes" : (CHID[t.ref] ? "ch:" : "l:") + t.ref) + '"';
      case "exam": return t.ref && CHID[t.ref] ? 'href="#exams" data-act="exam-ch" data-id="' + t.ref + '"' : 'href="#exams" data-act="exam-full"';
      case "case": return 'href="#' + esc(t.ref) + '"';
      case "summary": return 'href="#sheet-' + t.ref + '"';
      default: return 'href="#home"';
    }
  }
  function actAfter(key, since) { var v = S.acts[key]; return !!v && v >= since; }
  // auto-completion: the task is done when its real flow was finished on/after the day it is scheduled for
  function taskAuto(t, since) {
    var isToday = since >= today();
    switch (t.type) {
      case "lesson": return !!S.done[t.ref];
      case "case": return !!(S.cases[t.ref] && S.cases[t.ref].done);
      case "summary": return actAfter("sheet:" + t.ref, since);
      case "exam": return actAfter("exam:" + (t.ref || "full"), since);
      case "cards": return t.ref ? actAfter("cards:" + (CHID[t.ref] ? "ch-" + t.ref : t.ref), since) : actAfter("cards:daily", since) || (isToday && dailyQueueSize() === 0);
      case "practice":
        if (t.mode === "mistakes") return actAfter("practice:mistakes", since) || (isToday && !openMistakes().length);
        return actAfter("practice:" + (CHID[t.ref] ? "ch:" : "l:") + t.ref, since);
      default: return false;
    }
  }
  function planTaskDone(n, i, t) { return !!(S.plan.done[n] && S.plan.done[n][i]) || taskAuto(t, planDate(n)); }
  function planDayTasks(n) {
    var d = PLAN && PLAN.days[n - 1]; if (!d) return [];
    return arr(d.tasks).map(function (t, i) { return Object.assign({}, t, { day: n, idx: i }); }).filter(taskOK);
  }
  function planDayDone(n) { var ts = planDayTasks(n); return ts.length > 0 && ts.every(function (t) { return planTaskDone(n, t.idx, t); }); }
  // auto session (no plan): continue the lesson, due cards (cap 20), open mistakes (cap 10); about 20-30 minutes
  function autoSession() {
    var td = today();
    if (S.auto && S.auto.d === td && Array.isArray(S.auto.tasks)) return S.auto.tasks;
    var tasks = [], total = 0;
    var ct = continueTarget();
    if (ct) {
      var secs = (ct.full || []).length || 1, rm = 0;
      Object.keys(S.secRead).forEach(function (k) { if (k.indexOf(ct.id + "|s-full-") === 0) rm++; });
      var m = Math.max(5, Math.round((ct.est || 10) * Math.max(0.2, 1 - rm / secs)));
      tasks.push({ type: "lesson", ref: ct.id, min: m }); total += m;
    }
    var q = Math.min(20, dailyQueueSize());
    if (q) { var cm = Math.max(1, Math.ceil(q / 3)); tasks.push({ type: "cards", n: q, min: cm }); total += cm; }
    var mis = Math.min(10, openMistakes().length);
    if (mis && total + Math.ceil(mis / 2) <= 35) tasks.push({ type: "practice", mode: "mistakes", n: mis, min: Math.max(1, Math.ceil(mis / 2)) });
    S.auto = { d: td, tasks: tasks };
    return tasks;
  }
  function continueTarget() {
    if (S.last && L[S.last.lesson] && !S.done[S.last.lesson]) return L[S.last.lesson];
    return LESSONS.filter(function (l) { return !S.done[l.id]; })[0] || null;
  }
  // today's list: plan day (+ carried tasks + due cards when the day has no daily review) or the auto session
  function todayTasks() {
    var n = planDayNow(), td = today(), out = [];
    if (n >= 1 && n <= PLAN_N) {
      out = planDayTasks(n).map(function (t) { return Object.assign(t, { done: planTaskDone(n, t.idx, t) }); });
      var c = S.plan.carry;
      var sig = function (t) { return t.type + "|" + (t.ref || "") + "|" + (t.mode || ""); }, have = out.map(sig);
      if (c && c.d === td && c.day >= 1 && c.day < n) planDayTasks(c.day).forEach(function (t) { if (!planTaskDone(c.day, t.idx, t) && have.indexOf(sig(t)) === -1) out.push(Object.assign(t, { done: false, carried: true })); });
      if (!out.some(function (t) { return t.type === "cards" && !t.ref; })) {
        var due = dueCards().length;
        if (due) out.push({ type: "cards", n: due, min: Math.max(1, Math.ceil(due / 3)), extra: true, done: actAfter("cards:daily", td) });
      }
      return { plan: true, n: n, title: PLAN.days[n - 1].title || "יום " + n, tasks: out };
    }
    out = autoSession().filter(taskOK).map(function (t) { return Object.assign({}, t, { done: taskAuto(t, td) }); });
    return { plan: false, n: n, title: "המפגש של היום", tasks: out };
  }
  function missedYesterday() {
    var n = planDayNow();
    if (n < 2 || n > PLAN_N) return 0;
    var c = S.plan.carry;
    if (c && c.d === today()) return 0;
    return planDayDone(n - 1) ? 0 : n - 1;
  }
  // =============================================================== icons
  var I = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>',
    course: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5z"/><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z"/></svg>',
    practice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="1.5"/><path d="m7.5 12.5 3 3 6-7"/></svg>',
    glossary: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/><path d="M9 8h6"/></svg>',
    progress: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    arrowL: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5 8 12l7 7"/></svg>',
    arrowR: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
    spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/></svg>',
    level: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><rect x="6" y="24" width="52" height="16" rx="2"/><rect x="25" y="28" width="14" height="8" rx="4"/><circle cx="32" cy="32" r="2" fill="currentColor"/></svg>'
  };
  var BRAND = '<svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true"><rect x="1" y="1" width="30" height="30" class="hp-bg"/><rect x="1" y="1" width="30" height="22" fill="url(#p-block)"/><rect x="1" y="23" width="30" height="8" class="hp-tape"/><path d="M6 23v4M11 23v2.5M16 23v4M21 23v2.5M26 23v4" stroke="currentColor" stroke-width="1.2"/><rect x="1" y="1" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
  function svgI(d, w) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (w || 2) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + "</svg>"; }
  Object.assign(I, {
    today: svgI('<rect x="3.5" y="5" width="17" height="15.5" rx="1.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="m9 15 2 2 4-4"/>'),
    ref: svgI('<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/><path d="M9 8h6"/>'),
    gear: svgI('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>', 1.8),
    list: svgI('<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01" stroke-width="3"/>'),
    eyeOff: svgI('<path d="M3 3l18 18"/><path d="M10.6 5.1A9.8 9.8 0 0 1 12 5c5.5 0 9 5.5 9 7 0 .7-.8 2.2-2.2 3.6M6.4 6.4C4.3 7.8 3 10 3 12c0 1.5 3.5 7 9 7 1.8 0 3.3-.5 4.6-1.3"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>'),
    expand: svgI('<path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/>'),
    play: svgI('<path d="M7 5v14l11-7z" fill="currentColor"/>'),
    pause: svgI('<path d="M8 5v14M16 5v14" stroke-width="3.2"/>'),
    flag: svgI('<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>'),
    grid: svgI('<rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><rect x="14" y="14" width="6" height="6"/>'),
    cards: svgI('<rect x="3" y="7" width="14" height="13" rx="1.5"/><path d="M7 4h12.5A1.5 1.5 0 0 1 21 5.5V16"/>'),
    doc: svgI('<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h7"/>'),
    exam: svgI('<rect x="5" y="4" width="14" height="17" rx="1.5"/><path d="M9 4V2.5h6V4M9 10h6M9 14h6M9 18h3"/>'),
    hat: svgI('<path d="M4 17h16M6 17a6 6 0 0 1 12 0M12 8V6M9.5 9.5 9 8M14.5 9.5 15 8"/>'),
    sheetI: svgI('<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M8 8h8M8 12h8M8 16h5"/>'),
    minus: svgI('<path d="M5 12h14"/>'),
    plus: svgI('<path d="M12 5v14M5 12h14"/>'),
    warn: svgI('<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>'),
    help: svgI('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17h.01"/>')
  });
  var TASK_ICON = { lesson: "doc", cards: "cards", practice: "practice", exam: "exam", "case": "hat", summary: "sheetI" };

  // =============================================================== shell
  var app = document.getElementById("app");
  document.documentElement.setAttribute("lang", "he");
  document.documentElement.setAttribute("dir", "rtl");
  applySettings();
  app.innerHTML =
    (window.Diagrams ? window.Diagrams.defs : "") +
    '<a class="skip" href="#main" data-act="skip">דילוג לתוכן</a>' +
    '<header class="topbar" id="topbar"><div class="topbar-in">' +
    '<a class="brand" href="#home">' + BRAND + '<span class="brand-name">מלאכות הבנייה</span></a>' +
    '<nav class="nav" id="nav" aria-label="ניווט ראשי">' +
    '<a href="#home" data-nav="home">' + I.today + "<span>היום</span></a>" +
    '<a href="#course" data-nav="course">' + I.course + "<span>קורס</span></a>" +
    '<a href="#practice" data-nav="practice">' + I.practice + '<span>תרגול</span><b class="badge" id="due-badge"></b></a>' +
    '<a href="#glossary" data-nav="ref">' + I.ref + "<span>עיון</span></a>" +
    '<a href="#progress" data-nav="progress">' + I.progress + "<span>התקדמות</span></a>" +
    "</nav>" +
    '<div class="top-actions"><a class="icon-btn" href="#search" aria-label="חיפוש בכל החומר" data-nav="search">' + I.search + "</a>" +
    '<button class="icon-btn" type="button" data-act="settings" aria-label="הגדרות" aria-haspopup="dialog">' + I.gear + "</button></div>" +
    "</div></header>" +
    '<main id="main" tabindex="-1"></main>' +
    '<div class="toast" id="toast" role="status" aria-live="polite" hidden></div>' +
    '<div class="sr-only" id="live" aria-live="polite"></div>';
  var main = document.getElementById("main");
  var topbar = document.getElementById("topbar");
  function setTopbarH() { if (topbar && topbar.offsetHeight) document.documentElement.style.setProperty("--topbar-h", topbar.offsetHeight + "px"); }
  window.addEventListener("resize", setTopbarH);

  var toastTimer = null;
  function toast(msg, html) {
    var t = document.getElementById("toast");
    if (html) t.innerHTML = esc(msg) + " " + html; else t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    // after the fade the text goes too, so a screen reader never finds a stale message
    toastTimer = setTimeout(function () { t.hidden = true; toastTimer = setTimeout(function () { if (t.hidden) t.textContent = ""; }, 300); }, html ? 4200 : 2600);
  }
  function announce(msg) { var l = document.getElementById("live"); if (!l) return; l.textContent = ""; setTimeout(function () { l.textContent = msg; }, 30); }
  function updateBadge() {
    // P2-11: the nav badge counts due reviews only; new cards are part of the daily session
    var n = dueCards().length;
    var b = document.getElementById("due-badge");
    if (b) { b.textContent = n > 0 ? (n > 99 ? "99+" : String(n)) : ""; b.setAttribute("aria-label", n ? n + " כרטיסיות לחזרה" : ""); }
  }

  // =============================================================== sheets / dialogs (role=dialog, focus trap, Esc, focus returns)
  var dlg = null;
  function btnHtml(a) {
    var attrs = Object.keys(a.attrs || {}).map(function (k) { return " " + k + '="' + esc(a.attrs[k]) + '"'; }).join("");
    var cls = "btn" + (a.cls ? " " + a.cls : "");
    return a.href ? '<a class="' + cls + '" href="' + esc(a.href) + '"' + (a.act ? ' data-act="' + a.act + '"' : "") + attrs + ">" + a.label + "</a>"
      : '<button type="button" class="' + cls + '"' + (a.act ? ' data-act="' + a.act + '"' : "") + attrs + ">" + a.label + "</button>";
  }
  function openSheet(o) {
    closeSheet(true);
    var wrap = document.createElement("div");
    var tid = "dlg-t-" + Date.now();
    wrap.className = "dlg-wrap" + (o.full ? " dlg-full" : "") + (o.cls ? " " + o.cls : "");
    wrap.innerHTML = '<div class="dlg-bd" data-act="dlg-close"></div><div class="dlg" role="dialog" aria-modal="true" aria-labelledby="' + tid + '" tabindex="-1">' +
      '<div class="dlg-grab" aria-hidden="true"></div><div class="dlg-head"><h2 id="' + tid + '">' + o.title + "</h2>" +
      '<button type="button" class="icon-btn dlg-x" data-act="dlg-close" aria-label="סגירה">' + I.x + "</button></div>" +
      '<div class="dlg-body">' + (o.body || "") + "</div>" +
      (o.actions && o.actions.length ? '<div class="dlg-actions">' + o.actions.map(btnHtml).join("") + "</div>" : "") + "</div>";
    document.body.appendChild(wrap);
    document.documentElement.classList.add("dlg-open");
    dlg = { el: wrap, opener: o.opener || document.activeElement, onClose: o.onClose };
    var box = wrap.querySelector(".dlg");
    anim(wrap.querySelector(".dlg-bd"), [{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: EASE });
    anim(box, window.innerWidth > 760 ? [{ opacity: 0, transform: "scale(.96)" }, { opacity: 1, transform: "none" }] : [{ transform: "translateY(100%)" }, { transform: "none" }], { duration: 300, easing: EASE });
    var f = (o.focus && wrap.querySelector(o.focus)) || wrap.querySelector(".dlg-actions .btn-primary") || wrap.querySelector(".dlg-actions .btn") || box;
    setTimeout(function () { if (f && f.focus) f.focus({ preventScroll: true }); }, 10);
    return box;
  }
  function closeSheet(silent) {
    if (!dlg) return;
    var d = dlg; dlg = null;
    d.el.remove();
    document.documentElement.classList.remove("dlg-open");
    if (d.onClose) d.onClose();
    // focus goes back to the control that opened the sheet (also after a silent close, if it would otherwise be lost)
    if ((!silent || focusLost()) && d.opener && d.opener.focus && document.contains(d.opener)) d.opener.focus({ preventScroll: true });
  }
  function trapFocus(e) {
    if (!dlg || e.key !== "Tab") return;
    var f = [].filter.call(dlg.el.querySelectorAll("a[href], button:not([disabled]), input, select, textarea, [tabindex='0']"), function (x) { return x.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || !dlg.el.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (document.activeElement === last || !dlg.el.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
  }

  // =============================================================== AI illustrations (P1-6): always badged and captioned
  var AI_PREFIX = "המחשה שנוצרה ב-AI, לא פרט לביצוע";
  function media(key) { var m = MEDIA[key]; return isObj(m) && m.file && !m.hide ? m : null; }
  function chMedia(c) {
    var m = media(c.id); if (m) return m;
    for (var i = 0; i < c.lessons.length; i++) { m = media(c.lessons[i].id); if (m) return m; }
    return null;
  }
  function imgHtml(m, o) {
    o = o || {};
    // cards and thumbnails (≤ 320 CSS px) never need the 1600w file, even on a 3x phone: 640w only
    var cardOnly = o.card && m.small;
    var ss = cardOnly ? "" : (m.small ? MEDIA_BASE + m.small + " 640w, " : "") + MEDIA_BASE + m.file + " 1600w";
    return '<img class="ai-img" src="' + esc(MEDIA_BASE + (m.small && (o.small || cardOnly) ? m.small : m.file)) + '"' + (ss ? ' srcset="' + esc(ss) + '" sizes="' + (o.sizes || "(max-width: 760px) 100vw, 680px") + '"' : "") + ' alt="' + esc((m.alt || "") + (o.card ? " (המחשה שנוצרה ב-AI)" : "")) + '"' +
      (o.eager ? ' loading="eager" fetchpriority="high"' : ' loading="lazy"') + ' decoding="async" data-act="aiimg">';
  }
  function swatchBg(material) { return '<span class="ai-sw" aria-hidden="true">' + window.Diagrams.swatch(material || "general") + "</span>"; }
  function aiFig(m, o) {
    o = o || {};
    var canAnim = m.anim && typeof m.anim === "string";
    return '<figure class="ai-fig' + (o.cls ? " " + o.cls : "") + '"><div class="ai-box">' + swatchBg(o.material) + imgHtml(m, o) +
      '<span class="ai-badge" aria-hidden="true">AI</span>' +
      (canAnim ? '<button type="button" class="ai-anim" data-act="ai-anim" aria-pressed="false" data-gif="' + esc(MEDIA_BASE + m.anim) + '">' + I.play + "<span>הנפשה</span></button>" : "") +
      "</div><figcaption>" + AI_PREFIX + (m.caption ? " · " + esc(m.caption) : "") + (m.warn ? ' <span class="ai-warn">⚠ ' + esc(m.warn) + "</span>" : "") + "</figcaption></figure>";
  }
  function coverHtml(c, o) {
    o = o || {};
    var m = chMedia(c);
    return '<span class="cover">' + swatchBg(c.material) + (m ? imgHtml(m, { card: true, small: true, sizes: o.sizes || "240px" }) + '<span class="ai-badge" aria-hidden="true">AI</span>' : "") + "</span>";
  }
  function checkImgs() {
    main.querySelectorAll("img.ai-img").forEach(function (im) { if (im.complete) { if (im.naturalWidth) im.classList.add("loaded"); else im.classList.add("failed"); } });
  }

  // =============================================================== diagrams (P1-2): fit-to-width, zoom viewer, steppers
  function figDiagram(id, ctx) {
    if (!window.Diagrams.has(id)) return "";
    ctx.fig = (ctx.fig || 0) + 1;
    var a = ANIM(id);
    return '<figure class="dg" data-dg="' + esc(id) + '"><div class="dg-box" data-act="dg-zoom">' + window.Diagrams.render(id) + "</div>" +
      (a ? stepperHtml(id, a) : "") +
      '<figcaption><b>איור ' + esc(ctx.code + "." + ctx.fig) + '</b><span class="dg-t">' + esc(window.Diagrams.title(id)) + '</span><span class="illus">המחשה לימודית, לא פרט לביצוע</span>' +
      '<button type="button" class="dg-zoom" data-act="dg-zoom" aria-label="הגדלה של איור ' + esc(ctx.code + "." + ctx.fig) + '">' + I.expand + "<span>הגדלה</span></button></figcaption></figure>";
  }
  function stepperHtml(id, a) {
    var n = a.steps.length;
    return '<div class="dg-step" data-dg-step="' + esc(id) + '" data-i="0">' +
      '<div class="dg-ctl" role="group" aria-label="שלבי האיור">' +
      '<button type="button" class="btn btn-sm dg-play" data-act="dg-play">' + I.play + "להפעיל</button>" +
      '<button type="button" class="btn btn-sm btn-ghost" data-act="dg-prev" aria-label="שלב קודם">' + I.arrowR + '<span class="lbl-l">שלב קודם</span></button>' +
      '<button type="button" class="btn btn-sm btn-ghost" data-act="dg-next" aria-label="שלב הבא"><span class="lbl-l">שלב הבא</span>' + I.arrowL + "</button>" +
      '<span class="dg-n" dir="ltr">0/' + n + "</span></div>" +
      '<p class="dg-cap" aria-live="polite">' + n + " שלבים. הקישו על ״להפעיל״ או על ״שלב הבא״.</p></div>";
  }
  var dgTimer = null;
  function setStep(box, i) {
    var id = box.getAttribute("data-dg-step"), a = ANIM(id); if (!a) return;
    var n = a.steps.length; i = Math.max(0, Math.min(n, i));
    box.setAttribute("data-i", i);
    var fig = box.closest("figure"), svg = fig && fig.querySelector("svg.drawing");
    box.querySelector(".dg-n").textContent = i + "/" + n;
    var cap = box.querySelector(".dg-cap");
    if (!svg) return;
    svg.querySelectorAll(".pt.hl").forEach(function (g) { g.classList.remove("hl"); });
    if (!i) { svg.classList.remove("stepping"); cap.textContent = n + " שלבים. הקישו על ״להפעיל״ או על ״שלב הבא״."; return; }
    var st = a.steps[i - 1];
    svg.classList.add("stepping");
    arr(st.parts).forEach(function (p) {
      svg.querySelectorAll(".pt-" + p).forEach(function (g) {
        g.classList.add("hl");
        g.querySelectorAll(".flow").forEach(function (path) {
          var len = path.getTotalLength ? path.getTotalLength() : 0;
          if (len) anim(path, [{ strokeDasharray: len + " " + len, strokeDashoffset: len }, { strokeDasharray: len + " " + len, strokeDashoffset: 0 }], { duration: 450, easing: EASE_IO });
        });
      });
    });
    cap.innerHTML = "<b>שלב " + i + ":</b> " + esc(st.t || "") + " " + (Array.isArray(st.src) && st.src.length ? srcChips(st.src) : st.expl ? '<span class="tag-expl">הסבר משלים</span>' : "");
  }
  function stopPlay() { clearInterval(dgTimer); dgTimer = null; }
  function playSteps(box) {
    stopPlay();
    var a = ANIM(box.getAttribute("data-dg-step")); if (!a) return;
    if (!motionOK()) { setStep(box, (+box.getAttribute("data-i") % a.steps.length) + 1); return; }
    setStep(box, 1);
    dgTimer = setInterval(function () {
      var i = +box.getAttribute("data-i");
      if (!document.contains(box) || i >= a.steps.length) { stopPlay(); return; }
      setStep(box, i + 1);
    }, 2200);
  }
  // identify questions: markers sized for the screen (≥ 26px on screen) — §P1-2.2
  function fitMarkers() {
    main.querySelectorAll("svg.drawing.quiz").forEach(function (svg) {
      var vb = svg.viewBox && svg.viewBox.baseVal, w = svg.getBoundingClientRect().width;
      if (!vb || !vb.width || !w) return;
      var r = Math.max(10, 13 / (w / vb.width));
      svg.querySelectorAll(".mk").forEach(function (g) {
        var c = g.querySelector("circle"), t = g.querySelector("text"), on = g.classList.contains("on");
        var rr = on ? r * 1.15 : r;
        c.setAttribute("r", rr.toFixed(1));
        t.style.fontSize = (rr * 1.1).toFixed(1) + "px";
        t.setAttribute("y", (+c.getAttribute("cy") + rr * 0.38).toFixed(1));
        c.style.strokeWidth = (1.6 * r / 10).toFixed(2);
      });
    });
  }
  // full-screen viewer: pinch / drag / double-tap / wheel / keys
  function openViewer(svgHtml, title) {
    var box = openSheet({ title: esc(title || "תרשים"), full: true, cls: "viewer", focus: ".vw",
      body: '<div class="vw" tabindex="0" role="img" aria-label="' + esc(title || "תרשים") + '. גררו כדי לזוז, צבטו או השתמשו בפלוס ומינוס להגדלה"><div class="vw-in">' + svgHtml + "</div></div>" +
        '<div class="vw-bar"><button type="button" class="icon-btn" data-act="vw-z" data-z="out" aria-label="הקטנה">' + I.minus + '</button><button type="button" class="btn btn-sm btn-ghost" data-act="vw-z" data-z="reset">גודל התחלתי</button><button type="button" class="icon-btn" data-act="vw-z" data-z="in" aria-label="הגדלה">' + I.plus + "</button></div>" +
        '<p class="vw-cap">המחשה לימודית, לא פרט לביצוע</p>' + (ssGet("melachot-vw-hint") ? "" : '<p class="vw-hint">צבטו להגדלה, גררו כדי לזוז</p>') });
    ssSet("melachot-vw-hint", "1");
    var vw = box.querySelector(".vw"), inner = box.querySelector(".vw-in");
    var st = { s: 1, x: 0, y: 0 }, pts = {}, last = null, lastTap = 0, pinch = null;
    function W() { return vw.clientWidth; } function H() { return vw.clientHeight; }
    function apply() {
      var cw = W() * st.s, ch = inner.offsetHeight * st.s;
      st.x = cw <= W() ? (W() - cw) / 2 : Math.min(0, Math.max(W() - cw, st.x));
      st.y = ch <= H() ? (H() - ch) / 2 : Math.min(0, Math.max(H() - ch, st.y));
      inner.style.transform = "translate(" + st.x + "px," + st.y + "px) scale(" + st.s + ")";
    }
    function zoomAt(ns, cx, cy) {
      ns = Math.max(1, Math.min(4, ns));
      st.x = cx - (cx - st.x) * ns / st.s; st.y = cy - (cy - st.y) * ns / st.s; st.s = ns; apply();
    }
    vw._zoom = function (z) { if (z === "reset") { st.s = 1.6; st.x = (W() - W() * 1.6) / 2; st.y = 0; apply(); } else zoomAt(st.s * (z === "in" ? 1.3 : 1 / 1.3), W() / 2, H() / 2); };
    function rel(e) { var r = vw.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    vw.addEventListener("pointerdown", function (e) { vw.setPointerCapture(e.pointerId); pts[e.pointerId] = rel(e); last = rel(e); var ks = Object.keys(pts); if (ks.length === 2) { var a = pts[ks[0]], b = pts[ks[1]]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: st.s }; } });
    vw.addEventListener("pointermove", function (e) {
      if (!pts[e.pointerId]) return;
      var p = rel(e); pts[e.pointerId] = p;
      var ks = Object.keys(pts);
      if (ks.length === 2 && pinch) { var a = pts[ks[0]], b = pts[ks[1]]; zoomAt(pinch.s * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d, (a.x + b.x) / 2, (a.y + b.y) / 2); }
      else if (ks.length === 1 && last) { st.x += p.x - last.x; st.y += p.y - last.y; last = p; apply(); }
    });
    function up(e) {
      var p = pts[e.pointerId]; delete pts[e.pointerId];
      if (Object.keys(pts).length < 2) pinch = null;
      var now = Date.now();
      if (p && e.type === "pointerup" && now - lastTap < 300) { zoomAt(st.s > 1.5 ? 1 : 2, p.x, p.y); lastTap = 0; } else lastTap = now;
      last = Object.keys(pts).length ? pts[Object.keys(pts)[0]] : null;
    }
    vw.addEventListener("pointerup", up); vw.addEventListener("pointercancel", up);
    vw.addEventListener("wheel", function (e) { e.preventDefault(); var p = rel(e); zoomAt(st.s * (e.deltaY < 0 ? 1.15 : 1 / 1.15), p.x, p.y); }, { passive: false });
    vw.addEventListener("keydown", function (e) {
      if (e.key === "+" || e.key === "=") { e.preventDefault(); vw._zoom("in"); } else if (e.key === "-") { e.preventDefault(); vw._zoom("out"); }
      else if (/^Arrow/.test(e.key)) { e.preventDefault(); var d = 40; if (e.key === "ArrowLeft") st.x += d; if (e.key === "ArrowRight") st.x -= d; if (e.key === "ArrowUp") st.y += d; if (e.key === "ArrowDown") st.y -= d; apply(); }
    });
    requestAnimationFrame(function () { vw._zoom("reset"); });
  }

  // =============================================================== motion helpers: tapes (M7), stamps (M8)
  function animateTapes() {
    main.querySelectorAll("[data-tk]").forEach(function (t) {
      var key = "tk:" + t.getAttribute("data-tk"), p = +t.getAttribute("data-p"), prev = ssGet(key);
      ssSet(key, String(p));
      if (prev === null || +prev === p || !p) return;
      var i = t.querySelector("i");
      anim(i, [{ transform: "scaleX(" + Math.max(0, Math.min(1, +prev / p)) + ")" }, { transform: "scaleX(1)" }], { duration: 600, easing: EASE });
    });
  }
  // a stamp: animated only the first time its key is celebrated
  function stamp(text, key) {
    var fresh = key && !S.celebrated[key];
    if (fresh) { S.celebrated[key] = Date.now(); }
    return '<div class="stamp' + (fresh && motionOK() ? " stamp-anim" : "") + '" role="img" aria-label="' + esc(text) + '"><span>' + esc(text) + "</span>" + (fresh && motionOK() ? '<i></i><i></i><i></i><i></i><i></i><i></i>' : "") + "</div>";
  }
  // =============================================================== AI helper (optional: only where the viewer offers it)
  var ai = { s: null };
  if (window.claude && typeof window.claude.use === "function") {
    window.claude.use("sample").then(function (s) { ai.s = s || null; if (s) { var h = route(); if (h.indexOf("lesson-") === 0 || h === "search") render(); } }).catch(function () { ai.s = null; });
  }
  function sourceText(ids) {
    return (ids || []).map(function (id) {
      var s = SRC[id]; if (!s) return "";
      var parts = [(s.title || "")].concat((s.blocks || []).map(function (b) { return b.text; }));
      (s.tables || []).forEach(function (t) { parts.push((t.title || "") + " | " + (t.headers || []).join(" | ")); (t.rows || []).forEach(function (r) { parts.push(r.join(" | ")); }); });
      return "[" + id + "]\n" + parts.filter(Boolean).join("\n");
    }).join("\n\n");
  }
  function lessonText(l) {
    var out = [l.code + " " + l.title];
    ["full", "deep"].forEach(function (lv) {
      (l[lv] || []).forEach(function (s) {
        out.push("## " + s.title);
        (s.blocks || []).forEach(function (b) {
          if (b.html) out.push((b.k === "expl" || b.expl ? "(הסבר משלים) " : "") + stripTags(b.html) + (b.src ? " [" + b.src.join(", ") + "]" : ""));
          if (b.k === "table") { out.push((b.title || "") + ": " + (b.head || []).join(" | ")); (b.rows || []).forEach(function (r) { out.push(r.join(" | ")); }); }
        });
      });
    });
    return out.join("\n");
  }
  var AI_TASKS = {
    simple: "הסבר לי בפשטות את נושא השיעור, בשפה יומיומית, בלי לשנות את המשמעות המקצועית. שמור את המונחים המקצועיים וצרף לידם הסבר פשוט.",
    example: "תן לי דוגמה מהשטח (מאתר בנייה) לנושא השיעור. ציין במפורש שהדוגמה היא הסבר משלים ולא מופיעה בחומר, אלא אם היא מופיעה בו.",
    diff: "מה ההבדל בין המושגים הדומים בשיעור הזה? בנה השוואה קצרה בנקודות.",
    quiz: "בחן אותי על הנושא: כתוב 4 שאלות קצרות מבוססות על החומר, ואחרי כל השאלות כתוב את התשובות עם הפניה למקור.",
    again: "לא הבנתי את הנושא. הסבר אותו שוב בשלבים קטנים, צעד אחר צעד, ובסוף שאל שאלה אחת לבדיקת הבנה."
  };
  function aiPrompt(task, l, extra) {
    var ctx = l ? lessonText(l) + "\n\nמקורות:\n" + sourceText(l.sources) : LESSONS.map(function (x) { return x.code + " " + x.title + ": " + (x.summary || ""); }).join("\n") + "\n\n" + SOURCES.filter(function (s) { return !s.duplicate_of; }).map(function (s) { return sourceText([s.id]); }).join("\n\n");
    ctx = ctx.slice(0, 60000);
    return "אתה עוזר לימוד בקורס מלאכות בנייה להנדסאי בניין. ענה בעברית בלבד.\n" +
      "כללים: התבסס רק על חומר הקורס שלמטה. אם המידע לא מופיע בחומר, כתוב במפורש: \"המידע הזה לא מופיע בחומר שסופק\". " +
      "בסוף התשובה כתוב 'מקורות:' ואת מזהי העמודים שבהם השתמשת (למשל rec3-04). " +
      "סמן כל דבר שאינו מהחומר במילים \"(הסבר משלים)\". אל תיתן הנחיות לביצוע הנדסי בפועל, ואל תציג את התשובה כתחליף לתכנון ואישור של מהנדס מוסמך. " +
      "כתוב בפסקאות קצרות ונקודות, בלי Markdown מורכב.\n\n" +
      "המשימה: " + task + (extra ? "\n" + extra : "") + "\n\nחומר הקורס:\n" + ctx;
  }
  function aiFormat(text) {
    return esc(text).replace(/\brec(\d)-(\d+)\b/g, function (m) { return '<a class="src-chip" href="#source-' + m + '">' + esc(srcLabel(m)) + "</a>"; })
      .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").split(/\n{2,}/).map(function (p) { return "<p>" + p.replace(/\n/g, "<br>") + "</p>"; }).join("");
  }
  var aiAbort = null;
  function runAI(outId, prompt) {
    var out = document.getElementById(outId);
    if (!out || !ai.s) return;
    if (aiAbort) { try { aiAbort.abort(); } catch (e) { /* ignore */ } }
    aiAbort = typeof AbortController !== "undefined" ? new AbortController() : null;
    out.hidden = false;
    out.innerHTML = '<p class="muted">חושב…</p>';
    ai.s(prompt, { onText: function (u) { out.innerHTML = aiFormat(u.text); }, signal: aiAbort ? aiAbort.signal : undefined, cache: false }).then(function (r) {
      out.innerHTML = aiFormat(r.text) + '<p class="ai-note">תשובה של עוזר הלימוד, מבוססת על חומר הקורס. בדקו מול עמודי המקור המצוינים.</p>';
    }).catch(function (e) {
      var code = e && e.code;
      if (code === "not_granted") { ai.s = null; out.innerHTML = '<p class="muted">עוזר הלימוד לא זמין כאן.</p>'; }
      else if (code === "rate_limited") out.innerHTML = '<p class="muted">יותר מדי בקשות ברצף. נסו שוב בעוד דקה.</p>';
      else if (e && e.name === "AbortError") { /* replaced by a newer request */ }
      else out.innerHTML = '<p class="muted">לא התקבלה תשובה. נסו שוב.</p>';
    });
  }

  // =============================================================== router
  var pendingScroll = null, pendingResume = null;
  var run = null;      // practice / exam / pretest / case session
  var rev = null;      // flashcard session
  var lastFree = "#home";
  function route() { var h = (location.hash || "#home").slice(1); return h || "home"; }
  function parts() { var h = route(), i = h.indexOf("-"); return { h: h, head: i > -1 ? h.slice(0, i) : h, arg: i > -1 ? h.slice(i + 1) : "" }; }
  var NAV_OF = { home: "home", plan: "home", course: "course", chapter: "course", lesson: "course", lib: "course", pretest: "course",
    practice: "practice", exams: "practice", cards: "practice", run: "practice", review: "practice", cases: "practice", "case": "practice",
    glossary: "ref", sheets: "ref", sheet: "ref", sources: "ref", source: "ref", progress: "progress", search: "search" };
  var FOCUS = { run: 1, review: 1, pretest: 1, "case": 1 };
  var READING = { lesson: 1, lib: 1, glossary: 1, source: 1, chapter: 1, sheet: 1 };
  // keyboard focus is never dropped to <body> by a re-render: the same control (or its closest equivalent) gets it back;
  // after a route change focus goes to the page heading (or <main>) so Tab continues inside the new page
  var booted = false, routing = false;
  var FKEYS = ["data-k", "data-i", "data-id", "data-v", "data-t", "data-n", "data-r", "data-si", "data-pos", "data-lv", "data-target", "data-scope", "data-ch", "data-day", "data-idx", "data-z", "data-task", "data-phase"];
  function cssq(v) { return String(v).replace(/["\\]/g, "\\$&"); }
  function focusKey(el) {
    if (!el || el === document.body || el === document.documentElement || el === main || !el.getAttribute) return null;
    if (el.id) return "#" + (window.CSS && CSS.escape ? CSS.escape(el.id) : el.id);
    var a = el.getAttribute("data-act"); if (!a) return null;
    var s = '[data-act="' + cssq(a) + '"]';
    FKEYS.forEach(function (k) { var v = el.getAttribute(k); if (v !== null) s += "[" + k + '="' + cssq(v) + '"]'; });
    return [s, '[data-act="' + cssq(a) + '"]'];
  }
  function focusLost() { var a = document.activeElement; return !a || a === document.body || a === document.documentElement || !document.contains(a); }
  function focusEl(el) {
    if (!el || !el.focus) return false;
    if (!el.matches("a[href], button, input, select, textarea, [tabindex]")) el.setAttribute("tabindex", "-1");
    try { el.focus({ preventScroll: true }); } catch (e) { return false; }
    return document.activeElement === el;
  }
  function restoreFocus(key) {
    if (!booted || !focusLost()) return;
    var cand = routing ? [] : (typeof key === "string" ? [key] : key || []).concat(["#ab button:not([disabled])", ".q-card [data-act]:not([disabled])"]);
    for (var i = 0; i < cand.length; i++) {
      var el = null; try { el = main.querySelector(cand[i]); } catch (e) { el = null; }
      if (el && !el.disabled && el.getClientRects().length && focusEl(el)) return;
    }
    focusEl(main.querySelector("h1") || main);
  }
  function paint(html) { var key = focusKey(document.activeElement); main.innerHTML = html; post(); restoreFocus(key); }
  function post() { setTopbarH(); animateTapes(); fitMarkers(); checkImgs(); tableRegions(); langParts(); }
  function langParts() {
    main.querySelectorAll('[dir="ltr"]:not([lang])').forEach(function (el) {
      var t = el.textContent; if (/[A-Za-z]{2,}/.test(t) && !/[\u0590-\u05FF]/.test(t)) el.setAttribute("lang", "en");
    });
  }
  // a table that scrolls sideways must be reachable by keyboard (WCAG 2.1.1): a focusable, named region
  function tableRegions() {
    document.querySelectorAll(".tbl-scroll").forEach(function (b) {
      var over = b.scrollWidth > b.clientWidth + 1;
      if (over && !b.hasAttribute("tabindex")) {
        var t = b.querySelector("caption"), sec = b.closest(".cs, section"), h = sec && sec.querySelector("h2");
        var name = ((t && t.textContent.trim()) || (h && h.textContent.trim()) || "טבלה");
        b.setAttribute("tabindex", "0"); b.setAttribute("role", "region"); b.setAttribute("aria-label", name + " (טבלה, אפשר לגלול לצדדים)");
      } else if (!over && b.getAttribute("role") === "region") { b.removeAttribute("tabindex"); b.removeAttribute("role"); b.removeAttribute("aria-label"); }
    });
  }
  var trTimer = null;
  window.addEventListener("resize", function () { clearTimeout(trTimer); trTimer = setTimeout(tableRegions, 200); });
  function render() {
    var r = parts(), head = r.head, arg = r.arg;
    LV = null; SHEETV = null; CHV = null;
    if (!LESSONS.length && !LIB.length) {
      main.innerHTML = '<div class="empty">' + I.level + "<b>החומר לא נטען</b><p>קובצי התוכן לא נמצאו. רעננו את הדף.</p></div>";
      return;
    }
    document.body.classList.toggle("focus", !!FOCUS[head]);
    document.body.classList.toggle("reading", !!READING[head]);
    document.body.classList.remove("nav-hide");
    if (!FOCUS[head]) lastFree = "#" + r.h;
    switch (head) {
      case "plan": viewPlan(); break;
      case "course": viewCourse(); break;
      case "chapter": if (CHID[arg]) viewChapter(CHID[arg]); else viewCourse(); break;
      case "sheet": if (CHID[arg] && X(arg)) viewSheet(CHID[arg]); else viewSheets(); break;
      case "sheets": viewSheets(); break;
      case "pretest": if (CHID[arg] && (PRETEST[arg] || []).length) viewPretest(arg); else viewCourse(); break;
      case "lesson": if (L[arg]) viewLesson(L[arg]); else viewCourse(); break;
      case "lib": if (LIBID[arg]) viewLib(LIBID[arg]); else viewCourse(); break;
      case "practice": viewPracticeHub("practice"); break;
      case "exams": viewPracticeHub("exams"); break;
      case "cards": viewPracticeHub("cards"); break;
      case "cases": viewPracticeHub("cases"); break;
      case "case": if (CASEID["case-" + arg]) viewCase(CASEID["case-" + arg]); else viewPracticeHub("cases"); break;
      case "run": viewRun(); break;
      case "review": viewReview(arg); break;
      case "glossary": viewGlossary(); break;
      case "progress": viewProgress(); break;
      case "sources": viewSources(); break;
      case "source": if (SRC[arg]) viewSource(SRC[arg]); else viewSources(); break;
      case "search": viewSearch(); break;
      default: viewHome();
    }
    var sec = NAV_OF[head] || "home";
    document.querySelectorAll("[data-nav]").forEach(function (a) {
      if (a.getAttribute("data-nav") === sec) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    updateBadge();
  }
  var lastRoute = route();
  window.addEventListener("hashchange", function () {
    var h = route();
    if (h.indexOf("review") === 0 && rev && rev.i >= rev.queue.length) rev = null;
    closeSheet(true); stopPlay();
    var resumeTo = pendingResume && S.pos[pendingResume] ? S.pos[pendingResume].anchor : "";
    routing = true;
    try { render(); } finally { routing = false; }
    var done = false;
    if (pendingScroll) {
      var el = document.getElementById(pendingScroll);
      pendingScroll = null;
      if (el) { openAncestors(el); el.scrollIntoView({ block: "start" }); done = true; }
    } else if (pendingResume) {
      var id = pendingResume; pendingResume = null;
      var sec = resumeTo && document.getElementById(resumeTo);
      if (sec) {
        sec.scrollIntoView({ block: "start" }); done = true;
        var hd = sec.querySelector("h2") || sec;
        hd.classList.add("resume-hl");
        anim(hd, [{ backgroundColor: "color-mix(in srgb, var(--tape) 35%, transparent)" }, { backgroundColor: "transparent" }], { duration: 2000, easing: "linear" });
        setTimeout(function () { hd.classList.remove("resume-hl"); }, 2000);
        toast("ממשיכים מ: " + (hd.textContent || "").replace(/^\S+\s/, "").trim());
      }
    }
    if (!done && h !== lastRoute) window.scrollTo(0, 0);
    if (h !== lastRoute) anim(main, [{ opacity: 0 }, { opacity: 1 }], { duration: 140, easing: EASE });
    lastRoute = h;
  });
  function go(hash) { if (location.hash === hash) { render(); window.scrollTo(0, 0); } else location.hash = hash; }
  function openAncestors(el) { var d = el.closest && el.closest("details"); if (d) d.open = true; }

  // =============================================================== home: "היום" (P0-2)
  function greeting() {
    var h = new Date().getHours();
    return h < 5 ? "לילה טוב" : h < 12 ? "בוקר טוב" : h < 17 ? "צהריים טובים" : h < 21 ? "ערב טוב" : "לילה טוב";
  }
  var obStep = 0;
  function viewHome() {
    checkExpiredRun();
    var pn = planDayNow(), act0 = hasActivity();
    var html = '<div class="home"><div class="home-main">' +
      '<header class="home-head"><span class="eyebrow">' + greeting() + " · " + new Date().toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" }) + "</span>" +
      '<h1 class="display">' + (pn >= 1 && pn <= PLAN_N ? "יום " + pn + " מתוך " + PLAN_N : "היום") + "</h1></header>";
    html += resumeBanners();
    var miss = missedYesterday();
    if (miss) html += missedBanner(miss);
    html += (!S.plan.mode && !act0) ? onboardCard() : todayCard();
    html += "</div><aside class=\"home-side\">" + (act0 ? statsStrip() : "") + (planOn() && pn <= PLAN_N ? planMini(pn) : "") + dashFig() + "</aside></div>";
    html += '<section class="ch-strip-sec" aria-labelledby="chs-h"><div class="section-head"><h2 id="chs-h">הפרקים</h2><a class="link-more" href="#course">כל הקורס</a></div><div class="ch-strip">' + CH.map(chCard).join("") + "</div></section>";
    html += footHtml();
    var before = JSON.stringify(S.celebrated);
    paint(html);
    if (JSON.stringify(S.celebrated) !== before) save();
  }
  function resumeBanners() {
    var h = "", ar = run && !run.finished && (run.mode === "exam" || run.mode === "pretest") ? run : (S.activeRun && !S.activeRun.finished ? S.activeRun : null);
    if (ar) {
      var ex = ar.mode === "exam", left = ex ? ar.limit - (Date.now() - ar.t0) / 1000 : 0;
      h += '<div class="resume"><div class="rs-t"><b>' + (ex ? "מבחן בתהליך: " : "בדיקה מקדימה בתהליך: ") + esc(ar.title) + "</b><span>" + (ex ? "נותרו " + fmtDur(left) + " · " : "") + "שאלה " + (ar.i + 1) + " מתוך " + ar.items.length + "</span></div>" +
        '<button type="button" class="btn btn-resume" data-act="resume-run">' + (ex ? "חזרה למבחן" : "להמשיך") + I.arrowL + "</button></div>";
    }
    if (run && run.finished && run.autoSubmitted && !run.noticeSeen) {
      h += '<div class="resume"><div class="rs-t"><b>הזמן נגמר. המבחן הוגש.</b><span>' + esc(run.title) + " · " + run.scorePct + '%</span></div><a class="btn btn-resume" href="#run">לתוצאות' + I.arrowL + "</a></div>";
    }
    var cs = CASES.map(function (c) { return { c: c, s: S.cases[c.id] }; }).filter(function (o) { return o.s && !o.s.done && (o.s.step > 0 || Object.keys(o.s.answers || {}).length); }).sort(function (a, b) { return (b.s.t || 0) - (a.s.t || 0); })[0];
    if (cs) h += '<div class="resume"><div class="rs-t"><b>מקרה שטח בתהליך: ' + esc(cs.c.title) + "</b><span>שלב " + (caseResumeAt(cs.c, cs.s) + 1) + " מתוך " + cs.c.steps.length + '</span></div><a class="btn btn-resume" href="#' + esc(cs.c.id) + '">להמשיך' + I.arrowL + "</a></div>";
    return h;
  }
  function missedBanner(n) {
    return '<div class="banner"><div class="rs-t"><b>נשארו משימות מאתמול</b><span>יום ' + n + ": " + esc(PLAN.days[n - 1].title || "") + "</span></div>" +
      '<div class="btn-row"><button type="button" class="btn btn-sm" data-act="plan-carry" data-day="' + n + '">להוסיף להיום</button><button type="button" class="btn btn-sm btn-ghost" data-act="plan-shift">לדחות את התוכנית ביום</button></div></div>';
  }
  function onboardCard() {
    if (obStep === 1 && PLAN) {
      return '<section class="today onboard" aria-labelledby="ob-h"><h2 id="ob-h">מתי מתחילים?</h2><div class="choice-grid">' +
        '<button type="button" class="choice" data-act="ob-start" data-when="0"><b>היום</b><span>יום 1 מתחיל עכשיו</span></button>' +
        '<button type="button" class="choice" data-act="ob-start" data-when="1"><b>מחר</b><span>היום אפשר להציץ בחומר</span></button></div>' +
        '<button type="button" class="linkish" data-act="ob-back">חזרה</button></section>';
    }
    var avgMin = PLAN ? Math.round(avg(PLAN.days.map(function (d) { return d.minutes || 0; }))) : 0;
    return '<section class="today onboard" aria-labelledby="ob-h"><h2 id="ob-h">ברוכים הבאים</h2>' +
      "<p>" + LESSONS.length + " שיעורים שנכתבו מהשקפים של הקורס, ב-" + CH.length + " פרקים, עם תרגול, כרטיסיות ומבחנים. כל עובדה מקושרת לעמוד המקור.</p>" +
      '<h3>איך נוח לכם ללמוד?</h3><div class="choice-grid">' +
      (PLAN ? '<button type="button" class="choice rec" data-act="ob-plan"><b>תוכנית של ' + PLAN_N + ' יום</b><i class="badge-soft">מומלץ</i><span>' + avgMin + " דק׳ ביום בממוצע, משימות מוכנות לכל יום</span></button>" : "") +
      '<button type="button" class="choice" data-act="ob-self"><b>בקצב שלי</b><span>שיעור אחרי שיעור, וחזרה יומית אוטומטית</span></button></div></section>';
  }
  function taskRow(t) {
    var plan = t.day !== undefined, man = plan && !!(S.plan.done[t.day] && S.plan.done[t.day][t.idx]);
    return '<li class="task' + (t.done ? " done" : "") + '"><a class="task-a" ' + taskLink(t) + '><span class="ti" aria-hidden="true">' + (t.done ? I.check : I[TASK_ICON[t.type]] || "") + "</span>" +
      '<span class="tt"><b>' + esc(taskTitle(t)) + "</b>" + (t.note || t.carried ? "<small>" + (t.carried ? "<b class=\"carried\">מאתמול</b>" + (t.note ? " · " : "") : "") + esc(t.note || "") + "</small>" : "") + "</span>" +
      '<span class="tm">' + (t.min ? t.min + " דק׳" : "") + "</span>" + (t.done ? '<span class="sr-only">, הושלם</span>' : "") + "</a>" +
      (plan ? '<button type="button" class="tick" data-act="plan-tick" data-day="' + t.day + '" data-idx="' + t.idx + '" aria-pressed="' + man + '" aria-label="סימון ידני: ' + esc(taskTitle(t)) + '">' + I.check + "</button>" : "") + "</li>";
  }
  function todayCard() {
    var T = todayTasks(), ts = T.tasks, k = ts.length;
    var dn = ts.filter(function (t) { return t.done; }).length, mins = ts.reduce(function (s, t) { return s + (t.min || 0); }, 0);
    var allDone = k > 0 && dn === k, first = ts.filter(function (t) { return !t.done; })[0];
    var html = '<section class="today' + (allDone ? " is-done" : "") + '" aria-labelledby="today-h">' +
      '<div class="today-top"><h2 id="today-h">' + esc(allDone ? "כל המשימות של היום הושלמו" : T.title) + '</h2><span class="meta">' + (k ? k + " משימות · כ-" + mins + " דק׳" : "") + "</span></div>";
    if (planOn() && planDayNow() === 0) html += '<p class="muted small">התוכנית מתחילה ב-' + fmtDay(planDate(1)) + ". עד אז, מפגש לפי הקצב שלכם.</p>";
    if (k) html += '<div class="today-prog">' + tape(pct(dn / k), true, "today-" + today()) + '<span class="mono-n">' + dn + "/" + k + "</span></div>" + '<ol class="tasks">' + ts.map(taskRow).join("") + "</ol>";
    else html += '<p class="muted">אין משימות פתוחות להיום. אפשר לחזור על כרטיסיות או לתרגל.</p>';
    if (allDone || !k) {
      html += (allDone ? stamp("היום הושלם", "day:" + today()) : "") + '<div class="btn-row"><button type="button" class="btn" data-act="more-cards">עוד 10 כרטיסיות</button><button type="button" class="btn" data-act="quick-practice">תרגול חופשי · 10 שאלות</button></div>';
    } else if (first) html += '<a class="btn btn-primary btn-cta" ' + taskLink(first) + ">" + (dn ? "להמשיך" : "להתחיל") + I.arrowL + "</a>";
    if (planOn() && T.plan) html += '<a class="link-more" href="#plan">כל התוכנית</a>';
    return html + "</section>";
  }
  function statsStrip() {
    var c = completion(), due = dueCards().length, sk = streak();
    var d = new Date(); d.setDate(d.getDate() - d.getDay());
    var ticks = "", td = today();
    var wk = 0;
    for (var i = 0; i < 7; i++) { var k = dayKey(d); if (S.days[k]) wk++; ticks += '<i class="' + (S.days[k] ? "on" : "") + (k === td ? " now" : "") + '"></i>'; d.setDate(d.getDate() + 1); }
    return '<div class="stat-strip">' +
      '<div class="st-tile"><span class="k">רצף</span><span class="v">' + sk + "<small>" + (sk === 1 ? "יום" : "ימים") + '</small></span><span class="week" role="img" aria-label="ימי למידה השבוע: ' + wk + ' מתוך 7">' + ticks + "</span></div>" +
      '<div class="st-tile"><span class="k">שיעורים</span><span class="v">' + c.d + "<small>/" + c.n + "</small></span>" + tape(c.p, true, "home-done") + "</div>" +
      '<a class="st-tile" href="#review"><span class="k">כרטיסיות</span><span class="v">' + due + "<small>לחזרה</small></span></a></div>";
  }
  function planTicks(pn) {
    var h = "";
    for (var n = 1; n <= PLAN_N; n++) h += '<i class="' + (planDayDone(n) ? "on" : "") + (n === pn ? " now" : "") + '" title="יום ' + n + '"></i>';
    return '<span class="plan-ticks" role="img" aria-label="' + PLAN_N + " ימים, " + Array.apply(null, Array(PLAN_N)).filter(function (_, i) { return planDayDone(i + 1); }).length + ' הושלמו">' + h + "</span>";
  }
  function planMini(pn) { return '<a class="plan-mini" href="#plan"><span class="k">תוכנית ' + PLAN_N + " יום</span>" + planTicks(pn) + "<small>" + (pn ? "יום " + pn + " מתוך " + PLAN_N : "מתחילה ב-" + fmtDay(planDate(1))) + "</small></a>"; }
  function dashFig() { var m = media("dashboard"); return m ? aiFig(m, { cls: "dash-fig", material: "concrete", sizes: "(max-width: 980px) 100vw, 320px", small: true }) : ""; }
  function chCard(c) {
    var cp = completion(c.lessons);
    return '<a class="ch-card" href="#chapter-' + c.id + '">' + coverHtml(c) +
      '<span class="cc-body"><span class="num">' + esc(c.letter) + '</span><span class="cc-t"><b>' + esc(c.title) + "</b><small>" + cp.d + "/" + cp.n + " שיעורים</small></span></span>" +
      tape(cp.p, true, "chc-" + c.id) + '<span class="cc-sw" aria-hidden="true">' + window.Diagrams.swatch(c.material || "general") + "</span></a>";
  }
  function footHtml() {
    return '<footer class="foot"><span>תוכן מסומן "מקור" נלקח מעמודי הקורס שסיפקת. "הסבר משלים" נוסף כדי להקל על ההבנה. המחשות ותמונות AI הן לימודיות בלבד ואינן פרט לביצוע. המחייב באתר הוא התכנון המאושר והמהנדס.</span>' +
      '<span id="save-status">' + saveStatusText() + "</span></footer>";
  }

  // =============================================================== plan (§8.3)
  function viewPlan() {
    if (!PLAN) { paint('<div class="empty">' + I.level + "<b>אין תוכנית לימוד</b><p>קובץ התוכנית לא נטען.</p></div>"); return; }
    var on = planOn(), pn = planDayNow();
    var html = '<nav class="crumbs" aria-label="מיקום"><a href="#home">היום</a><span aria-hidden="true">/</span><span>תוכנית</span></nav>' +
      '<div class="page-head"><span class="eyebrow">תוכנית לימוד</span><h1 class="display">' + esc(PLAN.title || "תוכנית 14 יום") + "</h1>" + (PLAN.intro ? '<p class="muted lead">' + esc(PLAN.intro) + "</p>" : "") + "</div>";
    if (!on) html += '<div class="panel plan-start"><p>התוכנית מתזמנת שיעורים, כרטיסיות, תרגול, מקרי שטח ומבחנים לכל יום. אפשר לסמן משימה גם ידנית.</p><div class="btn-row"><button type="button" class="btn btn-primary" data-act="ob-start" data-when="0">להתחיל את התוכנית</button><button type="button" class="btn" data-act="ob-start" data-when="1">להתחיל מחר</button></div></div>';
    else html += '<div class="panel plan-status"><b>' + (pn === 0 ? "התוכנית מתחילה ב-" + fmtDay(planDate(1)) : pn > PLAN_N ? "התוכנית הסתיימה. בהצלחה במבחן." : "התחלתם ב-" + fmtDay(S.plan.start) + " · יום " + pn + " מתוך " + PLAN_N) + "</b>" + planTicks(pn) + "</div>";
    var miss = missedYesterday();
    if (miss) html += missedBanner(miss);
    html += '<ol class="plan-days">' + PLAN.days.map(function (d, i) {
      var n = i + 1, ts = planDayTasks(n), done = on && planDayDone(n);
      var st = !on ? "" : done ? ["done", "הושלם"] : n === pn ? ["today", "היום"] : n > pn ? ["later", "בהמשך"] : ["missed", "לא הושלם"];
      var rows = ts.map(function (t) { return taskRow(Object.assign(t, { done: on && planTaskDone(n, t.idx, t) })); }).join("");
      return '<li class="pday' + (st ? " pd-" + st[0] : "") + '"><details' + (n === pn || (!on && n === 1) ? " open" : "") + "><summary>" +
        '<span class="dn display">יום ' + n + '</span><span class="dt"><b>' + esc(d.title || "") + "</b><small>כ-" + (d.minutes || ts.reduce(function (s, t) { return s + (t.min || 0); }, 0)) + " דק׳" + (on ? " · " + fmtDay(planDate(n)) : "") + "</small></span>" +
        (st ? '<span class="chip st-' + st[0] + '">' + st[1] + "</span>" : "") + I.chev + "</summary>" +
        '<ol class="tasks">' + rows + "</ol></details></li>";
    }).join("") + "</ol>";
    if (arr(PLAN.exam_tips).length) html += '<section class="tips" aria-labelledby="tips-h"><h2 id="tips-h">טיפים לבחינה</h2><ul>' + PLAN.exam_tips.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + '</ul><span class="tag-expl">הסבר משלים</span></section>';
    paint(html);
  }

  // =============================================================== course (P1-1)
  var openCh = {};
  try { openCh = JSON.parse(localStorage.getItem("melachot-open-ch2") || "{}"); } catch (e) { openCh = {}; }
  function viewCourse() {
    var total = LESSONS.reduce(function (s, l) { return s + (l.est || 10); }, 0);
    var html = '<div class="page-head"><span class="eyebrow">' + LESSONS.length + " שיעורים · " + CH.length + " פרקים · כ-" + Math.round(total / 6) / 10 + ' שעות לימוד</span><h1 class="display">הקורס</h1></div>';
    if (PLAN) {
      var pn = planDayNow();
      html += planOn() ? '<a class="banner banner-link" href="#plan"><span class="rs-t"><b>' + (pn >= 1 && pn <= PLAN_N ? "יום " + pn + " מתוך " + PLAN_N : "תוכנית " + PLAN_N + " יום") + "</b><span>לתוכנית המלאה</span></span>" + I.arrowL + "</a>"
        : '<a class="banner banner-link" href="#plan"><span class="rs-t"><b>רוצים תוכנית? ' + PLAN_N + " יום עד המבחן</b><span>משימות מוכנות לכל יום, עם שיעורים, תרגול ומבחנים</span></span>" + I.arrowL + "</a>";
    }
    html += '<div class="ch-list">' + CH.map(chRow).join("") + "</div>";
    if (LIB.length) {
      html += '<section class="lib-sec"><div class="section-head"><h2>ספריית העשרה</h2><span class="badge-soft">לא מהמצגת</span></div>' +
        '<p class="muted">' + LIB.length + " שיעורים כלליים על מלאכות בניין (טפסנות, ברזל, בטון, טיח, איטום ועוד) שנכתבו לפני שהגיע חומר הקורס. הם אינם מבוססים על עמודי המקור, ולכן מוצגים בנפרד ואינם נכללים במבחנים, אלא אם בוחרים בכך.</p>" +
        '<div class="lib-grid">' + LIB.map(function (l) {
          return '<a class="lib-item" href="#lib-' + l.id + '"><span class="num">' + pad2(l.num) + "</span><span>" + esc(l.title) + "</span>" + (S.read[l.id] ? '<span class="chip st-done">נקרא</span>' : "") + "</a>";
        }).join("") + "</div></section>";
    }
    paint(html);
  }
  function chRow(c) {
    var cp = completion(c.lessons), est = c.lessons.reduce(function (s, l) { return s + (l.est || 10); }, 0), open = !!openCh[c.id];
    return '<section class="ch-row' + (open ? " open" : "") + '" id="ch-' + c.id + '"><div class="ch-row-h">' +
      '<a class="ch-link" href="#chapter-' + c.id + '">' + coverHtml(c, { sizes: "72px" }) + '<span class="ch-letter">' + esc(c.letter) + "</span>" +
      '<span class="ch-title"><b>' + esc(c.title) + "</b><small>" + cp.d + "/" + cp.n + " שיעורים · כ-" + est + " דק׳</small>" + tape(cp.p, true, "chr-" + c.id) + "</span>" + glyph(chapterM(c), true) + "</a>" +
      '<button type="button" class="icon-btn ch-exp" data-act="toggle-ch" data-id="' + c.id + '" aria-expanded="' + open + '" aria-controls="chl-' + c.id + '" aria-label="השיעורים בפרק ' + esc(c.letter) + '">' + I.chev + "</button></div>" +
      '<ol class="lesson-list" id="chl-' + c.id + '"' + (open ? "" : " hidden") + ">" + c.lessons.map(lessonRow).join("") + "</ol></section>";
  }
  function lessonRow(l, next) {
    var m = media(l.id);
    return '<li><a class="lesson-row' + (next === true ? " is-next" : "") + '" href="#lesson-' + l.id + '">' + (m ? '<span class="thumb">' + imgHtml(m, { card: true, small: true, sizes: "48px" }) + '<span class="ai-badge" aria-hidden="true">AI</span></span>' : "") +
      '<span class="code">' + esc(l.code) + '</span><span class="lt"><b>' + esc(l.title) + "</b><small>" + (l.est || 10) + " דק׳ · " + lessonQs(l.id).length + " שאלות" + (next === true ? ' · <span class="next-tag">הבא בתור</span>' : "") + "</small></span>" +
      '<span class="lr-end">' + stateChip(l.id) + glyph(lessonM(l.id), true) + "</span></a></li>";
  }

  // =============================================================== chapter page (P1-1, §8.1)
  function viewChapter(c) {
    var x = X(c.id) || {}, cp = completion(c.lessons), cm = chapterM(c), m = chMedia(c);
    var est = c.lessons.reduce(function (s, l) { return s + (l.est || 10); }, 0);
    var nav = [], body = "";
    function sec(id, label, h) { if (label) nav.push([id, label]); body += '<section class="cs" id="' + id + '">' + h + "</section>"; }
    var html = '<nav class="crumbs" aria-label="מיקום"><a href="#course">קורס</a><span aria-hidden="true">/</span><span>פרק ' + esc(c.letter) + "</span></nav>";
    html += '<header class="ch-head">' + (m ? aiFig(m, { cls: "ch-cover", material: c.material, eager: true, sizes: "(max-width: 760px) 100vw, 680px" }) : '<div class="ch-cover sw" aria-hidden="true">' + window.Diagrams.swatch(c.material || "general") + "</div>") +
      '<div class="chh-main"><span class="eyebrow">פרק ' + esc(c.letter) + " · " + c.lessons.length + " שיעורים · כ-" + est + ' דק׳</span><h1 class="display">' + esc(c.title) + "</h1>" +
      '<div class="chh-prog">' + tape(cp.p, false, "chp-" + c.id) + '<span class="mono-n">' + cp.d + "/" + cp.n + "</span>" + glyph(cm) + "</div></div></header>";
    // hook + big idea (hook is "הסבר משלים" by schema; a big idea without sources is labelled the same way)
    if (x.hook || x.big_idea) {
      body += '<section class="cs cs-intro">' +
        (x.hook ? '<div class="hook"><h2>למה זה חשוב באתר</h2><p>' + esc(x.hook) + '</p><span class="tag-expl">הסבר משלים</span></div>' : "") +
        (x.big_idea ? '<div class="bigidea"><h2>הרעיון המרכזי</h2><p class="bi">' + esc(typeof x.big_idea === "string" ? x.big_idea : x.big_idea.t || "") + "</p>" +
          (isObj(x.big_idea) && arr(x.big_idea.src).length ? srcChips(x.big_idea.src) : '<span class="tag-expl">הסבר משלים</span>') + "</div>" : "") + "</section>";
    }
    body += pretestCard(c);
    var next = c.lessons.filter(function (l) { return !S.done[l.id]; })[0];
    sec("cs-lessons", "שיעורים", '<h2>השיעורים</h2><ol class="lesson-list ch-lessons">' + c.lessons.map(function (l) { return lessonRow(l, l === next); }).join("") + "</ol>");
    if (arr(x.cheatsheet).length) {
      var cs = x.cheatsheet;
      sec("cs-sheet", "דף סיכום", '<div class="cs-h"><h2>דף סיכום</h2><div class="btn-row"><a class="btn btn-sm btn-ghost" href="#sheet-' + c.id + '">מסך מלא</a><button type="button" class="btn btn-sm btn-ghost" data-act="cs-memo" aria-pressed="false">' + I.eyeOff + "לשינון</button></div></div>" +
        cheatList(cs, cs.length > 8) + (cs.length > 8 ? '<button type="button" class="btn btn-sm btn-ghost cs-more" data-act="cs-more">עוד ' + (cs.length - 8) + "</button>" : ""));
    }
    if (isObj(x.compare) && arr(x.compare.head).length) sec("cs-compare", "השוואה", "<h2>השוואה: " + esc(x.compare.title || "") + "</h2>" + compareHtml(x.compare));
    if (arr(x.links).length) sec("cs-links", "קשרים", "<h2>איך הכול מתחבר</h2>" + linksHtml(x.links, c));
    var mns = arr(x.mnemonics).filter(function (mn) { return mn && mn.t; });
    if (mns.length) sec("cs-mn", "לזכור", '<h2>טריקים לזכירה</h2><div class="mn-grid">' + mns.map(function (mn) {
      var l = L[mn["for"]];
      return '<div class="mn"><span class="mn-l">' + (l ? '<a href="#lesson-' + l.id + '">' + esc(l.code + " · " + l.title) + "</a>" : "") + '</span><p>' + esc(mn.t) + '</p><span class="tag-expl">עזר לזכירה · הסבר משלים</span></div>';
    }).join("") + "</div>");
    if (arr(x.traps).length) sec("cs-traps", "מלכודות", '<h2>מלכודות במבחן</h2><p class="muted">בלבולים שחוזרים בשאלות <span class="tag-expl">הסבר משלים</span></p>' + trapsHtml(x.traps));
    var cl = casesFor({ ch: c.id });
    if (cl.length) sec("cs-cases", "מקרי שטח", '<h2>מקרי שטח</h2><div class="case-grid">' + cl.map(caseCard).join("") + "</div>");
    sec("cs-exam", "מבחן", examCard(c, true));
    html += (nav.length > 1 ? '<nav class="ch-nav" aria-label="ניווט בפרק"><div class="ch-nav-in">' + nav.map(function (n) { return '<button type="button" class="chip-nav" data-act="ch-jump" data-target="' + n[0] + '">' + n[1] + "</button>"; }).join("") + "</div></nav>" : "") + '<div class="chp-body">' + body + "</div>";
    paint(html);
    CHV = { ids: nav.map(function (n) { return n[0]; }) };
    // the chapter-complete moment, if it was missed on the result screen
    if (c.lessons.every(function (l) { return S.done[l.id]; }) && !S.celebrated["ch:" + c.id]) setTimeout(function () { if (route() === "chapter-" + c.id && !dlg) maybeChapterDone(c.lessons[0].id); }, 400);
  }
  var CHV = null;
  function cheatList(cs, clip) {
    return '<ol class="cheat' + (clip ? " clip" : "") + '">' + cs.map(function (it) {
      var t = typeof it === "string" ? it : it.t;
      return '<li><span class="ct" data-act="reveal-cs" tabindex="-1">' + esc(t) + "</span> " + (isObj(it) && arr(it.src).length ? srcChips(it.src) : '<span class="tag-expl">הסבר משלים</span>') + "</li>";
    }).join("") + "</ol>";
  }
  function compareHtml(cmp) {
    var head = arr(cmp.head), rows = arr(cmp.rows), n = head.length;
    var tbl = '<div class="tbl-scroll"><table><thead><tr>' + head.map(function (h) { return '<th scope="col">' + esc(h) + "</th>"; }).join("") + "</tr></thead><tbody>" +
      rows.map(function (r) { return "<tr>" + arr(r).map(function (v, i) { return i === 0 ? '<th scope="row">' + esc(v) + "</th>" : "<td>" + esc(v) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table></div>";
    var stack = '<div class="cmp-stack">' + rows.map(function (r) { r = arr(r); return '<div class="cmp-card"><b>' + esc(r[0]) + "</b>" + r.slice(1).map(function (v, i) { return "<span><em>" + esc(head[i + 1] || "") + ":</em> " + esc(v) + "</span>"; }).join("") + "</div>"; }).join("") + "</div>";
    return '<figure class="tbl cmp cols-' + Math.min(n, 9) + '">' + tbl + stack + (arr(cmp.src).length ? '<figcaption class="blk-meta">מקור: ' + srcChips(cmp.src) + "</figcaption>" : '<figcaption class="blk-meta"><span class="tag-expl">הסבר משלים</span></figcaption>') + "</figure>";
  }
  function trapsHtml(traps) { return '<ul class="traps">' + traps.map(function (t) { return "<li>" + I.warn + "<span>" + esc(typeof t === "string" ? t : t.t) + "</span></li>"; }).join("") + "</ul>"; }
  function linkTag(e) { return arr(e.src).length ? srcChips(e.src) : '<span class="tag-expl">הסבר משלים</span>'; }
  function linksHtml(links, c) {
    var groups = {}, order = [];
    links.forEach(function (e) { if (!e || !e.a || !e.b) return; if (!groups[e.a]) { groups[e.a] = []; order.push(e.a); } groups[e.a].push(e); });
    var list = '<div class="links-list">' + order.map(function (a) {
      return '<div class="lg"><a class="chip kw" href="#glossary" data-act="glossary-q" data-q="' + esc(a) + '">' + esc(a) + "</a><ul>" + groups[a].map(function (e) {
        return '<li><b class="lb">↔ ' + esc(e.b) + '</b><span class="rel">' + esc(e.rel || "") + "</span> " + linkTag(e) + "</li>";
      }).join("") + "</ul></div>";
    }).join("") + "</div>";
    return linksGraph(links, c) + list;
  }
  // desktop: node graph (the list stays the accessible source of truth)
  function linksGraph(links, c) {
    var terms = [];
    links.forEach(function (e) { if (!e || !e.a || !e.b) return; [e.a, e.b].forEach(function (t) { if (terms.indexOf(t) === -1) terms.push(t); }); });
    if (terms.length < 3 || terms.length > 24) return "";
    var W = 760, H = 520, cx = W / 2, cy = H / 2, R = 200, pos = {};
    terms.forEach(function (t, i) { var a = -Math.PI / 2 + i * 2 * Math.PI / terms.length; pos[t] = { x: cx + R * Math.cos(a), y: cy + R * 0.82 * Math.sin(a), c: Math.cos(a) }; });
    var edges = links.filter(function (e) { return e && pos[e.a] && pos[e.b]; }).map(function (e) {
      var p = pos[e.a], q = pos[e.b];
      return '<g class="lk-e"><title>' + esc(e.a + " ↔ " + e.b + ": " + (e.rel || "")) + '</title><line x1="' + p.x.toFixed(1) + '" y1="' + p.y.toFixed(1) + '" x2="' + q.x.toFixed(1) + '" y2="' + q.y.toFixed(1) + '"/></g>';
    }).join("");
    var nodes = terms.map(function (t) {
      var p = pos[t], anchor = p.c > 0.3 ? "start" : p.c < -0.3 ? "end" : "middle", dx = p.c > 0.3 ? 10 : p.c < -0.3 ? -10 : 0, dy = Math.abs(p.c) <= 0.3 ? (p.y < cy ? -12 : 20) : 5;
      var label = t.length > 26 ? t.slice(0, 25) + "…" : t;
      return '<g class="lk-n"><circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="6"/><text x="' + (p.x + dx).toFixed(1) + '" y="' + (p.y + dy).toFixed(1) + '" text-anchor="' + anchor + '" direction="ltr">' + esc(label) + "</text></g>";
    }).join("");
    return '<figure class="lk-graph" aria-hidden="true"><svg viewBox="0 0 ' + W + " " + H + '" class="lk-svg"><text x="' + cx + '" y="' + cy + '" text-anchor="middle" class="lk-c">' + esc(c.title) + "</text>" + edges + nodes + "</svg></figure>";
  }
  function pretestCard(c) {
    var qs = PRETEST[c.id] || []; if (!qs.length) return "";
    var p = S.pretest[c.id] || {}, cp = completion(c.lessons), chDone = cp.d === cp.n;
    var h = '<section class="cs pretest-card" id="cs-pre">';
    if (p.post) {
      h += "<h2>בדיקה מקדימה ובדיקה חוזרת</h2>" + prePostBars(p);
    } else if (chDone) {
      h += '<h2>בדיקה חוזרת</h2><p>איפה הייתם ואיפה אתם: ' + qs.length + " שאלות · כ-2 דק׳ · לא נכנס לציון</p>" + (p.pre ? '<p class="muted">בהתחלה: ' + p.pre.score + "/" + p.pre.n + "</p>" : "") +
        '<button type="button" class="btn btn-primary" data-act="pretest" data-ch="' + c.id + '" data-phase="post">לבדיקה החוזרת</button>';
    } else if (p.pre) {
      h += '<h2>מה אתם כבר יודעים?</h2><p>בדיקה מקדימה: <b class="mono-n">' + p.pre.score + "/" + p.pre.n + '</b>. זו נקודת ההתחלה שלכם. בסוף הפרק נבדוק שוב.</p>';
    } else {
      h += '<h2>מה אתם כבר יודעים?</h2><p>' + qs.length + ' שאלות · כ-2 דק׳ · לא נכנס לציון</p><button type="button" class="btn btn-primary" data-act="pretest" data-ch="' + c.id + '" data-phase="pre">לבדיקה מקדימה</button>';
    }
    return h + "</section>";
  }
  function prePostBars(p) {
    var a = p.pre, b = p.post, n = (b || a).n || 1;
    return '<div class="bars prepost">' + (a ? '<div class="bar-row"><span>לפני</span>' + tape(pct(a.score / n), true) + '<span class="mono-n">' + a.score + "/" + a.n + "</span></div>" : "") +
      (b ? '<div class="bar-row"><span>עכשיו</span>' + tape(pct(b.score / n), true, "post-" + b.t) + '<span class="mono-n">' + b.score + "/" + b.n + "</span></div>" : "") + "</div>";
  }
  function lastExamOf(chId) { return S.exams.filter(function (e) { return e.chapter === chId; })[0] || null; }
  function examCard(c, withHead) {
    var n = Math.min(15, poolFor("ch:" + c.id, { auto: true }).length), last = lastExamOf(c.id), traps = arr((X(c.id) || {}).traps).length;
    return (withHead ? "<h2>מבחן הפרק</h2>" : "") + '<div class="exam-card-x"><div><b>מבחן פרק ' + esc(c.letter) + " · " + n + " שאלות · " + Math.ceil(n * 1.5) + " דק׳</b>" +
      "<span>" + (last ? "ציון אחרון: " + last.score + "% · " + fmtDate(last.t) : "עוד לא נבחנתם בפרק הזה") + (traps ? " · לפני המבחן: " + traps + " מלכודות" : "") + "</span></div>" +
      '<button type="button" class="btn btn-primary" data-act="exam-ch" data-id="' + c.id + '"' + (n ? "" : " disabled") + ">להתחיל</button></div>";
  }

  // =============================================================== cheat sheets (עיון › דפי סיכום, #sheet-<id>)
  var SHEETV = null;
  function refTabs(cur) {
    return '<div class="seg-tabs wide" role="tablist" aria-label="עיון">' + [["glossary", "מילון"], ["sheets", "דפי סיכום"], ["sources", "עמודי מקור"]].map(function (t) {
      return '<a role="tab" href="#' + t[0] + '" aria-selected="' + (cur === t[0]) + '">' + t[1] + "</a>";
    }).join("") + "</div>";
  }
  function viewSheets() {
    var html = '<div class="page-head"><h1 class="display">עיון</h1></div>' + refTabs("sheets") +
      '<p class="muted">דף אחד לכל פרק: העובדות החשובות, כל אחת עם עמוד המקור שלה. טוב לחזרה לפני מבחן ולהדפסה.</p><div class="sheet-list">' +
      CH.filter(function (c) { return X(c.id) && arr(X(c.id).cheatsheet).length; }).map(function (c) {
        return '<a class="sheet-item" href="#sheet-' + c.id + '"><span class="num">' + esc(c.letter) + '</span><span class="lt"><b>' + esc(c.title) + "</b><small>" + X(c.id).cheatsheet.length + " עובדות" + (S.acts["sheet:" + c.id] ? " · נקרא" : "") + "</small></span>" + I.arrowL + "</a>";
      }).join("") + "</div>";
    paint(html);
  }
  function viewSheet(c) {
    var x = X(c.id);
    var html = '<nav class="crumbs" aria-label="מיקום"><a href="#sheets">דפי סיכום</a><span aria-hidden="true">/</span><a href="#chapter-' + c.id + '">פרק ' + esc(c.letter) + "</a></nav>" +
      '<article class="cheatsheet"><div class="page-head"><span class="eyebrow">דף סיכום · פרק ' + esc(c.letter) + '</span><h1 class="display">' + esc(c.title) + "</h1>" +
      '<div class="btn-row no-print"><button type="button" class="btn btn-sm btn-ghost" data-act="cs-memo" aria-pressed="false">' + I.eyeOff + 'לשינון</button><button type="button" class="btn btn-sm btn-ghost" data-act="print">הדפסה</button></div></div>' +
      cheatList(arr(x.cheatsheet), false) +
      (isObj(x.compare) && arr(x.compare.head).length ? "<h2>השוואה: " + esc(x.compare.title || "") + "</h2>" + compareHtml(x.compare) : "") +
      (arr(x.traps).length ? '<h2>מלכודות במבחן</h2><p class="muted">בלבולים שחוזרים בשאלות <span class="tag-expl">הסבר משלים</span></p>' + trapsHtml(x.traps) : "") +
      '<p class="muted print-note">כל עובדה מסומנת בעמוד המקור שלה. מה שמסומן "הסבר משלים" נוסף כדי להקל ואינו מהשקפים.</p></article>';
    paint(html);
    SHEETV = { ch: c.id, t0: Date.now() };
    setTimeout(function () { if (SHEETV && SHEETV.ch === c.id && route() === "sheet-" + c.id) { act("sheet:" + c.id); save(); } }, 30000);
  }

  // =============================================================== lesson (P0-3, P0-4, P1-3)
  var LEVELS = [["quick", "הבנה מהירה"], ["full", "לימוד מלא"], ["deep", "עומק הנדסי"]];
  var CLOZE_KEY = "melachot-cloze";
  function clozeOn() { return lsGet(CLOZE_KEY, "0") === "1"; }
  var vgN = 0;
  function blkMeta(src) { return src ? '<div class="blk-meta">מקור: ' + src + "</div>" : ""; }
  function renderBlock(b, ctx) {
    var src = Array.isArray(b.src) ? srcChips(b.src) : "";
    switch (b.k) {
      case "src": return '<div class="blk blk-src"><div class="prose">' + wrapP(b.html) + "</div>" + blkMeta(src) + "</div>";
      case "expl": return '<div class="blk blk-expl"><span class="blk-tag">הסבר משלים</span><div class="prose">' + wrapP(b.html) + "</div></div>";
      case "verify": return verifyGroup([b]);
      case "exam": case "note": case "mistake":
        var lab = { exam: "חשוב למבחן", note: "שים לב", mistake: "טעות נפוצה" }[b.k];
        return '<div class="callout co-' + b.k + '"><span class="co-tag">' + lab + (b.expl ? " · הסבר משלים" : "") + '</span><div class="prose">' + wrapP(b.html) + "</div>" + blkMeta(src) + "</div>";
      case "table":
        return '<figure class="tbl"><div class="tbl-scroll"><table><caption>' + esc(b.title || "") + "</caption><thead><tr>" + (b.head || []).map(function (h) { return '<th scope="col">' + esc(h) + "</th>"; }).join("") + "</tr></thead><tbody>" +
          (b.rows || []).map(function (r) { return "<tr>" + r.map(function (c, i) { var cls = /\[\?\]|לא ברור|לא קריא/.test(c) ? ' class="unclear"' : ""; return i === 0 ? '<th scope="row"' + cls + ">" + esc(c) + "</th>" : "<td" + cls + ">" + esc(c) + "</td>"; }).join("") + "</tr>"; }).join("") +
          "</tbody></table></div>" + (src ? '<figcaption class="blk-meta">מקור: ' + src + "</figcaption>" : "") + "</figure>";
      case "diagram": return figDiagram(b.id, ctx);
      case "image":
        var s = SRC[b.src];
        return '<figure class="src-img"><span class="src-lbl">שקף מהקורס</span><a href="#source-' + esc(b.src) + '"><img loading="lazy" src="' + IMG_BASE + esc(b.src) + '.jpg" alt="' + esc(b.caption || (s && s.title) || "עמוד מקור") + '" data-act="imgfail"></a><figcaption>' + esc(b.caption || "") + " " + srcChips([b.src]) + "</figcaption></figure>";
      default: return b.html ? '<div class="prose">' + wrapP(b.html) + "</div>" : "";
    }
  }
  function verifyGroup(list) {
    var id = "vg-" + (++vgN), n = list.length;
    return '<div class="verify-group"><button type="button" class="vg-head" data-act="vg" aria-expanded="false" aria-controls="' + id + '">' +
      '<span>טעון אימות מול המקור · ' + n + " " + (n === 1 ? "קריאה לא ודאית" : "קריאות לא ודאיות") + "</span>" + I.chev + "</button>" +
      '<div class="vg-body" id="' + id + '" hidden>' + list.map(function (b) {
        var src = Array.isArray(b.src) ? srcChips(b.src) : "";
        return '<div class="blk blk-verify"><div class="prose">' + wrapP(b.html) + "</div>" + (b.note ? '<p class="verify-note">' + esc(b.note) + "</p>" : "") + blkMeta(src) + "</div>";
      }).join("") + "</div></div>";
  }
  // consecutive "הסבר משלים" blocks share one rule and one tag; consecutive "טעון אימות" blocks become one group
  function renderBlocks(blocks, ctx) {
    var out = "", i = 0;
    blocks = blocks || [];
    while (i < blocks.length) {
      var b = blocks[i], run0 = [];
      if (b.k === "expl" || b.k === "verify") {
        while (i < blocks.length && blocks[i].k === b.k) run0.push(blocks[i++]);
        out += b.k === "expl" ? '<div class="blk blk-expl"><span class="blk-tag">הסבר משלים</span>' + run0.map(function (x) { return '<div class="prose">' + wrapP(x.html) + "</div>"; }).join("") + "</div>" : verifyGroup(run0);
        continue;
      }
      out += renderBlock(b, ctx); i++;
    }
    return out;
  }
  function wrapP(h) { h = String(h || ""); return /^\s*<(ul|ol|p)/.test(h) ? h : "<p>" + h + "</p>"; }
  function secNum(l, lv, i) { return lv === "deep" ? l.code + ".ע" + (i + 1) : l.code + "." + (i + 1); }

  var LV = null;   // reading tracker for the open lesson
  function viewLesson(l) {
    var lv = S.lvl[l.id] || (S.done[l.id] ? "full" : "quick");
    var firstVisit = !S.pos[l.id];
    S.last = { lesson: l.id, level: lv, t: Date.now() };
    if (!S.pos[l.id] || S.pos[l.id].level !== lv) S.pos[l.id] = { level: lv, anchor: (S.pos[l.id] && S.pos[l.id].level === lv && S.pos[l.id].anchor) || "", t: Date.now() };
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage blocked */ }
    var prev = LESSONS[l.idx - 1], next = LESSONS[l.idx + 1];
    var qs = lessonQs(l.id), cs = lessonCards(l.id), lm = lessonM(l.id), x = X(l.ch.id);
    var ctx = { code: l.code }, m = media(l.id);
    var html = '<nav class="crumbs" aria-label="מיקום"><a href="#course">קורס</a><span aria-hidden="true">/</span><a href="#chapter-' + l.ch.id + '">פרק ' + esc(l.ch.letter) + ": " + esc(l.ch.title) + '</a><span aria-hidden="true">/</span><span>' + esc(l.code) + "</span></nav>";
    html += '<div class="lesson-wrap"><div class="lesson-main">';
    html += '<header class="lesson-head' + (m ? " has-hero" : "") + '">' + (m ? aiFig(m, { cls: "lh-hero", material: l.ch.material, eager: true }) : '<div class="swatch" aria-hidden="true">' + window.Diagrams.swatch(l.ch.material || "general") + "</div>") +
      '<div class="lh-main"><span class="eyebrow">שיעור ' + esc(l.code) + " · כ-" + (l.est || 10) + " דק׳ · פרק " + esc(l.ch.letter) + ": " + esc(l.ch.title) + "</span><h1>" + esc(l.title) + "</h1>" +
      '<div class="lh-chips">' + stateChip(l.id) + '<span class="chip">' + qs.length + " שאלות</span>" + '<span class="chip">' + cs.length + " כרטיסיות</span>" + glyph(lm) +
      ((l.sources || []).length ? '<details class="src-more"><summary class="chip">' + l.sources.length + " עמודי מקור" + I.chev + "</summary><div>" + srcChips(l.sources) + "</div></details>" : "") +
      "</div></div></header>";
    var obj = l.objectives || [], kw = l.keywords || [];
    if (obj.length || kw.length) {
      html += '<details class="learn"><summary><span>מה לומדים בשיעור · ' + obj.length + " מטרות · " + kw.length + " מונחים</span>" + I.chev + "</summary><div class=\"learn-in\">" +
        (obj.length ? "<h2>מטרות הלמידה</h2><ul>" + obj.map(function (o) { return "<li>" + esc(o) + "</li>"; }).join("") + "</ul>" : "") +
        (kw.length ? '<h2>מילות מפתח</h2><div class="chips kw-chips">' + kw.map(function (k, i) { return '<a class="chip kw' + (i >= 8 ? " kw-x" : "") + '" href="#glossary" data-act="glossary-q" data-q="' + esc(k) + '">' + esc(k) + "</a>"; }).join("") +
          (kw.length > 8 ? '<button type="button" class="chip kw kw-more" data-act="kw-more">+' + (kw.length - 8) + " נוספים</button>" : "") + "</div>" : "") + "</div></details>";
    }
    html += '<div class="level-bar" id="level-bar"><div class="seg-tabs lv-tabs" role="tablist" aria-label="רמת לימוד">' + LEVELS.map(function (z, i) {
      return '<button type="button" role="tab" id="tab-' + z[0] + '" aria-selected="' + (lv === z[0]) + '" aria-label="' + z[1] + ", רמה " + (i + 1) + '" data-act="level" data-lv="' + z[0] + '">' + z[1] + "</button>";
    }).join("") + "</div>" +
      '<button type="button" class="icon-btn lb-btn" data-act="toc" aria-label="תוכן השיעור" aria-haspopup="dialog">' + I.list + "</button>" +
      '<button type="button" class="icon-btn lb-btn" data-act="memo" aria-pressed="' + clozeOn() + '" aria-label="שינון: הסתרת מילות המפתח">' + I.eyeOff + "</button>" +
      '<span class="read-line" aria-hidden="true"><i id="read-i"></i></span></div>';

    var secs = [];
    html += '<div class="lesson-body" role="tabpanel" aria-labelledby="tab-' + lv + '">';
    if (lv === "quick") {
      var qk = l.quick || {};
      secs.push({ id: "s-quick", title: "הבנה מהירה", n: "" });
      html += '<section class="block quick" id="s-quick" aria-labelledby="s-quick-h"><h2 class="sr-only" id="s-quick-h">הבנה מהירה</h2>' +
        quickRow("מה זה?", qk.what) + quickRow("למה משתמשים בזה?", qk.why) + quickRow("איפה רואים את זה באתר?", qk.where) +
        ((qk.exam || []).length ? '<div class="q-row q-exam"><h3>מה חשוב לזכור למבחן</h3><ul>' + qk.exam.map(function (e) { return "<li>" + esc(e) + "</li>"; }).join("") + "</ul></div>" : "") +
        (qk.src ? '<div class="blk-meta">מבוסס על: ' + srcChips(qk.src) + "</div>" : "") +
        '<div class="btn-row"><button type="button" class="btn btn-primary" data-act="level" data-lv="full">ללימוד המלא' + I.arrowL + "</button></div></section>";
    } else {
      (l[lv] || []).forEach(function (s, i) {
        var anchor = "s-" + lv + "-" + (i + 1), bk = S.bookmarks[l.id + "|" + anchor], num = secNum(l, lv, i);
        secs.push({ id: anchor, title: s.title, n: num });
        html += '<section class="block" id="' + anchor + '"><div class="block-head"><h2><span class="sn">' + esc(num) + "</span>" + esc(s.title) + "</h2>" +
          '<button type="button" class="bm' + (bk ? " on" : "") + '" data-act="bookmark" data-lesson="' + l.id + '" data-anchor="' + anchor + '" data-title="' + esc(s.title) + '" aria-pressed="' + !!bk + '" aria-label="סימון לחזרה: ' + esc(s.title) + '">' + I.star + "</button></div>" +
          renderBlocks(s.blocks, ctx) + "</section>";
      });
      if (lv === "deep" && !(l.deep || []).length) html += '<p class="muted panel">לשיעור הזה אין רמת עומק נפרדת.</p>';
      // summary once: only when it says more than the quick "מה זה?"
      if (l.summary && sim(l.summary, (l.quick || {}).what) < 0.8) html += '<details class="block sum-d"><summary><span>סיכום</span>' + I.chev + "</summary><p>" + esc(l.summary) + ' <span class="tag-expl">הסבר משלים</span></p></details>';
    }
    if ((l.remember || []).length) {
      secs.push({ id: "s-rem", title: "נקודות שחובה לזכור", n: "" });
      html += '<section class="block" id="s-rem"><h2>נקודות שחובה לזכור</h2><ul class="remember-list' + (clozeOn() ? " hide" : "") + '">' +
        l.remember.map(function (r, i) {
          var t = typeof r === "string" ? r : r.t;
          return '<li><span class="box">' + (i + 1) + '</span><span class="txt" data-act="reveal">' + esc(t) + (r.src ? " " + srcChips(r.src) : r.expl ? ' <span class="tag-expl">הסבר משלים</span>' : "") + "</span></li>";
        }).join("") + "</ul></section>";
    }
    var mns = x ? arr(x.mnemonics).filter(function (mn) { return mn && mn["for"] === l.id && mn.t; }) : [];
    if (mns.length) html += '<section class="block mn-sec"><h2>טריקים לזכירה</h2>' + mns.map(function (mn) { return '<div class="mn"><p>' + esc(mn.t) + '</p><span class="tag-expl">עזר לזכירה · הסבר משלים</span></div>'; }).join("") + "</section>";
    if ((l.mistakes || []).length) {
      secs.push({ id: "s-mis", title: "טעויות נפוצות", n: "" });
      html += '<section class="block" id="s-mis"><h2>טעויות נפוצות ובלבולים</h2><p class="muted small"><span class="tag-expl">הסבר משלים</span></p><ul class="mistake-list">' + l.mistakes.map(function (r) { return "<li>" + I.x + "<span>" + esc(r) + "</span></li>"; }).join("") + "</ul></section>";
    }
    if (ai.s) {
      html += '<section class="block ai-box"><h2>' + I.spark + ' עוזר לימוד</h2><p class="muted">התשובות מבוססות על חומר השיעור ומציינות את עמודי המקור.</p><div class="btn-row">' +
        '<button type="button" class="btn btn-sm" data-act="ai" data-task="simple">הסבר לי בפשטות</button>' +
        '<button type="button" class="btn btn-sm" data-act="ai" data-task="example">תן לי דוגמה מהשטח</button>' +
        '<button type="button" class="btn btn-sm" data-act="ai" data-task="diff">מה ההבדל בין המושגים?</button>' +
        '<button type="button" class="btn btn-sm" data-act="ai" data-task="quiz">בחן אותי</button>' +
        '<button type="button" class="btn btn-sm" data-act="ai" data-task="again">לא הבנתי, הסבר שוב</button>' +
        '</div><form class="ai-ask" data-act="ai-ask"><label class="sr-only" for="ai-q">שאלה על השיעור</label><input class="input" id="ai-q" placeholder="או שאלו שאלה על השיעור" autocomplete="off"><button class="btn btn-sm btn-primary" type="submit">לשאול</button></form>' +
        '<div class="ai-out" id="ai-out" hidden aria-live="polite"></div></section>';
    }
    // P0-3 end panel
    secs.push({ id: "s-practice", title: "סיכום ותרגול", n: "" });
    var cl = casesFor({ lesson: l.id });
    html += '<section class="endpanel" id="s-practice">' +
      (S.done[l.id] ? '<p class="done-line">' + I.check + "<b>השיעור הושלם · " + fmtDate(S.done[l.id]) + '</b><button type="button" class="linkish" data-act="toggle-done" data-id="' + l.id + '">לבטל סימון</button></p>' : "") +
      "<h2>" + (S.done[l.id] ? "רוצים לבדוק את עצמכם שוב?" : "סיימתם לקרוא?") + "</h2><p>בדיקה קצרה תסמן את השיעור כהושלם ותכניס את הכרטיסיות שלו לחזרה.</p>" +
      '<button type="button" class="btn btn-primary" data-act="start-check" data-id="' + l.id + '">בדיקת הבנה · 5 שאלות · כ-3 דק׳</button>' +
      '<div class="text-btns"><button type="button" class="tbtn" data-act="start-lesson" data-id="' + l.id + '">תרגול מלא (' + qs.length + ")</button>" +
      '<a class="tbtn" href="#review-' + l.id + '">כרטיסיות (' + cs.length + ")</a>" +
      (cl.length ? '<a class="tbtn" href="#' + esc(cl[0].id) + '">מקרה שטח</a>' : "") +
      (x && arr(x.cheatsheet).length ? '<a class="tbtn" href="#sheet-' + l.ch.id + '">דף הסיכום של הפרק</a>' : "") + "</div>" +
      (S.done[l.id] ? "" : '<button type="button" class="linkish" data-act="toggle-done" data-id="' + l.id + '">לסמן כהושלם בלי בדיקה</button>') +
      ((l.related || []).filter(function (r) { return L[r]; }).length ? '<div class="related"><span>שיעורים קשורים:</span>' + l.related.filter(function (r) { return L[r]; }).map(function (r) { return '<a href="#lesson-' + r + '">' + esc(L[r].code + " " + L[r].title) + "</a>"; }).join("") + "</div>" : "") +
      "</section>";
    html += '<div class="pager">' +
      (prev ? '<a class="btn btn-ghost" href="#lesson-' + prev.id + '">' + I.arrowR + "<span>" + esc(prev.code + " " + prev.title) + "</span></a>" : "<span></span>") +
      (next ? '<a class="btn btn-ghost" href="#lesson-' + next.id + '"><span>' + esc(next.code + " " + next.title) + "</span>" + I.arrowL + "</a>" : "<span></span>") +
      "</div></div></div>";
    html += '<aside class="toc-side" aria-label="תוכן השיעור"><b>תוכן השיעור</b><ol>' + secs.map(function (s) { return tocItem(l, s); }).join("") + "</ol></aside></div>";
    paint(html);
    if (clozeOn()) applyCloze(true);
    LV = { lid: l.id, lv: lv, secs: secs, cur: "", saveT: 0 };
    trackReading(true);
    if (firstVisit && !S.seen.legend) setTimeout(function () { if (LV && LV.lid === l.id && !dlg) legendSheet(); }, 450);
  }
  function tocItem(l, s) {
    var read = !!S.secRead[l.id + "|" + s.id];
    return '<li class="' + (read ? "read" : "") + '" data-toc="' + s.id + '"><button type="button" data-act="toc-go" data-target="' + s.id + '"><span class="tn">' + esc(s.n) + "</span><span>" + esc(s.title) + '</span><span class="tk" aria-hidden="true">' + I.check + "</span>" + (read ? '<span class="sr-only">, נקרא</span>' : "") + "</button></li>";
  }
  function quickRow(h, t) { return t ? '<div class="q-row"><h3>' + h + "</h3><p>" + esc(t) + "</p></div>" : ""; }
  function applyCloze(on) {
    main.querySelectorAll(".prose b").forEach(function (b) { b.classList.toggle("cloze", on); b.classList.remove("shown"); if (on) b.setAttribute("tabindex", "0"); else b.removeAttribute("tabindex"); });
    var rl = main.querySelector(".remember-list");
    if (rl) { rl.classList.toggle("hide", on); rl.querySelectorAll(".txt").forEach(function (t) { t.classList.remove("shown"); }); }
  }
  function legendSheet() {
    openSheet({ title: "שלושה סוגי תוכן בשיעור", cls: "legend",
      body: '<ul class="legend-list"><li><span class="lg-k k-src">מקור</span><span>מה שכתוב בשקף, עם מספר העמוד.</span></li>' +
        '<li><span class="lg-k k-expl">הסבר משלים</span><span>הסבר שהוספנו כדי להקל. לא מופיע בשקפים.</span></li>' +
        '<li><span class="lg-k k-ver">טעון אימות</span><span>קריאה לא ודאית של השקף. לא נשאל עליה בתרגול ובמבחנים.</span></li></ul>',
      actions: [{ label: "הבנתי", act: "legend-ok", cls: "btn-primary" }], onClose: function () { if (!S.seen.legend) { S.seen.legend = Date.now(); save(); } } });
  }
  function tocSheet() {
    if (!LV || !L[LV.lid]) return;
    var l = L[LV.lid];
    openSheet({ title: "תוכן השיעור", cls: "toc-sheet", focus: ".toc-list .cur button, .toc-list button",
      body: '<ol class="toc-list">' + LV.secs.map(function (s) { return tocItem(l, s).replace('<li class="', '<li class="' + (LV.cur === s.id ? "cur " : "")); }).join("") + "</ol>" +
        '<button type="button" class="linkish" data-act="legend">' + I.help + " מה אומרים הסימונים מקור, הסבר משלים וטעון אימות?</button>" });
  }
  // reading tracker: section read = its bottom edge crossed under the sticky bars (or page end); resume position; progress line
  function stickyH() { var lb = document.getElementById("level-bar"); return (topbar ? topbar.offsetHeight : 56) + (lb ? lb.offsetHeight : 52); }
  function trackReading(initial) {
    if (!LV) return;
    var top = stickyH(), changed = false, cur = "", atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
    LV.secs.forEach(function (s) {
      var el = document.getElementById(s.id); if (!el) return;
      var r = el.getBoundingClientRect(), key = LV.lid + "|" + s.id;
      if (!cur && r.bottom > top + 8) cur = s.id;
      if (!S.secRead[key] && (r.bottom < top + 4 || (atEnd && r.top < window.innerHeight))) { S.secRead[key] = Date.now(); changed = true; markTocRead(s.id); }
    });
    if (cur && cur !== LV.cur) {
      LV.cur = cur;
      document.querySelectorAll(".toc-side li").forEach(function (li) { li.classList.toggle("cur", li.getAttribute("data-toc") === cur); });
      if (!initial && cur !== "s-practice" && cur !== "s-quick") { S.pos[LV.lid] = { level: LV.lv, anchor: cur, t: Date.now() }; changed = true; }
    }
    var body = main.querySelector(".lesson-body"), ri = document.getElementById("read-i");
    if (body && ri) { var br = body.getBoundingClientRect(); var p = Math.max(0, Math.min(1, (top - br.top) / Math.max(1, br.height - (window.innerHeight - top)))); ri.style.transform = "scaleX(" + p.toFixed(3) + ")"; }
    if (changed && Date.now() - LV.saveT > 1000) { LV.saveT = Date.now(); save(); updateBadge(); }
    else if (changed) { clearTimeout(LV.st); LV.st = setTimeout(function () { save(); updateBadge(); }, 1100); }
  }
  function markTocRead(id) {
    document.querySelectorAll('.toc-side li[data-toc="' + id + '"]').forEach(function (li) {
      li.classList.add("read");
      anim(li.querySelector(".tk"), [{ transform: "scale(.5)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 220, easing: EASE_BACK });
    });
  }

  // enrichment lesson (old format)
  // enrichment lesson (old format)
  function viewLib(l) {
    var html = '<nav class="crumbs" aria-label="מיקום"><a href="#course">קורס</a><span aria-hidden="true">/</span><span>ספריית העשרה</span></nav>' +
      '<div class="enrich-banner"><b>שיעור העשרה, לא מחומר הקורס.</b> נכתב לפי הסילבוס הכללי של מלאכות בניין. ייתכנו הבדלים מהמצגת של המרצה; במקרה כזה, המצגת קובעת.</div>';
    html += '<header class="lesson-head lib-head"><div class="swatch">' + window.Diagrams.swatch(l.material) + '</div><div class="lh-main"><span class="eyebrow">העשרה ' + pad2(l.num) + "</span><h1>" + esc(l.title) + '</h1><p class="summary">' + esc(l.summary) + "</p></div></header>";
    html += '<div class="lesson-body">';
    var ctx = { code: "ה" + l.num };
    (l.sections || []).forEach(function (s, i) {
      html += '<section class="block"><h2><span class="sn">' + l.num + "." + (i + 1) + "</span>" + esc(s.title) + '</h2><div class="prose">' + (s.body || []).map(wrapP).join("") + "</div></section>";
      if (i === 1) (l.diagrams || []).forEach(function (d) { html += '<section class="block">' + renderBlock({ k: "diagram", id: d }, ctx) + "</section>"; });
    });
    html += '<section class="block"><h2>נקודות לזכור</h2><ul class="remember-list">' + (l.remember || []).map(function (r, i) { return '<li><span class="box">' + (i + 1) + '</span><span class="txt">' + esc(r) + "</span></li>"; }).join("") + "</ul></section>";
    html += '<section class="block"><h2>מונחים</h2><dl class="terms-grid">' + (l.terms || []).map(function (t) { return '<div class="term"><dt>' + esc(t.term) + "</dt><dd>" + esc(t.def) + "</dd></div>"; }).join("") + "</dl></section>";
    html += '<section class="practice"><h2>תרגול</h2><div class="btn-row">' +
      '<button type="button" class="btn btn-primary" data-act="start-lesson" data-id="' + l.id + '">בוחן העשרה (' + lessonQs(l.id).length + ")</button>" +
      '<a class="btn" href="#review-' + l.id + '">כרטיסיות</a>' +
      '<button class="btn" data-act="toggle-read" data-id="' + l.id + '">' + (S.read[l.id] ? "נקרא ✓" : "סימון כנקרא") + "</button></div></section></div>";
    paint(html);
  }

  // =============================================================== practice hub (P1-10)
  var cfg = { scope: "mixed", diff: 0, types: {}, count: 15, enrich: false };
  function pracTabs(cur) {
    var tabs = [["practice", "תרגול"], ["cards", "כרטיסיות"], ["exams", "מבחנים"]].concat(CASES.length ? [["cases", "מקרי שטח"]] : []);
    return '<div class="seg-tabs wide" role="tablist" aria-label="תרגול">' + tabs.map(function (t) {
      var due = t[0] === "cards" ? dueCards().length : 0;
      return '<a role="tab" href="#' + t[0] + '" aria-selected="' + (cur === t[0]) + '">' + t[1] + (due ? ' <i class="badge">' + due + "</i>" : "") + "</a>";
    }).join("") + "</div>";
  }
  function viewPracticeHub(tab) {
    var html = '<div class="page-head"><h1 class="display">תרגול</h1></div>' + pracTabs(tab);
    if (tab === "practice") html += practicePanel();
    else if (tab === "exams") html += examsPanel();
    else if (tab === "cases") html += casesPanel();
    else html += cardsPanel();
    paint(html);
  }
  function studiedLessons() { return LESSONS.filter(function (l) { return S.done[l.id] || lessonOpened(l.id); }).map(function (l) { return l.id; }); }
  function practicePanel() {
    var mistakesN = openMistakes().length, studied = studiedLessons().length;
    var html = '<div class="presets">' +
      '<button type="button" class="preset" data-act="quick-practice"><b>תרגול מהיר</b><span>10 שאלות מכל מה שלמדתם · כ-5 דק׳</span></button>' +
      (mistakesN ? '<button type="button" class="preset" data-act="start-scope" data-scope="mistakes"><b>הטעויות שלי</b><span>' + plural(mistakesN, "שאלה אחת", "שאלות") + "</span></button>" : "") +
      '<button type="button" class="preset" data-act="preset-ch"><b>לפי פרק</b><span>' + CH.length + " פרקים · 10 שאלות</span></button>" +
      '<button type="button" class="preset" data-act="preset-type"><b>לפי סוג שאלה</b><span>' + Object.keys(TYPE_NAME).length + " סוגים</span></button>" +
      (CASES.length ? '<a class="preset" href="#cases"><b>מקרי שטח</b><span>' + CASES.length + " סיפורים מהאתר</span></a>" : "") +
      '<a class="preset" href="#exams"><b>מבחן</b><span>מבחן פרק או מבחן כולל</span></a></div>' +
      (studied ? "" : '<p class="muted small">תרגול מהיר מתחיל מהפרק הראשון עד שתפתחו שיעורים.</p>');
    var opts = '<option value="mixed"' + (cfg.scope === "mixed" ? " selected" : "") + ">תרגול מעורב מכל הקורס</option>" +
      '<option value="weak"' + (cfg.scope === "weak" ? " selected" : "") + ">נושאים לחיזוק</option>" +
      '<option value="mistakes"' + (cfg.scope === "mistakes" ? " selected" : "") + ">שאלות שטעיתי בהן (" + mistakesN + ")</option>" +
      CH.map(function (c) { return '<option value="ch:' + c.id + '"' + (cfg.scope === "ch:" + c.id ? " selected" : "") + ">פרק " + esc(c.letter) + ": " + esc(c.title) + "</option>"; }).join("") +
      LESSONS.map(function (l) { return '<option value="l:' + l.id + '"' + (cfg.scope === "l:" + l.id ? " selected" : "") + ">שיעור " + esc(l.code) + ": " + esc(l.title) + "</option>"; }).join("");
    html += '<details class="panel custom"' + (cfg.open ? " open" : "") + ' id="custom"><summary><b>התאמה אישית</b>' + I.chev + '</summary><div class="setup"><p class="muted">במצב תרגול רואים משוב והסבר מיד אחרי כל תשובה.</p>' +
      '<div class="field"><label for="p-scope">מה לתרגל</label><select class="select" id="p-scope">' + opts + "</select></div>" +
      '<div class="field"><span class="lbl" id="p-diff-l">רמת קושי</span><div class="seg" role="group" aria-labelledby="p-diff-l">' +
      [[0, "הכול"], [1, "קל"], [2, "בינוני"], [3, "קשה"]].map(function (d) { return '<button type="button" data-act="p-diff" data-n="' + d[0] + '" aria-pressed="' + (cfg.diff === d[0]) + '">' + d[1] + "</button>"; }).join("") + "</div></div>" +
      '<div class="field"><span class="lbl" id="p-types-l">סוגי שאלות</span><div class="seg" role="group" aria-labelledby="p-types-l">' +
      Object.keys(TYPE_NAME).map(function (t) { return '<button type="button" data-act="p-type" data-t="' + t + '" aria-pressed="' + (!!cfg.types[t]) + '">' + TYPE_NAME[t] + "</button>"; }).join("") +
      '</div><small class="muted">בלי בחירה, כל הסוגים נכללים.</small></div>' +
      '<div class="field"><span class="lbl" id="p-count-l">מספר שאלות</span><div class="seg" role="group" aria-labelledby="p-count-l">' +
      [10, 15, 25, 0].map(function (n) { return '<button type="button" data-act="p-count" data-n="' + n + '" aria-pressed="' + (cfg.count === n) + '">' + (n || "כולן") + "</button>"; }).join("") + "</div></div>" +
      '<label class="check"><input type="checkbox" id="p-enrich"' + (cfg.enrich ? " checked" : "") + "> לכלול גם שאלות מספריית ההעשרה (לא מחומר הקורס)</label>" +
      '<div class="btn-row"><button type="button" class="btn btn-primary" data-act="p-start">להתחיל תרגול</button></div></div></details>';
    return html;
  }
  function poolFor(scope, opts) {
    opts = opts || {};
    var pool = QUESTIONS.filter(function (q) { return opts.enrich || q.scope === "course"; });
    if (scope === "weak") {
      var wl = weakLessons(3).map(function (o) { return o.l.id; });
      if (!wl.length) wl = studiedLessons().slice(-3);
      pool = pool.filter(function (q) { return wl.indexOf(q.lesson) !== -1 || S.mistakes[q.id]; });
    } else if (scope === "mistakes") pool = pool.filter(function (q) { return S.mistakes[q.id]; });
    else if (scope === "quick") {
      var st = studiedLessons(); if (!st.length) st = CH[0] ? CH[0].lessons.map(function (l) { return l.id; }) : [];
      pool = pool.filter(function (q) { return st.indexOf(q.lesson) !== -1; });
    } else if (scope === "untested") {
      var un = LESSONS.filter(function (l) { return lessonM(l.id).m === null && (S.done[l.id] || lessonOpened(l.id)); }).map(function (l) { return l.id; });
      pool = pool.filter(function (q) { return un.indexOf(q.lesson) !== -1; });
    } else if (scope.indexOf("ch:") === 0) pool = pool.filter(function (q) { return q.chapter === scope.slice(3); });
    else if (scope.indexOf("l:") === 0) pool = pool.filter(function (q) { return q.lesson === scope.slice(2); });
    else if (scope.indexOf("t:") === 0) pool = pool.filter(function (q) { return q.type === scope.slice(2); });
    if (opts.diff) pool = pool.filter(function (q) { return q.difficulty === opts.diff; });
    var tsel = Object.keys(opts.types || {}).filter(function (t) { return opts.types[t]; });
    if (tsel.length) pool = pool.filter(function (q) { return tsel.indexOf(q.type) !== -1; });
    if (opts.auto) pool = pool.filter(function (q) { return AUTO_TYPES[q.type]; });
    return pool;
  }
  function scopeTitle(scope) {
    var names = { mixed: "תרגול מעורב", weak: "נושאים לחיזוק", mistakes: "הטעויות שלי", quick: "תרגול מהיר", untested: "שיעורים שטרם נבדקו" };
    if (names[scope]) return names[scope];
    if (scope.indexOf("ch:") === 0 && CHID[scope.slice(3)]) return "תרגול: פרק " + CHID[scope.slice(3)].letter;
    if (scope.indexOf("l:") === 0 && L[scope.slice(2)]) return "תרגול: " + L[scope.slice(2)].title;
    if (scope.indexOf("t:") === 0) return "תרגול: " + (TYPE_NAME[scope.slice(2)] || "");
    return "תרגול";
  }
  function startScope(scope, n) {
    var pool = poolFor(scope, {});
    startRun("practice", scopeTitle(scope), scope === "mistakes" ? shuffle(pool).slice(0, n || 15) : spread(pool, n || 10), lastFree, { scope: scope });
  }
  function spread(pool, n) {
    // pick n questions, spreading across lessons and types
    var by = {};
    shuffle(pool).forEach(function (q) { (by[q.lesson] = by[q.lesson] || []).push(q); });
    var keys = shuffle(Object.keys(by)), out = [], idCap = Math.max(1, Math.ceil(n * 0.15)), idN = 0;
    while (out.length < n && keys.some(function (k) { return by[k].length; })) {
      keys.forEach(function (k) {
        while (out.length < n && by[k].length) {
          var q = by[k].shift();
          if (q.type === "identify") { if (idN >= idCap) continue; idN++; }
          out.push(q); break;
        }
      });
    }
    return out;
  }
  function startRun(mode, title, list, back, extra) {
    if (!list.length) { toast("אין שאלות שמתאימות לבחירה הזו"); return; }
    run = Object.assign({ mode: mode, title: title, back: back || "#practice", route: "#run", i: 0, t0: Date.now(), items: list.map(function (q) { return newItem(q); }) }, extra || {});
    persistRun();
    go(run.route);
  }
  // exams and pretests survive leaving the screen and reloads (S.activeRun); the wall clock keeps running
  function persistRun() {
    if (!run) return;
    if ((run.mode === "exam" || run.mode === "pretest") && !run.finished) { S.activeRun = JSON.parse(JSON.stringify(run)); S.activeRun.t = Date.now(); save(); }
    else if (run.mode === "case") saveCase();
  }
  function restoreActive() {
    if (run || !S.activeRun) return;
    var a = S.activeRun;
    if (!a.items.every(function (it) { return Q[it.id]; })) { S.activeRun = null; save(); return; }
    run = JSON.parse(JSON.stringify(a));
  }
  function checkExpiredRun() {
    restoreActive();
    if (run && run.mode === "exam" && !run.finished && run.limit && run.limit - (Date.now() - run.t0) / 1000 <= 0) {
      run.autoSubmitted = true;
      submitExam(true);
      toast("הזמן נגמר. המבחן הוגש.");
    }
  }

  // =============================================================== exams
  function examsPanel() {
    var rd = readiness();
    var html = '<div class="panel stack"><p>במבחן אין משוב בזמן הפתרון. רואים את הציון, ניתוח הטעויות וההמלצות בסוף. שאלות פתוחות לא נכללות במבחן, ומופיעות בתרגול.</p>' +
      '<div class="exam-grid">' +
      '<button type="button" class="exam-card main" data-act="exam-full"><b>מבחן כולל</b><span>30 שאלות מכל הפרקים · 45 דקות</span>' + (rd ? '<span class="rd">מוכנות למבחן: ' + MLABEL[rd.lv] + " · על סמך " + rd.n + " תשובות</span>" : "") + "</button>" +
      CH.map(function (c) {
        var n = Math.min(15, poolFor("ch:" + c.id, { auto: true }).length), last = lastExamOf(c.id), tr = arr((X(c.id) || {}).traps).length;
        return '<button type="button" class="exam-card" data-act="exam-ch" data-id="' + c.id + '"' + (n ? "" : " disabled") + "><b>פרק " + esc(c.letter) + ": " + esc(c.title) + "</b><span>" + n + " שאלות · " + Math.ceil(n * 1.5) + " דקות</span>" +
          '<span class="ex-last">' + (last ? "אחרון: " + last.score + "% · " + fmtDate(last.t) : "עוד לא נבחנתם") + (tr ? " · " + tr + " מלכודות" : "") + "</span></button>";
      }).join("") + "</div></div>";
    if (PLAN && arr(PLAN.exam_tips).length) html += '<details class="panel tips-d"><summary><b>טיפים לבחינה</b>' + I.chev + '</summary><ul class="tips-l">' + PLAN.exam_tips.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + '</ul><span class="tag-expl">הסבר משלים</span></details>';
    html += '<div class="section-head"><h2>היסטוריית מבחנים</h2></div>';
    html += S.exams.length ? '<div class="tbl-scroll panel"><table class="hist"><thead><tr><th scope="col">תאריך</th><th scope="col">מבחן</th><th scope="col">ציון</th><th scope="col">זמן</th></tr></thead><tbody>' +
      S.exams.slice(0, 20).map(function (e) { return "<tr><td>" + fmtDate(e.t) + "</td><td>" + esc(e.title) + '</td><td class="num" dir="ltr">' + e.score + '%</td><td class="num">' + fmtDur(e.dur) + "</td></tr>"; }).join("") + "</tbody></table></div>"
      : '<p class="muted">עדיין אין מבחנים שמורים.</p>';
    return html;
  }
  function startExam(title, list, minutes, meta) {
    startRun("exam", title, list, lastFree === "#run" ? "#exams" : lastFree, Object.assign({ limit: minutes * 60 }, meta));
  }
  function startChapterExam(ec) {
    var ql = spread(poolFor("ch:" + ec, { auto: true }), 15);
    startExam("מבחן פרק " + CHID[ec].letter + ": " + CHID[ec].title, ql, Math.ceil(ql.length * 1.5), { kind: "chapter", chapter: ec });
  }
  function examIntro(ec) {
    var tr = arr((X(ec) || {}).traps).slice(0, 4);
    if (!tr.length || S.seen.examIntro) { startChapterExam(ec); return; }
    openSheet({ title: "לפני המבחן", body: "<p>מלכודות שחוזרות בשאלות של פרק " + esc(CHID[ec].letter) + ': <span class="tag-expl">הסבר משלים</span></p>' + trapsHtml(tr) + '<label class="check"><input type="checkbox" id="intro-skip"> אל תציגו שוב</label>',
      actions: [{ label: "להתחיל", act: "exam-ch-go", cls: "btn-primary", attrs: { "data-id": ec } }, { label: "לבטל", act: "dlg-close", cls: "btn-ghost" }] });
  }

  // =============================================================== cards (P1-5)
  function cardsPanel() {
    var due = dueCards().length, nw = pickNew(newLeftToday()).length;
    return '<div class="panel stack"><p>כרטיסיות חוזרות בדיוק כשמתחילים לשכוח אותן. הכרטיסיות של שיעור נפתחות לחזרה היומית כשקוראים לפחות קטע אחד ממנו או מסיימים אותו, עד ' + NEW_PER_DAY + " חדשות ביום.</p>" +
      '<div class="btn-row"><a class="btn btn-primary" href="#review">חזרה יומית (' + (due + nw) + ")</a></div>" +
      '<div class="muted">' + due + " לחזרה · " + nw + " חדשות</div></div>" +
      '<div class="section-head"><h2>לפי פרק</h2></div><div class="bars panel">' + CH.map(function (c) {
        var cs = CARDS.filter(function (x) { return L[x.lesson] && L[x.lesson].ch === c; });
        var learned = cs.filter(function (x) { var st = S.cards[x.id]; return st && st.reps > 0; }).length;
        return '<div class="bar-row"><a href="#review-ch-' + c.id + '">פרק ' + esc(c.letter) + ": " + esc(c.title) + "</a>" + tape(pct(cs.length ? learned / cs.length : 0), true) + '<span class="mono-n">' + learned + "/" + cs.length + "</span></div>";
      }).join("") + '</div><p class="muted">המספר מראה כמה כרטיסיות כבר עברתם לפחות פעם אחת.</p>';
  }
  function buildReview(arg) {
    var queue, title, lid = null, pool;
    if (arg && arg.indexOf("ch-") === 0 && CHID[arg.slice(3)]) {
      var c = CHID[arg.slice(3)];
      pool = CARDS.filter(function (x) { return L[x.lesson] && L[x.lesson].ch === c; });
      queue = shuffle(pool.filter(isDue)).concat(pool.filter(isNew));
      title = "כרטיסיות: פרק " + c.letter;
    } else if (arg && (L[arg] || LIBID[arg])) {
      lid = arg; pool = lessonCards(arg);
      queue = shuffle(pool.filter(isDue)).concat(pool.filter(isNew));
      title = "כרטיסיות: " + (L[arg] ? L[arg].title : LIBID[arg].title);
    } else {
      queue = shuffle(dueCards()).concat(pickNew(newLeftToday()));
      title = "חזרה יומית";
    }
    return { key: arg || "daily", lesson: lid, pool: pool, title: title, queue: queue.map(function (c) { return c.id; }), i: 0, flipped: false, total: queue.length, done: 0, again: 0, cram: false, back: lastFree };
  }
  function cramFrom(r, pool, n) {
    return Object.assign({}, r, { queue: shuffle(pool).slice(0, n || pool.length).map(function (c) { return c.id; }), i: 0, flipped: false, total: Math.min(pool.length, n || pool.length), done: 0, again: 0, cram: true, title: "תרגול חופשי" });
  }
  function viewReview(arg) {
    var key = arg || "daily";
    if (!rev || rev.key !== key) rev = buildReview(arg);
    var r = rev;
    if (!r.queue.length || r.i >= r.queue.length) { viewReviewDone(r); return; }
    var c = CARD[r.queue[r.i]], left = r.queue.length - r.i;
    var from = L[c.lesson] ? "שיעור " + L[c.lesson].code : "העשרה";
    var html = studyBar(r.title, left + " נותרו", "rev-exit", "") + '<div class="sb-tape">' + tape(pct(r.done / Math.max(1, r.done + left)), true) + "</div>" +
      '<div class="study-wrap"><span class="eyebrow">' + (r.cram ? "תרגול חופשי, לא משנה את לוח החזרות" : (S.cards[c.id] ? "חזרה" : "כרטיסייה חדשה")) + "</span>" +
      '<div class="flash-stage"><span class="sw-lab sw-r" aria-hidden="true">זכרתי</span><span class="sw-lab sw-l" aria-hidden="true">לא זכרתי</span>' +
      '<button type="button" class="flash' + (r.flipped ? " flipped" : "") + '" id="flash" data-act="flip" aria-pressed="' + r.flipped + '" aria-label="' + (r.flipped ? "תשובה: " + esc(c.back) : "להפוך את הכרטיסייה: " + esc(c.front)) + '"><span class="flash-in">' +
      '<span class="face front"><span class="kind"><span class="chip">' + esc(from) + "</span><span>" + (c.kind === "term" ? "מונח: מה זה?" : "שאלה") + '</span></span><span class="q">' + esc(c.front) + '</span><span class="hint">נסו לענות בראש, ואז הקישו על הכרטיסייה</span></span>' +
      '<span class="face back"><span class="kind"><span class="chip">' + esc(from) + '</span><span>תשובה</span></span><span class="a"><span class="qsmall">' + esc(c.front) + "</span>" + esc(c.back) + "</span></span>" +
      "</span></button></div>" + (c.src && c.src.length ? '<div class="flash-src"' + (r.flipped ? "" : " hidden") + ">מקור: " + srcChips(c.src) + "</div>" : c.expl ? '<div class="flash-src"' + (r.flipped ? "" : " hidden") + '><span class="tag-expl">הסבר משלים</span></div>' : "") + "</div>" +
      '<div class="actionbar" id="ab">' + revBar(r, c) + "</div>";
    paint(html);
    bindSwipe();
    var ck = r.key + ":" + r.i + ":" + r.queue.length;
    if (ck !== lastCK && booted) { lastCK = ck; focusEl(document.getElementById("flash")); }
  }
  var lastCK = "";
  function revBar(r, c) {
    var st = S.cards[c.id];
    if (!r.flipped) return '<button type="button" class="btn btn-primary ab-wide" data-act="flip">להציג תשובה</button><p class="keys-hint">מקלדת: <span class="kbd">רווח</span> להפוך</p>';
    return '<div class="rate" role="group" aria-label="כמה טוב זכרתם?">' +
      '<button type="button" class="btn again" data-act="rate" data-r="again">לא זכרתי<small>' + (r.cram ? "שוב" : ivlLabel(st, "again")) + "</small></button>" +
      '<button type="button" class="btn" data-act="rate" data-r="hard">בקושי<small>' + (r.cram ? "הבא" : ivlLabel(st, "hard")) + "</small></button>" +
      '<button type="button" class="btn btn-primary" data-act="rate" data-r="good">זכרתי<small>' + (r.cram ? "הבא" : ivlLabel(st, "good")) + "</small></button>" +
      '<button type="button" class="btn easy" data-act="rate" data-r="easy">קל<small>' + (r.cram ? "הבא" : ivlLabel(st, "easy")) + "</small></button></div>" +
      '<p class="keys-hint">מקלדת: <span class="kbd">1</span>–<span class="kbd">4</span> לדירוג · אפשר גם להחליק ימינה או שמאלה</p>';
  }
  function forecast() {
    var t0 = startOfToday(), a = 0, b = 0, c = 0;
    Object.keys(S.cards).forEach(function (id) {
      var st = S.cards[id], d = st && st.due; if (!d || !CARD[id]) return;
      if (d < t0 + 2 * DAY) a++;
      if (d < t0 + 4 * DAY) b++;
      if (d < t0 + 8 * DAY) c++;
    });
    return "מחר: " + a + " · בעוד 3 ימים: " + b + " · השבוע: " + c;
  }
  function viewReviewDone(r) {
    var html = studyBar(r.title, "", "rev-exit", "") + '<div class="study-wrap"><div class="empty">' + I.level;
    if (r.total === 0) {
      html += "<b>אין כרטיסיות שממתינות עכשיו</b>";
      if (r.pool && r.pool.length) html += '<p>כל הכרטיסיות כאן מתוזמנות לימים הבאים. אפשר לעבור עליהן בתרגול חופשי, בלי לשנות את לוח החזרות.</p><div class="btn-row"><button type="button" class="btn btn-primary" data-act="cram">תרגול חופשי</button><a class="btn" href="' + esc(r.back || "#cards") + '">חזרה</a></div>';
      else html += '<p>כרטיסיות של שיעור נכנסות לחזרה היומית כשקוראים לפחות קטע אחד ממנו. פתחו שיעור כדי להתחיל.</p><div class="btn-row"><a class="btn btn-primary" href="#course">לקורס</a><a class="btn" href="#home">להיום</a></div>';
    } else {
      if (!r.cram && !r.logged) { r.logged = true; act("cards:" + r.key); save(); }
      html += "<b>סיימתם " + plural(r.done, "כרטיסייה אחת", "כרטיסיות") + "</b><p>" + (r.again ? plural(r.again, "אחת חזרה", "חזרו") + " לסבב נוסף. " : "") + "הן יחזרו בדיוק כשמתחילים לשכוח אותן.</p>" +
        (r.cram ? "" : '<p class="forecast">' + forecast() + "</p>") +
        '<div class="btn-row"><a class="btn btn-primary" href="#home">חזרה להיום</a><a class="btn" href="#practice">לתרגול שאלות</a></div>';
    }
    paint(html + "</div></div>");
  }
  var swiped = false;
  function flip() {
    if (!rev) return;
    if (swiped) { swiped = false; return; }
    rev.flipped = !rev.flipped;
    var f = document.getElementById("flash"), c = CARD[rev.queue[rev.i]];
    if (!f || !c) { viewReview(rev.key === "daily" ? "" : rev.key); return; }
    f.classList.toggle("flipped", rev.flipped);
    f.setAttribute("aria-pressed", String(rev.flipped));
    f.setAttribute("aria-label", rev.flipped ? "תשובה: " + c.back : "להפוך את הכרטיסייה: " + c.front);
    var src = main.querySelector(".flash-src"); if (src) src.hidden = !rev.flipped;
    var ab = document.getElementById("ab"), r = rev;
    setTimeout(function () {
      if (rev !== r || !ab) return;
      ab.innerHTML = revBar(r, c);
      anim(ab.firstChild, [{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: EASE });
      var b = ab.querySelector(r.flipped ? '[data-r="good"]' : '[data-act="flip"]'); if (b && document.activeElement !== f) b.focus({ preventScroll: true });
    }, motionOK() ? 300 : 0);
  }
  function rate(grade) {
    var r = rev; if (!r || !r.flipped) return;
    var id = r.queue[r.i];
    if (!r.cram) {
      var wasNew = !S.cards[id];
      S.cards[id] = nextState(S.cards[id], grade);
      if (wasNew) { if (S.newDay.d !== dayKey()) S.newDay = { d: dayKey(), n: 0 }; S.newDay.n++; }
    }
    touchDay();
    if (grade === "good" || grade === "easy") haptic();
    if (grade === "again") { r.again++; r.queue.splice(Math.min(r.queue.length, r.i + 4), 0, id); } else r.done++;
    r.i++; r.flipped = false;
    save(); viewReview(r.key === "daily" ? "" : r.key); updateBadge();
    var f = document.getElementById("flash");
    if (f) anim(f, [{ transform: "translateX(-16px)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 220, easing: EASE });
  }
  // swipe on the back face: physical right = זכרתי, left = לא זכרתי (buttons stay the accessible path)
  function bindSwipe() {
    var f = document.getElementById("flash"); if (!f) return;
    var x0 = null, dx = 0, id = null, stage = f.parentNode;
    f.addEventListener("pointerdown", function (e) { if (!rev || !rev.flipped || e.button) return; x0 = e.clientX; dx = 0; id = e.pointerId; });
    f.addEventListener("pointermove", function (e) {
      if (x0 === null || e.pointerId !== id) return;
      dx = e.clientX - x0;
      if (Math.abs(dx) > 8) { f.setPointerCapture(id); f.style.transition = "none"; f.style.transform = "translateX(" + dx + "px) rotate(" + Math.max(-6, Math.min(6, dx / 20)) + "deg)"; stage.style.setProperty("--sr", dx > 0 ? Math.min(1, dx / 80) : 0); stage.style.setProperty("--sl", dx < 0 ? Math.min(1, -dx / 80) : 0); }
    });
    function end() {
      if (x0 === null) return;
      var d = dx; x0 = null; dx = 0;
      f.style.transition = ""; f.style.transform = ""; stage.style.setProperty("--sr", 0); stage.style.setProperty("--sl", 0);
      if (Math.abs(d) > 8) { swiped = true; setTimeout(function () { swiped = false; }, 80); }
      if (Math.abs(d) >= 80) rate(d > 0 ? "good" : "again");
    }
    f.addEventListener("pointerup", end); f.addEventListener("pointercancel", end);
  }
  function newItem(q) {
    var it = { id: q.id, done: false, score: null };
    if (q.options) it.perm = q.type === "tf" ? [0, 1] : shuffle(q.options.map(function (_, i) { return i; }));
    if (q.type === "tf") it.perm = [0, 1];
    if (q.type === "match") { it.defs = shuffle(q.pairs.map(function (_, i) { return i; })); it.map = {}; it.sel = null; }
    if (q.type === "cloze") { var ans = clozeAnswers(q); it.fill = ans.map(function () { return null; }); it.bank = shuffle(ans.concat(q.extra || [])); }
    if (q.type === "order") { var idx = q.steps.map(function (_, i) { return i; }); var p = shuffle(idx), g = 0; while (g++ < 10 && p.every(function (v, i) { return v === i; })) p = shuffle(idx); it.pool = p; it.picked = []; }
    if (q.type === "open") { it.text = ""; it.shown = false; }
    return it;
  }
  function clozeAnswers(q) { var out = [], re = /\{\{([^}]+)\}\}/g, m; while ((m = re.exec(q.text))) out.push(m[1].trim()); return out; }
  // per-blank marks. Blanks with the same answer word are interchangeable by nature (string compare); a question can also
  // declare blanks whose order does not matter: anyOrder: true (all blanks) or anyOrder: [[0, 1], ...] (groups of blank indexes)
  function clozeMarks(q, it) {
    var a = clozeAnswers(q), marks = a.map(function (w, i) { return it.fill[i] === w; });
    var groups = q.anyOrder === true ? [a.map(function (_, i) { return i; })] : arr(q.anyOrder).filter(Array.isArray);
    groups.forEach(function (g) {
      g = g.filter(function (i) { return i >= 0 && i < a.length; });
      var pool = g.map(function (i) { return a[i]; });
      g.forEach(function (i) { var k = pool.indexOf(it.fill[i]); marks[i] = k !== -1; if (k !== -1) pool.splice(k, 1); });
    });
    return marks;
  }

  // =============================================================== question runner: focus mode (P0-5) for practice, exams, pretests, cases
  var LETTERS = ["א", "ב", "ג", "ד", "ה", "ו"];
  function studyBar(title, sub, exitAct, extra) {
    return '<div class="studybar"><button type="button" class="icon-btn sb-x" data-act="' + exitAct + '" aria-label="יציאה">' + I.x + "</button>" +
      '<div class="sb-t"><h1 class="sb-h">' + esc(title) + "</h1>" + (sub ? "<span>" + sub + "</span>" : "") + "</div>" + (extra || "") + "</div>";
  }
  function viewRun() {
    if (!run) restoreActive();
    if (!run) { go("#practice"); return; }
    if (run.finished) { viewResult(); return; }
    if (run.mode === "case" && run.intro) { viewCaseIntro(); return; }
    var it = run.items[run.i], q = it.id ? Q[it.id] : null;
    var exam = run.mode === "exam", n = run.items.length;
    var sub = (run.mode === "case" ? "שלב " : "שאלה ") + (run.i + 1) + " מתוך " + n;
    var extra = exam ? '<span class="timer" id="timer" dir="ltr" role="timer" aria-label="זמן שנותר">' + fmtDur(run.limit - (Date.now() - run.t0) / 1000) + "</span>" +
      '<button type="button" class="icon-btn' + (it.flag ? " on" : "") + '" data-act="q-flag" aria-pressed="' + !!it.flag + '" aria-label="' + (it.flag ? "מסומנת לבדיקה" : "לסמן לבדיקה") + '" title="' + (it.flag ? "מסומנת לבדיקה" : "לסמן לבדיקה") + '">' + I.flag + "</button>" +
      '<button type="button" class="icon-btn" data-act="q-map" aria-label="מפת השאלות" aria-haspopup="dialog">' + I.grid + "</button>" : "";
    var html = studyBar(run.title, sub, "run-exit", extra) + '<div class="sb-tape">' + tape(pct((run.i + (it.done && !exam ? 1 : 0)) / n), true) + "</div>";
    html += '<div class="study-wrap">';
    if (run.mode === "case") html += caseStepHtml();
    if (q) {
      var l = L[q.lesson];
      var from = run.mode === "pretest" ? "פרק " + CHID[run.chapter].letter + " · לא נכנס לציון" : run.mode === "case" ? "שאלה בשלב " + (run.i + 1) + (l ? " · " + l.code + " " + l.title : "") : l ? "שיעור " + l.code + " · " + l.title : "העשרה: " + (LIBID[q.lesson] ? LIBID[q.lesson].title : "");
      html += '<div class="q-card"><div class="from"><span>' + esc(from) + '</span><span class="qtype">' + TYPE_NAME[q.type] + " · " + ["", "קל", "בינוני", "קשה"][q.difficulty || 2] + (q.enrich ? " · העשרה" : "") + "</span></div>" + renderQuestion(q, it, exam) + "</div>";
      html += '<p class="keys-hint">מקלדת: <span class="kbd">1</span>–<span class="kbd">4</span> לבחירה, <span class="kbd">Enter</span> להמשך</p>';
    }
    html += "</div>";
    html += '<div class="actionbar" id="ab">' + runBar(it, q) + "</div>";
    paint(html);
    if (run.just && !exam) {
      var wr = main.querySelector(".opt.wrong.just");
      if (wr) anim(wr, [{ transform: "translateX(0)" }, { transform: "translateX(-6px)" }, { transform: "translateX(6px)" }, { transform: "translateX(-4px)" }, { transform: "translateX(4px)" }, { transform: "translateX(0)" }], { duration: 280, easing: EASE_IO });
      var pn = main.querySelector(".explain");
      if (pn) anim(pn, [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: 220, delay: 80, easing: EASE, fill: "backwards" });
    }
    run.just = null;
    if (exam) startTimer();
    var qk = run.t0 + ":" + run.mode + ":" + run.i, newQ = qk !== lastQK; lastQK = qk;
    if (it.done && !exam) { var nb = document.getElementById("next-q"); if (nb) nb.focus({ preventScroll: true }); }
    // a new question / step: focus its text so a screen reader reads it and Tab continues to the answers
    else if (newQ && booted) focusEl(main.querySelector(run.mode === "case" ? ".case-step h2" : ".q-card .qq") || main.querySelector(".q-card .qq"));
  }
  var lastQK = "";
  function runBar(it, q) {
    var last = run.i === run.items.length - 1;
    if (run.mode === "exam") return '<button type="button" class="btn btn-ghost" data-act="q-prev"' + (run.i ? "" : " disabled") + ">" + I.arrowR + "הקודמת</button>" +
      (last ? '<button type="button" class="btn btn-primary" data-act="exam-submit">הגשת המבחן</button>' : '<button type="button" class="btn btn-primary" data-act="q-next">הבאה' + I.arrowL + "</button>");
    if (!q || it.done) {
      var lab = run.mode === "case" ? (last ? "לסיכום המקרה" : "להמשך הפרויקט") : (last ? "לסיכום" : "לשאלה הבאה");
      return '<button type="button" class="btn btn-primary ab-wide" data-act="q-next" id="next-q">' + lab + I.arrowL + "</button>";
    }
    if (q.type === "match" || q.type === "cloze" || q.type === "order") return '<button type="button" class="btn btn-primary ab-wide" data-act="q-check"' + (answeredExam(it) ? "" : " disabled") + ">בדיקה</button>";
    if (q.type === "open") return '<span class="ab-hint">' + (it.shown ? "סמנו איך הייתה התשובה שלכם" : "כתבו תשובה ואז הציגו תשובה לדוגמה") + "</span>";
    return '<span class="ab-hint">בחרו תשובה</span>';
  }
  var timerInt = null;
  function startTimer() {
    clearInterval(timerInt);
    timerInt = setInterval(function () {
      if (!run || run.mode !== "exam" || run.finished) { clearInterval(timerInt); return; }
      var left = run.limit - (Date.now() - run.t0) / 1000;
      var t = route() === "run" && document.getElementById("timer");
      if (t) { t.textContent = fmtDur(left); t.classList.toggle("low", left < 120); }
      if (left <= 300 && !run.w5 && run.limit > 300) { run.w5 = 1; announce("נותרו 5 דקות"); }
      if (left <= 60 && !run.w1) { run.w1 = 1; announce("נותרה דקה אחת"); }
      if (left <= 0) {
        clearInterval(timerInt); closeSheet(true);
        if (route() === "run") submitExam(); else { run.autoSubmitted = true; submitExam(true); }
        toast("הזמן נגמר. המבחן הוגש.");
      }
    }, 1000);
  }
  function runExit() {
    if (!run) { go(lastFree); return; }
    if (run.finished) {
      var b0 = run.back; if (run.autoSubmitted) run.noticeSeen = true;
      run = null; go(b0); return;
    }
    if (run.mode === "exam") {
      openSheet({ title: "לצאת מהמבחן?", body: "<p>השעון ממשיך לרוץ. אפשר לחזור מדף הבית עד שהזמן ייגמר.</p>",
        actions: [{ label: "להמשיך במבחן", act: "dlg-close", cls: "btn-primary" }, { label: "לצאת", act: "run-leave" }, { label: "להגיש עכשיו", act: "exam-submit-force", cls: "btn-ghost" }] });
      return;
    }
    if (run.mode === "case") { saveCase(); var b1 = run.back; run = null; go(b1); toast("ההתקדמות במקרה נשמרה"); return; }
    if (run.items.some(function (it) { return it.done; })) {
      openSheet({ title: run.mode === "pretest" ? "לצאת מהבדיקה?" : "לצאת מהתרגול?", body: "<p>" + (run.mode === "pretest" ? "אפשר להמשיך מאותה שאלה מדף הבית." : "התשובות שכבר עניתם נשמרו.") + "</p>",
        actions: [{ label: "להמשיך", act: "dlg-close", cls: "btn-primary" }, { label: "לצאת", act: run.mode === "pretest" ? "run-leave" : "run-quit" }] });
    } else runQuit();
  }
  function runQuit() {
    var b = run ? run.back : lastFree;
    if (run && run.mode === "pretest") { S.activeRun = null; save(); }
    run = null; clearInterval(timerInt); go(b);
  }
  function answeredExam(it) {
    var q = Q[it.id];
    if (!q) return true;
    if (q.type === "match") return Object.keys(it.map).length === q.pairs.length;
    if (q.type === "cloze") return it.fill.every(function (x) { return x !== null; });
    if (q.type === "order") return it.picked.length === q.steps.length;
    if (q.type === "open") return !!it.done;
    return it.choice !== undefined && it.choice !== null;
  }
  function countIn(a, w) { return a.filter(function (x) { return x === w; }).length; }
  function cleanExplain(s) { return String(s || "").replace(/^\s*(לא נכון|נכון|שגוי|חלקית)\s*[.:,!]\s*/, ""); }
  // P1-4: distinct right / wrong / partial panels, no duplicated verdict, "למה?" paragraph
  function feedback(q, it, correctLine) {
    var ok = it.score === 1, part = !ok && it.score > 0;
    var ex = cleanExplain(q.explain);
    return '<div class="explain ' + (ok ? "ok" : part ? "part" : "bad") + '" role="status"><p class="fb-h">' + (ok ? I.check + "<b>נכון</b>" : part ? "<b>חלקית · " + pct(it.score) + "%</b>" : I.x + "<b>לא נכון</b>") + "</p>" +
      (!ok && correctLine ? '<p class="corr">' + esc(correctLine) + "</p>" : "") + (ex ? '<p class="why"><b>למה?</b> ' + esc(ex) + "</p>" : "") +
      (q.src ? '<div class="blk-meta">מקור: ' + srcChips(q.src) + "</div>" : q.enrich ? '<div class="blk-meta">שאלת העשרה, לא מחומר הקורס</div>' : "") + "</div>";
  }
  function record(q, score) {
    var s = S.qstats[q.id] || { r: 0, w: 0 };
    if (score === 1) s.r++; else s.w++;
    s.last = score === 1 ? 1 : 0; s.t = Date.now(); s.type = q.type;
    S.qstats[q.id] = s;
    if (q.scope === "course" || q.scope === "lib") { if (score === 1) delete S.mistakes[q.id]; else S.mistakes[q.id] = Date.now(); }
    touchDay();
  }
  function settle(it, quiet) {
    var q = Q[it.id];
    it.score = grade(q, it); it.done = true;
    if (run.mode !== "pretest") record(q, it.score);   // pretest answers are pre-learning guesses: never stats or mastery
    if (!quiet) { run.just = it.id; if (it.score === 1) haptic(); save(); persistRun(); }
  }
  function submitExam(silent) {
    if (!run || run.finished) return;
    clearInterval(timerInt);
    run.items.forEach(function (it) { var q = Q[it.id]; if (!answeredExam(it)) { it.score = 0; it.done = true; record(q, 0); } else settle(it, true); });
    finishRun(silent);
  }
  function finishRun(silent) {
    run.finished = true; run.dur = (Date.now() - run.t0) / 1000;
    var graded = run.items.filter(function (it) { return it.id && it.score !== null && it.score !== undefined; });
    run.scorePct = pct(avg(graded.map(function (it) { return it.score || 0; })));
    if (run.mode === "exam") {
      var byType = {}, byLesson = {};
      run.items.forEach(function (it) { var q = Q[it.id]; (byType[q.type] = byType[q.type] || []).push(it.score || 0); (byLesson[q.lesson] = byLesson[q.lesson] || []).push(it.score || 0); });
      var bt = {}; Object.keys(byType).forEach(function (k) { bt[k] = pct(avg(byType[k])); });
      var bl = {}; Object.keys(byLesson).forEach(function (k) { bl[k] = pct(avg(byLesson[k])); });
      S.exams.unshift({ id: "e" + Date.now(), t: Date.now(), title: run.title, kind: run.kind || "", chapter: run.chapter || "", n: run.items.length, score: run.scorePct, dur: run.dur, byType: bt, byLesson: bl });
      S.exams = S.exams.slice(0, 60);
      act("exam:" + (run.kind === "chapter" && run.chapter ? run.chapter : "full"));
      S.activeRun = null;
    } else if (run.mode === "practice") {
      if (run.scope) act("practice:" + run.scope);
      if (run.kind === "check") checkOutcome();
    } else if (run.mode === "pretest") {
      var p = Object.assign({}, S.pretest[run.chapter]);
      p[run.phase] = { score: run.items.filter(function (it) { return it.score === 1; }).length, n: run.items.length, t: Date.now() };
      S.pretest[run.chapter] = p;
      S.activeRun = null;
    } else if (run.mode === "case") saveCase(true);
    save();
    if (!silent) { viewResult(); window.scrollTo(0, 0); if (booted) focusEl(main.querySelector(".score-card")); }
  }
  function checkOutcome() {
    var lid = run.lesson, n = run.items.length, k = run.items.filter(function (it) { return it.score === 1; }).length;
    run.k = k; run.pass = k >= Math.min(4, Math.max(1, n - 1));
    if (run.pass) { if (!S.done[lid]) { S.done[lid] = Date.now(); run.newlyDone = true; touchDay(); } }
    else act("checkfail:" + lid);
  }

  // =============================================================== results (P1-8, P0-3)
  function viewResult() {
    if (run.mode === "case") { viewCaseDone(); return; }
    if (run.mode === "pretest") { viewPretestDone(); return; }
    if (run.kind === "check") { viewCheckDone(); return; }
    var items = run.items, sc = run.scorePct, n = items.length;
    var wrong = items.filter(function (it) { return it.score !== 1; });
    var byLesson = {}, byType = {};
    items.forEach(function (it) { var q = Q[it.id]; (byLesson[q.lesson] = byLesson[q.lesson] || []).push(it.score || 0); (byType[q.type] = byType[q.type] || []).push(it.score || 0); });
    var exam = run.mode === "exam";
    var verdict = sc >= 85 ? "מצוין. החומר יושב טוב." : sc >= 65 ? "טוב. עברו על ההסברים של השאלות שטעיתם בהן." : "יש עוד מה לחזק. חזרו לשיעורים שבהמלצה, ואז נסו שוב.";
    var html = studyBar(exam ? "תוצאות מבחן" : "סיכום תרגול", esc(run.title), "run-exit") + '<div class="study-wrap">';
    html += '<section class="score-card"><div class="score-row"><span class="score-big" dir="ltr">' + sc + "%</span>" + (exam && sc >= 85 ? stamp("עבר בהצלחה", "exam:" + run.t0) : "") + "</div>" + tape(sc, false, "res-" + run.t0) +
      '<p class="verdict">' + verdict + '</p><p class="muted">' + (n - wrong.length) + " נכונות מתוך " + n + " · " + fmtDur(run.dur) + "</p></section>";
    // next step: one primary action
    var next = '<section class="next-card"><h2>הצעד הבא</h2><div class="btn-col">';
    if (exam) {
      var weakest = Object.keys(byLesson).filter(function (k) { return L[k]; }).sort(function (a, b) { return avg(byLesson[a]) - avg(byLesson[b]); })[0];
      next += weakest && avg(byLesson[weakest]) < 1 ? '<a class="btn btn-primary" href="#lesson-' + weakest + '">לחזור על ' + esc(L[weakest].code + " " + L[weakest].title) + I.arrowL + "</a>" : '<a class="btn btn-primary" href="#exams">למבחן נוסף' + I.arrowL + "</a>";
      if (wrong.length) next += '<button type="button" class="btn" data-act="goto-mis">ניתוח טעויות (' + wrong.length + ")</button>";
    } else {
      next += '<button type="button" class="btn btn-primary" data-act="run-again">לשאלות הבאות' + I.arrowL + "</button>";
      if (wrong.length) next += '<button type="button" class="btn" data-act="retry-wrong">לתרגל שוב את ' + plural(wrong.length, "הטעות", "הטעויות") + "</button>";
    }
    next += '<a class="btn btn-ghost" href="' + esc(run.back) + '">חזרה</a></div></section>';
    html += next;
    if (n >= 10 && (Object.keys(byLesson).length > 1 || Object.keys(byType).length > 1)) {
      html += '<details class="panel breakdown"><summary><b>פירוט לפי שיעור וסוג שאלה</b>' + I.chev + "</summary>" +
        '<div class="bars">' + Object.keys(byLesson).map(function (k) { var p = pct(avg(byLesson[k])); return '<div class="bar-row"><a href="' + lessonHref(k) + '">' + esc(lessonTitle(k)) + "</a>" + tape(p, true) + '<span class="mono-n" dir="ltr">' + p + "%</span></div>"; }).join("") + "</div>" +
        '<div class="bars">' + Object.keys(byType).map(function (k) { var p = pct(avg(byType[k])); return '<div class="bar-row"><span>' + TYPE_NAME[k] + "</span>" + tape(p, true) + '<span class="mono-n" dir="ltr">' + p + "%</span></div>"; }).join("") + "</div></details>";
    }
    html += mistakesList(wrong);
    var before = JSON.stringify(S.celebrated);
    paint(html + "</div>");
    if (JSON.stringify(S.celebrated) !== before) save();
  }
  function mistakesList(wrong) {
    if (!wrong.length) return "";
    return '<section id="mis"><div class="section-head"><h2>ניתוח טעויות</h2></div><div class="result-list">' + wrong.map(function (it) {
      var q = Q[it.id]; if (!q) return "";
      var ya = yourAnswer(q, it);
      return '<details class="result-item"><summary><span class="qtype">' + TYPE_NAME[q.type] + (q.lesson ? " · " + esc(lessonTitle(q.lesson)) : "") + '</span><span class="qq">' + esc(q.q || stripTags(q.text || "").replace(/\{\{([^}]+)\}\}/g, "___")) + "</span></summary>" +
        (ya ? '<span class="ans-bad">ענית: ' + esc(ya) + "</span>" : "") + '<span class="ans-ok">' + esc(rightAnswer(q)) + '</span><span class="muted">' + esc(cleanExplain(q.explain)) + "</span>" + (q.src ? '<div class="blk-meta">' + srcChips(q.src) + "</div>" : "") + "</details>";
    }).join("") + "</div></section>";
  }
  function sectionsFor(l, ids) {
    var out = [];
    ["full", "deep"].forEach(function (lv) {
      (l[lv] || []).forEach(function (s, i) {
        if ((s.blocks || []).some(function (b) { return Array.isArray(b.src) && b.src.some(function (x) { return ids.indexOf(x) !== -1; }); })) out.push({ lv: lv, anchor: "s-" + lv + "-" + (i + 1), title: s.title, n: secNum(l, lv, i) });
      });
    });
    return out.slice(0, 4);
  }
  function viewCheckDone() {
    var l = L[run.lesson], n = run.items.length, nx = LESSONS[l.idx + 1];
    var wrong = run.items.filter(function (it) { return it.score !== 1; });
    var chNow = run.newlyDone && l.ch.lessons.every(function (x) { return S.done[x.id]; }) && !S.celebrated["ch:" + l.ch.id];
    if (chNow && !S.celebrated["lesson:" + l.id]) S.celebrated["lesson:" + l.id] = Date.now();   // one celebration per screen: the chapter sheet wins
    var html = studyBar("בדיקת הבנה", esc(l.code + " " + l.title), "run-exit") + '<div class="study-wrap">';
    if (run.pass) {
      html += '<section class="score-card done-card">' + stamp("השיעור הושלם", "lesson:" + l.id) + '<h1 class="res-h">השיעור הושלם</h1>' +
        "<p>" + run.k + " מתוך " + n + " נכונות. " + lessonCards(l.id).length + " כרטיסיות נכנסו לחזרה היומית.</p>" +
        '<div class="btn-col">' + (nx ? '<a class="btn btn-primary" href="#lesson-' + nx.id + '">לשיעור הבא: ' + esc(nx.code + " " + nx.title) + I.arrowL + "</a>" : '<a class="btn btn-primary" href="#chapter-' + l.ch.id + '">לדף הפרק' + I.arrowL + "</a>") +
        '<a class="btn" href="#lesson-' + l.id + '">חזרה לשיעור</a>' + (wrong.length ? '<button type="button" class="btn btn-ghost" data-act="retry-wrong">לתרגל את הטעות</button>' : "") + "</div></section>";
    } else {
      var ids = []; wrong.forEach(function (it) { arr(Q[it.id].src).forEach(function (s) { if (ids.indexOf(s) === -1) ids.push(s); }); });
      var secs = sectionsFor(l, ids);
      html += '<section class="score-card"><h1 class="res-h">כמעט שם</h1><p>' + run.k + " מתוך " + n + ". כדאי לחזור על:</p>" +
        '<ul class="sec-links">' + (secs.length ? secs.map(function (s) { return '<li><a href="#lesson-' + l.id + '" data-act="goto-level" data-lesson="' + l.id + '" data-lv="' + s.lv + '" data-target="' + s.anchor + '">' + esc(s.n + " " + s.title) + "</a></li>"; }).join("") : '<li><a href="#lesson-' + l.id + '">' + esc(l.code + " " + l.title) + "</a></li>") + "</ul>" +
        '<div class="btn-col"><button type="button" class="btn btn-primary" data-act="start-check" data-id="' + l.id + '">לנסות שוב</button><a class="btn" href="#lesson-' + l.id + '">חזרה לשיעור</a>' +
        '<button type="button" class="linkish" data-act="mark-done" data-id="' + l.id + '">לסמן כהושלם בכל זאת</button></div></section>';
    }
    html += mistakesList(wrong);
    paint(html + "</div>");
    save();
    if (chNow) setTimeout(function () { if (route() === "run" && run && run.finished && run.lesson === l.id) maybeChapterDone(l.id); }, motionOK() ? 700 : 0);
  }
  function maybeChapterDone(lid) {
    var c = L[lid] && L[lid].ch;
    if (!c || !c.lessons.every(function (l) { return S.done[l.id]; }) || S.celebrated["ch:" + c.id]) return;
    var n = Math.min(15, poolFor("ch:" + c.id, { auto: true }).length), x = X(c.id), m = chMedia(c);
    var body = (m ? aiFig(m, { cls: "chd-cover", material: c.material, small: true }) : "") + stamp("פרק " + c.letter + " הושלם", "ch:" + c.id) + "<p>" + c.lessons.length + " שיעורים מאחוריכם. זה הזמן לבדוק את עצמכם.</p>";
    var acts = [{ label: "מבחן פרק " + c.letter + " · " + n + " שאלות · " + Math.ceil(n * 1.5) + " דק׳", act: "exam-ch", cls: "btn-primary", attrs: { "data-id": c.id } }];
    if (x && arr(x.cheatsheet).length) acts.push({ label: "דף הסיכום של הפרק", href: "#sheet-" + c.id });
    if ((PRETEST[c.id] || []).length) acts.push({ label: "בדיקה חוזרת: איפה הייתם ואיפה אתם", act: "pretest", attrs: { "data-ch": c.id, "data-phase": "post" } });
    openSheet({ title: "פרק " + esc(c.letter) + " הושלם", full: true, cls: "ch-done", body: body, actions: acts });
    save();
  }

  // =============================================================== pretest (§8.1.5)
  function startPretest(ch, phase, noNav) {
    var qs = PRETEST[ch] || []; if (!qs.length) return;
    run = { mode: "pretest", phase: phase, chapter: ch, title: (phase === "post" ? "בדיקה חוזרת: פרק " : "בדיקה מקדימה: פרק ") + CHID[ch].letter, back: "#chapter-" + ch, route: "#pretest-" + ch, i: 0, t0: Date.now(), items: qs.map(newItem) };
    persistRun();
    if (!noNav) go(run.route);
  }
  function viewPretest(ch) {
    if (!(run && run.mode === "pretest" && run.chapter === ch)) {
      var a = S.activeRun;
      if (a && a.mode === "pretest" && a.chapter === ch) { run = null; restoreActive(); }
      if (!(run && run.mode === "pretest" && run.chapter === ch)) {
        var p = S.pretest[ch] || {}, c = CHID[ch];
        startPretest(ch, p.pre && completion(c.lessons).d === c.lessons.length ? "post" : "pre", true);
      }
    }
    viewRun();
  }
  function viewPretestDone() {
    var p = S.pretest[run.chapter] || {}, n = run.items.length, k = run.items.filter(function (it) { return it.score === 1; }).length;
    var html = studyBar(run.title, "לא נכנס לציון", "run-exit") + '<div class="study-wrap"><section class="score-card"><span class="score-big" dir="ltr">' + k + "/" + n + "</span>" +
      (run.phase === "pre" ? "<p>זו נקודת ההתחלה שלכם. בסוף הפרק נבדוק שוב.</p>" : prePostBars(p)) +
      '<div class="btn-col"><a class="btn btn-primary" href="#chapter-' + run.chapter + '">' + (run.phase === "pre" ? "לשיעורי הפרק" : "לדף הפרק") + I.arrowL + "</a></div></section>" +
      mistakesList(run.items.filter(function (it) { return it.score !== 1; }));
    paint(html + "</div>");
  }

  // =============================================================== field cases (§8.2)
  function caseCard(c) {
    var st = S.cases[c.id], m = media(c.id), ch0 = CHID[arr(c.chapters)[0]];
    var state = !st ? ["new", "חדש"] : st.done ? ["done", "הושלם · " + (st.score || 0) + "%"] : ["open", "שלב " + Math.min(c.steps.length, (st.step || 0) + 1) + " מתוך " + c.steps.length];
    return '<a class="case-card" href="#' + esc(c.id) + '"><span class="cover' + (m ? "" : " thin") + '">' + swatchBg(ch0 ? ch0.material : "general") + (m ? imgHtml(m, { card: true, small: true, sizes: "320px" }) + '<span class="ai-badge" aria-hidden="true">AI</span>' : "") + "</span>" +
      '<span class="cc-b"><b>' + esc(c.title) + "</b><small>כ-" + (c.est || 15) + " דק׳ · " + c.steps.length + ' שלבים</small><span class="chips">' +
      arr(c.chapters).filter(function (x) { return CHID[x]; }).map(function (x) { return '<span class="chip">פרק ' + CHID[x].letter + "</span>"; }).join("") +
      '<span class="chip st-' + state[0] + '">' + state[1] + "</span></span></span></a>";
  }
  function casesPanel() {
    return '<p class="muted">סיפורים מאתר בנייה מומצא שמחברים כמה שיעורים. הסיפור בדוי; כל עובדה בשלבים מגיעה מהשקפים, עם עמוד המקור.</p><div class="case-grid">' + CASES.map(caseCard).join("") + "</div>";
  }
  function buildCaseRun(c, fresh) {
    var st = !fresh && S.cases[c.id];
    run = { mode: "case", caseId: c.id, title: c.title, back: lastFree.indexOf("#case-") === 0 ? "#cases" : lastFree, route: "#" + c.id, i: 0, t0: Date.now(),
      items: c.steps.map(function (s, i) { var q = Q["case:" + c.id + ":" + i]; return q ? newItem(q) : { id: null, done: true, score: null }; }) };
    var ans = (st && st.answers) || {};
    run.items.forEach(function (it, i) { if (it.id && ans[i] !== undefined && ans[i] !== null) { it.done = true; it.score = ans[i]; it.restored = true; } });
    if (st && st.done && !fresh) { run.finished = true; run.scorePct = st.score || 0; return; }
    if (st && (st.step || Object.keys(ans).length)) run.i = caseResumeAt(c, st);
    else run.intro = true;
  }
  // the first step that is not answered yet (steps without a question count as passed up to the saved step)
  function caseResumeAt(c, st) {
    var ans = (st && st.answers) || {}, n = c.steps.length, i = 0;
    while (i < n - 1 && (Q["case:" + c.id + ":" + i] ? ans[i] !== undefined && ans[i] !== null : i < (st.step || 0))) i++;
    return i;
  }
  function viewCase(c) {
    if (!(run && run.mode === "case" && run.caseId === c.id)) buildCaseRun(c);
    viewRun();
  }
  function saveCase(final) {
    if (!run || run.mode !== "case") return;
    var ans = {};
    run.items.forEach(function (it, i) { if (it.id && it.done && it.score !== null && it.score !== undefined) ans[i] = it.score; });
    var prev = S.cases[run.caseId] || {};
    S.cases[run.caseId] = { step: run.intro ? 0 : run.i, answers: ans, t: Date.now(), done: final ? Date.now() : prev.done || 0, score: final ? run.scorePct : prev.score || 0 };
    save();
  }
  function viewCaseIntro() {
    var c = CASEID[run.caseId], m = media(c.id);
    var html = studyBar(c.title, "כ-" + (c.est || 15) + " דק׳ · " + c.steps.length + " שלבים", "run-exit") + '<div class="study-wrap case-intro">' +
      (m ? aiFig(m, { cls: "lh-hero", eager: true }) : "") + '<span class="pill-story">סיפור לתרגול: הפרויקט מומצא, העובדות מהקורס</span><h1 class="display">' + esc(c.title) + "</h1>" +
      '<div class="chips">' + arr(c.lessons).filter(function (x) { return L[x]; }).map(function (x) { return '<a class="chip kw" href="#lesson-' + x + '">' + esc(L[x].code + " " + L[x].title) + "</a>"; }).join("") + "</div>" +
      '<div class="prose story">' + (c.story || "") + "</div></div>" +
      '<div class="actionbar"><button type="button" class="btn btn-primary ab-wide" data-act="case-start">להתחיל' + I.arrowL + "</button></div>";
    paint(html);
  }
  function caseStepHtml() {
    var c = CASEID[run.caseId], s = c.steps[run.i] || {}, n = c.steps.length, l = L[s.lesson];
    return '<section class="case-step"><div class="cs-ticks" aria-hidden="true">' + c.steps.map(function (_, i) { return '<i class="' + (i < run.i ? "on" : i === run.i ? "now" : "") + '"></i>'; }).join("") + "</div>" +
      "<h2>שלב " + (run.i + 1) + " מתוך " + n + '</h2><div class="prose">' + (s.html || "") + "</div>" + (arr(s.src).length ? '<div class="blk-meta">מקור: ' + srcChips(s.src) + "</div>" : "") +
      (l ? '<a class="back-lesson" href="#lesson-' + l.id + '">' + I.arrowR + "לשיעור: " + esc(l.code + " " + l.title) + "</a>" : "") + "</section>";
  }
  function viewCaseDone() {
    var c = CASEID[run.caseId], qn = run.items.filter(function (it) { return it.id; }), k = qn.filter(function (it) { return it.score === 1; }).length;
    var html = studyBar(c.title, "סיכום המקרה", "run-exit") + '<div class="study-wrap"><section class="score-card"><span class="score-big" dir="ltr">' + (run.scorePct || 0) + "%</span>" + tape(run.scorePct || 0, false, "case-" + c.id) +
      '<p class="muted">' + k + " מתוך " + qn.length + " שלבים נענו נכון</p></section>" +
      '<section class="debrief"><h2>מה למדנו מהמקרה</h2><div class="prose">' + (c.debrief || "") + '</div><span class="tag-expl">הסבר משלים</span></section>' +
      '<section><h2 class="h-sm">השיעורים במקרה</h2><ol class="lesson-list">' + arr(c.lessons).filter(function (x) { return L[x]; }).map(function (x) { return lessonRow(L[x]); }).join("") + "</ol></section>" +
      '<div class="btn-col"><a class="btn btn-primary" href="#cases">לחזור למקרי השטח</a><button type="button" class="btn btn-ghost" data-act="case-restart">לעבור על המקרה שוב</button></div>' +
      mistakesList(run.items.filter(function (it) { return it.id && it.score !== 1 && it.score !== null && !it.restored; }));
    paint(html + "</div>");
  }
  function renderQuestion(q, it, exam) {
    var show = !exam && it.done;
    var h = "";
    if (q.type === "identify") h += '<figure class="dg dg-q"><div class="dg-box" data-act="dg-zoom">' + window.Diagrams.render(q.diagram, { marker: q.marker }) + '</div><figcaption><span class="illus">המחשה לימודית, לא פרט לביצוע</span><button type="button" class="dg-zoom" data-act="dg-zoom" aria-label="הגדלה של התרשים">' + I.expand + '<span>הגדלה</span></button></figcaption></figure>';
    if (q.type === "cloze") {
      var n = 0, marks = show ? clozeMarks(q, it) : [];
      h += '<div class="qq cloze-text" id="qq">' + esc(q.text).replace(/\{\{[^}]+\}\}/g, function () {
        var k = n++, w = it.fill[k], cls = "blank" + (w ? " filled" : "");
        if (show) cls += marks[k] ? " right" : " wrong";
        var nm = w ? "מקום " + (k + 1) + ": " + w + (show ? (cls.indexOf(" right") !== -1 ? ", נכון" : ", שגוי") : ", הקישו כדי להחזיר למאגר") : "מקום ריק " + (k + 1);
        return '<button type="button" class="' + cls + '" data-act="cloze-clear" data-k="' + k + '" aria-label="' + esc(nm) + '"' + (show ? " disabled" : "") + ">" + (w ? esc(w) : "&nbsp;") + "</button>";
      }) + "</div>";
      if (!show) h += '<div class="pool">' + it.bank.map(function (w, i) { var used = it.fill.indexOf(w) !== -1 && countIn(it.fill, w) >= countIn(it.bank.slice(0, i + 1), w); return used ? "" : '<button data-act="cloze-pick" data-i="' + i + '">' + esc(w) + "</button>"; }).join("") + "</div>";
      else h += feedback(q, it, "התשובות: " + clozeAnswers(q).join(" · "));
      return h;
    }
    h += '<div class="qq" id="qq">' + esc(q.q) + "</div>";
    if (q.type === "mcq" || q.type === "compare" || q.type === "scenario" || q.type === "identify" || q.type === "tf") {
      var opts = q.type === "tf" ? ["נכון", "לא נכון"] : q.options;
      var right = q.type === "tf" ? (q.answer ? 0 : 1) : q.answer;
      h += '<div class="opts' + (q.type === "tf" ? " tf" : "") + '" role="group" aria-label="תשובות">';
      it.perm.forEach(function (oi, k) {
        var cls = "opt";
        if (show) cls += oi === right ? " right" : k === it.choice ? " wrong" + (run && run.just === it.id ? " just" : "") : " dim";
        else if (exam && it.choice === k) cls += " picked";
        h += '<button type="button" class="' + cls + '" data-act="answer" data-k="' + k + '"' + (show ? " disabled" : "") + ' aria-pressed="' + (it.choice === k) + '"><span class="l">' + (show && oi === right ? I.check : LETTERS[k]) + '</span><span class="ot">' + esc(opts[oi]) + "</span>" + (exam && it.choice === k ? '<span class="pk" aria-hidden="true">' + I.check + "</span>" : "") + "</button>";
      });
      h += "</div>";
      if (show) h += feedback(q, it, q.type === "tf" ? "התשובה: " + (q.answer ? "נכון" : "לא נכון") : "התשובה הנכונה: " + q.options[q.answer]);
      return h;
    }
    if (q.type === "match") {
      h += '<p class="muted">הקישו על מונח ואז על ההגדרה שלו. הקשה על מונח מחובר מבטלת את החיבור.</p><div class="match">';
      h += '<div class="m-col">' + q.pairs.map(function (p, i) {
        var d = it.map[i], cls = "m-item term" + (it.sel === i ? " sel" : "") + (d !== undefined ? " paired" : "");
        if (show) cls += d === i ? " right" : " wrong";
        return '<button type="button" class="' + cls + '" data-act="m-term" data-i="' + i + '" aria-pressed="' + (it.sel === i) + '"' + (show ? " disabled" : "") + ">" + (d !== undefined ? '<i class="pair-n" aria-hidden="true">' + (i + 1) + "</i>" : "") + esc(p[0]) + (d !== undefined ? '<span class="sr-only">, בזוג ' + (i + 1) + (show ? (d === i ? ", נכון" : ", שגוי") : "") + "</span>" : "") + "</button>";
      }).join("") + "</div>";
      h += '<div class="m-col">' + it.defs.map(function (di) {
        var owner = Object.keys(it.map).filter(function (k) { return it.map[k] === di; })[0];
        var cls = "m-item def" + (owner !== undefined ? " paired" : "");
        return '<button type="button" class="' + cls + '" data-act="m-def" data-i="' + di + '"' + (show ? " disabled" : "") + ">" + (owner !== undefined ? '<i class="pair-n" aria-hidden="true">' + (+owner + 1) + "</i>" : "") + esc(q.pairs[di][1]) + (owner !== undefined ? '<span class="sr-only">, בזוג ' + (+owner + 1) + "</span>" : "") + "</button>";
      }).join("") + "</div></div>";
      if (show) h += feedback(q, it, q.pairs.map(function (p) { return p[0] + " ← " + p[1]; }).join(" · "));
      return h;
    }
    if (q.type === "order") {
      h += '<p class="muted">הקישו על השלבים לפי הסדר. הקשה על שלב שנבחר מחזירה אותו.</p><ol class="slot-list">';
      q.steps.forEach(function (s, i) {
        var pi = it.picked[i], cls = "slot", body = "";
        if (pi !== undefined) { cls += " filled"; if (show) cls += pi === i ? " right" : " wrong"; body = esc(q.steps[pi]) + (show && pi !== i ? '<span class="fix">במקום הזה: ' + esc(q.steps[i]) + "</span>" : ""); }
        h += '<li class="' + cls + '"' + (pi !== undefined && !show ? ' data-act="o-unpick" data-pos="' + i + '" role="button" tabindex="0"' : "") + '><span class="n">' + (i + 1) + "</span><span>" + body + "</span></li>";
      });
      h += "</ol>";
      if (!show) h += '<div class="pool">' + it.pool.filter(function (si) { return it.picked.indexOf(si) === -1; }).map(function (si) { return '<button data-act="o-pick" data-si="' + si + '">' + esc(q.steps[si]) + "</button>"; }).join("") + "</div>";
      else h += feedback(q, it, "");
      return h;
    }
    if (q.type === "open") {
      h += '<label class="sr-only" for="open-a">התשובה שלך</label><textarea class="input area" id="open-a" rows="4" placeholder="כתבו את התשובה שלכם במילים שלכם"' + (it.shown ? " readonly" : "") + ">" + esc(it.text) + "</textarea>";
      if (!it.shown) {
        h += '<div class="btn-row"><button class="btn btn-primary" data-act="open-show">הצגת תשובה לדוגמה</button>' + (ai.s ? '<button class="btn" data-act="open-ai">בדיקה של עוזר הלימוד</button>' : "") + "</div>";
      } else {
        h += '<div class="explain"><b>תשובה לדוגמה</b><span>' + esc(q.model) + "</span>" +
          ((q.points || []).length ? '<b>נקודות שצריכות להופיע</b><ul class="pts">' + q.points.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + "</ul>" : "") +
          (q.explain ? "<span>" + esc(q.explain) + "</span>" : "") + (q.src ? '<div class="blk-meta">מקור: ' + srcChips(q.src) + "</div>" : "") + "</div>";
        if (!it.done) h += '<div class="self"><span>איך הייתה התשובה שלכם?</span><div class="btn-row"><button class="btn again-t" data-act="open-grade" data-s="0">לא ידעתי</button><button class="btn" data-act="open-grade" data-s="0.5">חלקית</button><button class="btn btn-primary" data-act="open-grade" data-s="1">ידעתי</button></div></div>';
      }
      h += '<div class="ai-out" id="ai-out" hidden aria-live="polite"></div>';
      return h;
    }
    return h;
  }
  function grade(q, it) {
    if (q.type === "tf") return it.perm[it.choice] === (q.answer ? 0 : 1) ? 1 : 0;
    if (q.options) return it.perm[it.choice] === q.answer ? 1 : 0;
    if (q.type === "match") return q.pairs.filter(function (_, i) { return it.map[i] === i; }).length / q.pairs.length;
    if (q.type === "cloze") { var cm = clozeMarks(q, it); return cm.filter(Boolean).length / cm.length; }
    if (q.type === "order") return it.picked.filter(function (si, i) { return si === i; }).length / q.steps.length;
    return it.score || 0;
  }
  function yourAnswer(q, it) {
    if (q.type === "tf") return it.choice == null ? "" : ["נכון", "לא נכון"][it.perm[it.choice]];
    if (q.options) return it.choice == null ? "לא נענתה" : q.options[it.perm[it.choice]];
    if (q.type === "cloze") return it.fill.map(function (x) { return x || "—"; }).join(" · ");
    if (q.type === "open") return it.text;
    return "";
  }
  function rightAnswer(q) {
    if (q.type === "tf") return "נכון: " + (q.answer ? "נכון" : "לא נכון");
    if (q.options) return "נכון: " + q.options[q.answer];
    if (q.type === "cloze") return "נכון: " + clozeAnswers(q).join(" · ");
    if (q.type === "match") return q.pairs.map(function (p) { return p[0] + " ← " + p[1]; }).join(" · ");
    if (q.type === "order") return "הסדר הנכון: " + q.steps.join(" ← ");
    if (q.type === "open") return "תשובה לדוגמה: " + q.model;
    return "";
  }
  // =============================================================== glossary
  var gl = { q: "", ch: "all", open: {} };
  function viewGlossary() {
    var chips = [["all", "הכול"]].concat(CH.map(function (c) { return ["ch:" + c.id, "פרק " + c.letter]; })).concat([["enrich", "העשרה"]]);
    paint('<div class="page-head"><h1 class="display">עיון</h1></div>' + refTabs("glossary") + '<p class="eyebrow">' + TERMS.filter(function (t) { return !t.enrich; }).length + " מונחים מהקורס · " + TERMS.filter(function (t) { return t.enrich; }).length + ' מונחי העשרה</p>' +
      '<div class="search-row"><label class="sr-only" for="g-search">חיפוש מונח</label><input class="input" id="g-search" type="search" placeholder="חיפוש בעברית או באנגלית, למשל: קורה סמויה, HIDDEN BEAM" value="' + esc(gl.q) + '" autocomplete="off"></div>' +
      '<div class="seg seg-scroll" role="group" aria-label="סינון לפי פרק">' + chips.map(function (c) { return '<button data-act="g-ch" data-v="' + c[0] + '" aria-pressed="' + (gl.ch === c[0]) + '">' + esc(c[1]) + "</button>"; }).join("") + "</div>" +
      '<p class="sr-only" id="g-status" aria-live="polite"></p><div id="g-out" class="g-out"></div>');
    renderGlossary();
    var inp = document.getElementById("g-search");
    inp.addEventListener("input", function () { gl.q = inp.value; renderGlossary(); });
  }
  function hl(text, q) {
    var t = esc(text); if (!q) return t;
    var re = new RegExp("(" + esc(q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi");
    return t.replace(re, "<mark>$1</mark>");
  }
  function renderGlossary() {
    var out = document.getElementById("g-out"); if (!out) return;
    var q = gl.q.trim().toLowerCase();
    var list = TERMS.filter(function (t) {
      if (gl.ch === "enrich" && !t.enrich) return false;
      if (gl.ch.indexOf("ch:") === 0 && t.chapter !== gl.ch.slice(3)) return false;
      if (gl.ch === "all" && t.enrich && !q) return false;
      return !q || (t.he + " " + (t.en || "") + " " + t.def + " " + (t.simple || "")).toLowerCase().indexOf(q) !== -1;
    }).sort(function (a, b) { var k = function (t) { return t.he.replace(/^[^\u05d0-\u05eaA-Za-z0-9]+/, ""); }; return k(a).localeCompare(k(b), "he"); });
    liveCount("g-status", list.length ? list.length + " מונחים" : "לא נמצאו מונחים");
    out.innerHTML = list.length ? '<div class="gl-list">' + list.map(function (t) {
      var l = L[t.lesson];
      var open = gl.open[t.id];
      return '<article class="gl-item' + (t.enrich ? " enrich" : "") + '"><div class="gl-head"><span class="t">' + hl(t.he, gl.q.trim()) + "</span>" + (t.en ? '<span class="en" dir="ltr">' + hl(t.en, gl.q.trim()) + "</span>" : "") + "</div>" +
        '<span class="d">' + hl(t.def, gl.q.trim()) + "</span>" +
        (t.simple ? '<span class="simple"><b>בפשטות:</b> ' + esc(t.simple) + ' <span class="tag-expl">הסבר משלים</span></span>' : "") +
        ((t.related || []).length ? '<button class="linkish" data-act="g-open" data-id="' + t.id + '" aria-expanded="' + !!open + '">מונחים דומים וההבדל (' + t.related.length + ")</button>" +
          (open ? '<ul class="rel">' + t.related.map(function (r) { return "<li><b>" + esc(r.he) + ":</b> " + esc(r.diff) + "</li>"; }).join("") + '</ul><span class="tag-expl">הסבר משלים</span>' : "") : "") +
        '<div class="gl-meta">' + (l ? '<a href="#lesson-' + l.id + '">' + esc(l.code + " " + l.title) + "</a>" : t.lib ? '<a href="#lib-' + t.lesson + '">העשרה: ' + esc(LIBID[t.lesson].title) + "</a>" : "") + (t.src ? srcChips(t.src) : "") + (t.enrich ? '<span class="tag-expl">העשרה</span>' : "") + "</div></article>";
    }).join("") + "</div>" : '<p class="muted">לא נמצאו מונחים. נסו מילה אחרת, או חפשו בכל החומר דרך <a href="#search">החיפוש</a>.</p>';
    langParts();
  }

  // =============================================================== search
  var sq = "";
  function viewSearch() {
    paint('<div class="page-head"><h1 class="display">חיפוש בכל החומר</h1><p class="muted">שיעורים, מונחים ועמודי המקור.</p></div>' +
      '<div class="search-row"><label class="sr-only" for="s-search">חיפוש</label><input class="input" id="s-search" type="search" placeholder="למשל: שיני קשר, ONE-WAY, כלונס, דיפון" value="' + esc(sq) + '" autocomplete="off"></div>' +
      (ai.s ? '<form class="ai-ask panel" data-act="ai-search"><label for="ai-sq"><b>' + I.spark + ' שאלה חופשית על החומר</b></label><div class="row"><input class="input" id="ai-sq" placeholder="למשל: מתי משתמשים בקורה סמויה?" autocomplete="off"><button class="btn btn-primary btn-sm" type="submit">לשאול</button></div><div class="ai-out" id="ai-out" hidden aria-live="polite"></div></form>' : "") +
      '<p class="sr-only" id="s-status" aria-live="polite"></p><div id="s-out"></div>');
    var inp = document.getElementById("s-search");
    inp.addEventListener("input", function () { sq = inp.value; renderSearch(); });
    inp.addEventListener("change", function () { rememberSearch(sq); });
    inp.addEventListener("keydown", function (e) { if (e.key === "ArrowDown") { var f = main.querySelector("#s-out a, #s-out button"); if (f) { e.preventDefault(); f.focus(); } } else if (e.key === "Enter") rememberSearch(sq); });
    document.getElementById("s-out").addEventListener("keydown", function (e) {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      var list = [].slice.call(this.querySelectorAll("a, button")), i = list.indexOf(document.activeElement);
      if (i === -1) return;
      e.preventDefault();
      if (e.key === "ArrowUp" && i === 0) inp.focus(); else { var n = list[i + (e.key === "ArrowDown" ? 1 : -1)]; if (n) n.focus(); }
    });
    renderSearch();
    if (!sq) inp.focus();
  }
  function snippet(txt, q) {
    var pos = txt.toLowerCase().indexOf(q.toLowerCase()); if (pos < 0) return null;
    var a = Math.max(0, pos - 70), b = Math.min(txt.length, pos + q.length + 90);
    return (a ? "…" : "") + txt.slice(a, b) + (b < txt.length ? "…" : "");
  }
  function renderSearch() {
    var out = document.getElementById("s-out"); if (!out) return;
    var q = sq.trim();
    if (q.length < 2) {
      var recent = recentSearches(), sugg = TERMS.filter(function (t) { return !t.enrich && t.related && t.related.length; }).slice(0, 6);
      if (sugg.length < 6) sugg = sugg.concat(TERMS.filter(function (t) { return !t.enrich && sugg.indexOf(t) === -1; }).slice(0, 6 - sugg.length));
      out.innerHTML = '<p class="muted">הקלידו לפחות שתי אותיות.</p>' +
        (recent.length ? '<div class="section-head"><h2>חיפושים אחרונים</h2></div><div class="chips">' + recent.map(function (r) { return '<button type="button" class="chip kw" data-act="s-try" data-q="' + esc(r) + '">' + esc(r) + "</button>"; }).join("") + "</div>" : "") +
        '<div class="section-head"><h2>אפשר לנסות</h2></div><div class="chips">' + sugg.map(function (t) { return '<button type="button" class="chip kw" data-act="s-try" data-q="' + esc(t.he) + '">' + esc(t.he) + "</button>"; }).join("") + "</div>";
      return;
    }
    var hits = [];
    LESSONS.forEach(function (l) {
      if ((l.title + " " + (l.keywords || []).join(" ")).toLowerCase().indexOf(q.toLowerCase()) !== -1) hits.push({ w: "שיעור", href: "#lesson-" + l.id, t: l.code + " " + l.title, s: l.summary || "" });
      ["full", "deep"].forEach(function (lv) {
        (l[lv] || []).forEach(function (s, i) {
          (s.blocks || []).forEach(function (b) {
            var txt = stripTags(b.html || "") + (b.rows ? " " + b.rows.map(function (r) { return r.join(" "); }).join(" ") : "");
            var sn = snippet(txt, q);
            if (sn) hits.push({ w: l.code + " · " + s.title + (b.k === "expl" ? " · הסבר משלים" : b.k === "verify" ? " · טעון אימות" : ""), href: "#lesson-" + l.id, lv: lv, anchor: "s-" + lv + "-" + (i + 1), lesson: l.id, t: "", s: sn });
          });
        });
      });
    });
    var terms = TERMS.filter(function (t) { return (t.he + " " + (t.en || "") + " " + t.def).toLowerCase().indexOf(q.toLowerCase()) !== -1; });
    var srcs = SOURCES.map(function (s) { var txt = (s.title || "") + " " + (s.blocks || []).map(function (b) { return b.text; }).join(" ") + " " + (s.tables || []).map(function (t) { return (t.rows || []).map(function (r) { return r.join(" "); }).join(" "); }).join(" "); return { s: s, sn: snippet(txt, q) }; }).filter(function (x) { return x.sn; });
    var html = '<div class="section-head"><h2>בשיעורים</h2><span class="count">' + hits.length + "</span></div>" +
      (hits.length ? '<div class="hits">' + hits.slice(0, 40).map(function (h) {
        return '<a class="hit" href="' + h.href + '"' + (h.anchor ? ' data-act="goto-level" data-lesson="' + h.lesson + '" data-lv="' + h.lv + '" data-target="' + h.anchor + '"' : "") + '><span class="w">' + esc(h.w) + "</span>" + (h.t ? "<b>" + esc(h.t) + "</b>" : "") + "<span>" + hl(h.s, q) + "</span></a>";
      }).join("") + "</div>" : '<p class="muted">לא נמצא בשיעורים.</p>');
    html += '<div class="section-head"><h2>מונחים</h2><span class="count">' + terms.length + "</span></div>" +
      (terms.length ? '<div class="gl-list">' + terms.slice(0, 24).map(function (t) { return '<div class="gl-item' + (t.enrich ? " enrich" : "") + '"><div class="gl-head"><span class="t">' + hl(t.he, q) + "</span>" + (t.en ? '<span class="en" dir="ltr">' + hl(t.en, q) + "</span>" : "") + '</div><span class="d">' + hl(t.def, q) + "</span></div>"; }).join("") + "</div>" : '<p class="muted">לא נמצאו מונחים.</p>');
    html += '<div class="section-head"><h2>בעמודי המקור</h2><span class="count">' + srcs.length + "</span></div>" +
      (srcs.length ? '<div class="hits">' + srcs.slice(0, 30).map(function (x) { return '<a class="hit" href="#source-' + x.s.id + '"><span class="w">' + esc(srcLabel(x.s.id)) + " · " + esc(x.s.title || "") + "</span><span>" + hl(x.sn, q) + "</span></a>"; }).join("") + "</div>" : '<p class="muted">לא נמצא בעמודי המקור.</p>');
    liveCount("s-status", hits.length + " תוצאות בשיעורים, " + terms.length + " מונחים, " + srcs.length + " בעמודי המקור");
    out.innerHTML = html;
    langParts();
  }
  var liveT = null;
  function liveCount(id, msg) { clearTimeout(liveT); liveT = setTimeout(function () { var el = document.getElementById(id); if (el) el.textContent = msg; }, 700); }
  function recentSearches() { try { var a = JSON.parse(lsGet("melachot-recent", "[]")); return Array.isArray(a) ? a.slice(0, 5) : []; } catch (e) { return []; } }
  function rememberSearch(q) { q = String(q || "").trim(); if (q.length < 2) return; var a = recentSearches().filter(function (x) { return x !== q; }); a.unshift(q); lsSet("melachot-recent", JSON.stringify(a.slice(0, 5))); }
  // =============================================================== sources & coverage
  var STATUS = { full: ["פוענחה", "ok"], partial: ["פוענחה חלקית", "part"], unclear: ["דורשת אימות", "bad"] };
  function usedIn(id) {
    return LESSONS.filter(function (l) { return (l.sources || []).indexOf(id) !== -1; });
  }
  var srcFilter = "all";
  function viewSources() {
    var groups = Object.keys(META.groups || {});
    var counts = { full: 0, partial: 0, unclear: 0 }, unused = 0, dups = 0;
    SOURCES.forEach(function (s) { counts[s.status] = (counts[s.status] || 0) + 1; if (s.duplicate_of) dups++; else if (!usedIn(s.id).length && !s.no_content) unused++; });
    var list = SOURCES.filter(function (s) { return srcFilter === "all" || s.id.indexOf(srcFilter) === 0 || (srcFilter === "open" && (s.status !== "full" || (s.unclear || []).length)); });
    var html = '<div class="page-head"><h1 class="display">עיון</h1></div>' + refTabs("sources") +
      '<p class="muted">' + SOURCES.length + " עמודי מקור: כל תמונה מההקלטות ששלחת, התמלול שלה, מה לא היה קריא, ובאילו שיעורים היא מופיעה.</p>";
    // student-first: thumbnails per recording
    groups.forEach(function (g) {
      var gs = SOURCES.filter(function (s) { return s.id.indexOf(g + "-") === 0 && !s.duplicate_of; });
      if (!gs.length) return;
      html += '<section class="src-group"><div class="section-head"><h2>' + esc(META.groups[g].name) + '</h2><span class="count">' + gs.length + '</span></div><div class="thumbs">' +
        gs.map(function (s) { return '<a class="thumb-a" href="#source-' + s.id + '"><img loading="lazy" src="' + IMG_BASE + esc(s.id) + '-sm.jpg" data-full="' + IMG_BASE + esc(s.id) + '.jpg" alt="" data-act="imgfail"><span><b>' + esc(srcLabel(s.id)) + "</b>" + esc(s.title || "(ללא כותרת)") + "</span></a>"; }).join("") + "</div></section>";
    });
    html += '<details class="panel cov-d"' + (srcFilter !== "all" ? " open" : "") + '><summary><b>דוח כיסוי</b>' + I.chev + "</summary>" +
      '<div class="stats wide">' +
      '<div class="stat"><span class="k">פוענחו במלואן</span><span class="v">' + counts.full + "</span></div>" +
      '<div class="stat"><span class="k">פוענחו חלקית</span><span class="v">' + counts.partial + "</span></div>" +
      '<div class="stat"><span class="k">דורשות אימות</span><span class="v">' + counts.unclear + "</span></div>" +
      '<div class="stat"><span class="k">כפילויות (אותו שקף)</span><span class="v">' + dups + '</span><span class="k">' + unused + " ללא שיבוץ בשיעור</span></div></div>" +
      '<div class="seg seg-scroll" role="group" aria-label="סינון">' + [["all", "הכול"]].concat(groups.map(function (g) { return [g, META.groups[g].short || META.groups[g].name]; })).concat([["open", "רק פערים פתוחים"]]).map(function (f) {
        return '<button type="button" data-act="src-filter" data-v="' + f[0] + '" aria-pressed="' + (srcFilter === f[0]) + '">' + esc(f[1]) + "</button>";
      }).join("") + "</div>" +
      '<div class="tbl-scroll"><table class="cov"><thead><tr><th scope="col">עמוד</th><th scope="col">כותרת</th><th scope="col">סטטוס</th><th scope="col">לא ברור</th><th scope="col">מופיע בשיעורים</th></tr></thead><tbody>' +
      list.map(function (s) {
        var st = STATUS[s.status] || ["?", "bad"], used = usedIn(s.id);
        return '<tr><th scope="row"><a href="#source-' + s.id + '">' + esc(srcLabel(s.id)) + "</a></th><td>" + esc(s.title || "(ללא כותרת)") + (s.duplicate_of ? '<small class="muted"> · כפילות של ' + esc(srcLabel(s.duplicate_of)) + "</small>" : "") + '</td><td><span class="st st-' + st[1] + '">' + st[0] + '</span></td><td class="num">' + (s.unclear || []).length + "</td><td>" +
          (used.length ? used.map(function (l) { return '<a href="#lesson-' + l.id + '">' + esc(l.code) + "</a>"; }).join(" ") : s.duplicate_of ? '<span class="muted">דרך ' + esc(srcLabel(s.duplicate_of)) + "</span>" : s.no_content ? '<span class="muted">' + esc(s.no_content) + "</span>" : '<span class="st st-bad">לא שובץ</span>') + "</td></tr>";
      }).join("") + "</tbody></table></div></details>";
    paint(html);
  }
  function viewSource(s) {
    var i = SOURCES.indexOf(s), prev = SOURCES[i - 1], next = SOURCES[i + 1];
    var st = STATUS[s.status] || ["?", "bad"], used = usedIn(s.id);
    var html = '<nav class="crumbs" aria-label="מיקום"><a href="#sources">עיון · עמודי המקור</a><span aria-hidden="true">/</span><span>' + esc(srcLabel(s.id)) + "</span></nav>" +
      '<div class="page-head"><span class="eyebrow">' + esc(((META.groups || {})[s.id.split("-")[0]] || {}).name || "") + ' · <span class="st st-' + st[1] + '">' + st[0] + "</span></span><h1>" + esc(s.title || "(ללא כותרת)") + "</h1></div>" +
      '<div class="src-view"><figure class="src-full"><span class="src-lbl">שקף מהקורס</span><button type="button" class="zoom" data-act="zoom" aria-label="הגדלה"><img src="' + IMG_BASE + esc(s.id) + '.jpg" alt="' + esc(s.title || "עמוד מקור") + '" data-act="imgfail"></button><figcaption class="muted">הקישו על התמונה להגדלה.</figcaption></figure>' +
      '<div class="src-text"><h2>תמלול</h2>' + transcriptHtml(s) +
      ((s.unclear || []).length ? '<h2>מה לא קריא</h2><ul class="unclear-list">' + s.unclear.map(function (u) { return "<li><b>" + esc(u.where || "") + ":</b> " + esc(u.best_reading || "") + ((u.alternatives || []).length ? ' <span class="muted">(או: ' + esc(u.alternatives.join(" / ")) + ")</span>" : "") + "</li>"; }).join("") + "</ul>" : "") +
      (s.notes ? '<h2>הערות התמלול</h2><p class="muted">' + esc(s.notes) + "</p>" : "") +
      '<h2>מופיע בשיעורים</h2>' + (used.length ? '<ul class="plain">' + used.map(function (l) { return '<li><a href="#lesson-' + l.id + '">' + esc(l.code + " " + l.title) + "</a></li>"; }).join("") + "</ul>" : s.duplicate_of ? '<p class="muted">זהו צילום נוסף של <a href="#source-' + s.duplicate_of + '">' + esc(srcLabel(s.duplicate_of)) + "</a>.</p>" : '<p class="muted">' + esc(s.no_content || "לא שובץ בשיעור.") + "</p>") +
      "</div></div>" +
      '<div class="pager">' + (prev ? '<a class="btn btn-ghost" href="#source-' + prev.id + '">' + I.arrowR + esc(srcLabel(prev.id)) + "</a>" : "<span></span>") + (next ? '<a class="btn btn-ghost" href="#source-' + next.id + '">' + esc(srcLabel(next.id)) + I.arrowL + "</a>" : "<span></span>") + "</div>";
    paint(html);
  }
  function transcriptHtml(s) {
    var h = "";
    var list = null;
    (s.blocks || []).forEach(function (b) {
      var cert = b.certainty && b.certainty !== "high" ? ' class="c-' + b.certainty + '"' : "";
      // a continuation of the previous bullet/paragraph (text starts with "…"): append, do not open a new item
      if (b.cont && /<\/(li|p)>$/.test(h)) { var close = h.match(/<\/(li|p)>$/)[0]; h = h.slice(0, -close.length) + " <span" + cert + ">" + esc(b.text) + "</span>" + close; return; }
      if (b.type === "bullet" || b.type === "numbered") {
        if (!list) { list = b.type === "numbered" ? "ol" : "ul"; h += "<" + list + ' class="tr-list">'; }
        h += "<li" + cert + (b.level > 1 ? ' style="margin-inline-start:' + (b.level - 1) * 1.2 + 'em"' : "") + ">" + esc(b.text) + "</li>";
        return;
      }
      if (list) { h += "</" + list + ">"; list = null; }
      if (b.type === "heading" || b.type === "subheading") h += "<h3" + cert + ">" + esc(b.text) + "</h3>";
      else if (b.type === "label" || b.type === "caption") h += '<p class="tr-label">' + esc(b.text) + "</p>";
      else h += "<p" + cert + ">" + esc(b.text) + "</p>";
    });
    if (list) h += "</" + list + ">";
    (s.tables || []).forEach(function (t) {
      h += '<div class="tbl-scroll"><table><caption>' + esc(t.title || "") + "</caption><thead><tr>" + (t.headers || []).map(function (x) { return '<th scope="col">' + esc(x) + "</th>"; }).join("") + "</tr></thead><tbody>" + (t.rows || []).map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + esc(c) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table></div>";
    });
    (s.figures || []).forEach(function (f) { h += '<p class="tr-fig"><b>איור/צילום:</b> ' + esc(f.description || "") + ((f.labels || []).length ? " · כיתובים: " + esc(f.labels.join(", ")) : "") + "</p>"; });
    if ((s.english_terms || []).length) h += '<p class="tr-en"><b>מונחים באנגלית:</b> <span dir="ltr">' + esc(s.english_terms.join(" · ")) + "</span></p>";
    if (s.footer) h += '<p class="muted">' + esc(s.footer) + "</p>";
    return h || '<p class="muted">אין טקסט בעמוד הזה.</p>';
  }

  // =============================================================== progress (P0-1, P2-4)
  function viewProgress() {
    var c = completion(), rd = readiness(), sk = streak();
    var chDone = CH.filter(function (x) { return x.lessons.every(function (l) { return S.done[l.id]; }); }).length;
    var learned = CARDS.filter(function (x) { return x.scope === "course" && S.cards[x.id] && S.cards[x.id].reps > 0; }).length;
    var courseCards = CARDS.filter(function (x) { return x.scope === "course"; }).length;
    var html = '<div class="page-head"><h1 class="display">התקדמות</h1></div><div class="stats wide">' +
      '<div class="stat"><span class="k">שיעורים שהושלמו</span><span class="v">' + c.d + "<small>/" + c.n + "</small></span>" + tape(c.p, false, "prog-done") + '<span class="k">' + chDone + " מתוך " + CH.length + " פרקים הושלמו</span></div>" +
      '<div class="stat"><span class="k">מוכנות למבחן</span>' + (rd ? '<span class="v v-l">' + MLABEL[rd.lv] + "</span>" + glyph(rd, true) + '<span class="k">על סמך ' + rd.n + " תשובות</span>" : '<span class="v v-l">טרם נבדק</span><span class="k">תופיע אחרי 40 תשובות או מבחן אחד</span>') + "</div>" +
      '<div class="stat"><span class="k">רצף ימי למידה</span><span class="v">' + sk + "<small>" + (sk === 1 ? "יום" : "ימים") + "</small></span></div>" +
      '<div class="stat"><span class="k">כרטיסיות שנלמדו</span><span class="v">' + learned + "<small>/" + courseCards + "</small></span>" + tape(pct(learned / Math.max(1, courseCards)), true) + "</div></div>";
    html += heatmap();
    if (planOn()) html += '<div class="section-head"><h2>התוכנית</h2><a class="link-more" href="#plan">לתוכנית</a></div><div class="panel">' + planTicks(planDayNow()) + "</div>";
    html += '<div class="section-head"><h2>לפי פרקים</h2></div><div class="bars panel">' + CH.map(function (x) {
      var cp = completion(x.lessons);
      return '<div class="bar-row bar-ch"><a href="#chapter-' + x.id + '">פרק ' + esc(x.letter) + ": " + esc(x.title) + "</a>" + tape(cp.p, true) + '<span class="mono-n">' + cp.d + "/" + cp.n + "</span>" + glyph(chapterM(x), true) + "</div>";
    }).join("") + "</div>";
    var all = LESSONS.map(function (l) { return { l: l, x: lessonM(l.id) }; });
    var strong = all.filter(function (o) { return o.x.lv >= 4 || (o.x.m !== null && o.x.m >= 0.85); });
    var weak = weakLessons(6);
    var untested = all.filter(function (o) { return o.x.m === null && (S.done[o.l.id] || lessonOpened(o.l.id)); });
    function li(o) { return '<li><a href="#lesson-' + o.l.id + '">' + esc(o.l.code + " " + o.l.title) + "</a>" + glyph(o.x) + "</li>"; }
    html += '<div class="section-head"><h2>שליטה לפי שיעור</h2></div><div class="two-col"><div class="panel"><h3 class="h-sm">שולטים</h3>' + (strong.length ? '<ul class="plain">' + strong.map(li).join("") + "</ul>" : '<p class="muted">יופיעו כאן אחרי תרגול וחזרה מרווחת.</p>') + "</div>" +
      '<div class="panel"><h3 class="h-sm">צריך חיזוק</h3>' + (weak.length ? '<ul class="plain">' + weak.map(li).join("") + "</ul>" : '<p class="muted">אין כרגע שיעורים שצריך לחזק.</p>') + "</div></div>" +
      (untested.length ? '<p class="untested">טרם נבדקו: ' + plural(untested.length, "שיעור אחד", "שיעורים") + ' <button type="button" class="btn btn-sm" data-act="start-scope" data-scope="untested">תרגול של 10 שאלות מהם</button></p>' : "");
    var marks = Object.keys(S.bookmarks).map(function (k) { return S.bookmarks[k]; }).filter(function (b) { return L[b.lesson]; }).sort(function (a, b) { return b.t - a.t; });
    html += '<div class="section-head" id="bm"><h2>סימנתם לחזרה (' + marks.length + ")</h2></div>" + (marks.length ? '<ul class="plain panel">' + marks.map(function (b) {
      return '<li><a href="#lesson-' + b.lesson + '" data-act="goto-level" data-lesson="' + b.lesson + '" data-lv="' + b.anchor.split("-")[1] + '" data-target="' + esc(b.anchor) + '">' + esc(L[b.lesson].code + " · " + b.title) + '</a><span class="muted">' + fmtDate(b.t) + "</span></li>";
    }).join("") + "</ul>" : '<p class="muted panel">סמנו קטע בשיעור בכוכב כדי לחזור אליו מכאן.</p>');
    var byType = {}, nAns = 0;
    Object.keys(S.qstats).forEach(function (id) { var s = S.qstats[id], q = Q[id]; if (!q) return; byType[q.type] = byType[q.type] || { r: 0, n: 0 }; byType[q.type].r += s.r; byType[q.type].n += s.r + s.w; nAns += s.r + s.w; });
    if (Object.keys(byType).length) {
      html += '<details class="panel breakdown"' + (nAns >= 20 ? " open" : "") + "><summary><b>הצלחה לפי סוג שאלה</b>" + I.chev + '</summary><div class="bars">' + Object.keys(byType).map(function (t) {
        var p = pct(byType[t].r / Math.max(1, byType[t].n)); return '<div class="bar-row"><span>' + TYPE_NAME[t] + " (" + byType[t].n + ")</span>" + tape(p, true) + '<span class="mono-n" dir="ltr">' + p + "%</span></div>";
      }).join("") + "</div></details>";
    }
    html += '<div class="section-head"><h2>היסטוריית מבחנים</h2></div>' + (S.exams.length ? '<div class="tbl-scroll panel"><table class="hist"><thead><tr><th scope="col">תאריך</th><th scope="col">מבחן</th><th scope="col">ציון</th><th scope="col">שאלות</th><th scope="col">זמן</th></tr></thead><tbody>' +
      S.exams.slice(0, 30).map(function (e) { return "<tr><td>" + fmtDate(e.t) + "</td><td>" + esc(e.title) + '</td><td class="num" dir="ltr">' + e.score + '%</td><td class="num">' + e.n + '</td><td class="num">' + fmtDur(e.dur) + "</td></tr>"; }).join("") + "</tbody></table></div>" : '<p class="muted panel">עדיין אין מבחנים.</p>');
    html += footHtml();
    paint(html);
  }
  function heatmap() {
    var d = new Date(); d.setDate(d.getDate() - d.getDay() - 21);
    var cols = [], max = 1;
    for (var w = 0; w < 4; w++) { var col = []; for (var i = 0; i < 7; i++) { var k = dayKey(d), n = S.days[k] || 0; max = Math.max(max, n); col.push({ k: k, n: n, f: k > today() }); d.setDate(d.getDate() + 1); } cols.push(col); }
    var days = ["א", "ב", "ג", "ד", "ה", "ו", "ש"], h = '<div class="heat-w"><div class="heat" role="group" aria-label="פעילות ב-4 השבועות האחרונים">';
    for (var r = 0; r < 7; r++) {
      h += '<span class="hd" aria-hidden="true">' + days[r] + "</span>";
      cols.forEach(function (col) { var x = col[r]; var lv = x.f ? "f" : !x.n ? "" : x.n > 20 ? "l3" : x.n > 6 ? "l2" : "l1"; h += '<i class="' + lv + '" role="img" aria-label="' + fmtDay(x.k) + ": " + x.n + ' פעולות"></i>'; });
    }
    return h + '</div><div class="heat-leg" aria-hidden="true"><span>פחות</span><i></i><i class="l1"></i><i class="l2"></i><i class="l3"></i><span>יותר</span></div></div>';
  }

  // =============================================================== settings (P2-3)
  function settingsSheet() {
    function seg(k, label, opts) {
      return '<div class="field"><span class="lbl" id="set-' + k + '">' + label + '</span><div class="seg" role="group" aria-labelledby="set-' + k + '">' +
        opts.map(function (o) { return '<button type="button" data-act="set" data-k="' + k + '" data-v="' + o[0] + '" aria-pressed="' + (SET[k] === o[0]) + '">' + o[1] + "</button>"; }).join("") + "</div></div>";
    }
    openSheet({ title: "הגדרות", body: '<div class="setup">' + seg("theme", "ערכת צבעים", [["auto", "לפי המכשיר"], ["light", "בהיר"], ["dark", "כהה"]]) +
      seg("text", "גודל טקסט", [["m", "רגיל"], ["l", "גדול"]]) + seg("motion", "תנועה", [["auto", "לפי המכשיר"], ["reduce", "מופחתת"]]) +
      '<div class="set-reset"><p class="muted">' + saveStatusText() + '</p><button type="button" class="btn btn-ghost btn-danger" data-act="reset-ask">איפוס התקדמות</button></div></div>' });
  }
  function moreCards() {
    if (dailyQueueSize()) { rev = null; go("#review"); return; }
    var pool = CARDS.filter(function (c) { return c.scope === "course" && S.cards[c.id]; });
    if (!pool.length) { toast("עוד אין כרטיסיות. קראו קטע בשיעור כדי לפתוח את הכרטיסיות שלו."); return; }
    rev = cramFrom(buildReview(""), pool, 10); rev.key = "daily";
    go("#review");
  }
  function startCheck(cl) {
    var pool = lessonQs(cl).filter(function (q) { return q.type === "tf" || q.type === "mcq" || q.type === "cloze"; });
    startRun("practice", "בדיקת הבנה: " + L[cl].title, spread(pool, 5), "#lesson-" + cl, { kind: "check", lesson: cl });
  }
  function mapSheet() {
    if (!run) return;
    openSheet({ title: "מפת השאלות", cls: "map-sheet", focus: ".qmap .cur",
      body: '<div class="qmap">' + run.items.map(function (x, k) {
        var a = answeredExam(x);
        return '<button type="button" class="qm' + (a ? " ans" : "") + (k === run.i ? " cur" : "") + (x.flag ? " flag" : "") + '" data-act="q-jump" data-k="' + k + '" aria-label="שאלה ' + (k + 1) + (a ? ", נענתה" : ", לא נענתה") + (x.flag ? ", מסומנת" : "") + '">' + (k + 1) + "</button>";
      }).join("") + '</div><p class="qmap-leg"><span class="qml ans"></span>נענתה · <span class="qml"></span>לא נענתה · <span class="qml flag"></span>מסומנת</p>',
      actions: [{ label: "הגשת המבחן", act: "exam-submit", cls: "btn-primary" }] });
  }

  // =============================================================== events
  var KEEP_SHEET = { set: 1, "vw-z": 1, "dlg-close": 1, "cs-memo": 1 };
  document.addEventListener("click", function (e) {
    var b = e.target.closest(".prose b.cloze");
    if (b) { b.classList.toggle("shown"); return; }
    var el = e.target.closest("[data-act]");
    if (!el) return;
    var act0 = el.getAttribute("data-act");
    var introSkip = !!(document.getElementById("intro-skip") || {}).checked;
    if (dlg && dlg.el.contains(el) && !KEEP_SHEET[act0]) closeSheet(true);
    var it = run && !run.finished ? run.items[run.i] : null;
    switch (act0) {
      case "skip": e.preventDefault(); main.focus(); break;
      case "dlg-close": closeSheet(); break;
      case "settings": settingsSheet(); break;
      case "set":
        SET[el.getAttribute("data-k")] = el.getAttribute("data-v"); saveSettings();
        el.parentNode.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", String(x === el)); });
        break;
      case "reset-ask":
        openSheet({ title: "למחוק את כל ההתקדמות?", body: "<p>לא ניתן לבטל.</p>", actions: [{ label: "לבטל", act: "dlg-close", cls: "btn-primary" }, { label: "למחוק", act: "reset-do", cls: "btn-danger" }] });
        break;
      case "reset-do": S = blank(); run = null; rev = null; save(); obStep = 0; go("#home"); toast("ההתקדמות אופסה"); break;
      case "flip": e.preventDefault(); flip(); break;
      case "rate": rate(el.getAttribute("data-r")); break;
      case "rev-exit": var rb = rev && rev.back; rev = null; go(rb && !FOCUS[rb.slice(1).split("-")[0]] ? rb : "#cards"); break;
      case "cram": if (rev && rev.pool) { rev = cramFrom(rev, rev.pool); viewReview(rev.key === "daily" ? "" : rev.key); } break;
      case "more-cards": e.preventDefault(); moreCards(); break;
      case "quick-practice": e.preventDefault(); startScope("quick", 10); break;
      case "start-scope": e.preventDefault(); startScope(el.getAttribute("data-scope"), el.getAttribute("data-scope") === "mistakes" ? 15 : 10); break;
      case "preset-ch":
        openSheet({ title: "תרגול לפי פרק", body: '<div class="pick-list">' + CH.map(function (c) { return '<button type="button" class="pick" data-act="start-scope" data-scope="ch:' + c.id + '"><b>פרק ' + esc(c.letter) + ": " + esc(c.title) + "</b><span>" + poolFor("ch:" + c.id).length + " שאלות</span></button>"; }).join("") + "</div>" });
        break;
      case "preset-type":
        openSheet({ title: "תרגול לפי סוג שאלה", body: '<div class="pick-list">' + Object.keys(TYPE_NAME).map(function (t) { var n = poolFor("t:" + t).length; return '<button type="button" class="pick" data-act="start-scope" data-scope="t:' + t + '"' + (n ? "" : " disabled") + "><b>" + TYPE_NAME[t] + "</b><span>" + n + " שאלות</span></button>"; }).join("") + "</div>" });
        break;
      case "level":
        var lid = route().slice(7); if (!L[lid]) break;
        S.lvl[lid] = el.getAttribute("data-lv"); save(); viewLesson(L[lid]);
        var lb = main.querySelector(".lesson-body");
        if (lb) { var y = lb.getBoundingClientRect().top + window.scrollY - stickyH() - 8; if (window.scrollY > y) window.scrollTo(0, y); }
        var tb = document.getElementById("tab-" + S.lvl[lid]); if (tb) tb.focus({ preventScroll: true });
        break;
      case "goto-level":
        S.lvl[el.getAttribute("data-lesson")] = el.getAttribute("data-lv"); pendingScroll = el.getAttribute("data-target");
        if (el.getAttribute("href") === location.hash) { e.preventDefault(); render(); var g0 = document.getElementById(pendingScroll); pendingScroll = null; if (g0) { openAncestors(g0); g0.scrollIntoView({ block: "start" }); } }
        break;
      case "goto": pendingScroll = el.getAttribute("data-target"); break;
      case "reveal": if (el.closest(".remember-list.hide")) el.classList.toggle("shown"); break;
      case "reveal-cs": if (el.closest(".cheat.memo")) el.classList.toggle("shown"); break;
      case "cs-memo":
        var on = el.getAttribute("aria-pressed") !== "true"; el.setAttribute("aria-pressed", String(on));
        main.querySelectorAll(".cheat").forEach(function (ol) { ol.classList.toggle("memo", on); ol.querySelectorAll(".ct").forEach(function (t) { t.classList.remove("shown"); t.setAttribute("tabindex", on ? "0" : "-1"); if (on) t.setAttribute("role", "button"); else t.removeAttribute("role"); }); });
        break;
      case "cs-more": var cl0 = main.querySelector(".cheat.clip"); if (cl0) cl0.classList.remove("clip"); el.remove(); break;
      case "kw-more": el.parentNode.classList.add("all"); el.remove(); break;
      case "vg":
        var vo = el.getAttribute("aria-expanded") !== "true"; el.setAttribute("aria-expanded", String(vo));
        var vb = document.getElementById(el.getAttribute("aria-controls")); if (vb) vb.hidden = !vo;
        break;
      case "bookmark":
        var key = el.getAttribute("data-lesson") + "|" + el.getAttribute("data-anchor");
        if (S.bookmarks[key]) delete S.bookmarks[key]; else S.bookmarks[key] = { lesson: el.getAttribute("data-lesson"), anchor: el.getAttribute("data-anchor"), title: el.getAttribute("data-title"), t: Date.now() };
        save(); el.classList.toggle("on", !!S.bookmarks[key]); el.setAttribute("aria-pressed", String(!!S.bookmarks[key]));
        if (S.bookmarks[key]) toast("סומן לחזרה.", '<a href="#progress" data-act="goto" data-target="bm">לכל הסימניות</a>'); else toast("הסימון הוסר");
        break;
      case "toggle-done":
        var did = el.getAttribute("data-id");
        if (S.done[did]) delete S.done[did]; else { S.done[did] = Date.now(); touchDay(); }
        save(); viewLesson(L[did]); updateBadge();
        toast(S.done[did] ? "השיעור סומן כהושלם. הכרטיסיות שלו בחזרה היומית." : "הסימון בוטל");
        var pr = document.getElementById("s-practice"); if (pr) pr.scrollIntoView({ block: "center" });
        if (S.done[did]) maybeChapterDone(did);
        break;
      case "mark-done":
        var md = el.getAttribute("data-id");
        if (!S.done[md]) { S.done[md] = Date.now(); touchDay(); }
        save(); run = null; toast("השיעור סומן כהושלם."); go("#lesson-" + md);
        setTimeout(function () { if (route() === "lesson-" + md) maybeChapterDone(md); }, 300);
        break;
      case "toggle-read":
        var rid = el.getAttribute("data-id");
        if (S.read[rid]) delete S.read[rid]; else { S.read[rid] = Date.now(); touchDay(); }
        save(); viewLib(LIBID[rid]); updateBadge(); break;
      case "toggle-ch":
        var cid = el.getAttribute("data-id"), lst = document.getElementById("chl-" + cid), op = !!(lst && lst.hidden);
        if (!lst) break;
        lst.hidden = !op; el.setAttribute("aria-expanded", String(op)); document.getElementById("ch-" + cid).classList.toggle("open", op);
        openCh[cid] = op; lsSet("melachot-open-ch2", JSON.stringify(openCh));
        break;
      case "ch-jump":
        var tg = document.getElementById(el.getAttribute("data-target"));
        if (tg) tg.scrollIntoView({ block: "start", behavior: motionOK() ? "smooth" : "auto" });
        break;
      case "glossary-q": gl.q = el.getAttribute("data-q"); gl.ch = "all"; break;
      case "s-try": sq = el.getAttribute("data-q"); var si = document.getElementById("s-search"); if (si) si.value = sq; rememberSearch(sq); renderSearch(); break;
      case "start-check": e.preventDefault(); startCheck(el.getAttribute("data-id")); break;
      case "start-lesson":
        var sl = el.getAttribute("data-id"), lq = lessonQs(sl);
        startRun("practice", (L[sl] ? "תרגול: " + L[sl].title : "בוחן העשרה: " + LIBID[sl].title), spread(lq, lq.length), lessonHref(sl), { scope: L[sl] ? "l:" + sl : "" }); break;
      case "p-diff": cfg.diff = +el.getAttribute("data-n"); cfg.open = true; viewPracticeHub("practice"); break;
      case "p-type": var t = el.getAttribute("data-t"); cfg.types[t] = !cfg.types[t]; cfg.open = true; viewPracticeHub("practice"); break;
      case "p-count": cfg.count = +el.getAttribute("data-n"); cfg.open = true; viewPracticeHub("practice"); break;
      case "p-start":
        var list = poolFor(cfg.scope, cfg);
        startRun("practice", scopeTitle(cfg.scope), cfg.count ? spread(list, cfg.count) : shuffle(list), "#practice", { scope: cfg.diff || Object.keys(cfg.types).some(function (k) { return cfg.types[k]; }) ? "" : cfg.scope }); break;
      case "exam-full": e.preventDefault(); startExam("מבחן כולל", spread(poolFor("mixed", { auto: true }), 30), 45, { kind: "full" }); break;
      case "exam-ch": e.preventDefault(); examIntro(el.getAttribute("data-id")); break;
      case "exam-ch-go": if (introSkip) { S.seen.examIntro = Date.now(); save(); } startChapterExam(el.getAttribute("data-id")); break;
      case "pretest": e.preventDefault(); startPretest(el.getAttribute("data-ch"), el.getAttribute("data-phase") || "pre"); break;
      case "run-exit": runExit(); break;
      case "run-leave": persistRun(); go("#home"); break;
      case "run-quit": runQuit(); break;
      case "resume-run":
        if (!(run && !run.finished && (run.mode === "exam" || run.mode === "pretest"))) { run = null; restoreActive(); }
        if (run) { checkExpiredRun(); go(run.finished ? "#run" : run.route || "#run"); }
        break;
      case "answer":
        if (!it) return; var k = +el.getAttribute("data-k");
        if (run.mode === "exam") { it.choice = k; persistRun(); viewRun(); }
        else if (!it.done) { it.choice = k; settle(it); viewRun(); }
        break;
      case "q-check": if (it && !it.done && answeredExam(it)) { settle(it); viewRun(); } break;
      case "q-next":
        if (!run || run.finished) return;
        if (run.i < run.items.length - 1) { run.i++; if (run.mode === "case") saveCase(); else persistRun(); viewRun(); window.scrollTo(0, 0); }
        else if (run.mode !== "exam") finishRun();
        break;
      case "q-prev": if (run && run.i > 0) { run.i--; persistRun(); viewRun(); window.scrollTo(0, 0); } break;
      case "q-jump": if (run) { run.i = +el.getAttribute("data-k"); persistRun(); viewRun(); window.scrollTo(0, 0); } break;
      case "q-flag": if (it) { it.flag = !it.flag; persistRun(); viewRun(); } break;
      case "q-map": mapSheet(); break;
      case "exam-submit":
        if (!run || run.finished) break;
        var un = run.items.filter(function (x) { return !answeredExam(x); }).length;
        if (un) openSheet({ title: "יש " + un + " שאלות בלי תשובה", body: "<p>שאלה בלי תשובה נספרת כטעות.</p>", actions: [{ label: "לחזור לשאלות", act: "dlg-close", cls: "btn-primary" }, { label: "להגיש בכל זאת", act: "exam-submit-force" }] });
        else submitExam();
        break;
      case "exam-submit-force": if (run && !run.finished) { if (route() !== "run") { submitExam(true); go("#run"); } else submitExam(); } break;
      case "retry-wrong":
        if (!run) break;
        var w = run.items.filter(function (x) { return x.id && x.score !== 1; }).map(function (x) { return Q[x.id]; });
        startRun("practice", "תרגול חוזר: הטעויות", w, run.back); break;
      case "run-again": if (run) startScope(run.scope || "mixed", 10); break;
      case "goto-mis": var mis = document.getElementById("mis"); if (mis) mis.scrollIntoView({ block: "start" }); break;
      case "m-term":
        if (!it) return; var ti = +el.getAttribute("data-i");
        if (it.map[ti] !== undefined) { delete it.map[ti]; it.sel = null; } else it.sel = it.sel === ti ? null : ti;
        persistRun(); viewRun(); break;
      case "m-def":
        if (!it || it.sel === null || it.sel === undefined) { toast("קודם בחרו מונח"); return; }
        var di = +el.getAttribute("data-i");
        Object.keys(it.map).forEach(function (kk) { if (it.map[kk] === di) delete it.map[kk]; });
        it.map[it.sel] = di; it.sel = null; persistRun(); viewRun(); break;
      case "cloze-pick":
        if (!it) return; var w2 = it.bank[+el.getAttribute("data-i")], slot = it.fill.indexOf(null);
        if (slot !== -1) { it.fill[slot] = w2; persistRun(); viewRun(); } break;
      case "cloze-clear": if (it && !it.done) { it.fill[+el.getAttribute("data-k")] = null; persistRun(); viewRun(); } break;
      case "o-pick": if (it) { it.picked.push(+el.getAttribute("data-si")); persistRun(); viewRun(); } break;
      case "o-unpick": if (it && !it.done) { it.picked.splice(+el.getAttribute("data-pos"), 1); persistRun(); viewRun(); } break;
      case "open-show": var ta = document.getElementById("open-a"); if (it) { it.text = ta ? ta.value : ""; it.shown = true; viewRun(); } break;
      case "open-grade":
        if (it) { it.score = +el.getAttribute("data-s"); it.done = true; if (run.mode !== "pretest") record(Q[it.id], it.score); run.just = it.id; save(); persistRun(); viewRun(); }
        break;
      case "open-ai":
        if (!it) return;
        var ta2 = document.getElementById("open-a"), qq = Q[it.id]; it.text = ta2 ? ta2.value : "";
        if (!it.text.trim()) { toast("כתבו קודם תשובה"); return; }
        runAI("ai-out", aiPrompt("בדוק את תשובת הסטודנט לשאלה. כתוב מה נכון בה, מה חסר או שגוי לעומת התשובה לדוגמה ונקודות המפתח, ותן הערכה: מלאה / חלקית / חסרה.",
          L[qq.lesson], "השאלה: " + qq.q + "\nתשובה לדוגמה: " + qq.model + "\nנקודות מפתח: " + (qq.points || []).join("; ") + "\nתשובת הסטודנט: " + it.text)); break;
      case "ai": runAI("ai-out", aiPrompt(AI_TASKS[el.getAttribute("data-task")], L[route().slice(7)])); break;
      case "g-ch": gl.ch = el.getAttribute("data-v"); viewGlossary(); break;
      case "g-open": var gid = el.getAttribute("data-id"); gl.open[gid] = !gl.open[gid]; renderGlossary(); break;
      case "src-filter": srcFilter = el.getAttribute("data-v"); viewSources(); break;
      case "zoom": el.classList.toggle("on"); break;
      case "case-start": if (run && run.mode === "case") { run.intro = false; run.i = 0; saveCase(); viewRun(); window.scrollTo(0, 0); } break;
      case "case-restart": if (run && run.mode === "case") { buildCaseRun(CASEID[run.caseId], true); viewRun(); window.scrollTo(0, 0); } break;
      case "toc": tocSheet(); break;
      case "toc-go": var tgt = document.getElementById(el.getAttribute("data-target")); if (tgt) tgt.scrollIntoView({ block: "start" }); break;
      case "memo":
        var mo = !clozeOn(); lsSet(CLOZE_KEY, mo ? "1" : "0"); el.setAttribute("aria-pressed", String(mo)); applyCloze(mo);
        toast(mo ? "מצב שינון: הקישו על מילה מוסתרת כדי לחשוף אותה" : "מצב שינון כבוי"); break;
      case "legend": legendSheet(); break;
      case "legend-ok": S.seen.legend = Date.now(); save(); break;
      case "dg-zoom":
        var fg = el.closest("figure"), sv = fg && fg.querySelector("svg.drawing");
        if (sv) openViewer(sv.outerHTML.replace(/ stepping/g, "").replace(/ class="pt pt-(\d+) hl"/g, ' class="pt pt-$1"'), (fg.querySelector("figcaption .dg-t") || {}).textContent || "תרשים");
        break;
      case "dg-play": playSteps(el.closest(".dg-step")); break;
      case "dg-prev": stopPlay(); var bx = el.closest(".dg-step"); setStep(bx, +bx.getAttribute("data-i") - 1); break;
      case "dg-next": stopPlay(); var bx2 = el.closest(".dg-step"); setStep(bx2, +bx2.getAttribute("data-i") + 1); break;
      case "vw-z": var vw = document.querySelector(".vw"); if (vw && vw._zoom) vw._zoom(el.getAttribute("data-z")); break;
      case "ai-anim":
        var img = el.parentNode.querySelector("img.ai-img"), ga = el.getAttribute("aria-pressed") !== "true";
        if (!img) break;
        img.classList.remove("failed");
        if (ga) { img.setAttribute("data-still", img.getAttribute("src")); img.setAttribute("data-srcset", img.getAttribute("srcset") || ""); img.removeAttribute("srcset"); img.src = el.getAttribute("data-gif"); }
        else { img.src = img.getAttribute("data-still"); if (img.getAttribute("data-srcset")) img.setAttribute("srcset", img.getAttribute("data-srcset")); }
        el.setAttribute("aria-pressed", String(ga)); var ic = el.querySelector("svg"); if (ic) ic.outerHTML = ga ? I.pause : I.play;
        break;
      case "plan-tick":
        var d0 = el.getAttribute("data-day"), ix = el.getAttribute("data-idx");
        S.plan.done[d0] = Object.assign({}, S.plan.done[d0]);
        if (S.plan.done[d0][ix]) delete S.plan.done[d0][ix]; else S.plan.done[d0][ix] = Date.now();
        S.plan.t = Date.now(); save(); render();
        var tk = document.querySelector('[data-act="plan-tick"][data-day="' + d0 + '"][data-idx="' + ix + '"]'); if (tk) tk.focus({ preventScroll: true });
        break;
      case "plan-carry": S.plan.carry = { d: today(), day: +el.getAttribute("data-day") }; S.plan.t = Date.now(); save(); render(); break;
      case "plan-shift": S.plan.shift = (S.plan.shift || 0) + 1; S.plan.carry = null; S.plan.t = Date.now(); save(); render(); toast("התוכנית נדחתה ביום אחד"); break;
      case "ob-plan": obStep = 1; render(); var oc = main.querySelector(".choice"); if (oc) oc.focus(); break;
      case "ob-back": obStep = 0; render(); break;
      case "ob-self": S.plan = Object.assign(blankPlan(), { mode: "self", t: Date.now() }); S.auto = null; save(); render(); break;
      case "ob-start":
        S.plan = Object.assign(blankPlan(), { mode: "plan", start: addDays(today(), +el.getAttribute("data-when") || 0), t: Date.now(), done: S.plan.done || {} });
        obStep = 0; save();
        if (route() === "home") render(); else go("#home");
        window.scrollTo(0, 0); break;
      case "resume":
        var rsid = el.getAttribute("data-id"), ps = S.pos[rsid];
        if (ps && ps.anchor) { S.lvl[rsid] = ps.level; pendingResume = rsid; }
        if (location.hash === "#lesson-" + rsid) { e.preventDefault(); location.hash = "#home"; location.hash = "#lesson-" + rsid; }
        break;
      case "print": window.print(); break;
    }
  });
  document.addEventListener("submit", function (e) {
    var f = e.target.closest("[data-act]"); if (!f) return;
    e.preventDefault();
    var a = f.getAttribute("data-act");
    if (a === "ai-ask") { var v = document.getElementById("ai-q").value.trim(); if (v) runAI("ai-out", aiPrompt("ענה על שאלת הסטודנט.", L[route().slice(7)], "השאלה: " + v)); }
    if (a === "ai-search") { var v2 = document.getElementById("ai-sq").value.trim(); if (v2) runAI("ai-out", aiPrompt("ענה על שאלת הסטודנט על חומר הקורס.", null, "השאלה: " + v2)); }
  });
  document.addEventListener("change", function (e) {
    var el = e.target;
    if (el.id === "p-scope") cfg.scope = el.value;
    else if (el.id === "p-enrich") cfg.enrich = el.checked;
  });
  document.addEventListener("toggle", function (e) { if (e.target && e.target.id === "custom") cfg.open = e.target.open; if (e.target && e.target.open) tableRegions(); }, true);
  document.addEventListener("input", function (e) { if (e.target.id === "open-a" && run && !run.finished) run.items[run.i].text = e.target.value; });
  document.addEventListener("load", function (e) { var t = e.target; if (t && t.classList && t.classList.contains("ai-img")) t.classList.add("loaded"); }, true);
  document.addEventListener("error", function (e) {
    var t = e.target;
    if (t && t.classList && t.classList.contains("ai-img")) { t.classList.add("failed"); return; }
    if (t && t.tagName === "IMG" && t.hasAttribute("data-full")) { var full = t.getAttribute("data-full"); t.removeAttribute("data-full"); t.src = full; return; }
    if (t && t.tagName === "IMG" && t.getAttribute("data-act") === "imgfail") {
      var fig = t.closest("figure");
      if (fig && !fig.querySelector(".img-missing")) { t.hidden = true; var p = document.createElement("p"); p.className = "img-missing muted"; p.textContent = "תמונת המקור לא זמינה בגרסה הזו. התמלול מופיע כאן."; fig.insertBefore(p, fig.firstChild); }
      else if (!fig) t.style.visibility = "hidden";
    }
  }, true);
  document.addEventListener("keydown", function (e) {
    if (dlg) {
      if (e.key === "Escape") { e.preventDefault(); closeSheet(); return; }
      trapFocus(e); return;
    }
    var tag = e.target && e.target.tagName;
    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
    var h = route();
    if (h.indexOf("review") === 0) {
      var r = rev; if (!r || r.i >= r.queue.length) return;
      if ((e.key === " " || e.key === "Enter") && !r.flipped) { e.preventDefault(); flip(); }
      else if (r.flipped && /^[1-4]$/.test(e.key)) { e.preventDefault(); rate(["again", "hard", "good", "easy"][+e.key - 1]); }
      else if (r.flipped && e.key === " " && e.target.id === "flash") { e.preventDefault(); flip(); }
    } else if (run && !run.finished && FOCUS[parts().head]) {
      var it = run.items[run.i];
      if (!it || !it.id) { if (e.key === "Enter" && document.activeElement.tagName !== "BUTTON") { var nb0 = document.getElementById("next-q"); if (nb0) { e.preventDefault(); nb0.click(); } } return; }
      if (/^[1-6]$/.test(e.key) && it.perm && +e.key <= it.perm.length && (!it.done || run.mode === "exam")) {
        e.preventDefault(); var bt = main.querySelector('[data-act="answer"][data-k="' + (+e.key - 1) + '"]'); if (bt) bt.click();
      } else if (e.key === "Enter" && document.activeElement && document.activeElement.tagName !== "BUTTON" && document.activeElement.tagName !== "A") {
        var nb = document.querySelector('#ab [data-act="q-next"],#ab [data-act="exam-submit"],#ab [data-act="q-check"]:not([disabled]),#ab [data-act="case-start"]');
        if (nb) { e.preventDefault(); nb.click(); }
      }
    }
    if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches(".prose b.cloze, [data-act='o-unpick'], .cheat.memo .ct")) {
      e.preventDefault(); e.target.click();
    }
  });
  // one scroll loop: sticky shadow (M18), bottom-nav auto-hide on reading pages (M14), reading tracker, chapter scroll-spy, cheat-sheet end
  var lastY = window.scrollY, acc = 0, ticking = false;
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  function onScroll() {
    ticking = false;
    var y = window.scrollY, dy = y - lastY; lastY = y;
    var atEnd = window.innerHeight + y >= document.documentElement.scrollHeight - 8;
    if (topbar) topbar.classList.toggle("scrolled", y > 2);
    if (document.body.classList.contains("reading")) {
      if (dy > 0) { acc += dy; if (acc > 24 && y > 120) document.body.classList.add("nav-hide"); }
      else if (dy < 0) { acc = 0; document.body.classList.remove("nav-hide"); }
      if (atEnd) document.body.classList.remove("nav-hide");
    }
    if (LV) trackReading();
    if (CHV) chapterSpy();
    if (SHEETV && atEnd && !SHEETV.logged) { SHEETV.logged = true; act("sheet:" + SHEETV.ch); save(); }
  }
  function chapterSpy() {
    var top = (topbar ? topbar.offsetHeight : 56) + 70, cur = CHV.ids[0];
    CHV.ids.forEach(function (id) { var el = document.getElementById(id); if (el && el.getBoundingClientRect().top < top) cur = id; });
    if (cur === CHV.cur) return;
    CHV.cur = cur;
    main.querySelectorAll(".chip-nav").forEach(function (b) {
      var on = b.getAttribute("data-target") === cur;
      if (on) { b.setAttribute("aria-current", "true"); b.scrollIntoView({ block: "nearest", inline: "nearest" }); } else b.removeAttribute("aria-current");
    });
  }
  document.getElementById("nav").addEventListener("focusin", function () { document.body.classList.remove("nav-hide"); });
  // WCAG 2.4.11: a control that receives focus is scrolled clear of the sticky top bars and the fixed bottom bars
  var BARS_TOP = ".topbar, #level-bar, .ch-nav, .studybar, .sb-tape", BARS_BOT = ".nav, #ab";
  function barEdge(sel, bottom) {
    var edge = bottom ? window.innerHeight : 0;
    document.querySelectorAll(sel).forEach(function (b) {
      var cs = getComputedStyle(b); if (cs.display === "none" || cs.visibility === "hidden" || (cs.position !== "sticky" && cs.position !== "fixed")) return;
      var r = b.getBoundingClientRect(); if (!r.height || r.bottom <= 0 || r.top >= window.innerHeight) return;
      if (bottom) { if (r.top > window.innerHeight * 0.5) edge = Math.min(edge, r.top); } else if (r.top < window.innerHeight * 0.4) edge = Math.max(edge, r.bottom);
    });
    return edge;
  }
  document.addEventListener("focusin", function (e) {
    var el = e.target;
    if (!el || !el.getBoundingClientRect || el === main || (dlg && dlg.el.contains(el)) || (el.closest && el.closest(BARS_TOP + "," + BARS_BOT))) return;
    var r = el.getBoundingClientRect(); if (!r.height) return;
    // inside a sideways scroller (chips, chapter strip): bring the whole control in
    if ((r.left < 0 || r.right > window.innerWidth) && r.width < window.innerWidth) { try { el.scrollIntoView({ block: "nearest", inline: "nearest" }); } catch (x) { /* old engines */ } r = el.getBoundingClientRect(); }
    var top = barEdge(BARS_TOP, false), bot = barEdge(BARS_BOT, true);
    if (r.top < top) window.scrollBy(0, r.top - top - 8);
    else if (r.bottom > bot && r.height < bot - top) window.scrollBy(0, r.bottom - bot + 8);
  });
  if (RM && RM.addEventListener) RM.addEventListener("change", function () { render(); });

  // first render waits (at most 700 ms) for the Hebrew web fonts, so the page does not reflow when they swap in (CLS)
  // and never shows a flash of fallback Hebrew; with the fonts cached (or no font API) it renders at once
  var started = false;
  function start() {
    if (started) return;
    started = true;
    document.documentElement.classList.remove("booting");
    render();
    booted = true;
    setTopbarH();
    cloud.init();
  }
  var FONT_PROBES = ['400 1em "Assistant"', '700 1em "Assistant"', '800 1em "Assistant"', '400 1em "Karantina"', '700 1em "Karantina"'];
  var fontsReady = !document.fonts || !document.fonts.load || FONT_PROBES.every(function (f) { try { return document.fonts.check(f, "אב1"); } catch (e) { return true; } });
  if (fontsReady) start();
  else {
    document.documentElement.classList.add("booting");
    // too slow (first visit on a slow network): stay on the system fonts for this page view instead of swapping later
    // (no reflow, no flash); the fonts are cached by the next visit
    setTimeout(function () { if (!started) { document.documentElement.classList.add("fonts-late"); start(); } }, 700);
    try { Promise.all(FONT_PROBES.map(function (f) { return document.fonts.load(f, "אב1"); })).then(start, start); } catch (e) { start(); }
  }
})();
