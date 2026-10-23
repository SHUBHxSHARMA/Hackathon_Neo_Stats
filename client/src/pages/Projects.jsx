import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";

export default function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const isAdmin = user.globalRole === "admin";

  async function load() {
    const data = await api("/api/projects?limit=50");
    setProjects(data.items);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  async function create(event) {
    event.preventDefault();
    setError("");
    try {
      await api("/api/projects", { method: "POST", body: { name, description } });
      setName("");
      setDescription("");
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

  async function remove(id, name) {
    if (
      !window.confirm(
        `Delete “${name}” and all of its tasks, members, and comments? This cannot be undone.`
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

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Projects</h1>
          <p>Admin creates projects. Everyone else only sees memberships.</p>
        </div>
      </div>
      {error && <div className="banner error">{error}</div>}
      <div className="grid two">
        <div className="grid">
          {projects.map((project) => (
            <div key={project.id} className="card">
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div>
                  <h3>
                    <Link to={`/projects/${project.id}`}>{project.name}</Link>
                  </h3>
                  <p className="muted">{project.description}</p>
                </div>
                <span className={`chip ${project.myRole}`}>{project.myRole}</span>
              </div>
              {isAdmin && (
                <div className="row">
                  {project.status === "active" && (
                    <button className="btn ghost" onClick={() => archive(project.id)}>
                      Archive
                    </button>
                  )}
                  <button
                    className="btn danger"
                    onClick={() => remove(project.id, project.name)}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        {isAdmin && (
          <form className="card grid" onSubmit={create}>
            <h3>New project</h3>
            <label>
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label>
              Description
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>
            <button className="btn teal">Create</button>
          </form>
        )}
      </div>
    </div>
  );
}
