import { Navigate } from 'react-router';
import { usePermissions } from '../../hooks/usePermissions';

interface RequirePermsProps {
  /** User must have at least ONE of these permissions (format: "module:action") */
  any: string[];
  children: React.ReactNode;
}

/**
 * Route-level permission guard.
 * Renders children only if the user has at least one of the required permissions.
 * Otherwise redirects to dashboard with a replace to avoid back-button loops.
 */
export function RequirePerms({ any, children }: Readonly<RequirePermsProps>) {
  const { hasAny } = usePermissions();

  if (!hasAny(...any)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
