import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { isAuthenticated, loadSession } from "../utils/auth";
import { loadStudent } from "../utils/student";
import { Button } from "./ui.jsx";
import "./Hero.css";

export const Hero = () => {
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
      <h1 className="hero-title">Know where every application stands.</h1>
      <p className="hero-lede">
        Find internships near you and keep every application in one place.
      </p>
      <div className="hero-actions">
        {signedIn ? (
          <>
            <Button as={Link} to="/internships">Browse internships</Button>
            <Button as={Link} to="/drag-drop" variant="ghost">Open your tracker</Button>
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
