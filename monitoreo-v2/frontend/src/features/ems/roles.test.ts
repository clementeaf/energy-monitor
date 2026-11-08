import { describe, expect, it } from 'vitest';
import { canEditSection, canViewSection, EMS_ROLE_BY_SLUG, EMS_ROLES, firstSectionPath, type EmsRoleId } from './roles';

describe('EMS roles', () => {
  it('shows Configuración only to Administrador', () => {
    const rolesWithConfiguracion = (Object.keys(EMS_ROLES) as EmsRoleId[]).filter((role) => canViewSection(role, 'configuracion'));
    expect(rolesWithConfiguracion).toEqual(['admin']);
  });

  it('gives Gestor every section except Configuración, with Facturación read-only', () => {
    expect(canViewSection('gestor', 'configuracion')).toBe(false);
    expect(canEditSection('gestor', 'alertas')).toBe(true);
    expect(canViewSection('gestor', 'facturacion')).toBe(true);
    expect(canEditSection('gestor', 'facturacion')).toBe(false);
  });

  it('keeps Ejecutivo read-only on Resumen, Márgenes, Sostenibilidad and Facturación', () => {
    expect(Object.keys(EMS_ROLES.ejecutivo.access)).toEqual(['resumen', 'margenes', 'sostenibilidad', 'facturacion']);
    expect(Object.keys(EMS_ROLES.ejecutivo.access).some((section) => canEditSection('ejecutivo', section as keyof typeof EMS_ROLES.ejecutivo.access))).toBe(false);
  });

  it('lands Técnico on its field tasks', () => {
    expect(firstSectionPath('tecnico')).toBe('/terreno');
    expect(canViewSection('tecnico', 'remarcadores')).toBe(true);
    expect(canViewSection('admin', 'terreno')).toBe(false);
    expect(canViewSection('tecnico', 'resumen')).toBe(false);
  });

  it('lands Backoffice on Facturación and shows Centros read-only', () => {
    expect(firstSectionPath('backoffice')).toBe('/facturacion');
    expect(canEditSection('backoffice', 'facturacion')).toBe(true);
    expect(canViewSection('backoffice', 'centros')).toBe(true);
    expect(canEditSection('backoffice', 'centros')).toBe(false);
    expect(canViewSection('backoffice', 'resumen')).toBe(false);
  });

  it('round-trips every Ver como role through its impersonated slug', () => {
    for (const role of Object.keys(EMS_ROLES) as EmsRoleId[]) {
      expect(EMS_ROLE_BY_SLUG[EMS_ROLES[role].viewAsSlug]).toBe(role);
    }
  });
});
