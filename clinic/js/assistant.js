/* העוזרת של רותם: צ'אט שעונה מהידע של כל האתר (js/knowledge.js).
   מנוע מקומי חכם (תמיד, חינם), ומעליו Claude כשיש שרת (ASSISTANT_API) או כשהעמוד מוצג בתוך claude.ai. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var ROOT = (function () { var s = document.currentScript && document.currentScript.getAttribute('src') || ''; return s.indexOf('../') === 0 ? '../' : ''; })();
  var WA = 'https://wa.me/972545779379';
  var KB = window.KB || [];
  var LINKS = {
    book: { t: 'קביעת תור', h: ROOT + 'index.html#contact' },
    wa: { t: 'וואטסאפ לרותם', h: WA + '?text=' + encodeURIComponent('היי, יש לי שאלה'), ext: true },
    menu: { t: 'תפריט הטיפולים', h: ROOT + 'services.html' },
    shop: { t: 'לחנות', h: ROOT + 'shop.html' },
    acne: { t: 'מדריך: אקנה', h: ROOT + 'treatments/acne.html' },
    pig: { t: 'מדריך: פיגמנטציה', h: ROOT + 'treatments/pigmentation.html' },
    laser: { t: 'מדריך: לייזר', h: ROOT + 'treatments/laser-hair-removal.html' },
    pedi: { t: 'מדריך: פדיקור לסוכרתיים', h: ROOT + 'treatments/diabetic-pedicure.html' },
    map: { t: 'ניווט', h: 'https://waze.com/ul?q=' + encodeURIComponent('המייסדים 67, מושב בניה') + '&navigate=yes', ext: true }
  };

  /* ---------- עיבוד טקסט בעברית ---------- */
  var STOP = ['כמה', 'עולה', 'יש', 'לכם', 'לך', 'מה', 'זה', 'זאת', 'את', 'של', 'אני', 'לי', 'אפשר', 'האם', 'איזה', 'איך', 'רוצה', 'צריך', 'צריכה', 'עושים', 'עושה', 'בשביל', 'על', 'עם', 'גם', 'או', 'אם', 'כן', 'לא', 'הוא', 'היא', 'שלי', 'שלך', 'אצלכם', 'אצלך', 'תודה', 'בבקשה', 'אותי', 'אותו', 'כבר', 'עוד', 'רק', 'מאוד', 'ממש', 'קצת', 'היי', 'שלום', 'בוקר', 'טוב', 'ערב', 'לעשות', 'יכולים', 'יכולה', 'יכול', 'יכולות', 'אפשרי', 'כדאי', 'משהו', 'מישהו', 'דבר', 'בכלל', 'אולי', 'בערך', 'באמת'];
  var SYN = [
    ['אקנה', 'פצעונים', 'פצעון', 'חטטים', 'חטט', 'דלקת', 'עור שמן', 'שומני'],
    ['פיגמנטציה', 'כתמים', 'כתם', 'מלזמה', 'הבהרה', 'כתמי שמש', 'נמשים'],
    ['לייזר', 'הסרת שיער', 'שיער', 'שעווה', 'גילוח', 'ביקיני', 'בית שחי', 'רגליים', 'שפה עליונה', 'שפם', 'גב', 'חזה'],
    ['פדיקור', 'כף הרגל', 'רגל', 'יבלת', 'יבלות', 'פטרת', 'פטריה', 'פטריות', 'ציפורן', 'ציפורניים', 'חודרנית', 'סדקים', 'עקב'],
    ['סוכרת', 'סוכרתי', 'סוכרתית', 'סוכרתיים'],
    ['היריון', 'הריון', 'בהריון', 'מניקה', 'הנקה', 'הריונית', 'לידה'],
    ['קמטים', 'קמט', 'אנטי אייג\'ינג', 'אנטי-אייג\'ינג', 'הזדקנות', 'מתיחה', 'רפיון', 'נפילת עור', 'מיצוק', 'קו לסת', 'צוואר', 'עפעפיים', 'הרמה'],
    ['צלקות', 'צלקת', 'מרקם', 'נקבוביות', 'בורות'],
    ['לחות', 'יובש', 'יבש', 'מתקלף', 'צריבה', 'רגיש', 'רגישות', 'אדמומיות'],
    ['מחיר', 'מחירים', 'עלות', 'מחירון', 'כסף', 'תשלום', 'שקל', 'שקלים', 'זול', 'יקר', 'עולה', 'עולים', 'כמה עולה'],
    ['פילינג', 'חומצות', 'חומצה', 'קילוף'],
    ['מיקרונידלינג', 'מחטים', 'דרמפן', 'sqt', 'ביו מיקרונידלינג'],
    ['פלזמה', 'פלזמה קרה', 'פלזמה חמה'],
    ['אולטרסאונד', 'הייפו', 'hifu', 'סמאס', 'smas'],
    ['אקסוזומים', 'אקסוזום', 'שיקום'],
    ['מוצר', 'מוצרים', 'קרם', 'קרמים', 'סרום', 'סרומים', 'מסכה', 'מסכות', 'ניקוי', 'סבון', 'מנקה', 'הגנה', 'spf', 'מסנן', 'שמן', 'ג\'ל', 'בוסטר'],
    ['קביעת תור', 'תור', 'לקבוע', 'להזמין תור', 'פנוי', 'זמינות', 'מתי אפשר'],
    ['כאב', 'כואב', 'מכאיב', 'נעים', 'צורב'],
    ['תוצאה', 'תוצאות', 'לראות שיפור', 'משתפר', 'עובד'],
    ['הכנה', 'להתכונן', 'מתכוננים', 'מתכוננת', 'הכנות', 'לפני הטיפול', 'מה להביא'],
    ['אחרי', 'אחרי הטיפול', 'החלמה', 'אסור', 'מותר', 'להתאפר', 'איפור', 'שמש'],
    ['גבר', 'גברים', 'לגבר', 'לגברים', 'בעלי'],
    ['גיל', 'ילדה', 'נערה', 'מתבגרת', 'מבוגרת', 'בת'],
  ];
  var PREFIX = ['', 'ב', 'ל', 'מ', 'ה', 'ו', 'ש', 'כ', 'וב', 'ול', 'וה', 'ומ', 'שב', 'של', 'שה', 'לה', 'מה', 'בה', 'כש'];
  var synIndex = {};
  SYN.forEach(function (g, gi) { g.forEach(function (w) { synIndex[norm(w)] = gi; }); });
  SAFETY = [synIndex['היריון'], synIndex['סוכרת'], synIndex['גיל']];
  var TREAT = [synIndex['אקנה'], synIndex['פיגמנטציה'], synIndex['לייזר'], synIndex['פדיקור'], synIndex['קמטים']];
  function norm(s) { return (s || '').toLowerCase().replace(/[֑-ׇ]/g, '').replace(/["'״׳]/g, '').replace(/[^א-תa-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  function stems(t) {
    var v = [t];
    if (/^[בלמהושכ]/.test(t) && t.length >= 4) { var s = t.slice(1); v.push(s); if (/^[בלמהושכ]/.test(s) && s.length >= 4) v.push(s.slice(1)); }
    return v;
  }
  function bigrams(s) { var b = {}; for (var i = 0; i < s.length - 1; i++) b[s.substr(i, 2)] = (b[s.substr(i, 2)] || 0) + 1; return b; }
  function dice(a, b) {
    if (a === b) return 1; if (a.length < 4 || b.length < 4) return 0;
    var A = bigrams(a), B = bigrams(b), inter = 0, na = 0, nb = 0, k;
    for (k in A) { na += A[k]; if (B[k]) inter += Math.min(A[k], B[k]); } for (k in B) nb += B[k];
    return (2 * inter) / (na + nb);
  }
  function isStop(t) { return stems(t).some(function (s) { return STOP.indexOf(s) >= 0; }); }
  function tokens(q) { return norm(q).split(' ').filter(function (t) { return t.length >= 2 && !isStop(t); }); }
  function wordIn(padded, v) { for (var i = 0; i < PREFIX.length; i++) { if (padded.indexOf(' ' + PREFIX[i] + v + ' ') >= 0) return true; } return false; }
  var SAFETY = [];
  /* קבוצות נרדפות שהשאלה נוגעת בהן */
  function topics(q) {
    var n = ' ' + norm(q) + ' ', found = {};
    Object.keys(synIndex).forEach(function (w) {
      for (var i = 0; i < PREFIX.length; i++) { if (n.indexOf(' ' + PREFIX[i] + w + ' ') >= 0) { found[synIndex[w]] = true; break; } }
    });
    return Object.keys(found).map(Number);
  }
  /* אינדקס המאגר, פעם אחת */
  KB.forEach(function (p) {
    p._title = norm(p.title); p._tags = norm(p.tags.join(' ')); p._text = norm(p.text); p._padded = ' ' + p._text + ' ';
    p._words = (p._title + ' ' + p._tags + ' ' + p._text).split(' ').filter(function (w) { return w.length >= 3; });
    p._topics = topics(p.title + ' ' + p.tags.join(' '));
    p._textTopics = topics(p.text);
  });
  function score(p, toks, tops) {
    var s = 0, exact = 0;
    toks.forEach(function (t) {
      var vs = stems(t), hitT = vs.some(function (v) { return p._title.indexOf(v) >= 0; }), hitG = vs.some(function (v) { return p._tags.indexOf(v) >= 0; }), hitX = vs.some(function (v) { return v.length >= 5 ? p._text.indexOf(v) >= 0 : (v.length >= 3 && wordIn(p._padded, v)); });
      if (hitT) { s += 4; exact++; } else if (hitG) { s += 2.5; exact++; } else if (hitX) { s += 1; exact++; }
      else if (t.length >= 4) { var best = 0; for (var i = 0; i < p._words.length && best < .85; i++) { var d = dice(t, p._words[i]); if (d > best) best = d; } if (best >= .75) { s += 2 * best; exact += .5; } }
    });
    var topicHit = 0;
    tops.forEach(function (g) { if (p._topics.indexOf(g) >= 0) { s += 2; topicHit++; } else if (p._textTopics.indexOf(g) >= 0) { s += .7; topicHit++; } });
    if (p.type === 'fact' && topicHit) s += 1;
    /* תחום טיפול אחר מזה שנשאל עליו: הורדה */
    var qTreat = tops.filter(function (g) { return TREAT.indexOf(g) >= 0; });
    if (qTreat.length) { var other = p._topics.some(function (g) { return TREAT.indexOf(g) >= 0 && qTreat.indexOf(g) < 0; }), same = p._topics.some(function (g) { return qTreat.indexOf(g) >= 0; }); if (other && !same) s -= 2.5; }
    tops.forEach(function (g) { if (SAFETY.indexOf(g) >= 0 && p._topics.indexOf(g) >= 0) s += 3; });
    if (p.type === 'product') s *= .8;
    return { s: s, exact: exact, topicHit: topicHit };
  }
  function search(q, extraTopics) {
    var toks = tokens(q), tops = topics(q).concat(extraTopics || []);
    if (!toks.length && !tops.length) return [];
    return KB.map(function (p) { var r = score(p, toks, tops); return { p: p, s: r.s, exact: r.exact, topicHit: r.topicHit }; })
      .filter(function (o) { return o.s >= 2 && (o.exact >= 1 || o.topicHit > 0); })
      .sort(function (a, b) { return b.s - a.s; });
  }
  function has(q, words) { var n = norm(q); return words.some(function (w) { return n.indexOf(norm(w)) >= 0; }); }

  /* ---------- בניית תשובה ---------- */
  var memory = { topics: [], last: null };
  var CATS = [['אקנה ופצעונים', 'אקנה'], ['כתמים ופיגמנטציה', 'פיגמנטציה'], ['קמטים ומתיחה', 'קמטים'], ['הסרת שיער בלייזר', 'לייזר'], ['כף הרגל ופדיקור', 'פדיקור'], ['מוצרים לבית', 'מוצרים']];
  function answer(raw) {
    var q = raw.trim(), n = norm(q);
    if (!n) return { text: 'מה תרצי לדעת? אפשר לשאול על טיפולים, מחירים, שעות או מוצרים.', links: ['menu', 'book'] };
    if (/^(היי|הי|שלום|בוקר טוב|ערב טוב|אהלן|הלו)( רותם)?$/.test(n)) return { text: 'היי, אני העוזרת של רותם. אפשר לשאול אותי על הטיפולים, המחירים, השעות או המוצרים, ואם משהו לא ברור אני מפנה לרותם בוואטסאפ.', links: ['menu', 'book'], chips: ['איזה טיפול מתאים לי?', 'מה המחירים?', 'שעות וכתובת'] };
    if (/^(תודה|תודה רבה|מעולה|סבבה|אוקיי|אוקי|ok|בסדר|יופי|מגניב)( רבה)?$/.test(n)) return { text: 'בשמחה. אם תרצי, אפשר לקבוע אבחון ללא עלות, או לשאול אותי עוד משהו.', links: ['book', 'wa'] };
    if (!topics(q).length && has(q, ['מתאים לי', 'איזה טיפול', 'מה מתאים', 'ממליצה', 'להמליץ', 'לא יודעת מה'])) return { text: 'בשמחה אעזור לכוון. מה הכי מפריע לך?', chips: CATS.map(function (c) { return c[0]; }), flow: 'finder' };
    if (has(q, ['לקבוע', 'קביעת תור', 'תור ל', 'רוצה תור', 'אפשר תור', 'להזמין תור', 'פנוי', 'זמינות', 'מתי אפשר להגיע'])) return { text: 'אשמח לעזור לקבוע. איך קוראים לך?', flow: 'book' };

    var tops = topics(q), toks = tokens(q), shortQ = toks.length <= 3;
    var priceOnly = tops.length === 1 && tops[0] === synIndex['מחיר'];
    var followUp = shortQ && (/^(ו|זה|וזה|גם|מה עם|ואם|אז)( |$)/.test(n) || /^ו[\u05D0-\u05EA]/.test(n) || / זה( |$)/.test(n));
    var extra = (followUp && (!tops.length || priceOnly)) ? memory.topics : [];
    var res = search(q, extra), priceQ = tops.indexOf(synIndex['מחיר']) >= 0;
    var rows = res.filter(function (o) { return o.p.type === 'row'; }), guides = res.filter(function (o) { return o.p.type === 'guide' || o.p.type === 'faq' || o.p.type === 'fact'; }), prods = res.filter(function (o) { return o.p.type === 'product'; });

    /* שאלת מחיר */
    if (priceQ) {
      var topicRows = rows.filter(function (o) { return o.s >= 4 || (extra.length && o.topicHit); }).slice(0, 4);
      if (topicRows.length) { memory.topics = tops.length > 1 ? tops : (extra.length ? extra : tops); return { text: topicRows.map(function (o) { return o.p.title + ': ' + o.p.price; }).join('. ') + '. המחיר הסופי נקבע באבחון, לפי האזור, סוג העור והתוכנית. האבחון עצמו ללא עלות.', links: [topicRows[0].p.link, 'wa'] }; }
      if (prods.length && tops.indexOf(synIndex['מוצר']) >= 0) return productAnswer(prods, 'מחירי מוצרים נמסרים בוואטסאפ. ');
      return { text: 'על איזה טיפול תרצי לדעת? רוב המחירים נקבעים באבחון, שהוא ללא עלות, אבל אפשר לראות מסגרת בתפריט.', chips: ['טיפולי פנים', 'הסרת שיער בלייזר', 'פדיקור טיפולי'], links: ['menu'] };
    }
    /* מוצרים */
    if (tops.indexOf(synIndex['מוצר']) >= 0 && prods.length && (!guides.length || prods[0].s >= guides[0].s)) return productAnswer(prods, '');

    var wantProd = tops.indexOf(synIndex['מוצר']) >= 0;
    if (!wantProd) res = res.filter(function (o) { return o.p.type !== 'product'; }).concat(prods.length && !res.some(function (o) { return o.p.type !== 'product'; }) ? prods : []);
    var best = res[0];
    if (!best) {
      if (memory.last && followUp) return { text: 'לא בטוחה שהבנתי. אפשר לנסח אחרת, או לשאול את רותם ישירות.', links: ['wa'], chips: ['איזה טיפול מתאים לי?', 'מה המחירים?', 'שעות וכתובת'] };
      return null;
    }
    memory.topics = tops.length ? tops : memory.topics; memory.last = best.p;
    var parts = [], links = [];
    /* תשובה ראשית: מדריך, שאלה או עובדה; שורת תפריט כתוספת */
    var primary = guides.length && guides[0].s >= best.s - 1 ? guides[0] : best;
    parts.push(primary.p.type === 'row' ? primary.p.title + '. ' + primary.p.text : primary.p.text); links.push(primary.p.link);
    var second = res.filter(function (o) { return o !== primary && o.p.type !== 'product' && o.s >= primary.s * .6 && !sameText(o.p, primary.p) && (tops.length ? o.topicHit > 0 : false); })[0];
    if (second) { parts.push(second.p.type === 'row' ? second.p.title + ': ' + second.p.text : second.p.text); if (links.indexOf(second.p.link) < 0) links.push(second.p.link); }
    if (primary.p.type !== 'fact' && links.indexOf('book') < 0) links.push('book');
    return { text: parts.join('\n\n'), links: links.slice(0, 3) };
  }
  function sameText(a, b) { return a._text.slice(0, 40) === b._text.slice(0, 40); }
  function productAnswer(prods, prefix) {
    var list = prods.slice(0, 4).map(function (o) { return o.p.title + ' (' + o.p.brand + ')' + (o.p.price ? ', ₪ ' + o.p.price : ''); });
    return { text: prefix + 'מצאתי בחנות: ' + list.join('; ') + '. ' + (prods[0].p.text ? prods[0].p.text.split('.')[0] + '.' : '') + ' להזמנה או התאמה אישית כותבים לרותם בוואטסאפ.', links: ['shop', 'wa'] };
  }
  /* זרימות: מאתר טיפול וקביעת תור */
  var flow = null, book = {};
  function finderAnswer(choice) {
    var map = { 'אקנה ופצעונים': ['אקנה', 'acne'], 'כתמים ופיגמנטציה': ['פיגמנטציה', 'pig'], 'קמטים ומתיחה': ['קמטים אנטי-אייג\'ינג פלזמה חמה אולטרסאונד', 'menu'], 'הסרת שיער בלייזר': ['לייזר הסרת שיער', 'laser'], 'כף הרגל ופדיקור': ['פדיקור יבלות פטריות', 'pedi'], 'מוצרים לבית': ['מוצרים', 'shop'] };
    var m = map[choice]; if (!m) return null;
    if (choice === 'מוצרים לבית') return { text: 'לבחירת מוצרים הכי טוב להשתמש במאתר המוצרים בחנות: שלוש שאלות קצרות על העור, והוא מסנן את המדפים. ואם יש מוצר מסוים שאת מחפשת, שאלי אותי.', links: ['shop'] };
    var res = search(m[0]), rows = res.filter(function (o) { return o.p.type === 'row'; }).slice(0, 3), g = res.filter(function (o) { return o.p.type === 'guide'; })[0];
    var text = (g ? g.p.text + '\n\n' : '') + (rows.length ? 'הטיפולים המתאימים: ' + rows.map(function (o) { return o.p.title + ' (' + o.p.price + ')'; }).join(', ') + '.' : '') + ' ההתאמה הסופית נעשית באבחון, ללא עלות.';
    memory.topics = topics(m[0]);
    return { text: text, links: [m[1], 'book'] };
  }
  function bookStep(text) {
    var n = text.trim();
    if (!book.name) { book.name = n; return { text: 'נעים מאוד ' + n + '. מה הטלפון שלך?' }; }
    if (!book.phone) { if (!/\d{7,}/.test(n.replace(/[-\s]/g, ''))) return { text: 'אני צריכה מספר טלפון עם ספרות, למשל 054-1234567.' }; book.phone = n; return { text: 'ולאיזה טיפול או מטרה?', chips: ['טיפולי פנים', 'הסרת שיער בלייזר', 'פדיקור טיפולי', 'אבחון ראשון'] }; }
    if (!book.goal) { book.goal = n; return { text: 'מתי נוח לך?', chips: ['בוקר', 'צהריים', 'אחר הצהריים', 'גמיש'] }; }
    book.when = n; flow = null;
    var msg = 'היי, אשמח לקבוע תור.\nשם: ' + book.name + '\nטלפון: ' + book.phone + '\nמטרה: ' + book.goal + '\nמתי נוח: ' + book.when;
    var href = WA + '?text=' + encodeURIComponent(msg); book = {};
    return { text: 'מוכן. לחיצה על הכפתור פותחת וואטסאפ עם כל הפרטים, ורותם חוזרת אלייך עם מועד בשעות הפעילות.', custom: [{ t: 'שליחת הבקשה בוואטסאפ', h: href, ext: true }], links: ['book'] };
  }

  /* ---------- ידע ל-Claude (claude.ai) ---------- */
  function knowledge() { return KB.map(function (p) { return '[' + p.type + '] ' + p.title + ': ' + p.text; }).join('\n').slice(0, 60000); }
  var RULES = 'את "העוזרת של רותם", עוזרת וירטואלית באתר של קליניקת הקוסמטיקה של רותם גוטובסקי. עני בעברית, בגוף ראשון נקבה, בטון חם ומקצועי, בקצרה (עד 4 משפטים). השתמשי רק בידע שמופיע כאן. אם שאלה לא מכוסה בידע, או דורשת אבחון רפואי או המלצה אישית, אמרי בכנות שאת לא יודעת ושכדאי לשאול את רותם בוואטסאפ. אל תמציאי מחירים, שעות או טיפולים. כשמתאים, סיימי בהצעה לקבוע אבחון ללא עלות. אל תכתבי כותרות או רשימות ארוכות.\n\nהידע:\n';

  /* ---------- ממשק ---------- */
  var btn = document.createElement('button');
  btn.className = 'asst-btn'; btn.type = 'button'; btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', 'asst'); btn.setAttribute('aria-label', 'פתיחת צ\'אט עם העוזרת של רותם');
  btn.innerHTML = '<span class="asst-btn__avatar"><img src="' + ROOT + 'images/logo-mark.png" alt="" width="36" height="32"><i aria-hidden="true"></i></span><span class="asst-btn__text"><b>העוזרת האישית</b><small>שאלי אותי כל דבר</small></span>';
  var box = document.createElement('div');
  box.className = 'asst'; box.id = 'asst'; box.hidden = true; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'צ\'אט עם העוזרת של רותם');
  box.innerHTML = '<div class="asst__head"><img src="' + ROOT + 'images/logo-mark.png" alt="" width="40" height="36"><div><b>העוזרת של רותם</b><small id="asst-status">עונה מיד, מהידע באתר</small></div><button type="button" class="asst__close" id="asst-close" aria-label="סגירה">×</button></div>' +
    '<div class="asst__log" id="asst-log" aria-live="polite"></div>' +
    '<div class="asst__chips" id="asst-chips"></div>' +
    '<form class="asst__form" id="asst-form"><input type="text" id="asst-in" autocomplete="off" placeholder="מה תרצי לדעת?" aria-label="השאלה שלך" maxlength="300"><button type="submit" aria-label="שליחה"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></button></form>' +
    '<p class="asst__note">המידע כללי ואינו ייעוץ רפואי. לשאלה אישית: <a href="' + LINKS.wa.h + '" target="_blank" rel="noopener">וואטסאפ לרותם</a></p>';
  var nav = $('.quick-links') || document.body;
  nav.appendChild(btn); document.body.appendChild(box);
  var log = $('#asst-log'), chips = $('#asst-chips'), form = $('#asst-form'), input = $('#asst-in'), status = $('#asst-status');
  var turns = [], sampleFn = null, sampleTried = false, busy = false, ctl = null;
  var STARTERS = ['איזה טיפול מתאים לי?', 'מה המחירים?', 'מה כולל האבחון הראשון?', 'שעות וכתובת', 'קביעת תור'];

  function linkRow(keys, custom) {
    var row = document.createElement('div'); row.className = 'asst__links';
    (custom || []).forEach(function (L) { row.appendChild(mkA(L)); });
    (keys || []).forEach(function (k) { if (LINKS[k]) row.appendChild(mkA(LINKS[k])); });
    return row.children.length ? row : null;
  }
  function mkA(L) { var a = document.createElement('a'); a.href = L.h; a.textContent = L.t; if (L.ext) { a.target = '_blank'; a.rel = 'noopener'; } if (L.h.indexOf('#contact') >= 0) a.addEventListener('click', function () { open(false); }); return a; }
  function bubble(role, text, links, custom) {
    var el = document.createElement('div'); el.className = 'asst__msg asst__msg--' + role;
    var p = document.createElement('p'); p.textContent = text; el.appendChild(p);
    var row = linkRow(links, custom); if (row) el.appendChild(row);
    log.appendChild(el); log.scrollTop = log.scrollHeight; return p;
  }
  function setChips(list) {
    chips.innerHTML = '';
    (list || []).forEach(function (t) { var b = document.createElement('button'); b.type = 'button'; b.textContent = t; b.addEventListener('click', function () { ask(t); }); chips.appendChild(b); });
  }
  function nextChips(ans, text) {
    if (ans && ans.chips) return ans.chips;
    var pool = STARTERS.filter(function (s) { return s !== text; });
    if (memory.topics.length && !has(text, ['מחיר'])) pool.unshift('וכמה זה עולה?');
    return pool.slice(0, 3);
  }
  function showLocal(text) {
    var a;
    if (flow === 'book') a = bookStep(text);
    else if (flow === 'finder') { a = finderAnswer(text); flow = null; if (!a) a = answer(text); }
    else a = answer(text);
    if (a && a.flow) flow = a.flow;
    if (a) bubble('bot', a.text, a.links, a.custom);
    else bubble('bot', 'על זה אין לי תשובה מהאתר. הכי טוב לשאול את רותם ישירות, היא עונה בשעות הפעילות.', ['wa', 'book']);
    setChips(nextChips(a, text));
    return a;
  }
  function ask(text) {
    text = (text || '').trim(); if (!text || busy) return;
    bubble('user', text); input.value = ''; setChips([]);
    if (flow) return showLocal(text);
    var local = answer(text);
    if (local && local.flow) { flow = local.flow; bubble('bot', local.text, local.links); setChips(local.chips || []); return; }
    if (window.ASSISTANT_API) return askRemote(text, local);
    if (sampleFn) return askClaude(text, local);
    showLocal(text);
  }
  function finishAI(p, text, reply) {
    turns.push({ role: 'assistant', content: reply });
    var a = answer(text); var row = linkRow(a && a.links ? a.links.slice(0, 2) : ['book']); if (row) p.parentNode.appendChild(row);
  }
  function failAI(p, text, local) {
    turns.pop(); p.parentNode.remove();
    if (local) bubble('bot', local.text, local.links); else bubble('bot', 'לא הצלחתי לענות עכשיו. אפשר לשאול את רותם בוואטסאפ.', ['wa']);
  }
  /* מצב שרת: Claude דרך השרת הקטן (server/README.md) */
  function askRemote(text, local) {
    busy = true; form.classList.add('is-busy');
    turns.push({ role: 'user', content: text });
    var p = bubble('bot', 'חושבת…'); p.parentNode.classList.add('is-thinking');
    ctl = new AbortController();
    var acc = '', failed = false;
    fetch(window.ASSISTANT_API.replace(/\/$/, '') + '/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: turns.slice(-10) }), signal: ctl.signal })
      .then(function (res) {
        if (!res.ok || !res.body) throw new Error('http ' + res.status);
        var reader = res.body.getReader(), dec = new TextDecoder(), buf = '';
        function pump() {
          return reader.read().then(function (r) {
            if (r.done) return;
            buf += dec.decode(r.value, { stream: true });
            var parts = buf.split('\n\n'); buf = parts.pop();
            parts.forEach(function (part) {
              var line = part.split('\n').filter(function (l) { return l.indexOf('data: ') === 0; })[0]; if (!line) return;
              var d; try { d = JSON.parse(line.slice(6)); } catch (e) { return; }
              if (d.error) { failed = true; return; }
              if (d.replace) { acc = d.t; } else if (d.t) { acc += d.t; }
              p.textContent = acc; p.parentNode.classList.remove('is-thinking'); log.scrollTop = log.scrollHeight;
            });
            return pump();
          });
        }
        return pump();
      })
      .then(function () { if (failed || !acc) throw new Error('empty'); finishAI(p, text, acc); })
      .catch(function (e) { if (e && e.name === 'AbortError') { turns.pop(); p.parentNode.remove(); return; } failAI(p, text, local); })
      .then(function () { busy = false; form.classList.remove('is-busy'); setChips(nextChips(null, text)); });
  }
  /* מצב claude.ai */
  function askClaude(text, local) {
    busy = true; form.classList.add('is-busy');
    turns.push({ role: 'user', content: text });
    var p = bubble('bot', 'חושבת…'); p.parentNode.classList.add('is-thinking');
    ctl = new AbortController();
    sampleFn([{ role: 'user', content: RULES + knowledge() }].concat(turns.slice(-8)), { cache: false, modelTier: 'quick', signal: ctl.signal, onText: function (u) { p.textContent = u.text; p.parentNode.classList.remove('is-thinking'); log.scrollTop = log.scrollHeight; } })
      .then(function (r) { finishAI(p, text, r.text); })
      .catch(function (e) {
        if (e && e.code === 'cancelled') { turns.pop(); p.parentNode.remove(); return; }
        if (e && (e.code === 'not_granted' || e.code === 'sampling_disabled' || e.code === 'not_declared' || e.code === 'capability_disabled')) { sampleFn = null; status.textContent = 'עונה מיד, מהידע באתר'; }
        failAI(p, text, local);
      })
      .then(function () { busy = false; form.classList.remove('is-busy'); setChips(nextChips(null, text)); });
  }

  function open(o) {
    box.hidden = !o; btn.setAttribute('aria-expanded', String(o)); document.body.classList.toggle('asst-open', o);
    if (o) {
      if (!log.children.length) { bubble('bot', 'היי, אני העוזרת של רותם. אפשר לשאול אותי על הטיפולים, המחירים, השעות או המוצרים, או לקבוע תור כאן בצ\'אט.', []); setChips(STARTERS); }
      setTimeout(function () { input.focus(); }, 60);
      if (!sampleTried && window.claude && typeof window.claude.use === 'function') {
        sampleTried = true;
        window.claude.use('sample').then(function (fn) { if (fn) { sampleFn = fn; status.textContent = 'עונה עם Claude, מהידע באתר'; } }).catch(function () {});
      }
      if (window.ASSISTANT_API) status.textContent = 'עונה עם Claude, מהידע באתר';
    } else { if (ctl) ctl.abort(); btn.focus(); }
  }
  btn.addEventListener('click', function () { open(box.hidden); });
  $('#asst-close').addEventListener('click', function () { open(false); });
  form.addEventListener('submit', function (e) { e.preventDefault(); ask(input.value); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !box.hidden) open(false); });
  document.addEventListener('click', function (e) { var a = e.target.closest('[data-ask]'); if (a) { e.preventDefault(); open(true); if (a.dataset.ask) ask(a.dataset.ask); } });
  window.RotemAssistant = { answer: answer, search: search, open: open };
})();
