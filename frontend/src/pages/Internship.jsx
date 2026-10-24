import { useEffect, useRef, useState } from "react";
import { api } from "../utils/api";
import { Link } from "react-router-dom";
import { hasPermission } from "../utils/auth";
import { loadStudent } from "../utils/student";
import { parseSkills } from "../utils/skillMatch";
import {
  MODE_LABEL, describeDeadline, eligibilityIssues, formatDuration, formatPosted, formatStipend,
} from "../utils/internships";
import { Alert, Button, ConfirmDialog, EmptyState, Pagination, Skeleton } from "../components/ui.jsx";
import { InternshipActions } from "../components/InternshipActions.jsx";
import { InternshipDetail } from "../components/InternshipDetail.jsx";
import { InternshipFilters } from "../components/InternshipFilters.jsx";
import { NO_FILTERS, filtersToParams } from "../utils/filters";
import { PostInternshipForm } from "../components/PostInternshipForm.jsx";
import "./Internship.css";

const PAGE_SIZE = 12;

function buildQuery({ search, filters, sortBy, page, coords, skills, refresh }) {
  const params = new URLSearchParams({ page, pageSize: PAGE_SIZE, sort: sortBy, ...filtersToParams(filters) });
  if (search) params.set("q", search);
  if (coords) {
    params.set("lat", coords.lat.toFixed(3));
    params.set("lon", coords.lon.toFixed(3));
  }
  if (skills.length) params.set("skills", skills.join(","));
  params.set("v", refresh); // bumping this refetches without changing anything else
  return params.toString();
}

function InternshipCard({ item, n, profile, mySkills, onOpen, onDelete, actions }) {
  const stipend = formatStipend(item);
  const duration = formatDuration(item.duration_months);
  const deadline = describeDeadline(item.deadline);
  const posted = formatPosted(item.posted_at);
  const issues = eligibilityIssues(item, profile);

  return (
    <article className="internship-card rise" style={{ "--i": Math.min(n, 8) }}>
      <div className="card-header">
        <div className="company-logo" aria-hidden="true">{item.company.charAt(0)}</div>
        <div>
          <h2 className="company-name">{item.company}</h2>
          <p className="role">
            <button type="button" className="card-open" onClick={() => onOpen(item)} aria-haspopup="dialog">
              {item.role}
            </button>
          </p>
        </div>
      </div>

      <p className="location">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21Z" />
          <circle cx="12" cy="9.5" r="2.4" />
        </svg>
        {item.location}
        {item.work_mode !== "onsite" && <span className="mode-tag">{MODE_LABEL[item.work_mode]}</span>}
        {item.distance != null && (
          <span className="distance">
            {item.distance < 5 ? "You're here" : `${Math.round(item.distance)} km away`}
          </span>
        )}
      </p>

      <ul className="facts" aria-label="Key details">
        <li className={stipend ? "" : "fact-missing"}>{stipend ?? "Stipend not listed"}</li>
        {duration && <li>{duration}</li>}
        {posted && <li className="fact-quiet">{posted}</li>}
      </ul>
      {deadline && <p className={`deadline tone-${deadline.tone}`}>{deadline.text}</p>}

      {item.snippet && <p className="snippet">{item.snippet}</p>}

      {item.matched.length > 0 && (
        <div className="match">
          <p className="match-count">
            Matches {item.matched.length} of your {mySkills.length} {mySkills.length === 1 ? "skill" : "skills"}
          </p>
          <ul className="match-list" aria-label="Matching skills">
            {item.matched.map((skill) => <li key={skill}>{skill}</li>)}
          </ul>
        </div>
      )}

      {issues.length > 0 && <p className="elig-warn">May not be eligible: {issues[0]}</p>}

      <div className="card-foot">
        {actions(item)}
        {item.mine && (
          <Button variant="ghost" className="btn-delete" onClick={() => onDelete(item)} aria-label={`Delete ${item.role} at ${item.company}`}>
            Delete
          </Button>
        )}
      </div>
    </article>
  );
}

export function Internship() {
  const [result, setResult] = useState({ key: null, items: [], total: 0, pages: 1 });
  const [loadError, setLoadError] = useState("");
  const [profile, setProfile] = useState(undefined); // undefined until the profile loads, null if it can't
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [filters, setFilters] = useState(NO_FILTERS);
  const [sortBy, setSortBy] = useState("nearest");
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [openId, setOpenId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [visited, setVisited] = useState(() => new Set()); // postings whose site the student opened
  const [pendingRemove, setPendingRemove] = useState(null); // stop tracking
  const [pendingDelete, setPendingDelete] = useState(null); // poster deletes a posting
  const [deleting, setDeleting] = useState(false);
  const [userCity, setUserCity] = useState("");
  const [userCoords, setUserCoords] = useState(null);
  const [locationStatus, setLocationStatus] = useState(() => (navigator.geolocation ? "loading" : "error"));
  const [locationGaveUp, setLocationGaveUp] = useState(false);
  const topRef = useRef(null);
  const canManage = hasPermission("internships:manage");

  useEffect(() => {
    loadStudent().then(setProfile).catch(() => setProfile(null));
  }, []);
  const mySkills = parseSkills(profile?.skills);

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Asking for location can sit on a permission prompt forever; don't hold the list hostage.
  useEffect(() => {
    const t = setTimeout(() => setLocationGaveUp(true), 2500);
    return () => clearTimeout(t);
  }, []);

  function locate() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        setUserCoords({ lat: coords.latitude, lon: coords.longitude });
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}`,
          );
          const data = await res.json();
          setUserCity(data?.address?.city || data?.address?.town || data?.address?.state || "your area");
        } catch {
          setUserCity("your area"); // we still have coordinates, so distances work
        }
        setLocationStatus("done");
      },
      () => setLocationStatus("denied"),
    );
  }
  useEffect(() => {
    locate();
  }, []);
  const retryLocation = () => {
    setLocationStatus("loading");
    locate();
  };

  const waitingForLocation = sortBy === "nearest" && locationStatus === "loading" && !locationGaveUp;
  const ready = profile !== undefined && !waitingForLocation;
  const queryString = buildQuery({ search: debounced, filters, sortBy, page, coords: userCoords, skills: mySkills, refresh });

  useEffect(() => {
    if (!ready) return;
    let stale = false;
    api(`/internships?${queryString}`)
      .then((data) => {
        if (stale) return;
        setResult({ ...data, key: queryString });
        setLoadError("");
        if (data.page !== page) setPage(data.page); // the last page shrank (e.g. a posting was removed)
      })
      .catch((err) => {
        if (stale) return;
        setLoadError(err.message);
        setResult({ key: queryString, items: [], total: 0, pages: 1 });
      });
    return () => { stale = true; };
    // `page` is part of queryString; it is only read to notice a server-side correction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, queryString]);

  const loading = !ready || result.key !== queryString;
  const { items, total, pages } = result;
  const filtered = Boolean(debounced) || Object.values(filters).some(Boolean);

  const changeFilters = (patch) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };
  const goToPage = (n) => {
    setPage(n);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const patchItem = (id, patch) =>
    setResult((r) => ({ ...r, items: r.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));

  // Tracking adds a card to the Tracker board's Applied column; removing it deletes that card.
  async function track(item) {
    setBusyId(item.id);
    try {
      await api(`/internships/${item.id}/apply`, { method: "POST" });
      patchItem(item.id, { applied: true, app_status: "Applied", has_letter: false });
      setLoadError("");
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function confirmUntrack() {
    const item = pendingRemove;
    setBusyId(item.id);
    try {
      await api(`/internships/${item.id}/apply`, { method: "DELETE" });
      patchItem(item.id, { applied: false, app_status: null, has_letter: false });
      setVisited((v) => { const next = new Set(v); next.delete(item.id); return next; });
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setBusyId(null);
      setPendingRemove(null);
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await api(`/internships/${pendingDelete.id}`, { method: "DELETE" });
      setOpenId(null);
      setRefresh((n) => n + 1);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  }

  const actions = (item) => (
    <InternshipActions
      item={item}
      busy={busyId === item.id}
      visited={visited.has(item.id)}
      onLinkOpened={(it) => setVisited((v) => new Set(v).add(it.id))}
      onTrack={track}
      onUntrack={setPendingRemove}
    />
  );

  const locationNote =
    sortBy === "match" ? "Roles that mention your skills come first."
    : sortBy === "newest" ? "Newest roles first."
    : sortBy === "deadline" ? "Closing soonest first. Roles with no deadline come last."
    : locationStatus === "loading" ? "Finding internships near you…"
    : locationStatus === "done" ? `Nearest to ${userCity} first.`
    : (
      <>
        Location is off, so results aren't sorted by distance.{" "}
        <button type="button" className="link-btn" onClick={retryLocation}>Try again</button>
      </>
    );

  const from = total === 0 ? 0 : (result.page - 1) * PAGE_SIZE + 1;
  const to = Math.min(total, (result.page ?? 1) * PAGE_SIZE);
  const showEmpty = !loading && !loadError && items.length === 0;
  const openItem = items.find((i) => i.id === openId) ?? null;

  return (
    <section className="page internship-page">
      <header className="page-head rise" ref={topRef}>
        <h1 className="page-title">Find your next internship</h1>
        <p className="page-lede" aria-live="polite">{locationNote}</p>
      </header>

      <div className="internship-toolbar rise" style={{ "--i": 1 }}>
        <div className="search-field">
          <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            type="search"
            className="search-input"
            aria-label="Search internships"
            placeholder="Search by company, role, or location"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <label className="sort-field">
          <span className="sort-label">Sort by</span>
          <select className="sort-select" value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1); }}>
            <option value="nearest">Nearest</option>
            <option value="deadline">Closing soon</option>
            <option value="match" disabled={!mySkills.length}>
              {mySkills.length ? "Best skill match" : "Best skill match (add skills in profile)"}
            </option>
            <option value="newest">Newest</option>
          </select>
        </label>
        {!loading && (
          <span className="results-count" aria-live="polite">
            {total === 0 ? "No results" : `${from}–${to} of ${total}`}
          </span>
        )}
      </div>

      <InternshipFilters
        filters={filters}
        profile={profile}
        onChange={changeFilters}
        onClear={() => { setFilters(NO_FILTERS); setPage(1); }}
      />

      {profile && mySkills.length === 0 && (
        <p className="skills-hint">
          Add your skills in your <Link to="/profile">profile</Link> to see how well each role matches.
        </p>
      )}

      {canManage && <PostInternshipForm onCreated={() => { setSortBy("newest"); setPage(1); setRefresh((n) => n + 1); }} />}

      <Alert onDismiss={() => setLoadError("")}>{loadError}</Alert>

      <div className="internship-grid" aria-busy={loading}>
        {loading &&
          Array.from({ length: 6 }, (_, n) => (
            <div className="internship-card" key={n} aria-hidden="true">
              <div className="card-header">
                <Skeleton width="44px" height="44px" style={{ borderRadius: 12 }} />
                <div className="card-skel-text">
                  <Skeleton width="60%" height="1.1rem" />
                  <Skeleton width="80%" height="0.85rem" />
                </div>
              </div>
              <Skeleton width="45%" height="0.85rem" />
              <Skeleton width="100%" height="44px" style={{ marginTop: "auto", borderRadius: 8 }} />
            </div>
          ))}

        {!loading && items.map((item, n) => (
          <InternshipCard
            key={item.id}
            item={item}
            n={n}
            profile={profile}
            mySkills={mySkills}
            onOpen={(it) => setOpenId(it.id)}
            onDelete={setPendingDelete}
            actions={actions}
          />
        ))}

        {showEmpty && (
          <EmptyState
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
            }
            title={filtered ? "No matches" : "No internships yet"}
            action={filtered && (
              <Button variant="ghost" onClick={() => { setSearch(""); setDebounced(""); setFilters(NO_FILTERS); setPage(1); }}>
                Clear search and filters
              </Button>
            )}
          >
            {filtered
              ? "Nothing fits those filters. Try loosening one of them, or search for a different company, role or city."
              : "Check back soon. New roles are added regularly."}
          </EmptyState>
        )}
      </div>

      {!loading && <Pagination page={result.page ?? 1} pages={pages} onChange={goToPage} />}

      <InternshipDetail item={openItem} profile={profile} onClose={() => setOpenId(null)} actions={actions} />

      <ConfirmDialog
        open={!!pendingRemove}
        title="Remove from your tracker?"
        confirmLabel="Remove"
        busy={busyId !== null && !!pendingRemove}
        onConfirm={confirmUntrack}
        onCancel={() => setPendingRemove(null)}
      >
        {pendingRemove && (
          <p>
            {pendingRemove.role} at {pendingRemove.company} is on your tracker as <strong>{pendingRemove.app_status}</strong>.
            Removing it also deletes its stage history{pendingRemove.has_letter ? " and its cover letter" : ""}. This can't be undone.
          </p>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete this internship?"
        confirmLabel="Delete"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      >
        {pendingDelete && `${pendingDelete.role} at ${pendingDelete.company} will be removed for everyone.`}
      </ConfirmDialog>
    </section>
  );
}

export default Internship;
