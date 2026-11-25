// Supabase project of the procurement system. The publishable key is public by design: every table is protected by
// Row Level Security and every change goes through a server function that checks permissions.
// Empty url: the app shows a "not connected yet" screen instead of pretending to work.
export const CONFIG = {
  url: '',
  key: '',
  env: 'production',
};
