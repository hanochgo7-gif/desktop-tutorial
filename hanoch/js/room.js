/* דף הבית: חדר ההקרנה (css/room.css).
   שש מסכים תלויים בשורה: ש. גוטובסקי, אלנביס, רותם גוטובסקי, בר ליפשיץ, AMS, ומסך ריק "שלכם".
   המצלמה זזה לפי הגלילה בלבד (בלי טיימר): הפתיחה, מבט על השורה, ואז נכנסים למסך של כל לקוח.
   כשהפרק של הלקוח עולה מלמטה, הוא מונח בדיוק על המסך (מטריצה של CSS מארבע הפינות), וגדל עם המצלמה עד שהוא העמוד.
   אחרי הפרק החדר נגלה שוב מתחתיו, והמצלמה ממשיכה למסך הבא.
   שתי רמות ציור, אותה מצלמה ואותה פריסה:
   - CSS: כל מסך הוא תמונה בפרספקטיבה. ברירת המחדל, ובטלפון.
   - WebGL (js/room-gl.js, three.js): אור, השתקפות וערפל אמיתיים. נטען רק כשהפתיחה על המסך, במחשב שעומד בזה,
     ואם הפריימים הראשונים איטיים, חוזרים ל-CSS בלי קפיצה (אותה מצלמה).
   בלי html.cine (פחות תנועה, חיסכון בנתונים, בלי JS) הקובץ לא עושה כלום, והעמוד נשאר בגרסה הסטטית.
   מכריחים רמה (בבדיקות): localStorage hg-tier = gl / css / still. */
(function () {
  'use strict';
  var d = document, root = d.documentElement, room = d.getElementById('room');
  if (!room || !root.classList.contains('cine')) return;

  var forced = '';
  try { forced = localStorage.getItem('hg-tier') || ''; } catch (e) {}
  var fine = matchMedia('(pointer: fine)').matches;
  var hero = d.getElementById('hero'), intro = d.getElementById('work'), contact = d.getElementById('contact'), globe = d.querySelector('.globe-wrap');
  var chEls = ['w-gotovski', 'w-allenbis', 'w-clinic', 'w-chef', 'w-ams'].map(function (id) { return d.getElementById(id); });
  var scrs = [].slice.call(room.querySelectorAll('.rm-scr'));
  var tagEls = [].slice.call(room.querySelectorAll('.rm-tag'));
  var tagState = room.querySelector('.tg-state'), stateWhat = tagState.querySelector('i');
  var pauseBtn = hero.querySelector('.hx-pause');
  var spill = room.querySelector('.rm-spill'), floor = room.querySelector('.rm-floor'), pool = room.querySelector('.rm-pool');
  if (!hero || !intro || !contact || chEls.some(function (c) { return !c; })) return;

  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var smooth = function (a, b, t) { var x = clamp((t - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
  var ease = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var R = Math.PI / 180;

  /* ---------- השורה ---------- */
  var N = 6, Z = [0, -.35, .2, -.25, .1, -.1], YAW = [0, .05, -.04, .06, -.03, .03];
  var FOV = 34, TAN = Math.tan(FOV * R / 2);
  var vw = 1, vh = 1, portrait = false, W = 3.2, H = 2, YC = 1.5, POS = [], SW = 640, SH = 400;

  // המצלמה: על איזה מסך (שבר = בין מסכים), זווית מהצד ומלמעלה, כמה מהגובה המסך תופס, והסטת עדשה
  var SHOTS = {
    land: { hero: { i: 0, th: -34, ph: 3, f: .44, sx: -.46, sy: .04, solo: 1 }, overview: { i: .75, th: -52, ph: 6, f: .3, sx: -.48, sy: -.04, spread: 1 },
      pass: { th: -28, ph: 3, f: .52, sx: -.08, sy: .02 }, out: { th: -12, ph: 2, f: .66, sx: 0, sy: 0 }, contact: { i: 5, th: -30, ph: 4, f: .54, sx: -.44, sy: .02 } },
    port: { hero: { i: 0, th: -24, ph: 3, f: .4, sx: -.06, sy: -.42, solo: 1 }, overview: { i: 1, th: -70, ph: 8, f: .24, sx: -.25, sy: -.32, spread: 1 },
      pass: { th: -22, ph: 3, f: .5, sx: 0, sy: 0 }, out: { th: -10, ph: 2, f: .64, sx: 0, sy: -.05 }, contact: { i: 5, th: -24, ph: 3, f: .22, sx: -.04, sy: .55 } }
  };
  function shotIn(i) { return { i: i, th: 0, ph: 0, f: 1, sx: 0, sy: 0, full: 1 }; }
  function shotWith(base, i) { var o = { i: i }; for (var k in base) if (k !== 'i') o[k] = base[k]; return o; }

  /* ---------- מיקומים מה-DOM (בלי getBoundingClientRect: פרק מונח על מסך הוא מוטה, וזה לא משנה את המקום שלו) ---------- */
  function absTop(el) { var y = 0; while (el) { y += el.offsetTop; el = el.offsetParent; } return y; }
  var CH = [], ANCH = [], cTop = 0, gTop = 0, iTop = 0;
  function at(y, s) { if (ANCH.length && y <= ANCH[ANCH.length - 1].y) y = ANCH[ANCH.length - 1].y + 1; ANCH.push({ y: y, s: s }); }

  function layout() {
    vw = root.clientWidth; vh = innerHeight;
    var a = vw / vh; portrait = a < 1;
    if (portrait) { H = 3.3; W = H * clamp(a, .42, .8); YC = .45 + H / 2; }
    else { H = 2; W = H * clamp(a, 1.25, 2.1); YC = .5 + H / 2; }
    var gap = portrait ? 1.7 : 2.7;
    for (var i = 0; i < N; i++) POS[i] = { x: i * (W + gap), y: YC, z: Z[i] };
    SW = portrait ? 300 : 640; SH = Math.round(SW * H / W);
    scrs.concat(refs).forEach(function (el) { el.style.width = SW + 'px'; el.style.height = SH + 'px'; });

    var S = portrait ? SHOTS.port : SHOTS.land;
    CH = chEls.map(function (el) { return { el: el, top: absTop(el), h: el.offsetHeight, w: el.offsetWidth, st: '' }; });
    cTop = absTop(contact); gTop = absTop(globe);
    ANCH = [];
    var iT = iTop = absTop(intro);
    at(0, S.hero); at(vh * .3, S.hero);
    at(iT + vh * .1, S.overview); at(CH[0].top - vh, S.overview);
    CH.forEach(function (c, i) {
      if (i > 0) at(c.top - vh, shotWith(S.pass, i));
      at(c.top, shotIn(i)); at(c.top + c.h - vh, shotIn(i));
      if (i < 4) at(c.top + c.h, shotWith(S.out, i + .15));
    });
    at(cTop - vh, shotWith(S.pass, 4.75));
    at(cTop, S.contact); at(cTop + vh * 4, S.contact);
    if (gl) gl.resize(geom());
    dirty = true;
  }
  function geom() { return { vw: vw, vh: vh, portrait: portrait, W: W, H: H, YC: YC, POS: POS, YAW: YAW, FOV: FOV }; }

  /* ---------- מצלמה ---------- */
  var cam = { p: [0, 0, 0], t: [0, 0, 0], f: [0, 0, 1], r: [1, 0, 0], u: [0, 1, 0], sx: 0, sy: 0, d: 5, i: 0, spread: 0, full: 0 };
  var par = { x: 0, y: 0, tx: 0, ty: 0 };
  function center(i) {
    var a = Math.floor(clamp(i, 0, N - 1)), b = Math.min(N - 1, a + 1), k = clamp(i, 0, N - 1) - a;
    return [lerp(POS[a].x, POS[b].x, k), lerp(POS[a].y, POS[b].y, k), lerp(POS[a].z, POS[b].z, k), lerp(YAW[a], YAW[b], k)];
  }
  function dist(f) { return (H / f) / (2 * TAN); }
  function place(A, B, t) {
    t = ease(t);
    var i = lerp(A.i, B.i, t), c = center(i);
    var th = lerp(A.th, B.th, t), ph = lerp(A.ph, B.ph, t), dd = lerp(dist(A.f), dist(B.f), t);
    var hop = Math.abs(B.i - A.i);
    if (hop > .5 && !(A.full && B.full)) dd += Math.sin(Math.PI * t) * Math.min(hop, 2) * (portrait ? 1.6 : 1.3);
    var full = Math.max(A.full ? 1 - t : 0, B.full ? t : 0);
    th += par.x * 2.4 * (1 - full); ph += par.y * 1.5 * (1 - full);
    var a = c[3] + th * R, p = ph * R;
    cam.t = [c[0], c[1], c[2]];
    cam.p = [c[0] + Math.sin(a) * Math.cos(p) * dd, c[1] + Math.sin(p) * dd, c[2] + Math.cos(a) * Math.cos(p) * dd];
    var f = norm(sub(cam.t, cam.p)), r = norm(cross(f, [0, 1, 0])), u = cross(r, f);
    cam.f = f; cam.r = r; cam.u = u;
    cam.sx = lerp(A.sx, B.sx, t); cam.sy = lerp(A.sy, B.sy, t); cam.d = dd; cam.i = i;
    cam.spread = lerp(A.spread || 0, B.spread || 0, t); cam.solo = lerp(A.solo || 0, B.solo || 0, t); cam.full = full;
  }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function norm(a) { var l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
  // נקודה בעולם -> פיקסל על המסך (אותה הקרנה כמו ב-three.js, כולל הסטת העדשה)
  function proj(x, y, z) {
    var v = [x - cam.p[0], y - cam.p[1], z - cam.p[2]];
    var depth = dot(v, cam.f);
    if (depth < .05) return null;
    var nx = dot(v, cam.r) / (depth * TAN * (vw / vh)) + cam.sx, ny = dot(v, cam.u) / (depth * TAN) + cam.sy;
    return { x: (nx + 1) / 2 * vw, y: (1 - ny) / 2 * vh, z: depth };
  }
  function local(i, lx, ly, mirror) {
    var s = POS[i], c = Math.cos(YAW[i]), n = Math.sin(YAW[i]);
    return proj(s.x + lx * c, mirror ? -(s.y + ly) : s.y + ly, s.z - lx * n);
  }
  function quad(i, mirror) {
    var q = mirror ? [local(i, -W / 2, -H / 2, 1), local(i, W / 2, -H / 2, 1), local(i, W / 2, H / 2, 1), local(i, -W / 2, H / 2, 1)]
                   : [local(i, -W / 2, H / 2), local(i, W / 2, H / 2), local(i, W / 2, -H / 2), local(i, -W / 2, -H / 2)];
    return q[0] && q[1] && q[2] && q[3] ? q : null;
  }
  // matrix3d שממפה מלבן ew x eh (שראשו ב-ox,oy על המסך) אל ארבע פינות
  function homo(q, ew, eh, ox, oy) {
    var x0 = q[0].x - ox, y0 = q[0].y - oy, x1 = q[1].x - ox, y1 = q[1].y - oy, x2 = q[2].x - ox, y2 = q[2].y - oy, x3 = q[3].x - ox, y3 = q[3].y - oy;
    var dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3, dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
    var g = 0, h = 0, det = dx1 * dy2 - dx2 * dy1;
    if (Math.abs(det) > 1e-9) { g = (dx3 * dy2 - dx2 * dy3) / det; h = (dx1 * dy3 - dx3 * dy1) / det; }
    var a = (x1 - x0 + g * x1) / ew, b = (x3 - x0 + h * x3) / eh, dd = (y1 - y0 + g * y1) / ew, e = (y3 - y0 + h * y3) / eh;
    g /= ew; h /= eh;
    return 'matrix3d(' + [a, dd, 0, g, b, e, 0, h, 0, 0, 1, 0, x0, y0, 0, 1].map(function (v) { return +v.toFixed(6); }).join(',') + ')';
  }

  /* ---------- השתקפויות (רק בעכבר: בטלפון חוסכים שכבות) ---------- */
  var refs = [];
  if (fine) scrs.forEach(function (el) {
    var c = el.cloneNode(true); c.className = 'rm-ref'; c.removeAttribute('data-i');
    el.parentNode.insertBefore(c, el.parentNode.firstChild); refs.push(c);
  });
  var refOf = function (i) { return refs[i] || null; };

  /* ---------- תמונות: רק כשהחדר רץ. קודם המסך של הפתיחה, ושאר השורה אחרי שהעמוד נטען ---------- */
  function imgs(i) { return [].slice.call(scrs[i].querySelectorAll('img')).concat(refOf(i) ? [].slice.call(refOf(i).querySelectorAll('img')) : []); }
  function src(img) { return portrait ? img.dataset.p : img.dataset.l; }
  function load(i) {
    return Promise.all(imgs(i).map(function (img) {
      var u = src(img);
      if (img.getAttribute('src') !== u) img.src = u;
      return img.decode ? img.decode().catch(function () {}) : Promise.resolve();
    }));
  }

  /* ---------- הקו: בונה את האתר של ש. גוטובסקי מחדש ---------- */
  var sw = { phase: 'wait', t0: 0, s: 0, line: 0, reset: 0, paused: false, parked: false, label: 'old' };
  var DUR = { wait: 1.2, sweep: 2.6, hold: 3.6, reset: .9 };
  function label(w) {
    if (sw.label === w) return; sw.label = w;
    stateWhat.style.opacity = 0;
    setTimeout(function () { stateWhat.textContent = w === 'new' ? 'האתר החדש' : 'האתר הקודם'; stateWhat.style.opacity = 1; }, 180);
  }
  function sweepTick(now, active) {
    var el = (now - sw.t0) / 1000, moving = true;
    if (!active || sw.paused) {
      sw.s += (1 - sw.s) * .14; sw.reset *= .82; sw.line *= .82;
      moving = Math.abs(1 - sw.s) > .002 || sw.line > .003 || sw.reset > .003;
      if (!moving) { sw.s = 1; sw.reset = 0; sw.line = 0; }
      if (sw.s > .97) label('new');
      sw.parked = true;
    } else {
      if (sw.parked) { sw.parked = false; sw.phase = 'hold'; sw.t0 = now; el = 0; }
      if (sw.phase === 'wait') {
        sw.s = 0; sw.reset = 0; sw.line = smooth(.2, 1, el / DUR.wait); label('old');
        if (el > DUR.wait) { sw.phase = 'sweep'; sw.t0 = now; }
      } else if (sw.phase === 'sweep') {
        var k = Math.min(1, el / DUR.sweep); sw.s = .5 - Math.cos(Math.PI * k) / 2; sw.line = 1;
        if (k >= 1) { sw.phase = 'hold'; sw.t0 = now; label('new'); }
      } else if (sw.phase === 'hold') {
        sw.s = 1; sw.line = 1 - smooth(0, .7, el); moving = el < .8;
        if (el > DUR.hold) { sw.phase = 'reset'; sw.t0 = now; moving = true; }
      } else {
        sw.reset = smooth(0, 1, el / DUR.reset); sw.line = 0;
        if (el > DUR.reset * .5) label('old');
        if (el > DUR.reset) { sw.phase = 'wait'; sw.t0 = now; sw.s = 0; sw.reset = 0; }
      }
    }
    return moving;
  }
  var yo = { v: 0, on: 0 };

  /* ---------- ציור ב-CSS ---------- */
  var cache = new Map();
  function setT(el, tf) { if (cache.get(el) !== tf) { el.style.transform = tf; cache.set(el, tf); } }
  function setO(el, o) { o = Math.round(o * 1000) / 1000; if (el._o !== o) { el.style.opacity = o; el._o = o; } }
  function setV(el, v) { if (el._v !== v) { el.style.visibility = v ? 'visible' : 'hidden'; el._v = v; } }
  // המסך שבמרכז מואר, השאר מחכים בצל
  // בפתיחה רק המסך של ש. גוטובסקי דולק, כדי שהשאר לא יעמדו מאחורי הכותרת; הם נדלקים כשהמצלמה נסוגה
  function litOf(i) { var di = i - cam.i, k = lerp(.9, .06, cam.spread), r = lerp(.36, 1, Math.exp(-di * di * k)); return Math.abs(di) < .5 ? r : lerp(r, .07, cam.solo || 0); }
  function dims(i) {
    // ורחוק יותר = יותר ערפל
    var lit = litOf(i);
    var c = POS[i], depth = dot([c.x - cam.p[0], c.y - cam.p[1], c.z - cam.p[2]], cam.f);
    var fog = smooth(cam.d + 1.5, cam.d + 24, depth) * .9;
    return 1 - lit * (1 - fog);
  }
  function drawCSS() {
    for (var i = 0; i < N; i++) {
      var el = scrs[i], q = quad(i);
      if (!q) { setV(el, false); if (refOf(i)) setV(refOf(i), false); continue; }
      setV(el, true); setT(el, homo(q, SW, SH, 0, 0));
      setO(el.querySelector('.rm-dim'), dims(i));
      var r = refOf(i);
      if (r) { var qr = quad(i, true); if (qr) { setV(r, true); setT(r, homo(qr, SW, SH, 0, 0)); setO(r, .3 * Math.min(1, litOf(i) / .36)); } else setV(r, false); }
    }
    // הקו על המסך הראשון (והשתקפותו)
    [scrs[0], refOf(0)].forEach(function (el) {
      if (!el) return;
      var rev = el.querySelector('.rm-rev'), ln = el.querySelector('.rm-line');
      var cp = 'inset(0 0 ' + ((1 - sw.s) * 100).toFixed(2) + '% 0)';
      if (rev._cp !== cp) { rev.style.clipPath = cp; rev._cp = cp; }
      setO(rev, 1 - sw.reset);
      if (ln) { setT(ln, 'translate3d(0,' + (sw.s * SH).toFixed(1) + 'px,0)'); setO(ln, sw.line); }
    });
    var y5 = scrs[5], g5 = y5.querySelector('.rm-grid'), l5 = y5.querySelector('.rm-line'), ys = .5 - Math.cos(Math.PI * yo.v) / 2;
    var cp = 'inset(0 0 ' + ((1 - ys) * 100).toFixed(2) + '% 0)';
    if (g5._cp !== cp) { g5.style.clipPath = cp; g5._cp = cp; }
    setT(l5, 'translate3d(0,' + (ys * SH).toFixed(1) + 'px,0)'); setO(l5, yo.on * (1 - smooth(.85, 1, yo.v)));
    // רצפה, שלולית האור מתחת למסך שבמרכז, והאור על הקיר
    var c = center(cam.i);
    var hz = proj(cam.p[0] + cam.f[0] * 400, 0, cam.p[2] + cam.f[2] * 400);
    setT(floor, 'translate3d(0,' + (hz ? clamp(hz.y, -vh, vh * 2) : vh).toFixed(1) + 'px,0)');
    var pl = proj(c[0], 0, c[2] + .9);
    if (pl) setT(pool, 'translate3d(' + pl.x.toFixed(1) + 'px,' + pl.y.toFixed(1) + 'px,0)');
    var wl = proj(c[0] - 1.5, YC + .8, c[2] - 6);
    if (wl) setT(spill, 'translate3d(' + wl.x.toFixed(1) + 'px,' + wl.y.toFixed(1) + 'px,0)');
  }

  /* ---------- תוויות: שם כל לקוח מתחת למסך שלו, בגופן שלו; "שלכם" בתוך המסך הריק; והמצב של הפתיחה ---------- */
  var introIn = intro.querySelector('.intro-in');
  function drawTags(y) {
    // הכותרת של הפתיח מפנה את המקום רגע לפני שנכנסים למסך הראשון
    setO(introIn, 1 - smooth(CH[0].top - vh * 1.2, CH[0].top - vh * .92, y));
    var tagO = smooth(iTop - vh * .2, iTop + vh * .2, y) * (1 - smooth(CH[0].top - vh * 1.1, CH[0].top - vh * .6, y));
    for (var i = 0; i < 5; i++) {
      var T = tagEls[i];
      if (tagO > 0) { var p = local(i, -W / 2, -H / 2 - .14); if (p) setT(T, 'translate3d(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px,0)'); }
      setO(T, tagO);
    }
    var yT = tagEls[5], o5 = smooth(cTop - vh * .3, cTop, y);
    if (o5 > 0) { var c5 = local(5, 0, 0); if (c5) setT(yT, 'translate3d(' + c5.x.toFixed(1) + 'px,' + c5.y.toFixed(1) + 'px,0) translate(-50%,-50%)'); }
    setO(yT, o5);
    var oS = 1 - smooth(vh * .15, vh * .5, y);
    if (oS > 0) { var s0 = local(0, W / 2, -H / 2 - (portrait ? .1 : .16)); if (s0) setT(tagState, 'translate3d(' + s0.x.toFixed(1) + 'px,' + s0.y.toFixed(1) + 'px,0) translateX(-100%)'); }
    setO(tagState, oS);
  }

  /* ---------- הפרקים: מונחים על המסך בזמן שהם עולים, ואחר כך הם העמוד ---------- */
  function drawChapters(y) {
    var covered = false;
    CH.forEach(function (c, i) {
      var top = c.top - y, el = c.el;
      if (top > 0 && top < vh) {
        var q = quad(i), t = 1 - top / vh;
        var st = 'm';
        if (c.st !== st) { el.classList.add('is-mapped'); c.st = st; }
        if (q) {
          setT(el, homo(q, c.w, vh, 0, top));
          var cp = 'inset(0 0 ' + Math.max(0, c.h - vh) + 'px 0)';
          if (el._cp !== cp) { el.style.clipPath = cp; el._cp = cp; }
          setO(el, smooth(.12, .55, t));
        } else setO(el, 0);
      } else if (c.st) {
        el.classList.remove('is-mapped'); el.style.transform = ''; el.style.clipPath = ''; el.style.opacity = '';
        cache.delete(el); el._o = undefined; el._cp = undefined; c.st = '';
      }
      if (top <= 0 && top + c.h >= vh) covered = true;
    });
    if (y >= gTop && y + vh <= cTop) covered = true;
    return covered;
  }

  /* ---------- WebGL (רמה 1) ---------- */
  var gl = null, glFrames = [], glT0 = 0, glTried = false;
  function capable() {
    if (forced === 'gl') return true;
    if (forced === 'css') return false;
    var cores = navigator.hardwareConcurrency || 4, mem = navigator.deviceMemory || 0;
    // טלפון: רק מכשיר חזק במיוחד. מחשב: לפחות 6 ליבות, וזיכרון לא נמוך
    if (!fine && !(mem >= 8 && cores >= 8)) return false;
    if (cores < 6 || (mem && mem < 4) || vw < 900) return false;
    try {
      var c = d.createElement('canvas'), g = c.getContext('webgl2');
      if (!g) return false;
      var ext = g.getExtension('WEBGL_debug_renderer_info'), name = ext ? String(g.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
      var lose = g.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
      if (/swiftshader|llvmpipe|software|basic render|mesa offscreen/i.test(name)) return false;
    } catch (e) { return false; }
    return true;
  }
  function tryGL() {
    if (glTried || stopped) return; glTried = true;
    if (!capable()) return;
    import('/js/room-gl.js').then(function (m) {
      if (stopped) return;
      return m.create(room, geom(), urls()).then(function (g) {
        if (stopped) { g.dispose(); return; }
        gl = g; root.classList.add('gl'); glT0 = 0; glFrames = []; dirty = true;
      });
    }).catch(function () { demote(); });
  }
  function urls() {
    return scrs.map(function (el) {
      var o = el.querySelector('.rm-old'), n = el.querySelector('.rm-new') || el.querySelector('img');
      if (!n) return null;
      return { l: [n.dataset.l, o ? o.dataset.l : null], p: [n.dataset.p, o ? o.dataset.p : null] };
    });
  }
  function demote() {
    if (gl) { try { gl.dispose(); } catch (e) {} gl = null; }
    root.classList.remove('gl'); dirty = true;
  }
  function state() {
    return { cam: cam, sweep: sw, yours: .5 - Math.cos(Math.PI * yo.v) / 2, yoursLine: yo.on * (1 - smooth(.85, 1, yo.v)), lit: POS.map(function (p, i) { return litOf(i); }) };
  }

  /* ---------- הלולאה: מציירים רק כשמשהו זז ---------- */
  var dirty = true, lastY = -1, last = performance.now(), raf = 0, stopped = false, started = false;
  function frame(now) {
    raf = 0; if (stopped) return;
    var dt = Math.min(.05, (now - last) / 1000); last = now;
    var y = scrollY;
    par.x += (par.tx - par.x) * (1 - Math.exp(-dt * 3)); par.y += (par.ty - par.y) * (1 - Math.exp(-dt * 3));
    var parMoving = Math.abs(par.tx - par.x) + Math.abs(par.ty - par.y) > .002;
    var heroActive = y < vh * .75 && !d.hidden && heroSeen;
    var sweeping = sweepTick(now, heroActive);
    var yTarget = y > cTop - vh * .3 ? 1 : 0;
    if (yTarget) { yo.on = 1; yo.v = Math.min(1, yo.v + dt / 2.4); } else { yo.on = 0; yo.v = 0; }
    var yAnim = yTarget && yo.v < 1;
    var moved = y !== lastY; lastY = y;
    if (moved || dirty || sweeping || parMoving || yAnim) {
      var k = 0; while (k < ANCH.length - 2 && y >= ANCH[k + 1].y) k++;
      var A = ANCH[k], B = ANCH[Math.min(k + 1, ANCH.length - 1)];
      place(A.s, B.s, B.y > A.y ? clamp((y - A.y) / (B.y - A.y), 0, 1) : 0);
      var covered = drawChapters(y);
      setV(room, !covered);
      if (!covered) {
        drawTags(y);
        if (gl) {
          var t0 = performance.now();
          gl.render(state());
          if (!glT0) glT0 = now;
          if (now - glT0 < 1500) glFrames.push(dt * 1000);
          else if (glFrames.length && forced !== 'gl') {
            var f = glFrames.slice(2).sort(function (a, b) { return a - b; });
            var med = f[Math.floor(f.length / 2)] || 0, p90 = f[Math.floor(f.length * .9)] || 0;
            glFrames = [];
            if (med > 20 || p90 > 34) { drawCSS(); demote(); }
          }
        } else drawCSS();
      }
      dirty = false;
    }
    if (sweeping || parMoving || yAnim || moved || (gl && (!glT0 || now - glT0 < 1600))) raf = requestAnimationFrame(frame);
  }
  function kick() { dirty = true; if (!raf && !stopped && started) raf = requestAnimationFrame(frame); }
  addEventListener('scroll', function () { if (!raf && started) raf = requestAnimationFrame(frame); }, { passive: true });
  if (fine) addEventListener('pointermove', function (e) { par.tx = e.clientX / innerWidth * 2 - 1; par.ty = e.clientY / innerHeight * 2 - 1; if (!raf && started) raf = requestAnimationFrame(frame); }, { passive: true });

  // הפתיחה לא על המסך: הקו לא רץ
  var heroSeen = true;
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { heroSeen = es[0].isIntersecting; kick(); if (heroSeen && d.readyState === 'complete') later(); }).observe(hero);
  d.addEventListener('visibilitychange', kick);

  /* ---------- השהיה (WCAG 2.2.2) ---------- */
  if (pauseBtn) {
    pauseBtn.hidden = false;
    pauseBtn.addEventListener('click', function () {
      sw.paused = !sw.paused;
      pauseBtn.setAttribute('aria-pressed', String(sw.paused));
      pauseBtn.querySelector('span').textContent = sw.paused ? 'המשך' : 'השהיה';
      pauseBtn.setAttribute('aria-label', sw.paused ? 'המשך ההדגמה' : 'השהיית ההדגמה');
      kick();
    });
  }

  /* ---------- מקלדת: מיקוד בתוך פרק שעוד מונח על מסך -> גוללים כך שהפרק הוא העמוד והאלמנט על המסך ---------- */
  function jump(y) { if (window.hgLenis) window.hgLenis.scrollTo(y, { immediate: true, force: true }); else scrollTo({ top: y, behavior: 'instant' }); }
  d.addEventListener('focusin', function (e) {
    var t = e.target;
    for (var i = 0; i < CH.length; i++) {
      var c = CH[i];
      if (!c.el.contains(t)) continue;
      var off = 0, n = t; while (n && n !== c.el) { off += n.offsetTop; n = n.offsetParent; }
      if (n !== c.el) off = 0;
      var y = clamp(c.top + off - vh * .4, c.top, c.top + Math.max(0, c.h - vh));
      var top = c.top - scrollY, r = t.getBoundingClientRect();
      if (top > 0 || r.top < 64 || r.bottom > vh - 64) jump(y);
      return;
    }
  });

  /* ---------- תפריט הנגישות: "בלי תנועה" באמצע -> חוזרים לגרסה הסטטית ---------- */
  function stop() {
    stopped = true; cancelAnimationFrame(raf); raf = 0; demote();
    CH.forEach(function (c) { c.el.classList.remove('is-mapped'); c.el.style.transform = ''; c.el.style.clipPath = ''; c.el.style.opacity = ''; });
    root.classList.remove('cine', 'room-on', 'gl');
    if (pauseBtn) pauseBtn.hidden = true;
  }
  new MutationObserver(function () { if (root.classList.contains('a11y-no-motion') && !stopped) stop(); }).observe(root, { attributes: true, attributeFilter: ['class'] });

  /* ---------- התחלה ---------- */
  var rt;
  addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { var was = portrait; layout(); if (was !== portrait) { load(0); rest(); } kick(); }, 120); });
  if ('ResizeObserver' in window) {
    var ro = new ResizeObserver(function () { clearTimeout(rt); rt = setTimeout(function () { layout(); kick(); }, 120); });
    ro.observe(d.getElementById('main'));
  }
  function rest() { for (var i = 1; i < N; i++) load(i); }
  var laterDone = false;
  function later() {
    if (laterDone) return; laterDone = true;
    var go = function () { rest(); if (heroSeen) tryGL(); else laterDone = false; };
    if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 2000 }); else setTimeout(go, 600);
  }

  layout();
  load(0).then(function () {
    if (stopped) return;
    started = true; sw.t0 = performance.now();
    root.classList.add('room-on');
    kick();
  });
  if (d.readyState === 'complete') later(); else addEventListener('load', function () { setTimeout(later, 300); });
})();
