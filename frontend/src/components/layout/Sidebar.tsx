import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Dashboard" },
  { to: "/jobs", label: "Jobs" },
  { to: "/datasets", label: "Datasets" },
  { to: "/config", label: "Config" },
  { to: "/settings", label: "Settings" },
];

export function Sidebar() {
  return (
    <aside className="w-56 bg-surface-2 border-r border-border min-h-screen flex flex-col">
      <div className="p-4 border-b border-border">
        <h1 className="text-lg font-bold text-accent">Musubi Tuner UI</h1>
      </div>
      <nav className="flex-1 p-2">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `block px-3 py-2 rounded text-sm mb-1 transition-colors ${
                isActive
                  ? "bg-surface-3 text-accent font-medium"
                  : "text-text-dim hover:text-text hover:bg-surface-3/50"
              }`
            }
          >
            {l.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
