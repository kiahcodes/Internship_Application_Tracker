import { useState } from "react";
import { Link } from "react-router-dom";
import { AuthShell } from "../components/AuthShell";
import { Alert, Button, Field } from "../components/ui";
import { requestPasswordReset } from "../utils/auth";

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Reset your password">
      {sent ? (
        <div className="auth-fields" role="status">
          <p>
            If <strong>{email}</strong> has an account, we've sent a link to choose a new password.
            It works once and expires in 30 minutes.
          </p>
          <p className="auth-alt">
            Nothing arrived? Check your spam folder, or <button type="button" className="link-btn" onClick={() => setSent(false)}>try again</button>.
          </p>
        </div>
      ) : (
        <form className="auth-fields" onSubmit={handleSubmit}>
          <p>Enter the email you signed up with and we'll send you a reset link.</p>
          <Field
            label="Email"
            id="forgot-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Alert>{error}</Alert>
          <Button type="submit" block loading={busy}>
            Send reset link
          </Button>
        </form>
      )}
      <p className="auth-alt">
        <Link to="/login">Back to sign in</Link>
      </p>
    </AuthShell>
  );
};
