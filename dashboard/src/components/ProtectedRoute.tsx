import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/** Redirects unauthenticated users to /login */
export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth();
  if (isLoading) return null; // wait for localStorage restore
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
