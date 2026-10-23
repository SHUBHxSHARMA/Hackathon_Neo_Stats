import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { api } from "../api.js";
import { canManageProject, useAuth } from "../auth.jsx";
import { Avatar, roleLabel } from "../workspace.jsx";

export default function ProjectTeam() {
  const { project } = useOutletContext();
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [directory, setDirectory] = useState([]);
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("team_member");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const isAdmin = user.globalRole === "admin" || project.myRole === "admin";
  const canManage = isAdmin || canManageProject(project.myRole);

  async function load() {
    const [memberData, dir] = await Promise.all([
      api(`/api/projects/${project.id}/members?limit=50`),
      canManage ? api("/api/users/directory") : Promise.resolve({ users: [] }),
    ]);
    setMembers(memberData.members);
    setDirectory(dir.users || []);
    setLoading(false);
  }

  useEffect(() => {
    load().catch((err) => {
      setError(err.message);
      setLoading(false);
    });
  }, [project.id]);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(event) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function add(event) {
    event.preventDefault();
    setError("");
    try {
      await api(`/api/projects/${project.id}/members`, {
        method: "POST",
        body: { userId, role },
      });
      setUserId("");
      setOpen(false);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function changeRole(id, nextRole) {
    setError("");
    try {
      await api(`/api/projects/${project.id}/members/${id}`, {
        method: "PATCH",
        body: { role: nextRole },
      });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(id) {
    setError("");
    try {
      await api(`/api/projects/${project.id}/members/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  const available = directory.filter((person) => !members.some((member) => member.userId === person.id));

  return (
    <div className="page">
      <div className="toolbar">
        <p className="muted" style={{ margin: 0 }}>
          {isAdmin
            ? "Admin can add a project manager here. PMs can add team members and viewers."
            : "People on this project and their roles."}
        </p>
        {canManage && (
          <button className="btn teal" type="button" onClick={() => { setError(""); setOpen(true); }}>
            Add member
          </button>
        )}
      </div>
      {error && !open && <div className="banner error">{error}</div>}
      {loading && <p className="loading-line">Loading team…</p>}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Person</th>
                <th>Role</th>
                {canManage && <th></th>}
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td>
                    <span className="person">
                      <Avatar name={member.user.name} />
                      <span className="meta">
                        <b>{member.user.name}</b>
                        <span className="muted">{member.user.email}</span>
                      </span>
                    </span>
                  </td>
                  <td>
                    {canManage && (isAdmin || member.role !== "project_manager") ? (
                      <select
                        value={member.role}
                        onChange={(e) => changeRole(member.userId, e.target.value)}
                      >
                        {isAdmin && <option value="project_manager">Project manager</option>}
                        <option value="team_member">Team member</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    ) : (
                      <span className={`chip ${member.role}`}>{roleLabel(member.role)}</span>
                    )}
                  </td>
                  {canManage && (
                    <td>
                      {(isAdmin || member.role !== "project_manager") && (
                        <button className="btn ghost" type="button" onClick={() => remove(member.userId)}>
                          Remove
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <form className="modal grid" onClick={(event) => event.stopPropagation()} onSubmit={add}>
            <div className="modal-head">
              <div>
                <h2>{isAdmin ? "Add member or project manager" : "Add member"}</h2>
                <p className="muted">
                  {isAdmin
                    ? "Only Admin can assign the project manager role."
                    : "A project manager cannot add another project manager."}
                </p>
              </div>
              <button className="modal-close" type="button" onClick={() => setOpen(false)} aria-label="Close">
                ×
              </button>
            </div>
            {error && <div className="banner error">{error}</div>}
            <label>
              Person
              <select value={userId} onChange={(e) => setUserId(e.target.value)} required>
                <option value="">Choose…</option>
                {available.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name} ({person.email})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Project role
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                {isAdmin && <option value="project_manager">Project manager</option>}
                <option value="team_member">Team member</option>
                <option value="viewer">Viewer</option>
              </select>
            </label>
            <div className="modal-actions">
              <button className="btn ghost" type="button" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button className="btn teal">Add</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
