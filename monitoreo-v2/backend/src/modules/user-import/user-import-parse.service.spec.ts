import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { UserImportParseService } from './user-import-parse.service';
import type { UserImportTenantContext } from './user-import.types';

function buildCsv(rows: string[]): string {
  const header = 'email,auth_provider,role_slug,display_name,building_codes,phone';
  return [header, ...rows].join('\n');
}

describe('UserImportParseService', () => {
  let service: UserImportParseService;
  let queryMock: jest.Mock;

  const baseContext: UserImportTenantContext = {
    tenantId: 'tenant-1',
    creatorRoleId: 'creator-role',
    creatorRoleSlug: 'corp_admin',
    creatorHierarchyLevel: 10,
    rolesBySlug: new Map([
      ['operator', { id: 'role-op', slug: 'operator', name: 'Operator', hierarchyLevel: 50 }],
      ['technician', { id: 'role-tech', slug: 'technician', name: 'Technician', hierarchyLevel: 60 }],
      ['super_admin', { id: 'role-sa', slug: 'super_admin', name: 'Super Admin', hierarchyLevel: 0 }],
    ]),
    buildings: [
      { id: 'b-1', code: 'MM446', name: 'Mall del Mar', externalSiteId: 'EXT-446' },
      { id: 'b-2', code: 'MG254', name: 'Mallplaza Gestion', externalSiteId: null },
    ],
    existingEmails: new Set(['existing@empresa.cl']),
  };

  beforeEach(async () => {
    queryMock = jest.fn();
    const module = await Test.createTestingModule({
      providers: [
        UserImportParseService,
        { provide: DataSource, useValue: { query: queryMock } },
      ],
    }).compile();
    service = module.get(UserImportParseService);
  });

  it('loads tenant context from database', async () => {
    queryMock
      .mockResolvedValueOnce([{ hierarchy_level: 10 }])
      .mockResolvedValueOnce([
        { id: 'role-op', slug: 'operator', name: 'Operator', hierarchy_level: 50 },
      ])
      .mockResolvedValueOnce([
        { id: 'b-1', code: 'MM446', name: 'Mall', external_site_id: null },
      ])
      .mockResolvedValueOnce([{ email: 'a@b.cl', email_hmac: null }]);

    const ctx = await service.loadTenantContext('tenant-1', 'creator-role', 'corp_admin');
    expect(ctx.creatorHierarchyLevel).toBe(10);
    expect(ctx.rolesBySlug.get('operator')?.id).toBe('role-op');
    expect(ctx.buildings).toHaveLength(1);
    expect(ctx.existingEmails.has('a@b.cl')).toBe(true);
  });

  it('parseAndValidateFile returns mixed summary for 20-row scenario subset', async () => {
    const rows: string[] = [];
    for (let i = 1; i <= 15; i += 1) {
      rows.push(`valid${i}@empresa.cl,microsoft,operator,User ${i},MM446,`);
    }
    rows.push('bad-email,microsoft,operator,Bad,,');
    rows.push('existing@empresa.cl,google,technician,Existing,,');
    rows.push('dup@empresa.cl,microsoft,operator,One,,');
    rows.push('dup@empresa.cl,google,technician,Two,,');
    rows.push('no-role@empresa.cl,microsoft,,No Role,,');
    rows.push('nobuild@empresa.cl,microsoft,operator,No Build,UNKNOWN,');
    rows.push('hier@empresa.cl,microsoft,super_admin,Too Priv,,');
    rows.push('phone@empresa.cl,google,technician,Phone,MM446,12345');

    const csv = buildCsv(rows);
    const result = await service.parseAndValidateFile(
      Buffer.from(csv, 'utf8'),
      'import.csv',
      'text/csv',
      baseContext,
    );

    expect(result.summary.totalRows).toBe(23);
    expect(result.summary.validRows).toBeGreaterThanOrEqual(14);
    expect(result.summary.duplicateRows).toBeGreaterThanOrEqual(2);
    expect(result.summary.errorRows).toBeGreaterThanOrEqual(4);

    const validRow = result.rows.find((r) => r.email === 'valid1@empresa.cl');
    expect(validRow?.status).toBe('valid');
    expect(validRow?.resolvedRoleId).toBe('role-op');
    expect(validRow?.resolvedBuildingIds).toEqual(['b-1']);

    const duplicateRow = result.rows.find((r) => r.email === 'existing@empresa.cl');
    expect(duplicateRow?.status).toBe('duplicate');

    const hierarchyRow = result.rows.find((r) => r.email === 'hier@empresa.cl');
    expect(hierarchyRow?.errorCodes).toContain('HIERARCHY_DENIED');
  });
});
