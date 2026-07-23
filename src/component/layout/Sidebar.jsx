import { useState, useMemo } from "react";
import clsx from "clsx";
import { NAV_GROUPS } from "../../data/navData";
import { useAuth } from "../../context/AuthContextHook";
import { usePermissionContext } from "../../context/PermissionContext";
import {
  Search,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export default function Sidebar({
  collapsed,
  setCollapsed,
  isMobile,
  closeMobile,
}) {
  const { user } = useAuth();
  const { hasPermission, isLoading } = usePermissionContext();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredGroups = useMemo(() => {
    if (isLoading) return [];

    // ✅ Helper: check string or array permission
    const checkPerm = (permission) => {
      if (!permission) return true;
      const perms = Array.isArray(permission) ? permission : [permission];
      return perms.some((p) => hasPermission(p));
    };

    return NAV_GROUPS.map((group) => {
      const validLinks = group.links
        .map((link) => {
          // ✅ Filter submenu children first
          if (link.subMenu) {
            const validSubMenu = link.subMenu.filter((sub) => {
              if (!checkPerm(sub.permission)) return false;
              if (
                searchQuery &&
                !sub.name.toLowerCase().includes(searchQuery.toLowerCase())
              )
                return false;
              return true;
            });
            return { ...link, subMenu: validSubMenu };
          }
          return link;
        })
        .filter((link) => {
          // ✅ Parent with submenu — show only if at least one child is visible
          if (link.subMenu !== undefined) {
            if (link.subMenu.length === 0) return false;
            if (searchQuery) {
              const nameMatch = link.name
                .toLowerCase()
                .includes(searchQuery.toLowerCase());
              const subMatch = link.subMenu.some((sub) =>
                sub.name.toLowerCase().includes(searchQuery.toLowerCase())
              );
              if (!nameMatch && !subMatch) return false;
            }
            return true;
          }

          // ✅ Leaf item — check its own permission
          if (!checkPerm(link.permission)) return false;
          if (
            searchQuery &&
            !link.name.toLowerCase().includes(searchQuery.toLowerCase())
          )
            return false;
          return true;
        });

      return { ...group, links: validLinks };
    }).filter((group) => group.links.length > 0);
  }, [user, hasPermission, isLoading, searchQuery]);

  return (
    <aside
      onMouseEnter={() => !isMobile && setCollapsed(false)}
      onMouseLeave={() => !isMobile && setCollapsed(true)}
      className={clsx(
        "flex flex-col transition-all duration-300 z-50",
        "bg-black shrink-0",
        !isMobile
          ? "hidden lg:flex ml-1.5 mt-6 mb-1 h-[calc(100vh-2.5rem)] sticky top-5 rounded-4xl"
          : "w-[160px] h-full",
        !isMobile && (collapsed ? "w-[70px]" : "w-[170px]"),
      )}
    >
      {isMobile && (
        <button
          onClick={closeMobile}
          className="absolute top-4 right-4 text-slate-400 hover:text-white lg:hidden z-[60]"
        >
          <ChevronLeft size={24} />
        </button>
      )}

      {/* Header */}
      <div
        className={clsx(
          "flex flex-col pt-8 pb-4 gap-6",
          collapsed ? "items-center" : "px-4",
        )}
      >
        <div
          className={clsx(
            "flex items-center w-full",
            collapsed ? "justify-center" : "justify-between gap-3",
          )}
        >
          {!collapsed && (
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="text-xl font-bold text-white tracking-tight truncate">
                Sureze
              </span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-slate-300 hover:text-white transition-colors p-2 shrink-0"
          >
            {collapsed ? (
              <ChevronRight size={18} strokeWidth={2.5} />
            ) : (
              <ChevronLeft size={18} strokeWidth={2.5} />
            )}
          </button>
        </div>

        {!collapsed && (
          <div className="relative group px-1 flex-shrink-0">
            <Search
              className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-white transition-colors"
              size={14}
            />
            <input
              type="text"
              placeholder="Search Menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
            />
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto overflow-x-hidden no-scrollbar pb-10">
        {filteredGroups.map((group, idx) => (
          <div key={idx} className="flex flex-col gap-2">
            {!collapsed && (
              <div className="flex items-center justify-between px-3 py-2 mb-1">
                <span className="text-[9px] font-bold tracking-[2.5px] text-pink-400 uppercase whitespace-nowrap opacity-90 truncate">
                  {group.title}
                </span>
                <Settings
                  size={12}
                  className="text-slate-400 hover:text-white cursor-pointer transition-colors shrink-0"
                />
              </div>
            )}
            <ul className="space-y-1">
              {group.links.map((item) => (
                <NavItem
                  key={item.id}
                  item={item}
                  collapsed={collapsed}
                  closeMobile={closeMobile}
                  isMobile={isMobile}
                />
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}

function NavItem({ item, collapsed, closeMobile, isMobile }) {
  const hasSubMenu = item.subMenu && item.subMenu.length > 0;
  const isChildActive =
    hasSubMenu &&
    item.subMenu.some((sub) => window.location.pathname === sub.href);
  const active = window.location.pathname === item.href || isChildActive;
  const [isOpen, setIsOpen] = useState(isChildActive);
  const Icon = item.icon;

  const handleClick = (e) => {
    if (hasSubMenu) {
      e.preventDefault();
      setIsOpen(!isOpen);
    } else if (isMobile && closeMobile) {
      closeMobile();
    }
  };

  return (
    <li className="relative block">
      <a
        href={item.href}
        onClick={handleClick}
        className={clsx(
          "flex items-center transition-all duration-200 group relative",
          collapsed
            ? "justify-center h-12 w-12 rounded-xl mx-auto mb-2.5 px-0"
            : "gap-4 px-5 py-3.5 rounded-2xl w-full mb-1.5",
          active
            ? "bg-white/15 text-white shadow-[0_0_20px_rgba(255,255,255,0.05)]"
            : "text-slate-400 hover:text-white hover:bg-white/5",
        )}
      >
        {active && !collapsed && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-pink-500 rounded-r-full shadow-[0_0_10px_rgba(236,72,153,0.5)]" />
        )}

        {Icon && collapsed && (
          <div className="flex items-center justify-center shrink-0 w-6 h-6">
            <Icon
              size={20}
              strokeWidth={2.5}
              className={clsx(
                "transition-all duration-300",
                active
                  ? "text-white scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                  : "text-slate-400 group-hover:text-white",
              )}
            />
          </div>
        )}

        {!collapsed && (
          <span
            className={clsx(
              "text-[11px] truncate flex-1 font-bold tracking-wide transition-colors duration-200",
              active ? "text-white" : "text-inherit",
            )}
          >
            {item.name}
          </span>
        )}

        {!collapsed && item.badge && (
          <div
            className={clsx(
              "px-3 py-0.5 rounded-lg text-[10px] font-black text-white ml-2 shadow-sm",
              item.badgeColor || "bg-blue-600",
            )}
          >
            {item.badge}
          </div>
        )}

        {!collapsed && hasSubMenu && (
          <ChevronDown
            size={16}
            className={clsx(
              "text-slate-400 transition-all duration-300 ml-auto",
              isOpen ? "rotate-0" : "-rotate-90",
            )}
          />
        )}
      </a>

      {/* Tooltip for collapsed */}
      {collapsed && (
        <div className="absolute left-full ml-4 px-4 py-2.5 bg-slate-900 text-white text-[10px] font-black rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 transform translate-x-[-10px] group-hover:translate-x-0 whitespace-nowrap z-50 shadow-[0_10px_30px_rgba(0,0,0,0.5)] border border-white/20">
          {item.name}
        </div>
      )}

      {/* Submenu */}
      {!collapsed && hasSubMenu && isOpen && (
        <ul className="mt-1.5 mb-3 ml-6 space-y-1.5 animate-fade-in">
          {item.subMenu.map((sub) => {
            const subActive = window.location.pathname === sub.href;
            return (
              <li key={sub.id} className="relative">
                <a
                  href={sub.href}
                  onClick={() => isMobile && closeMobile && closeMobile()}
                  className={clsx(
                    "flex items-center gap-3 px-4 py-2 text-[10px] font-semibold transition-all duration-200 rounded-xl relative group/sub",
                    subActive
                      ? "text-white bg-white/10"
                      : "text-slate-400 hover:text-white hover:bg-white/5",
                  )}
                >
                  {subActive && (
                    <div className="w-1 h-1 rounded-full bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.8)]" />
                  )}
                  <span
                    className={clsx(
                      !subActive && "ml-4"
                    )}
                  >
                    {sub.name}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}