import { useState } from "react";
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

  function toggleApply(id) {
    const updated = internships.map((item) =>
      item.id === id ? { ...item, applied: !item.applied } : item,
    );
    setInternships(updated);
  }

  return (
    <section className="internship-page">
      <h1 className="internship-title">Internship Opportunities</h1>
      <div className="internship-grid">
        {internships.map((item) => (
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
