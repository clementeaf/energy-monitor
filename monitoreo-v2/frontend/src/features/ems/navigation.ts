import type { NavModuleIconName } from '../../components/layout/sidebar-icons';
import { useBuildingsQuery } from '../../hooks/queries/useBuildingsQuery';
import { useMetersQuery } from '../../hooks/queries/useMetersQuery';
import { useAppStore } from '../../store/useAppStore';
import { isAddonSection } from './modules';
import { canViewSection, EMS_SECTION_PATHS, type EmsSection } from './roles';
import { useEmsAlertas } from './useEmsFleet';
import { useEmsRole } from './useEmsRole';

export type NavGroup = 'Núcleo' | 'Add-ons' | 'Cuenta';

export const EMS_SECTION_NAV: Record<EmsSection, { label: string; icon: NavModuleIconName; group: NavGroup }> = {
  resumen: { label: 'Resumen', icon: 'gauge', group: 'Núcleo' },
  centros: { label: 'Centros', icon: 'building', group: 'Núcleo' },
  remarcadores: { label: 'Remarcadores', icon: 'cpu', group: 'Núcleo' },
  terreno: { label: 'Mis tareas', icon: 'alerts', group: 'Núcleo' },
  consumo: { label: 'Analítica de Consumo', icon: 'analytics', group: 'Add-ons' },
  margenes: { label: 'Márgenes', icon: 'coins', group: 'Add-ons' },
  sostenibilidad: { label: 'Sostenibilidad', icon: 'leaf', group: 'Add-ons' },
  alertas: { label: 'Alertas', icon: 'alerts', group: 'Add-ons' },
  reportes: { label: 'Reportes', icon: 'file', group: 'Add-ons' },
  facturacion: { label: 'Facturación', icon: 'billing', group: 'Add-ons' },
  configuracion: { label: 'Configuración', icon: 'settings', group: 'Cuenta' },
};

export function findSectionLabel(pathname: string): string | undefined {
  const section = (Object.keys(EMS_SECTION_PATHS) as EmsSection[]).find((key) => {
    const path = EMS_SECTION_PATHS[key];
    return pathname === path || pathname.startsWith(`${path}/`);
  });
  return section && EMS_SECTION_NAV[section].label;
}

export interface EmsNavItem {
  section: EmsSection;
  label: string;
  icon: NavModuleIconName;
  group: NavGroup;
  path: string;
  isLocked: boolean;
  badge: number;
}

export function useEmsNavItems(): EmsNavItem[] {
  const role = useEmsRole();
  const modulosActivos = useAppStore((s) => s.modulosActivos);
  const centrosSimulados = useAppStore((s) => s.centrosSimulados);
  const buildingsQuery = useBuildingsQuery();
  const metersQuery = useMetersQuery();
  const { activas } = useEmsAlertas();
  const badges: Partial<Record<EmsSection, number>> = {
    centros: (buildingsQuery.data?.length ?? 0) + centrosSimulados.length,
    remarcadores: metersQuery.data?.length ?? 0,
    alertas: activas.length,
  };

  return (Object.keys(EMS_SECTION_NAV) as EmsSection[])
    .filter((section) => canViewSection(role, section))
    .map((section) => {
      const isLocked = isAddonSection(section) && !modulosActivos[section];
      return {
        section,
        ...EMS_SECTION_NAV[section],
        path: EMS_SECTION_PATHS[section],
        isLocked,
        badge: isLocked ? 0 : badges[section] ?? 0,
      };
    });
}
