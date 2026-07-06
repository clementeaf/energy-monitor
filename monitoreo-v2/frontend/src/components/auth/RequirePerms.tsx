import { usePermissions } from '../../hooks/usePermissions';

interface RequirePermsProps {
  /** User must have at least ONE of these permissions (format: "module:action") */
  any: string[];
  children: React.ReactNode;
}

/**
 * Route-level permission guard.
 * Renders children only if the user has at least one of the required permissions.
 * Shows a static message instead of redirecting to avoid navigation loops.
 */
export function RequirePerms({ any, children }: Readonly<RequirePermsProps>) {
  const { hasAny } = usePermissions();

  if (!hasAny(...any)) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-semibold tracking-tight text-foreground">Acceso restringido</p>
          <p className="mt-1 text-sm text-muted">No tienes permisos para acceder a esta sección.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
