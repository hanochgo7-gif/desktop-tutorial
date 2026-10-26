/* MIFTAH Projects — site behaviour. No dependencies.
   Menu, hero video control, the section drawing reveal, the project-review form, and analytics hooks. */
(function () {
  "use strict";
  var doc = document.documentElement, LANG = doc.lang === "he" ? "he" : "en";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- analytics: sends only if a provider is present on the page (none is configured by default) ----
  function track(name, props) {
    props = props || {};
    props.lang = LANG;
    try {
      if (typeof window.plausible === "function") window.plausible(name, { props: props });
      if (Array.isArray(window.dataLayer)) window.dataLayer.push(Object.assign({ event: name }, props));
    } catch (e) {}
  }
  window.miftahTrack = track;
  document.addEventListener("click", function (e) {
    var a = e.target.closest("a, button"); if (!a) return;
    var href = a.getAttribute("href") || "";
    if (a.dataset.track) track(a.dataset.track, { label: a.dataset.label || a.textContent.trim().slice(0, 60) });
    else if (href.indexOf("tel:") === 0) track("phone_click", { where: a.dataset.where || "" });
    else if (href.indexOf("mailto:") === 0) track("email_click", {});
  });

  // ---- mobile menu ----
  var mb = document.getElementById("menu-btn"), nav = document.getElementById("nav");
  if (mb && nav) {
    function setMenu(open) {
      nav.classList.toggle("open", open); mb.setAttribute("aria-expanded", open ? "true" : "false");
    }
    mb.addEventListener("click", function () { setMenu(mb.getAttribute("aria-expanded") !== "true"); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && mb.getAttribute("aria-expanded") === "true") { setMenu(false); mb.focus(); } });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
  }

  // ---- videos: choose a source for the screen, honour reduced motion, always offer pause ----
  document.querySelectorAll("video[data-src-wide]").forEach(function (v) {
    var btn = document.querySelector('[data-video="' + v.id + '"]');
    var portrait = window.matchMedia("(max-width: 720px) and (orientation: portrait)").matches;
    var small = window.matchMedia("(max-width: 1100px)").matches;
    var src = portrait && v.dataset.srcPortrait ? v.dataset.srcPortrait : (small && v.dataset.srcSmall ? v.dataset.srcSmall : v.dataset.srcWide);
    // H.264 MP4 everywhere it plays; WebM (VP9) for browsers built without H.264
    if (!v.canPlayType('video/mp4; codecs="avc1.640028"') && v.canPlayType('video/webm; codecs="vp9"')) src = src.replace(/\.mp4$/, ".webm");
    var ICON = { pause: "M2 1h3v10H2zM7 1h3v10H7z", play: "M2 1l9 5-9 5z" };
    function label(playing) { if (!btn) return; btn.querySelector("span").textContent = playing ? btn.dataset.pause : btn.dataset.play; btn.querySelector("path").setAttribute("d", playing ? ICON.pause : ICON.play); }
    function start() {
      if (!v.getAttribute("src")) { v.setAttribute("src", src); }
      var p = v.play(); if (p && p.catch) p.catch(function () { label(false); });
      label(true);
    }
    // load after the page has loaded, so the poster (LCP) and text come first; never with reduced motion
    var cn = navigator.connection, slow = cn && (cn.saveData || /(^|-)(2g|3g)$/.test(cn.effectiveType || ""));
    function go() { if (reduce || slow) { label(false); return; } start(); }
    if (document.readyState === "complete") setTimeout(go, 300);
    else window.addEventListener("load", function () { setTimeout(go, 300); });
    if (btn) btn.addEventListener("click", function () {
      if (v.paused || !v.getAttribute("src")) { start(); track("video_play", { id: v.id }); }
      else { v.pause(); label(false); track("video_pause", { id: v.id }); }
    });
    v.addEventListener("error", function () { if (btn) btn.hidden = true; });
  });

  // ---- the section drawing builds itself once, the first time it is seen ----
  document.querySelectorAll(".drawing[data-animate]").forEach(function (fig) {
    if (reduce || !("IntersectionObserver" in window)) return;
    function arm() {  // measured when the browser is idle, so it doesn't add a forced layout to page load
      var r = fig.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) return;  // already on screen: leave it drawn
      fig.querySelectorAll(".dw-anim").forEach(function (p) {
        if (!p.getClientRects().length) return;  // the hidden (desktop or phone) version
        var len = 0; try { len = Math.ceil(p.getTotalLength()); } catch (e) { len = 600; }
        p.style.setProperty("--len", len);
      });
      fig.classList.add("armed");
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (en) { if (en.isIntersecting) { fig.classList.add("play"); io.disconnect(); } });
      }, { threshold: .35 });
      io.observe(fig);
    }
    (window.requestIdleCallback || function (f) { setTimeout(f, 200); })(arm);
  });

  // ---- print button on the profile page ----
  var pb = document.getElementById("print-btn");
  if (pb) pb.addEventListener("click", function () { track("profile_print", {}); window.print(); });

  // ---- project-review form ----
  var form = document.getElementById("review-form");
  if (!form) return;
  var M = {};  // every message comes from content.py through the page (data-msg)
  try { M = JSON.parse(form.dataset.msg || "{}"); } catch (x) { M = {}; }
  M.send = form.querySelector("[type=submit]").textContent;
  var started = false, t0 = Date.now(), busy = false;
  form.addEventListener("input", function () { if (!started) { started = true; track("form_start", {}); } }, { once: false });

  var sizeNote = document.getElementById("size-note");
  function sizeCheck() {
    if (!sizeNote) return;
    var c = form.country.value, s = form.size.value, msg = "";
    if (s === "lt5" && c === "IL") msg = M.small_il;
    else if ((s === "lt5" || s === "5-30") && c && c !== "IL" && c !== "SEARCH") msg = M.small_ab;
    sizeNote.textContent = msg; sizeNote.hidden = !msg;
  }
  form.country.addEventListener("change", sizeCheck); form.size.addEventListener("change", sizeCheck);

  function fieldOf(el) { return el.closest(".field, fieldset, .check"); }
  function setErr(el, msg) {
    var box = fieldOf(el), id = (el.name || el.id) + "-err", e = document.getElementById(id);
    if (msg) {
      if (!e) { e = document.createElement("p"); e.className = "err"; e.id = id; box.appendChild(e); }
      e.textContent = msg;
      var targets = el.type === "radio" ? form.querySelectorAll('[name="' + el.name + '"]') : [el];
      Array.prototype.forEach.call(targets, function (t) { t.setAttribute("aria-invalid", "true"); var d = (t.getAttribute("aria-describedby") || "").split(" ").filter(Boolean); if (d.indexOf(id) < 0) d.push(id); t.setAttribute("aria-describedby", d.join(" ")); });
    } else if (e) {
      e.remove();
      var ts = el.type === "radio" ? form.querySelectorAll('[name="' + el.name + '"]') : [el];
      Array.prototype.forEach.call(ts, function (t) { t.removeAttribute("aria-invalid"); var d = (t.getAttribute("aria-describedby") || "").split(" ").filter(function (x) { return x && x !== id; }); if (d.length) t.setAttribute("aria-describedby", d.join(" ")); else t.removeAttribute("aria-describedby"); });
    }
  }
  function validate() {
    var bad = [];
    [["name", "req"], ["email", "email"], ["country", "choose"], ["size", "choose"]].forEach(function (r) {
      var el = form.elements[r[0]], v = (el.value || "").trim(), ok = !!v;
      if (r[0] === "email") ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
      setErr(el, ok ? "" : (r[0] === "email" && v ? M.email : (r[1] === "email" ? M.req : M[r[1]])));
      if (!ok) bad.push(el);
    });
    var need = form.querySelector('[name="need"]:checked'), first = form.querySelector('[name="need"]');
    setErr(first, need ? "" : M.choose); if (!need) bad.push(first);
    var role = form.querySelector('[name="role"]:checked'), r1 = form.querySelector('[name="role"]');
    setErr(r1, role ? "" : M.choose); if (!role) bad.push(r1);
    setErr(form.consent, form.consent.checked ? "" : M.consent); if (!form.consent.checked) bad.push(form.consent);
    return bad;
  }
  form.addEventListener("change", function (e) { if (e.target.getAttribute("aria-invalid") === "true") validate(); });

  function label(name) {
    var el = form.elements[name]; if (!el) return "";
    if (el.tagName === "SELECT") return el.value ? el.options[el.selectedIndex].text : "";
    if (el.length && el[0] && el[0].type === "radio") { var c = form.querySelector('[name="' + name + '"]:checked'); return c ? c.closest("label").querySelector("b").textContent : ""; }
    if (el.type === "checkbox") return el.checked ? "✓" : "";
    return (el.value || "").trim();
  }
  function val(name) { var c = form.querySelector('[name="' + name + '"]:checked'); return c ? c.value : ""; }
  function payload() {
    return {
      name: label("name"), company: label("company"), email: label("email"), phone: label("phone"),
      role: label("role"), role_code: val("role"), need: label("need"), need_code: val("need"), country: label("country"), country_code: form.country.value, region: label("region"),
      size: label("size"), size_code: form.size.value, status: label("status"), crop: label("crop"), timeline: label("timeline"),
      message: label("message"), meet_berlin: form.berlin && form.berlin.checked, lang: LANG, page: location.pathname, sent_at: new Date().toISOString()
    };
  }
  function brief(p) {
    var lines = [M.brief];
    (M.keys || []).forEach(function (k) { if (p[k[1]]) lines.push(k[0] + ": " + p[k[1]]); });
    if (p.meet_berlin) lines.push(M.berlin);
    return lines.join("\n");
  }
  var status = document.getElementById("form-status");
  function show(kind, h, p, extra) {
    status.hidden = false; status.className = "form-status" + (kind === "bad" ? " bad" : kind === "info" ? " info" : "");
    status.innerHTML = "<h3></h3><p></p>"; status.querySelector("h3").textContent = h; status.querySelector("p").textContent = p;
    if (extra) status.appendChild(extra);
    status.setAttribute("tabindex", "-1"); status.focus();
  }
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (busy) return;
    if (form.elements.mt_hp && form.elements.mt_hp.value) { show("bad", M.badH, M.trapP); track("form_honeypot", {}); return; } // hidden trap field: nothing is sent; a real person still gets the phone
    var bad = validate();
    bad.sort(function (a, b) { return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1; });
    if (bad.length) { bad[0].focus(); track("form_invalid", { fields: bad.length }); return; }
    var wait = 2500 - (Date.now() - t0);
    if (wait > 0) { busy = true; setTimeout(function () { busy = false; form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event("submit", { cancelable: true })); }, wait); return; } // too fast for a person: send quietly a moment later
    var p = payload(), btn = form.querySelector("[type=submit]");
    var endpoint = form.dataset.endpoint;
    if (!endpoint) {
      var box = document.createElement("div"), pre = document.createElement("pre"), cb = document.createElement("button");
      pre.className = "brief"; pre.textContent = brief(p);
      cb.type = "button"; cb.className = "btn btn-line"; cb.textContent = M.copy; cb.style.marginTop = "10px";
      cb.addEventListener("click", function () {
        var done = function () { cb.textContent = M.copied; };
        try { navigator.clipboard.writeText(pre.textContent).then(done, function () { selectPre(); }); } catch (x) { selectPre(); }
        function selectPre() { var r = document.createRange(); r.selectNodeContents(pre); var s = getSelection(); s.removeAllRanges(); s.addRange(r); }
      });
      var tel = document.createElement("a"); tel.className = "btn btn-primary"; tel.href = "tel:" + form.dataset.tel; tel.textContent = M.call; tel.setAttribute("data-where", "form-unconnected");
      var row = document.createElement("div"); row.className = "actions"; row.style.marginTop = "12px"; row.appendChild(tel); row.appendChild(cb); cb.style.marginTop = "0";
      box.appendChild(row); box.appendChild(pre);
      show("info", M.offH, M.offP, box);
      track("form_submit_unconnected", { need: p.need_code });
      return;
    }
    busy = true; btn.disabled = true; btn.textContent = M.sending;
    var ctl = window.AbortController ? new AbortController() : null, timer = ctl && setTimeout(function () { ctl.abort(); }, 15000);
    fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify(Object.assign({ _brief: brief(p) }, p)), signal: ctl ? ctl.signal : undefined })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        form.reset(); form.hidden = true;
        show("ok", M.okH, M.okP);
        track("form_submit_success", { need: p.need_code, size: p.size_code, country: p.country_code });
      })
      .catch(function () {
        show("bad", M.badH, M.badP);
        track("form_submit_error", {});
      })
      .then(function () { if (timer) clearTimeout(timer); busy = false; btn.disabled = false; btn.textContent = M.send; });
  });
})();
