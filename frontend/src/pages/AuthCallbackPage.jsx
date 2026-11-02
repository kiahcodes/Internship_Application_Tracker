import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthShell } from "../components/AuthShell";
import { Alert, Button, Field } from "../components/ui";
import { checkUsername, oauthExchange } from "../utils/auth";
import { connectGithub, takeConnectorIntent } from "../utils/connectors";
import { supabase } from "../utils/supabase";

/** Where Google / GitHub / LinkedIn send the browser back to. New people pick a username here. */
export const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const [token, setToken] = useState(null);
  const [username, setUsername] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [backTo, setBackTo] = useState("/login");
  const started = useRef(false);

  const finish = () => {
    supabase.auth.signOut({ scope: "local" }); // our own session is what the app uses from here
    navigate("/", { replace: true });
  };

  useEffect(() => {
    if (started.current) return; // StrictMode runs effects twice in dev
    started.current = true;
    (async () => {
      let connector = null;
      try {
        const { data } = await supabase.auth.getSession();
        const accessToken = data.session?.access_token;
        if (!accessToken) throw new Error("Sign-in didn't complete. Please try again.");
        connector = takeConnectorIntent();
        if (connector?.provider === "github") {
          setBackTo("/profile");
          await connectGithub(accessToken);
          await supabase.auth.signOut({ scope: "local" });
          navigate("/profile?connected=github", { replace: true });
          return;
        }
        const result = await oauthExchange({ accessToken });
        if (result.needsUsername) {
          setToken(accessToken);
          setUsername(result.suggestedUsername);
        } else {
          finish();
        }
      } catch (err) {
        if (connector) await supabase.auth.signOut({ scope: "local" });
        setError(err.message);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const u = username.trim().toLowerCase();
    if (!token || !u) return undefined;
    let stale = false;
    const timer = setTimeout(async () => {
      try {
        const r = await checkUsername(u);
        if (!stale) setNote(r.available ? `@${u} is available` : r.reason);
      } catch {
        if (!stale) setNote("");
      }
    }, 400);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [username, token]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await oauthExchange({ accessToken: token, username });
      finish();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <AuthShell title={error ? (backTo === "/profile" ? "Connection failed" : "Sign-in failed") : "Signing you in…"}>
        <Alert>{error}</Alert>
        {error && <Button block onClick={() => navigate(backTo, { replace: true })}>
          {backTo === "/profile" ? "Back to profile" : "Back to sign in"}
        </Button>}
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a username">
      <form className="auth-fields" onSubmit={submit}>
        <Field
          label="Username"
          id="oauth-username"
          type="text"
          autoComplete="username"
          hint={(username && note) || "3-30 characters: lowercase letters, numbers, underscores. This will be your public handle."}
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
          maxLength={30}
          required
        />
        <Alert>{error}</Alert>
        <Button type="submit" block loading={busy}>Continue</Button>
      </form>
    </AuthShell>
  );
};
