import { usePermissionContext } from "../../context/PermissionContext";
import { Navigate } from "react-router-dom";

/**
 * PermissionGuard
 * 
 * Conditionally renders children only if the user has the required permission.
 * If permission is missing, it redirects to the specified path (default: /).
 */
export default function PermissionGuard({ permission, children, redirectTo = "/" }) {
  const { hasPermission, isLoading } = usePermissionContext();

  // Don't render or redirect while permissions are still loading
  if (isLoading) {
    return null; 
  }

  // If no permission is required, or user has it, grant access
  if (!permission || hasPermission(permission)) {
    return <>{children}</>;
  }

  // Otherwise, redirect to a safe page
  console.warn(`[PermissionGuard] Access denied for permission: ${permission}. Redirecting to ${redirectTo}`);
  return <Navigate to={redirectTo} replace />;
}
