/**
 * Tzahile for Business: lead intake for the landing page.
 *
 * Setup (about 5 minutes):
 * 1. Create a Google Sheet. Extensions > Apps Script. Paste this file.
 * 2. Set NOTIFY_EMAIL below (or leave empty for no email).
 * 3. Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone.
 * 4. Copy the web-app URL into CONFIG.endpoint in business/index.html.
 *
 * Each form submission becomes one row in the "Leads" tab. The header names match
 * the console's importer, so File > Download > CSV (or copy the rows) and paste them
 * into the console's "ייבוא" drawer to bring new leads in with their source and referrer.
 */
const SHEET_NAME = 'Leads';
const NOTIFY_EMAIL = ''; // e.g. 'owner@example.com'
const HEADERS = ['createdAt', 'company', 'contact', 'phone', 'employees', 'zone', 'interest', 'consent',
  'source', 'ref', 'utm_source', 'utm_medium', 'utm_campaign', 'variant', 'page'];
const INTERESTS = ['weekly', 'tubishvat', 'event', 'backup'];
const SOURCES = ['b2c', 'visit', 'linkedin', 'facebook', 'landing', 'referral', 'partner', 'coworking', 'event', 'other'];

function doPost(e) {
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (data.website) return json_({ ok: true }); // honeypot: bots fill hidden fields

    const company = clean_(data.company, 120);
    const contact = clean_(data.contact, 80);
    const phone = clean_(data.phone, 30);
    const digits = phone.replace(/\D/g, '').replace(/^972/, '0');
    if (!company || !contact || !/^0\d{8,9}$/.test(digits)) return json_({ ok: false, error: 'invalid' });

    const row = {
      createdAt: new Date(),
      company: company,
      contact: contact,
      phone: phone,
      employees: Math.max(0, Math.min(100000, Number(data.employees) || 0)),
      zone: clean_(data.zone, 80),
      interest: INTERESTS.indexOf(data.interest) >= 0 ? data.interest : 'weekly',
      consent: data.consent === true ? 'yes' : 'no',
      source: SOURCES.indexOf(data.source) >= 0 ? data.source : 'landing',
      ref: clean_(data.ref, 80),
      utm_source: clean_(data.utm_source, 80),
      utm_medium: clean_(data.utm_medium, 80),
      utm_campaign: clean_(data.utm_campaign, 120),
      variant: clean_(data.variant, 20),
      page: clean_(data.page, 200)
    };

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      sheet_().appendRow(HEADERS.map(function (h) { return row[h]; }));
    } finally {
      lock.releaseLock();
    }

    if (NOTIFY_EMAIL) {
      MailApp.sendEmail(NOTIFY_EMAIL, 'ליד חדש לעסקים: ' + company,
        'חברה: ' + company + '\nאיש קשר: ' + contact + '\nטלפון: ' + phone +
        '\nעובדים: ' + row.employees + '\nאזור: ' + row.zone + '\nמעניין: ' + row.interest +
        '\nמקור: ' + row.source + (row.ref ? ' (מפנה: ' + row.ref + ')' : '') +
        '\n\nלחזור אליהם תוך שעה מעלה מאוד את הסיכוי לסגור.');
    }
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) sh.appendRow(HEADERS);
  return sh;
}

// Text only, trimmed, and never starting with a character a spreadsheet would run as a formula.
function clean_(v, max) {
  let s = String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
