import { NavLink, Outlet } from "react-router-dom";
import clsx from "clsx";

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 bg-canvas/85 backdrop-blur border-b border-ink-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <NavLink to="/" className="flex items-center gap-2.5 group">
            <Logo />
            <span className="font-display font-bold text-ink-900 text-lg tracking-tight">
              PathLab
            </span>
          </NavLink>
          <nav className="flex items-center gap-1">
            <NavItem to="/arena">Arena</NavItem>
            <NavItem to="/editor">Bot editor</NavItem>
            <NavItem to="/maze-editor">Maze editor</NavItem>
            <NavItem to="/guide">Guide</NavItem>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-ink-100 bg-canvas">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-ink-500">
          <span>
            PathLab. An algorithm battle arena built with Vite, React, TypeScript, and Tailwind.
          </span>
          <span className="font-mono">v2.3.0</span>
        </div>
      </footer>
    </div>
  );
}

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        clsx(
          "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
          isActive
            ? "bg-ink-900 text-white"
            : "text-ink-700 hover:bg-canvas-sunken",
        )
      }
    >
      {children}
    </NavLink>
  );
}

function Logo() {
  return (
    <span className="w-8 h-8 rounded-xl bg-brand-500 text-white flex items-center justify-center shadow-soft group-hover:rotate-3 transition-transform">
      <svg viewBox="0 0 24 24" width={18} height={18} fill="none">
        <path
          d="M4 4h4v4H4zM10 4h4v4h-4zM16 4h4v4h-4zM4 10h4v4H4zM16 10h4v4h-4zM4 16h4v4H4zM10 16h4v4h-4zM16 16h4v4h-4z"
          fill="currentColor"
          opacity="0.55"
        />
        <circle cx="12" cy="12" r="2.5" fill="#FF7849" />
      </svg>
    </span>
  );
}
