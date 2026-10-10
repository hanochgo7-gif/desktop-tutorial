/* תנועה פיזיקלית קטנה, בלי תלויות: קפיצים שאפשר לעצור ולהפוך באמצע, תאוצה וגבולות רכים.
   לפי העקרונות של אפל (Designing Fluid Interfaces): כל תנועה מתחילה מהערך שעל המסך, ממשיכה את המהירות של האצבע,
   וחוזרת אחורה בלי קפיצה. שני פרמטרים במקום מסה וקשיחות: damping (1 = בלי קפיצה, 0.8 = קפיצה קטנה) ו-response (שניות).
   window.HGFluid.spring({ x: 0, o: 1 }, { onUpdate: fn }) -> .to({ x: 100 }, { damping, response, velocity, done }) */
(function () {
  var root = document.documentElement;
  var mq = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  function reduce() { return !!(mq && mq.matches) || root.classList.contains('a11y-no-motion'); }

  function spring(init, opts) {
    opts = opts || {};
    var S = {}, raf = 0, last = 0, cfg = { z: 1, r: 0.35 }, done = null;
    var prec = opts.precision || {};
    Object.keys(init).forEach(function (k) { S[k] = { x: init[k], v: 0, t: init[k] }; });
    function values() { var o = {}; for (var k in S) o[k] = S[k].x; return o; }
    function settle() { for (var k in S) { S[k].x = S[k].t; S[k].v = 0; } }
    function tick(now) {
      var dt = Math.min(0.064, Math.max(0.001, (now - last) / 1000)); last = now;
      var w = 2 * Math.PI / cfg.r, K = w * w, C = 2 * cfg.z * w, moving = false;
      var n = Math.ceil(dt / (1 / 240)), h = dt / n;
      for (var k in S) {
        var s = S[k], e = prec[k] || 0.01;
        for (var i = 0; i < n; i++) { s.v += (-K * (s.x - s.t) - C * s.v) * h; s.x += s.v * h; }
        if (Math.abs(s.x - s.t) > e || Math.abs(s.v) > e * 10) moving = true;
      }
      if (!moving) settle();
      if (opts.onUpdate) opts.onUpdate(values());
      if (moving) raf = requestAnimationFrame(tick);
      else { raf = 0; var cb = done; done = null; if (cb) cb(); }
    }
    return {
      // יעד חדש: ממשיכים מהערך והמהירות של עכשיו, כך שאפשר להפוך כיוון באמצע בלי קפיצה
      to: function (target, o) {
        o = o || {};
        cfg.z = o.damping == null ? 1 : o.damping; cfg.r = o.response || 0.35;
        for (var k in target) if (S[k]) S[k].t = target[k];
        if (o.velocity) for (var j in o.velocity) if (S[j]) S[j].v = o.velocity[j];
        done = o.done || null;
        if (reduce() || o.instant) { if (raf) cancelAnimationFrame(raf); raf = 0; settle(); if (opts.onUpdate) opts.onUpdate(values()); var cb = done; done = null; if (cb) cb(); return this; }
        if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
        return this;
      },
      set: function (vals) { for (var k in vals) if (S[k]) { S[k].x = S[k].t = vals[k]; S[k].v = 0; } if (opts.onUpdate) opts.onUpdate(values()); return this; },
      get: function (k) { return S[k].x; },
      velocity: function (k) { return S[k].v; },
      busy: function () { return !!raf; },
      stop: function () { if (raf) cancelAnimationFrame(raf); raf = 0; done = null; }
    };
  }

  // לאן הזריקה תגיע: אותה דעיכה כמו גלילה ב-iOS (המהירות בפיקסלים לשנייה)
  function project(v, rate) { rate = rate || 0.998; return (v / 1000) * rate / (1 - rate); }
  // גבול רכב: ככל שמושכים רחוק יותר מעבר לקצה, האלמנט זז פחות
  function rubber(over, dim, c) { c = c || 0.55; return (over * dim * c) / (dim + c * Math.abs(over)); }
  // מהירות מתוך ההיסטוריה של התנועות האחרונות (פיקסלים לשנייה)
  function tracker() {
    var h = [];
    return {
      add: function (v) { var t = performance.now(); h.push([t, v]); while (h.length > 2 && t - h[0][0] > 100) h.shift(); },
      velocity: function () { if (h.length < 2) return 0; var a = h[0], b = h[h.length - 1], dt = (b[0] - a[0]) / 1000; return dt > 0 ? (b[1] - a[1]) / dt : 0; },
      reset: function () { h = []; }
    };
  }
  // רטט קצר רק לרגעים שיש להם משמעות (Android; באייפון הדפדפן מתעלם)
  function haptic(ms) { try { if (navigator.vibrate && !reduce()) navigator.vibrate(ms || 8); } catch (e) { } }

  window.HGFluid = { spring: spring, project: project, rubber: rubber, tracker: tracker, haptic: haptic, reduce: reduce };
})();
