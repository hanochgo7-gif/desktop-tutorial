/* מלאכות הבנייה: study app (lessons, spaced-repetition flashcards, quizzes, ordering drills). */
(function () {
  "use strict";

  // ---------------------------------------------------------------- content
  var LESSONS = (window.LESSONS || []).slice().sort(function (a, b) { return a.num - b.num; });
  var BY_ID = {};
  LESSONS.forEach(function (l) { BY_ID[l.id] = l; });

  function strHash(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }
  function uniqueId(base, map) {
    var id = base, n = 2;
    while (map[id]) id = base + "-" + n++;
    return id;
  }

  var CARDS = [], CARD = {}, QUESTIONS = [], QUESTION = {}, ORDERS = [], ORDER = {};
  LESSONS.forEach(function (l) {
    (l.terms || []).forEach(function (t) {
      var id = uniqueId(l.id + ":t:" + strHash(t.term), CARD);
      var c = { id: id, lesson: l.id, kind: "term", front: t.term, back: t.def };
      CARD[id] = c; CARDS.push(c);
    });
    (l.cards || []).forEach(function (q) {
      var id = uniqueId(l.id + ":c:" + strHash(q.q), CARD);
      var c = { id: id, lesson: l.id, kind: "q", front: q.q, back: q.a };
      CARD[id] = c; CARDS.push(c);
    });
    (l.quiz || []).forEach(function (q) {
      var id = uniqueId(l.id + ":q:" + strHash(q.q), QUESTION);
      var o = { id: id, lesson: l.id, q: q.q, options: q.options, answer: q.answer, explain: q.explain || "" };
      QUESTION[id] = o; QUESTIONS.push(o);
    });
    (l.order || []).forEach(function (s, i) {
      var id = l.id + ":o:" + i;
      var o = { id: id, lesson: l.id, idx: i, title: s.title, steps: s.steps };
      ORDER[id] = o; ORDERS.push(o);
    });
  });
  function lessonCards(lid) { return CARDS.filter(function (c) { return c.lesson === lid; }); }
  function lessonQuestions(lid) { return QUESTIONS.filter(function (q) { return q.lesson === lid; }); }
  function lessonOrders(lid) { return ORDERS.filter(function (o) { return o.lesson === lid; }); }

  // ---------------------------------------------------------------- utils
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
  function pct(x) { return Math.round(Math.max(0, Math.min(1, x)) * 100); }
  function stripTags(s) { return String(s).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); }
  function plural(n, one, many) { return n === 1 ? one : n + " " + many; }
  function tape(p, thin) { return '<div class="tape' + (thin ? " tape-thin" : "") + '" role="img" aria-label="' + p + ' אחוז"><i style="width:' + p + '%"></i></div>'; }

  // ---------------------------------------------------------------- state
  var KEY = "melachot-progress-v1";
  function blank() {
    return { v: 1, updatedAt: 0, read: {}, cards: {}, qstats: {}, mistakes: {}, order: {}, days: {}, newDay: { d: "", n: 0 }, lastLesson: null };
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

  // merge two progress objects (another device + this one): keep the most advanced of each record
  function merge(a, b) {
    a = normalize(a); b = normalize(b);
    var m = blank();
    m.updatedAt = Math.max(a.updatedAt || 0, b.updatedAt || 0);
    ["read", "mistakes"].forEach(function (k) {
      m[k] = Object.assign({}, a[k], b[k]);
    });
    // mistakes resolved on the newer side stay resolved
    var newer = (a.updatedAt || 0) >= (b.updatedAt || 0) ? a : b;
    m.mistakes = Object.assign({}, newer.mistakes);
    m.cards = Object.assign({}, a.cards);
    Object.keys(b.cards).forEach(function (id) {
      var x = m.cards[id], y = b.cards[id];
      if (!x || (y && (y.last || 0) > (x.last || 0))) m.cards[id] = y;
    });
    m.qstats = Object.assign({}, a.qstats);
    Object.keys(b.qstats).forEach(function (id) {
      var x = m.qstats[id], y = b.qstats[id];
      if (!x || (y && (y.t || 0) > (x.t || 0))) m.qstats[id] = y;
    });
    m.order = Object.assign({}, a.order);
    Object.keys(b.order).forEach(function (id) {
      var x = m.order[id], y = b.order[id];
      if (!x || (y && (y.best || 0) > (x.best || 0))) m.order[id] = y;
    });
    m.days = Object.assign({}, a.days);
    Object.keys(b.days).forEach(function (d) { m.days[d] = Math.max(m.days[d] || 0, b.days[d] || 0); });
    m.newDay = newer.newDay;
    m.lastLesson = newer.lastLesson || a.lastLesson || b.lastLesson;
    return m;
  }

  // optional sync to the viewer's private store, when the page runs as a published artifact
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
            if (JSON.stringify(S) !== before) render();
            if ((S.updatedAt || 0) > (body.updatedAt || 0)) self.schedule();
          }
        } else if (S.updatedAt) {
          self.schedule();
        }
        renderFootStatus();
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
        if (e && (e.code === "invalid_argument" || e.code === "revoked" || e.code === "not_granted")) { self.ref = null; self.on = false; renderFootStatus(); }
      }).then(function () {
        self.writing = false;
        if (self.again) { self.again = false; self.schedule(); }
      });
    }
  };

  function touchDay() { var k = dayKey(); S.days[k] = (S.days[k] || 0) + 1; }
  function streak() {
    var d = new Date(), n = 0;
    if (!S.days[dayKey(d)]) d.setDate(d.getDate() - 1);
    while (S.days[dayKey(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  // ---------------------------------------------------------------- spaced repetition (SM-2, simplified)
  var NEW_PER_DAY = 15;
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
      st.ivl = Math.max(1, ivl);
      st.reps += 1;
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
  function newLeftToday() { return S.newDay.d === dayKey() ? Math.max(0, NEW_PER_DAY - S.newDay.n) : NEW_PER_DAY; }
  function dueCount() { return CARDS.filter(isDue).length; }
  function pickNew(limit) {
    var readOrder = CARDS.filter(isNew).map(function (c, i) {
      var l = BY_ID[c.lesson];
      return { c: c, k: (S.read[c.lesson] ? 0 : 1000) + l.num * 10 + i / 1000 };
    });
    readOrder.sort(function (a, b) { return a.k - b.k; });
    // new cards open only for lessons the student has read: read first, then drill
    return readOrder.map(function (x) { return x.c; }).filter(function (c) { return S.read[c.lesson]; }).slice(0, limit);
  }
  function dailyQueueSize() { return dueCount() + pickNew(newLeftToday()).length; }

  // ---------------------------------------------------------------- mastery
  function cardScore(lid) {
    var cs = lessonCards(lid);
    if (!cs.length) return 0;
    var sum = 0;
    cs.forEach(function (c) { var st = S.cards[c.id]; if (st && st.reps > 0) sum += Math.min(1, st.ivl / 7); });
    return sum / cs.length;
  }
  function quizScore(lid) {
    var qs = lessonQuestions(lid);
    if (!qs.length) return 0;
    return qs.filter(function (q) { var s = S.qstats[q.id]; return s && s.last === 1; }).length / qs.length;
  }
  function mastery(lid) { return 0.15 * (S.read[lid] ? 1 : 0) + 0.45 * cardScore(lid) + 0.40 * quizScore(lid); }
  function overall() {
    if (!LESSONS.length) return 0;
    return LESSONS.reduce(function (s, l) { return s + mastery(l.id); }, 0) / LESSONS.length;
  }

  // ---------------------------------------------------------------- icons
  var I = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>',
    cards: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="6" width="14" height="14" rx="1.5"/><path d="M7 3h13.5a.5.5 0 0 1 .5.5V17"/></svg>',
    quiz: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="1.5"/><path d="m7.5 12.5 3 3 6-7"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    arrowL: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5 8 12l7 7"/></svg>',
    arrowR: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>',
    level: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><rect x="6" y="24" width="52" height="16" rx="2"/><rect x="25" y="28" width="14" height="8" rx="4"/><circle cx="32" cy="32" r="2" fill="currentColor"/></svg>'
  };
  var BRAND = '<svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true"><rect x="1" y="1" width="30" height="30" class="hp-bg"/><rect x="1" y="1" width="30" height="22" fill="url(#p-block)"/><rect x="1" y="23" width="30" height="8" class="hp-tape"/><path d="M6 23v4M11 23v2.5M16 23v4M21 23v2.5M26 23v4" stroke="currentColor" stroke-width="1.2"/><rect x="1" y="1" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2"/></svg>';

  // ---------------------------------------------------------------- shell
  var app = document.getElementById("app");
  document.documentElement.setAttribute("lang", "he");
  document.documentElement.setAttribute("dir", "rtl");
  app.innerHTML =
    (window.Diagrams ? window.Diagrams.defs : "") +
    '<header class="topbar"><div class="topbar-in">' +
    '<a class="brand" href="#home">' + BRAND + '<span class="brand-name">מלאכות הבנייה</span></a>' +
    '<nav class="nav" aria-label="ניווט ראשי">' +
    '<a href="#home" data-nav="home">' + I.home + "<span>בית</span></a>" +
    '<a href="#review" data-nav="review">' + I.cards + '<span>חזרה</span><b class="badge" id="due-badge"></b></a>' +
    '<a href="#quiz" data-nav="quiz">' + I.quiz + "<span>בחנים</span></a>" +
    '<a href="#terms" data-nav="terms">' + I.book + "<span>חיפוש</span></a>" +
    "</nav></div></header>" +
    '<main id="main" tabindex="-1"></main>' +
    '<div class="toast" id="toast" role="status" aria-live="polite" hidden></div>';
  var main = document.getElementById("main");

  var toastTimer = null;
  function toast(msg) {
    var t = document.getElementById("toast");
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 2200);
  }
  function updateBadge() {
    var n = dailyQueueSize();
    var b = document.getElementById("due-badge");
    if (b) b.textContent = n > 0 ? (n > 99 ? "99+" : String(n)) : "";
  }

  // ---------------------------------------------------------------- router
  var pendingScroll = null;
  var session = { review: null, quiz: null, order: null };
  function route() {
    var h = (location.hash || "#home").slice(1);
    if (!h) h = "home";
    return h;
  }
  function render() {
    var h = route();
    var section = "home";
    if (!LESSONS.length) {
      main.innerHTML = '<div class="empty">' + I.level + "<b>החומר לא נטען</b><p>קובצי השיעורים לא נמצאו. רעננו את הדף.</p></div>";
      return;
    }
    if (h === "home") { viewHome(); }
    else if (h.indexOf("lesson-") === 0 && BY_ID[h.slice(7)]) { viewLesson(BY_ID[h.slice(7)]); section = "home"; }
    else if (h === "review" || h.indexOf("review-") === 0) { viewReview(h === "review" ? "" : h.slice(7)); section = "review"; }
    else if (h === "quiz" || h.indexOf("quiz-") === 0) { viewQuiz(h === "quiz" ? "" : h.slice(5)); section = "quiz"; }
    else if (h.indexOf("order-") === 0 && BY_ID[h.slice(6)]) { viewOrder(BY_ID[h.slice(6)]); section = "home"; }
    else if (h === "terms") { viewTerms(); section = "terms"; }
    else { viewHome(); }
    document.querySelectorAll("[data-nav]").forEach(function (a) {
      if (a.getAttribute("data-nav") === section) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    updateBadge();
  }
  var lastRoute = null;
  window.addEventListener("hashchange", function () {
    var h = route();
    // arriving fresh at a finished session starts a new one
    if (session.review && session.review.i >= session.review.queue.length && (h === "review" || h.indexOf("review-") === 0)) session.review = null;
    if (session.quiz && session.quiz.i >= session.quiz.items.length && h.indexOf("quiz-") === 0 && h !== "quiz-custom") session.quiz = null;
    if (h.indexOf("order-") === 0) session.order = null;
    render();
    if (pendingScroll) {
      var el = document.getElementById(pendingScroll);
      pendingScroll = null;
      if (el) { el.scrollIntoView({ block: "start" }); return; }
    }
    if (h !== lastRoute) window.scrollTo(0, 0);
    lastRoute = h;
  });
  function go(hash) {
    if (location.hash === hash) { render(); window.scrollTo(0, 0); }
    else location.hash = hash;
  }

  // ---------------------------------------------------------------- home
  function nextStep() {
    var due = dailyQueueSize();
    if (due > 0) return { label: "הצעד הבא", what: "חזרה יומית: " + plural(due, "כרטיסייה אחת", "כרטיסיות"), href: "#review", cta: "להתחיל חזרה" };
    var unread = LESSONS.filter(function (l) { return !S.read[l.id]; })[0];
    if (unread) return { label: "הצעד הבא", what: "שיעור " + unread.num + ": " + unread.title, href: "#lesson-" + unread.id, cta: "לקרוא את השיעור" };
    var weakest = LESSONS.slice().sort(function (a, b) { return mastery(a.id) - mastery(b.id); })[0];
    if (weakest && mastery(weakest.id) < 0.85) return { label: "הנושא החלש ביותר", what: "בוחן: " + weakest.title, href: "#quiz-" + weakest.id, cta: "לבוחן" };
    return { label: "מוכן למבחן", what: "מבחן מסכם מכל השיעורים", href: "#quiz-exam", cta: "למבחן מסכם" };
  }
  function viewHome() {
    var readN = Object.keys(S.read).filter(function (k) { return BY_ID[k]; }).length;
    var ns = nextStep();
    var st = streak();
    var ov = pct(overall());
    var due = dueCount();
    var mistakesN = Object.keys(S.mistakes).filter(function (k) { return QUESTION[k]; }).length;
    var html = "";
    html += '<section class="home-head">' +
      '<div class="hero">' +
      '<span class="eyebrow">הנדסאי בניין · ' + LESSONS.length + " שיעורים</span>" +
      '<h1 class="display">מלאכות הבנייה</h1>' +
      '<p class="lead">קוראים שיעור, מתרגלים כרטיסיות שחוזרות בדיוק כשמתחילים לשכוח, ובודקים את עצמכם בשאלות מבחן עם הסברים.</p>' +
      '<div class="next-step"><div><div class="label">' + esc(ns.label) + '</div><div class="what">' + esc(ns.what) + "</div></div>" +
      '<a class="btn btn-primary" href="' + ns.href + '">' + esc(ns.cta) + I.arrowL + "</a></div>" +
      "</div>" +
      '<div class="stats">' +
      '<div class="stat"><span class="k">שליטה כוללת</span><span class="v">' + ov + "<small>%</small></span>" + tape(ov) + "</div>" +
      '<div class="stat"><span class="k">רצף ימי לימוד</span><span class="v">' + st + "<small>" + (st === 1 ? "יום" : "ימים") + "</small></span></div>" +
      '<div class="stat"><span class="k">כרטיסיות לחזרה היום</span><span class="v">' + dailyQueueSize() + "</span>" + (due ? '<span class="k">מתוכן ' + due + " לחזרה חוזרת</span>" : readN ? '<span class="k">כולל כרטיסיות חדשות</span>' : '<span class="k">נפתחות אחרי קריאת שיעור</span>') + "</div>" +
      '<div class="stat"><span class="k">שיעורים שנקראו</span><span class="v">' + readN + "<small>/ " + LESSONS.length + "</small></span>" + tape(pct(readN / LESSONS.length), true) + "</div>" +
      "</div></section>";

    html += '<div class="section-head"><h2>השיעורים</h2><span class="muted">' + CARDS.length + " כרטיסיות · " + QUESTIONS.length + " שאלות · " + ORDERS.length + " תרגילי סדר</span></div>";
    html += '<div class="sheets">' + LESSONS.map(sheetCard).join("") + "</div>";

    html += '<div class="tools">' +
      '<a class="tool" href="#quiz-exam"><b>מבחן מסכם</b><span>20 שאלות מעורבות מכל השיעורים, עם ציון לפי נושא.</span></a>' +
      '<a class="tool" href="#review"><b>חזרה יומית</b><span>כרטיסיות שהגיע זמנן, ועוד עד ' + NEW_PER_DAY + " חדשות ביום.</span></a>" +
      (mistakesN ? '<a class="tool" href="#quiz-mistakes"><b>תרגול טעויות (' + mistakesN + ")</b><span>השאלות שטעיתם בהן. שאלה יוצאת מהרשימה כשעונים עליה נכון.</span></a>" :
        '<a class="tool" href="#terms"><b>חיפוש ומונחים</b><span>כל המונחים במקום אחד, וחיפוש בכל חומר השיעורים.</span></a>') +
      "</div>";
    html += footHtml();
    main.innerHTML = html;
  }
  function sheetCard(l) {
    var m = pct(mastery(l.id));
    var dueL = lessonCards(l.id).filter(isDue).length;
    var chips = "";
    if (S.read[l.id]) chips += '<span class="chip done">נקרא</span>';
    if (dueL) chips += '<span class="chip due">' + dueL + " לחזרה</span>";
    return '<a class="sheet" href="#lesson-' + l.id + '">' +
      '<div class="swatch">' + window.Diagrams.swatch(l.material) + "</div>" +
      '<div class="tb-top"><span class="num">' + pad2(l.num) + '</span><div><div class="ttl">' + esc(l.title) + '</div><div class="sub">' +
      (l.sections || []).length + " פרקים · " + lessonQuestions(l.id).length + " שאלות</div></div></div>" +
      '<div class="tb-bot">' + tape(m, true) + '<span class="pct">' + m + "%</span>" + (chips ? '<div class="chips" style="grid-column:1/-1">' + chips + "</div>" : "") + "</div>" +
      "</a>";
  }
  function footHtml() {
    return '<footer class="foot"><span>התוכן מסכם את הסילבוס המקובל של מלאכות בניין בלימודי הנדסאי בניין. מספרים שמסומנים "מקובל" הם כללי אצבע; המחייב הוא המפרט, התכנון והתקן.</span>' +
      '<span class="row"><span id="save-status">' + saveStatusText() + '</span><button class="btn btn-ghost btn-sm" data-act="reset-ask" id="reset-btn">איפוס התקדמות</button></span></footer>';
  }
  function saveStatusText() { return cloud.on ? "ההתקדמות נשמרת בחשבון שלך" : "ההתקדמות נשמרת בדפדפן הזה"; }
  function renderFootStatus() { var el = document.getElementById("save-status"); if (el) el.textContent = saveStatusText(); }

  // ---------------------------------------------------------------- lesson
  var CLOZE_KEY = "melachot-cloze";
  function clozeOn() { try { return localStorage.getItem(CLOZE_KEY) === "1"; } catch (e) { return false; } }
  function viewLesson(l) {
    S.lastLesson = l.id;
    var idx = LESSONS.indexOf(l);
    var prev = LESSONS[idx - 1], next = LESSONS[idx + 1];
    var cs = lessonCards(l.id), qs = lessonQuestions(l.id), os = lessonOrders(l.id);
    var m = pct(mastery(l.id));
    var cz = clozeOn();
    var html = '<nav class="crumbs" aria-label="מיקום"><a href="#home">בית</a><span aria-hidden="true">/</span><span>שיעור ' + l.num + "</span></nav>";
    html += '<header class="lesson-head">' +
      '<div class="swatch">' + window.Diagrams.swatch(l.material) + "</div>" +
      '<div class="lh-main"><span class="eyebrow">גיליון ' + pad2(l.num) + " מתוך " + pad2(LESSONS.length) + '</span><h1>' + esc(l.title) + '</h1><p class="summary">' + esc(l.summary) + "</p></div>" +
      '<div class="lh-meta">' +
      '<div><span class="k">חומר</span><span class="v">' + esc(window.Diagrams.materialName(l.material)) + "</span></div>" +
      '<div><span class="k">כרטיסיות</span><span class="v">' + cs.length + "</span></div>" +
      '<div><span class="k">שאלות</span><span class="v">' + qs.length + "</span></div>" +
      '<div><span class="k">שליטה</span><span class="v">' + m + "%</span></div>" +
      "</div></header>";

    var toc = (l.sections || []).map(function (s, i) { return '<a href="#lesson-' + l.id + '" data-act="scroll" data-target="s-' + (i + 1) + '">' + esc(s.title) + "</a>"; });
    if ((l.diagrams || []).length) toc.push('<a href="#lesson-' + l.id + '" data-act="scroll" data-target="s-dg">תרשים</a>');
    toc.push('<a href="#lesson-' + l.id + '" data-act="scroll" data-target="s-rem">לזכור</a>');
    toc.push('<a href="#lesson-' + l.id + '" data-act="scroll" data-target="s-practice">תרגול</a>');
    html += '<div class="lesson-tools"><div class="toc">' + toc.join("") + "</div>" +
      '<label class="switch" for="cloze-toggle"><input type="checkbox" id="cloze-toggle" data-act="cloze"' + (cz ? " checked" : "") + '><span class="track"></span><span>מצב שינון: להסתיר מילות מפתח</span></label></div>';

    html += '<div class="lesson-body">';
    (l.sections || []).forEach(function (s, i) {
      html += '<section class="block" id="s-' + (i + 1) + '"><h2><span class="sn">' + l.num + "." + (i + 1) + "</span>" + esc(s.title) + "</h2>" +
        '<div class="prose">' + (s.body || []).map(function (p) { return /^\s*<(ul|ol)/.test(p) ? p : "<p>" + p + "</p>"; }).join("") + "</div></section>";
      if (i === 1 && (l.diagrams || []).length) html += diagramBlock(l);
    });
    if ((l.sections || []).length < 2 && (l.diagrams || []).length) html += diagramBlock(l);

    html += '<section class="block" id="s-rem"><h2>נקודות לזכור</h2><ul class="remember-list' + (cz ? " hide" : "") + '">' +
      (l.remember || []).map(function (r, i) { return '<li><span class="box">' + (i + 1) + '</span><span class="txt" data-act="reveal">' + esc(r) + "</span></li>"; }).join("") + "</ul></section>";
    if ((l.mistakes || []).length) {
      html += '<section class="block"><h2>טעויות נפוצות</h2><ul class="mistake-list">' +
        l.mistakes.map(function (r) { return "<li>" + I.x + "<span>" + esc(r) + "</span></li>"; }).join("") + "</ul></section>";
    }
    if ((l.terms || []).length) {
      html += '<section class="block"><h2>מונחים</h2><dl class="terms-grid">' +
        l.terms.map(function (t) { return '<div class="term"><dt>' + esc(t.term) + "</dt><dd>" + esc(t.def) + "</dd></div>"; }).join("") + "</dl></section>";
    }
    var dueL = cs.filter(function (c) { return isDue(c) || isNew(c); }).length;
    html += '<section class="practice" id="s-practice"><h2>תרגול השיעור</h2>' +
      '<p>שליטה בשיעור: ' + m + "%. סדר מומלץ: כרטיסיות, אחר כך בוחן, ובסוף תרגיל סדר הפעולות.</p>" + tape(m) +
      '<div class="btn-row">' +
      '<a class="btn btn-primary" href="#review-' + l.id + '">כרטיסיות (' + (dueL || cs.length) + ")</a>" +
      '<a class="btn" href="#quiz-' + l.id + '">בוחן (' + qs.length + " שאלות)</a>" +
      (os.length ? '<a class="btn" href="#order-' + l.id + '">סדר פעולות (' + os.length + ")</a>" : "") +
      '<button class="btn" data-act="toggle-read" data-id="' + l.id + '">' + (S.read[l.id] ? "סומן כנקרא ✓" : "סיימתי לקרוא") + "</button>" +
      "</div></section>";
    html += '<div class="pager">' +
      (prev ? '<a class="btn btn-ghost" href="#lesson-' + prev.id + '">' + I.arrowR + "שיעור " + prev.num + "</a>" : "<span></span>") +
      (next ? '<a class="btn btn-ghost" href="#lesson-' + next.id + '">שיעור ' + next.num + ": " + esc(next.title) + I.arrowL + "</a>" : "<span></span>") +
      "</div>";
    html += "</div>";
    main.innerHTML = html;
    if (cz) applyCloze(true);
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage blocked */ }
  }
  function diagramBlock(l) {
    return '<section class="block" id="s-dg"><h2>תרשים</h2>' + l.diagrams.filter(window.Diagrams.has).map(function (id, i) {
      return '<figure class="dg"><div class="dg-scroll">' + window.Diagrams.render(id) + '</div><figcaption><b>איור ' + l.num + "." + (i + 1) + "</b><span>" + esc(window.Diagrams.title(id)) + '</span><span class="swipe">החליקו לצדדים לכל התרשים</span></figcaption></figure>';
    }).join("") + "</section>";
  }
  function applyCloze(on) {
    main.querySelectorAll(".prose b").forEach(function (b) { b.classList.toggle("cloze", on); b.classList.remove("shown"); if (on) b.setAttribute("tabindex", "0"); else b.removeAttribute("tabindex"); });
    var rl = main.querySelector(".remember-list");
    if (rl) { rl.classList.toggle("hide", on); rl.querySelectorAll(".txt").forEach(function (t) { t.classList.remove("shown"); }); }
  }

  // ---------------------------------------------------------------- flashcard review
  function buildReview(arg) {
    var queue, title, lid = null;
    if (arg && BY_ID[arg]) {
      lid = arg;
      var cs = lessonCards(arg);
      queue = shuffle(cs.filter(isDue)).concat(cs.filter(isNew));
      title = "כרטיסיות: " + BY_ID[arg].title;
    } else {
      queue = shuffle(CARDS.filter(isDue)).concat(pickNew(newLeftToday()));
      title = "חזרה יומית";
    }
    return { key: arg || "daily", lesson: lid, title: title, queue: queue.map(function (c) { return c.id; }), i: 0, flipped: false, total: queue.length, done: 0, again: 0, cram: false };
  }
  function viewReview(arg) {
    var key = arg || "daily";
    if (!session.review || session.review.key !== key || (session.review.i >= session.review.queue.length && session.review.total === 0)) session.review = buildReview(arg);
    var r = session.review;
    if (!r.queue.length || r.i >= r.queue.length) { viewReviewDone(r); return; }
    var c = CARD[r.queue[r.i]];
    var st = S.cards[c.id];
    var l = BY_ID[c.lesson];
    var left = r.queue.length - r.i;
    var html = '<div class="study-wrap">' +
      '<div class="study-top"><div><span class="eyebrow">' + (r.cram ? "תרגול חופשי, לא משנה את לוח החזרות" : (st ? "חזרה" : "כרטיסייה חדשה")) + "</span><h1>" + esc(r.title) + "</h1></div>" +
      '<span class="counter">' + left + " נותרו</span></div>" +
      tape(pct(r.total ? (r.done / (r.done + left)) : 0), true) +
      '<div class="flash' + (r.flipped ? " flipped" : "") + '" id="flash" data-act="flip" role="button" tabindex="0" aria-label="להפוך את הכרטיסייה">' +
      '<div class="flash-in">' +
      '<div class="face front"><div class="kind"><span>' + (c.kind === "term" ? "מונח: מה זה?" : "שאלה") + "</span><span>שיעור " + l.num + " · " + esc(l.title) + '</span></div>' +
      '<div class="q">' + esc(c.front) + '</div><div class="hint">נסו לענות בראש, ואז הקישו להפוך</div></div>' +
      '<div class="face back"><div class="kind"><span>תשובה</span><span>שיעור ' + l.num + '</span></div>' +
      '<div class="a"><span class="qsmall">' + esc(c.front) + "</span>" + esc(c.back) + "</div></div>" +
      "</div></div>";
    if (r.flipped) {
      html += '<div class="rate" role="group" aria-label="כמה טוב זכרתם?">' +
        '<button class="btn again" data-act="rate" data-r="again">לא זכרתי<small>' + (r.cram ? "שוב" : ivlLabel(st, "again")) + "</small></button>" +
        '<button class="btn" data-act="rate" data-r="hard">בקושי<small>' + (r.cram ? "הבא" : ivlLabel(st, "hard")) + "</small></button>" +
        '<button class="btn btn-primary" data-act="rate" data-r="good">זכרתי<small>' + (r.cram ? "הבא" : ivlLabel(st, "good")) + "</small></button>" +
        '<button class="btn easy" data-act="rate" data-r="easy">קל<small>' + (r.cram ? "הבא" : ivlLabel(st, "easy")) + "</small></button>" +
        '</div><p class="keys-hint">מקלדת: <span class="kbd">1</span>–<span class="kbd">4</span> לדירוג</p>';
    } else {
      html += '<button class="btn btn-primary" data-act="flip" style="width:100%">להציג תשובה</button><p class="keys-hint">מקלדת: <span class="kbd">רווח</span> להפוך</p>';
    }
    html += "</div>";
    main.innerHTML = html;
  }
  function viewReviewDone(r) {
    var html = '<div class="study-wrap"><div class="empty">' + I.level;
    if (r.total === 0) {
      var nextDue = CARDS.map(function (c) { return S.cards[c.id]; }).filter(Boolean).map(function (s) { return s.due; }).filter(function (d) { return d > Date.now(); }).sort()[0];
      html += "<b>אין כרטיסיות שממתינות עכשיו</b>";
      if (r.lesson) {
        html += "<p>כל הכרטיסיות בשיעור הזה מתוזמנות לימים הבאים. אפשר לעבור עליהן שוב בתרגול חופשי, בלי לשנות את לוח החזרות.</p>" +
          '<div class="btn-row"><button class="btn btn-primary" data-act="cram" data-id="' + r.lesson + '">תרגול חופשי של כל הכרטיסיות</button><a class="btn" href="#quiz-' + r.lesson + '">לבוחן השיעור</a></div>';
      } else {
        var when = nextDue ? new Date(nextDue) : null;
        html += "<p>" + (when ? "החזרה הבאה מתוזמנת ל-" + when.toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "numeric" }) + "." : "כרטיסיות חדשות נפתחות לחזרה היומית אחרי שקוראים שיעור ולוחצים בסופו \"סיימתי לקרוא\".") +
          " בינתיים אפשר לקרוא שיעור חדש או לפתור בוחן.</p>" +
          '<div class="btn-row"><a class="btn btn-primary" href="#home">לשיעורים</a><a class="btn" href="#quiz-exam">מבחן מסכם</a></div>';
      }
    } else {
      html += "<b>סיימתם את הסבב</b><p>עברתם על " + plural(r.done, "כרטיסייה אחת", "כרטיסיות") + (r.again ? ", ו-" + plural(r.again, "אחת חזרה", "חזרו") + " לסבב נוסף כי לא זכרתם" : "") + ". הכרטיסיות יחזרו בדיוק כשמתחילים לשכוח אותן.</p>" +
        '<div class="btn-row">' + (r.lesson ? '<a class="btn btn-primary" href="#quiz-' + r.lesson + '">לבוחן השיעור</a><a class="btn" href="#lesson-' + r.lesson + '">חזרה לשיעור</a>' : '<a class="btn btn-primary" href="#home">לדף הבית</a><a class="btn" href="#quiz-exam">מבחן מסכם</a>') + "</div>";
    }
    html += "</div></div>";
    main.innerHTML = html;
  }
  function flip() {
    var r = session.review; if (!r) return;
    r.flipped = !r.flipped;
    var f = document.getElementById("flash");
    if (f && r.flipped) { f.classList.add("flipped"); setTimeout(function () { viewReview(r.lesson || ""); var b = main.querySelector('[data-r="good"]'); if (b) b.focus({ preventScroll: true }); }, 260); }
    else viewReview(r.lesson || "");
  }
  function rate(grade) {
    var r = session.review; if (!r || !r.flipped) return;
    var id = r.queue[r.i];
    if (!r.cram) {
      var wasNew = !S.cards[id];
      S.cards[id] = nextState(S.cards[id], grade);
      if (wasNew) { if (S.newDay.d !== dayKey()) S.newDay = { d: dayKey(), n: 0 }; S.newDay.n++; }
    }
    touchDay();
    if (grade === "again") { r.again++; r.queue.splice(Math.min(r.queue.length, r.i + 4), 0, id); }
    else r.done++;
    r.i++; r.flipped = false;
    save();
    viewReview(r.lesson || "");
    updateBadge();
  }

  // ---------------------------------------------------------------- quiz
  var quizSetup = { scope: "all", count: 20 };
  function buildQuiz(list, title, key, backHref) {
    var items = shuffle(list).map(function (q) { return { id: q.id, perm: shuffle([0, 1, 2, 3]), chosen: null }; });
    return { key: key, title: title, items: items, i: 0, back: backHref };
  }
  function viewQuiz(arg) {
    var q = session.quiz;
    if (!arg) { viewQuizSetup(); return; }
    if (!q || q.key !== arg) {
      if (BY_ID[arg]) q = buildQuiz(lessonQuestions(arg), "בוחן: " + BY_ID[arg].title, arg, "#lesson-" + arg);
      else if (arg === "exam") q = buildQuiz(shuffle(QUESTIONS).slice(0, 20), "מבחן מסכם", arg, "#home");
      else if (arg === "mistakes") q = buildQuiz(Object.keys(S.mistakes).filter(function (k) { return QUESTION[k]; }).map(function (k) { return QUESTION[k]; }), "תרגול טעויות", arg, "#quiz");
      else if (arg === "custom") q = buildCustom();
      else { viewQuizSetup(); return; }
      session.quiz = q;
    }
    if (!q.items.length) {
      main.innerHTML = '<div class="study-wrap"><div class="empty">' + I.level + "<b>" + (arg === "mistakes" ? "אין טעויות לתרגל" : "אין שאלות") + "</b><p>" +
        (arg === "mistakes" ? "כל שאלה שתטעו בה בבוחן תופיע כאן, עד שתענו עליה נכון." : "") + '</p><a class="btn btn-primary" href="#quiz">לבחנים</a></div></div>';
      return;
    }
    if (q.i >= q.items.length) { viewQuizResult(q); return; }
    var it = q.items[q.i], Q = QUESTION[it.id], l = BY_ID[Q.lesson];
    var answered = it.chosen !== null;
    var html = '<div class="study-wrap">' +
      '<div class="study-top"><div><span class="eyebrow">שאלה ' + (q.i + 1) + " מתוך " + q.items.length + "</span><h1>" + esc(q.title) + '</h1></div><a class="btn btn-ghost btn-sm" href="' + q.back + '">יציאה</a></div>' +
      tape(pct(q.i / q.items.length), true) +
      '<div class="q-card"><div class="from"><span>שיעור ' + l.num + " · " + esc(l.title) + "</span>" + (S.mistakes[it.id] && !answered ? "<span>טעיתם בה בעבר</span>" : "") + "</div>" +
      '<div class="qq">' + esc(Q.q) + '</div><div class="opts" role="group" aria-label="תשובות">';
    var letters = ["א", "ב", "ג", "ד"];
    it.perm.forEach(function (oi, k) {
      var cls = "opt";
      if (answered) {
        if (oi === Q.answer) cls += " right";
        else if (k === it.chosen) cls += " wrong";
        else cls += " dim";
      }
      html += '<button class="' + cls + '" data-act="answer" data-k="' + k + '"' + (answered ? " disabled" : "") + '><span class="l">' + letters[k] + "</span><span>" + esc(Q.options[oi]) + "</span></button>";
    });
    html += "</div>";
    if (answered) {
      var ok = it.perm[it.chosen] === Q.answer;
      html += '<div class="explain" role="status"><b class="' + (ok ? "res-ok" : "res-bad") + '">' + (ok ? "נכון." : "לא נכון. התשובה הנכונה: " + esc(Q.options[Q.answer])) + "</b><span>" + esc(Q.explain) + "</span></div>" +
        '<button class="btn btn-primary" data-act="next-q" id="next-q">' + (q.i + 1 < q.items.length ? "לשאלה הבאה" : "לתוצאות") + I.arrowL + "</button>";
    }
    html += '</div><p class="keys-hint">מקלדת: <span class="kbd">1</span>–<span class="kbd">4</span> לבחירה, <span class="kbd">Enter</span> להמשך</p></div>';
    main.innerHTML = html;
    if (answered) { var nb = document.getElementById("next-q"); if (nb) nb.focus({ preventScroll: true }); }
  }
  function answer(k) {
    var q = session.quiz; if (!q) return;
    var it = q.items[q.i]; if (!it || it.chosen !== null) return;
    it.chosen = k;
    var Q = QUESTION[it.id];
    var ok = it.perm[k] === Q.answer;
    var s = S.qstats[it.id] || { r: 0, w: 0 };
    if (ok) s.r++; else s.w++;
    s.last = ok ? 1 : 0; s.t = Date.now();
    S.qstats[it.id] = s;
    if (ok) delete S.mistakes[it.id]; else S.mistakes[it.id] = Date.now();
    touchDay();
    save();
    viewQuiz(q.key);
  }
  function viewQuizResult(q) {
    var right = q.items.filter(function (it) { return it.perm[it.chosen] === QUESTION[it.id].answer; });
    var wrong = q.items.filter(function (it) { return it.perm[it.chosen] !== QUESTION[it.id].answer; });
    var score = pct(right.length / q.items.length);
    var byLesson = {};
    q.items.forEach(function (it) {
      var lid = QUESTION[it.id].lesson;
      byLesson[lid] = byLesson[lid] || { r: 0, n: 0 };
      byLesson[lid].n++;
      if (it.perm[it.chosen] === QUESTION[it.id].answer) byLesson[lid].r++;
    });
    var lids = Object.keys(byLesson).sort(function (a, b) { return BY_ID[a].num - BY_ID[b].num; });
    var verdict = score >= 85 ? "מצוין. החומר יושב טוב." : score >= 65 ? "טוב. עברו על ההסברים של השאלות שטעיתם בהן." : "יש עוד מה לחזק. חזרו לשיעור, ואז נסו שוב.";
    var html = '<div class="study-wrap">' +
      '<div class="study-top"><div><span class="eyebrow">תוצאות</span><h1>' + esc(q.title) + "</h1></div></div>" +
      '<div class="panel stack"><div class="row" style="align-items:flex-end"><span class="score-big">' + score + '</span><span style="font-size:2rem;font-weight:800">%</span><span class="spacer"></span><span class="muted">' + right.length + " נכונות מתוך " + q.items.length + "</span></div>" + tape(score) + "<p>" + verdict + "</p></div>";
    if (lids.length > 1) {
      html += '<div class="panel stack"><b>לפי נושא</b><div class="bars">' + lids.map(function (lid) {
        var b = byLesson[lid], p = pct(b.r / b.n);
        return '<div class="bar-row"><a href="#lesson-' + lid + '">' + BY_ID[lid].num + ". " + esc(BY_ID[lid].title) + "</a>" + tape(p, true) + '<span class="mono">' + b.r + "/" + b.n + "</span></div>";
      }).join("") + "</div></div>";
    }
    html += '<div class="btn-row">' +
      (wrong.length ? '<button class="btn btn-primary" data-act="retry-wrong">לתרגל שוב את ' + plural(wrong.length, "הטעות", "הטעויות") + "</button>" : "") +
      '<button class="btn" data-act="retry-quiz">בוחן חדש באותו נושא</button><a class="btn btn-ghost" href="' + q.back + '">חזרה</a></div>';
    if (wrong.length) {
      html += '<div class="section-head"><h2>השאלות שטעיתם בהן</h2></div><div class="result-list">' + wrong.map(function (it) {
        var Q = QUESTION[it.id];
        return '<div class="result-item"><span class="qq">' + esc(Q.q) + '</span><span class="ans-bad">ענית: ' + esc(Q.options[it.perm[it.chosen]]) + '</span><span class="ans-ok">נכון: ' + esc(Q.options[Q.answer]) + '</span><span class="muted">' + esc(Q.explain) + "</span></div>";
      }).join("") + "</div>";
    }
    html += "</div>";
    main.innerHTML = html;
  }
  function viewQuizSetup() {
    var mistakesN = Object.keys(S.mistakes).filter(function (k) { return QUESTION[k]; }).length;
    var opts = '<option value="all"' + (quizSetup.scope === "all" ? " selected" : "") + ">כל השיעורים</option>" +
      '<option value="read"' + (quizSetup.scope === "read" ? " selected" : "") + ">רק שיעורים שקראתי</option>" +
      LESSONS.map(function (l) { return '<option value="' + l.id + '"' + (quizSetup.scope === l.id ? " selected" : "") + ">" + l.num + ". " + esc(l.title) + "</option>"; }).join("");
    var html = '<div class="study-wrap">' +
      '<div class="study-top"><div><span class="eyebrow">' + QUESTIONS.length + " שאלות במאגר</span><h1>בחנים</h1></div></div>" +
      '<div class="tools" style="margin-top:0">' +
      '<a class="tool" href="#quiz-exam"><b>מבחן מסכם</b><span>20 שאלות אקראיות מכל החומר.</span></a>' +
      '<a class="tool" href="#quiz-mistakes"><b>תרגול טעויות' + (mistakesN ? " (" + mistakesN + ")" : "") + "</b><span>" + (mistakesN ? "השאלות שטעיתם בהן ועדיין לא תוקנו." : "עדיין אין טעויות שמורות.") + "</span></a>" +
      "</div>" +
      '<div class="panel setup"><b>בוחן מותאם</b>' +
      '<div class="field"><label for="q-scope">נושא</label><select class="select" id="q-scope" data-act="q-scope">' + opts + "</select></div>" +
      '<div class="field"><span class="lbl" id="q-count-l">מספר שאלות</span><div class="seg" role="group" aria-labelledby="q-count-l">' +
      [10, 20, 40, 0].map(function (n) { return '<button data-act="q-count" data-n="' + n + '" aria-pressed="' + (quizSetup.count === n) + '">' + (n ? n : "כולן") + "</button>"; }).join("") +
      '</div></div><button class="btn btn-primary" data-act="q-start">להתחיל</button></div>' +
      '<div class="section-head"><h2>לפי שיעור</h2></div><div class="bars panel">' +
      LESSONS.map(function (l) { var p = pct(quizScore(l.id)); return '<div class="bar-row"><a href="#quiz-' + l.id + '">' + l.num + ". " + esc(l.title) + "</a>" + tape(p, true) + '<span class="mono">' + p + "%</span></div>"; }).join("") +
      '</div><p class="muted" style="font-size:var(--fs-0)">האחוז הוא חלק השאלות בשיעור שעניתם עליהן נכון בפעם האחרונה.</p></div>';
    main.innerHTML = html;
  }
  function buildCustom() {
    var pool;
    if (quizSetup.scope === "all") pool = QUESTIONS;
    else if (quizSetup.scope === "read") pool = QUESTIONS.filter(function (q) { return S.read[q.lesson]; });
    else pool = lessonQuestions(quizSetup.scope);
    var title = quizSetup.scope === "all" ? "בוחן: כל השיעורים" : quizSetup.scope === "read" ? "בוחן: שיעורים שקראתי" : "בוחן: " + BY_ID[quizSetup.scope].title;
    var list = shuffle(pool);
    if (quizSetup.count) list = list.slice(0, quizSetup.count);
    return buildQuiz(list, title, "custom", "#quiz");
  }

  // ---------------------------------------------------------------- ordering drill
  function viewOrder(l) {
    var os = lessonOrders(l.id);
    if (!os.length) { go("#lesson-" + l.id); return; }
    var o = session.order;
    if (!o || o.lesson !== l.id) { o = session.order = { lesson: l.id, idx: 0 }; startSeq(o); }
    var seq = os[o.idx];
    var html = '<div class="study-wrap">' +
      '<div class="study-top"><div><span class="eyebrow">סדר פעולות · שיעור ' + l.num + (os.length > 1 ? " · תרגיל " + (o.idx + 1) + " מתוך " + os.length : "") + "</span><h1>" + esc(seq.title) + '</h1></div><a class="btn btn-ghost btn-sm" href="#lesson-' + l.id + '">יציאה</a></div>' +
      '<p class="muted">הקישו על השלבים לפי הסדר שבו מבצעים אותם בשטח. הקשה על שלב שכבר בחרתם מחזירה אותו.</p>' +
      '<div class="order-zone"><ol class="slot-list">';
    seq.steps.forEach(function (s, i) {
      var pickedIdx = o.picked[i];
      var cls = "slot";
      var body = "";
      if (pickedIdx !== undefined) {
        cls += " filled";
        if (o.checked) cls += pickedIdx === i ? " right" : " wrong";
        body = esc(seq.steps[pickedIdx]) + (o.checked && pickedIdx !== i ? '<span class="fix">במקום הזה: ' + esc(seq.steps[i]) + "</span>" : "");
      }
      html += '<li class="' + cls + '"' + (pickedIdx !== undefined && !o.checked ? ' data-act="unpick" data-pos="' + i + '" role="button" tabindex="0"' : "") + '><span class="n">' + (i + 1) + "</span><span>" + body + "</span></li>";
    });
    html += "</ol>";
    if (!o.checked) {
      html += '<div class="pool">' + o.pool.filter(function (si) { return o.picked.indexOf(si) === -1; }).map(function (si) {
        return '<button data-act="pick" data-si="' + si + '">' + esc(seq.steps[si]) + "</button>";
      }).join("") + "</div>";
    }
    html += "</div>";
    if (o.checked) {
      var right = o.picked.filter(function (si, i) { return si === i; }).length;
      html += '<div class="panel stack"><b>' + (right === seq.steps.length ? "מושלם. כל השלבים במקום." : right + " מתוך " + seq.steps.length + " במקום הנכון.") + "</b>" +
        '<div class="btn-row"><button class="btn' + (right === seq.steps.length ? "" : " btn-primary") + '" data-act="order-retry">לנסות שוב</button>' +
        (o.idx + 1 < os.length ? '<button class="btn btn-primary" data-act="order-next">לתרגיל הבא</button>' : '<a class="btn btn-primary" href="#lesson-' + l.id + '">חזרה לשיעור</a>') + "</div></div>";
    } else {
      html += '<div class="btn-row"><button class="btn btn-primary" data-act="order-check"' + (o.picked.length < seq.steps.length ? " disabled" : "") + '>לבדוק</button>' +
        '<button class="btn btn-ghost" data-act="order-retry"' + (o.picked.length ? "" : " disabled") + ">לנקות</button></div>";
    }
    html += "</div>";
    main.innerHTML = html;
  }
  function startSeq(o) {
    var seq = lessonOrders(o.lesson)[o.idx];
    var idxs = seq.steps.map(function (_, i) { return i; });
    var p = shuffle(idxs), guard = 0;
    while (guard++ < 10 && p.every(function (v, i) { return v === i; })) p = shuffle(idxs);
    o.pool = p; o.picked = []; o.checked = false;
  }

  // ---------------------------------------------------------------- search & terms
  var searchQ = "";
  function viewTerms() {
    var html = '<div class="study-top" style="margin-bottom:14px"><div><span class="eyebrow">' + CARDS.filter(function (c) { return c.kind === "term"; }).length + " מונחים · " + LESSONS.length + ' שיעורים</span><h1 class="display" style="font-size:var(--fs-5)">חיפוש ומונחים</h1></div></div>' +
      '<div class="search-row"><label class="sr-only" for="q-search">חיפוש</label><input class="input" id="q-search" type="search" placeholder="חפשו מונח או נושא, למשל: אשפרה, רולקה, כיסוי" value="' + esc(searchQ) + '" autocomplete="off"></div>' +
      '<div id="search-out"></div>';
    main.innerHTML = html;
    renderSearch();
    var inp = document.getElementById("q-search");
    inp.addEventListener("input", function () { searchQ = inp.value; renderSearch(); });
  }
  function hl(text, re) { var t = esc(text); return re ? t.replace(re, "<mark>$1</mark>") : t; }
  function renderSearch() {
    var out = document.getElementById("search-out"); if (!out) return;
    var q = searchQ.trim();
    var re = q ? new RegExp("(" + q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/&/g, "&amp;") + ")", "gi") : null;
    var terms = [];
    LESSONS.forEach(function (l) { (l.terms || []).forEach(function (t) { terms.push({ t: t, l: l }); }); });
    if (q) terms = terms.filter(function (x) { return (x.t.term + " " + x.t.def).toLowerCase().indexOf(q.toLowerCase()) !== -1; });
    else terms.sort(function (a, b) { return a.t.term.localeCompare(b.t.term, "he"); });
    var html = "";
    if (q) {
      var hits = [];
      LESSONS.forEach(function (l) {
        (l.sections || []).forEach(function (s, si) {
          (s.body || []).forEach(function (p) {
            var txt = stripTags(p), pos = txt.toLowerCase().indexOf(q.toLowerCase());
            if (pos !== -1) {
              var a = Math.max(0, pos - 70), b = Math.min(txt.length, pos + q.length + 90);
              hits.push({ l: l, si: si, s: s, snip: (a ? "…" : "") + txt.slice(a, b) + (b < txt.length ? "…" : "") });
            }
          });
        });
      });
      html += '<div class="section-head"><h2>מונחים</h2><span class="muted">' + terms.length + "</span></div>";
    }
    html += terms.length ? '<div class="gl-list">' + terms.map(function (x) {
      return '<div class="gl-item"><span class="t">' + hl(x.t.term, re) + '</span><span class="d">' + hl(x.t.def, re) + '</span><a href="#lesson-' + x.l.id + '">שיעור ' + x.l.num + ": " + esc(x.l.title) + "</a></div>";
    }).join("") + "</div>" : '<p class="muted">לא נמצאו מונחים.</p>';
    if (q) {
      html += '<div class="section-head" style="margin-top:22px"><h2>בחומר השיעורים</h2><span class="muted">' + hits.length + "</span></div>";
      html += hits.length ? '<div class="hits">' + hits.slice(0, 40).map(function (h) {
        return '<a class="hit" href="#lesson-' + h.l.id + '" data-act="goto" data-target="s-' + (h.si + 1) + '"><span class="w">שיעור ' + h.l.num + " · " + esc(h.s.title) + "</span><span>" + hl(h.snip, re) + "</span></a>";
      }).join("") + "</div>" : '<p class="muted">לא נמצא בחומר.</p>';
    }
    out.innerHTML = html;
  }

  // ---------------------------------------------------------------- events
  var resetArmed = false;
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-act]");
    if (!el) return;
    var act = el.getAttribute("data-act");
    switch (act) {
      case "flip": e.preventDefault(); flip(); break;
      case "rate": rate(el.getAttribute("data-r")); break;
      case "cram":
        var lid = el.getAttribute("data-id");
        session.review = { key: lid, lesson: lid, title: "תרגול חופשי: " + BY_ID[lid].title, queue: shuffle(lessonCards(lid)).map(function (c) { return c.id; }), i: 0, flipped: false, total: lessonCards(lid).length, done: 0, again: 0, cram: true };
        viewReview(lid); break;
      case "answer": answer(+el.getAttribute("data-k")); break;
      case "next-q": session.quiz.i++; viewQuiz(session.quiz.key); window.scrollTo(0, 0); break;
      case "retry-wrong":
        var wq = session.quiz.items.filter(function (it) { return it.perm[it.chosen] !== QUESTION[it.id].answer; }).map(function (it) { return QUESTION[it.id]; });
        var back = session.quiz.back, key = session.quiz.key;
        session.quiz = buildQuiz(wq, "תרגול חוזר: הטעויות", key, back);
        viewQuiz(key); window.scrollTo(0, 0); break;
      case "retry-quiz":
        var k2 = session.quiz.key; session.quiz = null; viewQuiz(k2); window.scrollTo(0, 0); break;
      case "q-count": quizSetup.count = +el.getAttribute("data-n"); viewQuizSetup(); break;
      case "q-start": session.quiz = buildCustom(); go("#quiz-custom"); break;
      case "toggle-read":
        var id = el.getAttribute("data-id");
        if (S.read[id]) delete S.read[id]; else { S.read[id] = Date.now(); touchDay(); }
        save(); viewLesson(BY_ID[id]); updateBadge();
        toast(S.read[id] ? "השיעור סומן כנקרא. הכרטיסיות שלו נכנסו לחזרה היומית." : "הסימון בוטל");
        var pr = document.getElementById("s-practice"); if (pr) pr.scrollIntoView({ block: "center" });
        break;
      case "scroll":
        e.preventDefault();
        var t = document.getElementById(el.getAttribute("data-target")); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
        break;
      case "goto":
        pendingScroll = el.getAttribute("data-target");
        break;
      case "reveal":
        if (el.closest(".remember-list.hide")) el.classList.toggle("shown");
        break;
      case "pick": var o = session.order; o.picked.push(+el.getAttribute("data-si")); viewOrder(BY_ID[o.lesson]); break;
      case "unpick": var o2 = session.order; o2.picked.splice(+el.getAttribute("data-pos"), 1); viewOrder(BY_ID[o2.lesson]); break;
      case "order-check":
        var o3 = session.order, seq = lessonOrders(o3.lesson)[o3.idx];
        o3.checked = true;
        var right = o3.picked.filter(function (si, i) { return si === i; }).length;
        var rec = S.order[seq.id] || { best: 0 };
        rec.best = Math.max(rec.best || 0, right / seq.steps.length); rec.t = Date.now();
        S.order[seq.id] = rec; touchDay(); save();
        viewOrder(BY_ID[o3.lesson]); break;
      case "order-retry": startSeq(session.order); viewOrder(BY_ID[session.order.lesson]); break;
      case "order-next": session.order.idx++; startSeq(session.order); viewOrder(BY_ID[session.order.lesson]); window.scrollTo(0, 0); break;
      case "reset-ask":
        if (!resetArmed) { resetArmed = true; el.textContent = "בטוח? הקישו שוב כדי למחוק הכול"; el.classList.add("btn-primary"); setTimeout(function () { resetArmed = false; var b = document.getElementById("reset-btn"); if (b) { b.textContent = "איפוס התקדמות"; b.classList.remove("btn-primary"); } }, 4000); }
        else { resetArmed = false; S = blank(); session = { review: null, quiz: null, order: null }; save(); render(); toast("ההתקדמות אופסה"); }
        break;
    }
  });
  document.addEventListener("click", function (e) {
    var b = e.target.closest(".prose b.cloze");
    if (b) b.classList.toggle("shown");
  });
  document.addEventListener("change", function (e) {
    var el = e.target;
    if (el.id === "cloze-toggle") {
      try { localStorage.setItem(CLOZE_KEY, el.checked ? "1" : "0"); } catch (err) { /* storage blocked */ }
      applyCloze(el.checked);
    } else if (el.id === "q-scope") { quizSetup.scope = el.value; }
  });
  document.addEventListener("keydown", function (e) {
    if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "TEXTAREA")) return;
    var h = route();
    if (h === "review" || h.indexOf("review-") === 0) {
      var r = session.review; if (!r || r.i >= r.queue.length) return;
      if ((e.key === " " || e.key === "Enter") && !r.flipped) { e.preventDefault(); flip(); }
      else if (r.flipped && "1234".indexOf(e.key) !== -1) { e.preventDefault(); rate(["again", "hard", "good", "easy"][+e.key - 1]); }
    } else if (h.indexOf("quiz-") === 0 && session.quiz) {
      var q = session.quiz, it = q.items[q.i];
      if (!it) return;
      if (it.chosen === null && "1234".indexOf(e.key) !== -1 && e.key !== "") { e.preventDefault(); answer(+e.key - 1); }
      else if (it.chosen !== null && e.key === "Enter" && document.activeElement && document.activeElement.id !== "next-q") { e.preventDefault(); q.i++; viewQuiz(q.key); }
    } else if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches(".prose b.cloze, [data-act='unpick'], [data-act='flip']")) {
      e.preventDefault(); e.target.click();
    }
  });

  lastRoute = route();
  render();
  cloud.init();
})();
