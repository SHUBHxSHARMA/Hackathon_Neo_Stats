import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { roleLabel, usePageTitle } from "../workspace.jsx";

export default function Dashboard() {
  const { user } = useAuth();
  usePageTitle("Dashboard");
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/projects?limit=50")
      .then((data) => {
        setProjects(data.items);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Projects</h1>
          <p>
            {user.globalRole === "admin"
              ? "Every project on this machine."
              : "Projects you belong to."}
          </p>
        </div>
      </div>
      {error && <div className="banner error">{error}</div>}
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
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id}>
                  <td>
                    <Link to={`/projects/${project.id}`}>
                      <b>{project.name}</b>
                    </Link>
                    <div className="muted">{project.description || "No description"}</div>
                  </td>
                  <td>
                    <span className={`chip ${project.myRole}`}>{roleLabel(project.myRole)}</span>
                  </td>
                  <td>{project.memberCount}</td>
                  <td>{project.taskCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && projects.length === 0 && (
          <div className="empty">
            <b>No projects yet</b>
            <span>Ask an admin to create one, or add it from Projects.</span>
          </div>
        )}
      </div>
    </div>
  );
}
