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
};

// Lucid's own address, for example 'https://lucid.example.org/' (docs/setup.md "Launch switch"). Empty until it is
// known. Once set: the copy at OLD_HOME shows "Lucid moved" with a one-click move of the learner's progress, accounts
// and AI may run only at this address (js/core/home.js), and the deploy build fills in the canonical link.
export const NEW_HOME = '';
// The GitHub Pages copy that learners used before the move. Do not change it.
export const OLD_HOME = 'https://hanochgo7-gif.github.io/desktop-tutorial/lucid/';
