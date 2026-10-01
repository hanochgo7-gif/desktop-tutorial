/* מנוע החלקיקים: טקסט שנדגם מ-canvas הופך לעשרות אלפי נקודות על כרטיס המסך.
   בלי ספריות, WebGL 1 בלבד. כל התנועה מחושבת ב-shader, בלי מצב שנשמר בין פריימים:
   בית (צורה A או B) + פיזור + נשימה + דחייה מהעכבר. */
(function () {
  'use strict';

  var VS = [
    'attribute vec2 aA;',
    'attribute vec2 aB;',
    'attribute vec4 aR;',
    'uniform vec2 uRes;',
    'uniform float uTime;',
    'uniform vec2 uMouse;',
    'uniform vec2 uVel;',
    'uniform float uRad;',
    'uniform vec2 uOffA;',
    'uniform vec2 uOffB;',
    'uniform float uMorph;',
    'uniform float uScatter;',
    'uniform float uDpr;',
    'uniform float uAlpha;',
    'varying float vHeat;',
    'varying float vA;',
    'void main() {',
    '  float m = clamp(uMorph * 1.6 - aR.x * 0.6, 0.0, 1.0);',
    '  m = m * m * (3.0 - 2.0 * m);',
    '  vec2 a = aA + uOffA;',
    '  vec2 b = aB + uOffB;',
    '  vec2 p = mix(a, b, m);',
    '  vec2 dir = b - a;',
    '  p += vec2(-dir.y, dir.x) * sin(m * 3.14159) * (aR.y - 0.5) * 0.35;',
    '  float s = uScatter;',
    '  float ang = aR.x * 6.2831 + aR.z * 3.0;',
    '  p += vec2(cos(ang), sin(ang)) * s * (120.0 + aR.y * 700.0) * (0.6 + s);',
    '  p.y -= s * s * (200.0 + aR.z * 500.0);',
    '  p += vec2(sin(uTime * 0.7 + aR.y * 40.0), cos(uTime * 0.6 + aR.z * 40.0)) * (0.7 + 2.0 * s);',
    '  vec2 d = p - uMouse;',
    '  float dist = length(d);',
    '  float f = exp(-(dist * dist) / (uRad * uRad));',
    '  vec2 n = dist > 0.001 ? d / dist : vec2(0.0);',
    '  p += n * f * uRad * 0.55;',
    '  p += vec2(-n.y, n.x) * f * uRad * 0.5 * (aR.w - 0.5);',
    '  p += uVel * f * 0.9;',
    '  vHeat = f;',
    '  vA = uAlpha * (0.45 + 0.55 * aR.z) * (1.0 - s * 0.85);',
    '  vec2 c = (p / uRes) * 2.0 - 1.0;',
    '  gl_Position = vec4(c.x, -c.y, 0.0, 1.0);',
    '  gl_PointSize = (1.1 + aR.w * 1.5) * (1.0 + f * 1.3) * uDpr;',
    '}'
  ].join('\n');

  var FS = [
    'precision mediump float;',
    'uniform vec3 uCol;',
    'uniform vec3 uHot;',
    'varying float vHeat;',
    'varying float vA;',
    'void main() {',
    '  float r = length(gl_PointCoord - 0.5);',
    '  if (r > 0.5) discard;',
    '  float e = smoothstep(0.5, 0.12, r);',
    '  vec3 col = mix(uCol, uHot, smoothstep(0.04, 0.55, vHeat));',
    '  gl_FragColor = vec4(col, vA * e);',
    '}'
  ].join('\n');

  function shader(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }

  /* דגימת טקסט: מציירים את השורות על canvas נסתר ובוחרים נקודות אקראיות מתוך הפיקסלים המלאים.
     items: [{ text, font, x, y, letterSpacing }] בקואורדינטות של התיבה (x הוא הקצה הימני של השורה). */
  function sample(items, w, h, count) {
    var k = 0.5; // דוגמים בחצי רזולוציה: מהיר פי 4, ועדיין מדויק
    var cw = Math.max(2, Math.ceil(w * k)), ch = Math.max(2, Math.ceil(h * k));
    var c = document.createElement('canvas');
    c.width = cw; c.height = ch;
    var ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.scale(k, k);
    ctx.fillStyle = '#fff';
    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    items.forEach(function (it) {
      ctx.font = it.font;
      if ('letterSpacing' in ctx) ctx.letterSpacing = it.letterSpacing || '0px';
      ctx.fillText(it.text, it.x, it.y);
    });
    var data = ctx.getImageData(0, 0, cw, ch).data;
    var filled = [];
    for (var y = 0; y < ch; y++) {
      for (var x = 0; x < cw; x++) {
        if (data[(y * cw + x) * 4 + 3] > 140) filled.push(x, y);
      }
    }
    var out = new Float32Array(count * 2);
    var n = filled.length / 2;
    for (var i = 0; i < count; i++) {
      if (n) {
        var j = (Math.random() * n) | 0;
        out[i * 2] = (filled[j * 2] + Math.random()) / k;
        out[i * 2 + 1] = (filled[j * 2 + 1] + Math.random()) / k;
      } else {
        out[i * 2] = Math.random() * w;
        out[i * 2 + 1] = Math.random() * h;
      }
    }
    return out;
  }

  function create(canvas) {
    var gl;
    try {
      gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
    } catch (e) { gl = null; }
    if (!gl) return null;

    var prog = gl.createProgram();
    try {
      gl.attachShader(prog, shader(gl, gl.VERTEX_SHADER, VS));
      gl.attachShader(prog, shader(gl, gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    } catch (e) { return null; }
    gl.useProgram(prog);

    var loc = {};
    ['aA', 'aB', 'aR'].forEach(function (n) { loc[n] = gl.getAttribLocation(prog, n); });
    ['uRes', 'uTime', 'uMouse', 'uVel', 'uRad', 'uOffA', 'uOffB', 'uMorph', 'uScatter', 'uDpr', 'uAlpha', 'uCol', 'uHot']
      .forEach(function (n) { loc[n] = gl.getUniformLocation(prog, n); });

    var buf = { aA: gl.createBuffer(), aB: gl.createBuffer(), aR: gl.createBuffer() };
    var count = 0, w = 1, h = 1, dpr = 1;

    function bind(name, data, size) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buf[name]);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(loc[name]);
      gl.vertexAttribPointer(loc[name], size, gl.FLOAT, false, 0, 0);
    }

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    return {
      gl: gl,
      resize: function (cssW, cssH, ratio) {
        w = cssW; h = cssH; dpr = ratio;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        gl.viewport(0, 0, canvas.width, canvas.height);
      },
      setShapes: function (A, B) {
        count = Math.min(A.length, B.length) / 2;
        var R = new Float32Array(count * 4);
        for (var i = 0; i < R.length; i++) R[i] = Math.random();
        bind('aA', A, 2);
        bind('aB', B, 2);
        bind('aR', R, 4);
      },
      draw: function (u) {
        gl.clear(gl.COLOR_BUFFER_BIT);
        if (!count || u.alpha <= 0.001) return;
        gl.uniform2f(loc.uRes, w, h);
        gl.uniform1f(loc.uTime, u.time);
        gl.uniform2f(loc.uMouse, u.mx, u.my);
        gl.uniform2f(loc.uVel, u.vx, u.vy);
        gl.uniform1f(loc.uRad, u.rad);
        gl.uniform2f(loc.uOffA, 0, u.offA);
        gl.uniform2f(loc.uOffB, 0, u.offB);
        gl.uniform1f(loc.uMorph, u.morph);
        gl.uniform1f(loc.uScatter, u.scatter);
        gl.uniform1f(loc.uDpr, dpr);
        gl.uniform1f(loc.uAlpha, u.alpha);
        gl.uniform3fv(loc.uCol, u.col);
        gl.uniform3fv(loc.uHot, u.hot);
        gl.drawArrays(gl.POINTS, 0, count);
      }
    };
  }

  window.Particles = { create: create, sample: sample };
})();
