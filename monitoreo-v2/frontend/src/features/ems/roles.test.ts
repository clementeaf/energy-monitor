import { describe, expect, it } from 'vitest';
import { canViewSection, EMS_ROLE_BY_SLUG, EMS_ROLES, firstSectionPath, type EmsRoleId } from './roles';

describe('EMS roles', () => {
  it('shows Configuración only to Administrador', () => {
    const rolesWithConfiguracion = (Object.keys(EMS_ROLES) as EmsRoleId[]).filter((role) => canViewSection(role, 'configuracion'));
    expect(rolesWithConfiguracion).toEqual(['admin']);
  });

  it('gives Gestor every section except Configuración', () => {
    expect(EMS_ROLES.gestor.sections).toHaveLength(8);
    expect(canViewSection('gestor', 'configuracion')).toBe(false);
  });

  it('limits Ejecutivo to Resumen, Márgenes and Sostenibilidad', () => {
    expect(EMS_ROLES.ejecutivo.sections).toEqual(['resumen', 'margenes', 'sostenibilidad']);
  });

  it('lands Técnico on Remarcadores', () => {
    expect(firstSectionPath('tecnico')).toBe('/remarcadores');
    expect(canViewSection('tecnico', 'resumen')).toBe(false);
  });

  it('round-trips every Ver como role through its impersonated slug', () => {
    for (const role of Object.keys(EMS_ROLES) as EmsRoleId[]) {
      expect(EMS_ROLE_BY_SLUG[EMS_ROLES[role].viewAsSlug]).toBe(role);
    }
  });
});
