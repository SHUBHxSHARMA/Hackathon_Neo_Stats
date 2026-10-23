import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { api } from "../api.js";
import { canManageProject, useAuth } from "../auth.jsx";
import {
  DATE_MAX,
  DATE_MIN,
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
  formatDueDate,
  priorityLabel,
  sanitizeDueDate,
  statusLabel,
} from "../taskDisplay.js";
import { Avatar } from "../workspace.jsx";

const emptyForm = {
  title: "",
  description: "",
  status: "todo",
  priority: "medium",
  assigneeId: "",
  dueDate: "",
};

export default function ProjectTasks() {
  const { project } = useOutletContext();
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [directory, setDirectory] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const isAdmin = user.globalRole === "admin" || project.myRole === "admin";
  const canManage = isAdmin || canManageProject(project.myRole);

  function setField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function load() {
    const [taskData, memberData, dir] = await Promise.all([
      api(`/api/projects/${project.id}/tasks?limit=50`),
      api(`/api/projects/${project.id}/members?limit=50`),
      isAdmin ? api("/api/users/directory") : Promise.resolve({ users: [] }),
    ]);
    setTasks(taskData.items);
    setMembers(memberData.members);
    setDirectory(dir.users || []);
    setLoading(false);
  }

  useEffect(() => {
    setLoading(true);
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

  function openModal() {
    setError("");
    setForm(emptyForm);
    setOpen(true);
  }

  async function create(event) {
    event.preventDefault();
    setError("");
    try {
      await api(`/api/projects/${project.id}/tasks`, {
        method: "POST",
        body: {
          title: form.title,
          description: form.description,
          status: form.status,
          priority: form.priority,
          dueDate: form.dueDate || null,
          assigneeId: form.assigneeId || null,
          asProjectManager: isAdmin && Boolean(form.assigneeId),
        },
      });
      setOpen(false);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  const people = isAdmin
    ? directory.map((person) => ({ id: person.id, label: person.name }))
    : members.map((member) => ({ id: member.userId, label: member.user.name }));

  return (
    <div className="page">
      <div className="toolbar">
        <p className="muted" style={{ margin: 0 }}>
          {canManage
            ? "Create tasks with status, priority, assignee, and due date."
            : "Only a project manager can create or assign tasks."}
        </p>
        {canManage && (
          <button className="btn teal" type="button" onClick={openModal}>
            New task
          </button>
        )}
      </div>
      {error && !open && <div className="banner error">{error}</div>}
      {loading && <p className="loading-line">Loading tasks…</p>}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Assignee</th>
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
                    <div className="muted">version {task.version}</div>
                  </td>
                  <td>
                    <span className={`chip ${task.status}`}>{statusLabel(task.status)}</span>
                  </td>
                  <td>
                    <span className={`chip priority-${task.priority || "medium"}`}>
                      {priorityLabel(task.priority)}
                    </span>
                  </td>
                  <td>
                    {task.assignee ? (
                      <span className="person">
                        <Avatar name={task.assignee.name} />
                        {task.assignee.name}
                      </span>
                    ) : (
                      <span className="muted">Unassigned</span>
                    )}
                  </td>
                  <td className="muted">{task.dueDate ? formatDueDate(task.dueDate) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && tasks.length === 0 && (
          <div className="empty">
            <b>No tasks yet</b>
            <span>{canManage ? "Open New task to add the first one." : "Nothing assigned in this project."}</span>
          </div>
        )}
      </div>

      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <form className="modal grid" onClick={(event) => event.stopPropagation()} onSubmit={create}>
            <div className="modal-head">
              <div>
                <h2>New task</h2>
                <p className="muted">
                  New tasks start as To do with Medium priority unless you change them.
                </p>
              </div>
              <button className="modal-close" type="button" onClick={() => setOpen(false)} aria-label="Close">
                ×
              </button>
            </div>
            {error && <div className="banner error">{error}</div>}
            <label>
              Title
              <input
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                required
                autoFocus
              />
            </label>
            <label>
              Description
              <textarea value={form.description} onChange={(e) => setField("description", e.target.value)} />
            </label>
            <label>
              Status
              <select value={form.status} onChange={(e) => setField("status", e.target.value)}>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Priority
              <select value={form.priority} onChange={(e) => setField("priority", e.target.value)}>
                {PRIORITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Assignee
              <div className="field-clear">
                <select value={form.assigneeId} onChange={(e) => setField("assigneeId", e.target.value)}>
                  <option value="">Unassigned</option>
                  {people.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.label}
                    </option>
                  ))}
                </select>
                <button className="btn ghost" type="button" onClick={() => setField("assigneeId", "")}>
                  ×
                </button>
              </div>
            </label>
            {isAdmin && (
              <p className="muted">
                As Admin, the person you pick becomes the project manager on this project and owns the task.
              </p>
            )}
            <label>
              Due date
              <input
                type="date"
                min={DATE_MIN}
                max={DATE_MAX}
                value={form.dueDate}
                onChange={(e) => setField("dueDate", sanitizeDueDate(e.target.value))}
              />
            </label>
            <div className="modal-actions">
              <button className="btn ghost" type="button" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button className="btn teal">Create task</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
