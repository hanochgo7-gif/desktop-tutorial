/* כתוביות לפרסומות עם קריינות ("אלף" ו-HG), בכל נגן באתר.
   כשסרט כזה מתנגן עם קול, מתווספת לו רצועת כתוביות בשפת הדף ומוצגת. לולאות שקטות נשארות בלי כתוביות. */
(function () {
  'use strict';
  var EN = document.documentElement.lang === 'en';
  var BASE = '/work/film/';
  // לכל סרט: הרצועות שמתווספות, והראשונה מוצגת
  function tracksFor(src) {
    if (/film\/elef-en(-m)?\.mp4/.test(src)) return [['en', 'English', 'elef.en.vtt', 'captions']];
    if (/film\/elef(-m)?\.mp4/.test(src)) return [['he', 'עברית', 'elef.he.vtt', 'captions']];
    if (/film\/hg(-m)?\.mp4/.test(src)) return EN
      ? [['en', 'English', 'hg.en.vtt', 'captions']]
      : [['he', 'עברית', 'hg.he.vtt', 'subtitles'], ['en', 'English', 'hg.en.vtt', 'captions']];
    // הפרסומות של הסטודיו: הכתוביות בעברית צרובות בסרט, אז רק באנגלית מתווספת רצועה
    var studio = /film\/(studio-night|studio-host)(-m)?\.mp4/.exec(src);
    if (studio) return EN ? [['en', 'English', studio[1] + '.en.vtt', 'subtitles']] : null;
    // HG Fragrance: שני סרטוני היוצרים מדברים באנגלית. בעברית מוצג תרגום, ובאנגלית הכתוביות המקוריות
    var reel = /film\/hgr-(the-entrance|one-spray)\.mp4/.exec(src);
    if (reel) return EN ? [['en', 'English', 'hgr-' + reel[1] + '.en.vtt', 'captions']]
      : [['he', 'עברית', 'hgr-' + reel[1] + '.he.vtt', 'subtitles'], ['en', 'English', 'hgr-' + reel[1] + '.en.vtt', 'captions']];
    return null;
  }
  function srcOf(v) { return v.getAttribute('data-file') || v.getAttribute('data-src') || v.getAttribute('src') || v.currentSrc || ''; }
  function ensure(v) {
    if (!v || v.tagName !== 'VIDEO' || v.muted || v.hasAttribute('data-captions')) return;
    var list = tracksFor(srcOf(v));
    if (!list) return;
    v.setAttribute('data-captions', '');
    list.forEach(function (t, i) {
      var tr = document.createElement('track');
      tr.kind = t[3]; tr.srclang = t[0]; tr.label = t[1]; tr.src = BASE + t[2];
      if (i === 0) tr.default = true;
      v.appendChild(tr);
    });
    // חלק מהדפדפנים לא מפעילים רצועה שנוספה אחרי הטעינה בלי הצבה מפורשת
    setTimeout(function () {
      for (var i = 0; i < v.textTracks.length; i++) v.textTracks[i].mode = i === 0 ? 'showing' : 'disabled';
    }, 0);
  }
  ['play', 'volumechange', 'loadedmetadata'].forEach(function (type) {
    document.addEventListener(type, function (e) { ensure(e.target); }, true);
  });
})();
