/* מלאכות הבנייה: course study app.
   Course content (source-based) comes from window.COURSE_META, window.COURSE_LESSONS and window.SOURCES.
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
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function dayKey(d) { d = d || new Date(); return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
  function startOfToday() { var d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }
  function pct(x) { return Math.round(Math.max(0, Math.min(1, x || 0)) * 100); }
  function stripTags(s) { return String(s == null ? "" : s).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); }
  function strHash(s) { s = String(s); var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
  function uniq(base, map) { var id = base, n = 2; while (map[id]) id = base + "-" + n++; return id; }
  function plural(n, one, many) { return n === 1 ? one : n + " " + many; }
  function tape(p, thin) { return '<div class="tape' + (thin ? " tape-thin" : "") + '" role="img" aria-label="' + p + ' אחוז"><i style="width:' + p + '%"></i></div>'; }
  function fmtDate(t) { return new Date(t).toLocaleDateString("he-IL", { day: "numeric", month: "numeric", year: "2-digit" }); }
  function fmtDur(sec) { sec = Math.max(0, Math.round(sec)); return Math.floor(sec / 60) + ":" + pad2(sec % 60); }
  function avg(a) { return a.length ? a.reduce(function (s, x) { return s + x; }, 0) / a.length : 0; }

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
      addCard({ id: l.id + ":c:" + strHash(c.q), lesson: l.id, kind: "q", front: c.q, back: c.a, src: c.src, scope: "course" });
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
      if (!parts || parts.length < 3) return;
      parts.forEach(function (p) {
        var others = shuffle(parts.filter(function (x) { return x.name !== p.name; })).slice(0, 3).map(function (x) { return x.name; });
        if (others.length < 3) return;
        var opts = shuffle([p.name].concat(others));
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
  function lessonQs(lid) { return QUESTIONS.filter(function (q) { return q.lesson === lid; }); }
  function lessonCards(lid) { return CARDS.filter(function (c) { return c.lesson === lid; }); }
  function lessonTitle(lid) { return L[lid] ? L[lid].code + " " + L[lid].title : LIBID[lid] ? "העשרה " + LIBID[lid].num + ": " + LIBID[lid].title : ""; }
  function lessonHref(lid) { return L[lid] ? "#lesson-" + lid : "#lib-" + lid; }

  // =============================================================== state
  var KEY = "melachot-progress-v1";
  function blank() {
    return { v: 2, updatedAt: 0, read: {}, done: {}, cards: {}, qstats: {}, mistakes: {}, order: {}, days: {}, newDay: { d: "", n: 0 },
      bookmarks: {}, exams: [], last: null, lvl: {}, lastLesson: null };
  }
  function normalize(o) {
    var b = blank();
    if (!o || typeof o !== "object") return b;
    Object.keys(b).forEach(function (k) { if (o[k] !== undefined && o[k] !== null) b[k] = o[k]; });
    return b;
  }
  function loadLocal() {
    try { var raw = localStorage.getItem(KEY); if (raw) return normalize(JSON.parse(raw)); } catch (e) { /* storage blocked */ }
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
    Object.keys(y).forEach(function (id) { var p = m[id], q = y[id]; if (!p || (q && (q[fld] || 0) > (p[fld] || 0))) m[id] = q; });
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
    return m;
  }

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
      if (!this.ref) return;
      clearTimeout(this.timer);
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
  function cardOpen(c) { return c.scope === "course" ? !!(S.done[c.lesson] || S.last && S.last.lesson === c.lesson) : !!S.read[c.lesson]; }
  function newLeftToday() { return S.newDay.d === dayKey() ? Math.max(0, NEW_PER_DAY - S.newDay.n) : NEW_PER_DAY; }
  function pickNew(limit, pool) {
    return (pool || CARDS).filter(function (c) { return isNew(c) && cardOpen(c); }).slice(0, limit);
  }
  function dueCards(pool) { return (pool || CARDS).filter(isDue); }
  function dailyQueueSize() { return dueCards().length + pickNew(newLeftToday()).length; }

  // =============================================================== mastery
  function cardScore(lid) {
    var cs = lessonCards(lid); if (!cs.length) return 0;
    return cs.reduce(function (s, c) { var st = S.cards[c.id]; return s + (st && st.reps > 0 ? Math.min(1, st.ivl / 7) : 0); }, 0) / cs.length;
  }
  function qScore(lid) {
    var qs = lessonQs(lid).filter(function (q) { return q.type !== "open"; }); if (!qs.length) return 0;
    return qs.filter(function (q) { var s = S.qstats[q.id]; return s && s.last === 1; }).length / qs.length;
  }
  function attempted(lid) { return lessonQs(lid).some(function (q) { return S.qstats[q.id]; }); }
  function mastery(lid) { return 0.2 * (S.done[lid] || S.read[lid] ? 1 : 0) + 0.35 * cardScore(lid) + 0.45 * qScore(lid); }
  function chapterMastery(c) { return avg(c.lessons.map(function (l) { return mastery(l.id); })); }
  function courseMastery() { return avg(LESSONS.map(function (l) { return mastery(l.id); })); }

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

  // =============================================================== shell
  var app = document.getElementById("app");
  document.documentElement.setAttribute("lang", "he");
  document.documentElement.setAttribute("dir", "rtl");
  app.innerHTML =
    (window.Diagrams ? window.Diagrams.defs : "") +
    '<a class="skip" href="#main" data-act="skip">דילוג לתוכן</a>' +
    '<header class="topbar"><div class="topbar-in">' +
    '<a class="brand" href="#home">' + BRAND + '<span class="brand-name">מלאכות הבנייה</span></a>' +
    '<nav class="nav" aria-label="ניווט ראשי">' +
    '<a href="#home" data-nav="home">' + I.home + "<span>בית</span></a>" +
    '<a href="#course" data-nav="course">' + I.course + "<span>קורס</span></a>" +
    '<a href="#practice" data-nav="practice">' + I.practice + '<span>תרגול</span><b class="badge" id="due-badge"></b></a>' +
    '<a href="#glossary" data-nav="glossary">' + I.glossary + "<span>מילון</span></a>" +
    '<a href="#progress" data-nav="progress">' + I.progress + "<span>התקדמות</span></a>" +
    "</nav>" +
    '<a class="icon-btn" href="#search" aria-label="חיפוש בכל החומר" data-nav="search">' + I.search + "</a>" +
    "</div></header>" +
    '<main id="main" tabindex="-1"></main>' +
    '<div class="toast" id="toast" role="status" aria-live="polite" hidden></div>';
  var main = document.getElementById("main");

  var toastTimer = null;
  function toast(msg) {
    var t = document.getElementById("toast");
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 2400);
  }
  function updateBadge() {
    var n = dailyQueueSize();
    var b = document.getElementById("due-badge");
    if (b) b.textContent = n > 0 ? (n > 99 ? "99+" : String(n)) : "";
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
  var pendingScroll = null;
  var run = null;      // practice / exam session
  var rev = null;      // flashcard session
  function route() { var h = (location.hash || "#home").slice(1); return h || "home"; }
  var NAV_OF = { home: "home", course: "course", lesson: "course", lib: "course", sources: "course", source: "course", practice: "practice", exams: "practice", cards: "practice", run: "practice", review: "practice", glossary: "glossary", progress: "progress", search: "search" };
  function render() {
    var h = route(), head = h.split("-")[0], arg = h.indexOf("-") > -1 ? h.slice(h.indexOf("-") + 1) : "";
    if (!LESSONS.length && !LIB.length) {
      main.innerHTML = '<div class="empty">' + I.level + "<b>החומר לא נטען</b><p>קובצי התוכן לא נמצאו. רעננו את הדף.</p></div>";
      return;
    }
    switch (head) {
      case "course": viewCourse(); break;
      case "lesson": if (L[arg]) viewLesson(L[arg]); else viewCourse(); break;
      case "lib": if (LIBID[arg]) viewLib(LIBID[arg]); else viewCourse(); break;
      case "practice": viewPracticeHub("practice"); break;
      case "exams": viewPracticeHub("exams"); break;
      case "cards": viewPracticeHub("cards"); break;
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
    render();
    if (pendingScroll) {
      var el = document.getElementById(pendingScroll);
      pendingScroll = null;
      if (el) { el.scrollIntoView({ block: "start" }); return; }
    }
    if (h !== lastRoute) window.scrollTo(0, 0);
    lastRoute = h;
  });
  function go(hash) { if (location.hash === hash) { render(); window.scrollTo(0, 0); } else location.hash = hash; }

  // =============================================================== home
  function greeting() {
    var h = new Date().getHours();
    return h < 5 ? "לילה טוב" : h < 12 ? "בוקר טוב" : h < 17 ? "צהריים טובים" : h < 21 ? "ערב טוב" : "לילה טוב";
  }
  function continueTarget() {
    if (S.last && L[S.last.lesson] && !S.done[S.last.lesson]) return L[S.last.lesson];
    return LESSONS.filter(function (l) { return !S.done[l.id]; })[0] || null;
  }
  function weakLessons(n) {
    return LESSONS.filter(attemptedOrDone).sort(function (a, b) { return mastery(a.id) - mastery(b.id); }).slice(0, n);
  }
  function attemptedOrDone(l) { return S.done[l.id] || attempted(l.id); }
  function viewHome() {
    var ct = continueTarget();
    var doneN = LESSONS.filter(function (l) { return S.done[l.id]; }).length;
    var chDone = CH.filter(function (c) { return c.lessons.every(function (l) { return S.done[l.id]; }); }).length;
    var lastExam = S.exams[0];
    var cm = pct(courseMastery());
    var due = dailyQueueSize();
    var mistakesN = Object.keys(S.mistakes).filter(function (k) { return Q[k] && Q[k].scope === "course"; }).length;
    var weak = weakLessons(2).filter(function (l) { return mastery(l.id) < 0.75; });
    var marks = Object.keys(S.bookmarks).map(function (k) { return S.bookmarks[k]; }).filter(function (b) { return L[b.lesson]; }).sort(function (a, b) { return b.t - a.t; });

    var todo = [];
    if (due) todo.push({ href: "#review", t: "כרטיסיות לחזרה", d: plural(due, "כרטיסייה אחת ממתינה", "כרטיסיות ממתינות") + " לחזרה מרווחת", n: due });
    if (mistakesN) todo.push({ href: "#run", act: "start-mistakes", t: "תרגול טעויות", d: plural(mistakesN, "שאלה אחת", "שאלות") + " שטעיתם בהן", n: mistakesN });
    weak.forEach(function (l) { todo.push({ href: "#lesson-" + l.id, t: "לחזק: " + l.title, d: "שליטה " + pct(mastery(l.id)) + "%. כדאי לחזור על השיעור ולתרגל אותו" }); });
    marks.slice(0, 2).forEach(function (b) { todo.push({ href: "#lesson-" + b.lesson, mark: b, t: "סימנתם לחזרה: " + b.title, d: L[b.lesson].code + " " + L[b.lesson].title }); });

    var html = '<section class="dash-head">' +
      '<div class="hero">' +
      '<span class="eyebrow">' + greeting() + " · " + new Date().toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" }) + "</span>" +
      '<h1 class="display">מלאכות הבנייה</h1>' +
      '<p class="lead">' + LESSONS.length + " שיעורים לפי חומר הקורס שלך, ב-" + CH.length + " פרקים. כל פרט מקושר לעמוד המקור שממנו נלקח.</p>" +
      (ct ? '<div class="next-step"><div><div class="label">' + (S.last && S.last.lesson === ct.id ? "המשך מהמקום האחרון" : "השיעור הבא") + '</div><div class="what">' + esc(ct.code + " " + ct.title) + "</div></div>" +
        '<a class="btn btn-primary" href="#lesson-' + ct.id + '">המשך ללמוד' + I.arrowL + "</a></div>"
        : '<div class="next-step"><div><div class="label">כל השיעורים הושלמו</div><div class="what">מבחן כולל שמדמה בחינה</div></div><a class="btn btn-primary" href="#exams">למבחנים' + I.arrowL + "</a></div>") +
      "</div>" +
      '<div class="stats">' +
      '<div class="stat"><span class="k">התקדמות בקורס</span><span class="v">' + cm + "<small>%</small></span>" + tape(cm) + "</div>" +
      '<div class="stat"><span class="k">שיעורים שהושלמו</span><span class="v">' + doneN + "<small>/ " + LESSONS.length + '</small></span><span class="k">' + chDone + " מתוך " + CH.length + " פרקים הושלמו</span></div>" +
      '<div class="stat"><span class="k">רצף ימי למידה</span><span class="v">' + streak() + "<small>" + (streak() === 1 ? "יום" : "ימים") + "</small></span></div>" +
      '<div class="stat"><span class="k">מבחן אחרון</span><span class="v">' + (lastExam ? lastExam.score + "<small>%</small>" : "—") + '</span><span class="k">' + (lastExam ? esc(lastExam.title) : "עדיין לא נבחנתם") + "</span></div>" +
      "</div></section>";

    html += '<div class="section-head"><h2>היום כדאי לחזור על…</h2></div>';
    html += todo.length ? '<div class="todo">' + todo.slice(0, 5).map(function (t) {
      return '<a class="todo-item" href="' + t.href + '"' + (t.act ? ' data-act="' + t.act + '"' : "") + (t.mark ? ' data-act="goto-level" data-lesson="' + t.mark.lesson + '" data-lv="' + t.mark.anchor.split("-")[1] + '" data-target="' + esc(t.mark.anchor) + '"' : "") + "><b>" + esc(t.t) + "</b><span>" + esc(t.d) + "</span>" + (t.n ? '<i class="badge">' + t.n + "</i>" : "") + "</a>";
    }).join("") + "</div>" : '<p class="muted panel">עוד אין מה לחזור עליו. התחילו מהשיעור הראשון; אחרי שתסיימו שיעור, הכרטיסיות שלו יופיעו כאן לחזרה.</p>';

    html += '<div class="section-head"><h2>הפרקים</h2><a class="muted" href="#course">כל תוכן הקורס</a></div><div class="sheets">' + CH.map(chapterCard).join("") + "</div>";
    html += '<div class="tools">' +
      '<a class="tool" href="#exams"><b>מבחנים</b><span>מבחן לכל פרק, ומבחן כולל עם שעון שמדמה בחינה.</span></a>' +
      '<a class="tool" href="#glossary"><b>מילון מונחים</b><span>' + TERMS.filter(function (t) { return !t.enrich; }).length + " מונחים מהקורס, בעברית ובאנגלית.</span></a>" +
      '<a class="tool" href="#sources"><b>עמודי המקור ודוח כיסוי</b><span>' + SOURCES.length + " תמונות מהשיעורים, התמלול שלהן, ואיפה כל אחת מופיעה.</span></a>" +
      "</div>";
    html += footHtml();
    main.innerHTML = html;
  }
  function chapterCard(c) {
    var m = pct(chapterMastery(c));
    var done = c.lessons.filter(function (l) { return S.done[l.id]; }).length;
    return '<a class="sheet" href="#course" data-act="open-chapter" data-id="' + c.id + '">' +
      '<div class="swatch">' + window.Diagrams.swatch(c.material || "general") + "</div>" +
      '<div class="tb-top"><span class="num">' + esc(c.letter) + '</span><div><div class="ttl">' + esc(c.title) + '</div><div class="sub">' +
      c.lessons.length + " שיעורים · " + done + " הושלמו</div></div></div>" +
      '<div class="tb-bot">' + tape(m, true) + '<span class="pct">' + m + "%</span></div></a>";
  }
  function footHtml() {
    return '<footer class="foot"><span>תוכן מסומן "מקור" נלקח מעמודי הקורס שסיפקת. "הסבר משלים" נוסף כדי להקל על ההבנה. המחשות הן לימודיות בלבד ואינן פרט לביצוע. המחייב באתר הוא התכנון המאושר והמהנדס.</span>' +
      '<span class="row"><span id="save-status">' + saveStatusText() + '</span><button class="btn btn-ghost btn-sm" data-act="reset-ask" id="reset-btn">איפוס התקדמות</button></span></footer>';
  }

  // =============================================================== course contents
  var openCh = {};
  try { openCh = JSON.parse(localStorage.getItem("melachot-open-ch") || "{}"); } catch (e) { openCh = {}; }
  function viewCourse() {
    var total = LESSONS.reduce(function (s, l) { return s + (l.est || 10); }, 0);
    var html = '<div class="page-head"><span class="eyebrow">' + LESSONS.length + " שיעורים · כ-" + Math.round(total / 6) / 10 + " שעות לימוד</span><h1 class=\"display\">תוכן הקורס</h1>" +
      '<p class="muted">לחצו על פרק כדי לפתוח או לסגור אותו. ליד כל שיעור: זמן משוער, סטטוס וציון בתרגול.</p></div>';
    html += '<div class="chapters">';
    CH.forEach(function (c) {
      var open = openCh[c.id] !== false;
      var m = pct(chapterMastery(c));
      var done = c.lessons.filter(function (l) { return S.done[l.id]; }).length;
      var est = c.lessons.reduce(function (s, l) { return s + (l.est || 10); }, 0);
      html += '<section class="chapter' + (open ? " open" : "") + '" id="ch-' + c.id + '">' +
        '<button class="ch-head" data-act="toggle-ch" data-id="' + c.id + '" aria-expanded="' + open + '">' +
        '<span class="ch-letter">' + esc(c.letter) + '</span><span class="ch-title"><b>פרק ' + esc(c.letter) + ": " + esc(c.title) + "</b><small>" + c.lessons.length + " שיעורים · כ-" + est + " דקות · " + done + " הושלמו</small></span>" +
        '<span class="ch-score">' + m + "%</span>" + I.chev + "</button>" +
        '<div class="ch-body">' + (c.summary ? '<p class="muted ch-sum">' + esc(c.summary) + "</p>" : "") + '<ol class="lesson-list">' +
        c.lessons.map(function (l) {
          var lm = pct(mastery(l.id));
          var st = S.done[l.id] ? '<span class="chip done">הושלם</span>' : (S.last && S.last.lesson === l.id ? '<span class="chip">בתהליך</span>' : "");
          return '<li><a class="lesson-row" href="#lesson-' + l.id + '"><span class="code">' + esc(l.code) + '</span><span class="lt"><b>' + esc(l.title) + "</b><small>" + (l.est || 10) + " דק׳ · " + lessonQs(l.id).length + " שאלות" + (attempted(l.id) ? " · ציון " + pct(qScore(l.id)) + "%" : "") + "</small></span>" + st + tape(lm, true) + "</a></li>";
        }).join("") + "</ol></div></section>";
    });
    html += "</div>";
    if (LIB.length) {
      html += '<section class="lib-sec"><div class="section-head"><h2>ספריית העשרה</h2><span class="badge-soft">לא מהמצגת</span></div>' +
        '<p class="muted">' + LIB.length + " שיעורים כלליים על מלאכות בניין (טפסנות, ברזל, בטון, טיח, איטום ועוד) שנכתבו לפני שהגיע חומר הקורס. הם אינם מבוססים על עמודי המקור, ולכן מוצגים בנפרד ואינם נכללים במבחנים, אלא אם בוחרים בכך.</p>" +
        '<div class="lib-grid">' + LIB.map(function (l) {
          return '<a class="lib-item" href="#lib-' + l.id + '"><span class="num">' + pad2(l.num) + "</span><span>" + esc(l.title) + "</span>" + (S.read[l.id] ? '<span class="chip done">נקרא</span>' : "") + "</a>";
        }).join("") + "</div></section>";
    }
    html += '<p class="muted center"><a href="#sources">עמודי המקור ודוח הכיסוי</a></p>';
    main.innerHTML = html;
  }

  // =============================================================== lesson
  var LEVELS = [["quick", "הבנה מהירה"], ["full", "לימוד מלא"], ["deep", "עומק הנדסי"]];
  var CLOZE_KEY = "melachot-cloze";
  function clozeOn() { try { return localStorage.getItem(CLOZE_KEY) === "1"; } catch (e) { return false; } }
  function renderBlock(b, ctx) {
    var src = Array.isArray(b.src) ? srcChips(b.src) : "";
    switch (b.k) {
      case "src": return '<div class="blk blk-src"><div class="prose">' + wrapP(b.html) + "</div>" + (src ? '<div class="blk-meta">מקור: ' + src + "</div>" : "") + "</div>";
      case "expl": return '<div class="blk blk-expl"><span class="blk-tag">הסבר משלים</span><div class="prose">' + wrapP(b.html) + "</div></div>";
      case "verify": return '<div class="blk blk-verify"><span class="blk-tag">טעון אימות מול המקור</span><div class="prose">' + wrapP(b.html) + "</div>" + (b.note ? '<p class="verify-note">' + esc(b.note) + "</p>" : "") + (src ? '<div class="blk-meta">מקור: ' + src + "</div>" : "") + "</div>";
      case "exam": case "note": case "mistake":
        var lab = { exam: "חשוב למבחן", note: "שים לב", mistake: "טעות נפוצה" }[b.k];
        return '<div class="callout co-' + b.k + '"><span class="co-tag">' + lab + (b.expl ? " · הסבר משלים" : "") + '</span><div class="prose">' + wrapP(b.html) + "</div>" + (src ? '<div class="blk-meta">מקור: ' + src + "</div>" : "") + "</div>";
      case "table":
        return '<figure class="tbl"><div class="tbl-scroll"><table><caption>' + esc(b.title || "") + "</caption><thead><tr>" + (b.head || []).map(function (h) { return '<th scope="col">' + esc(h) + "</th>"; }).join("") + "</tr></thead><tbody>" +
          (b.rows || []).map(function (r) { return "<tr>" + r.map(function (c, i) { var cls = /\[\?\]|לא ברור|לא קריא/.test(c) ? ' class="unclear"' : ""; return i === 0 ? '<th scope="row"' + cls + ">" + esc(c) + "</th>" : "<td" + cls + ">" + esc(c) + "</td>"; }).join("") + "</tr>"; }).join("") +
          "</tbody></table></div>" + (src ? '<figcaption class="blk-meta">מקור: ' + src + "</figcaption>" : "") + "</figure>";
      case "diagram":
        if (!window.Diagrams.has(b.id)) return "";
        ctx.fig = (ctx.fig || 0) + 1;
        return '<figure class="dg"><div class="dg-scroll">' + window.Diagrams.render(b.id) + '</div><figcaption><b>איור ' + ctx.code + "." + ctx.fig + "</b><span>" + esc(window.Diagrams.title(b.id)) + '</span><span class="illus">המחשה לימודית, לא פרט לביצוע</span><span class="swipe">החליקו לצדדים לכל התרשים</span></figcaption></figure>';
      case "image":
        var s = SRC[b.src];
        return '<figure class="src-img"><a href="#source-' + esc(b.src) + '"><img loading="lazy" src="' + IMG_BASE + esc(b.src) + '.jpg" alt="' + esc(b.caption || (s && s.title) || "עמוד מקור") + '" data-act="imgfail"></a><figcaption>' + esc(b.caption || "") + " " + srcChips([b.src]) + "</figcaption></figure>";
      default: return b.html ? '<div class="prose">' + wrapP(b.html) + "</div>" : "";
    }
  }
  function wrapP(h) { h = String(h || ""); return /^\s*<(ul|ol|p)/.test(h) ? h : "<p>" + h + "</p>"; }

  function viewLesson(l) {
    var lv = S.lvl[l.id] || (S.done[l.id] ? "full" : "quick");
    S.last = { lesson: l.id, level: lv, t: Date.now() };
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage blocked */ }
    var prev = LESSONS[l.idx - 1], next = LESSONS[l.idx + 1];
    var m = pct(mastery(l.id));
    var qs = lessonQs(l.id), cs = lessonCards(l.id);
    var ctx = { code: l.code };
    var html = '<nav class="crumbs" aria-label="מיקום"><a href="#course">קורס</a><span aria-hidden="true">/</span><span>פרק ' + esc(l.ch.letter) + ": " + esc(l.ch.title) + "</span></nav>";
    html += '<header class="lesson-head">' +
      '<div class="swatch">' + window.Diagrams.swatch(l.ch.material || "general") + "</div>" +
      '<div class="lh-main"><span class="eyebrow">שיעור ' + esc(l.code) + " · כ-" + (l.est || 10) + " דקות</span><h1>" + esc(l.title) + "</h1>" +
      (l.summary ? '<p class="summary">' + esc(l.summary) + "</p>" : "") +
      '<div class="lh-src">עמודי מקור: ' + srcChips(l.sources) + "</div></div>" +
      '<div class="lh-meta">' +
      '<div><span class="k">סטטוס</span><span class="v">' + (S.done[l.id] ? "הושלם" : "בלמידה") + "</span></div>" +
      '<div><span class="k">כרטיסיות</span><span class="v">' + cs.length + "</span></div>" +
      '<div><span class="k">שאלות</span><span class="v">' + qs.length + "</span></div>" +
      '<div><span class="k">שליטה</span><span class="v">' + m + "%</span></div>" +
      "</div></header>";

    if ((l.objectives || []).length || (l.keywords || []).length) {
      html += '<section class="obj">' +
        ((l.objectives || []).length ? '<div><h2>מטרות הלמידה</h2><ul>' + l.objectives.map(function (o) { return "<li>" + esc(o) + "</li>"; }).join("") + "</ul></div>" : "") +
        ((l.keywords || []).length ? '<div><h2>מילות מפתח</h2><div class="chips">' + l.keywords.map(function (k) { return '<a class="chip kw" href="#glossary" data-act="glossary-q" data-q="' + esc(k) + '">' + esc(k) + "</a>"; }).join("") + "</div></div>" : "") +
        "</section>";
    }

    html += '<div class="level-bar"><div class="seg-tabs" role="tablist" aria-label="רמת לימוד">' + LEVELS.map(function (x, i) {
      return '<button role="tab" id="tab-' + x[0] + '" aria-selected="' + (lv === x[0]) + '" data-act="level" data-lv="' + x[0] + '"><small>רמה ' + (i + 1) + "</small>" + x[1] + "</button>";
    }).join("") + "</div>" +
      '<label class="switch" for="cloze-toggle"><input type="checkbox" id="cloze-toggle"' + (clozeOn() ? " checked" : "") + '><span class="track"></span><span>מצב שינון</span></label></div>';

    html += '<div class="lesson-body" role="tabpanel" aria-labelledby="tab-' + lv + '">';
    if (lv === "quick") {
      var qk = l.quick || {};
      html += '<section class="block quick">' +
        quickRow("מה זה?", qk.what) + quickRow("למה משתמשים בזה?", qk.why) + quickRow("איפה רואים את זה באתר?", qk.where) +
        ((qk.exam || []).length ? '<div class="q-row q-exam"><h3>מה חשוב לזכור למבחן</h3><ul>' + qk.exam.map(function (e) { return "<li>" + esc(e) + "</li>"; }).join("") + "</ul></div>" : "") +
        (qk.src ? '<div class="blk-meta">מבוסס על: ' + srcChips(qk.src) + "</div>" : "") +
        '<div class="btn-row"><button class="btn btn-primary" data-act="level" data-lv="full">ללימוד המלא' + I.arrowL + "</button></div></section>";
    } else {
      (l[lv] || []).forEach(function (s, i) {
        var anchor = "s-" + lv + "-" + (i + 1);
        var bk = S.bookmarks[l.id + "|" + anchor];
        html += '<section class="block" id="' + anchor + '"><div class="block-head"><h2><span class="sn">' + esc(l.code) + "." + (i + 1) + "</span>" + esc(s.title) + "</h2>" +
          '<button class="bm' + (bk ? " on" : "") + '" data-act="bookmark" data-lesson="' + l.id + '" data-anchor="' + anchor + '" data-title="' + esc(s.title) + '" aria-pressed="' + !!bk + '" aria-label="סימון לחזרה">' + I.star + "</button></div>" +
          (s.blocks || []).map(function (b) { return renderBlock(b, ctx); }).join("") + "</section>";
      });
      if (lv === "deep" && !(l.deep || []).length) html += '<p class="muted panel">לשיעור הזה אין רמת עומק נפרדת.</p>';
    }
    // always visible: remember, mistakes, summary
    if ((l.remember || []).length) {
      html += '<section class="block" id="s-rem"><h2>נקודות שחובה לזכור</h2><ul class="remember-list' + (clozeOn() ? " hide" : "") + '">' +
        l.remember.map(function (r, i) {
          var t = typeof r === "string" ? r : r.t;
          return '<li><span class="box">' + (i + 1) + '</span><span class="txt" data-act="reveal">' + esc(t) + (r.src ? " " + srcChips(r.src) : r.expl ? ' <span class="tag-expl">משלים</span>' : "") + "</span></li>";
        }).join("") + "</ul></section>";
    }
    if ((l.mistakes || []).length) {
      html += '<section class="block"><h2>טעויות נפוצות ובלבולים</h2><ul class="mistake-list">' + l.mistakes.map(function (r) { return "<li>" + I.x + "<span>" + esc(r) + "</span></li>"; }).join("") + "</ul></section>";
    }
    if (ai.s) {
      html += '<section class="block ai-box"><h2>' + I.spark + ' עוזר לימוד</h2><p class="muted">התשובות מבוססות על חומר השיעור ומציינות את עמודי המקור.</p><div class="btn-row">' +
        '<button class="btn btn-sm" data-act="ai" data-task="simple">הסבר לי בפשטות</button>' +
        '<button class="btn btn-sm" data-act="ai" data-task="example">תן לי דוגמה מהשטח</button>' +
        '<button class="btn btn-sm" data-act="ai" data-task="diff">מה ההבדל בין המושגים?</button>' +
        '<button class="btn btn-sm" data-act="ai" data-task="quiz">בחן אותי</button>' +
        '<button class="btn btn-sm" data-act="ai" data-task="again">לא הבנתי, הסבר שוב</button>' +
        '</div><form class="ai-ask" data-act="ai-ask"><label class="sr-only" for="ai-q">שאלה על השיעור</label><input class="input" id="ai-q" placeholder="או שאלו שאלה על השיעור" autocomplete="off"><button class="btn btn-sm btn-primary" type="submit">לשאול</button></form>' +
        '<div class="ai-out" id="ai-out" hidden aria-live="polite"></div></section>';
    }
    html += '<section class="practice" id="s-practice"><h2>סיכום ותרגול</h2>' + (l.summary ? "<p>" + esc(l.summary) + "</p>" : "") + tape(m) +
      '<div class="btn-row">' +
      '<button class="btn btn-primary" data-act="start-check" data-id="' + l.id + '">בדיקת הבנה (5 שאלות)</button>' +
      '<button class="btn" data-act="start-lesson" data-id="' + l.id + '">תרגול מלא (' + qs.length + ")</button>" +
      '<a class="btn" href="#review-' + l.id + '">כרטיסיות (' + cs.length + ")</a>" +
      '<button class="btn" data-act="toggle-done" data-id="' + l.id + '">' + (S.done[l.id] ? "הושלם ✓ (ביטול)" : "הבנתי, סיימתי את השיעור") + "</button>" +
      "</div>" +
      ((l.related || []).filter(function (r) { return L[r]; }).length ? '<div class="related"><span>שיעורים קשורים:</span>' + l.related.filter(function (r) { return L[r]; }).map(function (r) { return '<a href="#lesson-' + r + '">' + esc(L[r].code + " " + L[r].title) + "</a>"; }).join("") + "</div>" : "") +
      "</section>";
    html += '<div class="pager">' +
      (prev ? '<a class="btn btn-ghost" href="#lesson-' + prev.id + '">' + I.arrowR + esc(prev.code + " " + prev.title) + "</a>" : "<span></span>") +
      (next ? '<a class="btn btn-ghost" href="#lesson-' + next.id + '">' + esc(next.code + " " + next.title) + I.arrowL + "</a>" : "<span></span>") +
      "</div></div>";
    main.innerHTML = html;
    if (clozeOn()) applyCloze(true);
  }
  function quickRow(h, t) { return t ? '<div class="q-row"><h3>' + h + "</h3><p>" + esc(t) + "</p></div>" : ""; }
  function applyCloze(on) {
    main.querySelectorAll(".prose b").forEach(function (b) { b.classList.toggle("cloze", on); b.classList.remove("shown"); if (on) b.setAttribute("tabindex", "0"); else b.removeAttribute("tabindex"); });
    var rl = main.querySelector(".remember-list");
    if (rl) { rl.classList.toggle("hide", on); rl.querySelectorAll(".txt").forEach(function (t) { t.classList.remove("shown"); }); }
  }

  // enrichment lesson (old format)
  function viewLib(l) {
    var html = '<nav class="crumbs" aria-label="מיקום"><a href="#course">קורס</a><span aria-hidden="true">/</span><span>ספריית העשרה</span></nav>' +
      '<div class="enrich-banner"><b>שיעור העשרה, לא מחומר הקורס.</b> נכתב לפי הסילבוס הכללי של מלאכות בניין. ייתכנו הבדלים מהמצגת של המרצה; במקרה כזה, המצגת קובעת.</div>';
    html += '<header class="lesson-head"><div class="swatch">' + window.Diagrams.swatch(l.material) + '</div><div class="lh-main"><span class="eyebrow">העשרה ' + pad2(l.num) + "</span><h1>" + esc(l.title) + '</h1><p class="summary">' + esc(l.summary) + "</p></div></header>";
    html += '<div class="lesson-body">';
    var ctx = { code: "ה" + l.num };
    (l.sections || []).forEach(function (s, i) {
      html += '<section class="block"><h2><span class="sn">' + l.num + "." + (i + 1) + "</span>" + esc(s.title) + '</h2><div class="prose">' + (s.body || []).map(wrapP).join("") + "</div></section>";
      if (i === 1) (l.diagrams || []).forEach(function (d) { html += '<section class="block">' + renderBlock({ k: "diagram", id: d }, ctx) + "</section>"; });
    });
    html += '<section class="block"><h2>נקודות לזכור</h2><ul class="remember-list">' + (l.remember || []).map(function (r, i) { return '<li><span class="box">' + (i + 1) + '</span><span class="txt">' + esc(r) + "</span></li>"; }).join("") + "</ul></section>";
    html += '<section class="block"><h2>מונחים</h2><dl class="terms-grid">' + (l.terms || []).map(function (t) { return '<div class="term"><dt>' + esc(t.term) + "</dt><dd>" + esc(t.def) + "</dd></div>"; }).join("") + "</dl></section>";
    html += '<section class="practice"><h2>תרגול</h2><div class="btn-row">' +
      '<button class="btn btn-primary" data-act="start-lesson" data-id="' + l.id + '">בוחן העשרה (' + lessonQs(l.id).length + ")</button>" +
      '<a class="btn" href="#review-' + l.id + '">כרטיסיות</a>' +
      '<button class="btn" data-act="toggle-read" data-id="' + l.id + '">' + (S.read[l.id] ? "נקרא ✓" : "סימון כנקרא") + "</button></div></section></div>";
    main.innerHTML = html;
  }

  // =============================================================== practice hub
  var cfg = { scope: "mixed", diff: 0, types: {}, count: 15, enrich: false };
  function viewPracticeHub(tab) {
    var tabs = [["practice", "תרגול"], ["exams", "מבחנים"], ["cards", "כרטיסיות"]];
    var html = '<div class="page-head"><h1 class="display">תרגול ומבחנים</h1></div><div class="seg-tabs wide" role="tablist">' + tabs.map(function (t) {
      return '<a role="tab" href="#' + t[0] + '" aria-selected="' + (tab === t[0]) + '">' + t[1] + (t[0] === "cards" && dailyQueueSize() ? ' <i class="badge">' + dailyQueueSize() + "</i>" : "") + "</a>";
    }).join("") + "</div>";
    if (tab === "practice") html += practicePanel();
    else if (tab === "exams") html += examsPanel();
    else html += cardsPanel();
    main.innerHTML = html;
  }
  function practicePanel() {
    var mistakesN = Object.keys(S.mistakes).filter(function (k) { return Q[k] && (cfg.enrich || Q[k].scope === "course"); }).length;
    var opts = '<option value="mixed"' + (cfg.scope === "mixed" ? " selected" : "") + ">תרגול מעורב מכל הקורס</option>" +
      '<option value="weak"' + (cfg.scope === "weak" ? " selected" : "") + ">נושאים חלשים</option>" +
      '<option value="mistakes"' + (cfg.scope === "mistakes" ? " selected" : "") + ">שאלות שטעיתי בהן (" + mistakesN + ")</option>" +
      CH.map(function (c) { return '<option value="ch:' + c.id + '"' + (cfg.scope === "ch:" + c.id ? " selected" : "") + ">פרק " + esc(c.letter) + ": " + esc(c.title) + "</option>"; }).join("") +
      LESSONS.map(function (l) { return '<option value="l:' + l.id + '"' + (cfg.scope === "l:" + l.id ? " selected" : "") + ">שיעור " + esc(l.code) + ": " + esc(l.title) + "</option>"; }).join("");
    var types = Object.keys(TYPE_NAME);
    return '<div class="panel setup"><p class="muted">במצב תרגול רואים משוב והסבר מיד אחרי כל תשובה.</p>' +
      '<div class="field"><label for="p-scope">מה לתרגל</label><select class="select" id="p-scope">' + opts + "</select></div>" +
      '<div class="field"><span class="lbl" id="p-diff-l">רמת קושי</span><div class="seg" role="group" aria-labelledby="p-diff-l">' +
      [[0, "הכול"], [1, "קל"], [2, "בינוני"], [3, "קשה"]].map(function (d) { return '<button data-act="p-diff" data-n="' + d[0] + '" aria-pressed="' + (cfg.diff === d[0]) + '">' + d[1] + "</button>"; }).join("") + "</div></div>" +
      '<div class="field"><span class="lbl" id="p-types-l">סוגי שאלות</span><div class="seg" role="group" aria-labelledby="p-types-l">' +
      types.map(function (t) { return '<button data-act="p-type" data-t="' + t + '" aria-pressed="' + (!!cfg.types[t]) + '">' + TYPE_NAME[t] + "</button>"; }).join("") +
      '</div><small class="muted">בלי בחירה, כל הסוגים נכללים.</small></div>' +
      '<div class="field"><span class="lbl" id="p-count-l">מספר שאלות</span><div class="seg" role="group" aria-labelledby="p-count-l">' +
      [10, 15, 25, 0].map(function (n) { return '<button data-act="p-count" data-n="' + n + '" aria-pressed="' + (cfg.count === n) + '">' + (n || "כולן") + "</button>"; }).join("") + "</div></div>" +
      '<label class="check"><input type="checkbox" id="p-enrich"' + (cfg.enrich ? " checked" : "") + "> לכלול גם שאלות מספריית ההעשרה (לא מחומר הקורס)</label>" +
      '<div class="btn-row"><button class="btn btn-primary" data-act="p-start">להתחיל תרגול</button></div></div>';
  }
  function poolFor(scope, opts) {
    opts = opts || {};
    var pool = QUESTIONS.filter(function (q) { return opts.enrich || q.scope === "course"; });
    if (scope === "weak") {
      var weak = LESSONS.slice().sort(function (a, b) { return mastery(a.id) - mastery(b.id); }).slice(0, 3).map(function (l) { return l.id; });
      pool = pool.filter(function (q) { return weak.indexOf(q.lesson) !== -1 || S.mistakes[q.id]; });
    } else if (scope === "mistakes") pool = pool.filter(function (q) { return S.mistakes[q.id]; });
    else if (scope.indexOf("ch:") === 0) pool = pool.filter(function (q) { return q.chapter === scope.slice(3); });
    else if (scope.indexOf("l:") === 0) pool = pool.filter(function (q) { return q.lesson === scope.slice(2); });
    if (opts.diff) pool = pool.filter(function (q) { return q.difficulty === opts.diff; });
    var tsel = Object.keys(opts.types || {}).filter(function (t) { return opts.types[t]; });
    if (tsel.length) pool = pool.filter(function (q) { return tsel.indexOf(q.type) !== -1; });
    if (opts.auto) pool = pool.filter(function (q) { return AUTO_TYPES[q.type]; });
    return pool;
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
    run = Object.assign({ mode: mode, title: title, back: back || "#practice", i: 0, t0: Date.now(), items: list.map(function (q) { return newItem(q); }) }, extra || {});
    go("#run");
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

  // =============================================================== exams
  function examsPanel() {
    var html = '<div class="panel stack"><p>במבחן אין משוב בזמן הפתרון. רואים את הציון, ניתוח הטעויות וההמלצות בסוף. שאלות פתוחות לא נכללות במבחן, ומופיעות בתרגול.</p>' +
      '<div class="exam-grid">' +
      '<button class="exam-card main" data-act="exam-full"><b>מבחן כולל</b><span>30 שאלות מכל הפרקים · 45 דקות</span></button>' +
      CH.map(function (c) {
        var n = Math.min(15, poolFor("ch:" + c.id, { auto: true }).length);
        return '<button class="exam-card" data-act="exam-ch" data-id="' + c.id + '"' + (n ? "" : " disabled") + "><b>פרק " + esc(c.letter) + ": " + esc(c.title) + "</b><span>" + n + " שאלות · " + Math.ceil(n * 1.5) + " דקות</span></button>";
      }).join("") + "</div></div>";
    html += '<div class="section-head"><h2>היסטוריית מבחנים</h2></div>';
    html += S.exams.length ? '<div class="tbl-scroll panel"><table class="hist"><thead><tr><th scope="col">תאריך</th><th scope="col">מבחן</th><th scope="col">ציון</th><th scope="col">זמן</th></tr></thead><tbody>' +
      S.exams.slice(0, 20).map(function (e) { return "<tr><td>" + fmtDate(e.t) + "</td><td>" + esc(e.title) + '</td><td class="mono">' + e.score + '%</td><td class="mono">' + fmtDur(e.dur) + "</td></tr>"; }).join("") + "</tbody></table></div>"
      : '<p class="muted">עדיין אין מבחנים שמורים.</p>';
    return html;
  }
  function startExam(title, list, minutes, meta) {
    startRun("exam", title, list, "#exams", Object.assign({ limit: minutes * 60 }, meta));
  }

  // =============================================================== cards (spaced repetition)
  function cardsPanel() {
    var due = dueCards().length, nw = pickNew(newLeftToday()).length;
    return '<div class="panel stack"><p>כרטיסיות חוזרות בדיוק כשמתחילים לשכוח אותן. כרטיסיות חדשות של שיעור נפתחות לחזרה היומית כשמתחילים ללמוד אותו, עד ' + NEW_PER_DAY + " חדשות ביום.</p>" +
      '<div class="btn-row"><a class="btn btn-primary" href="#review">חזרה יומית (' + (due + nw) + ")</a></div>" +
      '<div class="muted">' + due + " לחזרה חוזרת · " + nw + " חדשות</div></div>" +
      '<div class="section-head"><h2>לפי פרק</h2></div><div class="bars panel">' + CH.map(function (c) {
        var cs = CARDS.filter(function (x) { return L[x.lesson] && L[x.lesson].ch === c; });
        var learned = cs.filter(function (x) { var st = S.cards[x.id]; return st && st.reps > 0; }).length;
        var p = pct(cs.length ? learned / cs.length : 0);
        return '<div class="bar-row"><a href="#review-ch-' + c.id + '">פרק ' + esc(c.letter) + ": " + esc(c.title) + "</a>" + tape(p, true) + '<span class="mono">' + learned + "/" + cs.length + "</span></div>";
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
    return { key: arg || "daily", lesson: lid, pool: pool, title: title, queue: queue.map(function (c) { return c.id; }), i: 0, flipped: false, total: queue.length, done: 0, again: 0, cram: false };
  }
  function viewReview(arg) {
    var key = arg || "daily";
    if (!rev || rev.key !== key) rev = buildReview(arg);
    var r = rev;
    if (!r.queue.length || r.i >= r.queue.length) { viewReviewDone(r); return; }
    var c = CARD[r.queue[r.i]], st = S.cards[c.id], left = r.queue.length - r.i;
    var from = L[c.lesson] ? "שיעור " + L[c.lesson].code : "העשרה";
    var html = '<div class="study-wrap"><div class="study-top"><div><span class="eyebrow">' + (r.cram ? "תרגול חופשי, לא משנה את לוח החזרות" : (st ? "חזרה" : "כרטיסייה חדשה")) + "</span><h1>" + esc(r.title) + '</h1></div><span class="counter">' + left + " נותרו</span></div>" +
      tape(pct(r.done / Math.max(1, r.done + left)), true) +
      '<div class="flash' + (r.flipped ? " flipped" : "") + '" id="flash" data-act="flip" role="button" tabindex="0" aria-label="להפוך את הכרטיסייה"><div class="flash-in">' +
      '<div class="face front"><div class="kind"><span>' + (c.kind === "term" ? "מונח: מה זה?" : "שאלה") + "</span><span>" + esc(from) + '</span></div><div class="q">' + esc(c.front) + '</div><div class="hint">נסו לענות בראש, ואז הקישו להפוך</div></div>' +
      '<div class="face back"><div class="kind"><span>תשובה</span><span>' + esc(from) + '</span></div><div class="a"><span class="qsmall">' + esc(c.front) + "</span>" + esc(c.back) + (c.src ? '<div class="blk-meta">' + srcChips(c.src) + "</div>" : "") + "</div></div>" +
      "</div></div>";
    if (r.flipped) {
      html += '<div class="rate" role="group" aria-label="כמה טוב זכרתם?">' +
        '<button class="btn again" data-act="rate" data-r="again">לא זכרתי<small>' + (r.cram ? "שוב" : ivlLabel(st, "again")) + "</small></button>" +
        '<button class="btn" data-act="rate" data-r="hard">בקושי<small>' + (r.cram ? "הבא" : ivlLabel(st, "hard")) + "</small></button>" +
        '<button class="btn btn-primary" data-act="rate" data-r="good">זכרתי<small>' + (r.cram ? "הבא" : ivlLabel(st, "good")) + "</small></button>" +
        '<button class="btn easy" data-act="rate" data-r="easy">קל<small>' + (r.cram ? "הבא" : ivlLabel(st, "easy")) + "</small></button>" +
        '</div><p class="keys-hint">מקלדת: <span class="kbd">1</span>–<span class="kbd">4</span> לדירוג</p>';
    } else html += '<button class="btn btn-primary" data-act="flip" style="width:100%">להציג תשובה</button><p class="keys-hint">מקלדת: <span class="kbd">רווח</span> להפוך</p>';
    main.innerHTML = html + "</div>";
  }
  function viewReviewDone(r) {
    var html = '<div class="study-wrap"><div class="empty">' + I.level;
    if (r.total === 0) {
      html += "<b>אין כרטיסיות שממתינות עכשיו</b>";
      if (r.pool && r.pool.length) html += "<p>כל הכרטיסיות כאן מתוזמנות לימים הבאים. אפשר לעבור עליהן בתרגול חופשי, בלי לשנות את לוח החזרות.</p><div class=\"btn-row\"><button class=\"btn btn-primary\" data-act=\"cram\">תרגול חופשי</button><a class=\"btn\" href=\"#cards\">חזרה</a></div>";
      else html += "<p>כרטיסיות של שיעור נכנסות לחזרה היומית כשמתחילים ללמוד אותו. פתחו שיעור כדי להתחיל.</p><div class=\"btn-row\"><a class=\"btn btn-primary\" href=\"#course\">לתוכן הקורס</a></div>";
    } else {
      html += "<b>סיימתם את הסבב</b><p>עברתם על " + plural(r.done, "כרטיסייה אחת", "כרטיסיות") + (r.again ? ", ו-" + plural(r.again, "אחת חזרה", "חזרו") + " לסבב נוסף" : "") + ". הן יחזרו בדיוק כשמתחילים לשכוח אותן.</p><div class=\"btn-row\"><a class=\"btn btn-primary\" href=\"#home\">לדף הבית</a><a class=\"btn\" href=\"#practice\">לתרגול שאלות</a></div>";
    }
    main.innerHTML = html + "</div></div>";
  }
  function flip() {
    if (!rev) return;
    rev.flipped = !rev.flipped;
    var f = document.getElementById("flash");
    if (f && rev.flipped) { f.classList.add("flipped"); setTimeout(function () { viewReview(rev.key === "daily" ? "" : rev.key); var b = main.querySelector('[data-r="good"]'); if (b) b.focus({ preventScroll: true }); }, 260); }
    else viewReview(rev.key === "daily" ? "" : rev.key);
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
    if (grade === "again") { r.again++; r.queue.splice(Math.min(r.queue.length, r.i + 4), 0, id); } else r.done++;
    r.i++; r.flipped = false;
    save(); viewReview(r.key === "daily" ? "" : r.key); updateBadge();
  }

  // =============================================================== question runner (practice & exam)
  var LETTERS = ["א", "ב", "ג", "ד"];
  function viewRun() {
    if (!run) { go("#practice"); return; }
    if (run.finished) { viewResult(); return; }
    var it = run.items[run.i], q = Q[it.id];
    var exam = run.mode === "exam";
    var l = L[q.lesson], from = l ? "שיעור " + l.code + " · " + l.title : "העשרה: " + (LIBID[q.lesson] ? LIBID[q.lesson].title : "");
    var html = '<div class="study-wrap"><div class="study-top"><div><span class="eyebrow">' + (exam ? "מבחן · " : "") + "שאלה " + (run.i + 1) + " מתוך " + run.items.length + "</span><h1>" + esc(run.title) + "</h1></div>" +
      '<div class="row">' + (exam ? '<span class="timer mono" id="timer" aria-live="off">' + fmtDur(run.limit - (Date.now() - run.t0) / 1000) + "</span>" : "") + '<button class="btn btn-ghost btn-sm" data-act="run-exit">יציאה</button></div></div>' +
      tape(pct(run.i / run.items.length), true);
    html += '<div class="q-card"><div class="from"><span>' + esc(from) + '</span><span class="qtype">' + TYPE_NAME[q.type] + " · " + ["", "קל", "בינוני", "קשה"][q.difficulty || 2] + (q.enrich ? " · העשרה" : "") + "</span></div>";
    html += renderQuestion(q, it, exam);
    html += "</div>";
    // navigation
    var last = run.i === run.items.length - 1;
    if (exam) {
      html += '<div class="btn-row run-nav">' + (run.i > 0 ? '<button class="btn btn-ghost" data-act="q-prev">' + I.arrowR + "הקודמת</button>" : "") +
        (last ? '<button class="btn btn-primary" data-act="exam-submit">הגשת המבחן</button>' : '<button class="btn btn-primary" data-act="q-next">הבאה' + I.arrowL + "</button>") + "</div>" +
        '<div class="dots" aria-label="מעבר בין שאלות">' + run.items.map(function (x, k) { return '<button class="dot' + (k === run.i ? " cur" : "") + (answeredExam(x) ? " ans" : "") + '" data-act="q-jump" data-k="' + k + '" aria-label="שאלה ' + (k + 1) + '">' + (k + 1) + "</button>"; }).join("") + "</div>";
    } else if (it.done) {
      html += '<button class="btn btn-primary" data-act="q-next" id="next-q">' + (last ? "לסיכום" : "לשאלה הבאה") + I.arrowL + "</button>";
    }
    html += '<p class="keys-hint">מקלדת: <span class="kbd">1</span>–<span class="kbd">4</span> לבחירה, <span class="kbd">Enter</span> להמשך</p></div>';
    main.innerHTML = html;
    if (exam) startTimer();
    if (it.done && !exam) { var nb = document.getElementById("next-q"); if (nb) nb.focus({ preventScroll: true }); }
  }
  function answeredExam(it) {
    var q = Q[it.id];
    if (q.type === "match") return Object.keys(it.map).length === q.pairs.length;
    if (q.type === "cloze") return it.fill.every(function (x) { return x !== null; });
    if (q.type === "order") return it.picked.length === q.steps.length;
    return it.choice !== undefined && it.choice !== null;
  }
  var timerInt = null;
  function startTimer() {
    clearInterval(timerInt);
    timerInt = setInterval(function () {
      if (!run || run.mode !== "exam" || run.finished || route() !== "run") { clearInterval(timerInt); return; }
      var left = run.limit - (Date.now() - run.t0) / 1000;
      var t = document.getElementById("timer");
      if (t) { t.textContent = fmtDur(left); t.classList.toggle("low", left < 120); }
      if (left <= 0) { clearInterval(timerInt); toast("הזמן נגמר. המבחן הוגש."); submitExam(); }
    }, 1000);
  }
  function renderQuestion(q, it, exam) {
    var show = !exam && it.done;
    var h = "";
    if (q.type === "identify") h += '<figure class="dg"><div class="dg-scroll">' + window.Diagrams.render(q.diagram, { marker: q.marker }) + '</div><figcaption><span class="illus">המחשה לימודית</span></figcaption></figure>';
    if (q.type === "cloze") {
      var n = 0;
      h += '<div class="qq cloze-text">' + esc(q.text).replace(/\{\{[^}]+\}\}/g, function () {
        var k = n++, w = it.fill[k], cls = "blank" + (w ? " filled" : "");
        if (show) { var ans = clozeAnswers(q)[k]; cls += w === ans ? " right" : " wrong"; }
        return '<button class="' + cls + '" data-act="cloze-clear" data-k="' + k + '"' + (show ? " disabled" : "") + ">" + (w ? esc(w) : "&nbsp;") + "</button>";
      }) + "</div>";
      if (!show) h += '<div class="pool">' + it.bank.map(function (w, i) { var used = it.fill.indexOf(w) !== -1 && countIn(it.fill, w) >= countIn(it.bank.slice(0, i + 1), w); return used ? "" : '<button data-act="cloze-pick" data-i="' + i + '">' + esc(w) + "</button>"; }).join("") + "</div>";
      else h += feedback(q, it, "התשובות: " + clozeAnswers(q).join(" · "));
      if (!exam && !it.done) h += '<button class="btn btn-primary" data-act="q-check"' + (it.fill.every(function (x) { return x !== null; }) ? "" : " disabled") + ">בדיקה</button>";
      return h;
    }
    h += '<div class="qq">' + esc(q.q) + "</div>";
    if (q.type === "mcq" || q.type === "compare" || q.type === "scenario" || q.type === "identify" || q.type === "tf") {
      var opts = q.type === "tf" ? ["נכון", "לא נכון"] : q.options;
      var right = q.type === "tf" ? (q.answer ? 0 : 1) : q.answer;
      h += '<div class="opts' + (q.type === "tf" ? " tf" : "") + '" role="group" aria-label="תשובות">';
      it.perm.forEach(function (oi, k) {
        var cls = "opt";
        if (show) cls += oi === right ? " right" : k === it.choice ? " wrong" : " dim";
        else if (exam && it.choice === k) cls += " picked";
        h += '<button class="' + cls + '" data-act="answer" data-k="' + k + '"' + (show ? " disabled" : "") + ' aria-pressed="' + (it.choice === k) + '"><span class="l">' + LETTERS[k] + "</span><span>" + esc(opts[oi]) + "</span></button>";
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
        return '<button class="' + cls + '" data-act="m-term" data-i="' + i + '"' + (show ? " disabled" : "") + ">" + (d !== undefined ? '<i class="pair-n">' + (i + 1) + "</i>" : "") + esc(p[0]) + "</button>";
      }).join("") + "</div>";
      h += '<div class="m-col">' + it.defs.map(function (di) {
        var owner = Object.keys(it.map).filter(function (k) { return it.map[k] === di; })[0];
        var cls = "m-item def" + (owner !== undefined ? " paired" : "");
        return '<button class="' + cls + '" data-act="m-def" data-i="' + di + '"' + (show ? " disabled" : "") + ">" + (owner !== undefined ? '<i class="pair-n">' + (+owner + 1) + "</i>" : "") + esc(q.pairs[di][1]) + "</button>";
      }).join("") + "</div></div>";
      if (show) h += feedback(q, it, q.pairs.map(function (p) { return p[0] + " ← " + p[1]; }).join(" · "));
      if (!exam && !it.done) h += '<button class="btn btn-primary" data-act="q-check"' + (Object.keys(it.map).length === q.pairs.length ? "" : " disabled") + ">בדיקה</button>";
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
      if (!exam && !it.done) h += '<button class="btn btn-primary" data-act="q-check"' + (it.picked.length === q.steps.length ? "" : " disabled") + ">בדיקה</button>";
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
  function countIn(a, w) { return a.filter(function (x) { return x === w; }).length; }
  function feedback(q, it, correctLine) {
    var ok = it.score === 1;
    return '<div class="explain" role="status"><b class="' + (ok ? "res-ok" : "res-bad") + '">' + (ok ? "נכון." : it.score > 0 ? "חלקית (" + pct(it.score) + "%)." : "לא נכון.") + "</b>" +
      (!ok && correctLine ? '<span class="corr">' + esc(correctLine) + "</span>" : "") + "<span>" + esc(q.explain || "") + "</span>" +
      (q.src ? '<div class="blk-meta">מקור: ' + srcChips(q.src) + "</div>" : q.enrich ? '<div class="blk-meta">שאלת העשרה, לא מחומר הקורס</div>' : "") + "</div>";
  }
  function grade(q, it) {
    if (q.type === "tf") return it.perm[it.choice] === (q.answer ? 0 : 1) ? 1 : 0;
    if (q.options) return it.perm[it.choice] === q.answer ? 1 : 0;
    if (q.type === "match") return q.pairs.filter(function (_, i) { return it.map[i] === i; }).length / q.pairs.length;
    if (q.type === "cloze") { var a = clozeAnswers(q); return a.filter(function (w, i) { return it.fill[i] === w; }).length / a.length; }
    if (q.type === "order") return it.picked.filter(function (si, i) { return si === i; }).length / q.steps.length;
    return it.score || 0;
  }
  function record(q, score) {
    var s = S.qstats[q.id] || { r: 0, w: 0 };
    if (score === 1) s.r++; else s.w++;
    s.last = score === 1 ? 1 : 0; s.t = Date.now(); s.type = q.type;
    S.qstats[q.id] = s;
    if (score === 1) delete S.mistakes[q.id]; else S.mistakes[q.id] = Date.now();
    touchDay();
  }
  function settle(it) {
    var q = Q[it.id];
    it.score = grade(q, it); it.done = true;
    record(q, it.score); save();
  }
  function submitExam() {
    if (!run || run.finished) return;
    clearInterval(timerInt);
    run.items.forEach(function (it) { var q = Q[it.id]; if (!answeredExam(it)) { it.score = 0; it.done = true; record(q, 0); } else settle(it); });
    finishRun();
  }
  function finishRun() {
    run.finished = true; run.dur = (Date.now() - run.t0) / 1000;
    var sc = pct(avg(run.items.map(function (it) { return it.score || 0; })));
    run.scorePct = sc;
    if (run.mode === "exam") {
      var byType = {}, byLesson = {};
      run.items.forEach(function (it) { var q = Q[it.id]; (byType[q.type] = byType[q.type] || []).push(it.score || 0); (byLesson[q.lesson] = byLesson[q.lesson] || []).push(it.score || 0); });
      var bt = {}; Object.keys(byType).forEach(function (k) { bt[k] = pct(avg(byType[k])); });
      var bl = {}; Object.keys(byLesson).forEach(function (k) { bl[k] = pct(avg(byLesson[k])); });
      S.exams.unshift({ id: "e" + Date.now(), t: Date.now(), title: run.title, kind: run.kind || "", chapter: run.chapter || "", n: run.items.length, score: sc, dur: run.dur, byType: bt, byLesson: bl });
      S.exams = S.exams.slice(0, 60);
    }
    save();
    viewResult(); window.scrollTo(0, 0);
  }
  function viewResult() {
    var items = run.items, sc = run.scorePct;
    var wrong = items.filter(function (it) { return it.score !== 1; });
    var byLesson = {}, byType = {};
    items.forEach(function (it) { var q = Q[it.id]; (byLesson[q.lesson] = byLesson[q.lesson] || []).push(it.score || 0); (byType[q.type] = byType[q.type] || []).push(it.score || 0); });
    var weakL = Object.keys(byLesson).filter(function (k) { return avg(byLesson[k]) < 0.7; });
    var verdict = sc >= 85 ? "מצוין. החומר יושב טוב." : sc >= 65 ? "טוב. עברו על ההסברים של השאלות שטעיתם בהן." : "יש עוד מה לחזק. חזרו לשיעורים שמופיעים בהמלצות, ואז נסו שוב.";
    var html = '<div class="study-wrap"><div class="study-top"><div><span class="eyebrow">' + (run.mode === "exam" ? "תוצאות מבחן" : "סיכום תרגול") + "</span><h1>" + esc(run.title) + "</h1></div></div>" +
      '<div class="panel stack"><div class="row" style="align-items:flex-end"><span class="score-big">' + sc + '</span><span style="font-size:2rem;font-weight:800">%</span><span class="spacer"></span><span class="muted">' + (items.length - wrong.length) + " נכונות מתוך " + items.length + " · " + fmtDur(run.dur) + " דקות</span></div>" + tape(sc) + "<p>" + verdict + "</p></div>";
    if (Object.keys(byLesson).length > 1) {
      html += '<div class="panel stack"><b>לפי שיעור</b><div class="bars">' + Object.keys(byLesson).map(function (k) {
        var p = pct(avg(byLesson[k])); return '<div class="bar-row"><a href="' + lessonHref(k) + '">' + esc(lessonTitle(k)) + "</a>" + tape(p, true) + '<span class="mono">' + p + "%</span></div>";
      }).join("") + "</div></div>";
    }
    if (Object.keys(byType).length > 1) {
      html += '<div class="panel stack"><b>לפי סוג שאלה</b><div class="bars">' + Object.keys(byType).map(function (k) {
        var p = pct(avg(byType[k])); return '<div class="bar-row"><span>' + TYPE_NAME[k] + "</span>" + tape(p, true) + '<span class="mono">' + p + "%</span></div>";
      }).join("") + "</div></div>";
    }
    if (weakL.length) html += '<div class="panel stack"><b>המלצות</b><ul>' + weakL.map(function (k) { return '<li>לחזור על <a href="' + lessonHref(k) + '">' + esc(lessonTitle(k)) + "</a> ולתרגל אותו שוב.</li>"; }).join("") + "</ul></div>";
    html += '<div class="btn-row">' + (wrong.length ? '<button class="btn btn-primary" data-act="retry-wrong">לתרגל שוב את ' + plural(wrong.length, "הטעות", "הטעויות") + "</button>" : "") +
      '<a class="btn btn-ghost" href="' + run.back + '">חזרה</a></div>';
    if (wrong.length) {
      html += '<div class="section-head"><h2>ניתוח טעויות</h2></div><div class="result-list">' + wrong.map(function (it) {
        var q = Q[it.id];
        return '<div class="result-item"><span class="qtype">' + TYPE_NAME[q.type] + " · " + esc(lessonTitle(q.lesson)) + '</span><span class="qq">' + esc(q.q || stripTags(q.text || "").replace(/\{\{([^}]+)\}\}/g, "___")) + "</span>" +
          (yourAnswer(q, it) ? '<span class="ans-bad">ענית: ' + esc(yourAnswer(q, it)) + "</span>" : "") + '<span class="ans-ok">' + esc(rightAnswer(q)) + '</span><span class="muted">' + esc(q.explain || "") + "</span>" + (q.src ? '<div class="blk-meta">' + srcChips(q.src) + "</div>" : "") + "</div>";
      }).join("") + "</div>";
    }
    main.innerHTML = html + "</div>";
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
    main.innerHTML = '<div class="page-head"><span class="eyebrow">' + TERMS.filter(function (t) { return !t.enrich; }).length + " מונחים מהקורס · " + TERMS.filter(function (t) { return t.enrich; }).length + ' מונחי העשרה</span><h1 class="display">מילון מונחים</h1></div>' +
      '<div class="search-row"><label class="sr-only" for="g-search">חיפוש מונח</label><input class="input" id="g-search" type="search" placeholder="חיפוש בעברית או באנגלית, למשל: קורה סמויה, HIDDEN BEAM" value="' + esc(gl.q) + '" autocomplete="off"></div>' +
      '<div class="seg" role="group" aria-label="סינון לפי פרק">' + chips.map(function (c) { return '<button data-act="g-ch" data-v="' + c[0] + '" aria-pressed="' + (gl.ch === c[0]) + '">' + esc(c[1]) + "</button>"; }).join("") + "</div>" +
      '<div id="g-out" class="g-out"></div>';
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
    out.innerHTML = list.length ? '<div class="gl-list">' + list.map(function (t) {
      var l = L[t.lesson];
      var open = gl.open[t.id];
      return '<article class="gl-item' + (t.enrich ? " enrich" : "") + '"><div class="gl-head"><span class="t">' + hl(t.he, gl.q.trim()) + "</span>" + (t.en ? '<span class="en" dir="ltr">' + hl(t.en, gl.q.trim()) + "</span>" : "") + "</div>" +
        '<span class="d">' + hl(t.def, gl.q.trim()) + "</span>" +
        (t.simple ? '<span class="simple"><b>בפשטות:</b> ' + esc(t.simple) + "</span>" : "") +
        ((t.related || []).length ? '<button class="linkish" data-act="g-open" data-id="' + t.id + '" aria-expanded="' + !!open + '">מונחים דומים וההבדל (' + t.related.length + ")</button>" +
          (open ? '<ul class="rel">' + t.related.map(function (r) { return "<li><b>" + esc(r.he) + ":</b> " + esc(r.diff) + "</li>"; }).join("") + "</ul>" : "") : "") +
        '<div class="gl-meta">' + (l ? '<a href="#lesson-' + l.id + '">' + esc(l.code + " " + l.title) + "</a>" : t.lib ? '<a href="#lib-' + t.lesson + '">העשרה: ' + esc(LIBID[t.lesson].title) + "</a>" : "") + (t.src ? srcChips(t.src) : "") + (t.enrich ? '<span class="tag-expl">העשרה</span>' : "") + "</div></article>";
    }).join("") + "</div>" : '<p class="muted">לא נמצאו מונחים. נסו מילה אחרת, או חפשו בכל החומר דרך <a href="#search">החיפוש</a>.</p>';
  }

  // =============================================================== search
  var sq = "";
  function viewSearch() {
    main.innerHTML = '<div class="page-head"><h1 class="display">חיפוש בכל החומר</h1><p class="muted">שיעורים, מונחים ועמודי המקור.</p></div>' +
      '<div class="search-row"><label class="sr-only" for="s-search">חיפוש</label><input class="input" id="s-search" type="search" placeholder="למשל: שיני קשר, ONE-WAY, כלונס, דיפון" value="' + esc(sq) + '" autocomplete="off"></div>' +
      (ai.s ? '<form class="ai-ask panel" data-act="ai-search"><label for="ai-sq"><b>' + I.spark + ' שאלה חופשית על החומר</b></label><div class="row"><input class="input" id="ai-sq" placeholder="למשל: מתי משתמשים בקורה סמויה?" autocomplete="off"><button class="btn btn-primary btn-sm" type="submit">לשאול</button></div><div class="ai-out" id="ai-out" hidden aria-live="polite"></div></form>' : "") +
      '<div id="s-out"></div>';
    var inp = document.getElementById("s-search");
    inp.addEventListener("input", function () { sq = inp.value; renderSearch(); });
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
    if (q.length < 2) { out.innerHTML = '<p class="muted">הקלידו לפחות שתי אותיות.</p>'; return; }
    var hits = [];
    LESSONS.forEach(function (l) {
      if ((l.title + " " + (l.keywords || []).join(" ")).toLowerCase().indexOf(q.toLowerCase()) !== -1) hits.push({ w: "שיעור", href: "#lesson-" + l.id, t: l.code + " " + l.title, s: l.summary || "" });
      ["full", "deep"].forEach(function (lv) {
        (l[lv] || []).forEach(function (s, i) {
          (s.blocks || []).forEach(function (b) {
            var txt = stripTags(b.html || "") + (b.rows ? " " + b.rows.map(function (r) { return r.join(" "); }).join(" ") : "");
            var sn = snippet(txt, q);
            if (sn) hits.push({ w: l.code + " · " + s.title + (b.k === "expl" ? " · הסבר משלים" : ""), href: "#lesson-" + l.id, lv: lv, anchor: "s-" + lv + "-" + (i + 1), lesson: l.id, t: "", s: sn });
          });
        });
      });
    });
    var terms = TERMS.filter(function (t) { return (t.he + " " + (t.en || "") + " " + t.def).toLowerCase().indexOf(q.toLowerCase()) !== -1; });
    var srcs = SOURCES.map(function (s) { var txt = (s.title || "") + " " + (s.blocks || []).map(function (b) { return b.text; }).join(" ") + " " + (s.tables || []).map(function (t) { return (t.rows || []).map(function (r) { return r.join(" "); }).join(" "); }).join(" "); return { s: s, sn: snippet(txt, q) }; }).filter(function (x) { return x.sn; });
    var html = '<div class="section-head"><h2>בשיעורים</h2><span class="muted">' + hits.length + "</span></div>" +
      (hits.length ? '<div class="hits">' + hits.slice(0, 40).map(function (h) {
        return '<a class="hit" href="' + h.href + '"' + (h.anchor ? ' data-act="goto-level" data-lesson="' + h.lesson + '" data-lv="' + h.lv + '" data-target="' + h.anchor + '"' : "") + '><span class="w">' + esc(h.w) + "</span>" + (h.t ? "<b>" + esc(h.t) + "</b>" : "") + "<span>" + hl(h.s, q) + "</span></a>";
      }).join("") + "</div>" : '<p class="muted">לא נמצא בשיעורים.</p>');
    html += '<div class="section-head"><h2>מונחים</h2><span class="muted">' + terms.length + "</span></div>" +
      (terms.length ? '<div class="gl-list">' + terms.slice(0, 24).map(function (t) { return '<div class="gl-item' + (t.enrich ? " enrich" : "") + '"><div class="gl-head"><span class="t">' + hl(t.he, q) + "</span>" + (t.en ? '<span class="en" dir="ltr">' + hl(t.en, q) + "</span>" : "") + '</div><span class="d">' + hl(t.def, q) + "</span></div>"; }).join("") + "</div>" : '<p class="muted">לא נמצאו מונחים.</p>');
    html += '<div class="section-head"><h2>בעמודי המקור</h2><span class="muted">' + srcs.length + "</span></div>" +
      (srcs.length ? '<div class="hits">' + srcs.slice(0, 30).map(function (x) { return '<a class="hit" href="#source-' + x.s.id + '"><span class="w">' + esc(srcLabel(x.s.id)) + " · " + esc(x.s.title || "") + "</span><span>" + hl(x.sn, q) + "</span></a>"; }).join("") + "</div>" : '<p class="muted">לא נמצא בעמודי המקור.</p>');
    out.innerHTML = html;
  }

  // =============================================================== progress
  function viewProgress() {
    var cm = pct(courseMastery());
    var withData = LESSONS.filter(attemptedOrDone);
    var sorted = withData.slice().sort(function (a, b) { return mastery(b.id) - mastery(a.id); });
    var strong = sorted.slice(0, 3).filter(function (l) { return mastery(l.id) >= 0.6; });
    var weak = sorted.slice().reverse().slice(0, 3).filter(function (l) { return mastery(l.id) < 0.75; });
    var byType = {};
    Object.keys(S.qstats).forEach(function (id) { var s = S.qstats[id], q = Q[id]; if (!q) return; var t = q.type; byType[t] = byType[t] || { r: 0, n: 0 }; byType[t].r += s.r; byType[t].n += s.r + s.w; });
    var learned = CARDS.filter(function (c) { return c.scope === "course" && S.cards[c.id] && S.cards[c.id].reps > 0; }).length;
    var courseCards = CARDS.filter(function (c) { return c.scope === "course"; }).length;
    var recs = [];
    var nextL = LESSONS.filter(function (l) { return !S.done[l.id]; })[0];
    if (nextL) recs.push('להמשיך לשיעור <a href="#lesson-' + nextL.id + '">' + esc(nextL.code + " " + nextL.title) + "</a>.");
    weak.forEach(function (l) { recs.push('לחזק את <a href="#lesson-' + l.id + '">' + esc(l.code + " " + l.title) + "</a>: שליטה " + pct(mastery(l.id)) + "%."); });
    if (dailyQueueSize()) recs.push('לעבור על <a href="#review">' + dailyQueueSize() + " כרטיסיות</a> שממתינות לחזרה.");
    Object.keys(byType).forEach(function (t) { var p = byType[t].r / Math.max(1, byType[t].n); if (byType[t].n >= 4 && p < 0.6) recs.push("לתרגל עוד שאלות מסוג \"" + TYPE_NAME[t] + "\" (" + pct(p) + "% הצלחה)."); });
    if (!S.exams.length && LESSONS.filter(function (l) { return S.done[l.id]; }).length >= 3) recs.push('לנסות <a href="#exams">מבחן פרק</a> כדי לבדוק את עצמכם בתנאי בחינה.');

    var days = []; var d = new Date(); d.setDate(d.getDate() - 27);
    for (var i = 0; i < 28; i++) { days.push({ k: dayKey(d), n: S.days[dayKey(d)] || 0, wd: d.getDay() }); d.setDate(d.getDate() + 1); }
    var html = '<div class="page-head"><h1 class="display">התקדמות</h1></div>' +
      '<div class="stats wide">' +
      '<div class="stat"><span class="k">שליטה בקורס</span><span class="v">' + cm + "<small>%</small></span>" + tape(cm) + "</div>" +
      '<div class="stat"><span class="k">רצף ימי למידה</span><span class="v">' + streak() + '</span><div class="cal" aria-label="פעילות ב-28 הימים האחרונים">' + days.map(function (x) { return '<i class="' + (x.n ? (x.n > 20 ? "l3" : x.n > 6 ? "l2" : "l1") : "") + '" title="' + x.k + '"></i>'; }).join("") + "</div></div>" +
      '<div class="stat"><span class="k">כרטיסיות שנלמדו</span><span class="v">' + learned + "<small>/ " + courseCards + "</small></span>" + tape(pct(learned / Math.max(1, courseCards)), true) + "</div>" +
      '<div class="stat"><span class="k">מבחנים</span><span class="v">' + S.exams.length + '</span><span class="k">' + (S.exams[0] ? "אחרון: " + S.exams[0].score + "%" : "עדיין לא") + "</span></div></div>";
    html += '<div class="section-head"><h2>לפי פרקים</h2></div><div class="bars panel">' + CH.map(function (c) {
      var p = pct(chapterMastery(c)), done = c.lessons.filter(function (l) { return S.done[l.id]; }).length;
      return '<div class="bar-row"><a href="#course" data-act="open-chapter" data-id="' + c.id + '">פרק ' + esc(c.letter) + ": " + esc(c.title) + " (" + done + "/" + c.lessons.length + ")</a>" + tape(p, true) + '<span class="mono">' + p + "%</span></div>";
    }).join("") + "</div>";
    html += '<div class="two-col"><div><div class="section-head"><h2>נושאים חזקים</h2></div>' + (strong.length ? '<ul class="plain panel">' + strong.map(function (l) { return '<li><a href="#lesson-' + l.id + '">' + esc(l.code + " " + l.title) + '</a><span class="mono">' + pct(mastery(l.id)) + "%</span></li>"; }).join("") + "</ul>" : '<p class="muted panel">יופיעו כאן אחרי תרגול.</p>') +
      '</div><div><div class="section-head"><h2>נושאים לחיזוק</h2></div>' + (weak.length ? '<ul class="plain panel">' + weak.map(function (l) { return '<li><a href="#lesson-' + l.id + '">' + esc(l.code + " " + l.title) + '</a><span class="mono">' + pct(mastery(l.id)) + "%</span></li>"; }).join("") + "</ul>" : '<p class="muted panel">יופיעו כאן אחרי תרגול.</p>') + "</div></div>";
    html += '<div class="section-head"><h2>הצלחה לפי סוג שאלה</h2></div>' + (Object.keys(byType).length ? '<div class="bars panel">' + Object.keys(byType).map(function (t) {
      var p = pct(byType[t].r / Math.max(1, byType[t].n)); return '<div class="bar-row"><span>' + TYPE_NAME[t] + " (" + byType[t].n + ")</span>" + tape(p, true) + '<span class="mono">' + p + "%</span></div>";
    }).join("") + "</div>" : '<p class="muted panel">עדיין לא עניתם על שאלות.</p>');
    html += '<div class="section-head"><h2>היסטוריית מבחנים</h2></div>' + (S.exams.length ? '<div class="tbl-scroll panel"><table class="hist"><thead><tr><th scope="col">תאריך</th><th scope="col">מבחן</th><th scope="col">ציון</th><th scope="col">שאלות</th><th scope="col">זמן</th></tr></thead><tbody>' +
      S.exams.slice(0, 30).map(function (e) { return "<tr><td>" + fmtDate(e.t) + "</td><td>" + esc(e.title) + '</td><td class="mono">' + e.score + '%</td><td class="mono">' + e.n + '</td><td class="mono">' + fmtDur(e.dur) + "</td></tr>"; }).join("") + "</tbody></table></div>" : '<p class="muted panel">עדיין אין מבחנים.</p>');
    html += '<div class="section-head"><h2>המלצות למידה</h2></div>' + (recs.length ? '<ul class="recs panel">' + recs.map(function (r) { return "<li>" + r + "</li>"; }).join("") + "</ul>" : '<p class="muted panel">אין המלצות כרגע. כל הכבוד.</p>');
    html += footHtml();
    main.innerHTML = html;
  }

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
    var html = '<div class="page-head"><span class="eyebrow">' + SOURCES.length + ' עמודי מקור</span><h1 class="display">עמודי המקור ודוח כיסוי</h1>' +
      '<p class="muted">כל תמונה מההקלטות ששלחת, התמלול שלה, מה לא היה קריא, ובאילו שיעורים היא מופיעה.</p></div>' +
      '<div class="stats wide">' +
      '<div class="stat"><span class="k">פוענחו במלואן</span><span class="v">' + counts.full + "</span></div>" +
      '<div class="stat"><span class="k">פוענחו חלקית</span><span class="v">' + counts.partial + "</span></div>" +
      '<div class="stat"><span class="k">דורשות אימות</span><span class="v">' + counts.unclear + "</span></div>" +
      '<div class="stat"><span class="k">כפילויות (אותו שקף)</span><span class="v">' + dups + '</span><span class="k">' + unused + " ללא שיבוץ בשיעור</span></div></div>";
    html += '<div class="seg" role="group" aria-label="סינון">' + [["all", "הכול"]].concat(groups.map(function (g) { return [g, META.groups[g].name]; })).concat([["open", "רק פערים פתוחים"]]).map(function (f) {
      return '<button data-act="src-filter" data-v="' + f[0] + '" aria-pressed="' + (srcFilter === f[0]) + '">' + esc(f[1]) + "</button>";
    }).join("") + "</div>";
    html += '<div class="tbl-scroll panel"><table class="cov"><thead><tr><th scope="col">עמוד</th><th scope="col">כותרת</th><th scope="col">סטטוס</th><th scope="col">לא ברור</th><th scope="col">מופיע בשיעורים</th></tr></thead><tbody>' +
      list.map(function (s) {
        var st = STATUS[s.status] || ["?", "bad"], used = usedIn(s.id);
        return '<tr><th scope="row"><a href="#source-' + s.id + '">' + esc(srcLabel(s.id)) + "</a></th><td>" + esc(s.title || "(ללא כותרת)") + (s.duplicate_of ? '<small class="muted"> · כפילות של ' + esc(srcLabel(s.duplicate_of)) + "</small>" : "") + '</td><td><span class="st st-' + st[1] + '">' + st[0] + '</span></td><td class="mono">' + (s.unclear || []).length + "</td><td>" +
          (used.length ? used.map(function (l) { return '<a href="#lesson-' + l.id + '">' + esc(l.code) + "</a>"; }).join(" ") : s.duplicate_of ? '<span class="muted">דרך ' + esc(srcLabel(s.duplicate_of)) + "</span>" : s.no_content ? '<span class="muted">' + esc(s.no_content) + "</span>" : '<span class="st st-bad">לא שובץ</span>') + "</td></tr>";
      }).join("") + "</tbody></table></div>";
    main.innerHTML = html;
  }
  function viewSource(s) {
    var i = SOURCES.indexOf(s), prev = SOURCES[i - 1], next = SOURCES[i + 1];
    var st = STATUS[s.status] || ["?", "bad"], used = usedIn(s.id);
    var html = '<nav class="crumbs" aria-label="מיקום"><a href="#sources">עמודי המקור</a><span aria-hidden="true">/</span><span>' + esc(srcLabel(s.id)) + "</span></nav>" +
      '<div class="page-head"><span class="eyebrow">' + esc(((META.groups || {})[s.id.split("-")[0]] || {}).name || "") + ' · <span class="st st-' + st[1] + '">' + st[0] + "</span></span><h1>" + esc(s.title || "(ללא כותרת)") + "</h1></div>" +
      '<div class="src-view"><figure class="src-full"><button class="zoom" data-act="zoom" aria-label="הגדלה"><img src="' + IMG_BASE + esc(s.id) + '.jpg" alt="' + esc(s.title || "עמוד מקור") + '" data-act="imgfail"></button><figcaption class="muted">הקישו על התמונה להגדלה.</figcaption></figure>' +
      '<div class="src-text"><h2>תמלול</h2>' + transcriptHtml(s) +
      ((s.unclear || []).length ? '<h2>מה לא קריא</h2><ul class="unclear-list">' + s.unclear.map(function (u) { return "<li><b>" + esc(u.where || "") + ":</b> " + esc(u.best_reading || "") + ((u.alternatives || []).length ? ' <span class="muted">(או: ' + esc(u.alternatives.join(" / ")) + ")</span>" : "") + "</li>"; }).join("") + "</ul>" : "") +
      (s.notes ? '<h2>הערות התמלול</h2><p class="muted">' + esc(s.notes) + "</p>" : "") +
      '<h2>מופיע בשיעורים</h2>' + (used.length ? '<ul class="plain">' + used.map(function (l) { return '<li><a href="#lesson-' + l.id + '">' + esc(l.code + " " + l.title) + "</a></li>"; }).join("") + "</ul>" : s.duplicate_of ? '<p class="muted">זהו צילום נוסף של <a href="#source-' + s.duplicate_of + '">' + esc(srcLabel(s.duplicate_of)) + "</a>.</p>" : '<p class="muted">' + esc(s.no_content || "לא שובץ בשיעור.") + "</p>") +
      "</div></div>" +
      '<div class="pager">' + (prev ? '<a class="btn btn-ghost" href="#source-' + prev.id + '">' + I.arrowR + esc(srcLabel(prev.id)) + "</a>" : "<span></span>") + (next ? '<a class="btn btn-ghost" href="#source-' + next.id + '">' + esc(srcLabel(next.id)) + I.arrowL + "</a>" : "<span></span>") + "</div>";
    main.innerHTML = html;
  }
  function transcriptHtml(s) {
    var h = "";
    var list = null;
    (s.blocks || []).forEach(function (b) {
      var cert = b.certainty && b.certainty !== "high" ? ' class="c-' + b.certainty + '"' : "";
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

  // =============================================================== events
  var resetArmed = false;
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-act]");
    var b = e.target.closest(".prose b.cloze");
    if (b) { b.classList.toggle("shown"); return; }
    if (!el) return;
    var act = el.getAttribute("data-act");
    var it = run && !run.finished ? run.items[run.i] : null;
    switch (act) {
      case "skip": e.preventDefault(); main.focus(); break;
      case "flip": e.preventDefault(); flip(); break;
      case "rate": rate(el.getAttribute("data-r")); break;
      case "cram":
        rev = Object.assign({}, rev, { queue: shuffle(rev.pool).map(function (c) { return c.id; }), i: 0, flipped: false, total: rev.pool.length, done: 0, again: 0, cram: true, title: "תרגול חופשי" });
        viewReview(rev.key === "daily" ? "" : rev.key); break;
      case "level":
        var lid = route().slice(7); S.lvl[lid] = el.getAttribute("data-lv"); save(); viewLesson(L[lid]);
        var lb = document.querySelector(".level-bar"); if (lb) lb.scrollIntoView({ block: "start" });
        break;
      case "goto-level":
        S.lvl[el.getAttribute("data-lesson")] = el.getAttribute("data-lv"); pendingScroll = el.getAttribute("data-target"); break;
      case "goto": pendingScroll = el.getAttribute("data-target"); break;
      case "reveal": if (el.closest(".remember-list.hide")) el.classList.toggle("shown"); break;
      case "bookmark":
        var key = el.getAttribute("data-lesson") + "|" + el.getAttribute("data-anchor");
        if (S.bookmarks[key]) delete S.bookmarks[key]; else S.bookmarks[key] = { lesson: el.getAttribute("data-lesson"), anchor: el.getAttribute("data-anchor"), title: el.getAttribute("data-title"), t: Date.now() };
        save(); el.classList.toggle("on", !!S.bookmarks[key]); el.setAttribute("aria-pressed", String(!!S.bookmarks[key]));
        toast(S.bookmarks[key] ? "סומן לחזרה. יופיע בדף הבית." : "הסימון הוסר"); break;
      case "toggle-done":
        var did = el.getAttribute("data-id");
        if (S.done[did]) delete S.done[did]; else { S.done[did] = Date.now(); touchDay(); }
        save(); viewLesson(L[did]); updateBadge();
        toast(S.done[did] ? "השיעור סומן כהושלם. הכרטיסיות שלו בחזרה היומית." : "הסימון בוטל");
        var pr = document.getElementById("s-practice"); if (pr) pr.scrollIntoView({ block: "center" });
        break;
      case "toggle-read":
        var rid = el.getAttribute("data-id");
        if (S.read[rid]) delete S.read[rid]; else { S.read[rid] = Date.now(); touchDay(); }
        save(); viewLib(LIBID[rid]); updateBadge(); break;
      case "toggle-ch":
        var cid = el.getAttribute("data-id"); var sec = document.getElementById("ch-" + cid);
        var open = !sec.classList.contains("open"); sec.classList.toggle("open", open); el.setAttribute("aria-expanded", String(open));
        openCh[cid] = open; try { localStorage.setItem("melachot-open-ch", JSON.stringify(openCh)); } catch (err) { /* storage blocked */ }
        break;
      case "open-chapter": openCh[el.getAttribute("data-id")] = true; pendingScroll = "ch-" + el.getAttribute("data-id"); break;
      case "glossary-q": gl.q = el.getAttribute("data-q"); gl.ch = "all"; break;
      case "start-check": e.preventDefault(); var cl = el.getAttribute("data-id");
        var pool = lessonQs(cl).filter(function (q) { return q.type === "tf" || q.type === "mcq" || q.type === "cloze"; });
        startRun("practice", "בדיקת הבנה: " + L[cl].title, spread(pool, 5), "#lesson-" + cl); break;
      case "start-lesson": var sl = el.getAttribute("data-id");
        var lq = lessonQs(sl); startRun("practice", (L[sl] ? "תרגול: " + L[sl].title : "בוחן העשרה: " + LIBID[sl].title), spread(lq, lq.length), lessonHref(sl)); break;
      case "start-mistakes": e.preventDefault();
        startRun("practice", "תרגול טעויות", shuffle(poolFor("mistakes", {})), "#home"); break;
      case "p-diff": cfg.diff = +el.getAttribute("data-n"); viewPracticeHub("practice"); break;
      case "p-type": var t = el.getAttribute("data-t"); cfg.types[t] = !cfg.types[t]; viewPracticeHub("practice"); break;
      case "p-count": cfg.count = +el.getAttribute("data-n"); viewPracticeHub("practice"); break;
      case "p-start":
        var list = poolFor(cfg.scope, cfg);
        var names = { mixed: "תרגול מעורב", weak: "נושאים חלשים", mistakes: "תרגול טעויות" };
        var title = names[cfg.scope] || (cfg.scope.indexOf("ch:") === 0 ? "תרגול: פרק " + CHID[cfg.scope.slice(3)].letter : "תרגול: " + L[cfg.scope.slice(2)].title);
        startRun("practice", title, cfg.count ? spread(list, cfg.count) : shuffle(list), "#practice"); break;
      case "exam-full":
        var full = spread(poolFor("mixed", { auto: true }), 30);
        startExam("מבחן כולל", full, 45, { kind: "full" }); break;
      case "exam-ch":
        var ec = el.getAttribute("data-id"); var ql = spread(poolFor("ch:" + ec, { auto: true }), 15);
        startExam("מבחן פרק " + CHID[ec].letter + ": " + CHID[ec].title, ql, Math.ceil(ql.length * 1.5), { kind: "chapter", chapter: ec }); break;
      case "run-exit":
        if (run && run.mode === "exam" && !run.finished && !el.dataset.armed) { el.dataset.armed = "1"; el.textContent = "לצאת בלי להגיש? הקישו שוב"; return; }
        clearInterval(timerInt); var back = run ? run.back : "#practice"; run = null; go(back); break;
      case "answer":
        if (!it) return; var k = +el.getAttribute("data-k");
        if (run.mode === "exam") { it.choice = k; viewRun(); }
        else if (!it.done) { it.choice = k; settle(it); viewRun(); }
        break;
      case "q-check": if (it && !it.done) { settle(it); viewRun(); } break;
      case "q-next":
        if (run.i < run.items.length - 1) { run.i++; viewRun(); window.scrollTo(0, 0); }
        else if (run.mode === "practice") finishRun();
        break;
      case "q-prev": if (run.i > 0) { run.i--; viewRun(); window.scrollTo(0, 0); } break;
      case "q-jump": run.i = +el.getAttribute("data-k"); viewRun(); break;
      case "exam-submit":
        var un = run.items.filter(function (x) { return !answeredExam(x); }).length;
        if (un && !el.dataset.armed) { el.dataset.armed = "1"; el.textContent = un + " שאלות בלי תשובה. להגיש בכל זאת?"; return; }
        submitExam(); break;
      case "retry-wrong":
        var w = run.items.filter(function (x) { return x.score !== 1; }).map(function (x) { return Q[x.id]; });
        startRun("practice", "תרגול חוזר: הטעויות", w, run.back); break;
      case "m-term":
        if (!it) return; var ti = +el.getAttribute("data-i");
        if (it.map[ti] !== undefined) { delete it.map[ti]; it.sel = null; } else it.sel = it.sel === ti ? null : ti;
        viewRun(); break;
      case "m-def":
        if (!it || it.sel === null || it.sel === undefined) { toast("קודם בחרו מונח"); return; }
        var di = +el.getAttribute("data-i");
        Object.keys(it.map).forEach(function (kk) { if (it.map[kk] === di) delete it.map[kk]; });
        it.map[it.sel] = di; it.sel = null; viewRun(); break;
      case "cloze-pick":
        if (!it) return; var w2 = it.bank[+el.getAttribute("data-i")]; var slot = it.fill.indexOf(null);
        if (slot !== -1) { it.fill[slot] = w2; viewRun(); } break;
      case "cloze-clear": if (it && !it.done) { it.fill[+el.getAttribute("data-k")] = null; viewRun(); } break;
      case "o-pick": if (it) { it.picked.push(+el.getAttribute("data-si")); viewRun(); } break;
      case "o-unpick": if (it && !it.done) { it.picked.splice(+el.getAttribute("data-pos"), 1); viewRun(); } break;
      case "open-show": var ta = document.getElementById("open-a"); if (it) { it.text = ta ? ta.value : ""; it.shown = true; viewRun(); } break;
      case "open-grade": if (it) { it.score = +el.getAttribute("data-s"); it.done = true; record(Q[it.id], it.score); save(); viewRun(); } break;
      case "open-ai":
        var ta2 = document.getElementById("open-a"); var qq = Q[it.id]; it.text = ta2 ? ta2.value : "";
        if (!it.text.trim()) { toast("כתבו קודם תשובה"); return; }
        runAI("ai-out", aiPrompt("בדוק את תשובת הסטודנט לשאלה. כתוב מה נכון בה, מה חסר או שגוי לעומת התשובה לדוגמה ונקודות המפתח, ותן הערכה: מלאה / חלקית / חסרה.",
          L[qq.lesson], "השאלה: " + qq.q + "\nתשובה לדוגמה: " + qq.model + "\nנקודות מפתח: " + (qq.points || []).join("; ") + "\nתשובת הסטודנט: " + it.text)); break;
      case "ai": runAI("ai-out", aiPrompt(AI_TASKS[el.getAttribute("data-task")], L[route().slice(7)])); break;
      case "g-ch": gl.ch = el.getAttribute("data-v"); viewGlossary(); break;
      case "g-open": var gid = el.getAttribute("data-id"); gl.open[gid] = !gl.open[gid]; renderGlossary(); break;
      case "src-filter": srcFilter = el.getAttribute("data-v"); viewSources(); break;
      case "zoom": el.classList.toggle("on"); break;
      case "reset-ask":
        if (!resetArmed) { resetArmed = true; el.textContent = "בטוח? הקישו שוב כדי למחוק הכול"; el.classList.add("btn-primary"); setTimeout(function () { resetArmed = false; var bb = document.getElementById("reset-btn"); if (bb) { bb.textContent = "איפוס התקדמות"; bb.classList.remove("btn-primary"); } }, 4000); }
        else { resetArmed = false; S = blank(); run = null; rev = null; save(); render(); toast("ההתקדמות אופסה"); }
        break;
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
    if (el.id === "cloze-toggle") { try { localStorage.setItem(CLOZE_KEY, el.checked ? "1" : "0"); } catch (err) { /* storage blocked */ } applyCloze(el.checked); }
    else if (el.id === "p-scope") cfg.scope = el.value;
    else if (el.id === "p-enrich") cfg.enrich = el.checked;
  });
  document.addEventListener("input", function (e) { if (e.target.id === "open-a" && run && !run.finished) run.items[run.i].text = e.target.value; });
  document.addEventListener("error", function (e) {
    var t = e.target;
    if (t && t.tagName === "IMG" && t.getAttribute("data-act") === "imgfail") {
      var fig = t.closest("figure");
      if (fig && !fig.querySelector(".img-missing")) { t.hidden = true; var p = document.createElement("p"); p.className = "img-missing muted"; p.textContent = "תמונת המקור לא זמינה בגרסה הזו. התמלול מופיע כאן."; fig.insertBefore(p, fig.firstChild); }
    }
  }, true);
  document.addEventListener("keydown", function (e) {
    var tag = e.target && e.target.tagName;
    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
    var h = route();
    if (h.indexOf("review") === 0) {
      var r = rev; if (!r || r.i >= r.queue.length) return;
      if ((e.key === " " || e.key === "Enter") && !r.flipped) { e.preventDefault(); flip(); }
      else if (r.flipped && /^[1-4]$/.test(e.key)) { e.preventDefault(); rate(["again", "hard", "good", "easy"][+e.key - 1]); }
    } else if (h === "run" && run && !run.finished) {
      var it = run.items[run.i], q = Q[it.id];
      if (/^[1-4]$/.test(e.key) && it.perm && +e.key <= it.perm.length && (!it.done || run.mode === "exam")) {
        e.preventDefault(); var bt = main.querySelector('[data-act="answer"][data-k="' + (+e.key - 1) + '"]'); if (bt) bt.click();
      } else if (e.key === "Enter" && (it.done || run.mode === "exam") && document.activeElement && document.activeElement.tagName !== "BUTTON") {
        e.preventDefault(); var nb = main.querySelector('[data-act="q-next"],[data-act="exam-submit"]'); if (nb) nb.click();
      }
      void q;
    } else if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches(".prose b.cloze, [data-act='o-unpick'], [data-act='flip']")) {
      e.preventDefault(); e.target.click();
    }
  });

  render();
  cloud.init();
})();
