import { useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";

export default function Profile() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user.name);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function save(event) {
    event.preventDefault();
    setMessage("");
    try {
      const body = { name };
      if (password) body.password = password;
      const data = await api("/api/me/profile", { method: "PATCH", body });
      setUser(data.user);
      setPassword("");
      setMessage("Saved.");
    } catch (err) {
      setMessage(err.message);
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Profile</h1>
          <p>{user.email}</p>
        </div>
        <span className={`chip ${user.globalRole}`}>{user.globalRole}</span>
      </div>
      <form className="card grid" style={{ maxWidth: 420 }} onSubmit={save}>
        {message && (
          <div className={`banner ${message === "Saved." ? "ok" : "error"}`}>{message}</div>
        )}
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          New password (optional)
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button className="btn">Save</button>
      </form>
    </div>
  );
}
