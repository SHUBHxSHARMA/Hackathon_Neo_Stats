import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { api } from "../api.js";
import { canManageProject, useAuth } from "../auth.jsx";

export default function ProjectTasks() {
  const { project } = useOutletContext();
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [directory, setDirectory] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [error, setError] = useState("");
  const isAdmin = user.globalRole === "admin" || project.myRole === "admin";
  const canManage = isAdmin || canManageProject(project.myRole);

  async function load() {
    const [taskData, memberData, dir] = await Promise.all([
      api(`/api/projects/${project.id}/tasks?limit=50`),
      api(`/api/projects/${project.id}/members?limit=50`),
      isAdmin ? api("/api/users/directory") : Promise.resolve({ users: [] }),
    ]);
    setTasks(taskData.items);
    setMembers(memberData.members);
    setDirectory(dir.users || []);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [project.id]);

  async function create(event) {
    event.preventDefault();
    setError("");
    try {
      await api(`/api/projects/${project.id}/tasks`, {
        method: "POST",
        body: {
          title,
          description,
          assigneeId: assigneeId || null,
          asProjectManager: isAdmin && Boolean(assigneeId),
        },
      });
      setTitle("");
      setDescription("");
      setAssigneeId("");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="grid two">
      <div className="grid">
        {error && <div className="banner error">{error}</div>}
        {tasks.map((task) => (
          <Link key={task.id} to={`/tasks/${task.id}`} className="card task-link">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <h3>{task.title}</h3>
              <span className={`chip ${task.status}`}>{task.status.replace("_", " ")}</span>
            </div>
            <p className="muted">{task.assignee?.name || "Unassigned"} · version {task.version}</p>
          </Link>
        ))}
        {tasks.length === 0 && <div className="card empty">No tasks yet.</div>}
      </div>
      {canManage ? (
        <form className="card grid" onSubmit={create}>
          <h3>New task</h3>
          <label>
            Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>
          <label>
            Description
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <label>
            {isAdmin ? "Assign project manager to this task" : "Assignee"}
            <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
              <option value="">Unassigned</option>
              {isAdmin
                ? directory.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name} ({person.email})
                    </option>
                  ))
                : members.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.user.name} ({member.role})
                    </option>
                  ))}
            </select>
          </label>
          {isAdmin && (
            <p className="muted">
              That person becomes the project manager on this project and owns the task.
            </p>
          )}
          <button className="btn teal">Create task</button>
        </form>
      ) : (
        <div className="card">
          <h3>Your view</h3>
          <p className="muted">Only a project manager can create or assign tasks.</p>
        </div>
      )}
    </div>
  );
}
