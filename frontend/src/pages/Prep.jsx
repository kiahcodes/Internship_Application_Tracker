import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { prep } from "../utils/prep";
import { Alert, Button, ConfirmDialog, EmptyState, Skeleton } from "../components/ui.jsx";
import { ChecklistTab } from "../components/prep/ChecklistTab.jsx";
import { InterviewsTab } from "../components/prep/InterviewsTab.jsx";
import { LinksTab } from "../components/prep/LinksTab.jsx";
import "./Prep.css";

const TABS = [
  { id: "checklist", label: "Checklist" },
  { id: "interviews", label: "Interviews" },
  { id: "links", label: "Links" },
];

function Workspace({ companyId, onChanged, onDeleted }) {
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("checklist");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    prep.company(companyId).then(setDetail).catch((err) => setError(err.message));
    return () => clearTimeout(timer.current);
  }, [companyId]);

  // Apply a change locally, then let the company list refresh its counts shortly after.
  const update = (fn) => {
    setDetail(fn);
    clearTimeout(timer.current);
    timer.current = setTimeout(onChanged, 400);
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await prep.deleteCompany(companyId);
      onDeleted();
    } catch (err) {
      setError(err.message);
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const onKeyDown = (e) => {
    const i = TABS.findIndex((t) => t.id === tab);
    const next = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : null;
    if (next === null) return;
    e.preventDefault();
    const target = TABS[(next + TABS.length) % TABS.length];
    setTab(target.id);
    document.getElementById(`tab-${target.id}`)?.focus();
  };

  if (error && !detail) return <Alert>{error}</Alert>;
  if (!detail) {
    return (
      <div aria-busy="true" aria-label="Loading company">
        <Skeleton width="50%" height="2.4rem" style={{ marginBottom: 16 }} />
        <Skeleton height="180px" style={{ borderRadius: 10 }} />
      </div>
    );
  }

  const { company, items, rounds, questions } = detail;
  const counts = { checklist: items.length, interviews: rounds.length + questions.length, links: detail.links.length };

  return (
    <div className="pr-work">
      <header className="pr-work-head">
        <div>
          <h2 className="pr-work-title">{company.name}</h2>
          <p className="pr-muted">
            {rounds.length} {rounds.length === 1 ? "round" : "rounds"} · {questions.length} {questions.length === 1 ? "question" : "questions"} saved
          </p>
        </div>
        <div className="pr-row">
          <Button as={Link} to={`/prep/quiz?company=${company.id}`} variant="soft" size="sm" aria-disabled={questions.length === 0}>
            Practice questions
          </Button>
          <Button variant="ghost" size="sm" className="btn-delete" onClick={() => setConfirmDelete(true)}>Delete company</Button>
        </div>
      </header>

      <Alert onDismiss={() => setError("")}>{error}</Alert>

      <div className="pr-tabs" role="tablist" aria-label={`${company.name} prep`} onKeyDown={onKeyDown}>
        {TABS.map((t) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            className={`pr-tab ${tab === t.id ? "pr-tab--on" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {counts[t.id] > 0 && <span className="pr-tab-count">{counts[t.id]}</span>}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="pr-panel">
        {tab === "checklist" && <ChecklistTab detail={detail} update={update} onError={setError} />}
        {tab === "interviews" && <InterviewsTab detail={detail} update={update} onError={setError} />}
        {tab === "links" && <LinksTab detail={detail} update={update} onError={setError} />}
      </div>

      <ConfirmDialog open={confirmDelete} title={`Delete ${company.name}?`} confirmLabel="Delete company" busy={deleting} onConfirm={remove} onCancel={() => setConfirmDelete(false)}>
        Its checklist, links, interview rounds and saved questions are deleted. This can't be undone.
      </ConfirmDialog>
    </div>
  );
}

export function Prep() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const selectedId = Number(params.get("company")) || null;
  const [list, setList] = useState(null);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const workRef = useRef(null);

  const refresh = useCallback(
    () => prep.companies().then(setList).catch((err) => setError(err.message)),
    [],
  );
  useEffect(() => {
    refresh();
  }, [refresh]);

  const select = (id) => {
    setParams({ company: String(id) });
    workRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const addCompany = async (companyName) => {
    setAdding(true);
    try {
      const c = await prep.addCompany(companyName);
      await refresh();
      select(c.id);
      setName("");
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  };

  const due = list?.companies.reduce((n, c) => n + c.due, 0) ?? 0;

  return (
    <div className="page prep-page">
      <header className="page-head rise">
        <div className="pr-head-row">
          <div>
            <h1 className="page-title">Interview prep</h1>
            <p className="page-lede">A checklist, your past interview questions and links for each company, in one place.</p>
          </div>
          <Button as={Link} to="/prep/quiz" variant={due > 0 ? "primary" : "ghost"}>
            {due > 0 ? `Practice ${due} due ${due === 1 ? "question" : "questions"}` : "Practice questions"}
          </Button>
        </div>
      </header>

      <Alert onDismiss={() => setError("")}>{error}</Alert>

      <div className="pr-layout rise" style={{ "--i": 1 }}>
        <aside className="pr-side" aria-label="Companies">
          <h2 className="pr-subh">Companies</h2>

          {!list ? (
            <div aria-busy="true" className="pr-skel">
              <Skeleton height="52px" style={{ borderRadius: 8 }} />
              <Skeleton height="52px" style={{ borderRadius: 8 }} />
            </div>
          ) : (
            <ul className="pr-companies">
              {list.companies.map((c) => (
                <li key={c.id}>
                  <button type="button" className={`pr-co ${selectedId === c.id ? "pr-co--on" : ""}`} aria-current={selectedId === c.id ? "true" : undefined} onClick={() => select(c.id)}>
                    <span className="pr-co-name">{c.name}</span>
                    <span className="pr-co-meta">
                      {c.itemsTotal > 0 ? `${c.itemsDone}/${c.itemsTotal} checklist` : "No checklist"}
                      {c.due > 0 && <span className="pr-due">{c.due} due</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form className="pr-newco" onSubmit={(e) => { e.preventDefault(); if (name.trim()) addCompany(name); }}>
            <label className="sr-only" htmlFor="pr-co">Add a company</label>
            <input id="pr-co" className="field-input" value={name} maxLength={100} placeholder="Add a company" onChange={(e) => setName(e.target.value)} />
            <Button type="submit" size="sm" loading={adding} disabled={!name.trim()}>Add</Button>
          </form>

          {list && list.suggestions.length > 0 && (
            <div className="pr-suggest">
              <h3 className="pr-subh">From your applications</h3>
              <ul>
                {list.suggestions.map((s) => (
                  <li key={s}>
                    <button type="button" className="pr-chip" onClick={() => addCompany(s)} aria-label={`Start prep for ${s}`}>
                      + {s}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>

        <main className="pr-main" ref={workRef}>
          {selectedId ? (
            <Workspace
              key={selectedId}
              companyId={selectedId}
              onChanged={refresh}
              onDeleted={() => { navigate("/prep", { replace: true }); refresh(); }}
            />
          ) : list && list.companies.length === 0 ? (
            <EmptyState title="Start with one company">
              Add a company you're interviewing with. You'll get a checklist to work through, and a place to keep the questions you're asked.
            </EmptyState>
          ) : (
            <EmptyState title="Pick a company">
              Choose one on the left to see its checklist, interviews and links.
            </EmptyState>
          )}
        </main>
      </div>
    </div>
  );
}

export default Prep;
