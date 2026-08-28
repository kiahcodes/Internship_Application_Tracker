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

  return (
    <section className="internship-page">
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
      <div className="internship-grid">
        {sortedInternships.map((item) => (
          <article className="internship-card" key={item.id}>
            <div className="card-header">
              <h2 className="company-name">{item.company}</h2>
              {/* <span
                className={`badge ${item.applied ? "badge-applied" : "badge-not-applied"}`}
              >
                {item.applied ? "Applied" : "Not Applied"}
              </span> */}
            </div>
            <p className="role">{item.role}</p>
            <p className="location">📍{item.location}</p>
            <button className="apply-btn" onClick={() => toggleApply(item.id)}>
              {item.applied ? "Applied" : "Apply"}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

export default Internship;
