import { usePermission } from "../../hooks/usePermission";

/**
 * PermissionGuard component
 * Usage:
 * <PermissionGuard permission="Billing.UserWorkingHours.Create">
 *   <button>New Working Hour</button>
 * </PermissionGuard>
 */
export function PermissionGuard({ permission, children }) {
  const isGranted = usePermission(permission);

  if (!isGranted) {
    return null;
  }

  return <>{children}</>;
}
