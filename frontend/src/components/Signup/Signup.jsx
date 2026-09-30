import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./Signup.css";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../contexts/AuthContext";
import { useNotification } from "../../contexts/NotificationContext.jsx";
import GoogleAuthButton from "../Common/GoogleAuthButton.jsx";
import FacultyDetailsModal from "../Faculty/FacultyDetailsModal.jsx";
import { isGoogleAuthAvailable } from "../../services/googleAuth";

function Signup() {
  const [accountRole, setAccountRole] = useState("STUDENT"); // "STUDENT" | "FACULTY"
  const [authMethod, setAuthMethod] = useState(() => isGoogleAuthAvailable() ? "google" : "manual");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showFacultyOnboarding, setShowFacultyOnboarding] = useState(false);
  const [newFacultyUser, setNewFacultyUser] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || (accountRole === "FACULTY" ? "/faculty" : "/");
  const { user, signupManual, loginWithGoogle, updateFacultyDetails } = useAuth();
  const { notify } = useNotification();

  useEffect(() => {
    // Only auto-redirect if NOT waiting for faculty onboarding form
    if (user && !showFacultyOnboarding) {
      const isFaculty = user.userType === "FACULTY" || user.role === "FACULTY" || (user.email || "").toLowerCase().includes("mitsgwalior.in");
      navigate(isFaculty ? "/faculty" : from, { replace: true });
    }
  }, [user, navigate, from, showFacultyOnboarding]);

  const handleGoogleSuccess = async (credential) => {
    setLoading(true);
    try {
      const loggedUser = await loginWithGoogle(credential);
      const isMitsFaculty = (loggedUser?.email || "").toLowerCase().includes("mitsgwalior.in");
      if (accountRole === "FACULTY" || loggedUser?.userType === "FACULTY" || isMitsFaculty) {
        setNewFacultyUser(loggedUser);
        setShowFacultyOnboarding(true);
        notify({
          type: "info",
          title: "Account Created",
          message: "Please complete your official Faculty institutional details.",
        });
      } else {
        notify({
          type: "success",
          title: "Account Created",
          message: "Welcome to AlgoFight! Signed up with Google.",
        });
        navigate(from, { replace: true });
      }
    } catch (err) {
      notify({
        type: "error",
        title: "Sign-Up Failed",
        message: err?.message || "Google registration failed.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = (err) => {
    console.warn("GIS signup error:", err);
    notify({
      type: "error",
      title: "Google Sign-Up Error",
      message: err?.message || "Could not complete Google Sign-Up.",
    });
  };

  const validateManual = () => {
    const errs = {};
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      errs.email = "Email address is required";
    } else if (!/\S+@\S+\.\S+/.test(cleanEmail)) {
      errs.email = "Invalid email format";
    }

    if (!password) {
      errs.password = "Password is required";
    } else if (password.length < 6) {
      errs.password = "Password must be at least 6 characters";
    }

    if (password !== confirmPassword) {
      errs.confirmPassword = "Passwords do not match";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleManualSignUp = async (e) => {
    e.preventDefault();
    if (!validateManual()) return;

    setLoading(true);
    try {
      const cleanEmail = email.trim();
      const defaultUsername = cleanEmail.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "");
      const isMitsFaculty = cleanEmail.toLowerCase().includes("mitsgwalior.in");
      const userType = (accountRole === "FACULTY" || isMitsFaculty) ? "FACULTY" : "INDIVIDUAL";

      const createdUser = await signupManual({
        email: cleanEmail,
        password,
        username: defaultUsername,
        userType,
        institutionName: (accountRole === "FACULTY" || isMitsFaculty) ? "Madhav Institute of Technology & Science" : undefined,
      });

      if (accountRole === "FACULTY" || isMitsFaculty || createdUser?.userType === "FACULTY") {
        setNewFacultyUser(createdUser);
        setShowFacultyOnboarding(true);
        notify({
          type: "info",
          title: "Account Created",
          message: "Please complete your official Faculty institutional details.",
        });
      } else {
        notify({
          type: "success",
          title: "Account Created",
          message: "Welcome to AlgoFight! Your account is ready.",
        });
        navigate(from, { replace: true });
      }
    } catch (err) {
      notify({
        type: "error",
        title: "Sign-Up Failed",
        message: err?.message || "Registration failed.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFacultyDetailsSubmit = async (facultyData) => {
    try {
      await updateFacultyDetails(facultyData);
      notify({
        type: "success",
        title: "Faculty Profile Configured",
        message: `Welcome, ${facultyData.designation || "Faculty Member"}! Portal access configured successfully.`,
        duration: 5000,
      });
      setShowFacultyOnboarding(false);
      navigate("/faculty", { replace: true });
    } catch (err) {
      notify({
        type: "error",
        title: "Configuration Error",
        message: err?.message || "Could not save faculty details. You can update them in Profile anytime.",
      });
      setShowFacultyOnboarding(false);
      navigate("/profile", { replace: true });
    }
  };

  return (
    <div className="signup-page">
      <motion.div
        key="signup-form-container"
        initial={{ opacity: 0, scale: 0.96, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        style={{ width: "100%", display: "flex", justifyContent: "center" }}
      >
        <div className="Signup-Container">
          <div className="Signup-Heading">
            <h1>Create an Account</h1>
            <p>
              {accountRole === "FACULTY"
                ? "Join as an Academic Faculty Educator & Mentor"
                : "Join the next generation of competitive programmers"}
            </p>
          </div>

          {/* Account Role Selector: Student vs Faculty */}
          <div className="role-selector-wrap">
            <span className="role-selector-label">I AM REGISTERING AS:</span>
            <div className="account-role-switch" role="tablist" aria-label="Account Role">
              <button
                type="button"
                role="tab"
                aria-selected={accountRole === "STUDENT"}
                className={`account-role-btn ${accountRole === "STUDENT" ? "active" : ""}`}
                onClick={() => setAccountRole("STUDENT")}
              >
                <span>🎓 Student / Competitor</span>
                {accountRole === "STUDENT" && (
                  <motion.div
                    className="account-role-pill student-pill"
                    layoutId="account-role-pill"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={accountRole === "FACULTY"}
                className={`account-role-btn ${accountRole === "FACULTY" ? "active faculty-active" : ""}`}
                onClick={() => setAccountRole("FACULTY")}
              >
                <span>🏛️ Faculty Educator</span>
                {accountRole === "FACULTY" && (
                  <motion.div
                    className="account-role-pill faculty-pill"
                    layoutId="account-role-pill"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
              </button>
            </div>
            {accountRole === "FACULTY" && (
              <div className="faculty-role-note">
                ℹ️ Faculty educator accounts have institutional mentorship, question authoring & department analytics access.
              </div>
            )}
          </div>

          {/* Segmented Slidable Switcher for Google vs Manual */}
          <div className="auth-mode-switch" role="tablist" aria-label="Sign-up methods">
            <button
              type="button"
              role="tab"
              aria-selected={authMethod === "google"}
              className={`auth-mode-btn ${authMethod === "google" ? "active" : ""}`}
              onClick={() => setAuthMethod("google")}
            >
              <span>⚡ Google One-Tap</span>
              {authMethod === "google" && (
                <motion.div
                  className="auth-mode-pill"
                  layoutId="auth-mode-pill"
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                />
              )}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={authMethod === "manual"}
              className={`auth-mode-btn ${authMethod === "manual" ? "active" : ""}`}
              onClick={() => setAuthMethod("manual")}
            >
              <span>✉️ Email & Password</span>
              {authMethod === "manual" && (
                <motion.div
                  className="auth-mode-pill"
                  layoutId="auth-mode-pill"
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                />
              )}
            </button>
          </div>

          {/* Mutually Exclusive Views */}
          <AnimatePresence mode="wait">
            {authMethod === "google" ? (
              <motion.div
                key="signup-google-view"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="google-tab-content"
              >
                <GoogleAuthButton
                  mode="signup"
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  loading={loading}
                  onFallbackToManual={() => setAuthMethod("manual")}
                />
              </motion.div>
            ) : (
              <motion.form
                key="signup-manual-view"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                onSubmit={handleManualSignUp}
                className="Signup-Form-Options"
              >
                {/* Email Address */}
                <div className="input-group">
                  <input
                    type="email"
                    placeholder={accountRole === "FACULTY" ? "Faculty Email Address" : "Email Address"}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                  <p className="error-message">{errors.email || "\u00A0"}</p>
                </div>

                {/* Password */}
                <div className="input-group">
                  <input
                    type="password"
                    placeholder="Password (min 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <p className="error-message">{errors.password || "\u00A0"}</p>
                </div>

                {/* Confirm Password */}
                <div className="input-group">
                  <input
                    type="password"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <p className="error-message">{errors.confirmPassword || "\u00A0"}</p>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  className="auth-submit-btn"
                  disabled={loading}
                  style={{ marginTop: "8px", width: "100%" }}
                >
                  {loading
                    ? "CREATING ACCOUNT..."
                    : accountRole === "FACULTY"
                    ? "PROCEED TO FACULTY SETUP →"
                    : "CREATE ACCOUNT"}
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Bottom Switch to Login */}
          <div className="auth-switch-text" style={{ marginTop: "20px" }}>
            <span>Already registered?</span>
            <Link to="/login" className="Login-link">
              Login
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Faculty Institutional Details Modal (Prompted immediately after faculty signup) */}
      <FacultyDetailsModal
        isOpen={showFacultyOnboarding}
        isOnboarding={true}
        userDisplayName={newFacultyUser?.username || email.split("@")[0] || "Educator"}
        onClose={() => {
          setShowFacultyOnboarding(false);
          navigate("/faculty", { replace: true });
        }}
        onSubmit={handleFacultyDetailsSubmit}
      />
    </div>
  );
}

export default Signup;
