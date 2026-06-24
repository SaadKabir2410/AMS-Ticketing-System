import { createContext, useContext, useState, useEffect, useCallback } from "react";
import apiClient from "../services/apiClient";
import { useAuth } from "./AuthContextHook";

const PermissionContext = createContext({
  permissions: {},
  isLoading: true,
  hasPermission: () => false,
  refetchPermissions: () => { },
});

export const PermissionProvider = ({ children }) => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  // ── FIX: Seed permissions synchronously from user.permissions ─────────────
  // Previously this always started as {} and fetched from the API, which caused
  // a race: AuthContext.loading was true → isAuthenticated was false → this
  // context set permissions={} and isLoading=false → sidebar rendered with no
  // permissions → only Dashboard (which has no PermissionGuard) was visible.
  //
  // Now we initialize directly from user.permissions (already in storage/state),
  // so permissions are available on the first render with no async round-trip.
  const [permissions, setPermissions] = useState(() => user?.permissions ?? {});

  // ── isLoading mirrors authLoading so App.jsx's spinner stays up ───────────
  // until AuthContext has confirmed the session. Once authLoading=false we know
  // user (and user.permissions) is final.
  const [isLoading, setIsLoading] = useState(true);

  // ── Sync permissions whenever the user object changes ─────────────────────
  // Covers: initial mount, login, logout, and token refresh that updates profile.
  useEffect(() => {
    if (authLoading) {
      // AuthContext hasn't finished reading storage yet — keep spinner up
      setIsLoading(true);
      return;
    }

    if (!isAuthenticated || !user) {
      // Logged out — clear everything
      setPermissions({});
      setIsLoading(false);
      return;
    }

    if (user.permissions && Object.keys(user.permissions).length > 0) {
      // Permissions already in the user object (fetched during login and
      // persisted in spike_session) — use them directly, no API call needed
      setPermissions(user.permissions);
      setIsLoading(false);
    } else {
      // Permissions missing from user object (e.g. legacy session in storage
      // from before this fix, or register() flow that doesn't fetch them).
      // Fall back to fetching from the API.
      fetchPermissions();
    }
  }, [authLoading, isAuthenticated, user?.id, user?.permissions]);

  // ── Fallback fetch — only used when user.permissions is absent ────────────
  const fetchPermissions = useCallback(async () => {
    if (!isAuthenticated) {
      setPermissions({});
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiClient.get("/api/abp/application-configuration");
      const grantedPolicies = response.data?.auth?.grantedPolicies ?? {};
      setPermissions(grantedPolicies);
    } catch (error) {
      console.error("[PermissionContext] Failed to fetch permissions:", error);
      setPermissions({});
      if (error.response?.status === 401) {
        window.dispatchEvent(new CustomEvent("auth:expired"));
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const hasPermission = useCallback(
    (key) => {
      if (isLoading) return false;
      if (!key) return true;
      // Support array of keys — true if user has ANY of them
      if (Array.isArray(key)) return key.some((k) => !!permissions[k]);
      return !!permissions[key];
    },
    [permissions, isLoading],
  );

  return (
    <PermissionContext.Provider
      value={{
        permissions,
        isLoading,
        hasPermission,
        refetchPermissions: fetchPermissions,
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissionContext = () => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error("usePermissionContext must be used within a PermissionProvider");
  }
  return context;
};