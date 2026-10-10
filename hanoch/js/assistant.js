/* המצפן: היועץ הדיגיטלי של HG Studio, להתייעצות ולמציאת דברים באתר. בלי תלויות.
   שני מצבים: מסלול מודרך שעובד תמיד (שאלות קצרות, המלצה, הוכחה מהתיק ובריף לוואטסאפ),
   ושאלות חופשיות שעוברות לפונקציה /api/chat (Claude). אם השרת לא זמין, המסלול המודרך ממשיך לעבוד.
   השיחה נשמרת רק בלשונית הזו (sessionStorage) ונמחקת כשסוגרים אותה. שום דבר לא נשלח לחנוך בלי לחיצה של הגולש. */
(function () {
  'use strict';
  var EN = document.documentElement.lang === 'en';
  var T = function (he, en) { return EN ? en : he; };
  var WA = '972545522053', KEY = 'hg-chat', API = '/api/chat';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var track = function (n, p) { if (window.gtag) window.gtag('event', n, p || {}); };
  var store = { get: function () { try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch (e) { return null; } },
                set: function (v) { try { sessionStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* אחסון חסום: השיחה פשוט לא נשמרת */ } } };

  /* ---------- הידע של המסלול המודרך ---------- */
  var SV = { // עמוד שירות בעברית ובאנגלית
    site: ['website-building.html', 'en/website-design.html'], landing: ['landing-page.html', 'en/landing-page-design.html'],
    store: ['online-store.html', 'en/ecommerce-store.html'], seo: ['seo.html', 'en/seo-services.html'],
    ad: ['ai-commercial.html', 'en/ai-commercial-production.html'], bot: ['ai-chatbot.html', 'en/ai-customer-agent.html'],
    wix: ['wix-migration.html', 'en/wix-wordpress-migration.html'], brand: ['brand-identity.html', 'en/brand-identity-design.html'],
    social: ['social-media.html', 'en/social-media-for-business.html']
  };
  var sv = function (k) { return '/services/' + SV[k][EN ? 1 : 0]; };
  var work = function (id) { return (EN ? '/en-work.html#' : '/work.html#') + id; };
  var PROJ = {
    gotovski: T('ש. גוטובסקי: חברת תשתיות דלק, אתר שנבנה מחדש עם סיור 360°', 'S. Gotovski: a fuel infrastructure company, rebuilt with a 360° tour'),
    ams: T('AMS: מאמן אגרוף תאילנדי, אתר מלא עם תנועה אמיתית', 'AMS: a Thai boxing coach, a full site with real motion'),
    allenbis: T('אלנביס: שדרוג של חנות קיימת לשתייה וחטיפים', 'Allenbis: upgrading a live drinks and snacks store'),
    clinic: T('רותם גוטובסקי: קליניקה עם חנות ועוזרת אישית', 'Rotem Gotovski: a clinic with a shop and a personal assistant'),
    falafel: T('קייטרינג 4X4: אתר עם מחשבון הצעה לאירועים', '4X4 Catering: a site with an event quote builder'),
    rachel: T('רחלי הורנשטיין: מורה פרטית, בדיקת רמה ומשחקים', 'Racheli Hornstein: a private tutor, level check and games'),
    mashkanta: T('יסוד: אתר הדגמה ליועץ משכנתאות (מותג בדוי)', 'Yesod: a demo site for a mortgage advisor (fictional brand)'),
    elef: T('אֶלֶף: מותג בדוי של שמן זית, אתר וסרט', 'Elef: a fictional olive oil brand, site and film')
  };
  var Q = {
    biz: { q: T('איזה עסק יש לכם?', 'What kind of business do you have?'),
      o: [['store', T('חנות או מוצרים', 'A shop or products')], ['service', T('עסק שנותן שירות', 'A service business')], ['solo', T('עצמאי או פרילנסר', 'Freelancer')], ['company', T('חברה או תעשייה', 'A company')], ['other', T('משהו אחר', 'Something else')]] },
    goal: { q: T('מה הכי חשוב לכם עכשיו?', 'What matters most right now?'),
      o: [['leads', T('יותר פניות', 'More leads')], ['sell', T('למכור אונליין', 'Sell online')], ['brand', T('מותג שזוכרים', 'A brand people remember')], ['social', T('לקוחות מאינסטגרם ופייסבוק', 'Customers from Instagram and Facebook')], ['ads', T('פרסומות וסרטים', 'Commercials and video')], ['unsure', T('עוד לא בטוח', 'Not sure yet')]] },
    now: { q: T('ומה יש לכם היום?', 'And what do you have today?'),
      o: [['none', T('עוד אין אתר', 'No site yet')], ['weak', T('יש אתר שלא מביא פניות', 'A site that brings no leads')], ['wix', T('אתר בוויקס או בוורדפרס', 'A Wix or WordPress site')], ['shop', T('חנות שצריך לשדרג', 'A store that needs an upgrade')], ['unsure', T('לא בטוח', 'Not sure')]] }
  };
  var label = function (k, v) { for (var i = 0; i < Q[k].o.length; i++) if (Q[k].o[i][0] === v) return Q[k].o[i][1]; return v; };

  function recommend(a) {
    var r;
    if (a.goal === 'social') r = { s: 'social', why: T('"הד": מקימים ומנהלים לכם את העמודים באינסטגרם ובפייסבוק, עם תוכן בכל שבוע, פרסומות AI, ימי צילום ופרסום ממומן. שלוש חבילות: התנעה, קבוע ומלא.', 'Echo: we set up and run your Instagram and Facebook pages, with weekly content, AI commercials, shoot days and paid ads. Three packages: Launch, Steady and Full.'), p: ['elef'], films: true };
    else if (a.goal === 'ads') r = { s: 'ad', why: T('פרסומת קולנועית ב-AI: עלילה, דמויות, קריינות ומוזיקה, בלי יום צילום. אפשר פרסומת אחת, ובחבילות "הד" הפרסומות מגיעות יחד עם פרסום, מענה ופרסום ממומן.', 'An AI cinematic commercial: story, characters, voiceover and music, with no shoot day. One film, or as part of the Echo packages, together with publishing, replies and paid ads.'), p: ['elef'], films: true };
    else if (a.goal === 'sell' || a.biz === 'store' || a.now === 'shop') r = { s: 'store', why: a.now === 'shop' ? T('שדרוג החנות שכבר יש לכם: מהירות, טלפון וחוויית קנייה, בלי להתחיל מאפס.', 'Upgrading the store you already have: speed, mobile and the buying experience, without starting over.') : T('חנות אונליין עם קטלוג, עגלה וסליקה, שנבנית סביב איך שאתם מוכרים.', 'An online store with a catalog, cart and payments, built around how you sell.'), p: ['allenbis', 'clinic'] };
    else if (a.now === 'wix') r = { s: 'wix', why: T('מעבר מוויקס או מוורדפרס לאתר מהיר שבנוי בשבילכם, ששומר על המקום בגוגל.', 'Moving from Wix or WordPress to a fast site built for you, keeping your place on Google.'), p: ['gotovski', 'allenbis'] };
    else if (a.goal === 'brand') r = { s: 'brand', why: T('זהות מותגית ואתר דגל (חבילת "חתימה"): קונספט, תנועה ותמונות ברמת סטודיו.', 'A brand identity and a flagship site (the "Signature" package): concept, motion and studio-grade images.'), p: ['gotovski', 'elef'] };
    else if (a.biz === 'solo') r = { s: 'landing', why: T('חבילת "נוכחות": דף אחד שעושה את כל העבודה, עם וואטסאפ, חיוג וגוגל. עד שבוע לאוויר.', 'The "Presence" package: one page that does the whole job, with WhatsApp, calls and Google. Live within a week.'), p: ['rachel', 'ams'] };
    else if (a.now === 'weak') r = { s: 'site', why: T('שדרוג אתר קיים: עיצוב מחדש, מהירות, טלפון וקידום בגוגל, על התוכן שכבר יש לכם.', 'Upgrading your current site: a redesign, speed, mobile and Google, on the content you already have.'), p: ['gotovski', 'allenbis'] };
    else r = { s: 'site', why: T('חבילת "עסק": אתר מלא שמסביר, משכנע ומודד כל פנייה, ושאפשר לעדכן לבד. עד שבועיים לאוויר.', 'The "Business" package: a full site that explains, persuades and tracks every lead, and that you can update yourself. Live within two weeks.'), p: a.biz === 'company' ? ['gotovski', 'mashkanta'] : ['falafel', 'ams'] };
    return r;
  }

  // שאלות נפוצות למצב שבו השרת לא זמין. התשובות לקוחות מהאתר עצמו.
  var FAQ = [
    [/מחיר|עולה|עלות|תקציב|כמה זה|זול|יקר|price|cost|budget|expensive|cheap|how much/i, T('המחיר נקבע לפי מה שהעסק צריך, וההצעה מגיעה בכתב, עם מחיר סגור, לפני שמשהו מתחיל. רוצים שאכין לחנוך בריף קצר כדי שתקבלו הצעה מדויקת?', 'The price depends on what your business needs, and you get a written, fixed-price proposal before anything starts. Want me to prepare a short brief for Hanoch so you get an accurate quote?'), 'brief'],
    [/כמה זמן|מתי|זמנים|לוח זמנים|how long|when|timeline/i, T('דף אחד (נוכחות) עולה לאוויר תוך עד שבוע, ואתר מלא תוך עד שבועיים מהשיחה. פרסומת לוקחת בדרך כלל כמה ימים מאישור התסריט. מה אתם צריכים?', 'A one-page site (Presence) goes live within a week, and a full site within two weeks of the first call. A commercial usually takes a few days from script approval. What do you need?'), 'diag'],
    [/בן אדם|אדם אמיתי|רובוט|בוט|מי אתה|human|robot|bot|who are you|real person/i, T('אני המצפן, יועץ דיגיטלי ולא בן אדם. אני עוזר להתייעץ על מה שמתאים לעסק שלכם, למצוא דברים באתר, ומכין לחנוך בריף. רוצים לדבר איתו ישירות? הוא בוואטסאפ.', 'I’m Compass, a digital advisor, not a person. I help you think through what fits your business, find things on the site, and prepare a brief for Hanoch. Want to talk to him directly? He’s on WhatsApp.'), 'wa'],
    [/נגיש|accessib/i, T('כל אתר נבנה לפי WCAG 2.2 ברמה AA ות"י 5568, עם תפריט נגישות. גם האתר הזה: ', 'Every site is built to WCAG 2.2 AA and the Israeli standard 5568, with an accessibility menu. This one too: ') + (EN ? '/en-accessibility.html' : '/accessibility.html'), 'diag'],
    [/פרטיות|מידע|נשמר|privacy|data|stored/i, T('השיחה הזו לא נשמרת באתר, ושום דבר לא מגיע לחנוך בלי שתלחצו. הפרטים: ', 'This chat isn’t stored on the site, and nothing reaches Hanoch unless you tap send. Details: ') + (EN ? '/en-privacy.html' : '/privacy.html'), 'diag'],
    [/וויקס|ויקס|וורדפרס|wix|wordpress/i, T('אפשר לעבור מוויקס או מוורדפרס לאתר מהיר שבנוי בשבילכם, ולשמור על המקום בגוגל: ', 'You can move from Wix or WordPress to a fast site built for you and keep your place on Google: ') + sv('wix'), 'brief'],
    [/אינסטגרם|פייסבוק|טיקטוק|רשתות|סושיאל|שיווק|ממומן|קמפיין|עוקבים|instagram|facebook|tiktok|social|marketing|paid ads|followers/i, T('"הד" הוא ליווי שמקים ומנהל לעסק את העמודים באינסטגרם ובפייסבוק: תוכן בכל שבוע, פרסומות AI, ימי צילום ופרסום ממומן. החבילות והפירוט: ', 'Echo sets up and runs your Instagram and Facebook pages: weekly content, AI commercials, shoot days and paid ads. Packages and details: ') + sv('social'), 'brief'],
    [/פרסומת|סרט|וידאו|commercial|video|film|\bad\b/i, T('חנוך מפיק פרסומות קולנועיות ב-AI, עם עלילה, דמויות, קריינות ומוזיקה, ובחבילות גם מעלה אותן לאינסטגרם ולפייסבוק ועונה למגיבים. אפשר לראות שלוש בארכיון: ', 'Hanoch makes cinematic AI commercials with a story, characters, voiceover and music, and in the packages he also publishes them to Instagram and Facebook and answers comments. Three are in the archive: ') + (EN ? '/archive/en.html' : '/archive/'), 'brief'],
    [/חנות|למכור|store|shop|ecommerce|sell/i, T('חנות אונליין נבנית סביב איך שאתם מוכרים: קטלוג, עגלה, משלוחים וסליקה. דוגמה מהתיק: ', 'An online store is built around how you sell: catalog, cart, shipping and payments. An example: ') + work('allenbis'), 'brief'],
    [/גוגל|קידום|seo|google/i, T('קידום אורגני כולל מחקר מילים, עמוד לכל שירות, סימון לגוגל ופרופיל Google Business. לא מבטיחים מקום ראשון, אבל בונים את כל מה שגוגל צריך: ', 'SEO covers keyword research, a page per service, markup and a Google Business profile. No one can promise first place, but everything Google needs gets built: ') + sv('seo'), 'brief'],
    [/אני גיבור|ani gibor/i, T('אני גיבור היא פלטפורמה שחנוך בנה מאפס: ילד שולח תמונה והופך לגיבור של סרט אנימציה. ', 'Ani Gibor is a platform Hanoch built from scratch: a child sends one photo and becomes the hero of an animated film. ') + 'https://anigibor.com', 'diag']
  ];

  /* ---------- סגנון ---------- */
  var CSS =
    '.ht-btn{position:fixed;z-index:124;bottom:18px;inset-inline-start:18px;display:flex;align-items:center;gap:.65rem;min-height:56px;padding:.35rem .45rem;padding-inline-end:1.15rem;border-radius:99px;' +
    'background:var(--paper,#ede8de);color:var(--ink,#0a0a0b);border:0;box-shadow:0 12px 30px rgba(0,0,0,.45);font-family:var(--f-body,system-ui,sans-serif);text-align:start;cursor:pointer;transition:box-shadow .2s,transform .15s}' +
    '.ht-btn:hover{box-shadow:0 0 0 2px var(--signal,#ff4f1a),0 12px 30px rgba(0,0,0,.45)}.ht-btn:active{transform:scale(.98)}.ht-btn:focus-visible,.ht-dlg :focus-visible{outline:2px solid var(--signal,#ff4f1a);outline-offset:3px}' +
    '.ht-lbl{display:grid;gap:3px}.ht-lbl b{font:700 1rem/1.1 var(--f-body,system-ui,sans-serif)}.ht-lbl small{font:500 var(--fs-xs,.8125rem)/1.1 var(--f-body,system-ui,sans-serif);color:rgba(10,10,11,.68)}' +
    '.ht-mark{display:grid;place-items:center;flex:none;width:44px;height:44px;border-radius:50%;background:var(--signal,#ff4f1a);color:var(--ink,#0a0a0b);font:700 1.2rem/1 var(--f-body,system-ui,sans-serif)}' +
    '.ht-hint{position:fixed;z-index:124;bottom:86px;inset-inline-start:18px;max-width:250px;padding:.7rem .9rem;border-radius:14px;background:var(--paper,#ede8de);color:var(--ink,#0a0a0b);font:var(--fs-s,.9rem)/1.45 var(--f-body,system-ui);box-shadow:0 14px 30px rgba(0,0,0,.45)}' +
    '.ht-hint button{margin-inline-start:.4rem;min-width:28px;min-height:28px;border-radius:50%;background:transparent;color:inherit;border:0;cursor:pointer;font-size:1rem}' +
    '.ht-dlg{position:fixed;inset:auto;bottom:18px;inset-inline-start:18px;margin:0;width:min(400px,calc(100vw - 36px));height:min(640px,calc(100dvh - 36px));max-height:none;max-width:none;padding:0;border:1px solid rgba(237,232,222,.2);border-radius:22px;' +
    'background:var(--ink-2,#121214);color:var(--fg,#ede8de);box-shadow:0 30px 70px rgba(0,0,0,.6);font-family:var(--f-body,system-ui,sans-serif);overflow:hidden}' +
    '.ht-dlg[open]{display:flex;flex-direction:column}.ht-dlg::backdrop{background:rgba(10,10,11,.45);opacity:0;transition:opacity .3s ease}.ht-dlg.ht-in::backdrop{opacity:1}' +
    '.ht-grab{display:none}' +
    '.ht-head{display:flex;align-items:center;gap:.7rem;padding:.85rem 1rem;border-bottom:1px solid rgba(237,232,222,.14)}' +
    '.ht-head h2{flex:1;margin:0;font:600 var(--fs-b,1rem)/1.2 var(--f-body,system-ui)}.ht-head small{display:block;margin-top:.2rem;font-weight:400;color:rgba(237,232,222,.62);font-size:var(--fs-xs,.8125rem)}' +
    '.ht-x{width:44px;height:44px;border-radius:50%;border:1px solid rgba(237,232,222,.42);background:transparent;color:inherit;font-size:1.1rem;cursor:pointer}' +
    '.ht-log{flex:1;overflow-y:auto;overscroll-behavior:contain;padding:1rem;display:flex;flex-direction:column;gap:.7rem}' +
    '.ht-m{max-width:88%;padding:.7rem .9rem;border-radius:16px;line-height:1.55;font-size:var(--fs-b,1rem);white-space:pre-wrap;overflow-wrap:anywhere}' +
    '.ht-a{align-self:flex-start;background:var(--ink-3,#1c1c1f);border-start-start-radius:4px}.ht-u{align-self:flex-end;background:var(--paper,#ede8de);color:var(--ink,#0a0a0b);border-start-end-radius:4px}' +
    '.ht-m a{color:var(--signal,#ff4f1a);text-decoration:underline;text-underline-offset:3px}.ht-u a{color:#a8360a}' +
    '.ht-chips{display:flex;flex-wrap:wrap;gap:.45rem;align-self:flex-start}' +
    '.ht-chip{min-height:44px;padding:.5rem .95rem;border-radius:99px;border:1px solid rgba(237,232,222,.42);background:transparent;color:inherit;font:inherit;font-size:var(--fs-s,.9rem);cursor:pointer;text-align:start}' +
    '.ht-chip:hover{border-color:var(--signal,#ff4f1a)}.ht-chip.is-main{background:var(--signal,#ff4f1a);border-color:var(--signal,#ff4f1a);color:var(--ink,#0a0a0b);font-weight:600;text-decoration:none;display:inline-flex;align-items:center}' +
    '.ht-card{align-self:stretch;border:1px solid rgba(237,232,222,.2);border-radius:16px;padding:.9rem;display:grid;gap:.6rem;background:var(--ink,#0a0a0b)}' +
    '.ht-card pre{margin:0;white-space:pre-wrap;font:var(--fs-s,.9rem)/1.55 var(--f-body,system-ui)}' +
    '.ht-card label{font-size:var(--fs-s,.9rem);color:rgba(237,232,222,.75)}' +
    '.ht-card input{min-height:44px;padding:.5rem .8rem;border-radius:10px;border:1px solid rgba(237,232,222,.42);background:transparent;color:inherit;font:inherit}' +
    '.ht-note{margin:0;font-size:var(--fs-xs,.8125rem);color:rgba(237,232,222,.7);line-height:1.5}.ht-note a{color:inherit;text-decoration:underline}' +
    '.ht-typing{align-self:flex-start;color:rgba(237,232,222,.62);font-size:var(--fs-s,.9rem)}' +
    '.ht-form{display:flex;gap:.5rem;padding:.75rem;border-top:1px solid rgba(237,232,222,.14)}' +
    '.ht-form textarea{flex:1;min-height:44px;max-height:120px;resize:none;padding:.65rem .85rem;border-radius:14px;border:1px solid rgba(237,232,222,.42);background:var(--ink,#0a0a0b);color:inherit;font:inherit;font-size:1rem;line-height:1.4}' +
    '.ht-send{min-width:64px;min-height:44px;border-radius:14px;border:0;background:var(--signal,#ff4f1a);color:var(--ink,#0a0a0b);font:600 var(--fs-s,.9rem)/1 var(--f-body,system-ui);cursor:pointer}' +
    '.ht-foot{margin:0;padding:0 .9rem .7rem;font-size:var(--fs-xs,.8125rem);color:rgba(237,232,222,.62)}.ht-foot a{color:inherit}' +
    '@media (max-width:600px){.ht-btn{min-height:52px;gap:.55rem;padding-inline-end:1rem}.ht-btn .ht-mark{width:40px;height:40px}' +
    '.ht-dlg{inset:0;width:100%;height:100%;border-radius:0;border:0}.ht-head{touch-action:none;padding-top:1.15rem;position:relative}' +
    '.ht-grab{display:block;position:absolute;top:7px;left:50%;width:38px;height:5px;margin-left:-19px;border-radius:9px;background:rgba(237,232,222,.38)}.ht-hint{inset-inline-end:18px}}' +
    '.menu-open .ht-btn,.case-open .ht-btn,.menu-open .ht-hint,.case-open .ht-hint{visibility:hidden}';

  var btn, dlg, log, input, sr, hint, opener;
  var S = store.get() || { msgs: [], answers: {}, offline: false };
  // הודעות API בלבד (בלי כרטיסים ובחירות), כדי שהמודל יקבל את ההקשר
  function save() { store.set(S); }

  function build() {
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'ht-btn';
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.setAttribute('aria-label', T('יועץ דיגיטלי, המצפן: פתיחת שיחה', 'Digital advisor, Compass: open chat'));
    btn.innerHTML = '<span class="ht-mark" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 5.5h16v10.5H11l-4.5 3.5V16H4z" fill="none" stroke="#0a0a0b" stroke-width="2" stroke-linejoin="round"/><circle cx="9" cy="10.8" r="1.2" fill="#0a0a0b"/><circle cx="12" cy="10.8" r="1.2" fill="#0a0a0b"/><circle cx="15" cy="10.8" r="1.2" fill="#0a0a0b"/></svg></span><span class="ht-lbl" aria-hidden="true"><b>' + T('יועץ דיגיטלי', 'Digital advisor') + '</b><small>' + T('המצפן · עונה מיד', 'Compass · replies instantly') + '</small></span>';
    btn.addEventListener('click', open);
    document.body.appendChild(btn);
  }
  // הכפתור יושב באותה שורה עם כפתור הנגישות, בצד השני. הגובה משתנה בין העמודים (בעמודי השירות בטלפון יש פס וואטסאפ בתחתית)
  function place() {
    var a = document.querySelector('.a11y__btn'), r = a && a.getBoundingClientRect();
    if (!r || !r.height) return;
    var b = Math.max(12, Math.round(innerHeight - r.bottom - (btn.offsetHeight - r.height) / 2));
    btn.style.bottom = b + 'px';
    if (hint) hint.style.bottom = (b + btn.offsetHeight + 12) + 'px';
  }

  function panel() {
    if (dlg) return;
    dlg = document.createElement('dialog');
    dlg.className = 'ht-dlg';
    dlg.setAttribute('aria-labelledby', 'ht-title');
    dlg.innerHTML =
      '<div class="ht-head"><span class="ht-grab" aria-hidden="true"></span><span class="ht-mark" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 5.5h16v10.5H11l-4.5 3.5V16H4z" fill="none" stroke="#0a0a0b" stroke-width="2" stroke-linejoin="round"/><circle cx="9" cy="10.8" r="1.2" fill="#0a0a0b"/><circle cx="12" cy="10.8" r="1.2" fill="#0a0a0b"/><circle cx="15" cy="10.8" r="1.2" fill="#0a0a0b"/></svg></span><h2 id="ht-title">' + T('המצפן · יועץ דיגיטלי', 'Compass · digital advisor') +
      '<small>' + T('לא בן אדם · עונה מיד, ומעביר לחנוך כשצריך', 'Not a person · replies instantly, hands over to Hanoch when needed') + '</small></h2>' +
      '<button type="button" class="ht-x" aria-label="' + T('סגירת השיחה', 'Close chat') + '">✕</button></div>' +
      '<div class="ht-log"></div>' +
      '<p class="sr-only ht-sr" aria-live="polite"></p>' +
      '<form class="ht-form"><label class="sr-only" for="ht-in">' + T('ההודעה שלכם', 'Your message') + '</label>' +
      '<textarea id="ht-in" rows="1" maxlength="1000" enterkeyhint="send" placeholder="' + T('שאלו, התייעצו או חפשו משהו באתר', 'Ask, get advice or find something') + '"></textarea>' +
      '<button class="ht-send" type="submit">' + T('שליחה', 'Send') + '</button></form>' +
      '<p class="ht-foot">' + T('השיחה לא נשמרת באתר. ', 'This chat isn’t stored on the site. ') + '<a href="' + (EN ? '/en-privacy.html' : '/privacy.html') + '">' + T('פרטיות', 'Privacy') + '</a> · ' +
      '<a href="https://wa.me/' + WA + '" target="_blank" rel="noopener">' + T('לדבר עם חנוך בוואטסאפ', 'Talk to Hanoch on WhatsApp') + '</a></p>';
    document.body.appendChild(dlg);
    log = dlg.querySelector('.ht-log'); input = dlg.querySelector('textarea'); sr = dlg.querySelector('.ht-sr');
    sr.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap';
    dlg.querySelector('.ht-x').addEventListener('click', close);
    dlg.addEventListener('close', function () { document.documentElement.classList.remove('ht-open'); if (opener) opener.focus(); });
    // לחיצה על הרקע סוגרת, אבל לא כשהיא בעצם סוף של גרירה (הדפדפן מדווח עליה כלחיצה על הרקע)
    dlg.addEventListener('click', function (e) { if (e.target === dlg && !dragged) close(); dragged = false; });
    dlg.addEventListener('cancel', function (e) { e.preventDefault(); close(); });
    drag(dlg.querySelector('.ht-head'));
    dlg.querySelector('form').addEventListener('submit', function (e) { e.preventDefault(); ask(input.value); });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); ask(input.value); } });
    input.addEventListener('input', function () { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 120) + 'px'; });
    // מקלדת בטלפון: החלון מתכווץ לגובה הנראה, כדי ששדה הכתיבה לא יוסתר
    if (window.visualViewport) visualViewport.addEventListener('resize', function () { if (dlg.open && innerWidth <= 600) dlg.style.height = visualViewport.height + 'px'; });
    // משחזרים את השיחה מהלשונית, או פותחים חדשה
    if (S.msgs.length) S.msgs.forEach(function (m) { bubble(m.role, m.content, true); });
    else greet();
    if (S.msgs.length) chips(START);
  }

  var START = [
    [T('מה מתאים לעסק שלי?', 'What fits my business?'), function () { diag(false); }],
    [T('להראות לי עבודות', 'Show me work'), showWork],
    [T('לבנות בריף לחנוך', 'Build a brief for Hanoch'), function () { diag(true); }],
    [T('למצוא משהו באתר', 'Find something on the site'), function () { say(T('מה תרצו למצוא? למשל: עמוד שירות, עבודה מסוימת, נגישות או מדיניות הפרטיות. כתבו כאן למטה.', 'What would you like to find? For example a service page, a specific project, accessibility or the privacy policy. Type it below.')); input.focus(); }]
  ];
  function greet() {
    say(T('היי, אני המצפן, היועץ הדיגיטלי של HG Studio (לא בן אדם). אפשר להתייעץ איתי על מה שמתאים לעסק שלכם, לבקש שאמצא לכם משהו באתר, או להכין לחנוך בריף מוכן לוואטסאפ.', 'Hi, I’m Compass, the HG Studio digital advisor (not a person). Think through what fits your business with me, ask me to find something on the site, or let me prepare a ready brief for Hanoch on WhatsApp.'));
    chips(START);
  }

  /* ---------- תנועה: החלון יוצא מהכפתור וחוזר אליו. בטלפון הוא גיליון שגוררים למטה כדי לסגור ---------- */
  var F = window.HGFluid, mv = null, mob = false, H = 0, dragged = false;
  function apply(v) {
    if (mob) { dlg.style.transform = 'translate3d(0,' + v.y.toFixed(1) + 'px,0)'; dlg.style.opacity = ''; dlg.style.filter = ''; return; }
    dlg.style.transform = 'scale(' + (0.35 + 0.65 * v.p).toFixed(4) + ')';
    dlg.style.opacity = Math.min(1, v.p * 1.8).toFixed(3);
    dlg.style.filter = v.p < 0.995 ? 'blur(' + ((1 - v.p) * 6).toFixed(2) + 'px)' : '';
  }
  function motion() { if (!mv && F) mv = F.spring({ p: 1, y: 0 }, { onUpdate: apply, precision: { p: 0.001, y: 0.3 } }); return mv; }
  // לפני הפריים הראשון: החלון יושב "בתוך" הכפתור (במחשב) או מתחת למסך (בטלפון)
  function prime() {
    mob = innerWidth <= 600; H = innerHeight;
    dlg.style.transform = ''; dlg.style.filter = ''; dlg.style.opacity = '';
    if (!mob) {
      var r = dlg.getBoundingClientRect(), b = btn.getBoundingClientRect();
      dlg.style.transformOrigin = (b.left + b.width / 2 - r.left).toFixed(1) + 'px ' + (b.top + b.height / 2 - r.top).toFixed(1) + 'px';
    } else dlg.style.transformOrigin = '';
    if (motion()) mv.set({ p: 0, y: H });
  }
  function open() {
    panel();
    var again = dlg.open; // נפתח שוב באמצע סגירה: ממשיכים מהמקום שבו הוא נמצא
    if (!again) {
      opener = document.activeElement;
      if (hint) { hint.remove(); hint = null; }
      document.documentElement.classList.add('ht-open');
      if (innerWidth <= 600 && window.visualViewport) dlg.style.height = visualViewport.height + 'px';
      dlg.showModal();
      prime();
    }
    dlg.classList.add('ht-in');
    if (motion()) mv.to({ p: 1, y: 0 }, { damping: 1, response: mob ? 0.38 : 0.32 });
    if (!again) {
      (log.querySelector('.ht-chips button') || input).focus();
      log.scrollTop = log.scrollHeight;
      track('chat_open');
    }
  }
  function close(o) {
    if (!dlg || !dlg.open) return;
    dlg.classList.remove('ht-in');
    var fin = function () { if (dlg.open && !dlg.classList.contains('ht-in')) dlg.close(); };
    if (!motion()) return fin();
    mv.to(mob ? { p: 1, y: H } : { p: 0, y: 0 }, { damping: 1, response: mob ? 0.3 : 0.26, velocity: o && o.v != null ? { y: o.v } : null, done: fin });
  }
  // גרירה מהכותרת: עוקבת אחרי האצבע 1:1, מתנגדת למעלה, וזורקת לפי המהירות
  function drag(el) {
    if (!el || !F) return;
    var id = null, y0 = 0, base = 0, on = false, vt = F.tracker();
    el.addEventListener('pointerdown', function (e) {
      if (!mob || e.button > 0 || e.target.closest('button,a')) return;
      id = e.pointerId; y0 = e.clientY; base = mv.get('y'); on = false; vt.reset(); vt.add(base);
      mv.stop(); el.setPointerCapture(id);
    });
    el.addEventListener('pointermove', function (e) {
      if (e.pointerId !== id) return;
      var dy = e.clientY - y0;
      if (!on && Math.abs(dy) < 8) return; // סף קטן לפני שמחליטים שזו גרירה
      on = true;
      var y = base + dy; if (y < 0) y = F.rubber(y, H);
      mv.set({ y: y }); vt.add(y);
    });
    function end(e) {
      if (e.pointerId !== id) return;
      id = null;
      if (!on) return;
      dragged = true; setTimeout(function () { dragged = false; }, 50);
      var v = vt.velocity(), y = mv.get('y'), land = y + F.project(v, 0.99);
      if (land > H * 0.4) { F.haptic(6); close({ v: v }); }
      else mv.to({ y: 0 }, { damping: 0.85, response: 0.3, velocity: { y: v } });
    }
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  /* ---------- הודעות ---------- */
  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  // קישורים רק לאתר הזה, לוואטסאפ ולאתרים שבתיק העבודות
  var SAFE = /^(\/[\w\-./#]*|https:\/\/(?:[\w-]+\.)?(?:hgpro\.io|wa\.me|anigibor\.com|hanochgo7-gif\.github\.io)(?:\/[^\s]*)?)$/;
  function rich(s) {
    return esc(s).replace(/(https:\/\/[^\s<]+[^\s<.,:;!?)"'״׳]|(?:^|\s)\/[\w\-./]+(?:#[\w-]+)?)/g, function (m) {
      var lead = m.match(/^\s/) ? m[0] : ''; var u = m.trim().replace(/&amp;/g, '&');
      if (!SAFE.test(u)) return m;
      var ext = /^https:/.test(u) && !/hgpro\.io/.test(u);
      var shown = /^\//.test(u) ? 'hgpro.io' + u : u.replace(/^https:\/\/(www\.)?/, '').replace(/\?.*$/, '');
      return lead + '<a dir="ltr" href="' + esc(u) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' + esc(shown) + '</a>';
    });
  }
  function bubble(role, text, quiet) {
    var d = document.createElement('div');
    d.className = 'ht-m ' + (role === 'user' ? 'ht-u' : 'ht-a');
    d.innerHTML = rich(text);
    log.appendChild(d); log.scrollTop = log.scrollHeight;
    if (!quiet && role !== 'user') announce(text);
    return d;
  }
  function announce(t) { sr.textContent = ''; setTimeout(function () { sr.textContent = t; }, 40); }
  function say(text) { S.msgs.push({ role: 'assistant', content: text }); save(); return bubble('assistant', text); }
  function me(text) { S.msgs.push({ role: 'user', content: text }); save(); return bubble('user', text, true); }
  function clearChips() { log.querySelectorAll('.ht-chips').forEach(function (c) { c.remove(); }); }
  function chips(list, main) {
    clearChips();
    var w = document.createElement('div'); w.className = 'ht-chips'; w.setAttribute('role', 'group');
    list.forEach(function (c, i) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'ht-chip' + (main && i === 0 ? ' is-main' : ''); b.textContent = c[0];
      b.addEventListener('click', function () { clearChips(); me(c[0]); c[1](); });
      w.appendChild(b);
    });
    log.appendChild(w); log.scrollTop = log.scrollHeight;
    return w;
  }
  function focusFirstChip() { var b = log.querySelector('.ht-chips button'); if (b) b.focus(); }

  /* ---------- המסלול המודרך ---------- */
  function pick(key, then) {
    say(Q[key].q);
    chips(Q[key].o.map(function (o) { return [o[1], function () { S.answers[key] = o[0]; save(); then(); }]; }));
    focusFirstChip();
  }
  function diag(toBrief) {
    S.answers = {};
    pick('biz', function () { pick('goal', function () { pick('now', function () { toBrief ? brief() : advise(); }); }); });
  }
  function advise() {
    var r = recommend(S.answers);
    var proof = r.films ? T('אפשר לראות שלוש פרסומות בארכיון: ', 'Three commercials are in the archive: ') + (EN ? '/archive/en.html' : '/archive/')
      : T('עבודה דומה מהתיק: ', 'Similar work: ') + PROJ[r.p[0]] + ' ' + work(r.p[0]);
    say(r.why + '\n' + T('פרטים: ', 'Details: ') + sv(r.s) + '\n' + proof);
    track('chat_recommend', { service: r.s });
    chips([[T('לבנות בריף לחנוך', 'Build a brief for Hanoch'), brief], [T('עוד עבודה דומה', 'More similar work'), function () { more(r); }], [T('יש לי שאלה', 'I have a question'), function () { say(T('בשמחה. כתבו אותה כאן למטה.', 'Sure. Type it below.')); input.focus(); }]], true);
    focusFirstChip();
  }
  function more(r) {
    var id = r.p[1] || 'gotovski';
    say(PROJ[id] + ' ' + work(id) + '\n' + T('כל העבודות: ', 'All work: ') + (EN ? '/en-work.html' : '/work.html'));
    chips([[T('לבנות בריף לחנוך', 'Build a brief for Hanoch'), brief], [T('מה מתאים לעסק שלי?', 'What fits my business?'), function () { diag(false); }]], true);
    focusFirstChip();
  }
  function showWork() {
    say(T('הנה שלוש עבודות שונות מאוד זו מזו:', 'Here are three very different projects:') + '\n' +
      ['gotovski', 'falafel', 'rachel'].map(function (id) { return '• ' + PROJ[id] + ' ' + work(id); }).join('\n') + '\n' +
      T('ספרו לי איזה עסק יש לכם, ואמצא את הכי דומה.', 'Tell me what business you have, and I’ll find the closest one.'));
    chips([[T('מה מתאים לעסק שלי?', 'What fits my business?'), function () { diag(false); }], [T('לכל העבודות', 'All work'), function () { location.href = EN ? '/en-work.html' : '/work.html'; }]], true);
    focusFirstChip();
  }
  function briefText(extra) {
    var a = S.answers, lines = [T('היי חנוך, הגעתי מהאתר (דרך המצפן).', 'Hi Hanoch, I came from your website (via Compass).'), ''];
    if (a.biz) lines.push(T('העסק: ', 'Business: ') + label('biz', a.biz));
    if (a.goal) lines.push(T('מה חשוב עכשיו: ', 'What matters now: ') + label('goal', a.goal));
    if (a.now) lines.push(T('מה יש היום: ', 'What we have today: ') + label('now', a.now));
    var SVN = { social: T('הד: אינסטגרם ופייסבוק לעסק', 'Echo: Instagram and Facebook'), ad: T('פרסומת ב-AI', 'AI commercial'), site: T('אתר לעסק', 'A business site'), landing: T('דף נחיתה (נוכחות)', 'A landing page (Presence)'), store: T('חנות אונליין', 'An online store'), wix: T('מעבר מוויקס או מוורדפרס', 'Moving from Wix or WordPress'), brand: T('זהות מותגית ואתר דגל', 'Brand identity and a flagship site') };
    if (a.goal) lines.push(T('המצפן הציע: ', 'Compass suggested: ') + SVN[recommend(a).s]);
    if (extra) lines.push(extra);
    return lines.join('\n');
  }
  function brief(textFromModel) {
    var text = typeof textFromModel === 'string' ? T('היי חנוך, הגעתי מהאתר (דרך המצפן).', 'Hi Hanoch, I came from your website (via Compass).') + '\n\n' + textFromModel.trim() : briefText();
    if (typeof textFromModel !== 'string' && !S.answers.biz) { say(T('כדי שהבריף יהיה שימושי, שלוש שאלות קצרות:', 'Three quick questions so the brief is useful:')); return diag(true); }
    // בריף מהמודל כבר מגיע עם משפט פתיחה משלו
    if (typeof textFromModel !== 'string') say(T('זה הבריף שהכנתי. בדקו שהוא נכון, ואפשר להוסיף שם ומשפט על העסק.', 'Here’s the brief. Check that it’s right; you can add a name and a line about the business.'));
    clearChips();
    var card = document.createElement('div'); card.className = 'ht-card';
    card.innerHTML = '<pre></pre>' +
      '<label for="ht-name">' + T('שם (לא חובה)', 'Name (optional)') + '</label><input id="ht-name" autocomplete="name" maxlength="80">' +
      '<label for="ht-about">' + T('משפט על העסק (לא חובה)', 'A line about the business (optional)') + '</label><input id="ht-about" autocomplete="off" maxlength="200">' +
      '<p class="ht-note">' + T('הפרטים נכנסים רק להודעה, ונשלחים רק כשתלחצו. ', 'Details go only into the message, and are sent only when you tap. ') + '<a href="' + (EN ? '/en-privacy.html' : '/privacy.html') + '">' + T('מדיניות הפרטיות', 'Privacy policy') + '</a></p>' +
      '<a class="ht-chip is-main" target="_blank" rel="noopener">' + T('לשלוח לחנוך בוואטסאפ', 'Send to Hanoch on WhatsApp') + '</a>';
    var pre = card.querySelector('pre'), link = card.querySelector('a.is-main'), nm = card.querySelector('#ht-name'), ab = card.querySelector('#ht-about');
    function upd() {
      var t = text + (ab.value.trim() ? '\n' + T('על העסק: ', 'About the business: ') + ab.value.trim() : '') + (nm.value.trim() ? '\n\n' + nm.value.trim() : '');
      pre.textContent = t; link.href = 'https://wa.me/' + WA + '?text=' + encodeURIComponent(t);
    }
    nm.addEventListener('input', upd); ab.addEventListener('input', upd); upd();
    link.addEventListener('click', function () {
      track('chat_whatsapp');
      setTimeout(function () { say(T('ההודעה נפתחה בוואטסאפ. אחרי שתשלחו אותה, היא אצל חנוך, והוא חוזר אליכם עם הצעה כתובה.', 'Your message opened in WhatsApp. Once you send it, it’s with Hanoch, and he’ll come back to you with a written proposal.')); }, 400);
    });
    log.appendChild(card); log.scrollTop = log.scrollHeight;
    track('chat_brief_ready');
    nm.focus();
  }

  /* ---------- שאלות חופשיות ---------- */
  var busy = false, pending = '';
  function ask(raw) {
    var text = String(raw || '').trim();
    if (!text) return;
    // הודעה שנכתבה בזמן שהמצפן עוד עונה נשלחת מיד כשהוא מסיים, ולא הולכת לאיבוד
    if (busy) { pending = text; input.value = ''; input.style.height = ''; return; }
    input.value = ''; input.style.height = '';
    clearChips(); me(text);
    if (S.offline) return local(text);
    busy = true;
    var typing = document.createElement('p'); typing.className = 'ht-typing'; typing.textContent = T('המצפן מחפש…', 'Compass is looking…');
    log.appendChild(typing); log.scrollTop = log.scrollHeight;
    var history = S.msgs.filter(function (m) { return m.role === 'user' || m.role === 'assistant'; }).slice(-20);
    var ctl = new AbortController(), timer = setTimeout(function () { ctl.abort(); }, 25000);
    fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages: history, page: location.pathname + location.hash }), signal: ctl.signal })
      .then(function (r) {
        // תשובה תקינה היא טקסט בזרימה. JSON פירושו הודעת שגיאה מהשרת, ולא מציגים אותה כתשובה
        if (!r.ok || !r.body || /json/i.test(r.headers.get('content-type') || '')) { if (r.status === 503 || r.status === 404 || r.status === 405 || r.status === 501) { S.offline = true; save(); } throw new Error('http ' + r.status); }
        var reader = r.body.getReader(), dec = new TextDecoder(), acc = '', node = null;
        function pump() {
          return reader.read().then(function (x) {
            if (x.done) return acc;
            acc += dec.decode(x.value, { stream: true });
            if (!node) { typing.remove(); node = document.createElement('div'); node.className = 'ht-m ht-a'; log.appendChild(node); }
            node.innerHTML = rich(acc.replace(/\[\[\/?BRIEF\]\]/g, '').replace(/\n?\[\[ERROR\]\]/, ''));
            log.scrollTop = log.scrollHeight;
            return pump();
          });
        }
        return pump().then(function (full) {
          if (/\[\[ERROR\]\]/.test(full) || !full.trim()) throw new Error('stream');
          var m = full.match(/\[\[BRIEF\]\]([\s\S]*?)\[\[\/BRIEF\]\]/);
          var shown = full.replace(/\[\[BRIEF\]\][\s\S]*?\[\[\/BRIEF\]\]/, '').trim();
          if (node) { if (shown) node.innerHTML = rich(shown); else node.remove(); }
          S.msgs.push({ role: 'assistant', content: full.trim() }); save();
          announce(shown || T('הבריף מוכן', 'The brief is ready'));
          if (m) brief(m[1]);
          else chips([[T('לבנות בריף לחנוך', 'Build a brief for Hanoch'), function () { ask(T('אפשר לבנות בריף לחנוך?', 'Can you build a brief for Hanoch?')); }], [T('לדבר עם חנוך', 'Talk to Hanoch'), toWa]]);
        });
      })
      .catch(function () { typing.remove(); local(text, true); })
      .then(function () { clearTimeout(timer); busy = false; if (pending) { var t = pending; pending = ''; ask(t); } });
  }
  function toWa() { say(T('חנוך זמין בוואטסאפ: ', 'Hanoch is on WhatsApp: ') + 'https://wa.me/' + WA); }
  function local(text, failed) {
    for (var i = 0; i < FAQ.length; i++) {
      if (FAQ[i][0].test(text)) {
        say(FAQ[i][1]);
        var next = FAQ[i][2];
        if (next === 'brief') chips([[T('לבנות בריף לחנוך', 'Build a brief for Hanoch'), brief], [T('מה מתאים לעסק שלי?', 'What fits my business?'), function () { diag(false); }]], true);
        else if (next === 'wa') chips([[T('לדבר עם חנוך בוואטסאפ', 'Talk to Hanoch on WhatsApp'), toWa], [T('מה מתאים לעסק שלי?', 'What fits my business?'), function () { diag(false); }]]);
        else chips(START);
        return;
      }
    }
    say((failed ? T('משהו השתבש אצלי בחיבור. ', 'Something went wrong on my side. ') : '') +
      T('אני עונה כאן על אתרים, חנויות, פרסומות ועל העבודה עם חנוך. על השאלה הזו עדיף שהוא יענה בעצמו, והיא כבר מוכנה לשליחה בוואטסאפ: ', 'I answer questions here about websites, stores, commercials and working with Hanoch. He’s the best one to answer this one, and it’s ready to send on WhatsApp: ') +
      'https://wa.me/' + WA + '?text=' + encodeURIComponent(text).replace(/%20/g, '+'));
    chips(START);
  }

  /* ---------- הזמנה עדינה אחת, רק בדף הבית, אחרי שקראו חצי עמוד ---------- */
  function invite() {
    var home = /^\/(index\.html|en\.html)?$/.test(location.pathname);
    var seen = false; try { seen = !!sessionStorage.getItem('hg-chat-hint'); } catch (e) { seen = true; }
    var decided = false; try { decided = !!localStorage.getItem('hg-consent'); } catch (e) {}
    if (!home || seen || !decided || S.msgs.length) return;
    var onScroll = function () {
      if (scrollY < (document.documentElement.scrollHeight - innerHeight) * 0.45) return;
      removeEventListener('scroll', onScroll);
      try { sessionStorage.setItem('hg-chat-hint', '1'); } catch (e) {}
      hint = document.createElement('div'); hint.className = 'ht-hint';
      hint.innerHTML = '<span>' + T('מחפשים משהו באתר, או רוצים להתייעץ? המצפן עונה מיד, ואם צריך מכין לחנוך בריף.', 'Looking for something on the site, or want advice? Compass answers right away, and can prepare a brief for Hanoch.') + '</span>' +
        '<button type="button" aria-label="' + T('סגירת ההזמנה', 'Dismiss') + '">✕</button>';
      hint.querySelector('button').addEventListener('click', function () { hint.remove(); hint = null; btn.focus(); });
      document.body.appendChild(hint); place();
      if (!reduce && hint.animate) hint.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'ease-out' });
    };
    addEventListener('scroll', onScroll, { passive: true });
  }

  // מגיעים מקישור #chat (למשל מהתפריט או ממייל): השיחה נפתחת
  function init() {
    build(); place(); invite();
    addEventListener('resize', place, { passive: true });
    if (location.hash === '#chat') open();
    document.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('[data-chat-open]'); if (a) { e.preventDefault(); open(); } });
  }
  if ('requestIdleCallback' in window) requestIdleCallback(init, { timeout: 2500 }); else setTimeout(init, 1200);
})();
