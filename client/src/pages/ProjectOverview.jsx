import { useNavigate, useOutletContext } from "react-router-dom";
import { canManageProject, useAuth } from "../auth.jsx";
import { api } from "../api.js";
import { useState } from "react";

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
    <div className="grid two">
      <div className="card">
        <h3>What this project is</h3>
        <p className="muted">
          {project.memberCount} people · {project.taskCount} tasks · created by{" "}
          {project.createdBy?.name}
        </p>
        <p>
          Your role here is <b>{project.myRole}</b>. The server checks that role on
          every write, not just the buttons on this page.
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
  );
}
