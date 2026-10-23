import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { roleLabel, usePageTitle } from "../workspace.jsx";

export default function Projects() {
  const { user } = useAuth();
  usePageTitle("Projects");
  const [params] = useSearchParams();
  const filter = (params.get("q") || "").trim().toLowerCase();
  const [projects, setProjects] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const isAdmin = user.globalRole === "admin";

  async function load() {
    const data = await api("/api/projects?limit=50");
    setProjects(data.items);
    setLoading(false);
  }

  useEffect(() => {
    load().catch((err) => {
      setError(err.message);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(event) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function create(event) {
    event.preventDefault();
    setError("");
    try {
      await api("/api/projects", { method: "POST", body: { name, description } });
      setName("");
      setDescription("");
      setOpen(false);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function archive(id) {
    setError("");
    try {
      await api(`/api/projects/${id}/archive`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(id, projectName) {
    if (
      !window.confirm(
        `Delete “${projectName}” and all of its tasks, members, and comments? This cannot be undone.`
      )
    ) {
      return;
    }
    setError("");
    try {
      await api(`/api/projects/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  const visible = filter
    ? projects.filter((project) =>
        `${project.name} ${project.description}`.toLowerCase().includes(filter)
      )
    : projects;

  return (
    <div className="page">
      <div className="toolbar">
        <p className="muted" style={{ margin: 0 }}>
          {filter ? `Showing matches for “${filter}”.` : "Admin creates projects. Everyone else only sees memberships."}
        </p>
        {isAdmin && (
          <button className="btn teal" type="button" onClick={() => { setError(""); setOpen(true); }}>
            New project
          </button>
        )}
      </div>
      {error && !open && <div className="banner error">{error}</div>}
      {loading && <p className="loading-line">Loading projects…</p>}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Project</th>
                <th>Your role</th>
                <th>Members</th>
                <th>Tasks</th>
                <th>Status</th>
                {isAdmin && <th></th>}
              </tr>
            </thead>
            <tbody>
              {visible.map((project) => (
                <tr key={project.id}>
                  <td>
                    <Link to={`/projects/${project.id}`}>
                      <b>{project.name}</b>
                    </Link>
                    <div className="muted">{project.description}</div>
                  </td>
                  <td>
                    <span className={`chip ${project.myRole}`}>{roleLabel(project.myRole)}</span>
                  </td>
                  <td>{project.memberCount}</td>
                  <td>{project.taskCount}</td>
                  <td>
                    <span className={`chip ${project.status}`}>{project.status}</span>
                  </td>
                  {isAdmin && (
                    <td>
                      <div className="row">
                        {project.status === "active" && (
                          <button className="btn ghost" type="button" onClick={() => archive(project.id)}>
                            Archive
                          </button>
                        )}
                        <button className="btn danger" type="button" onClick={() => remove(project.id, project.name)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && visible.length === 0 && (
          <div className="empty">
            <b>No projects here</b>
            <span>{isAdmin ? "Use New project to add one." : "You are not on a project yet."}</span>
          </div>
        )}
      </div>

      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <form className="modal grid" onClick={(event) => event.stopPropagation()} onSubmit={create}>
            <div className="modal-head">
              <div>
                <h2>New project</h2>
                <p className="muted">Only Admin can create a project. Members and tasks come next.</p>
              </div>
              <button className="modal-close" type="button" onClick={() => setOpen(false)} aria-label="Close">
                ×
              </button>
            </div>
            {error && <div className="banner error">{error}</div>}
            <label>
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
            </label>
            <label>
              Description
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
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
    </div>
  );
}
