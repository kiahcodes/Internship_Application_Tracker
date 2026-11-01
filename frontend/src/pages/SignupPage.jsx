import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthShell } from "../components/AuthShell";
import { Alert, Button, Field } from "../components/ui";
import { SocialButtons } from "../components/SocialButtons";
import { checkUsername, signup } from "../utils/auth";

export const SignupPage = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameNote, setUsernameNote] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState("student");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Ask the server whether the handle is free, once the user pauses typing.
  useEffect(() => {
    const u = username.trim().toLowerCase();
    if (!u) return undefined;
    let stale = false;
    const timer = setTimeout(async () => {
      try {
        const r = await checkUsername(u);
        if (!stale) setUsernameNote(r.available ? `@${u} is available` : r.reason);
      } catch {
        if (!stale) setUsernameNote("");
      }
    }, 400);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [username]);

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
      await signup({ name, username, email, password, role, inviteCode });
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Sign up">
      <SocialButtons />
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
          label="Username"
          id="signup-username"
          type="text"
          autoComplete="username"
          placeholder="e.g. kiah_dev"
          hint={(username && usernameNote) || "3-30 characters: lowercase letters, numbers, underscores. This will be your public handle."}
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
          maxLength={30}
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
