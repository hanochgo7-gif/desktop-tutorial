/* חנוך גוטובסקי, אתר אישי: כל ההתנהגות.
   בלי GSAP, או כשביקשו "הפחתת תנועה": הכול מוצג מיד, בלי פתיח, בלי חלקיקים ובלי הצמדות. */
(function () {
  'use strict';

  var root = document.documentElement;
  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  if (!hasGsap) root.classList.remove('motion');
  var motion = root.classList.contains('motion');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var live = $('#live');
  // אותו קוד לעברית ולאנגלית: הדף האנגלי הוא <html lang="en" dir="ltr">
  var EN = root.lang === 'en';
  function T(he, en) { return EN ? en : he; }

  /* ---------- וידאו שמתנגן בכל מצב ----------
     1. שרת שלא שולח קובץ בחלקים (אייפון דורש את זה): אם הקובץ נכשל, מורידים אותו שלם ומנגנים מהזיכרון.
     2. טלפון שחוסם הפעלה אוטומטית (מצב חיסכון, דפדפן בתוך אפליקציה): מנסים שוב במגע הראשון. */
  var blocked = [];
  function setVideo(v, url) {
    if (v.src.indexOf('blob:') === 0) URL.revokeObjectURL(v.src);
    delete v.dataset.blob;
    v.src = url;
    v.addEventListener('error', function () {
      if (v.dataset.blob || !window.fetch) return;
      v.dataset.blob = '1';
      fetch(url).then(function (r) { if (!r.ok) throw r.status; return r.blob(); }).then(function (b) {
        v.src = URL.createObjectURL(b.type ? b : new Blob([b], { type: 'video/mp4' }));
        if (v.dataset.want) playVideo(v);
      }).catch(function () { });
    }, { once: true });
  }
  function playVideo(v) {
    v.dataset.want = '1';
    var pr = v.play();
    if (pr && pr.catch) pr.catch(function () { if (blocked.indexOf(v) < 0) blocked.push(v); });
  }
  function pauseVideo(v) { delete v.dataset.want; v.pause(); }
  ['touchend', 'click', 'keydown'].forEach(function (ev) {
    window.addEventListener(ev, function () {
      var list = blocked; blocked = [];
      list.forEach(function (v) { if (v.dataset.want) playVideo(v); });
    }, { passive: true, capture: true });
  });
  function say(t) { live.textContent = ''; setTimeout(function () { live.textContent = t; }, 30); }

  /* ---------- נתוני הפרויקטים ---------- */
  var DATA = {
    gotovski: {
      name: 'ש. גוטובסקי', sub: 'תשתיות דלק מאז 1972', kind: 'עיצוב ובנייה מחדש · עברית / English', url: 'gotovski.co.il', color: '#1c82ad',
      story: 'חברה משפחתית שבונה תחנות דלק מאז 1972, עם לקוחות כמו פז, סונול ואמזון, ואתר שלא שידר שום דבר מזה. בניתי שפה שמרגישה כמו קבוצת בנייה גדולה: טיפוגרפיה כבדה, צילום על כל המסך, ותנועה בטוחה ושקולה כמו מנוף. בסבב האחרון נוסף סיור 360° בחוות גנרטורים, והאתר נעשה קל ונוח יותר בטלפון.',
      points: [
        'סיור 360° בחוות גנרטורים בעברית ובאנגלית: חמש נקודות מחצר הגנרטורים ועד חדר המשאבות, ותוכנית אתר שמראה לאן מסתכלים.',
        'הדמיה חיה של הפסקת חשמל בחוות שרתים: רואים בזמן אמת איך מערכת הדלק מחזיקה את הגנרטורים.',
        'דף היכרות באנגלית להורדה כ-PDF מעמוד חוות השרתים, שנבנה רק ממה שכבר כתוב באתר.',
        'מעבר דומיין בלי לאבד דירוג: כל כתובת ישנה שגוגל מכיר מופנית לעמוד המתאים באתר החדש.'
      ],
      metrics: [['טעינה בטלפון (LCP)', '2.9s', '1.7s'], ['משקל העמוד', '1.26MB', '0.9MB'], ['וידאו הפתיחה בטלפון', '1.3MB', '370KB']],
      palette: ['#111111', '#1c82ad', '#4fbbea', '#ede8de'], fonts: ['Heebo', 'Frank Ruhl Libre', 'Cousine']
    },
    ams: {
      name: 'AMS', sub: 'אביב משה שדמון · אגרוף תאילנדי ואימון אישי', kind: 'אתר מלא · תנועה אמיתית, תוכן וקידום', url: 'ams · אביב משה שדמון', color: '#d4a24c',
      story: 'אביב מלמד מואי תאי, והשפה שלו היא תנועה, אז האתר זז כמו שהוא זז: התנועה האמיתית שלו מתוך סרטון הועברה לדמות מונפשת בזירה, והגלילה של המבקר מניעה אותה. בגרסה החדשה האתר גדל לעסק שלם: אביב מדבר בגוף ראשון, עם התמונות, ההמלצות והלוגו האמיתיים שלו, ועם מאמרים, דפי אזור ודף נחיתה שמביאים מתאמנים חדשים.',
      points: [
        'פתיח מוצמד: 13 פריימים מצוירים על canvas. גוללים, ואביב עובר משמירה לברך תאילנדית וחוזר. התנועה נלקחה מסרטון אמיתי שלו.',
        'רקע זירה קבוע לכל האתר, כותרות בגופן Dragon בסגנון כרזת קרב, ו"איך מתחילים" בנוי על חבלי זירה.',
        'דף לכל שירות, "מי אני" מלא, חמישה מאמרים וארבעה דפי אזור (רחובות, גדרה, נס ציונה וקריית עקרון) שבנויים לקידום בגוגל.',
        'דף נחיתה לאימון ניסיון לאינסטגרם ולמודעות, ומדריך חינם ב-PDF שנשלח בוואטסאפ. כל פנייה נמדדת.',
        'בטלפון: כפתור וואטסאפ צף שלא מסתיר תוכן, המלצות בהחלקה, ותפריט שירותים מסודר.'
      ],
      frames: 13,
      palette: ['#16110c', '#d4a24c', '#f2ece0', '#000000'], fonts: ['Dragon', 'IBM Plex Sans Hebrew']
    },
    allenbis: {
      name: 'אלנביס', sub: 'שתייה, חטיפים ומה שביניהם עד הבית', kind: 'שיפור חנות קיימת · בלי ספריות', url: 'allenbis.co.il', color: '#ffd84d',
      story: 'חנות משלוחים שכבר עבדה ומכרה, אבל רצה על שתי חבילות React כבדות, ולקוח בטלפון חיכה. בניתי אותה מחדש בלי ספריות בכלל: אותו קטלוג של 199 מוצרים ואותם מחירים, עם פי 24 פחות JavaScript. עכשיו היא גם מגדילה את הסל, מדברת אנגלית ומופיעה בגוגל.',
      points: [
        'בונה סל לפי תקציב: כותבים סכום ומקבלים סל מוכן.',
        'כשחסר קצת למשלוח חינם הסל מציע מוצרים שסוגרים את הפער, ומעל 80 ₪ מסובבים גלגל מזל שבו כל סיבוב זוכה.',
        'בטופס ההזמנה האתר בודק שהרחוב באזור המשלוחים, גם עם שגיאת כתיב קטנה, וההזמנה יוצאת לחנות בוואטסאפ.',
        'כפתור EN מעביר את כל החנות לאנגלית בשביל תיירים, ולמוצרים ולקטגוריות יש עמודים נפרדים שגוגל מוצא.'
      ],
      metrics: [['JavaScript', '480KB', '20KB'], ['נתונים בטעינה', '950KB', '365KB'], ['בקשות לשרת', '32', '19'], ['הצגה ראשונה', '260ms', '75ms']],
      palette: ['#1b4396', '#ffd84d', '#c8102e', '#0a0f1e'], fonts: ['Secular One', 'Assistant']
    },
    clinic: {
      name: 'רותם גוטובסקי', sub: 'קליניקה לקוסמטיקה טיפולית', kind: 'אתר, חנות ועוזרת אישית · טיפול לפי מטרה', url: 'רותם גוטובסקי · p.m.e', color: '#c98f8a',
      story: 'רותם מטפלת לפי מטרה ולא לפי מכשיר, ולכן גם האתר מתחיל מהבעיה של המטופלת ולא מרשימת טיפולים. מאחורי כל עמוד נעים ברכות ענפי דובדבן פורחים, ומעליהם זכוכית בגוון שמנת וסריף עדין. ועכשיו יש באתר גם עוזרת אישית שעונה מכל מה שכתוב בו ויודעת לקבוע תור.',
      points: [
        'עוזרת אישית בכל עמוד, שעונה על טיפולים, מחירים, שעות ומוצרים מתוך התוכן של האתר ומבינה גם ניסוח חופשי ושאלות המשך.',
        'קביעת תור בתוך הצ\'אט: שם, טלפון, מטרה ושעה נוחה, ובלחיצה אחת הבקשה נשלחת לרותם בוואטסאפ.',
        '"מה מפריע לך?" כבר בפתיחה: אקנה, כתמים, קמטים, שיער או כפות רגליים, וכל בחירה מובילה ישר למדריך המתאים.',
        'חנות מוצרים עם סינון, חיפוש ותצוגה מהירה, ותמונות קלות פי חמישה שנטענות מהר גם בנייד.'
      ],
      palette: ['#fbf2ec', '#f0c7c2', '#c98f8a', '#000000'], fonts: ['Noto Serif Hebrew', 'Assistant'],
      metrics: [['משקל התמונות', '14.9MB', '2.9MB']]
    },
    falafel: {
      name: 'קייטרינג 4X4', sub: 'ניסים שרון · פלאפל וסביח לאירועים', kind: 'אתר חדש · דוכן רחוב עם מחשבון הצעה', url: 'קייטרינג 4X4', color: '#f2b705',
      story: 'ניסים שרון מגיע עם ג׳יפ 4X4 לכל מקום, ממצוקי דרגות ועד שולחן על חוף ים המלח. האתר מדבר כמו דוכן רחוב טוב: צהוב שמש, כותרות של כרזת שוק וקווי גובה של מפת שטח ברקע. ועכשיו אפשר לבנות בו את האירוע בדקה ולשלוח לניסים הצעה מסודרת בלחיצה.',
      points: [
        'מחשבון הצעה בצורת פתק הזמנה: בוחרים אורחים, דוכנים ותוספות, ורואים מיד כמה כדורי פלאפל, פיתות וצ׳יפס צריך.',
        'ההצעה נשלחת לניסים בוואטסאפ עם מספר הזמנה וכל הפרטים, ואפשר גם לשמור אותה כ-PDF.',
        'התפריט בנוי משלושה כרטיסים גדולים שנערמים בגלילה, עם כפתור ״להוסיף להצעה״ ושלוש חבילות מוכנות.',
        'תפריט נגישות והצהרת נגישות, מצב כהה מלא, ופס קבוע בנייד עם הצעת מחיר וטלפון.'
      ],
      palette: ['#151314', '#f2b705', '#22b8dc', '#f1e7d0'], fonts: ['Karantina', 'Rubik']
    },
    rachel: {
      name: 'רחלי הורנשטיין', sub: 'שיעורי מתמטיקה פרטיים בזום', kind: 'אתר חדש · מחברת משבצות', url: 'rachelimath', color: '#2d8cff',
      story: 'הורה שמחפש מורה פרטית צריך להרגיש תוך חמש שניות שהילד בידיים טובות. לכן האתר נראה כמו מחברת חשבון טובה: נייר משבצות, כתב יד, ופנים אמיתיות של מורה עם 28 שנות ניסיון. עכשיו ההורה גם רואה איך רחלי מסבירה, עוד לפני שיחת ההיכרות.',
      points: [
        'בדיקת רמה בדקה: שלוש שאלות לפי שכבת גיל, ואחרי כל תשובה רחלי מסבירה בכתב יד, שלב אחרי שלב.',
        'התוצאה נשלחת לרחלי בוואטסאפ עם הנושאים שכדאי לחזק, כך ששיחת ההיכרות מתחילה מהמקום הנכון.',
        'ערכת מתנה שהורים מבקשים בוואטסאפ: שישה משחקים ותרגילים לטלפון בלי הרשמה, מלוח הכפל ועד משוואות, דפי עבודה להדפסה וחידה חדשה כל יום.',
        'כל משחק נגמר בקישור לאתגר חבר ובקישור לרחלי, כך שהמתנה עוברת מהורה להורה.'
      ],
      palette: ['#1e3a8a', '#fffdf9', '#f28c9b', '#fff0ad', '#1fae82'], fonts: ['Assistant', 'Amatic SC', 'Secular One']
    }
  };
  if (EN) {
    var DATA_EN = {
      gotovski: {
        name: 'S. Gotovski', sub: 'Fuel infrastructure since 1972', kind: 'Redesign and rebuild · Hebrew / English', url: 'gotovski.co.il',
        story: 'A family company building fuel stations since 1972, with clients like Paz, Sonol and Amazon, and a website that said none of it. I built a language that feels like a major construction group: heavy type, full-screen photography, and motion that is calm and certain, like a crane. The latest round added a 360° tour of a generator farm and made the site lighter and easier to use on a phone.',
        points: [
          'A 360° tour of a generator farm in Hebrew and English: five stops from the generator yard to the pump room, with a site plan that shows where you are looking.',
          'A live simulation of a power outage at a data center: watch in real time how the fuel system keeps the generators running.',
          'An English capability statement to download as a PDF from the data center page, built only from what the site already says.',
          'A domain move without losing rank: every old address Google knows redirects to the matching page on the new site.'
        ],
        metrics: [['Mobile load (LCP)', '2.9s', '1.7s'], ['Page weight', '1.26MB', '0.9MB'], ['Mobile intro video', '1.3MB', '370KB']]
      },
      ams: {
        sub: 'Aviv Moshe Shadmon · Thai boxing and personal training', kind: 'Full site · real motion, content and SEO', url: 'ams · Aviv Moshe Shadmon',
        story: 'Aviv teaches Muay Thai, and his language is movement, so the site moves the way he does: his real motion, taken from footage, was transferred to an animated fighter in the ring, and the visitor\'s scroll drives him. In the new version the site grew into a whole business: Aviv speaks in first person, with his real photos, testimonials and logo, plus articles, area pages and a landing page that bring in new trainees.',
        points: [
          'A pinned opening: 13 frames drawn on canvas. Scroll, and Aviv moves from guard to a Thai bow and back. The motion comes from real footage of him.',
          'A fixed ring backdrop across the site, Dragon fight-poster headlines, and a "how to start" section built on ring ropes.',
          'A page for every service, a full "about me", five articles and four area pages built to rank on Google.',
          'A free-trial landing page for Instagram and ads, and a free PDF guide sent on WhatsApp. Every enquiry is measured.',
          'On phones: a floating WhatsApp button that never covers content, swipeable testimonials and a tidy services menu.'
        ]
      },
      allenbis: {
        name: 'Allenbis', sub: 'Drinks, snacks and everything between, delivered', kind: 'Upgrading a live store · no libraries', url: 'allenbis.co.il',
        story: 'A delivery store that already worked and sold, but ran on two heavy React bundles, and customers on their phones were kept waiting. I rebuilt it with no libraries at all: the same 199-product catalog and the same prices, with 24 times less JavaScript. Now it also grows the basket, speaks English and shows up on Google.',
        points: [
          'A budget basket builder: type an amount and get a ready basket.',
          'When an order is a little short of free delivery, the cart suggests products that close the gap, and orders over ₪80 get a lucky wheel where every spin wins.',
          'The order form checks that the street is in the delivery area, even with a small typo, and the order goes to the store on WhatsApp.',
          'An EN button switches the whole store to English for tourists, and products and categories get their own pages that Google can find.'
        ],
        metrics: [['JavaScript', '480KB', '20KB'], ['Data on load', '950KB', '365KB'], ['Server requests', '32', '19'], ['First paint', '260ms', '75ms']]
      },
      clinic: {
        name: 'Rotem Gotovski', sub: 'Therapeutic cosmetics clinic', kind: 'Site, shop and personal assistant · treatment by goal', url: 'Rotem Gotovski · p.m.e',
        story: 'Rotem treats by goal, not by machine, so the site also starts from the client\'s problem rather than a list of treatments. Cherry-blossom branches sway softly behind every page, under cream-colored glass and a delicate serif. And now the site has a personal assistant that answers from everything on it and can book an appointment.',
        points: [
          'A personal assistant on every page that answers questions about treatments, prices, hours and products from the site\'s own content, and understands loose wording and follow-up questions.',
          'Booking inside the chat: name, phone, goal and a convenient time, then one tap sends the request to Rotem on WhatsApp.',
          '"What bothers you?" right at the top: acne, spots, wrinkles, hair or feet, and each choice leads straight to the right guide.',
          'A product shop with filters, search and quick view, and images five times lighter that load fast on a phone.'
        ],
        metrics: [['Image weight', '14.9MB', '2.9MB']]
      },
      falafel: {
        name: '4X4 Catering', sub: 'Nissim Sharon · falafel and sabich for events', kind: 'New site · a street stall with a quote builder', url: '4X4 Catering',
        story: 'Nissim Sharon drives his 4X4 jeep anywhere, from the Dragot cliffs to a table on the Dead Sea shore. The site talks like a good street stall: sunshine yellow, market-poster headlines, and the contour lines of a terrain map in the background. Now visitors can plan their event in a minute and send Nissim a tidy quote in one tap.',
        points: [
          'A quote builder shaped like an order slip: pick guests, stations and extras, and see right away how many falafel balls, pitas and fries it takes.',
          'The quote goes to Nissim on WhatsApp with an order number and every detail, and can also be saved as a PDF.',
          'The menu is three large cards that stack as you scroll, each with an "add to quote" button, plus three ready packages.',
          'An accessibility menu and statement, a full dark mode, and a fixed mobile bar with the quote and a call button.'
        ]
      },
      rachel: {
        name: 'Racheli Hornstein', sub: 'Private math lessons on Zoom', kind: 'New site · a squared notebook', url: 'rachelimath',
        story: 'A parent looking for a private tutor needs to feel within five seconds that their child is in good hands. So the site looks like a good math notebook: squared paper, handwriting, and the real face of a teacher with 28 years of experience. Now parents also see how Racheli explains, before the first call.',
        points: [
          'A one-minute level check: three questions by grade, and after each answer Racheli explains it in handwriting, step by step.',
          'The result goes to Racheli on WhatsApp with the topics to work on, so the first call starts in the right place.',
          'A free gift kit parents request on WhatsApp: six phone games and exercises with no sign-up, from times tables to equations, printable worksheets and a new riddle every day.',
          'Every game ends with a link to challenge a friend and a link to Racheli, so the gift travels from parent to parent.'
        ]
      }
    };
    Object.keys(DATA_EN).forEach(function (k) { Object.assign(DATA[k], DATA_EN[k]); });
  }
  // כתובת האתר החי של כל לקוח. כשממלאים כתובת, כפתור "לאתר החי" מופיע בשורה ובסיפור
  var LIVE = { gotovski: '', ams: '', allenbis: '', clinic: '', falafel: '', rachel: '' };
  var ORDER = $$('.project').map(function (li) { return li.dataset.id; });
  ORDER.forEach(function (id) {
    if (!LIVE[id]) return;
    var a = document.createElement('a');
    a.className = 'p-live mono'; a.href = LIVE[id]; a.target = '_blank'; a.rel = 'noopener';
    a.innerHTML = T('לאתר החי', 'Live site') + ' <span aria-hidden="true">↗</span>';
    var btn = $('.project[data-id="' + id + '"] .p-open');
    btn.parentNode.insertBefore(a, btn.nextSibling);
  });

  /* ---------- שעון ---------- */
  var clock = $('.clock');
  function tick() {
    try {
      clock.textContent = new Intl.DateTimeFormat(T('he-IL', 'en-GB'), { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jerusalem' }).format(new Date());
    } catch (e) { clock.textContent = ''; }
  }
  if (clock) { tick(); setInterval(tick, 20000); }

  /* ---------- גלילה חלקה ---------- */
  var lenis = null;
  if (motion) {
    gsap.registerPlugin(ScrollTrigger);
    if (window.Lenis) {
      lenis = new Lenis({ lerp: 0.085, smoothWheel: true });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    }
  }
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      var el = id === '#top' ? document.body : $(id);
      if (!el) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(id === '#top' ? 0 : el, { duration: 1.6 });
      else if (id === '#top') window.scrollTo({ top: 0, behavior: motion ? 'smooth' : 'auto' });
      else el.scrollIntoView({ behavior: motion ? 'smooth' : 'auto' });
      if (el.tabIndex < 0 && el !== document.body) { el.setAttribute('tabindex', '-1'); el.focus({ preventScroll: true }); }
    });
  });

  /* ---------- חלקיקים ---------- */
  var P = null, glOn = false;
  var hero = $('.hero'), contact = $('.contact'), canvas = $('.gl');
  var st = { scatter: 1, intro: 1, mx: -9999, my: -9999, tx: -9999, ty: -9999, vx: 0, vy: 0, xray: 0 };
  var lastW = 0;

  function shapeItems(section, els) {
    var sr = section.getBoundingClientRect();
    return els.map(function (el) {
      var r = el.getBoundingClientRect(), cs = getComputedStyle(el);
      return {
        text: el.textContent.trim(),
        font: cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily,
        letterSpacing: cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing,
        dir: cs.direction,
        x: (cs.direction === 'ltr' ? r.left : r.right) - sr.left,
        y: r.top - sr.top + r.height * 0.5
      };
    });
  }

  function buildShapes() {
    var w = window.innerWidth, h = window.innerHeight;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    P.resize(w, h, dpr);
    var count = Math.round(clamp(w * h / 46, 9000, 26000));
    var A = Particles.sample(shapeItems(hero, $$('.hero-title span')), w, hero.offsetHeight, count);
    P.setShapes(A, A);
    lastW = w;
    // "בואו נבנה." בתחתית הדף לא נחוץ בפתיחה: דוגמים אותו כשהדפדפן פנוי, כדי שהפתיחה תרוץ חלק
    var idle = window.requestIdleCallback || function (fn) { return setTimeout(fn, 1200); };
    idle(function () {
      if (lastW !== w) return;
      P.setShapes(A, Particles.sample(shapeItems(contact, [$('.contact-title')]), w, contact.offsetHeight, count));
    }, { timeout: 4000 });
  }

  function startParticles() {
    if (!motion || !window.Particles || !hero || !contact || !canvas) return Promise.resolve();
    P = Particles.create(canvas);
    if (!P) return Promise.resolve();
    var fontReady = document.fonts && document.fonts.load
      ? Promise.race([
          Promise.all([document.fonts.load('800 100px "Fraunces"', 'HGPRO'), document.fonts.ready]),
          new Promise(function (r) { setTimeout(r, 2500); })
        ])
      : Promise.resolve();
    return fontReady.catch(function () { }).then(function () {
      buildShapes();
      glOn = true;
      root.classList.add('gl-on');
      var resizeT;
      window.addEventListener('resize', function () {
        clearTimeout(resizeT);
        resizeT = setTimeout(function () {
          if (Math.abs(window.innerWidth - lastW) > 40) buildShapes();
          else P.resize(window.innerWidth, window.innerHeight, Math.min(window.devicePixelRatio || 1, 2));
        }, 200);
      });
    });
  }

  function onPointer(x, y) { st.tx = x; st.ty = y; }
  window.addEventListener('pointermove', function (e) { onPointer(e.clientX, e.clientY); }, { passive: true });
  window.addEventListener('pointerdown', function (e) { onPointer(e.clientX, e.clientY); }, { passive: true });
  document.addEventListener('pointerleave', function () { st.tx = -9999; st.ty = -9999; });

  var paperCol = [0.93, 0.91, 0.87], hotCol = [1, 0.31, 0.1], blueCol = [0.24, 0.48, 1], whiteCol = [1, 1, 1];
  var colNow = paperCol.slice(), hotNow = hotCol.slice();

  function frame(time) {
    if (!glOn || document.hidden) return;
    var vh = window.innerHeight;
    var hr = hero.getBoundingClientRect(), cr = contact.getBoundingClientRect();
    var heroProg = clamp(-hr.top / hr.height, 0, 1);
    var contactProg = clamp(1 - cr.top / vh, 0, 1);

    // עכבר עם השהיה, ומהירות שדועכת
    if (st.tx < -9000) { st.mx = st.tx; st.my = st.ty; }
    else {
      if (st.mx < -9000) { st.mx = st.tx; st.my = st.ty; }
      var nx = st.mx + (st.tx - st.mx) * 0.14, ny = st.my + (st.ty - st.my) * 0.14;
      st.vx = st.vx * 0.86 + (nx - st.mx) * 1.6;
      st.vy = st.vy * 0.86 + (ny - st.my) * 1.6;
      st.mx = nx; st.my = ny;
    }

    var inContact = contactProg > 0;
    var scatter = inContact ? Math.pow(1 - contactProg, 1.4) : Math.max(st.intro, heroProg * 1.15);
    var visible = root.classList.contains('stage-on') ? inContact : (heroProg < 1 || inContact);
    var k = st.xray ? 1 : 0;
    for (var i = 0; i < 3; i++) {
      colNow[i] += ((k ? blueCol : paperCol)[i] - colNow[i]) * 0.08;
      hotNow[i] += ((k ? whiteCol : hotCol)[i] - hotNow[i]) * 0.08;
    }
    if (!visible && st.blank) return;
    st.blank = !visible;
    P.draw({
      time: time, mx: st.mx, my: st.my, vx: clamp(st.vx, -260, 260), vy: clamp(st.vy, -260, 260),
      rad: Math.min(window.innerWidth, vh) * 0.13,
      offA: hr.top, offB: cr.top,
      morph: inContact ? 1 : 0,
      scatter: clamp(scatter, 0, 1.6),
      alpha: visible ? 1 : 0,
      col: colNow, hot: hotNow
    });
  }

  /* ---------- פתיח ---------- */
  function runIntro() {
    var intro = $('.intro');
    if (!motion || !intro) { if (intro) intro.remove(); st.intro = 0; return Promise.resolve(); }
    var quick = false;
    try { quick = sessionStorage.getItem('hg-intro') === '1'; sessionStorage.setItem('hg-intro', '1'); } catch (e) { }
    if (lenis) lenis.stop();

    var svg = $('.intro-grid'), ns = 'http://www.w3.org/2000/svg';
    var vw = window.innerWidth, vh = window.innerHeight;
    svg.setAttribute('viewBox', '0 0 ' + vw + ' ' + vh);
    var lines = [];
    function line(x1, y1, x2, y2, major) {
      var l = document.createElementNS(ns, 'line');
      l.setAttribute('x1', x1); l.setAttribute('y1', y1); l.setAttribute('x2', x2); l.setAttribute('y2', y2);
      if (major) l.setAttribute('class', 'major');
      var len = Math.hypot(x2 - x1, y2 - y1);
      l.style.strokeDasharray = len; l.style.strokeDashoffset = len;
      svg.appendChild(l); lines.push(l);
    }
    var cols = vw < 700 ? 4 : 12, rows = vw < 700 ? 8 : 6;
    for (var c = 1; c < cols; c++) line(vw * c / cols, 0, vw * c / cols, vh, c === cols / 2);
    for (var r = 1; r < rows; r++) line(0, vh * r / rows, vw, vh * r / rows, r === rows / 2);
    line(0, 0, vw, vh, false); line(vw, 0, 0, vh, false);

    var text = 'HGPRO', out = $('.intro-text'), pct = $('.intro-pct');
    var counter = { n: 0, c: 0 };
    var tl = gsap.timeline();
    tl.to(lines, { strokeDashoffset: 0, duration: quick ? 0.4 : 1.1, ease: 'expo.inOut', stagger: quick ? 0.01 : 0.035 }, 0)
      .to(counter, {
        c: text.length, duration: quick ? 0.3 : 0.75, ease: 'none',
        onUpdate: function () { out.textContent = text.slice(0, Math.round(counter.c)); }
      }, quick ? 0.05 : 0.3)
      .to(counter, {
        n: 100, duration: quick ? 0.5 : 1.5, ease: 'power2.inOut',
        onUpdate: function () { pct.textContent = String(Math.round(counter.n)).padStart(3, '0'); }
      }, 0)
      .to(intro, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1, ease: 'expo.inOut' }, quick ? 0.6 : 1.75)
      .to(st, { intro: 0, duration: 2.4, ease: 'expo.out' }, quick ? 0.75 : 1.95);

    function skip() { tl.timeScale(4); }
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (ev) { window.addEventListener(ev, skip, { once: true, passive: true }); });

    return new Promise(function (resolve) {
      tl.eventCallback('onComplete', function () {
        intro.remove();
        if (lenis) lenis.start();
        resolve();
      });
      // אחרי שהמסך נחשף, הגלילה פתוחה גם אם החלקיקים עוד מתיישבים
      tl.call(function () { if (lenis) lenis.start(); }, null, quick ? 1.2 : 2.5);
      // הבמה התלת־ממדית נכנסת יחד עם החשיפה
      tl.call(function () { HG.introDone = true; window.dispatchEvent(new Event('hg:intro')); }, null, quick ? 0.7 : 1.85);
    });
  }

  /* ---------- מניפסט: מילה אחרי מילה ---------- */
  function initManifesto() {
    var el = $('[data-words]');
    if (!el || !motion) return;
    var hl = EN ? ['first', 'second:'] : ['השנייה', 'הראשונה:'];
    var words = el.textContent.trim().split(/\s+/);
    // קורא מסך שומע את המשפט השלם פעם אחת; המילים המונפשות מוסתרות ממנו
    var full = el.textContent.trim();
    el.innerHTML = '<span class="sr-only">' + full + '</span>' + words.map(function (w) {
      return '<span class="w' + (hl.indexOf(w) > -1 ? ' hl' : '') + '" aria-hidden="true">' + w + '</span>';
    }).join(' ');
    var spans = $$('.w', el);
    ScrollTrigger.create({
      trigger: el, start: 'top 82%', end: 'bottom 45%', scrub: true,
      onUpdate: function (s) {
        var n = Math.round(s.progress * spans.length);
        spans.forEach(function (sp, i) { sp.classList.toggle('on', i < n); });
      }
    });
  }

  /* ---------- עבודות ---------- */
  function initProjects() {
    $$('.project').forEach(function (li) {
      var media = $('.p-media', li), view = $('.browser-view', li), img = $('.p-tall', li);

      // המסך "חי": במעבר עכבר העמוד נגלל בתוך הדפדפן
      media.addEventListener('pointerenter', function (e) {
        if (e.pointerType !== 'mouse') return;
        var max = img.offsetHeight - view.offsetHeight;
        if (max <= 0) return;
        img.style.setProperty('--dur', Math.max(2.4, max / 520) + 's');
        img.style.setProperty('--y', -max + 'px');
      });
      media.addEventListener('pointerleave', function () {
        img.style.setProperty('--dur', '1.1s');
        img.style.setProperty('--y', '0px');
      });
      media.addEventListener('click', function () { openCase(li.dataset.id, li); });
      $('.p-open', li).addEventListener('click', function () { openCase(li.dataset.id, li); });

      if (!motion) return;
      var v = document.createElement('video');
      v.className = 'p-video'; v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'none';
      v.setAttribute('aria-hidden', 'true');
      setVideo(v, 'work/video/' + li.dataset.id + (smallScreen ? '-m' : '') + '.mp4');
      view.appendChild(v);
      v.addEventListener('playing', function () { v.classList.add('on'); });
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (en) {
          if (en[0].isIntersecting) playVideo(v);
          else pauseVideo(v);
        }, { rootMargin: '100px 0px' }).observe(view);
      }
      var browser = $('.browser', li), phone = $('.p-phone', li), info = $$('.p-info > *', li);
      gsap.set(browser, { clipPath: 'inset(100% 0% 0% 0% round 14px)' });
      gsap.set(img, { scale: 1.2, transformOrigin: '50% 0%' });
      gsap.set(phone, { autoAlpha: 0, y: 80 });
      gsap.set(info, { autoAlpha: 0, y: 34 });
      gsap.timeline({ scrollTrigger: { trigger: li, start: 'top 80%', once: true } })
        .to(browser, { clipPath: 'inset(0% 0% 0% 0% round 14px)', duration: 1.4, ease: 'expo.out' })
        .to(img, { scale: 1, duration: 1.8, ease: 'expo.out', clearProps: 'scale' }, 0)
        .to(phone, { autoAlpha: 1, y: 0, duration: 1.3, ease: 'expo.out' }, 0.35)
        .to(info, { autoAlpha: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.07 }, 0.2);
      gsap.to(phone, { yPercent: -22, ease: 'none', scrollTrigger: { trigger: li, start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    if (!motion || !$('.projects')) return;
    // הטיה לפי מהירות הגלילה
    var skew = { v: 0 };
    var set = gsap.quickSetter('.p-media', 'skewY', 'deg');
    var lim = gsap.utils.clamp(-4, 4);
    ScrollTrigger.create({
      trigger: '.projects', start: 'top bottom', end: 'bottom top',
      onUpdate: function (s) {
        var v = lim(s.getVelocity() / -380);
        if (Math.abs(v) > Math.abs(skew.v)) {
          skew.v = v;
          gsap.to(skew, { v: 0, duration: 0.9, ease: 'power3', overwrite: true, onUpdate: function () { set(skew.v); } });
        }
      }
    });
  }

  /* ---------- סיפור פרויקט ---------- */
  var caseEl = $('.case'), caseBg = $('.case-bg'), caseScroll = $('.case-scroll'), caseBrowser = $('.case-browser');
  var current = null, opener = null, framesTimer = null;

  function fillCase(id) {
    var d = DATA[id], i = ORDER.indexOf(id);
    current = id;
    caseEl.dataset.id = id;
    caseEl.style.setProperty('--p', d.color);
    // כרזה קולנועית של הפרויקט (היגספילד) מאחורי המסך בראש הסיפור
    caseEl.style.setProperty('--cine', 'url("' + new URL('work/cinema/' + id + '.webp', document.baseURI).href + '")');
    $('.case-url').textContent = d.url;
    var poster = $('.case-poster');
    poster.src = 'work/' + id + '-poster.webp';
    poster.alt = T('דף הבית של ', 'Home page of ') + d.name;
    var vid = $('.case-video');
    pauseVideo(vid);
    vid.classList.remove('on');
    if (motion) {
      setVideo(vid, 'work/video/' + id + (smallScreen ? '-m' : '') + '.mp4');
      vid.oncanplay = function () { vid.classList.add('on'); playVideo(vid); };
    }
    var live = $('.case-live');
    live.hidden = !LIVE[id];
    if (LIVE[id]) live.href = LIVE[id];
    $('#case-title').textContent = d.name;
    var logo = $('.project[data-id="' + id + '"] .logo-tile img'), cl = $('.case-logo');
    if (logo) { cl.src = logo.getAttribute('src'); cl.alt = logo.alt; }
    $('.case-sub').textContent = d.sub;
    $('.case-kind').textContent = d.kind;
    $('.case-story').textContent = d.story;
    $('.case-points').innerHTML = d.points.map(function (p) { return '<li><span>' + p + '</span></li>'; }).join('');
    $('.swatches').innerHTML = d.palette.map(function (c) { return '<li><i style="background:' + c + '"></i>' + c + '</li>'; }).join('');
    $('.case-fonts').innerHTML = d.fonts.map(function (f) { return '<li>' + f + '</li>'; }).join('');
    var m = $('.case-metrics');
    m.innerHTML = d.metrics ? '<h3 class="label mono">' + T('לפני → אחרי', 'Before → after') + '</h3>' + d.metrics.map(function (r) {
      return '<div><span>' + r[0] + '</span><b><s>' + r[1] + '</s>' + r[2] + '</b></div>';
    }).join('') : '';
    var ph = $('.case-phone');
    ph.src = 'work/' + id + '-mob.webp';
    ph.alt = EN ? d.name + ' on a phone' : d.name + ' בטלפון';
    var next = ORDER[(i + 1) % ORDER.length];
    $('.case-next-name').textContent = DATA[next].name;
    $('.case-next').dataset.next = next;

    // ב-AMS: הפריימים האמיתיים מהפתיח, מונעים בתנועת העכבר
    clearInterval(framesTimer);
    var old = $('.case-frames');
    if (old) old.remove();
    if (d.frames) {
      var box = document.createElement('figure');
      box.className = 'case-frames';
      box.innerHTML = '<img alt="' + T('אביב בזירה, משמירה לברך תאילנדית', 'Aviv in the ring, from guard to a Thai bow') + '" width="480" height="480"><figcaption class="mono">' + (window.matchMedia('(hover: none)').matches ? T('גררו את האצבע על התמונה מצד לצד: אלה 13 הפריימים מהפתיח', 'Drag your finger across the image: these are the 13 frames of the opening') : T('הזיזו את העכבר מצד לצד: אלה 13 הפריימים מהפתיח', 'Move the mouse from side to side: these are the 13 frames of the opening')) + '</figcaption>';
      $('.case-main').appendChild(box);
      var fimg = $('img', box), frames = [];
      for (var f = 1; f <= d.frames; f++) { frames.push('work/ams/f' + String(f).padStart(3, '0') + '.webp'); new Image().src = frames[f - 1]; }
      fimg.src = frames[0];
      var auto = 0;
      box.addEventListener('pointermove', function (e) {
        clearInterval(framesTimer);
        var r = box.getBoundingClientRect();
        var p = clamp((EN ? e.clientX - r.left : r.right - e.clientX) / r.width, 0, 0.999);
        fimg.src = frames[Math.floor(p * frames.length)];
      });
      if (motion) framesTimer = setInterval(function () {
        auto = (auto + 1) % (frames.length * 2 - 2);
        var idx = auto < frames.length ? auto : frames.length * 2 - 2 - auto;
        fimg.src = frames[idx];
      }, 140);
    }
  }

  function openCase(id, li) {
    opener = li;
    fillCase(id);
    var src = $('.browser', li).getBoundingClientRect();
    $('.p-tall', li).style.setProperty('--y', '0px');
    caseEl.hidden = false;
    document.documentElement.classList.add('case-open');
    caseScroll.scrollTop = 0;
    if (lenis) lenis.stop();
    document.body.style.overflow = 'hidden';
    $('.case-close').focus({ preventScroll: true });
    say(T('נפתח: ', 'Opened: ') + DATA[id].name);
    setHash(id);
    if (!motion) return;

    var tgt = caseBrowser.getBoundingClientRect();
    var vw = window.innerWidth, vh = window.innerHeight;
    var s = src.width / tgt.width;
    var reveal = $$('.case-head > *, .case-grid, .case-next');
    gsap.set(reveal, { autoAlpha: 0, y: 40 });
    gsap.timeline()
      .fromTo(caseBg,
        { clipPath: 'inset(' + src.top + 'px ' + (vw - src.right) + 'px ' + (vh - src.bottom) + 'px ' + src.left + 'px round 14px)' },
        { clipPath: 'inset(0px 0px 0px 0px round 0px)', duration: 1, ease: 'expo.inOut' }, 0)
      .fromTo(caseBrowser,
        { x: src.left - tgt.left, y: src.top - tgt.top, scale: s, transformOrigin: '0 0' },
        { x: 0, y: 0, scale: 1, duration: 1.1, ease: 'expo.inOut' }, 0)
      .fromTo('.case-close', { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.6)
      .to(reveal, { autoAlpha: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.06 }, 0.75);
  }

  function closeCase() {
    if (caseEl.hidden) return;
    clearInterval(framesTimer);
    function done() {
      caseEl.hidden = true;
      document.documentElement.classList.remove('case-open');
      $('.case-video').pause();
      setHash('');
      if (window.gsap) gsap.set(caseEl, { clearProps: 'opacity,transform' });
      document.body.style.overflow = '';
      if (lenis) lenis.start();
      if (opener) {
        // פרויקט שעוד לא נחשף בגלילה מוסתר, ואי אפשר להחזיר אליו פוקוס
        var back = $('.p-open', opener);
        if (window.gsap && getComputedStyle(back).visibility === 'hidden') gsap.set(back, { autoAlpha: 1 });
        back.focus({ preventScroll: true });
      }
    }
    if (!motion) return done();
    gsap.to(caseEl, { autoAlpha: 0, scale: 0.98, duration: 0.45, ease: 'power3.in', onComplete: function () { gsap.set(caseEl, { autoAlpha: 1 }); done(); } });
  }

  function nextCase() {
    var next = $('.case-next').dataset.next;
    opener = $('.project[data-id="' + next + '"]');
    setHash(next);
    if (!motion) { fillCase(next); caseScroll.scrollTop = 0; return; }
    var wipe = $('.case-wipe'), r = $('.case-next-name').getBoundingClientRect();
    var at = Math.round(r.left + r.width / 2) + 'px ' + Math.round(r.top + r.height / 2) + 'px';
    wipe.style.background = DATA[next].color;
    gsap.timeline()
      .fromTo(wipe, { clipPath: 'circle(0% at ' + at + ')' }, { clipPath: 'circle(150% at ' + at + ')', duration: 0.75, ease: 'expo.in' })
      .call(function () {
        fillCase(next);
        caseScroll.scrollTop = 0;
        say(T('נפתח: ', 'Opened: ') + DATA[next].name);
        gsap.set($$('.case-hero, .case-body'), { autoAlpha: 1, y: 0 });
      })
      .to(wipe, { clipPath: 'circle(0% at 50% 0%)', duration: 0.9, ease: 'expo.out' })
      .from($$('.case-head > *'), { y: 50, autoAlpha: 0, duration: 0.9, ease: 'expo.out', stagger: 0.06 }, '-=0.6');
  }

  function setHash(id) {
    try { history.replaceState(null, '', id ? '#' + id : location.pathname + location.search); } catch (e) { }
  }
  function openFromHash() {
    var id = (location.hash || '').slice(1);
    // קישור ישן לפרויקט בדף הבית: הפרויקטים נמצאים עכשיו בתיק העבודות
    if (DATA[id] && !caseEl) { location.replace(T('work.html#', 'en-work.html#') + id); return; }
    if (!DATA[id]) { jumpToHash(id); return; }
    if (!caseEl.hidden && current === id) return;
    var li = $('.project[data-id="' + id + '"]');
    if (li) openCase(id, li);
  }
  // הגעה מדף אחר אל חלק מסוים (למשל index.html#pricing): קופצים אליו אחרי שההצמדות חושבו
  function jumpToHash(id) {
    var el = id && document.getElementById(id);
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { immediate: true, force: true });
    else el.scrollIntoView();
  }
  window.addEventListener('hashchange', openFromHash);

  if (caseEl) {
    $('.case-close').addEventListener('click', closeCase);
    $('.case-next').addEventListener('click', nextCase);
  }
  document.addEventListener('keydown', function (e) {
    if (!caseEl) return;
    if (e.key === 'Escape') closeCase();
    if (e.key === 'Tab' && !caseEl.hidden) {
      var f = $$('button, a[href]', caseEl).filter(function (el) { return el.offsetParent !== null; });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });

  /* ---------- לפני / אחרי ---------- */
  function initCompare() {
    var screen = $('.phone-screen'), after = $('.ba-after'), handle = $('.ba-handle'), range = $('.ba-range');
    if (!screen) return;
    var s = { t: 50, c: 50, v: 0 }, dragging = false, running = false, visible = false;

    function render(time) {
      var prev = s.c;
      s.c += (s.t - s.c) * (motion ? 0.12 : 1);
      s.v = s.v * 0.9 + Math.abs(s.c - prev);
      var amp = motion ? 0.6 + Math.min(s.v, 6) * 0.9 : 0;
      var pts = ['0% 0%'];
      var steps = 28;
      for (var i = 0; i <= steps; i++) {
        var y = i / steps;
        var x = s.c + Math.sin(y * 9 + time * 2.2) * amp + Math.sin(y * 23 - time * 3.1) * amp * 0.45;
        pts.push(x.toFixed(2) + '% ' + (y * 100).toFixed(2) + '%');
      }
      pts.push('0% 100%');
      after.style.clipPath = 'polygon(' + pts.join(',') + ')';
      handle.style.setProperty('--x', s.c + '%');
    }
    function loop() {
      if (!running) return;
      render(performance.now() / 1000);
      requestAnimationFrame(loop);
    }
    function setFrom(e) {
      var r = screen.getBoundingClientRect();
      s.t = clamp((e.clientX - r.left) / r.width * 100, 0, 100);
      range.value = Math.round(s.t);
      if (!motion) render(0);
    }
    screen.addEventListener('pointerdown', function (e) { dragging = true; screen.setPointerCapture(e.pointerId); setFrom(e); });
    screen.addEventListener('pointermove', function (e) { if (dragging || e.pointerType === 'mouse') setFrom(e); });
    screen.addEventListener('pointerup', function () { dragging = false; });
    screen.addEventListener('pointercancel', function () { dragging = false; });
    range.addEventListener('input', function () { s.t = +range.value; if (!motion) render(0); });
    render(0);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        visible = en[0].isIntersecting;
        if (visible && !running && motion) { running = true; loop(); }
        if (!visible) running = false;
      }).observe(screen);
    }

    if (!motion) return;
    ScrollTrigger.create({
      trigger: '.ba-stage', start: 'top 70%', once: true,
      onEnter: function () {
        gsap.timeline()
          .to(s, { t: 88, duration: 1.1, ease: 'power3.inOut' })
          .to(s, { t: 14, duration: 1.3, ease: 'power3.inOut' })
          .to(s, { t: 50, duration: 1, ease: 'power3.inOut', onComplete: function () { range.value = 50; } });
      }
    });

    // המספרים מתכווצים מול העיניים
    $$('.metric').forEach(function (m, i) {
      var b = $('b', m), from = +m.dataset.from, to = +m.dataset.to, unit = m.dataset.unit;
      var o = { n: from };
      b.textContent = from + unit;
      ScrollTrigger.create({
        trigger: m, start: 'top 85%', once: true,
        onEnter: function () {
          gsap.to(o, {
            n: to, duration: 1.8, delay: i * 0.12, ease: 'expo.inOut',
            onUpdate: function () { b.textContent = Math.round(o.n) + unit; },
            onComplete: function () { m.classList.add('done'); }
          });
        }
      });
    });
  }

  /* ---------- תהליך: הכרטיס נבנה ---------- */
  function initCraft() {
    var spec = $('.specimen'), steps = $$('.step'), capN = $('.cap-n'), capT = $('.cap-t');
    var names = EN ? ['Sketch', 'Structure', 'Material', 'Motion'] : ['שרטוט', 'שלד', 'חומר', 'תנועה'];
    if (!spec) return;
    function stage(n) {
      if (spec.dataset.stage === String(n)) return;
      spec.dataset.stage = n;
      steps.forEach(function (s, i) { s.classList.toggle('is-on', i === n); });
      if (capN) capN.textContent = '0' + (n + 1);
      capT.textContent = names[n];
    }
    if (!motion) {
      stage(2);
      steps.forEach(function (s) { s.classList.add('is-on'); });
      return;
    }
    ScrollTrigger.create({
      trigger: '.craft', start: 'top top', end: '+=260%', pin: true, pinSpacing: true, anticipatePin: 1,
      onUpdate: function (s) { stage(Math.min(3, Math.floor(s.progress * 4))); }
    });
  }

  /* ---------- סמן ומגנטים ---------- */
  function initCursor() {
    if (!motion || !finePointer) return;
    root.classList.add('has-cursor');
    var cur = $('.cursor'), label = $('.cursor-label'), heroEl = $('.hero');
    var xTo = gsap.quickTo(cur, 'x', { duration: 0.35, ease: 'power3' });
    var yTo = gsap.quickTo(cur, 'y', { duration: 0.35, ease: 'power3' });
    window.addEventListener('pointermove', function (e) {
      xTo(e.clientX); yTo(e.clientY);
      var t = e.target;
      var view = (t.closest && t.closest('.p-media')) || (heroEl && heroEl.classList.contains('relic-hover') && t.closest && t.closest('.hero'));
      var drag = t.closest && t.closest('.phone-screen, .p-relic, .case-relic');
      var link = t.closest && t.closest('a, button, input');
      cur.classList.toggle('is-view', !!view);
      cur.classList.toggle('is-drag', !view && !!drag);
      cur.classList.toggle('is-link', !view && !drag && !!link);
      var tagged = !view && !drag && t.closest && t.closest('[data-cursor]');
      if (tagged) { cur.classList.remove('is-link'); cur.classList.add('is-view'); }
      label.textContent = view ? T('פתיחה', 'Open') : drag ? (drag.classList.contains('phone-screen') ? T('גררו', 'Drag') : T('סובבו', 'Spin')) : tagged ? tagged.dataset.cursor : '';
    }, { passive: true });

    $$('.magnetic').forEach(function (el) {
      var inner = el.firstElementChild;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        gsap.to(el, { x: dx * 0.35, y: dy * 0.35, duration: 0.5, ease: 'power3' });
        gsap.to(inner, { x: dx * 0.15, y: dy * 0.15, duration: 0.5, ease: 'power3' });
      });
      el.addEventListener('pointerleave', function () {
        gsap.to([el, inner], { x: 0, y: 0, duration: 1.1, ease: 'elastic.out(1, .35)' });
      });
    });
  }

  /* ---------- רנטגן ---------- */
  function initXray() {
    var btn = $('.xray-toggle'), lens = $('.lens'), box = $('.inspect'), lab = $('.inspect-label');
    var px = -999, py = -999, raf = 0;
    function setX(on) {
      root.classList.toggle('xray', on);
      root.classList.toggle('lens-on', on && finePointer);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      st.xray = on ? 1 : 0;
      if (!on) box.classList.remove('on');
      say(on ? T('מצב רנטגן פעיל: רואים את השלד שמתחת לעיצוב', 'X-ray on: you can see the skeleton under the design') : T('מצב רנטגן כבוי', 'X-ray off'));
    }
    btn.addEventListener('click', function () { setX(!root.classList.contains('xray')); });
    var footX = $('.foot-xray');
    if (footX) footX.addEventListener('click', function () { setX(!root.classList.contains('xray')); });
    document.addEventListener('keydown', function (e) {
      if ((e.key === 'x' || e.key === 'X' || e.key === 'ס') && !e.metaKey && !e.ctrlKey && !e.altKey && !/input|textarea|select/i.test(e.target.tagName)) {
        setX(!root.classList.contains('xray'));
      }
    });

    function describe(el) {
      var cs = getComputedStyle(el), r = el.getBoundingClientRect();
      var cls = (typeof el.className === 'string' && el.className.trim()) ? '.' + el.className.trim().split(/\s+/)[0] : '';
      var fam = cs.fontFamily.split(',')[0].replace(/["']/g, '');
      return el.tagName.toLowerCase() + cls + '  ' + Math.round(r.width) + '×' + Math.round(r.height) +
        '  ·  ' + fam + ' ' + cs.fontWeight + ' / ' + Math.round(parseFloat(cs.fontSize)) + 'px';
    }
    function inspect() {
      raf = 0;
      if (finePointer) { lens.style.transform = 'translate(' + px + 'px,' + py + 'px)'; }
      var el = document.elementFromPoint(px, py);
      if (!el || el === document.body || el === root || el.tagName === 'MAIN' || el.tagName === 'CANVAS' || el.closest('.bar')) {
        box.classList.remove('on'); return;
      }
      var r = el.getBoundingClientRect();
      box.style.transform = 'translate(' + r.left + 'px,' + r.top + 'px)';
      box.style.width = r.width + 'px';
      box.style.height = r.height + 'px';
      box.classList.toggle('flip', r.top < 40);
      lab.textContent = describe(el);
      box.classList.add('on');
    }
    function queue(e) {
      if (!root.classList.contains('xray')) return;
      px = e.clientX; py = e.clientY;
      if (!raf) raf = requestAnimationFrame(inspect);
    }
    window.addEventListener('pointermove', queue, { passive: true });
    window.addEventListener('pointerdown', queue, { passive: true });
    window.addEventListener('scroll', function () { if (root.classList.contains('xray') && px > -999 && !raf) raf = requestAnimationFrame(inspect); }, { passive: true });
  }

  /* ---------- בריף: שלוש שאלות והודעת וואטסאפ מוכנה ---------- */
  var CONTACT = { whatsapp: '972545522053', email: 'boss@hgpro.io' };
  function initBrief() {
    var form = $('#brief');
    if (!form) return;
    var steps = $$('.brief-step', form), dots = $$('.brief-steps li', form);
    var back = $('.brief-back', form), go = $('.brief-go', form), err = $('.brief-error', form);
    var done = $('.brief-done', form), nav = $('.brief-nav', form), stepsBar = $('.brief-steps', form);
    var at = 0;
    // כפתור "מתחילים" בחבילה: החבילה נכנסת להודעה, והתקציב או המטרה שלה כבר מסומנים
    var plan = document.createElement('p');
    plan.className = 'brief-plan mono'; plan.hidden = true;
    plan.innerHTML = '<span>' + T('חבילה: ', 'Package: ') + '<b></b></span><button type="button" aria-label="' + T('הסרת החבילה', 'Remove package') + '">×</button>';
    form.insertBefore(plan, form.firstChild);
    function setPlan(name) {
      if (name) form.dataset.plan = name; else delete form.dataset.plan;
      $('b', plan).textContent = name || '';
      plan.hidden = !name;
    }
    $('button', plan).addEventListener('click', function () { setPlan(''); });
    $$('.tier-cta').forEach(function (a) {
      a.addEventListener('click', function () {
        setPlan(a.dataset.plan);
        var pick = function (name, v) { if (!v) return; $$('input[name="' + name + '"]', form).forEach(function (i) { if (i.value === v) i.checked = true; }); };
        pick('budget', a.dataset.budget); pick('goal', a.dataset.goal);
        say(EN ? a.dataset.plan + ' package selected. Answer three questions and your message will be ready.' : 'נבחרה חבילת ' + a.dataset.plan + '. ענו על שלוש השאלות וההודעה תהיה מוכנה.');
      });
    });
    var need = EN ? ['Pick a type of business to continue.', 'Pick at least one goal.', 'Pick a budget range.'] : ['בחרו סוג עסק כדי להמשיך.', 'בחרו לפחות מטרה אחת.', 'בחרו טווח תקציב.'];
    function values(name) { return $$('input[name="' + name + '"]:checked', form).map(function (i) { return i.value; }); }
    function show(n) {
      steps.forEach(function (s, i) { s.hidden = i !== n; s.classList.toggle('on', i === n); });
      dots.forEach(function (d, i) { d.classList.toggle('on', i <= n); });
      back.hidden = n === 0;
      $('span', go).textContent = n === steps.length - 1 ? T('הכנת ההודעה', 'Write my message') : T('המשך', 'Next');
      err.textContent = '';
      at = n;
      var first = $('input', steps[n]);
      if (first && motion && window.gsap) gsap.fromTo($$('.chip', steps[n]), { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, stagger: 0.04, ease: 'expo.out' });
    }
    function message() {
      var name = $('#brief-name').value.trim(), about = $('#brief-about').value.trim();
      var lines = [T('היי חנוך, הגעתי מהאתר שלך.', 'Hi Hanoch, I found you through your website.'), ''];
      if (form.dataset.plan) lines.push(T('חבילה: ', 'Package: ') + form.dataset.plan);
      lines.push(T('העסק: ', 'Business: ') + values('biz').join(', '), T('מה האתר צריך לעשות: ', 'What the site should do: ') + values('goal').join(', '), T('תקציב: ', 'Budget: ') + values('budget').join(', '));
      if (about) lines.push(T('על העסק: ', 'About the business: ') + about);
      if (name) lines.push('', name);
      return lines.join('\n');
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var key = ['biz', 'goal', 'budget'][at];
      if (!values(key).length) { err.textContent = need[at]; return; }
      if (at < steps.length - 1) { show(at + 1); return; }
      var text = message();
      $('.brief-preview', form).textContent = text;
      $('.brief-wa', form).href = 'https://wa.me/' + CONTACT.whatsapp + '?text=' + encodeURIComponent(text);
      var mail = $('.brief-mail', form);
      mail.hidden = !CONTACT.email;
      if (CONTACT.email) mail.href = 'mailto:' + CONTACT.email + '?subject=' + encodeURIComponent(T('פרויקט חדש מהאתר', 'New project from your website')) + '&body=' + encodeURIComponent(text);
      steps.forEach(function (s) { s.hidden = true; });
      nav.hidden = true; stepsBar.hidden = true; err.textContent = '';
      done.hidden = false;
      say(T('ההודעה מוכנה', 'Your message is ready'));
      if (motion && window.gsap) gsap.from(done, { y: 30, autoAlpha: 0, duration: 0.7, ease: 'expo.out' });
    });
    back.addEventListener('click', function () { if (at > 0) show(at - 1); });
    // בחירה ברדיו מתקדמת לבד לשלב הבא
    form.addEventListener('change', function (e) {
      if (e.target.type === 'radio' && at < steps.length - 1) setTimeout(function () { form.requestSubmit ? form.requestSubmit() : go.click(); }, 260);
    });
    $('.brief-copy', form).addEventListener('click', function () {
      var t = $('.brief-preview', form).textContent, b = this;
      var ok = function () { b.textContent = T('הועתק', 'Copied'); setTimeout(function () { b.textContent = T('העתקת ההודעה', 'Copy message'); }, 1800); };
      if (navigator.clipboard) navigator.clipboard.writeText(t).then(ok, function () { selectPreview(); });
      else selectPreview();
    });
    function selectPreview() {
      var r = document.createRange(); r.selectNodeContents($('.brief-preview', form));
      var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
    }
    $('.brief-restart', form).addEventListener('click', function () {
      form.reset(); done.hidden = true; nav.hidden = false; stepsBar.hidden = false; show(0);
    });
    show(0);
  }

  /* ---------- תהליך: הקו מתמלא והשלבים נכנסים ---------- */
  function initProcess() {
    var tl = $('.timeline');
    if (!tl || !motion) return;
    var items = $$('.timeline li', tl);
    // שלב שעוד לא הגיע נשאר קריא (ניגודיות תקינה); האייקון האפור והקו הכתום מספרים איפה אנחנו
    gsap.set(items, { autoAlpha: 0.78, y: 30 });
    ScrollTrigger.create({
      trigger: tl, start: 'top 75%', end: 'bottom 60%', scrub: true,
      onUpdate: function (s) {
        tl.style.setProperty('--fill', s.progress.toFixed(3));
        var n = Math.ceil(s.progress * items.length + 0.2);
        items.forEach(function (it, i) {
          var on = i < n;
          if (on !== it._on) { it._on = on; it.classList.toggle('is-on', on); gsap.to(it, { autoAlpha: on ? 1 : 0.78, y: on ? 0 : 30, duration: 0.6, ease: 'expo.out' }); }
        });
      }
    });
  }

  // בטלפון כל סרטון נטען בגרסה קלה (540p), שמספיקה למסך קטן ושוקלת כשליש
  var smallScreen = window.matchMedia('(max-width: 900px)').matches;
  function videoSrc(v) { return (smallScreen && v.dataset.srcM) || v.dataset.src; }

  /* ---------- סרט התדמית: לולאה שקטה ברקע, והסרט המלא בחלון על כל המסך ---------- */
  function initFilm() {
    $$('.film-bg video, .sheet-film video, .process-crystal video').forEach(function (v) {
      if (!motion || !('IntersectionObserver' in window)) return;
      new IntersectionObserver(function (en) {
        if (en[0].isIntersecting) {
          if (!v.src) { if (v.dataset.poster) v.poster = v.dataset.poster; setVideo(v, videoSrc(v)); v.addEventListener('playing', function () { v.classList.add('on'); v.parentNode.classList.add('is-live'); }, { once: true }); }
          playVideo(v);
        } else if (v.src) pauseVideo(v);
      }, { rootMargin: '100px 0px' }).observe(v.parentNode);
    });
    var dlg = $('.film-dlg');
    if (!dlg || !dlg.showModal) return;
    var vid = $('.film-video', dlg), from = null;
    // אותו חלון מנגן גם את הפרסומת: כפתור עם data-film-src מחליף את הסרט, ועם data-film-sound הוא מתנגן עם קול
    var reel = { src: vid.dataset.src, srcM: vid.dataset.srcM, poster: vid.getAttribute('poster'), label: dlg.getAttribute('aria-label') };
    function close() { if (dlg.open) dlg.close(); }
    dlg.addEventListener('close', function () { pauseVideo(vid); if (lenis) lenis.start(); if (from) from.focus(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); });
    $('.film-close', dlg).addEventListener('click', close);
    $$('button[data-film]').forEach(function (b) {
      b.addEventListener('click', function () {
        from = b;
        var f = b.dataset.filmSrc ? { src: b.dataset.filmSrc, srcM: b.dataset.filmSrcM, poster: b.dataset.filmPoster, label: b.dataset.filmLabel } : reel;
        if (vid.dataset.cur !== f.src) {
          vid.dataset.src = f.src; vid.dataset.srcM = f.srcM || f.src; vid.setAttribute('poster', f.poster);
          dlg.setAttribute('aria-label', f.label || reel.label);
          setVideo(vid, videoSrc(vid)); vid.dataset.cur = f.src;
        }
        vid.muted = !('filmSound' in b.dataset);
        dlg.showModal();
        if (lenis) lenis.stop();
        vid.currentTime = 0;
        playVideo(vid);
      });
    });
  }

  /* ---------- הדמות בפתיחה: נכנסת עם החשיפה, ונעלמת כשהמצלמה צוללת לתוך ה-ח ---------- */
  function initPortrait() {
    var el = $('.hero-portrait');
    if (!el || !motion) return;
    var img = $('img', el);
    gsap.set(img, { autoAlpha: 0, y: 60 });
    // הדמות חיה: בכרום, אדג' ופיירפוקס וידאו WebM עם ערוץ שקיפות. ספארי לא מציג שקיפות כזו,
    // אז שם מגיע סרט "מוערם": הצבע בחצי העליון והשקיפות בתחתון, ו-WebGL מרכיב אותם בכל פריים
    var anim = $('.portrait-anim', el), media = null;
    var apple = /Apple/.test(navigator.vendor || '');
    function alive() { el.classList.add('is-alive'); }
    function play() { playVideo(media); }
    function wake() {
      if (!anim) return;
      if (apple) media = stacked();
      else if (anim.canPlayType('video/webm; codecs="vp9"')) {
        media = anim;
        setVideo(anim, anim.dataset.src);
        anim.addEventListener('playing', alive, { once: true });
      }
      if (!media) return;
      play();
      // הדמות נעלמת כשגוללים: גם הסרט עוצר
      if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { if (en[0].isIntersecting) play(); else media.pause(); }).observe(el);
    }
    function stacked() {
      var cv = document.createElement('canvas');
      var gl = anim.dataset.stack && cv.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false });
      if (!gl) return null;
      var v = document.createElement('video');
      v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto';
      v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true');
      v.className = 'portrait-src';
      function sh(type, src) { var o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); return o; }
      var pg = gl.createProgram();
      gl.attachShader(pg, sh(gl.VERTEX_SHADER, 'attribute vec2 p;varying vec2 u;void main(){u=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}'));
      // הצבע כבר מוכפל בשקיפות; min שומר על פיקסל תקין גם אחרי דחיסה
      gl.attachShader(pg, sh(gl.FRAGMENT_SHADER, 'precision mediump float;uniform sampler2D t;uniform float m;varying vec2 u;void main(){float y=clamp(u.y,.002,.998)*.5;float a=texture2D(t,vec2(u.x,y+.5)).r;gl_FragColor=vec4(min(texture2D(t,vec2(u.x,y)).rgb,vec3(a)),a)*(1.-m*clamp((u.y-.72)/.26,0.,1.));}'));
      gl.linkProgram(pg); gl.useProgram(pg);
      // בטלפון הדמות נמסה בתחתית. כאן ולא ב-CSS: ספארי מקפיא שכבה חיה שיש עליה מסכה
      gl.uniform1f(gl.getUniformLocation(pg, 'm'), window.matchMedia('(max-width: 560px)').matches ? 1 : 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(pg, 'p');
      gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
      [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach(function (k) { gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE); });
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      var first = true, last = -1;
      function draw() {
        if (v.readyState < 2) return;
        if (first) { cv.width = v.videoWidth; cv.height = v.videoHeight / 2; gl.viewport(0, 0, cv.width, cv.height); }
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, v);
        gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        if (first) { first = false; alive(); }
      }
      if (v.requestVideoFrameCallback) {
        var onFrame = function () { draw(); v.requestVideoFrameCallback(onFrame); };
        v.requestVideoFrameCallback(onFrame);
      } else {
        (function tick() { if (!v.paused && v.currentTime !== last) { last = v.currentTime; draw(); } requestAnimationFrame(tick); })();
      }
      cv.className = anim.className;
      cv.setAttribute('aria-hidden', 'true');
      anim.replaceWith(cv);
      cv.parentNode.appendChild(v);
      setVideo(v, anim.dataset.stack);
      return v;
    }
    var show = function () { gsap.to(img, { autoAlpha: 1, y: 0, duration: 1.4, delay: 0.6, ease: 'expo.out', onComplete: wake }); };
    if (HG.introDone) show(); else window.addEventListener('hg:intro', show, { once: true });
    gsap.to(el, { autoAlpha: 0, yPercent: 18, scale: 0.92, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: '+=35%', scrub: true } });
  }

  /* ---------- העולם שמאחורי האתר: הסרט של החלק שבאמצע המסך מתנגן, וכל השאר עוצר ---------- */
  function initSiteFilm() {
    var layer = $('.site-film');
    if (!layer || !('IntersectionObserver' in window)) return;
    var vids = {}, cur = null, active = new Map();
    $$('video', layer).forEach(function (v) { vids[v.dataset.film] = v; });
    function show(kind) {
      if (kind === cur) return;
      cur = kind;
      layer.dataset.mode = kind || '';
      Object.keys(vids).forEach(function (k) {
        var v = vids[k], on = k === kind;
        if (on && v.dataset.poster && !v.poster) v.poster = v.dataset.poster;
        v.classList.toggle('on', on);
        if (on && motion) {
          if (!v.src) setVideo(v, videoSrc(v));
          playVideo(v);
        } else if (v.src) pauseVideo(v);
      });
    }
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) active.set(e.target, e.target.dataset.bg); else active.delete(e.target); });
      var k = null; active.forEach(function (v) { k = v; });
      show(k);
    }, { rootMargin: '-45% 0px -45% 0px' });
    $$('[data-bg]').forEach(function (sec) { io.observe(sec); });
  }

  /* ---------- מגנט: האלמנט נמשך אחרי העכבר כשהוא מתקרב (הדמות בפתיחה) ---------- */
  function initMagnet() {
    if (!motion || !finePointer) return;
    $$('[data-magnet]').forEach(function (el) {
      var pad = +el.dataset.magnetPad || 150, k = +el.dataset.magnet || 3, on = false;
      el.style.willChange = 'transform';
      window.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        var near = e.clientX > r.left - pad && e.clientX < r.right + pad && e.clientY > r.top - pad && e.clientY < r.bottom + pad;
        if (near !== on) { on = near; el.style.transition = on ? 'transform .3s ease-out' : 'transform .6s ease-in-out'; }
        el.style.transform = on ? 'translate3d(' + ((e.clientX - cx) / k).toFixed(1) + 'px,' + ((e.clientY - cy) / k).toFixed(1) + 'px,0)' : 'translate3d(0,0,0)';
      }, { passive: true });
    });
  }

  /* ---------- חבילות ושאלות: כניסה בגלילה ואור שעוקב אחרי העכבר ---------- */
  function initPricing() {
    var tiers = $$('.tier');
    // הסמל של כל חבילה מתעורר כשמצביעים על הכרטיס. בטלפון נשארת תמונה שקטה: הפחות תנועה, יותר מקום לתוכן
    if (motion && finePointer) {
      $$('.tier').forEach(function (t) {
        var v = $('.tier-emblem video', t);
        if (!v) return;
        t.addEventListener('pointerenter', function () {
          if (!v.src) { setVideo(v, v.dataset.src); v.addEventListener('playing', function () { v.classList.add('on'); }, { once: true }); }
          playVideo(v);
        });
        t.addEventListener('pointerleave', function () { pauseVideo(v); });
      });
    }
    if (window.matchMedia('(hover: hover)').matches) {
      tiers.forEach(function (t) {
        t.addEventListener('pointermove', function (e) {
          var r = t.getBoundingClientRect();
          t.style.setProperty('--mx', (e.clientX - r.left) + 'px');
          t.style.setProperty('--my', (e.clientY - r.top) + 'px');
        });
      });
    }
    if (!motion) return;
    [['.tier', 0.12], ['.upgrade, .promises li', 0.08], ['.sr-cat', 0.07], ['.sr-body', 0], ['.care-plan', 0.1], ['.faq-list details', 0.05]].forEach(function (g) {
      var els = $$(g[0]);
      if (!els.length) return;
      gsap.set(els, { autoAlpha: 0, y: 50 });
      ScrollTrigger.batch(els, {
        start: 'top 88%', once: true,
        onEnter: function (b) { gsap.to(b, { autoAlpha: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: g[1], overwrite: true }); }
      });
    });
  }

  /* ---------- דוגמה חיה: ההדמיה נטענת רק כשלוחצים (מודל של 5MB וקול) ---------- */
  function initDemo() {
    var btn = $('.demo-play'), view = $('.demo-view');
    if (!btn || !view) return;
    var small = window.matchMedia('(max-width: 900px)');
    var title = T('הדמיה חיה: הפסקת חשמל בחוות שרתים', 'Live simulation: a power outage at a data center');
    function frameEl(q) {
      var f = document.createElement('iframe');
      f.className = 'demo-iframe';
      f.src = 'sim/data-center/index.html?' + q + (EN ? '&lang=en' : '');
      f.title = title;
      f.allow = 'autoplay; fullscreen';
      f.setAttribute('allowfullscreen', '');
      f.addEventListener('load', function () { try { f.focus(); } catch (e) { } });
      return f;
    }
    // בטלפון ההדמיה נפתחת על כל המסך: יש מקום לכל הנתונים, ואצבע אחת מסובבת את המודל בלי להילחם בגלילת הדף
    var sheet = null;
    function closeSheet() {
      if (!sheet) return;
      var s = sheet; sheet = null;
      s.classList.remove('is-open');
      document.documentElement.classList.remove('demo-lock');
      if (lenis) lenis.start();
      window.removeEventListener('keydown', onKey);
      setTimeout(function () { s.remove(); }, 350);
      btn.focus();
    }
    function onKey(e) { if (e.key === 'Escape') closeSheet(); }
    window.addEventListener('message', function (e) { if (e.data === 'sim:close') closeSheet(); });
    btn.addEventListener('click', function () {
      if (small.matches) {
        sheet = document.createElement('div');
        sheet.className = 'demo-sheet';
        sheet.setAttribute('role', 'dialog');
        sheet.setAttribute('aria-modal', 'true');
        sheet.setAttribute('aria-label', title);
        sheet.appendChild(frameEl('embed=1&full=1'));
        document.body.appendChild(sheet);
        document.documentElement.classList.add('demo-lock');
        if (lenis) lenis.stop();
        window.addEventListener('keydown', onKey);
        requestAnimationFrame(function () { requestAnimationFrame(function () { if (sheet) sheet.classList.add('is-open'); }); });
        say(T('ההדמיה נפתחת על כל המסך', 'The simulation opens full screen'));
        return;
      }
      view.appendChild(frameEl('embed=1'));
      view.classList.add('is-live');
      btn.hidden = true;
      say(T('ההדמיה נטענת', 'Loading the simulation'));
    });
  }

  /* ---------- תפריט בטלפון ----------
     בטלפון הקישורים של הסרגל מוסתרים. במקומם: כפתור "דברו איתי" שתמיד גלוי, ותפריט מסך מלא
     עם כל החלקים, וואטסאפ וטלפון, וההגדרות (קול, רנטגן, שפה) שפינו מקום בסרגל */
  function initMenu() {
    var bar = $('.bar'), nav = $('.bar-nav');
    if (!bar || !nav) return;
    var contact = $('#contact');
    var cta = document.createElement('a');
    cta.className = 'bar-cta mono';
    cta.href = contact ? '#contact' : T('index.html#contact', 'en.html#contact');
    cta.textContent = T('דברו איתי', 'Talk to me');
    var btn = document.createElement('button');
    btn.className = 'menu-btn'; btn.type = 'button';
    btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', 'menu');
    btn.setAttribute('aria-label', T('תפריט', 'Menu'));
    btn.innerHTML = '<i></i><i></i>';
    bar.appendChild(cta); bar.appendChild(btn);

    var menu = document.createElement('div');
    menu.className = 'menu'; menu.id = 'menu'; menu.hidden = true;
    menu.setAttribute('role', 'dialog'); menu.setAttribute('aria-modal', 'true'); menu.setAttribute('aria-label', T('תפריט', 'Menu'));
    var links = $$('a', nav).map(function (a) {
      return '<li><a class="menu-link display" href="' + a.getAttribute('href') + '">' + a.textContent + '</a></li>';
    });
    if ($('#faq')) links.splice(links.length - 1, 0, '<li><a class="menu-link display" href="#faq">' + T('שאלות', 'FAQ') + '</a></li>');
    var lang = $('.lang-switch');
    menu.innerHTML =
      '<ul class="menu-links">' + links.join('') + '</ul>' +
      '<div class="menu-foot">' +
        '<a class="btn btn-signal menu-wa" href="https://wa.me/' + CONTACT.whatsapp + '" target="_blank" rel="noopener"><span>' + T('שלחו לי הודעה בוואטסאפ', 'Message me on WhatsApp') + '</span></a>' +
        '<a class="menu-tel mono" href="tel:+' + CONTACT.whatsapp + '" dir="ltr">' + T('054-5522053', '+972 54-552-2053') + '</a>' +
        '<div class="menu-tools mono">' +
          '<button type="button" data-proxy=".sound-toggle">' + T('קול', 'Sound') + '</button>' +
          '<button type="button" data-proxy=".xray-toggle">' + T('רנטגן', 'X-ray') + '</button>' +
          (lang ? '<a href="' + lang.getAttribute('href') + '" hreflang="' + lang.getAttribute('hreflang') + '" lang="' + lang.getAttribute('lang') + '">' + T('English', 'עברית') + '</a>' : '') +
        '</div>' +
      '</div>';
    document.body.appendChild(menu);

    var open = false;
    function syncTools() {
      $$('[data-proxy]', menu).forEach(function (b) { var t = $(b.dataset.proxy); b.setAttribute('aria-pressed', t ? t.getAttribute('aria-pressed') : 'false'); });
    }
    function set(on) {
      if (on === open) return;
      open = on;
      btn.setAttribute('aria-expanded', on);
      btn.setAttribute('aria-label', on ? T('סגירת התפריט', 'Close menu') : T('תפריט', 'Menu'));
      root.classList.toggle('menu-open', on);
      if (on) {
        menu.hidden = false; syncTools();
        if (lenis) lenis.stop();
        requestAnimationFrame(function () { menu.classList.add('is-open'); });
        if (motion) gsap.fromTo($$('.menu-links li, .menu-foot > *', menu), { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, stagger: 0.05, delay: 0.12, ease: 'expo.out' });
        var first = $('.menu-link', menu); if (first) first.focus({ preventScroll: true });
      } else {
        menu.classList.remove('is-open');
        if (lenis) lenis.start();
        setTimeout(function () { if (!open) menu.hidden = true; }, motion ? 450 : 0);
      }
    }
    btn.addEventListener('click', function () { set(!open); if (!open) btn.focus(); });
    function go(href, e) {
      if (href.charAt(0) !== '#') { set(false); return; }
      var el = $(href);
      if (!el) return;
      e.preventDefault();
      set(false);
      if (lenis) lenis.scrollTo(el, { duration: 1.4, force: true }); else el.scrollIntoView({ behavior: motion ? 'smooth' : 'auto' });
    }
    cta.addEventListener('click', function (e) { go(cta.getAttribute('href'), e); });
    menu.addEventListener('click', function (e) {
      var a = e.target.closest('a'), b = e.target.closest('[data-proxy]');
      if (b) { var t = $(b.dataset.proxy); if (t) t.click(); syncTools(); return; }
      if (a) go(a.getAttribute('href'), e);
    });
    document.addEventListener('keydown', function (e) {
      if (!open) return;
      if (e.key === 'Escape') { set(false); btn.focus(); }
      if (e.key === 'Tab') {
        var f = [btn].concat($$('a, button', menu));
        var i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    });
    window.matchMedia('(min-width: 901px)').addEventListener('change', function (m) { if (m.matches) set(false); });
  }

  /* ---------- סיור בהדמיה: הסרט נטען רק כשלוחצים, ורק אחד מתנגן בכל רגע ---------- */
  function initTours() {
    var tours = $$('.tour');
    if (!tours.length) return;
    var vids = tours.map(function (t) { return $('video', t); });
    tours.forEach(function (t, i) {
      var v = vids[i], view = $('.tour-view', t), btn = $('.tour-play', t);
      btn.addEventListener('click', function () {
        vids.forEach(function (o) { if (o !== v) pauseVideo(o); });
        if (!v.src) setVideo(v, videoSrc(v));
        // לסיורים יש פסקול: נשמע רק אחרי לחיצה, כך שהדפדפן מרשה להפעיל עם קול
        v.muted = false;
        v.controls = true;
        view.classList.add('is-live');
        playVideo(v);
        v.focus({ preventScroll: true });
      });
      v.addEventListener('play', function () { vids.forEach(function (o) { if (o !== v) pauseVideo(o); }); });
    });
    // התמונה של הסיור נטענת רק כשמתקרבים, ובטלפון בגודל שמתאים למסך
    var setPoster = function (v) { if (!v.poster) v.poster = (smallScreen && v.dataset.posterM) || v.dataset.poster; };
    // גוללים הלאה: הסרט נעצר
    if ('IntersectionObserver' in window) {
      var near = new IntersectionObserver(function (en) {
        en.forEach(function (e) { if (e.isIntersecting) { setPoster($('video', e.target)); near.unobserve(e.target); } });
      }, { rootMargin: '900px 0px' });
      var io = new IntersectionObserver(function (en) {
        en.forEach(function (e) { if (!e.isIntersecting) { var v = $('video', e.target); if (v && !v.paused) pauseVideo(v); } });
      });
      tours.forEach(function (t) { near.observe(t); io.observe(t); });
    } else vids.forEach(setPoster);
  }

  /* ---------- שלושת העקרונות: כניסה מדורגת, הוכחה חיה, הטיה וברק במעבר עכבר ---------- */
  function initPrinciples() {
    var cards = $$('.principles > li');
    if (!cards.length) return;
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (en) {
        en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-on'); io.unobserve(e.target); } });
      }, { threshold: 0.45 });
      cards.forEach(function (c) { io.observe(c); });
    } else cards.forEach(function (c) { c.classList.add('is-on'); });
    if (!motion) return;
    if (window.gsap && window.ScrollTrigger) {
      gsap.from(cards, {
        y: 70, rotateX: 10, autoAlpha: 0, duration: 1.2, ease: 'expo.out', stagger: 0.12, clearProps: 'transform,opacity,visibility',
        scrollTrigger: { trigger: '.principles', start: 'top 85%', once: true }
      });
    }
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    cards.forEach(function (c) {
      c.addEventListener('pointermove', function (e) {
        var r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        c.classList.add('is-tilting');
        c.style.setProperty('--ry', ((x - 0.5) * 9).toFixed(2) + 'deg');
        c.style.setProperty('--rx', ((0.5 - y) * 7).toFixed(2) + 'deg');
        c.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
        c.style.setProperty('--my', (y * 100).toFixed(1) + '%');
      });
      c.addEventListener('pointerleave', function () {
        c.classList.remove('is-tilting');
        c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* ---------- פס התקדמות בגלילה ---------- */
  function initProgress() {
    var bar = $('.progress i');
    if (!bar) return;
    var tick = function () {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, window.scrollY / h) : 0).toFixed(4) + ')';
    };
    window.addEventListener('scroll', tick, { passive: true });
    tick();
  }

  /* ---------- צלילים: מסונתזים בדפדפן, כבויים עד שמבקשים ---------- */
  var sfx = (function () {
    var ctx = null, master = null, on = false, drone = null;
    var notes = [523.25, 587.33, 659.25, 783.99, 880, 1046.5]; // סולם פנטטוני
    function ensure() {
      if (ctx) return true;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
      return true;
    }
    function startDrone() {
      if (drone) return;
      var g = ctx.createGain(); g.gain.value = 0.05;
      var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 320;
      [55, 82.41, 110.3].forEach(function (hz, i) {
        var o = ctx.createOscillator(); o.type = i ? 'sine' : 'triangle'; o.frequency.value = hz; o.detune.value = i * 4;
        o.connect(f); o.start();
      });
      f.connect(g); g.connect(master); drone = g;
    }
    function env(node, peak, decay) {
      var t = ctx.currentTime;
      node.gain.setValueAtTime(0.0001, t);
      node.gain.exponentialRampToValueAtTime(peak, t + 0.008);
      node.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    }
    return {
      toggle: function () {
        if (!ensure()) return false;
        on = !on;
        if (ctx.state === 'suspended') ctx.resume();
        if (on) startDrone();
        master.gain.setTargetAtTime(on ? 0.9 : 0, ctx.currentTime, 0.25);
        return on;
      },
      ting: function (i) {
        if (!on) return;
        var hz = notes[i % notes.length];
        [1, 2.76, 5.4].forEach(function (m, k) { // צליל זכוכית: יסוד ועליונים לא הרמוניים
          var o = ctx.createOscillator(), g = ctx.createGain();
          o.frequency.value = hz * m; o.connect(g); g.connect(master);
          env(g, [0.14, 0.05, 0.02][k], [1.6, 0.9, 0.5][k]);
          o.start(); o.stop(ctx.currentTime + 1.7);
        });
      },
      whoosh: function () {
        if (!on) return;
        var len = ctx.sampleRate * 0.9, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
        for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        var src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        src.buffer = buf; f.type = 'bandpass'; f.Q.value = 1.4;
        f.frequency.setValueAtTime(300, ctx.currentTime);
        f.frequency.exponentialRampToValueAtTime(3200, ctx.currentTime + 0.7);
        src.connect(f); f.connect(g); g.connect(master);
        env(g, 0.22, 0.85); src.start();
      }
    };
  })();
  var soundBtn = $('.sound-toggle');
  if (soundBtn) soundBtn.addEventListener('click', function () {
    var on = sfx.toggle();
    soundBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    root.classList.toggle('sound-on', on);
    say(on ? T('צלילים פעילים', 'Sound on') : T('צלילים כבויים', 'Sound off'));
  });

  var HG = window.HG = { openCase: function (id, li) { openCase(id, li); }, introDone: !motion, sfx: sfx, setVideo: setVideo, playVideo: playVideo, pauseVideo: pauseVideo };

  /* ---------- הפעלה ---------- */
  initManifesto();
  initBrief();
  initMenu();
  initTours();
  initPrinciples();
  initProcess();
  initProgress();
  initDemo();
  initPricing();
  initFilm();
  initMagnet();
  initSiteFilm();
  initPortrait();
  initProjects();
  initCompare();
  initCraft();
  initCursor();
  initXray();

  if (motion) {
    gsap.ticker.add(frame);
    var introDone = runIntro();
    startParticles();
    introDone.then(function () { ScrollTrigger.refresh(); openFromHash(); });
    // הבמה מאריכה את הפתיחה: מחשבים מחדש את כל נקודות הגלילה
    window.addEventListener('hg:stage', function () { ScrollTrigger.refresh(); });
    // הצמדה משנה גבהים: מחשבים מחדש אחרי שהגופנים נטענו
    if (document.fonts) document.fonts.ready.then(function () { ScrollTrigger.refresh(); }, function () { });
  } else {
    runIntro();
    openFromHash();
  }
})();
