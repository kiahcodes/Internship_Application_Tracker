import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../utils/api";
import { useSession, useSignedIn } from "../utils/auth";
import { loadStudent } from "../utils/student";
import { Button } from "./ui.jsx";
import "./Hero.css";

const MOMENTS = ["application", "interview", "opportunity"];

export const Hero = () => {
  const signedIn = useSignedIn();
  const sessionName = useSession()?.name || "";
  const [name, setName] = useState(sessionName);
  const [students, setStudents] = useState(0);
  const [moment, setMoment] = useState(0);

  useEffect(() => setName(sessionName), [sessionName]);

  useEffect(() => {
    api("/stats")
      .then((result) => setStudents(result.students))
      .catch(() => {});
    if (signedIn)
      loadStudent()
        .then((student) => setName(student.name))
        .catch(() => {});
  }, [signedIn]);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(
      () => setMoment((current) => (current + 1) % MOMENTS.length),
      2400,
    );
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="hero">
      <div className="hero-copy">
        <div className="hero-proof">
          <b>{(students + 1000).toLocaleString("en-IN")}+</b>
          <span>
            users already
            <br />
            organizing their search
          </span>
        </div>
        {signedIn && (
          <p className="hero-welcome">
            Welcome back{name ? `, ${name.split(" ")[0]}` : ""}.
          </p>
        )}
        <h1>
          Make every{" "}
          <span key={MOMENTS[moment]} className="hero-moment">
            {MOMENTS[moment]}
          </span>{" "}
          count.
        </h1>
        <p className="hero-lede">
          Find it. Track it. Be ready for what comes next.
        </p>
        <div className="hero-actions">
          <Button as={Link} to={signedIn ? "/tracker" : "/signup"}>
            {signedIn ? "Continue tracking" : "Start tracking for free"}
          </Button>
          <a href="#prepare" className="hero-tour">
            See how it works
          </a>
        </div>
      </div>
      <div className="hero-board" aria-label="Example application pipeline">
        <div className="hero-board-head">
          <span>Application desk</span>
          <i>4 active</i>
        </div>
        <div className="hero-board-grid">
          <div>
            <b>
              Applied <i>2</i>
            </b>
            <span>
              <strong>Northstar Labs</strong>
              <small>Backend intern</small>
              <em>Resume v3</em>
            </span>
            <span>
              <strong>Orbit Analytics</strong>
              <small>Data science intern</small>
              <em>Applied today</em>
            </span>
          </div>
          <div>
            <b>
              Interview <i>1</i>
            </b>
            <span className="hero-card-focus">
              <strong>Lumen Health</strong>
              <small>Software intern</small>
              <em>Tomorrow · 2:00 PM</em>
            </span>
          </div>
          <div>
            <b>
              Offer <i>1</i>
            </b>
            <span>
              <strong>Acme Robotics</strong>
              <small>Platform intern</small>
              <em>Offer received</em>
            </span>
          </div>
        </div>
        <p className="hero-board-note">
          <span>Next up</span>
          <b>Prepare for Lumen Health</b>
          <small>Resume v2 · Interview notes ready</small>
        </p>
      </div>
    </section>
  );
};
