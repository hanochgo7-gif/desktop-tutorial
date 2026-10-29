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
    chef: T('בר ליפשיץ: שף פרטי, התפריט כסיפור בגלילה, וטופס הזמנה עם סגנון הגשה שנשלח בוואטסאפ', 'Bar Lifschitz: a private chef, the menu as a scroll story, and a booking form with serving styles sent on WhatsApp'),
    mashkanta: T('יסוד: אתר הדגמה ליועץ משכנתאות (מותג בדוי)', 'Yesod: a demo site for a mortgage advisor (fictional brand)'),
    elef: T('אֶלֶף: מותג בדוי של שמן זית, אתר וסרט', 'Elef: a fictional olive oil brand, site and film'),
    fragrance: T('HG Fragrance: בית בשמים בדוי לגברים, אתר דגל וחנות', 'HG Fragrance: a fictional men’s fragrance house, flagship site and shop')
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
    else if (a.biz === 'solo') r = { s: 'landing', why: T('חבילת "נוכחות": דף אחד שעושה את כל העבודה, עם וואטסאפ, חיוג וגוגל. עד שבוע לאוויר.', 'The "Presence" package: one page that does the whole job, with WhatsApp, calls and Google. Live within a week.'), p: ['chef', 'ams'] };
    else if (a.now === 'weak') r = { s: 'site', why: T('שדרוג אתר קיים: עיצוב מחדש, מהירות, טלפון וקידום בגוגל, על התוכן שכבר יש לכם.', 'Upgrading your current site: a redesign, speed, mobile and Google, on the content you already have.'), p: ['gotovski', 'allenbis'] };
    else r = { s: 'site', why: T('חבילת "עסק": אתר מלא שמסביר, משכנע ומודד כל פנייה, ושאפשר לעדכן לבד. עד שבועיים לאוויר.', 'The "Business" package: a full site that explains, persuades and tracks every lead, and that you can update yourself. Live within two weeks.'), p: a.biz === 'company' ? ['gotovski', 'mashkanta'] : ['chef', 'ams'] };
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
    '.ht-head{display:flex;align-items:center;gap:.7rem;padding:.85rem 1rem;border-bottom:1px solid var(--fg-faint,rgba(237,232,222,.14))}' +
    '.ht-head h2{flex:1;margin:0;font:600 var(--fs-b,1rem)/1.2 var(--f-body,system-ui)}.ht-head small{display:block;margin-top:.2rem;font-weight:400;color:rgba(237,232,222,.62);font-size:var(--fs-xs,.8125rem)}' +
    '.ht-x{width:44px;height:44px;border-radius:50%;border:1px solid var(--fg-line,rgba(237,232,222,.42));background:transparent;color:inherit;font-size:1.1rem;cursor:pointer}' +
    '.ht-log{flex:1;overflow-y:auto;overscroll-behavior:contain;padding:1rem;display:flex;flex-direction:column;gap:.7rem}' +
    '.ht-m{max-width:88%;padding:.7rem .9rem;border-radius:16px;line-height:1.55;font-size:var(--fs-b,1rem);white-space:pre-wrap;overflow-wrap:anywhere}' +
    '.ht-a{align-self:flex-start;background:var(--ink-3,#1c1c1f);border-start-start-radius:4px}.ht-u{align-self:flex-end;background:var(--paper,#ede8de);color:var(--ink,#0a0a0b);border-start-end-radius:4px}' +
    '.ht-m a{color:var(--signal,#ff4f1a);text-decoration:underline;text-underline-offset:3px}.ht-u a{color:var(--signal-ink,#a8360a)}' +
    '.ht-chips{display:flex;flex-wrap:wrap;gap:.45rem;align-self:flex-start}' +
    '.ht-chip{min-height:44px;padding:.5rem .95rem;border-radius:99px;border:1px solid var(--fg-line,rgba(237,232,222,.42));background:transparent;color:inherit;font:inherit;font-size:var(--fs-s,.9rem);cursor:pointer;text-align:start}' +
    '.ht-chip:hover{border-color:var(--signal,#ff4f1a)}.ht-chip.is-main{background:var(--signal,#ff4f1a);border-color:var(--signal,#ff4f1a);color:var(--ink,#0a0a0b);font-weight:600;text-decoration:none;display:inline-flex;align-items:center}' +
    '.ht-card{align-self:stretch;border:1px solid rgba(237,232,222,.2);border-radius:16px;padding:.9rem;display:grid;gap:.6rem;background:var(--ink,#0a0a0b)}' +
    '.ht-card pre{margin:0;white-space:pre-wrap;font:var(--fs-s,.9rem)/1.55 var(--f-body,system-ui)}' +
    '.ht-card label{font-size:var(--fs-s,.9rem);color:rgba(237,232,222,.75)}' +
    '.ht-card input{min-height:44px;padding:.5rem .8rem;border-radius:10px;border:1px solid var(--fg-line,rgba(237,232,222,.42));background:transparent;color:inherit;font:inherit}' +
    '.ht-note{margin:0;font-size:var(--fs-xs,.8125rem);color:rgba(237,232,222,.7);line-height:1.5}.ht-note a{color:inherit;text-decoration:underline}' +
    '.ht-typing{align-self:flex-start;color:rgba(237,232,222,.62);font-size:var(--fs-s,.9rem)}' +
    '.ht-form{display:flex;gap:.5rem;padding:.75rem;border-top:1px solid var(--fg-faint,rgba(237,232,222,.14))}' +
    '.ht-form textarea{flex:1;min-height:44px;max-height:120px;resize:none;padding:.65rem .85rem;border-radius:14px;border:1px solid var(--fg-line,rgba(237,232,222,.42));background:var(--ink,#0a0a0b);color:inherit;font:inherit;font-size:1rem;line-height:1.4}' +
    '.ht-send{min-width:64px;min-height:44px;border-radius:14px;border:0;background:var(--signal,#ff4f1a);color:var(--ink,#0a0a0b);font:600 var(--fs-s,.9rem)/1 var(--f-body,system-ui);cursor:pointer}' +
    '.ht-foot{margin:0;padding:0 .9rem .7rem;font-size:var(--fs-xs,.8125rem);color:rgba(237,232,222,.62)}.ht-foot a{color:inherit}' +
    '@media (max-width:600px){.ht-btn{min-height:52px;gap:.55rem;padding-inline-end:1rem}.ht-btn .ht-mark{width:40px;height:40px}' +
    '.ht-dlg{inset:0;width:100%;height:100%;border-radius:0;border:0}.ht-head{touch-action:none;padding-top:1.15rem;position:relative}' +
    '.ht-dlg.ht-kb .ht-head{padding-top:.55rem;padding-bottom:.55rem}.ht-dlg.ht-kb .ht-head small,.ht-dlg.ht-kb .ht-foot,.ht-dlg.ht-kb .ht-grab{display:none}.ht-dlg.ht-kb .ht-log{padding-top:.6rem;padding-bottom:.6rem}' +
    '.ht-grab{display:block;position:absolute;top:7px;left:50%;width:38px;height:5px;margin-left:-19px;border-radius:9px;background:rgba(237,232,222,.38)}.ht-hint{inset-inline-end:18px}}' +
    // בעמודי השירות בטלפון יש כבר פס וואטסאפ בתחתית, אז היועץ מצטמצם לעיגול כדי לא לכסות עוד שורה של תוכן
    '@media (max-width:600px){body:has(.sv-dock) .ht-btn{gap:0;padding:.35rem}body:has(.sv-dock) .ht-btn .ht-lbl{display:none}}' +
    // באנגלית שורת המשנה בגופן המונו רחבה (288px), ובטלפון צר הכפתור נגע בכפתור הנגישות שבצד השני. נשארת רק הכותרת
    "@media (max-width:400px){html[lang='en'] .ht-lbl small{display:none}}" +
    '.menu-open .ht-btn,.case-open .ht-btn,.menu-open .ht-hint,.case-open .ht-hint{visibility:hidden}' +
    // כרטיס חבילה, קישורים, משוב וניסיון חוזר: אותה שפה של הצ'אט
    '.ht-pkg{align-self:stretch;border:1px solid var(--signal,#ff4f1a);border-radius:16px;padding:.9rem;display:grid;gap:.55rem;background:var(--ink,#0a0a0b)}' +
    '.ht-pkg small{font-size:var(--fs-xs,.8125rem);color:rgba(237,232,222,.62)}.ht-pkg b{font:400 1.6rem/1 var(--f-display,system-ui);color:var(--signal,#ff4f1a)}' +
    '.ht-pkg ul{margin:0;padding-inline-start:1.1rem;display:grid;gap:.3rem;font-size:var(--fs-s,.9rem);line-height:1.5}.ht-pkg .ht-chips{margin-top:.2rem}' +
    '.ht-chip[href]{text-decoration:none;display:inline-flex;align-items:center}' +
    '.ht-fb{align-self:flex-start;display:flex;gap:.4rem;align-items:center;font-size:var(--fs-xs,.8125rem);color:rgba(237,232,222,.62)}' +
    '.ht-fb button{min-height:32px;padding:.2rem .7rem;border-radius:99px;border:1px solid var(--fg-line,rgba(237,232,222,.42));background:transparent;color:inherit;font:inherit;cursor:pointer}' +
    '.ht-send[disabled]{opacity:.55;cursor:wait}' +
    '.ht-typing i{display:inline-block;width:5px;height:5px;margin-inline-start:3px;border-radius:50%;background:currentColor;animation:htdot 1s infinite}.ht-typing i:nth-child(2){animation-delay:.15s}.ht-typing i:nth-child(3){animation-delay:.3s}' +
    '@keyframes htdot{0%,80%,100%{opacity:.25}40%{opacity:1}}@media (prefers-reduced-motion:reduce){.ht-typing i{animation:none}}';

  var btn, dlg, log, input, sr, hint, opener;
  var S = store.get() || { msgs: [], answers: {}, offline: false };
  // הודעות API בלבד (בלי כרטיסים ובחירות), כדי שהמודל יקבל את ההקשר
  function save() { store.set(S); }

  function build() {
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'ht-btn';
    btn.setAttribute('aria-haspopup', 'dialog');
    // השם הנגיש מתחיל בטקסט שרואים על הכפתור (WCAG 2.5.3), ואחריו מה הכפתור עושה
    // השם שנשמע כולל את הטקסט שרואים, באותו סדר (שליטה קולית: "לחץ על יועץ דיגיטלי")
    btn.setAttribute('aria-label', T('יועץ דיגיטלי המצפן · עונה מיד. פתיחת שיחה', 'Digital advisor Compass · replies instantly. Open chat'));
    btn.innerHTML = '<span class="ht-mark" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 5.5h16v10.5H11l-4.5 3.5V16H4z" fill="none" stroke="#0a0a0b" stroke-width="2" stroke-linejoin="round"/><circle cx="9" cy="10.8" r="1.2" fill="#0a0a0b"/><circle cx="12" cy="10.8" r="1.2" fill="#0a0a0b"/><circle cx="15" cy="10.8" r="1.2" fill="#0a0a0b"/></svg></span><span class="ht-lbl" aria-hidden="true"><b>' + T('יועץ דיגיטלי', 'Digital advisor') + '</b><small>' + T('המצפן · עונה מיד', 'Compass · replies instantly') + '</small></span>';
    btn.addEventListener('click', open);
    document.body.appendChild(btn);
  }
  // הכפתור יושב באותה שורה עם כפתור הנגישות, בצד השני. הגובה משתנה בין העמודים (בעמודי השירות בטלפון יש פס וואטסאפ בתחתית)
  function place() {
    var a = document.querySelector('.a11y__btn'), r = a && a.getBoundingClientRect();
    if (r && r.height) {
      var b = Math.max(12, Math.round(innerHeight - r.bottom - (btn.offsetHeight - r.height) / 2));
      btn.style.bottom = b + 'px';
      if (hint) hint.style.bottom = (b + btn.offsetHeight + 12) + 'px';
    }
    // הודעת העוגיות יושבת באותה פינה, אז היא עולה מעל כפתור הצ'אט (גם כשהוא מורם מעל פס הוואטסאפ בעמודי השירות)
    var c = document.querySelector('.consent');
    if (c && btn.offsetHeight) c.style.bottom = Math.round((parseFloat(btn.style.bottom) || parseFloat(getComputedStyle(btn).bottom) || 18) + btn.offsetHeight + 12) + 'px';
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
    dlg.addEventListener('close', function () {
      document.documentElement.classList.remove('ht-open');
      dlg.style.top = dlg.style.bottom = dlg.style.height = ''; dlg.classList.remove('ht-kb');
      if (opener) opener.focus();
    });
    // לחיצה על הרקע סוגרת, אבל לא כשהיא בעצם סוף של גרירה (הדפדפן מדווח עליה כלחיצה על הרקע)
    dlg.addEventListener('click', function (e) { if (e.target === dlg && !dragged) close(); dragged = false; });
    dlg.addEventListener('cancel', function (e) { e.preventDefault(); close(); });
    drag(dlg.querySelector('.ht-head'));
    dlg.querySelector('form').addEventListener('submit', function (e) { e.preventDefault(); ask(input.value); });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); ask(input.value); } });
    input.addEventListener('input', function () { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 120) + 'px'; });
    // מקלדת בטלפון: החלון יושב בדיוק על החלק שרואים מעל המקלדת (גובה ומיקום), כדי שרואים גם את השיחה וגם את שדה הכתיבה.
    // באייפון הדפדפן גם גולל את הדף כשהמקלדת נפתחת, ולכן לא מספיק לקצר את החלון: צריך גם להזיז אותו לאן שהמסך גלל
    if (window.visualViewport) { visualViewport.addEventListener('resize', fit); visualViewport.addEventListener('scroll', fit); }
    input.addEventListener('focus', function () { fit(); setTimeout(fit, 120); setTimeout(fit, 420); });
    input.addEventListener('blur', function () { setTimeout(fit, 120); });
    // משחזרים את השיחה מהלשונית, או פותחים חדשה
    if (S.msgs.length) S.msgs.forEach(function (m) { bubble(m.role, m.content, true); });
    else greet();
    if (S.msgs.length) chips(START);
  }

  // מתאים את החלון לאזור הנראה בטלפון. השיחה נשארת על ההודעה האחרונה אם הייתם בסוף שלה
  function fit() {
    if (!dlg || !dlg.open || innerWidth > 600 || !window.visualViewport) return;
    var vv = visualViewport, end = log.scrollHeight - log.scrollTop - log.clientHeight < 60;
    dlg.style.height = Math.round(vv.height) + 'px';
    dlg.style.top = Math.round(vv.offsetTop) + 'px';
    dlg.style.bottom = 'auto';
    // מקלדת פתוחה: כותרת קומפקטית ובלי שורת התחתית, כדי שיישאר מקום לשיחה
    dlg.classList.toggle('ht-kb', vv.height < innerHeight * 0.78);
    if (end) log.scrollTop = log.scrollHeight;
  }

  var START = [
    [T('מה מתאים לעסק שלי?', 'What fits my business?'), function () { diag(false); }],
    [T('כמה זה עולה?', 'How much does it cost?'), function () { ask(T('כמה זה עולה?', 'How much does it cost?'), { already: true }); }],
    [T('להראות לי עבודות', 'Show me work'), showWork],
    [T('לבנות בריף לחנוך', 'Build a brief for Hanoch'), function () { diag(true); }],
    [T('למצוא משהו באתר', 'Find something on the site'), function () { say(T('מה תרצו למצוא? למשל: עמוד שירות, עבודה מסוימת, נגישות או מדיניות הפרטיות. כתבו כאן למטה.', 'What would you like to find? For example a service page, a specific project, accessibility or the privacy policy. Type it below.')); input.focus(); }]
  ];
  function greet() {
    var path = location.pathname, h1 = document.querySelector('main h1, h1'), title = h1 ? h1.textContent.replace(/\s+/g, ' ').trim().slice(0, 60) : '';
    var b = briefDraft(), first;
    if (b && b.biz) first = T('היי, אני המצפן, היועץ הדיגיטלי של HG Studio (לא בן אדם). ראיתי שהתחלתם את הבריף (' + b.biz + '). אפשר להמשיך כאן: לשאול על מה שלא ברור, לבדוק מה מתאים, או לסכם הכול לחנוך.', 'Hi, I’m Compass, the HG Studio digital advisor (not a person). I see you started the brief (' + b.biz + '). We can continue here: ask about anything unclear, check what fits, or wrap it all up for Hanoch.');
    else if (/\/services\/./.test(path) && title) first = T('היי, אני המצפן, היועץ הדיגיטלי של HG Studio (לא בן אדם). אתם בעמוד "' + title + '". רוצים לבדוק אם זה מתאים לעסק שלכם, או לשאול על מה שכלול, על הזמנים ועל המחיר?', 'Hi, I’m Compass, the HG Studio digital advisor (not a person). You’re on "' + title + '". Want to check if it fits your business, or ask about what’s included, timing or price?');
    else if (/work|archive/.test(path)) first = T('היי, אני המצפן, היועץ הדיגיטלי של HG Studio (לא בן אדם). ספרו לי איזה עסק יש לכם, ואמצא בתיק את העבודה הכי דומה, ומה היא עושה בשביל העסק.', 'Hi, I’m Compass, the HG Studio digital advisor (not a person). Tell me what business you have, and I’ll find the closest project and what it does for that business.');
    else first = T('היי, אני המצפן, היועץ הדיגיטלי של HG Studio (לא בן אדם). ספרו לי על העסק ומה הייתם רוצים שהאתר יעשה, ואגיד לכם מה מתאים ולמה. אפשר גם לשאול על מחיר, זמנים או עבודות.', 'Hi, I’m Compass, the HG Studio digital advisor (not a person). Tell me about your business and what you want the site to do, and I’ll tell you what fits and why. You can also ask about price, timing or work.');
    say(first);
    chips(START);
  }
  // הבריף בדף הבית: רק התשובות שנבחרו (בלי שם ובלי טקסט חופשי), כדי שהיועץ לא ישאל שוב מה שכבר ענו
  function briefDraft() {
    var d = null; try { d = JSON.parse(localStorage.getItem('hg-brief') || 'null'); } catch (e) { }
    if (!d) return null;
    var j = function (a) { return Array.isArray(a) ? a.join(', ') : ''; };
    return { biz: j(d.biz), goal: j(d.goal), pain: j(d.pain), now: j(d.now) };
  }
  function ctx() {
    var b = briefDraft() || {}, rec = document.querySelector('.rec-pkg'), form = document.getElementById('brief');
    return { brief: b, rec: rec ? rec.textContent.trim() : '', calc: form && form.dataset.calc ? form.dataset.calc : '', shown: S.shown || [] };
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
      dlg.showModal();
      fit();
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
      ['gotovski', 'chef', 'clinic'].map(function (id) { return '• ' + PROJ[id] + ' ' + work(id); }).join('\n') + '\n' +
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

  /* ---------- שאלות חופשיות: יועץ המכירות (/api/chat) ---------- */
  // השרת מחזיר שורות JSON: טקסט בחתיכות, רכיבי ממשק (כפתורים, קישורים, חבילה, בריף), אות מדידה וסוף
  var busy = false, pending = '', answers = 0;
  function ask(raw, o) {
    o = o || {};
    var text = String(raw || '').trim();
    if (!text) return;
    // הודעה שנכתבה בזמן שהמצפן עוד עונה נשלחת מיד כשהוא מסיים, ולא הולכת לאיבוד
    if (busy) { pending = text; input.value = ''; input.style.height = ''; return; }
    input.value = ''; input.style.height = '';
    clearChips();
    // already: הכפתור שנלחץ כבר הוסיף את התשובה לשיחה. retry: אותה שאלה נשלחת שוב
    if (!o.retry && !o.already) me(text);
    if (S.offline) return local(text);
    busy = true; sending(true);
    var typing = document.createElement('p'); typing.className = 'ht-typing'; typing.innerHTML = esc(T('המצפן חושב', 'Compass is thinking')) + '<i></i><i></i><i></i>';
    log.appendChild(typing); log.scrollTop = log.scrollHeight;
    var history = S.msgs.filter(function (m) { return m.role === 'user' || m.role === 'assistant'; }).slice(-20);
    var ctl = new AbortController(), timer = setTimeout(function () { ctl.abort(); }, 30000), t0 = Date.now();
    track('chat_message', { n: history.filter(function (m) { return m.role === 'user'; }).length });
    fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages: history, page: location.pathname + location.hash, ctx: ctx() }), signal: ctl.signal })
      .then(function (r) {
        if (!r.ok || !r.body || !/ndjson/i.test(r.headers.get('content-type') || '')) {
          if (r.status === 503 || r.status === 404 || r.status === 405 || r.status === 501) { S.offline = true; save(); }
          throw new Error('http ' + r.status);
        }
        var reader = r.body.getReader(), dec = new TextDecoder(), buf = '', acc = '', node = null, ui = [], failed = false;
        function line(l) {
          var ev; try { ev = JSON.parse(l); } catch (e) { return; }
          if (ev.t === 'd') {
            acc += ev.v;
            if (!node) { typing.remove(); node = document.createElement('div'); node.className = 'ht-m ht-a'; log.appendChild(node); track('chat_first_token', { ms: Date.now() - t0 }); }
            node.innerHTML = rich(acc); log.scrollTop = log.scrollHeight;
          } else if (ev.t === 'ui') ui.push(ev);
          else if (ev.t === 'sig') signal(ev.i);
          else if (ev.t === 'err') failed = true;
        }
        function pump() {
          return reader.read().then(function (x) {
            if (x.done) { if (buf.trim()) line(buf); return; }
            // כל עוד מגיע מידע, השעון מתאפס: נחתך רק חיבור שתקוע 30 שניות
            clearTimeout(timer); timer = setTimeout(function () { ctl.abort(); }, 30000);
            buf += dec.decode(x.value, { stream: true });
            var k; while ((k = buf.indexOf('\n')) >= 0) { line(buf.slice(0, k)); buf = buf.slice(k + 1); }
            return pump();
          });
        }
        return pump().then(function () {
          if (!acc.trim()) throw new Error(failed ? 'stream' : 'empty');
          S.msgs.push({ role: 'assistant', content: acc.trim() }); save();
          announce(acc.trim());
          answers++;
          track('chat_reply', { ms: Date.now() - t0, partial: failed ? 1 : 0 });
          var handled = false;
          ui.forEach(function (ev) { if (render(ev)) handled = true; });
          if (failed) retryChip(text, T('התשובה נקטעה. ', 'The reply was cut off. '));
          else if (!handled) chips([[T('לסכם לבריף לחנוך', 'Wrap it up for Hanoch'), function () { ask(T('אפשר לסכם את מה שדיברנו לבריף לחנוך?', 'Can you sum this up into a brief for Hanoch?'), { already: true }); }], [T('לדבר עם חנוך', 'Talk to Hanoch'), toWa]]);
          if (answers === 2 && !S.fb) feedback();
        });
      })
      .catch(function (e) {
        typing.remove();
        track('chat_error', { kind: String(e && e.message || e).slice(0, 40) });
        local(text, true);
        if (!S.offline) retryChip(text);
      })
      .then(function () { clearTimeout(timer); busy = false; sending(false); if (pending) { var t = pending; pending = ''; ask(t); } });
  }
  function sending(on) { var b = dlg && dlg.querySelector('.ht-send'); if (b) b.disabled = on; }
  // ניסיון חוזר שולח את אותה שאלה בלי להוסיף אותה שוב לשיחה
  function retryChip(text, lead) {
    var w = chips([[T('לנסות שוב', 'Try again'), function () {
      // מורידים את השאלה הכפולה שנוספה כשהכפתור נלחץ, ואת תשובת הגיבוי
      S.msgs.pop(); while (S.msgs.length && S.msgs[S.msgs.length - 1].role === 'assistant') S.msgs.pop(); save();
      var us = log.querySelectorAll('.ht-u'); if (us.length) us[us.length - 1].remove();
      ask(text, { retry: true });
    }], [T('לדבר עם חנוך', 'Talk to Hanoch'), toWa]], true);
    if (lead) { var p = document.createElement('p'); p.className = 'ht-typing'; p.textContent = lead; w.parentNode.insertBefore(p, w); }
  }
  function signal(i) {
    if (!i) return;
    if (i.stage && i.stage !== S.stage) { S.stage = i.stage; save(); track('chat_stage', { stage: i.stage }); }
    if (i.objection && i.objection !== 'none') track('chat_objection', { type: i.objection });
    if (i.unanswered_topic) track('chat_unanswered', { topic: i.unanswered_topic.slice(0, 60) });
  }
  function remember(x) { S.shown = (S.shown || []).filter(function (y) { return y !== x; }).concat([x]).slice(-6); save(); }
  // רכיבי הממשק שהשרת אישר. כל אחד עובד באמת: כפתור שולח את התשובה, קישור פותח עמוד, הבריף נפתח בוואטסאפ
  function render(ev) {
    var i = ev.i || {};
    if (ev.n === 'show_options') {
      chips(i.options.map(function (o) { return [o, function () { track('chat_option', {}); ask(o, { already: true }); }]; }));
      return true;
    }
    if (ev.n === 'show_links') {
      var w = document.createElement('div'); w.className = 'ht-chips';
      i.links.forEach(function (l) {
        // רק קישורי http(s). השרת כבר מסנן לפי רשימת כתובות מותרת, וזו שכבת הגנה נוספת מפני javascript: וכדומה
        if (!l || typeof l.url !== 'string' || !/^https?:\/\//i.test(l.url)) return;
        var a = document.createElement('a'); a.className = 'ht-chip'; a.href = l.url; a.textContent = l.label;
        if (!/^https:\/\/(www\.)?hgpro\.io/.test(l.url)) { a.target = '_blank'; a.rel = 'noopener'; }
        a.addEventListener('click', function () { track('chat_link', { url: l.url.replace(/^https:\/\/(www\.)?/, '').slice(0, 80) }); });
        w.appendChild(a);
      });
      log.appendChild(w); log.scrollTop = log.scrollHeight;
      return false;
    }
    if (ev.n === 'recommend_package') {
      remember(i.package);
      var c = document.createElement('div'); c.className = 'ht-pkg';
      c.innerHTML = '<small>' + T('ההמלצה של המצפן', 'Compass recommends') + '</small><b>' + esc(i.package) + '</b>' +
        (i.reasons.length ? '<ul>' + i.reasons.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ul>' : '') +
        (i.addons.length ? '<small>' + T('ומערכות שמתאימות: ', 'Fitting systems: ') + esc(i.addons.join(', ')) + '</small>' : '');
      var row = document.createElement('div'); row.className = 'ht-chips';
      [[T('לסכם לבריף עם החבילה', 'Brief with this package'), T('כן, בואו נסכם לבריף לחנוך עם חבילת ' + i.package, 'Yes, let’s sum it up into a brief for Hanoch with the ' + i.package + ' package'), true],
       [T('מה כלול בה?', 'What’s included?'), T('מה בדיוק כלול בחבילת ' + i.package + '?', 'What exactly is included in ' + i.package + '?'), false]].forEach(function (x) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'ht-chip' + (x[2] ? ' is-main' : ''); b.textContent = x[0];
        b.addEventListener('click', function () { ask(x[1]); });
        row.appendChild(b);
      });
      c.appendChild(row); log.appendChild(c); log.scrollTop = log.scrollHeight;
      track('chat_package', { pkg: i.package });
      return true;
    }
    if (ev.n === 'handoff_to_hanoch') {
      remember('handoff');
      var t = i.summary;
      if (i.package && i.package !== 'לא נקבע') t += '\n' + T('החבילה שדיברנו עליה: ', 'Package we discussed: ') + i.package;
      if (i.concerns.length) t += '\n' + T('מה עוד מטריד אותי: ', 'What still concerns me: ') + i.concerns.join('; ');
      if (i.open_questions.length) t += '\n' + T('שאלות פתוחות: ', 'Open questions: ') + i.open_questions.join('; ');
      brief(t);
      track('chat_handoff', { pkg: i.package });
      return true;
    }
    return false;
  }
  // משוב קצר פעם אחת בשיחה, אחרי התשובה השנייה. נשמר רק כאירוע סטטיסטיקה (אם אושרה)
  function feedback() {
    var w = document.createElement('div'); w.className = 'ht-fb';
    w.innerHTML = '<span>' + T('השיחה עוזרת?', 'Is this helpful?') + '</span>';
    [[T('כן', 'Yes'), 1], [T('לא ממש', 'Not really'), 0]].forEach(function (x) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = x[0];
      b.addEventListener('click', function () { S.fb = 1; save(); track('chat_feedback', { helpful: x[1] }); w.textContent = T('תודה.', 'Thanks.'); if (!x[1]) say(T('תודה שאמרתם. מה חסר לכם? אפשר גם לשאול את חנוך ישירות בוואטסאפ: ', 'Thanks for telling me. What’s missing? You can also ask Hanoch directly on WhatsApp: ') + 'https://wa.me/' + WA); });
      w.appendChild(b);
    });
    log.appendChild(w); log.scrollTop = log.scrollHeight;
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
      // ליד טופס או כפתור פנייה לא מפריעים: ההזמנה מחכה עד שיוצאים מהם
      var busy = ['contact', 'brief', 'check'].some(function (id) { var c = document.getElementById(id), r = c && c.getBoundingClientRect(); return r && r.top < innerHeight && r.bottom > 0; });
      if (busy) return;
      removeEventListener('scroll', onScroll);
      try { sessionStorage.setItem('hg-chat-hint', '1'); } catch (e) {}
      hint = document.createElement('div'); hint.className = 'ht-hint';
      hint.innerHTML = '<span>' + T('מחפשים משהו באתר, או רוצים להתייעץ? המצפן עונה מיד, ואם צריך מכין לחנוך בריף.', 'Looking for something on the site, or want advice? Compass answers right away, and can prepare a brief for Hanoch.') + '</span>' +
        '<button type="button" aria-label="' + T('סגירת ההזמנה', 'Dismiss') + '">✕</button>';
      // ההזמנה לא נשארת על המסך: היא נעלמת לבד אחרי כמה שניות, אחרי עוד מסך של גלילה, או כשמגיעים לטופס הפנייה
      var at = null, timer = 0;
      var away = function (o) {
        clearTimeout(timer); removeEventListener('scroll', far);
        if (!hint) return; var h = hint; hint = null;
        if (o && o.focus) btn.focus();
        if (!reduce && h.animate) h.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(6px)' }], { duration: 220, easing: 'ease-in' }).onfinish = function () { h.remove(); };
        else h.remove();
      };
      var far = function () {
        var c = document.getElementById('contact'), r = c && c.getBoundingClientRect();
        if (at !== null && Math.abs(scrollY - at) > innerHeight || (r && r.top < innerHeight && r.bottom > 0)) away();
      };
      // הגלילה החלקה ממשיכה עוד רגע אחרי שעוצרים, אז סופרים את המסך הנוסף רק משנייה וחצי אחרי שההזמנה הופיעה
      setTimeout(function () { at = scrollY; }, 1500);
      timer = setTimeout(away, 9000);
      addEventListener('scroll', far, { passive: true });
      hint.querySelector('button').addEventListener('click', function () { away({ focus: true }); });
      document.body.appendChild(hint); place();
      if (!reduce && hint.animate) hint.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'ease-out' });
    };
    addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- היסוס בבריף: מי שנתקע בשלב יותר מ-45 שניות מקבל הצעת עזרה אחת, בלי לקפוץ לו באמצע ---------- */
  function hesitation() {
    var form = document.getElementById('brief');
    if (!form) return;
    var t = 0, shown = false; try { shown = !!sessionStorage.getItem('hg-chat-help'); } catch (e) { shown = true; }
    var arm = function () {
      clearTimeout(t);
      if (shown) return;
      t = setTimeout(function () {
        var done = form.querySelector('.brief-done'), r = form.getBoundingClientRect();
        if ((done && !done.hidden) || (dlg && dlg.open) || hint || document.querySelector('.consent:not([hidden])') || r.bottom < 0 || r.top > innerHeight) return;
        shown = true; try { sessionStorage.setItem('hg-chat-help', '1'); } catch (e) { }
        hint = document.createElement('div'); hint.className = 'ht-hint';
        hint.innerHTML = '<span>' + T('מתלבטים מה לבחור? המצפן יכול לעזור להחליט, או לענות על שאלה לפני שממשיכים.', 'Not sure what to pick? Compass can help you decide, or answer a question before you continue.') + '</span>' +
          '<button type="button" aria-label="' + T('סגירת ההצעה', 'Dismiss') + '">✕</button>';
        hint.querySelector('button').addEventListener('click', function (e) { e.stopPropagation(); hint.remove(); hint = null; });
        hint.addEventListener('click', function () { if (hint) { hint.remove(); hint = null; } track('chat_hesitation_open'); open(); });
        hint.style.cursor = 'pointer';
        document.body.appendChild(hint); place();
        track('chat_hesitation_hint');
        setTimeout(function () { if (hint) { hint.remove(); hint = null; } }, 12000);
      }, 45000);
    };
    form.addEventListener('change', arm);
    form.addEventListener('focusin', arm, { once: true });
  }

  // מגיעים מקישור #chat (למשל מהתפריט או ממייל): השיחה נפתחת
  function init() {
    build(); place(); invite(); hesitation();
    // הודעת העוגיות מחכה לכפתור הזה, כדי להופיע ישר במקומה הסופי ולא לקפוץ מעליו אחר כך
    document.documentElement.setAttribute('data-launcher', '');
    document.dispatchEvent(new Event('hg:launcher'));
    addEventListener('resize', place, { passive: true });
    if (location.hash === '#chat') open();
    document.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('[data-chat-open]'); if (a) { e.preventDefault(); open(); } });
  }
  if ('requestIdleCallback' in window) requestIdleCallback(init, { timeout: 2500 }); else setTimeout(init, 1200);
})();
