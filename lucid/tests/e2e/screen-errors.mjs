// What the e2e suites count as a broken screen: the router's and the views' error screens anywhere in the view, and
// their not-found screens (an .empty block), in both languages. Shared by run.mjs, upgrade.mjs and perf-boot.mjs;
// tests/unit/e2e-screen-errors.test.mjs checks it against every such message in js/.
// Stems, so every inflection matches: 'לא נטע[ןנ]' covers 'לא נטען' (final nun: the router's own "המסך לא נטען")
// and 'לא נטענה' / 'לא נטענו' (the lists' and games' "did not load"). 'לא נמצא' only counts inside .empty: a
// scenario is called "ההזמנה שלכם לא נמצאת".
export const BROKEN = /did not load|לא נטע[ןנ]|Something went wrong|משהו השתבש|could not start/i;
export const NOT_FOUND = /לא נמצא|not found/i;
