import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../utils/api";
import { canPreview, coverLetterApi, resumeApi } from "../utils/resume";
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

  const shown = cards.filter((c) => stage === "All" || c.status === stage);

  return (
    <div className="page docs-page">
      <header className="page-head rise">
        <h1 className="page-title">Documents</h1>
        <p className="page-lede">
          The resume and cover letter you sent with each application, and the files you can attach.
        </p>
      </header>

      <Alert onDismiss={() => setError("")}>{error}</Alert>

      <section className="docs-section rise" style={{ "--i": 1 }} aria-labelledby="docs-by-app">
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

      <section className="docs-files" aria-label="Your files">
        <ResumeManager kind="resume" onChange={filesChanged(setResumes)} />
        <ResumeManager kind="coverLetter" onChange={filesChanged(setLetters)} />
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
