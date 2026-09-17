import { Routes, Route } from "react-router-dom";
import { Navbar } from "./components/Navbar.jsx";
import { Home } from "./pages/Home.jsx";
import { Internship } from "./pages/Internship.jsx";
import { Profile } from "./pages/Profile.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { SignupPage } from "./pages/SignupPage.jsx";
import { VueDirectives } from "./pages/VueDirectives.jsx";
import "./App.css";

function App() {
  return (
    <main className="main">
      <Navbar />
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/home" element={<Home />} />
        <Route path="/internships" element={<Internship />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/vue-directives" element={<VueDirectives />} />
      </Routes>
    </main>
  );
}

export default App;
