import { useState, useMemo } from "react";
import clsx from "clsx";
import { NAV_GROUPS } from "../../data/navData";
import { useAuth } from "../../context/AuthContextHook";
import { usePermissionContext } from "../../context/PermissionContext";
import { ChevronDown, Menu as MenuIcon, Search, Settings, Mail, LayoutDashboard, Component, Map, FileText, Briefcase, Database, Shield, ChevronLeft, ChevronRight } from "lucide-react";

export default function Sidebar({ collapsed, setCollapsed, isMobile, closeMobile }) {

  const { user } = useAuth();
  const { hasPermission, isLoading } = usePermissionContext();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredGroups = useMemo(() => {
    if (isLoading) return [];

    return NAV_GROUPS.map((group) => {
      const validLinks = group.links
        .filter((link) => {
          const isAdmin = user?.role?.toLowerCase().includes("admin") || user?.roles?.includes("admin");
          if (link.adminOnly && !isAdmin) return false;
          if (link.permission && !hasPermission(link.permission)) return false;

          // Basic keyword search
          if (searchQuery && !link.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;

          return true;
        })
        .map((link) => {
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
        .filter((link) => !(link.subMenu && link.subMenu.length === 0));

      return { ...group, links: validLinks };
    }).filter((group) => group.links.length > 0);
  }, [user, hasPermission, isLoading, searchQuery]);

  return (
    <aside
      className={clsx(
        "flex flex-col h-full transition-all duration-300 z-50",
        "bg-gradient-to-b from-[#111827] via-[#0a0f1c] to-black overflow-hidden shrink-0",
        // Desktop behavior
        !isMobile ? "hidden lg:flex mt-2 mb-2 h-[calc(100vh-1rem)] sticky top-0 rounded-tr-xl rounded-br-xl" : "w-[280px]",
        !isMobile && (collapsed ? "w-[85px]" : "w-[250px]")
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


      {/* Header Section */}
      <div className={clsx("flex flex-col pt-8 pb-4 gap-6", collapsed ? "items-center" : "px-4")}>
        <div className={clsx("flex items-center w-full", collapsed ? "justify-center" : "justify-between gap-3")}>
          {!collapsed && (
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="text-xl font-bold text-white tracking-tight truncate">Sureze</span>
              <span className="text-xs font-bold text-slate-400 mt-1 shrink-0">Dashboard</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-slate-300 hover:text-white transition-colors p-2 shrink-0"
          >
            {collapsed ? <ChevronRight size={18} strokeWidth={2.5} /> : <ChevronLeft size={18} strokeWidth={2.5} />}
          </button>
        </div>

        {/* Search Bar - Glassmorphism */}
        {!collapsed && (
          <div className="relative group px-1 flex-shrink-0">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-white transition-colors" size={14} />
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

      {/* Nav Section */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto overflow-x-hidden no-scrollbar pb-10">
        {filteredGroups.map((group, idx) => (
          <div key={idx} className="flex flex-col gap-2">
            {!collapsed && (
              <div className="flex items-center justify-between px-3 py-2 mb-1">
                <span className="text-[10px] font-bold tracking-[2px] text-pink-400 uppercase whitespace-nowrap opacity-90 truncate">
                  {group.title}
                </span>
                <Settings size={12} className="text-slate-400 hover:text-white cursor-pointer transition-colors shrink-0" />
              </div>
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
  );
}

function NavItem({ item, collapsed }) {
  const hasSubMenu = item.subMenu && item.subMenu.length > 0;
  const isChildActive = hasSubMenu && item.subMenu.some((sub) => window.location.pathname === sub.href);
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
    <li className="relative block">
      <a
        href={item.href}
        onClick={(e) => {
          handleClick(e);
          if (!hasSubMenu && isMobile) closeMobile();
        }}
        className={clsx(
          "flex items-center transition-all duration-300 group relative",
          collapsed
            ? "justify-center h-12 w-12 rounded-xl mx-auto mb-2 px-0"
            : "gap-4 px-4 py-2.5 rounded-[1.8rem] w-full",
          active ? "text-white" : "text-slate-200 hover:text-white",
          "hover:bg-white/10"
        )}
      >

        {Icon && (
          <div className="flex items-center justify-center shrink-0 w-6 h-6">
            <Icon
              size={16}
              strokeWidth={2.2}
              className={clsx(
                "transition-all duration-300",
                active ? "text-white scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" : "text-slate-400 group-hover:text-white"
              )}
            />
          </div>
        )}

        {!collapsed && (
          <span className={clsx("text-sm truncate flex-1 font-medium tracking-wide transition-colors", active ? "text-white" : "text-slate-100")}>
            {item.name}
          </span>
        )}

        {/* Badges Support */}
        {!collapsed && item.badge && (
          <div className={clsx("px-3 py-0.5 rounded-lg text-[10px] font-black text-white ml-2 shadow-sm", item.badgeColor || "bg-blue-600")}>
            {item.badge}
          </div>
        )}

        {/* "New" Badge style */}
        {!collapsed && item.name === "Icons" && (
          <div className="bg-emerald-600 text-white text-[9px] font-black px-2.5 py-0.5 rounded-lg ml-2 shadow-md">New</div>
        )}

        {!collapsed && hasSubMenu && (
          <ChevronDown
            size={16}
            className={clsx(
              "text-slate-400 transition-all duration-300 ml-auto",
              isOpen ? "rotate-0" : "-rotate-90"
            )}
          />
        )}
      </a>

      {collapsed && (
        <div className="absolute left-full ml-4 px-4 py-2.5 bg-slate-900 text-white text-[11px] font-black rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 transform translate-x-[-10px] group-hover:translate-x-0 whitespace-nowrap z-50 shadow-[0_10px_30px_rgba(0,0,0,0.5)] border border-white/20">
          {item.name}
        </div>
      )}

      {!collapsed && hasSubMenu && isOpen && (
        <ul className="mt-1.5 mb-3 ml-6 space-y-1.5 animate-fade-in">
          {item.subMenu.map((sub) => {
            const subActive = window.location.pathname === sub.href;
            return (
              <li key={sub.id}>
                <a
                  href={sub.href}
                  onClick={() => isMobile && closeMobile()}
                  className={clsx(
                    "block px-4 py-2 text-[13px] font-bold transition-all",
                    subActive ? "text-white" : "text-slate-200 hover:text-white"
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





