import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import { isAuthenticated, logout } from "../utils/auth";
import "./Navbar.css";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(isAuthenticated);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setLoggedIn(isAuthenticated());
  }, [location.pathname]);

  const closeMenu = () => setIsOpen(false);

  const handleLogout = () => {
    logout();
    setLoggedIn(false);
    closeMenu();
    navigate("/");
  };

  return (
    <nav className="custom-navbar">
      <NavLink to="/home" className="logo" onClick={closeMenu}>
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
          <NavLink to="/home" onClick={closeMenu}>
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
        <li>
          <NavLink to="/vue-directives" onClick={closeMenu}>
            Vue Lab
          </NavLink>
        </li>
        <li>
          <NavLink to="/drag-drop" onClick={closeMenu}>
            Tracker
          </NavLink>
        </li>
        <li>
          {loggedIn ? (
            <button type="button" className="nav-auth-btn" onClick={handleLogout}>
              Logout
            </button>
          ) : (
            <NavLink to="/" className="nav-auth-btn nav-auth-link" onClick={closeMenu}>
              Login
            </NavLink>
          )}
        </li>
      </ul>
    </nav>
  );
}

export default Navbar;
