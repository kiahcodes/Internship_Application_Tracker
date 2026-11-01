import { createClient } from "@supabase/supabase-js";
import { pool } from "./db.js";
import { USERNAME_RE, usernameError } from "./username.js";

/**
 * Verifies a Supabase Auth access token (issued after Google / GitHub sign-in)
 * and returns the identity behind it, or null if the token isn't valid.
 */
export async function identityFromToken(accessToken) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const { data, error } = await supabase.auth.getUser(accessToken);
  const u = data?.user;
  // Only trust an address the provider has verified; we match accounts by email.
  if (error || !u?.email || !u.email_confirmed_at) return null;
  const meta = u.user_metadata || {};
  return {
    email: u.email.toLowerCase(),
    name: String(meta.full_name || meta.name || meta.user_name || u.email.split("@")[0]).trim().slice(0, 100),
    handle: String(meta.user_name || meta.preferred_username || u.email.split("@")[0]),
  };
}

/** A free username close to what the provider gave us, e.g. "kiah" -> "kiah", "kiah2". */
export async function suggestUsername(handle) {
  let base = String(handle).toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_").slice(0, 26);
  if (base.length < 3) base = `${base}user`.slice(0, 26);
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? base : `${base}${i + 1}`;
    if (!USERNAME_RE.test(candidate) || usernameError(candidate)) continue;
    const [rows] = await pool.query("SELECT 1 FROM users WHERE lower(username) = ?", [candidate]);
    if (!rows.length) return candidate;
  }
  return `${base.slice(0, 18)}_${Date.now().toString(36)}`;
}
