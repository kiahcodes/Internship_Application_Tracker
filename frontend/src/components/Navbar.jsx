import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import logo from "../assets/logo.png";
import { isAuthenticated } from "../utils/auth";
import "./Navbar.css";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  useLocation(); // re-render on navigation so the login state below stays current
  const loggedIn = isAuthenticated();

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
          <NavLink to="/" end onClick={closeMenu}>
            Home
          </NavLink>
        </li>
        {loggedIn && (
          <>
            <li>
              <NavLink to="/internships" onClick={closeMenu}>
                Opportunities
              </NavLink>
            </li>
            <li>
              <NavLink to="/drag-drop" onClick={closeMenu}>
                Tracker
              </NavLink>
            </li>
            <li>
              <NavLink to="/documents" onClick={closeMenu}>
                Documents
              </NavLink>
            </li>
          </>
        )}
        {loggedIn && (
          <li>
            <NavLink to="/profile" onClick={closeMenu}>
              Profile
            </NavLink>
          </li>
        )}

        {!loggedIn && (
          <li>
            <NavLink
              to="/login"
              className="nav-auth-btn nav-auth-link"
              onClick={closeMenu}
            >
              Login
            </NavLink>
          </li>
        )}
      </ul>
    </nav>
  );
}

export default Navbar;
