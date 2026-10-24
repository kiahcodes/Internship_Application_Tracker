import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../utils/api.js";
import { isAuthenticated } from "../utils/auth.js";
import { formatUploadDate, resumeApi, resumeUsage } from "../utils/resume.js";
import { Hero } from "../components/Hero.jsx";
import "./Home.css";

const PATHS = [
  {
    to: "/internships",
    title: "Opportunities",
    body: "Roles sorted by how close they are to you. Apply in one click and it lands on your board.",
    go: "Browse roles",
  },
  {
    to: "/tracker",
    title: "Tracker",
    body: "Drag each application from Applied to Interview to Offer, so nothing slips.",
    go: "Open tracker",
  },
  {
    to: "/profile",
    title: "Profile",
    body: "Keep your skills and details up to date so roles match you better.",
    go: "Edit profile",
  },
];

const SAMPLE = [
  { id: "v1", name: "Resume v1", detail: "General", sent: [{ to: "Lumen Health", stage: "Offer" }] },
  {
    id: "v2",
    name: "Resume v2",
    detail: "Backend",
    sent: [
      { to: "Acme Robotics", stage: "Applied" },
      { to: "Northwind Cloud", stage: "Interview" },
    ],
  },
  {
    id: "v3",
    name: "Resume v3",
    detail: "Data",
    sent: [
      { to: "Brightpath Analytics", stage: "Interview" },
      { to: "Tidewater Labs", stage: "Applied" },
      { to: "Orbit Pay", stage: "OA" },
    ],
  },
];

// Newest resumes first from the API; show the latest three, oldest of those at the back.
function realVersions({ cards, resumes }) {
  const total = resumes.length;
  return resumeUsage(resumes, cards)
    .versions.slice(0, 3)
    .map(({ resume, sent }, i) => ({
      id: `v${total - i}`,
      name: resume.fileName,
      detail: `Uploaded ${formatUploadDate(resume.uploadedAt)}`,
      sent: sent.map((c) => ({ to: c.company ?? c.title, stage: c.status })),
    }))
    .reverse();
}

function ResumeStack({ versions, live }) {
  const [picked, setPicked] = useState(null);
  const active = Math.min(picked ?? versions.length - 1, versions.length - 1);
  const tabRefs = useRef([]);

  const onKeyDown = (e) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const next = (active + step + versions.length) % versions.length;
    setPicked(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className="stack">
      <div className="stack-tabs" role="tablist" aria-label="Resume versions" onKeyDown={onKeyDown}>
        {versions.map((v, i) => (
          <button
            key={v.id}
            ref={(el) => (tabRefs.current[i] = el)}
            type="button"
            role="tab"
            id={`stack-tab-${v.id}`}
            aria-selected={active === i}
            aria-controls="stack-panel"
            tabIndex={active === i ? 0 : -1}
            className="stack-tab"
            onClick={() => setPicked(i)}
          >
            {v.id}
          </button>
        ))}
        <span className="stack-hint">
          {live ? "Your latest resumes" : "Example. Sign in to see yours."}
        </span>
      </div>
      <div
        className="stack-sheets"
        id="stack-panel"
        role="tabpanel"
        aria-labelledby={`stack-tab-${versions[active].id}`}
      >
        {versions.map((v, i) => {
          const depth = (i - active + versions.length) % versions.length;
          return (
            <article key={v.id} className="sheet" data-depth={depth} aria-hidden={depth !== 0}>
              <header className="sheet-head">
                <span className="sheet-name">{v.name}</span>
                <span className="sheet-focus">{v.detail}</span>
              </header>
              <div className="sheet-lines" aria-hidden="true">
                <i /><i /><i />
              </div>
              <p className="sheet-label">
                {v.sent.length
                  ? `Sent to ${v.sent.length} ${v.sent.length === 1 ? "company" : "companies"}`
                  : "Not sent anywhere yet"}
              </p>
              <ul className="sheet-sent">
                {v.sent.map((c, k) => (
                  <li key={`${c.to}-${k}`}>
                    <span>{c.to}</span>
                    <mark className={`sheet-stage sheet-${c.stage.toLowerCase()}`}>{c.stage}</mark>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </div>
  );
}

const STEPS = [
  { title: "Upload each version", body: "Save a resume for every role type. The latest becomes your current one." },
  { title: "Apply as usual", body: "Every application records the resume you sent, so there is nothing to note down." },
  { title: "See what works", body: "Check which version got interviews and offers, and which company received it." },
];

function Feature({ data }) {
  const live = !!data?.resumes.length;
  const versions = live ? realVersions(data) : SAMPLE;
  return (
    <section className="feature-wrap" aria-labelledby="feature-h">
      <div className="feature">
        <div className="feature-copy">
          <h2 id="feature-h">Know exactly which resume went to which company.</h2>
          <p>
            Every version you upload is saved, and every application remembers the one you sent.
            When an interview comes in, you can see which resume earned it.
          </p>
          <Link to="/documents" className="feature-go">Open resume tracking</Link>
        </div>
        <ResumeStack versions={versions} live={live} />
      </div>
      <ol className="steps">
        {STEPS.map((st, i) => (
          <li key={st.title}>
            <span className="step-n" aria-hidden="true">{i + 1}</span>
            <h3>{st.title}</h3>
            <p>{st.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

const STAGES = ["Applied", "Interview", "Offer"];

function CountUp({ to }) {
  const [n, setN] = useState(0);
  const instant =
    !to || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  useEffect(() => {
    if (instant) return;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min((now - start) / 700, 1);
      setN(Math.round(to * (1 - (1 - t) ** 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, instant]);
  return instant ? to : n;
}

function Dashboard({ data }) {
  if (!data?.cards.length) return null;
  const { cards } = data;
  return (
    <>
      <section className="stats" aria-label="Your pipeline">
        {STAGES.map((s) => (
          <div key={s} className="stat">
            <span className="stat-n">
              <CountUp to={cards.filter((c) => c.status === s).length} />
            </span>
            <span className="stat-l">{s}</span>
          </div>
        ))}
      </section>
    </>
  );
}

export function Home() {
  const signedIn = isAuthenticated();
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!signedIn) return;
    Promise.all([api("/tracker"), resumeApi.load()])
      .then(([cards, resumes]) => setData({ cards, resumes }))
      .catch(() => {});
  }, [signedIn]);
  return (
    <div className="home-page">
      <Hero />
      <Feature data={data} />
      {signedIn && <Dashboard data={data} />}
      <section className="paths" aria-label="Where to go next">
        <ul className="paths-list">
          {PATHS.map((p) => (
            <li key={p.to}>
              <Link to={p.to} className="path-row">
                <h2>{p.title}</h2>
                <p>{p.body}</p>
                <span className="path-go">{p.go}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
export default Home;
