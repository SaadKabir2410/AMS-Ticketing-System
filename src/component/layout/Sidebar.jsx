import { useState } from "react";
import {
  LayoutDashboard,
  LayoutGrid,
  FileText,
  Users,
  PenSquare,
  ShoppingBag,
  MessageSquare,
  StickyNote,
  Calendar,
  UserCircle,
  UserSquare,
  Mail,
  Ticket,
  Kanban,
  ChevronDown,
  ChevronRight,
  LogOut,
  Layers,
  History,
} from "lucide-react";

import clsx from "clsx";
import { NAV_GROUPS } from "../../data/navData";
import { useAuth } from "react-oidc-context";
import { useNavigate } from "react-router-dom";

const ICON_MAP = {
  LayoutDashboard,
  LayoutGrid,
  FileText,
  Users,
  PenSquare,
  ShoppingBag,
  MessageSquare,
  StickyNote,
  Calendar,
  UserCircle,
  UserSquare,
  Mail,
  Ticket,
  Kanban,
  ChevronDown,
  ChevronRight,
  LogOut,
  Layers,
  History,
};
function NavIcon({ name, size = 18 }) {
  const Comp = ICON_MAP[name] || LayoutDashboard;
  return <Comp size={size} />;
}

export default function Sidebar({ collapsed }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);

  const handleLogout = () => {
    setShowConfirmLogout(true);
  };

  const confirmLogout = async () => {
    // removeUser() clears react-oidc-context's internal state
    // so ProtectedRoute immediately sees the user as logged out
    await auth.removeUser();
    navigate("/login", { state: { loggedOut: true }, replace: true });
  };

  return (
    <>
      {/* Logout Confirmation Warning Modal */}
      {showConfirmLogout && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setShowConfirmLogout(false)}
          />
          <div className="relative w-full max-w-sm bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-6 text-red-500">
              <LogOut size={32} />
            </div>

            <h3 className="text-xl font-bold text-white text-center mb-2">
              Confirm Logout
            </h3>
            <p className="text-slate-400 text-center mb-8 text-sm">
              Are you sure you want to end your session? You will need to sign
              in again to access the portal.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setShowConfirmLogout(false)}
                className="py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold transition-colors border border-white/5"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold shadow-lg shadow-red-500/20 transition-all"
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}

      <aside
        className={clsx(
          "flex flex-col h-screen sticky top-0 border-r border-slate-200 dark:border-slate-800/10",
          "bg-slate-800 dark:bg-slate-900 overflow-hidden shrink-0 transition-all duration-300",
          collapsed ? "w-[68px]" : "w-[260px]",
        )}
      >
        {/* Logo section */}
        <div
          className={clsx(
            "flex items-center gap-3 border-b border-white/5 transition-all duration-300",
            collapsed ? "justify-center px-4 py-[20px]" : "px-6 py-[24px]",
          )}
        >
          <div className="w-9 h-9 rounded-xl bg-linear-to-tr from-blue-600 to-indigo-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20">
            <Layers size={18} className="text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col animate-fade-in">
              <span className="font-extrabold text-[15px] leading-none tracking-tight text-white uppercase">
                Sureze
              </span>
              <span className="text-[10px] text-blue-400 font-bold tracking-[2px] mt-1 uppercase">
                Dashboard
              </span>
            </div>
          )}
        </div>

        {/* Nav Section */}

        <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto no-scrollbar">
          {NAV_GROUPS.map((group, idx) => (
            <div key={idx} className="space-y-1">
              {!collapsed && (
                <p className="px-4 text-[12px] font-black uppercase tracking-[1.5px] text-slate-500/80 mb-3">
                  {group.title}
                </p>
              )}

              <ul className="space-y-1">
                {group.links.map((item) => (
                  <NavItem key={item.id} item={item} collapsed={collapsed} />
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="p-4 bg-slate-900/50 border-t border-white/5">
          <button
            onClick={handleLogout}
            className={clsx(
              "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-200 group",
              collapsed && "justify-center",
            )}
          >
            <LogOut
              size={20}
              className="group-hover:-translateX-1 transition-transform"
            />
            {!collapsed && (
              <span className="font-bold text-xs uppercase tracking-wider">
                Logout
              </span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}

function NavItem({ item, collapsed }) {
  const Icon = item.icon;
  const hasSubMenu = item.subMenu && item.subMenu.length > 0;
  const isChildActive =
    hasSubMenu &&
    item.subMenu.some((sub) => window.location.pathname === sub.href);
  const active = window.location.pathname === item.href || isChildActive;
  const [isOpen, setIsOpen] = useState(isChildActive);

  const handleClick = (e) => {
    if (hasSubMenu) {
      e.preventDefault();
      setIsOpen(!isOpen);
    }
  };

  return (
    <li>
      <a
        href={item.href}
        onClick={handleClick}
        className={clsx(
          "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative cursor-pointer",
          active && !hasSubMenu
            ? "bg-blue-600/10 text-blue-400 border border-blue-500/20"
            : "text-slate-400 hover:bg-white/5 hover:text-white",
          collapsed && "justify-center",
        )}
        title={collapsed ? item.name : ""}
      >
        <Icon
          size={20}
          className={clsx(
            "shrink-0",
            active
              ? "text-blue-400"
              : "group-hover:scale-110 transition-transform",
          )}
        />

        {!collapsed && (
          <span
            className={clsx(
              "font-semibold text-sm truncate flex-1",
              active ? "text-white" : "",
            )}
          >
            {item.name}
          </span>
        )}

        {!collapsed && hasSubMenu && (
          <div
            className={clsx(
              "transition-transform duration-300",
              isOpen ? "rotate-90" : "",
            )}
          >
            <ChevronRight
              size={14}
              className={active ? "text-blue-400" : "text-slate-600"}
            />
          </div>
        )}

        {/* Active Glow Indicator */}
        {active && !collapsed && (
          <div className="absolute left-0 w-1 h-5 bg-blue-500 rounded-r-full shadow-[0_0_12px_rgba(59,130,246,0.6)]" />
        )}
      </a>

      {/* Simplified Tooltip for Collapsed State */}
      {collapsed && (
        <div className="absolute left-full ml-4 px-3 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 transform translate-x-[-10px] group-hover:translate-x-0 whitespace-nowrap z-50 shadow-xl border border-white/10">
          {item.name}
          {/* Tooltip Arrow */}
          <div className="absolute top-1/2 -left-1 transform -translate-y-1/2 border-y-4 border-y-transparent border-r-4 border-r-slate-900" />
        </div>
      )}

      {/* Submenu with slide-in animation */}
      {!collapsed && hasSubMenu && isOpen && (
        <ul className="mt-2 ml-4 border-l border-white/5 pl-4 space-y-1 animate-slide-in">
          {item.subMenu.map((sub) => {
            const subActive = window.location.pathname === sub.href;
            return (
              <li key={sub.id}>
                <a
                  href={sub.href}
                  className={clsx(
                    "block px-3 py-2 text-xs rounded-lg transition-all",
                    subActive
                      ? "text-blue-400 font-bold bg-blue-500/5"
                      : "text-slate-500 hover:text-white hover:bg-white/5",
                  )}
                >
                  {sub.name}
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}
