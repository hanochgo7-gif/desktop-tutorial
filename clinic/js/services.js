/* תפריט הטיפולים: הנתונים בלבד. מחיר ריק = "לפי אבחון". */
window.SERVICES = [
  { id: "face-menu", num: "01", title: "טיפולי פנים", intro: "כל טיפול מתחיל בניקוי ואבחון. הטכנולוגיה נבחרת לפי המטרה, והחומרים לפי סוג העור.", groups: [
    { title: "אבחון וניקוי", rows: [
      { name: "אבחון עור", includes: "שיחה, בדיקת העור בתאורה ובהגדלה, בניית תוכנית", who: "כל לקוחה חדשה", tech: "אבחון", duration: "30 דק'", series: "פעם אחת", interval: "", price: 0, note: "ללא עלות בטיפול הראשון" },
      { name: "ניקוי עמוק", includes: "ניקוי, אידוי, הוצאת שומן וחסימות, מסכה והגנה", who: "כל סוגי העור", tech: "ניקוי ידני", duration: "60 דק'", series: "תחזוקה", interval: "4 עד 6 שבועות", price: null }
    ]},
    { title: "אקנה ודלקת", rows: [
      { name: "טיפול באקנה", includes: "ניקוי עמוק, פלזמה קרה ופילינג חכם לפי מצב העור", who: "עור שמן ודלקתי, התפרצויות", tech: "פלזמה קרה, פילינג", duration: "75 דק'", series: "6 עד 8", interval: "2 עד 4 שבועות", price: null },
      { name: "פלזמה קרה", includes: "חיטוי פני העור ללא חום, הרגעה", who: "עור דלקתי ורגיש", tech: "פלזמה קרה", duration: "30 דק'", series: "לפי צורך", interval: "", price: null },
      { name: "צלקות פוסט-אקנה", includes: "מיקרונידלינג עם אקסוזומים לשיקום המרקם", who: "צלקות, ללא דלקת פעילה", tech: "מיקרונידלינג, אקסוזומים", duration: "60 דק'", series: "3 עד 6", interval: "4 שבועות", price: null }
    ]},
    { title: "פיגמנטציה והבהרה", rows: [
      { name: "כתמי פיגמנטציה", includes: "פילינג, החדרת חומרים ותוכנית הגנה לבית", who: "כתמי שמש, מלזמה, כתמים אחרי אקנה", tech: "פילינג, החדרה", duration: "60 דק'", series: "4 עד 6", interval: "3 עד 4 שבועות", price: null, note: "מומלץ בחורף" },
      { name: "פילינג חכם", includes: "חומצות בריכוז 20% עד 60% לפי סוג העור והמטרה", who: "הבהרה, מרקם, אקנה, רעננות", tech: "חומצות", duration: "45 דק'", series: "בודד או 3 עד 4", interval: "3 שבועות", price: null }
    ]},
    { title: "אנטי-אייג'ינג ומיצוק", rows: [
      { name: "פרוטוקול אנטי-אייג'ינג", includes: "שילוב טכנולוגיות והחדרת חומרים לפי האזור", who: "קמטים, אובדן נפח, רפיון", tech: "משולב", duration: "75 דק'", series: "לפי התוכנית", interval: "3 עד 4 שבועות", price: null },
      { name: "פלזמה חמה", includes: "אידוי מבוקר למתיחה ללא ניתוח", who: "עפעפיים, קמטי הבעה, קווי צוואר", tech: "פלזמה חמה", duration: "45 דק'", series: "1 עד 3", interval: "6 עד 8 שבועות", price: null, note: "ימי החלמה קצרים" },
      { name: "אולטרסאונד ממוקד", includes: "טיפול בשלוש שכבות שריר עד SMAS, המסת שומן וחיטוב", who: "קו לסת, צוואר, רפיון", tech: "אולטרסאונד", duration: "60 דק'", series: "1", interval: "חיזוק אחרי חצי שנה", price: null }
    ]},
    { title: "החדרה ושיקום", rows: [
      { name: "ביו-מיקרונידלינג SQT", includes: "החדרת מחטים ננו-ביולוגיות מספוג ים", who: "אקנה, כתמים, מרקם, חידוש", tech: "SQT", duration: "60 דק'", series: "3 עד 4", interval: "2 עד 4 שבועות", price: null },
      { name: "מיקרונידלינג", includes: "תעלות זעירות להחדרת חומרים ועידוד קולגן", who: "מרקם, נקבוביות, קמטים עדינים", tech: "מיקרונידלינג", duration: "60 דק'", series: "3 עד 4", interval: "4 שבועות", price: null },
      { name: "אקסוזומים", includes: "שיקום, הרגעה והאצת ריפוי, כתוספת לטיפול", who: "אחרי מחטים או פילינג", tech: "אקסוזומים", duration: "תוספת", series: "כתוספת", interval: "", price: null }
    ]}
  ]},
  { id: "laser-menu", num: "02", title: "הסרת שיער בלייזר", intro: "לכל אזורי הגוף, לנשים ולגברים. המכשיר מכויל לגוון העור, מסולם I ועד VI.", groups: [
    { title: "לפני שמתחילים", rows: [
      { name: "טיפול ניסיון", includes: "ירייה על אזור קטן לקביעת העוצמה", who: "לפני כל סדרה", tech: "לייזר", duration: "15 דק'", series: "1", interval: "", price: 0, note: "ללא עלות" }
    ]},
    { title: "פנים וצוואר", rows: [
      { name: "שפה עליונה", includes: "", who: "נשים", tech: "לייזר", duration: "10 דק'", series: "6 עד 8", interval: "4 עד 6 שבועות", price: null },
      { name: "סנטר ולחיים", includes: "", who: "נשים", tech: "לייזר", duration: "15 דק'", series: "6 עד 8", interval: "4 עד 6 שבועות", price: null },
      { name: "קו לסת וצוואר", includes: "", who: "נשים וגברים", tech: "לייזר", duration: "20 דק'", series: "6 עד 8", interval: "4 עד 6 שבועות", price: null }
    ]},
    { title: "גוף", rows: [
      { name: "בית שחי", includes: "", who: "נשים וגברים", tech: "לייזר", duration: "15 דק'", series: "6 עד 8", interval: "4 עד 6 שבועות", price: null },
      { name: "ידיים", includes: "אמות או ידיים מלאות", who: "נשים וגברים", tech: "לייזר", duration: "30 דק'", series: "6 עד 8", interval: "4 עד 6 שבועות", price: null },
      { name: "רגליים", includes: "שוק, ירך או רגליים מלאות", who: "נשים וגברים", tech: "לייזר", duration: "45 דק'", series: "6 עד 8", interval: "6 עד 8 שבועות", price: null },
      { name: "ביקיני", includes: "קו ביקיני, מורחב או ברזילאי", who: "נשים", tech: "לייזר", duration: "20 דק'", series: "6 עד 8", interval: "4 עד 6 שבועות", price: null },
      { name: "גב, חזה ובטן", includes: "", who: "בעיקר גברים", tech: "לייזר", duration: "45 דק'", series: "6 עד 8", interval: "6 עד 8 שבועות", price: null }
    ]}
  ]},
  { id: "pedicure-menu", num: "03", title: "פדיקור טיפולי", intro: "טיפול רפואי-קוסמטי בכף הרגל. כל הכלים חד-פעמיים או מעוקרים, והחומרים מותאמים גם לסוכרתיים.", groups: [
    { title: "כף הרגל", rows: [
      { name: "פדיקור טיפולי", includes: "ניקוי, הסרת עור מעובה, טיפול בציפורניים וקרם טיפולי", who: "כולם", tech: "כלים מעוקרים", duration: "60 דק'", series: "תחזוקה", interval: "4 עד 8 שבועות", price: null },
      { name: "יבלות", includes: "הסרה מבוקרת וטיפול בגורם הלחץ", who: "יבלות ועיבוי עור", tech: "הסרה מבוקרת", duration: "45 דק'", series: "1 עד 3", interval: "2 עד 3 שבועות", price: null },
      { name: "פטריות ציפורן", includes: "ניקוי ודילול הציפורן, החדרת חומרים אנטי-פטרייתיים", who: "ציפורן מעובה או צהובה", tech: "אנטי-פטרייתי", duration: "45 דק'", series: "לפי ההתקדמות", interval: "4 שבועות", price: null },
      { name: "ציפורן חודרנית", includes: "שחרור הציפורן, מגנט BS במידת הצורך", who: "כאב ודלקת בצד הציפורן", tech: "מגנט BS", duration: "45 דק'", series: "1, מעקב", interval: "", price: null },
      { name: "פדיקור לסוכרתיים", includes: "חומרים עדינים, בדיקת עור ותחושה לפני כל טיפול", who: "סוכרתיים", tech: "מותאם", duration: "60 דק'", series: "תחזוקה", interval: "4 עד 6 שבועות", price: null }
    ]}
  ]}
];
