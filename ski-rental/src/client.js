(function () {
  "use strict";
  var DATA = window.SKI_Q;
  var CH = DATA.chapters;
  var LETTERS = DATA.letters;
  var UNDECIDED = DATA.undecided;
  var OTHER = DATA.other;
  var LS_KEY = "ski-q-roy-omer-v1";
  var LS_LVL = "ski-q-level-v1";
  var IN_VIEWER = !!(window.claude && typeof window.claude.use === "function");

  var A = {};
  try { A = JSON.parse(localStorage.getItem(LS_KEY) || "{}") || {}; } catch (e) { A = {}; }
  var level = 1;
  try { level = parseInt(localStorage.getItem(LS_LVL), 10) || 1; } catch (e) {}

  var QI = {};
  CH.forEach(function (ch) { ch.qs.forEach(function (q) { q.ch = ch.id; QI[q.id] = q; }); });

  // ---------- helpers ----------
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else if (k.slice(0, 2) === "on") n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? "" : v);
    });
    (kids || []).forEach(function (c) { if (c != null) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return n;
  }
  function hasValue(v) {
    if (v == null) return false;
    if (typeof v === "string") return v.trim() !== "";
    if (typeof v === "number") return true;
    if (Array.isArray(v)) return v.some(hasValue);
    if (typeof v === "object") return Object.keys(v).some(function (k) { return hasValue(v[k]); });
    return !!v;
  }
  function keysOf(q) { return q.founders ? [q.id + "@roy", q.id + "@omer"] : [q.id]; }
  function answered(q) {
    return keysOf(q).some(function (k) { return hasValue(A[k]) || A[k + "#u"] === true; });
  }
  function asArr(v) { return Array.isArray(v) ? v : (v ? [v] : []); }
  function showOK(q) {
    if (!q.show) return true;
    var arr = asArr(A[q.show.id]);
    if (q.show.any) return arr.some(function (x) { return q.show.any.indexOf(x) > -1; });
    if (q.show.none) return !arr.some(function (x) { return q.show.none.indexOf(x) > -1; });
    return true;
  }
  function visible(q) { return q.lvl <= level && showOK(q); }
  var ICONS = DATA.icons;
  function ic(name, cls) {
    var t = document.createElement("span");
    t.innerHTML = ICONS[name] || "";
    var svgEl = t.firstChild;
    if (svgEl && cls) svgEl.setAttribute("class", "ic " + cls);
    return svgEl;
  }
  var TYPE = {
    short: ["pen", "תשובה קצרה"], long: ["text", "תשובה פתוחה"], num: ["hash", "מספר או טווח"],
    one: ["radio", "בחירה אחת"], many: ["checks", "אפשר לבחור כמה"], matrix: ["matrix", "בחירה בכל שורה"],
    poles: ["sliders", "נקודה על כל ציר"], grid: ["table", "טבלה למילוי"], list: ["list", "רשימה"],
    personas: ["persona", "בניית פרסונות"]
  };
  var MIN = { short: .5, long: 2, num: .5, one: .5, many: .75, matrix: 1.5, poles: 1, grid: 4, list: 2, personas: 8 };
  function est(q) { return (MIN[q.t] || 1) * (q.founders ? 2 : 1) + (q.more ? 1 : 0); }
  var uid = 0;
  function nid(p) { uid += 1; return (p || "f") + "-" + uid; }

  // ---------- saving ----------
  var saveT = null;
  function saveLocal() {
    clearTimeout(saveT);
    saveT = setTimeout(function () { try { localStorage.setItem(LS_KEY, JSON.stringify(A)); } catch (e) {} }, 250);
  }
  var cloud = null, pending = {}, writeT = {};
  function docId(k) { return k.replace(/@/g, "_").replace(/#/g, "-"); }
  function queueWrite(k) {
    if (!cloud) return;
    pending[k] = true;
    setSave("saving");
    clearTimeout(writeT[k]);
    writeT[k] = setTimeout(function () {
      var payload = { k: k, j: JSON.stringify(A[k] === undefined ? null : A[k]), at: Date.now() };
      cloud.doc(docId(k)).set(payload).then(function () {
        delete pending[k];
        if (!Object.keys(pending).length) setSave("cloud");
      }).catch(function (err) {
        delete pending[k];
        var code = err && err.code;
        if (code === "not_granted" || code === "revoked") { cloud = null; setSave("readonly"); }
        else setSave("error");
      });
    }, 700);
  }
  function set(k, v) {
    if (v === "" || (Array.isArray(v) && !v.length)) v = v; // keep empties so clearing syncs
    A[k] = v;
    saveLocal();
    queueWrite(k);
    afterChange(k);
  }

  var saveEl, SAVE_TXT = {
    local: "נשמר במכשיר הזה",
    connecting: "מתחבר…",
    cloud: "נשמר אוטומטית ומשותף עם הצוות",
    saving: "שומר…",
    readonly: "צפייה בלבד: התשובות נשמרות רק במכשיר הזה",
    error: "השמירה בענן נכשלה, התשובות שמורות במכשיר"
  };
  var saveState = "local";
  function setSave(s) {
    saveState = s;
    if (!saveEl) return;
    saveEl.dataset.state = s;
    saveEl.textContent = "";
    saveEl.appendChild(ic(s === "cloud" || s === "saving" ? "cloud" : "device"));
    saveEl.appendChild(document.createTextNode(SAVE_TXT[s]));
  }

  function initCloud() {
    if (!IN_VIEWER) { setSave("local"); return; }
    setSave("connecting");
    var first = true;
    var timer = setTimeout(function () { if (first) setSave("local"); }, 10000);
    window.claude.use("db").then(function (db) {
      if (!db) { clearTimeout(timer); setSave("local"); return; }
      var col = db.collection("answers");
      col.onSnapshot(function (snap) {
        clearTimeout(timer);
        var changed = [];
        snap.docChanges().forEach(function (c) {
          var d = c.doc.data();
          if (!d || !d.k || pending[d.k]) return;
          var v = null;
          try { v = JSON.parse(d.j); } catch (e) { return; }
          if (c.type === "removed") v = null;
          if (JSON.stringify(A[d.k]) !== JSON.stringify(v)) { A[d.k] = v; changed.push(d.k); }
        });
        if (first) {
          first = false;
          cloud = col;
          var remote = {};
          snap.docs.forEach(function (x) { var d = x.data(); if (d && d.k) remote[d.k] = true; });
          var up = Object.keys(A).filter(function (k) { return !remote[k] && (hasValue(A[k]) || A[k] === true); });
          up.forEach(queueWrite);
          if (!up.length) setSave("cloud");
        }
        if (changed.length) {
          try { localStorage.setItem(LS_KEY, JSON.stringify(A)); } catch (e) {}
          refreshKeys(changed);
        }
      }, function (err) {
        clearTimeout(timer);
        cloud = null;
        setSave(err && (err.code === "not_granted" || err.code === "revoked") ? "local" : "error");
      });
    }).catch(function () { clearTimeout(timer); setSave("local"); });
  }

  // ---------- field builders ----------
  function textField(k, long, ph, small, dir) {
    var f = long
      ? el("textarea", { class: "txt" + (small ? " sm" : ""), id: "in-" + docId(k), placeholder: ph || "", rows: small ? 2 : 3 })
      : el("input", { class: "inp", type: "text", id: "in-" + docId(k), placeholder: ph || "", dir: dir || null });
    f.value = A[k] || "";
    f.addEventListener("input", function () { set(k, f.value); });
    return f;
  }

  function chipsField(q, k) {
    var multi = q.t === "many";
    var cur = asArr(A[k]);
    var wrap = el("div", { class: "chips", role: multi ? "group" : "radiogroup", "aria-label": q.q });
    var name = nid("r");
    var otherInp = null;
    q.opts.forEach(function (o) {
      var inp = el("input", { type: multi ? "checkbox" : "radio", name: name, value: o });
      inp.checked = cur.indexOf(o) > -1;
      inp.addEventListener("change", function () {
        var v;
        if (multi) {
          v = Array.prototype.slice.call(wrap.querySelectorAll("input:checked")).map(function (x) { return x.value; });
        } else v = o;
        set(k, v);
        if (otherInp) otherInp.hidden = asArr(A[k]).indexOf(OTHER) < 0;
      });
      wrap.appendChild(el("label", { class: "chip" + (multi ? " multi" : "") }, [inp, el("span", { text: o })]));
    });
    if (q.opts.indexOf(OTHER) > -1) {
      otherInp = textField(k + "#o", false, "פרטו…");
      otherInp.classList.add("other");
      otherInp.hidden = cur.indexOf(OTHER) < 0;
      return el("div", { style: "display:grid;gap:8px" }, [wrap, otherInp]);
    }
    return wrap;
  }

  function matrixField(q, k) {
    var cur = A[k] || {};
    var m = el("div", { class: "matrix", style: "--n:" + q.cols.length, role: "group", "aria-label": q.q });
    m.appendChild(el("div", { class: "mx-head", "aria-hidden": "true" }, [el("div", { text: "" })].concat(q.cols.map(function (c) { return el("div", { text: c }); }))));
    q.rows.forEach(function (r, ri) {
      var name = nid("m");
      var cells = el("div", { class: "mx-cells", role: "radiogroup", "aria-label": r });
      q.cols.forEach(function (c) {
        var inp = el("input", { type: "radio", name: name, value: c, "aria-label": r + ": " + c });
        inp.checked = cur["r" + ri] === c;
        inp.addEventListener("change", function () {
          var v = Object.assign({}, A[k] || {}); v["r" + ri] = c; set(k, v);
        });
        cells.appendChild(el("label", { class: "mx-cell" }, [inp, el("span", {}, [el("b", { text: c })])]));
      });
      m.appendChild(el("div", { class: "mx-row" }, [el("div", { class: "rl", text: r }), cells]));
    });
    return m;
  }

  function polesField(q, k) {
    var cur = A[k] || {};
    var box = el("div", { class: "poles" });
    q.pairs.forEach(function (p, pi) {
      var name = nid("p");
      var a = el("div", { class: "b", text: p[0] });
      var b = el("div", { class: "a", text: p[1] });
      var dots = el("div", { class: "dots", role: "radiogroup", "aria-label": p[0] + " או " + p[1] });
      function mark() {
        var v = (A[k] || {})["p" + pi];
        a.classList.toggle("on", v === 1 || v === 2);
        b.classList.toggle("on", v === 4 || v === 5);
      }
      [1, 2, 3, 4, 5].forEach(function (n) {
        var lbl = n === 3 ? "באמצע" : (n < 3 ? p[0] : p[1]) + (n === 1 || n === 5 ? " (מאוד)" : "");
        var inp = el("input", { type: "radio", name: name, value: String(n), "aria-label": lbl });
        inp.checked = cur["p" + pi] === n;
        inp.addEventListener("change", function () { var v = Object.assign({}, A[k] || {}); v["p" + pi] = n; set(k, v); mark(); });
        dots.appendChild(el("label", { class: "dot" + (n === 3 ? " mid" : ""), title: lbl }, [inp, el("span")]));
      });
      box.appendChild(el("div", { class: "pole" }, [a, dots, b]));
      mark();
    });
    return box;
  }

  function gridField(q, k) {
    var cur = A[k] || {};
    var wide = q.cols.length > 4;
    var g = el("div", { class: "gridq" + (wide ? " wide" : ""), style: "--n:" + q.cols.length });
    g.appendChild(el("div", { class: "g-head", "aria-hidden": "true" }, [el("div", { text: "" })].concat(q.cols.map(function (c) { return el("div", { text: c.label }); }))));
    q.rows.forEach(function (r, ri) {
      var row = el("div", { class: "g-row" }, [el("div", { class: "rl", text: r })]);
      q.cols.forEach(function (c, ci) {
        var id = nid("g");
        var val = ((cur["r" + ri] || {})["c" + ci]) || "";
        var f;
        function upd() { var v = JSON.parse(JSON.stringify(A[k] || {})); v["r" + ri] = v["r" + ri] || {}; v["r" + ri]["c" + ci] = f.value; set(k, v); }
        if (c.kind === "select") {
          f = el("select", { class: "sel", id: id }, [el("option", { value: "", text: "בחרו" })].concat(c.opts.map(function (o) { return el("option", { value: o, text: o }); })));
          f.value = val;
          f.addEventListener("change", upd);
        } else {
          f = el("input", { class: "inp", type: "text", id: id });
          f.value = val;
          f.addEventListener("input", upd);
        }
        f.setAttribute("aria-label", r + ", " + c.label);
        row.appendChild(el("div", { class: "g-cell" }, [el("label", { for: id, text: c.label }), f]));
      });
      g.appendChild(row);
    });
    return g;
  }

  function listField(q, k) {
    var box = el("div", { class: "listq" });
    function rows() { var v = A[k]; return Array.isArray(v) ? v : []; }
    function draw() {
      box.textContent = "";
      var data = rows().slice();
      while (data.length < (q.min || 1)) data.push({});
      data.forEach(function (row, i) {
        var cells = el("div", { class: "cells", style: "display:contents" });
        q.fields.forEach(function (f) {
          var inp = el("input", { class: "inp", type: "text", placeholder: f.label, "aria-label": f.label + " " + (i + 1), dir: f.dir || null });
          inp.value = row[f.k] || "";
          inp.addEventListener("input", function () {
            var v = rows().slice(); while (v.length <= i) v.push({});
            v[i] = Object.assign({}, v[i]); v[i][f.k] = inp.value; set(k, v);
          });
          cells.appendChild(inp);
        });
        var rm = i >= (q.min || 1)
          ? el("button", { class: "rm", type: "button", "aria-label": "מחיקת שורה " + (i + 1), title: "מחיקת שורה", onclick: function () { var v = rows().slice(); v.splice(i, 1); set(k, v); draw(); } }, [ic("x")])
          : el("span");
        var r = el("div", { class: "l-row", style: "--n:" + q.fields.length }, [el("span", { class: "n", text: String(i + 1) }), cells, rm]);
        box.appendChild(r);
      });
      if (data.length < 8) box.appendChild(el("button", { class: "addrow", type: "button", onclick: function () { var v = rows().slice(); while (v.length < data.length) v.push({}); v.push({}); A[k] = v; draw(); } }, [ic("plus"), "הוספת שורה"]));
    }
    draw();
    return box;
  }

  function personasField(q, k) {
    var box = el("div", { class: "personas" });
    function rows() { var v = A[k]; return Array.isArray(v) ? v : []; }
    function draw() {
      box.textContent = "";
      var data = rows().slice();
      while (data.length < 3) data.push({});
      data.forEach(function (p, i) {
        function upd(fk, val) { var v = rows().slice(); while (v.length <= i) v.push({}); v[i] = Object.assign({}, v[i]); v[i][fk] = val; set(k, v); }
        var name = el("input", { class: "inp", type: "text", placeholder: "שם הפרסונה, גיל, מצב משפחתי ומגורים", "aria-label": "שם פרסונה " + (i + 1) });
        name.value = p.name || "";
        name.addEventListener("input", function () { upd("name", name.value); });
        var fs = el("div", { class: "persona-f" });
        q.fields.forEach(function (f) {
          var t = el("textarea", { class: "txt sm", rows: 2 });
          t.value = p[f.k] || "";
          t.addEventListener("input", function () { upd(f.k, t.value); });
          fs.appendChild(el("label", {}, [f.label, t]));
        });
        var head = el("div", { class: "persona-h" }, [el("span", { class: "pn" }, [ic("persona"), el("b", { text: String(i + 1) })]), name]);
        if (i >= 3) head.appendChild(el("button", { class: "rm btn btn-sm", type: "button", onclick: function () { var v = rows().slice(); v.splice(i, 1); set(k, v); draw(); } }, [ic("x"), "הסרה"]));
        box.appendChild(el("fieldset", { class: "persona", style: "margin:0" }, [head, fs]));
      });
      if (data.length < 5) box.appendChild(el("button", { class: "addrow", type: "button", onclick: function () { var v = rows().slice(); while (v.length < data.length) v.push({}); v.push({}); A[k] = v; draw(); } }, [ic("plus"), "הוספת פרסונה"]));
    }
    draw();
    return box;
  }

  function numField(q, k) {
    var f = el("input", { class: "inp", type: "text", inputmode: "decimal", id: "in-" + docId(k), placeholder: "מספר או טווח" });
    f.value = A[k] || "";
    f.addEventListener("input", function () { set(k, f.value); });
    return el("div", { class: "num" }, [f, q.unit ? el("span", { class: "unit-sfx", text: q.unit }) : null]);
  }

  function fieldFor(q, k) {
    switch (q.t) {
      case "short": return textField(k, false, "התשובה שלכם");
      case "long": return textField(k, true, "כתבו בחופשיות. גם רשימת נקודות זה מצוין.");
      case "num": return numField(q, k);
      case "one": case "many": return chipsField(q, k);
      case "matrix": return matrixField(q, k);
      case "poles": return polesField(q, k);
      case "grid": return gridField(q, k);
      case "list": return listField(q, k);
      case "personas": return personasField(q, k);
    }
    return textField(k, true);
  }

  function unit(q, k, label) {
    var u = el("div", { class: "unit" });
    if (label) u.appendChild(el("div", { class: "unit-label" }, [ic("persona"), label]));
    u.appendChild(el("div", { class: "field-area" }, [fieldFor(q, k)]));
    var hasOwnUndecided = (q.opts && q.opts.indexOf(UNDECIDED) > -1) || (q.t === "matrix" && q.cols.indexOf(UNDECIDED) > -1);
    if (!hasOwnUndecided) {
      var b = el("button", { class: "undecided", type: "button", "aria-pressed": A[k + "#u"] ? "true" : "false" }, [ic("help"), UNDECIDED]);
      b.addEventListener("click", function () {
        var on = b.getAttribute("aria-pressed") !== "true";
        b.setAttribute("aria-pressed", on ? "true" : "false");
        u.classList.toggle("is-undecided", on);
        set(k + "#u", on);
      });
      u.classList.toggle("is-undecided", !!A[k + "#u"]);
      u.appendChild(el("div", { class: "unit-foot" }, [b]));
    }
    return u;
  }

  function renderQ(q) {
    var art = el("article", { class: "q", id: "q-" + q.id, "data-q": q.id });
    var meta = el("div", { class: "q-meta" }, [
      el("span", { class: "q-id mono" }, [ic("check", "ok"), q.id]),
      el("span", { class: "piste piste-" + q.lvl, title: DATA.levels[q.lvl - 1].name }, [el("i"), DATA.levels[q.lvl - 1].short]),
      q.req ? el("span", { class: "tag-req", text: "חובה" }) : null,
      q.founders ? el("span", { class: "q-type split" }, [ic("split"), "כל אחד בנפרד"]) : null,
      el("span", { class: "q-type" }, [ic(TYPE[q.t][0]), TYPE[q.t][1]])
    ]);
    art.appendChild(meta);
    art.appendChild(el("h3", { text: q.q }));
    if (q.hint) art.appendChild(el("p", { class: "q-hint", text: q.hint }));
    var body = el("div", { class: "q-body" });
    if (q.founders) {
      body.appendChild(el("div", { class: "founders" }, [unit(q, q.id + "@roy", "רואי"), unit(q, q.id + "@omer", "אומר")]));
    } else body.appendChild(unit(q, q.id));
    if (q.more) {
      body.appendChild(el("div", { class: "more" }, [
        el("label", { class: "ml", for: "in-" + docId(q.id + "#f") }, [el("em", {}, [ic("reply"), "שאלת המשך"]), q.more]),
        textField(q.id + "#f", true, "", true)
      ]));
    }
    art.appendChild(body);
    art.classList.toggle("answered", answered(q));
    return art;
  }

  // ---------- page ----------
  var root = document.getElementById("q-main");
  var navList = document.getElementById("q-nav");
  var chapSel = document.getElementById("q-chap");
  var chapEls = {};

  function renderAll() {
    root.textContent = "";
    CH.forEach(function (ch, idx) {
      var sec = el("section", { class: "chapter", id: "ch-" + ch.id, "aria-labelledby": "h-" + ch.id });
      sec.appendChild(el("header", { class: "ch-head" }, [
        el("div", { class: "ch-tile", "aria-hidden": "true" }, [ic(ch.icon, "lg"), el("span", { class: "ch-l", text: LETTERS[ch.id] })]),
        el("div", { class: "ch-titles" }, [
          el("span", { class: "eyebrow", text: "פרק " + LETTERS[ch.id] + " מתוך " + CH.length }),
          el("h2", { id: "h-" + ch.id, text: ch.title }),
          el("div", { class: "ch-facts" }, [
            el("span", {}, [ic("list"), el("b", { class: "f-n" })]),
            el("span", {}, [ic("flag"), el("b", { class: "f-r" })]),
            el("span", {}, [ic("clock"), el("b", { class: "f-t" })])
          ])
        ]),
        el("div", { class: "ch-prog", "aria-hidden": "true" }, [el("span")])
      ]));
      sec.appendChild(el("p", { class: "ch-lead" }, [ic("info"), el("span", { text: ch.lead })]));
      var list = el("div", { class: "qs" });
      ch.qs.forEach(function (q) { var a = renderQ(q); a.hidden = !visible(q); list.appendChild(a); });
      sec.appendChild(list);
      sec.appendChild(el("p", { class: "empty-level", hidden: true, text: "בפרק הזה אין שאלות ברמה שבחרתם. אפשר לעבור לרמה הבאה בסרגל למעלה." }));
      var next = CH[idx + 1];
      sec.appendChild(el("div", { class: "ch-end" }, [
        el("p", { class: "ch-end-txt" }),
        next ? el("a", { class: "btn btn-next", href: "#ch-" + next.id }, [ic(next.icon), "לפרק " + LETTERS[next.id] + ": " + next.title, ic("arrow")]) :
          el("button", { class: "btn btn-primary", type: "button", onclick: openSheet }, [ic("clipboard"), "לסיכום ושליחה"])
      ]));
      root.appendChild(sec);
      chapEls[ch.id] = sec;
    });
    var map = document.getElementById("q-map");
    map.textContent = "";
    CH.forEach(function (ch) {
      map.appendChild(el("li", {}, [el("a", { href: "#ch-" + ch.id, "data-ch": ch.id }, [
        el("span", { class: "m-ic" }, [ic(ch.icon)]),
        el("span", { class: "m-l", text: LETTERS[ch.id] }),
        el("span", { class: "m-t", text: ch.title }),
        el("span", { class: "m-c mono" }),
        el("span", { class: "mini" }, [el("span")])
      ])]));
    });
    navList.textContent = "";
    chapSel.textContent = "";
    CH.forEach(function (ch) {
      navList.appendChild(el("li", {}, [el("a", { href: "#ch-" + ch.id, "data-ch": ch.id }, [
        el("span", { class: "l" }, [ic(ch.icon)]),
        el("span", { class: "t" }, [el("span", { text: ch.title }), el("span", { class: "mini" }, [el("span")])]),
        el("span", { class: "c mono" })
      ])]));
      chapSel.appendChild(el("option", { value: ch.id, text: "פרק " + LETTERS[ch.id] + " · " + ch.title }));
    });
    updateProgress();
  }

  function refreshKeys(keys) {
    var ids = {};
    keys.forEach(function (k) { ids[k.split(/[@#]/)[0]] = true; });
    Object.keys(ids).forEach(function (id) {
      var q = QI[id]; if (!q) return;
      var old = document.getElementById("q-" + id);
      if (!old) return;
      if (old.contains(document.activeElement)) return;
      var n = renderQ(q); n.hidden = !visible(q);
      old.parentNode.replaceChild(n, old);
    });
    applyVisibility();
  }

  function applyVisibility() {
    CH.forEach(function (ch) {
      var any = false;
      ch.qs.forEach(function (q) {
        var n = document.getElementById("q-" + q.id);
        var v = visible(q);
        if (n) n.hidden = !v;
        any = any || v;
      });
      var sec = chapEls[ch.id];
      if (sec) sec.querySelector(".empty-level").hidden = any;
    });
    updateProgress();
  }

  function afterChange(k) {
    var id = k.split(/[@#]/)[0];
    var q = QI[id];
    if (q) { var n = document.getElementById("q-" + id); if (n) n.classList.toggle("answered", answered(q)); }
    var dependent = CH.some(function (ch) { return ch.qs.some(function (x) { return x.show && x.show.id === id; }); });
    if (dependent) applyVisibility(); else updateProgress();
  }

  function stats() {
    var vis = 0, done = 0, req = 0, reqDone = 0, und = 0, missing = [];
    var per = {};
    CH.forEach(function (ch) {
      var s = { vis: 0, done: 0, req: 0, min: 0 };
      ch.qs.forEach(function (q) {
        if (!visible(q)) return;
        s.vis++; vis++; s.min += est(q); if (q.req) s.req++;
        var a = answered(q);
        if (a) { s.done++; done++; }
        if (keysOf(q).some(function (k) { return A[k + "#u"] === true; }) || keysOf(q).some(function (k) { return A[k] === UNDECIDED; })) und++;
        if (q.req) { req++; if (a) reqDone++; else missing.push(q); }
      });
      per[ch.id] = s;
    });
    return { vis: vis, done: done, req: req, reqDone: reqDone, und: und, missing: missing, per: per };
  }

  var bar = document.getElementById("q-track");
  var numDone = document.getElementById("q-done");
  var numReq = document.getElementById("q-req");
  function updateProgress() {
    var s = stats();
    bar.style.width = (s.vis ? Math.round(100 * s.done / s.vis) : 0) + "%";
    numDone.textContent = s.done + " מתוך " + s.vis + " שאלות";
    numReq.textContent = s.req - s.reqDone ? "חסרות " + (s.req - s.reqDone) + " שאלות חובה" : "כל שאלות החובה נענו";
    var totalMin = 0;
    CH.forEach(function (ch) {
      var p = s.per[ch.id];
      var pct = p.vis ? Math.round(100 * p.done / p.vis) : 0;
      var full = p.vis > 0 && p.done === p.vis;
      totalMin += p.min;
      [navList, document.getElementById("q-map")].forEach(function (list) {
        var a = list.querySelector('a[data-ch="' + ch.id + '"]');
        if (!a) return;
        var c = a.querySelector(".c, .m-c");
        c.textContent = "";
        if (full) c.appendChild(ic("check", "ok")); else c.textContent = p.done + "/" + p.vis;
        a.querySelector(".mini > span").style.width = pct + "%";
        a.classList.toggle("done", full);
        a.classList.toggle("off", p.vis === 0);
      });
      var sec = chapEls[ch.id];
      if (!sec) return;
      sec.querySelector(".f-n").textContent = p.vis + " שאלות";
      sec.querySelector(".f-r").textContent = p.req + " חובה";
      sec.querySelector(".f-t").textContent = "כ-" + Math.max(1, Math.round(p.min)) + " דקות";
      sec.querySelector(".ch-prog > span").style.width = pct + "%";
      var t = sec.querySelector(".ch-end-txt");
      t.textContent = "";
      if (p.vis) {
        if (full) t.appendChild(ic("check", "ok"));
        t.appendChild(document.createTextNode(full ? "סיימתם את הפרק." : "עניתם על " + p.done + " מתוך " + p.vis + " שאלות בפרק."));
      }
    });
    var rest = 0;
    CH.forEach(function (ch) { ch.qs.forEach(function (q) { if (visible(q) && !answered(q)) rest += est(q); }); });
    var tm = document.getElementById("q-time");
    if (tm) tm.textContent = rest ? "כ-" + Math.max(1, Math.round(rest)) + " דקות מילוי ב" + ["מסלול הכחול", "מסלולים הכחול והאדום", "כל המסלולים"][level - 1] : "סיימתם את המסלול שבחרתם";
  }

  // level switcher
  var seg = document.getElementById("q-level");
  function drawLevel() {
    Array.prototype.forEach.call(seg.querySelectorAll("button"), function (b) {
      b.setAttribute("aria-pressed", String(+b.dataset.lvl === level));
    });
    Array.prototype.forEach.call(document.querySelectorAll(".lvl[data-lvl]"), function (b) {
      b.setAttribute("aria-pressed", String(+b.dataset.lvl <= level));
    });
  }
  function setLevel(n) {
    level = n;
    try { localStorage.setItem(LS_LVL, String(level)); } catch (er) {}
    drawLevel(); applyVisibility();
  }
  Array.prototype.forEach.call(document.querySelectorAll(".lvl[data-lvl]"), function (b) {
    b.addEventListener("click", function () { setLevel(+b.dataset.lvl); });
  });
  seg.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    setLevel(+b.dataset.lvl);
  });

  // chapter tracking
  chapSel.addEventListener("change", function () {
    var t = document.getElementById("ch-" + chapSel.value);
    if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (!en.isIntersecting) return;
        var id = en.target.id.slice(3);
        Array.prototype.forEach.call(navList.querySelectorAll("a"), function (a) { a.classList.toggle("on", a.dataset.ch === id); });
        var cur = document.getElementById("q-cur");
        var chx = CH.filter(function (c) { return c.id === id; })[0];
        if (cur && chx) { cur.textContent = ""; cur.appendChild(ic(chx.icon)); cur.appendChild(document.createTextNode("פרק " + LETTERS[id] + " · " + chx.title)); }
        chapSel.value = id;
      });
    }, { rootMargin: "-30% 0px -60% 0px" });
  }

  // ---------- summary / export ----------
  function fmtVal(q, v, k) {
    if (!hasValue(v)) return "";
    switch (q.t) {
      case "one": case "many": {
        var arr = asArr(v).slice();
        var o = A[k + "#o"];
        if (o && arr.indexOf(OTHER) > -1) arr[arr.indexOf(OTHER)] = OTHER + ": " + o;
        return arr.join(", ");
      }
      case "matrix": return q.rows.map(function (r, i) { return v["r" + i] ? "  " + r + ": " + v["r" + i] : null; }).filter(Boolean).join("\n");
      case "poles": return q.pairs.map(function (p, i) {
        var n = v["p" + i]; if (!n) return null;
        var t = n === 3 ? "באמצע" : (n < 3 ? p[0] : p[1]) + (n === 1 || n === 5 ? " (מאוד)" : "");
        return "  " + p[0] + " / " + p[1] + ": " + t;
      }).filter(Boolean).join("\n");
      case "grid": return q.rows.map(function (r, i) {
        var row = v["r" + i] || {};
        var parts = q.cols.map(function (c, ci) { return row["c" + ci] ? c.label + ": " + row["c" + ci] : null; }).filter(Boolean);
        return parts.length ? "  " + r + " | " + parts.join(" | ") : null;
      }).filter(Boolean).join("\n");
      case "list": return v.filter(hasValue).map(function (row, i) {
        return "  " + (i + 1) + ". " + q.fields.map(function (f) { return row[f.k]; }).filter(Boolean).join(" | ");
      }).join("\n");
      case "personas": return v.filter(hasValue).map(function (p, i) {
        return "  פרסונה " + (i + 1) + ": " + (p.name || "") + "\n" + q.fields.map(function (f) { return p[f.k] ? "    " + f.label + " " + p[f.k] : null; }).filter(Boolean).join("\n");
      }).join("\n");
    }
    return String(v);
  }
  function summaryText() {
    var out = ["שאלון אפיון: עסק להשכרת ציוד סקי (רואי ואומר)", "נוצר: " + new Date().toLocaleString("he-IL"), ""];
    CH.forEach(function (ch) {
      var lines = [];
      ch.qs.forEach(function (q) {
        if (!showOK(q)) return;
        var parts = [];
        keysOf(q).forEach(function (k, i) {
          var who = q.founders ? (i ? "אומר: " : "רואי: ") : "";
          var t = fmtVal(q, A[k], k);
          if (A[k + "#u"]) t = (t ? t + "\n  " : "") + "(" + UNDECIDED + ")";
          if (t) parts.push(who + (t.indexOf("\n") > -1 && q.t !== "one" && q.t !== "many" ? "\n" + t : t));
        });
        if (A[q.id + "#f"]) parts.push("שאלת המשך: " + A[q.id + "#f"]);
        if (parts.length) lines.push(q.id + " · " + q.q + "\n" + parts.join("\n") + "\n");
      });
      if (lines.length) { out.push("פרק " + LETTERS[ch.id] + " · " + ch.title); out.push("—".repeat(24)); out = out.concat(lines); out.push(""); }
    });
    return out.join("\n");
  }
  function exportJSON() {
    return JSON.stringify({ questionnaire: "ski-rental-discovery", version: 1, exported: new Date().toISOString(), answers: A }, null, 2);
  }

  var toastT;
  function toast(msg) {
    var t = document.getElementById("q-toast");
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(function () { t.hidden = true; }, 2600);
  }
  function copyText(txt, ta) {
    function fallback() { ta.hidden = false; ta.value = txt; ta.focus(); ta.select(); toast("סמנו את הטקסט והעתיקו"); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(function () { toast("הסיכום הועתק"); }, fallback);
    } else fallback();
  }
  function saveFile(name, txt, mime) {
    if (IN_VIEWER) {
      window.claude.use("downloads").then(function (d) {
        if (!d) { toast("הורדה לא זמינה כאן. השתמשו בהעתקה."); return; }
        return d.save({ filename: name, data: new Blob([txt], { type: mime }) }).then(function () { toast("הקובץ נשמר"); });
      }).catch(function (e) { toast(e && e.code === "declined" ? "ההורדה בוטלה" : "ההורדה לא הצליחה. השתמשו בהעתקה."); });
      return;
    }
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([txt], { type: mime }));
    a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    toast("הקובץ ירד");
  }

  var sheet = document.getElementById("q-sheet"), back = document.getElementById("q-back");
  function openSheet() {
    var s = stats();
    var b = document.getElementById("q-sheet-body");
    b.textContent = "";
    b.appendChild(el("div", { class: "stats" }, [
      el("div", { class: "stat" }, [ic("checks"), el("b", { text: String(s.done) }), el("span", { text: "שאלות נענו מתוך " + s.vis })]),
      el("div", { class: "stat" }, [ic("flag"), el("b", { text: String(s.reqDone) + "/" + s.req }), el("span", { text: "שאלות חובה" })]),
      el("div", { class: "stat" }, [ic("help"), el("b", { text: String(s.und) }), el("span", { text: "סומנו 'עדיין לא החלטנו'" })])
    ]));
    if (s.missing.length) {
      var miss = el("div", { class: "missing" });
      s.missing.forEach(function (q) {
        miss.appendChild(el("a", { href: "#q-" + q.id, class: "mono", text: q.id, title: q.q, onclick: closeSheet }));
      });
      b.appendChild(el("div", {}, [el("p", { class: "sh", text: "שאלות חובה שעוד לא נענו" }), miss]));
    }
    var cloudNote = saveState === "cloud" || saveState === "saving";
    b.appendChild(el("p", { class: "note" + (cloudNote ? " ok" : ""), text: cloudNote
      ? "התשובות נשמרות אוטומטית ואנחנו רואים אותן. אין צורך לשלוח. אם תרצו עותק לעצמכם, אפשר להעתיק או להוריד."
      : "התשובות שמורות רק במכשיר הזה. כשתסיימו, העתיקו את הסיכום ושלחו לנו בוואטסאפ או במייל, או הורידו קובץ ושלחו אותו." }));
    var ta = el("textarea", { class: "preview", hidden: true, readonly: true, "aria-label": "סיכום התשובות" });
    var actions = el("div", { class: "actions" }, [
      el("button", { class: "btn btn-primary", type: "button", onclick: function () { copyText(summaryText(), ta); } }, [ic("copy"), "העתקת סיכום התשובות"]),
      el("button", { class: "btn", type: "button", onclick: function () { saveFile("ski-questionnaire-answers.txt", summaryText(), "text/plain;charset=utf-8"); } }, [ic("download"), "קובץ טקסט"]),
      el("button", { class: "btn", type: "button", onclick: function () { saveFile("ski-questionnaire-answers.json", exportJSON(), "application/json"); } }, [ic("download"), "קובץ נתונים (JSON)"]),
      !IN_VIEWER ? el("button", { class: "btn", type: "button", onclick: function () { closeSheet(); setTimeout(function () { window.print(); }, 100); } }, [ic("printer"), "הדפסה או PDF"]) : null
    ]);
    b.appendChild(el("div", {}, [el("p", { class: "sh", text: "שליחה ושמירה" }), actions]));
    b.appendChild(ta);
    var file = el("input", { type: "file", accept: "application/json,.json", id: "q-import", class: "vh" });
    file.addEventListener("change", function () {
      var f = file.files && file.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        try {
          var d = JSON.parse(r.result);
          if (!d || !d.answers) throw new Error("bad");
          Object.keys(d.answers).forEach(function (k) { A[k] = d.answers[k]; queueWrite(k); });
          try { localStorage.setItem(LS_KEY, JSON.stringify(A)); } catch (e) {}
          renderAll(); applyVisibility(); closeSheet(); toast("התשובות נטענו");
        } catch (e) { toast("הקובץ לא נקרא. בחרו קובץ JSON שהורד מהשאלון."); }
      };
      r.readAsText(f);
    });
    b.appendChild(el("div", {}, [
      el("p", { class: "sh", text: "טעינת תשובות מקובץ" }),
      el("p", { class: "q-hint", style: "margin:0 0 8px", text: "אם מילאתם במכשיר אחר והורדתם קובץ JSON, אפשר לטעון אותו כאן. תשובות מהקובץ יחליפו תשובות קיימות לאותן שאלות." }),
      file,
      el("label", { class: "btn", for: "q-import" }, [ic("upload"), "בחירת קובץ"])
    ]));
    sheet.hidden = false; back.hidden = false;
    document.getElementById("q-sheet-close").focus();
  }
  function closeSheet() { sheet.hidden = true; back.hidden = true; }
  document.getElementById("q-open-sheet").addEventListener("click", openSheet);
  document.getElementById("q-sheet-close").addEventListener("click", closeSheet);
  back.addEventListener("click", closeSheet);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !sheet.hidden) closeSheet(); });

  // ---------- boot ----------
  saveEl = document.getElementById("q-save");
  drawLevel();
  renderAll();
  applyVisibility();
  if (io) CH.forEach(function (ch) { io.observe(chapEls[ch.id]); });
  setSave("local");
  initCloud();
})();
