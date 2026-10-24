import "./AuthShell.css";
import heroImage from "../assets/lp.jpg";

export function AuthShell({ title, children }) {
  return (
    <div className="auth-page">
      <div className="auth-shell">
        <div className="auth-visual" style={{ backgroundImage: `url(${heroImage})` }}>
          <div className="auth-visual-overlay">
            <p className="auth-quote">
              &#8220;Every application tracked. Every opportunity considered.
              Nothing lost in a spreadsheet again.&#8221;
            </p>
          </div>
        </div>

        <div className="auth-form-panel">
          <div className="auth-form">
            <h1 className="auth-title">{title}</h1>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
