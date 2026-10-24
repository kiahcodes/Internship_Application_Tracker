import { useEffect, useState } from "react";
import { api } from "../utils/api";
import { Modal, Skeleton } from "./ui.jsx";
import {
  MODE_LABEL, describeDeadline, eligibilityIssues, eligibilityText,
  formatDuration, formatPosted, formatStipend,
} from "../utils/internships";

/** The full posting in a popup. `item` is the list row (shown instantly); the description loads on open. */
export function InternshipDetail({ item, profile, onClose, actions }) {
  const [full, setFull] = useState(null); // { id, ...posting }
  const [failed, setFailed] = useState(false);
  const id = item?.id;

  useEffect(() => {
    if (!id) return;
    let stale = false;
    api(`/internships/${id}`)
      .then((data) => { if (!stale) { setFull(data); setFailed(false); } })
      .catch(() => { if (!stale) setFailed(true); });
    return () => { stale = true; };
  }, [id]);

  const shown = item && { ...item, ...(full?.id === id ? { description: full.description } : {}) };
  const loadingText = item && !failed && full?.id !== id;
  const deadline = shown && describeDeadline(shown.deadline);
  const facts = shown && [
    ["Stipend", formatStipend(shown) ?? "Not listed"],
    ["Duration", formatDuration(shown.duration_months) ?? "Not listed"],
    ["Work mode", MODE_LABEL[shown.work_mode]],
    ["Deadline", deadline ? deadline.text : "Not listed"],
    ["Who can apply", eligibilityText(shown) ?? "Open to everyone"],
    ["Posted", formatPosted(shown.posted_at) ?? "Date not listed"],
  ];
  const issues = shown ? eligibilityIssues(shown, profile) : [];

  return (
    <Modal open={!!item} title={shown ? `${shown.role}` : ""} onClose={onClose}>
      {shown && (
        <>
          <p className="detail-company">
            {shown.company} · {shown.location}
            {shown.distance != null && shown.distance >= 5 && ` · ${Math.round(shown.distance)} km away`}
          </p>

          {issues.length > 0 && (
            <div className="detail-warn" role="note">
              <strong>You may not be eligible</strong>
              <ul>{issues.map((t) => <li key={t}>{t}</li>)}</ul>
            </div>
          )}

          <dl className="detail-facts">
            {facts.map(([label, value]) => (
              <div key={label} className={label === "Deadline" && deadline ? `tone-${deadline.tone}` : undefined}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>

          {shown.matched?.length > 0 && (
            <div className="match">
              <p className="match-count">Matches {shown.matched.length} of your skills</p>
              <ul className="match-list" aria-label="Matching skills">
                {shown.matched.map((s) => <li key={s}>{s}</li>)}
              </ul>
            </div>
          )}

          <h3 className="detail-h">About this role</h3>
          {loadingText ? (
            <div aria-busy="true"><Skeleton height="0.9rem" /><Skeleton width="85%" height="0.9rem" style={{ marginTop: 8 }} /><Skeleton width="60%" height="0.9rem" style={{ marginTop: 8 }} /></div>
          ) : failed ? (
            <p className="detail-empty">Couldn't load the description. Close this and try again.</p>
          ) : shown.description ? (
            <p className="detail-desc">{shown.description}</p>
          ) : (
            <p className="detail-empty">
              {shown.source === "internshala"
                ? "Internshala doesn't share the full description here. Open the listing for the details."
                : "No description was provided. Check the posting for details."}
            </p>
          )}

          {actions(shown)}
        </>
      )}
    </Modal>
  );
}
