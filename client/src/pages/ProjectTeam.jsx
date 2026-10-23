import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { api } from "../api.js";
import { canManageProject, useAuth } from "../auth.jsx";

export default function ProjectTeam() {
  const { project } = useOutletContext();
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [directory, setDirectory] = useState([]);
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("team_member");
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
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [project.id]);

  async function add(event) {
    event.preventDefault();
    setError("");
    try {
      await api(`/api/projects/${project.id}/members`, {
        method: "POST",
        body: { userId, role },
      });
      setUserId("");
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

  return (
    <div className="grid two">
      <div className="card">
        <h3>People on this project</h3>
        {error && <div className="banner error">{error}</div>}
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              {canManage && <th></th>}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id}>
                <td>
                  {member.user.name}
                  <div className="muted">{member.user.email}</div>
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
                    <span className={`chip ${member.role}`}>{member.role}</span>
                  )}
                </td>
                {canManage && (
                  <td>
                    {(isAdmin || member.role !== "project_manager") && (
                      <button className="btn ghost" onClick={() => remove(member.userId)}>
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
      {canManage && (
        <form className="card grid" onSubmit={add}>
          <h3>{isAdmin ? "Add member or project manager" : "Add member"}</h3>
          {isAdmin && (
            <p className="muted">
              Only Admin can assign the <b>project manager</b> role. Pick a person, choose
              that role, then Add.
            </p>
          )}
          <label>
            User
            <select value={userId} onChange={(e) => setUserId(e.target.value)} required>
              <option value="">Choose…</option>
              {directory
                .filter((person) => !members.some((member) => member.userId === person.id))
                .map((person) => (
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
          <button className="btn teal">Add</button>
        </form>
      )}
    </div>
  );
}
