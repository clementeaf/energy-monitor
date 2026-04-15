import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { RolesService } from './roles.service';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';

const TENANT = 't-1';

const mockRole = {
  id: 'r-1',
  tenantId: TENANT,
  name: 'Operator',
  slug: 'operator',
  description: 'Technical operator',
  maxSessionMinutes: 30,
  isDefault: false,
  isActive: true,
  permissions: [],
};

describe('RolesService', () => {
  let service: RolesService;
  let ds: { query: jest.Mock };
  let roleRepo: Record<string, jest.Mock>;
  let permissionRepo: Record<string, jest.Mock>;

  beforeEach(async () => {
    ds = { query: jest.fn() };
    roleRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      create: jest.fn((data) => ({ ...data })),
      save: jest.fn((entity) => Promise.resolve({ ...entity, id: entity.id ?? 'new-id' })),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    permissionRepo = {
      find: jest.fn().mockResolvedValue([]),
    };

    const module = await Test.createTestingModule({
      providers: [
        RolesService,
        { provide: DataSource, useValue: ds },
        { provide: getRepositoryToken(Role), useValue: roleRepo },
        { provide: getRepositoryToken(Permission), useValue: permissionRepo },
      ],
    }).compile();

    service = module.get(RolesService);
  });

  /* --- Auth helpers (existing) --- */

  describe('getPermissionsByRoleId', () => {
    it('maps DB rows to UserPermission objects', async () => {
      ds.query.mockResolvedValue([
        { module: 'billing', action: 'read' },
        { module: 'alerts', action: 'update' },
      ]);
      const result = await service.getPermissionsByRoleId('role-1');
      expect(result).toEqual([
        { module: 'billing', action: 'read' },
        { module: 'alerts', action: 'update' },
      ]);
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
      ds.query.mockResolvedValue([{ building_id: 'b-1' }, { building_id: 'b-2' }]);
      expect(await service.getUserBuildingIds('u-1')).toEqual(['b-1', 'b-2']);
    });
  });

  /* --- CRUD --- */

  describe('findAllForTenant', () => {
    it('returns roles ordered by name', async () => {
      roleRepo.find.mockResolvedValue([mockRole]);
      const result = await service.findAllForTenant(TENANT);
      expect(result).toEqual([mockRole]);
      expect(roleRepo.find).toHaveBeenCalledWith({
        where: { tenantId: TENANT },
        order: { name: 'ASC' },
        relations: ['permissions'],
      });
    });
  });

  describe('create', () => {
    it('creates role with defaults', async () => {
      roleRepo.findOneBy.mockResolvedValue(null);
      await service.create(TENANT, { name: 'New', slug: 'new_role' });
      expect(roleRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: TENANT, slug: 'new_role', maxSessionMinutes: 30 }),
      );
    });

    it('throws ConflictException when slug exists', async () => {
      roleRepo.findOneBy.mockResolvedValue(mockRole);
      await expect(service.create(TENANT, { name: 'Dup', slug: 'operator' })).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('returns null when not found', async () => {
      roleRepo.findOneBy.mockResolvedValue(null);
      expect(await service.update('x', TENANT, { name: 'y' })).toBeNull();
    });

    it('updates fields', async () => {
      roleRepo.findOneBy.mockResolvedValue({ ...mockRole });
      await service.update('r-1', TENANT, { name: 'Updated', maxSessionMinutes: 60 });
      expect(roleRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Updated', maxSessionMinutes: 60 }),
      );
    });
  });

  describe('remove', () => {
    it('deletes when no users assigned', async () => {
      ds.query.mockResolvedValue([{ count: '0' }]);
      expect(await service.remove('r-1', TENANT)).toBe(true);
    });

    it('throws ConflictException when users assigned', async () => {
      ds.query.mockResolvedValue([{ count: '3' }]);
      await expect(service.remove('r-1', TENANT)).rejects.toThrow(ConflictException);
    });
  });

  /* --- Permissions --- */

  describe('assignPermissions', () => {
    it('throws NotFoundException when role missing', async () => {
      roleRepo.findOneBy.mockResolvedValue(null);
      await expect(service.assignPermissions('x', TENANT, ['p-1'])).rejects.toThrow(NotFoundException);
    });

    it('deletes existing and inserts new permissions', async () => {
      roleRepo.findOneBy.mockResolvedValue(mockRole);
      roleRepo.findOne.mockResolvedValue({ ...mockRole, permissions: [{ id: 'p-1' }] });
      ds.query.mockResolvedValue([]); // DELETE + INSERT

      const result = await service.assignPermissions('r-1', TENANT, ['p-1', 'p-2']);

      expect(ds.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM role_permissions'),
        ['r-1'],
      );
      expect(ds.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO role_permissions'),
        ['r-1', 'p-1', 'p-2'],
      );
    });

    it('handles empty permission list', async () => {
      roleRepo.findOneBy.mockResolvedValue(mockRole);
      roleRepo.findOne.mockResolvedValue({ ...mockRole, permissions: [] });
      ds.query.mockResolvedValue([]);

      await service.assignPermissions('r-1', TENANT, []);

      // Only DELETE, no INSERT
      expect(ds.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('getAllPermissions', () => {
    it('returns permissions ordered', async () => {
      const perms = [{ id: 'p-1', module: 'alerts', action: 'read' }];
      permissionRepo.find.mockResolvedValue(perms);
      const result = await service.getAllPermissions();
      expect(result).toEqual(perms);
    });
  });
});
