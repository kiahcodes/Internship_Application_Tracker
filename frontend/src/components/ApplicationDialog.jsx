import { useState } from "react";
import { Button, Modal } from "./ui.jsx";
import { describeDeadline, formatDay } from "../utils/internships";
import "./ApplicationDialog.css";

/** Everything about one application, in one place. The board cards only show the signals. */
export function ApplicationDialog({
  card,
  stages,
  resumes,
  onMove,
  onResume,
  onReminder,
  onLetter,
  onRemove,
  onClose,
}) {
  const [confirming, setConfirming] = useState(false);
  const close = () => {
    setConfirming(false);
    onClose();
  };
  const name = card ? (card.company ?? card.title) : "";
  const hasLetter = card && (card.coverLetter || card.coverLetterId);
  const deadline = card?.deadline ? describeDeadline(card.deadline) : null;

  return (
    <Modal open={!!card} title={name} onClose={close}>
      {card && (
        <div className="ad">
          {(card.role || card.postingUrl) && (
            <p className="ad-sub">
              {card.role}
              {card.postingUrl && (
                <>
                  {card.role ? " " : ""}
                  <a href={card.postingUrl} target="_blank" rel="noopener noreferrer">View posting ↗</a>
                </>
              )}
            </p>
          )}

          <fieldset className="ad-stages">
            <legend>Stage</legend>
            <div role="radiogroup" aria-label="Stage">
              {stages.map((s) => (
                <label key={s} className={`ad-stage ad-${s.toLowerCase()} ${card.status === s ? "is-on" : ""}`}>
                  <input type="radio" name={`stage-${card.id}`} checked={card.status === s} onChange={() => onMove(card.id, s)} />
                  {s}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="ad-row">
            <label htmlFor="ad-resume">Resume you sent</label>
            <select id="ad-resume" className="field-input" value={card.resumeId ?? ""} onChange={(e) => onResume(card, e.target.value)}>
              <option value="">None</option>
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>{r.fileName}{r.current ? " (current)" : ""}</option>
              ))}
              {card.resumeId && !resumes.some((r) => r.id === card.resumeId) && (
                <option value={card.resumeId}>{card.resumeName}</option>
              )}
            </select>
          </div>

          <div className="ad-row">
            <label htmlFor="ad-remind">Remind me on</label>
            <div className="ad-inline">
              <input id="ad-remind" type="date" className="field-input" value={card.remindOn ?? ""} onChange={(e) => onReminder(card, e.target.value)} />
              {card.remindOn && (
                <button type="button" className="link-btn" onClick={() => onReminder(card, "")}>Clear</button>
              )}
            </div>
            <span className="ad-help">Follow up, check for a result, or prepare for a test. It shows under “Needs attention” when it’s close.</span>
          </div>

          {deadline && (
            <p className={`ad-deadline tone-${deadline.tone}`}>
              Posting deadline: {formatDay(card.deadline)} ({deadline.text.toLowerCase()})
            </p>
          )}

          <div className="ad-row">
            <span className="ad-label">Cover letter</span>
            <div>
              <Button variant="ghost" size="sm" onClick={() => onLetter(card.id)}>
                {hasLetter ? "Edit cover letter" : "Write cover letter"}
              </Button>
            </div>
          </div>

          <div className="ad-foot">
            {confirming ? (
              <>
                <span>Remove this application?</span>
                <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>Keep</Button>
                <Button size="sm" className="ad-danger" onClick={() => onRemove(card.id)}>Remove</Button>
              </>
            ) : (
              <Button variant="ghost" size="sm" className="ad-remove" onClick={() => setConfirming(true)}>Remove application</Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

export default ApplicationDialog;
