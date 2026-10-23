import { useEffect, useState } from "react";
import { NavLink, Outlet, useParams } from "react-router-dom";
import { api } from "../api.js";
import { roleLabel, usePageTitle } from "../workspace.jsx";

export default function ProjectLayout() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [error, setError] = useState("");
  usePageTitle(project?.name || "Project");

  useEffect(() => {
    api(`/api/projects/${id}`)
      .then((data) => setProject(data.project))
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) return <div className="banner error">{error}</div>;
  if (!project) return <p className="loading-line">Loading project…</p>;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>{project.name}</h1>
          <p>{project.description}</p>
        </div>
        <span className={`chip ${project.myRole}`}>{roleLabel(project.myRole)}</span>
      </div>
      <div className="tabs">
        <NavLink to={`/projects/${id}`} end>
          Overview
        </NavLink>
        <NavLink to={`/projects/${id}/tasks`}>Tasks</NavLink>
        <NavLink to={`/projects/${id}/team`}>Team</NavLink>
      </div>
      <Outlet context={{ project, setProject }} />
    </div>
  );
}
