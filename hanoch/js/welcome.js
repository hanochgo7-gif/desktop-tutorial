/* פתיחה: "ברוכים הבאים ל-HG Studio", בנוי מאלפי נקודות אור.
   הנקודות יוצאות מנקודה אחת, נאספות לאותיות בכיוון הקריאה, נרתעות מהעכבר (או מהאצבע) ומתפזרות כשגוללים.
   הכותרת האמיתית נשארת בדף בשביל קוראי מסך וגוגל, וגם מי שביקש פחות תנועה רואה אותה כרגיל.
   WebGL 1 בלי ספריות. התנועה מחושבת ב-JS, והכרטיס הגרפי רק מצייר. */
(function () {
  'use strict';
  var root = document.documentElement;
  var hero = document.querySelector('.hw');
  if (!hero) return;
  var canvas = hero.querySelector('.hw-canvas');
  var title = hero.querySelector('.hw-title');
  var lines = [].slice.call(hero.querySelectorAll('.hw-line'));
  var accent = title && title.querySelector('b');
  var RTL = getComputedStyle(hero).direction === 'rtl';
  function still() { hero.classList.add('hw-static', 'hw-in'); }
  if (!root.classList.contains('motion') || !canvas || !title || !lines.length) return still();
  var gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: 'high-performance' });
  if (!gl) return still();

  /* ---------- ציור: כל נקודה היא עיגול רך, בצבע ובגודל שלה ---------- */
  var VS = 'attribute vec2 aPos;attribute float aSize;attribute vec4 aCol;uniform vec2 uRes;varying vec4 vCol;' +
    'void main(){vec2 c=aPos/uRes*2.0-1.0;gl_Position=vec4(c.x,-c.y,0.0,1.0);gl_PointSize=aSize;vCol=aCol;}';
  var FS = 'precision mediump float;varying vec4 vCol;' +
    'void main(){float r=length(gl_PointCoord-0.5);float a=smoothstep(0.5,0.12,r)*vCol.a;if(a<0.01)discard;gl_FragColor=vec4(vCol.rgb*a,a);}';
  function shader(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
  var prog = gl.createProgram();
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return still();
  gl.useProgram(prog);
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  var STRIDE = 7;
  [['aPos', 2, 0], ['aSize', 1, 2], ['aCol', 4, 3]].forEach(function (a) {
    var l = gl.getAttribLocation(prog, a[0]);
    gl.enableVertexAttribArray(l);
    gl.vertexAttribPointer(l, a[1], gl.FLOAT, false, STRIDE * 4, a[2] * 4);
  });
  var uRes = gl.getUniformLocation(prog, 'uRes');
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  var small = window.matchMedia('(max-width: 700px)').matches;
  var fine = window.matchMedia('(pointer: fine)').matches;
  var W = 0, H = 0, dpr = 1, N = 0, D = 0, cx = 0, cy = 0, gap = 4, minX = 0, maxX = 0;
  var hx, hy, px, py, pz, vx, vy, vz, delay, heat, rnd, dir, hot, halo, data;

  /* ---------- דגימה: מציירים את הכותרת בצד, וכל פיקסל מלא הופך לנקודה ---------- */
  function sample() {
    var hr = hero.getBoundingClientRect();
    W = hero.clientWidth; H = hero.clientHeight;
    var off = document.createElement('canvas');
    off.width = W; off.height = H;
    var c = off.getContext('2d');
    c.fillStyle = '#fff';
    var size = 0, top = 1e9, bottom = 0;
    lines.forEach(function (ln) {
      var r = ln.getBoundingClientRect(), cs = getComputedStyle(ln);
      var txt = ln.textContent.replace(/\s+/g, ' ').trim();
      size = parseFloat(cs.fontSize);
      c.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
      c.direction = cs.direction; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
      if (cs.letterSpacing && cs.letterSpacing !== 'normal' && 'letterSpacing' in c) c.letterSpacing = cs.letterSpacing;
      var m = c.measureText(txt);
      c.fillText(txt, r.left - hr.left + r.width / 2, r.top - hr.top + r.height / 2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2);
      top = Math.min(top, r.top - hr.top); bottom = Math.max(bottom, r.bottom - hr.top);
    });
    var ar = accent ? accent.getBoundingClientRect() : null;
    var ax0 = ar ? ar.left - hr.left - 2 : 0, ax1 = ar ? ar.right - hr.left + 2 : 0, ay0 = ar ? ar.top - hr.top : 0, ay1 = ar ? ar.bottom - hr.top : 0;
    var img = c.getImageData(0, 0, W, H).data;
    var cap = small ? 2800 : 9000;
    gap = Math.max(2, Math.round(size / 34));
    var pts;
    for (;;) {
      pts = [];
      for (var y = Math.max(0, Math.floor(top)); y < Math.min(H, bottom + size * .3); y += gap) {
        for (var x = 0; x < W; x += gap) if (img[(y * W + x) * 4 + 3] > 140) pts.push(x, y, (ar && x >= ax0 && x <= ax1 && y >= ay0 && y <= ay1) ? 1 : 0);
      }
      if (pts.length / 3 <= cap) break;
      gap += 1;
    }
    var tr = title.getBoundingClientRect();
    cx = tr.left - hr.left + tr.width / 2; cy = (top + bottom) / 2;
    D = small ? 60 : 220; // אבק דק ברקע
    N = pts.length / 3;
    var T = N + D;
    hx = new Float32Array(T); hy = new Float32Array(T); px = new Float32Array(T); py = new Float32Array(T); pz = new Float32Array(T);
    vx = new Float32Array(T); vy = new Float32Array(T); vz = new Float32Array(T);
    delay = new Float32Array(T); heat = new Float32Array(T); rnd = new Float32Array(T); dir = new Float32Array(T * 3); hot = new Uint8Array(T); halo = new Int32Array(N);
    data = new Float32Array((T + N) * STRIDE); // אחרי הנקודות עצמן: הילה רכה סביב הנקודות הכתומות והחמות
    minX = 1e9; maxX = -1e9;
    for (var i = 0; i < N; i++) {
      hx[i] = pts[i * 3] + (Math.random() - .5) * gap * .35;
      hy[i] = pts[i * 3 + 1] + (Math.random() - .5) * gap * .35;
      hot[i] = pts[i * 3 + 2];
      if (hx[i] < minX) minX = hx[i];
      if (hx[i] > maxX) maxX = hx[i];
    }
    for (i = 0; i < T; i++) {
      rnd[i] = Math.random();
      // כיוון הפיצוץ בגלילה: החוצה מהמרכז, קצת למעלה ואל המצלמה
      var a = Math.random() * Math.PI * 2, b = Math.acos(Math.random() * 2 - 1);
      dir[i * 3] = Math.sin(b) * Math.cos(a) + (i < N ? (hx[i] - cx) / W : 0);
      dir[i * 3 + 1] = Math.sin(b) * Math.sin(a) - .35;
      dir[i * 3 + 2] = -Math.abs(Math.cos(b)) - .3;
    }
    for (i = N; i < T; i++) { hx[i] = px[i] = Math.random() * W; hy[i] = py[i] = Math.random() * H; pz[i] = -900 + Math.random() * 1200; }
    var span = Math.max(1, maxX - minX);
    for (i = 0; i < N; i++) delay[i] = .5 + (RTL ? (maxX - hx[i]) : (hx[i] - minX)) / span * .95 + rnd[i] * .22;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.bufferData(gl.ARRAY_BUFFER, data.byteLength, gl.DYNAMIC_DRAW);
  }

  // הפתיחה: כל הנקודות בנקודה אחת, ומשם פיצוץ לכל הכיוונים
  function burst() {
    for (var i = 0; i < N; i++) {
      px[i] = cx; py[i] = cy; pz[i] = 0;
      var a = Math.random() * Math.PI * 2, b = Math.acos(Math.random() * 2 - 1), s = 700 + Math.random() * 2300;
      // לעומק ולא אל המצלמה: הנקודות נעלמות פנימה, וחוזרות לכיוון הצופה כשהן נאספות
      vx[i] = Math.sin(b) * Math.cos(a) * s; vy[i] = Math.sin(b) * Math.sin(a) * s * .75; vz[i] = Math.abs(Math.cos(b)) * s * .9;
    }
  }
  function settle() { for (var i = 0; i < N; i++) { px[i] = hx[i]; py[i] = hy[i]; pz[i] = 0; vx[i] = vy[i] = vz[i] = 0; } }

  /* ---------- קלט: עכבר, אצבע וגלילה ---------- */
  var mx = -9999, my = -9999, mIn = false, tiltX = 0, tiltY = 0, scrollP = 0, shock = null, lastIn = 0, idleT = 0;
  function poke() { lastIn = performance.now(); wake(); }
  function local(e) { var r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  hero.addEventListener('pointermove', function (e) { var p = local(e); mx = p[0]; my = p[1]; mIn = true; poke(); }, { passive: true });
  hero.addEventListener('pointerleave', function () { mIn = false; mx = my = -9999; poke(); });
  hero.addEventListener('pointerdown', function (e) { var p = local(e); shock = { x: p[0], y: p[1], t: 0 }; poke(); }, { passive: true });
  function onScroll() { scrollP = Math.min(1, Math.max(0, window.scrollY / (H * .85 || 1))); hero.style.setProperty('--hw-p', scrollP.toFixed(3)); }
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- כל פריים: פיזיקה, ואז ציור ---------- */
  var CREAM = [237 / 255, 232 / 255, 222 / 255], SIG = [1, 79 / 255, 26 / 255], HOT = [1, 186 / 255, 120 / 255];
  var t0 = 0, last = 0, raf = 0, visible = true, revealed = false, live = false;
  function frame(now) {
    raf = 0;
    if (!t0) t0 = last = now;
    var dt = Math.min(.033, (now - last) / 1000); last = now;
    var t = (now - t0) / 1000;
    // רבע שנייה ראשונה: כל הנקודות בנקודת אור אחת, ורק אז הפיצוץ
    var hold = t < .28;
    // הטיה עדינה של כל הכותרת אחרי העכבר, ובטלפון נדנוד איטי מעצמו
    var tyT = mIn ? (mx / W - .5) * .5 : Math.sin(t * .35) * .1;
    var txT = mIn ? (my / H - .5) * -.3 : Math.cos(t * .27) * .05;
    tiltY += (tyT - tiltY) * Math.min(1, dt * 3); tiltX += (txT - tiltX) * Math.min(1, dt * 3);
    var cY = Math.cos(tiltY), sY = Math.sin(tiltY), cX = Math.cos(tiltX), sX = Math.sin(tiltX);
    var F = 1100, R = small ? 90 : 140, R2 = R * R;
    var glint = -1e9;
    if (t > 2.6) { var gt = ((t - 2.6) % 7) / 1.2; if (gt < 1) glint = RTL ? maxX + 160 - gt * (maxX - minX + 320) : minX - 160 + gt * (maxX - minX + 320); }
    var ex = scrollP * scrollP * 1500, fade = 1 - Math.pow(scrollP, 1.3);
    if (shock) { shock.t += dt; if (shock.t > .6) shock = null; }
    var decay = Math.exp(-dt * 2.4), base = gap * (small ? 1.3 : 1), j = 0, nh = 0, moving = 0;
    for (var i = 0, T = N + D; i < T; i++) {
      var x, y, z, size, a, col, h = 0, g = 0, rr = rnd[i];
      if (i < N) {
        if (hold) { /* מחכים */ } else if (t > delay[i]) {
          // קפיץ אל הבית, עם ריסון
          vx[i] += ((hx[i] - px[i]) * 62 - vx[i] * 11) * dt;
          vy[i] += ((hy[i] - py[i]) * 62 - vy[i] * 11) * dt;
          vz[i] += ((0 - pz[i]) * 62 - vz[i] * 11) * dt;
        } else {
          var drag = Math.exp(-dt * 2.6); vx[i] *= drag; vy[i] *= drag; vz[i] *= drag;
        }
        var dx = px[i] - mx, dy = py[i] - my, d2 = dx * dx + dy * dy;
        if (d2 < R2 && t > 1.2) {
          var d = Math.sqrt(d2) || 1, f = (1 - d / R); f = f * f * 5600 * dt;
          vx[i] += dx / d * f; vy[i] += dy / d * f; vz[i] -= f * .6;
          if (1 - d / R > heat[i]) heat[i] = 1 - d / R;
        }
        if (shock) {
          var sx = px[i] - shock.x, sy = py[i] - shock.y, sd = Math.sqrt(sx * sx + sy * sy) || 1, ring = shock.t * 900;
          if (Math.abs(sd - ring) < 60) { var k = (1 - Math.abs(sd - ring) / 60) * 2600 * dt; vx[i] += sx / sd * k; vy[i] += sy / sd * k; heat[i] = Math.max(heat[i], .8); }
        }
        heat[i] *= decay;
        if (!hold) { px[i] += vx[i] * dt; py[i] += vy[i] * dt; pz[i] += vz[i] * dt; }
        if (vx[i] * vx[i] + vy[i] * vy[i] > 4 || heat[i] > .02) moving++;
        x = px[i] + Math.sin(t * 1.3 + rr * 40) * .6; y = py[i] + Math.cos(t * 1.1 + rr * 40) * .6; z = pz[i];
        h = heat[i];
        if (glint > -1e8) { var gd = Math.abs(hx[i] - glint); if (gd < 80) g = 1 - gd / 80; }
        col = hot[i] ? SIG : CREAM; size = hold ? base * .7 : base; a = .96;
      } else {
        // אבק: נע לאט, נשאר מאחור
        py[i] -= dt * (6 + rr * 14); if (py[i] < -10) py[i] = H + 10;
        x = px[i] + Math.sin(t * .2 + rr * 30) * 14; y = py[i]; z = pz[i];
        col = CREAM; size = 1.2 + rr * 1.8; a = .1 + rr * .22;
      }
      // פיצוץ בגלילה
      if (ex > 0) { var e = ex * (.45 + rr); x += dir[i * 3] * e; y += dir[i * 3 + 1] * e; z += dir[i * 3 + 2] * e * 1.3; }
      // סיבוב סביב מרכז הכותרת והטלה בפרספקטיבה
      var lx = x - cx, ly = y - cy;
      var x1 = lx * cY + z * sY, z1 = -lx * sY + z * cY;
      var y1 = ly * cX - z1 * sX, z2 = ly * sX + z1 * cX;
      var s = Math.min(2.4, F / Math.max(80, F + z2));
      var r0 = col[0], g0 = col[1], b0 = col[2];
      if (h > .01) { r0 += (HOT[0] - r0) * h; g0 += (HOT[1] - g0) * h; b0 += (HOT[2] - b0) * h; size *= 1 + h * .6; }
      if (g > 0) { r0 += (1 - r0) * g; g0 += (1 - g0) * g; b0 += (1 - b0) * g; size *= 1 + g * .5; }
      a *= fade * Math.min(1, s * s) * (s > 1.5 ? Math.max(.15, 1 - (s - 1.5) * .9) : 1);
      data[j++] = (cx + x1 * s) * dpr; data[j++] = (cy + y1 * s) * dpr;
      data[j++] = Math.max(1, size * s * dpr * 1.35);
      data[j++] = r0; data[j++] = g0; data[j++] = b0; data[j++] = a;
      if (i < N && (hot[i] || h > .15 || g > .3) && (!small || g > .3)) halo[nh++] = j - STRIDE;
    }
    // הילה: אותה נקודה, גדולה פי ארבעה ושקופה כמעט לגמרי
    for (var q = 0; q < nh; q++) {
      var o = halo[q];
      data[j++] = data[o]; data[j++] = data[o + 1]; data[j++] = data[o + 2] * 4;
      data[j++] = data[o + 3]; data[j++] = data[o + 4]; data[j++] = data[o + 5]; data[j++] = data[o + 6] * .07;
    }
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);
    gl.drawArrays(gl.POINTS, 0, N + D + nh);
    if (!live) { live = true; hero.classList.add('hw-live'); }
    if (!revealed && t > 1.45) { revealed = true; hero.classList.add('hw-in'); }
    // כשהכול נח (אין עכבר, אין גלילה, אין ברק), עוצרים לגמרי כדי לא לבזבז סוללה, ומתעוררים לקראת הברק הבא
    var rest = t > 3.2 && !moving && !shock && glint < -1e8 && scrollP === 0 && now - lastIn > 2500;
    if (rest) { clearTimeout(idleT); idleT = setTimeout(wake, (7 - ((t - 2.6) % 7)) * 1000 + 30); return; }
    if (visible && !document.hidden && scrollP < 1) raf = requestAnimationFrame(frame);
  }
  function wake() { if (data && !raf && visible && !document.hidden && scrollP < 1) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  window.addEventListener('scroll', wake, { passive: true });
  document.addEventListener('visibilitychange', wake);
  if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; wake(); }).observe(hero);

  var rw = 0, rt = 0;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      if (hero.clientWidth === rw) return; // בטלפון שורת הכתובת משנה רק את הגובה
      rw = hero.clientWidth; sample(); settle(); onScroll(); wake();
    }, 180);
  });

  function start() {
    dpr = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2);
    rw = hero.clientWidth;
    sample();
    if (!N) return still();
    burst(); onScroll(); wake();
  }
  var fam = getComputedStyle(lines[0]).fontFamily, probe = '750 100px ' + fam;
  var ready = document.fonts && document.fonts.load ? Promise.all([document.fonts.load(probe, lines[0].textContent), document.fonts.load(probe, 'HG Studio')]) : Promise.resolve();
  // מתחילים אחרי שהדף נטען והדפדפן פנוי, כדי שהפתיחה לא תאט את הטעינה עצמה
  var loaded = document.readyState === 'complete' ? Promise.resolve() : new Promise(function (r) { window.addEventListener('load', r, { once: true }); });
  var idle = function () { return new Promise(function (r) { (window.requestIdleCallback || function (f) { setTimeout(f, 60); })(r, { timeout: 700 }); }); };
  Promise.all([ready.catch(function () { }), loaded]).then(idle).then(start, start);
})();
