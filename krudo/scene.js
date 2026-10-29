/* הדירה השקופה: דגם תלת־ממדי של דירה לדוגמה, בנוי ב-CSS 3D מתוך תוכנית.
   יחידות: 1 = 2 ס"מ בערך. התוכנית 600 על 360. ציר x ימינה, y כלפי הצופה, z למעלה.
   כל ממצא יושב במקום מדויק בדירה, ו"המצלמה" נעה ביניהם לפי התחנה בסיור. */
(function () {
  'use strict';
  var W = 600, D = 360, H = 118;

  // חדרים (רצפה)
  var ROOMS = [
    { id: 'living', name: 'סלון ומטבח', x: 0, y: 0, w: 360, d: 250, floor: 'tile' },
    { id: 'bed', name: 'חדר שינה', x: 360, y: 0, w: 240, d: 180, floor: 'wood' },
    { id: 'bath', name: 'חדר רחצה', x: 360, y: 180, w: 120, d: 120, floor: 'wet' },
    { id: 'mamad', name: 'ממ"ד', x: 480, y: 180, w: 120, d: 120, floor: 'tile' },
    { id: 'hall', name: 'כניסה', x: 360, y: 300, w: 240, d: 60, floor: 'tile' },
    { id: 'balcony', name: 'מרפסת', x: 0, y: 250, w: 360, d: 110, floor: 'deck' }
  ];
  // קירות: [x1, y1, x2, y2, גובה, סוג]. הקירות הקדמיים נמוכים, כמו בבית בובות, כדי לראות פנימה
  var LOW = 26;
  var WALLS = [
    [0, 0, 600, 0, H, 'ext'],          // קיר אחורי
    [0, 0, 0, 250, H, 'ext'],          // קיר שמאלי של הסלון
    [600, 0, 600, 360, LOW, 'ext cut'], // קיר ימני (חתוך)
    [360, 0, 360, 180, H, 'int'],      // סלון / חדר שינה
    [360, 180, 600, 180, H, 'int'],    // חדר שינה / רחצה וממ"ד
    [360, 180, 360, 300, H, 'int wet'],// סלון / רחצה
    [480, 180, 480, 300, H, 'mamad'],  // רחצה / ממ"ד
    [360, 300, 480, 300, LOW, 'int cut'],
    [480, 300, 600, 300, LOW, 'mamad cut'],
    [360, 300, 360, 360, LOW, 'int cut'],
    [360, 360, 600, 360, LOW, 'ext cut'],
    [0, 250, 360, 250, 22, 'sill']      // סף בין הסלון למרפסת (ויטרינה)
  ];
  // רהיטים: תיבות [x, y, w, d, h, סוג]
  var BOXES = [
    [14, 14, 160, 40, 46, 'counter'],
    [190, 150, 120, 46, 30, 'sofa'],
    [420, 30, 150, 110, 26, 'bed'],
    [372, 192, 40, 28, 22, 'sink'],
    [440, 250, 30, 38, 20, 'wc'],
    [500, 196, 80, 24, 60, 'shelf']
  ];
  // נקודות הממצאים: מיקום בתוכנית וגובה (לסיכה שעומדת מול הצופה)
  var PINS = [
    { n: 1, st: 'plans', x: 300, y: 40, z: 0, say: 'המידה בפועל קטנה מהתוכנית' },
    { n: 2, st: 'moisture', x: 362, y: 246, z: 58, say: 'אזור קר בקיר: חשד לרטיבות' },
    { n: 3, st: 'flood', x: 150, y: 318, z: 2, say: 'לאן המים זורמים?' },
    { n: 4, st: 'tiles', x: 115, y: 118, z: 2, say: 'צליל חלול: האריח לא מודבק' },
    { n: 5, st: 'cracks', x: 196, y: 0, z: 104, say: 'סדק בטיח, או בשלד?' },
    { n: 6, st: 'electric', x: 0, y: 208, z: 58, say: 'לוח החשמל: יש ממסר פחת?' },
    { n: 7, st: 'safety', x: 250, y: 360, z: 52, say: 'גובה המעקה והמרווחים' }
  ];
  // מצלמה לכל תחנה: הטיה, סיבוב, זום והזזה (ביחידות תוכנית)
  var CAMS = {
    overview: { rx: 58, rz: -32, s: 1, px: 300, py: 185 },
    plans: { rx: 50, rz: -20, s: 1.6, px: 250, py: 90 },
    moisture: { rx: 60, rz: -58, s: 1.9, px: 360, py: 240 },
    flood: { rx: 54, rz: -24, s: 1.55, px: 185, py: 305 },
    tiles: { rx: 46, rz: -26, s: 1.7, px: 150, py: 150 },
    cracks: { rx: 62, rz: -10, s: 1.75, px: 225, py: 60 },
    electric: { rx: 60, rz: -46, s: 1.9, px: 60, py: 210 },
    safety: { rx: 54, rz: -18, s: 1.5, px: 190, py: 315 }
  };

  function el(tag, cls, css) { var e = document.createElement(tag); if (cls) e.className = cls; if (css) e.style.cssText = css; return e; }

  // קיר: פאה אנכית ומכסה עליון
  function wall(w) {
    var x1 = w[0], y1 = w[1], x2 = w[2], y2 = w[3], h = w[4];
    var len = Math.hypot(x2 - x1, y2 - y1), ang = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    var g = el('div', 'k-wall ' + w[5], 'width:' + len + 'px;height:' + h + 'px;transform:translate3d(' + x1 + 'px,' + y1 + 'px,' + h + 'px) rotateZ(' + ang + 'deg) rotateX(-90deg)');
    g.dataset.len = len;
    var cap = el('div', 'k-cap', 'width:' + len + 'px;transform:translate3d(' + x1 + 'px,' + y1 + 'px,' + h + 'px) rotateZ(' + ang + 'deg) translateY(-4px)');
    return [g, cap];
  }
  // תיבה: מכסה ושתי פאות קדמיות (מספיק לזווית הצפייה)
  function box(b) {
    var x = b[0], y = b[1], w = b[2], d = b[3], h = b[4], k = b[5];
    var out = [];
    out.push(el('div', 'k-box k-top ' + k, 'width:' + w + 'px;height:' + d + 'px;transform:translate3d(' + x + 'px,' + y + 'px,' + h + 'px)'));
    out.push(el('div', 'k-box k-front ' + k, 'width:' + w + 'px;height:' + h + 'px;transform:translate3d(' + x + 'px,' + (y + d) + 'px,' + h + 'px) rotateX(-90deg)'));
    out.push(el('div', 'k-box k-side ' + k, 'width:' + d + 'px;height:' + h + 'px;transform:translate3d(' + (x + w) + 'px,' + y + 'px,' + h + 'px) rotateZ(90deg) rotateX(-90deg)'));
    out.push(el('div', 'k-box k-side2 ' + k, 'width:' + d + 'px;height:' + h + 'px;transform:translate3d(' + x + 'px,' + y + 'px,' + h + 'px) rotateZ(90deg) rotateX(-90deg)'));
    return out;
  }
  // פאה על קיר בגובה מסוים (שכבת ממצא, חלון, לוח חשמל)
  function onWall(x1, y1, x2, y2, from, to, z0, z1, cls) {
    var len = Math.hypot(x2 - x1, y2 - y1), ang = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    var ux = (x2 - x1) / len, uy = (y2 - y1) / len;
    var sx = x1 + ux * from, sy = y1 + uy * from;
    return el('div', cls, 'width:' + (to - from) + 'px;height:' + (z1 - z0) + 'px;transform:translate3d(' + sx + 'px,' + sy + 'px,' + z1 + 'px) rotateZ(' + ang + 'deg) rotateX(-90deg) translateZ(.6px)');
  }

  function build(host) {
    var stage = el('div', 'k-stage');
    var cam = el('div', 'k-cam');
    var world = el('div', 'k-world', 'width:' + W + 'px;height:' + D + 'px');
    // רצפה: SVG אחד עם החדרים, האריחים והשכבות של הממצאים על הרצפה
    var floor = el('div', 'k-floor');
    floor.innerHTML = floorSVG();
    world.appendChild(floor);
    WALLS.forEach(function (w) { wall(w).forEach(function (e) { world.appendChild(e); }); });
    BOXES.forEach(function (b) { box(b).forEach(function (e) { world.appendChild(e); }); });
    // חלונות ופתחים
    world.appendChild(onWall(0, 0, 600, 0, 230, 320, 40, 96, 'k-window'));
    world.appendChild(onWall(0, 0, 600, 0, 440, 540, 40, 96, 'k-window'));
    world.appendChild(onWall(0, 0, 0, 250, 70, 180, 40, 96, 'k-window'));
    world.appendChild(onWall(360, 180, 600, 180, 132, 228, 0, 0, 'k-door'));
    // שכבות הממצאים (נחשפות בעין של בודק / בתחנה)
    world.appendChild(onWall(360, 180, 360, 300, 20, 112, 8, 104, 'k-x k-thermal')).dataset.st = 'moisture';
    // סדק אלכסוני שיוצא מהפינה העליונה של החלון לכיוון התקרה
    world.appendChild(onWall(0, 0, 600, 0, 120, 232, 10, 116, 'k-x k-crack')).dataset.st = 'cracks';
    var crack = world.lastChild; crack.innerHTML = '<svg viewBox="0 0 112 106" preserveAspectRatio="none"><path d="M110 20 L101 15 L97 17 L86 9 L80 10 L70 3 L63 4 L56 0" /><path d="M110 76 L102 82 L98 81 L88 90 L84 89 L74 98 L68 97 L62 106" /><path class="m" d="M86 9 L83 2 M84 89 L88 96" /></svg>';
    world.appendChild(onWall(0, 0, 0, 250, 190, 226, 22, 64, 'k-panel')).dataset.st = 'electric';
    // מעקה המרפסת
    world.appendChild(onWall(0, 360, 360, 360, 0, 360, 0, 52, 'k-rail'));
    world.appendChild(onWall(0, 250, 0, 360, 0, 110, 0, 52, 'k-rail'));
    // סיכות: עוגן שקוף בתוך הדירה, והסיכה עצמה בשכבה רגילה מעל הסצנה, כדי שקיר לא יסתיר אותה
    var layer = el('div', 'k-pins');
    var pins = PINS.map(function (p) {
      var a = el('i', 'k-anchor', 'transform:translate3d(' + p.x + 'px,' + p.y + 'px,' + p.z + 'px)');
      world.appendChild(a);
      var pin = el('button', 'k-pin');
      pin.type = 'button'; pin.dataset.st = p.st;
      pin.innerHTML = '<span class="k-dot">' + p.n + '</span><span class="k-say">' + p.say + '</span>';
      pin.setAttribute('aria-label', 'ממצא ' + p.n + ': ' + p.say);
      layer.appendChild(pin);
      return { a: a, pin: pin };
    });
    var scan = el('div', 'k-scan');
    cam.appendChild(world); stage.appendChild(cam); stage.appendChild(layer); stage.appendChild(scan); host.appendChild(stage);
    function place() {
      var r = stage.getBoundingClientRect();
      pins.forEach(function (p) { var q = p.a.getBoundingClientRect(), x = q.left - r.left; p.pin.style.transform = 'translate(' + x + 'px,' + (q.top - r.top) + 'px)'; p.pin.classList.toggle('flip', x < r.width * .5); });
    }
    // בזמן תנועת המצלמה הסיכות מתעדכנות בכל פריים
    var until = 0, raf = 0;
    function follow(ms) { until = performance.now() + ms; if (!raf) raf = requestAnimationFrame(tick); }
    function tick(t) { place(); raf = t < until ? requestAnimationFrame(tick) : 0; }
    function fit() { var r = stage.getBoundingClientRect(); var nw = r.width < 600; stage.style.setProperty('--fit', Math.min(r.width / (nw ? 600 : 720), r.height / (nw ? 400 : 470)).toFixed(3)); follow(1300); }
    world.addEventListener('transitionend', place);
    fit();
    if (window.ResizeObserver) new ResizeObserver(fit).observe(stage); else addEventListener('resize', fit);
    var api = {
      el: stage,
      go: function (name) {
        var c = CAMS[name] || CAMS.overview;
        stage.style.setProperty('--rx', c.rx + 'deg'); stage.style.setProperty('--rz', c.rz + 'deg');
        stage.style.setProperty('--s', c.s); stage.style.setProperty('--tx', (W / 2 - c.px) + 'px'); stage.style.setProperty('--ty', (D / 2 - c.py) + 'px');
        stage.dataset.st = name;
        pins.forEach(function (p) { p.pin.classList.toggle('on', p.pin.dataset.st === name); });
        follow(1300);
      },
      follow: follow
    };
    api.go('overview');
    return api;
  }

  function floorSVG() {
    var s = '<svg viewBox="0 0 ' + W + ' ' + D + '" width="' + W + '" height="' + D + '" aria-hidden="true">' +
      '<defs>' +
      '<pattern id="kt" width="30" height="30" patternUnits="userSpaceOnUse"><rect width="30" height="30" fill="#eef1f3"/><path d="M30 0H0V30" fill="none" stroke="#d3dade" stroke-width="1"/></pattern>' +
      '<pattern id="kw" width="200" height="16" patternUnits="userSpaceOnUse"><rect width="200" height="16" fill="#e8dccb"/><path d="M0 16H200M70 0V16M150 0V16" stroke="#d6c6ae" stroke-width="1"/></pattern>' +
      '<pattern id="kd" width="18" height="18" patternUnits="userSpaceOnUse"><rect width="18" height="18" fill="#e5e9ec"/><path d="M18 0H0V18" fill="none" stroke="#cdd5da"/></pattern>' +
      '<pattern id="kk" width="14" height="360" patternUnits="userSpaceOnUse"><rect width="14" height="360" fill="#d9cdbb"/><path d="M0 0V360" stroke="#c6b79f"/></pattern>' +
      '<radialGradient id="kwater" cx="35%" cy="55%" r="65%"><stop offset="0" stop-color="#5fb3d3" stop-opacity=".55"/><stop offset="1" stop-color="#2986A5" stop-opacity=".25"/></radialGradient>' +
      '</defs>';
    var fill = { tile: 'url(#kt)', wood: 'url(#kw)', wet: 'url(#kd)', deck: 'url(#kk)' };
    ROOMS.forEach(function (r) { s += '<rect x="' + r.x + '" y="' + r.y + '" width="' + r.w + '" height="' + r.d + '" fill="' + fill[r.floor] + '"/>'; });
    // שכבות ממצאים על הרצפה
    // 3: הצפה במרפסת, המים זורמים לניקוז
    s += '<g class="k-x k-flood" data-st="flood"><rect x="6" y="256" width="348" height="98" fill="url(#kwater)"/>' +
      '<circle class="drain" cx="330" cy="340" r="7"/>' +
      '<path class="flow" d="M60 300 C140 304 230 318 318 336"/><path class="flow" d="M90 334 C170 338 250 342 318 340"/></g>';
    // 4: אריחים חלולים וגלי ההקשה
    s += '<g class="k-x k-tiles" data-st="tiles"><rect class="hol" x="90" y="90" width="30" height="30"/><rect class="hol" x="120" y="90" width="30" height="30"/><rect class="hol" x="90" y="120" width="30" height="30"/>' +
      '<circle class="tap" cx="112" cy="118" r="10"/><circle class="tap t2" cx="112" cy="118" r="10"/>' +
      '<path class="slope" d="M240 290 L170 290"/><path class="slope" d="M240 320 L170 320"/></g>';
    // 1: הקיר בתוכנית לעומת המציאות, ומידות
    s += '<g class="k-x k-plans" data-st="plans"><path class="ghost" d="M372 6 V180"/>' +
      '<path class="dim plan" d="M8 34 H372"/><path class="tick plan" d="M8 26V42M372 26V42"/>' +
      '<path class="dim" d="M8 56 H360"/><path class="tick" d="M8 48V64M360 48V64"/></g>';
    // 7: מעקה, מידת הגובה
    s += '<g class="k-x k-safety" data-st="safety"><path class="dim" d="M40 352 H320"/></g>';
    // שמות החדרים
    ROOMS.forEach(function (r) { s += '<text class="k-room" x="' + (r.x + r.w / 2) + '" y="' + (r.y + r.d / 2 + 6) + '" text-anchor="middle">' + r.name + '</text>'; });
    return s + '</svg>';
  }

  window.KrudoScene = { build: build, PINS: PINS, CAMS: CAMS };
})();
