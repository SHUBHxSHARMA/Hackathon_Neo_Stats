import { useNavigate, useOutletContext } from "react-router-dom";
import { canManageProject, useAuth } from "../auth.jsx";
import { api } from "../api.js";
import { useState } from "react";
import { roleLabel } from "../workspace.jsx";

export default function ProjectOverview() {
  const { project, setProject } = useOutletContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [message, setMessage] = useState("");
  const canEdit = canManageProject(project.myRole);
  const isAdmin = user.globalRole === "admin";

  async function save(event) {
    event.preventDefault();
    setMessage("");
    try {
      const data = await api(`/api/projects/${project.id}`, {
        method: "PATCH",
        body: { name, description },
      });
      setProject(data.project);
      setMessage("Saved.");
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function remove() {
    if (
      !window.confirm(
        `Delete “${project.name}” and all of its tasks, members, and comments? This cannot be undone.`
      )
    ) {
      return;
    }
    setMessage("");
    try {
      await api(`/api/projects/${project.id}`, { method: "DELETE" });
      navigate("/projects");
    } catch (err) {
      setMessage(err.message);
    }
  }

  return (
    <div className="page">
      <div className="grid stats">
        <div className="stat">
          <b>{project.memberCount ?? "—"}</b>
          <span>People</span>
        </div>
        <div className="stat">
          <b>{project.taskCount ?? "—"}</b>
          <span>Tasks</span>
        </div>
        <div className="stat">
          <b>{roleLabel(project.myRole)}</b>
          <span>Your role</span>
        </div>
        <div className="stat">
          <b>{project.status}</b>
          <span>Project status</span>
        </div>
      </div>
      <div className="grid two">
        <div className="card">
          <h3>How this workspace works</h3>
          <p className="muted">
            Created by {project.createdBy?.name}. The server checks your role on every write, not just the buttons on this page.
          </p>
          <p>
            Your role here is <b>{roleLabel(project.myRole)}</b>. Team members can update assigned tasks. Viewers stay read-only.
          </p>
        </div>
        {canEdit ? (
          <form className="card grid" onSubmit={save}>
            <h3>Edit details</h3>
            {message && (
              <div className={`banner ${message === "Saved." ? "ok" : "error"}`}>{message}</div>
            )}
            <label>
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              Description
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>
            <div className="row">
              <button className="btn">Save</button>
              {isAdmin && (
                <button className="btn danger" type="button" onClick={remove}>
                  Delete project
                </button>
              )}
            </div>
          </form>
        ) : (
          <div className="card">
            <h3>Read only</h3>
            <p className="muted">Your role cannot change project details.</p>
          </div>
        )}
      </div>
    </div>
  );
}
