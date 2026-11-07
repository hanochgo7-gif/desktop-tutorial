/* SOTA: site behavior and motion.
   Everything works without this file; it adds smooth scroll, the live route network, scroll chapters and contact wiring.
   Motion runs only with GSAP loaded and without prefers-reduced-motion. */
(() => {
  "use strict";
  const CFG = window.SOTA_CONFIG || {};
  const I18N = (() => { try { return JSON.parse(document.getElementById("i18n").textContent); } catch { return { ui: {} }; } })();
  const root = document.documentElement;
  const isRTL = root.dir === "rtl";
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  const motion = hasGsap && !reduced;
  const mqMobile = window.matchMedia("(max-width: 760px)");
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  root.classList.add(motion ? "motion" : "no-motion");

  /* ---------- contact details (config, then live settings from the server) ---------- */
  const contact = { phone: CFG.phone || "", whatsapp: CFG.whatsapp || "", email: CFG.email || "", bookingUrl: CFG.bookingUrl || "" };
  const waLink = (text) => (contact.whatsapp ? `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(text || "")}` : "");
  function applyContact() {
    $$("[data-wa]").forEach((a) => {
      const href = waLink(a.dataset.waText);
      if (href) { a.href = href; a.hidden = false; } else a.hidden = true;
    });
    $$("[data-wa-or-consult]").forEach((a) => {
      const href = waLink(a.dataset.waText);
      if (href) { a.href = href; a.target = "_blank"; a.rel = "noopener"; a.dataset.track = "whatsapp_click"; }
      else { a.href = "#consult"; a.removeAttribute("target"); }
    });
    $$("[data-contact='phone']").forEach((a) => { a.href = contact.phone ? "tel:" + contact.phone.replace(/[^\d+]/g, "") : "#"; const s = a.querySelector(".ltr"); if (s) s.textContent = contact.phone; });
    $$("[data-contact='email']").forEach((a) => { a.href = "mailto:" + contact.email; const s = a.querySelector(".ltr"); if (s) s.textContent = contact.email; });
    $$("[data-contact-wrap]").forEach((el) => { const k = el.dataset.contactWrap; if (k in contact) el.hidden = !contact[k]; });
    const alt = $("[data-alt-contact]"); if (alt) alt.hidden = !(contact.whatsapp || contact.phone);
    $$("[data-booking]").forEach((a) => {
      if (contact.bookingUrl) { a.href = contact.bookingUrl; a.target = "_blank"; a.rel = "noopener"; a.dataset.track = "booking_click"; }
    });
  }
  applyContact();

  function renderTestimonials(list) {
    const sec = $("[data-testimonials]"), box = $("[data-quotes]");
    if (!sec || !box) return;
    const items = (list || []).filter((t) => t && t.quote && t.name && (!t.lang || t.lang === I18N.lang));
    if (!items.length) { sec.hidden = true; return; }
    box.textContent = "";
    items.forEach((t) => {
      const fig = document.createElement("figure"); fig.className = "quote";
      const bq = document.createElement("blockquote"); bq.textContent = t.quote;
      const cap = document.createElement("figcaption");
      const b = document.createElement("b"); b.textContent = t.name; cap.append(b);
      const meta = [t.role, t.company].filter(Boolean).join(", ");
      if (meta) { const s = document.createElement("span"); s.textContent = meta; cap.append(s); }
      fig.append(bq, cap); box.append(fig);
    });
    sec.hidden = false;
    if (motion) ScrollTrigger.refresh();
  }

  // Settings and testimonials managed in /admin. Fails quietly when the server isn't connected (e.g. a static preview).
  const api = (CFG.apiBase || "").replace(/\/$/, "");
  fetch(api + "/api/public/content", { headers: { Accept: "application/json" } })
    .then((r) => (r.ok && (r.headers.get("content-type") || "").includes("json") ? r.json() : null))
    .then((data) => {
      if (!data) return;
      if (data.contact) { for (const k of Object.keys(contact)) if (typeof data.contact[k] === "string" && data.contact[k]) contact[k] = data.contact[k]; applyContact(); }
      renderTestimonials(data.testimonials);
    })
    .catch(() => {});

  /* ---------- tracking for anything marked data-track ---------- */
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-track]");
    if (!el || !window.sotaTrack) return;
    window.sotaTrack(el.dataset.track, { location: el.dataset.trackLoc || "", to: el.dataset.trackTo || undefined });
  });

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (motion && window.Lenis) {
    lenis = new window.Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const headerOffset = () => ($("[data-header]")?.offsetHeight || 0) + 12;
  function scrollToTarget(target, immediate) {
    if (!target) return;
    const y = Math.max(0, target.getBoundingClientRect().top + window.scrollY - headerOffset() - (immediate ? 24 : 0));
    if (lenis) { lenis.resize(); lenis.scrollTo(y, { immediate: !!immediate, force: true }); }
    else window.scrollTo({ top: y, behavior: reduced || immediate ? "auto" : "smooth" });
  }
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute("href").slice(1);
    const target = id ? document.getElementById(id) : null;
    if (!target) return;
    e.preventDefault();
    closeMenu();
    scrollToTarget(target);
    history.replaceState(null, "", "#" + id);
    if (id === "consult") setTimeout(() => $("#lead-name")?.focus({ preventScroll: true }), lenis ? 1100 : 500);
    else if (!target.hasAttribute("tabindex")) { target.setAttribute("tabindex", "-1"); target.focus({ preventScroll: true }); }
  });
  if (location.hash) { const t = document.getElementById(location.hash.slice(1)); if (t) window.addEventListener("load", () => setTimeout(() => scrollToTarget(t), 60)); }

  /* ---------- header ---------- */
  const header = $("[data-header]");
  let lastY = window.scrollY;
  function onScroll() {
    const y = window.scrollY;
    header?.classList.toggle("is-solid", y > 24);
    const menuOpen = $(".mobile-menu")?.classList.contains("is-open");
    header?.classList.toggle("is-hidden", !menuOpen && y > 480 && y > lastY + 4);
    if (y < lastY - 4 || y < 480) header?.classList.remove("is-hidden");
    lastY = y;
    const wa = $(".wa-float");
    if (wa) wa.classList.toggle("is-visible", y > window.innerHeight * 0.6 || document.body.dataset.page !== "home");
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  header?.addEventListener("focusin", () => header.classList.remove("is-hidden"));

  // highlight the current chapter in the nav
  const navLinks = $$(".nav a[data-nav]");
  if (navLinks.length && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        navLinks.forEach((a) => a.setAttribute("aria-current", String(a.dataset.nav === en.target.id)));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    navLinks.forEach((a) => { const s = document.getElementById(a.dataset.nav); if (s) io.observe(s); });
  }

  /* ---------- mobile menu ---------- */
  const menuBtn = $(".menu-btn"), menu = $("#mobile-menu");
  function openMenu() {
    if (!menu) return;
    menu.classList.add("is-open"); menu.setAttribute("aria-hidden", "false");
    menuBtn.setAttribute("aria-expanded", "true"); menuBtn.setAttribute("aria-label", menuBtn.dataset.labelClose);
    document.body.style.overflow = "hidden"; lenis?.stop();
    setTimeout(() => menu.querySelector("a")?.focus(), 50);
  }
  function closeMenu() {
    if (!menu || !menu.classList.contains("is-open")) return;
    menu.classList.remove("is-open"); menu.setAttribute("aria-hidden", "true");
    menuBtn.setAttribute("aria-expanded", "false"); menuBtn.setAttribute("aria-label", menuBtn.dataset.labelOpen);
    document.body.style.overflow = ""; lenis?.start();
  }
  menuBtn?.addEventListener("click", () => (menu.classList.contains("is-open") ? closeMenu() : openMenu()));
  menu?.addEventListener("click", (e) => { if (e.target.closest("a")) closeMenu(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menu?.classList.contains("is-open")) { closeMenu(); menuBtn.focus(); }
    if (e.key === "Tab" && menu?.classList.contains("is-open")) {
      const f = [menuBtn, ...$$("a, button", menu)].filter((el) => !el.hidden && el.offsetParent !== null);
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  });
  window.addEventListener("resize", () => { if (window.innerWidth > 1080) closeMenu(); });

  /* ---------- hero: live route network ---------- */
  function heroNetwork(canvas) {
    const ctx = canvas.getContext("2d");
    const C = { line: "rgba(74,80,87,.55)", lineHot: "rgba(171,177,183,.9)", node: "#4A5057", signal: "#C5F03C", bg: "#131517" };
    let W = 0, H = 0, dpr = 1, routes = [], pulses = [], mouse = { x: -9999, y: -9999, px: 0, py: 0 }, raf = 0, visible = true, scrollShift = 0;
    const DIRS = [[1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1], [1, 1]];
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

    function build() {
      const rect = canvas.getBoundingClientRect();
      W = rect.width; H = rect.height; dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed = 7; routes = []; pulses = [];
      const cell = W < 760 ? 34 : 46;
      const count = W < 760 ? 6 : 10;
      for (let r = 0; r < count; r++) {
        const fromLeft = r % 2 === 0;
        let x = fromLeft ? -cell : W + cell;
        let y = Math.round((0.12 + rnd() * 0.76) * H / cell) * cell;
        let dir = fromLeft ? 0 : 4;
        const pts = [[x, y]], stations = [];
        const steps = 20 + Math.floor(rnd() * 14);
        for (let s = 0; s < steps; s++) {
          if (rnd() < 0.3) {
            const turn = rnd() < 0.5 ? 1 : -1;
            const nd = (dir + turn + 8) % 8;
            const ny = y + DIRS[nd][1] * cell;
            if (ny > H * 0.06 && ny < H * 0.94) dir = nd;
          }
          if (DIRS[dir][1] !== 0 && rnd() < 0.55) dir = fromLeft ? 0 : 4;
          const len = 1 + Math.floor(rnd() * 3);
          x += DIRS[dir][0] * cell * len; y += DIRS[dir][1] * cell * len;
          y = Math.max(H * 0.05, Math.min(H * 0.95, y));
          pts.push([x, y]);
          if (rnd() < 0.32 && x > 0 && x < W) stations.push(pts.length - 1);
          if (x < -cell * 2 || x > W + cell * 2) break;
        }
        const lens = [0];
        for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
        routes.push({ pts, lens, total: lens[lens.length - 1], stations, signal: r === 2 || r === 5 });
      }
      routes.forEach((rt, i) => {
        const n = rt.signal ? 3 : 1;
        for (let k = 0; k < n; k++) pulses.push({ r: i, d: rnd() * rt.total, v: (rt.signal ? 90 : 55) + rnd() * 40 });
      });
    }
    function at(rt, d) {
      d = ((d % rt.total) + rt.total) % rt.total;
      let i = 1; while (i < rt.lens.length && rt.lens[i] < d) i++;
      const a = rt.pts[i - 1], b = rt.pts[i] || a, seg = (rt.lens[i] - rt.lens[i - 1]) || 1, t = (d - rt.lens[i - 1]) / seg;
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    }
    function path(pts) {
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      // rounded corners like a transit map
      for (let i = 1; i < pts.length - 1; i++) ctx.arcTo(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 14);
      const last = pts[pts.length - 1]; ctx.lineTo(last[0], last[1]);
    }
    let lastT = 0;
    function frame(t) {
      const dt = Math.min(0.05, (t - lastT) / 1000 || 0); lastT = t;
      mouse.px += ((mouse.x > -999 ? (mouse.x / W - 0.5) * -14 : 0) - mouse.px) * 0.06;
      mouse.py += ((mouse.y > -999 ? (mouse.y / H - 0.5) * -10 : 0) - mouse.py) * 0.06;
      ctx.clearRect(0, 0, W, H);
      ctx.save(); ctx.translate(mouse.px, mouse.py + scrollShift);
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      routes.forEach((rt) => {
        path(rt.pts); ctx.strokeStyle = rt.signal ? "rgba(197,240,60,.22)" : C.line; ctx.lineWidth = rt.signal ? 2.5 : 2; ctx.stroke();
      });
      // stations, lit near the pointer
      routes.forEach((rt) => rt.stations.forEach((si) => {
        const [x, y] = rt.pts[si];
        const near = Math.max(0, 1 - Math.hypot(x + mouse.px - mouse.x, y + mouse.py + scrollShift - mouse.y) / 180);
        ctx.beginPath(); ctx.arc(x, y, 5 + near * 3, 0, Math.PI * 2);
        ctx.fillStyle = C.bg; ctx.fill();
        ctx.lineWidth = 2.5; ctx.strokeStyle = near > 0.05 ? `rgba(197,240,60,${0.35 + near * 0.65})` : C.lineHot; ctx.stroke();
        if (near > 0.2) { ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fillStyle = C.signal; ctx.fill(); }
      }));
      // pulses: short bright segments travelling along the routes
      pulses.forEach((p) => {
        const rt = routes[p.r];
        if (dt) p.d += p.v * dt;
        const len = rt.signal ? 70 : 40;
        ctx.beginPath();
        for (let k = 0; k <= 8; k++) { const [x, y] = at(rt, p.d - (len * k) / 8); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.strokeStyle = rt.signal ? C.signal : "rgba(236,234,228,.55)"; ctx.lineWidth = rt.signal ? 3 : 2; ctx.stroke();
        const [hx, hy] = at(rt, p.d);
        ctx.beginPath(); ctx.arc(hx, hy, rt.signal ? 3.5 : 2.5, 0, Math.PI * 2); ctx.fillStyle = rt.signal ? C.signal : C.lineHot; ctx.fill();
      });
      ctx.restore();
      if (motion && visible) raf = requestAnimationFrame(frame);
    }
    build(); frame(0);
    if (!motion) return;
    raf = requestAnimationFrame(frame);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting && !document.hidden; cancelAnimationFrame(raf); if (visible) raf = requestAnimationFrame(frame); });
    io.observe(canvas);
    document.addEventListener("visibilitychange", () => { visible = !document.hidden; cancelAnimationFrame(raf); if (visible) raf = requestAnimationFrame(frame); });
    let rt; window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(build, 150); });
    if (window.matchMedia("(pointer: fine)").matches) {
      const sec = canvas.parentElement;
      sec.addEventListener("pointermove", (e) => { const r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
      sec.addEventListener("pointerleave", () => { mouse.x = mouse.y = -9999; });
    }
    ScrollTrigger.create({ trigger: sec(), start: "top top", end: "bottom top", onUpdate: (s) => { scrollShift = s.progress * 120; } });
    function sec() { return canvas.closest("section"); }
  }

  /* ---------- problem: the tangle that straightens ---------- */
  function tangle(canvas) {
    const ctx = canvas.getContext("2d");
    let W = 0, H = 0, progress = 0, raf = 0, visible = false;
    const N = 16;
    let s = 11; const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
    const knots = Array.from({ length: N }, (_, i) => ({ x: 0.1 + rnd() * 0.8, y: 0.1 + rnd() * 0.8, ph: rnd() * 6.28, sp: 0.4 + rnd() * 0.6 }));
    knots[0].x = 0.04; knots[N - 1].x = 0.96;
    function size() {
      const r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height; canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    function draw(time) {
      const k = ease(Math.min(1, Math.max(0, (progress - 0.35) / 0.6)));
      const wob = (1 - k) * 0.018;
      const pts = knots.map((p, i) => {
        const sx = isRTL ? 1 - (0.06 + (0.88 * i) / (N - 1)) : 0.06 + (0.88 * i) / (N - 1);
        const tx = p.x + Math.sin(time * 0.0006 * p.sp + p.ph) * wob, ty = p.y + Math.cos(time * 0.0005 * p.sp + p.ph) * wob;
        return [(tx + (sx - tx) * k) * W, (ty + (0.5 - ty) * k) * H];
      });
      ctx.clearRect(0, 0, W, H);
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
        ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
      }
      const c0 = [142, 149, 156], c1 = [197, 240, 60];
      const c = c0.map((v, i) => Math.round(v + (c1[i] - v) * k));
      ctx.strokeStyle = `rgb(${c.join(",")})`; ctx.lineWidth = 3; ctx.stroke();
      [pts[0], pts[N - 1]].forEach(([x, y], i) => {
        ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fillStyle = "#131517"; ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = i && k > 0.98 ? "#C5F03C" : "#ECEAE4"; ctx.stroke();
        if (i && k > 0.98) { ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fillStyle = "#C5F03C"; ctx.fill(); }
      });
      if (motion && visible) raf = requestAnimationFrame(draw);
    }
    size(); draw(0);
    window.addEventListener("resize", () => { size(); draw(performance.now()); });
    if (!motion) return;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; cancelAnimationFrame(raf); if (visible) raf = requestAnimationFrame(draw); });
    io.observe(canvas);
    ScrollTrigger.create({ trigger: "#problem", start: "top 60%", end: "bottom 70%", onUpdate: (st) => { progress = st.progress; } });
  }

  /* ---------- motion ---------- */
  function countUp(el, to, dur = 1.6) {
    const o = { v: 0 };
    gsap.to(o, { v: to, duration: dur, ease: "power3.out", onUpdate: () => { el.textContent = Math.round(o.v); } });
  }

  function initMotion() {
    gsap.registerPlugin(ScrollTrigger);
    const page = document.body.dataset.page;

    if (page === "home") {
      // hero entrance: one orchestrated moment
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
      tl.from(".hero h1 .line > span", { yPercent: 110, duration: 1.3, stagger: 0.12 })
        .from(".hero-canvas", { opacity: 0, duration: 1.6, ease: "power2.out" }, 0)
        .from("[data-hero-fade]", { y: 24, opacity: 0, duration: 1, stagger: 0.08 }, 0.45)
        .from(".years-chip", { y: -16, opacity: 0, duration: 0.9 }, 0.7)
        .add(() => { const b = $(".years-chip b"); if (b) countUp(b, +b.dataset.countTo, 1.4); }, 0.7);
      gsap.to(".hero .wrap", { yPercent: -10, opacity: 0.2, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });

      // problem statements come into focus one by one
      $$(".problem-item").forEach((li) => {
        ScrollTrigger.create({ trigger: li, start: "top 62%", end: "bottom 38%", toggleClass: "is-active" });
      });

      // approach: a route that draws through four stations
      const stage = $("[data-route-stage]"), stepsWrap = $("[data-steps]"), steps = $$(".step");
      const setRoute = (p) => {
        stepsWrap.style.setProperty("--p", p.toFixed(4));
        steps.forEach((s, i) => s.classList.toggle("is-on", p >= (i / (steps.length - 1)) * 0.9 - 0.001 || (i === 0 && p > 0.02)));
      };
      ScrollTrigger.matchMedia({
        "(min-width: 761px)": () => {
          const st = ScrollTrigger.create({ trigger: stage, start: "top top", end: "+=180%", pin: true, scrub: 0.6, onUpdate: (s) => setRoute(s.progress) });
          return () => st.kill();
        },
        "(max-width: 760px)": () => {
          const st = ScrollTrigger.create({ trigger: stepsWrap, start: "top 70%", end: "bottom 65%", scrub: 0.4, onUpdate: (s) => setRoute(s.progress) });
          return () => st.kill();
        },
      });

      // services: the signal line runs along each row as it arrives
      $$(".svc").forEach((li) => ScrollTrigger.create({ trigger: li, start: "top 80%", once: true, onEnter: () => li.classList.add("is-seen") }));

      // why: the paper chapter opens like a panel, then the number counts
      const why = $("[data-why]");
      if (why) {
        gsap.fromTo(why, { clipPath: "inset(0% 5% 0% 5% round 28px)" }, { clipPath: "inset(0% 0% 0% 0% round 0px)", ease: "none", scrollTrigger: { trigger: why, start: "top bottom", end: "top 25%", scrub: true } });
        const num = $(".big-num [data-count-to]", why);
        if (num) ScrollTrigger.create({ trigger: num, start: "top 80%", once: true, onEnter: () => countUp(num, +num.dataset.countTo, 1.8) });
        gsap.from(".why-cell", { y: 30, opacity: 0, duration: 0.9, ease: "power3.out", stagger: 0.07, scrollTrigger: { trigger: ".why-grid", start: "top 80%", once: true } });
      }

      // who: each track draws its route
      $$(".track").forEach((tr) => {
        const live = $("[data-draw]", tr);
        if (live) gsap.to(live, { strokeDashoffset: 0, ease: "none", scrollTrigger: { trigger: tr, start: "top 85%", end: "top 45%", scrub: 0.6 } });
        const end = $("circle.end", tr);
        if (end) gsap.from(end, { scale: 0, transformOrigin: "50% 50%", duration: 0.6, ease: "back.out(3)", scrollTrigger: { trigger: tr, start: "top 50%", once: true } });
      });

      // final: routes converge on one station
      const fin = $("[data-final-section]");
      if (fin) gsap.to($$("[data-final]", fin), { strokeDashoffset: 0, ease: "none", stagger: 0.04, scrollTrigger: { trigger: fin, start: "top 80%", end: "center 55%", scrub: 0.8 } });
    } else {
      gsap.from(".page-hero .wrap > *", { y: 24, opacity: 0, duration: 1, ease: "expo.out", stagger: 0.08 });
    }

    // magnetic primary buttons (pointer only)
    if (window.matchMedia("(pointer: fine)").matches) {
      $$(".btn").forEach((b) => {
        const xTo = gsap.quickTo(b, "x", { duration: 0.5, ease: "power3.out" }), yTo = gsap.quickTo(b, "y", { duration: 0.5, ease: "power3.out" });
        b.addEventListener("pointermove", (e) => { const r = b.getBoundingClientRect(); xTo((e.clientX - r.left - r.width / 2) * 0.18); yTo((e.clientY - r.top - r.height / 2) * 0.3); });
        b.addEventListener("pointerleave", () => { xTo(0); yTo(0); });
      });
    }
    window.addEventListener("load", () => ScrollTrigger.refresh());
    if (document.fonts?.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
  }

  function initStatic() {
    $$(".problem-item").forEach((li) => li.classList.add("is-active"));
    $$(".step").forEach((s) => s.classList.add("is-on"));
    $("[data-steps]")?.style.setProperty("--p", "1");
    $$(".svc").forEach((li) => li.classList.add("is-seen"));
    $$("[data-draw], [data-final]").forEach((p) => p.setAttribute("stroke-dashoffset", "0"));
  }

  const heroCanvas = $("[data-hero-canvas]");
  const tangleCanvas = $("[data-tangle]");
  if (motion) initMotion(); else initStatic();
  if (heroCanvas) heroNetwork(heroCanvas);
  if (tangleCanvas) tangle(tangleCanvas);

  // keep layout math right when the viewport class flips (rotate / resize across the breakpoint)
  mqMobile.addEventListener?.("change", () => motion && ScrollTrigger.refresh());

  window.SOTA = { contact, waLink, I18N, scrollToTarget };
})();
