import "bootstrap/dist/css/bootstrap.min.css";
import "./LoginPage.css";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import heroImage from "../assets/lp.jpg";
import { login } from "../utils/auth";
export const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");

  const handleSignIn = (e) => {
    e.preventDefault();
    login({ name: email.split("@")[0] || "Student", email });
    navigate("/home");
  };
  return (
    <div className="bg">
      <div className="auth-shell">
        <div
          className="auth-visual"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="auth-visual-overlay">
            <p className="auth-quote">
              &#8220;Every application tracked. Every opportunity considered.
              Nothing lost in a spreadsheet again.&#8221;
            </p>
          </div>
        </div>

        <div className="auth-form-panel">
          <div className="container">
            <div className="row justify-content-center">
              <div className="col-md-10">
                <h2 className="text-center mb-4">Sign In</h2>

                <form onSubmit={handleSignIn}>
                  <div className="mb-3">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Password</label>
                    <input
                      type="password"
                      className="form-control"
                      placeholder="Enter your password"
                    />
                  </div>

                  <button type="submit" className="btn btn-primary w-100">
                    Sign In
                  </button>
                </form>

                <p className="text-center mt-3">
                  Don&apos;t have an account?{" "}
                  <Link
                    to="/signup"
                    className="text-green-700 font-semibold hover:underline"
                  >
                    Sign Up
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
