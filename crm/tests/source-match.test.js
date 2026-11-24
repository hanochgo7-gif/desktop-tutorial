import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchSourceText } from '../js/core/source-match.js';

const sources = [
  ['google_ads', 'Google Ads'], ['meta_ads', 'Meta Ads (פייסבוק/אינסטגרם)'], ['organic', 'חיפוש אורגני בגוגל'],
  ['social', 'אינסטגרם / פייסבוק (אורגני, בלי מודעה)'], ['referral', 'הפניה מלקוח'], ['repeat', 'לקוח חוזר'],
  ['whatsapp', 'WhatsApp'], ['event', 'הרצאה / כנס / אירוע'], ['tiktok', 'TikTok'],
].map(([key, name]) => ({ key, name }));
const k = (t) => matchSourceText(t, sources)?.key ?? null;

test('paid and organic social are not swapped', () => {
  assert.equal(k('אינסטגרם ממומן'), 'meta_ads');
  assert.equal(k('מודעה בפייסבוק'), 'meta_ads');
  assert.equal(k('אינסטגרם'), 'social');
  assert.equal(k('Facebook'), 'social');
});
test('google: ads only when it says so, plain "google" stays unknown', () => {
  assert.equal(k('Google Ads'), 'google_ads');
  assert.equal(k('גוגל ממומן'), 'google_ads');
  assert.equal(k('גוגל אורגני'), 'organic');
  assert.equal(k('Google'), null);
});
test('recommendations are referrals, not repeat customers', () => {
  assert.equal(k('המלצה של לקוח'), 'referral');
  assert.equal(k('לקוח ממליץ'), 'referral');
  assert.equal(k('לקוח חוזר'), 'repeat');
});
test('other names, and sources the user added', () => {
  assert.equal(k('וואטסאפ'), 'whatsapp');
  assert.equal(k('כנס יזמות'), 'event');
  assert.equal(k('tiktok'), 'tiktok');
  assert.equal(k('משהו אחר לגמרי'), null);
});
