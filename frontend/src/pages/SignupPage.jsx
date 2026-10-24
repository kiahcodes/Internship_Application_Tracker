import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthShell } from "../components/AuthShell";
import { Alert, Button, Field } from "../components/ui";
import { signup } from "../utils/auth";

export const SignupPage = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState("student");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    setBusy(true);
    try {
      await signup({ name, email, password, role, inviteCode });
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Sign up">
      <form className="auth-fields" onSubmit={handleSignUp}>
        <Field
          label="Name"
          id="signup-name"
          type="text"
          autoComplete="name"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Field
          label="Email"
          id="signup-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Field
          label="Password"
          id="signup-password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Field
          label="Confirm password"
          id="signup-confirm"
          type="password"
          autoComplete="new-password"
          placeholder="Re-enter your password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
        <div className="field">
          <label className="field-label" htmlFor="signup-role">
            I am a
          </label>
          <select
            id="signup-role"
            className="field-input"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="student">Student (looking for internships)</option>
            <option value="poster">Job poster (posting internships)</option>
          </select>
        </div>
        {role === "poster" && (
          <Field
            label="Invite code"
            id="signup-invite"
            type="text"
            autoComplete="off"
            hint="Posting rights are limited to the placement cell. Ask them for the code."
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            required
          />
        )}
        <Alert>{error}</Alert>
        <Button type="submit" block loading={busy}>
          Sign up
        </Button>
      </form>

      <p className="auth-alt">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </AuthShell>
  );
};
