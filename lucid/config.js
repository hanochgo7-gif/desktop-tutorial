// Public runtime configuration (safe to publish: the key is Supabase's publishable key and
// every table is protected by row-level security). Leave supabaseUrl empty to run Lucid in
// device-only mode: everything works except accounts, cross-device sync and AI features.
// Setup steps: docs/setup.md
export const CONFIG = {
  supabaseUrl: '',
  supabaseKey: '',
  // Set to true after deploying the lucid-ai edge function with an ANTHROPIC_API_KEY secret.
  aiEnabled: false,
  aiFunction: 'lucid-ai',
  // 'hidden': AI writing feedback shows located mistakes, hints and comments, but no category bands, no CEFR range
  // and no AI-based writing level, until the gold set meets the calibration gate (roadmap LB-08). 'shown' shows them.
  aiScoring: 'hidden',
  // CAPTCHA on sign-up, sign-in and password reset: 'turnstile' or 'hcaptcha' with the provider's site key. Empty
  // means off. Turning it on also needs the provider's hosts in the CSP (docs/setup.md, "CAPTCHA").
  captchaProvider: '',
  captchaSiteKey: '',
};

// Lucid's own address, for example 'https://lucid.example.org/' (docs/setup.md "Launch switch"). Empty until it is
// known. Once set: the copy at OLD_HOME shows "Lucid moved" with a one-click move of the learner's progress, accounts
// and AI may run only at this address (js/core/home.js), and the deploy build fills in the canonical link.
export const NEW_HOME = '';
// The GitHub Pages copy that learners used before the move. Do not change it.
export const OLD_HOME = 'https://hanochgo7-gif.github.io/desktop-tutorial/lucid/';
