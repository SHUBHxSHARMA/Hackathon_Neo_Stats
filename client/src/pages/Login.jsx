import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { getToken } from "../api.js";
import { useAuth } from "../auth.jsx";
import { BrandMark } from "../workspace.jsx";

export default function Login() {
  const { user, ready, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("admin@local.test");
  const [password, setPassword] = useState("Password123!");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const replay = new URLSearchParams(location.search).get("intro") === "1";

  if (replay && !getToken()) return <Navigate to="/?intro=1" replace />;
  if (ready && user) return <Navigate to="/dashboard" replace />;
  if (!ready) return <div className="auth-screen auth-loading">Loading…</div>;

  async function onSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email, password);
      navigate(location.state?.from?.pathname || "/dashboard", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-split">
      <section className="login-hero" aria-label="WorkNest">
        <a className="login-hero-brand" href="/login">
          <BrandMark />
          <span>
            <strong>WorkNest</strong>
            <small>BY NeoStats</small>
          </span>
        </a>

        <div className="login-hero-copy">
          <p className="login-kicker">Work, in the nest</p>
          <h1>One workspace for projects, people, and tasks.</h1>
          <p className="login-lede">
            Four roles share the board. Express still checks every write — even if someone opens Postman.
          </p>

          <div className="login-status">
            <div className="login-status-head">
              <span>What the server actually does</span>
              <span className="login-status-pill">Enforced</span>
            </div>
            <div className="login-status-bar" aria-hidden="true">
              <span />
            </div>
            <ul>
              <li>Roles live on the server. Skip the UI and you still get 403.</li>
              <li>Two people save the same task — the second save is HTTP 409.</li>
            </ul>
          </div>
        </div>

        <p className="login-hero-foot">A local project manager by NeoStats.</p>
      </section>

      <section className="login-panel">
        <form className="login-form" onSubmit={onSubmit}>
          <p className="login-welcome">Welcome back</p>
          <h2>Sign in to your workspace</h2>
          <p className="muted">Use your WorkNest account to continue.</p>
          {error && <div className="banner error">{error}</div>}
          <label>
            Email address
            <input
              id="login-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          <button className="auth-btn forest wide" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
          <p className="auth-accounts">
            Demo password for every account: <code>Password123!</code>
            <br />
            admin@local.test · pm@local.test · member@local.test · viewer@local.test
          </p>
        </form>
      </section>
    </div>
  );
}
