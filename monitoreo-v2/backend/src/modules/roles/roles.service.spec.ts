import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { RolesService } from './roles.service';

describe('RolesService', () => {
  let service: RolesService;
  let ds: { query: jest.Mock };

  beforeEach(async () => {
    ds = { query: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        RolesService,
        { provide: DataSource, useValue: ds },
      ],
    }).compile();

    service = module.get(RolesService);
  });

  describe('getPermissionsByRoleId', () => {
    it('maps DB rows to UserPermission objects', async () => {
      ds.query.mockResolvedValue([
        { module: 'billing', action: 'read', access_level: 'R' },
        { module: 'alerts', action: 'update', access_level: 'CRU' },
      ]);

      const result = await service.getPermissionsByRoleId('role-1');

      expect(result).toEqual([
        { module: 'billing', action: 'read', accessLevel: 'R' },
        { module: 'alerts', action: 'update', accessLevel: 'CRU' },
      ]);
      expect(ds.query).toHaveBeenCalledWith(expect.stringContaining('role_permissions'), ['role-1']);
    });

    it('returns empty array when no permissions', async () => {
      ds.query.mockResolvedValue([]);
      expect(await service.getPermissionsByRoleId('role-x')).toEqual([]);
    });
  });

  describe('getRoleByUserId', () => {
    it('returns role when found', async () => {
      ds.query.mockResolvedValue([{
        id: 'r-1', slug: 'operator', name: 'Operador', max_session_minutes: 30,
      }]);

      const result = await service.getRoleByUserId('u-1');

      expect(result).toEqual({
        id: 'r-1', slug: 'operator', name: 'Operador', maxSessionMinutes: 30,
      });
    });

    it('returns null when user has no role', async () => {
      ds.query.mockResolvedValue([]);
      expect(await service.getRoleByUserId('u-x')).toBeNull();
    });
  });

  describe('getUserBuildingIds', () => {
    it('returns array of building UUIDs', async () => {
      ds.query.mockResolvedValue([
        { building_id: 'b-1' },
        { building_id: 'b-2' },
      ]);

      expect(await service.getUserBuildingIds('u-1')).toEqual(['b-1', 'b-2']);
    });

    it('returns empty array when no access', async () => {
      ds.query.mockResolvedValue([]);
      expect(await service.getUserBuildingIds('u-x')).toEqual([]);
    });
  });
});
