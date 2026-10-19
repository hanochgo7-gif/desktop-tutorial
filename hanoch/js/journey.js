/* המסע: כל חלק בעמוד הוא פרק, והגלילה היא הדרך ביניהם.
   - מסלול בצד המסך (במחשב): קו עם תחנה לכל פרק, וניצוץ כתום שנוסע עליו עם הגלילה. לחיצה על תחנה מטיסה אליה.
   - כרזת פרק: כשנכנסים לפרק חדש בפעם הראשונה, מופיעה לרגע כותרת קטנה כמו במשחק ("פרק 02 · הלילה").
   - מספר פרק ענק וחצי שקוף ברקע של כל פרק, שזז מעט לאט יותר מהגלילה.
   - בסוף הדרך: הניצוץ מגיע ליעד ומתפוצץ לאבק כתום.
   הפרקים הם אלמנטים עם data-chapter (התווית). מי שביקש פחות תנועה מקבל את המסלול בלי אנימציה ובלי כרזות. */
(function () {
  'use strict';
  var root = document.documentElement;
  var EN = root.lang === 'en';
  var T = function (he, en) { return EN ? en : he; };
  var els = [].slice.call(document.querySelectorAll('[data-chapter]'));
  if (els.length < 3) return;
  var motion = root.classList.contains('motion');
  var n = els.length, pad = function (i) { return (i < 9 ? '0' : '') + (i + 1); };
  var total = pad(n - 1);

  /* ---------- מספר פרק ברקע ---------- */
  els.forEach(function (el, i) {
    if (i === 0) return; // לפתיחה יש כבר כותרת ענקית משלה
    var num = document.createElement('span');
    num.className = 'jr-num display';
    num.setAttribute('aria-hidden', 'true');
    num.textContent = pad(i);
    el.insertBefore(num, el.firstChild);
    el.classList.add('jr-ch');
  });

  /* ---------- המסלול ---------- */
  var nav = document.createElement('nav');
  nav.className = 'jr';
  nav.setAttribute('aria-label', T('הפרקים בעמוד', 'Chapters on this page'));
  nav.innerHTML = '<p class="jr-count mono" aria-hidden="true"><b>01</b> / ' + total + '</p>' +
    '<div class="jr-track"><i class="jr-fill"></i><i class="jr-spark"></i></div>' +
    '<ol class="jr-stops">' + els.map(function (el, i) {
      var id = el.id || (el.id = 'ch-' + (i + 1));
      return '<li><a href="#' + id + '" style="--t:' + (i / (n - 1)).toFixed(4) + '"><i aria-hidden="true"></i><span>' + el.getAttribute('data-chapter') + '</span></a></li>';
    }).join('') + '</ol>';
  document.body.appendChild(nav);
  var fill = nav.querySelector('.jr-fill'), spark = nav.querySelector('.jr-spark'), count = nav.querySelector('.jr-count b');
  var stops = [].slice.call(nav.querySelectorAll('.jr-stops a'));
  stops.forEach(function (a, i) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      if (window.HG && HG.go) HG.go(els[i]); else els[i].scrollIntoView({ behavior: motion ? 'smooth' : 'auto' });
      quiet = i; // קפיצה בלחיצה: בלי כרזה באמצע הדרך, רק ביעד
    });
  });

  /* ---------- כרזת פרק ---------- */
  var banner = document.createElement('div');
  banner.className = 'jr-banner';
  banner.setAttribute('aria-hidden', 'true');
  banner.innerHTML = '<span class="jr-b-k mono"></span><b class="jr-b-t display"></b>';
  document.body.appendChild(banner);
  var bk = banner.querySelector('.jr-b-k'), bt = banner.querySelector('.jr-b-t'), bTimer = 0;
  var seen = [true], quiet = -1;
  function announce(i) {
    if (!motion || seen[i]) return;
    seen[i] = true;
    var last = i === n - 1;
    bk.textContent = last ? T('הגעתם ליעד', 'You made it') : T('פרק ', 'Chapter ') + pad(i) + ' / ' + total;
    bt.textContent = last ? T('עכשיו תורכם', 'Your move') : els[i].getAttribute('data-chapter');
    banner.classList.toggle('is-final', last);
    banner.classList.remove('is-on'); void banner.offsetWidth; banner.classList.add('is-on');
    clearTimeout(bTimer);
    bTimer = setTimeout(function () { banner.classList.remove('is-on'); }, last ? 2600 : 1900);
    if (window.HG && HG.sfx) HG.sfx.ting(i);
    if (last) burst();
  }

  // הגעה ליעד: הניצוץ מתפזר לאבק כתום
  function burst() {
    var r = spark.getBoundingClientRect();
    if (!r.width) return;
    var box = document.createElement('div');
    box.className = 'jr-burst';
    box.style.left = (r.left + r.width / 2) + 'px'; box.style.top = (r.top + r.height / 2) + 'px';
    for (var k = 0; k < 14; k++) {
      var d = document.createElement('i'), a = k / 14 * Math.PI * 2, dist = 26 + Math.random() * 30;
      d.style.setProperty('--x', (Math.cos(a) * dist).toFixed(1) + 'px');
      d.style.setProperty('--y', (Math.sin(a) * dist).toFixed(1) + 'px');
      box.appendChild(d);
    }
    document.body.appendChild(box);
    setTimeout(function () { box.remove(); }, 1300);
  }

  /* ---------- מדידה ומיקום ---------- */
  var tops = [], vh = 0, cur = -1;
  function measure() {
    vh = window.innerHeight;
    tops = els.map(function (el) { return el.getBoundingClientRect().top + window.scrollY; });
  }
  function update() {
    ticking = false;
    var y = window.scrollY + vh * .45, i = 0;
    while (i < n - 1 && y >= tops[i + 1]) i++;
    var nextTop = i < n - 1 ? tops[i + 1] : document.documentElement.scrollHeight;
    var f = Math.min(1, Math.max(0, (y - tops[i]) / Math.max(1, nextTop - tops[i])));
    if (i === n - 1) f = 0;
    // בתחתית העמוד הפרק האחרון תמיד נחשב "הגענו", גם אם הוא קצר מחצי מסך
    if (window.scrollY + vh >= document.documentElement.scrollHeight - 4) { i = n - 1; f = 0; }
    var p = (i + f) / (n - 1);
    nav.style.setProperty('--p', p.toFixed(4));
    root.classList.toggle('jr-on', window.scrollY > vh * .6);
    if (i !== cur) {
      cur = i;
      count.textContent = pad(i);
      stops.forEach(function (a, k) { a.classList.toggle('is-past', k <= i); if (k === i) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current'); });
      if (quiet === -1 || quiet === i) { if (quiet === i) quiet = -1; announce(i); }
      else seen[i] = true;
    }
    // מספר הפרק ברקע: זז לאט יותר מהדף
    if (motion) els.forEach(function (el, k) {
      if (!k) return;
      var top = tops[k] - window.scrollY;
      if (top < vh && top > -el.offsetHeight) el.style.setProperty('--jr-y', ((top / vh) * 60).toFixed(1) + 'px');
    });
  }
  var ticking = false;
  function tick() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', tick, { passive: true });
  var rt = 0;
  function remeasure() { clearTimeout(rt); rt = setTimeout(function () { measure(); tick(); }, 120); }
  window.addEventListener('resize', remeasure);
  window.addEventListener('load', remeasure);
  if ('ResizeObserver' in window) new ResizeObserver(remeasure).observe(document.body);
  measure(); update();
})();
