import { useState } from "react";
import { Alert, Button, Field, Modal } from "./ui.jsx";
import { describeDeadline, formatDay } from "../utils/internships";
import "./ApplicationDialog.css";

/** Everything about one application, in one place. The board cards only show the signals. */
export function ApplicationDialog({
  card,
  stages,
  resumes,
  onMove,
  onResume,
  onDetails,
  onReminder,
  onLetter,
  onRemove,
  onClose,
}) {
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const startEdit = () => {
    setDraft({
      company: card.company ?? "",
      role: card.role ?? "",
      location: card.location ?? "",
      link: card.postingUrl ?? "",
      deadline: card.deadline ?? "",
    });
    setError("");
    setEditing(true);
  };
  const saveEdit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onDetails(card, draft);
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const setField = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));
  const close = () => {
    setConfirming(false);
    setEditing(false);
    onClose();
  };
  const name = card ? (card.company ?? card.title) : "";
  const hasLetter = card && (card.coverLetter || card.coverLetterId);
  const deadline = card?.deadline ? describeDeadline(card.deadline) : null;

  return (
    <Modal open={!!card} title={name} onClose={close}>
      {card && (
        <div className="ad">
          {(card.role || card.location || card.postingUrl) && (
            <p className="ad-sub">
              {[card.role, card.location].filter(Boolean).join(" · ")}
              {card.postingUrl && (
                <>
                  {card.role || card.location ? " " : ""}
                  <a
                    href={card.postingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View posting ↗
                  </a>
                </>
              )}
            </p>
          )}

          {card.editable &&
            (editing ? (
              <form className="ad-edit" onSubmit={saveEdit}>
                <Alert onDismiss={() => setError("")}>{error}</Alert>
                <div className="na-grid">
                  <Field label="Company" id="ad-company" value={draft.company} onChange={setField("company")} maxLength={100} />
                  <Field label="Role" id="ad-role" value={draft.role} onChange={setField("role")} maxLength={150} />
                  <Field label="Location" id="ad-location" value={draft.location} onChange={setField("location")} maxLength={100} />
                  <Field label="Deadline" id="ad-deadline" type="date" value={draft.deadline} onChange={setField("deadline")} />
                  <Field label="Posting link" id="ad-link" inputMode="url" value={draft.link} onChange={setField("link")} maxLength={500} className="na-wide" />
                </div>
                <div className="na-foot">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
                  <Button type="submit" size="sm" loading={busy}>Save details</Button>
                </div>
              </form>
            ) : (
              <p>
                <button type="button" className="link-btn" onClick={startEdit}>
                  Edit company, role, location, link and deadline
                </button>
              </p>
            ))}

          <fieldset className="ad-stages">
            <legend>Stage</legend>
            <div role="radiogroup" aria-label="Stage">
              {stages.map((s) => (
                <label
                  key={s}
                  className={`ad-stage ad-${s.toLowerCase()} ${card.status === s ? "is-on" : ""}`}
                >
                  <input
                    type="radio"
                    name={`stage-${card.id}`}
                    checked={card.status === s}
                    onChange={() => onMove(card.id, s)}
                  />
                  {s}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="ad-row">
            <label htmlFor="ad-resume">Resume you sent</label>
            <select
              id="ad-resume"
              className="field-input"
              value={card.resumeId ?? ""}
              onChange={(e) => onResume(card, e.target.value)}
            >
              <option value="">None</option>
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.fileName}
                  {r.current ? " (current)" : ""}
                </option>
              ))}
              {card.resumeId &&
                !resumes.some((r) => r.id === card.resumeId) && (
                  <option value={card.resumeId}>{card.resumeName}</option>
                )}
            </select>
          </div>

          <div className="ad-row">
            <label htmlFor="ad-remind">Remind me on</label>
            <div className="ad-inline">
              <input
                id="ad-remind"
                type="date"
                className="field-input"
                value={card.remindOn ?? ""}
                onChange={(e) => onReminder(card, e.target.value)}
              />
              {card.remindOn && (
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => onReminder(card, "")}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {deadline && (
            <p className={`ad-deadline tone-${deadline.tone}`}>
              Posting deadline: {formatDay(card.deadline)} (
              {deadline.text.toLowerCase()})
            </p>
          )}

          <div className="ad-row">
            <span className="ad-label">Cover letter</span>
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onLetter(card.id)}
              >
                {hasLetter ? "Edit cover letter" : "Write cover letter"}
              </Button>
            </div>
          </div>

          <div className="ad-foot">
            {confirming ? (
              <>
                <span>Remove this application?</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirming(false)}
                >
                  Keep
                </Button>
                <Button
                  size="sm"
                  className="ad-danger"
                  onClick={() => onRemove(card.id)}
                >
                  Remove
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="ad-remove"
                onClick={() => setConfirming(true)}
              >
                Remove application
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

export default ApplicationDialog;
