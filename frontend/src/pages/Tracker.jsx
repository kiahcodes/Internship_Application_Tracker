import { useEffect, useState } from "react";
import { api } from "../utils/api";
import { loadResumeVersions } from "../utils/resume";
import { loadStudent } from "../utils/student";
import { CoverLetterDialog } from "../components/CoverLetterDialog.jsx";
import { Alert, Button, Skeleton } from "../components/ui.jsx";
import "./Tracker.css";

const COLUMNS = ["Applied", "Interview", "Offer"];
const HINTS = {
  Applied: "Applications you've sent land here.",
  Interview: "Drag a card here once you hear back.",
  Offer: "Your wins. Hopefully a long list.",
};

export function Tracker() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [announce, setAnnounce] = useState("");
  const [resumes, setResumes] = useState([]);
  const [student, setStudent] = useState(null);
  const [letterCardId, setLetterCardId] = useState(null);
  const [error, setError] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [dragId, setDragId] = useState(null);
  const [overCol, setOverCol] = useState(null);
  const [files, setFiles] = useState([]);
  const [fileOver, setFileOver] = useState(false);

  useEffect(() => {
    api("/tracker")
      .then(setCards)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    loadResumeVersions()
      .then(setResumes)
      .catch(() => {}); // the board still works without the resume list
    loadStudent()
      .then(setStudent)
      .catch(() => {}); // drafts just skip personal details without it
  }, []);

  const addCard = async (e) => {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    setAdding(true);
    try {
      const card = await api("/tracker", { method: "POST", body: { title } });
      setCards((prev) => [...prev, card]);
      setNewTitle("");
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  };

  const removeCard = async (id) => {
    try {
      await api(`/tracker/${id}`, { method: "DELETE" });
      setCards((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const saveCoverLetter = (id, coverLetter) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, coverLetter } : c)));
    setAnnounce("Cover letter saved");
  };

  const setCardResume = (card, value) => {
    const resumeId = value === "" ? null : Number(value);
    const previous = { resumeId: card.resumeId, resumeName: card.resumeName };
    const resume = resumes.find((r) => r.id === resumeId);
    const apply = (next) =>
      setCards((prev) => prev.map((c) => (c.id === card.id ? { ...c, ...next } : c)));
    apply({ resumeId, resumeName: resume?.fileName ?? null });
    setAnnounce(resume ? `${card.title}: resume set to ${resume.fileName}` : `${card.title}: resume cleared`);
    api(`/tracker/${card.id}`, { method: "PATCH", body: { resumeId } }).catch((err) => {
      apply(previous);
      setError(err.message);
    });
  };

  // Which resume version got how far? "Reached interview" counts Interview and Offer.
  const resumeResults = resumes
    .map((r) => {
      const used = cards.filter((c) => c.resumeId === r.id);
      return {
        ...r,
        sent: used.length,
        interviews: used.filter((c) => c.status !== "Applied").length,
        offers: used.filter((c) => c.status === "Offer").length,
      };
    })
    .filter((r) => r.sent > 0);

  const onDragStart = (e, card) => {
    e.dataTransfer.setData("text/plain", String(card.id));
    e.dataTransfer.effectAllowed = "move";
    setDragId(card.id);
  };

  const onDragEnd = () => {
    setDragId(null);
    setOverCol(null);
  };

  const onDragOver = (e, col) => {
    e.preventDefault(); // required, otherwise drop is not allowed
    e.dataTransfer.dropEffect = "move";
    if (overCol !== col) setOverCol(col);
  };

  const moveCard = (id, col) => {
    const card = cards.find((c) => c.id === id);
    if (!card || card.status === col) return;
    const previous = card.status;
    const setStatus = (status) =>
      setCards((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
    setStatus(col); // optimistic; roll back if the server rejects it
    setAnnounce(`${card.title} moved to ${col}`);
    api(`/tracker/${id}`, { method: "PATCH", body: { status: col } }).catch(
      (err) => {
        setStatus(previous);
        setAnnounce(`Couldn't move ${card.title}`);
        setError(err.message);
      },
    );
  };

  const onDrop = (e, col) => {
    e.preventDefault();
    moveCard(Number(e.dataTransfer.getData("text/plain")), col);
    onDragEnd();
  };

  // --- File dropping (dataTransfer.files) ---
  const onFileDrop = (e) => {
    e.preventDefault();
    setFileOver(false);
    const dropped = Array.from(e.dataTransfer.files).map((f) => ({
      name: f.name,
      size: (f.size / 1024).toFixed(1) + " KB",
      type: f.type || "unknown",
    }));
    setFiles((prev) => [...prev, ...dropped]);
  };

  const counts = Object.fromEntries(
    COLUMNS.map((c) => [c, cards.filter((card) => card.status === c).length]),
  );

  return (
    <div className="page dd-page">
      <header className="page-head rise">
        <h1 className="page-title">Your applications</h1>
        <p className="page-lede">
          {loading
            ? "Loading your board…"
            : cards.length === 0
              ? "Nothing tracked yet. Add your first application below."
              : `${cards.length} tracked · ${counts.Interview} interviewing · ${counts.Offer} ${counts.Offer === 1 ? "offer" : "offers"}`}
        </p>
      </header>

      <form className="dd-add rise" style={{ "--i": 1 }} onSubmit={addCard}>
        <label htmlFor="dd-new" className="sr-only">New application</label>
        <input
          id="dd-new"
          className="field-input"
          type="text"
          placeholder="Add an application, e.g. Backend Intern – Zoho"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />
        <Button type="submit" loading={adding} disabled={!newTitle.trim()}>Add</Button>
      </form>
      <Alert onDismiss={() => setError("")}>{error}</Alert>
      <div className="sr-only" role="status" aria-live="polite">{announce}</div>

      <div className="dd-board">
        {COLUMNS.map((col) => {
          const colCards = cards.filter((c) => c.status === col);
          return (
            <section
              key={col}
              aria-labelledby={`col-${col}`}
              className={`dd-column dd-${col.toLowerCase()} ${overCol === col ? "dd-over" : ""}`}
              onDragOver={(e) => onDragOver(e, col)}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) setOverCol(null);
              }}
              onDrop={(e) => onDrop(e, col)}
            >
              <h2 id={`col-${col}`}>
                <span className="dd-dot" aria-hidden="true" />
                {col}
                <span className="dd-count">{counts[col]}</span>
              </h2>

              {loading && <Skeleton height="52px" style={{ borderRadius: 10 }} />}

              {!loading && colCards.length === 0 && (
                <p className="dd-hint">{HINTS[col]}</p>
              )}

              {colCards.map((card) => (
                <div
                  key={card.id}
                  className={`dd-card ${dragId === card.id ? "dd-dragging" : ""}`}
                  draggable
                  onDragStart={(e) => onDragStart(e, card)}
                  onDragEnd={onDragEnd}
                >
                  <span className="dd-card-title">{card.title}</span>
                  <div className="dd-resume">
                    <label className="dd-resume-label" htmlFor={`rs-${card.id}`}>Resume sent</label>
                    <select
                      id={`rs-${card.id}`}
                      className="dd-move dd-resume-select"
                      value={card.resumeId ?? ""}
                      onChange={(e) => setCardResume(card, e.target.value)}
                    >
                      <option value="">None</option>
                      {resumes.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.fileName}{r.current ? " (current)" : ""}
                        </option>
                      ))}
                      {card.resumeId && !resumes.some((r) => r.id === card.resumeId) && (
                        <option value={card.resumeId}>{card.resumeName}</option>
                      )}
                    </select>
                  </div>
                  <button
                    type="button"
                    className={`dd-letter ${card.coverLetter || card.coverLetterId ? "dd-letter--done" : ""}`}
                    onClick={() => setLetterCardId(card.id)}
                    aria-label={`${card.coverLetter ? "Edit" : "Write"} cover letter for ${card.title}`}
                  >
                    {card.coverLetter || card.coverLetterId ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    ) : null}
                    {card.coverLetter || card.coverLetterId ? "Cover letter" : "Add cover letter"}
                  </button>
                  <div className="dd-card-tools">
                    <label className="sr-only" htmlFor={`mv-${card.id}`}>
                      Move {card.title} to
                    </label>
                    <select
                      id={`mv-${card.id}`}
                      className="dd-move"
                      value={card.status}
                      onChange={(e) => moveCard(card.id, e.target.value)}
                    >
                      {COLUMNS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="dd-remove"
                      aria-label={`Remove ${card.title}`}
                      onClick={() => removeCard(card.id)}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </section>
          );
        })}
      </div>

      <CoverLetterDialog
        card={cards.find((c) => c.id === letterCardId) ?? null}
        student={student}
        onSaved={saveCoverLetter}
        onClose={() => setLetterCardId(null)}
      />

      {resumeResults.length > 0 && (
        <section className="dd-results" aria-labelledby="dd-results-h">
          <h2 id="dd-results-h">How each resume is doing</h2>
          <ul>
            {resumeResults.map((r) => (
              <li key={r.id}>
                <span className="dd-results-name">
                  {r.fileName}
                  {r.current && <span className="resume-badge">Current</span>}
                </span>
                <span className="dd-results-stats">
                  Sent to {r.sent} · {r.interviews} reached interview · {r.offers} {r.offers === 1 ? "offer" : "offers"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div
        className={`dd-dropzone ${fileOver ? "dd-over" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setFileOver(true);
        }}
        onDragLeave={() => setFileOver(false)}
        onDrop={onFileDrop}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />
        </svg>
        <p>Drop your resume or files here</p>
        {files.length > 0 && (
          <ul>
            {files.map((f, i) => (
              <li key={i}>
                {f.name} · {f.size} · {f.type}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default Tracker;
