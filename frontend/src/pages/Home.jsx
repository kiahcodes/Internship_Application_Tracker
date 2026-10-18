import { Link } from "react-router-dom";
import { Hero } from "../components/Hero.jsx";
import "./Home.css";

const PATHS = [
  {
    to: "/internships",
    title: "Opportunities",
    body: "Roles sorted by how close they are to you. Apply in one click and it lands on your board.",
    go: "Browse roles",
  },
  {
    to: "/drag-drop",
    title: "Tracker",
    body: "Drag each application from Applied to Interview to Offer, so nothing slips.",
    go: "Open tracker",
  },
  {
    to: "/profile",
    title: "Profile and resumes",
    body: "Keep your skills and every resume version in one place, and pick which one is current.",
    go: "Edit profile",
  },
];

export function Home() {
  return (
    <div className="home-page">
      <Hero />
      <section className="paths" aria-label="Where to go next">
        <ul className="paths-list">
          {PATHS.map((p) => (
            <li key={p.to}>
              <Link to={p.to} className="path-row">
                <h2>{p.title}</h2>
                <p>{p.body}</p>
                <span className="path-go">{p.go}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
export default Home;
