import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { formatDueDate, priorityLabel, statusLabel } from "../taskDisplay.js";
import { Avatar, roleLabel, usePageTitle } from "../workspace.jsx";

export default function Profile() {
  const { user, setUser } = useAuth();
  usePageTitle("Profile");
  const [name, setName] = useState(user.name);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await api("/api/projects?limit=50");
        const items = data.items || [];
        const lists = await Promise.all(
          items.map((project) =>
            api(`/api/projects/${project.id}/tasks?assigneeId=${user.id}&limit=50`)
              .then((res) =>
                (res.items || []).map((task) => ({
                  ...task,
                  projectName: project.name,
                }))
              )
              .catch(() => [])
          )
        );
        if (cancelled) return;
        const assigned = lists.flat().sort((a, b) => {
          const left = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
          const right = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
          return left - right;
        });
        setProjects(items);
        setTasks(assigned);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user.id]);

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
    <div className="page profile-page">
      <div className="grid" style={{ gap: 12 }}>
        {error && <div className="banner error">{error}</div>}
        <div className="grid two">
          <div className="card">
            <div className="person" style={{ marginBottom: 12 }}>
              <Avatar name={user.name} size="lg" />
              <span className="meta">
                <h2>{user.name}</h2>
                <span className="muted">{user.email}</span>
              </span>
            </div>
            <div className="row">
              <span className={`chip ${user.globalRole}`}>{roleLabel(user.globalRole)}</span>
            </div>
            <p className="muted" style={{ marginTop: 12 }}>
              Global role lives on your user record. Project roles (PM, member, viewer) are set per project on Team.
            </p>
          </div>
          <form className="card grid" onSubmit={save}>
            <h3>Your details</h3>
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
            <div className="row">
              <button className="btn">Save</button>
            </div>
          </form>
        </div>
      </div>

      <div className="profile-work">
        <section className="card profile-panel">
          <div className="profile-panel-head">
            <div>
              <h3>My projects</h3>
              <p className="muted">Projects this account can open, with your role on each.</p>
            </div>
            <Link className="btn ghost" to="/projects">
              Go to projects
            </Link>
          </div>
          {loading && <p className="loading-line">Loading projects…</p>}
          {!loading && projects.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Your role</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => (
                    <tr key={project.id}>
                      <td>
                        <Link to={`/projects/${project.id}`}>
                          <b>{project.name}</b>
                        </Link>
                      </td>
                      <td>
                        <span className={`chip ${project.myRole}`}>{roleLabel(project.myRole)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && projects.length === 0 && (
            <div className="empty profile-empty">
              <b>You are not on a project yet</b>
              <span>Ask an admin to add you, or open the projects list.</span>
              <Link className="btn" to="/projects">
                Go to projects
              </Link>
            </div>
          )}
        </section>

        <section className="card profile-panel">
          <div className="profile-panel-head">
            <div>
              <h3>Assigned to me</h3>
              <p className="muted">Tasks from those projects where you are the assignee.</p>
            </div>
          </div>
          {loading && <p className="loading-line">Loading tasks…</p>}
          {!loading && tasks.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Due</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr key={task.id}>
                      <td>
                        <Link to={`/tasks/${task.id}`}>
                          <b>{task.title}</b>
                        </Link>
                        <div className="muted">{task.projectName}</div>
                      </td>
                      <td>
                        <span className={`chip ${task.status}`}>{statusLabel(task.status)}</span>
                      </td>
                      <td>
                        <span className={`chip priority-${task.priority || "medium"}`}>
                          {priorityLabel(task.priority)}
                        </span>
                      </td>
                      <td>{formatDueDate(task.dueDate) || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && tasks.length === 0 && (
            <div className="empty profile-empty">
              <b>No tasks assigned to you</b>
              <span>Open a project board and pick up work from there.</span>
              <Link className="btn" to="/projects">
                Go to projects
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
