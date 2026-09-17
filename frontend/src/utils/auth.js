export const AUTH_STORAGE_KEY = "auth.session";

export function loadSession() {
  try {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export function login({ name, email }) {
  const session = { name, email, loggedInAt: new Date().toISOString() };
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  return session;
}

export function logout() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function isAuthenticated() {
  return loadSession() !== null;
}
