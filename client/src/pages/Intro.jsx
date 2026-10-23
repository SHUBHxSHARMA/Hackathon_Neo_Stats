import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getToken } from "../api.js";
import { useAuth } from "../auth.jsx";
import { BrandMark } from "../workspace.jsx";

const INTRO_KEY = "worknest-intro-seen";
const INTRO_MS = 2000;

function wantsIntro(search) {
  return new URLSearchParams(search).get("intro") === "1";
}

function introAlreadySeen() {
  try {
    return sessionStorage.getItem(INTRO_KEY) === "1";
  } catch {
    return false;
  }
}

function markIntroSeen() {
  try {
    sessionStorage.setItem(INTRO_KEY, "1");
  } catch {
    /* ignore private-mode quota */
  }
}

export default function Intro() {
  const { user, ready } = useAuth();
  const location = useLocation();
  const replay = wantsIntro(location.search);
  const [holdDone, setHoldDone] = useState(() => {
    if (replay) return false;
    return Boolean(getToken()) || introAlreadySeen();
  });

  useEffect(() => {
    // ?intro=1 always plays the 2s splash — even if a JWT is already stored.
    if (!replay) {
      if (getToken() || introAlreadySeen()) {
        setHoldDone(true);
        return undefined;
      }
    }
    const timer = window.setTimeout(() => {
      markIntroSeen();
      setHoldDone(true);
    }, INTRO_MS);
    return () => window.clearTimeout(timer);
  }, [replay]);

  if (!holdDone) {
    return (
      <div className="auth-screen">
        <div className="splash" role="status" aria-live="polite">
          <BrandMark large />
          <h1>WorkNest</h1>
          <p>BY NeoStats</p>
        </div>
      </div>
    );
  }

  if (!ready) {
    return <div className="auth-screen auth-loading">Loading…</div>;
  }
  if (user) return <Navigate to="/dashboard" replace />;
  return <Navigate to="/login" replace />;
}
