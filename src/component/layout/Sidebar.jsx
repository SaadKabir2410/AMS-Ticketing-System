import { useState, useMemo } from "react";
import clsx from "clsx";
import { NAV_GROUPS } from "../../data/navData";
import { useAuth } from "../../context/AuthContextHook";
import { usePermissionContext } from "../../context/PermissionContext";
import SearchTextHighlight from "../common/SearchTextHighlight";
import {
  Search,
  Settings,
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

  const isAdmin = useMemo(
    () => !!user?.role?.toLowerCase().includes("admin"),
    [user]
  );

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
              // 🔒 adminOnly items are hidden from non-admins regardless of permissions
              if (sub.adminOnly && !isAdmin) return false;
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

          // ✅ Leaf item — adminOnly check first, then permission
          if (link.adminOnly && !isAdmin) return false;
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
  }, [user, isAdmin, hasPermission, isLoading, searchQuery]);

  return (
    <aside
      onMouseEnter={() => !isMobile && setCollapsed(false)}
      onMouseLeave={() => !isMobile && setCollapsed(true)}
      className={clsx(
        "flex flex-col transition-all duration-300 z-50",
        "bg-black shrink-0",
        !isMobile
          ? "hidden lg:flex ml-1.5 mt-3 mb-1 h-[calc(100vh-1.25rem)] sticky top-3 rounded-2xl"
          // Phone menu: wide enough for full menu names, never wider than the screen.
          : "w-[min(280px,85vw)] h-full overflow-y-auto",
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
          "flex flex-col pt-5 pb-2 gap-4",
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
          {!isMobile && (
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
          )}
        </div>

        {!collapsed && (
          <div className="relative group px-1 flex-shrink-0">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-white transition-colors"
              size={14}
            />
            <input
              type="text"
              placeholder="Search Menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 bg-white/[0.06] border border-white/10 rounded-xl pl-10 pr-3 text-[13px] text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-pink-500/30 transition-all"
            />
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto overflow-x-hidden no-scrollbar pb-10">
        {filteredGroups.map((group, idx) => (
          <div key={idx} className="flex flex-col gap-1">
            {!collapsed && (
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-[11px] font-semibold text-pink-500 uppercase whitespace-nowrap truncate">
                  {group.title}
                </span>
                <Settings
                  size={14}
                  className="text-slate-300 hover:text-white cursor-pointer transition-colors shrink-0"
                />
              </div>
            )}
            <ul className="space-y-0.5">
              {group.links.map((item) => (
                <NavItem
                  key={item.id}
                  item={item}
                  collapsed={collapsed}
                  closeMobile={closeMobile}
                  isMobile={isMobile}
                  searchQuery={searchQuery}
                />
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}

function NavItem({ item, collapsed, closeMobile, isMobile, searchQuery = "" }) {
  const hasSubMenu = item.subMenu && item.subMenu.length > 0;
  const isChildActive =
    hasSubMenu &&
    item.subMenu.some((sub) => window.location.pathname === sub.href);
  const active = window.location.pathname === item.href || isChildActive;
  const [isOpen, setIsOpen] = useState(isChildActive);
  // While searching, sub menus stay open so the matching items are visible.
  const showSubMenu = isOpen || Boolean(searchQuery.trim());
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
            : "gap-3 px-3 py-2 rounded-lg w-full",
          active
            ? "bg-white/10 text-white"
            : "text-slate-200 hover:text-white hover:bg-white/5",
        )}
      >
        {active && !collapsed && (
          <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-1 h-6 bg-pink-500 rounded-full" />
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
              "text-[13px] truncate flex-1 font-normal transition-colors duration-200",
              active ? "text-white" : "text-inherit",
            )}
          >
            <SearchTextHighlight text={item.name} query={searchQuery} />
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
          <ChevronRight
            size={15}
            className={clsx(
              "text-slate-300 transition-all duration-300 ml-auto",
              showSubMenu ? "rotate-90" : "rotate-0",
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
      {!collapsed && hasSubMenu && showSubMenu && (
        <ul className="mt-0.5 mb-1 ml-3 space-y-0.5 animate-fade-in">
          {item.subMenu.map((sub) => {
            const subActive = window.location.pathname === sub.href;
            return (
              <li key={sub.id} className="relative">
                <a
                  href={sub.href}
                  onClick={() => isMobile && closeMobile && closeMobile()}
                  className={clsx(
                    "flex items-center gap-2 px-3 py-1.5 text-[12px] font-normal transition-all duration-200 rounded-lg relative group/sub",
                    subActive
                      ? "text-white bg-white/10"
                      : "text-slate-200 hover:text-white hover:bg-white/5",
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
                    <SearchTextHighlight text={sub.name} query={searchQuery} />
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
