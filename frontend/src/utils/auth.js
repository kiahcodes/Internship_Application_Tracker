import { useSyncExternalStore } from "react";

export const AUTH_STORAGE_KEY = "auth.session";
export const AUTH_CHANGED = "auth:changed";

// Tells mounted components (navbar, home) that the session changed, so they re-render
// without a page refresh. The "storage" event covers other tabs.
const announce = () => window.dispatchEvent(new Event(AUTH_CHANGED));


export function loadSession() {
  try {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export function getToken() {
  return loadSession()?.token ?? null;
}

function saveSession({ token, user }) {
  const session = { token, ...user };
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  announce();
  return session;
}

async function authRequest(path, body) {
  let res;
  try {
    res = await fetch(`/api/auth/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Can't reach the server right now. Please check your connection and try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return saveSession(data);
}

// `identifier` is an email or a username.
export const login = ({ identifier, password }) =>
  authRequest("login", { identifier, password });

export const signup = ({ name, username, email, password, role, inviteCode }) =>
  authRequest("signup", { name, username, email, password, role, inviteCode });

// Trades a Supabase access token (from a social sign-in) for our own session. For a brand-new
// account the first call answers { needsUsername, suggestedUsername }; call again with `username`.
export async function oauthExchange({ accessToken, username }) {
  let res;
  try {
    res = await fetch("/api/auth/oauth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken, username }),
    });
  } catch {
    throw new Error("Can't reach the server right now. Please check your connection and try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data.needsUsername ? data : saveSession(data);
}

export async function checkUsername(username) {
  const res = await fetch(`/api/auth/username-available?u=${encodeURIComponent(username)}`);
  return res.json();
}

// These two don't sign you in, so they skip authRequest's session saving.
async function plainRequest(path, body) {
  let res;
  try {
    res = await fetch(`/api/auth/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Can't reach the server right now. Please check your connection and try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong");
}

export const requestPasswordReset = (email) => plainRequest("forgot", { email });
export const resetPassword = ({ token, password }) => plainRequest("reset", { token, password });

export function setSessionName(name) {
  const session = loadSession();
  if (session) localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ ...session, name }));
  announce();
}

export function clearSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  announce();
}

export const logout = clearSession;

export function isAuthenticated() {
  return getToken() !== null;
}

export const getRole = () => loadSession()?.role ?? null;

export const hasPermission = (permission) =>
  loadSession()?.permissions?.includes(permission) ?? false;

function subscribe(callback) {
  window.addEventListener(AUTH_CHANGED, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(AUTH_CHANGED, callback);
    window.removeEventListener("storage", callback);
  };
}

// Re-renders the component whenever the user signs in or out.
export const useSignedIn = () => useSyncExternalStore(subscribe, isAuthenticated);

// The raw string is a stable snapshot; parse it once per change.
export function useSession() {
  const raw = useSyncExternalStore(subscribe, () => localStorage.getItem(AUTH_STORAGE_KEY));
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
