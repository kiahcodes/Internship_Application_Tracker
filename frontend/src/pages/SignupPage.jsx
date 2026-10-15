import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import heroImage from "../assets/lp.jpg";
import { signup } from "../utils/auth";

const inputClass =
  "w-full p-3 rounded-lg bg-[#e5f3e7] border-2 border-[#0e6818] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0e6818]/40 " +
  "[&:-webkit-autofill]:[-webkit-text-fill-color:#000] [&:-webkit-autofill]:[transition:background-color_5000s_ease-in-out_0s] " +
  "[&:-webkit-autofill]:shadow-[0_0_0_1000px_#e5f3e7_inset] [&:-webkit-autofill:hover]:shadow-[0_0_0_1000px_#e5f3e7_inset] [&:-webkit-autofill:focus]:shadow-[0_0_0_1000px_#e5f3e7_inset]";

export const SignupPage = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState("student");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    setBusy(true);
    try {
      await signup({ name, email, password, role });
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen pt-28 px-6 pb-16 bg-[#f7f0e6] flex justify-center">
      <div className="w-full max-w-[480px] md:max-w-[960px] flex flex-col md:flex-row rounded-[20px] overflow-hidden shadow-[0_20px_50px_rgba(42,28,15,0.12)]">
        <div
          className="flex-1 min-w-0 min-h-[220px] md:min-h-0 bg-cover bg-center flex items-end"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="w-full p-10 bg-gradient-to-b from-[rgba(28,42,18,0)] to-[rgba(28,42,18,0.85)]">
            <p className="font-[Newsreader,Georgia,serif] text-xl leading-snug text-[#f7f0e6] m-0">
              &#8220;Every application tracked. Every opportunity considered.
              Nothing lost in a spreadsheet again.&#8221;
            </p>
          </div>
        </div>

        <div className="flex-1 min-w-0 bg-[#fffdf9] flex items-center p-8 md:p-12">
          <div className="w-full">
            <h2 className="text-center text-2xl font-bold mb-6 text-[#2a1c0f]">
              Sign Up
            </h2>

            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className="block mb-1 font-medium text-[#2a1c0f]">
                  Name
                </label>
                <input
                  type="text"
                  placeholder="Enter your name"
                  className={inputClass}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block mb-1 font-medium text-[#2a1c0f]">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="Enter your email"
                  className={inputClass}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block mb-1 font-medium text-[#2a1c0f]">
                  Password
                </label>
                <input
                  type="password"
                  placeholder="Enter your password"
                  className={inputClass}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block mb-1 font-medium text-[#2a1c0f]">
                  Confirm Password
                </label>
                <input
                  type="password"
                  placeholder="Confirm your password"
                  className={inputClass}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block mb-1 font-medium text-[#2a1c0f]">
                  I am a
                </label>
                <select
                  className={inputClass}
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="student">Student (looking for internships)</option>
                  <option value="poster">Job poster (posting internships)</option>
                </select>
              </div>

              {error && <p className="text-red-600 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={busy}
                className="w-full py-3 rounded-lg bg-[#0e6818] text-white font-semibold hover:bg-[#0a4f12] transition-colors"
              >
                Sign Up
              </button>
            </form>

            <p className="text-center mt-3 text-[#2a1c0f]">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-green-700 font-semibold hover:underline"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
