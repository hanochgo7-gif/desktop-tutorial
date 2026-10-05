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
  var PATH = hero.getAttribute('data-path') || 'work/creation/f/{w}/{n}.webp';
  var canvas = document.createElement('canvas');
  canvas.className = 'cr-stage';
  canvas.setAttribute('aria-hidden', 'true');
  var gl = null;
  try { gl = canvas.getContext('webgl2', { antialias: false, alpha: false }); } catch (e) { }
  if (!gl) return;
  pin.prepend(canvas);

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
    '  vec3 dots = min(cc * 1.25, vec3(1.0)) * dotA * step(0.035, lum);',
    // איפה מתפרקים: קצוות המסך (הזרועות), העכבר, והיציאה
    '  float ex = clamp(px.x, max(uOff.x, 0.0), min(uOff.x + uSize.x, uRes.x));',
    '  float edge = 1.0 - smoothstep(0.0, uEdge, min(ex - max(uOff.x, 0.0), min(uOff.x + uSize.x, uRes.x) - ex) / min(uSize.x, uRes.x));',
    '  float d = clamp(max(max(edge, m), uOut), 0.0, 1.0);',
    '  float k = smoothstep(hash(cell) - 0.05, hash(cell) + 0.05, d);',
    '  vec3 col = mix(photo, dots, k);',
    '  vec2 q = px / uRes - 0.5;',
    '  col *= 1.0 - dot(q, q) * 0.35;',
    '  o = vec4(col * uFade, 1.0);',
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

  function makeTex(unit) {
    var t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    return t;
  }
  var tex = [makeTex(0), makeTex(1)], onTex = [-1, -1];
  function upload(unit, i, im) {
    if (onTex[unit] === i) return;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex[unit]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im);
    onTex[unit] = i;
  }

  /* ---------- הפריימים: קודם כל רביעי, ואז השאר ---------- */
  var narrow = window.innerWidth < 700;
  var set = !narrow && window.innerWidth * Math.min(window.devicePixelRatio || 1, 2) > 1300 ? 1600 : 960;
  var frames = [], iw = 16, ih = 9, dirty = true;
  function src(i) { return PATH.replace('{w}', set).replace('{n}', String(i + 1).padStart(3, '0')); }
  function want(i) {
    if (frames[i]) return;
    var im = new Image();
    im.decoding = 'async';
    im.onload = function () {
      if (i === 0) { iw = im.naturalWidth; ih = im.naturalHeight; layout(); }
      dirty = true;
    };
    im.src = src(i);
    frames[i] = im;
  }
  function ready(i) { var f = frames[i]; return !!(f && f.complete && f.naturalWidth); }
  function nearest(i) {
    for (var d = 0; d < COUNT; d++) {
      if (i - d >= 0 && ready(i - d)) return i - d;
      if (i + d < COUNT && ready(i + d)) return i + d;
    }
    return -1;
  }
  want(0);
  for (var k = 4; k < COUNT; k += 4) want(k);
  want(COUNT - 1);
  function rest() { for (var j = 0; j < COUNT; j++) want(j); }
  if ('requestIdleCallback' in window) requestIdleCallback(rest, { timeout: 2500 }); else setTimeout(rest, 1200);

  /* ---------- פריסה ---------- */
  var W = 1, H = 1, dpr = 1;
  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, narrow ? 2 : 1.5);
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
    ptr.x += (ptr.tx - ptr.x) * 0.14; ptr.y += (ptr.ty - ptr.y) * 0.14; ptr.on += (ptr.ton - ptr.on) * 0.08;
    if (ptr.on < 0.002) ptr.on = 0;
    var fade = introAt === null ? 0 : clamp((now - introAt) / 1100, 0, 1);
    fade = 1 - Math.pow(1 - fade, 3);

    // מציירים רק כשמשהו השתנה
    var key = pos.toFixed(3) + '|' + out.toFixed(3) + '|' + fade.toFixed(3) + '|' + (ptr.on ? ptr.x.toFixed(0) + ',' + ptr.y.toFixed(0) + ',' + ptr.on.toFixed(3) : 0);
    if (key === last.key && !dirty) return;
    last.key = key; dirty = false;

    var i0 = Math.floor(pos), i1 = Math.min(COUNT - 1, i0 + 1);
    var a = nearest(i0);
    if (a < 0) return;
    var b = ready(i1) ? i1 : a;
    upload(0, a, frames[a]);
    upload(1, b, frames[b]);
    gl.uniform1f(U.uMix, b === a ? 0 : pos - i0);
    gl.uniform1f(U.uOut, out);
    gl.uniform1f(U.uFade, fade);
    gl.uniform3f(U.uMouse, ptr.x, ptr.y, ptr.on);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (!shown) { shown = true; root.classList.add('cr-on'); }
  }
  requestAnimationFrame(frame);
})();
