(function () {
  "use strict";
  var LAND = "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pKbCkJCaAlJSaAhITQEhKRQUpKagEJCaAkJSaAhITQEhKRUEpKbwEJCaAkJSKAhITQEhITUFhKTQEJCaAkJSKAhITUEhIDUFhKTQEJCaAkJQKgoISWEhIDUEhKBQEJCaAkJQSgoISSEhIDUFhKBQEBCawkJAaggITSEhIDUFhKAUEBCaQkJAagoIRSEgIDSFhaCUEBCKQkJAagoIRSEgIDSFhYCUEBCKQkJAagoIQSkgIBSFhYCUFBCKQkJAaAoLQSkhIBSFhYCUFBCCQkJAKAoJASkhIBSFhIAUEBSCUkBAKAoLASkoIBSFhIAQFBKCUkJAKAoJASkoIASlhIAQFBICUkBAKAoJASGgIASlgIBQFBYCUlBACAoJASEgLASkgIBQFBYCQkBBCAoJASEpLASkgIBQFBICQkJBCEgBBSEoJASkpKIQFBICQkJYCEgBBaEoJASEhIIQEBIKQkJJCEhJBaGoJASEhIIQkBIKQkFJCAgJBSGgJBSEhKIQkBICwlFJCAgJBSGgJBSEgIIQkJIKQkFJKAgJBaEgJRSEoJIQkBIKQkFJKAgBBSEgJBWEgLJQEBIKQkFJKAgBZaEgJBWEgJJQEBKKQkBJKAgBZaEgJRSEgJJQEAIKQkBIKAgBZaEgJRSEgpJQFAKKQkFKKggBJaEgBBSEgJJQEAJKQkFKKggBJaEgBBSFgJJQEAJKQkEIKAgBJaEoBBSFgpRUEABKQkEIKAgBJaEgABSEghJUEABKQlEIKAgBJaEgABSEghJUEAJKQlEAKAgFBakgAJSkogJQEAIKQkEAKAgFBaggAJSkogJQEAIKQkEAKAhFBaggABSEggJQEAgKUEEAKEhFBaAgABSEggBQEIoKUEEAKEgFBaAgEBSAggBQEIoKQEEAKEgFBaAgEBWgggBQEIoKQEEgKkAFAaAgFBWgggBQkAoKQEEgKgAFAaAgFRWggkBUgAoCQEEgKgAFAaAgFBWAgkBUgAoCQEEoKkAFgaAAFBSAgkBUgAoCUEEoKgBFgagAFRSAglBUgAoCUQEqKgAFgagAFQWAglBUAIoCUQEoKAAFgagAFQSgAlBUAAoCUQEqKABFoagAFQSiIlBQAAoCUQEqKAAFoKgAFASiAlBQAIpCUQEqKEQFoKAAFASiYlRQAApAUREqKERFqKAAFISiIlRUCApAQQEoCERFoKgAFIGiAlRQiApAQREqCkRFqKgAFICiAlRQiApAUREoAEQFqKAQFICCIlRQiApAUREqAEUFqKAQFYCDIlRAiIpAUREoIgVFqKAQFYCiIlBAiIpQQTEoIgVFqIAQFIGCIlBEiIpQQTEoIAVFoIAQFIGiYlBACopQATEoAEVFoIAQFKGiYlBACopQATEoAAXFoIAQFKGCYlBADopAASEoAAXFoIAcFKECYlBACopAASEoAAXFoIAcFIECQlBACopBATEoQAXEoIAUFIECQlAADopBATkoAAXEoIAUFIECQlAACopBASkoQgXEoIgUFIECQlAACohBASkoQgWEoAAUFKMCUlAACohBASkoQgWEoAAUFKMCUlAECohBASkoQgWEoAAUEKMCUlAECghBASgoRAWkoAgUEKMCUlAECghRATggBAWkqAAUEKMCUFAECkhRASgiBAWkoAgUEIMCUFAICkhBASggBgWgoAAUEIICUEAICkhRATggBgWgoAAUkIICUEAICkhBASggBgWgoBAUkIICUEAICkBBASggBgWgoBAUgIICUEAICkBBASggBQWggBAUgIICUEAICkBBISgiBQWggBAUgIICUEQICkABISgABQWggBAUgIICUEAKCkABISgCBUWggBAUgIICUAQKCkABISgCBQWgiBQUgAJCUBQKCkABISgABQWgCBQUgAJCUAQKikARKSgABQSgCBQUgAJCUAAKCkARKCgARYSgKBQUgSJCUAAKCkARKCgABYSgCBQUgSJSUACKCEBRKCgABYSgABQUgSJQUACKCEFRKCgCRaSgABQVgKJQUACKCEEBKCgCRaCgABQRgKNQUASKSEEBKCoCRaGgABQRgCJQUASKSkEBKCIARaGgABQRgCJQVASKQkERKDIARaGgCBSVgiJQRASKQkEBKCIARaCgCBSFgiJQRACKQkERKCoBRaCICBSFgiJQRACKQBERKCoBRaDICBSFgiJQRACKQBERKAoBRaCIABSBIiJQVAKKQBERKAoFRaCIABSBIiJQFAKKQBERKAoFRKCIABSBIiJQFAKKQBERKAJFRKCoABSBIiJQFAqIQBEBKAJFRKAoBBSBIiJQBIqIQFEBKAJFRKAoFBGBIiJQBIqIQFEAKgJFRKAoFBGBIiJUBIqIQFEIKgJFRKAIFBGBogBUBIqIwFEoIgJFROgIFBGBogBUBIqIwBEoIgJFQagIFBGBohBUBIqIUBEoIgJFQagIFBGBIlBEBIqCUBEoIgJFAagIFBGhIlBEBIqCUBEoIgJFoagIFAGhIlBEBIqCUBEoAkJFoIgIFAWhIlAEBIoCUBEoAkJFoIgIFAWhIlAEBIpAEREoAkJFoAgIFAWhIlAEhIpAEREoCkJFoAgIFAEjIlAEhIpAERAoCkJEoAgIFIEiIlAEhIpAERAoAkJEoAgIFYEiIFAEhIpAERAoAkdEoAgIFYEiIFAEhIhAERAqAkVAoAgIFYEiIFAEjIhAERAqAkVAoAgIFYEiIFAEjohAERAqAkVAoAgIEYEiIFQEioBAERAqAkVAoAgYEYEiIFQEioBAERAiAkVAoAgYAYEiIFQEioBAETAiAkVAoAgUAYEiIEQEioBAETACAkVAqAgUAYEiIEQEioBAESACAkVAiAgUAYEiYEQEioBQESgCAkVAiAgUAYEiQAQEioAQESgCAkXACAgUAYEiQAQEioAQESgCAkXACAgUAQEiUAQEioAQECgCAkWACAgUACEiUAQECoARECgCAkSACAgUACEiUAQECgARECgAQkSgCAgUACMgUAAECAARECgAQkSgAAgUACIgUAAEiAARECgAQkCgAAgQACIgUACEiEABECAARECgAAgQAAIgUACEgEABECAABEKAAAgQAQIgQAAIgAABECAABECAAAgAAAIgQAAIgAABEAAABECAABgAAAIgAAAIgAABEAAABECAABAAAAIgAAAIhAABMAAABECAABAAAQIgAAAIhAABIAAABEAAABAAAQIgAAAIgAABIAAABEAAABAIAQJAAAAIhAAAIAACBAAAABAIAQJAAAAIgAAAIAAABIAAABAIAABAAAAIAAAAIBAAAIAAABAAAABAAAAAAAAAIBAAAIAAABAAAABAIAAAAAEAIAAAAIAAAAAAAQBAIAAAAAEAIAAAAIAAAAAAAgBAAAAAAAEAIAAAAIBAAAAAAgAAAAQAAIEAAAAAAIAAAAAAAgAAAAQAAAEAAAAAAIAAAAAAAgEAAAQAAAEAAAAEAIAACAAAAgAAAAgAAAEAAAAEAgAACAAAAgAAAAgAAAAAAAAEAAAAAAAAAgAAAAgEAAAAAAAEAAAAEAgAAgAAAAgAAAAAAAAEAAAAEAgAAAAAAAgAAAAgEAAAAAAAEAAAAAAgAAgAAAAgEAAAAAAAEAAAAEAgAAAAAAAgAAAAAAAAEAAAAEAgAAAAAAAgAAAAAAAAEAAAAEAAAAAAAAAgAAAAgAAAEAAAAEAAAAAAAAAgAAAAgAAAAAAAAEAAAAAAAQAgAAAAgAAAAAAAAEAAAAAAAQAAAAAAgAAAAAAAAMAAAAAAAQAAAAAAgAAAAAACAAAAAAAAAQAAAAAAAAAAAAACAAAAAAAAAQAAAAAAAAAAAAACAAAAAAAAAQAAAAQAAAAAEAACAAAAAAAAAAAAAAQAAAAAAAACAAAACAAAAAAAAAQAAAEAAAACAAAAAAAAAAAAAAAAAAAAAAACAAAACAAAAAAAIAAAAAAAAAACAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", N = 42000;
  // רשת נקודות צפופה לאזור ישראל (קווי חוף land-50m, כל 0.06°), מופיעה רק בזום
  var ILB = "/////////////wMAAAD4/////////////////////////////wMAAAD4/////////////////////////////wcAAADw/////////////////////////////w8AAADw/////////////////////////////w8AAADw/////////////////////////////w8AAADw/////////////////////////////w8AAADw/////////////////////////////x8AAADw/////////////////////////////x8AAADg/////////////////////////////x8AAADg/////////////////////////////z8AAADA/////////////////////////////38AAADA//////////////////////////////8AAACA//////////////////////////////8BHACA//////////////////////////////8DfgCA//////////////////////////////8H/gCA//////////////////////////////8H/wOA//////////////////////////////8D/wcA//////////////////////////////8D/5/5//////////////////////////////8D/j/+//////////////////////////////8D/n/8//////////////////////////////8D/v/w//////////////////////////////8D///h//////////////////////////////8H//+D//////////////////////////////8H//8P//////////////////////////////8H//8f/v////////////////////////////8H/v9//P////////////////////////////8H/v//+P////////////////////////////8P/P//8f////////////////////////////8P+P//x/////////////////////////////8f8P//j/////////////////////////////8f8P//H/////////////////////////////8f4P//P/7///////////////////////////8/4P////z///////////////////////////9/wP////H/////////////////////////////wP///+P/////////////////////////////wf///8//////////////////////////////w////x//////////////////////////////w////z/+////////////////////////////h//////8////////////////////////////h//////7////////////////////////////g//////v////////////////////////////B///////////////////////////////////B///////////////////////////////////D/7/////////////////////////////////P/z/////////////////////////////////f/j///////////////////////////////////n///////////////////////////////////P////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////w//////////////////////////////////8B//////////////////////////////////8D+P////////////////////////////////8HwP////////////////////////////////8PAP//////fvj7//////////////////////8fAPj/////OAAAgP////////////////////8/AOD/////MAAAAP7///////////////////9/AADw//8fEAAAAOD/////////////////////AADA//9/CAAAAID/////////////////////AQCA////CQAAAAD+////////////////////AwAAcPjHDwAAAADw////////////////////BwAAAOIDDAAAAADg////////////////////DwAAAMABAAAAAACA////////////////////HwAAAAAAAAAAAAAA/v//////////////////PwAAAAAAAAAAAAAA+P//////////////////fwAAAAAAAAAAAAAA8P///////////////////wAAAAAAAAAAAAAAwP///////////////////wEAAAAAAAAAAAAAgP///////////////////wMAAAAAAAAAAAAAAP7//////////////////wcAAAAAAAAAAAAAAPz//////////////////w8AAAAAAAAAAAAAAPD//////////////////x8AAAAAAAAAAAAAAOD//////////////////z8AAAAAAAAAAAAAAID//////////////////38AAAAAAAAAAAAAAAD///////////////////8AAAAAAAAAAAAAAAD+//////////////////8BAAAAAAAAAAAAAAD8//////////////////8DAAAAAAAAAAAAAADw//////////////////8HAAAAAAAAAAAAAADg//////////////////8PAAAAAAAAAAAAAADA//////////////////8fAAAAAAAAAAAAAAAA//////////////////8/AAAAAAAAAAAAAAAA/v////////////////9/AAAAAAAAAAAAAAAA/P//////////////////AAAAAAAAAAAAAAAA8P//////////////////AQAAAAAAAAAAAAAA4P//////////////////AwAAAAAAAAAAAAAAgP//////////////////BwAAAAAAAAAAAAAAAP//////////////////DwAAAAAAAAAAAAAAAP7/////////////////HwAAAAAAAAAAAAAAAPj/////////////////PwAAAAAAAAAAAAAAAPD/////////////////fwAAAAAAAAAAAAAAAMD//////////////////wAAAAAAAAAAAAAAAID//////////////////wEAAAAAAAAAAAAAAAD+/////////////////wMAAAAAAAAAAAAAAAD8/////////////////wcAAAAAAAAAAAAAAADw/////////////////w8AAAAAAAAAAAAAAADA/////////////////x8AAAAAAAAAAAAAAACA/////////////////z8AAAAAAAAAAAAAAAAA/////////////////38AAAAAAAAAAAAAAAAA/P////////////////8AAAAAAAAAAAAAAAAA+P////////////////8BAAAAAAAAAAAAAAAA4P////////////////8DAAAAAAAAAAAAAAAAwP////////////////8HAAAAAAAAAAAAAAAAAP////////////////8PAAAAAAAAAAAAAAAAAPz///////////////8fAAAAAAAAAAAAAAAAAPj///////////////8/AAAAAAAAAAAAAAAAAPD///////////////9/AAAAAAAAAAAAAAAAAOD/////////////////AAAAAAAAAAAAAAAAAID/////////////////AQAAAAAAAAAAAAAAAAD/////////////////AwAAAAAAAAAAAAAAAAD8////////////////BwAAAAAAAAAAAAAAAADw////////////////DwAAAAAAAAAAAAAAAACA////////////////HwAAAAAAAAAAAAAAAAAA/v//////////////PwAAAAAAAAAAAQAAAAAA/P//////////////fwAAAAAAAAAwAwAAAAAA+P///////////////wAAAAAAAAD8fwAAAAAA8P///////////////wEAAAAAAAD8/wcAAAAA8P///////////////wMAAAAAAAD8/z8AAAAA4P///////////////wcAAAAAAAD4//8AAAAAwP///////////////w8AAAAAAAD4//8TAAAAgP///////////////x8AAAAAAADw////AQAAAP///////////////z8AAAAAAACg////AQAAAP7//////////////38AAAAAAAAA/P//AQAAAPz///////////////8AAAAAAAAAAP7/AwAAAPj///////////////8BAAAAAAAAAPz/BwAAAOD///////////////8DAAAAAAAAAPj/HwAAAOD///////////////8HAAAAAAAAACAA/gAAAMD///////////////8PAAAAAAAAAAAA4AMAAID///////////////8fAAAAAAAAAAAAABwAAID///////////////8/AAAAAAAAAAAAAPAAAID///////////////9/AAAAAAAAAAAAAAADAAD/////////////////AAAAAAAAAAAAAAAAAAD+////////////////AQAAAAAAAAAAAAAAAAD8////////////////AwAAAAAAAAAAAAAAAADw////////////////BwAAAAAAAAAAAAAAAADg////////////////DwAAAAAAAAAAAAAAAADA////////////////HwAAAAAAAAAAAAAAAAAA/v//////////////PwAAAAAAAAAAAAAAAAAA/P//////////////fwAAAAAAAAD4AQAAAAAA/P///////////////wAAAAAAAAD8/wgAAAAA+P///////////////wH8AAAAAAD+//8BAAAA+P///////////////4P/HwMAAAD///8PAAAA8P///////////////4f//w8AAAD+//9/AAAA4P///////////////8///x8AAAD+////AQAAwP///////////////5///z8AAAD+////BwAAAP7//////////////z////8AAAD+////HwAAAPj//////////////3////8BAID/////fwAAAuD////////////////+//8DAMD//////wEAP4D////////////////9//8HAPD//////w/A/wD+//////////////////8PAPj//////z/w/wP8//////////////////8/APz//////////x/8///////////////////////////////////8//////////////////////////////////////////////////////////////////////////////////////9/", IL = { la0: 27, lo0: 29, step: .06, nla: 167, nlo: 217 };
  var HQ = { lat: 32.886, lon: 35.103 };
  // הפרויקטים: רק מה שאושר (שאלון + אתר קיים). prec: exact = יישוב ידוע, region = אזור/מדינה בלבד
  var P = [
    { id: "il", g: "il", lat: 32.95, lon: 35.35, prec: "region", he: { n: "ישראל", d: "4 פרויקטים בגליל ובגולן", w: "קיווי בגליל העליון, בננות בגליל המערבי, תפוחים ברמת הגולן, דובדבנים" }, en: { n: "Israel", d: "4 projects in the Galilee and the Golan", w: "Kiwi in the Upper Galilee, bananas in the Western Galilee, apples in the Golan, cherries" } },
    { id: "baram", g: "il", lat: 33.063, lon: 35.432, prec: "exact", pos: "t", he: { n: "קיווי, הגליל העליון", d: "בית רשת עם הדליה בצורת סוכה", w: "הלקוח מוכן להמליץ עלינו" }, en: { n: "Kiwi, Upper Galilee", d: "Net house with a pergola trellis", w: "The client is willing to give a reference" }, sub: true },
    { id: "wg", g: "il", lat: 33.02, lon: 35.15, prec: "region", pos: "l", he: { n: "בננות, הגליל המערבי", d: "בית רשת עם רשת 11%", w: "רשת קלה ואוורירית: הגנה מרוח וברד, וחיסכון במים בקיץ" }, en: { n: "Bananas, Western Galilee", d: "Net house with an 11% net", w: "A light, airy net: protection from wind and hail, water saved in summer" }, sub: true },
    { id: "golan", g: "il", lat: 33.05, lon: 35.77, prec: "region", pos: "t", he: { n: "תפוחים, רמת הגולן", d: "רשת שמתקפלת בחורף", w: "נפרסת בקיץ ומתקפלת בחורף" }, en: { n: "Apples, Golan Heights", d: "Nets fold away in winter", w: "Spread in summer, folded in winter" }, sub: true },
    { id: "cherry", g: "il", lat: null, lon: null, prec: "none", he: { n: "דובדבנים", d: "בית רשת למטע", w: "מיקום עוד לא צוין" }, en: { n: "Cherries", d: "Orchard net house", w: "Location not given yet" }, sub: true },
    { id: "mx", g: "ab", lat: 23.6, lon: -102.5, m2: 150000, prec: "region", he: { n: "מקסיקו", d: "בתי רשת", w: "תכנון, הדרכת צוות מקומי וניהול ביצוע" }, en: { n: "Mexico", d: "Net houses", w: "Design, local crew training and site management" } },
    { id: "in", g: "ab", lat: 21.0, lon: 78.0, m2: 80000, prec: "region", he: { n: "הודו", d: "בתי רשת", w: "תכנון, הדרכת צוות מקומי וניהול ביצוע" }, en: { n: "India", d: "Net houses", w: "Design, local crew training and site management" } },
    { id: "hn", g: "ab", lat: 14.8, lon: -86.8, m2: 70000, prec: "region", he: { n: "הונדורס", d: "בתי רשת", w: "תכנון, הדרכת צוות מקומי וניהול ביצוע" }, en: { n: "Honduras", d: "Net houses", w: "Design, local crew training and site management" } },
    { id: "es", g: "ab", lat: 40.0, lon: -3.7, m2: 60000, prec: "region", pos: "b", he: { n: "ספרד", d: "בתי רשת", w: "תכנון, הדרכת צוות מקומי וניהול ביצוע" }, en: { n: "Spain", d: "Net houses", w: "Design, local crew training and site management" } },
    { id: "ge", g: "ab", lat: 42.2, lon: 43.5, m2: 50000, prec: "region", he: { n: "גאורגיה", d: "בתי רשת", w: "תכנון, הדרכת צוות מקומי וניהול ביצוע" }, en: { n: "Georgia", d: "Net houses", w: "Design, local crew training and site management" } },
    { id: "pt", g: "ab", lat: 39.4, lon: -8.2, prec: "region", he: { n: "פורטוגל", d: "בית רשת לאבוקדו", w: "הלקוח בפורטוגל מוכן להמליץ" }, en: { n: "Portugal", d: "Avocado net house", w: "The client in Portugal is willing to give a reference" } },
    { id: "by", g: "ab", lat: 53.7, lon: 27.9, prec: "region", he: { n: "בלארוס", d: "פרויקט מורכב", w: "ייצור מקומי וצוותים מקומיים, הסתיים בזמן" }, en: { n: "Belarus", d: "A complex project", w: "Local production and local crews, delivered on schedule" } }
  ];
  var T = {
    he: { dir: "rtl", lang: "en", langL: "English", eb: "מיפתח פרויקטים · חקלאות שיש לה בית", h1: "פרויקטים בשמונה מדינות.", lede: "מכפר מסריק לגליל, לגולן, ולשבע מדינות מעבר לים. בכל פרויקט בחו״ל אנחנו מתכננים, מדריכים צוות מקומי ומנהלים את הביצוע.",
      s1: "מ״ר של בתי רשת בחו״ל, ב-5 מדינות", s2: "מדינות, כולל ישראל", s3: "שנים בשטח", g1: "ישראל", g2: "מעבר לים", hint: location.hash === "#compact" ? (matchMedia("(pointer: coarse)").matches ? "גוררים לצדדים כדי לסובב · לוחצים על נקודה" : "גוררים כדי לסובב · Ctrl + גלגלת לזום · לוחצים על נקודה") : "גוררים כדי לסובב · גלגלת או צביטה לזום · לוחצים על נקודה",
      note: "השטחים נכונים ל-2015. נקודה צהובה: הפרויקט מסומן ברמת מדינה או אזור, לא במיקום המדויק. גובה קרן האור לפי השטח.",
      hq: "מיפתח · כפר מסריק", k: "פרויקט", size: "שטח", m2: "מ״ר", loc: "מיקום", exact: "יישוב מדויק", region: "מסומן ברמת מדינה או אזור", none: "לא צוין", from: "מכפר מסריק", km: "ק״מ", title: "מפת הפרויקטים של מיפתח",
      aria: "גלובוס אינטראקטיבי עם הפרויקטים של מיפתח בישראל ובעולם", fly: "▶ מהחלל אל בית הרשת", flyc: "הדמיית מעבר מהחלל, שמסתיימת בצילום רחפן אמיתי של בית רשת של מיפתח.", close: "סגירה", ill: "הדמיה", real: "צילום רחפן אמיתי" },
    en: { dir: "ltr", lang: "he", langL: "עברית", eb: "MIFTAH Projects · Where agriculture feels at home", h1: "Projects in eight countries.", lede: "From Kfar Masaryk to the Galilee, the Golan and seven countries abroad. On every project abroad we design, train a local crew and manage the build.",
      s1: "m² of net houses abroad, in 5 countries", s2: "countries, including Israel", s3: "years in the field", g1: "Israel", g2: "Abroad", hint: location.hash === "#compact" ? (matchMedia("(pointer: coarse)").matches ? "Drag sideways to rotate · tap a point" : "Drag to rotate · Ctrl + scroll to zoom · tap a point") : "Drag to rotate · scroll or pinch to zoom · tap a point",
      note: "Areas as of 2015. A yellow point marks the country or region, not the exact site. Beam height follows the area.",
      hq: "MIFTAH · Kfar Masaryk", k: "Project", size: "Area", m2: "m²", loc: "Location", exact: "Exact village", region: "Marked at country or region level", none: "Not given", from: "from Kfar Masaryk", km: "km", title: "MIFTAH Project Map",
      aria: "Interactive globe with MIFTAH projects in Israel and abroad", fly: "▶ From orbit to the net house", flyc: "An illustrated descent from orbit, ending on real drone footage of a MIFTAH net house.", close: "Close", ill: "Illustration", real: "Real drone footage" }
  };
  var L = "he", sel = "il";
  try { if (localStorage.getItem("miftah-globe-lang") === "en") L = "en"; } catch (e) {}
  var qs = /[?&]lang=(he|en)/.exec(location.search); if (qs) L = qs[1];
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  function vec(lat, lon, r) { var a = lat * Math.PI / 180, b = lon * Math.PI / 180; r = r || 1; return new THREE.Vector3(Math.cos(a) * Math.sin(b) * r, Math.sin(a) * r, Math.cos(a) * Math.cos(b) * r); }
  var gl = document.getElementById("globe"), cv = document.getElementById("cv");
  var renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  var scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(32, 1, .005, 100);
  // אור מצטבר: מוסיף צבע בלי לכסות את רקע החלל שמאחורי הקנבס
  function glow(m) { m.blending = THREE.CustomBlending; m.blendEquation = THREE.AddEquation; m.blendSrc = THREE.SrcAlphaFactor; m.blendDst = THREE.OneFactor; m.blendSrcAlpha = THREE.ZeroFactor; m.blendDstAlpha = THREE.OneFactor; m.transparent = true; m.depthWrite = false; return m; }
  var world = new THREE.Group(); scene.add(world);
  var dist = 3.9, distT = 3.9;

  // אוקיינוס: כדור כהה עם תאורה רכה וקצה זוהר
  var ocean = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 96), new THREE.ShaderMaterial({
    uniforms: {},
    vertexShader: "varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(normalMatrix * normal); vec4 w = modelViewMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * w; }",
    fragmentShader: "varying vec3 vN; varying vec3 vW; void main(){ vec3 v = normalize(-vW); float f = pow(1. - max(dot(vN, v), 0.), 2.4); float l = clamp(dot(vN, normalize(vec3(-.5,.6,.7))), 0., 1.); vec3 base = mix(vec3(.016,.075,.064), vec3(.05,.2,.17), l*.7); gl_FragColor = vec4(base + vec3(.32,.66,.5)*f*.55, 1.); }"
  }));
  world.add(ocean);

  // אטמוספרה: הילה מחוץ לכדור
  var atmo = new THREE.Mesh(new THREE.SphereGeometry(1.14, 64, 64), glow(new THREE.ShaderMaterial({
    side: THREE.BackSide, uniforms: { uG: { value: 1 } },
    vertexShader: "varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(normalMatrix * normal); vec4 w = modelViewMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * w; }",
    fragmentShader: "uniform float uG; varying vec3 vN; varying vec3 vW; void main(){ vec3 v = normalize(-vW); float e = dot(-vN, v); float a = pow(smoothstep(0., .48, e), 2.2) * (1. - .8 * smoothstep(.48, .8, e)); gl_FragColor = vec4(vec3(.5,.86,.66), a * .55 * uG); }"
  })));
  scene.add(atmo);

  // יבשות: 11,196 נקודות אור מנתונים גאוגרפיים אמיתיים
  var bin = atob(LAND), pos = [], ga = Math.PI * (3 - Math.sqrt(5));
  for (var i = 0; i < N; i++) {
    if (!(bin.charCodeAt(i >> 3) & (1 << (i & 7)))) continue;
    var y = 1 - 2 * (i + .5) / N, r = Math.sqrt(1 - y * y), th = ga * i;
    var la = Math.asin(y), lo = Math.atan2(Math.sin(th) * r, Math.cos(th) * r), R = 1.003;
    pos.push(Math.cos(la) * Math.sin(lo) * R, Math.sin(la) * R, Math.cos(la) * Math.cos(lo) * R);
  }
  var lg = new THREE.BufferGeometry(); lg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  var landMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uSize: { value: 2.2 * renderer.getPixelRatio() }, uScale: { value: 1 }, uA: { value: 1 } },
    vertexShader: "uniform float uSize; uniform float uScale; varying float vF; void main(){ vec4 w = modelViewMatrix * vec4(position,1.); vec3 n = normalize(normalMatrix * position); vF = dot(n, normalize(-w.xyz)); gl_PointSize = uSize * uScale; gl_Position = projectionMatrix * w; }",
    fragmentShader: "uniform float uA; varying float vF; void main(){ vec2 c = gl_PointCoord - .5; float d = length(c); if (d > .5) discard; float a = smoothstep(.5, .15, d) * smoothstep(-.05, .35, vF); gl_FragColor = vec4(mix(vec3(.36,.7,.53), vec3(.78,.96,.86), smoothstep(.3,1.,vF)), a * .95 * uA); }"
  });
  world.add(new THREE.Points(lg, landMat));

  // שכבת הפירוט: נקודות קטנות וצפופות, נמוגות מהמרכז החוצה
  var ib = atob(ILB), ip = [], ie = [];
  for (var a2 = 0; a2 < IL.nla; a2++) for (var b2 = 0; b2 < IL.nlo; b2++) {
    var k3 = a2 * IL.nlo + b2; if (!(ib.charCodeAt(k3 >> 3) & (1 << (k3 & 7)))) continue;
    var la3 = IL.la0 + (a2 + .5) * IL.step, lo3 = IL.lo0 + (b2 + .5) * IL.step, v3 = vec(la3, lo3, 1.0015);
    ip.push(v3.x, v3.y, v3.z); ie.push(1 - Math.min(1, Math.max(0, (Math.hypot(la3 - 33, (lo3 - 35.4) * .84) - 1.6) / 2.6)));
  }
  var ig = new THREE.BufferGeometry(); ig.setAttribute("position", new THREE.Float32BufferAttribute(ip, 3)); ig.setAttribute("e", new THREE.Float32BufferAttribute(ie, 1));
  var ilMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uSize: { value: 2 }, uA: { value: 0 } },
    vertexShader: "attribute float e; uniform float uSize; varying float vE; void main(){ vE = e; vec4 w = modelViewMatrix * vec4(position,1.); gl_PointSize = uSize; gl_Position = projectionMatrix * w; }",
    fragmentShader: "uniform float uA; varying float vE; void main(){ float d = length(gl_PointCoord - .5); if (d > .5) discard; gl_FragColor = vec4(mix(vec3(.36,.7,.53), vec3(.82,.97,.88), vE), smoothstep(.5, .1, d) * (.25 + .75 * vE) * uA); }" });
  var ilPts = new THREE.Points(ig, ilMat); ilPts.visible = false; world.add(ilPts);

  // כוכבים
  var sp = [];
  for (var s = 0; s < 1400; s++) { var u = Math.random() * 2 - 1, t2 = Math.random() * 6.283, rr = 30 + Math.random() * 20, q = Math.sqrt(1 - u * u); sp.push(q * Math.cos(t2) * rr, u * rr, q * Math.sin(t2) * rr); }
  var sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xbfe9d2, size: .06, transparent: true, opacity: .55, depthWrite: false })));

  // טקסטורת זוהר רכה (לסיכות)
  function glowTex() { var c = document.createElement("canvas"); c.width = c.height = 128; var x = c.getContext("2d"), g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(.25, "rgba(255,255,255,.55)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); }
  var GT = glowTex();
  var COL = { exact: new THREE.Color(0x9EE6BC), region: new THREE.Color(0xF1D27A), hq: new THREE.Color(0xFFFFFF) };

  // סיכה: קרן אור לפי שטח, טבעת פועמת, זוהר וליבה
  var beamMat = function (col) {
    return glow(new THREE.ShaderMaterial({ uniforms: { uC: { value: col }, uA: { value: 1 } },
      vertexShader: "varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }",
      fragmentShader: "uniform vec3 uC; uniform float uA; varying vec2 vU; void main(){ float a = pow(1. - vU.y, 1.6) * .9 * uA; gl_FragColor = vec4(uC, a); }" }));
  };
  var M = {}, HITS = [];
  function marker(key, lat, lon, col, h, scale) {
    var n = vec(lat, lon), g = new THREE.Group();
    g.position.copy(n.clone().multiplyScalar(1.004));
    g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
    var beam = new THREE.Mesh(new THREE.CylinderGeometry(.0045 * scale, .0045 * scale, h, 10, 1, true), beamMat(col));
    beam.position.y = h / 2; g.add(beam);
    var ring = new THREE.Mesh(new THREE.RingGeometry(.016 * scale, .02 * scale, 48), glow(new THREE.MeshBasicMaterial({ color: col, opacity: .9, side: THREE.DoubleSide })));
    ring.rotation.x = -Math.PI / 2; g.add(ring);
    var halo = new THREE.Sprite(glow(new THREE.SpriteMaterial({ map: GT, color: col })));
    halo.scale.set(.09 * scale, .09 * scale, 1); halo.position.y = .002; g.add(halo);
    var core = new THREE.Mesh(new THREE.SphereGeometry(.0085 * scale, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    g.add(core);
    var hit = new THREE.Mesh(new THREE.SphereGeometry(.05 * scale, 8, 8), new THREE.MeshBasicMaterial({ visible: false }));
    hit.userData.id = key; g.add(hit); HITS.push(hit);
    world.add(g);
    M[key] = { g: g, n: n, ring: ring, beam: beam, glow: halo, core: core, phase: Math.random() };
    return M[key];
  }
  marker("hq", HQ.lat, HQ.lon, COL.hq, .06, .8);
  P.forEach(function (p) {
    if (p.lat == null) return;
    var col = p.prec === "exact" ? COL.exact : COL.region;
    var h = p.m2 ? .1 + Math.sqrt(p.m2 / 150000) * .32 : .12;
    var m = marker(p.id, p.lat, p.lon, col, p.sub ? .045 : h, p.sub ? .55 : 1);
    m.sub = !!p.sub; m.p = p;
  });

  // קשתות מכפר מסריק עם אור שזורם
  var ARCS = [], hqv = vec(HQ.lat, HQ.lon);
  P.forEach(function (p, idx) {
    if (p.g !== "ab" || p.lat == null) return;
    var b = vec(p.lat, p.lon), ang = hqv.angleTo(b);
    // קשת על מעגל גדול: תמיד מעל פני הכדור, גם ליעדים רחוקים כמו מקסיקו
    var ax = new THREE.Vector3().crossVectors(hqv, b).normalize(), hgt = .035 + ang * .075, cp = [];
    for (var q = 0; q <= 64; q++) { var f = q / 64; cp.push(hqv.clone().applyAxisAngle(ax, ang * f).multiplyScalar(1.004 + hgt * Math.sin(Math.PI * f))); }
    var curve = new THREE.CatmullRomCurve3(cp);
    var mat = glow(new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 }, uOn: { value: 0 }, uOff: { value: idx * .17 }, uG: { value: 1 } },
      vertexShader: "varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }",
      fragmentShader: "uniform float uT; uniform float uOn; uniform float uOff; uniform float uG; varying vec2 vU; void main(){ float x = vU.x; float head = fract(uT * .32 + uOff); float d = x - head; float trail = smoothstep(-.28, 0., d) * (1. - smoothstep(0., .02, d)); float base = .22 + .5 * uOn; vec3 c = mix(vec3(.5,.85,.66), vec3(.9,1.,.95), trail); gl_FragColor = vec4(c, clamp(base * smoothstep(0.,.04,x) * smoothstep(1.,.96,x) + trail * .95, 0., 1.) * uG); }" }));
    var tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 96, .0032, 6, false), mat);
    world.add(tube); ARCS.push({ id: p.id, mat: mat });
  });

  // מצלמה וגודל
  function size() {
    var b = gl.getBoundingClientRect();
    renderer.setSize(b.width, b.height, false);
    camera.aspect = b.width / Math.max(1, b.height); camera.updateProjectionMatrix();
    var fit = 1.42 / (Math.tan(camera.fov * Math.PI / 360) * Math.min(1, camera.aspect));
    BASE = Math.max(3.4, fit); if (!zoomed) distT = BASE;
    landMat.uniforms.uSize.value = 2.2 * renderer.getPixelRatio() * Math.min(1.25, Math.max(.7, b.height / 800));
  }
  var BASE = 3.9, zoomed = false;
  window.addEventListener("resize", size); if (window.ResizeObserver) new ResizeObserver(size).observe(gl);
  size(); dist = distT;

  // סיבוב: yaw/pitch עם אינרציה, מעבר רך ליעד
  var yaw = -35.1 * Math.PI / 180, pitch = 24 * Math.PI / 180, vY = 0, tgt = null, idle = 0;
  function wrap(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; }
  function lookAt(lat, lon, z) { tgt = { yaw: -lon * Math.PI / 180, pitch: Math.max(-1, Math.min(1.1, lat * Math.PI / 180)) }; if (z) { distT = z; zoomed = true; } else { distT = BASE; zoomed = false; } }

  // תגיות HTML
  var tags = document.getElementById("tags"), TG = {};
  function buildTags() {
    tags.innerHTML = "";
    P.forEach(function (p) { if (p.lat == null) return; var s = document.createElement("span"); s.className = "tag" + (p.sub ? " sub" : ""); s.textContent = p[L].n; s.dataset.pos = p.pos || "t"; tags.appendChild(s); TG[p.id] = s; });
    var h = document.createElement("span"); h.className = "tag hq"; h.textContent = T[L].hq; h.dataset.pos = "b"; tags.appendChild(h); TG.hq = h;
  }

  // גרירה, זום ולחיצה
  var drag = false, lx = 0, ly = 0, moved = 0, pts = {}, pinch0 = 0;
  gl.addEventListener("pointerdown", function (e) { pts[e.pointerId] = [e.clientX, e.clientY]; drag = true; moved = 0; lx = e.clientX; ly = e.clientY; vY = 0; tgt = null; gl.classList.add("drag"); gl.setPointerCapture(e.pointerId); var k = Object.keys(pts); if (k.length === 2) pinch0 = Math.hypot(pts[k[0]][0] - pts[k[1]][0], pts[k[0]][1] - pts[k[1]][1]); });
  gl.addEventListener("pointermove", function (e) {
    if (!pts[e.pointerId]) return; pts[e.pointerId] = [e.clientX, e.clientY];
    var k = Object.keys(pts);
    if (k.length === 2) { var d = Math.hypot(pts[k[0]][0] - pts[k[1]][0], pts[k[0]][1] - pts[k[1]][1]); if (pinch0) { distT = Math.max(1.06, Math.min(BASE * 1.15, distT * pinch0 / d)); zoomed = distT < BASE * .95; } pinch0 = d; moved += 10; return; }
    var dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
    var b = gl.getBoundingClientRect(), k2 = 2.2 / b.height * ((dist - 1) / (BASE - 1));
    yaw += dx * k2; vY = dx * k2 * .5; pitch = Math.max(-1.2, Math.min(1.2, pitch + dy * k2)); idle = 0;
  });
  function up(e) {
    var was = pts[e.pointerId]; delete pts[e.pointerId]; pinch0 = 0;
    if (!drag || !was) return; if (Object.keys(pts).length) return;
    drag = false; gl.classList.remove("drag");
    if (moved < 6) pick(e);
  }
  gl.addEventListener("pointerup", up); gl.addEventListener("pointercancel", function (e) { delete pts[e.pointerId]; drag = false; gl.classList.remove("drag"); });
  gl.addEventListener("wheel", function (e) { if (location.hash === "#compact" && !e.ctrlKey && !e.metaKey) return; e.preventDefault(); distT = Math.max(1.06, Math.min(BASE * 1.15, 1 + (distT - 1) * (1 + e.deltaY * .0015))); zoomed = distT < BASE * .95; idle = 0; }, { passive: false });
  var ray = new THREE.Raycaster(), mv = new THREE.Vector2();
  function pick(e) {
    var b = gl.getBoundingClientRect(); mv.x = (e.clientX - b.left) / b.width * 2 - 1; mv.y = -(e.clientY - b.top) / b.height * 2 + 1;
    ray.setFromCamera(mv, camera);
    var hits = ray.intersectObjects(HITS.filter(function (h) { return h.parent.visible; }), false);
    var front = hits.filter(function (h) { var m = M[h.object.userData.id]; return m && facing(m) > 0; });
    if (front.length && front[0].object.userData.id !== "hq") choose(front[0].object.userData.id);
  }
  var tmp = new THREE.Vector3(), camDir = new THREE.Vector3();
  function facing(m) { tmp.copy(m.n).applyQuaternion(world.quaternion); camDir.copy(camera.position).normalize(); return tmp.dot(camDir); }

  // לולאת ציור
  var t0 = performance.now(), proj = new THREE.Vector3();
  function frame(now) {
    var t = (now - t0) / 1000, dt = Math.min(.1, Math.max(0, (now - (frame.last || now)) / 1000)); frame.last = now;
    var ez = 1 - Math.pow(.93, dt * 60), ez2 = 1 - Math.pow(.92, dt * 60);
    if (tgt) { var dy = wrap(tgt.yaw - yaw), dp = tgt.pitch - pitch; yaw += dy * ez; pitch += dp * ez; if (Math.abs(dy) < .001 && Math.abs(dp) < .001) tgt = null; }
    else if (!drag) { yaw += vY; vY *= .94; idle++; if (!reduce && idle > 260 && !zoomed) yaw -= .0011; }
    dist += (distT - dist) * ez2;
    world.rotation.set(pitch, yaw, 0, "XYZ");
    camera.position.set(0, 0, dist); camera.lookAt(0, 0, 0);
    var zoomIn = dist < BASE * .62, zf = Math.max(0, Math.min(1, (1.9 - dist) / .7));
    var b = gl.getBoundingClientRect(), ms = Math.min(1, Math.max(.035, (dist - 1) / (BASE - 1) * 1.1));
    atmo.material.uniforms.uG.value = 1 - zf; landMat.uniforms.uA.value = 1 - .7 * zf;
    ilPts.visible = zf > 0; ilMat.uniforms.uA.value = zf; ilMat.uniforms.uSize.value = renderer.getPixelRatio() * (1.2 + 2.6 * zf);
    Object.keys(M).forEach(function (k) {
      var m = M[k];
      m.g.visible = m.sub ? zoomIn : (k === "il" ? !zoomIn : true); m.g.scale.setScalar(ms);
      var ph = reduce ? .5 : (t * .8 + m.phase) % 1;
      m.ring.scale.setScalar(1 + ph * 2.2); m.ring.material.opacity = (1 - ph) * .85;
      var on = sel === k || (k === "il" && P.some(function (p) { return p.sub && p.id === sel; }));
      m.core.scale.setScalar(on ? 1.5 : 1);
      if (m.beam.material.uniforms) m.beam.material.uniforms.uA.value = on ? 1.4 : .85;
      var tg = TG[k];
      if (tg) {
        var f = facing(m);
        m.g.getWorldPosition(proj); proj.project(camera);
        var x = (proj.x * .5 + .5) * b.width, y = (-proj.y * .5 + .5) * b.height;
        var vis = m.g.visible && f > .12 && (k !== "hq" || zoomIn) && x > 8 && x < b.width - 8 && y > 8 && y < b.height - 8;
        tg.style.opacity = vis ? (on ? 1 : .88) : 0;
        var ps = tg.dataset.pos, off = ps === "b" ? "translate(-50%,70%)" : ps === "l" ? "translate(calc(-100% - 14px),-50%)" : ps === "r" ? "translate(14px,-50%)" : "translate(-50%,-170%)";
        tg.style.transform = "translate(" + x + "px," + y + "px) " + off;
        tg.classList.toggle("sel", on);
      }
    });
    ARCS.forEach(function (a) { a.mat.uniforms.uT.value = reduce ? .7 : t; a.mat.uniforms.uG.value = 1 - zf; a.mat.uniforms.uOn.value += ((sel === a.id ? 1 : 0) - a.mat.uniforms.uOn.value) * .1; });
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  // רשימה וכרטיס
  function fmt(n) { return n.toLocaleString("en-US"); }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function km(p) { return Math.round(hqv.angleTo(vec(p.lat, p.lon)) * 6371 / 10) * 10; }
  function list() {
    ["il", "ab"].forEach(function (g) {
      var ul = document.getElementById(g === "il" ? "l-il" : "l-ab"); ul.innerHTML = "";
      P.forEach(function (p) {
        if (p.g !== g || p.id === "il") return;
        var li = document.createElement("li"), bt = document.createElement("button");
        bt.type = "button"; bt.className = "item"; bt.dataset.id = p.id; bt.setAttribute("aria-pressed", sel === p.id ? "true" : "false");
        bt.innerHTML = "<b>" + esc(p[L].n) + "</b><small>" + esc(p[L].d) + "</small>" + (p.m2 ? '<span class="v">' + fmt(p.m2) + " " + T[L].m2 + '</span><span class="bar"><i style="width:' + (p.m2 / 150000 * 100).toFixed(1) + '%"></i></span>' : "");
        bt.addEventListener("click", function () { choose(p.id); });
        li.appendChild(bt); ul.appendChild(li);
      });
    });
  }
  function card() {
    var p = P.filter(function (z) { return z.id === sel; })[0], t = T[L], c = document.getElementById("card");
    var precTxt = p.prec === "exact" ? t.exact : p.prec === "region" ? t.region : t.none;
    var rows = "";
    if (p.m2) rows += "<dt>" + t.size + '</dt><dd class="num">' + fmt(p.m2) + " " + t.m2 + "</dd>";
    rows += "<dt>" + t.loc + '</dt><dd><span class="prec ' + (p.prec === "exact" ? "exact" : "region") + '">' + precTxt + "</span></dd>";
    if (p.lat != null && p.g === "ab") rows += "<dt>" + t.from + '</dt><dd class="num">~' + fmt(km(p)) + " " + t.km + "</dd>";
    var fly = p.g === "il" && HAS_FLY ? '<button type="button" class="fly" id="flyb">' + t.fly + "</button>" : "";
    c.innerHTML = '<span class="k">' + t.k + "</span><h3>" + esc(p[L].n) + "</h3><p>" + esc(p[L].d) + ". " + esc(p[L].w) + ".</p><dl>" + rows + "</dl>" + fly;
    var fb = document.getElementById("flyb"); if (fb) fb.addEventListener("click", openFly);
  }
  function choose(id) {
    sel = id;
    var p = P.filter(function (z) { return z.id === id; })[0];
    if (p.g === "il") lookAt(32.98, 35.43, 1 + .085 / Math.max(.62, Math.min(1, camera.aspect)));
    else lookAt(p.lat, p.lon, null);
    document.querySelectorAll(".item").forEach(function (bt) { bt.setAttribute("aria-pressed", bt.dataset.id === id ? "true" : "false"); });
    card();
  }

  // סרטון "מהחלל אל בית הרשת"
  var HAS_FLY = !!document.getElementById("flybox");
  var flybox = document.getElementById("flybox"), flyv = document.getElementById("flyv");
  function openFly() { if (!flybox) return; flybox.hidden = false; try { flyv.currentTime = 0; var pr = flyv.play(); if (pr && pr.catch) pr.catch(function () {}); } catch (e) {} document.getElementById("flyx").focus(); }
  function closeFly() { if (!flybox) return; flybox.hidden = true; try { flyv.pause(); } catch (e) {} }
  function badge() { var bd = document.getElementById("flybadge"); if (!bd) return; var r = flyv.currentTime >= parseFloat(flyv.dataset.real || "99"); bd.textContent = r ? T[L].real : T[L].ill; bd.classList.toggle("real", r); }
  if (flybox) { flyv.addEventListener("timeupdate", badge); flyv.addEventListener("seeked", badge); badge(); document.getElementById("flyx").addEventListener("click", closeFly); flybox.addEventListener("click", function (e) { if (e.target === flybox) closeFly(); }); document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeFly(); }); }

  function setLang(l) {
    L = l; var t = T[L];
    try { localStorage.setItem("miftah-globe-lang", L); } catch (e) {}
    document.documentElement.lang = L; document.documentElement.dir = t.dir;
    document.getElementById("stage").setAttribute("dir", t.dir);
    document.title = t.title; gl.setAttribute("aria-label", t.aria);
    ["eb", "h1", "lede", "s1", "s2", "s3", "g1", "g2", "hint", "note"].forEach(function (k) { document.getElementById(k).textContent = t[k]; });
    var lb = document.getElementById("lang"); lb.textContent = t.langL; lb.lang = t.lang;
    var fc = document.getElementById("flycap"); if (fc) fc.textContent = t.flyc;
    var fx = document.getElementById("flyx"); if (fx) { fx.textContent = t.close; badge(); }
    buildTags(); list(); card();
  }
  document.getElementById("lang").addEventListener("click", function () { setLang(L === "he" ? "en" : "he"); });
  if (location.hash === "#compact") document.getElementById("stage").classList.add("compact");
  setLang(L);
  sel = "il"; card(); lookAt(30, 25, null); tgt = null; yaw = -25 * Math.PI / 180; pitch = 26 * Math.PI / 180;
  requestAnimationFrame(frame);
})();


(function () { var a = document.getElementById("home-link"); if (!a) return; function u() { a.href = document.documentElement.lang === "en" ? "../index.html" : "../he/index.html"; } u(); new MutationObserver(u).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] }); })();

document.documentElement.setAttribute("data-i18n", "1");
