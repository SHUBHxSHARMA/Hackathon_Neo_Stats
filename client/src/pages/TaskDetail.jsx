import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../api.js";
import { canManageProject, canWrite, useAuth } from "../auth.jsx";

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [task, setTask] = useState(null);
  const [projectRole, setProjectRole] = useState(null);
  const [comments, setComments] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("todo");
  const [assigneeId, setAssigneeId] = useState("");
  const [members, setMembers] = useState([]);
  const [directory, setDirectory] = useState([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(null);

  async function load() {
    setError("");
    const taskData = await api(`/api/tasks/${id}`);
    const next = taskData.task;
    setTask(next);
    setTitle(next.title);
    setDescription(next.description);
    setStatus(next.status);
    setAssigneeId(next.assigneeId || "");
    const [commentData, projectData, memberData, dir] = await Promise.all([
      api(`/api/tasks/${id}/comments?limit=50`),
      api(`/api/projects/${next.projectId}`),
      api(`/api/projects/${next.projectId}/members?limit=50`),
      user.globalRole === "admin"
        ? api("/api/users/directory")
        : Promise.resolve({ users: [] }),
    ]);
    setComments(commentData.comments);
    setProjectRole(projectData.project.myRole);
    setMembers(memberData.members);
    setDirectory(dir.users || []);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [id]);

  const role = projectRole;
  const isAdmin = user.globalRole === "admin" || role === "admin";
  const manager = isAdmin || canManageProject(role);
  const writer = canWrite(role) || isAdmin;
  const canEdit = manager || writer;

  async function save(event) {
    event.preventDefault();
    setError("");
    setConflict(null);
    try {
      const payload = { version: task.version, title, description, status };
      if (manager) payload.assigneeId = assigneeId || null;
      if (isAdmin && assigneeId) payload.asProjectManager = true;
      const data = await api(`/api/tasks/${id}`, { method: "PATCH", body: payload });
      setTask(data.task);
      setTitle(data.task.title);
      setDescription(data.task.description);
      setStatus(data.task.status);
      setAssigneeId(data.task.assigneeId || "");
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && err.payload?.error?.task) {
        setConflict(err.payload.error.task);
        setError(err.message);
      } else {
        setError(err.message);
      }
    }
  }

  async function remove() {
    setError("");
    try {
      await api(`/api/tasks/${id}`, { method: "DELETE" });
      navigate(`/projects/${task.projectId}/tasks`);
    } catch (err) {
      setError(err.message);
    }
  }

  async function comment(event) {
    event.preventDefault();
    setError("");
    try {
      await api(`/api/tasks/${id}/comments`, { method: "POST", body: { body } });
      setBody("");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteComment(commentId) {
    try {
      await api(`/api/comments/${commentId}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!task) return error ? <div className="banner error">{error}</div> : <p>Loading task…</p>;

  return (
    <div>
      <p className="muted">
        <Link to={`/projects/${task.projectId}/tasks`}>Back to tasks</Link>
      </p>
      <div className="page-head">
        <div>
          <h1>{task.title}</h1>
          <p>
            Version {task.version} · {task.assignee?.name || "Unassigned"}
          </p>
        </div>
        <span className={`chip ${task.status}`}>{task.status.replace("_", " ")}</span>
      </div>
      {error && <div className={`banner ${conflict ? "" : "error"}`}>{error}</div>}
      {conflict && (
        <div className="banner">
          Someone else saved first (now version {conflict.version}). Reload to see their
          changes, then edit again.
          <div className="row" style={{ marginTop: 8 }}>
            <button
              className="btn"
              type="button"
              onClick={() =>
                load()
                  .then(() => {
                    setConflict(null);
                    setError("");
                  })
                  .catch((err) => setError(err.message))
              }
            >
              Reload latest
            </button>
          </div>
        </div>
      )}
      <div className="grid two">
        <form className="card grid" onSubmit={save}>
          <h3>Task</h3>
          <label>
            Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={!canEdit} />
          </label>
          <label>
            Description
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={!canEdit} />
          </label>
          <label>
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value)} disabled={!canEdit}>
              <option value="todo">todo</option>
              <option value="in_progress">in_progress</option>
              <option value="done">done</option>
            </select>
          </label>
          {manager && (
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
          )}
          {isAdmin && (
            <p className="muted">
              As Admin, the person you pick becomes the <b>project manager</b> on this
              project and is assigned this task. Save to apply.
            </p>
          )}
          {canEdit && (
            <div className="row">
              <button className="btn teal">Save (sends version {task.version})</button>
              {manager && (
                <button className="btn danger" type="button" onClick={remove}>
                  Delete
                </button>
              )}
            </div>
          )}
          {!canEdit && <p className="muted">Read only. Viewers cannot change tasks or comment.</p>}
        </form>
        <div className="card grid">
          <h3>Comments</h3>
          {comments.map((item) => (
            <div key={item.id}>
              <b>{item.user?.name}</b>
              <p className="muted">{new Date(item.createdAt).toLocaleString()}</p>
              <p>{item.body}</p>
              {(item.userId === user.id || manager) && (
                <button className="btn ghost" type="button" onClick={() => deleteComment(item.id)}>
                  Delete
                </button>
              )}
            </div>
          ))}
          {writer ? (
            <form className="grid" onSubmit={comment}>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a comment" required />
              <button className="btn">Add comment</button>
            </form>
          ) : (
            <p className="muted">Viewers cannot comment.</p>
          )}
        </div>
      </div>
    </div>
  );
}
