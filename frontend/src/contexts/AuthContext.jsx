// frontend/src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  getSessionToken,
  setSessionToken,
  getStoredUser,
  setStoredUser,
  clearAuthStorage,
} from "../services/authStorage";
import {
  loginWithGoogleApi,
  loginManualApi,
  signupManualApi,
  logoutApi,
  fetchMeApi,
  fetchUserProfile,
  updateFacultyProfile,
} from "../services/api";
import { useUserStore } from "../store/useUserStore";
import { unifiedAnalytics } from "../services/analytics";

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

// Normalize user object with helper getIdToken() for backwards-compatibility
export const formatUser = (userData, token) => {
  if (!userData) return null;
  const currentToken = token || getSessionToken();
  const identityMeta = userData.studentIdentityMetadata || {};
  return {
    uid: userData.id || userData.uid,
    id: userData.id || userData.uid,
    email: userData.email,
    displayName: userData.username || userData.displayName || "Player",
    username: userData.username || userData.displayName || "Player",
    photoURL: userData.photoURL || null,
    role: userData.role || (userData.userType === "FACULTY" ? "FACULTY" : "USER"),
    userType: userData.userType || "INDIVIDUAL",
    platformCode: userData.platformCode,
    institutionName: userData.institutionName,
    department: userData.department || identityMeta.department,
    school: userData.school || identityMeta.school,
    designation: userData.designation || identityMeta.designation || (userData.userType === "FACULTY" ? "Faculty Educator" : null),
    rating: userData.rating,
    highestRank: userData.highestRank,
    getIdToken: async () => currentToken || getSessionToken(),
  };
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = getStoredUser();
    return stored ? formatUser(stored, getSessionToken()) : null;
  });
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  const setGlobalUser = useUserStore((state) => state.setUser);
  const clearGlobalUser = useUserStore((state) => state.clearUser);
  const setGlobalProfileData = useUserStore((state) => state.setProfileData);

  const applyAuthenticatedState = useCallback(
    (authUser, token, profile) => {
      const formatted = formatUser(authUser, token);
      setUser(formatted);
      setStoredUser(formatted);
      if (token) setSessionToken(token);

      const profileObj = profile || formatted;
      setProfileData(profileObj);
      setGlobalProfileData(profileObj);
      setGlobalUser({
        uid: formatted.uid,
        email: formatted.email,
        displayName: formatted.displayName,
        photoURL: formatted.photoURL,
        accessToken: token || getSessionToken(),
      });
      unifiedAnalytics.setUserId(formatted.uid);
    },
    [setGlobalUser, setGlobalProfileData]
  );

  // Auto-restore session on page load / mount
  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      const token = getSessionToken();
      if (!token) {
        if (active) {
          setUser(null);
          setProfileData(null);
          clearAuthStorage();
          clearGlobalUser();
          setLoading(false);
        }
        return;
      }

      try {
        const meRes = await fetchMeApi();
        if (!active) return;
        if (meRes?.user) {
          const profile = await fetchUserProfile(meRes.user.id).catch(() => null);
          if (active) {
            applyAuthenticatedState(meRes.user, token, profile);
          }
        } else {
          // Token invalid or expired
          clearAuthStorage();
          setUser(null);
          setProfileData(null);
          clearGlobalUser();
        }
      } catch (err) {
        // If server explicitly rejected authentication (401 or invalid session), clear stale storage immediately
        const isAuthRejection =
          err?.message?.includes("401") ||
          err?.message?.includes("Unauthorized") ||
          err?.message?.includes("Valid Gateway admission");

        if (isAuthRejection) {
          clearAuthStorage();
          if (active) {
            setUser(null);
            setProfileData(null);
            clearGlobalUser();
          }
        } else {
          // Degraded or network unreachable: use stored local profile if present
          const stored = getStoredUser();
          if (stored && active) {
            setUser(formatUser(stored, token));
          } else if (active) {
            clearAuthStorage();
            setUser(null);
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    restoreSession();

    return () => {
      active = false;
    };
  }, [applyAuthenticatedState, clearGlobalUser]);

  // Google GIS Login
  const loginWithGoogle = useCallback(async (idToken) => {
    const res = await loginWithGoogleApi(idToken);
    if (res?.success && res.token && res.user) {
      applyAuthenticatedState(res.user, res.token);
      return res.user;
    }
    throw new Error(res?.message || "Google authentication failed");
  }, [applyAuthenticatedState]);

  // Manual Email/Password Login
  const loginManual = useCallback(async (email, password) => {
    const res = await loginManualApi(email, password);
    if (res?.success && res.token && res.user) {
      applyAuthenticatedState(res.user, res.token);
      return res.user;
    }
    throw new Error(res?.message || "Login failed");
  }, [applyAuthenticatedState]);

  // Manual Signup
  const signupManual = useCallback(async (payload) => {
    const res = await signupManualApi(payload);
    if (res?.success && res.token && res.user) {
      applyAuthenticatedState(res.user, res.token);
      return res.user;
    }
    throw new Error(res?.message || "Signup failed");
  }, [applyAuthenticatedState]);

  // Logout
  const logout = useCallback(async () => {
    try {
      await logoutApi();
    } catch {
      // Ignored
    } finally {
      clearAuthStorage();
      setUser(null);
      setProfileData(null);
      setGlobalProfileData(null);
      clearGlobalUser();
      unifiedAnalytics.setUserId(null);
    }
  }, [clearGlobalUser, setGlobalProfileData]);

  // Update faculty academic details
  const updateFacultyDetails = useCallback(async (details) => {
    const res = await updateFacultyProfile(details);
    if (res) {
      setProfileData((prev) => ({
        ...(prev || {}),
        ...res,
        school: details.school,
        department: details.department,
        designation: details.designation,
      }));
      setUser((prev) => {
        if (!prev) return prev;
        const updated = {
          ...prev,
          userType: "FACULTY",
          school: details.school,
          department: details.department,
          designation: details.designation,
        };
        setStoredUser(updated);
        return updated;
      });
      return res;
    }
    return null;
  }, []);

  const value = {
    user,
    profileData,
    setProfileData,
    loading,
    loginWithGoogle,
    loginManual,
    signupManual,
    updateFacultyDetails,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
