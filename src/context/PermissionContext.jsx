import { createContext, useContext, useState, useEffect, useCallback } from "react";
import apiClient from "../services/apiClient";
import { useAuth } from "./AuthContextHook";
import { loadApplicationConfig } from "../services/applicationConfigCache";

const PermissionContext = createContext({
  permissions: {},
  isLoading: true,
  hasPermission: () => false,
  refetchPermissions: () => { },
});

const SESSION_KEY = "spike_session";
const AMS_TICKET_PERMISSION = "Billing.AMSTickets";

const getAdminRoleName = (roleNames = "") =>
  roleNames
    .split(",")
    .map((roleName) => roleName.trim())
    .find((roleName) => roleName.toLowerCase() === "admin") || null;

const isAmsTicketPermission = (permissionName) =>
  permissionName === AMS_TICKET_PERMISSION ||
  permissionName.startsWith(`${AMS_TICKET_PERMISSION}.`);

// Admin-role ticket permissions are kept for the browser session so pages can
// render at once; they are refreshed in the background on every load.
const ADMIN_ROLE_PERMISSIONS_KEY = "ams_admin_role_permissions";

const readCachedAdminRolePermissions = (roleName) => {
  if (!roleName) return null;
  try {
    const stored = JSON.parse(sessionStorage.getItem(ADMIN_ROLE_PERMISSIONS_KEY) || "null");
    return stored?.roleName === roleName ? stored.permissions : null;
  } catch {
    return null;
  }
};

const cacheAdminRolePermissions = (roleName, permissions) => {
  try {
    sessionStorage.setItem(ADMIN_ROLE_PERMISSIONS_KEY, JSON.stringify({ roleName, permissions }));
  } catch {
    // In-memory state still works when browser storage is unavailable.
  }
};

const hasEntries = (value) => Boolean(value) && Object.keys(value).length > 0;

const isPolicyGranted = (value) =>
  value === true ||
  (typeof value === "string" && value.trim().toLowerCase() === "true");

export const PermissionProvider = ({ children }) => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const adminRoleName = getAdminRoleName(user?.role);

  // ── FIX: Seed permissions synchronously from user.permissions ─────────────
  // Previously this always started as {} and fetched from the API, which caused
  // a race: AuthContext.loading was true → isAuthenticated was false → this
  // context set permissions={} and isLoading=false → sidebar rendered with no
  // permissions → only Dashboard (which has no PermissionGuard) was visible.
  //
  // Now we initialize directly from user.permissions (already in storage/state),
  // so permissions are available on the first render with no async round-trip.
  const [permissions, setPermissions] = useState(() => user?.permissions ?? {});
  const [adminRolePermissions, setAdminRolePermissions] = useState(
    () => readCachedAdminRolePermissions(getAdminRoleName(user?.role)),
  );
  const [adminRolePermissionsLoading, setAdminRolePermissionsLoading] = useState(() => {
    const roleName = getAdminRoleName(user?.role);
    return Boolean(roleName) && !readCachedAdminRolePermissions(roleName);
  });

  // ── isLoading mirrors authLoading so App.jsx's spinner stays up ───────────
  // until AuthContext has confirmed the session. Once authLoading=false we know
  // user (and user.permissions) is final.
  const [isLoading, setIsLoading] = useState(true);

  const fetchAdminRolePermissions = useCallback(async () => {
    if (!isAuthenticated || !adminRoleName) {
      setAdminRolePermissions(null);
      setAdminRolePermissionsLoading(false);
      return null;
    }

    // With cached role permissions the page keeps rendering during the refresh.
    if (!readCachedAdminRolePermissions(adminRoleName)) setAdminRolePermissionsLoading(true);
    try {
      const response = await apiClient.get("/api/permission-management/permissions", {
        params: {
          providerName: "R",
          providerKey: adminRoleName,
          _permissionRefresh: Date.now(),
        },
        headers: {
          "Cache-Control": "no-cache, no-store",
          Pragma: "no-cache",
        },
      });
      const rolePermissions = {};
      response.data?.groups?.forEach((group) => {
        group.permissions?.forEach((permission) => {
          rolePermissions[permission.name] = permission.isGranted === true;
        });
      });
      setAdminRolePermissions(rolePermissions);
      cacheAdminRolePermissions(adminRoleName, rolePermissions);
      return rolePermissions;
    } catch (error) {
      // Some users may not be allowed to inspect role permissions. In that
      // case, retain the normal effective-policy behavior as a safe fallback.
      console.warn("[PermissionContext] Failed to fetch Admin role permissions:", error);
      setAdminRolePermissions(null);
      return null;
    } finally {
      setAdminRolePermissionsLoading(false);
    }
  }, [adminRoleName, isAuthenticated]);

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

    if (hasEntries(user.permissions)) {
      // Render at once with the saved permissions, then refresh them in the
      // background so a revoked permission disappears as soon as the backend answers.
      setPermissions(user.permissions);
      setIsLoading(false);
      fetchPermissions({ background: true });
      return;
    }

    fetchPermissions();
  }, [authLoading, isAuthenticated, user?.id, user?.permissions]);

  // Admin ticket controls must follow grants on the Admin role itself, not a
  // union of direct-user and other-role grants returned by grantedPolicies.
  useEffect(() => {
    if (authLoading) return;
    fetchAdminRolePermissions();
  }, [authLoading, fetchAdminRolePermissions]);

  // ── Fallback fetch — only used when user.permissions is absent ────────────
  const fetchPermissions = useCallback(async ({ background = false } = {}) => {
    if (!isAuthenticated) {
      setPermissions({});
      setIsLoading(false);
      return;
    }

    if (!background) setIsLoading(true);
    try {
      const applicationConfig = await loadApplicationConfig({ force: true });
      const grantedPolicies = applicationConfig?.auth?.grantedPolicies ?? {};
      setPermissions(grantedPolicies);

      // Keep the cached session in sync with the freshly resolved policies.
      // Otherwise a reload restores the permissions that were captured at login.
      try {
        const storedSession = localStorage.getItem(SESSION_KEY);
        if (storedSession) {
          const session = JSON.parse(storedSession);
          localStorage.setItem(
            SESSION_KEY,
            JSON.stringify({ ...session, permissions: grantedPolicies }),
          );
        }
      } catch (storageError) {
        console.warn("[PermissionContext] Failed to cache refreshed permissions:", storageError);
      }

      return grantedPolicies;
    } catch (error) {
      console.error("[PermissionContext] Failed to fetch permissions:", error);
      // A failed background refresh keeps the saved permissions.
      if (!background) setPermissions({});
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const refetchPermissions = useCallback(async () => {
    const [effectivePermissions] = await Promise.all([
      fetchPermissions(),
      fetchAdminRolePermissions(),
    ]);
    return effectivePermissions;
  }, [fetchAdminRolePermissions, fetchPermissions]);

  const permissionsLoading = isLoading || adminRolePermissionsLoading;

  const hasPermission = useCallback(
    (key) => {
      if (permissionsLoading) return false;
      if (!key) return true;

      const isGranted = (permissionName) => {
        if (
          adminRolePermissions &&
          isAmsTicketPermission(permissionName) &&
          Object.prototype.hasOwnProperty.call(adminRolePermissions, permissionName)
        ) {
          return isPolicyGranted(adminRolePermissions[permissionName]);
        }
        return isPolicyGranted(permissions[permissionName]);
      };

      // Support array of keys — true if user has ANY of them
      if (Array.isArray(key)) return key.some(isGranted);
      return isGranted(key);
    },
    [adminRolePermissions, permissions, permissionsLoading],
  );

  return (
    <PermissionContext.Provider
      value={{
        permissions,
        isLoading: permissionsLoading,
        hasPermission,
        refetchPermissions,
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
