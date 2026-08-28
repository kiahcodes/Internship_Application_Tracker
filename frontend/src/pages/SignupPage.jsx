import { useNavigate, Link } from "react-router-dom";
import "./SignupPage.css";

export const SignupPage = () => {
  const navigate = useNavigate();

  const handleSignUp = (e) => {
    e.preventDefault();
    navigate("/home");
  };

  return (
    <div className="min-h-screen pt-28 px-6 pb-16 bg-[#f0e5db] flex justify-center">
      <div className="w-full max-w-md">
        <h2 className="text-center text-2xl font-bold mb-6 text-[#36200d]">
          Sign Up
        </h2>

        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label className="block mb-1 font-medium text-[#36200d]">
              Name
            </label>
            <input
              type="text"
              placeholder="Enter your name"
              className="signup-input w-full p-3 rounded-lg bg-[#e5f3e7] border-2 border-[#0e6818] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0e6818]/40"
            />
          </div>

          <div>
            <label className="block mb-1 font-medium text-[#36200d]">
              Email
            </label>
            <input
              type="email"
              placeholder="Enter your email"
              className="signup-input w-full p-3 rounded-lg bg-[#e5f3e7] border-2 border-[#0e6818] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0e6818]/40"
            />
          </div>

          <div>
            <label className="block mb-1 font-medium text-[#36200d]">
              Password
            </label>
            <input
              type="password"
              placeholder="Enter your password"
              className="signup-input w-full p-3 rounded-lg bg-[#e5f3e7] border-2 border-[#0e6818] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0e6818]/40"
            />
          </div>

          <div>
            <label className="block mb-1 font-medium text-[#36200d]">
              Confirm Password
            </label>
            <input
              type="password"
              placeholder="Confirm your password"
              className="signup-input w-full p-3 rounded-lg bg-[#e5f3e7] border-2 border-[#0e6818] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0e6818]/40"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-lg bg-[#0e6818] text-white font-semibold hover:bg-[#0a4f12] transition-colors"
          >
            Sign Up
          </button>
        </form>

        <p className="text-center mt-3 text-[#36200d]">
          Already have an account?{" "}
          <Link to="/" className="text-green-700 font-semibold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};
