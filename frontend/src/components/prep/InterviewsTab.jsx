import { useId, useState } from "react";
import { ROUND_TYPES, prep } from "../../utils/prep";
import { Button, ConfirmDialog, EmptyState, Field } from "../ui.jsx";

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "No date";
const toInput = (d) => (d ? new Date(d).toLocaleDateString("en-CA") : "");

/** One question: shows the answer on demand, and edits in place. */
function Question({ q, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ question: q.question, answer: q.answer });
  const [busy, setBusy] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    if (await onSave(q.id, draft)) setEditing(false);
    setBusy(false);
  };

  if (editing) {
    return (
      <li className="pr-q">
        <form className="pr-qform" onSubmit={save}>
          <Field id={`q-${q.id}`} label="Question" multiline required maxLength={2000} value={draft.question} onChange={(e) => setDraft({ ...draft, question: e.target.value })} />
          <Field id={`a-${q.id}`} label="Your answer" multiline maxLength={4000} value={draft.answer} onChange={(e) => setDraft({ ...draft, answer: e.target.value })} />
          <div className="pr-row">
            <Button type="submit" size="sm" loading={busy}>Save</Button>
            <Button variant="ghost" size="sm" onClick={() => { setDraft({ question: q.question, answer: q.answer }); setEditing(false); }}>Cancel</Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="pr-q">
      <p className="pr-q-text">{q.question}</p>
      {q.answer ? (
        <details className="pr-ans">
          <summary>Your answer</summary>
          <p>{q.answer}</p>
        </details>
      ) : (
        <p className="pr-muted">No answer saved yet.</p>
      )}
      <div className="pr-row">
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)} aria-label={`Edit question: ${q.question.slice(0, 40)}`}>Edit</Button>
        <Button variant="ghost" size="sm" className="btn-delete" onClick={() => onDelete(q)} aria-label={`Delete question: ${q.question.slice(0, 40)}`}>Delete</Button>
      </div>
    </li>
  );
}

function AddQuestion({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ question: "", answer: "" });
  const [busy, setBusy] = useState(false);
  const id = useId();

  if (!open) return <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>Add a question</Button>;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    if (await onAdd(draft)) {
      setDraft({ question: "", answer: "" });
      setOpen(false);
    }
    setBusy(false);
  };

  return (
    <form className="pr-qform" onSubmit={submit}>
      <Field id={`${id}-q`} label="Question asked" multiline required maxLength={2000} value={draft.question} onChange={(e) => setDraft({ ...draft, question: e.target.value })} />
      <Field id={`${id}-a`} label="How you answered, or how you'd answer now" multiline maxLength={4000} value={draft.answer} onChange={(e) => setDraft({ ...draft, answer: e.target.value })} hint="Optional. It's what the quiz shows when you reveal the answer." />
      <div className="pr-row">
        <Button type="submit" size="sm" loading={busy} disabled={!draft.question.trim()}>Save question</Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}

function Round({ round, questions, onUpdateRound, onDeleteRound, onAddQ, onSaveQ, onDeleteQ }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ roundType: round.roundType, heldOn: toInput(round.heldOn), reflection: round.reflection });
  const [busy, setBusy] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    if (await onUpdateRound(round.id, draft)) setEditing(false);
    setBusy(false);
  };

  return (
    <section className="pr-round" aria-label={`${round.roundType} round`}>
      <header className="pr-round-head">
        <div>
          <h3 className="pr-round-title">{round.roundType}</h3>
          <p className="pr-muted">{fmtDate(round.heldOn)} · {questions.length} {questions.length === 1 ? "question" : "questions"}</p>
        </div>
        <div className="pr-row">
          <Button variant="ghost" size="sm" onClick={() => setEditing(!editing)} aria-expanded={editing}>{editing ? "Close" : "Edit round"}</Button>
          <Button variant="ghost" size="sm" className="btn-delete" onClick={() => onDeleteRound(round)}>Delete</Button>
        </div>
      </header>

      {editing ? (
        <form className="pr-qform" onSubmit={save}>
          <div className="pr-form-grid">
            <div className="field">
              <label className="field-label" htmlFor={`rt-${round.id}`}>Round type</label>
              <select id={`rt-${round.id}`} className="field-input" value={draft.roundType} onChange={(e) => setDraft({ ...draft, roundType: e.target.value })}>
                {ROUND_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <Field id={`rd-${round.id}`} label="Date" type="date" value={draft.heldOn} onChange={(e) => setDraft({ ...draft, heldOn: e.target.value })} />
          </div>
          <Field id={`rr-${round.id}`} label="Reflection" multiline maxLength={4000} value={draft.reflection} onChange={(e) => setDraft({ ...draft, reflection: e.target.value })} hint="What went well, what you'd do differently." />
          <div className="pr-row"><Button type="submit" size="sm" loading={busy}>Save round</Button></div>
        </form>
      ) : round.reflection ? (
        <div className="pr-reflect">
          <h4 className="pr-subh">Reflection</h4>
          <p>{round.reflection}</p>
        </div>
      ) : null}

      <ul className="pr-qs">
        {questions.map((q) => <Question key={q.id} q={q} onSave={onSaveQ} onDelete={onDeleteQ} />)}
      </ul>
      <AddQuestion onAdd={(d) => onAddQ(d, round.id)} />
    </section>
  );
}

export function InterviewsTab({ detail, update, onError }) {
  const { company, rounds, questions } = detail;
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ roundType: "Technical", heldOn: "", reflection: "" });
  const [busy, setBusy] = useState(false);
  const [pendingRound, setPendingRound] = useState(null);
  const [pendingQ, setPendingQ] = useState(null);

  // Each helper returns true on success so forms know whether to close.
  const attempt = async (fn) => {
    try {
      await fn();
      return true;
    } catch (err) {
      onError(err.message);
      return false;
    }
  };

  const addRound = async (e) => {
    e.preventDefault();
    setBusy(true);
    const ok = await attempt(async () => {
      const round = await prep.addRound(company.id, draft);
      update((d) => ({ ...d, rounds: [round, ...d.rounds] }));
    });
    if (ok) { setDraft({ roundType: "Technical", heldOn: "", reflection: "" }); setAdding(false); }
    setBusy(false);
  };

  const updateRound = (id, patch) =>
    attempt(async () => {
      const round = await prep.updateRound(id, patch);
      update((d) => ({ ...d, rounds: d.rounds.map((r) => (r.id === id ? round : r)) }));
    });

  const deleteRound = async () => {
    await attempt(async () => {
      await prep.deleteRound(pendingRound.id);
      // The server keeps the questions; they move to the company's question bank.
      update((d) => ({
        ...d,
        rounds: d.rounds.filter((r) => r.id !== pendingRound.id),
        questions: d.questions.map((q) => (q.roundId === pendingRound.id ? { ...q, roundId: null } : q)),
      }));
    });
    setPendingRound(null);
  };

  const addQuestion = (draftQ, roundId) =>
    attempt(async () => {
      const q = await prep.addQuestion(company.id, { ...draftQ, roundId });
      update((d) => ({ ...d, questions: [...d.questions, q] }));
    });

  const saveQuestion = (id, patch) =>
    attempt(async () => {
      const q = await prep.updateQuestion(id, patch);
      update((d) => ({ ...d, questions: d.questions.map((x) => (x.id === id ? q : x)) }));
    });

  const deleteQuestion = async () => {
    await attempt(async () => {
      await prep.deleteQuestion(pendingQ.id);
      update((d) => ({ ...d, questions: d.questions.filter((q) => q.id !== pendingQ.id) }));
    });
    setPendingQ(null);
  };

  const bank = questions.filter((q) => q.roundId === null);

  return (
    <div>
      <div className="pr-tabbar">
        {adding ? null : <Button onClick={() => setAdding(true)}>Add an interview round</Button>}
      </div>

      {adding && (
        <form className="pr-qform pr-newround" onSubmit={addRound}>
          <div className="pr-form-grid">
            <div className="field">
              <label className="field-label" htmlFor="nr-type">Round type</label>
              <select id="nr-type" className="field-input" value={draft.roundType} onChange={(e) => setDraft({ ...draft, roundType: e.target.value })}>
                {ROUND_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <Field id="nr-date" label="Date" type="date" value={draft.heldOn} onChange={(e) => setDraft({ ...draft, heldOn: e.target.value })} />
          </div>
          <Field id="nr-ref" label="Reflection" multiline maxLength={4000} value={draft.reflection} onChange={(e) => setDraft({ ...draft, reflection: e.target.value })} hint="Optional. You can write this after the interview." />
          <div className="pr-row">
            <Button type="submit" loading={busy}>Save round</Button>
            <Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {rounds.length === 0 && bank.length === 0 && !adding && (
        <EmptyState title="No interviews logged">
          After each round, note the questions you were asked, how you answered and what you'd change. They become your quiz.
        </EmptyState>
      )}

      {rounds.map((round) => (
        <Round
          key={round.id}
          round={round}
          questions={questions.filter((q) => q.roundId === round.id)}
          onUpdateRound={updateRound}
          onDeleteRound={setPendingRound}
          onAddQ={addQuestion}
          onSaveQ={saveQuestion}
          onDeleteQ={setPendingQ}
        />
      ))}

      <section className="pr-round" aria-label="Question bank">
        <header className="pr-round-head">
          <div>
            <h3 className="pr-round-title">Question bank</h3>
            <p className="pr-muted">Questions for {company.name} that aren't tied to a round.</p>
          </div>
        </header>
        <ul className="pr-qs">
          {bank.map((q) => <Question key={q.id} q={q} onSave={saveQuestion} onDelete={setPendingQ} />)}
        </ul>
        {bank.length === 0 && <p className="pr-muted">Nothing here yet.</p>}
        <AddQuestion onAdd={(d) => addQuestion(d, null)} />
      </section>

      <ConfirmDialog open={!!pendingRound} title="Delete this round?" confirmLabel="Delete round" onConfirm={deleteRound} onCancel={() => setPendingRound(null)}>
        The round and your reflection are deleted. Its questions stay in the question bank.
      </ConfirmDialog>
      <ConfirmDialog open={!!pendingQ} title="Delete this question?" confirmLabel="Delete question" onConfirm={deleteQuestion} onCancel={() => setPendingQ(null)}>
        {pendingQ && `"${pendingQ.question.slice(0, 120)}" and your answer will be deleted.`}
      </ConfirmDialog>
    </div>
  );
}
