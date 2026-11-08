import type { RoleSlug } from '../../types/auth';

export type EmsSection =
  | 'resumen'
  | 'centros'
  | 'remarcadores'
  | 'terreno'
  | 'consumo'
  | 'margenes'
  | 'sostenibilidad'
  | 'alertas'
  | 'reportes'
  | 'facturacion'
  | 'configuracion';

export type EmsRoleId = 'admin' | 'gestor' | 'ejecutivo' | 'tecnico' | 'backoffice';

type SectionAccess = 'ver' | 'editar';

interface EmsRole {
  label: string;
  tagline: string;
  home: EmsSection;
  access: Partial<Record<EmsSection, SectionAccess>>;
  viewAsSlug: RoleSlug;
}

export const EMS_SECTION_PATHS: Record<EmsSection, string> = {
  resumen: '/resumen',
  centros: '/centros',
  remarcadores: '/remarcadores',
  terreno: '/terreno',
  consumo: '/consumo',
  margenes: '/margenes',
  sostenibilidad: '/sostenibilidad',
  alertas: '/alertas',
  reportes: '/reportes',
  facturacion: '/facturacion',
  configuracion: '/configuracion',
};

const ALL_SECTIONS = (Object.keys(EMS_SECTION_PATHS) as EmsSection[]).filter((section) => section !== 'terreno');

function editAll(sections: readonly EmsSection[]): Partial<Record<EmsSection, SectionAccess>> {
  return Object.fromEntries(sections.map((section) => [section, 'editar']));
}

export const EMS_ROLES: Record<EmsRoleId, EmsRole> = {
  admin: { label: 'Administrador', tagline: 'Dueño del sistema', home: 'resumen', access: editAll(ALL_SECTIONS), viewAsSlug: 'super_admin' },
  gestor: {
    label: 'Gestor de Energía',
    tagline: 'Uso diario',
    home: 'resumen',
    access: { ...editAll(['resumen', 'centros', 'remarcadores', 'consumo', 'margenes', 'sostenibilidad', 'alertas', 'reportes']), facturacion: 'ver' },
    viewAsSlug: 'site_admin',
  },
  ejecutivo: {
    label: 'Ejecutivo / Visualización',
    tagline: 'Solo lectura',
    home: 'resumen',
    access: { resumen: 'ver', margenes: 'ver', sostenibilidad: 'ver', facturacion: 'ver' },
    viewAsSlug: 'corp_admin',
  },
  tecnico: { label: 'Técnico de Campo', tagline: 'Móvil, en terreno', home: 'terreno', access: { terreno: 'editar', remarcadores: 'editar' }, viewAsSlug: 'operator' },
  backoffice: {
    label: 'Backoffice / Finanzas',
    tagline: 'Documentos de cobro',
    home: 'facturacion',
    access: { centros: 'ver', facturacion: 'editar' },
    viewAsSlug: 'auditor',
  },
};

export const EMS_ROLE_BY_SLUG: Record<RoleSlug, EmsRoleId> = {
  super_admin: 'admin',
  site_admin: 'gestor',
  corp_admin: 'ejecutivo',
  auditor: 'backoffice',
  operator: 'tecnico',
};

export function canViewSection(role: EmsRoleId | null, section: EmsSection): boolean {
  return section in EMS_ROLES[role ?? 'admin'].access;
}

export function canEditSection(role: EmsRoleId | null, section: EmsSection): boolean {
  return EMS_ROLES[role ?? 'admin'].access[section] === 'editar';
}

export function firstSectionPath(role: EmsRoleId): string {
  return EMS_SECTION_PATHS[EMS_ROLES[role].home];
}
