import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContextHook";

const ThemeContext = createContext();

// Build a user-scoped localStorage key so each user has their own preference.
const themeKey = (userId) =>
  userId ? `theme_${userId}` : "theme_guest";

export function ThemeProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  // Derive initial theme from the current user's stored preference.
  // This runs once on mount; the useEffect below re-syncs on user change.
  const [dark, setDarkInternal] = useState(() => {
    const key = themeKey(userId);
    return localStorage.getItem(key) || "light";
  });

  // When the logged-in user changes (login / logout / switch):
  //   1. Read *that* user's preference from localStorage.
  //   2. Apply it to the document.
  useEffect(() => {
    const key = themeKey(userId);
    const saved = localStorage.getItem(key) || "light";
    setDarkInternal(saved);
  }, [userId]);

  // Whenever `dark` changes, persist under the current user's key and
  // update the <html> class so Tailwind's dark-mode utilities activate.
  useEffect(() => {
    const key = themeKey(userId);
    localStorage.setItem(key, dark);
    if (dark === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [dark, userId]);

  // Wrap the setter so callers can keep calling setDark("dark") / setDark("light")
  // without knowing about the per-user key logic.
  const setDark = (value) => setDarkInternal(value);

  return (
    <ThemeContext.Provider value={{ dark, setDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
