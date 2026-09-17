import { useEffect, useState } from "react";
import "./Internship.css";

const dummyData = [
  {
    id: 1,
    company: "Google",
    role: "Frontend Intern",
    location: "Bengaluru",
    applied: false,
  },
  {
    id: 2,
    company: "Microsoft",
    role: "Software Engineering Intern",
    location: "Hyderabad",
    applied: false,
  },
  {
    id: 3,
    company: "Amazon",
    role: "SDE Intern",
    location: "Bangalore",
    applied: false,
  },
  {
    id: 4,
    company: "Adobe",
    role: "React Developer Intern",
    location: "Noida",
    applied: false,
  },
  {
    id: 5,
    company: "Infosys",
    role: "Web Development Intern",
    location: "Pune",
    applied: false,
  },
];

export function Internship() {
  const [internships, setInternships] = useState(dummyData);
  const [userCity, setUserCity] = useState("");
  const [locationStatus, setLocationStatus] = useState("loading");
  const [query, setQuery] = useState("");

  function toggleApply(id) {
    const updated = internships.map((item) =>
      item.id === id ? { ...item, applied: !item.applied } : item,
    );
    setInternships(updated);
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

  const sortedInternships = userCity
    ? [...internships].sort((a, b) => {
        const aNear = a.location.toLowerCase().includes(userCity.toLowerCase());
        const bNear = b.location.toLowerCase().includes(userCity.toLowerCase());
        return Number(bNear) - Number(aNear);
      })
    : internships;

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
            `Showing internships near ${userCity} first`}
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
            </p>

            <button
              className={`apply-btn ${item.applied ? "apply-btn-applied" : ""}`}
              onClick={() => toggleApply(item.id)}
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
