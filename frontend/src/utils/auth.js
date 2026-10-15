export const AUTH_STORAGE_KEY = "auth.session";

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
    throw new Error("Can't reach the server. Is the backend running?");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return saveSession(data);
}

export const login = ({ email, password }) =>
  authRequest("login", { email, password });

export const signup = ({ name, email, password, role }) =>
  authRequest("signup", { name, email, password, role });

export function clearSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export const logout = clearSession;

export function isAuthenticated() {
  return getToken() !== null;
}

export const getRole = () => loadSession()?.role ?? null;

export const hasPermission = (permission) =>
  loadSession()?.permissions?.includes(permission) ?? false;
