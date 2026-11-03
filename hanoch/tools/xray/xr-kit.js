/* רנטגן: מנוע משותף. טלפון עם העמוד של העסק, שכבת רנטגן מעליו, וציר זמן שמצייר כל פריים לפי זמן (seek) */
(function () {
  // טלפון: העמוד הרגיל, ומעליו עותק בצילום רנטגן שנחשף מלמעלה עד קו הסריקה
  function makePhone(html, opt) {
    opt = opt || {};
    var ph = document.createElement('div');
    ph.className = 'phone';
    ph.innerHTML = '<div class="screen"><div class="layer normal"><div class="scroller">' + html + '</div></div>' +
      '<div class="layer xr"><div class="scroller">' + html + '</div></div><div class="scanline"></div>' +
      '<div class="callbar"><span>' + (opt.call || 'התקשרו עכשיו') + '</span><span>וואטסאפ</span></div></div>';
    return ph;
  }

  // מצב קבוע (לקרוסלה): גלילה, סריקה ותיקונים שכבר הוחלו
  function setPhone(ph, s) {
    s = s || {};
    var sc = ph.querySelector('.screen');
    ph.querySelectorAll('.scroller').forEach(function (el) { el.style.transform = 'translateY(' + (-scrollOf(ph, s.scroll)) + 'px)'; });
    var scan = s.scan == null ? 0 : s.scan;
    ph.querySelector('.layer.xr').style.clipPath = 'inset(0 0 ' + (100 - scan) + '% 0)';
    var line = ph.querySelector('.scanline');
    line.style.top = scan + '%'; line.style.opacity = scan > 0 && scan < 100 ? 1 : 0;
    ph.querySelector('.callbar').style.transform = s.bar ? 'translateY(0)' : '';
    ph.querySelectorAll('.area').forEach(function (el) { el.style.height = s.area ? el.scrollHeight + 'px' : ''; el.style.opacity = s.area ? 1 : ''; });
    ph.querySelectorAll('.old').forEach(function (el) { el.style.opacity = s.head ? 0 : ''; });
    ph.querySelectorAll('h1.new').forEach(function (el) { el.style.opacity = s.head ? 1 : ''; });
    return sc;
  }

  // כמה לגלול כדי שאלמנט יופיע במרכז המסך. 'top' ו-'bottom' הם הקצוות
  function scrollOf(ph, to) {
    if (to == null || to === 'top') return 0;
    var site = ph.querySelector('.layer.normal .site'), sc = ph.querySelector('.screen');
    var max = Math.max(0, site.offsetHeight - sc.clientHeight);
    if (typeof to === 'number') return Math.min(max, to);
    if (to === 'bottom') return max;
    var el = site.querySelector(to);
    var y = 0; for (var n = el; n && n !== site; n = n.offsetParent) y += n.offsetTop;
    return Math.max(0, Math.min(max, y - sc.clientHeight * 0.42));
  }

  // מסגרת וסימון סביב אלמנט בעמוד, במיקום שלו על המסך באותו רגע
  function boxOf(ph, sel, pad) {
    pad = sel === '.callbar' ? -8 : (pad == null ? 10 : pad); // הפס צמוד לקצה המסך, אז המסגרת בפנים
    var sc = ph.querySelector('.screen').getBoundingClientRect();
    var r = ph.querySelector(sel === '.callbar' ? '.callbar' : '.layer.normal ' + sel).getBoundingClientRect();
    var k = sc.width / ph.querySelector('.screen').offsetWidth; // תיקון אם הדף מוקטן
    return { left: (r.left - sc.left) / k - pad, top: (r.top - sc.top) / k - pad, width: r.width / k + pad * 2, height: r.height / k + pad * 2 };
  }
  function placeMark(ph, mark, sel, pad) {
    var b = boxOf(ph, sel, pad);
    mark.style.left = b.left + 'px'; mark.style.top = b.top + 'px'; mark.style.width = b.width + 'px'; mark.style.height = b.height + 'px';
    return b;
  }

  // ציר הזמן: כל מסלול הוא רשימת נקודות [זמן, {תכונה: ערך}], ובין נקודות יש מעבר רך
  var tracks = [];
  var ease = function (a) { return a < .5 ? 4 * a * a * a : 1 - Math.pow(-2 * a + 2, 3) / 2; };
  function key(target, keys, fn) { tracks.push({ els: typeof target === 'string' ? document.querySelectorAll(target) : (target.length != null ? target : [target]), keys: keys, fn: fn }); }
  function val(keys, t, p) {
    var prev = null, next = null;
    for (var i = 0; i < keys.length; i++) {
      if (!(p in keys[i][1])) continue;
      if (keys[i][0] <= t) prev = keys[i]; else { next = keys[i]; break; }
    }
    if (!prev) return next ? next[1][p] : undefined;
    if (!next) return prev[1][p];
    return prev[1][p] + (next[1][p] - prev[1][p]) * ease((t - prev[0]) / (next[0] - prev[0]));
  }
  function seek(t) {
    tracks.forEach(function (tr) {
      var props = {}; tr.keys.forEach(function (k) { Object.keys(k[1]).forEach(function (p) { props[p] = 1; }); });
      var v = {}; Object.keys(props).forEach(function (p) { v[p] = val(tr.keys, t, p); });
      Array.prototype.forEach.call(tr.els, function (el) {
        if (tr.fn) return tr.fn(el, v, t);
        if (v.o != null) el.style.opacity = v.o;
        if (v.x != null || v.y != null || v.s != null) el.style.transform = 'translate(' + (v.x || 0) + 'px,' + (v.y || 0) + 'px) scale(' + (v.s == null ? 1 : v.s) + ')';
      });
    });
  }

  // לחכות לגופנים לפני שמודדים מיקומים
  function fonts() {
    return Promise.all(['750 40px "HG Handjet"', '400 20px Rubik', '700 20px Rubik', '800 40px "HG Mark"'].map(function (f) { return document.fonts.load(f, 'אבג HG·STUDIO 123'); }));
  }

  window.XR = { fonts: fonts, makePhone: makePhone, setPhone: setPhone, scrollOf: scrollOf, placeMark: placeMark, boxOf: boxOf, key: key, seek: seek, ease: ease };
})();
