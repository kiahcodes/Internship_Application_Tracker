import { useEffect, useState } from "react";
import { api } from "../utils/api";
import { hasPermission } from "../utils/auth";
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
  const [loadError, setLoadError] = useState("");
  const [userCity, setUserCity] = useState("");
  const [userCoords, setUserCoords] = useState(null);
  const [locationStatus, setLocationStatus] = useState("loading");
  const [query, setQuery] = useState("");
  const canManage = hasPermission("internships:manage");
  const [form, setForm] = useState({ company: "", role: "", location: "", url: "" });

  useEffect(() => {
    api("/internships")
      .then(setInternships)
      .catch((err) => setLoadError(err.message));
  }, []);

  // Applying also adds/removes the matching card on the Tracker board.
  async function toggleApply(item) {
    try {
      await api(`/internships/${item.id}/apply`, {
        method: item.applied ? "DELETE" : "POST",
      });
      setInternships((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, applied: !i.applied } : i)),
      );
    } catch (err) {
      setLoadError(err.message);
    }
  }

  // Job posters only; the server enforces this too.
  async function addInternship(e) {
    e.preventDefault();
    try {
      const created = await api("/internships", { method: "POST", body: form });
      setInternships((prev) => [created, ...prev]);
      setForm({ company: "", role: "", location: "", url: "" });
      setLoadError("");
    } catch (err) {
      setLoadError(err.message);
    }
  }

  async function removeInternship(id) {
    if (!window.confirm("Delete this internship for everyone?")) return;
    try {
      await api(`/internships/${id}`, { method: "DELETE" });
      setInternships((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      setLoadError(err.message);
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

  const withDistance = internships.map((item) => ({
    ...item,
    distance: userCoords && item.lat != null
      ? distanceKm(userCoords.lat, userCoords.lon, item.lat, item.lon)
      : null,
  }));

  const sortedInternships = userCoords
    ? [...withDistance].sort(
        (a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity),
      )
    : withDistance;

  const visibleInternships = sortedInternships.filter((item) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      item.company.toLowerCase().includes(q) ||
      item.role.toLowerCase().includes(q) ||
      item.location.toLowerCase().includes(q)
    );
  });

  return (
    <section className="internship-page">
      <div className="internship-header">
        <h1 className="internship-title">Internship Opportunities</h1>
        <p className="location-subtitle">
          {locationStatus === "loading" && "Finding internships near you…"}
          {locationStatus === "done" &&
            `Showing internships nearest to ${userCity} first`}
          {(locationStatus === "denied" || locationStatus === "error") && (
            <>
              Enable location to see internships near you first —{" "}
              <button className="location-retry" onClick={detectLocation}>
                try again
              </button>
            </>
          )}
        </p>
      </div>

      <div className="internship-toolbar">
        <div className="search-field">
          <svg
            className="search-icon"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="Search by company, role, or location"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <span className="results-count">
          Showing {visibleInternships.length} of {internships.length}
        </span>
      </div>

      {canManage && (
        <form className="internship-toolbar" onSubmit={addInternship}>
          {["company", "role", "location", "url"].map((f) => (
            <input
              key={f}
              className="search-input"
              placeholder={f === "url" ? "Link (optional)" : f[0].toUpperCase() + f.slice(1)}
              value={form[f]}
              required={f !== "url"}
              onChange={(e) => setForm({ ...form, [f]: e.target.value })}
            />
          ))}
          <button className="apply-btn" type="submit">Add internship</button>
        </form>
      )}

      {loadError && <p className="no-results">{loadError}</p>}

      <div className="internship-grid">
        {visibleInternships.map((item) => (
          <article className="internship-card" key={item.id}>
            <div className="card-header">
              <div className="company-logo">{item.company.charAt(0)}</div>
              <div>
                <h2 className="company-name">{item.company}</h2>
                <p className="role">{item.role}</p>
              </div>
            </div>

            <p className="location">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21Z" />
                <circle cx="12" cy="9.5" r="2.4" />
              </svg>
              {item.location}
              {item.distance !== null && (
                <span className="distance">
                  {item.distance < 5
                    ? "You're here"
                    : `${Math.round(item.distance)} km away`}
                </span>
              )}
            </p>

            {item.url && (
              <a
                className="source-link"
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                View on {item.source} ↗
              </a>
            )}

            <button
              className={`apply-btn ${item.applied ? "apply-btn-applied" : ""}`}
              onClick={() => toggleApply(item)}
            >
              {item.applied && (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              )}
              {item.applied ? "Applied" : "Apply"}
            </button>
            {item.mine && (
              <button
                className="apply-btn"
                style={{ marginTop: 8, background: "#a33" }}
                onClick={() => removeInternship(item.id)}
              >
                Delete
              </button>
            )}
          </article>
        ))}

        {visibleInternships.length === 0 && (
          <p className="no-results">
            No internships match &ldquo;{query}&rdquo;.
          </p>
        )}
      </div>
    </section>
  );
}

export default Internship;
