(function () {
  "use strict";
  var LAND = "AAAAAAAAAAAAAAAAAAAAAAAAIACEBIAQEBICQkBISAgJQyEhIISMhJAEEJJCFkpICggJISskJAUEhIAQEFJCAkJICAkIIS8kZIQEhYADEjRCBkjMAZkoIQNk7oAMgJEBMBACDsDQABkIIwdmZAAcgLEjM3BEjszEETgQY0dm5ogciJkDM2NihszMEZgVc0d25slMi7knM2tmpsXck5i3E8/m3k9My4tvc+tkNu2lt/vVN9vy3lt8y2tt86/vPuW9tvr3V97+2t/5+mtv8+/v/O21t//3V97+39752ytv/3+vvf29v/a2197+/19b+2tv73+vrZ3/v/P2997e/15Zu/9v5e+vvJ3/v7J2V97K3995O29v7+/vvJW/v/J2397K2197K29vZe2/vZW/v/J2/t7K2n17K29v5ez+vZW1u3ZW/t7K2P17K39n5eX8vZWR8/ZW/s7K2P17K29n7aT8nZWx8zJS/s7KyPk7KSfn5aXcnZWZc3dS7s7Ky5k7KTPn5KTcnZWdM3NS5s7Iybk5KTNn5LTcnJCdc3NaZs7Iabk7KTtn5rTcnZGXM3dSds7I6bk5IT/n5qTMnJmTc3NSds7I6Zk5IT9n5uTsnJGTc3NCfs7N6Zk5I7fn5uTsnJmTM3Nifs7M6bk5Ybfn5sT8nJmTc3NCbs/N6fk5MTfn5uT8nJvTc3NSbs/N6fk5Nzfn5qXcnJvTc3Nebs/N6bk5Nbfn5oTcnpvT83Nqbs7Nybk9N6fn5rTcnJvTc3NqTs7N6bk5N6fn5tScnJuTc3NqTs/Nqbk5Nyfn5tTcnpvTc3JuTs7P6Tk5N6fn5tTcnJtTc3JuTs7J6Tk5N6fn5tTcnJPTc3JuTs/Nqbk5N6fm5NTcnptTc3JuTs/Jqbk9N6fm5NTcnpNTc3NuTs3Jqbk9N6fm5NScnpNTc3JuTs3JqbkdN6Pm5NycmpNTc3JuRs/JqTkdN6fm5NyMmpNTczJuTs3JqTk1N6fmZNyMmptTMzpuTs3JuTk1N6dmZNycmpMTM2puTs3JuBk1J6dmZJycmpMzc2pOTs/IuBk9J6dm1NycmpMxM2pOTs3IOBk9J6dm1JycnNMxMmpOT82oOBk5p2Zm1JycmlFxMnJOT82oOBkxo2Zk1JycmFExMnJOzc2oOBk1o2JkxJyemFExMmJOzcmpOTkxo2JkxJyamlNxMmJOzcmJOTkxp2LkxJyakRNxcmpOzYmJGTUhp+LkxIyak5MzcmJOxcmJGTUhJ+Lk1JyaE5MzakJOxYiJOTUjJubk1JyKERMzakJOxMiJOTUjJufUhJyKERMzakJMxMmJORUjJnbUhJyKERNzak5MzskJORUjJmbUlJyIExNzakZOzsgJOREjJmbUlJick1NyakZOzIgJORkjpmbUhJyck1NyYkZMzYgJOTkjpmbEjJiakRMyckZMzagJGT0jp2TEjJiaERMyekZMzYgJETUjp2TkjJiaExNyekZOyegZMTUjJmT0jJia0RMiakZOyegZMTUjJmTUjJiSURNiakZMyKgZMTWjJ2TUjJiS0RNiakZMyKgZMSWjJ+TUjJiSURNiSkZPyKgZOSWjJsTUjJqSURNiSkZNyKg5MSWjJsSUjJ6SUXNiSkZNyKkZNSWjJsSUjJ6SUXNiSkZNiCk5NSWjJsSUjJqSU1NqSk5NiCk5PSWjpsSUjJqSU1JqSk5NiCk5NSWn5sSUnJoSU3JqSk5NiSk5NSWnptSUnJISU3JqSk5NiSk5BSWnpNSUnJISU3JqSk7NKSk5BSWm5JSUnJISU3IqSk7NKSk5JaWm5JSUnJJSU3IKSkxJKSk5JSWm5JSUnJpSUnIKSkxJKSkZJaWk5BSUmJpTUnJKSkzJKSkZNaWk5BSUmJJTUnJKSknJKSkxNaek5BSUmJJSUjJKSknJKSkxFaek5BSUmpJSUiIKSknJKSgxJaek5BSUkpJTUiJqSknJKSg1JaWkZBSUkpJTUmIKSknJKSglJaWkRJSUkpJTUmoKTknBKSglBaWkZBSUkoJTUGoqSkmJKSklBaek1BSUkoJTUEoKSknJKCklBaek1BSckgJTUkoKSkmpKCklBaeklBSckoJTUkoKSkmpKCklBaaklBSUktJRU0oKTEmpKSglBaamlBSUkkJRU0oKTEkpKSglBaemlFSQklJRU0oKTE0pKSAlpaamlBSYkkJTUEoKTEkpKSAlpYKklBSYklJSQEoKDQkpKSAlpYKClBSYklJSQGoKBUkpKTAlhaaC1BQYElJSQEoKBQkpKTAlpaSC1BQaElJSQEoKBQGpKTAkpKSC1BQKklJSYEpKBQGpKTAkpKSAlBQKAlJSYUhISQGpKTQkpaSAlBQKAlJTYUhISQEpKRQEpKaCkJAKAlJTcUhKTQUpqRQUpKbCkJCaAlJSaAhITQEhKRQUpKagEJCaAkJSaAhITQEhKRUEpKbwEJCaAkJSKAhITQEhITUFhKTQEJCaAkJSKAhITUEhIDUFhKTQEJCaAkJQKgoISWEhIDUEhKBQEJCaAkJQSgoISSEhIDUFhKBQEBCawkJAaggITSEhIDUFhKAUEBCaQkJAagoIRSEgIDSFhaCUEBCKQkJAagoIRSEgIDSFhYCUEBCKQkJAagoIQSkgIBSFhYCUFBCKQkJAaAoLQSkhIBSFhYCUFBCCQkJAKAoJASkhIBSFhIAUEBSCUkBAKAoLASkoIBSFhIAQFBKCUkJAKAoJASkoIASlhIAQFBICUkBAKAoJASGgIASlgIBQFBYCUlBACAoJASEgLASkgIBQFBYCQkBBCAoJASEpLASkgIBQFBICQkJBCEgBBSEoJASkpKIQFBICQkJYCEgBBaEoJASEhIIQEBIKQkJJCEhJBaGoJASEhIIQkBIKQkFJCAgJBSGgJBSEhKIQkBICwlFJCAgJBSGgJBSEgIIQkJIKQkFJKAgJBaEgJRSEoJIQkBIKQkFJKAgBBSEgJBWEgLJQEBIKQkFJKAgBZaEgJBWEgJJQEBKKQkBJKAgBZaEgJRSEgJJQEAIKQkBIKAgBZaEgJRSEgpJQFAKKQkFKKggBJaEgBBSEgJJQEAJKQkFKKggBJaEgBBSFgJJQEAJKQkEIKAgBJaEoBBSFgpRUEABKQkEIKAgBJaEgABSEghJUEABKQlEIKAgBJaEgABSEghJUEAJKQlEAKAgFBakgAJSkogJQEAIKQkEAKAgFBaggAJSkogJQEAIKQkEAKAhFBaggABSEggJQEAgKUEEAKEhFBaAgABSEggBQEIoKUEEAKEgFBaAgEBSAggBQEIoKQEEAKEgFBaAgEBWgggBQEIoKQEEgKkAFAaAgFBWgggBQkAoKQEEgKgAFAaAgFRWggkBUgAoCQEEgKgAFAaAgFBWAgkBUgAoCQEEoKkAFgaAAFBSAgkBUgAoCUEEoKgBFgagAFRSAglBUgAoCUQEqKgAFgagAFQWAglBUAIoCUQEoKAAFgagAFQSgAlBUAAoCUQEqKABFoagAFQSiIlBQAAoCUQEqKAAFoKgAFASiAlBQAIpCUQEqKEQFoKAAFASiYlRQAApAUREqKERFqKAAFISiIlRUCApAQQEoCERFoKgAFIGiAlRQiApAQREqCkRFqKgAFICiAlRQiApAUREoAEQFqKAQFICCIlRQiApAUREqAEUFqKAQFYCDIlRAiIpAUREoIgVFqKAQFYCiIlBAiIpQQTEoIgVFqIAQFIGCIlBEiIpQQTEoIAVFoIAQFIGiYlBACopQATEoAEVFoIAQFKGiYlBACopQATEoAAXFoIAQFKGCYlBADopAASEoAAXFoIAcFKECYlBACopAASEoAAXFoIAcFIECQlBACopBATEoQAXEoIAUFIECQlAADopBATkoAAXEoIAUFIECQlAACopBASkoQgXEoIgUFIECQlAACohBASkoQgWEoAAUFKMCUlAACohBASkoQgWEoAAUFKMCUlAECohBASkoQgWEoAAUEKMCUlAECghBASgoRAWkoAgUEKMCUlAECghRATggBAWkqAAUEKMCUFAECkhRASgiBAWkoAgUEIMCUFAICkhBASggBgWgoAAUEIICUEAICkhRATggBgWgoAAUkIICUEAICkhBASggBgWgoBAUkIICUEAICkBBASggBgWgoBAUgIICUEAICkBBASggBQWggBAUgIICUEAICkBBISgiBQWggBAUgIICUEQICkABISgABQWggBAUgIICUEAKCkABISgCBUWggBAUgIICUAQKCkABISgCBQWgiBQUgAJCUBQKCkABISgABQWgCBQUgAJCUAQKikARKSgABQSgCBQUgAJCUAAKCkARKCgARYSgKBQUgSJCUAAKCkARKCgABYSgCBQUgSJSUACKCEBRKCgABYSgABQUgSJQUACKCEFRKCgCRaSgABQVgKJQUACKCEEBKCgCRaCgABQRgKNQUASKSEEBKCoCRaGgABQRgCJQUASKSkEBKCIARaGgABQRgCJQVASKQkERKDIARaGgCBSVgiJQRASKQkEBKCIARaCgCBSFgiJQRACKQkERKCoBRaCICBSFgiJQRACKQBERKCoBRaDICBSFgiJQRACKQBERKAoBRaCIABSBIiJQVAKKQBERKAoFRaCIABSBIiJQFAKKQBERKAoFRKCIABSBIiJQFAKKQBERKAJFRKCoABSBIiJQFAqIQBEBKAJFRKAoBBSBIiJQBIqIQFEBKAJFRKAoFBGBIiJQBIqIQFEAKgJFRKAoFBGBIiJUBIqIQFEIKgJFRKAIFBGBogBUBIqIwFEoIgJFROgIFBGBogBUBIqIwBEoIgJFQagIFBGBohBUBIqIUBEoIgJFQagIFBGBIlBEBIqCUBEoIgJFAagIFBGhIlBEBIqCUBEoIgJFoagIFAGhIlBEBIqCUBEoAkJFoIgIFAWhIlAEBIoCUBEoAkJFoIgIFAWhIlAEBIpAEREoAkJFoAgIFAWhIlAEhIpAEREoCkJFoAgIFAEjIlAEhIpAERAoCkJEoAgIFIEiIlAEhIpAERAoAkJEoAgIFYEiIFAEhIpAERAoAkdEoAgIFYEiIFAEhIhAERAqAkVAoAgIFYEiIFAEjIhAERAqAkVAoAgIFYEiIFAEjohAERAqAkVAoAgIEYEiIFQEioBAERAqAkVAoAgYEYEiIFQEioBAERAiAkVAoAgYAYEiIFQEioBAETAiAkVAoAgUAYEiIEQEioBAETACAkVAqAgUAYEiIEQEioBAESACAkVAiAgUAYEiYEQEioBQESgCAkVAiAgUAYEiQAQEioAQESgCAkXACAgUAYEiQAQEioAQESgCAkXACAgUAQEiUAQEioAQECgCAkWACAgUACEiUAQECoARECgCAkSACAgUACEiUAQECgARECgAQkSgCAgUACMgUAAECAARECgAQkSgAAgUACIgUAAEiAARECgAQkCgAAgQACIgUACEiEABECAARECgAAgQAAIgUACEgEABECAABEKAAAgQAQIgQAAIgAABECAABECAAAgAAAIgQAAIgAABEAAABECAABgAAAIgAAAIgAABEAAABECAABAAAAIgAAAIhAABMAAABECAABAAAQIgAAAIhAABIAAABEAAABAAAQIgAAAIgAABIAAABEAAABAIAQJAAAAIhAAAIAACBAAAABAIAQJAAAAIgAAAIAAABIAAABAIAABAAAAIAAAAIBAAAIAAABAAAABAAAAAAAAAIBAAAIAAABAAAABAIAAAAAEAIAAAAIAAAAAAAQBAIAAAAAEAIAAAAIAAAAAAAgBAAAAAAAEAIAAAAIBAAAAAAgAAAAQAAIEAAAAAAIAAAAAAAgAAAAQAAAEAAAAAAIAAAAAAAgEAAAQAAAEAAAAEAIAACAAAAgAAAAgAAAEAAAAEAgAACAAAAgAAAAgAAAAAAAAEAAAAAAAAAgAAAAgEAAAAAAAEAAAAEAgAAgAAAAgAAAAAAAAEAAAAEAgAAAAAAAgAAAAgEAAAAAAAEAAAAAAgAAgAAAAgEAAAAAAAEAAAAEAgAAAAAAAgAAAAAAAAEAAAAEAgAAAAAAAgAAAAAAAAEAAAAEAAAAAAAAAgAAAAgAAAEAAAAEAAAAAAAAAgAAAAgAAAAAAAAEAAAAAAAQAgAAAAgAAAAAAAAEAAAAAAAQAAAAAAgAAAAAAAAMAAAAAAAQAAAAAAgAAAAAACAAAAAAAAAQAAAAAAAAAAAAACAAAAAAAAAQAAAAAAAAAAAAACAAAAAAAAAQAAAAQAAAAAEAACAAAAAAAAAAAAAAQAAAAAAAACAAAACAAAAAAAAAQAAAEAAAACAAAAAAAAAAAAAAAAAAAAAAACAAAACAAAAAAAIAAAAAAAAAACAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", N = 42000;
  // רשת נקודות צפופה לאזור ישראל (קווי חוף land-50m, כל 0.06°), מופיעה רק בזום
  var ILB = "/////////////wMAAAD4/////////////////////////////wMAAAD4/////////////////////////////wcAAADw/////////////////////////////w8AAADw/////////////////////////////w8AAADw/////////////////////////////w8AAADw/////////////////////////////w8AAADw/////////////////////////////x8AAADw/////////////////////////////x8AAADg/////////////////////////////x8AAADg/////////////////////////////z8AAADA/////////////////////////////38AAADA//////////////////////////////8AAACA//////////////////////////////8BHACA//////////////////////////////8DfgCA//////////////////////////////8H/gCA//////////////////////////////8H/wOA//////////////////////////////8D/wcA//////////////////////////////8D/5/5//////////////////////////////8D/j/+//////////////////////////////8D/n/8//////////////////////////////8D/v/w//////////////////////////////8D///h//////////////////////////////8H//+D//////////////////////////////8H//8P//////////////////////////////8H//8f/v////////////////////////////8H/v9//P////////////////////////////8H/v//+P////////////////////////////8P/P//8f////////////////////////////8P+P//x/////////////////////////////8f8P//j/////////////////////////////8f8P//H/////////////////////////////8f4P//P/7///////////////////////////8/4P////z///////////////////////////9/wP////H/////////////////////////////wP///+P/////////////////////////////wf///8//////////////////////////////w////x//////////////////////////////w////z/+////////////////////////////h//////8////////////////////////////h//////7////////////////////////////g//////v////////////////////////////B///////////////////////////////////B///////////////////////////////////D/7/////////////////////////////////P/z/////////////////////////////////f/j///////////////////////////////////n///////////////////////////////////P////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////w//////////////////////////////////8B//////////////////////////////////8D+P////////////////////////////////8HwP////////////////////////////////8PAP//////fvj7//////////////////////8fAPj/////OAAAgP////////////////////8/AOD/////MAAAAP7///////////////////9/AADw//8fEAAAAOD/////////////////////AADA//9/CAAAAID/////////////////////AQCA////CQAAAAD+////////////////////AwAAcPjHDwAAAADw////////////////////BwAAAOIDDAAAAADg////////////////////DwAAAMABAAAAAACA////////////////////HwAAAAAAAAAAAAAA/v//////////////////PwAAAAAAAAAAAAAA+P//////////////////fwAAAAAAAAAAAAAA8P///////////////////wAAAAAAAAAAAAAAwP///////////////////wEAAAAAAAAAAAAAgP///////////////////wMAAAAAAAAAAAAAAP7//////////////////wcAAAAAAAAAAAAAAPz//////////////////w8AAAAAAAAAAAAAAPD//////////////////x8AAAAAAAAAAAAAAOD//////////////////z8AAAAAAAAAAAAAAID//////////////////38AAAAAAAAAAAAAAAD///////////////////8AAAAAAAAAAAAAAAD+//////////////////8BAAAAAAAAAAAAAAD8//////////////////8DAAAAAAAAAAAAAADw//////////////////8HAAAAAAAAAAAAAADg//////////////////8PAAAAAAAAAAAAAADA//////////////////8fAAAAAAAAAAAAAAAA//////////////////8/AAAAAAAAAAAAAAAA/v////////////////9/AAAAAAAAAAAAAAAA/P//////////////////AAAAAAAAAAAAAAAA8P//////////////////AQAAAAAAAAAAAAAA4P//////////////////AwAAAAAAAAAAAAAAgP//////////////////BwAAAAAAAAAAAAAAAP//////////////////DwAAAAAAAAAAAAAAAP7/////////////////HwAAAAAAAAAAAAAAAPj/////////////////PwAAAAAAAAAAAAAAAPD/////////////////fwAAAAAAAAAAAAAAAMD//////////////////wAAAAAAAAAAAAAAAID//////////////////wEAAAAAAAAAAAAAAAD+/////////////////wMAAAAAAAAAAAAAAAD8/////////////////wcAAAAAAAAAAAAAAADw/////////////////w8AAAAAAAAAAAAAAADA/////////////////x8AAAAAAAAAAAAAAACA/////////////////z8AAAAAAAAAAAAAAAAA/////////////////38AAAAAAAAAAAAAAAAA/P////////////////8AAAAAAAAAAAAAAAAA+P////////////////8BAAAAAAAAAAAAAAAA4P////////////////8DAAAAAAAAAAAAAAAAwP////////////////8HAAAAAAAAAAAAAAAAAP////////////////8PAAAAAAAAAAAAAAAAAPz///////////////8fAAAAAAAAAAAAAAAAAPj///////////////8/AAAAAAAAAAAAAAAAAPD///////////////9/AAAAAAAAAAAAAAAAAOD/////////////////AAAAAAAAAAAAAAAAAID/////////////////AQAAAAAAAAAAAAAAAAD/////////////////AwAAAAAAAAAAAAAAAAD8////////////////BwAAAAAAAAAAAAAAAADw////////////////DwAAAAAAAAAAAAAAAACA////////////////HwAAAAAAAAAAAAAAAAAA/v//////////////PwAAAAAAAAAAAQAAAAAA/P//////////////fwAAAAAAAAAwAwAAAAAA+P///////////////wAAAAAAAAD8fwAAAAAA8P///////////////wEAAAAAAAD8/wcAAAAA8P///////////////wMAAAAAAAD8/z8AAAAA4P///////////////wcAAAAAAAD4//8AAAAAwP///////////////w8AAAAAAAD4//8TAAAAgP///////////////x8AAAAAAADw////AQAAAP///////////////z8AAAAAAACg////AQAAAP7//////////////38AAAAAAAAA/P//AQAAAPz///////////////8AAAAAAAAAAP7/AwAAAPj///////////////8BAAAAAAAAAPz/BwAAAOD///////////////8DAAAAAAAAAPj/HwAAAOD///////////////8HAAAAAAAAACAA/gAAAMD///////////////8PAAAAAAAAAAAA4AMAAID///////////////8fAAAAAAAAAAAAABwAAID///////////////8/AAAAAAAAAAAAAPAAAID///////////////9/AAAAAAAAAAAAAAADAAD/////////////////AAAAAAAAAAAAAAAAAAD+////////////////AQAAAAAAAAAAAAAAAAD8////////////////AwAAAAAAAAAAAAAAAADw////////////////BwAAAAAAAAAAAAAAAADg////////////////DwAAAAAAAAAAAAAAAADA////////////////HwAAAAAAAAAAAAAAAAAA/v//////////////PwAAAAAAAAAAAAAAAAAA/P//////////////fwAAAAAAAAD4AQAAAAAA/P///////////////wAAAAAAAAD8/wgAAAAA+P///////////////wH8AAAAAAD+//8BAAAA+P///////////////4P/HwMAAAD///8PAAAA8P///////////////4f//w8AAAD+//9/AAAA4P///////////////8///x8AAAD+////AQAAwP///////////////5///z8AAAD+////BwAAAP7//////////////z////8AAAD+////HwAAAPj//////////////3////8BAID/////fwAAAuD////////////////+//8DAMD//////wEAP4D////////////////9//8HAPD//////w/A/wD+//////////////////8PAPj//////z/w/wP8//////////////////8/APz//////////x/8///////////////////////////////////8//////////////////////////////////////////////////////////////////////////////////////9/", IL = { la0: 27, lo0: 29, step: .06, nla: 167, nlo: 217 };
  var HQ = { lat: 32.886, lon: 35.103 };
  // הפרויקטים: רק מה שאושר (שאלון + אתר קיים). prec: exact = יישוב ידוע, region = אזור/מדינה בלבד
  var P = [
    { id: "il", g: "il", lat: 32.95, lon: 35.35, prec: "region", he: { n: "ישראל", d: "פרויקטים נבחרים בישראל", w: "קיווי בגליל העליון, בננות בגליל המערבי, תפוחים ברמת הגולן, דובדבנים" }, en: { n: "Israel", d: "Selected projects in Israel", w: "Kiwi in the Upper Galilee, bananas in the Western Galilee, apples in the Golan, cherries" } },
    { id: "ug", g: "il", lat: 33.0, lon: 35.5, prec: "region", pos: "t", he: { n: "קיווי, הגליל העליון", d: "בית רשת עם הדליה בצורת סוכה", w: "הלקוח מוכן להמליץ עלינו" }, en: { n: "Kiwi, Upper Galilee", d: "Net house with a pergola trellis", w: "The client is willing to give a reference" }, sub: true },
    { id: "wg", g: "il", lat: 33.02, lon: 35.15, prec: "region", pos: "l", he: { n: "בננות, הגליל המערבי", d: "בית רשת עם רשת 11%", w: "רשת קלה ואוורירית: הגנה מרוח וברד, וחיסכון במים בקיץ" }, en: { n: "Bananas, Western Galilee", d: "Net house with an 11% net", w: "A light, airy net: protection from wind and hail, water saved in summer" }, sub: true },
    { id: "golan", g: "il", lat: 33.05, lon: 35.77, prec: "region", pos: "t", he: { n: "תפוחים, רמת הגולן", d: "רשת שמתקפלת בחורף", w: "נפרסת בקיץ ומתקפלת בחורף" }, en: { n: "Apples, Golan Heights", d: "Nets fold away in winter", w: "Spread in summer, folded in winter" }, sub: true },
    { id: "cherry", g: "il", lat: null, lon: null, prec: "none", he: { n: "דובדבנים", d: "בית רשת למטע", w: "מיקום עוד לא צוין" }, en: { n: "Cherries", d: "Orchard net house", w: "Location not given yet" }, sub: true },
    { id: "mx", g: "ab", lat: 23.6, lon: -102.5, m2: 0, prec: "region", he: { n: "מקסיקו", d: "בתי רשת", w: "תכנון, הדרכת צוות מקומי וניהול ביצוע" }, en: { n: "Mexico", d: "Net houses", w: "Design, local crew training and site management" } },
    { id: "in", g: "ab", lat: 21.0, lon: 78.0, m2: 0, prec: "region", he: { n: "הודו", d: "בתי רשת", w: "תכנון, הדרכת צוות מקומי וניהול ביצוע" }, en: { n: "India", d: "Net houses", w: "Design, local crew training and site management" } },
    { id: "hn", g: "ab", lat: 14.8, lon: -86.8, m2: 0, prec: "region", he: { n: "הונדורס", d: "בתי רשת", w: "תכנון, הדרכת צוות מקומי וניהול ביצוע" }, en: { n: "Honduras", d: "Net houses", w: "Design, local crew training and site management" } },
    { id: "es", g: "ab", lat: 40.0, lon: -3.7, m2: 0, prec: "region", pos: "b", he: { n: "ספרד", d: "בתי רשת", w: "תכנון, הדרכת צוות מקומי וניהול ביצוע" }, en: { n: "Spain", d: "Net houses", w: "Design, local crew training and site management" } },
    { id: "ge", g: "ab", lat: 42.2, lon: 43.5, m2: 0, prec: "region", he: { n: "גאורגיה", d: "בתי רשת", w: "תכנון, הדרכת צוות מקומי וניהול ביצוע" }, en: { n: "Georgia", d: "Net houses", w: "Design, local crew training and site management" } },
    { id: "pt", g: "ab", lat: 39.4, lon: -8.2, prec: "region", he: { n: "פורטוגל", d: "בית רשת לאבוקדו", w: "הלקוח בפורטוגל מוכן להמליץ" }, en: { n: "Portugal", d: "Avocado net house", w: "The client in Portugal is willing to give a reference" } },
    { id: "by", g: "ab", lat: 53.7, lon: 27.9, prec: "region", he: { n: "בלארוס", d: "פרויקט מורכב לגידול דגים", w: "ייצור מקומי והתקנה בשטח, הסתיים בזמן" }, en: { n: "Belarus", d: "A complex fish-farming project", w: "Local production and installation on site, delivered on schedule" } },
    { id: "gr", g: "ab", lat: 39.1, lon: 21.8, prec: "region", he: { n: "יוון", d: "פרויקט חקלאי", w: "" }, en: { n: "Greece", d: "Agricultural project", w: "" } },
    { id: "s0", g: "il", site: true, sub: true, lat: 32.997, lon: 35.22, prec: "exact", he: { n: "יחיעם", d: "פרויקט של מיפתח", w: "מועצה אזורית מטה אשר" }, en: { n: "Yehiam", d: "A MIFTAH project", w: "Mateh Asher Regional Council" } },
    { id: "s1", g: "il", site: true, sub: true, lat: 33.087, lon: 35.173, prec: "exact", he: { n: "חניתה", d: "פרויקט של מיפתח", w: "מועצה אזורית מטה אשר" }, en: { n: "Hanita", d: "A MIFTAH project", w: "Mateh Asher Regional Council" } },
    { id: "s2", g: "il", site: true, sub: true, lat: 33.063, lon: 35.157, prec: "exact", he: { n: "מצובה", d: "פרויקט של מיפתח", w: "מועצה אזורית מטה אשר" }, en: { n: "Metzuba", d: "A MIFTAH project", w: "Mateh Asher Regional Council" } },
    { id: "s3", g: "il", site: true, sub: true, lat: 33.039, lon: 35.111, prec: "exact", he: { n: "גשר הזיו", d: "פרויקט של מיפתח", w: "מועצה אזורית מטה אשר" }, en: { n: "Gesher HaZiv", d: "A MIFTAH project", w: "Mateh Asher Regional Council" } },
    { id: "s4", g: "il", site: true, sub: true, lat: 32.97, lon: 35.146, prec: "exact", he: { n: "בית העמק", d: "פרויקט של מיפתח", w: "מועצה אזורית מטה אשר" }, en: { n: "Beit HaEmek", d: "A MIFTAH project", w: "Mateh Asher Regional Council" } },
    { id: "s5", g: "il", site: true, sub: true, lat: 33.006, lon: 35.214, prec: "exact", he: { n: "געתון", d: "פרויקט של מיפתח", w: "מועצה אזורית מטה אשר" }, en: { n: "Ga'aton", d: "A MIFTAH project", w: "Mateh Asher Regional Council" } },
    { id: "s6", g: "il", site: true, sub: true, lat: 32.964, lon: 35.098, prec: "exact", he: { n: "לוחמי הגטאות", d: "פרויקט של מיפתח", w: "מועצה אזורית מטה אשר" }, en: { n: "Lohamei HaGeta'ot", d: "A MIFTAH project", w: "Mateh Asher Regional Council" } },
    { id: "s7", g: "il", site: true, sub: true, lat: 32.891, lon: 35.1, prec: "exact", he: { n: "כפר מסריק", d: "פרויקט של מיפתח", w: "מועצה אזורית מטה אשר" }, en: { n: "Kfar Masaryk", d: "A MIFTAH project", w: "Mateh Asher Regional Council" } },
    { id: "s8", g: "il", site: true, sub: true, lat: 33.08, lon: 35.21, prec: "exact", he: { n: "אדמית", d: "פרויקט של מיפתח", w: "מועצה אזורית מטה אשר" }, en: { n: "Adamit", d: "A MIFTAH project", w: "Mateh Asher Regional Council" } },
    { id: "s9", g: "il", site: true, sub: true, lat: 32.981, lon: 35.083, prec: "exact", he: { n: "שבי ציון", d: "פרויקט של מיפתח", w: "מועצה אזורית מטה אשר" }, en: { n: "Shavei Tzion", d: "A MIFTAH project", w: "Mateh Asher Regional Council" } },
    { id: "s10", g: "il", site: true, sub: true, lat: 32.978, lon: 35.1, prec: "exact", he: { n: "רגבה", d: "פרויקט של מיפתח", w: "מועצה אזורית מטה אשר" }, en: { n: "Regba", d: "A MIFTAH project", w: "Mateh Asher Regional Council" } },
    { id: "s11", g: "il", site: true, sub: true, lat: 33.029, lon: 35.109, prec: "exact", he: { n: "סער", d: "פרויקט של מיפתח", w: "מועצה אזורית מטה אשר" }, en: { n: "Sa'ar", d: "A MIFTAH project", w: "Mateh Asher Regional Council" } },
    { id: "s12", g: "il", site: true, sub: true, lat: 33.027, lon: 35.395, prec: "exact", he: { n: "סאסא", d: "פרויקט של מיפתח", w: "מועצה אזורית גליל עליון" }, en: { n: "Sasa", d: "A MIFTAH project", w: "Upper Galilee Regional Council" } },
    { id: "s13", g: "il", site: true, sub: true, lat: 33.059, lon: 35.434, prec: "exact", he: { n: "ברעם", d: "פרויקט של מיפתח", w: "מועצה אזורית גליל עליון" }, en: { n: "Bar'am", d: "A MIFTAH project", w: "Upper Galilee Regional Council" } },
    { id: "s14", g: "il", site: true, sub: true, lat: 33.082, lon: 35.284, prec: "exact", he: { n: "שומרה", d: "פרויקט של מיפתח", w: "מועצה אזורית מעלה יוסף" }, en: { n: "Shomera", d: "A MIFTAH project", w: "Ma'ale Yosef Regional Council" } },
    { id: "s15", g: "il", site: true, sub: true, lat: 33.074, lon: 35.294, prec: "exact", he: { n: "אבן מנחם", d: "פרויקט של מיפתח", w: "מועצה אזורית מעלה יוסף" }, en: { n: "Even Menachem", d: "A MIFTAH project", w: "Ma'ale Yosef Regional Council" } },
    { id: "s16", g: "il", site: true, sub: true, lat: 33.078, lon: 35.456, prec: "exact", he: { n: "ירון", d: "פרויקט של מיפתח", w: "מועצה אזורית גליל עליון" }, en: { n: "Yir'on", d: "A MIFTAH project", w: "Upper Galilee Regional Council" } },
    { id: "s17", g: "il", site: true, sub: true, lat: 33.196, lon: 35.545, prec: "exact", he: { n: "מנרה", d: "פרויקט של מיפתח", w: "מועצה אזורית גליל עליון" }, en: { n: "Manara", d: "A MIFTAH project", w: "Upper Galilee Regional Council" } },
    { id: "s18", g: "il", site: true, sub: true, lat: 33.039, lon: 35.468, prec: "exact", he: { n: "כרם בן זמרה", d: "פרויקט של מיפתח", w: "מועצה אזורית מרום הגליל" }, en: { n: "Kerem Ben Zimra", d: "A MIFTAH project", w: "Merom HaGalil Regional Council" } },
    { id: "s19", g: "il", site: true, sub: true, lat: 33.081, lon: 35.518, prec: "exact", he: { n: "דישון", d: "פרויקט של מיפתח", w: "מועצה אזורית מבואות החרמון" }, en: { n: "Dishon", d: "A MIFTAH project", w: "Mevo'ot HaHermon Regional Council" } },
    { id: "s20", g: "il", site: true, sub: true, lat: 33.164, lon: 35.659, prec: "exact", he: { n: "שמיר", d: "פרויקט של מיפתח", w: "מועצה אזורית גליל עליון" }, en: { n: "Shamir", d: "A MIFTAH project", w: "Upper Galilee Regional Council" } },
    { id: "s21", g: "il", site: true, sub: true, lat: 33.23, lon: 35.639, prec: "exact", he: { n: "דפנה", d: "פרויקט של מיפתח", w: "מועצה אזורית גליל עליון" }, en: { n: "Dafna", d: "A MIFTAH project", w: "Upper Galilee Regional Council" } },
    { id: "s22", g: "il", site: true, sub: true, lat: 33.24, lon: 35.653, prec: "exact", he: { n: "דן", d: "פרויקט של מיפתח", w: "מועצה אזורית גליל עליון" }, en: { n: "Dan", d: "A MIFTAH project", w: "Upper Galilee Regional Council" } },
    { id: "s23", g: "il", site: true, sub: true, lat: 33.28, lon: 35.578, prec: "exact", he: { n: "מטולה", d: "פרויקט של מיפתח", w: "מועצה מקומית מטולה" }, en: { n: "Metula", d: "A MIFTAH project", w: "Metula Local Council" } },
    { id: "s24", g: "il", site: true, sub: true, lat: 33.215, lon: 35.544, prec: "exact", he: { n: "מרגליות", d: "פרויקט של מיפתח", w: "מועצה אזורית מבואות החרמון" }, en: { n: "Margaliot", d: "A MIFTAH project", w: "Mevo'ot HaHermon Regional Council" } },
    { id: "s25", g: "il", site: true, sub: true, lat: 32.844, lon: 35.807, prec: "exact", he: { n: "רמת מגשימים", d: "פרויקט של מיפתח", w: "מועצה אזורית גולן" }, en: { n: "Ramat Magshimim", d: "A MIFTAH project", w: "Golan Regional Council" } },
    { id: "s26", g: "il", site: true, sub: true, lat: 33.085, lon: 35.759, prec: "exact", he: { n: "אורטל", d: "פרויקט של מיפתח", w: "מועצה אזורית גולן" }, en: { n: "Ortal", d: "A MIFTAH project", w: "Golan Regional Council" } },
    { id: "s27", g: "il", site: true, sub: true, lat: 33.044, lon: 35.839, prec: "exact", he: { n: "אלוני הבשן", d: "פרויקט של מיפתח", w: "מועצה אזורית גולן" }, en: { n: "Alonei HaBashan", d: "A MIFTAH project", w: "Golan Regional Council" } },
    { id: "s28", g: "il", site: true, sub: true, lat: 33.18, lon: 35.772, prec: "exact", he: { n: "אל-רום", d: "פרויקט של מיפתח", w: "מועצה אזורית גולן" }, en: { n: "El Rom", d: "A MIFTAH project", w: "Golan Regional Council" } },
    { id: "s29", g: "il", site: true, sub: true, lat: 32.779, lon: 35.701, prec: "exact", he: { n: "אפיק", d: "פרויקט של מיפתח", w: "מועצה אזורית גולן" }, en: { n: "Afik", d: "A MIFTAH project", w: "Golan Regional Council" } },
    { id: "s30", g: "il", site: true, sub: true, lat: 32.854, lon: 35.751, prec: "exact", he: { n: "נטור", d: "פרויקט של מיפתח", w: "מועצה אזורית גולן" }, en: { n: "Natur", d: "A MIFTAH project", w: "Golan Regional Council" } },
    { id: "s31", g: "il", site: true, sub: true, lat: 32.938, lon: 35.795, prec: "exact", he: { n: "יונתן", d: "פרויקט של מיפתח", w: "מועצה אזורית גולן" }, en: { n: "Yonatan", d: "A MIFTAH project", w: "Golan Regional Council" } },
    { id: "s32", g: "il", site: true, sub: true, lat: 32.825, lon: 35.767, prec: "exact", he: { n: "אבני איתן", d: "פרויקט של מיפתח", w: "מועצה אזורית גולן" }, en: { n: "Avnei Eitan", d: "A MIFTAH project", w: "Golan Regional Council" } },
    { id: "s33", g: "il", site: true, sub: true, lat: 32.89, lon: 35.685, prec: "exact", he: { n: "מעלה גמלא", d: "פרויקט של מיפתח", w: "מועצה אזורית גולן" }, en: { n: "Ma'ale Gamla", d: "A MIFTAH project", w: "Golan Regional Council" } },
    { id: "s34", g: "il", site: true, sub: true, lat: 33.132, lon: 35.777, prec: "exact", he: { n: "מרום גולן", d: "פרויקט של מיפתח", w: "מועצה אזורית גולן" }, en: { n: "Merom Golan", d: "A MIFTAH project", w: "Golan Regional Council" } },
    { id: "s35", g: "il", site: true, sub: true, lat: 33.096, lon: 35.796, prec: "exact", he: { n: "עין זיוון", d: "פרויקט של מיפתח", w: "מועצה אזורית גולן" }, en: { n: "Ein Zivan", d: "A MIFTAH project", w: "Golan Regional Council" } },
    { id: "s36", g: "il", site: true, sub: true, lat: 33.03, lon: 35.697, prec: "exact", he: { n: "קדמת צבי", d: "פרויקט של מיפתח", w: "מועצה אזורית גולן" }, en: { n: "Kidmat Tzvi", d: "A MIFTAH project", w: "Golan Regional Council" } },
    { id: "s37", g: "il", site: true, sub: true, lat: 32.981, lon: 35.809, prec: "exact", he: { n: "קשת", d: "פרויקט של מיפתח", w: "מועצה אזורית גולן" }, en: { n: "Keshet", d: "A MIFTAH project", w: "Golan Regional Council" } },
    { id: "s38", g: "il", site: true, sub: true, lat: 32.837, lon: 35.272, prec: "exact", he: { n: "יודפת", d: "פרויקט של מיפתח", w: "מועצה אזורית משגב" }, en: { n: "Yodfat", d: "A MIFTAH project", w: "Misgav Regional Council" } },
    { id: "s39", g: "il", site: true, sub: true, lat: 32.781, lon: 35.639, prec: "exact", he: { n: "עין גב", d: "פרויקט של מיפתח", w: "מועצה אזורית עמק הירדן" }, en: { n: "Ein Gev", d: "A MIFTAH project", w: "Emek HaYarden Regional Council" } },
    { id: "s40", g: "il", site: true, sub: true, lat: 32.681, lon: 35.578, prec: "exact", he: { n: "אפיקים", d: "פרויקט של מיפתח", w: "מועצה אזורית עמק הירדן" }, en: { n: "Afikim", d: "A MIFTAH project", w: "Emek HaYarden Regional Council" } },
    { id: "s41", g: "il", site: true, sub: true, lat: 32.658, lon: 35.581, prec: "exact", he: { n: "אשדות יעקב", d: "פרויקט של מיפתח", w: "מועצה אזורית עמק הירדן" }, en: { n: "Ashdot Ya'akov", d: "A MIFTAH project", w: "Emek HaYarden Regional Council" } },
    { id: "s42", g: "il", site: true, sub: true, lat: 32.688, lon: 35.573, prec: "exact", he: { n: "בית זרע", d: "פרויקט של מיפתח", w: "מועצה אזורית עמק הירדן" }, en: { n: "Beit Zera", d: "A MIFTAH project", w: "Emek HaYarden Regional Council" } },
    { id: "s43", g: "il", site: true, sub: true, lat: 32.847, lon: 35.523, prec: "exact", he: { n: "גינוסר", d: "פרויקט של מיפתח", w: "מועצה אזורית עמק הירדן" }, en: { n: "Ginosar", d: "A MIFTAH project", w: "Emek HaYarden Regional Council" } },
    { id: "s44", g: "il", site: true, sub: true, lat: 32.621, lon: 35.552, prec: "exact", he: { n: "גשר", d: "פרויקט של מיפתח", w: "מועצה אזורית עמק המעיינות" }, en: { n: "Gesher", d: "A MIFTAH project", w: "Emek HaMa'ayanot Regional Council" } },
    { id: "s45", g: "il", site: true, sub: true, lat: 32.705, lon: 35.618, prec: "exact", he: { n: "תל קציר", d: "פרויקט של מיפתח", w: "מועצה אזורית עמק הירדן" }, en: { n: "Tel Katzir", d: "A MIFTAH project", w: "Emek HaYarden Regional Council" } },
    { id: "s46", g: "il", site: true, sub: true, lat: 32.88, lon: 35.494, prec: "exact", he: { n: "חוקוק", d: "פרויקט של מיפתח", w: "מועצה אזורית עמק הירדן" }, en: { n: "Hukok", d: "A MIFTAH project", w: "Emek HaYarden Regional Council" } },
    { id: "s47", g: "il", site: true, sub: true, lat: 32.586, lon: 35.44, prec: "exact", he: { n: "מולדת", d: "פרויקט של מיפתח", w: "מועצה אזורית גלבוע" }, en: { n: "Moledet", d: "A MIFTAH project", w: "Gilboa Regional Council" } },
    { id: "s48", g: "il", site: true, sub: true, lat: 32.559, lon: 35.394, prec: "exact", he: { n: "עין חרוד", d: "פרויקט של מיפתח", w: "מועצה אזורית גלבוע" }, en: { n: "Ein Harod", d: "A MIFTAH project", w: "Gilboa Regional Council" } },
    { id: "s49", g: "il", site: true, sub: true, lat: 31.507, lon: 34.599, prec: "exact", he: { n: "גבים", d: "פרויקט של מיפתח", w: "מועצה אזורית שער הנגב" }, en: { n: "Gevim", d: "A MIFTAH project", w: "Sha'ar HaNegev Regional Council" } },
    { id: "s50", g: "il", site: true, sub: true, lat: 31.195, lon: 34.345, prec: "exact", he: { n: "דקל", d: "פרויקט של מיפתח", w: "מועצה אזורית אשכול" }, en: { n: "Dekel", d: "A MIFTAH project", w: "Eshkol Regional Council" } },
    { id: "s51", g: "il", site: true, sub: true, lat: 31.335, lon: 34.395, prec: "exact", he: { n: "נירים", d: "פרויקט של מיפתח", w: "מועצה אזורית אשכול" }, en: { n: "Nirim", d: "A MIFTAH project", w: "Eshkol Regional Council" } },
    { id: "s52", g: "il", site: true, sub: true, lat: 31.351, lon: 34.401, prec: "exact", he: { n: "עין השלושה", d: "פרויקט של מיפתח", w: "מועצה אזורית אשכול" }, en: { n: "Ein HaShlosha", d: "A MIFTAH project", w: "Eshkol Regional Council" } },
    { id: "s53", g: "il", site: true, sub: true, lat: 31.519, lon: 34.581, prec: "exact", he: { n: "ניר עם", d: "פרויקט של מיפתח", w: "מועצה אזורית שער הנגב" }, en: { n: "Nir Am", d: "A MIFTAH project", w: "Sha'ar HaNegev Regional Council" } },
    { id: "s54", g: "il", site: true, sub: true, lat: 31.884, lon: 34.857, prec: "exact", he: { n: "נען", d: "פרויקט של מיפתח", w: "מועצה אזורית גזר" }, en: { n: "Na'an", d: "A MIFTAH project", w: "Gezer Regional Council" } },
    { id: "s55", g: "il", site: true, sub: true, lat: 30.806, lon: 35.299, prec: "exact", he: { n: "עידן", d: "פרויקט של מיפתח", w: "מועצה אזורית הערבה התיכונה" }, en: { n: "Idan", d: "A MIFTAH project", w: "Central Arava Regional Council" } },
    { id: "s56", g: "il", site: true, sub: true, lat: 29.557, lon: 34.95, prec: "exact", he: { n: "אילת", d: "פרויקט של מיפתח", w: "אילת" }, en: { n: "Eilat", d: "A MIFTAH project", w: "Eilat" } },
    { id: "s57", g: "il", site: true, sub: true, lat: 29.896, lon: 35.06, prec: "exact", he: { n: "יטבתה", d: "פרויקט של מיפתח", w: "מועצה אזורית חבל אילות" }, en: { n: "Yotvata", d: "A MIFTAH project", w: "Hevel Eilot Regional Council" } },
    { id: "s58", g: "il", site: true, sub: true, lat: 32.493, lon: 35.551, prec: "exact", he: { n: "מעוז חיים", d: "פרויקט של מיפתח", w: "מועצה אזורית עמק המעיינות" }, en: { n: "Ma'oz Haim", d: "A MIFTAH project", w: "Emek HaMa'ayanot Regional Council" } },
    { id: "s59", g: "il", site: true, sub: true, lat: 32.503, lon: 35.457, prec: "exact", he: { n: "ניר דוד", d: "פרויקט של מיפתח", w: "מועצה אזורית עמק המעיינות" }, en: { n: "Nir David", d: "A MIFTAH project", w: "Emek HaMa'ayanot Regional Council" } },
    { id: "s60", g: "il", site: true, sub: true, lat: 30.91, lon: 34.431, prec: "exact", he: { n: "כמהין", d: "פרויקט של מיפתח", w: "מועצה אזורית רמת נגב (פתחת ניצנה)" }, en: { n: "Kmehin", d: "A MIFTAH project", w: "Ramat HaNegev Regional Council (Nitzana area)" } },
    { id: "s61", g: "il", site: true, sub: true, lat: 30.885, lon: 34.422, prec: "exact", he: { n: "ניצנה", d: "פרויקט של מיפתח", w: "מועצה אזורית רמת נגב (פתחת ניצנה)" }, en: { n: "Nitzana", d: "A MIFTAH project", w: "Ramat HaNegev Regional Council (Nitzana area)" } },
    { id: "s62", g: "il", site: true, sub: true, lat: 31.653, lon: 34.706, prec: "exact", he: { n: "יד נתן", d: "פרויקט של מיפתח", w: "מועצה אזורית לכיש" }, en: { n: "Yad Natan", d: "A MIFTAH project", w: "Lakhish Regional Council" } },
    { id: "s63", g: "il", site: true, sub: true, lat: 32.793, lon: 35.121, prec: "exact", he: { n: "רמת יוחנן", d: "פרויקט של מיפתח", w: "מועצה אזורית זבולון" }, en: { n: "Ramat Yohanan", d: "A MIFTAH project", w: "Zevulun Regional Council" } },
    { id: "s64", g: "il", site: true, sub: true, lat: 32.791, lon: 35.115, prec: "exact", he: { n: "כפר המכבי", d: "פרויקט של מיפתח", w: "מועצה אזורית זבולון" }, en: { n: "Kfar HaMaccabi", d: "A MIFTAH project", w: "Zevulun Regional Council" } },
    { id: "s65", g: "il", site: true, sub: true, lat: 33.021, lon: 35.149, prec: "exact", he: { n: "כברי", d: "פרויקט של מיפתח", w: "מועצה אזורית מטה אשר" }, en: { n: "Kabri", d: "A MIFTAH project", w: "Mateh Asher Regional Council" } },
    { id: "s66", g: "il", site: true, sub: true, lat: 32.993, lon: 35.136, prec: "exact", he: { n: "נתיב השיירה", d: "פרויקט של מיפתח", w: "מועצה אזורית מטה אשר" }, en: { n: "Netiv HaShayara", d: "A MIFTAH project", w: "Mateh Asher Regional Council" } },
    { id: "s67", g: "il", site: true, sub: true, lat: 33.004, lon: 35.124, prec: "exact", he: { n: "בן עמי", d: "פרויקט של מיפתח", w: "מועצה אזורית מטה אשר" }, en: { n: "Ben Ami", d: "A MIFTAH project", w: "Mateh Asher Regional Council" } },
    { id: "s68", g: "il", site: true, sub: true, lat: 33.071, lon: 35.135, prec: "exact", he: { n: "בצת", d: "פרויקט של מיפתח", w: "מועצה אזורית מטה אשר" }, en: { n: "Betzet", d: "A MIFTAH project", w: "Mateh Asher Regional Council" } },
    { id: "s69", g: "il", site: true, sub: true, lat: 32.904, lon: 35.096, prec: "exact", he: { n: "עין המפרץ", d: "פרויקט של מיפתח", w: "מועצה אזורית מטה אשר" }, en: { n: "Ein HaMifratz", d: "A MIFTAH project", w: "Mateh Asher Regional Council" } },
    { id: "s70", g: "il", site: true, sub: true, lat: 32.95, lon: 35.097, prec: "exact", he: { n: "שמרת", d: "פרויקט של מיפתח", w: "מועצה אזורית מטה אשר" }, en: { n: "Shomrat", d: "A MIFTAH project", w: "Mateh Asher Regional Council" } },
    { id: "s71", g: "il", site: true, sub: true, lat: 32.992, lon: 35.693, prec: "exact", he: { n: "יקב רמת הגולן", d: "פרויקט של מיפתח", w: "מועצה מקומית קצרין" }, en: { n: "Golan Heights Winery", d: "A MIFTAH project", w: "Katzrin Local Council" } }
  ];
  var T = {
    he: { dir: "rtl", lang: "en", langL: "English", eb: "מיפתח פרויקטים - חקלאות שיש לה בית", h1: "פרויקטים בתשע מדינות.", lede: "ישראל ומדינות בעולם. בחו״ל אנחנו מתכננים את העבודה, מדריכים צוותים מקומיים ומנהלים את הביצוע.",
      s1: "מ״ר של בתי רשת בחו״ל, ב-5 מדינות", s2: "מדינות, כולל ישראל", s3: "שנים בשטח", g1: "ישראל", g3: "יישובים שעבדנו בהם", g2: "מעבר לים", hint: location.hash === "#compact" ? (matchMedia("(pointer: coarse)").matches ? "גוררים לצדדים כדי לסובב · לוחצים על נקודה" : "גוררים כדי לסובב · Ctrl + גלגלת לזום · לוחצים על נקודה") : "גוררים כדי לסובב · גלגלת או צביטה לזום · לוחצים על נקודה",
      note: "נקודה צהובה: הפרויקט מסומן ברמת מדינה או אזור, לא במיקום המדויק. צילומי לוויין: NASA Blue Marble; מעל ישראל Sentinel-2 cloudless 2016 של EOX (נתוני Copernicus, CC BY 4.0). העננים והכוכבים: הדמיה.",
      hq: "מיפתח · קיבוץ כפר מסריק", k: "פרויקט", size: "שטח", m2: "מ״ר", loc: "מיקום", exact: "יישוב מדויק", region: "מסומן ברמת מדינה או אזור", none: "לא צוין", from: "מכפר מסריק", km: "ק״מ", title: "מפת הפרויקטים של מיפתח",
      aria: "גלובוס אינטראקטיבי עם הפרויקטים של מיפתח בישראל ובעולם", fly: "▶ מהחלל אל בית הרשת", flyc: "מהחלל אל צילום רחפן אמיתי של בית רשת של מיפתח.", close: "סגירה", ill: "", real: "צילום רחפן אמיתי" },
    en: { dir: "ltr", lang: "he", langL: "עברית", eb: "MIFTAH Projects - Where agriculture feels at home", h1: "Projects in nine countries.", lede: "Israel and countries around the world. Abroad, we plan the work, train local crews and manage the build.",
      s1: "m² of net houses abroad, in 5 countries", s2: "countries, including Israel", s3: "years in the field", g1: "Israel", g3: "Places we have built", g2: "Abroad", hint: location.hash === "#compact" ? (matchMedia("(pointer: coarse)").matches ? "Drag sideways to rotate · tap a point" : "Drag to rotate · Ctrl + scroll to zoom · tap a point") : "Drag to rotate · scroll or pinch to zoom · tap a point",
      note: "A yellow point marks the country or region, not the exact site. Satellite imagery: NASA Blue Marble; over Israel, Sentinel-2 cloudless 2016 by EOX (Copernicus data, CC BY 4.0). Clouds and stars: illustration.",
      hq: "MIFTAH · Kibbutz Kfar Masaryk", k: "Project", size: "Area", m2: "m²", loc: "Location", exact: "Exact village", region: "Marked at country or region level", none: "Not given", from: "from Kfar Masaryk", km: "km", title: "MIFTAH Project Map",
      aria: "Interactive globe with MIFTAH projects in Israel and abroad", fly: "▶ From orbit to the net house", flyc: "From orbit to real drone footage of a MIFTAH net house.", close: "Close", ill: "", real: "Real drone footage" }
  };
  var L = /^he\b/i.test(navigator.language || "") ? "he" : "en", sel = "il";
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

  // כדור הארץ האמיתי (12 בנובמבר 2026): צילום לוויין של NASA (Blue Marble, יום ולילה), ברק שמש על המים, תבליט, ובישראל צילום Sentinel-2
  var TL = new THREE.TextureLoader(), BASEURL = "tex/";
  function tex(n, cb) { var t = TL.load(BASEURL + n, cb); t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); return t; }
  var LOADED = 0; function ld() { LOADED++; if (LOADED >= 6) document.documentElement.classList.add("earth-ready"); }
  var EU = { uDay: { value: tex("earth-day.jpg", ld) }, uNight: { value: tex("earth-night.jpg", ld) }, uWater: { value: tex("earth-water.jpg", ld) }, uTopo: { value: tex("earth-topo.jpg", ld) },
             uIL: { value: tex("israel.jpg", ld) }, uILb: { value: new THREE.Vector4(27.0, 36.5, 30.5, 40.5) }, uSun: { value: new THREE.Vector3(-.42, .38, .82).normalize() }, uZ: { value: 0 } };
  [EU.uDay.value, EU.uNight.value, EU.uWater.value, EU.uTopo.value].forEach(function (t) { t.wrapS = THREE.RepeatWrapping; });
  var ocean = new THREE.Mesh(new THREE.SphereGeometry(1, 192, 128), new THREE.ShaderMaterial({
    uniforms: EU,
    vertexShader: "varying vec3 vN; varying vec3 vW; varying vec2 vUv; varying vec3 vP; void main(){ vUv = uv; vP = position; vN = normalize(normalMatrix * normal); vec4 w = modelViewMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * w; }",
    fragmentShader: [
      "uniform sampler2D uDay; uniform sampler2D uNight; uniform sampler2D uWater; uniform sampler2D uTopo; uniform sampler2D uIL; uniform vec4 uILb; uniform vec3 uSun; uniform float uZ;",
      "varying vec3 vN; varying vec3 vW; varying vec2 vUv; varying vec3 vP;",
      "void main(){",
      "  vec2 uv = vec2(vUv.x + .25, vUv.y);",
      "  vec3 day = texture2D(uDay, uv).rgb;",
      "  float lat = degrees(asin(clamp(vP.y, -1., 1.))), lon = degrees(atan(vP.x, vP.z));",
      "  vec2 pu = vec2((lon - uILb.z) / (uILb.w - uILb.z), (lat - uILb.x) / (uILb.y - uILb.x));",
      "  if (pu.x > 0. && pu.x < 1. && pu.y > 0. && pu.y < 1.) { float e = smoothstep(0., .22, min(pu.x, 1. - pu.x)) * smoothstep(0., .22, min(pu.y, 1. - pu.y)); float wt = texture2D(uWater, uv).r; vec3 s2 = texture2D(uIL, pu).rgb; day = mix(day, pow(s2, vec3(1.18)) * .9, e * mix(1., .25, wt)); }",
      "  float t0 = texture2D(uTopo, uv).r, tx = texture2D(uTopo, uv + vec2(1. / 2048., 0.)).r, ty = texture2D(uTopo, uv + vec2(0., 1. / 1024.)).r;",
      "  float relief = clamp(1. + (t0 - tx) * 5. - (t0 - ty) * 5., .7, 1.3);",
      "  float water = texture2D(uWater, uv).r;",
      "  vec3 n = normalize(vN), v = normalize(-vW), L = normalize(uSun);",
      "  float ndl = dot(n, L), dayAmt = smoothstep(-.12, .22, ndl);",
      "  vec3 col = day * (.05 + .96 * max(ndl, 0.)) * mix(relief, 1., water);",
      "  vec3 h = normalize(L + v); col += vec3(1., .95, .82) * pow(max(dot(n, h), 0.), 55.) * water * .55 * dayAmt;",
      "  col += texture2D(uNight, uv).rgb * vec3(1., .82, .55) * 1.5 * (1. - dayAmt) * (1. - water);",
      "  float f = pow(1. - max(dot(n, v), 0.), 2.6); col = mix(col, vec3(.42, .66, 1.), f * .55 * (.25 + .75 * dayAmt));",
      "  gl_FragColor = vec4(col, 1.);",
      "}"].join("\n")
  }));
  world.add(ocean);

  // עננים (נוצרו ב-Higgsfield): שכבה דקה שנעה לאט ונעלמת כשמתקרבים לישראל
  var cloudU = { uC: { value: tex("clouds.jpg", ld) }, uSun: EU.uSun, uA: { value: .85 } };
  cloudU.uC.value.wrapS = THREE.RepeatWrapping;
  var clouds = new THREE.Mesh(new THREE.SphereGeometry(1.008, 128, 96), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: cloudU,
    vertexShader: "varying vec3 vN; varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vN = normalize(normalMatrix * normal); vec4 w = modelViewMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * w; }",
    fragmentShader: "uniform sampler2D uC; uniform vec3 uSun; uniform float uA; varying vec3 vN; varying vec2 vUv; varying vec3 vW; void main(){ float c = texture2D(uC, vec2(vUv.x + .25, vUv.y)).r; float ndl = dot(normalize(vN), normalize(uSun)); float lit = .08 + .95 * max(ndl, 0.); float rim = smoothstep(0., .25, dot(normalize(vN), normalize(-vW))); gl_FragColor = vec4(vec3(lit), c * uA * rim); }"
  }));
  world.add(clouds);

  // אטמוספרה: הילה מחוץ לכדור
  var atmo = new THREE.Mesh(new THREE.SphereGeometry(1.14, 64, 64), glow(new THREE.ShaderMaterial({
    side: THREE.BackSide, uniforms: { uG: { value: 1 } },
    vertexShader: "varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(normalMatrix * normal); vec4 w = modelViewMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * w; }",
    fragmentShader: "uniform float uG; varying vec3 vN; varying vec3 vW; void main(){ vec3 v = normalize(-vW); float e = dot(-vN, v); float a = pow(smoothstep(0., .48, e), 2.2) * (1. - .8 * smoothstep(.48, .8, e)); gl_FragColor = vec4(vec3(.38,.62,1.), a * .36 * uG); }"
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
  // (the dot continents stay built for the build script, but the real map replaces them)

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
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: .045, transparent: true, opacity: .35, depthWrite: false })));

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
    halo.scale.set(.09 * scale * (scale < 1 ? .55 : 1), .09 * scale * (scale < 1 ? .55 : 1), 1); halo.position.y = .002; g.add(halo);
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
    ilPts.visible = false; EU.uZ.value = zf; cloudU.uA.value = .85 * (1. - .92 * zf); if (!reduce) clouds.rotation.y += dt * .004; ilMat.uniforms.uA.value = zf; ilMat.uniforms.uSize.value = renderer.getPixelRatio() * (1.2 + 2.6 * zf);
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
        var vis = m.g.visible && (!m.p || !m.p.site || on) && f > .12 && (k !== "hq" || zoomIn) && x > 8 && x < b.width - 8 && y > 8 && y < b.height - 8;
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
        if (p.g !== g || p.id === "il" || p.site) return;
        var li = document.createElement("li"), bt = document.createElement("button");
        bt.type = "button"; bt.className = "item"; bt.dataset.id = p.id; bt.setAttribute("aria-pressed", sel === p.id ? "true" : "false");
        bt.innerHTML = "<b>" + esc(p[L].n) + "</b><small>" + esc(p[L].d) + "</small>" + (p.m2 ? '<span class="v">' + fmt(p.m2) + " " + T[L].m2 + '</span><span class="bar"><i style="width:' + (p.m2 / 150000 * 100).toFixed(1) + '%"></i></span>' : "");
        bt.addEventListener("click", function () { choose(p.id); });
        li.appendChild(bt); ul.appendChild(li);
      });
    });
    var us = document.getElementById("l-sites"); if (us) { us.innerHTML = ""; P.forEach(function (p) { if (!p.site) return; var li = document.createElement("li"), bt = document.createElement("button"); bt.type = "button"; bt.className = "item chip"; bt.dataset.id = p.id; bt.setAttribute("aria-pressed", sel === p.id ? "true" : "false"); bt.textContent = p[L].n; bt.addEventListener("click", function () { choose(p.id); }); li.appendChild(bt); us.appendChild(li); }); }
  }
  function card() {
    var p = P.filter(function (z) { return z.id === sel; })[0], t = T[L], c = document.getElementById("card");
    var precTxt = p.prec === "exact" ? t.exact : p.prec === "region" ? t.region : t.none;
    var rows = "";
    if (p.m2) rows += "<dt>" + t.size + '</dt><dd class="num">' + fmt(p.m2) + " " + t.m2 + "</dd>";
    rows += "<dt>" + t.loc + '</dt><dd><span class="prec ' + (p.prec === "exact" ? "exact" : "region") + '">' + precTxt + "</span></dd>";
    if (p.lat != null && p.g === "ab") rows += "<dt>" + t.from + '</dt><dd class="num">~' + fmt(km(p)) + " " + t.km + "</dd>";
    var fly = p.id === "il" && HAS_FLY ? '<button type="button" class="fly" id="flyb">' + t.fly + "</button>" : "";
    c.innerHTML = '<span class="k">' + t.k + "</span><h3>" + esc(p[L].n) + "</h3><p>" + esc(p[L].d) + (p[L].w ? ". " + esc(p[L].w) : "") + ".</p><dl>" + rows + "</dl>" + fly;
    var fb = document.getElementById("flyb"); if (fb) fb.addEventListener("click", openFly);
  }
  function choose(id) {
    sel = id;
    var p = P.filter(function (z) { return z.id === id; })[0];
    if (p.site) lookAt(p.lat, p.lon, 1 + .1 / Math.max(.62, Math.min(1, camera.aspect)));
    else if (p.g === "il") lookAt(32.98, 35.43, 1 + .085 / Math.max(.62, Math.min(1, camera.aspect)));
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
    ["eb", "h1", "lede", "s1", "s2", "s3", "g1", "g2", "g3", "hint", "note"].forEach(function (k) { var e = document.getElementById(k); if (e) e.textContent = t[k]; });
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

(function () { var a = document.getElementById("globe-cta"); if (!a) return; function u() { var en = document.documentElement.lang === "en"; a.href = en ? "../contact.html" : "../he/contact.html"; a.textContent = en ? "Discuss your project" : "דברו איתנו על הפרויקט"; var fb = document.getElementById("flybox"); if (fb) fb.setAttribute("aria-label", en ? "From orbit to the net house" : "מהחלל אל בית הרשת"); } u(); new MutationObserver(u).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] }); })();

(function () { var box = document.getElementById("flybox"); if (!box) return; box.addEventListener("keydown", function (e) { if (e.key !== "Tab") return; var f = [].slice.call(box.querySelectorAll("video[controls], button")).filter(function (x) { return x.offsetParent !== null; }); if (!f.length) return; var i = f.indexOf(document.activeElement); if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } }); new MutationObserver(function () { if (box.hidden) { var o = document.getElementById("flyb"); if (o) o.focus(); } }).observe(box, { attributes: true, attributeFilter: ["hidden"] }); })();
