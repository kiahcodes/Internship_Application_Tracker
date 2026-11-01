import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { AuthShell } from "../components/AuthShell";
import { Alert, Button, Field } from "../components/ui";
import { SocialButtons } from "../components/SocialButtons";
import { login } from "../utils/auth";

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login({ identifier, password });
      navigate(location.state?.from || "/", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Sign in">
      <SocialButtons />
      <form className="auth-fields" onSubmit={handleSignIn}>
        <Field
          label="Email or username"
          id="login-identifier"
          type="text"
          autoComplete="username"
          placeholder="you@example.com or your_username"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
        />
        <Field
          label="Password"
          id="login-password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {location.state?.notice && !error && <p className="auth-notice" role="status">{location.state.notice}</p>}
        <Alert>{error}</Alert>
        <Button type="submit" block loading={busy}>
          Sign in
        </Button>
        <p className="auth-alt">
          <Link to="/forgot-password">Forgot your password?</Link>
        </p>
      </form>

      <p className="auth-alt">
        Don&apos;t have an account? <Link to="/signup">Sign up</Link>
      </p>
    </AuthShell>
  );
};
