import type { AuthUser, Role } from '../types/auth';

export const demoUsers: AuthUser[] = [
  {
    id: 'demo-1',
    name: 'Admin Global',
    email: 'admin@demo.power',
    role: 'SUPER_ADMIN',
    provider: 'demo',
    siteIds: ['*'],
  },
  {
    id: 'demo-2',
    name: 'Admin Corporativo',
    email: 'corp@demo.power',
    role: 'CORP_ADMIN',
    provider: 'demo',
    siteIds: ['*'],
  },
  {
    id: 'demo-3',
    name: 'Admin Edificio',
    email: 'site@demo.power',
    role: 'SITE_ADMIN',
    provider: 'demo',
    siteIds: ['building-1', 'building-2'],
  },
  {
    id: 'demo-4',
    name: 'Operador Técnico',
    email: 'operator@demo.power',
    role: 'OPERATOR',
    provider: 'demo',
    siteIds: ['building-1'],
  },
  {
    id: 'demo-5',
    name: 'Analista Energía',
    email: 'analyst@demo.power',
    role: 'ANALYST',
    provider: 'demo',
    siteIds: ['*'],
  },
  {
    id: 'demo-6',
    name: 'Locatario Ejemplo',
    email: 'tenant@demo.power',
    role: 'TENANT_USER',
    provider: 'demo',
    siteIds: ['building-1'],
  },
  {
    id: 'demo-7',
    name: 'Auditor Externo',
    email: 'auditor@demo.power',
    role: 'AUDITOR',
    provider: 'demo',
    siteIds: ['*'],
  },
];

export function getDemoUserByRole(role: Role): AuthUser | undefined {
  return demoUsers.find((u) => u.role === role);
}
