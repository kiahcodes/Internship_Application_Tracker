import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Hero } from "../components/Hero.jsx";
import { api } from "../utils/api.js";
import { useSignedIn } from "../utils/auth.js";
import { resumeApi } from "../utils/resume.js";
import { completeness } from "../utils/profileCompleteness.js";
import { daysUntil, describeDeadline } from "../utils/internships.js";
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
  const cards = data?.cards;
  // Hold the band's space while loading so the page doesn't jump when it arrives.
  if (data === null) return <section className="home-brief home-brief--loading" aria-hidden="true" />;
  if (!cards) return null;
  const count = (stage) => cards.filter((c) => c.status === stage).length;
  const inPlay = count("Applied") + count("OA") + count("Interview");
  const noResume = cards.filter((c) => !c.resumeId && c.status !== "Rejected").length;
  const deadline = cards
    .filter((c) => c.status === "Applied" && c.deadline && daysUntil(c.deadline) >= 0)
    .sort((a, b) => daysUntil(a.deadline) - daysUntil(b.deadline))[0];

  let headline = "Your tracker is empty.";
  if (cards.length) {
    headline = `${inPlay} ${inPlay === 1 ? "application is" : "applications are"} in play.`;
    if (count("Offer")) headline += ` ${count("Offer")} ${count("Offer") === 1 ? "offer" : "offers"} to decide on.`;
    else if (count("Interview"))
      headline += ` ${count("Interview")} at interview stage.`;
  }
  // One next step, most time-sensitive first.
  let next = cards.length ? "" : "Add the first role you've applied to.";
  if (deadline) next = `${deadline.company ?? deadline.title}: ${describeDeadline(deadline.deadline).text.toLowerCase()}.`;
  else if (noResume) next = `${noResume} ${noResume === 1 ? "application has" : "applications have"} no resume recorded.`;

  const stages = [...STAGES, "Rejected"].map((stage) => ({ stage, n: count(stage) }));
  return (
    <section className="home-brief" aria-label="Your applications at a glance">
      <div className="brief-copy">
        <h2>{headline}</h2>
        {next && <p>{next}</p>}
        {!cards.length && (
          <Link to="/tracker" className="brief-action">
            Add an application
          </Link>
        )}
      </div>
      {cards.length > 0 && (
        <figure className="brief-pipeline">
          <div className="brief-bar" role="img" aria-label={stages.map((s) => `${s.stage} ${s.n}`).join(", ")}>
            {stages
              .filter((s) => s.n)
              .map((s) => (
                <span key={s.stage} className={`seg seg--${s.stage.toLowerCase()}`} style={{ flexGrow: s.n }} />
              ))}
          </div>
          <figcaption>
            {stages.map((s) => (
              <span key={s.stage} className={s.n ? "" : "is-zero"}>
                <i className={`dot seg--${s.stage.toLowerCase()}`} aria-hidden="true" />
                {s.stage} <b>{s.n}</b>
              </span>
            ))}
          </figcaption>
        </figure>
      )}
    </section>
  );
}

// Generic sample content shown to visitors. Signed-in users see their own data instead.
const DEMO = {
  lanes: [
    { stage: "Applied", items: [{ name: "Company A", note: "Software intern" }] },
    { stage: "Interview", items: [{ name: "Company B", note: "Upcoming" }] },
    { stage: "Offer", items: [{ name: "Company C", note: "Software intern" }] },
  ],
  profile: {
    initials: "AB",
    name: "Your career profile",
    sub: "Skills, education and links",
    percent: 80,
    links: [
      { key: "GH", label: "GitHub", on: true },
      { key: "LC", label: "LeetCode", on: true },
      { key: "OR", label: "ORCID", on: false },
    ],
  },
  roles: {
    total: "Recommended for you",
    items: [
      { company: "Company A", role: "Software engineering intern", place: "City · Hybrid", tags: ["Skills you have", "React"] },
      { company: "Company B", role: "Data science intern", place: "Remote", tags: ["Python"] },
    ],
  },
  resume: { name: "Resume v1", used: "Used for 3 applications", note: "Open directly in Overleaf" },
  funnel: [
    { stage: "Applied", count: 20 },
    { stage: "OA", count: 12 },
    { stage: "Interview", count: 6 },
    { stage: "Offer", count: 2 },
  ],
  insight: { title: "See which resume performs best", note: "Compare replies and interviews per version" },
};

const PROFILE_LINKS = [
  ["github", "GH", "GitHub"],
  ["leetcode", "LC", "LeetCode"],
  ["orcid", "OR", "ORCID"],
];

function ProfilePreview({ student }) {
  const p = student
    ? {
        initials: (student.name || "?").trim().charAt(0).toUpperCase(),
        name: student.name,
        sub: [student.course, student.branch].filter(Boolean).join(" · ") || "Skills, education and links",
        percent: completeness(student).percent,
        links: PROFILE_LINKS.map(([key, short, label]) => ({
          key: short,
          label,
          on: Boolean(student[key]),
        })),
      }
    : DEMO.profile;
  return (
    <div className="home-preview profile-preview" aria-hidden="true">
      <div className="preview-person">
        <span>{p.initials}</span>
        <div>
          <b>{p.name}</b>
          <small>{p.sub}</small>
        </div>
      </div>
      <div className="preview-completion">
        <span>
          <i style={{ width: `${p.percent}%` }} />
        </span>
        <b>{p.percent}%</b>
      </div>
      <div className="preview-connectors">
        {p.links.map((l) => (
          <span key={l.key}>
            <i>{l.key}</i> {l.label} {l.on ? <b>Connected</b> : <em>Add</em>}
          </span>
        ))}
      </div>
    </div>
  );
}

function OpportunityPreview({ internships }) {
  const real = internships?.items?.length
    ? {
        total: `Recommended for you`,
        count: `${internships.total} ${internships.total === 1 ? "role" : "roles"}`,
        items: internships.items.slice(0, 2).map((i) => ({
          company: i.company,
          role: i.role,
          place: i.location,
          tags: (i.matched || []).slice(0, 3),
        })),
      }
    : null;
  const d = real || { ...DEMO.roles, count: "Sample roles" };
  return (
    <div className="home-preview opportunity-preview" aria-hidden="true">
      <div className="preview-filter">
        <span>{d.total}</span>
        <i>{d.count}</i>
      </div>
      {d.items.map((it) => (
        <article key={`${it.company}-${it.role}`}>
          <div className="company-mark">{(it.company || "?").charAt(0)}</div>
          <div>
            <b>{it.role}</b>
            <span>
              {it.company}
              {it.place ? ` · ${it.place}` : ""}
            </span>
            {it.tags.length > 0 && (
              <p>
                {it.tags.map((t) => (
                  <mark key={t}>{t}</mark>
                ))}
              </p>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

function BoardPreview({ cards }) {
  let lanes = DEMO.lanes;
  if (cards?.length) {
    lanes = ["Applied", "Interview", "Offer"]
      .map((stage) => ({
        stage,
        count: cards.filter((c) => c.status === stage).length,
        items: cards
          .filter((c) => c.status === stage)
          .slice(0, 2)
          .map((c) => ({
            name: c.company ?? c.title,
            note:
              c.deadline && stage === "Applied" && daysUntil(c.deadline) >= 0
                ? describeDeadline(c.deadline)
                : c.role || "",
          })),
      }))
      .filter((l) => l.items.length);
    if (!lanes.length) lanes = DEMO.lanes;
  }
  return (
    <div className="home-preview board-preview" aria-hidden="true">
      {lanes.map((lane) => (
        <div className="mini-lane" key={lane.stage}>
          <b>
            {lane.stage}
            <i>{lane.count ?? lane.items.length}</i>
          </b>
          {lane.items.map((item) => (
            <span key={item.name}>
              {item.name}
              {item.note && <small>{item.note}</small>}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

function DocumentsPreview({ resumes, cards, student }) {
  const current = resumes?.find((r) => r.current) || resumes?.[0];
  const doc = current
    ? {
        name: current.fileName,
        used: (() => {
          const n = (cards || []).filter((c) => c.resumeId === current.id).length;
          return `Used for ${n} ${n === 1 ? "application" : "applications"}`;
        })(),
        note: "Open directly in Overleaf",
      }
    : DEMO.resume;
  return (
    <div className="home-preview documents-preview" aria-hidden="true">
      <div className="paper-sheet">
        <span className="paper-name">{student?.name || "Your Name"}</span>
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
          <b>{doc.name}</b>
          <small>{doc.used}</small>
        </span>
        <span>
          <Icon name="check" />
          <b>Keep every version</b>
          <small>{doc.note}</small>
        </span>
      </div>
    </div>
  );
}

function InsightPreview({ analytics }) {
  const real = analytics?.total > 0;
  const funnel = real ? analytics.funnel : DEMO.funnel;
  const max = Math.max(1, funnel[0].count);
  let insight = DEMO.insight;
  if (real) {
    const best = (analytics.byResume || [])
      .filter((r) => !r.small && r.interviews > 0)
      .sort((a, b) => b.interviews / b.applied - a.interviews / a.applied)[0];
    insight = best
      ? { title: `${best.label} performs best`, note: `${best.interviews} of ${best.applied} applications reached interview` }
      : { title: `${analytics.total} applications tracked`, note: "Attach resumes to see which one performs best" };
  }
  return (
    <div className="home-preview insight-preview" aria-hidden="true">
      <div className="mini-funnel">
        {funnel.map((f) => (
          <span key={f.stage} style={{ "--w": `${Math.max(14, Math.round((f.count / max) * 100))}%` }}>
            {f.stage} <b>{f.count}</b>
          </span>
        ))}
      </div>
      <p>
        <b>{insight.title}</b>
        <span>{insight.note}</span>
      </p>
    </div>
  );
}

const FLOW = [
  {
    id: "track",
    source: "cards",
    title: "Track every application",
    body: "Move roles from Applied to Offer and keep deadlines, links and documents attached.",
    visual: (d) => <BoardPreview cards={d?.cards} />,
    outcome: "Deadlines stay visible.",
    to: "/tracker",
    action: "Open the tracker",
  },
  {
    id: "prepare",
    source: "student",
    title: "Build one useful profile",
    body: "Add your skills, education and public coding profiles once. Profile completion shows exactly what is missing.",
    visual: (d) => <ProfilePreview student={d?.student} />,
    outcome: "A complete profile improves role matching.",
    to: "/profile",
    action: "Complete your profile",
  },
  {
    id: "discover",
    source: "internships",
    title: "Find roles that fit",
    body: "Browse internships with skill-match context, locations and direct application links—without maintaining another spreadsheet.",
    visual: (d) => <OpportunityPreview internships={d?.internships} />,
    outcome: "Applying adds the role to your tracker.",
    to: "/internships",
    action: "Browse opportunities",
  },
  {
    id: "documents",
    source: "resumes",
    title: "Know which resume you sent",
    body: "Keep resume versions, attach the right one to each application, or create a clean resume and continue editing it in Overleaf.",
    visual: (d) => <DocumentsPreview resumes={d?.resumes} cards={d?.cards} student={d?.student} />,
    outcome: "No more guessing before an interview.",
    to: "/documents",
    action: "Manage resumes",
  },
  {
    id: "improve",
    source: "analytics",
    title: "Learn from the outcomes",
    body: "Analytics turns your pipeline into useful signals: conversion by stage, application pace and which resume earns more interviews.",
    visual: (d) => <InsightPreview analytics={d?.analytics} />,
    outcome: "Use evidence to improve the next application.",
    to: "/analytics",
    action: "See your analytics",
  },
];

// Is there nothing of the user's own to show for this source yet?
const EMPTY = {
  cards: (v) => !v.length,
  resumes: (v) => !v.length,
  internships: (v) => !v.items?.length,
  analytics: (v) => !v.total,
  student: () => false,
};

function WorkflowItem({ item, index, signedIn, data }) {
  // sample: generic placeholder · error: the user's data failed to load · live: their own data
  let state = "sample";
  if (signedIn && data) {
    const value = data[item.source];
    state = value == null ? "error" : EMPTY[item.source](value) ? "sample" : "live";
  }
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
      <div className={`workflow-visual workflow-visual--${state}`}>
        {state === "error" ? (
          <div className="home-preview preview-error" role="status">
            Couldn’t load your data. Refresh to try again.
          </div>
        ) : (
          item.visual(state === "live" ? data : null)
        )}
        {state === "sample" && (
          <small className="preview-note">
            {signedIn && data ? "Sample. Yours appears once you add some." : "Sample preview"}
          </small>
        )}
      </div>
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
  const signedIn = useSignedIn();
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!signedIn) {
      setData(null);
      return;
    }
    // Each source loads on its own; any that fails falls back to the sample preview.
    const ok = (p) => p.catch(() => null);
    Promise.all([
      ok(api("/tracker")),
      ok(resumeApi.load()),
      ok(api("/profile")),
      ok(api("/internships")),
      ok(api("/analytics")),
    ]).then(([cards, resumes, student, internships, analytics]) =>
      setData({ cards, resumes, student, internships, analytics }),
    );
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
              data={signedIn ? data : null}
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
