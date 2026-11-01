import { createClient } from "@supabase/supabase-js";

// Only used for the Google / GitHub / LinkedIn redirect. Our own API session (utils/auth.js) is what the app uses.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || "http://localhost",
  import.meta.env.VITE_SUPABASE_ANON_KEY || "missing-anon-key",
);

export const socialLoginConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY,
);
