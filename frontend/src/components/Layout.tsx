import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FilePlus,
  BarChart3,
  FolderOpen,
  Settings,
  Shield,
  Bell,
  User,
  BookOpen,
  History,
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { to: '/new-inspection', label: 'New Inspection', icon: FilePlus },
  { to: '/observations', label: 'CFR Citations', icon: BarChart3 },
  { to: '/library', label: 'Document Library', icon: FolderOpen },
  { to: '/references', label: 'References', icon: BookOpen },
  { to: '/audit-trail', label: 'Audit Trail', icon: History },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Layout() {
  const location = useLocation();

  const pageTitle = navItems.find((n) => location.pathname.startsWith(n.to))?.label ?? 'Smart Inspections';

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#003366]">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900">Smart Inspections</h1>
            <p className="text-[11px] leading-tight text-gray-400">AI-Assisted FDA 483 Drafting</p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-navy-50 font-medium text-navy-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-gray-100 px-5 py-3">
          <p className="text-xs text-gray-400">v1.0.0 — DAEN Capstone</p>
        </div>
      </aside>

      <div className="flex flex-1 flex-col pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-gray-900">Smart Inspections</span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-500">AI-Assisted FDA 483 Drafting</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
              <Bell className="h-5 w-5" />
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-100 text-sm font-medium text-navy-700">
              <User className="h-4 w-4" />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
