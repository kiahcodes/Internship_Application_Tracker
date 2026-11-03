import { Link } from "react-router-dom";
import logo from "../assets/logo.png";
import { useSignedIn } from "../utils/auth";
import "./Footer.css";

// Where queries go. Change it here and the footer follows.
export const CONTACT_EMAIL = "ktgqueries@gmail.com";

const PRODUCT = [
  ["/tracker", "Application tracker"],
  ["/internships", "Opportunities"],
  ["/documents", "Resumes and letters"],
  ["/analytics", "Analytics"],
  ["/prep", "Interview prep"],
];

export function Footer() {
  const signedIn = useSignedIn();
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Link to="/" className="footer-logo">
            <img src={logo} alt="" />
            Campus2Career
          </Link>
          <p>One place to find internships, track every application and prepare for what comes next.</p>
        </div>

        <nav className="footer-col" aria-label="Product">
          <h2>Product</h2>
          <ul>
            {PRODUCT.map(([to, label]) => (
              <li key={to}>
                <Link to={signedIn ? to : "/login"}>{label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav className="footer-col" aria-label="Account">
          <h2>Account</h2>
          <ul>
            {signedIn ? (
              <li>
                <Link to="/profile">Your profile</Link>
              </li>
            ) : (
              <>
                <li>
                  <Link to="/login">Sign in</Link>
                </li>
                <li>
                  <Link to="/signup">Create an account</Link>
                </li>
              </>
            )}
          </ul>
        </nav>

        <div className="footer-col">
          <h2>Contact us</h2>
          <p className="footer-contact">Questions, feedback or trouble with your account? Write to us.</p>
          <a className="footer-mail" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
        </div>
      </div>

      <div className="footer-base">
        <p>© {new Date().getFullYear()} Campus2Career. All rights reserved.</p>
      </div>
    </footer>
  );
}

export default Footer;
