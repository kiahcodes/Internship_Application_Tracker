import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthShell } from "../components/AuthShell";
import { Alert, Button, Field } from "../components/ui";
import { resetPassword } from "../utils/auth";

export const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) return setError("Password must be at least 6 characters");
    if (password !== confirm) return setError("Passwords don't match");
    setBusy(true);
    try {
      await resetPassword({ token, password });
      navigate("/login", { replace: true, state: { notice: "Password changed. Sign in with your new password." } });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!token)
    return (
      <AuthShell title="Reset your password">
        <div className="auth-fields">
          <Alert>This link is missing its reset code.</Alert>
          <p className="auth-alt"><Link to="/forgot-password">Request a new link</Link></p>
        </div>
      </AuthShell>
    );

  return (
    <AuthShell title="Choose a new password">
      <form className="auth-fields" onSubmit={handleSubmit}>
        <Field
          label="New password"
          id="reset-password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Field
          label="Confirm new password"
          id="reset-confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
        <Alert>{error}</Alert>
        <Button type="submit" block loading={busy}>
          Change password
        </Button>
      </form>
      <p className="auth-alt">
        <Link to="/forgot-password">Link expired? Request a new one</Link>
      </p>
    </AuthShell>
  );
};
