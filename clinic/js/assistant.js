/* העוזרת של רותם: צ'אט שעונה על שאלות מהידע באתר.
   עובד בשני מצבים: מנוע מקומי (תמיד) ו-Claude כשהעמוד מוצג בתוך claude.ai. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var ROOT = (function () { var s = document.currentScript && document.currentScript.getAttribute('src') || ''; return s.indexOf('../') === 0 ? '../' : ''; })();
  var WA = 'https://wa.me/972545779379';
  var FACTS = {
    name: 'רותם גוטובסקי, קוסמטיקאית פרא-רפואית מוסמכת (P.M.E), בוגרת בתי הספר של חוה זינגבוים',
    address: 'המייסדים 67, מושב בניה',
    hours: 'ראשון עד חמישי 9:00 עד 19:00. שישי ושבת סגור',
    phone: '054-577-9379',
    first: 'האבחון בביקור הראשון ללא עלות, כחצי שעה, בלי התחייבות',
    pay: 'מזומן, אשראי וביט',
    shop: 'מוצרי הבית של חוה זינגבוים, KLAPP, Arkana, SQT ו-Dr. Spicule. מזמינים בוואטסאפ, איסוף מהקליניקה ללא עלות או משלוח עד הבית',
    laser: 'הסרת שיער בלייזר לכל אזורי הגוף, לנשים ולגברים, מכויל לכל גווני העור כולל כהה מאוד. טיפול ניסיון על אזור קטן ללא עלות לפני כל סדרה. סדרה של 6 עד 8 טיפולים',
    pedi: 'פדיקור טיפולי, לא פדיקור יופי: יבלות, פטריות, ציפורניים חודרניות, מותאם לסוכרתיים. כלים חד-פעמיים או מעוקרים',
    face: 'טיפולי פנים לפי מטרה: אקנה, צלקות, פיגמנטציה, אנטי-אייג\'ינג, לחות. טכנולוגיות: פלזמה קרה וחמה, פילינג חכם, מיקרונידלינג, ביו-מיקרונידלינג SQT, אקסוזומים, אולטרסאונד',
    cancel: 'ביטול או שינוי תור: בהודעת וואטסאפ עד 24 שעות לפני המועד',
    parking: 'חניה חופשית ברחוב ליד הקליניקה'
  };
  var FAQ = [
    ['לייזר על עור כהה', 'כן. אני מכיילת את המכשיר לגוון העור, וגם עור כהה מאוד מטופל בבטחה. לפני הסדרה אני עושה טיפול ניסיון על אזור קטן, ללא עלות.'],
    ['פדיקור לסוכרתיים', 'כן, וזה אפילו מומלץ. אני עובדת עם חומרים שמותאמים לסוכרתיים, בודקת תחושה וזרימת דם לפני כל טיפול, ולא משתמשת בחומצות אגרסיביות.'],
    ['הבדל בין מיקרונידלינג לביו-מיקרונידלינג', 'במיקרונידלינג קלאסי מחטים מתכתיות פותחות תעלות זעירות להחדרת חומרים. בביו-מיקרונידלינג (SQT) מוחדרות מחטים ננו-ביולוגיות שנספגות בעור ומעוררות חידוש של האפידרמיס, בלי מכשיר.'],
    ['אדמומיות אחרי פילינג', 'תלוי בריכוז. ב-20% האדמומיות חולפת תוך שעות. ב-60% ייתכן קילוף של שלושה עד חמישה ימים, ואני מתכננת אותו איתך מראש.'],
    ['הזמנת מוצרים', 'לוחצים על "הזמנה בוואטסאפ" ליד המוצר. אני מאשרת זמינות, מקבלת תשלום בביט או באשראי, ושולחת או מכינה לאיסוף מהקליניקה.'],
    ['כמה טיפולים צריך בלייזר', 'רוב הלקוחות רואות הפחתה משמעותית אחרי שלושה עד ארבעה טיפולים, והסדרה המלאה היא שישה עד שמונה, במרווח של ארבעה עד שמונה שבועות לפי האזור.'],
    ['כמה זמן עד שרואים תוצאה באקנה', 'בדרך כלל אחרי שניים עד שלושה מפגשים הדלקת נרגעת ויש פחות התפרצויות. שיפור במרקם ובכתמים לוקח יותר זמן, לרוב לאורך כל הסדרה.'],
    ['פיגמנטציה בקיץ', 'אפשר, אבל עדיף בחורף. בקיץ אני עובדת בריכוזים נמוכים יותר ומקפידה על הגנה מלאה מהשמש.'],
    ['הכנה ללייזר', 'מגלחים את האזור יום לפני, לא מורטים ולא עושים שעווה, ונמנעים משמש בשבועיים שלפני. מגיעות עם עור נקי, בלי קרם.'],
    ['היריון', 'בהיריון והנקה חלק מהחומרים והטכנולוגיות לא מתאימים. כתבי לי בוואטסאפ מה המצב ואתאים לך פרוטוקול עדין, או נדחה לאחרי.']
  ];
  var LINKS = {
    book: { t: 'קביעת תור', h: ROOT + 'index.html#contact' },
    wa: { t: 'וואטסאפ', h: WA + '?text=' + encodeURIComponent('היי, יש לי שאלה'), ext: true },
    menu: { t: 'תפריט הטיפולים', h: ROOT + 'services.html' },
    shop: { t: 'לחנות', h: ROOT + 'shop.html' },
    acne: { t: 'מדריך: אקנה', h: ROOT + 'treatments/acne.html' },
    pig: { t: 'מדריך: פיגמנטציה', h: ROOT + 'treatments/pigmentation.html' },
    laser: { t: 'מדריך: לייזר', h: ROOT + 'treatments/laser-hair-removal.html' },
    pedi: { t: 'מדריך: פדיקור לסוכרתיים', h: ROOT + 'treatments/diabetic-pedicure.html' },
    map: { t: 'ניווט', h: 'https://waze.com/ul?q=' + encodeURIComponent('המייסדים 67, מושב בניה') + '&navigate=yes', ext: true }
  };

  function norm(s) { return (s || '').toLowerCase().replace(/[֑-ׇ]/g, '').replace(/[^א-תa-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  function has(q, words) { return words.some(function (w) { return q.indexOf(w) >= 0; }); }
  function priceText(r) { return r.price === 0 ? 'ללא עלות' : r.price ? '₪ ' + r.price : 'לפי אבחון'; }
  function rowText(r) {
    var bits = [];
    if (r.includes) bits.push(r.includes);
    if (r.who) bits.push('מתאים ל: ' + r.who);
    if (r.duration) bits.push('משך: ' + r.duration);
    if (r.series) bits.push('סדרה: ' + r.series + (r.interval ? ', מרווח ' + r.interval : ''));
    bits.push('מחיר: ' + priceText(r));
    return r.name + '. ' + bits.join('. ') + '.';
  }
  function allRows() {
    var out = [];
    (window.SERVICES || []).forEach(function (c) { c.groups.forEach(function (g) { g.rows.forEach(function (r) { out.push({ cat: c.title, r: r }); }); }); });
    return out;
  }
  var STOP = ['כמה','עולה','מחיר','יש','לכם','לך','מה','זה','את','של','אני','לי','מתאים','מתאימה','אפשר','האם','איזה','איך','רוצה','צריך','צריכה','עושים','עושה','בשביל','טיפול','טיפולים','מוצר','מוצרים','לעור','עור'];
  /* מילים עם אותיות שימוש בתחילתן (בביקיני, לכתמים) נבדקות גם בלי האות הראשונה */
  function toks(q) {
    var out = [];
    q.split(' ').forEach(function (t) {
      if (t.length < 3 || STOP.indexOf(t) >= 0) return;
      var v = [t]; if (/^[בלמהושכ]/.test(t) && t.length >= 4) { var s = t.slice(1); if (STOP.indexOf(s) < 0) v.push(s); if (/^[בלמהושכ]/.test(s) && s.length >= 4) v.push(s.slice(1)); }
      out.push(v);
    });
    return out;
  }
  function hit(hay, variants) { return variants.some(function (v) { return hay.indexOf(v) >= 0; }); }
  function scored(list, fields, q, nameField) {
    var ts = toks(q); if (!ts.length) return [];
    return list.map(function (x) {
      var name = norm(x[nameField] || ''), rest = norm(fields.map(function (f) { return Array.isArray(x[f]) ? x[f].join(' ') : (x[f] || ''); }).join(' '));
      var s = 0; ts.forEach(function (t) { if (hit(name, t)) s += 3; else if (hit(rest, t)) s += 1; });
      return { x: x, s: s };
    }).filter(function (o) { return o.s > 0; }).sort(function (a, b) { return b.s - a.s; });
  }
  function findRows(q) { return scored(allRows().map(function (o) { o.name = o.r.name; o.who = o.r.who; o.includes = o.r.includes; o.tech = o.r.tech; return o; }), ['who', 'includes', 'tech', 'cat'], q, 'name').slice(0, 3).map(function (o) { return o.x; }); }
  function findProducts(q) { return scored(window.PRODUCTS || [], ['brand', 'category', 'concerns', 'en', 'desc'], q, 'name').slice(0, 4).map(function (o) { return o.x; }); }

  /* המנוע המקומי: מחזיר {text, links[]} */
  function localAnswer(raw) {
    var q = norm(raw);
    if (!q) return { text: 'מה תרצי לדעת? אפשר לשאול על טיפולים, מחירים, שעות, כתובת או מוצרים.', links: ['book', 'menu'] };
    if (has(q, ['שלום', 'היי', 'הי ', 'בוקר טוב', 'ערב טוב']) && q.length < 14) return { text: 'היי, אני העוזרת של רותם. אפשר לשאול אותי על הטיפולים, המחירים, השעות או המוצרים, ואם משהו לא ברור אני מפנה לרותם בוואטסאפ.', links: ['menu', 'book'] };
    if (has(q, ['שעות', 'פתוח', 'פתוחים', 'מתי אתם', 'שעות פעילות', 'שבת', 'שישי'])) return { text: 'שעות הפעילות: ' + FACTS.hours + '. תורים נקבעים מראש.', links: ['book', 'wa'] };
    if (has(q, ['כתובת', 'איפה', 'מיקום', 'להגיע', 'חניה', 'חנייה', 'ניווט'])) return { text: 'הקליניקה ברחוב ' + FACTS.address + '. ' + FACTS.parking + '.', links: ['map', 'book'] };
    if (has(q, ['טלפון', 'מספר', 'להתקשר', 'וואטסאפ', 'ווטסאפ'])) return { text: 'הטלפון של רותם: ' + FACTS.phone + '. הכי מהיר לכתוב בוואטסאפ, היא עונה בשעות הפעילות ובדרך כלל תוך שעה.', links: ['wa'] };
    if (has(q, ['לבטל', 'ביטול', 'לשנות תור', 'לדחות'])) return { text: FACTS.cancel + '. שולחים הודעה ורותם מוצאת מועד חדש.', links: ['wa'] };
    if (has(q, ['תשלום', 'ביט', 'אשראי', 'מזומן', 'לשלם'])) return { text: 'אפשר לשלם ב' + FACTS.pay + '.', links: ['book'] };
    if (has(q, ['אבחון', 'ביקור ראשון', 'פעם ראשונה', 'התחייבות'])) return { text: FACTS.first + '. באבחון רותם בודקת את העור, שואלת מה ניסית עד היום ובונה תוכנית עם מספר מפגשים ומחיר ידועים מראש.', links: ['book'] };
    if (has(q, ['היריון', 'הריון', 'בהריון', 'מניקה', 'הנקה'])) return { text: FAQ[9][1], links: ['wa'] };
    if (has(q, ['סוכרת', 'סוכרתי'])) return { text: FAQ[1][1] + ' ' + FACTS.pedi + '.', links: ['pedi', 'book'] };
    if (has(q, ['עור כהה', 'כהה'])) return { text: FAQ[0][1], links: ['laser', 'book'] };
    if (has(q, ['כמה טיפולים']) && has(q, ['לייזר', 'שיער'])) return { text: FAQ[5][1], links: ['laser', 'menu'] };
    if (has(q, ['להתכונן', 'הכנה', 'לפני הלייזר', 'לגלח'])) return { text: FAQ[8][1], links: ['laser'] };
    if (has(q, ['אדום', 'אדמומיות', 'קילוף', 'אחרי פילינג'])) return { text: FAQ[3][1], links: ['menu'] };
    if (has(q, ['קיץ']) && has(q, ['כתם', 'כתמים', 'פיגמנט', 'הבהרה'])) return { text: FAQ[7][1], links: ['pig'] };
    if (has(q, ['ביו מיקרונידלינג', 'ביו-מיקרונידלינג', 'sqt', 'הבדל'])) return { text: FAQ[2][1], links: ['menu'] };
    if (has(q, ['מחיר', 'מחירים', 'עולה', 'כמה זה', 'מחירון', 'עלות'])) {
      var rows = findRows(q);
      if (rows.length) return { text: rows.map(function (x) { return x.r.name + ': ' + priceText(x.r) + (x.r.duration ? ' (' + x.r.duration + ')' : ''); }).join('. ') + '. המחיר הסופי נקבע באבחון, לפי האזור והתוכנית.', links: ['menu', 'wa'] };
      return { text: 'את המחירים רותם קובעת באבחון לפי האזור, סוג העור והתוכנית. ' + FACTS.first + '. מחירון מלא אפשר לקבל ממנה בוואטסאפ.', links: ['menu', 'wa'] };
    }
    if (has(q, ['אקנה', 'פצעונים', 'פצעון', 'חטטים', 'שמן'])) { var a = findRows('אקנה'); return { text: FAQ[6][1] + (a.length ? ' ' + rowText(a[0].r) : ''), links: ['acne', 'book'] }; }
    if (has(q, ['כתם', 'כתמים', 'פיגמנט', 'מלזמה', 'הבהרה'])) { var g = findRows('פיגמנטציה'); return { text: 'בכתמים רותם עובדת בפילינג הבהרה, החדרת חומרים ותוכנית הגנה לבית, כי בלי הגנה הכתמים חוזרים.' + (g.length ? ' ' + rowText(g[0].r) : ''), links: ['pig', 'book'] }; }
    if (has(q, ['לייזר', 'שיער', 'ביקיני', 'בית שחי', 'רגליים', 'שפה עליונה'])) { var l = findRows(q.indexOf('לייזר') >= 0 && q.length < 10 ? 'לייזר' : q); return { text: FACTS.laser + '.' + (l.length ? ' ' + l.map(function (x) { return rowText(x.r); }).join(' ') : ''), links: ['laser', 'menu', 'book'] }; }
    if (has(q, ['פדיקור', 'יבלת', 'יבלות', 'פטריה', 'פטריות', 'ציפורן', 'ציפורניים', 'כף הרגל', 'רגל'])) { var p = findRows(q); return { text: FACTS.pedi + '.' + (p.length ? ' ' + p.map(function (x) { return rowText(x.r); }).join(' ') : ''), links: ['pedi', 'menu', 'book'] }; }
    if (has(q, ['קמט', 'קמטים', 'מתיחה', 'הזדקנות', 'אנטי', 'רפיון', 'צוואר', 'עפעפיים'])) { var w = findRows('אנטי-אייג\'ינג פלזמה חמה אולטרסאונד'); return { text: 'לקמטים ורפיון יש אצל רותם שלושה כלים: פלזמה חמה למתיחה ממוקדת, אולטרסאונד לשריר התחתון ולקו הלסת, ופרוטוקול אנטי-אייג\'ינג משולב. ' + w.map(function (x) { return rowText(x.r); }).join(' '), links: ['menu', 'book'] }; }
    if (has(q, ['צלקת', 'צלקות', 'מיקרונידלינג', 'אקסוזומים'])) { var s = findRows('צלקות מיקרונידלינג'); return { text: s.map(function (x) { return rowText(x.r); }).join(' ') || FACTS.face, links: ['acne', 'menu'] }; }
    if (has(q, ['מוצר', 'מוצרים', 'קרם', 'סרום', 'מסכה', 'חנות', 'משלוח', 'איסוף', 'מותג', 'קלאפ', 'klapp', 'ארקנה', 'arkana', 'זינגבוים'])) {
      var pr = findProducts(q);
      return { text: FACTS.shop + '.' + (pr.length ? ' מצאתי: ' + pr.map(function (p) { return p.name + ' (' + p.brand + ')'; }).join(', ') + '.' : ''), links: ['shop', 'wa'] };
    }
    if (has(q, ['טיפול', 'טיפולים', 'מה יש', 'מה אתם', 'מה את', 'שירותים', 'מתאים לי'])) { var r2 = findRows(q); return { text: (r2.length ? r2.map(function (x) { return rowText(x.r); }).join(' ') : FACTS.face + '. ' + FACTS.laser + '. ' + FACTS.pedi + '.') + ' ' + FACTS.first + '.', links: ['menu', 'book'] }; }
    if (has(q, ['מי את', 'רותם', 'הסמכה', 'ניסיון', 'תעודות'])) return { text: FACTS.name + '. ההכשרה הפרא-רפואית כוללת ביולוגיה, אנטומיה, פיזיולוגיה וכימיה, עם התמחות בטכנולוגיות מתקדמות: RF, פוטותרפיה ומיקרונידלינג.', links: ['book'] };
    var r3 = findRows(q), p3 = findProducts(q);
    if (r3.length) return { text: r3.map(function (x) { return rowText(x.r); }).join(' '), links: ['menu', 'book'] };
    if (p3.length) return { text: 'מצאתי בחנות: ' + p3.map(function (p) { return p.name + ' (' + p.brand + ')'; }).join(', ') + '.', links: ['shop'] };
    return null;
  }

  /* ידע מרוכז ל-Claude */
  function knowledge() {
    var k = ['עובדות: ' + FACTS.name + '. כתובת: ' + FACTS.address + '. שעות: ' + FACTS.hours + '. טלפון: ' + FACTS.phone + '. ' + FACTS.first + '. תשלום: ' + FACTS.pay + '. ' + FACTS.cancel + '. ' + FACTS.parking + '.',
      'תחומים: ' + FACTS.face + '. ' + FACTS.laser + '. ' + FACTS.pedi + '. חנות: ' + FACTS.shop + '.',
      'שאלות נפוצות: ' + FAQ.map(function (f) { return f[0] + ': ' + f[1]; }).join(' | '),
      'תפריט הטיפולים: ' + allRows().map(function (x) { return '[' + x.cat + '] ' + rowText(x.r); }).join(' | ')];
    var byBrand = {};
    (window.PRODUCTS || []).forEach(function (p) { (byBrand[p.brand] = byBrand[p.brand] || []).push(p.name + (p.concerns ? ' (' + p.concerns.join(', ') + ')' : '')); });
    k.push('מוצרים בחנות: ' + Object.keys(byBrand).map(function (b) { return b + ': ' + byBrand[b].join('; '); }).join(' | '));
    return k.join('\n').slice(0, 20000);
  }
  var RULES = 'את "העוזרת של רותם", עוזרת וירטואלית באתר של קליניקת הקוסמטיקה של רותם גוטובסקי. עני בעברית, בגוף ראשון נקבה, בטון חם ומקצועי, בקצרה (עד 4 משפטים). השתמשי רק בידע שמופיע כאן. אם שאלה לא מכוסה בידע, או דורשת אבחון רפואי או המלצה אישית, אמרי בכנות שאת לא יודעת ושכדאי לשאול את רותם בוואטסאפ. אל תמציאי מחירים, שעות או טיפולים. כשמתאים, סיימי בהצעה לקבוע אבחון ללא עלות. אל תכתבי כותרות או רשימות ארוכות.\n\nהידע:\n';

  /* ממשק */
  var btn = document.createElement('button');
  btn.className = 'asst-btn'; btn.type = 'button'; btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', 'asst'); btn.setAttribute('aria-label', 'פתיחת צ\'אט עם העוזרת של רותם');
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H9l-5 4z"/><path d="M8 9h8M8 13h5"/></svg><span>שאלה?</span>';
  var box = document.createElement('div');
  box.className = 'asst'; box.id = 'asst'; box.hidden = true; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'צ\'אט עם העוזרת של רותם');
  box.innerHTML = '<div class="asst__head"><img src="' + ROOT + 'images/logo.png" alt="" width="40" height="36"><div><b>העוזרת של רותם</b><small id="asst-status">עונה מיד, מהידע באתר</small></div><button type="button" class="asst__close" id="asst-close" aria-label="סגירה">×</button></div>' +
    '<div class="asst__log" id="asst-log" aria-live="polite"></div>' +
    '<div class="asst__chips" id="asst-chips"></div>' +
    '<form class="asst__form" id="asst-form"><input type="text" id="asst-in" autocomplete="off" placeholder="מה תרצי לדעת?" aria-label="השאלה שלך" maxlength="300"><button type="submit" aria-label="שליחה"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></button></form>' +
    '<p class="asst__note">המידע כללי ואינו ייעוץ רפואי. לשאלה אישית: <a href="' + LINKS.wa.h + '" target="_blank" rel="noopener">וואטסאפ לרותם</a></p>';
  var nav = $('.quick-links') || document.body;
  nav.appendChild(btn); document.body.appendChild(box);
  var log = $('#asst-log'), chips = $('#asst-chips'), form = $('#asst-form'), input = $('#asst-in'), status = $('#asst-status');
  var turns = [], sampleFn = null, sampleTried = false, busy = false, ctl = null;

  function bubble(role, text, links) {
    var el = document.createElement('div'); el.className = 'asst__msg asst__msg--' + role;
    var p = document.createElement('p'); p.textContent = text; el.appendChild(p);
    if (links && links.length) {
      var row = document.createElement('div'); row.className = 'asst__links';
      links.forEach(function (k) { var L = LINKS[k]; if (!L) return; var a = document.createElement('a'); a.href = L.h; a.textContent = L.t; if (L.ext) { a.target = '_blank'; a.rel = 'noopener'; } row.appendChild(a); });
      el.appendChild(row);
    }
    log.appendChild(el); log.scrollTop = log.scrollHeight; return p;
  }
  function setChips(list) {
    chips.innerHTML = '';
    list.forEach(function (t) { var b = document.createElement('button'); b.type = 'button'; b.textContent = t; b.addEventListener('click', function () { ask(t); }); chips.appendChild(b); });
  }
  var STARTERS = ['מה המחירים?', 'איזה טיפול מתאים לכתמים?', 'לייזר על עור כהה?', 'שעות וכתובת', 'פדיקור לסוכרתיים'];
  function linksFor(q) { var l = localAnswer(q); return l && l.links ? l.links.slice(0, 2) : ['book']; }

  function ask(text) {
    text = (text || '').trim(); if (!text || busy) return;
    bubble('user', text); input.value = ''; setChips([]);
    var local = localAnswer(text);
    if (window.ASSISTANT_API) return askRemote(text, local);
    if (sampleFn) return askClaude(text, local);
    if (local) { bubble('bot', local.text, local.links); }
    else { bubble('bot', 'על זה אין לי תשובה מהאתר. הכי טוב לשאול את רותם ישירות, היא עונה בשעות הפעילות.', ['wa', 'book']); }
    setChips(STARTERS.filter(function (s) { return s !== text; }).slice(0, 3));
  }
  /* מצב שרת: Claude דרך השרת הקטן (server/README.md), בכל אתר */
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
      .then(function () {
        if (failed || !acc) throw new Error('empty');
        turns.push({ role: 'assistant', content: acc });
        var row = document.createElement('div'); row.className = 'asst__links';
        linksFor(text).forEach(function (k) { var L = LINKS[k]; var a = document.createElement('a'); a.href = L.h; a.textContent = L.t; if (L.ext) { a.target = '_blank'; a.rel = 'noopener'; } row.appendChild(a); });
        p.parentNode.appendChild(row);
      })
      .catch(function (e) {
        turns.pop(); p.parentNode.remove();
        if (e && e.name === 'AbortError') return;
        if (local) bubble('bot', local.text, local.links); else bubble('bot', 'לא הצלחתי לענות עכשיו. אפשר לשאול את רותם בוואטסאפ.', ['wa']);
      })
      .then(function () { busy = false; form.classList.remove('is-busy'); setChips(STARTERS.slice(0, 3)); });
  }
  function askClaude(text, local) {
    busy = true; form.classList.add('is-busy');
    turns.push({ role: 'user', content: text });
    var p = bubble('bot', 'חושבת…'); p.parentNode.classList.add('is-thinking');
    ctl = new AbortController();
    var input2 = [{ role: 'user', content: RULES + knowledge() }].concat(turns.slice(-8));
    sampleFn(input2, { cache: false, modelTier: 'quick', signal: ctl.signal, onText: function (u) { p.textContent = u.text; p.parentNode.classList.remove('is-thinking'); log.scrollTop = log.scrollHeight; } })
      .then(function (r) {
        turns.push({ role: 'assistant', content: r.text });
        var row = document.createElement('div'); row.className = 'asst__links';
        linksFor(text).forEach(function (k) { var L = LINKS[k]; var a = document.createElement('a'); a.href = L.h; a.textContent = L.t; if (L.ext) { a.target = '_blank'; a.rel = 'noopener'; } row.appendChild(a); });
        p.parentNode.appendChild(row);
      })
      .catch(function (e) {
        turns.pop();
        if (e && e.code === 'cancelled') { p.parentNode.remove(); return; }
        if (e && (e.code === 'not_granted' || e.code === 'sampling_disabled' || e.code === 'not_declared' || e.code === 'capability_disabled')) { sampleFn = null; status.textContent = 'עונה מיד, מהידע באתר'; }
        p.parentNode.remove();
        if (local) bubble('bot', local.text, local.links); else bubble('bot', 'לא הצלחתי לענות עכשיו. אפשר לשאול את רותם בוואטסאפ.', ['wa']);
      })
      .then(function () { busy = false; form.classList.remove('is-busy'); setChips(STARTERS.slice(0, 3)); });
  }

  function open(o) {
    box.hidden = !o; btn.setAttribute('aria-expanded', String(o)); document.body.classList.toggle('asst-open', o);
    if (o) {
      if (!log.children.length) { bubble('bot', 'היי, אני העוזרת של רותם. אפשר לשאול אותי על הטיפולים, המחירים, השעות או המוצרים.', []); setChips(STARTERS); }
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
  /* פתיחה מקישור ?ask= או מכפתור עם data-ask */
  document.addEventListener('click', function (e) { var a = e.target.closest('[data-ask]'); if (a) { e.preventDefault(); open(true); if (a.dataset.ask) ask(a.dataset.ask); } });
})();
