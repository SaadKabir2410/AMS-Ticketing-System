import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContextHook";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const { user } = useAuth();
  
  const getThemeKey = (userId) => userId ? `theme_${userId}` : "theme";

  // Derive initial theme from stored preference.
  const [dark, setDarkInternal] = useState(() => {
    return localStorage.getItem(getThemeKey(user?.id)) || "light";
  });

  // When user changes (login/logout), fetch their specific theme
  useEffect(() => {
    const key = getThemeKey(user?.id);
    const stored = localStorage.getItem(key) || "light";
    setDarkInternal(stored);
  }, [user?.id]);

  // Whenever `dark` changes, persist under the user's specific key and
  // update the <html> class so Tailwind's dark-mode utilities activate.
  useEffect(() => {
    const key = getThemeKey(user?.id);
    localStorage.setItem(key, dark);
    if (dark === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [dark, user?.id]);

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
