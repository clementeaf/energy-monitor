import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useAppStore } from '../../store/useAppStore';
import { LockedModule } from './LockedModule';
import { isAddonSection } from './modules';
import { canViewSection, firstSectionPath, type EmsSection } from './roles';
import { useEmsRole } from './useEmsRole';

export function EmsSectionRoute({ section, children }: { section: EmsSection; children: ReactNode }) {
  const role = useEmsRole();
  const modulosActivos = useAppStore((s) => s.modulosActivos);
  if (!canViewSection(role, section)) return <Navigate to={firstSectionPath(role ?? 'admin')} replace />;
  if (isAddonSection(section) && !modulosActivos[section]) return <LockedModule moduloId={section} />;
  return children;
}
