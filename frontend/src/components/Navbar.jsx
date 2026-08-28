import { useState } from "react";
import { NavLink } from "react-router-dom";
import logo from "../assets/logo.png";
import "./Navbar.css";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const closeMenu = () => setIsOpen(false);

  return (
    <nav className="custom-navbar">
      <NavLink to="/" className="logo" onClick={closeMenu}>
        <img src={logo} alt="logo" className="logo-img" />
        Campus2Career
      </NavLink>

      <button
        className={`hamburger ${isOpen ? "active" : ""}`}
        onClick={() => setIsOpen((open) => !open)}
        aria-label="Toggle navigation menu"
        aria-expanded={isOpen}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <ul className={`nav-links ${isOpen ? "open" : ""}`}>
        <li>
          <NavLink to="/" onClick={closeMenu}>
            Home
          </NavLink>
        </li>
        <li>
          <NavLink to="/internships" onClick={closeMenu}>
            Opportunities
          </NavLink>
        </li>
        <li>
          <NavLink to="/profile" onClick={closeMenu}>
            Profile
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}

export default Navbar;
