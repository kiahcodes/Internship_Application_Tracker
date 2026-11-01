// Usernames are public handles (later: /u/<username>), so they are lowercase, URL-safe and unique.
export const USERNAME_RE = /^[a-z0-9_]{3,30}$/;

// Would collide with app routes or look official.
const RESERVED = new Set([
  "admin", "administrator", "api", "app", "auth", "login", "logout", "signup", "register", "me", "u", "user",
  "users", "profile", "settings", "support", "help", "root", "system", "internship", "internships", "tracker",
  "prep", "analytics", "documents", "null", "undefined",
]);

export const normalizeUsername = (v) => String(v ?? "").trim().toLowerCase().replace(/^@/, "");

/** Returns an error message, or null when the (already normalized) username is acceptable. */
export function usernameError(username) {
  if (!USERNAME_RE.test(username))
    return "Username must be 3-30 characters: lowercase letters, numbers and underscores";
  if (RESERVED.has(username)) return "That username isn't available";
  return null;
}
