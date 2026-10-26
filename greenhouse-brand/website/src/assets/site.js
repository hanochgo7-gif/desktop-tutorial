/* MIFTAH Projects — site behaviour. No dependencies.
   Menu, hero video control, the section drawing reveal, the project-review form, and analytics hooks. */
(function () {
  "use strict";
  var doc = document.documentElement, LANG = doc.lang === "he" ? "he" : "en";
  var CFG = window.MIFTAH || {};
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
    var T = { he: { pause: "עצירת הסרטון", play: "הפעלת הסרטון" }, en: { pause: "Pause video", play: "Play video" } }[LANG];
    function label(playing) { if (btn) { btn.querySelector("span").textContent = playing ? T.pause : T.play; btn.setAttribute("aria-pressed", playing ? "false" : "true"); } }
    function start() {
      if (!v.getAttribute("src")) { v.setAttribute("src", src); }
      var p = v.play(); if (p && p.catch) p.catch(function () { label(false); });
      label(true);
    }
    // load after first paint so the poster (LCP) and text come first
    var lazy = v.hasAttribute("data-lazy");
    function go() { if (reduce) { label(false); return; } start(); }
    if (lazy && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { go(); io.disconnect(); } }); }, { rootMargin: "200px" });
      io.observe(v);
    } else if (document.readyState === "complete") { setTimeout(go, 300); }
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
    fig.querySelectorAll(".dw-anim").forEach(function (p) {
      var len = 0; try { len = Math.ceil(p.getTotalLength()); } catch (e) { len = 600; }
      p.style.setProperty("--len", len);
    });
    fig.classList.add("armed");
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { fig.classList.add("play"); io.disconnect(); } });
    }, { threshold: .35 });
    io.observe(fig);
  });

  // ---- print button on the profile page ----
  var pb = document.getElementById("print-btn");
  if (pb) pb.addEventListener("click", function () { track("profile_print", {}); window.print(); });

  // ---- project-review form ----
  var form = document.getElementById("review-form");
  if (!form) return;
  var M = {
    en: { req: "Please fill this in.", email: "Please enter an email address like name@company.com.", choose: "Please choose one.", consent: "Please confirm so we can use these details to reply.",
      sending: "Sending…", send: form.querySelector("[type=submit]").textContent,
      okH: "Thank you. Your request was sent.", okP: "We'll contact you to arrange a first conversation. If it's urgent, call +972 4 985 4404.",
      badH: "The request was not sent.", badP: "Something went wrong on our side. Please try again in a minute, or call +972 4 985 4404.",
      offH: "Online sending isn't connected yet.", offP: "Your details were not sent. Copy the summary below and send it to us, or call +972 4 985 4404.", copy: "Copy the summary", copied: "Copied.",
      fast: "Please take a moment to check the details, then send again.",
      small_il: "Projects in Israel usually start from 5 ha (50 dunam). You can still send the request.", small_ab: "Projects abroad usually start from 30 ha. You can still send the request." },
    he: { req: "נא למלא את השדה.", email: "נא להזין כתובת מייל, למשל name@company.com.", choose: "נא לבחור אפשרות.", consent: "נא לאשר, כדי שנוכל להשתמש בפרטים כדי לחזור אליך.",
      sending: "שולחים…", send: form.querySelector("[type=submit]").textContent,
      okH: "תודה. הבקשה נשלחה.", okP: "נחזור אליך כדי לתאם שיחה ראשונה. אם זה דחוף: 04-9854404.",
      badH: "הבקשה לא נשלחה.", badP: "משהו השתבש אצלנו. אפשר לנסות שוב בעוד דקה, או להתקשר ל-04-9854404.",
      offH: "השליחה מהאתר עוד לא מחוברת.", offP: "הפרטים לא נשלחו. אפשר להעתיק את הסיכום ולשלוח לנו, או להתקשר ל-04-9854404.", copy: "העתקת הסיכום", copied: "הועתק.",
      fast: "נא לעבור על הפרטים ולשלוח שוב.",
      small_il: "פרויקטים בישראל מתחילים בדרך כלל מ-50 דונם. אפשר לשלוח את הבקשה בכל זאת.", small_ab: "פרויקטים בחו״ל מתחילים בדרך כלל מ-30 הקטר. אפשר לשלוח את הבקשה בכל זאת." }
  }[LANG];
  var started = false, t0 = Date.now(), busy = false;
  form.addEventListener("input", function () { if (!started) { started = true; track("form_start", {}); } }, { once: false });

  var sizeNote = document.getElementById("size-note");
  function sizeCheck() {
    if (!sizeNote) return;
    var c = form.country.value, s = form.size.value, msg = "";
    if (s === "lt5" && c === "IL") msg = M.small_il;
    else if ((s === "lt5" || s === "5-30") && c && c !== "IL") msg = M.small_ab;
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
  function payload() {
    return {
      name: label("name"), company: label("company"), email: label("email"), phone: label("phone"),
      role: label("role"), need: label("need"), country: label("country"), country_code: form.country.value, region: label("region"),
      size: label("size"), size_code: form.size.value, status: label("status"), crop: label("crop"), timeline: label("timeline"),
      message: label("message"), meet_berlin: form.berlin && form.berlin.checked, lang: LANG, page: location.pathname, sent_at: new Date().toISOString()
    };
  }
  function brief(p) {
    var K = LANG === "he"
      ? [["שם", "name"], ["חברה", "company"], ["מייל", "email"], ["טלפון", "phone"], ["אני", "role"], ["מה צריך", "need"], ["מדינה", "country"], ["אזור", "region"], ["שטח", "size"], ["מצב הקרקע", "status"], ["גידול", "crop"], ["לוח זמנים", "timeline"], ["הודעה", "message"]]
      : [["Name", "name"], ["Company", "company"], ["Email", "email"], ["Phone", "phone"], ["I am", "role"], ["Need", "need"], ["Country", "country"], ["Region", "region"], ["Land size", "size"], ["Land status", "status"], ["Crop", "crop"], ["Timeline", "timeline"], ["Message", "message"]];
    var lines = [LANG === "he" ? "בקשה לבדיקת פרויקט · מיפתח" : "Project review request · MIFTAH"];
    K.forEach(function (k) { if (p[k[1]]) lines.push(k[0] + ": " + p[k[1]]); });
    if (p.meet_berlin) lines.push(LANG === "he" ? "רוצים להיפגש ב-Fruit Logistica 2027" : "Would like to meet at Fruit Logistica 2027");
    return lines.join("\n");
  }
  var status = document.getElementById("form-status");
  function show(kind, h, p, extra) {
    status.hidden = false; status.className = "form-status" + (kind === "bad" ? " bad" : "");
    status.innerHTML = "<h3></h3><p></p>"; status.querySelector("h3").textContent = h; status.querySelector("p").textContent = p;
    if (extra) status.appendChild(extra);
    status.setAttribute("tabindex", "-1"); status.focus();
  }
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (busy) return;
    if (form.website && form.website.value) return; // honeypot: silently ignore bots
    var bad = validate();
    if (bad.length) { bad[0].focus(); track("form_invalid", { fields: bad.length }); return; }
    if (Date.now() - t0 < 2500) { show("bad", M.fast, ""); return; }
    var p = payload(), btn = form.querySelector("[type=submit]");
    if (!CFG.formEndpoint) {
      var box = document.createElement("div"), pre = document.createElement("pre"), cb = document.createElement("button");
      pre.className = "brief"; pre.textContent = brief(p);
      cb.type = "button"; cb.className = "btn btn-line"; cb.textContent = M.copy; cb.style.marginTop = "10px";
      cb.addEventListener("click", function () {
        var done = function () { cb.textContent = M.copied; };
        try { navigator.clipboard.writeText(pre.textContent).then(done, function () { selectPre(); }); } catch (x) { selectPre(); }
        function selectPre() { var r = document.createRange(); r.selectNodeContents(pre); var s = getSelection(); s.removeAllRanges(); s.addRange(r); }
      });
      box.appendChild(pre); box.appendChild(cb);
      show("bad", M.offH, M.offP, box);
      track("form_submit_unconnected", { need: p.need });
      return;
    }
    busy = true; btn.disabled = true; btn.textContent = M.sending;
    fetch(CFG.formEndpoint, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify(Object.assign({ _brief: brief(p) }, p)) })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        form.reset(); form.hidden = true;
        show("ok", M.okH, M.okP);
        track("form_submit_success", { need: p.need, size: p.size_code, country: p.country_code });
      })
      .catch(function () {
        show("bad", M.badH, M.badP);
        track("form_submit_error", {});
      })
      .then(function () { busy = false; btn.disabled = false; btn.textContent = M.send; });
  });
})();
