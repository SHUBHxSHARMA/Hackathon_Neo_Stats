import { useState } from "react";
import { Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth.jsx";
import { Avatar, BrandMark, WorkspaceProvider, roleLabel, useWorkspace } from "./workspace.jsx";
import Intro from "./pages/Intro.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Projects from "./pages/Projects.jsx";
import ProjectLayout from "./pages/ProjectLayout.jsx";
import ProjectOverview from "./pages/ProjectOverview.jsx";
import ProjectTasks from "./pages/ProjectTasks.jsx";
import ProjectTeam from "./pages/ProjectTeam.jsx";
import TaskDetail from "./pages/TaskDetail.jsx";
import Users from "./pages/Users.jsx";
import Profile from "./pages/Profile.jsx";

function Icon({ children }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      {children}
    </svg>
  );
}

function Guard({ children, adminOnly }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <div className="app-loading">Loading…</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (adminOnly && user.globalRole !== "admin") return <Navigate to="/dashboard" replace />;
  return children;
}

function Shell() {
  const { user, logout } = useAuth();
  const { title } = useWorkspace();
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  function search(event) {
    event.preventDefault();
    const q = query.trim();
    navigate(q ? `/projects?q=${encodeURIComponent(q)}` : "/projects");
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <BrandMark />
          <div>
            <strong>WorkNest</strong>
            <span>BY NeoStats</span>
          </div>
        </div>
        <nav className="nav">
          <NavLink to="/dashboard">
            <Icon>
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
            </Icon>
            Dashboard
          </NavLink>
          <NavLink to="/projects">
            <Icon>
              <path d="M3 7h7l2 2h9v10H3z" />
            </Icon>
            Projects
          </NavLink>
          {user.globalRole === "admin" && (
            <NavLink to="/users">
              <Icon>
                <circle cx="9" cy="8" r="3" />
                <path d="M3 20v-1a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1" />
                <circle cx="17" cy="9" r="2.5" />
              </Icon>
              Users
            </NavLink>
          )}
          <NavLink to="/profile">
            <Icon>
              <circle cx="12" cy="8" r="3.5" />
              <path d="M5 20v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1" />
            </Icon>
            Profile
          </NavLink>
        </nav>
      </aside>
      <header className="topbar">
        <h1 className="topbar-title">{title}</h1>
        <form className="topbar-search" onSubmit={search}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects"
            aria-label="Search projects"
          />
        </form>
        <div className="topbar-user">
          <Avatar name={user.name} />
          <div className="who">
            <b>{user.name}</b>
            <span>{user.email}</span>
          </div>
          <span className={`chip ${user.globalRole}`}>{roleLabel(user.globalRole)}</span>
          <button className="btn ghost" type="button" onClick={logout}>
            Log out
          </button>
        </div>
      </header>
      <div className="workspace">
        <div className="page-enter" key={location.pathname}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Intro />} />
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <Guard>
              <WorkspaceProvider>
                <Shell />
              </WorkspaceProvider>
            </Guard>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectLayout />}>
            <Route index element={<ProjectOverview />} />
            <Route path="tasks" element={<ProjectTasks />} />
            <Route path="team" element={<ProjectTeam />} />
          </Route>
          <Route path="/tasks/:id" element={<TaskDetail />} />
          <Route
            path="/users"
            element={
              <Guard adminOnly>
                <Users />
              </Guard>
            }
          />
          <Route path="/profile" element={<Profile />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}
