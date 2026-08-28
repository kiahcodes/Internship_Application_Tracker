import "bootstrap/dist/css/bootstrap.min.css";
import "./LoginPage.css";
import { useNavigate, Link } from "react-router-dom";
export const LoginPage = () => {
  const navigate = useNavigate();

  const handleSignIn = (e) => {
    e.preventDefault();
    navigate("/home");
  };
  return (
    <div className="bg">
      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-md-5">
            <h2 className="text-center mb-4">Sign In</h2>

            <form onSubmit={handleSignIn}>
              <div className="mb-3">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="Enter your email"
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
              <Link to="/signup" className="text-green-700 font-semibold hover:underline">
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
