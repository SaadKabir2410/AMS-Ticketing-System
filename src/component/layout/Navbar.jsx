import { useState, useEffect, useRef } from "react";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContextHook";
import { Menu as MenuIcon, Moon, Sun, User, LogOut, Globe, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import apiClient from "../../services/apiClient";

function IconBtn({ children, className = "", badge = false, onClick, title = "" }) {
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

export default function Navbar({ setMobileOpen }) {
  const { dark, setDark } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [showMenu, setShowMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [lang, setLang] = useState("en");
  const [languages, setLanguages] = useState([]);
  const [langLoading, setLangLoading] = useState(false);

  const langMenuRef = useRef(null);
  const userMenuRef = useRef(null);

  // ── Fetch ABP language config ──────────────────────────────────
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await apiClient.get("/api/abp/application-configuration", {
          params: { IncludeLocalizationResources: true },
        });
        const data = response.data;

        // Current active culture
        const culture = data?.localization?.currentCulture?.cultureName;
        console.log("[Navbar] currentCulture:", culture);
        if (culture) setLang(culture);

        // All available languages
        const langs = data?.localization?.languages;
        console.log("[Navbar] available languages:", langs);
        if (langs && langs.length > 0) setLanguages(langs);

      } catch (error) {
        console.error("[Navbar] Failed to fetch language configuration:", error);
      }
    };

    fetchConfig();
  }, []);

  // ── Close dropdowns when clicking outside ─────────────────────
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target)) {
        setShowLangMenu(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Switch language via ABP cookies ───────────────────────────
  const handleLanguageChange = (cultureName) => {
    console.log("[Navbar] Switching language to:", cultureName);
    setLang(cultureName);
    setShowLangMenu(false);

    // ABP Framework reads culture from these cookies
    document.cookie = `Abp.Culture=${cultureName}; path=/; max-age=31536000`;
    document.cookie = `Abp.UiCulture=${cultureName}; path=/; max-age=31536000`;

    // Reload so ABP picks up the new culture from cookie
    window.location.reload();
  };

  const displayLang = lang?.substring(0, 2).toUpperCase() || "EN";

  return (
    <header className="relative z-50 flex items-center justify-between gap-2 sm:gap-4 px-4 sm:px-8 py-3 sm:py-4 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/60 dark:border-slate-800 mx-3 sm:mx-6 mt-3 sm:mt-6 rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.06)]">

      {/* ── Left: Hamburger ── */}
      <div className="flex items-center gap-2 sm:gap-4">
        <IconBtn
          onClick={() => setMobileOpen(true)}
          className="lg:hidden p-2 -ml-2"
        >
          <MenuIcon size={20} className="text-slate-600 dark:text-slate-400" />
        </IconBtn>
      </div>

      {/* ── Right: Actions ── */}
      <div className="flex items-center gap-1 sm:gap-1.5 ml-auto">

        {/* Theme Toggle */}
        <IconBtn
          onClick={() => setDark(dark === "light" ? "dark" : "light")}
          title="Toggle theme"
          className="px-2 sm:px-3 flex items-center gap-2"
        >
          {dark === "dark" ? (
            <Sun size={14} className="text-slate-400" />
          ) : (
            <Moon size={14} className="text-slate-600" />
          )}
          <span className="hidden sm:inline text-xs font-semibold text-slate-600 dark:text-slate-400">
            {dark === "dark" ? "Light" : "Dark"} Mode
          </span>
        </IconBtn>

        {/* ── Language Switcher ── */}
        <div className="relative hidden sm:block" ref={langMenuRef}>
          <button
            onClick={() => {
              console.log("[Navbar] Language button clicked, languages:", languages);
              setShowLangMenu((prev) => !prev);
            }}
            title="Switch Language"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:text-[#ec4899] dark:hover:text-[#ec4899] transition-colors"
          >
            <Globe size={13} className="text-slate-400" />
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
              {displayLang}
            </span>
          </button>

          {/* Language Dropdown */}
          {showLangMenu && (
            <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1.5 z-50">

              {/* Header */}
              <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 mb-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Select Language
                </p>
              </div>

              {/* If no languages loaded from API */}
              {languages.length === 0 ? (
                <div className="px-3 py-3 text-center text-[11px] text-slate-400">
                  No languages available
                </div>
              ) : (
                languages.map((l) => {
                  const isActive = lang === l.cultureName;
                  return (
                    <button
                      key={l.cultureName}
                      onClick={() => handleLanguageChange(l.cultureName)}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-[12px] font-medium transition-colors
                        ${isActive
                          ? "text-pink-500 bg-pink-50 dark:bg-pink-500/10"
                          : "text-slate-600 dark:text-slate-300 hover:text-pink-500 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase w-6 text-left opacity-60">
                          {l.twoLetterISOLanguageName}
                        </span>
                        <span>{l.displayName}</span>
                      </div>
                      {isActive && <Check size={12} className="text-pink-500 flex-shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1 sm:mx-2" />

        {/* ── User Menu ── */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-2 sm:gap-3 p-1 pr-1 sm:pr-3 hover:text-[#ec4899] dark:hover:text-[#ec4899] rounded-xl transition-colors"
          >
            <div className="w-8 h-8 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 border border-slate-200 dark:border-slate-700">
              {user?.customAvatar ? (
                <img src={user.customAvatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User size={16} className="text-slate-500 dark:text-slate-400" />
              )}
            </div>
            <div className="text-left hidden lg:block">
              <p className="text-sm font-bold dark:text-slate-200 leading-none">
                {user?.name || "User"}
              </p>
              <p className="text-[10px] text-slate-500 capitalize">
                {user?.role || "User"}
              </p>
            </div>
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-2 z-50">
              <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 mb-2">
                <p className="text-xs dark:text-white truncate">{user?.email}</p>
              </div>
              <button
                onClick={() => { setShowMenu(false); navigate("/my-account"); }}
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