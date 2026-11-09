/* MIFTAH live site editor: the real Hebrew pages in a frame; click a text and type. Changes stay in this browser
   (shared with /text-review/, same storage and the same email format) until they are sent to Hanoch. */
(function () {
  "use strict";
  var D = window.TEXTS, KEY = "miftah-text-review-v1";
  var byId = {}; D.items.forEach(function (it) { byId[it.id] = it; });
  var $ = function (id) { return document.getElementById(id); };
  var frame = $("frame"), stage = $("stage");

  // ---- state (same shape as the text-review page, so both tools see the same work) ----
  var S = load();
  var hashTo = /(?:^|[#&])to=([^&]+)/.exec(location.hash || "");
  if (hashTo) { try { S.to = decodeURIComponent(hashTo[1]); localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function load() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) {}
    s = s || {};
    s.items = s.items || {}; s.notes = s.notes || {}; s.general = s.general || ""; s.enotes = s.enotes || {}; s.ed = s.ed || {}; s.adds = s.adds || {}; s.addSeq = s.addSeq || 0;
    return s;
  }
  var tSaved = 0;
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast("לא הצלחתי לשמור בדפדפן הזה. כדאי לשלוח לחנוך עכשיו, כדי שלא ילך לאיבוד."); }
    var el = $("saved"); el.classList.add("on"); clearTimeout(tSaved); tSaved = setTimeout(function () { el.classList.remove("on"); }, 1400);
    count(); if (!$("panel").hidden) renderPanel();
  }
  function toast(msg, ms) { var t = $("toast"); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(function () { t.hidden = true; }, ms || 3400); }
  function el(tag, cls, text, doc) { var e = (doc || document).createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  function stateOf(id) {
    var s = S.items[id], it = byId[id];
    if (!s || !it) return null;
    if (s.v ? s.v !== it.v : (it.was || it.m)) return null;
    return s;
  }
  function sentNote(id) { return (byId[id].note || "").trim(); }
  function txt(id) { var s = stateOf(id); return s && s.t != null ? String(s.t) : byId[id].he; }
  function noteOf(id) { var s = stateOf(id); return s ? (s.n || "") : ""; }
  function changed(id) {
    var s = stateOf(id); if (!s || s.s !== "edit") return false;
    var n = (s.n || "").trim(), t = txt(id).trim(), it = byId[id], d = !!s.d;
    if (!d && it.sent != null && t === it.sent.trim() && (!n || n === sentNote(id))) return false;
    if (s.sentT != null && t === s.sentT && n === (s.sentN || "") && d === !!s.sentD) return false;
    return t !== it.he.trim() || d || (!!n && n !== sentNote(id));
  }
  function deleted(id) { var s = stateOf(id); return !!(s && s.d); }
  function edited(id) { return txt(id).trim() !== byId[id].he.trim(); }
  function mkItem(id, t, n, h, del) {  // the stored state for a text: t the new text (null = as on the site), n a note, h the edited markup (display only), del remove it
    var it = byId[id], prev = S.items[id] ? JSON.parse(JSON.stringify(S.items[id])) : null;
    t = t == null ? it.he : t; n = n || "";
    var d = del == null ? !!(prev && prev.d && prev.v === it.v) : !!del;
    var next = (t.trim() === it.he.trim() && !n.trim() && !d) ? null : { s: "edit", t: t, n: n, v: it.v };
    if (next && d) next.d = 1;
    if (next && prev && prev.sentT != null) { next.sentT = prev.sentT; next.sentN = prev.sentN; if (prev.sentD) next.sentD = prev.sentD; }
    if (next && t.trim() !== it.he.trim()) { if (h) next.h = h; else if (prev && prev.h && prev.t === t) next.h = prev.h; }
    return { id: id, prev: prev, next: next };
  }
  function put(x) { if (x.next) S.items[x.id] = x.next; else delete S.items[x.id]; S.ed[x.id] = Date.now(); }
  function setItem(id, t, n, h, del) {
    var x = mkItem(id, t, n, h, del);
    if (JSON.stringify(x.prev) === JSON.stringify(x.next)) return false;
    put(x); push({ k: "i", id: id, prev: x.prev, next: x.next });
    save(); paintId(id); return true;
  }
  function setMany(list, label) {  // one step for undo: a replace across the site
    list = list.filter(function (x) { return JSON.stringify(x.prev) !== JSON.stringify(x.next); });
    if (!list.length) return 0;
    list.forEach(put); push({ k: "b", list: list, label: label });
    save(); list.forEach(function (x) { paintId(x.id); }); return list.length;
  }
  function setENote(key, info, n) {
    var prev = S.enotes[key] ? JSON.parse(JSON.stringify(S.enotes[key])) : null;
    var next = n.trim() ? Object.assign({}, info, { n: n, at: Date.now() }) : null;
    if (JSON.stringify(prev && prev.n) === JSON.stringify(next && next.n)) return;
    if (next) S.enotes[key] = next; else delete S.enotes[key];
    push({ k: "e", id: key, prev: prev, next: next }); save(); paintENotes();
  }

  // ---- undo / redo ----
  var U = [], R = [];
  function push(a) { U.push(a); if (U.length > 200) U.shift(); R = []; undoBtns(); }
  function apply(a, back) {
    var v = back ? a.prev : a.next;
    if (a.k === "i") { if (v) S.items[a.id] = v; else delete S.items[a.id]; paintId(a.id); }
    else if (a.k === "b") a.list.forEach(function (x) { var y = back ? x.prev : x.next; if (y) S.items[x.id] = y; else delete S.items[x.id]; paintId(x.id); });
    else if (a.k === "a") { if (v) S.adds[a.id] = v; else delete S.adds[a.id]; renderAdds(); }
    else { if (v) S.enotes[a.id] = v; else delete S.enotes[a.id]; paintENotes(); }
    save();
  }
  function undo() { if (FX.editing) FX.finish(); var a = U.pop(); if (!a) return; apply(a, true); R.push(a); undoBtns(); toast("בוטל: " + what(a)); }
  function redo() { var a = R.pop(); if (!a) return; apply(a, false); U.push(a); undoBtns(); toast("הוחזר: " + what(a)); }
  function what(a) { if (a.k === "e") return "הערה"; if (a.k === "b") return a.label || "החלפה ב-" + a.list.length + " מקומות"; if (a.k === "a") return "תוספת"; var t = byId[a.id].he; return "״" + (t.length > 40 ? t.slice(0, 40) + "…" : t) + "״"; }
  function undoBtns() { $("b-undo").disabled = !U.length; $("b-redo").disabled = !R.length; }

  // ---- pages ----
  var PAGES = D.groups.filter(function (g) { return ["upd", "site", "more"].indexOf(g.id) < 0; });
  function pathOf(slug) { return slug === "index" ? "/he/" : slug === "globe" ? "/globe/?lang=he" : "/he/" + slug + ".html"; }
  function slugOf(loc) {
    var p = loc.pathname;
    if (/^\/globe\//.test(p)) return "globe";
    var m = /^\/he\/(?:([a-z0-9-]+)\.html)?$/.exec(p);
    if (!m) return null;
    return m[1] || "index";
  }
  function pageName(slug) { var g = PAGES.filter(function (x) { return x.id === slug; })[0]; return g ? g.name : slug; }
  function groupName(g) { var x = D.groups.filter(function (y) { return y.id === g; })[0]; return x ? x.name : g; }
  var sel = $("page");
  PAGES.forEach(function (g) { var o = el("option", "", g.name); o.value = g.id; sel.appendChild(o); });
  sel.addEventListener("change", function () { go(sel.value); });
  var cur = null;
  function go(slug, then) {
    if (FX.editing) FX.finish();
    cur = slug; S.cur = slug; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
    pendingThen = then || null;
    $("loading").hidden = false;
    frame.src = pathOf(slug);
  }
  var pendingThen = null;

  // ---- matching the page's text to the site's texts ----
  function norm(s) { return String(s).replace(/[⁦-⁩‎‏­]/g, "").replace(/ /g, " ").replace(/\s+/g, " ").trim(); }
  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
  var EXACT = {}, PHR = [];
  D.items.forEach(function (it) {
    var n = norm(it.he); if (n.length < 2) return;
    if (it.ph && it.ph.length) {
      var parts = n.split(/(\{[a-z_]+\})/), re = "^", keys = [];
      parts.forEach(function (p) { if (/^\{[a-z_]+\}$/.test(p)) { re += "(.+?)"; keys.push(p); } else re += esc(p); });
      PHR.push({ re: new RegExp(re + "$"), id: it.id, keys: keys });
    } else (EXACT[n] = EXACT[n] || []).push(it.id);
  });
  function pick(ids, slug) {  // the same text can belong to more than one place; prefer this page's own
    if (ids.length === 1) return ids[0];
    var own = ids.filter(function (i) { return byId[i].g === slug; })[0];
    var site = ids.filter(function (i) { return byId[i].g === "site"; })[0];
    var vis = ids.filter(function (i) { return byId[i].kind === "v"; })[0];
    return own || site || vis || ids[0];
  }
  var SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEMPLATE: 1, SVG: 1, svg: 1, IFRAME: 1, CANVAS: 1, VIDEO: 1, SELECT: 1, OPTION: 1, TEXTAREA: 1, INPUT: 1, TITLE: 1, HEAD: 1 };
  var INLINE_BAD = { BUTTON: 1, SUMMARY: 1, LABEL: 1, LEGEND: 1, OPTION: 1 };  // edited in a small box instead of on the page

  // ---- everything that happens inside the frame ----
  var FX = { doc: null, editing: null };
  var CSS = [
    "html.mfe-on [data-mfe]{cursor:text}",
    "html.mfe-on [data-mfe-x], html.mfe-on img[data-mfe-img], html.mfe-on picture[data-mfe-img]{cursor:pointer}",
    "html.mfe-on .mfe-hov{outline:2px dashed #1B6E62 !important;outline-offset:3px !important}",
    "html.mfe-on .mfe-hov.mfe-x-hov{outline-color:#8A9A95 !important}",
    ".mfe-chg{background-color:rgba(255,214,102,.5) !important;box-shadow:0 0 0 3px rgba(255,214,102,.5) !important;border-radius:3px}",
    ".mfe-not{box-shadow:inset 0 -3px 0 #E9A93A !important}",
    "html.mfe-orig .mfe-chg, html.mfe-orig .mfe-not{background-color:transparent !important;box-shadow:none !important}",
    ".mfe-edit{outline:3px solid #7FC49B !important;outline-offset:4px !important;box-shadow:0 0 0 7px rgba(14,66,57,.28) !important;background-color:rgba(127,196,155,.16) !important;caret-color:currentColor;cursor:text !important;user-select:text !important;-webkit-user-select:text !important;white-space:normal !important;border-radius:3px;min-width:1em}",
    ".mfe-sel{outline:3px solid #1B6E62 !important;outline-offset:3px !important}",
    "@keyframes mfeflash{0%,100%{outline-color:rgba(27,110,98,0)}30%,70%{outline-color:#1B6E62}}",
    ".mfe-flash{outline:4px solid #1B6E62 !important;outline-offset:4px !important;animation:mfeflash 1.6s 1}",
    "#mfe-bar,#mfe-bar *{all:revert;box-sizing:border-box;font-family:Heebo,system-ui,Arial,sans-serif !important;letter-spacing:0 !important;text-transform:none !important}",
    "#mfe-bar{position:fixed;z-index:2147483647;direction:rtl;background:#0E4239;color:#fff;border-radius:12px;padding:6px;box-shadow:0 10px 30px rgba(0,0,0,.3);font-size:15px;line-height:1.35;max-width:min(440px,calc(100vw - 16px));text-align:right}",
    "#mfe-bar .mfe-l{display:block;font-size:12px;color:#BFDCCD;padding:2px 6px 6px}",
    "#mfe-bar .mfe-r{display:flex;gap:4px;flex-wrap:wrap}",
    "#mfe-bar button{background:rgba(255,255,255,.12);color:#fff;border:0;border-radius:8px;padding:7px 11px;font-size:14px;font-weight:600;cursor:pointer;min-height:34px;white-space:nowrap}",
    "#mfe-bar button:hover{background:rgba(255,255,255,.22)}",
    "#mfe-bar button.mfe-ok{background:#7FC49B;color:#0E4239;font-weight:800}",
    "#mfe-bar textarea{display:block;width:100%;margin:6px 0;border:0;border-radius:8px;padding:8px 10px;font-size:15px;line-height:1.5;min-height:70px;color:#0D1F1B;background:#fff;resize:vertical;direction:rtl}",
    "#mfe-bar .mfe-p{display:block;font-size:13px;color:#D6EBE0;margin:4px 6px}",
    "#mfe-bar .mfe-was{display:block;font-size:13px;color:#D6EBE0;margin:2px 6px 6px;max-height:4.2em;overflow:auto}",
    "#mfe-bar .mfe-was b{color:#fff}",
    "#mfe-bar .mfe-cnt{display:block;font-size:12px;color:#BFDCCD;margin:4px 6px 0}",
    "#mfe-bar .mfe-cnt b{color:#FFE08A}",
    "#mfe-bar .mfe-sub{display:flex;gap:4px;flex-wrap:wrap;margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,.15)}",
    "#mfe-bar .mfe-sub button{font-size:13px;padding:5px 9px;min-height:30px}",
    "#mfe-bar button[aria-pressed=true]{background:#fff;color:#0E4239}",
    "#mfe-bar button.mfe-dan{background:rgba(255,120,100,.22)}",
    "#mfe-bar .mfe-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}",
    "#mfe-bar .mfe-grid button{display:flex;flex-direction:column;align-items:flex-start;gap:2px;padding:9px 11px;text-align:right;white-space:normal}",
    "#mfe-bar .mfe-grid small{font-size:12px;font-weight:400;color:#BFDCCD}",
    ".mfe-del{text-decoration:line-through !important;text-decoration-thickness:2px !important;text-decoration-color:#C2412D !important;opacity:.45 !important}",
    "html.mfe-orig .mfe-del{text-decoration:none !important;opacity:1 !important}",
    ".mfe-new{outline:2px dashed #7FC49B !important;outline-offset:5px !important;position:relative}",
    ".mfe-new::after{content:'חדש';position:absolute;top:-14px;left:-6px;background:#7FC49B;color:#0E4239;font:700 11px/1 Heebo,Arial,sans-serif;padding:3px 7px;border-radius:99px;letter-spacing:0;text-transform:none;pointer-events:none;-webkit-text-fill-color:#0E4239}",
    "html.mfe-orig [data-mfe-add]{display:none !important}",
    ".mfe-imgph{border:2px dashed #7FC49B;border-radius:12px;padding:40px 20px;text-align:center;color:#1B6E62;background:rgba(127,196,155,.12);font-size:18px;margin:16px 0}",
    ".mfe-imgph::before{content:'🖼  ';}",
    "html.mfe-add *{cursor:copy !important}",
    "#mfe-line{position:fixed;z-index:2147483646;height:4px;background:#1B6E62;border-radius:4px;pointer-events:none;box-shadow:0 0 0 3px rgba(127,196,155,.5)}",
    "#mfe-line span{position:absolute;top:-13px;right:-4px;background:#1B6E62;color:#fff;font:700 13px/1 Heebo,Arial,sans-serif;padding:6px 10px;border-radius:99px;white-space:nowrap}",
    "html.mfe-add .mfe-addhov{outline:2px solid rgba(27,110,98,.35) !important;outline-offset:2px !important}"
  ].join("\n");

  frame.addEventListener("load", function () {
    $("loading").hidden = true;
    var w = frame.contentWindow, doc;
    try { doc = frame.contentDocument; void doc.body.textContent; } catch (e) { doc = null; }
    if (!doc || !doc.body) return;
    FX.doc = doc; FX.editing = null; FX.selected = null;
    var slug = slugOf(w.location);
    $("en").hidden = !!slug || !/^\/[a-z0-9-]*(\.html)?$/.test(w.location.pathname);
    if (slug) { cur = slug; S.cur = slug; sel.value = slug; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
    setup(doc, w);
    if (pendingThen) { var f = pendingThen; pendingThen = null; setTimeout(f, 250); }
    if (!$("panel").hidden) renderPanel();
  });
  $("en-go").addEventListener("click", function () { go(cur || "index"); });

  var MAP = {};  // id -> [elements] on this page
  function setup(doc, w) {
    var st = el("style", "", CSS, doc); st.id = "mfe-css"; doc.head.appendChild(st);
    doc.documentElement.classList.toggle("mfe-on", MODE === "edit");
    doc.documentElement.classList.toggle("mfe-add", MODE === "add");
    doc.documentElement.classList.toggle("mfe-orig", ORIG);
    scan(doc);
    setTimeout(function () { if (FX.doc === doc) scan(doc); }, 1500);  // texts some pages fill in after loading
    doc.addEventListener("mousemove", function (e) {
      if (MODE === "add") { if (!bar) addGuide(e); return; }
      if (MODE !== "edit" || FX.editing) return; hover(target(e.target) || under(e));
    }, true);
    doc.addEventListener("mouseout", function (e) { if (!e.relatedTarget) hover(null); }, true);
    ["click", "auxclick", "dblclick"].forEach(function (ev) {
      doc.addEventListener(ev, function (e) {
        if (MODE === "view") return;
        if (inBar(e.target)) return;
        if (FX.editing && FX.editing.contains(e.target)) { e.stopPropagation(); if (e.target.closest && e.target.closest("a,button,summary,label")) e.preventDefault(); return; }
        e.preventDefault(); e.stopPropagation();
        if (ev !== "click") return;
        if (FX.editing) FX.finish();
        if (MODE === "add") { if (bar) { closeBar(); addGuide(e); return; } var g = addSpot(e); if (g) chooser(g.b, g.pos); return; }
        var t = target(e.target) || under(e);
        if (t) choose(t, e);
        else closeBar();
      }, true);
    });
    doc.addEventListener("submit", function (e) { if (MODE !== "view") { e.preventDefault(); e.stopPropagation(); } }, true);
    doc.addEventListener("keydown", function (e) {
      if (FX.editing) {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); FX.finish(); }
        else if (e.key === "Escape") { e.preventDefault(); FX.cancel(); }
        e.stopPropagation(); return;
      }
      keys(e);
    }, true);
    w.addEventListener("scroll", place, { passive: true });
    w.addEventListener("resize", place);
    paintAll(); paintENotes(); renderAdds();
  }
  function inBar(n) { return n && n.closest && n.closest("#mfe-bar"); }
  function target(n) {
    if (!n || n.nodeType !== 1 || inBar(n)) return null;
    var ad = n.closest("[data-mfe-add]");
    if (ad) return ad;
    var t = n.closest("[data-mfe]");
    if (t) return t;
    var im = n.closest("img,picture");
    if (im) { var p = im.closest("picture") || im; if (p.hasAttribute("data-mfe-img")) return p; }
    return n.closest("[data-mfe-x]");
  }
  function under(e) {  // a photo under a gradient or a caption layer
    var d = FX.doc; if (!d || !d.elementsFromPoint) return null;
    var all = d.elementsFromPoint(e.clientX, e.clientY);
    for (var i = 0; i < all.length; i++) { var p = all[i].closest && all[i].closest("[data-mfe-img]"); if (p) return p; }
    return null;
  }
  var hovEl = null;
  function hover(t) {
    if (hovEl === t) return;
    if (hovEl) hovEl.classList.remove("mfe-hov", "mfe-x-hov");
    hovEl = t;
    if (t && t !== FX.editing) { t.classList.add("mfe-hov"); if (t.hasAttribute("data-mfe-x")) t.classList.add("mfe-x-hov"); }
  }

  var ORIG_HTML = new WeakMap(), VALS = new WeakMap();
  function scan(doc) {
    var all = doc.body.getElementsByTagName("*"), list = [];
    for (var i = 0; i < all.length; i++) list.push(all[i]);
    var claimed = [];
    for (i = list.length - 1; i >= 0; i--) {
      var e = list[i];
      if (e.hasAttribute("data-mfe") || e.id === "mfe-bar" || e.id === "mfe-line" || inBar(e) || e.closest("[data-mfe-add]")) continue;
      if (skipped(e)) continue;
      var raw = textOf(e); if (!raw || raw.length > 1500) continue;
      var t = norm(raw); if (t.length < 2) continue;
      if (e.querySelector("[data-mfe]")) continue;
      var id = null, vals = null;
      if (EXACT[t]) id = pick(EXACT[t], cur);
      else if (t.length > 4) {
        for (var k = 0; k < PHR.length; k++) { var m = PHR[k].re.exec(t); if (m) { id = PHR[k].id; vals = {}; PHR[k].keys.forEach(function (key, j) { vals[key] = m[j + 1]; }); break; } }
      }
      if (id == null) continue;
      if (e.querySelector("img,svg,picture,input,select,textarea,video,canvas,br")) {  // keep icons and pictures: put the text alone in its own box
        var tn = null, cnt = 0;
        for (var c0 = e.firstChild; c0; c0 = c0.nextSibling) if (c0.nodeType === 3 && norm(c0.nodeValue)) { tn = c0; cnt++; }
        if (cnt !== 1 || norm(tn.nodeValue) !== t) continue;
        var sp = doc.createElement("span"); e.insertBefore(sp, tn); sp.appendChild(tn); e = sp;
      }
      e.setAttribute("data-mfe", id); ORIG_HTML.set(e, e.innerHTML); if (vals) VALS.set(e, vals);
      claimed.push(e);
    }
    // texts that share a paragraph with other texts: wrap each in its own box
    var cand = D.items.filter(function (it) { return it.kind === "v" && !(it.ph && it.ph.length) && norm(it.he).length > 2 && (it.g === cur || it.g === "site" || it.page === cur || it.g === "more") && !doc.body.querySelector('[data-mfe="' + it.id + '"]'); });
    if (cand.length) {
      var tw = doc.createTreeWalker(doc.body, 4, null), tn2, nodes = [];
      while ((tn2 = tw.nextNode())) { if (norm(tn2.nodeValue).length > 2 && !(tn2.parentNode.closest && tn2.parentNode.closest("[data-mfe],#mfe-bar")) && !skipped(tn2.parentNode)) nodes.push(tn2); }
      cand.sort(function (a, b) { return b.he.length - a.he.length; });
      cand.forEach(function (it) {
        var he = it.he.trim(), nh = norm(he);
        for (var q = 0; q < nodes.length; q++) {
          var nd = nodes[q], v = nd.nodeValue, at = v.indexOf(he);
          if (at < 0) { if (norm(v) === nh) { at = 0; he = v; } else continue; }
          var mid = at > 0 ? nd.splitText(at) : nd, rest = mid.nodeValue.length > he.length ? mid.splitText(he.length) : null;
          var sp2 = doc.createElement("span"); mid.parentNode.insertBefore(sp2, mid); sp2.appendChild(mid);
          sp2.setAttribute("data-mfe", it.id); ORIG_HTML.set(sp2, sp2.innerHTML);
          nodes.splice(q, 1, at > 0 ? nd : null, rest); nodes = nodes.filter(Boolean);
          break;
        }
      });
    }
    // pictures: a note on any picture, and its description if it is one of the site's texts
    var ims = doc.body.querySelectorAll("img");
    for (i = 0; i < ims.length; i++) {
      var im = ims[i], p = im.closest("picture") || im;
      if (p.hasAttribute("data-mfe-img") || inBar(im)) continue;
      var r = im.getBoundingClientRect(); if (r.width < 40 && r.height < 40 && im.complete) continue;
      p.setAttribute("data-mfe-img", "");
    }
    // texts nobody can type into (made by the page itself): a note is still possible
    for (i = 0; i < list.length; i++) {
      e = list[i];
      if (skipped(e) || e.hasAttribute("data-mfe") || e.closest("[data-mfe]") || e.hasAttribute("data-mfe-x")) continue;
      var own = ""; for (var c = e.firstChild; c; c = c.nextSibling) if (c.nodeType === 3) own += c.nodeValue;
      if (norm(own).length >= 2 && /[֐-׿0-9A-Za-z]/.test(own) && !e.querySelector("[data-mfe]")) e.setAttribute("data-mfe-x", "");
    }
    MAP = {};
    var cl = doc.body.querySelectorAll("[data-mfe]");
    for (i = 0; i < cl.length; i++) { var x = +cl[i].getAttribute("data-mfe"); (MAP[x] = MAP[x] || []).push(cl[i]); }
  }
  function textOf(e) {  // the text a visitor reads (not the icons' hidden titles)
    if (!e.querySelector("svg,script,style,noscript,template")) return e.textContent;
    var out = "", w = e.ownerDocument.createTreeWalker(e, 4, null), n;
    while ((n = w.nextNode())) { var p = n.parentNode, bad = false; for (; p && p !== e; p = p.parentNode) if (p.namespaceURI === "http://www.w3.org/2000/svg" || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(p.tagName)) { bad = true; break; } if (!bad) out += n.nodeValue; }
    return out;
  }
  function skipped(e) {
    for (var n = e; n && n.nodeType === 1; n = n.parentNode) {
      if (SKIP[n.tagName] || n.namespaceURI === "http://www.w3.org/2000/svg") return true;
      if (n.tagName === "BODY") return false;
    }
    return false;
  }
  function display(id, node) {  // a stored text with {phone} and friends filled in the way the page shows them
    var t = txt(id), v = VALS.get(node);
    if (v) Object.keys(v).forEach(function (k) { t = t.split(k).join(v[k]); });
    return t;
  }
  function stored(id, node, shown) {
    var v = VALS.get(node), t = norm(shown);
    if (v) Object.keys(v).forEach(function (k) { if (v[k] && t.indexOf(v[k]) >= 0) t = t.split(v[k]).join(k); });
    return t;
  }
  function blockText(n) {  // two lines in two boxes read as two words, not one
    var w = n.ownerDocument.defaultView, out = "";
    for (var c = n.firstChild; c; c = c.nextSibling) {
      if (c.nodeType === 3) out += c.nodeValue;
      else if (c.nodeType === 1) { var d = w.getComputedStyle(c).display, bl = d !== "inline" && d !== "contents"; out += (bl ? " " : "") + blockText(c) + (bl ? " " : ""); }
    }
    return out;
  }
  function htmlOk(id, n) {  // the edited text with the page's own styling (two-line headings and the like), when it still matches
    var s = stateOf(id); if (!s || !s.h) return false;
    var t = n.ownerDocument.createElement("div"); t.innerHTML = s.h;
    if (t.querySelector("script,iframe,object,embed,[onload],[onerror],[onclick]")) return false;
    return norm(t.textContent).replace(/\s/g, "") === norm(display(id, n)).replace(/\s/g, "");
  }
  function paintNode(n) {
    var id = +n.getAttribute("data-mfe");
    if (n === FX.editing) return;
    if (!ORIG && edited(id)) { if (htmlOk(id, n)) n.innerHTML = stateOf(id).h; else n.textContent = display(id, n); n.classList.add("mfe-chg"); }
    else { if (ORIG_HTML.has(n) && n.innerHTML !== ORIG_HTML.get(n)) n.innerHTML = ORIG_HTML.get(n); n.classList.remove("mfe-chg"); }
    n.classList.toggle("mfe-not", !ORIG && !!noteOf(id).trim() && !edited(id));
    n.classList.toggle("mfe-del", deleted(id));
  }
  function paintId(id) { (MAP[id] || []).forEach(paintNode); }
  function paintAll() { Object.keys(MAP).forEach(function (k) { paintId(+k); }); }
  function paintENotes() {
    if (!FX.doc) return;
    var ns = FX.doc.querySelectorAll("[data-mfe-img],[data-mfe-x]");
    for (var i = 0; i < ns.length; i++) { var k = ekey(ns[i]); ns[i].classList.toggle("mfe-not", !ORIG && !!(k && S.enotes[k])); }
  }

  // ---- the small bar over the chosen element ----
  var bar = null;
  function makeBar() {
    var d = FX.doc; if (!d) return null;
    if (bar && bar.ownerDocument === d && bar.isConnected) { bar.textContent = ""; return bar; }
    bar = el("div", "", null, d); bar.id = "mfe-bar"; bar.setAttribute("dir", "rtl"); bar.setAttribute("role", "dialog"); bar.setAttribute("aria-label", "עריכה");
    d.body.appendChild(bar); return bar;
  }
  function closeBar() {
    if (bar && bar.isConnected) bar.remove(); bar = null;
    if (FX.selected) FX.selected.classList.remove("mfe-sel"); FX.selected = null;
  }
  function place() {
    if (!bar || !bar.isConnected) return;
    var n = FX.editing || FX.selected; if (!n) return;
    var w = FX.doc.defaultView, r = n.getBoundingClientRect(), bh = bar.offsetHeight, bw = bar.offsetWidth, vw = w.innerWidth, vh = w.innerHeight;
    var top = r.top - bh - 12; if (top < 8) top = Math.min(r.bottom + 12, vh - bh - 8);
    var left = Math.min(Math.max(8, r.right - bw), vw - bw - 8);
    bar.style.top = Math.max(8, top) + "px"; bar.style.left = left + "px";
  }
  function btn(b, label, cls, fn) { var x = el("button", cls || "", label, FX.doc); x.type = "button"; x.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); fn(); }); b.appendChild(x); return x; }
  function labelOf(id) { var it = byId[id], l = it.label; if (it.g === "site") l += " · מופיע בכל האתר"; else if (it.count > 1) l += " · מופיע ב-" + it.count + " עמודים"; return l; }

  function choose(n, ev) {
    closeBar();
    if (n.hasAttribute("data-mfe-add")) { editAdd(n, ev); return; }
    if (n.hasAttribute("data-mfe") && deleted(+n.getAttribute("data-mfe"))) { delBar(n, +n.getAttribute("data-mfe")); return; }
    if (n.hasAttribute("data-mfe")) {
      var id = +n.getAttribute("data-mfe");
      if (INLINE_BAD[n.tagName] || n.closest("button,summary,label,legend,select")) boxEdit(n, id);
      else inlineEdit(n, id, ev);
    } else noteOnly(n);
  }

  function inlineEdit(n, id, ev) {
    hover(null);
    FX.editing = n; FX.before = n.innerHTML;
    if (n.children.length && !ORIG && edited(id) && !htmlOk(id, n)) n.textContent = display(id, n);
    for (var c = n.firstChild, nx; c; c = nx) { nx = c.nextSibling; if (c.nodeType === 3 && !c.nodeValue.trim() && c.previousSibling && c.nextSibling) { var dp = FX.doc.defaultView.getComputedStyle(c.previousSibling).display; if (dp === "block" || dp === "flex" || dp === "grid") c.remove(); } }  // a space between two lines would become an empty line while typing
    n.classList.remove("mfe-chg", "mfe-not"); n.classList.add("mfe-edit");
    n.setAttribute("contenteditable", "plaintext-only");
    if (n.contentEditable !== "plaintext-only") n.setAttribute("contenteditable", "true");
    n.setAttribute("spellcheck", "true");
    n.addEventListener("paste", onPaste);
    n.focus({ preventScroll: true });
    caret(n, ev);
    var b = makeBar(); if (!b) return;
    b.appendChild(el("span", "mfe-l", labelOf(id), FX.doc));
    var r = el("div", "mfe-r", null, FX.doc); b.appendChild(r);
    btn(r, "✓ סיום", "mfe-ok", function () { FX.finish(); });
    btn(r, "ביטול", "", function () { FX.cancel(); });
    if (edited(id)) btn(r, "↺ להחזיר למקור", "", function () { FX.editing.textContent = byId[id].he; FX.finish(); });
    btn(r, noteOf(id).trim() ? "💬 ההערה שלך" : "💬 הערה", "", function () { var t = norm(blockText(n)); FX.finish(t); noteBox(n, id); });
    var sub = el("div", "mfe-sub", null, FX.doc); b.appendChild(sub);
    btn(sub, "＋ להוסיף אחרי", "", function () { var t = norm(blockText(n)); FX.finish(t); chooser(blockOf(n), "after"); });
    btn(sub, "＋ להוסיף לפני", "", function () { var t = norm(blockText(n)); FX.finish(t); chooser(blockOf(n), "before"); });
    btn(sub, "🗑 להוריד מהאתר", "mfe-dan", function () { FX.cancel(); setItem(id, edited(id) ? txt(id) : null, noteOf(id), null, true); toast("סומן להורדה. לחיצה על הטקסט מחזירה אותו."); });
    btn(sub, "🔍 איפה עוד זה מופיע", "", function () { var t = norm(blockText(n)); FX.finish(t); openFind(byId[id].he.length > 40 ? "" : txt(id)); });
    counter(b, n, byId[id].he);
    if (byId[id].en) b.appendChild(el("span", "mfe-p", "באנגלית: " + byId[id].en, FX.doc));
    place();
  }
  function counter(b, n, orig) {  // Merav likes numbers: the length now and on the site
    var c = el("span", "mfe-cnt", null, FX.doc); b.appendChild(c);
    var upd = function () { var t = norm(blockText(n)), w = t ? t.split(" ").length : 0; c.textContent = ""; c.append(el("b", "", t.length + " תווים · " + w + " מילים", FX.doc), FX.doc.createTextNode(orig != null ? "  (באתר היום: " + norm(orig).length + " תווים)" : "")); };
    n.addEventListener("input", upd); upd();
  }
  function caret(n, ev) {
    var d = FX.doc, rg = null;
    try {
      if (ev && d.caretRangeFromPoint) rg = d.caretRangeFromPoint(ev.clientX, ev.clientY);
      else if (ev && d.caretPositionFromPoint) { var p = d.caretPositionFromPoint(ev.clientX, ev.clientY); if (p) { rg = d.createRange(); rg.setStart(p.offsetNode, p.offset); } }
    } catch (e) { rg = null; }
    var s = d.defaultView.getSelection();
    if (!rg || !n.contains(rg.startContainer)) { rg = d.createRange(); rg.selectNodeContents(n); rg.collapse(false); }
    s.removeAllRanges(); s.addRange(rg);
  }
  function onPaste(e) {
    e.preventDefault();
    var t = (e.clipboardData || FX.doc.defaultView.clipboardData).getData("text/plain").replace(/\s+/g, " ");
    FX.doc.execCommand("insertText", false, t);
  }
  FX.finish = function (useText) {
    var n = FX.editing; if (!n) return;
    if (FX.addEl) { var tt = useText != null ? useText : norm(blockText(n)); end(n); FX.finishAdd(n, tt); return; }
    var id = +n.getAttribute("data-mfe"), t = useText != null ? useText : norm(blockText(n));
    end(n);
    if (!t) { toast("טקסט ריק לא נשמר. אם צריך להוריד אותו, כתבי לחנוך בהערה."); paintNode(n); return; }
    var st = stored(id, n, t);
    var was = txt(id), html = n.children.length ? n.innerHTML : null;
    setItem(id, st === norm(byId[id].he) ? null : st, noteOf(id), html);
    if (norm(was) !== norm(st)) propose(id, norm(was), norm(st));
    if (norm(was) !== norm(st)) { var others = (MAP[id] || []).length; toast(norm(st) === norm(byId[id].he) ? "הטקסט חזר לנוסח שבאתר." : others > 1 ? "נשמר. הטקסט מופיע " + others + " פעמים בעמוד, וכולם התעדכנו." : byId[id].g === "site" ? "נשמר. הטקסט הזה מופיע בכל עמודי האתר." : "נשמר ✓", 2200); }
    paintNode(n);
  };
  FX.cancel = function () {
    var n = FX.editing; if (!n) return; end(n);
    if (FX.addEl) { var e = FX.addEl, isNew = FX.addNew; FX.addEl = null; FX.addA = null; FX.addNew = false; if (isNew) e.remove(); else renderAdds(); return; }
    n.innerHTML = FX.before; paintNode(n);
  };
  FX.cancelSilent = function () { FX.cancel(); };
  function end(n) {
    n.removeAttribute("contenteditable"); n.removeAttribute("spellcheck"); n.classList.remove("mfe-edit");
    n.removeEventListener("paste", onPaste); FX.editing = null; closeBar();
    try { FX.doc.defaultView.getSelection().removeAllRanges(); } catch (e) {}
  }

  function boxEdit(n, id) {  // buttons, labels and questions: a box with live preview on the page
    FX.selected = n; n.classList.add("mfe-sel"); hover(null);
    var b = makeBar(); if (!b) return;
    b.appendChild(el("span", "mfe-l", labelOf(id), FX.doc));
    var ta = el("textarea", "", null, FX.doc); ta.value = display(id, n); ta.setAttribute("aria-label", "הנוסח"); b.appendChild(ta);
    ta.addEventListener("input", function () { n.textContent = ta.value; n.classList.add("mfe-chg"); });
    ta.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ok(); } else if (e.key === "Escape") { e.preventDefault(); paintNode(n); closeBar(); } e.stopPropagation(); });
    var r = el("div", "mfe-r", null, FX.doc); b.appendChild(r);
    function ok() { var t = norm(ta.value); if (!t) { toast("טקסט ריק לא נשמר."); return; } var st = stored(id, n, t), was = norm(txt(id)); setItem(id, st === norm(byId[id].he) ? null : st, noteOf(id)); closeBar(); paintNode(n); if (was !== norm(st)) propose(id, was, norm(st)); }
    btn(r, "✓ סיום", "mfe-ok", ok);
    btn(r, "ביטול", "", function () { paintNode(n); closeBar(); });
    if (edited(id)) btn(r, "↺ להחזיר למקור", "", function () { setItem(id, null, noteOf(id)); closeBar(); });
    btn(r, "💬 הערה", "", function () { closeBar(); noteBox(n, id); });
    btn(r, "🗑 להוריד", "mfe-dan", function () { paintNode(n); closeBar(); setItem(id, edited(id) ? txt(id) : null, noteOf(id), null, true); });
    place(); ta.focus(); ta.select();
  }

  function noteBox(n, id) {
    FX.selected = n; n.classList.add("mfe-sel"); hover(null);
    var b = makeBar(); if (!b) return;
    b.appendChild(el("span", "mfe-l", "הערה לחנוך על: " + labelOf(id), FX.doc));
    if (edited(id)) { var w = el("span", "mfe-was", null, FX.doc); w.append(el("b", "", "באתר היום: ", FX.doc), FX.doc.createTextNode(byId[id].he)); b.appendChild(w); }
    var ta = el("textarea", "", null, FX.doc); ta.value = noteOf(id); ta.placeholder = "למשל: לבדוק את המספר מול יפתח"; ta.setAttribute("aria-label", "ההערה"); b.appendChild(ta);
    var r = el("div", "mfe-r", null, FX.doc); b.appendChild(r);
    function ok() { setItem(id, edited(id) ? txt(id) : null, ta.value.trim()); closeBar(); }
    ta.addEventListener("keydown", function (e) { if (e.key === "Escape") { e.preventDefault(); closeBar(); } e.stopPropagation(); });
    btn(r, "✓ שמירת ההערה", "mfe-ok", ok);
    if (noteOf(id).trim()) btn(r, "מחיקת ההערה", "", function () { ta.value = ""; ok(); });
    btn(r, "סגירה", "", closeBar);
    place(); ta.focus();
  }

  function ekey(n) {
    if (n.hasAttribute("data-mfe-img")) { var im = n.tagName === "IMG" ? n : n.querySelector("img"); if (!im) return null; var src = (im.currentSrc || im.getAttribute("src") || "").split("/").pop().split("?")[0]; return (cur || "") + "|img|" + src.replace(/-\d+\.(avif|webp|jpe?g|png)$/, ""); }
    return (cur || "") + "|txt|" + norm(n.textContent).slice(0, 60);
  }
  function noteOnly(n) {
    FX.selected = n; n.classList.add("mfe-sel"); hover(null);
    var isImg = n.hasAttribute("data-mfe-img"), key = ekey(n); if (!key) return;
    var b = makeBar(); if (!b) return;
    var im = isImg ? (n.tagName === "IMG" ? n : n.querySelector("img")) : null, alt = im ? norm(im.getAttribute("alt") || "") : "";
    b.appendChild(el("span", "mfe-l", isImg ? "תמונה" : "טקסט שנוצר אוטומטית (אי אפשר להקליד בו, אפשר להעיר)", FX.doc));
    if (isImg && alt) { var w = el("span", "mfe-was", null, FX.doc); w.append(el("b", "", "התיאור שלה (לעיוורים ולגוגל): ", FX.doc), FX.doc.createTextNode(alt)); b.appendChild(w); }
    var ta = el("textarea", "", null, FX.doc); ta.value = (S.enotes[key] || {}).n || "";
    ta.placeholder = isImg ? "למשל: להחליף בתמונה מהפרויקט בפורטוגל" : "מה צריך לשנות כאן?"; ta.setAttribute("aria-label", "ההערה"); b.appendChild(ta);
    var r = el("div", "mfe-r", null, FX.doc); b.appendChild(r);
    var altId = null;
    if (isImg && alt) { var ids = EXACT[alt]; if (ids) altId = pick(ids, cur); }
    function ok() {
      setENote(key, { page: cur, what: isImg ? "תמונה" : "טקסט", snip: isImg ? (alt || key.split("|").pop()) : norm(n.textContent).slice(0, 120) }, ta.value);
      closeBar();
    }
    ta.addEventListener("keydown", function (e) { if (e.key === "Escape") { e.preventDefault(); closeBar(); } e.stopPropagation(); });
    btn(r, "✓ שמירת ההערה", "mfe-ok", ok);
    if (altId) btn(r, "לתקן את התיאור", "", function () { closeBar(); openPanel("more", altId); });
    if (S.enotes[key]) btn(r, "מחיקת ההערה", "", function () { ta.value = ""; ok(); });
    btn(r, "סגירה", "", closeBar);
    place(); ta.focus();
  }

  // ---- a text marked for removal ----
  function delBar(n, id) {
    FX.selected = n; n.classList.add("mfe-sel"); hover(null);
    var b = makeBar(); if (!b) return;
    b.appendChild(el("span", "mfe-l", "סומן להורדה מהאתר · " + labelOf(id), FX.doc));
    var r = el("div", "mfe-r", null, FX.doc); b.appendChild(r);
    btn(r, "↺ להשאיר את הטקסט באתר", "mfe-ok", function () { closeBar(); setItem(id, edited(id) ? txt(id) : null, noteOf(id), null, false); });
    btn(r, "💬 הערה", "", function () { closeBar(); noteBox(n, id); });
    btn(r, "סגירה", "", closeBar);
    place();
  }

  // ---- adding new content: headings, paragraphs, list rows, buttons, quotes, a place for a photo ----
  var TYPES = [
    { k: "h2", name: "כותרת", tip: "כותרת של חלק חדש", ph: "כותרת חדשה" },
    { k: "h3", name: "כותרת משנה", tip: "כותרת קטנה בתוך חלק", ph: "כותרת משנה חדשה" },
    { k: "p", name: "פסקה", tip: "טקסט רגיל", ph: "כאן כותבים את הפסקה החדשה." },
    { k: "li", name: "שורה ברשימה", tip: "נקודה ברשימה", ph: "שורה חדשה" },
    { k: "btn", name: "כפתור", tip: "כפתור או קישור", ph: "טקסט הכפתור" },
    { k: "quote", name: "ציטוט", tip: "משפט מודגש או ציטוט של לקוח", ph: "הציטוט" },
    { k: "img", name: "מקום לתמונה", tip: "לכתוב איזו תמונה צריכה לבוא", ph: "איזו תמונה צריכה לבוא כאן?" }
  ];
  function typeOf(k) { return TYPES.filter(function (t) { return t.k === k; })[0] || TYPES[2]; }
  var line = null;
  function hideLine() { if (line && line.isConnected) line.remove(); line = null; if (FX.lastAdd) { FX.lastAdd.classList.remove("mfe-addhov"); FX.lastAdd = null; } }
  function blockOf(n) {
    var d = FX.doc, w = d.defaultView;
    while (n && n !== d.body && n.nodeType === 1) { var ds = w.getComputedStyle(n).display; if (ds !== "inline" && ds !== "contents") return n; n = n.parentElement; }
    return n;
  }
  function addSpot(e) {
    var t = e.target; if (!t || t.nodeType !== 1 || inBar(t) || t.id === "mfe-line") return null;
    var b = blockOf(t.closest("[data-mfe-add]") || t), d = FX.doc;
    if (!b || b === d.body || b === d.documentElement || b.tagName === "MAIN" || b.closest("header.site-head,#mfe-bar")) return null;
    if (b.tagName === "LI" && b.parentElement && !b.closest("[data-mfe-add]") && !b.querySelector("[data-mfe]") && b.parentElement.closest("nav")) return null;
    var r = b.getBoundingClientRect();
    return { b: b, pos: e.clientY < r.top + r.height / 2 ? "before" : "after", r: r };
  }
  function addGuide(e) {
    var g = addSpot(e);
    if (!g) { hideLine(); return; }
    if (!line || !line.isConnected) { line = el("div", "", null, FX.doc); line.id = "mfe-line"; line.appendChild(el("span", "", "＋ להוסיף כאן", FX.doc)); FX.doc.body.appendChild(line); }
    var y = g.pos === "before" ? g.r.top - 6 : g.r.bottom + 2;
    line.style.top = Math.max(2, y) + "px"; line.style.left = g.r.left + "px"; line.style.width = Math.max(60, g.r.width) + "px";
    if (FX.lastAdd !== g.b) { if (FX.lastAdd) FX.lastAdd.classList.remove("mfe-addhov"); g.b.classList.add("mfe-addhov"); FX.lastAdd = g.b; }
  }
  function cssPath(n) {
    var parts = [], d = FX.doc;
    for (; n && n !== d.body && n.nodeType === 1; n = n.parentElement) {
      if (n.id && !/^mfe-/.test(n.id)) { parts.unshift("#" + CSS_ESC(n.id)); return parts.join(" > "); }
      var i = 1, s = n; while ((s = s.previousElementSibling)) if (s.tagName === n.tagName && !s.hasAttribute("data-mfe-add")) i++;
      parts.unshift(n.tagName.toLowerCase() + ":nth-of-type(" + i + ")");
    }
    return "body > " + parts.join(" > ");
  }
  function CSS_ESC(x) { return window.CSS && CSS.escape ? CSS.escape(x) : x.replace(/[^a-zA-Z0-9_-]/g, "\\$&"); }
  function anchorFor(b) {
    if (b.hasAttribute("data-mfe-add")) return { add: b.getAttribute("data-mfe-add"), snip: snipOf(b) };
    var m = b.hasAttribute("data-mfe") ? b : b.querySelector("[data-mfe]");
    if (m) {
      var id = +m.getAttribute("data-mfe"), i = (MAP[id] || []).indexOf(m), up = 0, x = blockOf(m);
      while (x && x !== b && up < 12) { x = x.parentElement; up++; }
      if (x === b) return { id: id, i: Math.max(0, i), up: up, snip: snipOf(b) };
    }
    return { path: cssPath(b), snip: snipOf(b) };
  }
  function snipOf(b) {
    var a = b.getAttribute && b.getAttribute("data-mfe-add");
    if (a && S.adds[a]) return S.adds[a].text.slice(0, 60);
    var t = norm(textOf(b)); if (t) return t.length > 60 ? t.slice(0, 60) + "…" : t;
    var im = b.querySelector && b.querySelector("img"); return im ? "תמונה: " + (im.getAttribute("alt") || "") : "";
  }
  function anchorEl(a) {
    var d = FX.doc, n = null, A = a.anchor || {};
    if (A.add) n = d.querySelector('[data-mfe-add="' + A.add + '"]');
    else if (A.id != null) { var ns = MAP[A.id]; if (ns && ns.length) { n = blockOf(ns[Math.min(A.i || 0, ns.length - 1)]); for (var k = 0; k < (A.up || 0) && n.parentElement && n.parentElement !== d.body; k++) n = n.parentElement; } }
    else if (A.path) { try { n = d.querySelector(A.path); } catch (e) { n = null; } }
    return n;
  }
  function likeClass(tag, near) {  // borrow the page's own styling for the new element
    var d = FX.doc, scope = near && (near.closest("section,article,aside,footer") || d.querySelector("main")) || d.body;
    var pick1 = function (root) { var all = root.querySelectorAll(tag); for (var i = 0; i < all.length; i++) if (!all[i].closest("[data-mfe-add],#mfe-bar,header.site-head")) return all[i]; return null; };
    var x = pick1(scope) || pick1(d.querySelector("main") || d.body);
    return x ? x.className.replace(/\bmfe-[a-z-]+\b/g, "").trim() : "";
  }
  function makeAddEl(a, near) {
    var d = FX.doc, t = a.type, e, inner;
    if (t === "li") {
      if (near && near.tagName === "LI") { e = d.createElement("li"); e.className = near.className.replace(/\bmfe-[a-z-]+\b/g, ""); inner = e; }
      else { e = d.createElement("ul"); e.className = likeClass("ul", near); inner = d.createElement("li"); inner.className = likeClass("li", near); e.appendChild(inner); }
    } else if (t === "btn") { e = d.createElement("p"); inner = d.createElement("a"); inner.href = "#"; inner.className = likeClass("a.btn", near) || "btn"; e.appendChild(inner); }
    else if (t === "quote") { e = d.createElement("blockquote"); e.className = likeClass("blockquote", near); inner = e; }
    else if (t === "img") { e = d.createElement("div"); e.className = "mfe-imgph"; inner = e; }
    else { e = d.createElement(t); e.className = likeClass(t, near); inner = e; }
    e.setAttribute("data-mfe-add", a.k); e.classList.add("mfe-new");
    if (near && t !== "btn" && t !== "img") { try { var col = d.defaultView.getComputedStyle(near).color; if (col) e.style.color = col; } catch (x) {} }  // the colour of the text around it (light on dark parts of the page)
    inner.setAttribute("data-mfe-in", "");
    inner.textContent = a.text || "";
    return e;
  }
  function addsOf(page) { return Object.keys(S.adds).map(function (k) { return S.adds[k]; }).filter(function (a) { return a.page === page; }).sort(function (x, y) { return x.seq - y.seq; }); }
  function placeAdd(e, a) {
    var at = anchorEl(a), d = FX.doc;
    if (!at) { var m = d.querySelector("main") || d.body; m.appendChild(e); e.title = "לא מצאתי את המקום המקורי, אז התוספת בסוף העמוד"; return; }
    if (at.tagName === "LI" && a.type !== "li") at = at.closest("ul,ol") || at;
    if (a.pos === "before") at.parentNode.insertBefore(e, at); else at.parentNode.insertBefore(e, at.nextSibling);
  }
  function renderAdds() {
    var d = FX.doc; if (!d || !cur) return;
    var old = d.querySelectorAll("[data-mfe-add]"); for (var i = 0; i < old.length; i++) if (old[i] !== FX.addEl) old[i].remove();
    addsOf(cur).forEach(function (a) { if (FX.addEl && FX.addEl.getAttribute("data-mfe-add") === a.k) return; var near = anchorEl(a); placeAdd(makeAddEl(a, near), a); });
  }
  function chooser(b, pos) {
    hideLine(); if (!b) return;
    FX.selected = b; b.classList.add("mfe-sel");
    var bb = makeBar(); if (!bb) return;
    bb.appendChild(el("span", "mfe-l", "מה להוסיף " + (pos === "before" ? "לפני" : "אחרי") + " «" + snipOf(b) + "»?", FX.doc));
    var g = el("div", "mfe-grid", null, FX.doc); bb.appendChild(g);
    TYPES.forEach(function (t) {
      var x = btn(g, "", "", function () { closeBar(); newAdd(t.k, b, pos); });
      x.append(el("b", "", t.name, FX.doc), el("small", "", t.tip, FX.doc));
    });
    var r = el("div", "mfe-r", null, FX.doc); r.style.marginTop = "6px"; bb.appendChild(r);
    btn(r, pos === "before" ? "להוסיף אחרי במקום" : "להוסיף לפני במקום", "", function () { closeBar(); chooser(b, pos === "before" ? "after" : "before"); });
    btn(r, "ביטול", "", closeBar);
    place();
  }
  function newAdd(type, b, pos) {
    var k = "a" + Date.now().toString(36) + Math.floor(Math.random() * 1e3).toString(36);
    var a = { k: k, page: cur, anchor: anchorFor(b), pos: pos, type: type, text: "", n: "", seq: ++S.addSeq, at: Date.now() };
    var e = makeAddEl(a, b); placeAdd(e, a);
    if (MODE === "add") setMode("edit");
    editAdd(e, null, a, true);
  }
  function editAdd(e, ev, fresh, isNew) {
    var k = e.getAttribute("data-mfe-add"), a = fresh || S.adds[k]; if (!a) return;
    var inner = e.querySelector("[data-mfe-in]") || e;
    hover(null); FX.editing = inner; FX.addEl = e; FX.before = inner.innerHTML; FX.addA = a; FX.addNew = !!isNew;
    var usePh = isNew && !norm(inner.textContent);
    if (usePh) inner.textContent = typeOf(a.type).ph;
    inner.classList.add("mfe-edit");
    inner.setAttribute("contenteditable", "plaintext-only"); if (inner.contentEditable !== "plaintext-only") inner.setAttribute("contenteditable", "true");
    inner.setAttribute("spellcheck", "true"); inner.addEventListener("paste", onPaste);
    inner.focus({ preventScroll: true });
    if (usePh) { var rg = FX.doc.createRange(); rg.selectNodeContents(inner); var sl = FX.doc.defaultView.getSelection(); sl.removeAllRanges(); sl.addRange(rg); inner.scrollIntoView({ block: "center", behavior: "smooth" }); }
    else caret(inner, ev);
    var b = makeBar(); if (!b) return;
    b.appendChild(el("span", "mfe-l", (isNew ? "תוספת חדשה · " : "התוספת שלך · ") + typeOf(a.type).name + (isNew ? " · מקלידים, ואז Enter" : ""), FX.doc));
    var r = el("div", "mfe-r", null, FX.doc); b.appendChild(r);
    btn(r, "✓ סיום", "mfe-ok", function () { FX.finish(); });
    btn(r, isNew ? "ביטול" : "ביטול השינוי", "", function () { FX.cancel(); });
    if (!isNew) btn(r, "🗑 למחוק את התוספת", "mfe-dan", function () { FX.cancel(); var prev = S.adds[k]; delete S.adds[k]; push({ k: "a", id: k, prev: prev, next: null }); save(); renderAdds(); toast("התוספת נמחקה. אפשר לשחזר עם ↶"); });
    btn(r, a.n ? "💬 ההערה שלך" : "💬 הערה", "", function () { FX.finish(); var y = S.adds[k]; if (y) addNote(k); });
    var sub = el("div", "mfe-sub", null, FX.doc); b.appendChild(sub);
    TYPES.forEach(function (t) {
      var x = btn(sub, t.name, "", function () {
        var txtNow = norm(blockText(inner)); var isPh = TYPES.some(function (q) { return q.ph === txtNow; });
        FX.cancelSilent(); a.type = t.k;
        if (S.adds[k]) { var prev = JSON.parse(JSON.stringify(S.adds[k])); S.adds[k] = Object.assign({}, S.adds[k], { type: t.k, text: isPh ? S.adds[k].text : txtNow }); push({ k: "a", id: k, prev: prev, next: S.adds[k] }); save(); }
        renderAdds(); var ne = FX.doc.querySelector('[data-mfe-add="' + k + '"]');
        if (!ne) { ne = makeAddEl(a, anchorEl(a)); placeAdd(ne, a); }
        if (!S.adds[k]) { (ne.querySelector("[data-mfe-in]") || ne).textContent = isPh ? "" : txtNow; }
        editAdd(ne, null, S.adds[k] || a, !S.adds[k]);
      });
      x.setAttribute("aria-pressed", t.k === a.type);
    });
    var sub2 = el("div", "mfe-sub", null, FX.doc); b.appendChild(sub2);
    btn(sub2, "＋ להוסיף אחרי", "", function () { FX.finish(); var ne = FX.doc.querySelector('[data-mfe-add="' + k + '"]'); if (ne) chooser(ne, "after"); });
    counter(b, inner, null);
    place();
  }
  FX.finishAdd = function (inner, t) {
    var e = FX.addEl, a = FX.addA, k = a.k, isNew = FX.addNew;
    FX.addEl = null; FX.addA = null; FX.addNew = false;
    var isPh = TYPES.some(function (q) { return q.ph === t; });
    if (!t || isPh) { if (isNew) { e.remove(); toast("לא נוסף, כי לא נכתב טקסט."); } else { renderAdds(); } return; }
    var prev = S.adds[k] ? JSON.parse(JSON.stringify(S.adds[k])) : null;
    var next = Object.assign({}, a, { text: t });
    if (prev && prev.text === t && prev.type === next.type) { renderAdds(); return; }
    S.adds[k] = next; push({ k: "a", id: k, prev: prev, next: next }); save();
    renderAdds();
    toast(isNew ? "נוסף ✓ התוספת מסומנת במסגרת ירוקה ובמילה ״חדש״." : "נשמר ✓", 2600);
  };
  function addNote(k) {
    var e = FX.doc.querySelector('[data-mfe-add="' + k + '"]'); if (!e) return;
    FX.selected = e; e.classList.add("mfe-sel");
    var b = makeBar(); if (!b) return;
    b.appendChild(el("span", "mfe-l", "הערה לחנוך על התוספת", FX.doc));
    var ta = el("textarea", "", null, FX.doc); ta.value = S.adds[k].n || ""; ta.placeholder = "למשל: להוסיף כאן תמונה של הפרויקט"; b.appendChild(ta);
    var r = el("div", "mfe-r", null, FX.doc); b.appendChild(r);
    btn(r, "✓ שמירת ההערה", "mfe-ok", function () { var prev = JSON.parse(JSON.stringify(S.adds[k])); S.adds[k].n = ta.value.trim(); push({ k: "a", id: k, prev: prev, next: JSON.parse(JSON.stringify(S.adds[k])) }); save(); closeBar(); });
    btn(r, "סגירה", "", closeBar);
    ta.addEventListener("keydown", function (e2) { if (e2.key === "Escape") { e2.preventDefault(); closeBar(); } e2.stopPropagation(); });
    place(); ta.focus();
  }

  // ---- the same words elsewhere: offer to update them all at once ----
  function seg(a, b) {
    var i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
    var j = 0; while (j < a.length - i && j < b.length - i && a[a.length - 1 - j] === b[b.length - 1 - j]) j++;
    var s0 = i; while (s0 > 0 && !/\s/.test(a[s0 - 1])) s0--;
    var ea = a.length - j, eb = b.length - j; while (ea < a.length && !/\s/.test(a[ea])) { ea++; eb++; }
    return { o: a.slice(s0, ea).trim(), n: b.slice(s0, eb).trim() };
  }
  function fold(x) { return String(x).replace(/[\u2010\u2011\u2012\u2013]/g, "-").replace(/[\u00a0\u202f]/g, " ").replace(/[\u2066-\u2069\u200e\u200f]/g, ""); }
  function shown(id) { var t = txt(id), v = D.vals || {}; Object.keys(v).forEach(function (k) { t = t.split(k).join(v[k]); }); return t; }
  function where(q, skip) {  // texts that contain q; "auto" when it is only in a part the site fills in by itself (the phone, the year)
    if (!q) return [];
    var fq = fold(q);
    return D.items.filter(function (it) {
      if (it.id === skip) return false;
      if (txt(it.id).indexOf(q) >= 0) { it._auto = false; return true; }
      if (fold(shown(it.id)).indexOf(fq) >= 0) { it._auto = true; return true; }
      return false;
    });
  }
  function pagesOf(list) { var seen = {}, out = []; list.forEach(function (it) { var p = it.g === "site" ? "בכל האתר" : groupName(homePage(it)); if (!seen[p]) { seen[p] = 1; out.push(p); } }); return out; }
  function propose(id, was, now) {
    var d = seg(was, now);
    if (!d.o || !d.n || d.o === d.n || d.o.length < 2 || d.o.split(/\s+/).length > 6) return;
    var list = where(d.o, id).filter(function (it) { return !it._auto; }); if (!list.length) return;
    var pg = pagesOf(list), box = $("prop");
    box.textContent = "";
    var p = el("p"); p.append(el("b", "", "«" + d.o + "»"), document.createTextNode(" מופיע עוד ב-" + list.length + (list.length === 1 ? " מקום" : " מקומות") + " באתר (" + pg.slice(0, 4).join(", ") + (pg.length > 4 ? " ועוד" : "") + "). לעדכן גם שם ל-"), el("b", "", "«" + d.n + "»"), document.createTextNode("?"));
    box.appendChild(p);
    var r = el("div", "row"), y = el("button", "btn", list.length === 1 ? "לעדכן גם שם" : "לעדכן בכל " + list.length + " המקומות"), c = el("button", "btn alt", "לבחור מקומות"), no = el("button", "btn alt", "לא, רק כאן");
    [y, c, no].forEach(function (x) { x.type = "button"; r.appendChild(x); }); box.appendChild(r);
    y.addEventListener("click", function () { var nn = replaceAll(d.o, d.n, list.map(function (it) { return it.id; })); box.hidden = true; toast("עודכן ב-" + nn + " מקומות נוספים ✓ אפשר לבטל עם ↶"); });
    c.addEventListener("click", function () { box.hidden = true; openFind(d.o, d.n); });
    no.addEventListener("click", function () { box.hidden = true; });
    box.hidden = false; y.focus({ preventScroll: true });
    clearTimeout(propose.t); propose.t = setTimeout(function () { box.hidden = true; }, 30000);
  }
  function replaceAll(q, r, ids) {
    ids = ids.filter(function (i) { return txt(i).indexOf(q) >= 0; });
    var list = ids.map(function (i) {
      var it = byId[i], nt = txt(i).split(q).join(r);
      return mkItem(i, norm(nt) === norm(it.he) ? null : nt, noteOf(i), null, undefined);
    });
    return setMany(list, "החלפת «" + q + "» ב-«" + r + "»");
  }

  // ---- search and replace across the whole site ----
  var FIND = { q: "", r: "", off: {} };
  function openFind(q, r) { FIND.q = q || FIND.q; if (r != null) FIND.r = r; FIND.off = {}; openPanel("find"); var f = $("fq"); if (f) { f.focus(); f.select(); } }
  function mark(node, text, q) {
    if (!q) { node.textContent = text; return; }
    var parts = text.split(q);
    parts.forEach(function (p, i) { node.appendChild(document.createTextNode(p)); if (i < parts.length - 1) node.appendChild(el("mark", "", q)); });
  }
  function renderFind(pb) {
    var f1 = el("div", "fld"), l1 = el("label", "", "לחפש באתר"), q = el("input"); q.id = "fq"; q.type = "search"; q.value = FIND.q; q.placeholder = "למשל: 2003, רשת צל, 11%"; l1.htmlFor = "fq"; f1.append(l1, q);
    var f2 = el("div", "fld"), l2 = el("label", "", "להחליף ב (לא חובה)"), r = el("input"); r.id = "fr"; r.type = "text"; r.value = FIND.r; l2.htmlFor = "fr"; f2.append(l2, r);
    pb.append(f1, f2);
    var res = el("div"); pb.appendChild(res);
    function draw() {
      res.textContent = "";
      var Q = FIND.q, list = Q.length >= 2 ? where(Q, -1) : [];
      if (Q.length < 2) { res.appendChild(el("p", "muted", "מקלידים מילה, מספר או משפט, ורואים כל מקום באתר שבו הם מופיעים, כולל כותרות לגוגל ותיאורי תמונות. אפשר להחליף בכולם בלחיצה אחת.")); return; }
      if (!list.length) { res.appendChild(el("div", "empty", "«" + Q + "» לא מופיע באתר.")); return; }
      var auto = list.filter(function (it) { return it._auto; });
      var on = list.filter(function (it) { return !FIND.off[it.id] && !it._auto; });
      var top = el("div", "find-top");
      top.appendChild(el("b", "", list.length + (list.length === 1 ? " מקום" : " מקומות")));
      if (FIND.r && FIND.r !== Q) { var go2 = el("button", "btn", "להחליף ב-" + on.length + " המסומנים"); go2.type = "button"; go2.disabled = !on.length; go2.addEventListener("click", function () { var nn = replaceAll(Q, FIND.r, on.map(function (it) { return it.id; })); toast("הוחלף ב-" + nn + " מקומות ✓ אפשר לבטל עם ↶"); FIND.q = FIND.r; $("fq").value = FIND.q; draw(); }); top.appendChild(go2); }
      res.appendChild(top);
      if (auto.length) res.appendChild(el("p", "muted", auto.length + " מהמקומות מסומנים \"אוטומטי\": שם האתר ממלא את הערך מהגדרה אחת (כמו מספר הטלפון). כדי לשנות אותו בכל האתר, מספיק לכתוב לחנוך הערה אחת."));
      list.slice(0, 300).forEach(function (it) {
        var b = el("label", "hit" + (it._auto ? " auto" : "")), cb = el("input"); cb.type = "checkbox"; cb.checked = !FIND.off[it.id] && !it._auto; cb.disabled = !!it._auto;
        cb.addEventListener("change", function () { if (cb.checked) delete FIND.off[it.id]; else FIND.off[it.id] = 1; draw(); });
        var body = el("span", "hb"), wh = el("span", "hw", (it.g === "site" ? "בכל האתר" : groupName(homePage(it))) + " · " + it.label + (it.kind === "g" ? " (גוגל)" : it.kind === "h" ? " (לא מוצג על המסך)" : ""));
        var tx = el("span", "ht");
        if (it._auto) { wh.textContent += " · אוטומטי"; mark(tx, fold(shown(it.id)), fold(Q)); }
        else if (FIND.r && FIND.r !== Q && cb.checked) { tx.appendChild(diff(txt(it.id), txt(it.id).split(Q).join(FIND.r))); } else mark(tx, txt(it.id), Q);
        body.append(wh, tx);
        var j = el("button", "go", "לראות"); j.type = "button"; j.addEventListener("click", function (ev) { ev.preventDefault(); jump(it); });
        b.append(cb, body, j); res.appendChild(b);
      });
    }
    q.addEventListener("input", function () { FIND.q = q.value; FIND.off = {}; draw(); });
    r.addEventListener("input", function () { FIND.r = r.value; draw(); });
    draw();
  }

  // ---- keeping up with the site: what already went live, and texts the site changed after she edited them ----
  function sync() {
    var applied = 0, gone = 0;
    Object.keys(S.items).forEach(function (k) {
      var s = S.items[k], it = byId[k];
      if (!it) { if (s && s.d) { delete S.items[k]; gone++; } return; }
      if (s.v && s.v !== it.v && s.t != null && norm(s.t) === norm(it.he) && !s.d) { delete S.items[k]; applied++; }
    });
    Object.keys(S.adds).forEach(function (k) { var a = S.adds[k]; if (a.text && EXACT[norm(a.text)] && a.sentT != null) { delete S.adds[k]; applied++; } });
    if (applied + gone) { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
    return applied + gone;
  }
  function conflicts() {
    return Object.keys(S.items).map(Number).filter(function (k) {
      var s = S.items[k], it = byId[k];
      return it && s && s.v && s.v !== it.v && s.t != null && norm(s.t) !== norm(it.he) && !it.m;
    });
  }

  // ---- modes, devices, before/after ----
  var MODE = "edit", ORIG = false;
  function setMode(m) {
    if (FX.editing) FX.finish(); closeBar(); hideLine();
    MODE = m;
    $("m-edit").setAttribute("aria-pressed", m === "edit"); $("m-add").setAttribute("aria-pressed", m === "add"); $("m-view").setAttribute("aria-pressed", m === "view");
    if (FX.doc) { FX.doc.documentElement.classList.toggle("mfe-on", m === "edit"); FX.doc.documentElement.classList.toggle("mfe-add", m === "add"); }
    hover(null);
    frame.title = m === "edit" ? "האתר, במצב עריכה" : m === "add" ? "האתר, במצב הוספה" : "האתר, במצב גלישה";
    hint(m === "edit" ? "מצב עריכה: לוחצים על טקסט ומקלידים" : m === "add" ? "מצב הוספה: מצביעים על המקום, ולוחצים כשהקו הירוק במקום הנכון" : "מצב גלישה: הקישורים עובדים כרגיל. לחזרה לתיקונים, לוחצים \"עריכה\"");
  }
  $("m-add").addEventListener("click", function () { setMode(MODE === "add" ? "edit" : "add"); });
  function hint(t) { var h = $("hint"); h.textContent = t; h.hidden = false; clearTimeout(hint.t); hint.t = setTimeout(function () { h.hidden = true; }, 3200); }
  $("m-edit").addEventListener("click", function () { setMode("edit"); });
  $("m-view").addEventListener("click", function () { setMode("view"); });
  Array.prototype.forEach.call(document.querySelectorAll("[data-dev]"), function (b) {
    b.addEventListener("click", function () {
      Array.prototype.forEach.call(document.querySelectorAll("[data-dev]"), function (x) { x.setAttribute("aria-pressed", x === b); });
      stage.className = "stage " + (b.dataset.dev === "desk" ? "" : b.dataset.dev);
      S.dev = b.dataset.dev; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
      setTimeout(place, 300);
    });
  });
  $("b-orig").addEventListener("click", function () {
    if (FX.editing) FX.finish(); closeBar();
    ORIG = !ORIG; this.setAttribute("aria-pressed", ORIG);
    if (FX.doc) FX.doc.documentElement.classList.toggle("mfe-orig", ORIG);
    paintAll(); paintENotes();
    hint(ORIG ? "כך האתר נראה היום, בלי השינויים שלך. לחיצה נוספת מחזירה אותם" : "חזרה לגרסה עם השינויים שלך");
  });
  $("b-undo").addEventListener("click", undo);
  $("b-redo").addEventListener("click", redo);
  function keys(e) {
    var mod = e.ctrlKey || e.metaKey, k = (e.key || "").toLowerCase();
    if (mod && k === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
    else if (mod && (k === "y" || (k === "z" && e.shiftKey))) { e.preventDefault(); redo(); }
    else if (mod && k === "f") { e.preventDefault(); openFind(""); }
    else if (e.key === "Escape") { if (bar) closeBar(); else if (MODE === "add") setMode("edit"); }
  }
  document.addEventListener("keydown", function (e) {
    var t = e.target; if (t && (t.tagName === "TEXTAREA" || t.tagName === "INPUT" || t.tagName === "SELECT")) { if (e.key === "Escape" && !$("panel").hidden && window.innerWidth <= 1000) closePanel(); return; }
    if (e.key === "Escape") { if (!$("senddlg").hidden) $("senddlg").hidden = true; else if (!$("welcome").hidden) closeW(); else if (!$("panel").hidden) closePanel(); return; }
    keys(e);
  });

  // ---- the side panel ----
  var TAB = "chg";
  function openPanel(tab, focusId) {
    TAB = tab || TAB; $("panel").hidden = false; $("b-panel").setAttribute("aria-expanded", "true");
    renderPanel();
    if (focusId) { var f = $("pb").querySelector('[data-id="' + focusId + '"] textarea'); if (f) { f.scrollIntoView({ block: "center" }); f.focus(); } }
  }
  function closePanel() { $("panel").hidden = true; $("b-panel").setAttribute("aria-expanded", "false"); $("b-panel").focus(); }
  $("b-panel").addEventListener("click", function () { if ($("panel").hidden) openPanel("chg"); else closePanel(); });
  $("p-x").addEventListener("click", closePanel);
  $("t-chg").addEventListener("click", function () { TAB = "chg"; renderPanel(); });
  $("t-more").addEventListener("click", function () { TAB = "more"; renderPanel(); });
  $("t-find").addEventListener("click", function () { TAB = "find"; renderPanel(); });
  $("b-find").addEventListener("click", function () { if (!$("panel").hidden && TAB === "find") closePanel(); else openFind(""); });

  function words(s) { return s.split(/(\s+)/); }
  function diff(a, b) {
    var x = words(a), y = words(b), n = x.length, m = y.length, L = [];
    if (n * m > 160000) { var f = document.createDocumentFragment(); f.append(el("del", "", a), document.createTextNode(" "), el("ins", "", b)); return f; }
    for (var i = 0; i <= n; i++) L.push(new Array(m + 1).fill(0));
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
  function enotes() { return Object.keys(S.enotes).map(function (k) { return Object.assign({ key: k }, S.enotes[k]); }).filter(function (x) { return x.n && x.n.trim() && x.n.trim() !== (x.sentN || ""); }); }
  function pnotes() { var sn = S.sentNotes || {}; return Object.keys(S.notes).filter(function (g) { var x = (S.notes[g] || "").trim(); return x && x !== sn[g]; }); }
  function addsList() { return Object.keys(S.adds).map(function (k) { return S.adds[k]; }).filter(function (a) { return a.text && (a.sentT !== a.text || a.sentType !== a.type || (a.n || "") !== (a.sentN || "")); }).sort(function (x, y) { return x.seq - y.seq; }); }
  function count() { var n = changes().length + enotes().length + pnotes().length + addsList().length; $("n").textContent = n; var c = conflicts().length; $("b-panel").classList.toggle("warn", !!c); }
  function homePage(it) { return it.g !== "site" && it.g !== "more" && it.g !== "upd" ? it.g : (it.page || "index"); }
  function jump(it) {
    var pg = homePage(it), doit = function () {
      var ns = MAP[it.id]; if (!ns || !ns.length) { openPanel("more", it.id); return; }
      var n = ns[0]; n.scrollIntoView({ block: "center" }); n.classList.add("mfe-flash"); setTimeout(function () { n.classList.remove("mfe-flash"); }, 1800);
      if (window.innerWidth <= 1000) closePanel();
    };
    if (pg === cur || (MAP[it.id] && MAP[it.id].length)) doit(); else go(pg, doit);
  }

  function jumpAdd(a) {
    var doit = function () { var e = FX.doc && FX.doc.querySelector('[data-mfe-add="' + a.k + '"]'); if (!e) return; e.scrollIntoView({ block: "center" }); e.classList.add("mfe-flash"); setTimeout(function () { e.classList.remove("mfe-flash"); }, 1800); if (window.innerWidth <= 1000) closePanel(); };
    if (a.page === cur) doit(); else go(a.page, doit);
  }
  function renderPanel() {
    var pb = $("pb"), keep = pb.scrollTop; pb.textContent = "";
    $("t-chg").setAttribute("aria-selected", TAB === "chg"); $("t-more").setAttribute("aria-selected", TAB === "more"); $("t-find").setAttribute("aria-selected", TAB === "find");
    if (TAB === "chg") renderChanges(pb); else if (TAB === "find") { renderFind(pb); return; } else renderMore(pb);
    pb.scrollTop = keep;
  }
  function renderChanges(pb) {
    var ch = changes().sort(function (a, b) { return (S.ed[b.id] || 0) - (S.ed[a.id] || 0); }), en = enotes(), pn = pnotes(), ad = addsList(), cf = conflicts();
    if (cf.length) {
      var cb = el("div", "conf"); cb.appendChild(el("h3", "", "השתנו באתר אחרי שתיקנת (" + cf.length + ")"));
      cb.appendChild(el("p", "muted", "הנוסח באתר עודכן מאז שכתבת את התיקון. מה להשאיר?"));
      cf.forEach(function (id) {
        var it = byId[id], s0 = S.items[id], b = el("div", "chg");
        b.appendChild(el("div", "wh", (it.g === "site" ? "בכל האתר" : groupName(homePage(it))) + " · " + it.label));
        var a1 = el("div", "before"); a1.append(el("span", "tag", "באתר עכשיו:"), document.createTextNode(it.he));
        var a2 = el("div", "after"); a2.append(el("span", "tag", "התיקון שלך:"), document.createTextNode(s0.t));
        var r = el("div", "row"), k1 = el("button", "btn sm", "להשאיר את התיקון שלי"), k2 = el("button", "btn alt sm", "הנוסח באתר טוב");
        k1.type = k2.type = "button"; r.append(k1, k2);
        k1.addEventListener("click", function () { S.items[id].v = it.v; delete S.items[id].sentT; save(); paintId(id); });
        k2.addEventListener("click", function () { delete S.items[id]; save(); paintId(id); });
        b.append(a1, a2, r); cb.appendChild(b);
      });
      pb.appendChild(cb);
    }
    if (!ch.length && !en.length && !pn.length && !ad.length) {
      if (cf.length) return;
      pb.appendChild(el("div", "empty", "עוד אין שינויים. לוחצים על כל טקסט באתר ומקלידים, והשינוי יופיע כאן."));
      return;
    }
    pb.appendChild(el("p", "muted", "החדשים למעלה. לחיצה על \"לראות באתר\" מקפיצה למקום."));
    ch.forEach(function (it) {
      var b = el("div", "chg"), w = el("div", "wh");
      w.appendChild(el("span", "", (it.g === "site" ? "בכל האתר" : groupName(homePage(it))) + " · " + it.label));
      var g = el("button", "go", "לראות באתר"); g.type = "button"; g.addEventListener("click", function () { jump(it); }); w.appendChild(g);
      var r = el("button", "rm", "ביטול"); r.type = "button"; r.title = "להחזיר לנוסח שבאתר ולמחוק את ההערה"; r.addEventListener("click", function () { setItem(it.id, null, ""); toast("השינוי בוטל. אפשר לשחזר עם ↶"); }); w.appendChild(r);
      b.appendChild(w);
      if (deleted(it.id)) b.appendChild(el("div", "deltag", "🗑 להוריד מהאתר"));
      if (edited(it.id)) {
        var af = el("div", "after"); af.appendChild(diff(it.he.trim(), txt(it.id).trim())); b.appendChild(af);
        var bf = el("div", "before"); bf.append(el("span", "tag", "באתר היום:"), document.createTextNode(it.he)); b.appendChild(bf);
      } else { var bf2 = el("div", "after"); bf2.textContent = it.he; b.appendChild(bf2); }
      if (noteOf(it.id).trim()) b.appendChild(el("div", "note", "💬 " + noteOf(it.id).trim()));
      pb.appendChild(b);
    });
    ad.forEach(function (a) {
      var b = el("div", "chg add"), w = el("div", "wh");
      w.appendChild(el("span", "", pageName(a.page) + " · ＋ " + typeOf(a.type).name + " חדשה"));
      var g = el("button", "go", "לראות באתר"); g.type = "button"; g.addEventListener("click", function () { jumpAdd(a); }); w.appendChild(g);
      var r = el("button", "rm", "מחיקה"); r.type = "button"; r.addEventListener("click", function () { var prev = S.adds[a.k]; delete S.adds[a.k]; push({ k: "a", id: a.k, prev: prev, next: null }); save(); renderAdds(); toast("התוספת נמחקה. אפשר לשחזר עם ↶"); }); w.appendChild(r);
      b.append(w, el("div", "after", a.text), el("div", "before", (a.pos === "before" ? "לפני: " : "אחרי: ") + ((a.anchor && a.anchor.snip) || "")));
      if (a.n) b.appendChild(el("div", "note", "💬 " + a.n));
      pb.appendChild(b);
    });
    en.forEach(function (x) {
      var b = el("div", "chg"), w = el("div", "wh");
      w.appendChild(el("span", "", pageName(x.page) + " · הערה על " + (x.what === "תמונה" ? "תמונה" : "טקסט")));
      var r = el("button", "rm", "מחיקה"); r.type = "button"; r.addEventListener("click", function () { setENote(x.key, x, ""); }); w.appendChild(r);
      b.append(w, el("div", "before", x.snip), el("div", "note", "💬 " + x.n.trim())); pb.appendChild(b);
    });
    pn.forEach(function (g) {
      var b = el("div", "chg"); b.append(el("div", "wh", groupName(g) + " · הערה כללית על העמוד"), el("div", "note", "💬 " + S.notes[g].trim())); pb.appendChild(b);
    });
  }
  function field(pb, it, lab) {
    var f = el("div", "fld" + (edited(it.id) ? " ed" : "")); f.dataset.id = it.id;
    var l = el("label", "", lab || it.label); l.htmlFor = "f" + it.id; f.appendChild(l);
    var ta = el("textarea"); ta.id = "f" + it.id; ta.value = txt(it.id); f.appendChild(ta);
    ta.addEventListener("change", function () { var t = norm(ta.value); if (!t) { ta.value = txt(it.id); toast("טקסט ריק לא נשמר."); return; } setItem(it.id, t === norm(it.he) ? null : t, noteOf(it.id)); });
    if (edited(it.id)) { var rv = el("button", "rv", "↺ להחזיר לנוסח שבאתר"); rv.type = "button"; rv.addEventListener("click", function () { setItem(it.id, null, noteOf(it.id)); }); f.appendChild(rv); }
    pb.appendChild(f);
  }
  function renderMore(pb) {
    var slug = cur || "index";
    var gn = el("div", "fld"); var gl = el("label", "", "הערה כללית על העמוד \"" + pageName(slug) + "\""); gl.htmlFor = "pnote";
    var gt = el("textarea"); gt.id = "pnote"; gt.value = S.notes[slug] || ""; gt.placeholder = "למשל: חסר כאן פרויקט, או סדר אחר של החלקים";
    gt.addEventListener("change", function () { S.notes[slug] = gt.value; save(); });
    gn.append(gl, gt); pb.appendChild(gn);
    var hidden = D.items.filter(function (it) { return it.page === slug && it.kind !== "v" && !(MAP[it.id] && MAP[it.id].length); });
    var gk = hidden.filter(function (it) { return it.kind === "g"; }), hk = hidden.filter(function (it) { return it.kind === "h"; });
    if (gk.length) { pb.appendChild(el("h3", "", "איך העמוד מופיע בגוגל ובלשונית")); gk.forEach(function (it) { field(pb, it); }); }
    if (hk.length) { pb.appendChild(el("h3", "", "תיאורים שלא רואים על המסך (לעיוורים ולגוגל)")); hk.forEach(function (it) { field(pb, it); }); }
    var missing = D.items.filter(function (it) { return (it.g === slug || (it.g === "more" && slug === "contact")) && it.kind === "v" && !(MAP[it.id] && MAP[it.id].length); });
    if (missing.length) {
      pb.appendChild(el("h3", "", slug === "contact" ? "הודעות של הטופס ועוד טקסטים שמופיעים רק לפעמים" : "טקסטים שמופיעים רק לפעמים"));
      pb.appendChild(el("p", "muted", "הם לא מוצגים עכשיו על המסך (למשל הודעת שגיאה או שלב אחר), אז מתקנים אותם כאן."));
      missing.forEach(function (it) { field(pb, it); });
    }
    if (!gk.length && !hk.length && !missing.length) pb.appendChild(el("p", "muted", "כל הטקסטים של העמוד הזה גלויים על המסך, ואפשר לתקן אותם ישירות בעמוד."));
  }

  // ---- report and send (same format as the text-review page) ----
  function report() {
    var ch = changes(), d = new Date(), lines = [];
    var nT = ch.filter(function (it) { return edited(it.id); }).length, en = enotes(), pn = pnotes();
    lines.push("שינויים בטקסטים של אתר מיפתח");
    lines.push("מאת מרב (עריכה על האתר), " + d.toLocaleDateString("he-IL") + " " + d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }));
    var pl = function (n, one, many) { return n === 1 ? one : n === 0 ? "אין " + many : n + " " + many; };
    var nD = ch.filter(function (it) { return deleted(it.id); }).length, nA = addsList().length;
    lines.push(pl(nT, "תיקון נוסח אחד", "תיקוני נוסח") + ", " + pl(nA, "תוספת אחת", "תוספות") + ", " + pl(nD, "הורדה אחת", "הורדות") + ", " + pl(ch.filter(function (it) { return (noteOf(it.id) || "").trim(); }).length + en.length + pn.length, "הערה אחת", "הערות") + ".");
    lines.push("");
    if (S.general.trim() && S.general.trim() !== (D.sentGeneral || "").trim() && S.general.trim() !== (S.sentGeneral || "")) lines.push("הערה כללית:", S.general.trim(), "");
    var order = {}; D.groups.forEach(function (g, i) { order[g.id] = i; });
    ch.sort(function (a, b) { return (order[a.g] - order[b.g]) || (a.pos - b.pos) || (a.id - b.id); });
    var lastG = "";
    ch.forEach(function (it) {
      var s = stateOf(it.id);
      if (it.g !== lastG) { lines.push("==== " + groupName(it.g) + " ===="); lastG = it.g; }
      lines.push("[#" + it.id + "] " + it.label);
      lines.push("היום: " + it.he);
      if (edited(it.id)) lines.push("חדש: " + txt(it.id).trim());
      if (s.d) lines.push("להוריד: להוריד את הטקסט הזה מהאתר");
      if ((s.n || "").trim() && s.n.trim() !== sentNote(it.id)) lines.push("הערה: " + s.n.trim());
      lines.push("");
    });
    var ad = addsList();
    if (ad.length) {
      lines.push("==== תוספות חדשות ====");
      ad.forEach(function (a) {
        lines.push("[+] (" + pageName(a.page) + ") " + typeOf(a.type).name + ", " + (a.pos === "before" ? "לפני" : "אחרי") + " «" + ((a.anchor && a.anchor.snip) || "") + "»" + (a.anchor && a.anchor.id != null ? " [#" + a.anchor.id + "]" : ""));
        lines.push("טקסט: " + a.text);
        if (a.n) lines.push("הערה: " + a.n);
        lines.push("");
      });
    }
    if (en.length) {
      lines.push("==== הערות על תמונות ועל חלקים בעמודים ====");
      en.forEach(function (x) { lines.push("(" + pageName(x.page) + ") " + x.what + ": " + x.snip); lines.push("  ↳ " + x.n.trim().replace(/\n/g, " ")); lines.push(""); });
    }
    if (pn.length) { lines.push("==== הערות כלליות לעמודים ===="); pn.forEach(function (g) { lines.push(groupName(g) + ": " + S.notes[g].trim()); }); lines.push(""); }
    lines.push("(נוצר בעורך האתר. המספרים בסוגריים מזהים כל טקסט.)");
    return lines.join("\n");
  }
  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return legacy(); });
    return Promise.resolve(legacy());
    function legacy() { var t = el("textarea"); t.value = text; t.style.position = "fixed"; t.style.opacity = "0"; document.body.appendChild(t); t.select(); var ok = false; try { ok = document.execCommand("copy"); } catch (e) {} t.remove(); return ok; }
  }
  function openSend() {
    if (FX.editing) FX.finish(); closeBar();
    var ch = changes(), st = $("stats"); st.textContent = "";
    [[ch.filter(function (it) { return edited(it.id) || deleted(it.id); }).length + addsList().length, "תיקונים ותוספות"],
     [ch.filter(function (it) { return noteOf(it.id).trim(); }).length + enotes().length + pnotes().length, "הערות"],
     [new Set(ch.map(function (it) { return it.g; }).concat(enotes().map(function (x) { return x.page; }))).size, "עמודים"]].forEach(function (x) {
      var s = el("div", "stat"); s.append(el("b", "", String(x[0])), el("span", "", x[1])); st.appendChild(s);
    });
    $("general").value = S.general; $("smsg").hidden = true;
    $("senddlg").hidden = false; $("s-mail").focus();
  }
  $("b-send").addEventListener("click", openSend);
  $("s-x").addEventListener("click", function () { $("senddlg").hidden = true; $("b-send").focus(); });
  $("general").addEventListener("input", function () { S.general = $("general").value; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} });
  function markSent() {
    S.sentAt = new Date().toISOString(); S.sentGeneral = S.general.trim(); S.sentNotes = {};
    Object.keys(S.notes).forEach(function (k) { S.sentNotes[k] = (S.notes[k] || "").trim(); });
    changes().forEach(function (it) { var x = S.items[it.id]; x.sentT = txt(it.id).trim(); x.sentN = (x.n || "").trim(); });
    Object.keys(S.enotes).forEach(function (k) { S.enotes[k].sentN = (S.enotes[k].n || "").trim(); });
    changes().forEach(function (it) { var x = S.items[it.id]; if (x) x.sentD = !!x.d; });
    Object.keys(S.adds).forEach(function (k) { var a = S.adds[k]; a.sentT = a.text; a.sentType = a.type; a.sentN = a.n || ""; });
    save();
  }
  $("s-mail").addEventListener("click", function () {
    var body = report(), subj = "תיקונים לאתר מיפתח (מרב, מעורך האתר)";
    copy(body).then(function () {
      var long = encodeURIComponent(body).length > 12000;
      location.href = "mailto:" + encodeURIComponent(S.to || "") + "?subject=" + encodeURIComponent(subj) + "&body=" + encodeURIComponent(long ? "התיקונים מועתקים. לוחצים כאן בתוך המייל ובוחרים \"הדבק\" (או Ctrl+V):\n\n" : body);
      var m = $("smsg"); m.hidden = false; m.textContent = "";
      m.append(el("b", "", long ? "נפתח מייל לחנוך. התיקונים ארוכים מדי לשורת המייל, ולכן הם הועתקו: לוחצים בתוך המייל, \"הדבק\", ואז \"שלח\"." : "נפתח מייל לחנוך עם כל השינויים. בודקים ולוחצים \"שלח\"."),
        el("div", "", "לא נפתח מייל? התיקונים כבר הועתקו: פותחים מייל חדש לחנוך, מדביקים ושולחים. אפשר גם \"שמירה כקובץ\" ולצרף אותו."));
      markSent();
    });
  });
  $("s-copy").addEventListener("click", function () { copy(report()).then(function (ok) { toast(ok ? "השינויים הועתקו. אפשר להדביק אותם במייל או בוואטסאפ לחנוך." : "ההעתקה לא הצליחה. נסי \"שמירה כקובץ\"."); }); });
  $("s-file").addEventListener("click", function () {
    var blob = new Blob(["﻿" + report()], { type: "text/plain;charset=utf-8" }), a = el("a");
    a.href = URL.createObjectURL(blob); a.download = "תיקונים-לאתר-מיפתח.txt"; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000); toast("הקובץ נשמר בתיקיית ההורדות.");
  });

  // ---- start ----
  function topH() { document.documentElement.style.setProperty("--top", document.querySelector(".top").offsetHeight + "px"); }
  topH(); window.addEventListener("resize", topH);
  function closeW() { $("welcome").hidden = true; S.seenEditor = 1; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} hint("לוחצים על כל טקסט באתר ומקלידים"); }
  $("start").addEventListener("click", closeW);
  $("b-help").addEventListener("click", function () { $("welcome").hidden = false; $("start").textContent = "חזרה לעריכה"; $("start").focus(); });
  if (S.dev && S.dev !== "desk" && window.innerWidth > 1000) { var db = document.querySelector('[data-dev="' + S.dev + '"]'); if (db) db.click(); }
  var start = /(?:^|[#&])page=([a-z0-9-]+)/.exec(location.hash || "");
  var first = start && PAGES.some(function (g) { return g.id === start[1]; }) ? start[1] : (S.cur && PAGES.some(function (g) { return g.id === S.cur; }) ? S.cur : "index");
  sel.value = first; go(first);
  var nSync = sync();
  count(); undoBtns();
  if (!S.seenEditor) { $("welcome").hidden = false; $("start").focus(); }
  else if (conflicts().length) { toast(conflicts().length + " טקסטים השתנו באתר אחרי שתיקנת אותם. פתחתי את הרשימה כדי לבחור מה להשאיר.", 7000); openPanel("chg"); }
  else if (nSync) toast(nSync + " מהתיקונים שלך כבר נכנסו לאתר ✓ הם ירדו מהרשימה.", 6000);
  else if (changes().length || addsList().length) toast("ממשיכים מאיפה שעצרת. השינויים שלך מסומנים בצהוב, והתוספות בירוק.");
})();
