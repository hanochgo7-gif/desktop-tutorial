/* הפתיחה: יד של בן אדם ויד של רובוט מתקרבות ללחיצת יד, וברגע האחרון הרובוט עושה לה אצבע משולשת.
   סרטון אמיתי שפורק לפריימים: הגלילה מריצה אותו קדימה ואחורה בזמן שהמסך נשאר במקום (כמו הפתיחה של AMS).
   WebGL מצייר את הפריים: במרכז צילום חד, ובקצוות המסך ומתחת לעכבר הוא מתפרק לנקודות.
   בלי WebGL, או ב"הפחתת תנועה", נשארת תמונת הסיום הסטטית. */
(function () {
  'use strict';
  var root = document.documentElement;
  var hero = document.querySelector('.cr');
  var pin = hero && hero.querySelector('.cr-pin');
  if (!pin || !root.classList.contains('motion')) return;

  var COUNT = +hero.getAttribute('data-frames') || 60;
  // בטלפון: כל פריים שני. השיידר ממזג בין פריימים, אז התנועה נשארת רציפה, וההורדה קטנה בחצי
  var STEP = window.innerWidth <= 900 || (navigator.connection && navigator.connection.saveData) ? 2 : 1;
  COUNT = Math.ceil(COUNT / STEP);
  var PATH = hero.getAttribute('data-path') || 'work/creation/f/{w}/{n}.webp';
  var canvas = document.createElement('canvas');
  canvas.className = 'cr-stage';
  canvas.setAttribute('aria-hidden', 'true');
  var gl = null;
  // השחור של הסרט שקוף: מתחת יושבת ה-ח מזכוכית (js/het.js)
  try { gl = canvas.getContext('webgl2', { antialias: false, alpha: true, premultipliedAlpha: true }); } catch (e) { }
  if (!gl) return;
  pin.prepend(canvas);
  // מחשב בלי כרטיס מסך: רזולוציה נמוכה יותר, כדי שכל פריים יצא מהר
  var SOFT = false;
  try { var dbg = gl.getExtension('WEBGL_debug_renderer_info'); SOFT = /swiftshader|llvmpipe|softpipe|software|basic render/i.test(String(dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : '')); } catch (e) { }

  /* ---------- שיידר: צילום שמתפרק לנקודות ---------- */
  var VS = '#version 300 es\nin vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';
  var FS = [
    '#version 300 es',
    'precision highp float;',
    'uniform sampler2D uA, uB;',
    'uniform float uMix, uCell, uEdge, uOut, uFade, uMouseR;',
    'uniform vec2 uRes, uOff, uSize;',      // גודל הקנבס, ומיקום וגודל התמונה בתוכו (בפיקסלים)
    'uniform vec3 uMouse;',                 // x, y, עוצמה
    'out vec4 o;',
    'float hash(vec2 q){ return 0.1 + 0.85 * fract(sin(dot(q, vec2(127.1, 311.7))) * 43758.5453); }',
    'vec3 img(vec2 px){',
    '  vec2 uv = (px - uOff) / uSize;',
    '  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return vec3(0.0);',
    '  return mix(texture(uA, uv).rgb, texture(uB, uv).rgb, uMix);',
    '}',
    // מסכה: איפה יש יד ואיפה רק שחור. נקודה כהה שיש יד משני צדדיה (מפרק בתוך היד) נחשבת יד,
    // אבל הקצה החיצוני לא מתרחב, כך שאין הילה שחורה מסביב לידיים
    'float lit(vec2 px){ vec3 c = img(px); return smoothstep(0.03, 0.11, max(c.r, max(c.g, c.b))); }',
    'float matte(vec2 px){',
    '  float rr = uCell * 1.4;',
    '  float m = lit(px);',
    '  m = max(m, min(lit(px + vec2(rr, 0.0)), lit(px - vec2(rr, 0.0))));',
    '  m = max(m, min(lit(px + vec2(0.0, rr)), lit(px - vec2(0.0, rr))));',
    '  m = max(m, min(lit(px + vec2(rr, rr)), lit(px - vec2(rr, rr))));',
    '  m = max(m, min(lit(px + vec2(rr, -rr)), lit(px - vec2(rr, -rr))));',
    '  return m;',
    '}',
    'void main(){',
    '  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);',
    '  vec3 photo = img(px);',
    // רשת הנקודות: בכל תא עיגול שגודלו לפי הבהירות של מרכז התא
    '  vec2 cell = floor(px / uCell);',
    '  vec2 c = (cell + 0.5) * uCell;',
    '  vec3 cc = img(c);',
    '  float lum = dot(cc, vec3(0.299, 0.587, 0.114));',
    '  float m = (1.0 - smoothstep(uMouseR * 0.2, uMouseR, length(px - uMouse.xy))) * uMouse.z;',
    '  float r = uCell * 0.5 * (0.2 + 0.95 * sqrt(lum)) * (1.0 + m * 0.35);',
    '  float dotA = 1.0 - smoothstep(r - 1.0, r, length(px - c));',
    '  float dA = dotA * step(0.035, lum);',
    '  vec3 dots = min(cc * 1.25, vec3(1.0)) * dA;',
    '  float pa = matte(px);',
    // איפה מתפרקים: קצוות המסך (הזרועות), העכבר, והיציאה
    '  float ex = clamp(px.x, max(uOff.x, 0.0), min(uOff.x + uSize.x, uRes.x));',
    '  float edge = 1.0 - smoothstep(0.0, uEdge, min(ex - max(uOff.x, 0.0), min(uOff.x + uSize.x, uRes.x) - ex) / min(uSize.x, uRes.x));',
    '  float d = clamp(max(max(edge, m), uOut), 0.0, 1.0);',
    '  float k = smoothstep(hash(cell) - 0.05, hash(cell) + 0.05, d);',
    '  vec3 col = mix(photo * pa, dots, k);',
    '  float a = mix(pa, dA, k);',
    '  o = vec4(col, a) * uFade;',
    '}'
  ].join('\n');

  function sh(type, s) {
    var x = gl.createShader(type); gl.shaderSource(x, s); gl.compileShader(x);
    if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x));
    return x;
  }
  var prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (e) { canvas.remove(); return; }
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var U = {};
  ['uA', 'uB', 'uMix', 'uCell', 'uEdge', 'uOut', 'uFade', 'uRes', 'uOff', 'uSize', 'uMouse', 'uMouseR'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
  gl.uniform1i(U.uA, 0);
  gl.uniform1i(U.uB, 1);

  // מטמון קטן של טקסטורות לפי מספר פריים: כשהגלילה מתקדמת בפריים אחד, עולה לכרטיס המסך רק הפריים החדש
  var CACHE = 4, cache = [];
  function makeTex() {
    var t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  var tick = 0;
  function texFor(i) {
    for (var c = 0; c < cache.length; c++) if (cache[c].i === i) { cache[c].used = tick; return cache[c].t; }
    var slot;
    if (cache.length < CACHE) { slot = { t: makeTex() }; cache.push(slot); }
    else { slot = cache[0]; for (c = 1; c < cache.length; c++) if (cache[c].used < slot.used) slot = cache[c]; }
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, slot.t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, pix(i));
    slot.i = i; slot.used = tick;
    return slot.t;
  }
  function cached(i) { for (var c = 0; c < cache.length; c++) if (cache[c].i === i) return true; return false; }
  function bind(unit, t) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); }

  /* ---------- הפריימים: קודם כל רביעי, ואז השאר ---------- */
  var narrow = window.innerWidth < 700;
  var set = !narrow && window.innerWidth * Math.min(window.devicePixelRatio || 1, 2) > 1300 ? 1600 : 960;
  var frames = [], iw = 16, ih = 9, dirty = true;
  function src(i) { return PATH.replace('{w}', set).replace('{n}', String(i * STEP + 1).padStart(3, '0')); }
  // פענוח התמונה ברקע (createImageBitmap), כדי שהעלאה לכרטיס המסך לא תעצור את הגלילה.
  // מחזיקים מפוענחים רק פריימים קרובים למקום בגלילה, כדי לא למלא את הזיכרון
  var BM = typeof createImageBitmap === 'function', NEAR = 4, lo = 0, hi = 0, shownAt = -1;
  function want(i) {
    if (frames[i]) return;
    var f = frames[i] = {};
    if (BM && window.fetch) {
      // הקובץ נשמר דחוס, והפענוח קורה ברקע רק כשהפריים מתקרב
      fetch(src(i)).then(function (r) { if (!r.ok) throw r; return r.blob(); }).then(function (b) {
        f.blob = b;
        if (i === 0 || (i >= lo && i <= hi)) bitmap(i);
      }).catch(function () { frames[i] = null; BM = false; want(i); });
      return;
    }
    var im = f.im = new Image();
    im.decoding = 'async';
    im.onload = function () {
      f.ok = true;
      if (i === 0) { iw = im.naturalWidth; ih = im.naturalHeight; layout(); }
      arrived(i);
    };
    im.src = src(i);
  }
  function arrived(i) {
    // מציירים מחדש רק אם הפריים שהגיע הוא זה שצריך עכשיו (או קרוב יותר אליו ממה שמוצג)
    if (Math.abs(i - pos) < 2 || shownAt < 0 || Math.abs(i - pos) < Math.abs(shownAt - pos)) dirty = true;
  }
  function bitmap(i) {
    var f = frames[i];
    if (!f || !f.blob || f.bm || f.busy) return;
    f.busy = true;
    createImageBitmap(f.blob).then(function (bm) {
      f.busy = false;
      if (i === 0 && iw === 16) { iw = bm.width; ih = bm.height; layout(); }
      if (i < lo - 2 || i > hi + 2) { bm.close(); return; }
      f.bm = bm; arrived(i);
    }, function () { f.busy = false; });
  }
  // החלון של הפריימים המפוענחים זז עם הגלילה (גם לכיוון שאליו היא הולכת)
  function windowAt(a, b) {
    var nlo = Math.max(0, Math.floor(Math.min(a, b)) - NEAR), nhi = Math.min(COUNT - 1, Math.ceil(Math.max(a, b)) + NEAR);
    if (nhi - nlo > NEAR * 4) { if (b > a) nlo = nhi - NEAR * 4; else nhi = nlo + NEAR * 4; }
    if (nlo === lo && nhi === hi) return;
    lo = nlo; hi = nhi;
    for (var j = 0; j < COUNT; j++) {
      var f = frames[j];
      if (!f) continue;
      if (j >= lo && j <= hi) bitmap(j);
      else if (f.bm) { f.bm.close(); f.bm = null; }
    }
  }
  function pix(i) { return frames[i].bm || frames[i].im; }
  function ready(i) { var f = frames[i]; return !!(f && (f.bm || f.ok || cached(i))); }
  function nearest(i) {
    for (var d = 0; d < COUNT; d++) {
      if (i - d >= 0 && ready(i - d)) return i - d;
      if (i + d < COUNT && ready(i + d)) return i + d;
    }
    return -1;
  }
  want(0);
  for (var k = 4 / STEP; k < COUNT; k += 4 / STEP) want(k);
  want(COUNT - 1);
  function rest() { for (var j = 0; j < COUNT; j++) want(j); }
  if ('requestIdleCallback' in window) requestIdleCallback(rest, { timeout: 2500 }); else setTimeout(rest, 1200);
  windowAt(0, 0);

  /* ---------- פריסה ---------- */
  var W = 1, H = 1, dpr = 1;
  function layout() {
    dpr = SOFT ? 0.75 : Math.min(window.devicePixelRatio || 1, narrow ? 2 : 1.5);
    var w = pin.clientWidth, h = pin.clientHeight;
    W = Math.round(w * dpr); H = Math.round(h * dpr);
    canvas.width = W; canvas.height = H;
    gl.viewport(0, 0, W, H);
    // הידיים יושבות ברצועה שבין 22% ל-64% מגובה הסרט. מתאימים אותה לשטח שמתחת לכותרת:
    // במחשב בגודל שממלא את המסך כשיש מקום, ובמסך נמוך קטן יותר. בטלפון הסרט רחב מהמסך והזרועות נחתכות בצדדים
    var copy = pin.querySelector('.cr-copy');
    var top = (copy ? copy.offsetTop + copy.offsetHeight + (narrow ? 24 : 16) : h * 0.35) * dpr;
    var bottom = H - (narrow ? 80 : 56) * dpr;
    var s = narrow ? (W * 1.7) / iw : Math.min(Math.max(W / iw, H / ih), (bottom - top) / (0.42 * ih));
    var sw = iw * s, shh = ih * s;
    gl.uniform2f(U.uRes, W, H);
    gl.uniform2f(U.uOff, (W - sw) / 2, (top + bottom) / 2 - 0.43 * shh);
    gl.uniform2f(U.uSize, sw, shh);
    gl.uniform1f(U.uCell, Math.max(5, Math.round((narrow ? 6 : 8) * dpr)));
    gl.uniform1f(U.uEdge, narrow ? 0.12 : 0.2);
    gl.uniform1f(U.uMouseR, (narrow ? 0.22 : 0.12) * Math.max(W, H));
    dirty = true;
  }
  layout();
  var resizeT;
  window.addEventListener('resize', function () {
    clearTimeout(resizeT);
    resizeT = setTimeout(function () { narrow = window.innerWidth < 700; layout(); }, 120);
  });

  /* ---------- עכבר ---------- */
  var ptr = { x: 0, y: 0, on: 0, tx: 0, ty: 0, ton: 0 };
  function onMove(e) {
    var r = canvas.getBoundingClientRect();
    if (e.clientY < r.top || e.clientY > r.bottom) { ptr.ton = 0; return; }
    ptr.tx = (e.clientX - r.left) * dpr; ptr.ty = (e.clientY - r.top) * dpr; ptr.ton = 1;
    if (ptr.on < 0.01) { ptr.x = ptr.tx; ptr.y = ptr.ty; }
  }
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerdown', onMove, { passive: true });
  document.addEventListener('pointerleave', function () { ptr.ton = 0; });
  window.addEventListener('touchend', function () { ptr.ton = 0; }, { passive: true });

  /* ---------- גלילה ופריימים ---------- */
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function smooth(a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  var visible = true, shown = false, flipped = false, introAt = null, pos = 0, last = {};
  new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }).observe(hero);
  function begin() { if (introAt === null) introAt = performance.now(); }
  if (window.HG && window.HG.introDone) begin();
  else window.addEventListener('hg:intro', begin, { once: true });
  setTimeout(begin, 4500);

  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) return;
    var r = hero.getBoundingClientRect();
    var p = clamp(-r.top / Math.max(1, r.height - window.innerHeight), 0, 1);
    pin.style.setProperty('--p', p.toFixed(4));
    // רגע של מנוחה בהתחלה, הסרט רץ עד 86% מהגלילה, ואז הכיתוב
    var target = smooth(0.04, 0.86, p) * (COUNT - 1);
    var cap = smooth(0.84, 0.92, p), out = smooth(0.95, 1, p);
    pin.style.setProperty('--t', cap.toFixed(3));
    pin.style.setProperty('--o', out.toFixed(3));
    pin.classList.toggle('cr-gone', p > 0.3);
    if (target > COUNT * 0.8 && !flipped) {
      flipped = true;
      if (window.HG && window.HG.sfx) window.HG.sfx.whoosh();
    } else if (target < COUNT * 0.7) flipped = false;

    // הפריים רודף אחרי הגלילה עם השהיה קטנה, כדי שזה ירגיש כמו סרט
    pos += (target - pos) * 0.2;
    if (Math.abs(target - pos) < 0.002) pos = target;
    windowAt(pos, target);
    ptr.x += (ptr.tx - ptr.x) * 0.14; ptr.y += (ptr.ty - ptr.y) * 0.14; ptr.on += (ptr.ton - ptr.on) * 0.08;
    if (ptr.on < 0.002) ptr.on = 0;
    // הכניסה עצמה היא מעבר CSS על הקנבס (.cr-stage), כך שמציירים פריים אחד ולא שישים
    var fade = introAt === null ? 0 : 1;

    // מציירים רק כשמשהו השתנה
    var key = pos.toFixed(3) + '|' + out.toFixed(3) + '|' + fade.toFixed(3) + '|' + (ptr.on ? ptr.x.toFixed(0) + ',' + ptr.y.toFixed(0) + ',' + ptr.on.toFixed(3) : 0);
    if (key === last.key && !dirty) return;
    last.key = key; dirty = false;

    var i0 = Math.floor(pos), i1 = Math.min(COUNT - 1, i0 + 1);
    var a = nearest(i0);
    if (a < 0) { dirty = true; return; }
    var b = ready(i1) ? i1 : a;
    // לכל היותר פריים חדש אחד לכרטיס המסך בכל ציור; השני יגיע בציור הבא
    tick++;
    if (b !== a && !cached(a) && !cached(b)) { b = a; dirty = true; }
    bind(0, texFor(a));
    bind(1, texFor(b));
    shownAt = a;
    gl.uniform1f(U.uMix, b === a ? 0 : pos - i0);
    gl.uniform1f(U.uOut, out);
    gl.uniform1f(U.uFade, fade);
    gl.uniform3f(U.uMouse, ptr.x, ptr.y, ptr.on);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (!shown) { shown = true; root.classList.add('cr-on'); }
  }
  requestAnimationFrame(frame);
})();
