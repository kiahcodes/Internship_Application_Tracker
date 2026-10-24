import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute.jsx";
import { Navbar } from "./components/Navbar.jsx";
import { Home } from "./pages/Home.jsx";
import { Internship } from "./pages/Internship.jsx";
import { Profile } from "./pages/Profile.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { SignupPage } from "./pages/SignupPage.jsx";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage.jsx";
import { ResetPasswordPage } from "./pages/ResetPasswordPage.jsx";
import { Tracker } from "./pages/Tracker.jsx";
import { Documents } from "./pages/Documents.jsx";
import { Analytics } from "./pages/Analytics.jsx";
import { Prep } from "./pages/Prep.jsx";
import { PrepQuiz } from "./pages/PrepQuiz.jsx";
import { NotFound } from "./pages/NotFound.jsx";
import "./App.css";

function App() {
  return (
    <main className="main">
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/internships" element={<ProtectedRoute><Internship /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
        <Route path="/prep" element={<ProtectedRoute><Prep /></ProtectedRoute>} />
        <Route path="/prep/quiz" element={<ProtectedRoute><PrepQuiz /></ProtectedRoute>} />
        <Route path="/tracker" element={<ProtectedRoute><Tracker /></ProtectedRoute>} />
        <Route path="/drag-drop" element={<Navigate to="/tracker" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </main>
  );
}

export default App;
