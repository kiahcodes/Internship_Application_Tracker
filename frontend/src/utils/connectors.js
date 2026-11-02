import { api } from "./api";
import { socialLoginConfigured, supabase } from "./supabase";

export { CONNECTORS, connectorHandle, connectorUrl } from "./connectorFormats.js";

const INTENT_KEY = "oauth.connector.intent";
const TEN_MINUTES = 10 * 60 * 1000;

export async function beginGithubConnect() {
  if (!socialLoginConfigured)
    throw new Error("GitHub connection isn't configured yet. Add the Supabase URL and anon key first.");
  sessionStorage.setItem(INTENT_KEY, JSON.stringify({ provider: "github", at: Date.now() }));
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });
  if (error) {
    sessionStorage.removeItem(INTENT_KEY);
    throw error;
  }
}

/** Read-once OAuth intent, so normal GitHub sign-in remains a sign-in. */
export function takeConnectorIntent() {
  try {
    const value = JSON.parse(sessionStorage.getItem(INTENT_KEY));
    sessionStorage.removeItem(INTENT_KEY);
    return value?.provider === "github" && Date.now() - value.at < TEN_MINUTES ? value : null;
  } catch {
    sessionStorage.removeItem(INTENT_KEY);
    return null;
  }
}

export const connectGithub = (accessToken) =>
  api("/connectors/github", { method: "POST", body: { accessToken } });
