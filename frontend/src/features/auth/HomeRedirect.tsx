import { Navigate } from "react-router-dom";
import { useAuth } from "./auth-context";
import { defaultPathForUser } from "./permissions";

export function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={defaultPathForUser(user)} replace />;
}
