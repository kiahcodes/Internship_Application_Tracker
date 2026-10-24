import { useEffect, useMemo, useState } from "react";
import { LC_WINDOWS, prep } from "../../utils/prep";
import { Button, EmptyState, Skeleton } from "../ui.jsx";

const PAGE = 50;
const DIFFICULTIES = ["Easy", "Medium", "Hard"];

export function QuestionsTab({ detail, update, onError }) {
  const { company, links } = detail;
  const [window, setWindow] = useState("all");
  const [data, setData] = useState(null);
  const [difficulty, setDifficulty] = useState("");
  const [search, setSearch] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    let live = true;
    prep.leetcode(company.id, window)
      .then((d) => live && setData(d))
      .catch((err) => { if (live) { onError(err.message); setData({ window, available: true, problems: [] }); } });
    return () => { live = false; };
  }, [company.id, window, onError]);

  // "Saved" follows the Links tab, so removing a link there frees the button here.
  const savedUrls = useMemo(() => new Set(links.map((l) => l.url)), [links]);

  // The previous window's list stays in `data` until the new one arrives.
  const ready = data?.window === window ? data : null;

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (ready?.problems ?? []).filter((p) => (!difficulty || p.difficulty === difficulty) && (!q || p.title.toLowerCase().includes(q)));
  }, [ready, difficulty, search]);

  const save = async (p) => {
    setSaving(p.url);
    try {
      const link = await prep.addLink(company.id, { title: p.title, url: p.url, kind: "dsa" });
      update((d) => ({ ...d, links: [...d.links, link] }));
    } catch (err) {
      onError(err.message);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div>
      <div className="pr-form pr-form--lc">
        <div className="field">
          <label className="field-label" htmlFor="lc-window">Asked in</label>
          <select id="lc-window" className="field-input" value={window} onChange={(e) => { setWindow(e.target.value); setShown(PAGE); }}>
            {LC_WINDOWS.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="lc-diff">Difficulty</label>
          <select id="lc-diff" className="field-input" value={difficulty} onChange={(e) => { setDifficulty(e.target.value); setShown(PAGE); }}>
            <option value="">All</option>
            {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="lc-search">Search</label>
          <input id="lc-search" className="field-input" type="search" value={search} placeholder="Two Sum" onChange={(e) => { setSearch(e.target.value); setShown(PAGE); }} />
        </div>
      </div>

      {!ready ? (
        <div aria-busy="true" aria-label="Loading questions">
          <Skeleton height="44px" style={{ marginBottom: 8 }} />
          <Skeleton height="44px" style={{ marginBottom: 8 }} />
          <Skeleton height="44px" />
        </div>
      ) : !ready.available ? (
        <EmptyState title={`No question list for ${company.name}`}>
          The open-source list doesn't have this company, or lists it under a different name. You can still save problems yourself in the Links tab.
        </EmptyState>
      ) : rows.length === 0 ? (
        <EmptyState title="No matching questions">
          {ready.problems.length === 0 ? "Nothing was reported for this time range. Try a longer one." : "Try a different difficulty or search."}
        </EmptyState>
      ) : (
        <>
          <p className="pr-muted" aria-live="polite">{rows.length} {rows.length === 1 ? "problem" : "problems"}, most asked first</p>
          <ul className="pr-links pr-lc">
            {rows.slice(0, shown).map((p) => {
              const saved = savedUrls.has(p.url);
              return (
                <li key={p.url}>
                  <a href={p.url} target="_blank" rel="noopener noreferrer">{p.title}<span className="sr-only"> (opens in a new tab)</span></a>
                  <span className={`pr-diff pr-diff--${p.difficulty.toLowerCase()}`}>{p.difficulty}</span>
                  <span className="pr-host" title="Share of this company's reported questions that include it">{Math.round(p.frequency)}% freq</span>
                  <Button size="sm" variant={saved ? "ghost" : "soft"} disabled={saved} loading={saving === p.url} onClick={() => save(p)} aria-label={`${saved ? "Saved" : "Save"} ${p.title} to links`}>
                    {saved ? "Saved" : "Save"}
                  </Button>
                </li>
              );
            })}
          </ul>
          {rows.length > shown && (
            <Button variant="ghost" onClick={() => setShown((n) => n + PAGE)} style={{ marginTop: 12 }}>
              Show more ({rows.length - shown} left)
            </Button>
          )}
        </>
      )}
    </div>
  );
}
