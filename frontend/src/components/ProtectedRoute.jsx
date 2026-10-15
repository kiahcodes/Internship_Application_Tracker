import { Navigate, useLocation } from "react-router-dom";
import { isAuthenticated } from "../utils/auth";

// Sends logged-out visitors to /login, remembering where they were headed.
export function ProtectedRoute({ children }) {
  const location = useLocation();
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}

export default ProtectedRoute;
