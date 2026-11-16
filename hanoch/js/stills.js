/* גלריית תמונות: לחיצה על תמונה פותחת אותה בגדול, עם מעבר קדימה ואחורה בחצים, במקלדת ובהחלקה */
(function () {
  var btns = [].slice.call(document.querySelectorAll('.pm-still-btn'));
  if (!btns.length) return;
  var dlg = document.createElement('dialog');
  if (typeof dlg.showModal !== 'function') return;
  dlg.className = 'pm-lightbox pm-lb-img';
  dlg.setAttribute('aria-label', 'צפייה בתמונה');
  dlg.innerHTML = '<div class="pm-lb-in"><button type="button" class="pm-lb-x" aria-label="סגירה"><span></span><span></span></button>' +
    '<img alt=""><div class="pm-lb-bar"><p class="pm-lb-t"></p><p class="pm-lb-n" dir="ltr"></p>' +
    '<button type="button" class="pm-lb-nav" data-d="-1" aria-label="התמונה הקודמת">→</button><button type="button" class="pm-lb-nav" data-d="1" aria-label="התמונה הבאה">←</button></div></div>';
  document.body.appendChild(dlg);
  var img = dlg.querySelector('img'), ttl = dlg.querySelector('.pm-lb-t'), num = dlg.querySelector('.pm-lb-n'), cur = 0, last = null;
  function vis() { return btns.filter(function (b) { return b.offsetParent !== null; }); }
  function show(i) {
    var list = vis(); if (!list.length) return;
    cur = (i + list.length) % list.length;
    var b = list[cur];
    img.src = b.dataset.img; img.alt = b.dataset.title + '. תמונה שנוצרה ב-AI';
    ttl.textContent = b.dataset.title; num.textContent = (cur + 1) + ' / ' + list.length;
  }
  btns.forEach(function (b) {
    b.addEventListener('click', function () { last = b; show(vis().indexOf(b)); dlg.showModal(); });
  });
  dlg.querySelectorAll('.pm-lb-nav').forEach(function (n) { n.addEventListener('click', function () { show(cur + +n.dataset.d); }); });
  dlg.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') show(cur + 1);
    if (e.key === 'ArrowRight') show(cur - 1);
  });
  var x0 = null;
  img.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  img.addEventListener('touchend', function (e) { if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) show(cur + (dx < 0 ? 1 : -1)); x0 = null; });
  function shut() { if (dlg.open) dlg.close(); }
  dlg.querySelector('.pm-lb-x').addEventListener('click', shut);
  dlg.addEventListener('click', function (e) { if (e.target === dlg) shut(); });
  dlg.addEventListener('close', function () { img.removeAttribute('src'); if (last) last.focus(); });

  // סינון לפי קטגוריה בעמוד הגלריה
  var chips = document.querySelectorAll('.pm-gal-chips button');
  chips.forEach(function (c) {
    c.addEventListener('click', function () {
      chips.forEach(function (o) { o.setAttribute('aria-pressed', o === c ? 'true' : 'false'); });
      document.querySelectorAll('.pm-gal-sec').forEach(function (s) { s.hidden = c.dataset.cat !== 'all' && s.id !== c.dataset.cat; });
    });
  });
})();
