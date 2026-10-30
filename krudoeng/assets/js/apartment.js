/* קרודו הנדסה · הדירה השקופה
   דגם תלת־ממדי של דירה לדוגמה, בנוי ב-CSS 3D מתוך תוכנית. יחידות: 1 ≈ 2.2 ס"מ, התוכנית 600 על 360.
   ציר x ימינה, y כלפי הצופה, z למעלה. לכל קיר עובי: מכסה מואר (החתך, כמו בשרטוט) ושתי פאות שקופות.
   "מבט של בודק" מדליק את הממצאים בצבעי המותג, שרצים מכחול קר לכתום חם כמו פלטה של מצלמה תרמית.
   הדירה והממצאים להמחשה בלבד. */
(function () {
  'use strict';
  var W = 600, D = 360, H = 118, LOW = 24;
  var REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var EN = (document.documentElement.lang || '').slice(0, 2) === 'en';
  // תוויות באנגלית לעמוד האנגלי
  var EN_ROOMS = { living: 'Living & kitchen', bed: 'Bedroom', bath: 'Bath', mamad: 'Safe room', hall: 'Entry', balcony: 'Balcony' };
  var EN_PINS = { moisture: 'Damp in the wall', drain: 'Drainage slope', cracks: 'Crack at the window', tiles: 'Hollow tiles', plans: 'Size vs the plan', electric: 'Electrical panel', rail: 'Railing height' };

  var ROOMS = [
    { id: 'living', name: 'סלון ומטבח', x: 0, y: 0, w: 360, d: 250, floor: 'tile', lx: 250, ly: 120 },
    { id: 'bed', name: 'חדר שינה', x: 360, y: 0, w: 240, d: 180, floor: 'wood', lx: 480, ly: 160 },
    { id: 'bath', name: 'רחצה', x: 360, y: 180, w: 120, d: 120, floor: 'wet', lx: 420, ly: 290 },
    { id: 'mamad', name: 'ממ״ד', x: 480, y: 180, w: 120, d: 120, floor: 'tile', lx: 540, ly: 250 },
    { id: 'hall', name: 'כניסה', x: 360, y: 300, w: 240, d: 60, floor: 'tile', lx: 480, ly: 336 },
    { id: 'balcony', name: 'מרפסת', x: 0, y: 250, w: 360, d: 110, floor: 'deck', lx: 250, ly: 314 }
  ];
  // קירות: [x1, y1, x2, y2, גובה, עובי, סוג, פתחים]. פתח: [מ-, עד (לאורך הקיר), z תחתון, z עליון, סוג]
  // הקירות הקדמיים נמוכים, כמו בבית בובות, כדי לראות פנימה
  var WALLS = [
    [0, 0, 600, 0, H, 9, 'ext', [[230, 320, 40, 96, 'win'], [440, 540, 40, 96, 'win']]],
    [0, 0, 0, 250, H, 9, 'ext', [[70, 180, 40, 96, 'win']]],
    [600, 0, 600, 360, LOW, 9, 'ext low', []],
    [360, 0, 360, 180, H, 6, 'int', [[112, 160, 0, 92, 'door']]],
    [360, 180, 600, 180, H, 6, 'int', []],
    [360, 180, 360, 300, H, 6, 'int wet', []],
    [480, 180, 480, 300, H, 11, 'mamad', []],
    [360, 300, 480, 300, LOW, 6, 'int low', [[30, 78, 0, LOW, 'door']]],
    [480, 300, 600, 300, LOW, 11, 'mamad low', [[26, 78, 0, LOW, 'door']]],
    [360, 300, 360, 360, LOW, 9, 'ext low', []],
    [360, 360, 600, 360, LOW, 9, 'ext low', [[150, 200, 0, LOW, 'door']]],
    [0, 250, 360, 250, H, 9, 'ext', [[16, 344, 6, 100, 'glass']]]
  ];
  // מעקות המרפסת: [x1, y1, x2, y2, גובה]
  var RAILS = [[0, 360, 360, 360, 52], [0, 250, 0, 360, 52]];
  // רהיטים: [x, y, w, d, h, סוג]
  var BOXES = [
    [14, 12, 166, 40, 46, 'counter'],
    [196, 150, 118, 44, 30, 'sofa'],
    [422, 26, 150, 112, 26, 'bed'],
    [374, 192, 40, 28, 40, 'sink'],
    [436, 252, 30, 38, 20, 'wc'],
    [498, 194, 84, 22, 62, 'shelf']
  ];
  // ממצאים: מקום הסיכה בתוכנית ובגובה, והתחנה בסיור
  var PINS = [
    { id: 'moisture', step: 'water', x: 352, y: 246, z: 70, say: 'רטיבות בקיר' },
    { id: 'drain', step: 'water', x: 70, y: 330, z: 4, say: 'שיפוע לניקוז' },
    { id: 'cracks', step: 'structure', x: 196, y: 4, z: 110, say: 'סדק מפינת החלון' },
    { id: 'tiles', step: 'structure', x: 165, y: 212, z: 4, say: 'אריחים חלולים' },
    { id: 'plans', step: 'plans', x: 300, y: 92, z: 4, say: 'מידות מול התוכנית' },
    { id: 'electric', step: 'plans', x: 4, y: 208, z: 66, say: 'לוח החשמל' },
    { id: 'rail', step: 'plans', x: 290, y: 360, z: 54, say: 'גובה המעקה' }
  ];
  // מצלמה: הטיה, סיבוב, זום ומרכז (ביחידות תוכנית)
  var CAMS = {
    overview: { rx: 57, rz: -34, s: 1, px: 300, py: 186 },
    water: { rx: 54, rz: -46, s: 1.42, px: 250, py: 262 },
    structure: { rx: 50, rz: -20, s: 1.42, px: 210, py: 120 },
    plans: { rx: 56, rz: -28, s: 1.22, px: 210, py: 220 },
    moisture: { rx: 56, rz: -56, s: 1.75, px: 345, py: 240 },
    report: { rx: 60, rz: -58, s: 2.3, px: 352, py: 246 }
  };

  function el(tag, cls, css) { var e = document.createElement(tag); if (cls) e.className = cls; if (css) e.style.cssText = css; return e; }
  function n2(v) { return Math.round(v * 100) / 100; }

  // חלוקת קיר לחלקים מלאים סביב הפתחים: [מ-, עד, z תחתון, z עליון]
  function parts(len, h, ops) {
    var out = [], s = 0;
    ops.slice().sort(function (a, b) { return a[0] - b[0]; }).forEach(function (o) {
      if (o[0] > s) out.push([s, o[0], 0, h]);
      if (o[2] > 0) out.push([o[0], o[1], 0, o[2]]);
      if (o[3] < h) out.push([o[0], o[1], o[3], h]);
      s = o[1];
    });
    if (s < len) out.push([s, len, 0, h]);
    return out;
  }

  function wall(world, w) {
    var x1 = w[0], y1 = w[1], x2 = w[2], y2 = w[3], h = w[4], t = w[5], kind = w[6], ops = w[7] || [];
    var len = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / len, uy = (y2 - y1) / len, nx = -uy, ny = ux;
    var ang = Math.atan2(uy, ux) * 180 / Math.PI;
    parts(len, h, ops).forEach(function (p) {
      var px = x1 + ux * p[0], py = y1 + uy * p[0], wd = p[1] - p[0], ht = p[3] - p[2];
      var ax = px - nx * t / 2, ay = py - ny * t / 2, bx = px + nx * t / 2, by = py + ny * t / 2;
      world.appendChild(el('i', 'k-face ' + kind, 'width:' + n2(wd) + 'px;height:' + ht + 'px;transform:translate3d(' + n2(ax) + 'px,' + n2(ay) + 'px,' + p[3] + 'px) rotateZ(' + ang + 'deg) rotateX(-90deg)'));
      world.appendChild(el('i', 'k-face ' + kind, 'width:' + n2(wd) + 'px;height:' + ht + 'px;transform:translate3d(' + n2(bx) + 'px,' + n2(by) + 'px,' + p[3] + 'px) rotateZ(' + ang + 'deg) rotateX(-90deg)'));
      world.appendChild(el('i', 'k-cap ' + kind, 'width:' + n2(wd) + 'px;height:' + t + 'px;transform:translate3d(' + n2(ax) + 'px,' + n2(ay) + 'px,' + p[3] + 'px) rotateZ(' + ang + 'deg)'));
    });
    ops.forEach(function (o) {
      if (o[4] !== 'win' && o[4] !== 'glass') return;
      var px = x1 + ux * o[0], py = y1 + uy * o[0];
      world.appendChild(el('i', 'k-glass ' + o[4], 'width:' + (o[1] - o[0]) + 'px;height:' + (o[3] - o[2]) + 'px;transform:translate3d(' + n2(px) + 'px,' + n2(py) + 'px,' + o[3] + 'px) rotateZ(' + ang + 'deg) rotateX(-90deg)'));
    });
  }

  // פאה על הקיר (לממצאים, ללוח החשמל): לאורך הקיר מ-from עד to, בגובה z0 עד z1, בצד הפנימי
  function onWall(world, x1, y1, x2, y2, from, to, z0, z1, off, cls) {
    var len = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / len, uy = (y2 - y1) / len, nx = -uy, ny = ux;
    var ang = Math.atan2(uy, ux) * 180 / Math.PI;
    var sx = x1 + ux * from + nx * off, sy = y1 + uy * from + ny * off;
    var e = el('i', cls, 'width:' + (to - from) + 'px;height:' + (z1 - z0) + 'px;transform:translate3d(' + n2(sx) + 'px,' + n2(sy) + 'px,' + z1 + 'px) rotateZ(' + ang + 'deg) rotateX(-90deg)');
    world.appendChild(e);
    return e;
  }

  function box(world, b) {
    var x = b[0], y = b[1], w = b[2], d = b[3], h = b[4], k = 'k-box ' + b[5];
    world.appendChild(el('i', k + ' top', 'width:' + w + 'px;height:' + d + 'px;transform:translate3d(' + x + 'px,' + y + 'px,' + h + 'px)'));
    world.appendChild(el('i', k + ' side', 'width:' + w + 'px;height:' + h + 'px;transform:translate3d(' + x + 'px,' + (y + d) + 'px,' + h + 'px) rotateX(-90deg)'));
    world.appendChild(el('i', k + ' side', 'width:' + w + 'px;height:' + h + 'px;transform:translate3d(' + x + 'px,' + y + 'px,' + h + 'px) rotateX(-90deg)'));
    world.appendChild(el('i', k + ' side', 'width:' + d + 'px;height:' + h + 'px;transform:translate3d(' + (x + w) + 'px,' + y + 'px,' + h + 'px) rotateZ(90deg) rotateX(-90deg)'));
    world.appendChild(el('i', k + ' side', 'width:' + d + 'px;height:' + h + 'px;transform:translate3d(' + x + 'px,' + y + 'px,' + h + 'px) rotateZ(90deg) rotateX(-90deg)'));
  }

  // תמונה תרמית: הקיר חם, והרטיבות היא אזור קר שעולה מהרצפה. בצבעי המותג
  var RAMP = [[0, [5, 40, 61]], [0.16, [2, 78, 112]], [0.34, [41, 134, 165]], [0.5, [132, 198, 218]], [0.62, [244, 175, 140]], [0.74, [246, 157, 110]], [0.87, [241, 103, 37]], [1, [231, 97, 70]]];
  function ramp(v) {
    v = Math.max(0, Math.min(1, v));
    for (var i = 1; i < RAMP.length; i++) {
      if (v <= RAMP[i][0]) {
        var a = RAMP[i - 1], b = RAMP[i], k = (v - a[0]) / (b[0] - a[0]);
        return [a[1][0] + (b[1][0] - a[1][0]) * k, a[1][1] + (b[1][1] - a[1][1]) * k, a[1][2] + (b[1][2] - a[1][2]) * k];
      }
    }
    return RAMP[RAMP.length - 1][1];
  }
  var thermalURL = null;
  var UID = 0;
  function thermal() {
    if (thermalURL) return thermalURL;
    var w = 96, h = 96, c = document.createElement('canvas');
    c.width = w; c.height = h;
    var g = c.getContext('2d'), img = g.createImageData(w, h), d = img.data;
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var u = x / w, v = y / h;
      var warm = 0.8 + 0.05 * Math.sin(u * 9 + v * 3) * Math.cos(v * 7) - 0.04 * v;
      var b1 = Math.exp(-(Math.pow((u - 0.42) / 0.27, 2) + Math.pow((v - 0.86) / 0.3, 2)));
      var b2 = Math.exp(-(Math.pow((u - 0.52 - 0.05 * Math.sin(v * 8)) / 0.13, 2) + Math.pow((v - 0.5) / 0.26, 2)));
      var val = warm - 0.66 * b1 - 0.36 * b2;
      var col = ramp(val), i = (y * w + x) * 4;
      d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    thermalURL = c.toDataURL('image/png');
    return thermalURL;
  }

  function floorSVG(n) {
    var s = '<svg viewBox="0 0 ' + W + ' ' + D + '" width="' + W + '" height="' + D + '" aria-hidden="true"><defs>' +
      '<pattern id="kt' + n + '" width="30" height="30" patternUnits="userSpaceOnUse"><rect width="30" height="30" class="ft"/><path d="M30 0H0V30" class="fl"/></pattern>' +
      '<pattern id="kw' + n + '" width="300" height="15" patternUnits="userSpaceOnUse"><rect width="300" height="15" class="fw"/><path d="M0 15H300M84 0V15M212 0V15" class="fl"/></pattern>' +
      '<pattern id="kd' + n + '" width="15" height="15" patternUnits="userSpaceOnUse"><rect width="15" height="15" class="ft"/><path d="M15 0H0V15" class="fl"/></pattern>' +
      '<pattern id="kk' + n + '" width="12" height="360" patternUnits="userSpaceOnUse"><rect width="12" height="360" class="fk"/><path d="M0 0V360" class="fl"/></pattern>' +
      '</defs>';
    var fill = { tile: 'url(#kt' + n + ')', wood: 'url(#kw' + n + ')', wet: 'url(#kd' + n + ')', deck: 'url(#kk' + n + ')' };
    ROOMS.forEach(function (r) { s += '<rect x="' + r.x + '" y="' + r.y + '" width="' + r.w + '" height="' + r.d + '" fill="' + fill[r.floor] + '"/>'; });
    // קשתות פתיחת הדלתות, כמו בתוכנית
    s += '<g class="swing"><path d="M360 112 A48 48 0 0 1 312 160 M360 112 V160"/><path d="M390 300 A48 48 0 0 0 438 252 M390 300 H438"/>' +
      '<path d="M506 300 A52 52 0 0 0 558 248 M506 300 H558"/><path d="M510 360 A50 50 0 0 1 560 310 M510 360 H560"/></g>';
    // ממצאים על הרצפה
    s += '<g class="k-x" data-f="drain"><path class="puddle" d="M14 300 C40 288 92 292 112 310 C124 326 106 350 70 354 C36 356 12 344 10 326 Z"/>' +
      '<circle class="drainhole" cx="328" cy="336" r="7"/><circle class="drainring" cx="328" cy="336" r="13"/>' +
      '<path class="flow" d="M300 300 C240 304 170 312 112 318"/><path class="flow" d="M300 334 C230 336 170 338 116 336"/></g>';
    s += '<g class="k-x" data-f="tiles"><rect class="hollow" x="120" y="180" width="30" height="30"/><rect class="hollow" x="150" y="180" width="30" height="30"/><rect class="hollow" x="150" y="210" width="30" height="30"/>' +
      '<circle class="tap" cx="165" cy="210" r="9"/><circle class="tap t2" cx="165" cy="210" r="9"/></g>';
    s += '<g class="k-x" data-f="plans"><path class="ghost" d="M372 8 V176"/>' +
      '<path class="dim plan" d="M9 70 H372"/><path class="tick plan" d="M9 62V78M372 62V78"/>' +
      '<path class="dim" d="M9 92 H357"/><path class="tick" d="M9 84V100M357 84V100"/></g>';
    ROOMS.forEach(function (r) { s += '<text class="k-room" x="' + r.lx + '" y="' + r.ly + '" text-anchor="middle">' + (EN ? EN_ROOMS[r.id] : r.name) + '</text>'; });
    return s + '</svg>';
  }

  function build(host, opts) {
    var stage = el('div', 'k-stage');
    var cam = el('div', 'k-cam'), tilt = el('div', 'k-tilt'), world = el('div', 'k-world');
    world.style.width = W + 'px'; world.style.height = D + 'px';
    var floor = el('div', 'k-floor');
    floor.innerHTML = floorSVG(++UID);
    world.appendChild(floor);
    WALLS.forEach(function (w) { wall(world, w); });
    RAILS.forEach(function (r) {
      var len = Math.hypot(r[2] - r[0], r[3] - r[1]), ang = Math.atan2(r[3] - r[1], r[2] - r[0]) * 180 / Math.PI;
      world.appendChild(el('i', 'k-rail', 'width:' + len + 'px;height:' + r[4] + 'px;transform:translate3d(' + r[0] + 'px,' + r[1] + 'px,' + r[4] + 'px) rotateZ(' + ang + 'deg) rotateX(-90deg)'));
      world.appendChild(el('i', 'k-cap rail', 'width:' + len + 'px;height:4px;transform:translate3d(' + r[0] + 'px,' + (r[1] - 2) + 'px,' + r[4] + 'px) rotateZ(' + ang + 'deg)'));
    });
    BOXES.forEach(function (b) { box(world, b); });
    // לוח החשמל על הקיר השמאלי, ושכבות הממצאים על הקירות
    onWall(world, 0, 0, 0, 250, 188, 228, 24, 66, -5, 'k-panel');
    onWall(world, 0, 0, 0, 250, 182, 234, 18, 72, -5.4, 'k-x k-panelx').dataset.f = 'electric';
    var th = onWall(world, 360, 180, 360, 300, 8, 112, 4, 106, 3.6, 'k-x k-thermal');
    th.dataset.f = 'moisture';
    var crack = onWall(world, 0, 0, 600, 0, 120, 232, 4, 118, 5, 'k-x k-crack');
    crack.dataset.f = 'cracks';
    crack.innerHTML = '<svg viewBox="0 0 112 114" preserveAspectRatio="none" aria-hidden="true"><path d="M112 22 L104 18 L99 21 L88 12 L81 14 L70 6 L63 8 L54 0"/><path d="M112 78 L103 84 L99 82 L89 92 L84 90 L74 101 L68 99 L60 114"/></svg>';
    var rail = onWall(world, 0, 360, 360, 360, 282, 300, 0, 52, -5, 'k-x k-raildim');
    rail.dataset.f = 'rail';
    // מישור הסריקה
    var scanwrap = el('i', 'k-scanwrap'), scan = el('i', 'k-scanplane', 'width:' + D + 'px;height:' + (H + 12) + 'px;transform:translate3d(0px,0px,' + (H + 12) + 'px) rotateZ(90deg) rotateX(-90deg)');
    scanwrap.appendChild(scan); world.appendChild(scanwrap);

    // סיכות: עוגן בתוך הדגם, והתווית בשכבה שטוחה מעל, כדי שקיר לא יסתיר אותה
    var layer = el('div', 'k-pins');
    var pins = PINS.map(function (p) {
      var a = el('i', 'k-anchor', 'transform:translate3d(' + p.x + 'px,' + p.y + 'px,' + p.z + 'px)');
      world.appendChild(a);
      var b = el('button', 'k-pin');
      b.type = 'button'; b.dataset.f = p.id; b.dataset.step = p.step; b.tabIndex = -1;
      b.innerHTML = '<span class="k-dot" aria-hidden="true"></span><span class="k-say">' + (EN ? EN_PINS[p.id] : p.say) + '</span>';
      b.setAttribute('aria-label', EN ? EN_PINS[p.id] : p.say);
      layer.appendChild(b);
      // ממצא אחד פעיל בכל פעם (בטלפון רק התווית שלו מוצגת)
      b.addEventListener('click', function () { pins.forEach(function (x) { x.b.classList.toggle('active', x.b === b); }); declutter(); });
      return { p: p, a: a, b: b, s: b.querySelector('.k-say'), side: null, below: false };
    });
    tilt.appendChild(world); cam.appendChild(tilt); stage.appendChild(cam); stage.appendChild(layer);
    host.appendChild(stage);
    world.querySelectorAll('.k-x').forEach(function (x) {
      var f = x.dataset.f, pin = PINS.filter(function (p) { return p.id === f; })[0];
      if (pin) x.style.setProperty('--d', Math.round(1150 * pin.x / W) + 'ms');
    });

    // מיקום התוויות לפי העוגנים
    function place() {
      var r = stage.getBoundingClientRect();
      pins.forEach(function (o) {
        var q = o.a.getBoundingClientRect(), x = q.left - r.left, y = q.top - r.top;
        o.b.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
        o.b.classList.toggle('flip', o.side !== null ? o.side : x > r.width * 0.62);
        o.b.classList.toggle('below', o.below);
      });
    }
    // תוויות שעולות זו על זו, או יוצאות מהדגם: מנסים את הצד השני, ואז מתחת לנקודה
    function declutter() {
      var r = stage.getBoundingClientRect(), taken = [];
      pins.forEach(function (o) { o.side = null; o.below = false; });
      place();
      var shown = pins.filter(function (o) { return o.b.classList.contains('on') && o.s.offsetParent !== null; });
      shown.sort(function (a, b) { return a.b.getBoundingClientRect().left - b.b.getBoundingClientRect().left; });
      shown.forEach(function (o) {
        var dflt = o.b.classList.contains('flip'), best = null;
        [[dflt, false], [!dflt, false], [dflt, true], [!dflt, true]].some(function (c) {
          o.b.classList.toggle('flip', c[0]); o.b.classList.toggle('below', c[1]);
          var q = o.s.getBoundingClientRect();
          var inside = q.left >= r.left - 2 && q.right <= r.right + 2 && q.top >= r.top - 8 && q.bottom <= r.bottom + 8;
          var clear = !taken.some(function (t) { return q.left < t.right + 4 && q.right > t.left - 4 && q.top < t.bottom + 4 && q.bottom > t.top - 4; });
          if (!best) best = { c: c, q: q };
          if (inside && clear) { best = { c: c, q: q }; return true; }
          return false;
        });
        o.side = best.c[0]; o.below = best.c[1];
        o.b.classList.toggle('flip', o.side); o.b.classList.toggle('below', o.below);
        taken.push(o.s.getBoundingClientRect());
      });
    }
    var until = 0, raf = 0, live = false, inView = false, settled = true;
    function tick(t) {
      place();
      if (t >= until && !settled) { settled = true; declutter(); }
      raf = (live || t < until) ? requestAnimationFrame(tick) : 0;
    }
    function follow(ms) { until = Math.max(until, performance.now() + ms); settled = false; if (!raf) raf = requestAnimationFrame(tick); }
    // התוויות זזות עם הדגם רק כשהוא מתנודד; כשהממצאים מוארים הנדנוד נעצר (ב-CSS), ולכן אין צורך לעדכן כל מסגרת
    function setLive() { live = inView && stage.classList.contains('lit') && !opts.sway; if (live && !raf) raf = requestAnimationFrame(tick); }
    function fit() {
      var r = stage.getBoundingClientRect();
      if (!r.width) return;
      var f = Math.min(r.width / 820, r.height / 540);
      stage.style.setProperty('--fit', f.toFixed(3));
      stage.classList.toggle('compact', r.width < 560);
      follow(400);
    }
    fit();
    if (window.ResizeObserver) new ResizeObserver(fit).observe(stage); else addEventListener('resize', fit);
    // נע רק כשהוא על המסך
    if (opts.sway && !REDUCED && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          stage.classList.toggle('swaying', e.isIntersecting);
          inView = e.isIntersecting;
          setLive();
        });
      }).observe(stage);
    }

    var api = {
      el: stage,
      pins: pins,
      go: function (name) {
        var c = CAMS[name] || CAMS.overview;
        stage.style.setProperty('--rx', c.rx + 'deg');
        stage.style.setProperty('--rz', c.rz + 'deg');
        stage.style.setProperty('--s', c.s);
        stage.style.setProperty('--tx', (W / 2 - c.px) + 'px');
        stage.style.setProperty('--ty', (D / 2 - c.py) + 'px');
        stage.dataset.cam = name;
        follow(REDUCED ? 60 : 1400);
      },
      // אילו ממצאים מוארים: 'all', או רשימה מופרדת בפסיקים, או ריק
      show: function (list) {
        var all = list === 'all', ids = all ? [] : String(list || '').split(/[\s,]+/).filter(Boolean);
        stage.classList.toggle('lit', all || ids.length > 0);
        setLive();
        world.querySelectorAll('.k-x').forEach(function (x) { x.classList.toggle('on', all || ids.indexOf(x.dataset.f) > -1); });
        pins.forEach(function (o) {
          var on = all || ids.indexOf(o.p.id) > -1;
          o.b.classList.toggle('on', on);
          o.b.tabIndex = on && opts.focusable ? 0 : -1;
          o.b.setAttribute('aria-hidden', on ? 'false' : 'true');
        });
        // בדגם צר: תווית אחת בכל פעם, כדי שלא יעלו זו על זו. הראשונה נפתחת לבד
        if (stage.classList.contains('compact')) {
          var lit = pins.filter(function (o) { return o.b.classList.contains('on'); });
          if (lit.length && !lit.some(function (o) { return o.b.classList.contains('active'); })) lit[0].b.classList.add('active');
        }
        follow(REDUCED ? 60 : 1400);
      },
      scan: function () {
        if (REDUCED) return;
        stage.classList.remove('scanning'); void stage.offsetWidth; stage.classList.add('scanning');
        setTimeout(function () { stage.classList.remove('scanning'); }, 1700);
      },
      follow: follow
    };
    api.go(opts.cam || 'overview');
    api.show(opts.show || '');
    return api;
  }

  window.KrudoApartment = { build: build, PINS: PINS, CAMS: CAMS, thermal: thermal };

  // חיבור לעמוד: [data-apartment] בונה דגם. data-cam, data-show, data-sway
  function init() {
    var u = thermal();
    document.documentElement.style.setProperty('--k-thermal', 'url("' + u + '")');
    document.querySelectorAll('[data-apartment]').forEach(function (host) {
      var api = build(host, { cam: host.dataset.cam, show: host.dataset.show, sway: host.hasAttribute('data-sway'), focusable: host.hasAttribute('data-focusable') });
      host.classList.add('is-live');
      host._k = api;
      host.dispatchEvent(new CustomEvent('apartment:ready', { bubbles: true, detail: api }));
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
