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
  // comfort settings (senior spec §3): every value is validated, so an old or damaged store falls back to the default
  var SET_DEF = { theme: "auto", text: "m", motion: "auto", contrast: "auto", simple: false, rate: 1, examTimer: "off", swipe: false, comfortSeen: 0, backupAt: 0 };
  var SET_OK = { theme: ["auto", "light", "dark"], text: ["m", "l", "xl", "xxl"], motion: ["auto", "reduce"], contrast: ["auto", "normal", "high"], examTimer: ["off", "on"] };
  function setBool(v) { return v === true || v === 1 || v === "1" || v === "true"; }
  function setNum(v) { v = +v; return isFinite(v) && v > 0 ? v : 0; }
  function normSet(o) {
    var d = Object.assign({}, SET_DEF);
    if (!isObj(o)) return d;
    Object.keys(SET_OK).forEach(function (k) { if (SET_OK[k].indexOf(o[k]) !== -1) d[k] = o[k]; });
    d.simple = setBool(o.simple); d.swipe = setBool(o.swipe);
    d.rate = +o.rate === 0.85 ? 0.85 : 1;
    d.comfortSeen = setNum(o.comfortSeen); d.backupAt = setNum(o.backupAt);
    return d;
  }
  var SET = (function () {
    try { return normSet(JSON.parse(localStorage.getItem(SETKEY) || "{}")); } catch (e) { return normSet(null); /* storage blocked or bad JSON */ }
  })();
  var HCMQ = window.matchMedia ? window.matchMedia("(prefers-contrast: more)") : null;
  var NARROW = window.matchMedia ? window.matchMedia("(max-width: 47.5em)") : null;
  var PICKMQ = window.matchMedia ? window.matchMedia("(max-width: 40em)") : null;
  function applySettings() {
    var r = document.documentElement;
    if (SET.theme === "light" || SET.theme === "dark") r.setAttribute("data-theme", SET.theme); else r.removeAttribute("data-theme");
    r.setAttribute("data-text", SET.text);
    if (SET.motion === "reduce" || SET.simple) r.setAttribute("data-motion", "reduce"); else r.removeAttribute("data-motion");
    var hc = SET.contrast === "high" || (SET.contrast === "auto" && !!(HCMQ && HCMQ.matches));
    if (hc) r.setAttribute("data-contrast", "high"); else r.removeAttribute("data-contrast");
    if (SET.simple) r.setAttribute("data-simple", "1"); else r.removeAttribute("data-simple");
    fitNav();
  }
  // the main menu sits in the top bar only when it fits there in one row; otherwise (phones, large text) it is a bottom bar.
  // It never hides itself (senior P0-8).
  function fitNav() {
    var r = document.documentElement, ti = document.querySelector(".topbar-in"), nav = document.getElementById("nav");
    var bottom = !!(NARROW && NARROW.matches) || SET.text === "xl" || SET.text === "xxl";
    if (!bottom && ti && nav) { r.setAttribute("data-nav", "top"); bottom = ti.scrollWidth > ti.clientWidth + 2; }
    r.setAttribute("data-nav", bottom ? "bottom" : "top");
    if (nav) r.style.setProperty("--nav-h", (bottom ? nav.offsetHeight : 0) + "px");
  }
  function saveSettings() { try { localStorage.setItem(SETKEY, JSON.stringify(SET)); } catch (e) { /* storage blocked */ } applySettings(); }
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } }
  function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* storage blocked */ } }

  // =============================================================== motion (§9): every JS animation goes through anim()
  var RM = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  function motionOK() { return !(RM && RM.matches) && SET.motion !== "reduce" && !SET.simple; }
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
    return (g ? g.short : "הקלטה " + m[1]) + " · שקף " + (+m[2]);
  }
  function srcChips(list) {
    list = (list || []).filter(Boolean);
    if (!list.length) return "";
    return '<span class="src-chips">' + list.map(function (id) {
      return '<a class="src-chip" href="#source-' + esc(id) + '" title="לפתוח את השקף המקורי">' + esc(srcLabel(id)) + "</a>";
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
  var TYPE_NAME = { mcq: "בחירת תשובה", tf: "נכון או לא נכון", open: "שאלה פתוחה", match: "התאמת זוגות", cloze: "השלמת מילים", compare: "השוואה", scenario: "מצב באתר", order: "סידור שלבים", identify: "זיהוי בשרטוט" };
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
  function lessonTitle(lid) { return L[lid] ? L[lid].code + " " + L[lid].title : LIBID[lid] ? "שיעור העשרה " + LIBID[lid].num + ": " + LIBID[lid].title : ""; }
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
  function saveStatusText() { return cloud.on ? "ההתקדמות שלכם נשמרת בחשבון. אפשר להמשיך גם ממכשיר אחר." : "ההתקדמות שלכם נשמרת רק במכשיר הזה."; }

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
    if (r === "again") return "שוב בעוד 10 דקות";
    if (n.ivl === 1) return "שוב מחר";
    if (n.ivl < 30) return "שוב בעוד " + n.ivl + " ימים";
    var mo = Math.round(n.ivl / 30); return mo === 1 ? "שוב בעוד חודש" : "שוב בעוד " + mo + " חודשים";
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
  var MLABEL = ["עוד לא נבדק", "צריך לחזק", "כמעט שם", "כמעט שם", "יודעים היטב"];
  var MTIP_NONE = "עוד לא ידוע. ענו על 3 שאלות או על 3 כרטיסיות בשיעור הזה.";
  function lessonM(lid) { var e = evid(lid), m = masteryOf(e); return { m: m, lv: mLevel(m, e.spaced), e: e }; }
  function chapterM(c) {
    var ms = c.lessons.map(function (l) { return lessonM(l.id); }).filter(function (x) { return x.m !== null; });
    if (!ms.length) return { m: null, lv: 0, n: 0 };
    var m = avg(ms.map(function (x) { return x.m; }));
    return { m: m, lv: mLevel(m, ms.every(function (x) { return x.lv === 4; }) && ms.length === c.lessons.length), n: ms.length };
  }
  // knowledge level: a word chip (senior P0-7: the ruler glyph is gone). In lists (short) it shows only once there is evidence.
  function glyph(x, short) {
    var lv = x.lv || 0, tip = lv ? "רמת ידיעה: " + pct(x.m) + " אחוז" : MTIP_NONE;
    if (short && !lv) return "";
    return '<span class="mg mg-' + lv + '" title="' + esc(tip) + '">' + (short ? "" : '<span class="mg-k">רמת ידיעה: </span>') + MLABEL[lv] + "</span>";
  }
  function lessonOpened(lid) { return !!(S.pos[lid] || S.lvl[lid] || (S.last && S.last.lesson === lid) || readMap()[lid]); }
  function lessonState(lid) {
    if (S.done[lid]) return lessonM(lid).lv === 4 ? ["master", "יודעים היטב"] : ["done", "הושלם"];
    return lessonOpened(lid) ? ["open", "באמצע"] : ["new", "עוד לא התחלתם"];
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
      case "cards": return "כרטיסיות לזכירה: " + (t.ref ? chRefName(t.ref) : "החזרה של היום") + (t.n ? ", " + t.n + " כרטיסיות" : "");
      case "practice": return "תרגול: " + (t.mode === "mistakes" ? "שאלות שטעיתם בהן" : chRefName(t.ref) || "שאלות מכל הקורס") + " · " + (t.mode === "mistakes" ? Math.min(15, Math.max(1, t.n || openMistakes().length)) : 10) + " שאלות";
      case "exam": return t.ref && CHID[t.ref] ? "מבחן פרק " + CHID[t.ref].letter : "מבחן על כל הקורס";
      case "case": return "סיפור מהאתר: " + (CASEID[t.ref] ? CASEID[t.ref].title : "");
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
    return { plan: false, n: n, title: "מה לומדים היום", tasks: out };
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
  // brand (Canva logo, approved by the owner): embedded as data URIs so the one-file artifact needs no extra file
  var BRAND_MARK = "data:image/webp;base64,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";
  var LOGO_FULL = "data:image/webp;base64,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";
  var BRAND = '<img class="brand-mark" src="' + BRAND_MARK + '" alt="" width="32" height="33" decoding="async">';
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
    print: svgI('<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="1.5"/><path d="M7 14h10v7H7z"/>'),
    exam: svgI('<rect x="5" y="4" width="14" height="17" rx="1.5"/><path d="M9 4V2.5h6V4M9 10h6M9 14h6M9 18h3"/>'),
    hat: svgI('<path d="M4 17h16M6 17a6 6 0 0 1 12 0M12 8V6M9.5 9.5 9 8M14.5 9.5 15 8"/>'),
    sheetI: svgI('<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M8 8h8M8 12h8M8 16h5"/>'),
    minus: svgI('<path d="M5 12h14"/>'),
    plus: svgI('<path d="M12 5v14M5 12h14"/>'),
    warn: svgI('<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>'),
    help: svgI('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17h.01"/>'),
    half: svgI('<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/>')
  });
  var TASK_ICON = { lesson: "doc", cards: "cards", practice: "practice", exam: "exam", "case": "hat", summary: "sheetI" };

  // =============================================================== shell
  var app = document.getElementById("app");
  document.documentElement.setAttribute("lang", "he");
  document.documentElement.setAttribute("dir", "rtl");
  applySettings();
  app.innerHTML =
    (window.Diagrams ? window.Diagrams.defs : "") +
    '<a class="skip" href="#main" data-act="skip">דילוג לתוכן העמוד</a>' +
    '<header class="topbar" id="topbar"><div class="topbar-in">' +
    '<a class="brand" href="#home" aria-label="מלאכות הבנייה, דף הבית">' + BRAND + '<span class="brand-name">מלאכות הבנייה</span></a>' +
    '<nav class="nav" id="nav" aria-label="תפריט ראשי">' +
    '<a href="#home" data-nav="home">' + I.today + "<span>דף הבית</span></a>" +
    '<a href="#course" data-nav="course">' + I.course + "<span>שיעורים</span></a>" +
    '<a href="#practice" data-nav="practice">' + I.practice + '<span>תרגול</span><b class="badge" id="due-badge"></b></a>' +
    '<a href="#glossary" data-nav="ref">' + I.ref + "<span>חומרי עזר</span></a>" +
    '<a href="#progress" data-nav="progress">' + I.progress + "<span>התקדמות</span></a>" +
    "</nav>" +
    '<div class="top-actions"><a class="tb-btn" href="#search" aria-label="חיפוש בכל החומר" data-nav="search">' + I.search + "<span>חיפוש</span></a>" +
    '<button class="tb-btn" type="button" data-act="settings" aria-label="הגדרות: גודל אותיות, צבעים וגיבוי" aria-haspopup="dialog">' + I.gear + "<span>הגדרות</span></button></div>" +
    "</div></header>" +
    '<main id="main" tabindex="-1"></main>' +
    '<div class="toast" id="toast" role="status" aria-live="polite" hidden></div>' +
    '<div class="sr-only" id="live" aria-live="polite"></div>';
  var main = document.getElementById("main");
  var topbar = document.getElementById("topbar");
  function setTopbarH() {
    if (topbar && topbar.offsetHeight) document.documentElement.style.setProperty("--topbar-h", topbar.offsetHeight + "px");
    var sb = document.querySelector(".studybar"); if (sb && sb.offsetHeight) document.documentElement.style.setProperty("--sb-h", sb.offsetHeight + "px");
  }
  var fitT = null;
  window.addEventListener("resize", function () { setTopbarH(); clearTimeout(fitT); fitT = setTimeout(function () { fitNav(); setTopbarH(); }, 120); });
  if (HCMQ && HCMQ.addEventListener) HCMQ.addEventListener("change", applySettings);
  fitNav();

  // toasts (senior P1-8): long enough to read (6 s and more for long text), paused while pointed at or focused,
  // a toast with an action (a link, "ביטול") stays until it is closed or the page changes
  var toastTimer = null, toastLeft = 0, toastT0 = 0, toastSticky = false, toastUndo = null;
  function toastHide() {
    var t = document.getElementById("toast"); if (!t) return;
    clearTimeout(toastTimer); toastTimer = null; toastSticky = false; toastUndo = null;
    t.hidden = true;
    // after the fade the text goes too, so a screen reader never finds a stale message
    setTimeout(function () { if (t.hidden) t.textContent = ""; }, 300);
  }
  function toastRun(ms) { clearTimeout(toastTimer); toastLeft = ms; toastT0 = Date.now(); toastTimer = ms > 0 ? setTimeout(toastHide, ms) : null; }
  // o: { action: label, undo: fn, ms } — an undo toast stays at least 10 s and has "סגירה"
  function toast(msg, html, o) {
    o = o || {};
    var t = document.getElementById("toast");
    toastUndo = o.undo || null;
    toastSticky = !!html && !o.undo;
    t.innerHTML = '<span class="toast-t">' + esc(msg) + "</span>" + (html ? " " + html : "") +
      (o.undo ? '<button type="button" class="toast-btn" data-act="toast-undo">' + esc(o.action || "ביטול") + "</button>" : "") +
      (html || o.undo ? '<button type="button" class="toast-btn toast-x" data-act="toast-close">סגירה</button>' : "");
    var ab = document.getElementById("ab"), nv = document.getElementById("nav"), off = 0;
    if (document.body.classList.contains("focus")) { if (ab && getComputedStyle(ab).position === "fixed") off = ab.offsetHeight; }
    else if (document.documentElement.getAttribute("data-nav") === "bottom" && nv) off = nv.offsetHeight;
    t.style.bottom = off ? "calc(" + (off + 16) + "px + env(safe-area-inset-bottom, 0px))" : "";
    t.hidden = false;
    var ms = Math.max(SET.simple ? 8000 : 6000, 1500 + 70 * String(msg).length);
    toastRun(toastSticky ? 0 : o.undo ? Math.max(10000, ms) : ms);
  }
  (function () {
    var t = document.getElementById("toast");
    function pause() { if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; toastLeft = Math.max(1500, toastLeft - (Date.now() - toastT0)); t.setAttribute("data-paused", "1"); } }
    function resume() { if (t.getAttribute("data-paused") && !t.hidden && !toastSticky) { t.removeAttribute("data-paused"); toastRun(toastLeft); } }
    t.addEventListener("mouseenter", pause); t.addEventListener("focusin", pause);
    t.addEventListener("mouseleave", function () { if (!t.contains(document.activeElement)) resume(); });
    t.addEventListener("focusout", function (e) { if (!t.contains(e.relatedTarget)) resume(); });
  })();
  function announce(msg) { var l = document.getElementById("live"); if (!l) return; l.textContent = ""; setTimeout(function () { l.textContent = msg; }, 30); }
  function updateBadge() {
    // P2-11: the nav badge counts due reviews only; new cards are part of the daily session
    var n = dueCards().length;
    var b = document.getElementById("due-badge");
    if (b) { b.textContent = n > 0 ? (n > 99 ? "99+" : String(n)) : ""; b.setAttribute("aria-label", n ? n + " כרטיסיות מחכות לחזרה" : ""); }
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
    // P2-2: no drag handle (there is no swipe to close); the head and the foot both close the sheet with a visible word
    var acts = (o.actions || []).slice();
    if (!o.noFootClose && !acts.some(function (a) { return a.act === "dlg-close"; })) acts.push({ label: "סגירה", act: "dlg-close", cls: "btn-ghost dlg-foot-x" });
    wrap.innerHTML = '<div class="dlg-bd" data-act="dlg-close"></div><div class="dlg" role="dialog" aria-modal="true" aria-labelledby="' + tid + '" tabindex="-1">' +
      '<div class="dlg-head"><h2 id="' + tid + '">' + o.title + "</h2>" +
      '<button type="button" class="btn btn-sm btn-ghost dlg-x" data-act="dlg-close">' + I.x + "<span>סגירה</span></button></div>" +
      '<div class="dlg-body">' + (o.body || "") + "</div>" +
      (acts.length ? '<div class="dlg-actions">' + acts.map(btnHtml).join("") + "</div>" : "") + "</div>";
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
      (canAnim ? '<button type="button" class="ai-anim" data-act="ai-anim" aria-pressed="false" data-gif="' + esc(MEDIA_BASE + m.anim) + '">' + I.play + "<span>לראות בתנועה</span></button>" : "") +
      "</div><figcaption>" + AI_PREFIX + (m.caption ? " · " + esc(m.caption) : "") + (m.warn ? ' <span class="ai-warn">⚠ ' + esc(m.warn) + "</span>" : "") + "</figcaption></figure>";
  }
  function coverHtml(c, o) {
    o = o || {};
    var m = chMedia(c);
    return '<span class="cover">' + swatchBg(c.material) + (m ? imgHtml(m, { card: true, small: true, sizes: o.sizes || "240px" }) + '<span class="ai-badge" aria-hidden="true">AI</span>' : "") + "</span>";
  }
  // =============================================================== Canva brand set (media/chicon-*, media/*.pdf)
  // chapter icons: decorative (alt=""), always beside the chapter name, never its only label. Fixed size: no layout shift.
  // Only these chapters have files; a new chapter simply shows no icon and no printable sheet.
  var CANVA_CH = { skeleton: 1, foundations: 1, piles: 1, earthworks: 1, shoring: 1, columns: 1, beams: 1, slabs: 1 };
  function chIcon(c, big) {
    if (!c || !CANVA_CH[c.id]) return "";
    var b = MEDIA_BASE + "media/chicon-" + c.id, px = big ? 104 : 44;
    return '<img class="ch-ic' + (big ? " ch-ic-lg" : "") + '" src="' + esc(b + (big ? "-256" : "-96") + ".webp") + '"' +
      (big ? "" : ' srcset="' + esc(b + "-96.webp 96w, " + b + "-256.webp 256w") + '" sizes="44px"') +
      ' alt="" width="' + px + '" height="' + px + '"' + (big ? "" : ' loading="lazy"') + ' decoding="async">';
  }
  // printables: a worded link (not window.print) to the designed PDF, with its first page beside it on wide screens.
  // On http(s) each file is checked once (HEAD); a file that is not there removes its block, so no link leads to an error page.
  var PRINT_MISS = {}, PRINT_SEEN = {};
  var PRINTS = {
    planner: { file: "planner.pdf", thumb: "planner-thumb.webp", label: "להדפסת תוכנית הלימוד (PDF)", name: "תוכנית לימוד 14 יום - מלאכות הבנייה.pdf", note: "2 עמודים בגודל A4. בכל יום יש ריבוע גדול לסימון." },
    guide: { file: "install-guide.pdf", thumb: "install-guide-thumb.webp", label: "להדפסת מדריך ההתקנה והגדלת האותיות (PDF)", name: "מדריך התקנה והגדלת האותיות - מלאכות הבנייה.pdf", note: "עמוד אחד בגודל A4: איך מתקינים את האפליקציה בטלפון, ואיך מגדילים את האותיות. אפשר להדפיס ולתת למי שצריך." }
  };
  function fileName(s) { return String(s).replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim(); }
  function printBlock(p) {
    if (!p) return "";
    var href = MEDIA_BASE + "media/" + p.file;
    if (PRINT_MISS[href]) return "";
    return '<div class="print-card no-print" data-pdf="' + esc(href) + '">' +
      (p.thumb ? '<img class="print-thumb" src="' + esc(MEDIA_BASE + "media/" + p.thumb) + '" alt="" width="96" height="136" loading="lazy" decoding="async">' : "") +
      '<div class="pc-t"><a class="btn print-btn" href="' + esc(href) + '" target="_blank" rel="noopener" download="' + esc(fileName(p.name)) + '">' + I.print + "<span>" + esc(p.label) + "</span></a>" +
      (p.note ? '<p class="field-note">' + esc(p.note) + "</p>" : "") + "</div></div>";
  }
  function sheetPrint(c) {
    if (!c || !CANVA_CH[c.id]) return "";
    return printBlock({ file: "sheet-" + c.id + ".pdf", thumb: "sheet-" + c.id + "-thumb.webp", label: "להדפסת דף הסיכום (PDF)", name: "דף סיכום - " + c.title + ".pdf", note: "3 עמודים בגודל A4. ליד כל עובדה מופיע מספר השקף." });
  }
  function checkPrints(root) {
    if (!/^https?:$/.test(location.protocol) || !window.fetch) return; // file:// cannot be checked; the files ship with every build
    (root || document).querySelectorAll(".print-card[data-pdf]").forEach(function (el) {
      var u = el.getAttribute("data-pdf");
      if (PRINT_MISS[u]) { el.remove(); return; }
      if (PRINT_SEEN[u]) return;
      PRINT_SEEN[u] = 1;
      fetch(u, { method: "HEAD", cache: "no-cache" }).then(function (r) {
        if (r.status !== 404 && r.status !== 410) return;
        PRINT_MISS[u] = 1;
        document.querySelectorAll(".print-card[data-pdf]").forEach(function (x) { if (x.getAttribute("data-pdf") === u) x.remove(); });
      }).catch(function () { PRINT_SEEN[u] = 0; }); // offline or blocked: keep the link (the service worker answers offline)
    });
  }
  function checkImgs() {
    main.querySelectorAll("img.ai-img").forEach(function (im) { if (im.complete) { if (im.naturalWidth) im.classList.add("loaded"); else im.classList.add("failed"); } });
  }

  // =============================================================== diagrams (P1-2): fit-to-width, zoom viewer, steppers
  // the words of a drawing, for the legend under it (the drawing's own labels: no new facts)
  function dgLabels(svgHtml) {
    var out = [], re = /<text[^>]*class="lbl([^"]*)"[^>]*>([\s\S]*?)<\/text>/g, m;
    while ((m = re.exec(svgHtml))) {
      var t = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (!t || /^[\d\s.,:/×x'"׳״%°+\-–=()]+$/.test(t) || out.indexOf(t) !== -1) continue;
      out.push(t);
    }
    return out;
  }
  // P0-6: a word legend under every drawing at body size; on phones (and in simple mode) the drawing shows numbered
  // markers instead of its tiny labels, so the two match one to one. The zoom viewer shows the full labels.
  function dgLegend(id, svgHtml) {
    var parts = window.Diagrams.parts(id) || [], labels = dgLabels(svgHtml);
    var more = labels.filter(function (t) { return !parts.some(function (p) { return sim(p.name, t) > 0.6 || p.name === t; }); });
    if (!parts.length && !labels.length) return "";
    return '<div class="dg-legend' + (parts.length ? " has-parts" : "") + '"><b>' + (parts.length ? "מה רואים בתרשים" : "מה כתוב בתרשים") + "</b>" +
      (parts.length ? '<ol class="dg-parts">' + parts.map(function (p) { return '<li><span class="n" aria-hidden="true">' + p.n + "</span><span>" + esc(p.name) + "</span></li>"; }).join("") + "</ol>" : "") +
      (more.length ? (parts.length ? '<p class="dg-more-h">עוד כתוב בתרשים:</p>' : "") + '<ul class="dg-more">' + more.map(function (t) { return "<li>" + t + "</li>"; }).join("") + "</ul>" : "") +
      (parts.length ? '<p class="dg-hint">כדי לראות את כל הכיתובים במקומם, הקישו על ״להגדיל״.</p>' : "") + "</div>";
  }
  function figDiagram(id, ctx) {
    if (!window.Diagrams.has(id)) return "";
    ctx.fig = (ctx.fig || 0) + 1;
    var a = ANIM(id), parts = window.Diagrams.parts(id), svgHtml = window.Diagrams.render(id, parts ? { legend: true } : null);
    return '<figure class="dg" data-dg="' + esc(id) + '"><div class="dg-box" data-act="dg-zoom">' + svgHtml + "</div>" +
      (a ? stepperHtml(id, a) : "") +
      '<figcaption><b>איור ' + esc(ctx.code + "." + ctx.fig) + '</b><span class="dg-t">' + esc(window.Diagrams.title(id)) + '</span><span class="illus">המחשה לימודית, לא פרט לביצוע</span>' +
      '<button type="button" class="dg-zoom" data-act="dg-zoom" aria-label="להגדיל את איור ' + esc(ctx.code + "." + ctx.fig) + '">' + I.expand + "<span>להגדיל</span></button></figcaption>" + dgLegend(id, svgHtml) + "</figure>";
  }
  function stepperHtml(id, a) {
    var n = a.steps.length;
    return '<div class="dg-step" data-dg-step="' + esc(id) + '" data-i="0">' +
      '<div class="dg-ctl" role="group" aria-label="שלבי האיור">' +
      '<button type="button" class="btn btn-sm dg-play" data-act="dg-play">' + I.play + "להציג את השלבים</button>" +
      '<button type="button" class="btn btn-sm btn-ghost" data-act="dg-prev" aria-label="לשלב הקודם">' + I.arrowR + '<span class="lbl-l">לשלב הקודם</span></button>' +
      '<button type="button" class="btn btn-sm btn-ghost" data-act="dg-next" aria-label="לשלב הבא"><span class="lbl-l">לשלב הבא</span>' + I.arrowL + "</button>" +
      '<span class="dg-n" dir="ltr">0/' + n + "</span></div>" +
      '<p class="dg-cap" aria-live="polite">' + n + " שלבים באיור. הקישו על ״להציג את השלבים״ או על ״לשלב הבא״.</p></div>";
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
    if (!i) { svg.classList.remove("stepping"); cap.textContent = n + " שלבים באיור. הקישו על ״להציג את השלבים״ או על ״לשלב הבא״."; return; }
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
    main.querySelectorAll("svg.drawing.quiz, .dg-box svg.drawing.has-mk").forEach(function (svg) {
      var vb = svg.viewBox && svg.viewBox.baseVal, w = svg.getBoundingClientRect().width;
      if (!vb || !vb.width || !w) return;
      var r = Math.max(10, 13 / (w / vb.width));
      if (svg.classList.contains("has-mk") && !svg.querySelector(".mk-l").getClientRects().length) return;
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
    // P0-6: opens with labels at 16px or more; zoom and pan by worded buttons (no gesture is needed, WCAG 2.5.7)
    function vb(z, d, ic, label) { return '<button type="button" class="btn btn-sm vw-b" data-act="vw-z" data-z="' + z + '"' + (d ? ' data-d="' + d + '"' : "") + ">" + ic + "<span>" + label + "</span></button>"; }
    var box = openSheet({ title: esc(title || "תרשים"), full: true, cls: "viewer", focus: ".vw",
      body: '<div class="vw" tabindex="0" role="img" aria-label="' + esc(title || "תרשים") + '. אפשר להגדיל ולהזיז בכפתורים שמתחת לתרשים"><div class="vw-in">' + svgHtml + "</div></div>" +
        '<div class="vw-pad"><div class="vw-row">' + vb("in", "", I.plus, "הגדלה") + vb("out", "", I.minus, "הקטנה") + vb("reset", "", I.expand, "גודל התחלתי") + "</div>" +
        '<div class="vw-row vw-cross">' + vb("pan", "up", I.chev, "למעלה") + vb("pan", "right", I.arrowR, "ימינה") + vb("pan", "left", I.arrowL, "שמאלה") + vb("pan", "down", I.chev, "למטה") + "</div></div>" +
        '<p class="vw-cap">המחשה לימודית, לא פרט לביצוע</p><p class="vw-hint">אפשר להגדיל ולהזיז בכפתורים, או באצבעות.</p>' });
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
      ns = Math.max(1, Math.min(6, ns));
      st.x = cx - (cx - st.x) * ns / st.s; st.y = cy - (cy - st.y) * ns / st.s; st.s = ns; apply();
    }
    // the start scale puts the drawing's 13-unit labels at 16px or more on this screen
    function s0() {
      var sv = inner.querySelector("svg"), vbw = sv && sv.viewBox && sv.viewBox.baseVal ? sv.viewBox.baseVal.width : 0, fit = vbw ? W() / vbw : 1, fmin = 13;
      if (sv) [].forEach.call(sv.querySelectorAll("text"), function (t) { if (getComputedStyle(t).display !== "none") fmin = Math.min(fmin, parseFloat(getComputedStyle(t).fontSize) || 13); });
      return Math.max(1.6, Math.min(6, 16.5 / (fmin * fit)));
    }
    vw._zoom = function (z, d) {
      if (z === "reset") { var k = s0(); st.s = k; st.x = (W() - W() * k) / 2; st.y = 0; apply(); }
      else if (z === "pan") { var dx = W() * 0.25, dy = H() * 0.25; if (d === "up") st.y += dy; if (d === "down") st.y -= dy; if (d === "left") st.x += dx; if (d === "right") st.x -= dx; apply(); }
      else zoomAt(st.s * (z === "in" ? 1.25 : 1 / 1.25), W() / 2, H() / 2);
    };
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
  // =============================================================== read aloud (senior §3.6): only when the device has a Hebrew voice
  var TTS = { voice: null, el: null, btn: null, q: 0 };
  var hasTTS = "speechSynthesis" in window && typeof window.SpeechSynthesisUtterance === "function";
  function heVoice() {
    if (!hasTTS) return null;
    var vs = []; try { vs = window.speechSynthesis.getVoices() || []; } catch (e) { vs = []; }
    var he = vs.filter(function (v) { return /^(he|iw)([-_]|$)/i.test(v.lang || ""); });
    return he.filter(function (v) { return v.localService; })[0] || he[0] || null;
  }
  function canSpeak() { return !!TTS.voice; }
  function speakBtn(target, label) {
    return canSpeak() ? '<button type="button" class="btn btn-sm btn-ghost speak" data-act="speak" data-target="' + esc(target) + '">' + I.play + "<span>" + (label || "הקראה") + "</span></button>" : "";
  }
  function voiceCheck() {
    var had = !!TTS.voice; TTS.voice = heVoice();
    // a voice that arrives after the page was drawn: draw the reading pages again (the buttons appear), keeping the scroll
    if (!had && TTS.voice && booted && !run && !dlg) { var y = window.scrollY; render(); window.scrollTo(0, y); }
  }
  if (hasTTS) {
    TTS.voice = heVoice();
    try { window.speechSynthesis.addEventListener("voiceschanged", voiceCheck); } catch (e) { window.speechSynthesis.onvoiceschanged = voiceCheck; }
    setTimeout(voiceCheck, 1500);
  }
  // the words a reader sees, without source chips, hidden helper text, icons or buttons; tags are read as words
  function speakText(el) {
    var c = el.cloneNode(true);
    c.querySelectorAll(".src-chips, .src-chip, .sr-only, [aria-hidden='true'], button, svg, .dg-box, .ai-box, .dg-legend, .tbl-scroll, .block-tools, .vw-bar").forEach(function (x) { x.remove(); });
    c.querySelectorAll(".blk-tag, .co-tag, .tag-expl, .illus, .src-lbl, h2, h3, li, p").forEach(function (x) { x.appendChild(document.createTextNode(". ")); });
    return (c.textContent || "").replace(/\s+/g, " ").replace(/(\.\s*){2,}/g, ". ").trim();
  }
  function chunks(t) {
    var out = [];
    String(t).replace(/([.!?:;])\s+/g, "$1\n").split("\n").forEach(function (sn) {
      while (sn.length > 180) { var cut = sn.lastIndexOf(",", 180); if (cut < 60) cut = sn.lastIndexOf(" ", 180); if (cut < 60) cut = 180; out.push(sn.slice(0, cut + 1)); sn = sn.slice(cut + 1).trim(); }
      if (sn.trim()) out.push(sn.trim());
    });
    return out;
  }
  function speakStop() {
    TTS.q++;
    if (hasTTS) { try { window.speechSynthesis.cancel(); } catch (e) { /* ignore */ } }
    if (TTS.el) TTS.el.classList.remove("reading");
    if (TTS.btn && document.contains(TTS.btn)) { TTS.btn.innerHTML = I.play + "<span>" + (TTS.btn.getAttribute("data-label") || "הקראה") + "</span>"; TTS.btn.removeAttribute("data-on"); }
    TTS.el = null; TTS.btn = null;
  }
  function speak(btn, el, text) {
    var again = TTS.btn === btn;
    speakStop();
    if (again || !TTS.voice || !el) return;
    var parts = chunks(text || speakText(el)); if (!parts.length) return;
    TTS.el = el; TTS.btn = btn; var q = TTS.q;
    btn.setAttribute("data-label", btn.textContent.trim()); btn.setAttribute("data-on", "1");
    btn.innerHTML = I.pause + "<span>עצירה</span>";
    el.classList.add("reading");
    parts.forEach(function (p, i) {
      var u = new window.SpeechSynthesisUtterance(p);
      u.lang = "he-IL"; u.voice = TTS.voice; u.rate = SET.rate || 1;
      if (i === parts.length - 1) u.onend = function () { if (TTS.q === q) speakStop(); };
      window.speechSynthesis.speak(u);
    });
  }
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden" && TTS.el) speakStop(); });
  function awayPause() { if (typeof run !== "undefined" && run && run.mode === "exam" && !run.finished && !run.pausedAt) { pauseClock(true); persistRun(); } }
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") awayPause();
    else if (run && run.mode === "exam" && run.autoPaused && route() === "run" && !run.finished) { resumeClock(); persistRun(); startTimer(); }
  });
  window.addEventListener("pagehide", awayPause);

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
    out.innerHTML = '<p class="muted">עוזר הלימוד כותב תשובה…</p>';
    ai.s(prompt, { onText: function (u) { out.innerHTML = aiFormat(u.text); }, signal: aiAbort ? aiAbort.signal : undefined, cache: false }).then(function (r) {
      out.innerHTML = aiFormat(r.text) + '<p class="ai-note">זו תשובה של עוזר הלימוד, לפי חומר הקורס. כדאי לבדוק אותה מול השקפים שמופיעים בה.</p>';
    }).catch(function (e) {
      var code = e && e.code;
      if (code === "not_granted") { ai.s = null; out.innerHTML = '<p class="muted">עוזר הלימוד לא זמין בגרסה הזו של האפליקציה.</p>'; }
      else if (code === "rate_limited") out.innerHTML = '<p class="muted">שאלתם הרבה שאלות ברצף. חכו דקה ונסו שוב.</p>';
      else if (e && e.name === "AbortError") { /* replaced by a newer request */ }
      else out.innerHTML = '<p class="muted">עוזר הלימוד לא ענה. נסו לשאול שוב.</p>';
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
    glossary: "ref", sheets: "ref", sheet: "ref", sources: "ref", source: "ref", progress: "progress", search: "search", help: "home" };
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
  function post() { setTopbarH(); animateTapes(); fitMarkers(); checkImgs(); tableRegions(); langParts(); checkPrints(main); }
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
        b.setAttribute("tabindex", "0"); b.setAttribute("role", "region"); b.setAttribute("aria-label", name + " (טבלה רחבה. אפשר להזיז אותה ימינה ושמאלה)");
        if (!(b.previousElementSibling && b.previousElementSibling.classList.contains("tbl-hint"))) { var hp = document.createElement("p"); hp.className = "tbl-hint"; hp.setAttribute("aria-hidden", "true"); hp.textContent = "הטבלה רחבה. אפשר להזיז אותה ימינה ושמאלה ↔"; b.parentNode.insertBefore(hp, b); }
      } else if (!over && b.getAttribute("role") === "region") { b.removeAttribute("tabindex"); b.removeAttribute("role"); b.removeAttribute("aria-label"); if (b.previousElementSibling && b.previousElementSibling.classList.contains("tbl-hint")) b.previousElementSibling.remove(); }
    });
  }
  var trTimer = null;
  window.addEventListener("resize", function () { clearTimeout(trTimer); trTimer = setTimeout(tableRegions, 200); });
  function render() {
    var r = parts(), head = r.head, arg = r.arg;
    LV = null; SHEETV = null; CHV = null;
    if (!LESSONS.length && !LIB.length) {
      main.innerHTML = '<div class="empty">' + I.level + "<b>החומר לא נטען</b><p>משהו השתבש בטעינה. סגרו את הדף ופתחו אותו שוב.</p></div>";
      return;
    }
    document.body.classList.toggle("focus", !!FOCUS[head]);
    document.body.classList.toggle("reading", !!READING[head]);
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
      case "help": viewHelp(); break;
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
    closeSheet(true); stopPlay(); speakStop();
    if (toastSticky || toastUndo) toastHide();
    if (run && run.mode === "exam" && !run.finished && h !== "run") { pauseClock(true); persistRun(); clearInterval(timerInt); }
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
        toast("ממשיכים מהמקום שעצרתם: " + (hd.textContent || "").replace(/^\S+\s/, "").trim());
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
  var carryNote = "";
  var obStep = 0;   // first-run welcome (copy deck §3.4): 0, 1 = explanation screens, 2 = plan or own pace, 3 = when to start
  var HELP = {
    home: "כאן רואים מה כדאי ללמוד היום. הקישו על משימה כדי להתחיל.",
    plan: "תוכנית של 14 ימים. בכל יום מחכות משימות מוכנות.",
    course: "כאן כל השיעורים, לפי פרקים. הקישו על שיעור כדי לקרוא אותו.",
    chapter: "כאן כל מה ששייך לפרק אחד: השיעורים, דף סיכום ומבחן.",
    lesson: "קראו את השיעור מלמעלה למטה. בסוף יש בדיקה קצרה.",
    lib: "שיעור נוסף לקריאה. הוא לא מחומר הקורס, ואין עליו שאלות במבחן.",
    practice: "כאן עונים על שאלות, ורואים מיד אם צדקתם.",
    cards: "כרטיסייה מציגה שאלה קצרה. נסו לענות, ואז הפכו אותה כדי לבדוק.",
    exams: "כאן נבחנים על פרק או על כל הקורס. את הציון רואים רק בסוף.",
    cases: "סיפור מאתר בנייה, שלב אחרי שלב. בכל שלב יש שאלה.",
    glossary: "כאן מוצאים פירוש לכל מונח מקצועי. הקלידו מילה בתיבת החיפוש.",
    sheets: "דף אחד לכל פרק, עם העובדות החשובות. טוב לחזרה לפני מבחן.",
    sheet: "העובדות החשובות בפרק. אפשר להסתיר אותן ולבדוק את עצמכם.",
    "case": "קראו כל שלב בסיפור, וענו על השאלה שבסופו.",
    settings: "כאן משנים את גודל האותיות ואת הצבעים, ושומרים גיבוי.",
    "run-practice": "קראו את השאלה וענו. אחר כך עברו לשאלה הבאה.",
    "run-exam": "ענו על כל השאלות. בסוף הקישו על ״להגיש את המבחן״.",
    "run-check": "5 שאלות קצרות על השיעור. אם תצליחו, השיעור יסומן כגמור.",
    "run-pretest": "כמה שאלות כדי לראות מה אתם כבר יודעים. זה לא נכנס לציון.",
    sources: "כאן צילומי השקפים מהקורס, והטקסט שכתוב בהם.",
    source: "צילום השקף והטקסט שלו. הקישו על התמונה כדי להגדיל.",
    search: "הקלידו מילה, ותראו איפה היא מופיעה: בשיעורים, במילון ובשקפים.",
    progress: "כאן רואים כמה למדתם, ואילו שיעורים כדאי לחזק.",
    review: "נסו לענות בלב, הפכו את הכרטיסייה, ואמרו כמה טוב זכרתם.",
    result: "כאן רואים איך הלך, ומה כדאי לעשות עכשיו.",
    help: "כאן מוסבר בקצרה איך משתמשים באפליקציה."
  };
  // "מה עושים כאן" (copy deck §3.1): one plain sentence under the page title
  function hereLine(k) { return HELP[k] ? '<p class="here">' + HELP[k] + "</p>" : ""; }
  function viewHome() {
    checkExpiredRun();
    var pn = planDayNow(), act0 = hasActivity();
    var first = !S.plan.mode && !act0, comfort = first && !SET.comfortSeen;
    // simple mode: no decision about yesterday; its open tasks are added to today with one line saying so
    if (SET.simple && missedYesterday()) { var mn = missedYesterday(); S.plan.carry = { d: today(), day: mn }; S.plan.t = Date.now(); carryNote = today(); save(); }
    var html = '<div class="home"><div class="home-main">' +
      (comfort ? '<header class="home-head"><h1 class="display">לפני שמתחילים: נוח לקרוא?</h1></header>' :
      '<header class="home-head"><span class="eyebrow">' + greeting() + " · " + new Date().toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" }) + "</span>" +
      '<h1 class="display">' + (pn >= 1 && pn <= PLAN_N ? "יום " + pn + " מתוך " + PLAN_N : "מה לומדים היום") + "</h1>" + (first ? "" : hereLine("home")) + "</header>");
    if (comfort) { html += comfortCard() + "</div></div>"; paint(html); return; }
    if (!SET.comfortSeen && !SET.simple) html += comfortNote();
    html += resumeBanners();
    var miss = missedYesterday();
    if (miss) html += missedBanner(miss);
    if (SET.simple && carryNote === today()) html += '<p class="note-line">הוספנו להיום משימות מאתמול.</p>';
    html += first ? onboardCard() : todayCard();
    html += backupNote();
    if (!SET.simple) html += "</div><aside class=\"home-side\">" + (act0 ? statsStrip() : "") + (planOn() && pn <= PLAN_N ? planMini(pn) : "") + dashFig() + "</aside></div>";
    else html += '<a class="link-more simple-all" href="#course">לכל השיעורים</a></div></div>';
    if (!SET.simple) html += '<section class="ch-strip-sec" aria-labelledby="chs-h"><div class="section-head"><h2 id="chs-h">הפרקים בקורס</h2><a class="link-more" href="#course">לכל השיעורים</a></div><div class="ch-strip">' + CH.map(chCard).join("") + "</div></section>";
    html += footHtml();
    var before = JSON.stringify(S.celebrated);
    paint(html);
    if (JSON.stringify(S.celebrated) !== before) save();
  }
  // senior §3.5: the first screen on a new device asks about reading comfort, with the page itself as the live preview
  var SIZES = [["m", "רגיל", 18], ["l", "גדול", 21.4], ["xl", "גדול מאוד", 24.75], ["xxl", "ענק", 29.25]];
  function sizeButtons(big) {
    return '<div class="seg seg-size' + (big ? " big" : "") + '" role="group" aria-labelledby="lbl-text">' + SIZES.map(function (z) {
      return '<button type="button" data-act="set" data-k="text" data-v="' + z[0] + '" aria-pressed="' + (SET.text === z[0]) + '"><span class="sz-s" aria-hidden="true" style="font-size:' + z[2] + 'px">אב</span><span>' + z[1] + "</span></button>";
    }).join("") + "</div>";
  }
  function comfortPreview() {
    return '<div class="comfort-preview" aria-hidden="true"><b>דוגמה</b><p>יסוד בודד: יסוד מתחת לעמוד יחיד.</p><span class="btn btn-sm fake-btn">לשאלה הבאה</span></div>';
  }
  function segBtns(k, opts, lbl) {
    return '<div class="seg" role="group" aria-labelledby="' + lbl + '">' + opts.map(function (o) {
      var on = String(SET[k]) === String(o[0]) || (k === "simple" || k === "swipe") && (o[0] === "1") === !!SET[k] ||
        // the comfort card's two-way contrast switch shows what "לפי המכשיר" resolves to on this device
        (k === "contrast" && opts.length === 2 && SET.contrast === "auto" && (o[0] === "high") === !!(HCMQ && HCMQ.matches));
      return '<button type="button" data-act="set" data-k="' + k + '" data-v="' + o[0] + '" aria-pressed="' + on + '">' + o[1] + "</button>";
    }).join("") + "</div>";
  }
  function comfortCard() {
    return '<section class="today comfort" aria-label="נוחות קריאה">' +
      '<div class="field"><span class="lbl" id="lbl-text">גודל האותיות</span>' + sizeButtons(true) + "</div>" + comfortPreview() +
      '<div class="field"><span class="lbl" id="lbl-cf-contrast">ניגודיות גבוהה</span>' + segBtns("contrast", [["normal", "כבויה"], ["high", "פעילה"]], "lbl-cf-contrast") +
      '<span class="hc-strip">כך נראה טקסט בניגודיות גבוהה: שחור על לבן.</span></div>' +
      '<div class="field"><span class="lbl" id="lbl-cf-simple">תצוגה פשוטה</span>' + segBtns("simple", [["0", "כבויה"], ["1", "פעילה"]], "lbl-cf-simple") +
      '<span class="field-note">פחות כפתורים בכל מסך, צעד אחד בכל פעם.</span></div>' +
      '<button type="button" class="btn btn-primary btn-cta" data-act="comfort-ok">אפשר להתחיל' + I.arrowL + "</button>" +
      '<button type="button" class="linkish" data-act="comfort-skip">דילוג (להשאיר כמו שזה)</button>' +
      '<p class="field-note">אפשר לשנות את זה בכל רגע: בהגדרות, בחלק ״נוחות קריאה״.</p></section>';
  }
  function comfortNote() {
    return '<div class="banner comfort-note"><div class="rs-t"><b>אפשר להגדיל את האותיות</b><span>וגם לבחור ניגודיות גבוהה ותצוגה פשוטה.</span></div>' +
      '<div class="btn-row"><button type="button" class="btn btn-sm" data-act="comfort-open">לבחור עכשיו</button><button type="button" class="btn btn-sm btn-ghost" data-act="comfort-skip">לא עכשיו</button></div></div>';
  }
  // P2-4: one quiet line after a week of study without a backup (only where progress is not saved in an account)
  function backupNote() {
    if (cloud.on || SET.simple) return "";
    var days = Object.keys(S.days).length, last = SET.backupAt, seen = +lsGet("melachot-backup-note", "0") || 0;
    if (days < 7 || (last && Date.now() - last < 7 * DAY) || Date.now() - seen < 7 * DAY) return "";
    return '<div class="banner backup-note"><div class="rs-t"><b>כדאי לשמור גיבוי של ההתקדמות</b><span>' + (last ? "גיבוי אחרון: לפני " + plural(Math.floor((Date.now() - last) / DAY), "יום אחד", "ימים") : "עוד לא נשמר גיבוי") + "</span></div>" +
      '<div class="btn-row"><button type="button" class="btn btn-sm" data-act="settings">להגדרות</button><button type="button" class="btn btn-sm btn-ghost" data-act="backup-note-off">לא עכשיו</button></div></div>';
  }
  function resumeBanners() {
    var h = "", ar = run && !run.finished && (run.mode === "exam" || run.mode === "pretest") ? run : (S.activeRun && !S.activeRun.finished ? S.activeRun : null);
    if (ar) {
      var ex = ar.mode === "exam", left = ex && ar.limit ? timeLeft(ar) : 0;
      h += '<div class="resume"><div class="rs-t"><b>' + (ex ? "מבחן שלא סיימתם: " : "בדיקה שלא סיימתם: ") + esc(ar.title) + "</b><span>" + (ex && ar.limit ? (left <= 0 ? "הזמן שקבעתם נגמר · " : left <= 60 ? "נשארה דקה אחת · " : "נשארו " + Math.ceil(left / 60) + " דקות · ") + "השעון עצור · " : "") + "שאלה " + (ar.i + 1) + " מתוך " + ar.items.length + "</span></div>" +
        '<button type="button" class="btn btn-resume" data-act="resume-run">' + (ex ? "לחזור למבחן" : "להמשיך בבדיקה") + I.arrowL + "</button></div>";
    }
    var cs = CASES.map(function (c) { return { c: c, s: S.cases[c.id] }; }).filter(function (o) { return o.s && !o.s.done && (o.s.step > 0 || Object.keys(o.s.answers || {}).length); }).sort(function (a, b) { return (b.s.t || 0) - (a.s.t || 0); })[0];
    if (cs) h += '<div class="resume"><div class="rs-t"><b>סיפור מהאתר שלא סיימתם: ' + esc(cs.c.title) + "</b><span>שלב " + (caseResumeAt(cs.c, cs.s) + 1) + " מתוך " + cs.c.steps.length + '</span></div><a class="btn btn-resume" href="#' + esc(cs.c.id) + '">להמשיך בסיפור' + I.arrowL + "</a></div>";
    return h;
  }
  function missedBanner(n) {
    return '<div class="banner"><div class="rs-t"><b>נשארו משימות מאתמול</b><span>יום ' + n + ": " + esc(PLAN.days[n - 1].title || "") + "</span></div>" +
      '<div class="btn-row"><button type="button" class="btn btn-sm" data-act="plan-carry" data-day="' + n + '">להוסיף אותן להיום</button><button type="button" class="btn btn-sm btn-ghost" data-act="plan-shift">לדחות את כל התוכנית ביום אחד</button></div></div>';
  }
  function onboardCard() {
    var steps = ' <span class="ob-step">שלב ' + (Math.min(obStep, 2) + 1) + " מתוך 3</span>";
    if (obStep === 3 && PLAN) {
      return '<section class="today onboard" aria-labelledby="ob-h"><h2 id="ob-h">מתי להתחיל את התוכנית?</h2><div class="choice-grid">' +
        '<button type="button" class="choice" data-act="ob-start" data-when="0"><b>להתחיל היום</b><span>היום יהיה יום 1 בתוכנית</span></button>' +
        '<button type="button" class="choice" data-act="ob-start" data-when="1"><b>להתחיל מחר</b><span>היום אפשר רק להסתכל בחומר</span></button></div>' +
        '<button type="button" class="linkish" data-act="ob-back">לחזור לבחירה הקודמת</button></section>';
    }
    if (obStep === 0) {
      return '<section class="today onboard" aria-labelledby="ob-h"><img class="logo-full" src="' + LOGO_FULL + '" alt="מלאכות הבנייה" width="600" height="600" decoding="async"><h2 id="ob-h">ברוכים הבאים!' + steps + "</h2>" +
        "<p>כאן לומדים מלאכות בנייה, לפי שקפי הקורס. יש " + LESSONS.length + " שיעורים ב-" + CH.length + " פרקים.</p>" +
        '<button type="button" class="btn btn-primary btn-cta" data-act="ob-next">להמשיך' + I.arrowL + "</button>" +
        '<button type="button" class="linkish" data-act="ob-skip">לדלג על ההסבר</button></section>';
    }
    if (obStep === 1) {
      return '<section class="today onboard" aria-labelledby="ob-h"><h2 id="ob-h">איך לומדים כאן?' + steps + "</h2>" +
        '<ol class="ob-list"><li>קוראים שיעור.</li><li>עונים על כמה שאלות.</li><li>חוזרים על כרטיסיות לזכירה.</li></ol><p>האפליקציה זוכרת איפה עצרתם.</p>' +
        '<button type="button" class="btn btn-primary btn-cta" data-act="ob-next">להמשיך' + I.arrowL + "</button>" +
        '<button type="button" class="linkish" data-act="settings-text">האותיות קטנות מדי? להגדיל אותן</button></section>';
    }
    var avgMin = PLAN ? Math.round(avg(PLAN.days.map(function (d) { return d.minutes || 0; }))) : 0;
    return '<section class="today onboard" aria-labelledby="ob-h"><h2 id="ob-h">איך נוח לכם ללמוד?' + steps + '</h2><div class="choice-grid">' +
      (PLAN ? '<button type="button" class="choice rec" data-act="ob-plan"><b>תוכנית של ' + PLAN_N + ' ימים</b><i class="badge-soft">מומלץ</i><span>בערך ' + avgMin + " דקות ביום, ואפשר לחלק לכמה פעמים ביום. בכל יום מחכות לכם משימות מוכנות.</span></button>" : "") +
      '<button type="button" class="choice" data-act="ob-self"><b>בקצב שלכם</b><span>שיעור אחרי שיעור. האפליקציה תזכיר לכם על מה לחזור.</span></button></div>' +
      '<p class="field-note">אפשר לשנות את זה אחר כך.</p><button type="button" class="linkish" data-act="ob-back">לחזור לשלב הקודם</button></section>';
  }
  // P1-5: one status per task (✓ בוצע, or the task's icon); a separate text button marks a task done by hand
  function taskRow(t) {
    var plan = t.day !== undefined, man = plan && !!(S.plan.done[t.day] && S.plan.done[t.day][t.idx]);
    var manBtn = plan && !SET.simple && (man || !t.done) ? '<button type="button" class="btn btn-sm btn-ghost tick-t" data-act="plan-tick" data-day="' + t.day + '" data-idx="' + t.idx + '" aria-label="' + (man ? "ביטול הסימון: " : "סימנתי שביצעתי: ") + esc(taskTitle(t)) + '">' + (man ? "ביטול הסימון" : "סימנתי שביצעתי") + "</button>" : "";
    return '<li class="task' + (t.done ? " done" : "") + '"><a class="task-a" ' + taskLink(t) + '><span class="ti">' + (t.done ? I.check + '<span class="ti-w">בוצע</span>' : '<span aria-hidden="true">' + (I[TASK_ICON[t.type]] || "") + "</span>") + "</span>" +
      '<span class="tt"><b>' + esc(taskTitle(t)) + "</b>" + (t.note || t.carried ? "<small>" + (t.carried ? "<b class=\"carried\">מאתמול</b>" + (t.note ? " · " : "") : "") + esc(t.note || "") + "</small>" : "") + "</span>" +
      '<span class="tm">' + (t.min ? t.min + " דקות" : "") + "</span></a>" + manBtn + "</li>";
  }
  function todayCard() {
    var T = todayTasks(), ts = T.tasks, k = ts.length;
    var dn = ts.filter(function (t) { return t.done; }).length, mins = ts.reduce(function (s, t) { return s + (t.min || 0); }, 0);
    var allDone = k > 0 && dn === k, first = ts.filter(function (t) { return !t.done; })[0];
    var html = '<section class="today' + (allDone ? " is-done" : "") + '" aria-labelledby="today-h">' +
      '<div class="today-top"><h2 id="today-h">' + esc(allDone ? "סיימתם את כל המשימות של היום" : T.title) + '</h2><span class="meta">' + (k ? k + " משימות, בערך " + mins + " דקות" : "") + "</span></div>";
    if (planOn() && planDayNow() === 0) html += '<p class="muted small">התוכנית מתחילה ב-' + fmtDay(planDate(1)) + ". עד אז, אפשר ללמוד בקצב שלכם.</p>";
    if (k) html += '<div class="today-prog">' + tape(pct(dn / k), true, "today-" + today()) + '<span class="mono-n">' + dn + " מתוך " + k + "</span></div>";
    // R11: the one next step comes first, above the list
    if (!allDone && k && first) html += '<a class="btn btn-primary btn-cta" ' + taskLink(first) + ">" + (dn ? "להמשיך למשימה הבאה" : "להתחיל את המשימה הראשונה") + I.arrowL + "</a>";
    if (k) html += '<ol class="tasks">' + ts.map(taskRow).join("") + "</ol>";
    else html += '<p class="muted">אין משימות להיום. אפשר לעבור על כרטיסיות או לענות על שאלות.</p>';
    if (allDone || !k) {
      html += (allDone ? stamp("סיימתם להיום", "day:" + today()) : "") + '<div class="btn-row"><button type="button" class="btn" data-act="more-cards">לעבור על עוד 10 כרטיסיות</button><button type="button" class="btn" data-act="quick-practice">לענות על 10 שאלות</button></div>';
    }
    if (planOn() && T.plan) html += '<a class="link-more" href="#plan">לכל התוכנית</a>';
    return html + "</section>";
  }
  function statsStrip() {
    var c = completion(), due = dueCards().length, sk = streak();
    var d = new Date(); d.setDate(d.getDate() - d.getDay());
    var ticks = "", td = today();
    var wk = 0;
    for (var i = 0; i < 7; i++) { var k = dayKey(d); if (S.days[k]) wk++; ticks += '<i class="' + (S.days[k] ? "on" : "") + (k === td ? " now" : "") + '"></i>'; d.setDate(d.getDate() + 1); }
    return '<div class="stat-strip">' +
      '<div class="st-tile"><span class="k">ימים ברצף</span><span class="v">' + sk + "<small> " + (sk === 1 ? "יום" : "ימים") + '</small></span><span class="week" role="img" aria-label="השבוע למדתם ' + wk + ' ימים מתוך 7">' + ticks + "</span></div>" +
      '<div class="st-tile"><span class="k">שיעורים שסיימתם</span><span class="v">' + c.d + "<small> מתוך " + c.n + "</small></span>" + tape(c.p, true, "home-done") + "</div>" +
      '<a class="st-tile" href="#review"><span class="k">כרטיסיות לחזרה היום</span><span class="v">' + due + "<small> מחכות</small></span></a></div>";
  }
  function planTicks(pn) {
    var h = "";
    for (var n = 1; n <= PLAN_N; n++) h += '<i class="' + (planDayDone(n) ? "on" : "") + (n === pn ? " now" : "") + '" title="יום ' + n + '"></i>';
    return '<span class="plan-ticks" role="img" aria-label="' + PLAN_N + " ימים בתוכנית, " + Array.apply(null, Array(PLAN_N)).filter(function (_, i) { return planDayDone(i + 1); }).length + ' הושלמו">' + h + "</span>";
  }
  function planMini(pn) { return '<a class="plan-mini" href="#plan"><span class="k">תוכנית של ' + PLAN_N + " ימים</span>" + planTicks(pn) + "<small>" + (pn ? "יום " + pn + " מתוך " + PLAN_N : "מתחילה ב-" + fmtDay(planDate(1))) + "</small></a>"; }
  function dashFig() { var m = media("dashboard"); return m ? aiFig(m, { cls: "dash-fig", material: "concrete", sizes: "(max-width: 980px) 100vw, 320px", small: true }) : ""; }
  function chCard(c) {
    var cp = completion(c.lessons);
    return '<a class="ch-card" href="#chapter-' + c.id + '">' + coverHtml(c) +
      '<span class="cc-body"><span class="num">' + esc(c.letter) + "</span>" + chIcon(c) + '<span class="cc-t"><b>' + esc(c.title) + "</b><small>" + cp.d + " מתוך " + cp.n + " שיעורים</small></span></span>" +
      tape(cp.p, true, "chc-" + c.id) + '<span class="cc-sw" aria-hidden="true">' + window.Diagrams.swatch(c.material || "general") + "</span></a>";
  }
  function footHtml() {
    return '<footer class="foot"><span>מה שמסומן ״מקור״ לקוח משקפי הקורס. מה שמסומן ״הסבר משלים״ נוסף כדי לעזור להבין. תמונות שנוצרו ב-AI הן רק להמחשה, לא לביצוע. באתר הבנייה עובדים רק לפי התוכניות המאושרות והוראות המהנדס.</span>' +
      '<span id="save-status">' + saveStatusText() + "</span></footer>";
  }

  // =============================================================== plan (§8.3)
  function viewPlan() {
    if (!PLAN) { paint('<div class="empty">' + I.level + "<b>התוכנית לא נטענה</b><p>סגרו את הדף ופתחו אותו שוב.</p></div>"); return; }
    var on = planOn(), pn = planDayNow();
    var html = '<nav class="crumbs" aria-label="מיקום"><a href="#home">דף הבית</a><span aria-hidden="true">›</span><span>תוכנית הלימוד</span></nav>' +
      '<div class="page-head"><span class="eyebrow">תוכנית לימוד</span><h1 class="display">' + esc(PLAN.title || "תוכנית 14 יום") + "</h1>" + hereLine("plan") + (PLAN.intro ? '<p class="lead">' + esc(PLAN.intro) + "</p>" : "") + "</div>";
    if (!on) html += '<div class="panel plan-start"><p>בכל יום בתוכנית מחכות משימות: שיעורים, כרטיסיות, שאלות, סיפורים מהאתר ומבחנים.</p><p>משימה שסיימתם מסומנת מעצמה. אפשר גם לסמן אותה בעצמכם.</p><div class="btn-row"><button type="button" class="btn btn-primary" data-act="ob-start" data-when="0">להתחיל את התוכנית היום</button><button type="button" class="btn" data-act="ob-start" data-when="1">להתחיל את התוכנית מחר</button></div></div>';
    else html += '<div class="panel plan-status"><b>' + (pn === 0 ? "התוכנית מתחילה ב-" + fmtDay(planDate(1)) : pn > PLAN_N ? "התוכנית הסתיימה. בהצלחה במבחן." : "התחלתם ב-" + fmtDay(S.plan.start) + " · יום " + pn + " מתוך " + PLAN_N) + "</b>" + planTicks(pn) + "</div>";
    html += printBlock(PRINTS.planner);
    var miss = missedYesterday();
    if (miss) html += missedBanner(miss);
    html += '<ol class="plan-days">' + PLAN.days.map(function (d, i) {
      var n = i + 1, ts = planDayTasks(n), done = on && planDayDone(n);
      var st = !on ? "" : done ? ["done", "הושלם"] : n === pn ? ["today", "היום"] : n > pn ? ["later", "עוד לא הגיע"] : ["missed", "לא הושלם"];
      var rows = ts.map(function (t) { return taskRow(Object.assign(t, { done: on && planTaskDone(n, t.idx, t) })); }).join("");
      return '<li class="pday' + (st ? " pd-" + st[0] : "") + '"><details' + (n === pn || (!on && n === 1) ? " open" : "") + "><summary>" +
        '<span class="dn display">יום ' + n + '</span><span class="dt"><b>' + esc(d.title || "") + "</b><small>בערך " + (d.minutes || ts.reduce(function (s, t) { return s + (t.min || 0); }, 0)) + " דקות" + (on ? " · " + fmtDay(planDate(n)) : "") + "</small></span>" +
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
    var html = '<div class="page-head"><span class="eyebrow">' + LESSONS.length + " שיעורים · " + CH.length + " פרקים · בערך " + Math.round(total / 6) / 10 + ' שעות לימוד</span><h1 class="display">כל השיעורים</h1>' + hereLine("course") + "</div>";
    if (PLAN && !SET.simple) {
      var pn = planDayNow();
      html += planOn() ? '<a class="banner banner-link" href="#plan"><span class="rs-t"><b>' + (pn >= 1 && pn <= PLAN_N ? "יום " + pn + " מתוך " + PLAN_N : "תוכנית " + PLAN_N + " יום") + "</b><span>לראות את כל התוכנית</span></span>" + I.arrowL + "</a>"
        : '<a class="banner banner-link" href="#plan"><span class="rs-t"><b>רוצים תוכנית מסודרת? ' + PLAN_N + " יום עד המבחן</b><span>משימות מוכנות לכל יום, עם שיעורים, תרגול ומבחנים</span></span>" + I.arrowL + "</a>";
    }
    html += '<div class="ch-list">' + CH.map(chRow).join("") + "</div>";
    if (LIB.length && !SET.simple) {
      html += '<section class="lib-sec"><div class="section-head"><h2>שיעורי העשרה</h2><span class="badge-soft">לא מחומר הקורס</span></div>' +
        '<p class="muted">' + LIB.length + " שיעורים כלליים על מלאכות בניין: טפסנות, ברזל, בטון, טיח, איטום ועוד. הם לא מבוססים על שקפי הקורס, ולכן הם מופיעים בנפרד. אין עליהם שאלות במבחנים. אפשר להוסיף אותם לתרגול.</p>" +
        '<div class="lib-grid">' + LIB.map(function (l) {
          return '<a class="lib-item" href="#lib-' + l.id + '"><span class="num">' + pad2(l.num) + "</span><span>" + esc(l.title) + "</span>" + (S.read[l.id] ? '<span class="chip st-done">קראתם</span>' : "") + "</a>";
        }).join("") + "</div></section>";
    }
    paint(html);
  }
  function chRow(c) {
    var cp = completion(c.lessons), est = c.lessons.reduce(function (s, l) { return s + (l.est || 10); }, 0), open = !!openCh[c.id];
    return '<section class="ch-row' + (open ? " open" : "") + '" id="ch-' + c.id + '"><div class="ch-row-h">' +
      '<a class="ch-link" href="#chapter-' + c.id + '">' + (SET.simple ? "" : coverHtml(c, { sizes: "72px" })) + '<span class="ch-letter">' + esc(c.letter) + "</span>" +
      '<span class="ch-title"><span class="ch-name">' + chIcon(c) + "<b>" + esc(c.title) + "</b></span><small>" + cp.d + " מתוך " + cp.n + " שיעורים" + (SET.simple ? "" : ", בערך " + est + " דקות") + "</small>" + tape(cp.p, true, "chr-" + c.id) + "</span>" + (SET.simple ? "" : glyph(chapterM(c), true)) + "</a></div>" +
      '<button type="button" class="ch-exp-t" data-act="toggle-ch" data-id="' + c.id + '" aria-expanded="' + open + '" aria-controls="chl-' + c.id + '">' + chExpLabel(c, open) + "</button>" +
      '<ol class="lesson-list" id="chl-' + c.id + '"' + (open ? "" : " hidden") + ">" + c.lessons.map(lessonRow).join("") + "</ol></section>";
  }
  function chExpLabel(c, open) { return (open ? "להסתיר את השיעורים" : "להציג את " + c.lessons.length + " השיעורים בפרק") + I.chev; }
  // lesson rows: the title first, the code after it (P2-5); the thumbnail's AI label is a word in the meta line (P0-1)
  function lessonRow(l, next) {
    var m = SET.simple ? null : media(l.id);
    return '<li><a class="lesson-row' + (next === true ? " is-next" : "") + '" href="#lesson-' + l.id + '">' + (m ? '<span class="thumb">' + imgHtml(m, { card: true, small: true, sizes: "48px" }) + "</span>" : "") +
      '<span class="lt"><span class="lt-h"><b>' + esc(l.title) + '</b> <span class="code">' + esc(l.code) + "</span></span><small>" + (l.est || 10) + " דקות · " + lessonQs(l.id).length + " שאלות" + (m ? " · תמונה: המחשת AI" : "") + (next === true ? ' · <span class="next-tag">השיעור הבא</span>' : "") + "</small></span>" +
      '<span class="lr-end">' + stateChip(l.id) + (SET.simple ? "" : glyph(lessonM(l.id), true)) + "</span></a></li>";
  }

  // =============================================================== chapter page (P1-1, §8.1)
  function viewChapter(c) {
    var x = X(c.id) || {}, cp = completion(c.lessons), cm = chapterM(c), m = chMedia(c);
    var est = c.lessons.reduce(function (s, l) { return s + (l.est || 10); }, 0);
    var nav = [], body = "";
    function sec(id, label, h) { if (label) nav.push([id, label]); body += '<section class="cs" id="' + id + '">' + h + "</section>"; }
    var html = '<nav class="crumbs" aria-label="מיקום"><a href="#home">דף הבית</a><span aria-hidden="true">›</span><a href="#course">כל השיעורים</a><span aria-hidden="true">›</span><span>פרק ' + esc(c.letter) + "</span></nav>";
    html += '<header class="ch-head">' + (m ? aiFig(m, { cls: "ch-cover", material: c.material, eager: true, sizes: "(max-width: 760px) 100vw, 680px" }) : '<div class="ch-cover sw" aria-hidden="true">' + window.Diagrams.swatch(c.material || "general") + "</div>") +
      '<div class="chh-main"><div class="chh-title">' + chIcon(c, true) + '<div class="chh-tt"><span class="eyebrow">פרק ' + esc(c.letter) + " · " + c.lessons.length + " שיעורים · בערך " + est + ' דקות</span><h1 class="display">' + esc(c.title) + "</h1></div></div>" + hereLine("chapter") +
      '<div class="chh-prog">' + tape(cp.p, false, "chp-" + c.id) + '<span class="mono-n">' + cp.d + " מתוך " + cp.n + " שיעורים</span>" + (SET.simple ? "" : glyph(cm)) + "</div></div></header>";
    // P2-3: the chapter-complete moment is an inline card, never a sheet that opens by itself
    if (c.lessons.every(function (l) { return S.done[l.id]; }) && !S.celebrated["ch:" + c.id]) html += chDoneCard(c);
    // hook + big idea (hook is "הסבר משלים" by schema; a big idea without sources is labelled the same way)
    if (x.hook || x.big_idea) {
      body += '<section class="cs cs-intro">' +
        (x.hook ? '<div class="hook"><h2>למה זה חשוב באתר הבנייה</h2><p>' + esc(x.hook) + '</p><span class="tag-expl">הסבר משלים</span></div>' : "") +
        (x.big_idea ? '<div class="bigidea"><h2>הרעיון המרכזי</h2><p class="bi">' + esc(typeof x.big_idea === "string" ? x.big_idea : x.big_idea.t || "") + "</p>" +
          (isObj(x.big_idea) && arr(x.big_idea.src).length ? srcChips(x.big_idea.src) : '<span class="tag-expl">הסבר משלים</span>') + "</div>" : "") + "</section>";
    }
    body += pretestCard(c);
    var next = c.lessons.filter(function (l) { return !S.done[l.id]; })[0];
    sec("cs-lessons", "שיעורים", '<h2>השיעורים בפרק</h2><ol class="lesson-list ch-lessons">' + c.lessons.map(function (l) { return lessonRow(l, l === next); }).join("") + "</ol>");
    if (arr(x.cheatsheet).length) {
      var cs = x.cheatsheet;
      sec("cs-sheet", "דף סיכום", '<div class="cs-h"><h2>דף סיכום</h2><div class="btn-row"><a class="btn btn-sm btn-ghost" href="#sheet-' + c.id + '">לפתוח במסך מלא</a><button type="button" class="btn btn-sm btn-ghost" data-act="cs-memo" aria-pressed="false">' + I.eyeOff + "להסתיר את העובדות</button></div></div>" + (SET.simple ? "" : sheetPrint(c)) +
        cheatList(cs, cs.length > 8) + (cs.length > 8 ? '<button type="button" class="btn btn-sm btn-ghost cs-more" data-act="cs-more">להציג עוד ' + (cs.length - 8) + " עובדות</button>" : ""));
    }
    if (isObj(x.compare) && arr(x.compare.head).length) sec("cs-compare", "השוואה", "<h2>השוואה: " + esc(x.compare.title || "") + "</h2>" + compareHtml(x.compare));
    if (arr(x.links).length) sec("cs-links", "איך זה מתחבר", "<h2>איך הכול מתחבר</h2>" + linksHtml(x.links, c));
    var mns = arr(x.mnemonics).filter(function (mn) { return mn && mn.t; });
    if (mns.length) sec("cs-mn", "טריקים לזכירה", '<h2>טריקים לזכירה</h2><div class="mn-grid">' + mns.map(function (mn) {
      var l = L[mn["for"]];
      return '<div class="mn"><span class="mn-l">' + (l ? '<a href="#lesson-' + l.id + '">' + esc(l.code + " · " + l.title) + "</a>" : "") + '</span><p>' + esc(mn.t) + '</p><span class="tag-expl">עזר לזכירה · הסבר משלים</span></div>';
    }).join("") + "</div>");
    if (arr(x.traps).length) sec("cs-traps", "מלכודות", '<h2>מלכודות במבחן</h2><p class="muted">דברים שקל להתבלבל בהם בשאלות <span class="tag-expl">הסבר משלים</span></p>' + trapsHtml(x.traps));
    var cl = casesFor({ ch: c.id });
    if (cl.length) sec("cs-cases", "סיפורים מהאתר", '<h2>סיפורים מהאתר</h2><div class="case-grid">' + cl.map(caseCard).join("") + "</div>");
    sec("cs-exam", "מבחן", examCard(c, true));
    if (SET.simple) {
      // simple mode: the lessons, the summary sheet and the exam stay in view; everything else goes inside one disclosure
      var parts0 = body.split('<section class="cs'), keep = "", more = "", moreN = 0;
      parts0.forEach(function (p0, i) {
        if (!i) { keep += p0; return; }
        var sec0 = '<section class="cs' + p0;
        if (/^ (pretest-card|cs-intro)|^" id="(cs-lessons|cs-exam)"/.test(p0)) keep += sec0; else { more += sec0; moreN++; }
      });
      if (x && arr(x.cheatsheet).length) keep += '<a class="btn" href="#sheet-' + c.id + '">לדף הסיכום של הפרק</a>';
      keep += sheetPrint(c);
      body = keep + (moreN ? '<details class="panel more-d"><summary><b>עוד בפרק הזה (' + moreN + ")</b>" + I.chev + "</summary>" + more + "</details>" : "");
      nav = [];
    }
    html += (nav.length > 1 ? '<nav class="ch-nav" aria-label="קפיצה לחלק בפרק"><div class="ch-nav-in">' + nav.map(function (n) { return '<button type="button" class="chip-nav" data-act="ch-jump" data-target="' + n[0] + '">' + n[1] + "</button>"; }).join("") + "</div></nav>" : "") + '<div class="chp-body">' + body + "</div>";
    var before = JSON.stringify(S.celebrated);
    paint(html);
    if (JSON.stringify(S.celebrated) !== before) save();
    CHV = nav.length > 1 ? { ids: nav.map(function (n) { return n[0]; }) } : null;
  }
  function chDoneCard(c) {
    var n = Math.min(15, poolFor("ch:" + c.id, { auto: true }).length), x = X(c.id), m = chMedia(c);
    return '<section class="chd-card" aria-label="סיימתם את פרק ' + esc(c.letter) + '">' + (m ? aiFig(m, { cls: "chd-cover", material: c.material, small: true }) : "") +
      stamp("פרק " + c.letter + " הושלם", "ch:" + c.id) + "<p>סיימתם " + c.lessons.length + " שיעורים. עכשיו כדאי לבדוק את עצמכם.</p>" +
      '<div class="btn-col"><button type="button" class="btn" data-act="exam-ch" data-id="' + c.id + '">להתחיל את מבחן פרק ' + c.letter + ": " + plural(n, "שאלה אחת", "שאלות") + "</button>" +
      (x && arr(x.cheatsheet).length ? '<a class="btn" href="#sheet-' + c.id + '">לדף הסיכום של הפרק</a>' : "") +
      ((PRETEST[c.id] || []).length ? '<button type="button" class="btn" data-act="pretest" data-ch="' + c.id + '" data-phase="post">לבדיקה בסוף הפרק: כמה התקדמתם</button>' : "") + "</div></section>";
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
      h += "<h2>בדיקה לפני הפרק ובסופו</h2>" + prePostBars(p);
    } else if (chDone) {
      h += '<h2>בדיקה בסוף הפרק</h2><p>כמה התקדמתם מאז ההתחלה: ' + qs.length + " שאלות, בערך 2 דקות. לא נכנס לציון.</p>" + (p.pre ? '<p class="muted">בבדיקה לפני הפרק: ' + p.pre.score + " נכונות מתוך " + p.pre.n + "</p>" : "") +
        '<button type="button" class="btn" data-act="pretest" data-ch="' + c.id + '" data-phase="post">להתחיל את הבדיקה בסוף הפרק</button>';
    } else if (p.pre) {
      h += '<h2>מה אתם כבר יודעים?</h2><p>בבדיקה לפני הפרק: <b class="mono-n">' + p.pre.score + " נכונות מתוך " + p.pre.n + '</b>. זו נקודת ההתחלה שלכם. בסוף הפרק תוכלו לבדוק שוב.</p>';
    } else {
      h += '<h2>מה אתם כבר יודעים?</h2><p>' + qs.length + ' שאלות, בערך 2 דקות. לא נכנס לציון.</p><button type="button" class="btn" data-act="pretest" data-ch="' + c.id + '" data-phase="pre">להתחיל את הבדיקה לפני הפרק</button>';
    }
    return h + "</section>";
  }
  function prePostBars(p) {
    var a = p.pre, b = p.post, n = (b || a).n || 1;
    return '<div class="bars prepost">' + (a ? '<div class="bar-row"><span>לפני הפרק</span>' + tape(pct(a.score / n), true) + '<span class="mono-n">' + a.score + " מתוך " + a.n + "</span></div>" : "") +
      (b ? '<div class="bar-row"><span>בסוף הפרק</span>' + tape(pct(b.score / n), true, "post-" + b.t) + '<span class="mono-n">' + b.score + " מתוך " + b.n + "</span></div>" : "") + "</div>";
  }
  function lastExamOf(chId) { return S.exams.filter(function (e) { return e.chapter === chId; })[0] || null; }
  function examCard(c, withHead) {
    var n = Math.min(15, poolFor("ch:" + c.id, { auto: true }).length), last = lastExamOf(c.id), traps = arr((X(c.id) || {}).traps).length;
    return (withHead ? "<h2>מבחן הפרק</h2>" : "") + '<div class="exam-card-x"><div><b>מבחן פרק ' + esc(c.letter) + " · " + plural(n, "שאלה אחת", "שאלות") + "</b>" +
      "<span>" + (last ? "ציון אחרון: " + last.score + ", בתאריך " + fmtDate(last.t) : "עוד לא נבחנתם בפרק הזה") + (traps ? " · " + traps + " מלכודות שכדאי להכיר" : "") + "</span></div>" +
      '<button type="button" class="btn btn-primary" data-act="exam-ch" data-id="' + c.id + '"' + (n ? "" : " disabled") + ">להתחיל את מבחן הפרק</button></div>";
  }

  // =============================================================== cheat sheets (עיון › דפי סיכום, #sheet-<id>)
  var SHEETV = null;
  function refTabs(cur) {
    return '<div class="seg-tabs wide" role="tablist" aria-label="חומרי עזר">' + [["glossary", "מילון מונחים"], ["sheets", "דפי סיכום"], ["sources", "שקפי הקורס"]].map(function (t) {
      return '<a role="tab" href="#' + t[0] + '" aria-selected="' + (cur === t[0]) + '">' + t[1] + "</a>";
    }).join("") + "</div>";
  }
  function viewSheets() {
    var html = '<div class="page-head"><h1 class="display">חומרי עזר</h1>' + hereLine("sheets") + "</div>" + refTabs("sheets") +
      '<p class="muted">דף אחד לכל פרק, עם העובדות החשובות. ליד כל עובדה מופיע השקף שלה. טוב לחזרה לפני מבחן, ואפשר להדפיס.</p><div class="sheet-list">' +
      CH.filter(function (c) { return X(c.id) && arr(X(c.id).cheatsheet).length; }).map(function (c) {
        return '<a class="sheet-item" href="#sheet-' + c.id + '"><span class="num">' + esc(c.letter) + "</span>" + chIcon(c) + '<span class="lt"><b>' + esc(c.title) + "</b><small>" + X(c.id).cheatsheet.length + " עובדות" + (S.acts["sheet:" + c.id] ? " · קראתם" : "") + "</small></span>" + I.arrowL + "</a>";
      }).join("") + "</div>";
    paint(html);
  }
  function viewSheet(c) {
    var x = X(c.id);
    var html = '<nav class="crumbs" aria-label="מיקום"><a href="#home">דף הבית</a><span aria-hidden="true">›</span><a href="#sheets">דפי סיכום</a><span aria-hidden="true">›</span><a href="#chapter-' + c.id + '">פרק ' + esc(c.letter) + "</a></nav>" +
      '<article class="cheatsheet"><div class="page-head"><div class="chh-title">' + chIcon(c) + '<div class="chh-tt"><span class="eyebrow">דף סיכום · פרק ' + esc(c.letter) + '</span><h1 class="display">' + esc(c.title) + "</h1></div></div>" + hereLine("sheet") +
      '<div class="btn-row no-print"><button type="button" class="btn btn-sm btn-ghost" data-act="cs-memo" aria-pressed="false">' + I.eyeOff + 'להסתיר את העובדות</button><button type="button" class="btn btn-sm btn-ghost" data-act="print">להדפיס</button></div>' + sheetPrint(c) + "</div>" +
      cheatList(arr(x.cheatsheet), false) +
      (isObj(x.compare) && arr(x.compare.head).length ? "<h2>השוואה: " + esc(x.compare.title || "") + "</h2>" + compareHtml(x.compare) : "") +
      (arr(x.traps).length ? '<h2>מלכודות במבחן</h2><p class="muted">דברים שקל להתבלבל בהם בשאלות <span class="tag-expl">הסבר משלים</span></p>' + trapsHtml(x.traps) : "") +
      '<p class="muted print-note">ליד כל עובדה מופיע השקף שלה. מה שמסומן ״הסבר משלים״ נוסף כדי לעזור, ולא מופיע בשקפים.</p></article>';
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
        var lab = { exam: "חשוב למבחן", note: "שימו לב", mistake: "טעות נפוצה" }[b.k];
        return '<div class="callout co-' + b.k + '"><span class="co-tag">' + lab + (b.expl ? " · הסבר משלים" : "") + '</span><div class="prose">' + wrapP(b.html) + "</div>" + blkMeta(src) + "</div>";
      case "table":
        return '<figure class="tbl"><div class="tbl-scroll"><table><caption>' + esc(b.title || "") + "</caption><thead><tr>" + (b.head || []).map(function (h) { return '<th scope="col">' + esc(h) + "</th>"; }).join("") + "</tr></thead><tbody>" +
          (b.rows || []).map(function (r) { return "<tr>" + r.map(function (c, i) { var cls = /\[\?\]|לא ברור|לא קריא/.test(c) ? ' class="unclear"' : ""; return i === 0 ? '<th scope="row"' + cls + ">" + esc(c) + "</th>" : "<td" + cls + ">" + esc(c) + "</td>"; }).join("") + "</tr>"; }).join("") +
          "</tbody></table></div>" + (src ? '<figcaption class="blk-meta">מקור: ' + src + "</figcaption>" : "") + "</figure>";
      case "diagram": return figDiagram(b.id, ctx);
      case "image":
        var s = SRC[b.src];
        return '<figure class="src-img"><span class="src-lbl">שקף מהקורס</span><a class="src-img-a" href="#source-' + esc(b.src) + '"><img loading="lazy" src="' + IMG_BASE + esc(b.src) + '.jpg" alt="' + esc(b.caption || (s && s.title) || "צילום שקף מהקורס") + '" data-act="imgfail"><span class="zoom-w">' + I.expand + 'לפתוח את השקף</span></a><figcaption>' + esc(b.caption || "") + " " + srcChips([b.src]) + "</figcaption></figure>";
      default: return b.html ? '<div class="prose">' + wrapP(b.html) + "</div>" : "";
    }
  }
  function verifyGroup(list) {
    var id = "vg-" + (++vgN), n = list.length;
    return '<div class="verify-group"><button type="button" class="vg-head" data-act="vg" aria-expanded="false" aria-controls="' + id + '">' +
      '<span>טעון אימות מול המקור · ' + n + " " + (n === 1 ? "מקום שלא ברור מה כתוב בו" : "מקומות שלא ברור מה כתוב בהם") + "</span>" + I.chev + "</button>" +
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
    var html = '<nav class="crumbs" aria-label="מיקום"><a href="#home">דף הבית</a><span aria-hidden="true">›</span><a href="#course">כל השיעורים</a><span aria-hidden="true">›</span><a href="#chapter-' + l.ch.id + '">פרק ' + esc(l.ch.letter) + ": " + esc(l.ch.title) + '</a><span aria-hidden="true">›</span><span>' + esc(l.code) + "</span></nav>";
    html += '<div class="lesson-wrap"><div class="lesson-main">';
    html += '<header class="lesson-head' + (m ? " has-hero" : "") + '">' + (m ? aiFig(m, { cls: "lh-hero", material: l.ch.material, eager: true }) : '<div class="swatch" aria-hidden="true">' + window.Diagrams.swatch(l.ch.material || "general") + "</div>") +
      '<div class="lh-main"><span class="eyebrow">שיעור ' + esc(l.code) + " · בערך " + (l.est || 10) + " דקות · פרק " + esc(l.ch.letter) + ": " + esc(l.ch.title) + "</span><h1>" + esc(l.title) + "</h1>" +
      '<div class="lh-chips">' + stateChip(l.id) + '<span class="chip">' + qs.length + " שאלות</span>" + '<span class="chip">' + cs.length + " כרטיסיות</span>" + (SET.simple ? "" : glyph(lm)) +
      ((l.sources || []).length ? '<details class="src-more"><summary class="chip">' + l.sources.length + " שקפים מהקורס" + I.chev + "</summary><div>" + srcChips(l.sources) + "</div></details>" : "") +
      "</div></div></header>";
    var obj = l.objectives || [], kw = l.keywords || [];
    if (obj.length || kw.length) {
      html += '<details class="learn"><summary><span>מה לומדים בשיעור · ' + obj.length + " מטרות · " + kw.length + " מונחים</span>" + I.chev + "</summary><div class=\"learn-in\">" +
        (obj.length ? "<h2>מטרות הלמידה</h2><ul>" + obj.map(function (o) { return "<li>" + esc(o) + "</li>"; }).join("") + "</ul>" : "") +
        (kw.length ? '<h2>מילות מפתח</h2><div class="chips kw-chips">' + kw.map(function (k, i) { return '<a class="chip kw' + (i >= 8 ? " kw-x" : "") + '" href="#glossary" data-act="glossary-q" data-q="' + esc(k) + '">' + esc(k) + "</a>"; }).join("") +
          (kw.length > 8 ? '<button type="button" class="chip kw kw-more" data-act="kw-more">להציג עוד ' + (kw.length - 8) + " מונחים</button>" : "") + "</div>" : "") + "</div></details>";
    }
    // level bar: the three levels only (the bar may stay on screen); the tools are worded buttons in their own row (P0-7)
    html += '<div class="level-bar" id="level-bar"><div class="seg-tabs lv-tabs" role="tablist" aria-label="רמת לימוד">' + LEVELS.map(function (z, i) {
      return '<button type="button" role="tab" id="tab-' + z[0] + '" aria-selected="' + (lv === z[0]) + '" aria-label="' + z[1] + ", רמה " + (i + 1) + '" data-act="level" data-lv="' + z[0] + '">' + z[1] + "</button>";
    }).join("") + "</div>" +
      '<span class="read-line" aria-hidden="true"><i id="read-i"></i></span></div>' +
      '<div class="lv-tools"><p class="lv-help">הבנה מהירה: הרעיון בכמה שורות. לימוד מלא: כל השיעור. עומק הנדסי: פרטים נוספים למי שרוצה.</p><div class="btn-row">' +
      '<button type="button" class="btn btn-sm btn-ghost" data-act="toc" aria-haspopup="dialog">' + I.list + "תוכן השיעור</button>" +
      (SET.simple ? "" : '<button type="button" class="btn btn-sm btn-ghost" data-act="memo" aria-describedby="memo-d">' + I.eyeOff + memoLabel() + '</button><span class="sr-only" id="memo-d">כדי לבדוק את עצמכם</span>') +
      '<button type="button" class="btn btn-sm btn-ghost" data-act="legend" aria-haspopup="dialog">' + I.help + "מה אומרים הסימונים?</button></div></div>";
    // P2-3: the first lesson explains the three kinds of content inline (no sheet that opens by itself)
    if (!S.seen.legend) html += '<div class="legend-box" id="legend-box"><b>שלושה סוגי תוכן בשיעור</b>' + legendList(false) + '<button type="button" class="btn btn-sm" data-act="legend-ok">הבנתי</button></div>';

    var secs = [];
    html += '<div class="lesson-body" role="tabpanel" aria-labelledby="tab-' + lv + '">';
    if (lv === "quick") {
      var qk = l.quick || {};
      secs.push({ id: "s-quick", title: "הבנה מהירה", n: "" });
      html += '<section class="block quick" id="s-quick" aria-labelledby="s-quick-h"><h2 class="sr-only" id="s-quick-h">הבנה מהירה</h2>' + (canSpeak() ? '<div class="block-tools">' + speakBtn("s-quick") + "</div>" : "") +
        quickRow("מה זה?", qk.what) + quickRow("למה משתמשים בזה?", qk.why) + quickRow("איפה רואים את זה באתר?", qk.where) +
        ((qk.exam || []).length ? '<div class="q-row q-exam"><h3>מה חשוב לזכור למבחן</h3><ul>' + qk.exam.map(function (e) { return "<li>" + esc(e) + "</li>"; }).join("") + "</ul></div>" : "") +
        (qk.src ? '<div class="blk-meta">מבוסס על: ' + srcChips(qk.src) + "</div>" : "") +
        '<div class="btn-row"><button type="button" class="btn" data-act="level" data-lv="full">להמשיך ללימוד המלא' + I.arrowL + "</button></div></section>";
    } else {
      (l[lv] || []).forEach(function (s, i) {
        var anchor = "s-" + lv + "-" + (i + 1), bk = S.bookmarks[l.id + "|" + anchor], num = secNum(l, lv, i);
        secs.push({ id: anchor, title: s.title, n: num });
        html += '<section class="block" id="' + anchor + '"><div class="block-head"><h2 id="' + anchor + '-h">' + esc(s.title) + ' <span class="sn">' + esc(num) + "</span></h2>" +
          '<div class="block-tools">' + speakBtn(anchor) + bmBtn(l.id, anchor, s.title, !!bk) + "</div></div>" +
          renderBlocks(s.blocks, ctx) + "</section>";
      });
      if (lv === "deep" && !(l.deep || []).length) html += '<p class="muted panel">בשיעור הזה אין חלק נוסף להעמקה.</p>';
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
      html += '<section class="block ai-box"><h2>' + I.spark + ' עוזר הלימוד</h2><p class="muted">בחרו מה לבקש. העוזר עונה רק לפי חומר השיעור, ומציין את השקפים.</p><div class="btn-row">' +
        '<button type="button" class="btn btn-sm" data-act="ai" data-task="simple">להסביר בפשטות</button>' +
        '<button type="button" class="btn btn-sm" data-act="ai" data-task="example">לתת דוגמה מאתר בנייה</button>' +
        '<button type="button" class="btn btn-sm" data-act="ai" data-task="diff">להסביר את ההבדל בין המונחים</button>' +
        '<button type="button" class="btn btn-sm" data-act="ai" data-task="quiz">לשאול אותי שאלות על השיעור</button>' +
        '<button type="button" class="btn btn-sm" data-act="ai" data-task="again">להסביר שוב, לאט ובשלבים</button>' +
        '</div><form class="ai-ask" data-act="ai-ask"><label class="sr-only" for="ai-q">שאלה על השיעור</label><input class="input" id="ai-q" placeholder="אפשר גם לכתוב כאן שאלה משלכם" autocomplete="off"><button class="btn btn-sm btn-primary" type="submit">לשלוח את השאלה</button></form>' +
        '<div class="ai-out" id="ai-out" hidden aria-live="polite"></div></section>';
    }
    // P0-3 end panel
    secs.push({ id: "s-practice", title: "סיכום ותרגול", n: "" });
    var cl = casesFor({ lesson: l.id });
    html += '<section class="endpanel" id="s-practice">' +
      (S.done[l.id] ? '<p class="done-line">' + I.check + "<b>השיעור הושלם · " + fmtDate(S.done[l.id]) + '</b><button type="button" class="linkish" data-act="toggle-done" data-id="' + l.id + '">לבטל את הסימון שסיימתם</button></p>' : "") +
      "<h2>" + (S.done[l.id] ? "רוצים לבדוק את עצמכם שוב?" : "סיימתם לקרוא?") + "</h2><p>בדיקה קצרה תסמן שסיימתם את השיעור. הכרטיסיות שלו ייכנסו לחזרה.</p>" +
      '<button type="button" class="btn btn-primary" data-act="start-check" data-id="' + l.id + '">להתחיל בדיקת הבנה: 5 שאלות, בערך 3 דקות</button>' +
      (SET.simple ? '<div class="text-btns">' + (next ? '<a class="tbtn" href="#lesson-' + next.id + '">לשיעור הבא</a>' : "") + '<a class="tbtn" href="#home">לחזור לדף הבית</a></div>' : "") +
      (SET.simple ? "" : '<div class="text-btns"><button type="button" class="tbtn" data-act="start-lesson" data-id="' + l.id + '">לתרגל את כל ' + qs.length + " השאלות</button>" +
      '<a class="tbtn" href="#review-' + l.id + '">לעבור על ' + cs.length + " כרטיסיות</a>" +
      (cl.length ? '<a class="tbtn" href="#' + esc(cl[0].id) + '">לסיפור מהאתר</a>' : "") +
      (x && arr(x.cheatsheet).length ? '<a class="tbtn" href="#sheet-' + l.ch.id + '">לדף הסיכום של הפרק</a>' : "") + "</div>") +
      (S.done[l.id] || SET.simple ? "" : '<button type="button" class="linkish" data-act="toggle-done" data-id="' + l.id + '">לסמן שסיימתם, בלי בדיקה</button>') +
      (!SET.simple && (l.related || []).filter(function (r) { return L[r]; }).length ? '<div class="related"><span>שיעורים קשורים:</span>' + l.related.filter(function (r) { return L[r]; }).map(function (r) { return '<a href="#lesson-' + r + '">' + esc(L[r].code + " " + L[r].title) + "</a>"; }).join("") + "</div>" : "") +
      "</section>";
    if (S.done[l.id] && l.ch.lessons.every(function (x0) { return S.done[x0.id]; }) && !S.celebrated["ch:" + l.ch.id]) html += chDoneCard(l.ch);
    // P0-3: two full-width buttons, the whole title shows (no "…")
    html += '<nav class="pager" aria-label="שיעורים סמוכים">' +
      (prev ? '<a class="btn btn-ghost" href="#lesson-' + prev.id + '">' + I.arrowR + '<span class="pg-in"><small>השיעור הקודם</small><span>' + esc(prev.code + " " + prev.title) + "</span></span></a>" : "") +
      (next ? '<a class="btn btn-ghost" href="#lesson-' + next.id + '"><span class="pg-in"><small>השיעור הבא</small><span>' + esc(next.code + " " + next.title) + "</span></span>" + I.arrowL + "</a>" : "") +
      "</nav></div></div>";
    html += '<aside class="toc-side" aria-label="תוכן השיעור"><b>תוכן השיעור</b><ol>' + secs.map(function (s) { return tocItem(l, s); }).join("") + "</ol></aside></div>";
    var before = JSON.stringify(S.celebrated);
    paint(html);
    if (JSON.stringify(S.celebrated) !== before) save();
    if (clozeOn() && !SET.simple) applyCloze(true);
    LV = { lid: l.id, lv: lv, secs: secs, cur: "", saveT: 0 };
    trackReading(true);
  }
  function memoLabel() { return clozeOn() ? "להציג את כל המילים" : "להסתיר את המילים החשובות"; }
  // section bookmark: a worded toggle (P0-7); the section title is its description
  function bmBtn(lid, anchor, title, on) {
    return '<button type="button" class="btn btn-sm btn-ghost bm' + (on ? " on" : "") + '" data-act="bookmark" data-lesson="' + lid + '" data-anchor="' + anchor + '" data-title="' + esc(title) + '" aria-describedby="' + anchor + '-h">' + bmLabel(on) + "</button>";
  }
  function bmLabel(on) { return on ? "★ הקטע שמור" : "☆ לשמור את הקטע"; }
  function tocItem(l, s) {
    var read = !!S.secRead[l.id + "|" + s.id];
    return '<li class="' + (read ? "read" : "") + '" data-toc="' + s.id + '"><button type="button" data-act="toc-go" data-target="' + s.id + '"><span class="tn">' + esc(s.n) + "</span><span>" + esc(s.title) + '</span><span class="tk" aria-hidden="true">' + I.check + "</span>" + (read ? '<span class="sr-only">, קראתם</span>' : "") + "</button></li>";
  }
  function quickRow(h, t) { return t ? '<div class="q-row"><h3>' + h + "</h3><p>" + esc(t) + "</p></div>" : ""; }
  function applyCloze(on) {
    main.querySelectorAll(".prose b").forEach(function (b) { b.classList.toggle("cloze", on); b.classList.remove("shown"); if (on) b.setAttribute("tabindex", "0"); else b.removeAttribute("tabindex"); });
    var rl = main.querySelector(".remember-list");
    if (rl) { rl.classList.toggle("hide", on); rl.querySelectorAll(".txt").forEach(function (t) { t.classList.remove("shown"); }); }
  }
  var LABEL_HELP = [
    ["k-src", "מקור: ביסוס ב · שקף 27", "המידע הזה כתוב בשקף של הקורס. הקישו על השבב כדי לראות את השקף."],
    ["k-expl", "הסבר משלים", "הסבר שהוספנו כדי שיהיה קל יותר להבין. הוא לא מופיע בשקפים של הקורס."],
    ["k-ver", "טעון אימות מול המקור", "לא היה ברור מה כתוב בשקף, אז כתבנו את מה שנראה הכי נכון. כדאי לבדוק מול השקף או לשאול את המרצה. אין על זה שאלות בתרגול ובמבחנים."],
    ["k-ai", "המחשה שנוצרה ב-AI, לא פרט לביצוע", "את התמונה יצר מחשב (בינה מלאכותית, AI) כדי לעזור לדמיין. היא לא מדויקת, ואסור לבנות לפיה. באתר עובדים רק לפי התוכניות המאושרות."],
    ["k-slide", "שקף מהקורס", "צילום של שקף מהשיעורים של המרצה. הקישו על התמונה כדי לראות אותה בגדול."],
    ["k-illus", "המחשה לימודית, לא פרט לביצוע", "שרטוט פשוט שהכנו כדי להסביר. זה לא שרטוט עבודה, ואין לבנות לפיו."],
    ["k-ai", "AI (התג על תמונה)", "התמונה נוצרה במחשב. היא רק להמחשה."]
  ];
  function legendList(all) {
    return '<ul class="legend-list">' + LABEL_HELP.slice(0, all ? LABEL_HELP.length : 3).map(function (x) { return '<li><span class="lg-k ' + x[0] + '">' + x[1] + "</span><span>" + x[2] + "</span></li>"; }).join("") + "</ul>";
  }
  function legendSheet() {
    openSheet({ title: "מה אומרים הסימונים?", cls: "legend", body: legendList(true),
      actions: [{ label: "הבנתי, לסגור", act: "legend-ok", cls: "btn-primary" }], onClose: function () { if (!S.seen.legend) { S.seen.legend = Date.now(); save(); } } });
  }
  function tocSheet() {
    if (!LV || !L[LV.lid]) return;
    var l = L[LV.lid];
    openSheet({ title: "תוכן העניינים של השיעור", cls: "toc-sheet", focus: ".toc-list .cur button, .toc-list button",
      body: '<ol class="toc-list">' + LV.secs.map(function (s) { return tocItem(l, s).replace('<li class="', '<li class="' + (LV.cur === s.id ? "cur " : "")); }).join("") + "</ol>" +
        '<button type="button" class="linkish" data-act="legend">' + I.help + " מה אומרים הסימונים מקור, הסבר משלים וטעון אימות?</button>", noFootClose: false });
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
    var html = '<nav class="crumbs" aria-label="מיקום"><a href="#home">דף הבית</a><span aria-hidden="true">›</span><a href="#course">כל השיעורים</a><span aria-hidden="true">›</span><span>שיעורי העשרה</span></nav>' +
      '<div class="enrich-banner"><b>שיעור העשרה, לא מחומר הקורס.</b> הוא נכתב לפי תוכנית הלימודים הכללית. אם יש הבדל בינו לבין השקפים של המרצה, השקפים קובעים.</div>';
    html += '<header class="lesson-head lib-head"><div class="swatch">' + window.Diagrams.swatch(l.material) + '</div><div class="lh-main"><span class="eyebrow">שיעור העשרה ' + pad2(l.num) + "</span><h1>" + esc(l.title) + '</h1><p class="summary">' + esc(l.summary) + "</p></div></header>";
    html += '<div class="lesson-body">';
    var ctx = { code: "ה" + l.num };
    (l.sections || []).forEach(function (s, i) {
      html += '<section class="block"><h2><span class="sn">' + l.num + "." + (i + 1) + "</span>" + esc(s.title) + '</h2><div class="prose">' + (s.body || []).map(wrapP).join("") + "</div></section>";
      if (i === 1) (l.diagrams || []).forEach(function (d) { html += '<section class="block">' + renderBlock({ k: "diagram", id: d }, ctx) + "</section>"; });
    });
    html += '<section class="block"><h2>נקודות לזכור</h2><ul class="remember-list">' + (l.remember || []).map(function (r, i) { return '<li><span class="box">' + (i + 1) + '</span><span class="txt">' + esc(r) + "</span></li>"; }).join("") + "</ul></section>";
    html += '<section class="block"><h2>מונחים</h2><dl class="terms-grid">' + (l.terms || []).map(function (t) { return '<div class="term"><dt>' + esc(t.term) + "</dt><dd>" + esc(t.def) + "</dd></div>"; }).join("") + "</dl></section>";
    html += '<section class="practice"><h2>תרגול</h2><div class="btn-row">' +
      '<button type="button" class="btn btn-primary" data-act="start-lesson" data-id="' + l.id + '">לענות על ' + lessonQs(l.id).length + " שאלות</button>" +
      '<a class="btn" href="#review-' + l.id + '">לעבור על הכרטיסיות</a>' +
      '<button class="btn" data-act="toggle-read" data-id="' + l.id + '">' + (S.read[l.id] ? "קראתם ✓ (להקיש כדי לבטל)" : "לסמן שקראתם") + "</button></div></section></div>";
    paint(html);
  }

  // =============================================================== practice hub (P1-10)
  var cfg = { scope: "mixed", diff: 0, types: {}, count: 15, enrich: false };
  function pracTabs(cur) {
    var tabs = [["practice", "שאלות"], ["cards", "כרטיסיות"], ["exams", "מבחנים"]].concat(CASES.length ? [["cases", "סיפורים מהאתר"]] : []);
    return '<div class="seg-tabs wide" role="tablist" aria-label="תרגול">' + tabs.map(function (t) {
      var due = t[0] === "cards" ? dueCards().length : 0;
      return '<a role="tab" href="#' + t[0] + '" aria-selected="' + (cur === t[0]) + '">' + t[1] + (due ? ' <i class="badge">' + due + "</i>" : "") + "</a>";
    }).join("") + "</div>";
  }
  function viewPracticeHub(tab) {
    var html = '<div class="page-head"><h1 class="display">תרגול</h1>' + (tab === "exams" ? "" : hereLine(tab)) + "</div>" + pracTabs(tab);
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
      '<button type="button" class="preset" data-act="quick-practice"><b>תרגול מהיר</b><span>10 שאלות ממה שלמדתם, בערך 5 דקות</span></button>' +
      (mistakesN ? '<button type="button" class="preset" data-act="start-scope" data-scope="mistakes"><b>השאלות שטעיתם בהן</b><span>' + plural(mistakesN, "שאלה אחת", "שאלות") + "</span></button>" : "") +
      (SET.simple ? "" : '<button type="button" class="preset" data-act="preset-ch"><b>שאלות מפרק אחד</b><span>' + CH.length + " פרקים לבחירה, 10 שאלות</span></button>" +
      '<button type="button" class="preset" data-act="preset-type"><b>לפי סוג שאלה</b><span>' + Object.keys(TYPE_NAME).length + " סוגי שאלות לבחירה</span></button>" +
      (CASES.length ? '<a class="preset" href="#cases"><b>סיפורים מהאתר</b><span>' + CASES.length + " סיפורים, שלב אחרי שלב</span></a>" : "")) +
      '<a class="preset" href="#exams"><b>מבחן</b><span>מבחן על פרק אחד או על כל הקורס</span></a></div>' +
      (studied ? "" : '<p class="muted small">עוד לא פתחתם שיעורים, ולכן התרגול המהיר ישאל על הפרק הראשון.</p>');
    var opts = '<option value="mixed"' + (cfg.scope === "mixed" ? " selected" : "") + ">שאלות מכל הקורס</option>" +
      '<option value="weak"' + (cfg.scope === "weak" ? " selected" : "") + ">שיעורים שצריך לחזק</option>" +
      '<option value="mistakes"' + (cfg.scope === "mistakes" ? " selected" : "") + ">שאלות שטעיתם בהן (" + mistakesN + ")</option>" +
      CH.map(function (c) { return '<option value="ch:' + c.id + '"' + (cfg.scope === "ch:" + c.id ? " selected" : "") + ">פרק " + esc(c.letter) + ": " + esc(c.title) + "</option>"; }).join("") +
      LESSONS.map(function (l) { return '<option value="l:' + l.id + '"' + (cfg.scope === "l:" + l.id ? " selected" : "") + ">שיעור " + esc(l.code) + ": " + esc(l.title) + "</option>"; }).join("");
    if (SET.simple) return html;
    html += '<details class="panel custom"' + (cfg.open ? " open" : "") + ' id="custom"><summary><b>לבחור בעצמכם מה לתרגל</b>' + I.chev + '</summary><div class="setup"><p class="muted">בתרגול רואים מיד אחרי כל תשובה אם צדקתם, ולמה.</p>' +
      '<div class="field"><label for="p-scope">מה לתרגל</label><select class="select" id="p-scope">' + opts + "</select></div>" +
      '<div class="field"><span class="lbl" id="p-diff-l">רמת קושי</span><div class="seg" role="group" aria-labelledby="p-diff-l">' +
      [[0, "כל הרמות"], [1, "קל"], [2, "בינוני"], [3, "קשה"]].map(function (d) { return '<button type="button" data-act="p-diff" data-n="' + d[0] + '" aria-pressed="' + (cfg.diff === d[0]) + '">' + d[1] + "</button>"; }).join("") + "</div></div>" +
      '<div class="field"><span class="lbl" id="p-types-l">סוגי שאלות</span><div class="seg" role="group" aria-labelledby="p-types-l">' +
      Object.keys(TYPE_NAME).map(function (t) { return '<button type="button" data-act="p-type" data-t="' + t + '" aria-pressed="' + (!!cfg.types[t]) + '">' + TYPE_NAME[t] + "</button>"; }).join("") +
      '</div><small class="muted">אם לא תבחרו, יופיעו כל סוגי השאלות.</small></div>' +
      '<div class="field"><span class="lbl" id="p-count-l">מספר שאלות</span><div class="seg" role="group" aria-labelledby="p-count-l">' +
      [10, 15, 25, 0].map(function (n) { return '<button type="button" data-act="p-count" data-n="' + n + '" aria-pressed="' + (cfg.count === n) + '">' + (n || "כל השאלות") + "</button>"; }).join("") + "</div></div>" +
      '<label class="check"><input type="checkbox" id="p-enrich"' + (cfg.enrich ? " checked" : "") + "> להוסיף גם שאלות משיעורי ההעשרה (לא מחומר הקורס)</label>" +
      '<div class="btn-row"><button type="button" class="btn btn-primary" data-act="p-start">להתחיל את התרגול</button></div>' + (cfg.msg ? '<p class="inline-msg" role="alert">' + esc(cfg.msg) + "</p>" : "") + "</div></details>";
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
    var names = { mixed: "שאלות מכל הקורס", weak: "שיעורים שצריך לחזק", mistakes: "שאלות שטעיתם בהן", quick: "תרגול מהיר", untested: "שיעורים שעוד לא נבדקו" };
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
    if (!list.length) { toast("אין שאלות שמתאימות למה שבחרתם. נסו בחירה אחרת."); return; }
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
  // an exam is never submitted by the clock while the student is away (leaving pauses it): this only restores a saved run
  function checkExpiredRun() { restoreActive(); }

  // =============================================================== exams
  function examsPanel() {
    var rd = readiness();
    var html = hereLine("exams") + '<div class="panel stack"><p>במבחן לא רואים אם צדקתם עד הסוף. לפני שמתחילים בוחרים אם להפעיל שעון. בלי שעון זה בסדר גמור.</p><p>בסוף מקבלים ציון, ורואים את הטעויות ועל מה כדאי לחזור. שאלות פתוחות מופיעות רק בתרגול.</p>' +
      '<div class="exam-grid">' +
      '<button type="button" class="exam-card main" data-act="exam-full"><b>מבחן על כל הקורס</b><span>30 שאלות מכל הפרקים</span>' + (rd ? '<span class="rd">כמה אתם מוכנים: ' + MLABEL[rd.lv] + " (לפי " + rd.n + " תשובות שלכם)</span>" : "") + "</button>" +
      CH.map(function (c) {
        var n = Math.min(15, poolFor("ch:" + c.id, { auto: true }).length), last = lastExamOf(c.id), tr = arr((X(c.id) || {}).traps).length;
        return '<button type="button" class="exam-card" data-act="exam-ch" data-id="' + c.id + '"' + (n ? "" : " disabled") + '><b class="ec-h">' + chIcon(c) + "<span>פרק " + esc(c.letter) + ": " + esc(c.title) + "</span></b><span>" + plural(n, "שאלה אחת", "שאלות") + "</span>" +
          '<span class="ex-last">' + (last ? "ציון אחרון: " + last.score + ", בתאריך " + fmtDate(last.t) : "עוד לא נבחנתם") + (tr ? " · " + tr + " מלכודות במבחן" : "") + "</span></button>";
      }).join("") + "</div></div>";
    if (PLAN && arr(PLAN.exam_tips).length) html += '<details class="panel tips-d"><summary><b>טיפים לבחינה</b>' + I.chev + '</summary><ul class="tips-l">' + PLAN.exam_tips.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + '</ul><span class="tag-expl">הסבר משלים</span></details>';
    html += '<div class="section-head"><h2>המבחנים שעשיתם</h2></div>';
    html += S.exams.length ? '<div class="tbl-scroll panel"><table class="hist"><thead><tr><th scope="col">תאריך</th><th scope="col">מבחן</th><th scope="col">ציון</th><th scope="col">משך</th></tr></thead><tbody>' +
      S.exams.slice(0, 20).map(function (e) { return "<tr><td>" + fmtDate(e.t) + "</td><td>" + esc(e.title) + '</td><td class="num">' + e.score + '</td><td class="num">' + plural(Math.max(1, Math.round(e.dur / 60)), "דקה אחת", "דקות") + "</td></tr>"; }).join("") + "</tbody></table></div>"
      : '<p class="muted">עוד לא עשיתם מבחן. מבחן שתסיימו יופיע כאן.</p>';
    return html;
  }
  // minutes: null = no time limit (the default: senior P0-4, WCAG 2.2.1)
  function startExam(title, list, minutes, meta) {
    startRun("exam", title, list, lastFree === "#run" ? "#exams" : lastFree, Object.assign({ limit: minutes ? minutes * 60 : null, pausedMs: 0, pausedAt: null }, meta));
  }
  function startChapterExam(ec, minutes) {
    var ql = spread(poolFor("ch:" + ec, { auto: true }), 15);
    startExam("מבחן פרק " + CHID[ec].letter + ": " + CHID[ec].title, ql, minutes, { kind: "chapter", chapter: ec });
  }
  function examMinutes(kind, ec) { return kind === "full" ? 45 : Math.ceil(Math.min(15, poolFor("ch:" + ec, { auto: true }).length) * 1.5); }
  // every exam starts here: the traps of the chapter (until dismissed) and "how much time", with no limit chosen by default
  function examStart(kind, ec) {
    var tr = kind === "chapter" && !S.seen.examIntro ? arr((X(ec) || {}).traps).slice(0, 4) : [];
    var m = examMinutes(kind, ec), on = SET.examTimer === "on";
    var opt = function (v, b, sm, chk) { return '<label class="tp"><input type="radio" name="exam-time" value="' + v + '"' + (chk ? " checked" : "") + "><span><b>" + b + "</b>" + (sm ? "<small>" + sm + "</small>" : "") + "</span></label>"; };
    openSheet({ title: kind === "full" ? "להתחיל את המבחן על כל הקורס?" : "להתחיל את מבחן פרק " + esc(CHID[ec].letter) + "?",
      body: "<p>ענו על כל השאלות. בסוף הקישו על ״להגיש את המבחן״. את הציון רואים רק בסוף.</p>" +
        '<fieldset class="time-pick"><legend>זמן למבחן</legend>' + opt(0, "בלי הגבלת זמן", "עונים בנחת. אין שעון.", !on) + opt(m, "כמו במבחן אמיתי: " + m + " דקות", "אפשר לעצור את השעון ולהוסיף זמן.", on) + opt(m * 2, "זמן כפול: " + m * 2 + " דקות", "", false) + "</fieldset>" +
        (tr.length ? "<p>לפני שמתחילים, שימו לב לדברים שקל להתבלבל בהם בפרק " + esc(CHID[ec].letter) + ': <span class="tag-expl">הסבר משלים</span></p>' + trapsHtml(tr) + '<label class="check"><input type="checkbox" id="intro-skip"> לא להציג את המלכודות שוב</label>' : ""),
      actions: [{ label: "להתחיל את המבחן", act: "exam-go", cls: "btn-primary", attrs: { "data-kind": kind, "data-id": ec || "" } }, { label: "ביטול", act: "dlg-close", cls: "btn-ghost" }] });
  }

  // =============================================================== cards (P1-5)
  function cardsPanel() {
    var due = dueCards().length, nw = pickNew(newLeftToday()).length;
    return '<div class="panel stack"><p>כל כרטיסייה חוזרת אליכם בדיוק כשמתחילים לשכוח אותה.</p><p>כרטיסיות של שיעור נכנסות לחזרה אחרי שקראתם ממנו קטע אחד לפחות. בכל יום נכנסות עד ' + NEW_PER_DAY + " כרטיסיות חדשות.</p>" +
      '<div class="btn-row"><a class="btn btn-primary" href="#review">להתחיל את החזרה של היום (' + (due + nw) + " כרטיסיות)</a></div>" +
      '<div class="muted">' + due + " כרטיסיות לחזרה, " + nw + " חדשות</div></div>" +
      '<div class="section-head"><h2>לפי פרק</h2></div><div class="bars panel">' + CH.map(function (c) {
        var cs = CARDS.filter(function (x) { return L[x.lesson] && L[x.lesson].ch === c; });
        var learned = cs.filter(function (x) { var st = S.cards[x.id]; return st && st.reps > 0; }).length;
        return '<div class="bar-row bar-cards"><a class="ch-a" href="#review-ch-' + c.id + '">' + chIcon(c) + "<span>פרק " + esc(c.letter) + ": " + esc(c.title) + "</span></a>" + tape(pct(cs.length ? learned / cs.length : 0), true) + '<span class="mono-n">' + learned + " מתוך " + cs.length + "</span></div>";
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
      title = "כרטיסיות לחזרה היום";
    }
    return { key: arg || "daily", lesson: lid, pool: pool, title: title, queue: queue.map(function (c) { return c.id; }), i: 0, flipped: false, total: queue.length, done: 0, again: 0, cram: false, back: lastFree };
  }
  function cramFrom(r, pool, n) {
    return Object.assign({}, r, { queue: shuffle(pool).slice(0, n || pool.length).map(function (c) { return c.id; }), i: 0, flipped: false, total: Math.min(pool.length, n || pool.length), done: 0, again: 0, cram: true, title: "מעבר חופשי על כרטיסיות" });
  }
  function viewReview(arg) {
    var key = arg || "daily";
    if (!rev || rev.key !== key) rev = buildReview(arg);
    var r = rev;
    if (!r.queue.length || r.i >= r.queue.length) { viewReviewDone(r); return; }
    var c = CARD[r.queue[r.i]], left = r.queue.length - r.i;
    var from = L[c.lesson] ? "שיעור " + L[c.lesson].code : "העשרה";
    var html = studyBar(r.title, left === 1 ? "נשארה כרטיסייה אחת" : "נשארו " + left + " כרטיסיות", "rev-exit", "") + '<div class="sb-tape">' + tape(pct(r.done / Math.max(1, r.done + left)), true) + "</div>" +
      '<div class="study-wrap">' + (canSpeak() ? '<div class="block-tools">' + speakBtn("flash", "הקראת הכרטיסייה") + "</div>" : "") + '<span class="eyebrow">' + (r.cram ? "מעבר חופשי: לא משנה מתי הכרטיסיות יחזרו" : (S.cards[c.id] ? "כרטיסייה לחזרה" : "כרטיסייה חדשה")) + "</span>" +
      '<div class="flash-stage">' + (SET.swipe ? '<span class="sw-lab sw-r" aria-hidden="true">זכרתי</span><span class="sw-lab sw-l" aria-hidden="true">לא זכרתי</span>' : "") +
      '<button type="button" class="flash' + (r.flipped ? " flipped" : "") + '" id="flash" data-act="flip" aria-pressed="' + r.flipped + '" aria-label="' + (r.flipped ? "תשובה: " + esc(c.back) : "להפוך את הכרטיסייה: " + esc(c.front)) + '"><span class="flash-in">' +
      '<span class="face front"><span class="kind"><span class="chip">' + esc(from) + "</span><span>" + (c.kind === "term" ? "מונח: מה זה?" : "שאלה") + '</span></span><span class="q">' + esc(c.front) + '</span><span class="hint">נסו לענות בלב. אחר כך הקישו על הכרטיסייה כדי לראות את התשובה.</span></span>' +
      '<span class="face back"><span class="kind"><span class="chip">' + esc(from) + '</span><span>תשובה</span></span><span class="a"><span class="qsmall">' + esc(c.front) + "</span>" + esc(c.back) + "</span></span>" +
      "</span></button></div>" + (c.src && c.src.length ? '<div class="flash-src"' + (r.flipped ? "" : " hidden") + ">מקור: " + srcChips(c.src) + "</div>" : c.expl ? '<div class="flash-src"' + (r.flipped ? "" : " hidden") + '><span class="tag-expl">הסבר משלים</span></div>' : "") + "</div>" +
      '<div class="actionbar" id="ab">' + revBar(r, c) + "</div>";
    paint(html);
    if (SET.swipe) bindSwipe();
    var ck = r.key + ":" + r.i + ":" + r.queue.length;
    if (ck !== lastCK && booted) { lastCK = ck; focusEl(document.getElementById("flash")); }
  }
  var lastCK = "";
  function revBar(r, c) {
    var st = S.cards[c.id];
    if (!r.flipped) return '<button type="button" class="btn btn-primary ab-wide" data-act="flip">להציג את התשובה</button><p class="keys-hint">במקלדת: מקש <span class="kbd">רווח</span> מציג את התשובה.</p>';
    function rb(g, cls, label, cram) { return '<button type="button" class="btn' + (cls ? " " + cls : "") + '" data-act="rate" data-r="' + g + '">' + label + "<small>" + (r.cram ? cram : ivlLabel(st, g)) + "</small></button>"; }
    return '<div class="rate-w"><p class="rate-h" id="rate-h">כמה טוב זכרתם?</p><div class="rate' + (SET.simple ? " two" : "") + '" role="group" aria-labelledby="rate-h">' +
      rb("again", "again", "לא זכרתי", "תופיע שוב") + (SET.simple ? "" : rb("hard", "", "זכרתי בקושי", "לכרטיסייה הבאה")) +
      rb("good", "btn-primary", "זכרתי", "לכרטיסייה הבאה") + (SET.simple ? "" : rb("easy", "easy", "זכרתי בקלות", "לכרטיסייה הבאה")) + "</div></div>" +
      '<p class="keys-hint">' + (SET.swipe ? "אפשר גם להחליק את הכרטיסייה: ימינה אם זכרתם, שמאלה אם לא. " : "") + 'במקלדת: מקשים <span class="kbd">1</span> עד <span class="kbd">' + (SET.simple ? 2 : 4) + "</span>.</p>";
  }
  function forecast() {
    var t0 = startOfToday(), a = 0, b = 0, c = 0;
    Object.keys(S.cards).forEach(function (id) {
      var st = S.cards[id], d = st && st.due; if (!d || !CARD[id]) return;
      if (d < t0 + 2 * DAY) a++;
      if (d < t0 + 4 * DAY) b++;
      if (d < t0 + 8 * DAY) c++;
    });
    return "כרטיסיות שיחזרו מחר: " + a + ". בעוד 3 ימים: " + b + ". השבוע: " + c + ".";
  }
  function viewReviewDone(r) {
    var html = studyBar(r.title, "", "rev-exit", "") + '<div class="study-wrap"><div class="empty">' + I.level;
    if (r.total === 0) {
      html += "<b>אין עכשיו כרטיסיות לחזרה</b>";
      if (r.pool && r.pool.length) html += '<p>הכרטיסיות האלה יחזרו בימים הבאים. אפשר לעבור עליהן עכשיו, וזה לא ישנה מתי הן יחזרו.</p><div class="btn-row"><button type="button" class="btn btn-primary" data-act="cram">לעבור עליהן עכשיו</button><a class="btn" href="' + esc(r.back || "#cards") + '">לחזור לדף הקודם</a></div>';
      else html += '<p>כרטיסיות נכנסות לחזרה אחרי שקוראים קטע בשיעור. פתחו שיעור כדי להתחיל.</p><div class="btn-row"><a class="btn btn-primary" href="#course">לרשימת השיעורים</a><a class="btn" href="#home">לדף הבית</a></div>';
    } else {
      if (!r.cram && !r.logged) { r.logged = true; act("cards:" + r.key); save(); }
      html += "<b>סיימתם " + plural(r.done, "כרטיסייה אחת", "כרטיסיות") + "</b><p>" + (r.again ? plural(r.again, "אחת חזרה", "חזרו") + " לסבב נוסף. " : "") + "הן יחזרו אליכם בדיוק כשמתחילים לשכוח אותן.</p>" +
        (r.cram ? "" : '<p class="forecast">' + forecast() + "</p>") +
        '<div class="btn-row"><a class="btn btn-primary" href="#home">לחזור לדף הבית</a><a class="btn" href="#practice">לענות על שאלות</a></div>';
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
    // undo (senior P1-3, R13): everything the rating changes is kept for 10 seconds
    var snap = { card: S.cards[id] ? JSON.parse(JSON.stringify(S.cards[id])) : null, newDay: JSON.parse(JSON.stringify(S.newDay)), day: dayKey(), days: S.days[dayKey()],
      r: { queue: r.queue.slice(), i: r.i, done: r.done, again: r.again } };
    if (!r.cram) {
      var wasNew = !S.cards[id];
      S.cards[id] = nextState(S.cards[id], grade);
      if (wasNew) { if (S.newDay.d !== dayKey()) S.newDay = { d: dayKey(), n: 0 }; S.newDay.n++; }
    }
    touchDay();
    if (grade === "good" || grade === "easy") haptic();
    if (grade === "again") { r.again++; r.queue.splice(Math.min(r.queue.length, r.i + 4), 0, id); } else r.done++;
    r.i++; r.flipped = false;
    save();
    var word = { again: "לא זכרתי", hard: "זכרתי בקושי", good: "זכרתי", easy: "זכרתי בקלות" }[grade];
    toast("דירגתם: " + word + ".", "", { action: "ביטול הדירוג", undo: function () {
      if (rev !== r) return;
      if (!r.cram) { if (snap.card) S.cards[id] = snap.card; else delete S.cards[id]; S.newDay = snap.newDay; }
      if (snap.days === undefined) delete S.days[snap.day]; else S.days[snap.day] = snap.days;
      r.queue = snap.r.queue; r.i = snap.r.i; r.done = snap.r.done; r.again = snap.r.again; r.flipped = true;
      save(); updateBadge(); if (route().indexOf("review") === 0) viewReview(r.key === "daily" ? "" : r.key);
      announce("הדירוג בוטל");
    } });
    viewReview(r.key === "daily" ? "" : r.key); updateBadge();
    var f = document.getElementById("flash");
    if (f) anim(f, [{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: EASE });
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
  // focus screens: a worded exit at the top right, the title, "שאלה i מתוך n" (P0-7, P1-10)
  function studyBar(title, sub, exitAct, extra) {
    return '<div class="studybar"><button type="button" class="btn btn-sm btn-ghost sb-x" data-act="' + exitAct + '">' + I.x + "<span>יציאה</span></button>" +
      '<div class="sb-t"><h1 class="sb-h">' + esc(title) + "</h1>" + (sub ? "<span>" + sub + "</span>" : "") + "</div>" + (extra || "") + "</div>";
  }
  // exam clock (P0-4): elapsed time leaves out every pause; leaving the exam pauses it; it is a button with words
  function elapsed(r) { return Math.max(0, ((r.pausedAt || Date.now()) - r.t0 - (r.pausedMs || 0)) / 1000); }
  function timeLeft(r) { return r.limit ? r.limit - elapsed(r) : Infinity; }
  function pauseClock(auto) { if (run && run.mode === "exam" && !run.finished && !run.pausedAt) { run.pausedAt = Date.now(); run.autoPaused = !!auto; } }
  function resumeClock() { if (run && run.pausedAt) { run.pausedMs = (run.pausedMs || 0) + (Date.now() - run.pausedAt); run.pausedAt = null; run.autoPaused = false; } }
  function clockText() {
    if (!run.limit) return "";
    var left = timeLeft(run);
    if (left <= 0) return "הזמן שקבעתם נגמר";
    if (run.hideClock) return "שעון מוסתר";
    var t = left > 120 ? "נשארו " + plural(Math.ceil(left / 60), "דקה אחת", "דקות") : "נשארו " + fmtDur(left);
    return run.pausedAt && !run.autoPaused ? "השעון עצור · " + t : t;
  }
  function clockBtn() { return run.limit ? '<button type="button" class="btn btn-sm timer' + (timeLeft(run) < 120 ? " low" : "") + '" id="timer" data-act="clock" aria-haspopup="dialog">' + clockText() + "</button>" : ""; }
  var QHOW = {
    mcq: "הקישו על התשובה הנכונה.", tf: "הקישו על ״נכון״ או על ״לא נכון״.", open: "כתבו תשובה במילים שלכם, או רק חשבו עליה. אחר כך הקישו על ״להציג תשובה לדוגמה״.",
    match: "הקישו על מונח, ואז על ההגדרה שמתאימה לו. כדי לבטל זוג, הקישו שוב על המונח.", cloze: "הקישו על מילה מהרשימה. היא תיכנס למקום הריק הבא. כדי להוציא מילה, הקישו עליה.",
    compare: "קראו את שני הדברים, והקישו על התשובה שמתארת נכון את ההבדל.", scenario: "קראו מה קורה באתר, והקישו על התשובה הנכונה.",
    order: "הקישו על השלבים לפי הסדר: קודם על הראשון, אחר כך על השני, וכן הלאה. כדי לבטל שלב, הקישו עליו שוב.", identify: "מצאו את המספר בשרטוט, והקישו על השם הנכון שלו."
  };
  function matchPicker() { return !!(PICKMQ && PICKMQ.matches) || SET.simple; }
  function isOpts(q) { return q && (q.type === "mcq" || q.type === "compare" || q.type === "scenario" || q.type === "identify" || q.type === "tf"); }
  function viewRun() {
    if (!run) restoreActive();
    if (!run) { go("#practice"); return; }
    if (run.finished) { viewResult(); return; }
    if (run.mode === "case" && run.intro) { viewCaseIntro(); return; }
    var it = run.items[run.i], q = it.id ? Q[it.id] : null;
    var exam = run.mode === "exam", n = run.items.length;
    if (exam && run.pausedAt && run.autoPaused) { resumeClock(); persistRun(); }
    var sub = (run.mode === "case" ? "שלב " : "שאלה ") + (run.i + 1) + " מתוך " + n;
    var html = studyBar(run.title, sub, "run-exit", exam ? clockBtn() : "") + '<div class="sb-tape">' + tape(pct((run.i + (it.done && !exam ? 1 : 0)) / n), true) + "</div>";
    html += '<div class="study-wrap">';
    // the first screen of a run says in one line what to do (copy deck §3.1)
    if (run.i === 0 && !it.done && run.mode !== "case") html += hereLine(run.kind === "check" ? "run-check" : "run-" + run.mode);
    if (run.mode === "case") html += (run.i === 0 && !it.done ? hereLine("case") : "") + caseStepHtml();
    if (q) {
      var l = L[q.lesson];
      var from = run.mode === "pretest" ? "פרק " + CHID[run.chapter].letter + " · לא נכנס לציון" : run.mode === "case" ? "שאלה בשלב " + (run.i + 1) + (l ? " · " + l.code + " " + l.title : "") : l ? "שיעור " + l.code + " · " + l.title : "שיעור העשרה: " + (LIBID[q.lesson] ? LIBID[q.lesson].title : "");
      html += '<div class="q-card" id="qcard"><div class="from"><span>' + esc(from) + '</span><span class="qtype">' + TYPE_NAME[q.type] + (SET.simple ? "" : " · " + ["", "קל", "בינוני", "קשה"][q.difficulty || 2]) + (q.enrich ? " · העשרה" : "") + "</span></div>" +
        (canSpeak() ? '<div class="block-tools">' + speakBtn("qcard", "הקראת השאלה") + "</div>" : "") + renderQuestion(q, it, exam) + "</div>";
      if (exam) html += '<div class="q-tools btn-row">' + (SET.simple ? "" : '<button type="button" class="btn btn-sm btn-ghost' + (it.flag ? " on" : "") + '" data-act="q-flag" aria-pressed="' + !!it.flag + '">' + I.flag + (it.flag ? "סימנתם לחזור לשאלה הזו" : "לסמן לחזור לשאלה הזו") + "</button>") +
        '<button type="button" class="btn btn-sm btn-ghost" data-act="q-map" aria-haspopup="dialog">' + I.grid + "לראות את כל השאלות</button></div>";
      if (isOpts(q) && !(it.done && !exam)) html += '<p class="keys-hint">במקלדת: מקשים <span class="kbd">1</span> עד <span class="kbd">' + it.perm.length + "</span> לבחירת תשובה, ומקש <span class=\"kbd\">Enter</span> כדי להמשיך.</p>";
    }
    html += '<div id="tbanner">' + (exam ? timeBanner() : "") + "</div></div>";
    html += '<div class="actionbar" id="ab">' + runBar(it, q) + "</div>";
    paint(html);
    if (run.just && !exam) {
      var pn = main.querySelector(".explain");
      if (pn) anim(pn, [{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay: 60, easing: EASE, fill: "backwards" });
    }
    run.just = null;
    if (exam) startTimer();
    var qk = run.t0 + ":" + run.mode + ":" + run.i, newQ = qk !== lastQK; lastQK = qk;
    if (it.done && !exam) { var nb = document.getElementById("next-q"); if (nb) nb.focus({ preventScroll: true }); }
    // a new question / step: focus its text so a screen reader reads it and Tab continues to the answers
    else if (newQ && booted) focusEl(main.querySelector(run.mode === "case" ? ".case-step h2" : ".q-card .qq") || main.querySelector(".q-card .qq"));
  }
  var lastQK = "";
  // why a check button is not ready yet (P1-9): printed right under it
  function notReady(it, q) {
    if (!q) return "";
    if (q.type === "match") { var m = q.pairs.length - Object.keys(it.map).length; return m ? (m === 1 ? "נשאר מונח אחד בלי הגדרה" : "נשארו " + m + " מונחים בלי הגדרה") : ""; }
    if (q.type === "cloze") { var c = it.fill.filter(function (x) { return x === null; }).length; return c ? (c === 1 ? "נשאר מקום ריק אחד" : "נשארו " + c + " מקומות ריקים") : ""; }
    if (q.type === "order") { var o = q.steps.length - it.picked.length; return o ? (o === 1 ? "נשאר שלב אחד לסדר" : "נשארו " + o + " שלבים לסדר") : ""; }
    return it.choice === undefined || it.choice === null ? "קודם בחרו תשובה" : "";
  }
  function runBar(it, q) {
    var last = run.i === run.items.length - 1;
    if (run.mode === "exam") return (run.i ? '<button type="button" class="btn btn-ghost" data-act="q-prev">' + I.arrowR + "לשאלה הקודמת</button>" : "") +
      (last ? '<button type="button" class="btn btn-primary" data-act="exam-submit">להגיש את המבחן</button>' : '<button type="button" class="btn btn-primary" data-act="q-next">לשאלה הבאה' + I.arrowL + "</button>");
    if (!q || it.done) {
      var lab = run.mode === "case" ? (last ? "לסיכום הסיפור" : "לשלב הבא בסיפור") : (last ? "לסיכום התרגול" : "לשאלה הבאה");
      return '<button type="button" class="btn btn-primary ab-wide" data-act="q-next" id="next-q">' + lab + I.arrowL + "</button>";
    }
    if (q.type === "open") return '<span class="ab-hint">' + (it.shown ? "בחרו למעלה: ידעתי, ידעתי חלק, או לא ידעתי" : "אפשר לכתוב תשובה, או רק לחשוב עליה. אחר כך הקישו על ״להציג תשובה לדוגמה״") + "</span>";
    // P1-1: every type is "choose, then check"; a tap is never a final answer
    var why = notReady(it, q);
    return '<div class="ab-col"><button type="button" class="btn btn-primary ab-wide" data-act="q-check"' + (why ? ' disabled aria-describedby="ab-why"' : "") + ">לבדוק את התשובה</button>" + (why ? '<span class="why-off" id="ab-why">' + why + "</span>" : "") + "</div>";
  }
  function timeBanner() {
    if (!run.limit || run.hideClock) return "";
    var left = timeLeft(run);
    return left > 0 && left <= 120 ? '<div class="banner time-banner" role="status"><div class="rs-t"><b>נשארו פחות מ-2 דקות</b></div><button type="button" class="btn btn-sm" data-act="clock-add">להוסיף 10 דקות</button></div>' : "";
  }
  var timerInt = null;
  function startTimer() {
    clearInterval(timerInt);
    if (!run || !run.limit) return;
    timerInt = setInterval(function () {
      if (!run || run.mode !== "exam" || run.finished || !run.limit) { clearInterval(timerInt); return; }
      if (route() !== "run" || run.pausedAt) return;
      var left = timeLeft(run);
      var t = document.getElementById("timer");
      if (t) { t.textContent = clockText(); t.classList.toggle("low", left < 120); }
      var tb = document.getElementById("tbanner"); if (tb && !run.w2 && left <= 120) { run.w2 = 1; tb.innerHTML = timeBanner(); }
      if (left <= 300 && !run.w5 && run.limit > 300) { run.w5 = 1; announce("נשארו 5 דקות למבחן"); }
      if (left <= 60 && !run.w1) { run.w1 = 1; announce("נשארה דקה אחת למבחן"); }
      if (left <= 0) {
        // never a silent submit: the clock stops at zero and the student chooses (P0-4)
        clearInterval(timerInt);
        run.pausedAt = run.t0 + (run.pausedMs || 0) + run.limit * 1000; run.autoPaused = false; persistRun();
        if (t) t.textContent = clockText();
        timeUpSheet();
      }
    }, 1000);
  }
  function unansweredN() { return run.items.filter(function (x) { return !answeredExam(x); }).length; }
  function matchSheet(it, q, ti) {
    openSheet({ title: "איזו הגדרה מתאימה ל״" + esc(q.pairs[ti][0]) + "״?", cls: "m-sheet", focus: ".m-sheet .pick.sel, .m-sheet .pick",
      opener: main.querySelector('[data-act="m-term"][data-i="' + ti + '"]'),
      body: '<div class="pick-list">' + it.defs.map(function (di) {
        var owner = Object.keys(it.map).filter(function (k) { return it.map[k] === di; })[0], other = owner !== undefined && +owner !== ti;
        return '<button type="button" class="pick m-item def' + (other ? " paired" : "") + (it.map[ti] === di ? " sel" : "") + '" data-act="m-def" data-i="' + di + '">' + esc(q.pairs[di][1]) +
          (other ? '<span class="m-used">כבר נבחרה ל״' + esc(q.pairs[owner][0]) + "״. בחירה כאן תחליף ביניהן.</span>" : it.map[ti] === di ? '<span class="m-used">ההגדרה שבחרתם עכשיו</span>' : "") + "</button>";
      }).join("") + "</div>" });
  }
  function timeUpSheet() {
    var un = unansweredN();
    openSheet({ title: "הזמן שקבעתם נגמר", body: "<p>אפשר להגיש עכשיו, או להוסיף עוד 10 דקות.</p>" + (un ? "<p>" + (un === 1 ? "יש שאלה אחת בלי תשובה." : "יש " + un + " שאלות בלי תשובה.") + " שאלה בלי תשובה נספרת כטעות.</p>" : ""),
      actions: [{ label: "להגיש עכשיו", act: "exam-submit-force", cls: "btn-primary" }, { label: "להוסיף 10 דקות", act: "clock-add" }] });
  }
  function clockSheet() {
    if (!run || !run.limit) return;
    var p = !!run.pausedAt && timeLeft(run) > 0;
    var lf = timeLeft(run);
    openSheet({ title: "השעון", body: "<p><b>" + (lf > 0 ? "נשארו " + (lf > 120 ? plural(Math.ceil(lf / 60), "דקה אחת", "דקות") : fmtDur(lf)) : "הזמן שקבעתם נגמר") + "</b>" + (p ? " · השעון עצור" : "") + "</p><p>אפשר לעצור את השעון, להוסיף זמן כמה פעמים שרוצים, או להסתיר אותו.</p>",
      actions: [{ label: p ? "להמשיך את השעון" : "לעצור את השעון", act: p ? "clock-go" : "clock-stop" }, { label: "להוסיף 10 דקות", act: "clock-add" }, { label: run.hideClock ? "להציג את השעון" : "להסתיר את השעון", act: "clock-hide" }] });
  }
  function runExit() {
    if (!run) { go(lastFree); return; }
    if (run.finished) { var b0 = run.back; run = null; go(b0); return; }
    if (run.mode === "exam") {
      // P1-9: leaving never submits; the clock stops while the student is away
      openSheet({ title: "לצאת מהמבחן?", body: "<p>" + (run.limit ? "השעון נעצר. " : "") + "אפשר לחזור למבחן מדף הבית ולהמשיך מאותה שאלה.</p>",
        actions: [{ label: "לצאת ולהמשיך אחר כך", act: "run-leave", cls: "btn-primary" }, { label: "לא, להישאר במבחן", act: "dlg-close" }] });
      return;
    }
    if (run.mode === "case") { saveCase(); var b1 = run.back; run = null; go(b1); toast("שמרנו את המקום שלכם בסיפור. אפשר להמשיך מדף הבית."); return; }
    if (run.items.some(function (it) { return it.done; })) {
      openSheet({ title: run.mode === "pretest" ? "לצאת מהבדיקה?" : "לצאת מהתרגול?", body: "<p>" + (run.mode === "pretest" ? "אפשר להמשיך מאותה שאלה, מדף הבית." : "התשובות שכבר עניתם נשמרו.") + "</p>",
        actions: [{ label: "לא, להמשיך לענות", act: "dlg-close", cls: "btn-primary" }, { label: "כן, לצאת", act: run.mode === "pretest" ? "run-leave" : "run-quit" }] });
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
  // P0-5: a mark is always an icon and a word (never colour alone)
  function fbMark(ok, part) { return '<span class="fb-mark ' + (ok ? "ok" : part ? "part" : "bad") + '">' + (ok ? I.check : part ? I.half : I.x) + "<span>" + (ok ? "נכון" : part ? "חלקית" : "לא נכון") + "</span></span>"; }
  // how many parts of a multi-part answer were right (match pairs, cloze blanks, order steps)
  function partCount(q, it) {
    if (q.type === "match") return [q.pairs.filter(function (_, i) { return it.map[i] === i; }).length, q.pairs.length];
    if (q.type === "cloze") { var m = clozeMarks(q, it); return [m.filter(Boolean).length, m.length]; }
    if (q.type === "order") return [it.picked.filter(function (si, i) { return si === i; }).length, q.steps.length];
    return null;
  }
  // P1-4: distinct right / wrong / partial panels, no duplicated verdict, "למה?" paragraph, then what to do now
  function feedback(q, it, correctLine) {
    var ok = it.score === 1, part = !ok && it.score > 0, pc = part ? partCount(q, it) : null;
    var ex = cleanExplain(q.explain), last = run && run.i === run.items.length - 1;
    var next = run && run.mode === "case" ? "הקישו על ״" + (last ? "לסיכום הסיפור" : "לשלב הבא בסיפור") + "״ כדי להמשיך." : last ? "הקישו על ״לסיכום התרגול״ כדי לראות איך הלך." : "הקישו על ״לשאלה הבאה״ כדי להמשיך.";
    var how = !ok && q.type === "order" ? "השלבים שבמקום הלא נכון מסומנים. ליד כל אחד כתוב מה צריך להיות שם." : !ok && q.type === "match" ? "הזוגות הלא נכונים מסומנים. ההתאמות הנכונות כתובות למטה." : "";
    return '<div class="explain ' + (ok ? "ok" : part ? "part" : "bad") + '" role="status"><p class="fb-h">' + (ok ? I.check + "<b>תשובה נכונה</b>" : part ? I.half + "<b>נכון בחלקו" + (pc ? ": " + pc[0] + " מתוך " + pc[1] + " נכונים" : "") + "</b>" : I.x + "<b>תשובה לא נכונה</b>") + "</p>" +
      (how ? "<p>" + how + "</p>" : "") + (!ok && correctLine ? '<p class="corr">' + esc(correctLine) + "</p>" : "") + (ex ? '<p class="why"><b>הסבר:</b> ' + esc(ex) + "</p>" : "") +
      (q.src ? '<div class="blk-meta">מקור: ' + srcChips(q.src) + "</div>" : q.enrich ? '<div class="blk-meta">שאלת העשרה, לא מחומר הקורס</div>' : "") +
      (run && run.mode !== "exam" ? '<p class="fb-next">' + next + "</p>" : "") + "</div>";
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
    if (run.pausedAt && run.limit && timeLeft(run) <= 0) { /* time ran out: the duration is the whole limit */ }
    run.finished = true; run.dur = elapsed(run);
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
    var verdict = sc >= 85 ? "מצוין! אתם יודעים את החומר היטב." : sc >= 65 ? "טוב. עברו על ההסברים של השאלות שטעיתם בהן." : "כדאי לחזק את החומר. חזרו לשיעור שמופיע למטה, ואז נסו שוב.";
    var html = studyBar(exam ? "תוצאות המבחן" : "סיכום התרגול", esc(run.title), "run-exit") + '<div class="study-wrap">';
    html += '<section class="score-card"><div class="score-row"><span class="score-big">' + (exam ? "ציון " + sc : sc + " אחוז") + "</span>" + (exam && sc >= 85 ? stamp("עברתם בהצלחה", "exam:" + run.t0) : "") + "</div>" + tape(sc, false, "res-" + run.t0) +
      '<p class="verdict">' + verdict + '</p><p class="muted">' + plural(n - wrong.length, "תשובה נכונה אחת", "תשובות נכונות") + " מתוך " + n + ". משך: " + (run.dur < 60 ? "פחות מדקה" : run.dur < 90 ? "דקה אחת" : Math.round(run.dur / 60) + " דקות") + "</p></section>";
    // next step: one primary action
    var next = '<section class="next-card"><h2>מה עושים עכשיו?</h2><div class="btn-col">';
    if (exam) {
      var weakest = Object.keys(byLesson).filter(function (k) { return L[k]; }).sort(function (a, b) { return avg(byLesson[a]) - avg(byLesson[b]); })[0];
      next += weakest && avg(byLesson[weakest]) < 1 ? '<a class="btn btn-primary" href="#lesson-' + weakest + '">ללמוד שוב את שיעור ' + esc(L[weakest].code + " " + L[weakest].title) + I.arrowL + "</a>" : '<a class="btn btn-primary" href="#exams">לעשות מבחן נוסף' + I.arrowL + "</a>";
      if (wrong.length) next += '<button type="button" class="btn" data-act="goto-mis">לראות את הטעויות (' + plural(wrong.length, "שאלה אחת", "שאלות") + ")</button>";
    } else {
      next += '<button type="button" class="btn btn-primary" data-act="run-again">לענות על עוד 10 שאלות' + I.arrowL + "</button>";
      if (wrong.length) next += '<button type="button" class="btn" data-act="retry-wrong">לתרגל שוב את ' + plural(wrong.length, "הטעות", "הטעויות") + "</button>";
    }
    next += '<a class="btn btn-ghost" href="' + esc(run.back) + '">לחזור לדף הקודם</a></div></section>';
    html += next;
    if (n >= 10 && (Object.keys(byLesson).length > 1 || Object.keys(byType).length > 1)) {
      html += '<details class="panel breakdown"><summary><b>איך הלך בכל שיעור ובכל סוג שאלה</b>' + I.chev + "</summary>" +
        '<div class="bars">' + Object.keys(byLesson).map(function (k) { var p = pct(avg(byLesson[k])); return '<div class="bar-row"><a href="' + lessonHref(k) + '">' + esc(lessonTitle(k)) + "</a>" + tape(p, true) + '<span class="mono-n">' + p + " אחוז</span></div>"; }).join("") + "</div>" +
        '<div class="bars">' + Object.keys(byType).map(function (k) { var p = pct(avg(byType[k])); return '<div class="bar-row"><span>' + TYPE_NAME[k] + "</span>" + tape(p, true) + '<span class="mono-n">' + p + " אחוז</span></div>"; }).join("") + "</div></details>";
    }
    html += mistakesList(wrong);
    var before = JSON.stringify(S.celebrated);
    paint(html + "</div>");
    if (JSON.stringify(S.celebrated) !== before) save();
  }
  function mistakesList(wrong) {
    if (!wrong.length) return "";
    return '<section id="mis"><div class="section-head"><h2>השאלות שטעיתם בהן</h2></div><div class="result-list">' + wrong.map(function (it) {
      var q = Q[it.id]; if (!q) return "";
      var ya = yourAnswer(q, it);
      return '<details class="result-item"><summary><span class="qtype">' + TYPE_NAME[q.type] + (q.lesson ? " · " + esc(lessonTitle(q.lesson)) : "") + '</span><span class="qq">' + esc(q.q || stripTags(q.text || "").replace(/\{\{([^}]+)\}\}/g, "___")) + "</span></summary>" +
        (ya ? '<span class="ans-bad">' + I.x + "<b>התשובה שלכם:</b> " + esc(ya) + "</span>" : "") + '<span class="ans-ok">' + I.check + esc(rightAnswer(q)).replace(/^(התשובה הנכונה:|הסדר הנכון:|תשובה לדוגמה:)/, "<b>$1</b>") + '</span><span class="ex-t">' + esc(cleanExplain(q.explain)) + "</span>" + (q.src ? '<div class="blk-meta">' + srcChips(q.src) + "</div>" : "") + "</details>";
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
        "<p>" + plural(run.k, "תשובה נכונה אחת", "תשובות נכונות") + " מתוך " + n + ". " + lessonCards(l.id).length + " כרטיסיות נכנסו לחזרה של כל יום.</p>" +
        '<div class="btn-col">' + (nx ? '<a class="btn btn-primary" href="#lesson-' + nx.id + '">לשיעור הבא: ' + esc(nx.code + " " + nx.title) + I.arrowL + "</a>" : '<a class="btn btn-primary" href="#chapter-' + l.ch.id + '">לדף הפרק' + I.arrowL + "</a>") +
        '<a class="btn" href="#lesson-' + l.id + '">לחזור לשיעור</a>' + (wrong.length ? '<button type="button" class="btn btn-ghost" data-act="retry-wrong">לתרגל שוב את השאלות שטעיתם בהן</button>' : "") + "</div></section>";
    } else {
      var ids = []; wrong.forEach(function (it) { arr(Q[it.id].src).forEach(function (s) { if (ids.indexOf(s) === -1) ids.push(s); }); });
      var secs = sectionsFor(l, ids);
      html += '<section class="score-card"><h1 class="res-h">כמעט הצלחתם</h1><p>' + plural(run.k, "תשובה נכונה אחת", "תשובות נכונות") + " מתוך " + n + ". כדאי לקרוא שוב את:</p>" +
        '<ul class="sec-links">' + (secs.length ? secs.map(function (s) { return '<li><a href="#lesson-' + l.id + '" data-act="goto-level" data-lesson="' + l.id + '" data-lv="' + s.lv + '" data-target="' + s.anchor + '">' + esc(s.n + " " + s.title) + "</a></li>"; }).join("") : '<li><a href="#lesson-' + l.id + '">' + esc(l.code + " " + l.title) + "</a></li>") + "</ul>" +
        '<div class="btn-col"><button type="button" class="btn btn-primary" data-act="start-check" data-id="' + l.id + '">לנסות שוב את הבדיקה</button><a class="btn" href="#lesson-' + l.id + '">לחזור לשיעור</a>' +
        '<button type="button" class="linkish" data-act="mark-done" data-id="' + l.id + '">לסמן שסיימתם, בכל זאת</button></div></section>';
    }
    if (chNow) html += chDoneCard(l.ch);   // P2-3: inline, not a sheet that opens by itself
    html += mistakesList(wrong);
    paint(html + "</div>");
    save();
  }

  // =============================================================== pretest (§8.1.5)
  function startPretest(ch, phase, noNav) {
    var qs = PRETEST[ch] || []; if (!qs.length) return;
    run = { mode: "pretest", phase: phase, chapter: ch, title: (phase === "post" ? "בדיקה בסוף פרק " : "בדיקה לפני פרק ") + CHID[ch].letter, back: "#chapter-" + ch, route: "#pretest-" + ch, i: 0, t0: Date.now(), items: qs.map(newItem) };
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
    var html = studyBar(run.title, "לא נכנס לציון", "run-exit") + '<div class="study-wrap"><section class="score-card"><span class="score-big">' + k + " מתוך " + n + "</span>" +
      (run.phase === "pre" ? "<p>זו נקודת ההתחלה שלכם. בסוף הפרק תוכלו לבדוק שוב ולראות כמה התקדמתם.</p>" : prePostBars(p)) +
      '<div class="btn-col"><a class="btn btn-primary" href="#chapter-' + run.chapter + '">' + (run.phase === "pre" ? "להתחיל את שיעורי הפרק" : "לדף הפרק") + I.arrowL + "</a></div></section>" +
      mistakesList(run.items.filter(function (it) { return it.score !== 1; }));
    paint(html + "</div>");
  }

  // =============================================================== field cases (§8.2)
  function caseCard(c) {
    var st = S.cases[c.id], m = media(c.id), ch0 = CHID[arr(c.chapters)[0]];
    var state = !st ? ["new", "עוד לא התחלתם"] : st.done ? ["done", "הושלם, ציון " + (st.score || 0)] : ["open", "שלב " + Math.min(c.steps.length, (st.step || 0) + 1) + " מתוך " + c.steps.length];
    return '<a class="case-card" href="#' + esc(c.id) + '"><span class="cover' + (m ? "" : " thin") + '">' + swatchBg(ch0 ? ch0.material : "general") + (m ? imgHtml(m, { card: true, small: true, sizes: "320px" }) + '<span class="ai-badge" aria-hidden="true">AI</span>' : "") + "</span>" +
      '<span class="cc-b"><b>' + esc(c.title) + "</b><small>בערך " + (c.est || 15) + " דקות, " + c.steps.length + ' שלבים</small><span class="chips">' +
      arr(c.chapters).filter(function (x) { return CHID[x]; }).map(function (x) { return '<span class="chip">פרק ' + CHID[x].letter + "</span>"; }).join("") +
      '<span class="chip st-' + state[0] + '">' + state[1] + "</span></span></span></a>";
  }
  function casesPanel() {
    return '<p class="muted">כל סיפור קורה באתר בנייה מומצא, ומחבר כמה שיעורים. הסיפור בדוי, אבל כל עובדה בו לקוחה משקפי הקורס.</p><div class="case-grid">' + CASES.map(caseCard).join("") + "</div>";
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
    var html = studyBar(c.title, "בערך " + (c.est || 15) + " דקות, " + c.steps.length + " שלבים", "run-exit") + '<div class="study-wrap case-intro">' +
      (m ? aiFig(m, { cls: "lh-hero", eager: true }) : "") + '<span class="pill-story">סיפור לתרגול: הפרויקט מומצא, העובדות מהקורס</span><h1 class="display">' + esc(c.title) + "</h1>" +
      '<div class="chips">' + arr(c.lessons).filter(function (x) { return L[x]; }).map(function (x) { return '<a class="chip kw" href="#lesson-' + x + '">' + esc(L[x].code + " " + L[x].title) + "</a>"; }).join("") + "</div>" +
      (canSpeak() ? '<div class="block-tools">' + speakBtn("story") + "</div>" : "") + '<div class="prose story" id="story">' + (c.story || "") + "</div></div>" +
      '<div class="actionbar"><button type="button" class="btn btn-primary ab-wide" data-act="case-start">להתחיל את הסיפור' + I.arrowL + "</button></div>";
    paint(html);
  }
  function caseStepHtml() {
    var c = CASEID[run.caseId], s = c.steps[run.i] || {}, n = c.steps.length, l = L[s.lesson];
    return '<section class="case-step"><div class="cs-ticks" aria-hidden="true">' + c.steps.map(function (_, i) { return '<i class="' + (i < run.i ? "on" : i === run.i ? "now" : "") + '"></i>'; }).join("") + "</div>" +
      "<h2>שלב " + (run.i + 1) + " מתוך " + n + '</h2><div class="prose">' + (s.html || "") + "</div>" + (arr(s.src).length ? '<div class="blk-meta">מקור: ' + srcChips(s.src) + "</div>" : "") +
      (l ? '<a class="back-lesson" href="#lesson-' + l.id + '">' + I.arrowR + "לקרוא את השיעור: " + esc(l.code + " " + l.title) + "</a>" : "") + "</section>";
  }
  function viewCaseDone() {
    var c = CASEID[run.caseId], qn = run.items.filter(function (it) { return it.id; }), k = qn.filter(function (it) { return it.score === 1; }).length;
    var html = studyBar(c.title, "סיכום הסיפור", "run-exit") + '<div class="study-wrap"><section class="score-card"><span class="score-big">' + (run.scorePct || 0) + " אחוז</span>" + tape(run.scorePct || 0, false, "case-" + c.id) +
      '<p class="muted">' + k + " מתוך " + qn.length + " שלבים עניתם נכון</p></section>" +
      '<section class="debrief"><h2>מה למדנו מהסיפור</h2><div class="prose">' + (c.debrief || "") + '</div><span class="tag-expl">הסבר משלים</span></section>' +
      '<section><h2 class="h-sm">השיעורים שבסיפור</h2><ol class="lesson-list">' + arr(c.lessons).filter(function (x) { return L[x]; }).map(function (x) { return lessonRow(L[x]); }).join("") + "</ol></section>" +
      '<div class="btn-col"><a class="btn btn-primary" href="#cases">לחזור לכל הסיפורים</a><button type="button" class="btn btn-ghost" data-act="case-restart">לעבור על הסיפור שוב</button></div>' +
      mistakesList(run.items.filter(function (it) { return it.id && it.score !== 1 && it.score !== null && !it.restored; }));
    paint(html + "</div>");
  }
  function renderQuestion(q, it, exam) {
    var show = !exam && it.done;
    var h = "";
    if (q.type === "identify") h += '<figure class="dg dg-q"><div class="dg-box" data-act="dg-zoom">' + window.Diagrams.render(q.diagram, { marker: q.marker }) + '</div><figcaption><span class="illus">המחשה לימודית, לא פרט לביצוע</span><button type="button" class="dg-zoom" data-act="dg-zoom" aria-label="להגדיל את השרטוט">' + I.expand + '<span>להגדיל</span></button></figcaption></figure>';
    if (q.type === "cloze") {
      var n = 0, marks = show ? clozeMarks(q, it) : [];
      var ans = clozeAnswers(q), anyO = q.anyOrder === true ? ans.map(function (_, i) { return i; }) : [].concat.apply([], arr(q.anyOrder).filter(Array.isArray));
      h += '<div class="qq cloze-text" id="qq">' + esc(q.text).replace(/\{\{[^}]+\}\}/g, function () {
        var k = n++, w = it.fill[k], cls = "blank" + (w ? " filled" : "");
        if (show) cls += marks[k] ? " right" : " wrong";
        var nm = w ? "מקום " + (k + 1) + ": " + w + (show ? (marks[k] ? ", נכון" : ", לא נכון") : ", הקישו כדי להוציא את המילה") : "מקום ריק " + (k + 1);
        return '<button type="button" class="' + cls + '" data-act="cloze-clear" data-k="' + k + '" aria-label="' + esc(nm) + '"' + (show ? " disabled" : "") + ">" + (show ? '<span class="fb-ico" aria-hidden="true">' + (marks[k] ? I.check : I.x) + "</span>" : "") + (w ? esc(w) : "&nbsp;") + "</button>";
      }) + "</div>";
      if (!show) h += '<p class="q-how">' + QHOW.cloze + '</p><div class="pool">' + it.bank.map(function (w, i) { var used = it.fill.indexOf(w) !== -1 && countIn(it.fill, w) >= countIn(it.bank.slice(0, i + 1), w); return used ? "" : '<button data-act="cloze-pick" data-i="' + i + '">' + esc(w) + "</button>"; }).join("") + "</div>";
      else {
        var fix = marks.map(function (ok, k) { return ok || anyO.indexOf(k) !== -1 ? "" : "<li>במקום " + (k + 1) + " צריך להיות: <b>" + esc(ans[k]) + "</b></li>"; }).join("");
        if (fix) h += '<ul class="cloze-fix">' + fix + "</ul>";
        h += feedback(q, it, "התשובות הנכונות: " + ans.join(" · "));
      }
      return h;
    }
    h += '<div class="qq" id="qq">' + esc(q.q) + "</div>";
    if (isOpts(q)) {
      var opts = q.type === "tf" ? ["נכון", "לא נכון"] : q.options;
      var right = q.type === "tf" ? (q.answer ? 0 : 1) : q.answer;
      if (!show) h += '<p class="q-how">' + QHOW[q.type] + "</p>";
      h += '<div class="opts' + (q.type === "tf" ? " tf" : "") + '" role="group" aria-label="התשובות לבחירה">';
      it.perm.forEach(function (oi, k) {
        var cls = "opt", mine = it.choice === k, pills = "";
        if (show) {
          cls += oi === right ? " right" : mine ? " wrong" : " dim";
          if (oi === right) pills += '<span class="fb-pill ok">התשובה הנכונה</span>';
          if (mine) pills += '<span class="fb-pill' + (oi === right ? "" : " bad") + '">הבחירה שלכם</span>';
        } else if (mine) cls += " picked";
        h += '<button type="button" class="' + cls + '" data-act="answer" data-k="' + k + '"' + (show ? " disabled" : "") + ' aria-pressed="' + mine + '"><span class="l">' + (show && oi === right ? I.check : show && mine ? I.x : LETTERS[k]) + '</span><span class="ot">' + esc(opts[oi]) + "</span>" +
          (show ? (pills ? '<span class="pills">' + pills + "</span>" : "") : mine ? '<span class="pk"><span aria-hidden="true">' + I.check + '</span><span class="pk-w">נבחרה</span></span>' : "") + "</button>";
      });
      h += "</div>";
      if (exam && answeredExam(it)) h += '<p class="saved-note">התשובה נשמרה. אפשר לשנות אותה עד שמגישים.</p>';
      if (show) h += feedback(q, it, q.type === "tf" ? "התשובה הנכונה: " + (q.answer ? "נכון" : "לא נכון") : "התשובה הנכונה: " + q.options[q.answer]);
      return h;
    }
    if (q.type === "match" && matchPicker()) {
      // P1-2 phones and simple mode: one row per term, the definition is chosen in a sheet (no scrolling between them)
      if (!show) h += '<p class="q-how">לכל מונח, הקישו על ״לבחור הגדרה״ ובחרו את ההגדרה שמתאימה לו.</p>';
      h += '<div class="m-rows">' + q.pairs.map(function (p, i) {
        var d = it.map[i], cls = "m-item m-row term" + (d !== undefined ? " paired" : "");
        if (show) cls += d === i ? " right" : " wrong";
        return '<button type="button" class="' + cls + '" data-act="m-term" data-i="' + i + '"' + (show ? " disabled" : "") + ' aria-haspopup="dialog">' + esc(p[0]) +
          (d !== undefined ? '<span class="m-chosen">' + esc(q.pairs[d][1]) + "</span>" : "") +
          (show ? fbMark(d === i) + (d !== i ? '<span class="m-fix">הנכון: ' + esc(p[1]) + "</span>" : "") : '<span class="m-pick">' + (d !== undefined ? "לשנות" : "לבחור הגדרה") + " ▾</span>") + "</button>";
      }).join("") + "</div>";
      if (show) h += feedback(q, it, q.pairs.map(function (p) { return p[0] + ": " + p[1]; }).join(" · "));
      return h;
    }
    if (q.type === "match") {
      h += '<p class="q-how">' + QHOW.match + '</p><div class="match"><div class="m-col"><span class="m-hd" aria-hidden="true">מונחים</span>' + q.pairs.map(function (p, i) {
        var d = it.map[i], cls = "m-item term" + (it.sel === i ? " sel" : "") + (d !== undefined ? " paired" : "");
        if (show) cls += d === i ? " right" : " wrong";
        return '<button type="button" class="' + cls + '" data-act="m-term" data-i="' + i + '" aria-pressed="' + (it.sel === i) + '"' + (show ? " disabled" : "") + ">" + (d !== undefined ? '<i class="pair-n" aria-hidden="true">' + (i + 1) + "</i>" : "") + esc(p[0]) + (d !== undefined ? '<span class="sr-only">, בזוג מספר ' + (i + 1) + "</span>" : "") +
          (show ? fbMark(d === i) + (d !== i ? '<span class="m-fix">הנכון: ' + esc(p[1]) + "</span>" : "") : "") + "</button>";
      }).join("") + "</div>";
      h += '<div class="m-col"><span class="m-hd" aria-hidden="true">הגדרות</span>' + it.defs.map(function (di) {
        var owner = Object.keys(it.map).filter(function (k) { return it.map[k] === di; })[0];
        var cls = "m-item def" + (owner !== undefined ? " paired" : "");
        return '<button type="button" class="' + cls + '" data-act="m-def" data-i="' + di + '"' + (show ? " disabled" : "") + ">" + (owner !== undefined ? '<i class="pair-n" aria-hidden="true">' + (+owner + 1) + "</i>" : "") + esc(q.pairs[di][1]) + (owner !== undefined ? '<span class="sr-only">, בזוג מספר ' + (+owner + 1) + "</span>" : "") + "</button>";
      }).join("") + "</div></div>";
      if (it.msg) h += '<p class="inline-msg" role="alert">' + esc(it.msg) + "</p>";
      if (show) h += feedback(q, it, q.pairs.map(function (p) { return p[0] + ": " + p[1]; }).join(" · "));
      return h;
    }
    if (q.type === "order") {
      h += (show ? "" : '<p class="q-how">' + QHOW.order + "</p>") + '<ol class="slot-list">';
      q.steps.forEach(function (s, i) {
        var pi = it.picked[i], cls = "slot", body = "", mk = "";
        if (pi !== undefined) { cls += " filled"; if (show) { cls += pi === i ? " right" : " wrong"; mk = fbMark(pi === i); } body = esc(q.steps[pi]) + (show && pi !== i ? '<span class="fix">כאן צריך להיות: ' + esc(q.steps[i]) + "</span>" : ""); }
        h += '<li class="' + cls + '"' + (pi !== undefined && !show ? ' data-act="o-unpick" data-pos="' + i + '" role="button" tabindex="0"' : "") + '><span class="n">' + (i + 1) + "</span><span>" + mk + body + "</span></li>";
      });
      h += "</ol>";
      if (!show) h += '<div class="pool">' + it.pool.filter(function (si) { return it.picked.indexOf(si) === -1; }).map(function (si) { return '<button data-act="o-pick" data-si="' + si + '">' + esc(q.steps[si]) + "</button>"; }).join("") + "</div>";
      else h += feedback(q, it, "");
      return h;
    }
    if (q.type === "open") {
      h += '<label class="open-l" for="open-a">התשובה שלכם (לא חובה לכתוב)</label><textarea class="input area" id="open-a" rows="4"' + (it.shown ? " readonly" : "") + ">" + esc(it.text) + "</textarea>";
      if (it.msg) h += '<p class="inline-msg" role="alert">' + esc(it.msg) + "</p>";
      if (!it.shown) {
        h += '<div class="btn-row"><button class="btn btn-primary" data-act="open-show">להציג תשובה לדוגמה</button>' + (ai.s ? '<button class="btn" data-act="open-ai">לבקש מעוזר הלימוד לבדוק</button>' : "") + "</div>";
      } else {
        h += '<div class="explain"><b>תשובה לדוגמה</b><span>' + esc(q.model) + "</span>" +
          ((q.points || []).length ? '<b>מה צריך להופיע בתשובה</b><ul class="pts">' + q.points.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + "</ul>" : "") +
          (q.explain ? "<span>" + esc(q.explain) + "</span>" : "") + (q.src ? '<div class="blk-meta">מקור: ' + srcChips(q.src) + "</div>" : "") + "</div>";
        if (!it.done) h += '<div class="self"><span>השוו לתשובה לדוגמה. איך עניתם?</span><div class="btn-row"><button class="btn again-t" data-act="open-grade" data-s="0">לא ידעתי</button><button class="btn" data-act="open-grade" data-s="0.5">ידעתי חלק</button><button class="btn btn-primary" data-act="open-grade" data-s="1">ידעתי</button></div></div>';
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
    if (q.options) return it.choice == null ? "לא עניתם על השאלה" : q.options[it.perm[it.choice]];
    if (q.type === "cloze") return it.fill.map(function (x) { return x || "—"; }).join(" · ");
    if (q.type === "open") return it.text;
    return "";
  }
  function rightAnswer(q) {
    if (q.type === "tf") return "התשובה הנכונה: " + (q.answer ? "נכון" : "לא נכון");
    if (q.options) return "התשובה הנכונה: " + q.options[q.answer];
    if (q.type === "cloze") return "התשובה הנכונה: " + clozeAnswers(q).join(" · ");
    if (q.type === "match") return "התשובה הנכונה: " + q.pairs.map(function (p) { return p[0] + ": " + p[1]; }).join(" · ");
    if (q.type === "order") return "הסדר הנכון: " + q.steps.map(function (s, i) { return (i + 1) + ". " + s; }).join(", ");
    if (q.type === "open") return "תשובה לדוגמה: " + q.model;
    return "";
  }
  // =============================================================== glossary
  var gl = { q: "", ch: "all", open: {} };
  function viewGlossary() {
    var chips = [["all", "כל המונחים"]].concat(CH.map(function (c) { return ["ch:" + c.id, "פרק " + c.letter]; })).concat([["enrich", "מונחי העשרה"]]);
    if (SET.simple) gl.ch = "all";
    paint('<div class="page-head"><h1 class="display">חומרי עזר</h1>' + hereLine("glossary") + "</div>" + refTabs("glossary") + '<p class="eyebrow">' + TERMS.filter(function (t) { return !t.enrich; }).length + " מונחים מהקורס · " + TERMS.filter(function (t) { return t.enrich; }).length + ' מונחי העשרה</p>' +
      '<div class="search-row"><label class="field-l" for="g-search">חיפוש מילה</label><div class="search-in"><input class="input" id="g-search" type="search" placeholder="למשל: קורה סמויה" value="' + esc(gl.q) + '" autocomplete="off">' +
      '<button type="button" class="btn btn-sm btn-ghost" data-act="g-clear"' + (gl.q ? "" : " hidden") + ">לנקות</button></div></div>" +
      (SET.simple ? "" : '<div class="seg seg-wrap" role="group" aria-label="להציג מונחים מפרק אחד">' + chips.map(function (c) { return '<button data-act="g-ch" data-v="' + c[0] + '" aria-pressed="' + (gl.ch === c[0]) + '">' + esc(c[1]) + "</button>"; }).join("") + "</div>") +
      '<p class="sr-only" id="g-status" aria-live="polite"></p><div id="g-out" class="g-out"></div>');
    renderGlossary();
    var inp = document.getElementById("g-search");
    inp.addEventListener("input", function () { gl.q = inp.value; var cb = main.querySelector('[data-act="g-clear"]'); if (cb) cb.hidden = !gl.q; renderGlossary(); });
  }
  // ranking: exact term, term starts with the query, term contains it, English term, then definitions; ties alphabetical
  function glRank(t, q) {
    if (!q) return 0;
    var he = t.he.toLowerCase(), en = (t.en || "").toLowerCase();
    return he === q ? 0 : he.indexOf(q) === 0 ? 1 : he.indexOf(q) !== -1 ? 2 : en.indexOf(q) !== -1 ? 3 : 4;
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
    }).sort(function (a, b) { var k = function (t) { return t.he.replace(/^[^\u05d0-\u05eaA-Za-z0-9]+/, ""); }; return (glRank(a, q) - glRank(b, q)) || k(a).localeCompare(k(b), "he"); });
    liveCount("g-status", list.length ? "נמצאו " + list.length + " מונחים" : "לא נמצאו מונחים");
    out.innerHTML = list.length ? '<div class="gl-list">' + list.map(function (t) {
      var l = L[t.lesson];
      var open = gl.open[t.id];
      return '<article class="gl-item' + (t.enrich ? " enrich" : "") + '"><div class="gl-head"><span class="t">' + hl(t.he, gl.q.trim()) + "</span>" + (t.en ? '<span class="en" dir="ltr">' + hl(t.en, gl.q.trim()) + "</span>" : "") + "</div>" +
        '<span class="d">' + hl(t.def, gl.q.trim()) + "</span>" +
        (t.simple ? '<span class="simple"><b>בפשטות:</b> ' + esc(t.simple) + ' <span class="tag-expl">הסבר משלים</span></span>' : "") +
        ((t.related || []).length ? '<button class="linkish" data-act="g-open" data-id="' + t.id + '" aria-expanded="' + !!open + '">להציג מונחים דומים ומה ההבדל (' + t.related.length + ")</button>" +
          (open ? '<ul class="rel">' + t.related.map(function (r) { return "<li><b>" + esc(r.he) + ":</b> " + esc(r.diff) + "</li>"; }).join("") + '</ul><span class="tag-expl">הסבר משלים</span>' : "") : "") +
        '<div class="gl-meta">' + (l ? '<a href="#lesson-' + l.id + '">' + esc(l.code + " " + l.title) + "</a>" : t.lib ? '<a href="#lib-' + t.lesson + '">שיעור העשרה: ' + esc(LIBID[t.lesson].title) + "</a>" : "") + (t.src ? srcChips(t.src) : "") + (t.enrich ? '<span class="tag-expl">העשרה</span>' : "") + "</div></article>";
    }).join("") + "</div>" : '<p class="muted">לא נמצאו מונחים. נסו מילה אחרת, או <a href="#search">חפשו בכל החומר</a>.</p>';
    langParts();
  }

  // =============================================================== search
  var sq = "";
  function viewSearch() {
    paint('<div class="page-head"><h1 class="display">חיפוש בכל החומר</h1>' + hereLine("search") + "</div>" +
      '<div class="search-row"><label class="field-l" for="s-search">מה לחפש?</label><input class="input" id="s-search" type="search" placeholder="הקלידו מילה, למשל: כלונס" value="' + esc(sq) + '" autocomplete="off"></div>' +
      (ai.s ? '<form class="ai-ask panel" data-act="ai-search"><label for="ai-sq"><b>' + I.spark + ' לשאול את עוזר הלימוד</b></label><div class="row"><input class="input" id="ai-sq" placeholder="למשל: מתי משתמשים בקורה סמויה?" autocomplete="off"><button class="btn btn-primary btn-sm" type="submit">לשלוח את השאלה</button></div><div class="ai-out" id="ai-out" hidden aria-live="polite"></div></form>' : "") +
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
      out.innerHTML = '<p class="muted">הקלידו לפחות שתי אותיות כדי לחפש.</p>' +
        (recent.length ? '<div class="section-head"><h2>מה חיפשתם לאחרונה</h2></div><div class="chips">' + recent.map(function (r) { return '<button type="button" class="chip kw" data-act="s-try" data-q="' + esc(r) + '">' + esc(r) + "</button>"; }).join("") + "</div>" : "") +
        '<div class="section-head"><h2>דוגמאות לחיפוש</h2></div><div class="chips">' + sugg.map(function (t) { return '<button type="button" class="chip kw" data-act="s-try" data-q="' + esc(t.he) + '">' + esc(t.he) + "</button>"; }).join("") + "</div>";
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
    html += '<div class="section-head"><h2>בשקפי הקורס</h2><span class="count">' + srcs.length + "</span></div>" +
      (srcs.length ? '<div class="hits">' + srcs.slice(0, 30).map(function (x) { return '<a class="hit" href="#source-' + x.s.id + '"><span class="w">' + esc(srcLabel(x.s.id)) + " · " + esc(x.s.title || "") + "</span><span>" + hl(x.sn, q) + "</span></a>"; }).join("") + "</div>" : '<p class="muted">לא נמצא בשקפי הקורס.</p>');
    liveCount("s-status", hits.length + " תוצאות בשיעורים, " + terms.length + " מונחים, " + srcs.length + " בשקפי הקורס");
    out.innerHTML = html;
    langParts();
  }
  var liveT = null;
  function liveCount(id, msg) { clearTimeout(liveT); liveT = setTimeout(function () { var el = document.getElementById(id); if (el) el.textContent = msg; }, 700); }
  function recentSearches() { try { var a = JSON.parse(lsGet("melachot-recent", "[]")); return Array.isArray(a) ? a.slice(0, 5) : []; } catch (e) { return []; } }
  function rememberSearch(q) { q = String(q || "").trim(); if (q.length < 2) return; var a = recentSearches().filter(function (x) { return x !== q; }); a.unshift(q); lsSet("melachot-recent", JSON.stringify(a.slice(0, 5))); }
  // =============================================================== sources & coverage
  var STATUS = { full: ["נקרא במלואו", "ok"], partial: ["נקרא בחלקו", "part"], unclear: ["צריך לבדוק מה כתוב", "bad"] };
  function usedIn(id) {
    return LESSONS.filter(function (l) { return (l.sources || []).indexOf(id) !== -1; });
  }
  var srcFilter = "all";
  function viewSources() {
    var groups = Object.keys(META.groups || {});
    var counts = { full: 0, partial: 0, unclear: 0 }, unused = 0, dups = 0;
    SOURCES.forEach(function (s) { counts[s.status] = (counts[s.status] || 0) + 1; if (s.duplicate_of) dups++; else if (!usedIn(s.id).length && !s.no_content) unused++; });
    var list = SOURCES.filter(function (s) { return srcFilter === "all" || s.id.indexOf(srcFilter) === 0 || (srcFilter === "open" && (s.status !== "full" || (s.unclear || []).length)); });
    var html = '<div class="page-head"><h1 class="display">חומרי עזר</h1>' + hereLine("sources") + "</div>" + refTabs("sources") +
      '<p class="muted">' + SOURCES.length + " שקפים מהקורס. לכל שקף יש צילום, הטקסט שכתוב בו, ובאילו שיעורים הוא מופיע.</p>";
    // student-first: thumbnails per recording
    groups.forEach(function (g) {
      var gs = SOURCES.filter(function (s) { return s.id.indexOf(g + "-") === 0 && !s.duplicate_of; });
      if (!gs.length) return;
      html += '<section class="src-group"><div class="section-head"><h2>' + esc(META.groups[g].name) + '</h2><span class="count">' + gs.length + '</span></div><div class="thumbs">' +
        gs.map(function (s) { return '<a class="thumb-a" href="#source-' + s.id + '"><img loading="lazy" src="' + IMG_BASE + esc(s.id) + '-sm.jpg" data-full="' + IMG_BASE + esc(s.id) + '.jpg" alt="" data-act="imgfail"><span><b>' + esc(srcLabel(s.id)) + "</b>" + esc(s.title || "(ללא כותרת)") + "</span></a>"; }).join("") + "</div></section>";
    });
    html += '<details class="panel cov-d"' + (srcFilter !== "all" ? " open" : "") + '><summary><b>אילו שקפים נכנסו לשיעורים</b>' + I.chev + "</summary>" +
      '<div class="stats wide">' +
      '<div class="stat"><span class="k">נקראו במלואם</span><span class="v">' + counts.full + "</span></div>" +
      '<div class="stat"><span class="k">נקראו בחלקם</span><span class="v">' + counts.partial + "</span></div>" +
      '<div class="stat"><span class="k">צריך לבדוק מה כתוב</span><span class="v">' + counts.unclear + "</span></div>" +
      '<div class="stat"><span class="k">צילומים כפולים של אותו שקף</span><span class="v">' + dups + '</span><span class="k">' + unused + " לא נכנסו לשום שיעור</span></div></div>" +
      '<div class="seg seg-scroll" role="group" aria-label="אילו שקפים להציג">' + [["all", "הכול"]].concat(groups.map(function (g) { return [g, META.groups[g].short || META.groups[g].name]; })).concat([["open", "רק שקפים שצריך לבדוק"]]).map(function (f) {
        return '<button type="button" data-act="src-filter" data-v="' + f[0] + '" aria-pressed="' + (srcFilter === f[0]) + '">' + esc(f[1]) + "</button>";
      }).join("") + "</div>" +
      '<div class="tbl-scroll"><table class="cov"><thead><tr><th scope="col">שקף</th><th scope="col">כותרת</th><th scope="col">מצב</th><th scope="col">מקומות לא ברורים</th><th scope="col">מופיע בשיעורים</th></tr></thead><tbody>' +
      list.map(function (s) {
        var st = STATUS[s.status] || ["?", "bad"], used = usedIn(s.id);
        return '<tr><th scope="row"><a href="#source-' + s.id + '">' + esc(srcLabel(s.id)) + "</a></th><td>" + esc(s.title || "(ללא כותרת)") + (s.duplicate_of ? '<small class="muted"> · צילום נוסף של ' + esc(srcLabel(s.duplicate_of)) + "</small>" : "") + '</td><td><span class="st st-' + st[1] + '">' + st[0] + '</span></td><td class="num">' + (s.unclear || []).length + "</td><td>" +
          (used.length ? used.map(function (l) { return '<a href="#lesson-' + l.id + '">' + esc(l.code) + "</a>"; }).join(" ") : s.duplicate_of ? '<span class="muted">דרך ' + esc(srcLabel(s.duplicate_of)) + "</span>" : s.no_content ? '<span class="muted">' + esc(s.no_content) + "</span>" : '<span class="st st-bad">לא נכנס לשיעור</span>') + "</td></tr>";
      }).join("") + "</tbody></table></div></details>";
    paint(html);
  }
  function viewSource(s) {
    var i = SOURCES.indexOf(s), prev = SOURCES[i - 1], next = SOURCES[i + 1];
    var st = STATUS[s.status] || ["?", "bad"], used = usedIn(s.id);
    var html = '<nav class="crumbs" aria-label="מיקום"><a href="#home">דף הבית</a><span aria-hidden="true">›</span><a href="#sources">שקפי הקורס</a><span aria-hidden="true">›</span><span>' + esc(srcLabel(s.id)) + "</span></nav>" +
      '<div class="page-head"><span class="eyebrow">' + esc(((META.groups || {})[s.id.split("-")[0]] || {}).name || "") + ' · <span class="st st-' + st[1] + '">' + st[0] + "</span></span><h1>" + esc(s.title || "(ללא כותרת)") + "</h1></div>" +
      '<div class="src-view"><figure class="src-full"><span class="src-lbl">שקף מהקורס</span><button type="button" class="zoom" data-act="zoom" aria-label="להגדיל את התמונה"><img src="' + IMG_BASE + esc(s.id) + '.jpg" alt="' + esc(s.title || "צילום שקף מהקורס") + '" data-act="imgfail"><span class="zoom-w">' + I.expand + 'להגדיל</span></button><figcaption class="muted">הקישו על התמונה כדי להגדיל אותה.</figcaption></figure>' +
      '<div class="src-text"><h2>מה כתוב בשקף</h2>' + transcriptHtml(s) +
      ((s.unclear || []).length ? '<h2>מה לא ברור בשקף</h2><ul class="unclear-list">' + s.unclear.map(function (u) { return "<li><b>" + esc(u.where || "") + ":</b> " + esc(u.best_reading || "") + ((u.alternatives || []).length ? ' <span class="muted">(או: ' + esc(u.alternatives.join(" / ")) + ")</span>" : "") + "</li>"; }).join("") + "</ul>" : "") +
      (s.notes ? '<h2>הערות על הקריאה</h2><p class="muted">' + esc(s.notes) + "</p>" : "") +
      '<h2>מופיע בשיעורים</h2>' + (used.length ? '<ul class="plain">' + used.map(function (l) { return '<li><a href="#lesson-' + l.id + '">' + esc(l.code + " " + l.title) + "</a></li>"; }).join("") + "</ul>" : s.duplicate_of ? '<p class="muted">זהו צילום נוסף של <a href="#source-' + s.duplicate_of + '">' + esc(srcLabel(s.duplicate_of)) + "</a>.</p>" : '<p class="muted">' + esc(s.no_content || "השקף הזה לא נכנס לאף שיעור.") + "</p>") +
      "</div></div>" +
      '<nav class="pager" aria-label="שקפים סמוכים">' + (prev ? '<a class="btn btn-ghost" href="#source-' + prev.id + '">' + I.arrowR + '<span class="pg-in"><small>השקף הקודם</small><span>' + esc(srcLabel(prev.id)) + "</span></span></a>" : "") + (next ? '<a class="btn btn-ghost" href="#source-' + next.id + '"><span class="pg-in"><small>השקף הבא</small><span>' + esc(srcLabel(next.id)) + "</span></span>" + I.arrowL + "</a>" : "") + "</nav>";
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
    (s.figures || []).forEach(function (f) { h += '<p class="tr-fig"><b>איור או צילום:</b> ' + esc(f.description || "") + ((f.labels || []).length ? " · כיתובים: " + esc(f.labels.join(", ")) : "") + "</p>"; });
    if ((s.english_terms || []).length) h += '<p class="tr-en"><b>מונחים באנגלית:</b> <span dir="ltr">' + esc(s.english_terms.join(" · ")) + "</span></p>";
    if (s.footer) h += '<p class="muted">' + esc(s.footer) + "</p>";
    return h || '<p class="muted">אין טקסט בשקף הזה.</p>';
  }

  // =============================================================== progress (P0-1, P2-4)
  function viewProgress() {
    var c = completion(), rd = readiness(), sk = streak();
    if (SET.simple) {
      var lastEx = S.exams[0];
      paint('<div class="page-head"><h1 class="display">ההתקדמות שלכם</h1>' + hereLine("progress") + '</div><div class="panel simple-prog">' + tape(c.p, false, "prog-done") +
        "<p><b>" + c.d + " מתוך " + c.n + "</b> שיעורים הושלמו.</p><p><b>" + dueCards().length + "</b> כרטיסיות לחזרה היום.</p><p>" + (lastEx ? "מבחן אחרון: ציון <b>" + lastEx.score + "</b>." : "עוד לא עשיתם מבחן.") + "</p></div>" +
        '<div class="btn-row"><a class="btn" href="#review">לחזרה של היום</a><a class="btn btn-ghost" href="#home">לחזור לדף הבית</a></div>' + footHtml());
      return;
    }
    var chDone = CH.filter(function (x) { return x.lessons.every(function (l) { return S.done[l.id]; }); }).length;
    var learned = CARDS.filter(function (x) { return x.scope === "course" && S.cards[x.id] && S.cards[x.id].reps > 0; }).length;
    var courseCards = CARDS.filter(function (x) { return x.scope === "course"; }).length;
    var html = '<div class="page-head"><h1 class="display">ההתקדמות שלכם</h1>' + hereLine("progress") + '</div><div class="stats wide">' +
      '<div class="stat"><span class="k">שיעורים שסיימתם</span><span class="v">' + c.d + "<small> מתוך " + c.n + "</small></span>" + tape(c.p, false, "prog-done") + '<span class="k">' + chDone + " מתוך " + CH.length + " פרקים הושלמו</span></div>" +
      '<div class="stat"><span class="k">כמה אתם מוכנים למבחן</span>' + (rd ? '<span class="v v-l">' + MLABEL[rd.lv] + "</span>" + glyph(rd, true) + '<span class="k">לפי ' + rd.n + " תשובות שלכם</span>" : '<span class="v v-l">עוד לא ידוע</span><span class="k">יופיע אחרי שתענו על 40 שאלות, או אחרי מבחן אחד</span>') + "</div>" +
      '<div class="stat"><span class="k">ימי לימוד ברצף</span><span class="v">' + sk + "<small> " + (sk === 1 ? "יום" : "ימים") + "</small></span></div>" +
      '<div class="stat"><span class="k">כרטיסיות שעברתם</span><span class="v">' + learned + "<small> מתוך " + courseCards + "</small></span>" + tape(pct(learned / Math.max(1, courseCards)), true) + "</div></div>";
    html += heatmap();
    if (planOn()) html += '<div class="section-head"><h2>התוכנית</h2><a class="link-more" href="#plan">לכל התוכנית</a></div><div class="panel">' + planTicks(planDayNow()) + "</div>";
    html += '<div class="section-head"><h2>לפי פרקים</h2></div><div class="bars panel">' + CH.map(function (x) {
      var cp = completion(x.lessons);
      return '<div class="bar-row bar-ch"><a class="ch-a" href="#chapter-' + x.id + '">' + chIcon(x) + "<span>פרק " + esc(x.letter) + ": " + esc(x.title) + "</span></a>" + tape(cp.p, true) + '<span class="mono-n">' + cp.d + " מתוך " + cp.n + "</span>" + glyph(chapterM(x), true) + "</div>";
    }).join("") + "</div>";
    var all = LESSONS.map(function (l) { return { l: l, x: lessonM(l.id) }; });
    var strong = all.filter(function (o) { return o.x.lv >= 4 || (o.x.m !== null && o.x.m >= 0.85); });
    var weak = weakLessons(6);
    var untested = all.filter(function (o) { return o.x.m === null && (S.done[o.l.id] || lessonOpened(o.l.id)); });
    function li(o) { return '<li><a href="#lesson-' + o.l.id + '">' + esc(o.l.code + " " + o.l.title) + "</a>" + glyph(o.x) + "</li>"; }
    html += '<div class="section-head"><h2>רמת הידיעה בכל שיעור</h2></div><div class="two-col"><div class="panel"><h3 class="h-sm">שיעורים שאתם יודעים היטב</h3>' + (strong.length ? '<ul class="plain">' + strong.map(li).join("") + "</ul>" : '<p class="muted">יופיעו כאן אחרי שתענו על שאלות ותעברו על כרטיסיות.</p>') + "</div>" +
      '<div class="panel"><h3 class="h-sm">שיעורים שצריך לחזק</h3>' + (weak.length ? '<ul class="plain">' + weak.map(li).join("") + "</ul>" : '<p class="muted">אין כרגע שיעורים שצריך לחזק.</p>') + "</div></div>" +
      (untested.length ? '<p class="untested">שיעורים שעוד לא נבדקו: ' + plural(untested.length, "שיעור אחד", "שיעורים") + ' <button type="button" class="btn btn-sm" data-act="start-scope" data-scope="untested">לענות על 10 שאלות מהשיעורים האלה</button></p>' : "");
    var marks = Object.keys(S.bookmarks).map(function (k) { return S.bookmarks[k]; }).filter(function (b) { return L[b.lesson]; }).sort(function (a, b) { return b.t - a.t; });
    html += '<div class="section-head" id="bm"><h2>קטעים ששמרתם (' + marks.length + ")</h2></div>" + (marks.length ? '<ul class="plain panel">' + marks.map(function (b) {
      return '<li><a href="#lesson-' + b.lesson + '" data-act="goto-level" data-lesson="' + b.lesson + '" data-lv="' + b.anchor.split("-")[1] + '" data-target="' + esc(b.anchor) + '">' + esc(L[b.lesson].code + " · " + b.title) + '</a><span class="muted">' + fmtDate(b.t) + "</span></li>";
    }).join("") + "</ul>" : '<p class="muted panel">בשיעור, הקישו על הכוכב שליד קטע כדי לשמור אותו. הקטעים השמורים יופיעו כאן.</p>');
    var byType = {}, nAns = 0;
    Object.keys(S.qstats).forEach(function (id) { var s = S.qstats[id], q = Q[id]; if (!q) return; byType[q.type] = byType[q.type] || { r: 0, n: 0 }; byType[q.type].r += s.r; byType[q.type].n += s.r + s.w; nAns += s.r + s.w; });
    if (Object.keys(byType).length) {
      html += '<details class="panel breakdown"' + (nAns >= 20 ? " open" : "") + "><summary><b>תשובות נכונות לפי סוג שאלה</b>" + I.chev + '</summary><div class="bars">' + Object.keys(byType).map(function (t) {
        var p = pct(byType[t].r / Math.max(1, byType[t].n)); return '<div class="bar-row"><span>' + TYPE_NAME[t] + " (" + byType[t].n + " שאלות)</span>" + tape(p, true) + '<span class="mono-n">' + p + " אחוז</span></div>";
      }).join("") + "</div></details>";
    }
    html += '<div class="section-head"><h2>המבחנים שעשיתם</h2></div>' + (S.exams.length ? '<div class="tbl-scroll panel"><table class="hist"><thead><tr><th scope="col">תאריך</th><th scope="col">מבחן</th><th scope="col">ציון</th><th scope="col">שאלות</th><th scope="col">משך</th></tr></thead><tbody>' +
      S.exams.slice(0, 30).map(function (e) { return "<tr><td>" + fmtDate(e.t) + "</td><td>" + esc(e.title) + '</td><td class="num">' + e.score + '</td><td class="num">' + e.n + '</td><td class="num">' + plural(Math.max(1, Math.round(e.dur / 60)), "דקה אחת", "דקות") + "</td></tr>"; }).join("") + "</tbody></table></div>" : '<p class="muted panel">עוד לא עשיתם מבחן.</p>');
    html += footHtml();
    paint(html);
  }
  function heatmap() {
    var d = new Date(); d.setDate(d.getDate() - d.getDay() - 21);
    var cols = [], max = 1;
    for (var w = 0; w < 4; w++) { var col = []; for (var i = 0; i < 7; i++) { var k = dayKey(d), n = S.days[k] || 0; max = Math.max(max, n); col.push({ k: k, n: n, f: k > today() }); d.setDate(d.getDate() + 1); } cols.push(col); }
    var days = ["א", "ב", "ג", "ד", "ה", "ו", "ש"], h = '<div class="heat-w"><div class="heat" role="group" aria-label="באילו ימים למדתם, ב-4 השבועות האחרונים">';
    for (var r = 0; r < 7; r++) {
      h += '<span class="hd" aria-hidden="true">' + days[r] + "</span>";
      cols.forEach(function (col) { var x = col[r]; var lv = x.f ? "f" : !x.n ? "" : x.n > 20 ? "l3" : x.n > 6 ? "l2" : "l1"; h += '<i class="' + lv + '" role="img" aria-label="' + fmtDay(x.k) + ": " + x.n + ' פעולות לימוד"></i>'; });
    }
    return '<h2 class="h-sm heat-h">באילו ימים למדתם (4 שבועות אחרונים)</h2>' + h + '</div><div class="heat-leg" aria-hidden="true"><span>פחות לימוד</span><i></i><i class="l1"></i><i class="l2"></i><i class="l3"></i><span>יותר לימוד</span></div></div>';
  }

  // =============================================================== settings (P2-3)
  // settings (senior §3.1): reading comfort first; every choice is a worded button with aria-pressed; device-only
  function settingsSheet(part) {
    function fs(legend, body, id) { return '<fieldset class="set-g"' + (id ? ' id="' + id + '"' : "") + "><legend>" + legend + "</legend>" + body + "</fieldset>"; }
    function seg(k, label, opts, note) { return '<div class="field"><span class="lbl" id="set-' + k + '">' + label + "</span>" + segBtns(k, opts, "set-" + k) + (note ? '<span class="field-note">' + note + "</span>" : "") + "</div>"; }
    var last = SET.backupAt ? "גיבוי אחרון: לפני " + (Date.now() - SET.backupAt < DAY ? "פחות מיום" : plural(Math.floor((Date.now() - SET.backupAt) / DAY), "יום אחד", "ימים")) : "עוד לא נשמר גיבוי במכשיר הזה";
    openSheet({ title: "הגדרות", focus: part === "text" ? '#set-g-read [aria-pressed="true"]' : null, body: '<div class="setup">' + hereLine("settings") +
      fs("נוחות קריאה", '<div class="field"><span class="lbl" id="lbl-text">גודל האותיות</span>' + sizeButtons(false) + "</div>" + comfortPreview() +
        seg("contrast", "ניגודיות", [["normal", "רגילה"], ["high", "גבוהה"], ["auto", "לפי המכשיר"]]) +
        seg("simple", "תצוגה פשוטה", [["0", "כבויה"], ["1", "פעילה"]], "פחות כפתורים בכל מסך, צעד אחד בכל פעם.") + printBlock(PRINTS.guide), "set-g-read") +
      (canSpeak() ? fs("הקראה", seg("rate", "קצב הקראה", [["1", "רגיל"], ["0.85", "איטי"]])) : "") +
      fs("תרגול ומבחנים", seg("examTimer", "שעון במבחנים", [["off", "בלי שעון"], ["on", "עם שעון"]], "אפשר לבחור מחדש לפני כל מבחן.") +
        seg("swipe", "החלקה לדירוג כרטיסיות", [["0", "כבויה"], ["1", "פעילה"]], "כשהיא פעילה, החלקה ימינה או שמאלה על כרטיסייה מדרגת אותה.")) +
      fs("מראה", seg("theme", "צבעי המסך", [["auto", "לפי המכשיר"], ["light", "רקע בהיר"], ["dark", "רקע כהה"]]) + seg("motion", "תנועה במסך", [["auto", "לפי המכשיר"], ["reduce", "מעט תנועה"]])) +
      (cloud.on ? "" : fs("גיבוי ההתקדמות", '<p class="field-note">כדי להמשיך במכשיר אחר: שמרו קובץ גיבוי, ופתחו אותו במכשיר השני. מה שבקובץ יתווסף למה שכבר יש שם.</p><p class="field-note"><b>' + last + "</b></p>" +
        '<div class="btn-row"><button type="button" class="btn btn-sm" data-act="backup-save">לשמור קובץ גיבוי</button><button type="button" class="btn btn-sm" data-act="backup-load">לפתוח קובץ גיבוי</button></div>' +
        '<div id="backup-box"></div><input type="file" id="backup-file" accept="application/json,.json" hidden>')) +
      '<a class="btn btn-sm help-link" href="#help">' + I.help + "איך משתמשים באפליקציה</a>" +
      '<div class="set-reset"><p>' + saveStatusText() + '</p><button type="button" class="btn btn-ghost btn-danger" data-act="reset-ask">למחוק את כל ההתקדמות</button></div></div>' });
    checkPrints(document.querySelector(".dlg-wrap"));
  }
  var lastBackup = null;
  function backupBox(html) { var b = document.getElementById("backup-box"); if (b) { b.innerHTML = html; b.hidden = !html; } }
  // P1-17: after saving, the sheet says where the file is and how to move it; Web Share where the device can share files
  function backupSaved(name, file) {
    var share = !!(file && navigator.canShare && (function () { try { return navigator.canShare({ files: [file] }); } catch (e) { return false; } })());
    lastBackup = share ? file : null;
    backupBox('<div class="note-box" role="status"><p><b>הקובץ נשמר בתיקיית ההורדות בשם ' + esc(name) + ".</b></p><p>כדי להמשיך במכשיר אחר: שלחו את הקובץ לעצמכם (בוואטסאפ או במייל), פתחו את האפליקציה שם, ובהגדרות הקישו על ״לפתוח קובץ גיבוי״.</p>" +
      '<div class="btn-row">' + (share ? '<button type="button" class="btn btn-sm" data-act="backup-share">לשלוח את הגיבוי</button>' : "") + '<button type="button" class="btn btn-sm btn-ghost" data-act="backup-box-x">הבנתי, לסגור</button></div></div>');
  }
  // P1-18: how to use the app, in six short parts plus the content labels
  function viewHelp() {
    var sec = function (ic, h, t) { return '<section class="help-s"><h2>' + ic + h + "</h2><p>" + t + "</p></section>"; };
    paint('<div class="page-head"><h1 class="display">איך משתמשים באפליקציה</h1>' + hereLine("help") + "</div>" +
      sec(I.today, "מה עושים היום", "בדף הבית מחכה רשימה קצרה של משימות. הקישו על הכפתור הצהוב, והאפליקציה תיקח אתכם למשימה הבאה.") +
      sec(I.doc, "שלוש רמות בשיעור", "הבנה מהירה: הרעיון בכמה שורות. לימוד מלא: כל השיעור. עומק הנדסי: פרטים נוספים למי שרוצה. אפשר לעבור ביניהן בכל רגע.") +
      sec(I.practice, "איך עונים על שאלות", "הקישו על תשובה, ואז על ״לבדוק את התשובה״. אפשר לשנות את הבחירה לפני הבדיקה. אחרי הבדיקה כתוב מה נכון ולמה.") +
      sec(I.cards, "כרטיסיות: מה זה ואיך מדרגים", "בכל כרטיסייה יש שאלה קצרה. נסו לענות בלב, הפכו אותה, ואמרו כמה טוב זכרתם. כרטיסייה שזכרתם טוב תחזור בעוד כמה ימים. אם טעיתם בדירוג, הקישו על ״ביטול הדירוג״.") +
      sec(I.exam, "מבחן בלי לחץ זמן", "לפני כל מבחן בוחרים אם להפעיל שעון. בלי שעון זה בסדר גמור. גם עם שעון אפשר לעצור אותו ולהוסיף זמן, וכשיוצאים מהמבחן השעון נעצר.") +
      sec(I.gear, "איך מגדילים את האותיות", "הקישו על ״הגדרות״ בראש המסך. בחלק ״נוחות קריאה״ אפשר לבחור גודל אותיות, ניגודיות גבוהה ותצוגה פשוטה.") + printBlock(PRINTS.guide) +
      '<section class="help-s"><h2>' + I.help + "מה אומרים הסימונים</h2>" + legendList(true) + "</section>" +
      '<div class="btn-row"><button type="button" class="btn" data-act="settings">' + I.gear + 'לפתוח את ההגדרות</button><a class="btn btn-ghost" href="#home">לחזור לדף הבית</a></div>');
  }
  function moreCards() {
    if (dailyQueueSize()) { rev = null; go("#review"); return; }
    var pool = CARDS.filter(function (c) { return c.scope === "course" && S.cards[c.id]; });
    if (!pool.length) { toast("עוד אין כרטיסיות. קראו קטע בשיעור, והכרטיסיות שלו ייפתחו."); return; }
    rev = cramFrom(buildReview(""), pool, 10); rev.key = "daily";
    go("#review");
  }
  function startCheck(cl) {
    var pool = lessonQs(cl).filter(function (q) { return q.type === "tf" || q.type === "mcq" || q.type === "cloze"; });
    startRun("practice", "בדיקת הבנה: " + L[cl].title, spread(pool, 5), "#lesson-" + cl, { kind: "check", lesson: cl });
  }
  function mapSheet() {
    if (!run) return;
    openSheet({ title: "לאיזו שאלה לעבור?", cls: "map-sheet", focus: ".qmap .cur",
      body: '<div class="qmap">' + run.items.map(function (x, k) {
        var a = answeredExam(x);
        return '<button type="button" class="qm' + (a ? " ans" : "") + (k === run.i ? " cur" : "") + (x.flag ? " flag" : "") + '" data-act="q-jump" data-k="' + k + '" aria-label="שאלה ' + (k + 1) + (a ? ", עניתם" : ", עוד לא עניתם") + (x.flag ? ", סימנתם לחזור אליה" : "") + '">' + (k + 1) + "</button>";
      }).join("") + '</div><p class="qmap-leg"><span class="qml ans"></span>עניתם · <span class="qml"></span>עוד לא עניתם · <span class="qml flag"></span>סימנתם לחזור אליה</p>',
      actions: [{ label: "להגיש את המבחן", act: "exam-submit", cls: "btn-primary" }] });
  }

  // =============================================================== events
  var KEEP_SHEET = { set: 1, "vw-z": 1, "dlg-close": 1, "cs-memo": 1, "backup-save": 1, "backup-load": 1, "backup-share": 1, "backup-box-x": 1, speak: 1 };
  document.addEventListener("click", function (e) {
    var b = e.target.closest(".prose b.cloze");
    if (b) { b.classList.toggle("shown"); return; }
    var el = e.target.closest("[data-act]");
    if (!el) return;
    var act0 = el.getAttribute("data-act");
    var introSkip = !!(document.getElementById("intro-skip") || {}).checked;
    var examMin = +((document.querySelector('input[name="exam-time"]:checked') || {}).value || 0) || null;
    if (dlg && dlg.el.contains(el) && !KEEP_SHEET[act0]) closeSheet(true);
    var it = run && !run.finished ? run.items[run.i] : null;
    switch (act0) {
      case "skip": e.preventDefault(); main.focus(); break;
      case "dlg-close": closeSheet(); break;
      case "settings": settingsSheet(); break;
      case "set":
        var sk = el.getAttribute("data-k"), sv = el.getAttribute("data-v");
        SET = normSet(Object.assign({}, SET, (function () { var o = {}; o[sk] = sk === "simple" || sk === "swipe" ? sv === "1" : sk === "rate" ? +sv : sv; return o; })()));
        saveSettings();
        document.querySelectorAll('[data-act="set"][data-k="' + sk + '"]').forEach(function (x) { x.setAttribute("aria-pressed", String(x.getAttribute("data-v") === sv)); });
        // the page itself is the live preview (senior §3.1): draw it again at the new size / mode, the sheet stays open
        if (sk === "text" || sk === "simple") { setTopbarH(); var sy = window.scrollY; if (!run || route() !== "run") render(); window.scrollTo(0, sy); }
        break;
      case "comfort-ok": SET.comfortSeen = Date.now(); saveSettings(); render(); window.scrollTo(0, 0); break;
      case "comfort-skip":
        if (!hasActivity()) SET = normSet({ theme: SET.theme, motion: SET.motion, examTimer: SET.examTimer, swipe: SET.swipe, rate: SET.rate });
        SET.comfortSeen = Date.now(); saveSettings(); render(); window.scrollTo(0, 0); break;
      case "comfort-open": SET.comfortSeen = Date.now(); saveSettings(); render(); settingsSheet("text"); break;
      case "settings-text": settingsSheet("text"); break;
      case "backup-note-off": lsSet("melachot-backup-note", String(Date.now())); render(); break;
      case "toast-close": toastHide(); break;
      case "toast-undo": var uf = toastUndo; toastHide(); if (uf) uf(); break;
      case "speak":
        var stg = el.getAttribute("data-target"), sel = stg && document.getElementById(stg);
        if (stg === "qcard" && run && run.items[run.i]) {
          var sq0 = Q[run.items[run.i].id], sit = run.items[run.i], stxt = sq0 ? (sq0.q || stripTags(sq0.text || "").replace(/\{\{[^}]+\}\}/g, "מקום ריק")) : "";
          if (sq0 && isOpts(sq0)) stxt += ". " + sit.perm.map(function (oi, k) { return "תשובה " + LETTERS[k] + ": " + (sq0.type === "tf" ? ["נכון", "לא נכון"][oi] : sq0.options[oi]); }).join(". ");
          speak(el, sel, stxt);
        } else if (stg === "flash" && rev && CARD[rev.queue[rev.i]]) { var fc = CARD[rev.queue[rev.i]]; speak(el, sel, fc.front + (rev.flipped ? ". תשובה: " + fc.back : "")); }
        else speak(el, sel);
        break;
      case "clock": clockSheet(); break;
      case "clock-stop": pauseClock(false); persistRun(); viewRun(); announce("השעון עצור"); break;
      case "clock-go": resumeClock(); persistRun(); viewRun(); announce("השעון ממשיך"); break;
      case "clock-hide": if (run) { run.hideClock = !run.hideClock; persistRun(); viewRun(); } break;
      case "clock-add":
        if (run && run.limit && !run.finished) {
          var up = timeLeft(run) <= 0;
          run.limit += 600; run.w1 = run.w2 = run.w5 = 0;
          if (up) { resumeClock(); }
          persistRun(); viewRun(); toast("הוספנו 10 דקות. " + clockText() + ".");
        }
        break;
      case "reset-ask":
        openSheet({ title: "למחוק את כל ההתקדמות?", body: "<p>כל מה שלמדתם, התשובות והכרטיסיות יימחקו. אי אפשר להחזיר אותם.</p>", actions: [{ label: "לא, לא למחוק", act: "dlg-close", cls: "btn-primary" }, { label: "כן, למחוק הכול", act: "reset-do", cls: "btn-danger" }] });
        break;
      case "reset-do": S = blank(); run = null; rev = null; save(); obStep = 0; go("#home"); toast("כל ההתקדמות נמחקה"); break;
      case "backup-save":
        try {
          var bk = new Blob([JSON.stringify({ app: "melachot", v: 1, at: new Date().toISOString(), state: S })], { type: "application/json" });
          var ba = document.createElement("a");
          ba.href = URL.createObjectURL(bk); ba.download = "melachot-backup-" + new Date().toISOString().slice(0, 10) + ".json";
          document.body.appendChild(ba); ba.click();
          setTimeout(function () { URL.revokeObjectURL(ba.href); ba.remove(); }, 1000);
          SET.backupAt = Date.now(); saveSettings();
          var bfile = null; try { bfile = new File([bk], ba.download, { type: "application/json" }); } catch (err2) { bfile = null; }
          backupSaved(ba.download, bfile);
        } catch (err) { backupBox('<p class="inline-msg" role="alert">לא הצלחנו לשמור את קובץ הגיבוי. נסו שוב.</p>'); }
        break;
      case "backup-share": if (lastBackup && navigator.share) navigator.share({ files: [lastBackup], title: "גיבוי: מלאכות הבנייה" }).catch(function () { /* cancelled */ }); break;
      case "backup-box-x": backupBox(""); break;
      case "backup-load": var bf = document.getElementById("backup-file"); if (bf) bf.click(); break;
      case "flip": e.preventDefault(); flip(); break;
      case "rate": rate(el.getAttribute("data-r")); break;
      case "rev-exit": var rb = rev && rev.back; rev = null; go(rb && !FOCUS[rb.slice(1).split("-")[0]] ? rb : "#cards"); break;
      case "cram": if (rev && rev.pool) { rev = cramFrom(rev, rev.pool); viewReview(rev.key === "daily" ? "" : rev.key); } break;
      case "more-cards": e.preventDefault(); moreCards(); break;
      case "quick-practice": e.preventDefault(); startScope("quick", 10); break;
      case "start-scope": e.preventDefault(); startScope(el.getAttribute("data-scope"), el.getAttribute("data-scope") === "mistakes" ? 15 : 10); break;
      case "preset-ch":
        openSheet({ title: "על איזה פרק לתרגל?", body: '<div class="pick-list">' + CH.map(function (c) { return '<button type="button" class="pick pick-ch" data-act="start-scope" data-scope="ch:' + c.id + '">' + chIcon(c) + "<b>פרק " + esc(c.letter) + ": " + esc(c.title) + "</b><span>" + poolFor("ch:" + c.id).length + " שאלות</span></button>"; }).join("") + "</div>" });
        break;
      case "preset-type":
        openSheet({ title: "איזה סוג שאלות לתרגל?", body: '<div class="pick-list">' + Object.keys(TYPE_NAME).map(function (t) { var n = poolFor("t:" + t).length; return '<button type="button" class="pick" data-act="start-scope" data-scope="t:' + t + '"' + (n ? "" : " disabled") + "><b>" + TYPE_NAME[t] + "</b><span>" + n + " שאלות</span></button>"; }).join("") + "</div>" });
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
        el.innerHTML = I.eyeOff + (on ? "להציג את כל העובדות" : "להסתיר את העובדות");
        var mn0 = el.closest(".cs, .cheatsheet"), nt = mn0 && mn0.querySelector(".memo-note");
        if (nt) nt.hidden = !on; else if (on && mn0) { var np = document.createElement("p"); np.className = "memo-note"; np.textContent = "העובדות מוסתרות. הקישו על שורה כדי לראות אותה."; var ol0 = mn0.querySelector(".cheat"); if (ol0) ol0.parentNode.insertBefore(np, ol0); }
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
        save(); el.classList.toggle("on", !!S.bookmarks[key]); el.innerHTML = bmLabel(!!S.bookmarks[key]);
        if (S.bookmarks[key]) toast("הקטע נשמר.", '<a href="#progress" data-act="goto" data-target="bm">לכל הקטעים השמורים</a>'); else toast("הקטע הוסר מהשמורים");
        break;
      case "toggle-done":
        var did = el.getAttribute("data-id");
        if (S.done[did]) delete S.done[did]; else { S.done[did] = Date.now(); touchDay(); }
        save(); viewLesson(L[did]); updateBadge();
        toast(S.done[did] ? "סימנו שסיימתם את השיעור. הכרטיסיות שלו נכנסו לחזרה." : "ביטלנו את הסימון שסיימתם");
        var pr = document.getElementById("s-practice"); if (pr) pr.scrollIntoView({ block: "center" });
        break;
      case "mark-done":
        var md = el.getAttribute("data-id");
        if (!S.done[md]) { S.done[md] = Date.now(); touchDay(); }
        save(); run = null; toast("סימנו שסיימתם את השיעור."); go("#lesson-" + md);
        break;
      case "toggle-read":
        var rid = el.getAttribute("data-id");
        if (S.read[rid]) delete S.read[rid]; else { S.read[rid] = Date.now(); touchDay(); }
        save(); viewLib(LIBID[rid]); updateBadge(); break;
      case "toggle-ch":
        var cid = el.getAttribute("data-id"), lst = document.getElementById("chl-" + cid), op = !!(lst && lst.hidden);
        if (!lst) break;
        lst.hidden = !op; el.setAttribute("aria-expanded", String(op)); document.getElementById("ch-" + cid).classList.toggle("open", op);
        if (CHID[cid]) el.innerHTML = chExpLabel(CHID[cid], op);
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
        startRun("practice", (L[sl] ? "תרגול: " + L[sl].title : "שאלות העשרה: " + LIBID[sl].title), spread(lq, lq.length), lessonHref(sl), { scope: L[sl] ? "l:" + sl : "" }); break;
      case "p-diff": cfg.diff = +el.getAttribute("data-n"); cfg.open = true; viewPracticeHub("practice"); break;
      case "p-type": var t = el.getAttribute("data-t"); cfg.types[t] = !cfg.types[t]; cfg.open = true; viewPracticeHub("practice"); break;
      case "p-count": cfg.count = +el.getAttribute("data-n"); cfg.open = true; viewPracticeHub("practice"); break;
      case "p-start":
        var list = poolFor(cfg.scope, cfg);
        cfg.msg = list.length ? "" : "אין שאלות שמתאימות למה שבחרתם. נסו בחירה אחרת (למשל ״כל הרמות״ או סוג שאלה נוסף).";
        if (!list.length) { cfg.open = true; viewPracticeHub("practice"); break; }
        startRun("practice", scopeTitle(cfg.scope), cfg.count ? spread(list, cfg.count) : shuffle(list), "#practice", { scope: cfg.diff || Object.keys(cfg.types).some(function (k) { return cfg.types[k]; }) ? "" : cfg.scope }); break;
      case "exam-full": e.preventDefault(); examStart("full"); break;
      case "exam-ch": e.preventDefault(); examStart("chapter", el.getAttribute("data-id")); break;
      case "exam-go":
        if (introSkip) { S.seen.examIntro = Date.now(); save(); }
        if (el.getAttribute("data-kind") === "full") startExam("מבחן על כל הקורס", spread(poolFor("mixed", { auto: true }), 30), examMin, { kind: "full" });
        else startChapterExam(el.getAttribute("data-id"), examMin);
        break;
      case "pretest": e.preventDefault(); startPretest(el.getAttribute("data-ch"), el.getAttribute("data-phase") || "pre"); break;
      case "run-exit": runExit(); break;
      case "run-leave": persistRun(); go("#home"); break;
      case "run-quit": runQuit(); break;
      case "resume-run":
        if (!(run && !run.finished && (run.mode === "exam" || run.mode === "pretest"))) { run = null; restoreActive(); }
        if (run) { checkExpiredRun(); go(run.finished ? "#run" : run.route || "#run"); }
        break;
      case "answer":
        // P1-1: a tap chooses (and can change); "לבדוק את התשובה" records it. In an exam the choice is saved at once.
        if (!it) return; var k = +el.getAttribute("data-k");
        if (run.mode === "exam") { it.choice = k; persistRun(); viewRun(); announce("התשובה נשמרה"); }
        else if (!it.done) { it.choice = k; persistRun(); viewRun(); }
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
        // R13: submitting always asks first, in plain words
        if (un) openSheet({ title: "להגיש עם " + plural(un, "שאלה אחת", "שאלות") + " בלי תשובה?", body: "<p>שאלה בלי תשובה נספרת כטעות.</p>", actions: [{ label: "לא, לחזור לשאלות", act: "dlg-close", cls: "btn-primary" }, { label: "כן, להגיש עכשיו", act: "exam-submit-force" }] });
        else openSheet({ title: "להגיש את המבחן?", body: "<p>עניתם על כל השאלות. אחרי ההגשה אי אפשר לשנות תשובות, ותראו את הציון.</p>", actions: [{ label: "כן, להגיש עכשיו", act: "exam-submit-force", cls: "btn-primary" }, { label: "לא, לחזור לשאלות", act: "dlg-close" }] });
        break;
      case "exam-submit-force": if (run && !run.finished) { if (route() !== "run") { submitExam(true); go("#run"); } else submitExam(); } break;
      case "retry-wrong":
        if (!run) break;
        var w = run.items.filter(function (x) { return x.id && x.score !== 1; }).map(function (x) { return Q[x.id]; });
        startRun("practice", "תרגול: השאלות שטעיתם בהן", w, run.back); break;
      case "run-again": if (run) startScope(run.scope || "mixed", 10); break;
      case "goto-mis": var mis = document.getElementById("mis"); if (mis) mis.scrollIntoView({ block: "start" }); break;
      case "m-term":
        if (!it) return; var ti = +el.getAttribute("data-i"); it.msg = "";
        if (matchPicker()) { it.sel = ti; viewRun(); matchSheet(it, Q[it.id], ti); break; }
        if (it.map[ti] !== undefined) { delete it.map[ti]; it.sel = null; } else it.sel = it.sel === ti ? null : ti;
        persistRun(); viewRun(); break;
      case "m-def":
        if (!it) return;
        if (it.sel === null || it.sel === undefined) { it.msg = "קודם בוחרים מונח, ואחר כך הגדרה."; viewRun(); return; }
        var di = +el.getAttribute("data-i"), mt = it.sel, old0 = it.map[mt];
        // the definition moves here; the term that had it gets this term's old definition (a swap), or none
        Object.keys(it.map).forEach(function (kk) { if (it.map[kk] === di && +kk !== mt) { if (old0 !== undefined) it.map[kk] = old0; else delete it.map[kk]; } });
        it.map[mt] = di; it.sel = null; it.msg = ""; persistRun(); viewRun();
        if (matchPicker()) focusEl(main.querySelector('[data-act="m-term"][data-i="' + mt + '"]'));
        break;
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
        if (!it.text.trim()) { it.msg = "קודם כתבו תשובה בתיבה, ואז אפשר לבקש מעוזר הלימוד לבדוק."; viewRun(); return; }
        it.msg = "";
        runAI("ai-out", aiPrompt("בדוק את תשובת הסטודנט לשאלה. כתוב מה נכון בה, מה חסר או שגוי לעומת התשובה לדוגמה ונקודות המפתח, ותן הערכה: מלאה / חלקית / חסרה.",
          L[qq.lesson], "השאלה: " + qq.q + "\nתשובה לדוגמה: " + qq.model + "\nנקודות מפתח: " + (qq.points || []).join("; ") + "\nתשובת הסטודנט: " + it.text)); break;
      case "ai": runAI("ai-out", aiPrompt(AI_TASKS[el.getAttribute("data-task")], L[route().slice(7)])); break;
      case "g-ch": gl.ch = el.getAttribute("data-v"); viewGlossary(); break;
      case "g-clear": gl.q = ""; viewGlossary(); var gs = document.getElementById("g-search"); if (gs) gs.focus(); break;
      case "g-open": var gid = el.getAttribute("data-id"); gl.open[gid] = !gl.open[gid]; renderGlossary(); break;
      case "src-filter": srcFilter = el.getAttribute("data-v"); viewSources(); break;
      case "zoom": el.classList.toggle("on"); break;
      case "case-start": if (run && run.mode === "case") { run.intro = false; run.i = 0; saveCase(); viewRun(); window.scrollTo(0, 0); } break;
      case "case-restart": if (run && run.mode === "case") { buildCaseRun(CASEID[run.caseId], true); viewRun(); window.scrollTo(0, 0); } break;
      case "toc": tocSheet(); break;
      case "toc-go": var tgt = document.getElementById(el.getAttribute("data-target")); if (tgt) tgt.scrollIntoView({ block: "start" }); break;
      case "memo":
        var mo = !clozeOn(); lsSet(CLOZE_KEY, mo ? "1" : "0"); el.innerHTML = I.eyeOff + memoLabel(); applyCloze(mo);
        announce(mo ? "המילים החשובות מוסתרות. הקישו על מילה כדי לראות אותה." : "כל המילים מוצגות שוב."); break;
      case "legend": legendSheet(); break;
      case "legend-ok": S.seen.legend = Date.now(); save(); var lbx = document.getElementById("legend-box"); if (lbx) { lbx.remove(); focusEl(main.querySelector("#level-bar [aria-selected=true]")); } break;
      case "dg-zoom":
        var fg = el.closest("figure"), sv = fg && fg.querySelector("svg.drawing");
        if (sv) openViewer(sv.outerHTML.replace(/ stepping/g, "").replace(/ class="pt pt-(\d+) hl"/g, ' class="pt pt-$1"'), (fg.querySelector("figcaption .dg-t") || {}).textContent || "תרשים");
        break;
      case "dg-play": playSteps(el.closest(".dg-step")); break;
      case "dg-prev": stopPlay(); var bx = el.closest(".dg-step"); setStep(bx, +bx.getAttribute("data-i") - 1); break;
      case "dg-next": stopPlay(); var bx2 = el.closest(".dg-step"); setStep(bx2, +bx2.getAttribute("data-i") + 1); break;
      case "vw-z": var vw = document.querySelector(".vw"); if (vw && vw._zoom) vw._zoom(el.getAttribute("data-z"), el.getAttribute("data-d")); break;
      case "ai-anim":
        var img = el.parentNode.querySelector("img.ai-img"), ga = el.getAttribute("aria-pressed") !== "true";
        if (!img) break;
        img.classList.remove("failed");
        if (ga) { img.setAttribute("data-still", img.getAttribute("src")); img.setAttribute("data-srcset", img.getAttribute("srcset") || ""); img.removeAttribute("srcset"); img.src = el.getAttribute("data-gif"); }
        else { img.src = img.getAttribute("data-still"); if (img.getAttribute("data-srcset")) img.setAttribute("srcset", img.getAttribute("data-srcset")); }
        el.setAttribute("aria-pressed", String(ga)); el.innerHTML = (ga ? I.pause : I.play) + "<span>" + (ga ? "לעצור" : "לראות בתנועה") + "</span>";
        break;
      case "plan-tick":
        var d0 = el.getAttribute("data-day"), ix = el.getAttribute("data-idx");
        S.plan.done[d0] = Object.assign({}, S.plan.done[d0]);
        if (S.plan.done[d0][ix]) delete S.plan.done[d0][ix]; else S.plan.done[d0][ix] = Date.now();
        S.plan.t = Date.now(); save(); render();
        var tk = document.querySelector('[data-act="plan-tick"][data-day="' + d0 + '"][data-idx="' + ix + '"]'); if (tk) tk.focus({ preventScroll: true });
        break;
      case "plan-carry": S.plan.carry = { d: today(), day: +el.getAttribute("data-day") }; S.plan.t = Date.now(); save(); render(); break;
      case "plan-shift":
        var oldPlan = JSON.parse(JSON.stringify(S.plan));
        S.plan.shift = (S.plan.shift || 0) + 1; S.plan.carry = null; S.plan.t = Date.now(); save(); render();
        toast("התוכנית נדחתה ביום אחד.", "", { undo: function () { S.plan = Object.assign(oldPlan, { t: Date.now() }); save(); render(); toast("ביטלנו את הדחייה."); }, action: "ביטול" });
        break;
      case "ob-plan": obStep = 3; render(); var oc = main.querySelector(".choice"); if (oc) oc.focus(); break;
      case "ob-back": obStep = Math.max(0, obStep - 1); render(); focusEl(main.querySelector("#ob-h")); break;
      case "ob-next": obStep = Math.min(2, obStep + 1); render(); focusEl(main.querySelector("#ob-h")); break;
      case "ob-skip": obStep = 2; render(); focusEl(main.querySelector("#ob-h")); break;
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
    if (el.id === "backup-file" && el.files && el.files[0]) {
      var rd = new FileReader();
      rd.onload = function () {
        var o = null;
        try { o = JSON.parse(rd.result); } catch (err) { o = null; }
        el.value = "";
        if (!o || o.app !== "melachot" || !o.state || typeof o.state !== "object") { backupBox('<p class="inline-msg" role="alert">זה לא קובץ גיבוי של האפליקציה. בחרו קובץ אחר.</p>'); return; }
        S = merge(S, o.state); save(); render();
        backupBox('<div class="note-box" role="status"><p><b>הגיבוי נפתח. מה שבקובץ נוסף להתקדמות שלכם.</b></p><p>' + plural(Object.keys(S.done).length, "שיעור אחד הושלם", "שיעורים הושלמו") + ".</p></div>");
      };
      rd.onerror = function () { el.value = ""; backupBox('<p class="inline-msg" role="alert">לא הצלחנו לפתוח את הקובץ. נסו שוב.</p>'); };
      rd.readAsText(el.files[0]);
      return;
    }
    if (el.id === "p-scope") cfg.scope = el.value;
    else if (el.id === "p-enrich") cfg.enrich = el.checked;
  });
  document.addEventListener("toggle", function (e) { if (e.target && e.target.id === "custom") cfg.open = e.target.open; if (e.target && e.target.open) tableRegions(); }, true);
  document.addEventListener("input", function (e) { if (e.target.id === "open-a" && run && !run.finished) run.items[run.i].text = e.target.value; });
  document.addEventListener("load", function (e) { var t = e.target; if (t && t.classList && t.classList.contains("ai-img")) t.classList.add("loaded"); }, true);
  document.addEventListener("error", function (e) {
    var t = e.target;
    if (t && t.classList && t.classList.contains("ai-img")) { t.classList.add("failed"); return; }
    if (t && t.classList && (t.classList.contains("ch-ic") || t.classList.contains("print-thumb"))) { t.style.display = "none"; return; } // decorative: the name or the worded link stays
    if (t && t.tagName === "IMG" && t.hasAttribute("data-full")) { var full = t.getAttribute("data-full"); t.removeAttribute("data-full"); t.src = full; return; }
    if (t && t.tagName === "IMG" && t.getAttribute("data-act") === "imgfail") {
      var fig = t.closest("figure");
      if (fig && !fig.querySelector(".img-missing")) { t.hidden = true; var p = document.createElement("p"); p.className = "img-missing muted"; p.textContent = "צילום השקף לא זמין כאן. הטקסט של השקף מופיע למטה."; fig.insertBefore(p, fig.firstChild); }
      else if (!fig) t.style.visibility = "hidden";
    }
  }, true);
  document.addEventListener("keydown", function (e) {
    if (dlg) {
      if (e.key === "Escape") { e.preventDefault(); closeSheet(); return; }
      trapFocus(e); return;
    }
    if (e.key === "Escape" && TTS.el) { speakStop(); return; }
    var tag = e.target && e.target.tagName;
    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
    var h = route();
    if (h.indexOf("review") === 0) {
      var r = rev; if (!r || r.i >= r.queue.length) return;
      if ((e.key === " " || e.key === "Enter") && !r.flipped) { e.preventDefault(); flip(); }
      else if (r.flipped && (SET.simple ? /^[12]$/ : /^[1-4]$/).test(e.key)) { e.preventDefault(); rate((SET.simple ? ["again", "good"] : ["again", "hard", "good", "easy"])[+e.key - 1]); }
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
  // one scroll loop: sticky shadow (M18), reading tracker, chapter scroll-spy, cheat-sheet end (the menu never hides: senior P0-8)
  var ticking = false;
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  function onScroll() {
    ticking = false;
    var y = window.scrollY;
    var atEnd = window.innerHeight + y >= document.documentElement.scrollHeight - 8;
    if (topbar) topbar.classList.toggle("scrolled", y > 2);
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
      // the jump list wraps and scrolls with the page now (P1-19): never scroll it into view (that would pull the page back up)
      if (on) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current");
    });
  }
  // WCAG 2.4.11: a control that receives focus is scrolled clear of the sticky top bars and the fixed bottom bars
  var BARS_TOP = ".topbar, #level-bar, .ch-nav, .studybar, .sb-tape", BARS_BOT = ".nav, #ab, .toast:not([hidden])";
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
    fitNav();
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
