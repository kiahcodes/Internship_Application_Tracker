import { Link } from "react-router-dom";
import { loadStudent } from "../utils/student";
import "./Hero.css";

export const Hero = () => {
  const { name } = loadStudent();
  const firstName = name.split(" ")[0];

  return (
    <section className="hero-box">
      <div className="hero-background"></div>
      <div className="hero-content">
        <div className="hero-greeting">
          <span className="hero-greeting-avatar">{firstName.charAt(0)}</span>
          Hello, {firstName}
        </div>
        <h1 className="text">Your personalised internship tracker</h1>
        <p className="ptext">
          Discover internship opportunities and track your applications all in
          one place.
        </p>
        <div className="hero-buttons">
          <Link to="/internships" className="button-primary">
            Explore Internships
          </Link>
        </div>
      </div>
    </section>
  );
};
