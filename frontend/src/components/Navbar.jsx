import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import logo from "../assets/logo.png";
import { isAuthenticated, loadSession } from "../utils/auth";
import "./Navbar.css";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  useLocation(); // re-render on navigation so the login state below stays current
  const loggedIn = isAuthenticated();
  const initial = (loadSession()?.name || "?").trim().charAt(0).toUpperCase();

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
            <li>
              <NavLink to="/analytics" onClick={closeMenu}>
                Analytics
              </NavLink>
            </li>
            <li>
              <NavLink to="/prep" onClick={closeMenu}>
                Prep
              </NavLink>
            </li>
          </>
        )}
        {loggedIn && (
          <li>
            <NavLink to="/profile" className="nav-avatar" title="Profile" onClick={closeMenu}>
              <span className="nav-avatar-mark" aria-hidden="true">{initial}</span>
              <span className="nav-avatar-label">Profile</span>
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
