import { createContext, useState, useEffect, useRef } from "react";
import {
  loginWithPassword,
  clearSession,
  getValidAccessToken,
  logoutSession,
} from "../services/tokenAuth";
import {
  clearApplicationConfigCache,
  loadApplicationConfig,
} from "../services/applicationConfigCache";

export const AuthContext = createContext();

// Session constants
const USER_KEY = "spike_users";
const SESSION_KEY = "spike_session";
const LOGIN_TIME_KEY = "spike_login_time";
const DEFAULT_USER = {
  id: 1,
  name: "Admin User",
  email: "test@sureze.com",
  password: "password123",
  role: "admin",
  avatar: "AU",
};

function getUsers() {
  try {
    const stored = localStorage.getItem(USER_KEY);
    let users = stored ? JSON.parse(stored) : [];
    if (!Array.isArray(users)) users = [];

    // Ensure default admin always exists in the system
    if (
      !users.some(
        (u) => u.email.toLowerCase() === DEFAULT_USER.email.toLowerCase(),
      )
    ) {
      users = [DEFAULT_USER, ...users];
    }
    return users;
  } catch {
    return [DEFAULT_USER];
  }
}

function saveUsers(users) {
  localStorage.setItem(USER_KEY, JSON.stringify(users));
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      // Basic validation: must be an object with an id
      return parsed && parsed.id ? parsed : null;
    } catch {
      return null;
    }
  });

  // Only a saved session needs checking; without one the login page shows at once.
  const [loading, setLoading] = useState(() => Boolean(user));
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");
  const logoutInProgressRef = useRef(false);

  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      if (!user) {
        if (active) setLoading(false);
        return;
      }

      try {
        const accessToken = await getValidAccessToken();
        if (!accessToken && active) {
          localStorage.removeItem(SESSION_KEY);
          setUser(null);
        } else if (accessToken) {
          loadApplicationConfig().catch(() => null);
        }
      } catch (sessionError) {
        // Do not log users out merely because the server/network is briefly
        // unavailable. The next API request will retry token renewal.
        console.warn("[Auth] Could not validate the saved session:", sessionError);
      } finally {
        if (active) setLoading(false);
      }
    };

    restoreSession();
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    const handleExpiredSession = () => {
      // A request cut off by logout must not render the login page before the reload.
      if (logoutInProgressRef.current) return;
      clearSession();
      clearApplicationConfigCache();
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(LOGIN_TIME_KEY);
      setUser(null);
    };

    window.addEventListener("auth:expired", handleExpiredSession);
    return () => window.removeEventListener("auth:expired", handleExpiredSession);
  }, []);

  const clearError = () => setError("");

  // Register
  const register = async ({ name, email, password }) => {
    setLoading(true);
    setError("");
    await new Promise((r) => setTimeout(r, 800)); // simulate API

    const users = getUsers();
    if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
      setError("An account with this email already exists.");
      setLoading(false);
      return false;
    }
    const newUser = {
      id: Date.now(),
      name,
      email,
      password,
      role: "admin",
      avatar: name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2),
      createdAt: new Date().toISOString(),
    };
    saveUsers([...users, newUser]);

    const session = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      avatar: newUser.avatar,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setUser(session);
    setLoading(false);
    return true;
  };

  // Login — trades username/password for a real JWT from port 3333
  // `loading` is only for restoring a saved session; the login form shows its own
  // progress, so it stays on screen instead of being swapped for the app spinner.
  const login = async ({ email, password }) => {
    setError("");

    try {
      const session = await loginWithPassword(email, password);

      let userId = email;
      let actualRoles = [];
      let actualName = email.split("@")[0];
      let actualEmail = email;

      // Extract User ID (sub) and Roles from JWT
      if (session && session.access_token) {
        try {
          let base64Url = session.access_token.split(".")[1];
          let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
          let jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));

          const payload = JSON.parse(jsonPayload);
          if (payload.sub) {
            userId = payload.sub;
          }
          if (payload.role) {
            actualRoles = Array.isArray(payload.role) ? payload.role : [payload.role];
          }
        } catch (e) {
          console.warn("Could not decode JWT", e);
        }
      }

      // Fetch application configuration for permissions and user details
      let permissionsMap = {};
      try {
        const appConfig = await loadApplicationConfig({ force: true });

        if (appConfig?.auth?.grantedPolicies) {
          permissionsMap = appConfig.auth.grantedPolicies;
        }
        if (appConfig?.currentUser) {
          const u = appConfig.currentUser;
          if (u.id) userId = u.id;
          actualName = u.name + (u.surName ? " " + u.surName : "");
          if (actualName.trim() === "") actualName = u.userName || actualEmail;
          if (u.email) actualEmail = u.email;
          if (u.roles && u.roles.length > 0) {
            actualRoles = u.roles;
          }
        }
      } catch (err) {
        console.warn("Could not fetch user profile or roles from API, using fallbacks:", err);
      }

      const userProfile = {
        id: userId,
        name: actualName,
        email: actualEmail,
        role: actualRoles.join(", "),
        avatar: actualName.charAt(0).toUpperCase(),
        permissions: permissionsMap,
      };

      localStorage.setItem(SESSION_KEY, JSON.stringify(userProfile));
      setUser(userProfile);
      return true;
    } catch (err) {
      console.error("[Auth] Login failed:", err.message);
      setError(err.message || "Invalid username or password.");
      return false;
    }
  };

  // Manual logout — triggered by the user
  const logout = async () => {
    if (logoutInProgressRef.current) return;
    logoutInProgressRef.current = true;
    setLoggingOut(true);

    try {
      console.log("[Auth] User-initiated logout.");

      // Remove the application session before awaiting the backend so no further
      // API calls can renew it. The user state is left as is: the reload below
      // opens the login page, and clearing it here would render that page twice.
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(LOGIN_TIME_KEY);
      localStorage.removeItem("auth_token");
      clearApplicationConfigCache();

      // Remove any legacy react-oidc-context records without touching unrelated
      // preferences such as the remembered username or selected theme.
      Object.keys(localStorage)
        .filter((key) => key.startsWith("oidc.user:"))
        .forEach((key) => localStorage.removeItem(key));

      // Sent without waiting: the login page opens at once.
      logoutSession().catch((err) =>
        console.warn("[Auth] Backend logout did not complete; local session was cleared:", err),
      );
    } catch (err) {
      // Network/backend failures cannot keep the browser authenticated.
      console.warn("[Auth] Backend logout did not complete; local session was cleared:", err);
      clearSession();
    } finally {
      sessionStorage.setItem("auth:logged-out", "true");
      window.location.replace("/login");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        loggingOut,
        error,
        clearError,
        register,
        login,
        logout,
        signinRedirect: () => (window.location.href = "/login"),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
