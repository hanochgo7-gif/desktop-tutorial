/* MIFTAH text review: every Hebrew text on the site, page by page; changes are kept in this browser and sent to Hanoch by email. */
(function () {
  "use strict";
  var D = window.TEXTS, KEY = "miftah-text-review-v1";
  var byId = {}; D.items.forEach(function (it) { byId[it.id] = it; });
  var S = load();
  var hashTo = /(?:^|[#&])to=([^&]+)/.exec(location.hash || "");
  if (hashTo) { try { S.to = decodeURIComponent(hashTo[1]); localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  var $ = function (id) { return document.getElementById(id); };
  var main = $("main"), nav = $("nav");
  var CHIP = { "{phone}": "מספר הטלפון", "{y}": "השנה הנוכחית" };
  var PAGE_URL = function (slug) { return slug === "index" ? D.site + "/he/" : slug === "globe" ? D.site + "/globe/" : D.site + "/he/" + slug + ".html"; };

  function load() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) {}
    s = s || {};

    // a new round (Hanoch, 12 Nov 2026: "show her 0 changes and start from the beginning"): everything from the previous
    // round moves to s.rounds, kept in this browser and in the full backup file, and the list starts empty on the site as it is now
    if (D.round && s.round !== D.round) {
      var had = Object.keys(s.items || {}).length + Object.keys(s.adds || {}).length + Object.keys(s.enotes || {}).length + Object.keys(s.notes || {}).length + (s.general ? 1 : 0) + Object.keys(s.done || {}).length;
      if (had) { s.rounds = s.rounds || {}; s.rounds[s.round || "until-" + D.round] = { items: s.items || {}, adds: s.adds || {}, enotes: s.enotes || {}, notes: s.notes || {}, general: s.general || "", done: s.done || {}, doneAdds: s.doneAdds || {}, sentNotes: s.sentNotes || {}, at: Date.now() }; }
      ["items", "adds", "enotes", "notes", "done", "doneAdds", "sentNotes", "ed"].forEach(function (k) { s[k] = {}; });
      s.general = ""; s.addSeq = 0; s.round = D.round; delete s.seenEditor;
      try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
    }
    s.items = s.items || {}; s.notes = s.notes || {}; s.general = s.general || ""; s.cur = s.cur || D.groups[0].id;
    return s;
  }
  var tSaved = 0;
  function save(quiet) {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
    if (!quiet) { var el = $("saved"); el.classList.add("on"); clearTimeout(tSaved); tSaved = setTimeout(function () { el.classList.remove("on"); }, 1400); }
    progress();
  }
  function toast(msg, ms) { var t = $("toast"); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(function () { t.hidden = true; }, ms || 3200); }

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function withChips(node, s) {  // {phone} shows as a small label, not as code
    s.split(/(\{[a-z_]+\})/).forEach(function (part) {
      if (/^\{[a-z_]+\}$/.test(part)) node.appendChild(el("span", "ph-chip", CHIP[part] || "ערך אוטומטי"));
      else if (part) node.appendChild(document.createTextNode(part));
    });
    return node;
  }
  function style(it) {
    var l = it.label;
    if (l === "כותרת ראשית") return "t-h1";
    if (l === "כותרת") return "t-h2";
    if (l === "כותרת משנה" || l === "שאלה (נפתחת בלחיצה)") return "t-h3";
    if (l === "כפתור") return "t-btn";
    if (l === "קישור") return "t-link";
    if (l === "הערה קטנה" || l === "כיתוב מתחת לתמונה") return "t-small";
    if (l === "תווית" || l === "שם שורה" || l === "שם של שדה בטופס" || l === "הדגשה") return "t-label";
    return "";
  }
  function stateOf(id) {  // a mark counts only for the text it was made on; texts updated after her answers ask again
    var s = S.items[id], it = byId[id];
    if (!s || !it) return null;
    if (s.v ? s.v !== it.v : (it.was || it.m)) return null;
    return s;
  }
  function sentNote(id) { return (byId[id].note || "").trim(); }
  function txt(id) { var x = S.items[id]; return x && x.t != null ? String(x.t) : byId[id].he; }
  function changed(id) {
    var s = stateOf(id); if (!s || s.s !== "edit") return false;
    var n = (s.n || "").trim();
    var t = txt(id).trim(), it = byId[id];
    if (it.sent != null && t === it.sent.trim() && (!n || n === sentNote(id))) return false;  // already sent in an earlier email
    if (s.sentT != null && t === s.sentT && n === (s.sentN || "")) return false;  // sent from this page already
    return t !== it.he.trim() || (!!n && n !== sentNote(id));
  }
  function done(id) { var s = stateOf(id), it = byId[id]; return !!((s && (s.s === "ok" || s.s === "edit")) || it.m || (it.note && !s)); }
  function setMark(id, o) { o.v = byId[id].v; S.items[id] = o; }
  function inGroup(g) { return D.items.filter(function (it) { return g === "upd" ? (it.was || it.nw) : it.g === g; }); }

  // ---- side navigation and progress ----
  function progress() {
    var n = D.items.length, d = D.items.filter(function (it) { return done(it.id); }).length;
    var c = D.items.filter(function (it) { return changed(it.id); }).length;
    $("bar").style.width = Math.round(d / n * 100) + "%";
    $("prog-t").textContent = "עברת על " + d + " מתוך " + n + (c ? " · " + c + " תיקונים" : "");
    D.groups.forEach(function (g) {
      var b = nav.querySelector('[data-g="' + g.id + '"]'); if (!b) return;
      var its = inGroup(g.id), k = its.filter(function (it) { return done(it.id); }).length;
      b.querySelector(".ct").textContent = k + "/" + its.length;
      var dot = b.querySelector(".dot"); dot.className = "dot" + (k === its.length ? " done" : k ? " part" : ""); dot.textContent = k === its.length ? "✓" : "";
    });
  }
  function buildNav() {
    nav.textContent = "";
    D.groups.forEach(function (g) {
      var li = el("li"), b = el("button"); b.type = "button"; b.dataset.g = g.id;
      var dot = el("span", "dot"); dot.setAttribute("aria-hidden", "true");
      var nm = el("span", "nm", g.name); if (g.optional) nm.appendChild(el("span", "opt", "לא חובה"));
      b.append(dot, nm, el("span", "ct")); b.addEventListener("click", function () { go(g.id); });
      li.appendChild(b); nav.appendChild(li);
    });
    var li = el("li", "send-i"), b = el("button"); b.type = "button"; b.dataset.g = "send";
    b.append(el("span", "nm", "סיום ושליחה לחנוך")); b.addEventListener("click", function () { go("send"); });
    li.appendChild(b); nav.appendChild(li);
  }
  function mark() {
    nav.querySelectorAll("button").forEach(function (b) { if (b.dataset.g === S.cur) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
    var g = D.groups.filter(function (x) { return x.id === S.cur; })[0];
    $("mnav-t").textContent = g ? g.name : "סיום ושליחה";
  }
  function go(g) {
    S.cur = g; save(true); $("side").classList.remove("open");
    if (g === "send") renderSend(); else renderGroup(g);
    mark(); window.scrollTo(0, 0); main.focus({ preventScroll: true });
  }

  // ---- one text ----
  function card(it) {
    var c = el("article", "card"), s = stateOf(it.id);
    c.dataset.id = it.id;
    var meta = el("div", "meta");
    meta.appendChild(el("span", "kind", it.label));
    if (it.count > 1) meta.appendChild(el("span", "", "מופיע ב-" + it.count + " עמודים, ותיקון כאן משנה בכולם"));
    if (it.page && it.kind === "v") {
      var a = el("a", "", "איפה זה באתר?"); a.target = "_blank"; a.rel = "noopener";
      a.href = PAGE_URL(it.page) + "#:~:text=" + encodeURIComponent(it.he.replace(/\{[a-z_]+\}/g, " ").trim().split(/\s+/).slice(0, 6).join(" "));
      meta.appendChild(a);
    }
    var st = el("span", "st"); meta.appendChild(st);
    var tx = withChips(el("div", "txt " + style(it)), it.he);
    c.append(meta, tx);
    if (it.m) c.appendChild(el("p", "flag f-m", "✓ את כתבת את הנוסח הזה, והוא כבר באתר."));
    if (it.was) { var fw = el("p", "flag f-w"); fw.append(el("b", "", "עודכן בעקבות התשובות שלך. נא לאשר או לתקן. "), el("span", "was", "היה: " + it.was)); c.appendChild(fw); }
    if (it.nw) c.appendChild(el("p", "flag f-w", "טקסט חדש באתר, בעקבות התשובות שלך. נא לאשר או לתקן."));
    if (it.note) c.appendChild(el("p", "flag f-n", "ההערה ששלחת: " + it.note));
    if (it.held) c.appendChild(el("p", "flag f-h", "ממתין להחלטה: " + it.held));
    if (it.reply) c.appendChild(el("p", "flag f-r", "תשובה: " + it.reply));
    if (it.en) { var en = el("div", "en", it.en); en.hidden = !S.showEn; c.appendChild(en); }
    var acts = el("div", "acts"), bOk = el("button", "b-ok", "✓ נראה טוב"), bEd = el("button", "b-ed", "✎ לתקן או להעיר");
    bOk.type = bEd.type = "button"; acts.append(bOk, bEd); c.appendChild(acts);
    var ed = el("div", "ed"); ed.hidden = true;
    var idT = "t" + it.id, idN = "n" + it.id;
    var lT = el("label", "", "איך זה צריך להיות כתוב:"); lT.htmlFor = idT;
    var ta = el("textarea"); ta.id = idT; ta.rows = 2; ta.value = s && s.t != null ? s.t : it.he; ta.dir = "rtl";
    var hint = el("p", "hint", "מתקנים ישר בתוך הטקסט. אפשר גם להשאיר אותו כמו שהוא ורק לכתוב הערה למטה.");
    ed.append(lT, ta, hint);
    if (it.ph && it.ph.length) ed.appendChild(el("p", "warn", "שימי לב: " + it.ph.map(function (p) { return p + " (" + (CHIP[p] || "ערך אוטומטי") + ")"; }).join(", ") + " מתחלף לבד באתר. כדאי להשאיר אותו בדיוק כך."));
    var lN = el("label", "", "הערה לחנוך (לא חובה):"); lN.htmlFor = idN;
    var tn = el("textarea"); tn.id = idN; tn.rows = 1; tn.value = s && s.n || ""; tn.placeholder = "למשל: לבדוק עם יפתח את המספר";
    var undo = el("button", "undo", "ביטול התיקון, להחזיר את הנוסח המקורי"); undo.type = "button";
    ed.append(lN, tn, undo); c.appendChild(ed);

    function paint() {
      var s = stateOf(it.id), m = s && s.s;
      c.classList.toggle("ok", m === "ok"); c.classList.toggle("edit", m === "edit");
      bOk.setAttribute("aria-pressed", m === "ok" ? "true" : "false"); bEd.setAttribute("aria-pressed", m === "edit" ? "true" : "false");
      ed.hidden = m !== "edit";
      st.textContent = m === "ok" ? "✓ אושר" : m === "edit" ? (changed(it.id) ? "✎ תוקן" : "✎ בעריכה") : it.m ? "✓ באתר" : "";
      c.classList.toggle("ok", m === "ok" || (!m && !!it.m));
    }
    function grow(t) { t.style.height = "auto"; t.style.height = t.scrollHeight + 2 + "px"; }
    bOk.addEventListener("click", function () {
      var s = stateOf(it.id);
      if (s && s.s === "ok") delete S.items[it.id];
      else if (s && changed(it.id) && !confirm("לבטל את התיקון שכתבת ולהשאיר את הטקסט המקורי?")) return;
      else setMark(it.id, { s: "ok" });
      save(); paint();
    });
    bEd.addEventListener("click", function () {
      var s = stateOf(it.id);
      if (s && s.s === "edit") { ta.focus(); return; }
      setMark(it.id, { s: "edit", t: it.he, n: "" }); ta.value = it.he; tn.value = "";
      save(); paint(); grow(ta); ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
    });
    ta.addEventListener("input", function () { if (!stateOf(it.id)) setMark(it.id, { s: "edit", t: it.he, n: "" }); S.items[it.id].t = ta.value; grow(ta); save(); paint(); });
    tn.addEventListener("input", function () { if (!stateOf(it.id)) setMark(it.id, { s: "edit", t: it.he, n: "" }); S.items[it.id].n = tn.value; grow(tn); save(); paint(); });
    undo.addEventListener("click", function () { delete S.items[it.id]; ta.value = it.he; tn.value = ""; save(); paint(); });
    paint(); if (!ed.hidden) requestAnimationFrame(function () { grow(ta); grow(tn); });
    return c;
  }

  // ---- one page ----
  function renderGroup(gid) {
    var g = D.groups.filter(function (x) { return x.id === gid; })[0], its = inGroup(gid);
    main.textContent = "";
    var ph = el("div", "ph");
    ph.appendChild(el("h2", "", g.name));
    ph.appendChild(el("p", "", gid === "upd" ? "אחרי ששלחת את התיקונים, עדכנו גם טקסטים בעמודים אחרים כדי שיתאימו לתשובות שלך (תחזוקה, סככות, מספר המדינות, בלארוס ועוד). כאן הם מרוכזים במקום אחד, עם מה שהיה כתוב קודם. מספיק לעבור ולאשר."
      : gid === "site" ? "טקסטים שמופיעים בכל העמודים: התפריט למעלה, התחתית ופס יצירת הקשר. תיקון כאן משנה בכל האתר."
      : gid === "more" ? "טקסטים שמופיעים רק במצבים מסוימים, למשל הודעה אחרי שליחת הטופס או כשחסר שדה. אפשר לדלג."
      : "הטקסטים בסדר שבו הם מופיעים בעמוד, מלמעלה למטה."));
    var row = el("div", "row");
    if (gid !== "more" && gid !== "upd") { var a = el("a", "pill", "פתיחת העמוד באתר ↗"); a.href = g.url; a.target = "_blank"; a.rel = "noopener"; row.appendChild(a); }
    var en = el("button", "lnk", S.showEn ? "הסתרת הנוסח באנגלית" : "להציג גם את הנוסח באנגלית"); en.type = "button";
    en.addEventListener("click", function () { S.showEn = !S.showEn; save(true); renderGroup(gid); });
    row.appendChild(en); ph.appendChild(row); main.appendChild(ph);
    if (g.optional) main.appendChild(el("div", "opt-note", "העמוד הזה לא חובה. אפשר לעבור עליו אם יש זמן, או לדלג."));
    var vis = its.filter(function (it) { return it.kind === "v"; }), rest = its.filter(function (it) { return it.kind !== "v"; });
    var list = el("div", "list"); vis.forEach(function (it) { list.appendChild(card(it)); }); main.appendChild(list);
    if (rest.length) {
      var det = el("details", "more"), sm = el("summary", "", "טקסטים שלא רואים על המסך: הכותרת בגוגל ותיאורים לקוראי מסך (" + rest.length + ", לא חובה)");
      var l2 = el("div", "list"); rest.forEach(function (it) { l2.appendChild(card(it)); }); det.append(sm, l2); main.appendChild(det);
    }
    var pn = el("div", "page-note"), lb = el("label", "", "הערה כללית על העמוד (לא חובה)"), ta = el("textarea");
    ta.id = "pn-" + gid; lb.htmlFor = ta.id; ta.value = S.notes[gid] || ""; ta.placeholder = "למשל: חסר כאן משפט על האחריות, או: הסדר בעמוד לא נכון";
    ta.addEventListener("input", function () { S.notes[gid] = ta.value; save(); });
    pn.append(lb, ta); main.appendChild(pn);
    var foot = el("div", "foot"), all = el("button", "pill", "כל מה שלא סימנתי בעמוד הזה נראה טוב"); all.type = "button";
    all.addEventListener("click", function () {
      var k = 0; its.forEach(function (it) { if (!stateOf(it.id) && !it.m) { setMark(it.id, { s: "ok" }); k++; } });
      save(); renderGroup(gid); toast(k ? "סומנו " + k + " טקסטים כ'נראה טוב'." : "כל הטקסטים בעמוד כבר סומנו.");
    });
    var idx = D.groups.indexOf(g), next = D.groups[idx + 1];
    var nx = el("button", "pill solid", next ? "לעמוד הבא: " + next.name + " ←" : "לסיום ושליחה ←"); nx.type = "button";
    nx.addEventListener("click", function () { go(next ? next.id : "send"); });
    foot.append(all, nx); main.appendChild(foot);
  }

  // ---- summary and send ----
  function words(s) { return s.split(/(\s+)/); }
  function diff(a, b) {  // word-level: what was removed and what was added
    var x = words(a), y = words(b), n = x.length, m = y.length, L = [];
    for (var i = 0; i <= n; i++) { L.push(new Array(m + 1).fill(0)); }
    for (i = n - 1; i >= 0; i--) for (var j = m - 1; j >= 0; j--) L[i][j] = x[i] === y[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    var out = document.createDocumentFragment(); i = 0; j = 0;
    while (i < n || j < m) {
      if (i < n && j < m && x[i] === y[j]) { out.appendChild(document.createTextNode(x[i])); i++; j++; }
      else if (j < m && (i === n || L[i][j + 1] >= L[i + 1][j])) { out.appendChild(el("ins", "", y[j])); j++; }
      else { out.appendChild(el("del", "", x[i])); i++; }
    }
    return out;
  }
  function changes() { return D.items.filter(function (it) { return changed(it.id); }); }
  function groupName(g) { var x = D.groups.filter(function (y) { return y.id === g; })[0]; return x ? x.name : ""; }
  function report() {
    var ch = changes(), d = new Date(), lines = [];
    var nT = ch.filter(function (it) { return txt(it.id).trim() !== it.he.trim(); }).length;
    lines.push("שינויים בטקסטים של אתר מיפתח");
    lines.push("מאת מרב, " + d.toLocaleDateString("he-IL") + " " + d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }));
    var pl = function (n, one, many) { return n === 1 ? one : n === 0 ? "אין " + many : n + " " + many; };
    lines.push(pl(nT, "תיקון נוסח אחד", "תיקוני נוסח") + ", " + pl(ch.length - nT, "הערה אחת בלי שינוי נוסח", "הערות בלי שינוי נוסח") + ". עברתי על " + D.items.filter(function (it) { return done(it.id); }).length + " מתוך " + D.items.length + " טקסטים.");
    lines.push("");
    if (S.general.trim() && S.general.trim() !== (D.sentGeneral || "").trim() && S.general.trim() !== (S.sentGeneral || "")) { lines.push("הערה כללית:", S.general.trim(), ""); }
    var lastG = "";
    ch.forEach(function (it) {
      var s = S.items[it.id];
      if (it.g !== lastG) { lines.push("==== " + groupName(it.g) + " ===="); lastG = it.g; }
      lines.push("[#" + it.id + "] " + it.label);
      lines.push("היום: " + it.he);
      if (txt(it.id).trim() !== it.he.trim()) lines.push("חדש: " + txt(it.id).trim());
      if ((s.n || "").trim() && s.n.trim() !== sentNote(it.id)) lines.push("הערה: " + s.n.trim());
      lines.push("");
    });
    var sn = S.sentNotes || {}, pn = D.groups.filter(function (g) { var x = (S.notes[g.id] || "").trim(); return x && x !== sn[g.id]; });
    if (pn.length) { lines.push("==== הערות כלליות לעמודים ===="); pn.forEach(function (g) { lines.push(g.name + ": " + S.notes[g.id].trim()); }); lines.push(""); }
    lines.push("(נוצר בעמוד עריכת הטקסטים. המספרים בסוגריים מזהים כל טקסט.)");
    return lines.join("\n");
  }
  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return legacy(); });
    return Promise.resolve(legacy());
    function legacy() { var t = el("textarea"); t.value = text; t.style.position = "fixed"; t.style.opacity = "0"; document.body.appendChild(t); t.select(); var ok = false; try { ok = document.execCommand("copy"); } catch (e) {} t.remove(); return ok; }
  }
  function renderSend() {
    main.textContent = "";
    var ch = changes(), pn = D.groups.filter(function (g) { return (S.notes[g.id] || "").trim(); });
    var ph = el("div", "ph"); ph.appendChild(el("h2", "", "סיום ושליחה לחנוך")); ph.appendChild(el("p", "", "כאן רואים את כל מה שתיקנת, לפני ואחרי. אם הכול נכון, שולחים בכפתור למטה."));
    main.appendChild(ph);
    var stats = el("div", "sum-stats");
    [[ch.filter(function (it) { return txt(it.id).trim() !== it.he.trim(); }).length, "תיקוני נוסח חדשים"],
     [ch.filter(function (it) { return (S.items[it.id].n || "").trim(); }).length + pn.length, "הערות"],
     [D.items.filter(function (it) { return done(it.id); }).length + " / " + D.items.length, "טקסטים שעברת עליהם"]].forEach(function (x) {
      var s = el("div", "stat"); s.append(el("b", "", String(x[0])), el("span", "", x[1])); stats.appendChild(s);
    });
    main.appendChild(stats);
    if (!ch.length && !pn.length) main.appendChild(el("div", "empty", "עוד לא תיקנת שום טקסט. אפשר לחזור לעמודים, או לשלוח בכל זאת, למשל אם הכול נראה טוב."));
    ch.forEach(function (it) {
      var s = S.items[it.id], b = el("div", "chg");
      var w = el("div", "where-l", groupName(it.g) + " · " + it.label + " · ");
      var back = el("button", "lnk", "לחזור לטקסט"); back.type = "button"; back.style.fontSize = ".85rem"; back.style.padding = "0";
      back.addEventListener("click", function () { go(it.g); setTimeout(function () { var c = main.querySelector('[data-id="' + it.id + '"]'); if (c) { var d = c.closest("details"); if (d) d.open = true; c.scrollIntoView({ block: "center" }); var t = c.querySelector("textarea"); if (t) t.focus({ preventScroll: true }); } }, 60); });
      w.appendChild(back); b.appendChild(w);
      if (txt(it.id).trim() !== it.he.trim()) {
        var af = el("div", "after"); af.appendChild(el("span", "tag", "אחרי:")); af.appendChild(diff(it.he.trim(), txt(it.id).trim()));
        var bf = el("div", "before"); bf.appendChild(el("span", "tag", "היום:")); bf.appendChild(document.createTextNode(it.he));
        b.append(af, bf);
      } else { var bf2 = el("div", "before"); bf2.appendChild(el("span", "tag", "הטקסט:")); bf2.appendChild(document.createTextNode(it.he)); b.appendChild(bf2); }
      if ((s.n || "").trim()) b.appendChild(el("div", "note", "הערה: " + s.n.trim()));
      main.appendChild(b);
    });
    pn.forEach(function (g) { var b = el("div", "chg"); b.append(el("div", "where-l", g.name + " · הערה כללית על העמוד"), el("div", "note", S.notes[g.id].trim())); main.appendChild(b); });

    var box = el("section", "send-box"); box.setAttribute("aria-labelledby", "sb-h");
    var h = el("h3", "", "שליחה לחנוך"); h.id = "sb-h";
    box.append(h, el("p", "", "לחיצה על הכפתור פותחת מייל מוכן עם כל התיקונים וההערות. נשאר רק ללחוץ \"שלח\" במייל."));
    var lb = el("label", "", "משהו נוסף שתרצי להגיד לחנוך? (לא חובה)"), ta = el("textarea"); ta.id = "general"; lb.htmlFor = "general"; ta.value = S.general;
    ta.addEventListener("input", function () { S.general = ta.value; save(); });
    box.append(lb, ta);
    var btns = el("div", "btns"), bMail = el("button", "big", "✉ פתיחת מייל לחנוך עם השינויים"), bCopy = el("button", "sec", "העתקת השינויים"), bFile = el("button", "sec", "שמירה כקובץ");
    bMail.type = bCopy.type = bFile.type = "button"; btns.append(bMail, bCopy, bFile); box.appendChild(btns);
    var msg = el("div", "send-msg"); msg.hidden = true; msg.setAttribute("role", "status"); box.appendChild(msg);
    main.appendChild(box);

    bMail.addEventListener("click", function () {
      var body = report(), subj = "תיקוני טקסטים לאתר מיפתח (מרב)";
      copy(body).then(function () {
        var long = encodeURIComponent(body).length > 12000;
        var href = "mailto:" + encodeURIComponent(S.to || "") + "?subject=" + encodeURIComponent(subj) + "&body=" + encodeURIComponent(long ? "התיקונים מועתקים. לוחצים כאן בתוך המייל ובוחרים \"הדבק\" (או Ctrl+V):\n\n" : body);
        location.href = href;
        msg.hidden = false; msg.textContent = "";
        msg.append(el("b", "", long ? "נפתח מייל לחנוך. התיקונים ארוכים מדי לשורת המייל, ולכן הם הועתקו: לוחצים בתוך המייל ובוחרים \"הדבק\", ואז \"שלח\"." : "נפתח מייל לחנוך עם כל השינויים. בודקים ולוחצים \"שלח\"."),
          el("div", "", "לא נפתח מייל? התיקונים כבר הועתקו: פותחים מייל חדש לחנוך, מדביקים (לחיצה ארוכה ו\"הדבק\", או Ctrl+V) ושולחים. אפשר גם ללחוץ \"שמירה כקובץ\" ולצרף את הקובץ."));
        S.sentAt = new Date().toISOString(); S.sentGeneral = S.general.trim(); S.sentNotes = {};
        Object.keys(S.notes).forEach(function (k) { S.sentNotes[k] = (S.notes[k] || "").trim(); });
        changes().forEach(function (it) { var x = S.items[it.id]; x.sentT = txt(it.id).trim(); x.sentN = (x.n || "").trim(); }); save(true);
      });
    });
    bCopy.addEventListener("click", function () { copy(report()).then(function (ok) { toast(ok ? "השינויים הועתקו. אפשר להדביק אותם במייל או בהודעה לחנוך." : "ההעתקה לא הצליחה. נסי \"שמירה כקובץ\"."); }); });
    bFile.addEventListener("click", function () {
      var blob = new Blob(["﻿" + report()], { type: "text/plain;charset=utf-8" }), a = el("a");
      a.href = URL.createObjectURL(blob); a.download = "תיקוני-טקסטים-מיפתח.txt"; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000); toast("הקובץ נשמר בתיקיית ההורדות.");
    });
  }

  // ---- start ----
  function topH() { document.documentElement.style.setProperty("--top-h", document.querySelector(".top").offsetHeight + "px"); }
  topH(); window.addEventListener("resize", topH);
  buildNav();
  $("mnav-b").addEventListener("click", function () { $("side").classList.add("open"); $("side-x").focus(); });
  $("side-x").addEventListener("click", function () { $("side").classList.remove("open"); $("mnav-b").focus(); });
  var w = $("welcome");
  function closeW() { w.hidden = true; if (!S.started) S.seenUpd = D.items.filter(function (it) { return it.was || it.nw; }).length + ":" + D.items.filter(function (it) { return it.m; }).length; S.started = true; save(true); main.focus({ preventScroll: true }); }
  $("start").addEventListener("click", closeW);
  $("help").addEventListener("click", function () { w.hidden = false; $("start").textContent = "חזרה לעריכה"; $("start").focus(); });
  w.addEventListener("keydown", function (e) { if (e.key === "Escape") closeW(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && $("side").classList.contains("open")) { $("side").classList.remove("open"); $("mnav-b").focus(); } });
  go(S.cur === "send" || D.groups.some(function (g) { return g.id === S.cur; }) ? S.cur : D.groups[0].id);
  var nM = D.items.filter(function (it) { return it.m; }).length, nU = D.items.filter(function (it) { return it.was || it.nw; }).length;
  if (!S.started) { w.hidden = false; $("start").focus(); }
  else if (nU && S.seenUpd !== nU + ":" + nM) {
    S.seenUpd = nU + ":" + nM; save(true); go("upd");
    toast(nM + " התיקונים ששלחת כבר באתר ומסומנים ✓. בעקבותיהם עדכנו עוד " + nU + " טקסטים, והם מרוכזים כאן לאישור שלך.", 9000);
  } else if (S.cur !== D.groups[0].id) toast("ממשיכים מאיפה שעצרת.");
  progress();
})();
