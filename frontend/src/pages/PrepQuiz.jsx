import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { prep } from "../utils/prep";
import { Alert, Button, EmptyState, Skeleton } from "../components/ui.jsx";
import "./Prep.css";

export function PrepQuiz() {
  const [params] = useSearchParams();
  const companyId = params.get("company");
  const [deck, setDeck] = useState(null); // { total, cards }
  const [error, setError] = useState("");
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [missed, setMissed] = useState([]);
  const [gotCount, setGotCount] = useState(0);
  const [round, setRound] = useState(0); // bump to start another session

  useEffect(() => {
    prep.quiz(companyId).then(setDeck).catch((err) => setError(err.message));
  }, [companyId, round]);

  const startAgain = () => {
    setDeck(null);
    setIndex(0);
    setRevealed(false);
    setMissed([]);
    setGotCount(0);
    setRound((r) => r + 1);
  };

  const cards = deck?.cards ?? [];
  const card = cards[index];
  const finished = deck && cards.length > 0 && index >= cards.length;

  const answer = useCallback(
    async (result) => {
      if (!card || saving) return;
      setSaving(true);
      try {
        await prep.review(card.id, result);
        if (result === "got") setGotCount((n) => n + 1);
        else setMissed((m) => [...m, card]);
        setRevealed(false);
        setIndex((i) => i + 1);
        setError("");
      } catch (err) {
        setError(err.message);
      } finally {
        setSaving(false);
      }
    },
    [card, saving],
  );

  // Keyboard: Space shows the answer, then 1 = missed it, 2 = got it. No animation on these.
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.("input, textarea, select")) return;
      if (!card) return;
      if (!revealed && (e.key === " " || e.key === "Enter") && e.target === document.body) {
        e.preventDefault();
        setRevealed(true);
      } else if (revealed && e.key === "1") answer("missed");
      else if (revealed && e.key === "2") answer("got");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [card, revealed, answer]);

  const back = companyId ? `/prep?company=${companyId}` : "/prep";

  return (
    <div className="page prep-page">
      <header className="page-head">
        <Link to={back} className="pr-back">Back to prep</Link>
        <h1 className="page-title">Practice</h1>
        <p className="page-lede">
          Read the question, answer it out loud, then check your saved answer. Questions you get right come back less often.
        </p>
      </header>

      <Alert onDismiss={() => setError("")}>{error}</Alert>

      <div className="pr-quiz">
        {!deck && !error && <Skeleton height="260px" style={{ borderRadius: 14 }} />}

        {deck && deck.total === 0 && (
          <EmptyState title="No questions yet" action={<Button as={Link} to={back}>Add questions</Button>}>
            Log an interview round and save the questions you were asked. They show up here as practice cards.
          </EmptyState>
        )}

        {deck && deck.total > 0 && cards.length === 0 && (
          <EmptyState title="You're caught up" action={<Button as={Link} to={back} variant="ghost">Back to prep</Button>}>
            Nothing is due for review right now. Questions you've practiced return after a day or more.
          </EmptyState>
        )}

        {card && (
          <section className="pr-card" aria-label="Practice question">
            <div className="pr-card-top">
              <span className="pr-muted">{card.companyName}</span>
              <span className="pr-muted" aria-live="polite">Question {index + 1} of {cards.length}</span>
            </div>
            <span className="pr-progress-track" aria-hidden="true">
              <span className="pr-progress-fill" style={{ width: `${(index / cards.length) * 100}%` }} />
            </span>

            <p className="pr-card-q">{card.question}</p>

            {revealed ? (
              <div className="pr-card-a" aria-live="polite">
                <h2 className="pr-subh">Your saved answer</h2>
                {card.answer ? <p>{card.answer}</p> : <p className="pr-muted">You haven't saved an answer for this question. Add one from the company's Interviews tab.</p>}
              </div>
            ) : null}

            <div className="pr-card-actions">
              {!revealed ? (
                <Button onClick={() => setRevealed(true)}>Show answer</Button>
              ) : (
                <>
                  <Button variant="ghost" onClick={() => answer("missed")} loading={saving}>Missed it</Button>
                  <Button onClick={() => answer("got")} loading={saving}>Got it</Button>
                </>
              )}
            </div>
            <p className="pr-keys">
              {revealed ? "Press 1 for missed it, 2 for got it." : "Press Space to show the answer."}
            </p>
          </section>
        )}

        {finished && (
          <section className="pr-card pr-done" aria-label="Session summary">
            <h2 className="pr-done-title">You got {gotCount} of {cards.length}</h2>
            {missed.length > 0 ? (
              <>
                <p className="pr-muted">These come back tomorrow:</p>
                <ul className="pr-missed">{missed.map((m) => <li key={m.id}>{m.question}</li>)}</ul>
              </>
            ) : (
              <p className="pr-muted">Every question was right. They'll return in a few days to keep them fresh.</p>
            )}
            <div className="pr-card-actions">
              <Button variant="ghost" onClick={startAgain}>Check for more</Button>
              <Button as={Link} to={back}>Back to prep</Button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default PrepQuiz;
