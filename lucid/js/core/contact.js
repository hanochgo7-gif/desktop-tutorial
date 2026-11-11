// The site operator's contact details: the one place the app reads them from (Help's "Contact" answer). The owner
// supplies them; until then every field stays empty and the app says the details will be published before the public
// launch. Nothing here is ever made up: no placeholder address, name or authority.
// privacy.html and accessibility.html run no script (their CSP), so they carry the same details as static text. When
// these fields are filled in, write the same name and email into both pages (Hebrew and English sections) in place of
// their "to be filled in" boxes; tests/unit/contact.test.mjs fails until the three agree.
export const CONTACT = {
  name_he: '', // the operator's name as it should read in Hebrew
  name_en: '', // the operator's name as it should read in English
  email: '', // one address for questions, privacy requests and accessibility problems
};

// True once there is an address a learner can write to.
export const hasContact = (c = CONTACT) => typeof c.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email);
// A mailto link with a subject, so the operator can tell Lucid mail apart.
export const mailtoOf = (c = CONTACT) => `mailto:${c.email}?subject=${encodeURIComponent('Lucid')}`;
