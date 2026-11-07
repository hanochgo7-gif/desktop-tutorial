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
