import { useEffect, useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { Avatar, roleLabel, usePageTitle } from "../workspace.jsx";

const emptyCreate = { name: "", email: "", password: "Password123!", globalRole: "user" };

export default function Users() {
  const { user } = useAuth();
  usePageTitle("Users");
  const [users, setUsers] = useState([]);
  const [createForm, setCreateForm] = useState(emptyCreate);
  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState("user");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    const data = await api("/api/users?limit=50");
    setUsers(data.items);
    setLoading(false);
  }

  useEffect(() => {
    load().catch((err) => {
      setError(err.message);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!open && !editing) return undefined;
    function onKey(event) {
      if (event.key === "Escape") {
        setOpen(false);
        setEditing(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, editing]);

  async function create(event) {
    event.preventDefault();
    setError("");
    try {
      await api("/api/users", { method: "POST", body: createForm });
      setCreateForm(emptyCreate);
      setOpen(false);
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
    setOpen(false);
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
    <div className="page">
      <div className="toolbar">
        <p className="muted" style={{ margin: 0 }}>
          Admin only. Global role is admin or user. Project manager is set on a project Team tab.
        </p>
        <button
          className="btn teal"
          type="button"
          onClick={() => {
            setError("");
            setEditing(null);
            setOpen(true);
          }}
        >
          Create user
        </button>
      </div>
      {error && !open && !editing && <div className="banner error">{error}</div>}
      {loading && <p className="loading-line">Loading people…</p>}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Person</th>
                <th>Role</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((person) => (
                <tr key={person.id}>
                  <td>
                    <span className="person">
                      <Avatar name={person.name} />
                      <span className="meta">
                        <b>{person.name}</b>
                        <span className="muted">{person.email}</span>
                      </span>
                    </span>
                  </td>
                  <td>
                    <span className={`chip ${person.globalRole}`}>{roleLabel(person.globalRole)}</span>
                  </td>
                  <td>{person.isActive ? "active" : "deactivated"}</td>
                  <td>
                    <div className="row">
                      <button className="btn ghost" type="button" onClick={() => startEdit(person)}>
                        Edit
                      </button>
                      {person.isActive && person.id !== user.id && (
                        <button className="btn ghost" type="button" onClick={() => deactivate(person.id)}>
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
      </div>

      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <form className="modal grid" onClick={(event) => event.stopPropagation()} onSubmit={create}>
            <div className="modal-head">
              <div>
                <h2>Create user</h2>
                <p className="muted">No public signup. Admin creates accounts here.</p>
              </div>
              <button className="modal-close" type="button" onClick={() => setOpen(false)} aria-label="Close">
                ×
              </button>
            </div>
            {error && <div className="banner error">{error}</div>}
            <label>
              Name
              <input
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                required
                autoFocus
              />
            </label>
            <label>
              Email
              <input
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                required
              />
            </label>
            <label>
              Password
              <input
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                required
              />
            </label>
            <label>
              Global role
              <select
                value={createForm.globalRole}
                onChange={(e) => setCreateForm({ ...createForm, globalRole: e.target.value })}
              >
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
            </label>
            <div className="modal-actions">
              <button className="btn ghost" type="button" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button className="btn teal">Create</button>
            </div>
          </form>
        </div>
      )}

      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <form className="modal grid" onClick={(event) => event.stopPropagation()} onSubmit={saveEdit}>
            <div className="modal-head">
              <div>
                <h2>Edit {editing.name}</h2>
                <p className="muted">Leave password blank to keep the current one.</p>
              </div>
              <button className="modal-close" type="button" onClick={() => setEditing(null)} aria-label="Close">
                ×
              </button>
            </div>
            {error && <div className="banner error">{error}</div>}
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
            <div className="modal-actions">
              <button className="btn ghost" type="button" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button className="btn teal">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
