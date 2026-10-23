import { createContext, useContext, useEffect, useState } from "react";

const WorkspaceContext = createContext({
  title: "WorkNest",
  setTitle: () => {},
});

export function WorkspaceProvider({ children }) {
  const [title, setTitle] = useState("WorkNest");
  return (
    <WorkspaceContext.Provider value={{ title, setTitle }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}

export function usePageTitle(title) {
  const { setTitle } = useWorkspace();
  useEffect(() => {
    setTitle(title);
    document.title = `${title} | WorkNest`;
  }, [title, setTitle]);
}

export function initials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "W";
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function Avatar({ name, size = "md" }) {
  return (
    <span className={`avatar avatar-${size}`} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

export function roleLabel(role) {
  return String(role || "").replace(/_/g, " ");
}

export function BrandMark({ large = false }) {
  return (
    <span className={`logo-mark${large ? " logo-mark-lg" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 32 32" width="100%" height="100%">
        <rect width="32" height="32" rx="8" fill="#165c42" />
        <text
          x="16"
          y="23"
          textAnchor="middle"
          fontSize="18"
          fontWeight="800"
          fill="#F4C430"
          fontFamily="Georgia, Times New Roman, serif"
        >
          W
        </text>
      </svg>
    </span>
  );
}
