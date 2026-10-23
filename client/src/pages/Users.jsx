import { useEffect, useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";

export default function Users() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("Password123!");
  const [globalRole, setGlobalRole] = useState("user");
  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState("user");
  const [error, setError] = useState("");

  async function load() {
    const data = await api("/api/users?limit=50");
    setUsers(data.items);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  async function create(event) {
    event.preventDefault();
    setError("");
    try {
      await api("/api/users", { method: "POST", body: { name, email, password, globalRole } });
      setName("");
      setEmail("");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function deactivate(id) {
    setError("");
    try {
      await api(`/api/users/${id}/deactivate`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function activate(id) {
    setError("");
    try {
      await api(`/api/users/${id}/activate`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(person) {
    setError("");
    setEditing(person);
    setEditName(person.name);
    setEditEmail(person.email);
    setEditRole(person.globalRole);
    setEditPassword("");
  }

  async function saveEdit(event) {
    event.preventDefault();
    setError("");
    try {
      const body = { name: editName, email: editEmail, globalRole: editRole };
      if (editPassword) body.password = editPassword;
      await api(`/api/users/${editing.id}`, { method: "PATCH", body });
      setEditing(null);
      setEditPassword("");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Users</h1>
          <p>
            Admin only. Global role here is <b>admin</b> or <b>user</b>. To make someone a
            project manager, open a project → <b>Team</b> and set their project role.
          </p>
        </div>
      </div>
      {error && <div className="banner error">{error}</div>}
      <div className="grid two">
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((person) => (
                <tr key={person.id}>
                  <td>
                    {person.name}
                    <div className="muted">{person.email}</div>
                  </td>
                  <td>
                    <span className={`chip ${person.globalRole}`}>{person.globalRole}</span>
                  </td>
                  <td>{person.isActive ? "active" : "deactivated"}</td>
                  <td>
                    <div className="row">
                      <button className="btn ghost" type="button" onClick={() => startEdit(person)}>
                        Edit
                      </button>
                      {person.isActive && person.id !== user.id && (
                        <button className="btn ghost" onClick={() => deactivate(person.id)}>
                          Deactivate
                        </button>
                      )}
                      {!person.isActive && (
                        <button className="btn teal" type="button" onClick={() => activate(person.id)}>
                          Activate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {editing ? (
          <form className="card grid" onSubmit={saveEdit}>
            <h3>Edit {editing.name}</h3>
            <label>
              Name
              <input value={editName} onChange={(e) => setEditName(e.target.value)} required />
            </label>
            <label>
              Email
              <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} required />
            </label>
            <label>
              New password (optional)
              <input
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder="Leave blank to keep"
              />
            </label>
            <label>
              Global role
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                disabled={editing.id === user.id}
              >
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
            </label>
            <div className="row">
              <button className="btn teal">Save</button>
              <button className="btn ghost" type="button" onClick={() => setEditing(null)}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
        <form className="card grid" onSubmit={create}>
          <h3>Create user</h3>
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            Password
            <input value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <label>
            Global role
            <select value={globalRole} onChange={(e) => setGlobalRole(e.target.value)}>
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
          </label>
          <button className="btn teal">Create</button>
        </form>
        )}
      </div>
    </div>
  );
}
