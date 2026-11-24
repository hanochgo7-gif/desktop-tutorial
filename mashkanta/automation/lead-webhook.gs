/**
 * יסוד: קליטת פניות מהאתר ל-Google Sheets, עם התראה במייל ליועץ.
 *
 * מה הסקריפט עושה בכל פנייה:
 *  1. בודק את הנתונים בצד השרת (אורך, טלפון ישראלי, נושא מהרשימה) וחוסם בוטים.
 *  2. מגביל קצב: עד 3 פניות מאותו טלפון בעשר דקות.
 *  3. רושם שורה בגיליון "פניות": תאריך, סטטוס, נושא, פרטים, מה נבדק באתר ומקור ההגעה.
 *  4. שולח ליועץ מייל עם סיכום מוכן לשיחת ההיכרות.
 *  5. מחזיר לאתר {ok:true} רק אחרי שהשורה נשמרה.
 *
 * התקנה: ראו automation/README.md
 */

const ADVISOR_EMAIL = '';          // לאן לשלוח התראה על פנייה חדשה. ריק = בלי מייל
const SHEET_NAME = 'פניות';
const TOPICS = ['מחזור משכנתא', 'משכנתא לדירה חדשה', 'סירוב מהבנק', 'איחוד הלוואות', 'משכנתא לכל מטרה'];
const HEADERS = ['התקבל', 'סטטוס', 'נושא', 'שם', 'טלפון', 'זמן נוח', 'היקף', 'פרט נוסף', 'מה נבדק באתר', 'מקור', 'קמפיין', 'סיכום לשיחה'];

function doPost(e) {
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    // בוטים: שדה מלכודת מלא, או טופס שנשלח תוך פחות משתי שניות
    if (d.company || (Number(d.elapsed) >= 0 && Number(d.elapsed) < 2)) return json_({ ok: true });

    const lead = {
      name: clean_(d.name, 60),
      phone: clean_(d.phone, 20).replace(/[^\d+]/g, ''),
      topic: clean_(d.topic, 40),
      time: clean_(d.time, 20),
      amount: clean_(d.amount, 40),
      when: clean_(d.when, 60),
      journey: (Array.isArray(d.journey) ? d.journey : []).slice(0, 6).map(x => clean_(x, 200)),
      source: d.source && typeof d.source === 'object' ? d.source : {},
      brief: clean_(d.brief, 2000),
    };
    if (lead.name.length < 2) return json_({ ok: false, error: 'name' });
    if (!/^(0\d{8,9}|\+?972\d{8,9})$/.test(lead.phone)) return json_({ ok: false, error: 'phone' });
    if (TOPICS.indexOf(lead.topic) < 0) return json_({ ok: false, error: 'topic' });

    // הגבלת קצב לפי טלפון
    const cache = CacheService.getScriptCache(), key = 'rate_' + lead.phone, count = Number(cache.get(key) || 0);
    if (count >= 3) return json_({ ok: false, error: 'rate' });
    cache.put(key, String(count + 1), 600);

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const sheet = sheet_();
      const src = lead.source;
      sheet.appendRow([
        new Date(), 'חדש', lead.topic, lead.name, "'" + lead.phone, lead.time, lead.amount, lead.when,
        lead.journey.join('\n'),
        clean_([src.utm_source, src.utm_medium].filter(Boolean).join(' / ') || src.referrer || (src.gclid ? 'google ads' : 'ישיר'), 100),
        clean_(src.utm_campaign || '', 100),
        lead.brief,
      ]);
    } finally { lock.releaseLock(); }

    if (ADVISOR_EMAIL) {
      MailApp.sendEmail({
        to: ADVISOR_EMAIL,
        subject: 'פנייה חדשה: ' + lead.topic + ' (' + lead.name + ')',
        body: lead.brief + '\n\nהגיליון: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl(),
      });
    }
    return json_({ ok: true });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'server' });
  }
}

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.setRightToLeft(true);
    // סטטוס כרשימה נפתחת, כדי לנהל את הפניות כמו ב-CRM קטן
    const rule = SpreadsheetApp.newDataValidation().requireValueInList(['חדש', 'חזרתי', 'נקבעה פגישה', 'בטיפול', 'נסגר', 'לא רלוונטי']).build();
    sh.getRange('B2:B').setDataValidation(rule);
  }
  return sh;
}

// מנקה קלט: חותך לאורך מקסימלי, ומונע נוסחאות בגיליון (תווים מובילים = + - @)
function clean_(v, max) {
  let s = String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
