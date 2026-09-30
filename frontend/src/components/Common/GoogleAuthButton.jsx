import React, { useEffect, useRef, useState } from "react";
import { GoogleIcon } from "./icons/Icons";
import {
  GOOGLE_CLIENT_ID,
  initializeGoogleSignIn,
  renderGoogleButton,
} from "../../services/googleAuth";
import { useNotification } from "../../contexts/NotificationContext";

export default function GoogleAuthButton({
  mode = "signin", // "signin" | "signup"
  onSuccess,
  onError,
  loading = false,
  onFallbackToManual,
}) {
  const containerRef = useRef(null);
  const [gisRendered, setGisRendered] = useState(false);
  const { notify } = useNotification();
  const lastClickRef = useRef(0);

  const label = mode === "signup" ? "Sign up with Google" : "Sign in with Google";

  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  // Keep refs pointing at the latest handlers on every render
  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      return;
    }

    let isMounted = true;

    const init = async () => {
      try {
        await initializeGoogleSignIn(
          (credential) => onSuccessRef.current?.(credential),
          (err) => onErrorRef.current?.(err)
        );

        if (containerRef.current && isMounted) {
          renderGoogleButton(
            containerRef.current,
            {
              theme: "filled_black",
              size: "large",
              text: mode === "signup" ? "signup_with" : "signin_with",
              width: 380,
            },
            () => {
              if (import.meta.env.DEV) {
                notify({
                  type: "warning",
                  title: "Google OAuth Setup",
                  message: "Please configure VITE_GOOGLE_CLIENT_ID in frontend/.env",
                });
              } else {
                notify({
                  type: "info",
                  title: "Google Sign-In Unavailable",
                  message: "Google Sign-In is unavailable. Please sign in with Email & Password.",
                });
              }
              onFallbackToManual?.();
            }
          );

          // Verify that Google GIS actually injected iframe content before switching
          setTimeout(() => {
            if (isMounted && containerRef.current && containerRef.current.children.length > 0) {
              setGisRendered(true);
            }
          }, 150);
        }
      } catch (e) {
        console.warn("GIS button setup error:", e);
      }
    };

    init();

    return () => {
      isMounted = false;
    };
  }, [mode, notify, onFallbackToManual]);

  const handleManualClick = () => {
    const now = Date.now();
    if (now - lastClickRef.current < 1200) return; // Debounce rapid clicks
    lastClickRef.current = now;

    if (!GOOGLE_CLIENT_ID) {
      if (import.meta.env.DEV) {
        notify({
          type: "warning",
          title: "Google OAuth Setup Required",
          message: "Please define VITE_GOOGLE_CLIENT_ID in frontend/.env with your Google Cloud Client ID.",
          duration: 5000,
        });
      } else {
        notify({
          type: "info",
          title: "Google Sign-In Unavailable",
          message: "Google Sign-In is temporarily unavailable. Please use Email & Password below.",
          duration: 5000,
        });
      }
      onFallbackToManual?.();
      return;
    }

    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed()) {
            const reason = notification.getNotDisplayedReason?.() || "";
            console.warn("Google One-Tap not displayed:", reason);
            notify({
              type: "info",
              title: "Google One-Tap Unavailable",
              message: "Google prompt is unavailable for this session. Please use Email & Password.",
              duration: 5000,
            });
            onFallbackToManual?.();
          } else if (notification.isSkippedMoment()) {
            const reason = notification.getSkippedReason?.() || "";
            console.warn("Google One-Tap skipped:", reason);
          }
        });
      } catch (err) {
        console.warn("Error triggering Google prompt:", err);
        notify({
          type: "warning",
          title: "Google Sign-In",
          message: "Unable to open Google prompt. Please sign in with Email & Password.",
          duration: 4000,
        });
        onFallbackToManual?.();
      }
    } else {
      notify({
        type: "warning",
        title: "Google Sign-In",
        message: "Google Identity Services is loading or blocked by your browser. Please use Email & Password.",
        duration: 4000,
      });
      onFallbackToManual?.();
    }
  };

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        minHeight: "48px",
      }}
    >
      {/* Official GIS container if Google client ID is configured */}
      <div
        ref={containerRef}
        style={{
          display: gisRendered ? "flex" : "none",
          justifyContent: "center",
          width: "100%",
        }}
      />

      {/* Guaranteed Always-Visible Cyber Google Button (Active fallback or primary when GIS iframe is pending) */}
      {!gisRendered && (
        <button
          type="button"
          onClick={handleManualClick}
          disabled={loading}
          className="google-auth-button-ui"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            width: "100%",
            height: "48px",
            background: "rgba(10, 20, 34, 0.8)",
            border: "1px solid rgba(0, 229, 255, 0.28)",
            borderRadius: "50px",
            color: "#ffffff",
            fontFamily: "'Inter', sans-serif",
            fontSize: "0.95rem",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.25s ease",
            boxShadow: "0 4px 18px rgba(0, 0, 0, 0.5), inset 0 0 10px rgba(0, 229, 255, 0.05)",
          }}
        >
          <GoogleIcon size={20} />
          <span>{loading ? "Authenticating..." : label}</span>
        </button>
      )}
    </div>
  );
}
