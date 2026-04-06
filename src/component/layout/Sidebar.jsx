import { useState, useMemo } from "react";
import clsx from "clsx";
import { NAV_GROUPS } from "../../data/navData";
import { useAuth } from "../../context/AuthContextHook";
import { usePermissionContext } from "../../context/PermissionContext";
import { ChevronDown, Menu as MenuIcon } from "lucide-react";

export default function Sidebar({ collapsed, setCollapsed }) {
  const { user } = useAuth();
  const { hasPermission, isLoading } = usePermissionContext();
  
  const filteredGroups = useMemo(() => {
    if (isLoading) return [];

    return NAV_GROUPS.map((group) => {
      // 1. Filter Top-Level Links
      const validLinks = group.links
        .filter((link) => {
          // Admin override
          const isAdmin = user?.role?.toLowerCase().includes("admin") || user?.roles?.includes("admin");
          if (link.adminOnly && !isAdmin) return false;

          // Direct Permission check for root items
          if (link.permission && !hasPermission(link.permission)) return false;

          return true;
        })
        .map((link) => {
          // 2. Filter Sub-Menus if they exist
          if (link.subMenu) {
            const validSubMenu = link.subMenu.filter((sub) => {
              const isAdmin = user?.role?.toLowerCase().includes("admin") || user?.roles?.includes("admin");
              if (sub.adminOnly && !isAdmin) return false;
              if (sub.permission && !hasPermission(sub.permission)) return false;
              return true;
            });
            
            return { ...link, subMenu: validSubMenu };
          }
          return link;
        })
        .filter((link) => {
          // 3. Hide parent items if their submenu is now empty
          if (link.subMenu && link.subMenu.length === 0) return false;
          return true;
        });

      return { ...group, links: validLinks };
    }).filter((group) => group.links.length > 0);
  }, [user, hasPermission, isLoading]);


  return (
    <>
      <aside
        className={clsx(
          "flex flex-col h-screen sticky top-0 border-r border-slate-200 dark:border-slate-800/20 shadow-sm",
          "bg-white dark:bg-slate-900 overflow-hidden shrink-0 transition-all duration-300",
          collapsed ? "w-[68px]" : "w-[260px]",
        )}
      >
        {/* Logo section */}
        <div
          className={clsx(
            "flex border-b border-slate-100 dark:border-slate-800 transition-all duration-300 relative",
            collapsed ? "flex-col items-center justify-center py-5 gap-5" : "items-center px-6 py-6 gap-3",
          )}
        >
          <div className="w-9 h-9 rounded-xl bg-linear-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shrink-0 shadow-lg  text-white font-bold text-sm">
            S
          </div>

          {!collapsed && (
            <div className="flex flex-col animate-fade-in flex-1 overflow-hidden">
              <span className=" text-[15px] leading-none text-slate-800 dark:text-white font-bold truncate">
                Sureze
              </span>
              <span className="text-[10px] text-blue-500 dark:text-blue-400 tracking-[2px] mt-1 truncate font-semibold">
                Dashboard
              </span>
            </div>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            title="Toggle Sidebar"
            className={clsx(
              "flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-[#ec4899] dark:hover:text-[#ec4899] transition-colors shrink-0",
              !collapsed && "ml-auto"
            )}
          >
            <MenuIcon size={collapsed ? 24 : 20} />
          </button>
        </div>

        {/* Nav Section */}
        <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto no-scrollbar">
          {filteredGroups.map((group, idx) => (
            <div key={idx} className="space-y-1">
              {!collapsed && (
                <p className="px-4 text-[10px] font-bold tracking-[2px] text-slate-400/80 dark:text-slate-400/80 mb-3 uppercase">
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
      </aside>
    </>
  );
}

function NavItem({ item, collapsed }) {
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
            ? "bg-[#ec4899]/10 text-[#ec4899] border border-[#ec4899]/20"
            : "text-slate-500 hover:text-[#ec4899] dark:text-slate-400 dark:hover:text-[#ec4899]",
          collapsed && "justify-center",
        )}
        title={collapsed ? item.name : ""}
      >
        {Icon && (
          <div className={clsx("flex items-center justify-center shrink-0", collapsed ? "w-6 h-6" : "w-5 h-5")}>
            <Icon size={collapsed ? 20 : 18} strokeWidth={2} className={clsx("transition-colors", active ? "text-[#ec4899]" : "text-slate-500 group-hover:text-[#ec4899] dark:text-slate-400 dark:group-hover:text-[#ec4899]")} />
          </div>
        )}
        
        {!collapsed && (
          <span
            className={clsx(
              " text-sm truncate flex-1 font-medium",
              active ? "text-slate-900 dark:text-white" : "",
            )}
          >
            {item.name}
          </span>
        )}

        {/* Empty placeholder for collapsed state if needed, or just let text handle it */}
        {collapsed && !Icon && (
          <span className="text-sm font-medium tracking-tight truncate max-w-[40px]">
            {item.name.substring(0, 3)}
          </span>
        )}

        {!collapsed && hasSubMenu && (
          <div
            className={clsx(
              "transition-transform duration-300 ml-auto flex items-center shrink-0",
              isOpen ? "rotate-180" : "",
            )}
          >
            <ChevronDown size={16} className="text-slate-400 group-hover:text-[#ec4899] dark:group-hover:text-[#ec4899] transition-colors" />
          </div>
        )}

        {/* Active Glow Indicator */}
        {active && !collapsed && (
          <div className="absolute left-0 w-1 h-5 bg-[#ec4899] rounded-r-full shadow-[0_0_12px_rgba(236,72,153,0.6)]" />
        )}
      </a>

      {/* Simplified Tooltip for Collapsed State */}
      {collapsed && (
        <div className="absolute left-full ml-4 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 transform translate-x-[-10px] group-hover:translate-x-0 whitespace-nowrap z-50 shadow-xl border border-white/10">
          {item.name}
          {/* Tooltip Arrow */}
          <div className="absolute top-1/2 -left-1 transform -translate-y-1/2 border-y-4 border-y-transparent border-r-4 border-r-slate-900" />
        </div>
      )}

      {/* Submenu with slide-in animation */}
      {!collapsed && hasSubMenu && isOpen && (
        <ul className="mt-2 ml-4 border-l border-slate-100 dark:border-slate-800 pl-4 space-y-1 animate-slide-in">
          {item.subMenu.map((sub) => {
            const subActive = window.location.pathname === sub.href;
            return (
              <li key={sub.id}>
                <a
                  href={sub.href}
                  className={clsx(
                    "block px-3 py-2 text-xs rounded-lg transition-all",
                    subActive
                      ? "text-[#ec4899] bg-[#ec4899]/5 font-semibold"
                      : "text-slate-500 hover:text-[#ec4899] dark:text-slate-400 dark:hover:text-[#ec4899]",
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




