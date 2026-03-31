import { usePermissionContext } from "../context/PermissionContext";

/**
 * usePermission custom hook
 * Usage:
 * const canView = usePermission("Billing.UserWorkingHours");
 */
export function usePermission(key) {
  const { hasPermission, isLoading } = usePermissionContext();
  
  if (isLoading) return false;
  return hasPermission(key);
}
