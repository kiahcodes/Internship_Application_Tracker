import { useEffect, useState } from "react";
import { api } from "../utils/api";
import { Link } from "react-router-dom";
import { hasPermission } from "../utils/auth";
import { loadStudent } from "../utils/student";
import { matchSkills, parseSkills } from "../utils/skillMatch";
import { Alert, Button, ConfirmDialog, EmptyState, Field, Skeleton } from "../components/ui.jsx";
import "./Internship.css";

function distanceKm(lat1, lon1, lat2, lon2) {
  const rad = (d) => (d * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

export function Internship() {
  const [internships, setInternships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [mySkills, setMySkills] = useState(null); // null until the profile loads
  const [sortBy, setSortBy] = useState("nearest");
  const [loadError, setLoadError] = useState("");
  const [userCity, setUserCity] = useState("");
  const [userCoords, setUserCoords] = useState(null);
  const [locationStatus, setLocationStatus] = useState("loading");
  const [query, setQuery] = useState("");
  const canManage = hasPermission("internships:manage");
  const [form, setForm] = useState({ company: "", role: "", location: "", url: "" });

  useEffect(() => {
    loadStudent()
      .then((student) => setMySkills(parseSkills(student.skills)))
      .catch(() => setMySkills([]));
  }, []);

  useEffect(() => {
    api("/internships")
      .then(setInternships)
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Applying also adds/removes the matching card on the Tracker board.
  async function toggleApply(item) {
    setBusyId(item.id);
    try {
      await api(`/internships/${item.id}/apply`, {
        method: item.applied ? "DELETE" : "POST",
      });
      setInternships((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, applied: !i.applied } : i)),
      );
      setLoadError("");
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  // Job posters only; the server enforces this too.
  async function addInternship(e) {
    e.preventDefault();
    setAdding(true);
    try {
      const created = await api("/internships", { method: "POST", body: form });
      setInternships((prev) => [created, ...prev]);
      setForm({ company: "", role: "", location: "", url: "" });
      setLoadError("");
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setAdding(false);
    }
  }

  async function confirmRemove() {
    setDeleting(true);
    try {
      await api(`/internships/${pendingDelete.id}`, { method: "DELETE" });
      setInternships((prev) => prev.filter((i) => i.id !== pendingDelete.id));
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  }

  function detectLocation() {
    setLocationStatus("loading");
    requestLocation();
  }

  function requestLocation() {
    if (!navigator.geolocation) {
      setLocationStatus("error");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        setUserCoords({ lat: coords.latitude, lon: coords.longitude });
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}`,
          );
          const data = await res.json();
          const city =
            data?.address?.city ||
            data?.address?.town ||
            data?.address?.state ||
            "your area";
          setUserCity(city);
          setLocationStatus("done");
        } catch {
          setLocationStatus("error");
        }
      },
      () => setLocationStatus("denied"),
    );
  }

  useEffect(() => {
    requestLocation();
  }, []);

  const withInsights = internships.map((item) => ({
    ...item,
    distance: userCoords && item.lat != null
      ? distanceKm(userCoords.lat, userCoords.lon, item.lat, item.lon)
      : null,
    matched: mySkills?.length ? matchSkills(mySkills, item) : [],
  }));

  const byDistance = (a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity);
  const sortedInternships =
    sortBy === "match"
      ? [...withInsights].sort((a, b) => b.matched.length - a.matched.length || byDistance(a, b))
      : sortBy === "nearest" && userCoords
        ? [...withInsights].sort(byDistance)
        : withInsights;

  const visibleInternships = sortedInternships.filter((item) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      item.company.toLowerCase().includes(q) ||
      item.role.toLowerCase().includes(q) ||
      item.location.toLowerCase().includes(q)
    );
  });


  const locationNote =
    sortBy === "match" ? (
      "Roles that mention your skills come first."
    ) : sortBy === "newest" ? (
      "Newest roles first."
    ) : locationStatus === "loading" ? (
      "Finding internships near you…"
    ) : locationStatus === "done" ? (
      `Nearest to ${userCity} first.`
    ) : (
      <>
        Location is off, so results aren't sorted by distance.{" "}
        <button type="button" className="link-btn" onClick={detectLocation}>
          Try again
        </button>
      </>
    );

  const showEmpty = !loading && !loadError && visibleInternships.length === 0;

  return (
    <section className="page internship-page">
      <header className="page-head rise">
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
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <label className="sort-field">
          <span className="sort-label">Sort by</span>
          <select className="sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="nearest">Nearest</option>
            <option value="match" disabled={!mySkills?.length}>Best skill match</option>
            <option value="newest">Newest</option>
          </select>
        </label>
        {!loading && (
          <span className="results-count" aria-live="polite">
            {visibleInternships.length} of {internships.length} shown
          </span>
        )}
      </div>

      {mySkills && mySkills.length === 0 && (
        <p className="skills-hint">
          Add your skills in your <Link to="/profile">profile</Link> to see how well each role matches.
        </p>
      )}

      {canManage && (
        <form className="post-form rise" style={{ "--i": 2 }} onSubmit={addInternship}>
          <h2 className="post-form-title">Post an internship</h2>
          <div className="post-form-grid">
            <Field id="pf-company" label="Company" required value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            <Field id="pf-role" label="Role" required value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
            <Field id="pf-location" label="Location" required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            <Field id="pf-url" label="Link (optional)" type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
          </div>
          <Button type="submit" loading={adding}>Add internship</Button>
        </form>
      )}

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

        {visibleInternships.map((item, n) => (
          <article className="internship-card rise" style={{ "--i": Math.min(n, 8) }} key={item.id}>
            <div className="card-header">
              <div className="company-logo" aria-hidden="true">{item.company.charAt(0)}</div>
              <div>
                <h2 className="company-name">{item.company}</h2>
                <p className="role">{item.role}</p>
              </div>
            </div>

            <p className="location">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21Z" />
                <circle cx="12" cy="9.5" r="2.4" />
              </svg>
              {item.location}
              {item.distance !== null && (
                <span className="distance">
                  {item.distance < 5 ? "You're here" : `${Math.round(item.distance)} km away`}
                </span>
              )}
            </p>

            {item.url && (
              <a className="source-link" href={item.url} target="_blank" rel="noopener noreferrer">
                View on <span className="cap">{item.source}</span> ↗
              </a>
            )}

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

            <div className="card-actions">
              <Button
                variant={item.applied ? "soft" : "primary"}
                block
                loading={busyId === item.id}
                aria-pressed={item.applied}
                onClick={() => toggleApply(item)}
              >
                {item.applied && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
                {item.applied ? "Applied" : "Apply"}
              </Button>
              {item.mine && (
                <Button variant="ghost" className="btn-delete" onClick={() => setPendingDelete(item)} aria-label={`Delete ${item.role} at ${item.company}`}>
                  Delete
                </Button>
              )}
            </div>
          </article>
        ))}

        {showEmpty && (
          <EmptyState
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
            }
            title={query ? "No matches" : "No internships yet"}
            action={query && <Button variant="ghost" onClick={() => setQuery("")}>Clear search</Button>}
          >
            {query
              ? `Nothing matches “${query}”. Try a company, role or city.`
              : "Check back soon. New roles are added regularly."}
          </EmptyState>
        )}
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete this internship?"
        confirmLabel="Delete"
        busy={deleting}
        onConfirm={confirmRemove}
        onCancel={() => setPendingDelete(null)}
      >
        {pendingDelete && `${pendingDelete.role} at ${pendingDelete.company} will be removed for everyone.`}
      </ConfirmDialog>
    </section>
  );
}

export default Internship;
