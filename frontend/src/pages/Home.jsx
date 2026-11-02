import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Hero } from "../components/Hero.jsx";
import { api } from "../utils/api.js";
import { isAuthenticated } from "../utils/auth.js";
import { resumeApi } from "../utils/resume.js";
import "./Home.css";

const STAGES = ["Applied", "OA", "Interview", "Offer"];

const Icon = ({ name }) => {
  const paths = {
    prep: (
      <>
        <path d="m4 5 8-3 8 3-8 3zM7 7v6c2.7 2 7.3 2 10 0V7" />
        <path d="M20 5v7" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
};

function PersonalBrief({ data }) {
  if (!data) return null;
  const cards = data.cards || [];
  const open = cards.filter(
    (card) => !["Offer", "Rejected"].includes(card.status),
  ).length;
  const interviews = cards.filter((card) => card.status === "Interview").length;
  const withoutResume = cards.filter((card) => !card.resume_id).length;
  return (
    <section className="home-brief" aria-labelledby="brief-title">
      <div className="brief-copy">
        <p className="brief-kicker">Your desk today</p>
        <h2 id="brief-title">
          You have {open} active {open === 1 ? "application" : "applications"}.
        </h2>
        <p>
          {interviews ? `${interviews} reached interview. ` : ""}
          {withoutResume
            ? `${withoutResume} still need a resume recorded.`
            : "Every application has a resume recorded."}
        </p>
      </div>
      <dl className="brief-numbers">
        {STAGES.map((stage) => (
          <div key={stage}>
            <dt>{stage}</dt>
            <dd>{cards.filter((card) => card.status === stage).length}</dd>
          </div>
        ))}
      </dl>
      <Link to="/tracker" className="brief-action">
        View application status
      </Link>
    </section>
  );
}

function ProfilePreview() {
  return (
    <div className="home-preview profile-preview" aria-hidden="true">
      <div className="preview-person">
        <span>KA</span>
        <div>
          <b>Your career profile</b>
          <small>Skills, education and links</small>
        </div>
      </div>
      <div className="preview-completion">
        <span>
          <i />
        </span>
        <b>82%</b>
      </div>
      <div className="preview-connectors">
        <span>
          <i>GH</i> GitHub <b>Connected</b>
        </span>
        <span>
          <i>LC</i> LeetCode <b>Connected</b>
        </span>
        <span>
          <i>OR</i> ORCID <em>Add</em>
        </span>
      </div>
    </div>
  );
}

function OpportunityPreview() {
  return (
    <div className="home-preview opportunity-preview" aria-hidden="true">
      <div className="preview-filter">
        <span>Recommended for you</span>
        <i>24 roles</i>
      </div>
      <article>
        <div className="company-mark">N</div>
        <div>
          <b>Software engineering intern</b>
          <span>Northstar Labs · Bengaluru</span>
          <p>
            <mark>92% match</mark>
            <mark>React</mark>
            <mark>Node.js</mark>
          </p>
        </div>
      </article>
      <article>
        <div className="company-mark">O</div>
        <div>
          <b>Data science intern</b>
          <span>Orbit Analytics · Remote</span>
          <p>
            <mark>84% match</mark>
            <mark>Python</mark>
          </p>
        </div>
      </article>
    </div>
  );
}

function BoardPreview() {
  return (
    <div className="home-preview board-preview" aria-hidden="true">
      {[
        { stage: "Applied", items: ["Northstar", "Orbit"] },
        { stage: "Interview", items: ["Lumen"] },
        { stage: "Offer", items: ["Acme"] },
      ].map((lane) => (
        <div className="mini-lane" key={lane.stage}>
          <b>
            {lane.stage}
            <i>{lane.items.length}</i>
          </b>
          {lane.items.map((item) => (
            <span key={item}>
              {item}
              <small>
                {lane.stage === "Interview"
                  ? "Tomorrow, 2 PM"
                  : "Software intern"}
              </small>
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

function DocumentsPreview() {
  return (
    <div className="home-preview documents-preview" aria-hidden="true">
      <div className="paper-sheet">
        <span className="paper-name">Kiah A.</span>
        <i />
        <i />
        <i />
        <b>Experience</b>
        <i />
        <i />
      </div>
      <div className="document-notes">
        <span>
          <Icon name="check" />
          <b>Resume v3</b>
          <small>Used for 6 applications</small>
        </span>
        <span>
          <Icon name="check" />
          <b>Built for backend roles</b>
          <small>Open directly in Overleaf</small>
        </span>
      </div>
    </div>
  );
}

function InsightPreview() {
  return (
    <div className="home-preview insight-preview" aria-hidden="true">
      <div className="mini-funnel">
        <span style={{ "--w": "100%" }}>
          Applied <b>28</b>
        </span>
        <span style={{ "--w": "68%" }}>
          OA <b>19</b>
        </span>
        <span style={{ "--w": "39%" }}>
          Interview <b>11</b>
        </span>
        <span style={{ "--w": "14%" }}>
          Offer <b>4</b>
        </span>
      </div>
      <p>
        <b>Backend resume performs best</b>
        <span>2.4× more interviews than your general resume</span>
      </p>
    </div>
  );
}

const FLOW = [
  {
    id: "track",
    title: "Track every application",
    body: "Move roles from Applied to Offer and keep deadlines, links and documents attached.",
    visual: <BoardPreview />,
    outcome: "Deadlines stay visible.",
    to: "/tracker",
    action: "Open the tracker",
  },
  {
    id: "prepare",
    title: "Build one useful profile",
    body: "Add your skills, education and public coding profiles once. Profile completion shows exactly what is missing.",
    visual: <ProfilePreview />,
    outcome: "A complete profile improves role matching.",
    to: "/profile",
    action: "Complete your profile",
  },
  {
    id: "discover",
    title: "Find roles that fit",
    body: "Browse internships with skill-match context, locations and direct application links—without maintaining another spreadsheet.",
    visual: <OpportunityPreview />,
    outcome: "Applying adds the role to your tracker.",
    to: "/internships",
    action: "Browse opportunities",
  },
  {
    id: "documents",
    title: "Know which resume you sent",
    body: "Keep resume versions, attach the right one to each application, or create a clean resume and continue editing it in Overleaf.",
    visual: <DocumentsPreview />,
    outcome: "No more guessing before an interview.",
    to: "/documents",
    action: "Manage resumes",
  },
  {
    id: "improve",
    title: "Learn from the outcomes",
    body: "Analytics turns your pipeline into useful signals: conversion by stage, application pace and which resume earns more interviews.",
    visual: <InsightPreview />,
    outcome: "Use evidence to improve the next application.",
    to: "/analytics",
    action: "See your analytics",
  },
];

function WorkflowItem({ item, index, signedIn }) {
  return (
    <article
      className={`workflow-item workflow-item--${index % 2 ? "reverse" : "forward"}`}
      id={item.id}
    >
      <div className="workflow-copy">
        <h3>{item.title}</h3>
        <p>{item.body}</p>
        <div className="workflow-actions">
          <p className="workflow-outcome">
            <Icon name="check" />
            {item.outcome}
          </p>
          {signedIn && (
            <Link to={item.to} className="workflow-link">
              {item.action}
            </Link>
          )}
        </div>
      </div>
      {item.visual}
    </article>
  );
}

function PrepBand({ signedIn }) {
  return (
    <section className="prep-band" aria-labelledby="prep-title">
      <div>
        <h2 id="prep-title">Prepare before the interview arrives.</h2>
        <p>
          Use focused notes and quizzes to revise common technical and interview
          topics. Your preparation lives beside the applications it supports.
        </p>
      </div>
      {signedIn && <Link to="/prep">Start preparing</Link>}
    </section>
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
    <main className="home-page">
      <Hero />
      {signedIn && <PersonalBrief data={data} />}
      <section className="workflow" aria-labelledby="workflow-title">
        <header className="workflow-head">
          <h2 id="workflow-title">Everything you need, working together.</h2>
        </header>
        <div className="workflow-grid">
          {FLOW.map((item, index) => (
            <WorkflowItem
              key={item.id}
              item={item}
              index={index}
              signedIn={signedIn}
            />
          ))}
        </div>
      </section>
      <PrepBand signedIn={signedIn} />
      {!signedIn && (
        <section className="home-final">
          <h2>Start with one application.</h2>
          <p>
            Your tracker, resumes, preparation and progress will stay connected
            from there.
          </p>
          <Link to="/signup">Create your free account</Link>
          <span>
            Already have one? <Link to="/login">Sign in</Link>
          </span>
        </section>
      )}
    </main>
  );
}
