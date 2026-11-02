import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "./ui.jsx";
import {
  OVERLEAF_CV_TEMPLATES,
  OVERLEAF_OPEN,
  TEMPLATES,
  buildResumeLatex,
  missingForResume,
} from "../utils/resumeLatex.js";
import "./ResumeBuilder.css";

function downloadTex(source) {
  const url = URL.createObjectURL(
    new Blob([source], { type: "application/x-tex" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "resume.tex";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Builds a resume from the profile in one of our LaTeX templates and hands it to Overleaf,
 * where the student can tweak it and download the PDF. Open by default when they have no resume.
 */
export function ResumeBuilder({ profile, hasResume }) {
  const [template, setTemplate] = useState("classic");
  const source = useMemo(
    () => (profile ? buildResumeLatex(profile, template) : ""),
    [profile, template],
  );
  const gaps = profile ? missingForResume(profile) : [];

  return (
    <details className="rb" open={!hasResume}>
      <summary className="rb-summary">
        <span>
          <strong>
            {hasResume
              ? "Build a new resume"
              : "No resume yet? Build one from your profile"}
          </strong>
          <small>Pick a template, polish it, then upload the PDF here.</small>
        </span>
      </summary>

      <div className="rb-body">
        <div
          className="rb-templates"
          role="radiogroup"
          aria-label="Resume template"
        >
          {TEMPLATES.map((t) => (
            <label
              key={t.id}
              className={`rb-tpl ${template === t.id ? "is-on" : ""}`}
            >
              <input
                type="radio"
                name="rb-template"
                value={t.id}
                checked={template === t.id}
                onChange={() => setTemplate(t.id)}
              />
              <span className="rb-tpl-name">{t.name}</span>
              <span className="rb-tpl-blurb">{t.blurb}</span>
            </label>
          ))}
        </div>

        {gaps.length > 0 && (
          <p className="rb-gaps">
            Your profile has no {gaps.join(", ")} yet, so those sections will be
            empty. <Link to="/profile">Fill them in first</Link> for a fuller
            resume.
          </p>
        )}

        <ol className="rb-steps">
          <li>
            Open it in Overleaf. It compiles automatically with your details
            filled in.
          </li>
          <li>
            Edit what you like (add experience), then choose <b>Download PDF</b>
            .
          </li>
          <li>
            Come back and upload the PDF in <b>Resume</b> above.
          </li>
        </ol>

        <div className="rb-actions">
          {/* Overleaf reads the LaTeX from a POSTed form; a hidden textarea keeps the line breaks. */}
          <form
            action={OVERLEAF_OPEN}
            method="post"
            target="_blank"
            rel="noopener noreferrer"
          >
            <textarea name="snip" value={source} readOnly hidden />
            <input type="hidden" name="snip_name" value="resume.tex" />
            <input type="hidden" name="engine" value="pdflatex" />
            <Button type="submit" disabled={!profile}>
              Open in Overleaf
            </Button>
          </form>
          <Button
            variant="ghost"
            disabled={!profile}
            onClick={() => downloadTex(source)}
          >
            Download .tex
          </Button>
          <a
            className="rb-more"
            href={OVERLEAF_CV_TEMPLATES}
            target="_blank"
            rel="noopener noreferrer"
          >
            Browse more CV templates on Overleaf ↗
          </a>
        </div>
      </div>
    </details>
  );
}

export default ResumeBuilder;
