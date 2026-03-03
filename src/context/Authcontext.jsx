import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

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

  // Login — tries real backend auth endpoints first, falls back to local DB
  const login = async ({ email, password }) => {
    setLoading(true);
    setError('');

    // ABP .NET commonly uses these endpoints depending on version:
    const authEndpoints = [
      { url: '/api/account/login', body: { userNameOrEmailAddress: email, password, rememberMe: true } },
      { url: '/api/TokenAuth/Authenticate', body: { usernameOrEmailAddress: email, password, remoteServiceName: 'default' } },
      { url: '/api/app/auth/login', body: { userNameOrEmailAddress: email, password } },
    ];

    for (const endpoint of authEndpoints) {
      try {
        console.log('[Auth] Trying endpoint:', endpoint.url);
        const response = await fetch(endpoint.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(endpoint.body),
        });

        console.log('[Auth] Response status:', response.status, 'from', endpoint.url);

        if (response.ok) {
          const data = await response.json();
          console.log('[Auth] Response data keys:', Object.keys(data));

          // ABP token shapes: result.accessToken, result.token, token, access_token
          const token =
            data?.result?.accessToken ||
            data?.result?.token ||
            data?.accessToken ||
            data?.token ||
            data?.access_token;

          console.log('[Auth] Token found:', token ? '✅ YES (length: ' + token.length + ')' : '❌ NO token in response');

          if (token) {
            localStorage.setItem('auth_token', token);
          }

          const name = data?.result?.name || data?.name || email.split('@')[0];
          const session = {
            id: data?.result?.userId || data?.userId || Date.now(),
            name,
            email,
            role: data?.result?.role || data?.role || 'admin',
            avatar: name[0]?.toUpperCase() || 'U',
          };
          localStorage.setItem(SESSION_KEY, JSON.stringify(session));
          setUser(session);
          setLoading(false);
          return true;
        }

        if (response.status === 401 || response.status === 400) {
          console.warn('[Auth] Wrong credentials at', endpoint.url);
          setError('Invalid email or password.');
          setLoading(false);
          return false;
        }

        // 404 or other = endpoint doesn't exist, try next
        console.warn('[Auth] Endpoint not found, trying next...');

      } catch (err) {
        console.warn('[Auth] Network error at', endpoint.url, '—', err.message);
      }
    }

    // ── Local fallback (offline / dev mode) ──
    console.warn('[Auth] All backend endpoints failed — using local fallback.');
    await new Promise((r) => setTimeout(r, 400));
    const cleanEmail = email.trim().toLowerCase();
    const users = getUsers();
    const foundUser = users.find(
      (u) => u.email.toLowerCase() === cleanEmail && u.password === password.trim(),
    );

    if (!foundUser) {
      setError('Invalid email or password.');
      setLoading(false);
      return false;
    }

    const session = {
      id: foundUser.id,
      name: foundUser.name,
      email: foundUser.email,
      role: foundUser.role,
      avatar: foundUser.avatar,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    localStorage.setItem('auth_token', 'local-dev-token'); // Set dev token to prevent interceptor errors
    setUser(session);
    setLoading(false);
    return true;
  };

  // Logout
  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('auth_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        clearError,
        register,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
