import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";

export default function Dashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const data = await api("/api/projects?limit=50");
      setProjects(data.items);
      const lists = await Promise.all(
        data.items.map((project) =>
          api(`/api/projects/${project.id}/tasks?assigneeId=${user.id}&limit=20`).catch(() => ({
            items: [],
          }))
        )
      );
      setMyTasks(lists.flatMap((list) => list.items));
    }
    load().catch((err) => setError(err.message));
  }, [user.id]);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Hello, {user.name.split(" ")[0]}</h1>
          <p>
            {user.globalRole === "admin"
              ? "You can see every project and manage users."
              : "You only see projects you belong to."}
          </p>
        </div>
      </div>
      {error && <div className="banner error">{error}</div>}
      {myTasks.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3>Your assigned tasks</h3>
          <p className="muted">Open one to update it, change status, or comment.</p>
          {myTasks.map((task) => (
            <p key={task.id}>
              <Link to={`/tasks/${task.id}`}>{task.title}</Link>
              <span className={`chip ${task.status}`} style={{ marginLeft: 8 }}>
                {task.status.replace("_", " ")}
              </span>
            </p>
          ))}
        </div>
      )}
      <div className="grid cards">
        {projects.map((project) => (
          <Link key={project.id} to={`/projects/${project.id}`} className="card task-link">
            <div className="row">
              <h3>{project.name}</h3>
              <span className={`chip ${project.myRole}`}>{project.myRole}</span>
            </div>
            <p className="muted">{project.description || "No description"}</p>
            <p className="muted">
              {project.memberCount} members · {project.taskCount} tasks
            </p>
          </Link>
        ))}
        {projects.length === 0 && <div className="card empty">No projects yet.</div>}
      </div>
    </div>
  );
}
