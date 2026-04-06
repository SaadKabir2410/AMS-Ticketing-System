import { createContext, useState, useEffect } from "react";
import {
  loginWithPassword,
  clearSession,
  getAuthState,
} from "../services/tokenAuth";
import { usersApi } from "../services/api/users";
import apiClient from "../services/apiClient";

export const AuthContext = createContext();

// Simulated User DB
const USER_KEY = "spike_users";
const SESSION_KEY = "spike_session";
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

  useEffect(() => {
    // Sync with manual login session if available
    const { isAuthenticated: isManualAuth } = getAuthState();
    if (!isManualAuth && user) {
      // No authentication at all, clear internal state
      setUser(null);
      localStorage.removeItem(SESSION_KEY);
    }
  }, [user]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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
  const login = async ({ email, password }) => {
    setLoading(true);
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
          let jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
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

      // Fetch actual user details, roles, and permissions from API
      let permissionsMap = {};
      try {
        // Fetch ABP config to get grantedPolicies
        const appConfig = await apiClient.get("/api/abp/application-configuration").then(r => r.data);
        if (appConfig?.auth?.grantedPolicies) {
          permissionsMap = appConfig.auth.grantedPolicies;
        }

        const userDetails = await usersApi.getById(userId);
        if (userDetails) {
           actualName = userDetails.name + (userDetails.surname ? " " + userDetails.surname : "");
           actualEmail = userDetails.email || email;
        }

        const rolesRes = await usersApi.getUserRoles(userId);
        if (rolesRes) {
           const items = rolesRes.items || rolesRes || [];
           if (items.length > 0) {
             actualRoles = items.map((r) => r.name || r);
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
      setLoading(false);
      return true;
    } catch (err) {
      console.error("[Auth] Login failed:", err.message);
      setError(err.message || "Invalid username or password.");
      setLoading(false);
      return false;
    }
  };

  // Logout
  const logout = async () => {
    try {
      console.log("[Auth] Starting logout process...");

      // 1. Clear ALL storage keys related to auth
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem("auth_token");
      localStorage.removeItem("spike_session");
      localStorage.removeItem("spike_users"); // Just in case

      // 2. Clear manual password-token session (from tokenAuth.js)
      clearSession();

      // 3. Clear reactive state
      setUser(null);

      // 4. Redirect to login
      window.location.href = "/login";
    } catch (err) {
      console.error("[Auth] Logout error fallback:", err);
      // Absolute fallback to login page
      window.location.href = "/login";
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
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




