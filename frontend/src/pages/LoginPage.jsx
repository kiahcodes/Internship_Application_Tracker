import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { AuthShell } from "../components/AuthShell";
import { Alert, Button, Field } from "../components/ui";
import { login } from "../utils/auth";

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login({ email, password });
      navigate(location.state?.from || "/", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Sign in">
      <form className="auth-fields" onSubmit={handleSignIn}>
        <Field
          label="Email"
          id="login-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
