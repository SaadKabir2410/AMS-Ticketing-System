import { useState } from "react";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContextHook";
import { Menu as MenuIcon, Moon, Sun, User, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

function IconBtn({
  children,
  className = "",
  badge = false,
  onClick,
  title = "",
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`relative p-1 rounded hover:text-[#ec4899] dark:hover:text-[#ec4899] ${className}`}
    >
      {children}
      {badge && (
        <span className="absolute -top-1.5 -right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-[#1a1f2e]" />
      )}
    </button>
  );
}

export default function Navbar({ setCollapsed }) {
  const { dark, setDark } = useTheme();
  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-4 px-6 py-3 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800">
      <div className="flex items-center gap-4">
        {/* Left side actions (if any) can go here */}
      </div>

      <div className="flex items-center gap-1.5 ml-auto">
        <IconBtn
          onClick={() => setDark(dark === "light" ? "dark" : "light")}
          title="toggle theme"
          className="px-3 flex items-center gap-2"
        >
          {dark === "dark" ? <Sun size={14} className="text-slate-400" /> : <Moon size={14} className="text-slate-600" />}
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            {dark === "dark" ? "Light" : "Dark"} Mode
          </span>
        </IconBtn>

        <IconBtn title="Language" className="hidden sm:flex px-3">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">EN</span>
        </IconBtn>

        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-2" />

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-3 p-1 pr-3 hover:text-[#ec4899] dark:hover:text-[#ec4899] rounded-xl transition-colors"
          >

            <div className="text-left hidden lg:block">
              <p className="text-xs dark:text-slate-200">
                {user?.name || "Saad Kabir"}
              </p>
              <p className="text-[10px] text-slate-500 capitalize">
                {user?.role || "User"}
              </p>
            </div>
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 mb-2">
                <p className="text-xs dark:text-white truncate">
                  {user?.email}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowMenu(false);
                  navigate("/my-account");
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 font-medium hover:text-[#ec4899] dark:hover:text-[#ec4899] transition-colors"
              >
                <User size={16} />
                My Account
              </button>
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 font-medium hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
