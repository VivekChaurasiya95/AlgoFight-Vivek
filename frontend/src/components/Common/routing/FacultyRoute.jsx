import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import { isAdminUser } from "../../../constants/admins";

export default function FacultyRoute({ children }) {
  const { user, profileData, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          color: "#00e5ff",
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: "1.1rem",
        }}
      >
        Verifying Faculty Clearance...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const userEmail = (user.email || profileData?.email || "").toLowerCase().trim();
  const isMitsFaculty = userEmail.endsWith("@mitsgwalior.in") ||
                        userEmail.endsWith(".mitsgwalior.in") ||
                        userEmail.includes("mitsgwalior.in");

  const isFacultyOrAdmin = Boolean(
    isAdminUser(user) ||
    profileData?.userType === "FACULTY" ||
    user?.userType === "FACULTY" ||
    user?.role === "FACULTY" ||
    isMitsFaculty
  );

  if (!isFacultyOrAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}
