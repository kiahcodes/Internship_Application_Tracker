import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../utils/api";
import { canPreview, coverLetterApi, formatUploadDate, resumeApi, resumeUsage } from "../utils/resume";
import { loadStudent } from "../utils/student";
import { Alert, Button, EmptyState, Skeleton } from "../components/ui.jsx";
import { CoverLetterDialog } from "../components/CoverLetterDialog.jsx";
import { ResumeManager } from "../components/ResumeManager.jsx";
import "./Documents.css";

const STAGES = ["Applied", "OA", "Interview", "Offer", "Rejected"];

function Doc({ label, name, file, onView, onDownload, children }) {
  return (
    <div className="doc">
      <h4 className="doc-label">{label}</h4>
      {name ? (
        <>
          <p className="doc-name">{name}</p>
          <div className="doc-actions">
            {file && canPreview(file) && (
              <Button variant="ghost" size="sm" onClick={onView} aria-label={`View ${name}`}>View</Button>
            )}
            {file && (
              <Button variant="ghost" size="sm" onClick={onDownload} aria-label={`Download ${name}`}>Download</Button>
            )}
          </div>
        </>
      ) : (
        <p className="doc-none">Nothing attached.</p>
      )}
      {children}
    </div>
  );
}

function ApplicationRow({ card, resumes, letters, open, onToggle, onAttach, onEditLetter, onError }) {
  const stage = card.status.toLowerCase();
  const resume = resumes.find((r) => r.id === card.resumeId);
  const letterFile = letters.find((l) => l.id === card.coverLetterId);
  const written = card.coverLetter?.trim();
  const letterCount = (written ? 1 : 0) + (card.coverLetterId ? 1 : 0);
  const panelId = `docs-panel-${card.id}`;

  const guard = (fn) => () => fn().catch((err) => onError(err.message));

  return (
    <li className={`app app-${stage}`}>
      <button
        type="button"
        className="app-head"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <span className="app-title">{card.title}</span>
        <span className="app-stage">
          <span className="app-dot" aria-hidden="true" />
          {card.status}
        </span>
        <span className="app-have">
          <span className={card.resumeId ? "have" : "have-no"}>
            {card.resumeId ? "Resume attached" : "No resume"}
          </span>
          <span className={letterCount ? "have" : "have-no"}>
            {letterCount ? "Cover letter attached" : "No cover letter"}
          </span>
        </span>
        <svg className="app-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="app-panel" id={panelId}>
          <Doc
            label="Resume"
            name={resume?.fileName ?? card.resumeName}
            file={resume}
            onView={guard(() => resumeApi.view(resume))}
            onDownload={guard(() => resumeApi.download(resume))}
          >
            <label className="doc-pick">
              <span>Resume sent</span>
              <select
                className="dd-move"
                value={card.resumeId ?? ""}
                onChange={(e) => onAttach(card, { resumeId: e.target.value === "" ? null : Number(e.target.value) })}
              >
                <option value="">None</option>
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>{r.fileName}{r.current ? " (current)" : ""}</option>
                ))}
              </select>
            </label>
          </Doc>

          <Doc
            label="Cover letter file"
            name={letterFile?.fileName ?? card.coverLetterName}
            file={letterFile}
            onView={guard(() => coverLetterApi.view(letterFile))}
            onDownload={guard(() => coverLetterApi.download(letterFile))}
          >
            <label className="doc-pick">
              <span>Cover letter sent</span>
              <select
                className="dd-move"
                value={card.coverLetterId ?? ""}
                onChange={(e) => onAttach(card, { coverLetterId: e.target.value === "" ? null : Number(e.target.value) })}
              >
                <option value="">None</option>
                {letters.map((l) => (
                  <option key={l.id} value={l.id}>{l.fileName}</option>
                ))}
              </select>
            </label>
          </Doc>

          <div className="doc doc-wide">
            <h4 className="doc-label">Written cover letter</h4>
            {written ? <p className="doc-text">{card.coverLetter}</p> : <p className="doc-none">No written letter for this application.</p>}
            <div className="doc-actions">
              <Button variant="ghost" size="sm" onClick={() => onEditLetter(card)}>
                {written ? "Edit written letter" : "Write a cover letter"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}

/** Every resume version, with the companies it was sent to. */
function ResumeHistory({ resumes, cards, onError }) {
  const { versions, removed, none: unsent } = resumeUsage(resumes, cards);
  const guard = (fn) => () => fn().catch((err) => onError(err.message));

  const companies = (list) => (
    <ul className="rh-sent">
      {list.map((c) => (
        <li key={c.id}>
          <span className="rh-company">{c.title}</span>
          <span className={`rh-stage app-${c.status.toLowerCase()}`}>
            <span className="app-dot" aria-hidden="true" />
            {c.status}
          </span>
        </li>
      ))}
    </ul>
  );

  return (
    <ol className="rh">
      {versions.map(({ resume: r, sent }) => {
        return (
          <li key={r.id} className="rh-item">
            <div className="rh-head">
              <div>
                <p className="rh-name">
                  {r.fileName}
                  {r.current && <span className="resume-badge rh-badge">Current</span>}
                </p>
                <p className="rh-meta">
                  Uploaded {formatUploadDate(r.uploadedAt)} &middot;{" "}
                  {sent.length === 0
                    ? "Not sent yet"
                    : `Sent to ${sent.length} ${sent.length === 1 ? "company" : "companies"}`}
                </p>
              </div>
              <div className="doc-actions">
                {canPreview(r) && (
                  <Button variant="ghost" size="sm" onClick={guard(() => resumeApi.view(r))} aria-label={`View ${r.fileName}`}>View</Button>
                )}
                <Button variant="ghost" size="sm" onClick={guard(() => resumeApi.download(r))} aria-label={`Download ${r.fileName}`}>Download</Button>
              </div>
            </div>
            {sent.length > 0 && companies(sent)}
          </li>
        );
      })}
      {removed.map(({ name, sent }) => (
        <li key={name} className="rh-item rh-item--none">
          <p className="rh-name">{name}</p>
          <p className="rh-meta">
            No longer saved &middot; was sent to {sent.length} {sent.length === 1 ? "company" : "companies"}
          </p>
          {companies(sent)}
        </li>
      ))}
      {unsent.length > 0 && (
        <li className="rh-item rh-item--none">
          <p className="rh-name">No resume recorded</p>
          <p className="rh-meta">
            {unsent.length} {unsent.length === 1 ? "application has" : "applications have"} no resume
            attached. Pick one under By application below.
          </p>
          {companies(unsent)}
        </li>
      )}
    </ol>
  );
}

export function Documents() {
  const [cards, setCards] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [letters, setLetters] = useState([]);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState(null);
  const [letterCardId, setLetterCardId] = useState(null);
  const [stage, setStage] = useState("All");

  const loadCards = useCallback(
    () =>
      api("/tracker")
        .then(setCards)
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false)),
    [],
  );

  useEffect(() => {
    loadCards();
    loadStudent().then(setStudent).catch(() => {});
  }, [loadCards]);

  // Removing or replacing a file can detach it from applications, so refresh the cards.
  const filesChanged = (setter) => (list, initial) => {
    setter(list);
    if (!initial) loadCards();
  };

  const attach = (card, patch) => {
    const name = (list, id) => list.find((f) => f.id === id)?.fileName ?? null;
    const optimistic = {
      ...patch,
      ...("resumeId" in patch ? { resumeName: name(resumes, patch.resumeId) } : {}),
      ...("coverLetterId" in patch ? { coverLetterName: name(letters, patch.coverLetterId) } : {}),
    };
    const before = { ...card };
    const update = (next) => setCards((prev) => prev.map((c) => (c.id === card.id ? { ...c, ...next } : c)));
    update(optimistic);
    api(`/tracker/${card.id}`, { method: "PATCH", body: patch }).catch((err) => {
      update(before);
      setError(err.message);
    });
  };

  const withoutResume = cards.filter((c) => !c.resumeId).length;
  const shown = cards.filter((c) => stage === "All" || c.status === stage);

  return (
    <div className="page docs-page">
      <header className="page-head rise">
        <h1 className="page-title">Documents</h1>
        <p className="page-lede">
          Every resume version you have, and which company each one was sent to.
        </p>
      </header>

      <Alert onDismiss={() => setError("")}>{error}</Alert>

      <section className="docs-files rise" aria-label="Your files">
        <ResumeManager kind="resume" onChange={filesChanged(setResumes)} />
        <ResumeManager kind="coverLetter" onChange={filesChanged(setLetters)} />
      </section>

      {!loading && (
        <dl className="docs-summary rise">
          <div><dt>Resume versions</dt><dd>{resumes.length}</dd></div>
          <div><dt>Applications</dt><dd>{cards.length}</dd></div>
          <div className={withoutResume ? "docs-summary--warn" : undefined}>
            <dt>Without a resume</dt><dd>{withoutResume}</dd>
          </div>
        </dl>
      )}

      <section className="docs-section rise" style={{ "--i": 1 }} aria-labelledby="docs-by-resume">
        <div className="docs-bar">
          <h2 id="docs-by-resume" className="docs-h">Resume versions</h2>
        </div>
        {loading ? (
          <Skeleton height="64px" style={{ borderRadius: 10 }} />
        ) : cards.length === 0 && resumes.length === 0 ? (
          <p className="docs-none">Upload a resume above, then apply to roles to see where each version goes.</p>
        ) : (
          <ResumeHistory resumes={resumes} cards={cards} onError={setError} />
        )}
      </section>

      <section className="docs-section rise" style={{ "--i": 2 }} aria-labelledby="docs-by-app">
        <div className="docs-bar">
          <h2 id="docs-by-app" className="docs-h">By application</h2>
          <div className="docs-filter" role="group" aria-label="Filter by stage">
            {["All", ...STAGES].map((s) => (
              <button
                key={s}
                type="button"
                className={`docs-chip ${stage === s ? "docs-chip--on" : ""}`}
                aria-pressed={stage === s}
                onClick={() => setStage(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="docs-skel" aria-hidden="true">
            <Skeleton height="64px" style={{ borderRadius: 10 }} />
            <Skeleton height="64px" style={{ borderRadius: 10 }} />
          </div>
        ) : cards.length === 0 ? (
          <EmptyState
            title="No applications yet"
            action={<Button as={Link} to="/internships">Browse internships</Button>}
          >
            Apply to a role or add an application on the Tracker, and its documents will show up here.
          </EmptyState>
        ) : shown.length === 0 ? (
          <p className="docs-none">No {stage.toLowerCase()} applications.</p>
        ) : (
          <ul className="apps">
            {shown.map((card) => (
              <ApplicationRow
                key={card.id}
                card={card}
                resumes={resumes}
                letters={letters}
                open={openId === card.id}
                onToggle={() => setOpenId(openId === card.id ? null : card.id)}
                onAttach={attach}
                onEditLetter={(c) => setLetterCardId(c.id)}
                onError={setError}
              />
            ))}
          </ul>
        )}
      </section>

      <CoverLetterDialog
        card={cards.find((c) => c.id === letterCardId) ?? null}
        student={student}
        onSaved={(id, coverLetter) =>
          setCards((prev) => prev.map((c) => (c.id === id ? { ...c, coverLetter } : c)))
        }
        onClose={() => setLetterCardId(null)}
      />
    </div>
  );
}

export default Documents;
