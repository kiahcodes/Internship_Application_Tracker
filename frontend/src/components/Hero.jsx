import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { isAuthenticated, loadSession } from "../utils/auth";
import { loadStudent } from "../utils/student";
import { Button } from "./ui.jsx";
import "./Hero.css";

const WORDS = ["application", "interview", "offer", "deadline"];
const reducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export const Hero = () => {
  const [wordIdx, setWordIdx] = useState(0);
  useEffect(() => {
    if (reducedMotion()) return;
    const id = setInterval(() => setWordIdx((i) => (i + 1) % WORDS.length), 2400);
    return () => clearInterval(id);
  }, []);

  const signedIn = isAuthenticated();
  const [name, setName] = useState(() => loadSession()?.name || "");
  const firstName = name.split(" ")[0];

  useEffect(() => {
    if (!signedIn) return;
    loadStudent()
      .then((student) => setName(student.name))
      .catch(() => {});
  }, [signedIn]);

  return (
    <section className="hero">
      {signedIn && (
        <p className="hero-welcome">
          {firstName ? `Welcome back, ${firstName}.` : "Welcome back."}
        </p>
      )}
      <h1 className="hero-title">
        Know where every{" "}
        <span key={WORDS[wordIdx]} className="hero-word">{WORDS[wordIdx]}</span>{" "}
        stands.
      </h1>
      <p className="hero-lede">
        Track which resume went to which company, and where every application stands.
      </p>
      <div className="hero-actions">
        {signedIn ? (
          <>
            <Button as={Link} to="/internships">Browse internships</Button>
            <Button as={Link} to="/tracker" variant="ghost">Open your tracker</Button>
          </>
        ) : (
          <>
            <Button as={Link} to="/signup">Create an account</Button>
            <Button as={Link} to="/login" variant="ghost">Sign in</Button>
          </>
        )}
      </div>
    </section>
  );
};
