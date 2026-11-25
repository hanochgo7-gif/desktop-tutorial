// Formatting and the Hebrew words of the trade for every status the database uses.

const nf2 = new Intl.NumberFormat('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nf0 = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 });
const nfq = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 3 });
const nf1 = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 1 });

export const DASH = '—';
const isNum = (v) => v !== null && v !== undefined && v !== '' && !Number.isNaN(Number(v));

// 1,234.50 ₪ – money always with agorot; whole shekels in summaries (money0); short form for big figures
const NB = '\u00a0';
export const money = (v) => (isNum(v) ? `${nf2.format(Number(v))}${NB}₪` : DASH);
export const money0 = (v) => (isNum(v) ? `${nf0.format(Math.round(Number(v)))}${NB}₪` : DASH);
export const moneyShort = (v) => {
  if (!isNum(v)) return DASH;
  const n = Number(v), a = Math.abs(n);
  if (a >= 1e6) return `${nf1.format(n / 1e6)} מיליון${NB}₪`;
  if (a >= 1e4) return `${nf0.format(n / 1e3)} אלף${NB}₪`;
  return money0(n);
};
export const qty = (v, uom) => (isNum(v) ? `${nfq.format(Number(v))}${uom ? ` ${uom}` : ''}` : DASH);
export const num = (v) => (isNum(v) ? nf0.format(Number(v)) : DASH);
export const pct = (v, digits = 1) => (isNum(v) ? `${Number(v).toFixed(digits).replace(/\.0+$/, '')}%` : DASH);

const pad = (n) => String(n).padStart(2, '0');
export const date = (v) => {
  if (!v) return DASH;
  const d = typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(v + 'T00:00:00') : new Date(v);
  return Number.isNaN(d.getTime()) ? DASH : `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
};
export const dateTime = (v) => {
  if (!v) return DASH;
  const d = new Date(v);
  return `${date(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const isoDate = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return isoDate(d); };
export const daysBetween = (a, b) => Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
export const ago = (v) => {
  if (!v) return DASH;
  const s = (Date.now() - new Date(v).getTime()) / 1000;
  if (s < 60) return 'עכשיו';
  if (s < 3600) return `לפני ${Math.round(s / 60)} דק׳`;
  if (s < 86400) return `לפני ${Math.round(s / 3600)} שע׳`;
  if (s < 86400 * 30) return `לפני ${Math.round(s / 86400)} ימים`;
  return date(v);
};

export const ROLE = {
  super_admin: 'מנהל מערכת', ceo: 'מנכ״ל', cfo: 'סמנכ״ל כספים', procurement_manager: 'מנהל רכש', buyer: 'קניין',
  site_manager: 'מנהל אתר', warehouse_manager: 'מנהל מחסן', project_manager: 'מנהל פרויקט', auditor: 'מבקר', viewer: 'צופה',
};

// status → [label, tone] ; tone: neutral | info | good | warn | bad
export const STATUS = {
  po: {
    draft: ['טיוטה', 'neutral'], pending_approval: ['ממתינה לאישור', 'warn'], approved: ['מאושרת', 'info'], rejected: ['נדחתה', 'bad'],
    sent: ['נשלחה לספק', 'info'], supplier_confirmed: ['אושרה ע״י הספק', 'info'], in_delivery: ['באספקה', 'info'],
    partially_received: ['אספקה חלקית', 'warn'], received: ['סופקה במלואה', 'good'], inspected: ['התקבלה ונבדקה', 'good'],
    closed: ['נסגרה', 'neutral'], cancelled: ['בוטלה', 'neutral'],
  },
  request: {
    draft: ['טיוטה', 'neutral'], submitted: ['ממתינה לאישור', 'warn'], approved: ['מאושרת, לטיפול', 'info'], rejected: ['נדחתה', 'bad'],
    in_progress: ['בטיפול', 'info'], fulfilled: ['כוסתה', 'good'], cancelled: ['בוטלה', 'neutral'],
  },
  rfq: { open: ['פתוחה', 'info'], awarded: ['הוחלט', 'good'], cancelled: ['בוטלה', 'neutral'] },
  invoice: {
    registered: ['נקלטה', 'neutral'], matched: ['תואמת', 'good'], exception: ['חריגה', 'bad'], approved: ['מאושרת לתשלום', 'info'],
    paid: ['שולמה', 'good'], rejected: ['נדחתה', 'neutral'],
  },
  transfer: { draft: ['טיוטה', 'neutral'], shipped: ['בדרך', 'info'], received: ['התקבלה', 'good'], cancelled: ['בוטלה', 'neutral'] },
  count: { open: ['פתוחה', 'info'], posted: ['נרשמה', 'good'], cancelled: ['בוטלה', 'neutral'] },
  site: { planned: ['בתכנון', 'neutral'], active: ['פעיל', 'good'], on_hold: ['מושהה', 'warn'], closing: ['בסגירה', 'warn'], closed: ['סגור', 'neutral'] },
  supplier: { active: ['פעיל', 'good'], on_hold: ['בהמתנה', 'warn'], blocked: ['חסום', 'bad'] },
  item: { active: ['פעיל', 'good'], inactive: ['לא פעיל', 'neutral'], discontinued: ['הופסק', 'neutral'] },
  asset: { in_service: ['בשימוש', 'good'], in_repair: ['בתיקון', 'warn'], on_loan: ['מושאל', 'info'], in_storage: ['במחסן', 'neutral'], retired: ['נגרע', 'neutral'], lost: ['אבד', 'bad'] },
  loan: { open: ['מושאל', 'info'], closed: ['הוחזר', 'neutral'] },
  approval: { pending: ['ממתין', 'warn'], approved: ['אושר', 'good'], rejected: ['נדחה', 'bad'], superseded: ['הוחלף', 'neutral'] },
};
export const statusLabel = (kind, s) => (STATUS[kind]?.[s]?.[0]) || s || DASH;
export const statusTone = (kind, s) => (STATUS[kind]?.[s]?.[1]) || 'neutral';

export const URGENCY = { low: 'נמוכה', normal: 'רגילה', high: 'גבוהה', critical: 'דחופה מאוד' };
export const SITE_KIND = { site: 'אתר', warehouse: 'מחסן', office: 'משרד' };
export const CONDITION = { new: 'חדש', good: 'תקין', fair: 'סביר', poor: 'גרוע', broken: 'מקולקל' };
export const DOC_KIND = { insurance: 'ביטוח', license: 'רישיון', certificate: 'תעודה', agreement: 'הסכם', tax: 'מס', other: 'אחר' };
export const MOVE = {
  opening: 'יתרת פתיחה', receipt: 'קליטה מספק', issue: 'ניפוק', transfer_out: 'העברה יוצאת', transfer_in: 'העברה נכנסת',
  return_to_supplier: 'החזרה לספק', adjustment: 'התאמה', count: 'ספירת מלאי', write_off: 'גריעה', damaged: 'סימון כפגום',
  repaired: 'תוקן והוחזר', loan_out: 'השאלה לעובד', loan_return: 'החזרה מעובד', reservation_issue: 'ניפוק לפי דרישה',
};
export const ALERT = {
  late_delivery: 'אספקה באיחור', delivery_at_risk: 'אספקה בסיכון לאיחור', stock_out: 'אזל מהמלאי', stockout_soon: 'צפוי להיגמר',
  budget_over: 'חריגה מתקציב', budget_near: 'תקציב קרוב למיצוי', invoice_exception: 'חשבונית חריגה', supplier_doc_expiring: 'מסמך ספק פג או עומד לפוג',
  loan_overdue: 'ציוד מושאל באיחור', service_due: 'טיפול תקופתי',
};
export const WARNING = {
  duplicate_item: 'הפריט כבר מוזמן בהזמנה פתוחה אחרת לאותו אתר', price_above_last: 'מחיר גבוה מהרכישה האחרונה',
  differs_from_quote: 'מחיר שונה מההצעה שנבחרה', supplier_on_hold: 'הספק בהמתנה', no_budget: 'לא הוגדר תקציב לאתר ולתקופה', over_budget: 'חריגה מתקציב',
};
export const MATCH = {
  no_po: 'חשבונית בלי הזמנת רכש', po_not_approved: 'ההזמנה לא אושרה', charge_not_on_po: 'חיוב שלא מופיע בהזמנה',
  price_diff: 'הפרש מחיר מול ההזמנה', not_received: 'חיוב על סחורה שלא התקבלה', qty_over_received: 'חיוב על כמות גדולה ממה שהתקבל',
  shipping_diff: 'חיוב משלוח מעבר למוסכם', vat_mismatch: 'מע״מ לא תואם', lines_sum_mismatch: 'סכום השורות לא תואם לסכום החשבונית',
  possible_duplicate: 'ייתכן חיוב כפול (אותו סכום מאותו ספק)',
};

// Server error codes → what the person should know and do.
const ERR = {
  NOT_CONFIGURED: 'המערכת עוד לא חוברה לשרת.',
  NETWORK: 'אין חיבור לשרת. בדקו את החיבור לאינטרנט ונסו שוב.',
  NOT_SIGNED_IN: 'פג תוקף ההתחברות. היכנסו שוב.',
  SITE_FORBIDDEN: 'אין לכם הרשאה לאתר הזה.',
  WRONG_ORG: 'הפריט, האתר או הספק לא שייכים לארגון.',
  BAD_QTY: 'הכמות לא תקינה.', BAD_PRICE: 'המחיר לא תקין.', BAD_AMOUNT: 'הסכום לא תקין.', BAD_COST: 'העלות לא תקינה.',
  ZERO_QTY: 'הכמות לא יכולה להיות אפס.',
  REASON_REQUIRED: 'צריך לכתוב סיבה.', COMMENT_REQUIRED: 'צריך לכתוב הערה להחלטה.', DATE_REQUIRED: 'צריך לבחור תאריך.',
  INSUFFICIENT_STOCK: 'אין מספיק מלאי. במלאי: {0}.', STOCK_RESERVED: 'חלק מהמלאי שמור לדרישות אחרות. זמין: {0}.',
  INSUFFICIENT_DAMAGED: 'אין מספיק יחידות פגומות. פגומות: {0}.',
  NO_LINES: 'אין שורות במסמך.', NOT_FOUND: 'הרשומה לא נמצאה (ייתכן שנמחקה או שאין הרשאה).',
  BAD_STATUS: 'אי אפשר לבצע את הפעולה במצב הנוכחי של המסמך ({0}).',
  SOD_CREATOR: 'הפרדת סמכויות: מי שיצר או הגיש את המסמך לא יכול לאשר אותו.',
  SOD_SAME_APPROVER: 'הפרדת סמכויות: אותו אדם לא יכול לאשר שני שלבים באותו מסמך.',
  OVER_APPROVAL_LIMIT: 'הסכום גבוה ממגבלת האישור האישית שלכם ({0}).',
  NO_PENDING_APPROVAL: 'אין שלב אישור פתוח למסמך הזה.', NO_APPROVAL_RULE: 'לא הוגדרו כללי אישור לסכום הזה. פנו למנהל המערכת.',
  OVER_RECEIPT: 'לא ניתן לקלוט יותר ממה שהוזמן (שורה {0}, פתוח לקליטה: {1}).',
  LINE_NOT_ON_PO: 'השורה לא שייכת להזמנה הזו.', PO_HAS_RECEIPTS: 'כבר נקלטה סחורה בהזמנה; אי אפשר לפתוח אותה לעריכה.',
  DISCOUNT_TOO_BIG: 'ההנחה גדולה מסכום ההזמנה.', SUPPLIER_BLOCKED: 'הספק חסום לרכישות.', ITEM_NOT_ORDERABLE: 'הפריט הופסק ולא ניתן להזמין אותו.',
  REQUEST_OVER_COVERED: 'הדרישה כבר מכוסה (כמות בדרישה: {0}).', REQUEST_LINE_NOT_OPEN: 'שורת הדרישה לא מאושרת או לא פתוחה.',
  REQUEST_HAS_ORDERS: 'יש לדרישה הזמנות או העברות. בטלו אותן קודם.', NOTHING_TO_ORDER: 'כל השורות כבר מכוסות.', ITEM_REQUIRED: 'יש לבחור פריט מהקטלוג.',
  QUOTE_NOT_ACTIVE: 'ההצעה לא פעילה.', QUOTE_EXPIRED: 'תוקף ההצעה פג.', AWARD_REASON_REQUIRED: 'בחרתם הצעה שאינה הזולה ביותר: כתבו למה (לפחות כמה מילים).',
  RFQ_CLOSED: 'הבקשה להצעות כבר נסגרה; אי אפשר לשנות הצעות.',
  DUPLICATE_INVOICE: 'חשבונית עם אותו מספר מאותו ספק כבר נקלטה.', PO_OTHER_SUPPLIER: 'ההזמנה שייכת לספק אחר.',
  OVER_RETURN: 'לא ניתן להחזיר יותר ממה שנקלט ({0}).', COUNT_ALREADY_OPEN: 'כבר יש ספירה פתוחה באתר הזה.',
  SAME_SITE: 'אתר המקור והיעד זהים.', EMPLOYEE_REQUIRED: 'יש לבחור עובד.', SITE_REQUIRED: 'יש לבחור אתר.', ASSET_CLOSED: 'הציוד נגרע או אבד.',
  LAST_SUPER_ADMIN: 'חייב להישאר לפחות מנהל מערכת פעיל אחד.', SITES_REQUIRED: 'בחרו לפחות אתר אחד.', BAD_EMAIL: 'כתובת המייל לא תקינה.',
  RULES_GAP: 'יש פער בין מדרגות האישור (מ־{0}).', RULES_OVERLAP: 'מדרגות האישור חופפות.', RULES_NOT_OPEN_ENDED: 'המדרגה האחרונה חייבת להיות ללא תקרה.',
  RULES_BAD_BAND: 'מדרגה לא תקינה.', RULES_REQUIRED: 'צריך לפחות מדרגה אחת.', BAD_SETTING: 'ערך לא תקין בהגדרה {0}.',
  IDEMPOTENCY_KEY_REUSED: 'הפעולה כבר בוצעה.', APPEND_ONLY: 'רשומות היסטוריה לא ניתנות לשינוי.', NO_DELETE: 'לא מוחקים רשומות שיש להן היסטוריה; אפשר לסמן כלא פעיל.',
  NOT_A_DEMO_ORG: 'אפשר למלא נתוני הדגמה רק בארגון הדגמה.', DEMO_ALREADY_SEEDED: 'בארגון כבר יש נתונים.',
};
const PERM = {
  'stock.move': 'תנועות מלאי', 'stock.adjust': 'התאמות וגריעות מלאי', 'stock.count': 'ספירות מלאי', 'stock.transfer': 'העברות בין אתרים',
  'po.create': 'יצירת הזמנות', 'po.approve': 'אישור הזמנות', 'po.send': 'שליחת הזמנות', 'po.cancel': 'ביטול הזמנות',
  'requests.create': 'פתיחת דרישות', 'requests.approve': 'אישור דרישות', 'rfq.manage': 'בקשות להצעות מחיר',
  'receipts.post': 'קליטת סחורה', 'invoices.register': 'קליטת חשבוניות', 'invoices.approve_payment': 'אישור תשלום',
  'budgets.manage': 'ניהול תקציבים', 'settings.manage': 'הגדרות', 'users.manage': 'ניהול משתמשים', 'items.manage': 'ניהול פריטים',
  'suppliers.manage': 'ניהול ספקים', 'sites.manage': 'ניהול אתרים', 'finance.view': 'צפייה בנתונים כספיים',
};
export function errorText(e) {
  const m = String(e?.message || e || '');
  if (/duplicate key/.test(m)) {
    if (/items_sku/.test(m)) return 'כבר קיים פריט עם המק״ט הזה.';
    if (/sites_code/.test(m)) return 'כבר קיים אתר עם הקוד הזה.';
    if (/suppliers_company/.test(m)) return 'כבר קיים ספק עם מספר החברה הזה.';
    if (/items_barcode/.test(m)) return 'הברקוד כבר משויך לפריט אחר.';
    return 'רשומה כזו כבר קיימת.';
  }
  if (/violates row-level security|permission denied/.test(m)) return 'אין לכם הרשאה לפעולה הזו.';
  const [code, ...args] = m.split(':');
  if (code === 'FORBIDDEN') {
    if (args[0] === 'approval') return `השלב הנוכחי דורש אישור של ${ROLE[args[1]] || args[1]}.`;
    return `אין לכם הרשאה ל${PERM[args[0]] || 'פעולה הזו'}.`;
  }
  if (ERR[code]) return ERR[code].replace(/\{(\d)\}/g, (_, i) => {
    const a = args[Number(i)];
    if (code === 'BAD_STATUS') return Object.values(STATUS).find((mp) => mp[a])?.[a]?.[0] || a;
    return a && isNum(a) ? nfq.format(Number(a)) : (a ?? '');
  });
  if (/violates check constraint/.test(m)) return 'אחד הערכים לא תקין.';
  return 'הפעולה נכשלה. ' + (m.length < 120 ? m : '');
}
