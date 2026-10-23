import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";

export default function Login() {
  const { user, ready, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("admin@local.test");
  const [password, setPassword] = useState("Password123!");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (ready && user) return <Navigate to="/dashboard" replace />;

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
    <div className="login-wrap">
      <form className="login-card" onSubmit={onSubmit}>
        <h1>WorkNest</h1>
        <p className="byline">BY NeoStats</p>
        <p className="muted">Log in. Roles are enforced on the server.</p>
        {error && <div className="banner error">{error}</div>}
        <div className="grid" style={{ marginTop: 18 }}>
          <label>
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
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
          <button className="btn teal" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </div>
        <div className="accounts">
          Demo password for every account: <code>Password123!</code>
          <br />
          admin@local.test · pm@local.test · member@local.test · viewer@local.test
        </div>
      </form>
    </div>
  );
}
