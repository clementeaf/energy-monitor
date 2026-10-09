import { usePermissions } from '../../hooks/usePermissions';
import { EMS_ROLE_BY_SLUG, type EmsRoleId } from './roles';

export function useEmsRole(): EmsRoleId | null {
  const { roleSlug } = usePermissions();
  return roleSlug ? EMS_ROLE_BY_SLUG[roleSlug] : null;
}
