import { useEffect, useRef, useState } from "react";
import { api } from "../utils/api";
import {
  MAX_COVER_LETTER,
  countPlaceholders,
  countWords,
  draftCoverLetter,
} from "../utils/coverLetter";
import { Alert, Button } from "./ui.jsx";
import "./CoverLetterDialog.css";

/** Edit the cover letter for one tracker card. `card` is null when closed. */
export function CoverLetterDialog({ card, student, onSaved, onClose }) {
  const ref = useRef(null);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [discardArmed, setDiscardArmed] = useState(false);
  const [replaceArmed, setReplaceArmed] = useState(false);

  const saved = card?.coverLetter ?? "";
  const dirty = text !== saved;

  // Load the saved letter each time the dialog opens for a card.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (card && !dialog.open) {
      setText(card.coverLetter ?? "");
      setError("");
      setNote("");
      setDiscardArmed(false);
      setReplaceArmed(false);
      dialog.showModal();
    }
    if (!card && dialog.open) dialog.close();
  }, [card]);

  const requestClose = () => {
    if (dirty && !discardArmed) {
      setDiscardArmed(true); // first press warns, second discards
      return;
    }
    onClose();
  };

  const useTemplate = () => {
    if (text.trim() && !replaceArmed) {
      setReplaceArmed(true); // first press warns, second replaces
      return;
    }
    setText(draftCoverLetter(card, student));
    setDiscardArmed(false);
    setReplaceArmed(false);
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await api(`/tracker/${card.id}`, { method: "PATCH", body: { coverLetter: text } });
      onSaved(card.id, text);
      setNote("Saved");
      setDiscardArmed(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setNote("Copied to clipboard");
    } catch {
      setError("Couldn't copy. Select the text and copy it manually.");
    }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `cover-letter-${(card.company || card.title).replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const placeholders = countPlaceholders(text);
  const hasText = text.trim().length > 0;

  return (
    <dialog
      ref={ref}
      className="dialog-ui cl-dialog"
      aria-labelledby="cl-title"
      onCancel={(e) => {
        e.preventDefault();
        requestClose();
      }}
    >
      <h2 id="cl-title">Cover letter</h2>
      <p className="cl-sub">{card?.title}</p>

      <label className="sr-only" htmlFor="cl-text">Cover letter text</label>
      <textarea
        id="cl-text"
        className="field-input field-input--area cl-text"
        value={text}
        maxLength={MAX_COVER_LETTER}
        placeholder="Write your cover letter, or start from a draft."
        onChange={(e) => {
          setText(e.target.value);
          setNote("");
          setDiscardArmed(false);
        }}
      />

      <div className="cl-meta" aria-live="polite">
        <span>{countWords(text)} words</span>
        {placeholders > 0 && (
          <span className="cl-warn">
            {placeholders} {placeholders === 1 ? "placeholder" : "placeholders"} still in [brackets]
          </span>
        )}
        {note && <span className="cl-ok">{note}</span>}
        {dirty && !note && <span>Unsaved changes</span>}
      </div>

      <Alert onDismiss={() => setError("")}>{error}</Alert>
      {discardArmed && (
        <p className="cl-discard" role="alert">
          You have unsaved changes. Choose Discard changes to close without saving.
        </p>
      )}

      <div className="cl-actions">
        <div className="cl-tools">
          <Button variant="ghost" size="sm" onClick={useTemplate}>
            {replaceArmed ? "Replace my text?" : hasText ? "Start a new draft" : "Start from a draft"}
          </Button>
          <Button variant="ghost" size="sm" onClick={copy} disabled={!hasText}>Copy</Button>
          <Button variant="ghost" size="sm" onClick={download} disabled={!hasText}>Download .txt</Button>
        </div>
        <div className="cl-main">
          <Button variant="ghost" onClick={requestClose}>
            {discardArmed ? "Discard changes" : "Close"}
          </Button>
          <Button onClick={save} loading={saving} disabled={!dirty}>Save</Button>
        </div>
      </div>
    </dialog>
  );
}
