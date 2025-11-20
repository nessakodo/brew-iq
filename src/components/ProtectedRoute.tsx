import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Array<"admin" | "host" | "player">;
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      // If not logged in, redirect to auth
      if (!user) {
        navigate("/auth");
        return;
      }

      // If role restrictions exist and user doesn't have required role
      if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
        // Redirect to appropriate dashboard based on their role
        if (userRole === "admin") {
          navigate("/admin");
        } else if (userRole === "host") {
          navigate("/host");
        } else {
          navigate("/play");
        }
      }
    }
  }, [user, userRole, loading, allowedRoles, navigate]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero wood-texture flex items-center justify-center">
        <p className="text-foreground text-xl">Loading...</p>
      </div>
    );
  }

  // If user is not authenticated, don't render children (will redirect)
  if (!user) {
    return null;
  }

  // If role restrictions exist and user doesn't have access, don't render (will redirect)
  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    return null;
  }

  return <>{children}</>;
};
