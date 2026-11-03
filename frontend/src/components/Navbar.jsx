import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import logo from "../assets/logo.png";
import { useSession, useSignedIn } from "../utils/auth";
import { completeness } from "../utils/profileCompleteness";
import { PROFILE_CHANGED, loadStudent } from "../utils/student";
import "./Navbar.css";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  useLocation(); // re-render on navigation so the login state below stays current
  const loggedIn = useSignedIn();
  const initial = (useSession()?.name || "?").trim().charAt(0).toUpperCase();

  const [percent, setPercent] = useState(null);

  // Profile completeness for the bar under the navbar; refreshed whenever the profile is saved.
  useEffect(() => {
    if (!loggedIn) return undefined;
    let stale = false;
    const refresh = () =>
      loadStudent()
        .then((p) => { if (!stale) setPercent(completeness(p).percent); })
        .catch(() => { if (!stale) setPercent(null); });
    refresh();
    window.addEventListener(PROFILE_CHANGED, refresh);
    return () => {
      stale = true;
      window.removeEventListener(PROFILE_CHANGED, refresh);
    };
  }, [loggedIn]);

  const closeMenu = () => setIsOpen(false);

  return (
    <nav className="custom-navbar">
      <NavLink to="/" className="logo" onClick={closeMenu}>
        <img src={logo} alt="" className="logo-img" />
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
              <NavLink to="/tracker" onClick={closeMenu}>
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

      {loggedIn && percent !== null && (
        <Link
          to="/profile"
          className="nav-progress"
          title={percent === 100 ? "Your profile is complete" : "Finish your profile"}
        >
          <span
            className="nav-progress-track"
            role="progressbar"
            aria-label="Profile completeness"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
          >
            <span className="nav-progress-fill" style={{ width: `${percent}%` }} />
          </span>
          <span
            className={`nav-progress-marker${percent > 80 ? " nav-progress-marker--flip" : ""}`}
            style={{ left: `clamp(8px, ${percent}%, calc(100% - 8px))` }}
          >
            <span className="nav-progress-tip" aria-hidden="true" />
            <span className="nav-progress-label">{percent}%</span>
          </span>
        </Link>
      )}
    </nav>
  );
}

export default Navbar;
