import type { RoleSlug } from '../../types/auth';

export type EmsSection =
  | 'resumen'
  | 'centros'
  | 'remarcadores'
  | 'consumo'
  | 'margenes'
  | 'sostenibilidad'
  | 'alertas'
  | 'reportes'
  | 'configuracion';

export type EmsRoleId = 'admin' | 'gestor' | 'ejecutivo' | 'tecnico';

interface EmsRole {
  label: string;
  tagline: string;
  sections: readonly EmsSection[];
  viewAsSlug: RoleSlug;
}

export const EMS_SECTION_PATHS: Record<EmsSection, string> = {
  resumen: '/resumen',
  centros: '/centros',
  remarcadores: '/remarcadores',
  consumo: '/consumo',
  margenes: '/margenes',
  sostenibilidad: '/sostenibilidad',
  alertas: '/alertas',
  reportes: '/reportes',
  configuracion: '/configuracion',
};

const ALL_SECTIONS = Object.keys(EMS_SECTION_PATHS) as EmsSection[];

export const EMS_ROLES: Record<EmsRoleId, EmsRole> = {
  admin: { label: 'Administrador', tagline: 'Dueño del sistema', sections: ALL_SECTIONS, viewAsSlug: 'super_admin' },
  gestor: {
    label: 'Gestor de Energía',
    tagline: 'Uso diario',
    sections: ALL_SECTIONS.filter((section) => section !== 'configuracion'),
    viewAsSlug: 'site_admin',
  },
  ejecutivo: {
    label: 'Ejecutivo / Visualización',
    tagline: 'Solo lectura',
    sections: ['resumen', 'margenes', 'sostenibilidad'],
    viewAsSlug: 'corp_admin',
  },
  tecnico: { label: 'Técnico de Campo', tagline: 'Móvil, en terreno', sections: ['remarcadores'], viewAsSlug: 'operator' },
};

export const EMS_ROLE_BY_SLUG: Record<RoleSlug, EmsRoleId> = {
  super_admin: 'admin',
  site_admin: 'gestor',
  corp_admin: 'ejecutivo',
  auditor: 'ejecutivo',
  operator: 'tecnico',
};

export function canViewSection(role: EmsRoleId | null, section: EmsSection): boolean {
  return role === null || EMS_ROLES[role].sections.includes(section);
}

export function firstSectionPath(role: EmsRoleId): string {
  return EMS_SECTION_PATHS[EMS_ROLES[role].sections[0]];
}
