// Demo data (deterministic) and the defaults every new workspace gets (templates, reports, scoring rules...).

import { store } from './store.js';
import { prng, DAY, addDays, uid } from './util.js';
import { DEFAULT_PIPELINES } from './schema.js';
import { DEFAULT_SCORING_RULES } from './filters.js';
import * as automationSeed from '../seeds/automation.js';
import * as commerceSeed from '../seeds/commerce.js';

const FIRST = ['נועה', 'יוסי', 'מיכל', 'אבי', 'שירן', 'דניאל', 'תמר', 'עומר', 'רותם', 'איתי', 'הילה', 'גיא', 'ליאת', 'אורי', 'מאיה', 'עידו', 'קרן', 'אלון', 'יעל', 'נדב', 'שני', 'רועי', 'ענבל', 'עמית', 'אסף', 'דנה', 'משה', 'רונית', 'טל', 'אייל', 'סיגל', 'ניר', 'אפרת', 'יונתן', 'לירון', 'בועז', 'אורית', 'עדי', 'חן', 'שגיא', 'מורן', 'יובל', 'הדר', 'זיו', 'מירב', 'אליה', 'נטע', 'אביטל', 'סאמר', 'רנא', 'מוחמד', 'לינה', 'אחמד', 'נור', 'ולדימיר', 'אולגה', 'דמיטרי', 'אנה'];
const LAST = ['כהן', 'לוי', 'מזרחי', 'פרץ', 'ביטון', 'אברהם', 'פרידמן', 'שפירא', 'אזולאי', 'דהן', 'אוחיון', 'גבאי', 'חדד', 'אדלר', 'ברק', 'שמעוני', 'רוזן', 'קפלן', 'גולן', 'נחום', 'סויסה', 'טל', 'רבינוביץ', 'בן דוד', 'אשכנזי', 'וקנין', 'חורי', 'עבאס', 'נסאר', 'קוזלוב', 'פטרוב', 'גרינברג', 'זילברמן', 'הלוי', 'שטרן', 'מלכה', 'עמר', 'יוסף', 'קרמר', 'אלמוג'];
const LATIN_FIRST = { 'נועה': 'noa', 'יוסי': 'yossi', 'מיכל': 'michal', 'אבי': 'avi', 'שירן': 'shiran', 'דניאל': 'daniel', 'תמר': 'tamar', 'עומר': 'omer', 'רותם': 'rotem', 'איתי': 'itai', 'הילה': 'hila', 'גיא': 'guy', 'ליאת': 'liat', 'אורי': 'uri', 'מאיה': 'maya', 'עידו': 'ido', 'קרן': 'keren', 'אלון': 'alon', 'יעל': 'yael', 'נדב': 'nadav', 'שני': 'shani', 'רועי': 'roy', 'ענבל': 'inbal', 'עמית': 'amit', 'אסף': 'asaf', 'דנה': 'dana', 'משה': 'moshe', 'רונית': 'ronit', 'טל': 'tal', 'אייל': 'eyal', 'סיגל': 'sigal', 'ניר': 'nir', 'אפרת': 'efrat', 'יונתן': 'yonatan', 'לירון': 'liron', 'בועז': 'boaz', 'אורית': 'orit', 'עדי': 'adi', 'חן': 'chen', 'שגיא': 'sagi', 'מורן': 'moran', 'יובל': 'yuval', 'הדר': 'hadar', 'זיו': 'ziv', 'מירב': 'meirav', 'אליה': 'elia', 'נטע': 'neta', 'אביטל': 'avital', 'סאמר': 'samer', 'רנא': 'rana', 'מוחמד': 'mohammad', 'לינה': 'lina', 'אחמד': 'ahmad', 'נור': 'nur', 'ולדימיר': 'vladimir', 'אולגה': 'olga', 'דמיטרי': 'dmitri', 'אנה': 'anna' };
const LATIN_LAST = { 'כהן': 'cohen', 'לוי': 'levi', 'מזרחי': 'mizrahi', 'פרץ': 'peretz', 'ביטון': 'biton', 'אברהם': 'avraham', 'פרידמן': 'friedman', 'שפירא': 'shapira', 'אזולאי': 'azulay', 'דהן': 'dahan', 'אוחיון': 'ohayon', 'גבאי': 'gabay', 'חדד': 'hadad', 'אדלר': 'adler', 'ברק': 'barak', 'שמעוני': 'shimoni', 'רוזן': 'rosen', 'קפלן': 'kaplan', 'גולן': 'golan', 'נחום': 'nahum', 'סויסה': 'swisa', 'טל': 'tal', 'רבינוביץ': 'rabinovich', 'בן דוד': 'bendavid', 'אשכנזי': 'ashkenazi', 'וקנין': 'vaknin', 'חורי': 'khoury', 'עבאס': 'abbas', 'נסאר': 'nassar', 'קוזלוב': 'kozlov', 'פטרוב': 'petrov', 'גרינברג': 'greenberg', 'זילברמן': 'silberman', 'הלוי': 'halevi', 'שטרן': 'stern', 'מלכה': 'malka', 'עמר': 'amar', 'יוסף': 'yosef', 'קרמר': 'kramer', 'אלמוג': 'almog' };
const COMPANIES = [
  ['נגב סולאר אנרגיות', 'negev-solar.co.il', 'energy'], ['טבע הגליל מזון', 'teva-hagalil.co.il', 'food'], ['אורביט מערכות', 'orbit-sys.co.il', 'tech'],
  ['קורל לוגיסטיקה', 'coral-log.co.il', 'logistics'], ['בית אבן נדל"ן', 'beit-even.co.il', 'realestate'], ['מדיקל פלוס', 'medicalplus.co.il', 'health'],
  ['פינטק שמש', 'shemesh-fin.com', 'finance'], ['גלבוע תעשיות', 'gilboa-ind.co.il', 'manufacturing'], ['עדן קמעונאות', 'eden-retail.co.il', 'retail'],
  ['סייברסנס', 'cybersense.io', 'tech'], ['ירוק עד הנדסה', 'yarok-ad.co.il', 'services'], ['מכללת אופקים', 'ofakim-college.ac.il', 'education'],
  ['אלקטרה הצפון', 'electra-north.co.il', 'energy'], ['צמרת ייעוץ', 'tzameret.co.il', 'services'], ['דאטה ווב', 'dataweb.co.il', 'tech'],
  ['שחר ביטוח', 'shahar-ins.co.il', 'finance'], ['פלדות הכרמל', 'carmel-steel.co.il', 'manufacturing'], ['כנרת קפה', 'kinneret-coffee.co.il', 'food'],
  ['ניו-מד קליניקות', 'newmed.co.il', 'health'], ['מגדלי הים', 'migdalei-hayam.co.il', 'realestate'], ['קוד בלו', 'codeblue.dev', 'tech'],
  ['ספרינג לוגיסטיקה', 'spring-logistics.co.il', 'logistics'], ['אופנת לב', 'lev-fashion.co.il', 'retail'], ['הנדסת אשל', 'eshel-eng.co.il', 'services'],
  ['עיריית רמת הדר', 'ramat-hadar.muni.il', 'public'], ['מעיין מים', 'maayan-water.co.il', 'manufacturing'], ['קלאודיה', 'cloudia.io', 'tech'],
  ['בייקרי ברוס', 'bakery-bros.co.il', 'food'], ['אקדמיית פיקסל', 'pixel-academy.co.il', 'education'], ['גשר השקעות', 'gesher-invest.co.il', 'finance'],
  ['רפאל אופטיקה', 'raphael-optics.co.il', 'health'], ['אבני דרך בנייה', 'avnei-derech.co.il', 'realestate'], ['סקיילאב', 'skylab.ai', 'tech'],
  ['מובילי השרון', 'sharon-movers.co.il', 'logistics'], ['טרנד הום', 'trendhome.co.il', 'retail'], ['אור ירוק אנרגיה', 'or-yarok.co.il', 'energy'],
  ['רואי חשבון ברק ושות׳', 'barak-cpa.co.il', 'services'], ['פודטק', 'foodtech.co.il', 'food'], ['אינובייט HR', 'innovate-hr.co.il', 'services'],
  ['מטרו פארמה', 'metro-pharma.co.il', 'health'], ['גל-אור מערכות מיזוג', 'galor-ac.co.il', 'manufacturing'], ['ויז׳ן שיווק', 'vision-mkt.co.il', 'services'],
  ['פלטינום רכב', 'platinum-car.co.il', 'retail'], ['נקסט סקול', 'nextschool.co.il', 'education'], ['פורט אשדוד שילוח', 'port-ashdod.co.il', 'logistics'],
];
const CITIES = ['תל אביב-יפו', 'ירושלים', 'חיפה', 'ראשון לציון', 'פתח תקווה', 'אשדוד', 'נתניה', 'באר שבע', 'חולון', 'רמת גן', 'הרצליה', 'רעננה', 'כפר סבא', 'מודיעין', 'רחובות', 'נצרת', 'עכו', 'קריית שמונה', 'אילת', 'יוקנעם'];
const STREETS = ['הרצל', 'רוטשילד', 'ויצמן', 'בן גוריון', 'העצמאות', 'הנשיא', 'ז׳בוטינסקי', 'הברזל', 'המלאכה', 'יגאל אלון', 'דרך מנחם בגין', 'החשמונאים'];
const TITLES = ['מנכ"ל', 'סמנכ"ל כספים', 'סמנכ"ל שיווק', 'מנהלת רכש', 'מנהל IT', 'מנהלת משאבי אנוש', 'ראש צוות פיתוח', 'מנהל תפעול', 'בעלים', 'מנהלת מכירות', 'סמנכ"ל טכנולוגיות', 'מנהל פרויקטים', 'אחראית אדמיניסטרציה', 'יועץ חיצוני', 'מנהלת מוצר'];
const DEAL_KINDS = ['רישוי שנתי', 'פרויקט הטמעה', 'הרחבת משתמשים', 'חבילת תמיכה פרימיום', 'ייעוץ ואפיון', 'מעבר לענן', 'הדרכה לצוות', 'חידוש חוזה', 'מודול דוחות', 'אינטגרציה למערכת קיימת'];
const TICKET_SUBJECTS = [
  ['לא מצליח להתחבר למערכת', 'bug'], ['שאלה על החשבונית האחרונה', 'billing'], ['בקשה להוספת משתמשים', 'question'], ['הייצוא לאקסל לא עובד', 'bug'],
  ['איך מגדירים הרשאות?', 'question'], ['בקשה לשנות את אמצעי התשלום', 'billing'], ['אפשר להוסיף שדה מותאם?', 'feature'], ['הדוח החודשי לא נשלח', 'bug'],
  ['הדרכה לעובדים חדשים', 'onboarding'], ['בקשה לביטול מנוי', 'cancel'], ['חיוב כפול בכרטיס האשראי', 'billing'], ['האפליקציה איטית בבוקר', 'bug'],
  ['ייבוא אנשי קשר מקובץ', 'onboarding'], ['שילוב עם וואטסאפ', 'feature'], ['איפוס סיסמה', 'question'],
];
const NOTES = [
  'דיברנו על התקציב לרבעון הבא. מבקש הצעה מעודכנת עד סוף השבוע.', 'מעוניינים בהדגמה לצוות המכירות. לתאם עם המנכ"ל.',
  'הלקוח מרוצה מהשירות, אולי יש פוטנציאל להרחבה במחלקת הכספים.', 'השווה אותנו למתחרה. המחיר שלנו גבוה ב-10%, אבל השירות חשוב לו יותר.',
  'צריך לשלוח חומרים על אבטחת מידע ועמידה ב-ISO 27001.', 'מקבלת ההחלטות היא הסמנכ"לית. לקבוע איתה פגישה ישירה.',
  'ביקשו פיילוט של חודש לפני התחייבות.', 'עדכון: החוזה אצל היועץ המשפטי שלהם.', 'לא זמין עד אחרי החגים. לחזור אליו בתחילת החודש.',
  'שיחת היכרות טובה. יש להם כ-40 עובדים ומערכת ישנה שמתחילה להגביל אותם.',
];
const CALL_NOTES = ['שיחת המשך על ההצעה', 'שיחת היכרות', 'בירור צרכים', 'עדכון סטטוס', 'תיאום הדגמה', 'מעקב אחרי חשבונית'];
const MEETINGS = ['פגישת היכרות במשרדי הלקוח', 'הדגמת מוצר בזום', 'סדנת אפיון', 'פגישת סיכום רבעון', 'מו"מ על תנאי החוזה'];
const EMAIL_SUBJECTS = ['הצעת מחיר מעודכנת', 'סיכום הפגישה שלנו', 'חומרים שביקשת', 'המשך לשיחה מאתמול', 'הזמנה להדגמה', 'מסמכי הטמעה'];

export function installDefaults() {
  const s = store.settings;
  if (!s.pipelines) store.saveSettings({ pipelines: structuredClone(DEFAULT_PIPELINES) });
  if (!s.scoring?.rules?.length) store.saveSettings({ scoring: { enabled: true, rules: structuredClone(DEFAULT_SCORING_RULES) } });
  const me = s.currentUserId;
  if (!store.count('templates')) {
    store.insertMany('templates', [
      { name: 'פנייה ראשונה', category: 'מכירות', subject: 'היי {{contact.firstName}}, שאלה קצרה', body: 'היי {{contact.firstName}},\n\nראיתי ש{{company.name|הצוות שלכם}} מתרחבים, ורציתי לשאול אם ניהול הלקוחות אצלכם עדיין יושב על אקסל.\n\nאשמח ל-15 דקות השבוע להראות איך אנחנו עוזרים לחברות דומות לסגור יותר עסקאות.\n\nבברכה,\n{{me.name}}', ownerId: me, usageCount: 0 },
      { name: 'מעקב אחרי פגישה', category: 'מכירות', subject: 'סיכום הפגישה שלנו', body: 'שלום {{contact.firstName}},\n\nתודה על הזמן היום. כמו שסיכמנו:\n• נשלח הצעת מחיר עד יום ה׳\n• נתאם הדגמה לצוות\n\nאם יש עוד שאלות, אני כאן.\n\n{{me.name}}', ownerId: me, usageCount: 0 },
      { name: 'הצעת מחיר נשלחה', category: 'מכירות', subject: 'הצעת המחיר עבור {{deal.name|הפרויקט}}', body: 'שלום {{contact.firstName}},\n\nמצורפת הצעת המחיר כפי שסיכמנו. ההצעה בתוקף ל-30 יום.\n\nאשמח לעבור עליה יחד בשיחה קצרה.\n\n{{me.name}}', ownerId: me, usageCount: 0 },
      { name: 'ברוכים הבאים', category: 'הצטרפות', subject: 'ברוכים הבאים, {{contact.firstName}}!', body: 'שלום {{contact.firstName}},\n\nשמחים שהצטרפת. בימים הקרובים ניצור קשר כדי לתאם הדרכה ראשונה.\n\nבינתיים, אפשר להשיב למייל הזה עם כל שאלה.\n\nצוות {{business.name}}', ownerId: me, usageCount: 0 },
      { name: 'ניסיון אחרון ליצירת קשר', category: 'מכירות', subject: 'לסגור את התיק?', body: 'היי {{contact.firstName}},\n\nניסיתי לתפוס אותך כמה פעמים. אם זה לא הזמן המתאים, אין בעיה – רק תגיד/י ואסגור את התיק.\n\nאם כן רלוונטי, מתי נוח לך לשיחה?\n\n{{me.name}}', ownerId: me, usageCount: 0 },
      { name: 'פנייה טופלה', category: 'שירות', subject: 'הפנייה שלך טופלה', body: 'שלום {{contact.firstName}},\n\nרצינו לעדכן שהפנייה שלך טופלה. אם משהו עדיין לא עובד כמו שצריך, אפשר להשיב למייל הזה ונפתח אותה מחדש.\n\nצוות התמיכה של {{business.name}}', ownerId: me, usageCount: 0 },
    ], { silent: true });
  }
  if (!store.count('reports')) {
    store.insertMany('reports', [
      { name: 'שווי עסקאות פתוחות לפי שלב', object: 'deal', chart: 'funnel', measure: { agg: 'sum', prop: 'amount' }, groupBy: { prop: 'stageId' }, filters: { match: 'all', filters: [{ prop: 'pipelineId', op: 'any_of', value: ['sales'] }] }, dateRange: { prop: 'createdAt', preset: 'all' }, onDashboard: true, size: 'md' },
      { name: 'הכנסות שנסגרו לפי חודש', object: 'deal', chart: 'column', measure: { agg: 'sum', prop: 'amount' }, groupBy: { prop: 'closedAt', bucket: 'month' }, filters: { match: 'all', filters: [{ prop: 'stageId', op: 'any_of', value: ['won', 'p_won'] }] }, dateRange: { prop: 'closedAt', preset: 'last_12_months' }, onDashboard: true, size: 'lg' },
      { name: 'אנשי קשר חדשים לפי מקור', object: 'contact', chart: 'donut', measure: { agg: 'count' }, groupBy: { prop: 'source' }, filters: { match: 'all', filters: [] }, dateRange: { prop: 'createdAt', preset: 'last_12_months' }, onDashboard: true, size: 'md' },
      { name: 'עסקאות שנסגרו לפי נציג', object: 'deal', chart: 'bar', measure: { agg: 'sum', prop: 'amount' }, groupBy: { prop: 'ownerId' }, filters: { match: 'all', filters: [{ prop: 'stageId', op: 'any_of', value: ['won', 'p_won'] }] }, dateRange: { prop: 'closedAt', preset: 'this_year' }, onDashboard: true, size: 'md' },
      { name: 'אנשי קשר לפי שלב במחזור החיים', object: 'contact', chart: 'bar', measure: { agg: 'count' }, groupBy: { prop: 'lifecycle' }, filters: { match: 'all', filters: [] }, dateRange: { prop: 'createdAt', preset: 'all' }, onDashboard: false, size: 'md' },
      { name: 'פניות פתוחות לפי עדיפות', object: 'ticket', chart: 'donut', measure: { agg: 'count' }, groupBy: { prop: 'priority' }, filters: { match: 'all', filters: [{ prop: 'closedAt', op: 'unknown' }] }, dateRange: { prop: 'createdAt', preset: 'all' }, onDashboard: true, size: 'sm' },
      { name: 'סיבות להפסד עסקאות', object: 'deal', chart: 'bar', measure: { agg: 'count' }, groupBy: { prop: 'lostReason' }, filters: { match: 'all', filters: [{ prop: 'stageId', op: 'any_of', value: ['lost', 'p_lost'] }] }, dateRange: { prop: 'closedAt', preset: 'all' }, onDashboard: false, size: 'md' },
      { name: 'פניות שנפתחו לפי חודש', object: 'ticket', chart: 'line', measure: { agg: 'count' }, groupBy: { prop: 'createdAt', bucket: 'month' }, filters: { match: 'all', filters: [] }, dateRange: { prop: 'createdAt', preset: 'last_12_months' }, onDashboard: false, size: 'md' },
    ], { silent: true });
  }
  if (!store.count('views')) {
    store.insertMany('views', [
      { type: 'contact', name: 'הלידים שלי', filters: { match: 'all', filters: [{ prop: 'ownerId', op: 'me' }, { prop: 'lifecycle', op: 'any_of', value: ['lead', 'mql', 'sql'] }] }, sort: { key: 'score', dir: -1 }, shared: true },
      { type: 'contact', name: 'לידים חמים', filters: { match: 'all', filters: [{ prop: 'score', op: 'gt', value: 50 }] }, sort: { key: 'score', dir: -1 }, shared: true },
      { type: 'contact', name: 'ללא פעילות 30 יום', filters: { match: 'all', filters: [{ prop: 'lastActivityAt', op: 'more_than_days_ago', value: 30 }, { prop: 'lifecycle', op: 'none_of', value: ['customer', 'evangelist'] }] }, sort: { key: 'lastActivityAt', dir: 1 }, shared: true },
      { type: 'deal', name: 'נסגרות החודש', filters: { match: 'all', filters: [{ prop: 'closeDate', op: 'this_month' }, { prop: 'closedAt', op: 'unknown' }] }, sort: { key: 'amount', dir: -1 }, shared: true },
      { type: 'deal', name: 'העסקאות שלי', filters: { match: 'all', filters: [{ prop: 'ownerId', op: 'me' }] }, shared: true },
      { type: 'company', name: 'לקוחות', filters: { match: 'all', filters: [{ prop: 'type', op: 'any_of', value: ['customer'] }] }, shared: true },
      { type: 'ticket', name: 'פתוחות ודחופות', filters: { match: 'all', filters: [{ prop: 'closedAt', op: 'unknown' }, { prop: 'priority', op: 'any_of', value: ['high', 'urgent'] }] }, shared: true },
    ], { silent: true });
  }
  if (!store.count('products')) {
    store.insertMany('products', [
      { name: 'רישיון משתמש – חבילת בסיס', sku: 'LIC-BASIC', price: 89, unit: 'משתמש / חודש', recurring: 'monthly', category: 'רישוי', active: true, description: 'גישה לכל יכולות הליבה' },
      { name: 'רישיון משתמש – חבילה מקצועית', sku: 'LIC-PRO', price: 189, unit: 'משתמש / חודש', recurring: 'monthly', category: 'רישוי', active: true, description: 'אוטומציות, דוחות מתקדמים ורצפים' },
      { name: 'רישיון ארגוני שנתי', sku: 'LIC-ENT', price: 48000, unit: 'שנה', recurring: 'yearly', category: 'רישוי', active: true, description: 'עד 50 משתמשים, SLA ומנהל לקוח ייעודי' },
      { name: 'הטמעה והגדרה', sku: 'SRV-ONB', price: 7500, unit: 'פרויקט', recurring: null, category: 'שירותים', active: true, description: 'אפיון, הגדרת צינורות ושדות, ייבוא נתונים' },
      { name: 'שעת ייעוץ', sku: 'SRV-HOUR', price: 450, unit: 'שעה', recurring: null, category: 'שירותים', active: true, description: '' },
      { name: 'הדרכת צוות (חצי יום)', sku: 'SRV-TRN', price: 3200, unit: 'סדנה', recurring: null, category: 'שירותים', active: true, description: 'עד 15 משתתפים' },
      { name: 'אינטגרציה למערכת חיצונית', sku: 'INT-API', price: 12000, unit: 'פרויקט', recurring: null, category: 'פיתוח', active: true, description: 'חיבור ל-ERP / הנהלת חשבונות' },
      { name: 'תמיכה פרימיום', sku: 'SUP-PREM', price: 1500, unit: 'חודש', recurring: 'monthly', category: 'תמיכה', active: true, description: 'מענה תוך שעה, 24/7' },
      { name: 'מודול דוחות מתקדם', sku: 'MOD-BI', price: 600, unit: 'חודש', recurring: 'monthly', category: 'מודולים', active: true, description: '' },
      { name: 'הגירת נתונים', sku: 'SRV-MIG', price: 5500, unit: 'פרויקט', recurring: null, category: 'שירותים', active: true, description: 'ממערכת קודמת או מאקסל' },
    ], { silent: true });
  }
  for (const m of [automationSeed, commerceSeed]) {
    try { m.seedDefaults(); } catch (e) { console.error('[seed] defaults failed', e); }
  }
  if (!store.count('dashboards')) {
    store.insert('dashboards', { name: 'לוח המכירות', widgets: store.filter('reports', (r) => r.onDashboard).map((r) => ({ reportId: r.id, size: r.size || 'md' })) }, { silent: true });
  }
}

export function seedDemo({ myName = 'אני' } = {}) {
  const R = prng(20261025);
  const now = Date.now();
  const iso = (t) => new Date(t).toISOString();
  const ago = (days, jitterHours = 10) => iso(now - days * DAY - R.int(0, jitterHours) * 36e5);

  // ---- users
  const users = store.insertMany('users', [
    { name: myName, email: '', role: 'admin', title: 'מנהל/ת המערכת', active: true },
    { name: 'דנה כהן', email: 'dana@example.co.il', role: 'sales', title: 'מנהלת לקוחות', active: true },
    { name: 'יואב לוי', email: 'yoav@example.co.il', role: 'sales', title: 'נציג מכירות', active: true },
    { name: 'שירה מזרחי', email: 'shira@example.co.il', role: 'sales', title: 'ראש צוות מכירות', active: true },
    { name: 'מיכל אברהם', email: 'michal@example.co.il', role: 'support', title: 'מנהלת שירות', active: true },
    { name: 'רון פרץ', email: 'ron@example.co.il', role: 'marketing', title: 'מנהל שיווק', active: true },
  ], { silent: true });
  const [me, dana, yoav, shira, michal, ron] = users;
  const sellers = [me, dana, yoav, shira, dana, yoav];
  store.saveSettings({ currentUserId: me.id });
  installDefaults();

  // ---- companies
  const companies = COMPANIES.map(([name, domain, industry], i) => {
    const created = ago(R.int(20, 420));
    return store.insert('companies', {
      name, domain, industry,
      type: R.weighted([['customer', 4], ['prospect', 6], ['partner', 1], ['vendor', 0.5]]),
      size: R.pick(['1-10', '11-50', '11-50', '51-200', '51-200', '201-500', '501-1000', '1000+']),
      annualRevenue: R.int(2, 400) * 250000,
      phone: `0${R.pick([3, 4, 8, 9, 2])}-${R.int(500, 999)}${R.int(1000, 9999)}`,
      city: R.pick(CITIES), address: `${R.pick(STREETS)} ${R.int(1, 140)}`,
      taxId: String(510000000 + R.int(1000, 999999)),
      linkedin: `linkedin.com/company/${domain.split('.')[0]}`,
      ownerId: R.pick(sellers).id, createdAt: created, updatedAt: created, source: R.pick(['website', 'referral', 'event', 'cold', 'linkedin', 'google_ads']),
    }, { silent: true });
  });

  // ---- contacts
  const contacts = [];
  const usedEmails = new Set();
  for (let i = 0; i < 165; i++) {
    const fn = R.pick(FIRST), ln = R.pick(LAST);
    const co = i < 125 ? companies[i % companies.length] : null;
    let email = co ? `${LATIN_FIRST[fn]}.${LATIN_LAST[ln]}@${co.domain}` : `${LATIN_FIRST[fn]}${LATIN_LAST[ln]}${R.int(1, 99)}@${R.pick(['gmail.com', 'walla.co.il', 'outlook.com'])}`;
    if (usedEmails.has(email)) email = email.replace('@', `${R.int(2, 9)}@`);
    usedEmails.add(email);
    const daysAgo = Math.floor(Math.pow(R(), 1.4) * 380) + 1;
    const created = ago(daysAgo);
    const lifecycle = co?.type === 'customer' ? R.weighted([['customer', 6], ['evangelist', 1], ['opportunity', 1]]) : R.weighted([['lead', 6], ['mql', 3], ['sql', 2], ['opportunity', 2], ['subscriber', 2], ['customer', 1]]);
    const c = store.insert('contacts', {
      firstName: fn, lastName: ln, email,
      phone: `05${R.int(0, 8)}-${R.int(100, 999)}${R.int(1000, 9999)}`,
      jobTitle: co ? R.pick(TITLES) : R.chance(0.4) ? R.pick(TITLES) : null,
      lifecycle,
      leadStatus: ['customer', 'evangelist'].includes(lifecycle) ? null : R.weighted([['new', 3], ['open', 3], ['in_progress', 3], ['connected', 2], ['qualified', 2], ['unqualified', 1], ['bad_timing', 1]]),
      source: R.weighted([['website', 5], ['google_ads', 3], ['facebook', 3], ['referral', 3], ['event', 2], ['linkedin', 2], ['cold', 2], ['form', 2], ['partner', 1]]),
      city: co?.city || R.pick(CITIES),
      tags: [R.chance(0.15) && 'vip', R.chance(0.35) && 'newsletter', R.chance(0.25) && 'decision_maker', R.chance(0.1) && 'event_2026'].filter(Boolean),
      marketingConsent: R.chance(0.6), unsubscribed: R.chance(0.04),
      ownerId: co ? co.ownerId : R.pick(sellers).id,
      createdAt: created, updatedAt: created,
    }, { silent: true });
    if (co) store.link('contact', c.id, 'company', co.id, { silent: true });
    contacts.push({ c, co });
  }

  // ---- deals (with stage history for velocity / funnel reports)
  const salesStages = DEFAULT_PIPELINES.deal[0].stages;
  const partnerStages = DEFAULT_PIPELINES.deal[1].stages;
  const deals = [];
  for (let i = 0; i < 92; i++) {
    const partner = i % 13 === 0;
    const stages = partner ? partnerStages : salesStages;
    const openStages = stages.filter((s) => s.type === 'open');
    const createdDays = R.int(3, 360);
    const created = now - createdDays * DAY;
    const outcome = createdDays > 45 ? R.weighted([['won', 5], ['lost', 3], ['open', 2]]) : R.weighted([['open', 8], ['won', 1], ['lost', 1]]);
    const finalStage = outcome === 'won' ? stages.find((s) => s.type === 'won') : outcome === 'lost' ? stages.find((s) => s.type === 'lost') : R.pick(openStages);
    const pair = R.pick(contacts.filter((x) => x.co));
    const owner = store.get('users', pair.co.ownerId) || R.pick(sellers);
    const amount = Math.round(R.weighted([[R.int(8, 30), 5], [R.int(30, 90), 4], [R.int(90, 260), 2], [R.int(260, 600), 0.6]]) * 1000 / 500) * 500;
    const reach = outcome === 'open' ? openStages.indexOf(finalStage) : outcome === 'won' ? openStages.length - 1 : R.int(0, openStages.length - 1);
    const path = openStages.slice(0, reach + 1);
    const closedAtT = outcome === 'open' ? null : Math.min(now - DAY, created + R.int(10, 80) * DAY);
    const stepT = ((closedAtT || now) - created) / (path.length + (outcome === 'open' ? 0.5 : 1));
    const d = store.insert('deals', {
      name: `${pair.co.name} – ${R.pick(DEAL_KINDS)}`, amount,
      pipelineId: partner ? 'partners' : 'sales', stageId: finalStage.id,
      closeDate: outcome === 'open' ? iso(now + R.int(-10, 75) * DAY) : iso(closedAtT),
      dealType: pair.co.type === 'customer' ? R.pick(['existing', 'renewal']) : 'new',
      priority: R.weighted([['low', 2], ['medium', 5], ['high', 2]]),
      source: pair.c.source,
      lostReason: outcome === 'lost' ? R.weighted([['price', 4], ['competitor', 3], ['timing', 2], ['no_budget', 2], ['no_response', 2], ['features', 1]]) : null,
      closedAt: closedAtT ? iso(closedAtT) : null,
      stageChangedAt: iso(outcome === 'open' ? created + stepT * (path.length - 1) + R.int(0, 6) * DAY : closedAtT),
      nextStep: outcome === 'open' ? R.pick(['לשלוח הצעת מחיר', 'לתאם הדגמה', 'שיחה עם מקבל ההחלטות', 'לחכות לחתימה', 'פגישת מו"מ']) : null,
      ownerId: owner.id, createdAt: iso(created), updatedAt: iso(closedAtT || created),
    }, { silent: true });
    // stage history
    let prev = null;
    path.forEach((s, k) => {
      store.insert('history', { type: 'deal', recordId: d.id, key: 'stageId', from: prev, to: s.id, at: iso(created + stepT * k), by: owner.id, source: 'user' }, { silent: true });
      prev = s.id;
    });
    if (outcome !== 'open') store.insert('history', { type: 'deal', recordId: d.id, key: 'stageId', from: prev, to: finalStage.id, at: iso(closedAtT), by: owner.id, source: 'user' }, { silent: true });
    store.link('deal', d.id, 'contact', pair.c.id, { silent: true });
    store.link('deal', d.id, 'company', pair.co.id, { silent: true });
    // a second contact from the same company on bigger deals
    if (amount > 60000) {
      const other = contacts.find((x) => x.co?.id === pair.co.id && x.c.id !== pair.c.id);
      if (other) store.link('deal', d.id, 'contact', other.c.id, { silent: true });
    }
    if (outcome === 'won') {
      store.update('companies', pair.co.id, { type: 'customer' }, { silent: true, history: false });
      store.update('contacts', pair.c.id, { lifecycle: 'customer', leadStatus: null }, { silent: true, history: false });
    }
    deals.push({ d, pair, owner, created, closedAtT, outcome });
  }

  // ---- tickets
  const ticketStages = DEFAULT_PIPELINES.ticket[0].stages;
  for (let i = 0; i < 38; i++) {
    const [subject, category] = R.pick(TICKET_SUBJECTS);
    const pair = R.pick(contacts.filter((x) => x.c.lifecycle === 'customer' || x.co?.type === 'customer') || contacts);
    const createdDays = Math.floor(Math.pow(R(), 1.6) * 200);
    const created = now - createdDays * DAY - R.int(0, 20) * 36e5;
    const closed = createdDays > 6 ? R.chance(0.85) : R.chance(0.25);
    const stageId = closed ? 'closed' : R.pick(['new', 'waiting_us', 'waiting_us', 'waiting_customer']);
    const priority = R.weighted([['low', 3], ['medium', 5], ['high', 2], ['urgent', 0.7]]);
    const slaHours = { low: 72, medium: 24, high: 8, urgent: 4 }[priority];
    const t = store.insert('tickets', {
      subject, category, priority, pipelineId: 'support', stageId,
      channel: R.pick(['email', 'phone', 'whatsapp', 'chat', 'form']),
      description: 'הלקוח פנה בנושא. פרטים נוספים בשרשור.',
      dueAt: iso(created + slaHours * 36e5),
      closedAt: closed ? iso(created + R.int(2, 96) * 36e5) : null,
      ownerId: R.chance(0.8) ? michal.id : R.pick([me, dana]).id,
      createdAt: iso(created), updatedAt: iso(created), stageChangedAt: iso(created),
    }, { silent: true });
    store.link('ticket', t.id, 'contact', pair.c.id, { silent: true });
    if (pair.co) store.link('ticket', t.id, 'company', pair.co.id, { silent: true });
  }

  // ---- activities
  const act = (data) => store.insert('activities', data, { silent: true });
  const targetsOf = (c, co, d) => [{ type: 'contact', id: c.id }, co && { type: 'company', id: co.id }, d && { type: 'deal', id: d.id }].filter(Boolean);
  for (const { d, pair, owner, created, closedAtT, outcome } of deals) {
    const end = closedAtT || now;
    const n = R.int(2, 7);
    for (let k = 0; k < n; k++) {
      const t = created + ((end - created) * (k + 0.5)) / n;
      if (t > now) continue;
      const kind = R.weighted([['call', 4], ['email', 4], ['note', 3], ['meeting', 2], ['whatsapp', 1]]);
      const base = { ownerId: owner.id, at: iso(t), createdAt: iso(t), updatedAt: iso(t), targets: targetsOf(pair.c, pair.co, d) };
      if (kind === 'call') act({ ...base, type: 'call', subject: R.pick(CALL_NOTES), body: R.pick(NOTES), outcome: R.weighted([['connected', 6], ['no_answer', 3], ['voicemail', 1]]), direction: 'out', durationMin: R.int(2, 35) });
      else if (kind === 'email') act({ ...base, type: 'email', subject: R.pick(EMAIL_SUBJECTS), body: `שלום ${pair.c.firstName},\n\n${R.pick(NOTES)}\n\nבברכה,\n${owner.name}`, direction: R.chance(0.7) ? 'out' : 'in', status: 'logged', to: pair.c.email });
      else if (kind === 'meeting') act({ ...base, type: 'meeting', subject: R.pick(MEETINGS), body: R.pick(NOTES), endAt: iso(t + 3600e3), location: R.pick(['זום', 'משרדי הלקוח', 'המשרד שלנו', 'Google Meet']), attendees: [pair.c.id] });
      else if (kind === 'whatsapp') act({ ...base, type: 'whatsapp', subject: 'הודעת וואטסאפ', body: R.pick(['היי, שלחתי לך את ההצעה במייל 🙂', 'מתי נוח לדבר?', 'תודה על הפגישה!']), direction: 'out' });
      else act({ ...base, type: 'note', subject: '', body: R.pick(NOTES) });
    }
    const last = Math.min(end, now);
    store.update('deals', d.id, { lastActivityAt: iso(outcome === 'open' && R.chance(0.3) ? last - R.int(15, 40) * DAY : last - R.int(0, 5) * DAY) }, { silent: true, history: false });
  }
  for (const { c, co } of contacts) {
    if (R.chance(0.55)) {
      const t = Math.min(now - 36e5, new Date(c.createdAt).getTime() + R.int(0, 60) * DAY);
      act({ type: R.pick(['note', 'call', 'email']), subject: R.pick(CALL_NOTES), body: R.pick(NOTES), outcome: 'connected', direction: 'out', ownerId: c.ownerId, at: iso(t), createdAt: iso(t), updatedAt: iso(t), targets: targetsOf(c, co) });
    }
    const mine = store.all('activities').length; // cheap: last activity computed below
    void mine;
  }
  // recompute lastActivityAt for contacts & companies from activities
  const lastAt = new Map();
  for (const a of store.all('activities')) for (const t of a.targets) { const k = `${t.type}:${t.id}`; if (!lastAt.has(k) || lastAt.get(k) < a.at) lastAt.set(k, a.at); }
  for (const { c } of contacts) { const v = lastAt.get(`contact:${c.id}`); if (v) store.update('contacts', c.id, { lastActivityAt: v }, { silent: true, history: false }); }
  for (const co of companies) { const v = lastAt.get(`company:${co.id}`); if (v) store.update('companies', co.id, { lastActivityAt: v }, { silent: true, history: false }); }

  // ---- tasks
  const openDeals = deals.filter((x) => x.outcome === 'open');
  const taskTitles = [['לשלוח הצעת מחיר', 'email'], ['שיחת מעקב', 'call'], ['לתאם הדגמה', 'meeting'], ['לבדוק סטטוס חוזה', 'todo'], ['להכין מצגת ללקוח', 'todo'], ['לחזור ללקוח אחרי החגים', 'call'], ['לשלוח חומרים טכניים', 'email']];
  for (let i = 0; i < 64; i++) {
    const x = R.pick(openDeals.length ? openDeals : deals);
    const [title, type] = R.pick(taskTitles);
    const dueOffset = R.weighted([[-R.int(1, 10), 2], [0, 2], [R.int(1, 14), 5]]);
    const done = dueOffset < 0 ? R.chance(0.5) : R.chance(0.15);
    const due = new Date(now + dueOffset * DAY); due.setHours(R.pick([9, 10, 11, 13, 14, 16]), R.pick([0, 30]), 0, 0);
    store.insert('tasks', {
      title: `${title} – ${x.pair.c.firstName} ${x.pair.c.lastName}`, type, priority: R.weighted([['low', 2], ['medium', 5], ['high', 2]]),
      status: done ? 'done' : 'open', completedAt: done ? iso(due.getTime() - R.int(0, 2) * DAY) : null,
      dueAt: due.toISOString(), ownerId: i < 26 ? me.id : x.owner.id, notes: '',
      targets: targetsOf(x.pair.c, x.pair.co, x.d), createdAt: ago(R.int(dueOffset < 0 ? -dueOffset + 1 : 1, 20)),
    }, { silent: true });
  }

  // ---- sample quotes from won/open deals
  const products = store.all('products');
  const qDeals = deals.filter((x) => x.outcome !== 'lost').slice(0, 7);
  let qn = store.settings.quote.nextNumber;
  for (const x of qDeals) {
    const items = [R.pick(products), R.pick(products)].filter((p, i, a) => a.indexOf(p) === i).map((p) => ({ id: uid('li'), productId: p.id, name: p.name, description: p.description || '', qty: p.recurring === 'monthly' ? R.int(5, 40) : 1, price: p.price, discount: R.pick([0, 0, 5, 10]) }));
    const issued = Math.min(now - DAY, x.created + 10 * DAY);
    store.insert('quotes', {
      number: `${store.settings.quote.prefix}${qn++}`, title: x.d.name, dealId: x.d.id, contactId: x.pair.c.id, companyId: x.pair.co.id,
      status: x.outcome === 'won' ? 'accepted' : R.pick(['draft', 'sent']), issuedAt: iso(issued), validUntil: iso(issued + 30 * DAY),
      items, discount: 0, vatRate: store.settings.vatRate, notes: '', terms: store.settings.quote.terms, ownerId: x.owner.id,
      acceptedAt: x.outcome === 'won' ? iso(x.closedAtT) : null, createdAt: iso(issued), updatedAt: iso(issued),
    }, { silent: true });
  }
  store.saveSettings({ quote: { ...store.settings.quote, nextNumber: qn } });

  // ---- notifications for me
  store.insert('notifications', { userId: me.id, text: 'ברוכים הבאים לקשר! התחילו מלוח הבקרה או הקישו Ctrl+K לחיפוש.', link: '#/dashboard', kind: 'info', read: false }, { silent: true });
  store.insert('notifications', { userId: me.id, text: `דנה כהן הקצתה לך משימה: שיחת מעקב – ${contacts[3].c.firstName} ${contacts[3].c.lastName}`, link: '#/tasks', kind: 'task', read: false }, { silent: true });

  const ctx = { R, now, users, me, dana, yoav, shira, michal, ron, companies, contacts, deals };
  for (const m of [automationSeed, commerceSeed]) {
    try { m.seedDemo(ctx); } catch (e) { console.error('[seed] demo failed', e); }
  }

  store.emit('remote', { colls: ['contacts', 'companies', 'deals', 'tickets', 'activities', 'tasks', 'users'] });
  return { users: users.length, companies: companies.length, contacts: contacts.length, deals: deals.length };
}
