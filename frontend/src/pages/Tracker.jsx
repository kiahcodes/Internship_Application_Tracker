import { useEffect, useRef, useState } from "react";
import { api } from "../utils/api";
import { loadResumeVersions } from "../utils/resume";
import { loadStudent } from "../utils/student";
import { CoverLetterDialog } from "../components/CoverLetterDialog.jsx";
import { ImportDialog } from "../components/ImportDialog.jsx";
import { ImportGuideDialog } from "../components/ImportGuideDialog.jsx";
import { Alert, Button, Skeleton } from "../components/ui.jsx";
import { daysUntil, describeDeadline, formatDay } from "../utils/internships";
import { NewApplicationDialog } from "../components/NewApplicationDialog.jsx";
import { ApplicationDialog } from "../components/ApplicationDialog.jsx";
import "./Tracker.css";

const COLUMNS = ["Applied", "OA", "Interview", "Offer", "Rejected"];
// One line under each column name, so the board explains itself.
const MEANING = {
  Applied: "Waiting for a reply",
  OA: "Tests and assessments",
  Interview: "Talking to people",
  Offer: "Time to decide",
  Rejected: "Closed",
};
const HINTS = {
  Applied: "Applications you've sent.",
  OA: "Online assessments and coding tests.",
  Interview: "Drag a card here once you get an interview.",
  Offer: "Your wins.",
  Rejected: "Keep these. They show up in your analytics.",
};

export function Tracker() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [announce, setAnnounce] = useState("");
  const [resumes, setResumes] = useState([]);
  const [student, setStudent] = useState(null);
  const [letterCardId, setLetterCardId] = useState(null);
  const [error, setError] = useState("");
  const [dragId, setDragId] = useState(null);
  const [overCol, setOverCol] = useState(null);
  const [importReport, setImportReport] = useState(null);
  const [importFile, setImportFile] = useState("");
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [openId, setOpenId] = useState(null);
  const fileInput = useRef(null);

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

  const addCard = async (form) => {
    const card = await api("/tracker", {
      method: "POST",
      body: Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, typeof v === "string" ? v.trim() : v]),
      ),
    });
    setCards((prev) => [...prev, card]);
    setError("");
    setAnnounce("Application added");
  };

  const saveDetails = async (card, details) => {
    const saved = await api(`/tracker/${card.id}`, { method: "PATCH", body: details });
    setCards((prev) =>
      prev.map((c) =>
        c.id === card.id
          ? {
              ...c,
              company: saved.company ?? details.company ?? null,
              role: details.role || null,
              location: details.location || null,
              postingUrl: details.link || null,
              deadline: details.deadline || null,
            }
          : c,
      ),
    );
    setAnnounce("Details saved");
  };

  const removeCard = async (id) => {
    try {
      await api(`/tracker/${id}`, { method: "DELETE" });
      setCards((prev) => prev.filter((c) => c.id !== id));
      setOpenId(null);
      setAnnounce("Application removed");
    } catch (err) {
      setError(err.message);
    }
  };

  const saveCoverLetter = (id, coverLetter) => {
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, coverLetter } : c)),
    );
    setAnnounce("Cover letter saved");
  };

  const setCardResume = (card, value) => {
    const resumeId = value === "" ? null : Number(value);
    const previous = { resumeId: card.resumeId, resumeName: card.resumeName };
    const resume = resumes.find((r) => r.id === resumeId);
    const apply = (next) =>
      setCards((prev) =>
        prev.map((c) => (c.id === card.id ? { ...c, ...next } : c)),
      );
    apply({ resumeId, resumeName: resume?.fileName ?? null });
    setAnnounce(
      resume
        ? `${card.title}: resume set to ${resume.fileName}`
        : `${card.title}: resume cleared`,
    );
    api(`/tracker/${card.id}`, { method: "PATCH", body: { resumeId } }).catch(
      (err) => {
        apply(previous);
        setError(err.message);
      },
    );
  };

  const setCardReminder = (card, value) => {
    const remindOn = value || null;
    const previous = card.remindOn;
    const apply = (next) =>
      setCards((prev) =>
        prev.map((c) => (c.id === card.id ? { ...c, remindOn: next } : c)),
      );
    apply(remindOn);
    setAnnounce(
      remindOn
        ? `${card.title}: reminder set`
        : `${card.title}: reminder cleared`,
    );
    api(`/tracker/${card.id}`, { method: "PATCH", body: { remindOn } }).catch(
      (err) => {
        apply(previous);
        setError(err.message);
      },
    );
  };

  // Reminders you set (until you clear them) and deadlines still ahead, soonest first.
  const comingUp = cards
    .flatMap((c) => {
      const items = [];
      if (c.remindOn && c.status !== "Rejected" && daysUntil(c.remindOn) <= 7)
        items.push({ card: c, kind: "reminder", days: daysUntil(c.remindOn) });
      if (
        c.deadline &&
        c.status === "Applied" &&
        daysUntil(c.deadline) >= 0 &&
        daysUntil(c.deadline) <= 7
      )
        items.push({ card: c, kind: "deadline", days: daysUntil(c.deadline) });
      return items;
    })
    .sort((a, b) => a.days - b.days)
    .slice(0, 8);
  const when = (days, iso) =>
    days < 0
      ? `${-days} ${days === -1 ? "day" : "days"} overdue`
      : days === 0
        ? "today"
        : days === 1
          ? "tomorrow"
          : days <= 7
            ? `in ${days} days`
            : `on ${formatDay(iso)}`;

  async function exportCsv() {
    try {
      const res = await api("/tracker/export", { raw: true });
      const url = URL.createObjectURL(await res.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `applications-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    }
  }

  async function chooseImportFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // so choosing the same file again still fires
    if (!file) return;
    setGuideOpen(false);
    if (file.size > 1024 * 1024)
      return setError(
        "That file is over 1 MB. Export a smaller sheet or split it.",
      );
    try {
      const text = await file.text();
      setImportReport(
        await api("/tracker/import?dryRun=1", { method: "POST", body: text }),
      );
      setImportText(text);
      setImportFile(file.name);
    } catch (err) {
      setError(err.message);
    }
  }

  async function confirmImport() {
    setImporting(true);
    try {
      const done = await api("/tracker/import", {
        method: "POST",
        body: importText,
      });
      setCards(await api("/tracker"));
      setAnnounce(`Imported ${done.added} applications`);
      setImportReport(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  }

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

  const needle = query.trim().toLowerCase();
  const visible = needle
    ? cards.filter((c) =>
        [c.title, c.company, c.role, c.location].some((v) => v?.toLowerCase().includes(needle)),
      )
    : cards;
  const counts = Object.fromEntries(
    COLUMNS.map((c) => [c, cards.filter((card) => card.status === c).length]),
  );
  const inPlay = counts.Applied + counts.OA + counts.Interview;
  const summary =
    cards.length === 0
      ? "Nothing here yet. Add your first application, or import the spreadsheet you already keep."
      : `${inPlay} still in play, ${counts.Offer} ${counts.Offer === 1 ? "offer" : "offers"}, ${counts.Rejected} closed.`;
  const openCard = cards.find((c) => c.id === openId) ?? null;

  // The signals worth seeing without opening a card.
  const chipsFor = (card) => {
    const chips = [];
    const open = card.status !== "Offer" && card.status !== "Rejected";
    if (
      card.deadline &&
      card.status === "Applied" &&
      daysUntil(card.deadline) >= 0
    ) {
      const d = describeDeadline(card.deadline);
      chips.push({ key: "dl", text: d.text, tone: d.tone });
    }
    if (card.remindOn && open) {
      const days = daysUntil(card.remindOn);
      chips.push({
        key: "rm",
        text: `Remind ${when(days, card.remindOn)}`,
        tone: days < 0 ? "urgent" : days <= 1 ? "soon" : "",
      });
    }
    if (card.resumeId || card.resumeName)
      chips.push({
        key: "rs",
        text: card.resumeName ?? "Resume attached",
        tone: "file",
      });
    if (card.coverLetter || card.coverLetterId)
      chips.push({ key: "cl", text: "Cover letter", tone: "file" });
    return chips;
  };

  return (
    <div className="page dd-page">
      <header className="page-head rise">
        <h1 className="page-title">Your applications</h1>
        <p className="dd-summary">{summary}</p>
      </header>

      <div className="dd-toolbar rise" style={{ "--i": 1 }}>
        <div className="dd-search">
          <label htmlFor="dd-search" className="sr-only">
            Search applications
          </label>
          <input
            id="dd-search"
            className="field-input"
            type="search"
            placeholder="Search by company, role or location"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button onClick={() => setAdding(true)}>Add application</Button>
        <div className="dd-sheet-actions">
          <Button variant="ghost" size="sm" onClick={() => setGuideOpen(true)}>
            Import CSV
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={exportCsv}
            disabled={cards.length === 0}
          >
            Export CSV
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            tabIndex={-1}
            aria-label="Choose a CSV file to import"
            onChange={chooseImportFile}
          />
        </div>
      </div>
      <Alert onDismiss={() => setError("")}>{error}</Alert>
      <div className="sr-only" role="status" aria-live="polite">
        {announce}
      </div>

      {comingUp.length > 0 && (
        <section className="dd-coming rise" aria-labelledby="dd-coming-h">
          <h2 id="dd-coming-h">Needs attention</h2>
          <ul>
            {comingUp.map(({ card, kind, days }) => (
              <li
                key={`${card.id}-${kind}`}
                className={days < 0 ? "is-overdue" : days <= 1 ? "is-soon" : ""}
              >
                <button
                  type="button"
                  className="dd-coming-item"
                  onClick={() => setOpenId(card.id)}
                >
                  <span className="dd-coming-title">
                    {card.company ?? card.title}
                  </span>
                  <span className="dd-coming-when">
                    {kind === "reminder" ? "Reminder" : "Closes"}{" "}
                    {when(
                      days,
                      kind === "reminder" ? card.remindOn : card.deadline,
                    )}
                  </span>
                </button>
                {kind === "reminder" && (
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => setCardReminder(card, "")}
                    aria-label={`Mark reminder for ${card.title} as done`}
                  >
                    Done
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="dd-board-help">
        Drag cards between stages, or open a card to update its stage, resume,
        reminder and cover letter.
      </p>

      {needle && visible.length === 0 && (
        <p className="dd-nomatch" role="status">
          No applications match “{query.trim()}”. Try a company, role or city.
        </p>
      )}

      <div className="dd-board">
        {COLUMNS.map((col) => {
          const colCards = visible.filter((c) => c.status === col);
          return (
            <section
              key={col}
              aria-labelledby={`col-${col}`}
              className={`dd-column dd-${col.toLowerCase()} ${overCol === col ? "dd-over" : ""}`}
              onDragOver={(e) => onDragOver(e, col)}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget))
                  setOverCol(null);
              }}
              onDrop={(e) => onDrop(e, col)}
            >
              <header className="dd-colhead">
                <h2 id={`col-${col}`}>{col}</h2>
                <span
                  className="dd-count"
                  aria-label={`${counts[col]} applications`}
                >
                  {counts[col]}
                </span>
                <p>{MEANING[col]}</p>
              </header>

              <div className="dd-cards">
                {loading && (
                  <Skeleton height="64px" style={{ borderRadius: 10 }} />
                )}

                {!loading && colCards.length === 0 && !needle && (
                  <p className="dd-hint">{HINTS[col]}</p>
                )}

                {colCards.map((card) => {
                  const chips = chipsFor(card);
                  const name = card.company ?? card.title;
                  return (
                    <div
                      key={card.id}
                      className={`dd-card ${dragId === card.id ? "dd-dragging" : ""}`}
                      draggable
                      role="button"
                      tabIndex={0}
                      aria-label={`${name}${card.company && card.role ? `, ${card.role}` : ""}. Open details`}
                      onClick={() => setOpenId(card.id)}
                      onKeyDown={(e) => {
                        if (e.target !== e.currentTarget) return;
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setOpenId(card.id);
                        }
                      }}
                      onDragStart={(e) => onDragStart(e, card)}
                      onDragEnd={onDragEnd}
                    >
                      <span className="dd-card-title">{name}</span>
                      {card.company && card.role && (
                        <span className="dd-card-role">{card.role}</span>
                      )}
                      {card.location && (
                        <span className="dd-card-loc">{card.location}</span>
                      )}
                      {chips.length > 0 && (
                        <ul className="dd-chips">
                          {chips.map((c) => (
                            <li
                              key={c.key}
                              className={c.tone ? `tone-${c.tone}` : ""}
                            >
                              {c.text}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <NewApplicationDialog
        open={adding}
        stages={COLUMNS}
        onSave={addCard}
        onClose={() => setAdding(false)}
      />

      <ApplicationDialog
        onDetails={saveDetails}
        card={openCard}
        stages={COLUMNS}
        resumes={resumes}
        onMove={moveCard}
        onResume={setCardResume}
        onReminder={setCardReminder}
        onLetter={(id) => {
          setOpenId(null);
          setLetterCardId(id);
        }}
        onRemove={removeCard}
        onClose={() => setOpenId(null)}
      />

      <ImportGuideDialog
        open={guideOpen}
        onChoose={() => fileInput.current?.click()}
        onClose={() => setGuideOpen(false)}
      />
      <ImportDialog
        report={importReport}
        fileName={importFile}
        busy={importing}
        onConfirm={confirmImport}
        onClose={() => setImportReport(null)}
      />

      <CoverLetterDialog
        card={cards.find((c) => c.id === letterCardId) ?? null}
        student={student}
        onSaved={saveCoverLetter}
        onClose={() => setLetterCardId(null)}
      />
    </div>
  );
}

export default Tracker;
