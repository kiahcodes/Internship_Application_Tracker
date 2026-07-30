import { Link } from "react-router-dom";
import "./Hero.css";

export const Hero = () => {
  return (
    <section className="hero-box">
      <div className="hero-background"></div>
      <div className="hero-content">
        <h1 className="text">Your personalised internship tracker</h1>
        <p className="ptext">
          Discover internship opportunities and track your applications all in
          one place.
        </p>
        <div className="hero-buttons">
          <Link to="/internships" className="btn btn-primary">
            Explore Internships
          </Link>
        </div>
      </div>
    </section>
  );
};
