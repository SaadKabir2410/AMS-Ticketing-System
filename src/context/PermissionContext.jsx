import { createContext, useContext, useState, useEffect, useCallback } from "react";
import apiClient from "../services/apiClient";
import { useAuth } from "./AuthContextHook";

const PermissionContext = createContext({
  permissions: {},
  isLoading: true,
  hasPermission: () => false,
  refetchPermissions: () => {},
});

export const PermissionProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [permissions, setPermissions] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    if (!isAuthenticated) {
      setPermissions({});
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiClient.get("/api/abp/application-configuration");
      const grantedPolicies = response.data?.auth?.grantedPolicies || {};
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

  // Initial fetch and refetch when auth state changes
  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions, user?.id]);

  const hasPermission = useCallback(
    (key) => {
      if (isLoading) return false;
      
      // Admin always has all permissions
      const isAdmin = user?.role?.toLowerCase().includes("admin") || user?.roles?.includes("admin");
      if (isAdmin) return true;

      return !!permissions[key];
    },
    [permissions, isLoading, user]
  );

  const value = {
    permissions,
    isLoading,
    hasPermission,
    refetchPermissions: fetchPermissions,
  };

  return (
    <PermissionContext.Provider value={value}>
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
