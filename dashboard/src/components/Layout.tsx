/**
 * LAYOUT
 * ------
 * The main shell: a fixed sidebar on the left and a scrollable content area
 * on the right. Every authenticated page renders inside this layout.
 */

import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV = [
  { to: "/",          label: "Dashboard",  icon: "▦" },
  { to: "/customers", label: "Customers",  icon: "👥" },
  { to: "/orders",    label: "Orders",     icon: "📦" },
  { to: "/settings",  label: "Settings",   icon: "⚙" },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex h-screen overflow-hidden">

      {/* ── Sidebar ───────────────────────────────────── */}
      <aside className="w-56 flex-shrink-0 bg-surface-card border-r border-surface-border
                        flex flex-col">

        {/* Brand header */}
        <div className="p-5 border-b border-surface-border">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center
                             text-white text-xs font-bold">W</span>
            <div>
              <p className="text-sm font-semibold text-gray-100 leading-none">BizPal</p>
              <p className="text-xs text-gray-500 mt-0.5">CRM Dashboard</p>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 p-3 space-y-0.5">
          {NAV.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-brand/20 text-brand font-medium"
                    : "text-gray-400 hover:bg-surface-hover hover:text-gray-100"
                }`
              }
            >
              <span className="text-base w-5 text-center">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User info + logout */}
        <div className="p-3 border-t border-surface-border">
          <div className="px-3 py-2 mb-1">
            <p className="text-xs font-medium text-gray-200 truncate">
              {user?.businessName}
            </p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg
                       text-sm text-gray-400 hover:bg-red-900/30 hover:text-red-400
                       transition-colors"
          >
            <span>↩</span> Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────── */}
      <main className="flex-1 overflow-y-auto bg-surface">
        <Outlet />
      </main>

    </div>
  );
}
