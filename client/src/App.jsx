import { Navigate, NavLink, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth.jsx";
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

function Guard({ children, adminOnly }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <div className="main">Loading…</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (adminOnly && user.globalRole !== "admin") return <Navigate to="/dashboard" replace />;
  return children;
}

function Shell() {
  const { user, logout } = useAuth();
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <strong>WorkNest</strong>
          <span>BY NeoStats</span>
        </div>
        <nav className="nav">
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/projects">Projects</NavLink>
          {user.globalRole === "admin" && <NavLink to="/users">Users</NavLink>}
          <NavLink to="/profile">Profile</NavLink>
          <button type="button" onClick={logout}>
            Log out
          </button>
        </nav>
        <div className="side-user">
          <b>{user.name}</b>
          {user.email}
          <div className={`chip ${user.globalRole}`} style={{ marginTop: 8 }}>
            {user.globalRole}
          </div>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <Guard>
              <Shell />
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
