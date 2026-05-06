import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { NotificationService } from '../alerts/notification.service';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { Role } from '../roles/entities/role.entity';

const TENANT_ID = 'tenant-1';
const CREATOR_ROLE_ID = 'r-creator';

const mockUser = (overrides: Partial<User> = {}): User => ({
  id: 'u-1',
  tenantId: TENANT_ID,
  email: 'test@example.com',
  displayName: 'Test User',
  authProvider: 'google',
  authProviderId: 'google-123',
  roleId: 'r-1',
  role: { id: 'r-1', name: 'Admin', slug: 'super_admin' } as any,
  isActive: true,
  mfaSecret: null,
  mfaEnabled: false,
  mfaRecoveryCodes: null,
  privacyAcceptedAt: null,
  privacyPolicyVersion: null,
  dataProcessingBlocked: false,
  blockReason: null,
  blockedAt: null,
  lastLoginAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  tenant: {} as any,
  ...overrides,
});

describe('UsersService', () => {
  let service: UsersService;
  let repo: Record<string, jest.Mock>;
  let roleRepo: Record<string, jest.Mock>;
  let ds: Record<string, jest.Mock>;
  let notifyUserCreated: jest.Mock;

  const mockCreatorRole = { id: CREATOR_ROLE_ID, tenantId: TENANT_ID, hierarchyLevel: 0, name: 'Super Admin' };
  const mockTargetRole = { id: 'r-1', tenantId: TENANT_ID, hierarchyLevel: 10, name: 'Corp Admin' };

  beforeEach(async () => {
    notifyUserCreated = jest.fn().mockResolvedValue(undefined);
    repo = {
      find: jest.fn(),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    roleRepo = {
      findOneBy: jest.fn().mockImplementation(({ id }: { id: string }) => {
        if (id === CREATOR_ROLE_ID) return Promise.resolve(mockCreatorRole);
        if (id === 'r-1') return Promise.resolve(mockTargetRole);
        return Promise.resolve(null);
      }),
    };
    ds = { query: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repo },
        { provide: getRepositoryToken(Role), useValue: roleRepo },
        { provide: DataSource, useValue: ds },
        {
          provide: NotificationService,
          useValue: { notifyUserCreated },
        },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  describe('findAll', () => {
    it('returns users for tenant', async () => {
      const users = [mockUser()];
      repo.find.mockResolvedValue(users);

      const result = await service.findAll(TENANT_ID);

      expect(repo.find).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID },
        relations: ['role'],
        order: { email: 'ASC' },
      });
      expect(result).toEqual(users);
    });
  });

  describe('findOne', () => {
    it('returns user when found', async () => {
      const user = mockUser();
      repo.findOne.mockResolvedValue(user);

      const result = await service.findOne('u-1', TENANT_ID);
      expect(result).toEqual(user);
    });

    it('returns null when not found', async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await service.findOne('missing', TENANT_ID);
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('creates user with tenant scoping', async () => {
      const user = mockUser();
      repo.create.mockReturnValue(user);
      repo.save.mockResolvedValue(user);
      repo.findOne.mockResolvedValue(user);

      const result = await service.create(TENANT_ID, {
        email: 'test@example.com',
        authProvider: 'google',
        authProviderId: 'google-123',
        roleId: 'r-1',
      }, CREATOR_ROLE_ID, 'super_admin');

      expect(repo.create).toHaveBeenCalledWith({
        tenantId: TENANT_ID,
        email: 'test@example.com',
        displayName: null,
        authProvider: 'google',
        authProviderId: 'google-123',
        roleId: 'r-1',
      });
      expect(notifyUserCreated).toHaveBeenCalledWith({
        tenantId: TENANT_ID,
        email: user.email,
        displayName: user.displayName,
        authProvider: 'google',
      });
      expect(result).toEqual(user);
    });

    it('assigns buildings when provided', async () => {
      const user = mockUser();
      repo.create.mockReturnValue(user);
      repo.save.mockResolvedValue(user);
      repo.findOne.mockResolvedValue(user);
      repo.findOneBy.mockResolvedValue(user);
      ds.query
        .mockResolvedValueOnce([{ count: 2 }])  // building ownership check
        .mockResolvedValueOnce([])               // DELETE
        .mockResolvedValueOnce([]);              // INSERT

      await service.create(TENANT_ID, {
        email: 'test@example.com',
        authProvider: 'google',
        authProviderId: 'google-123',
        roleId: 'r-1',
        buildingIds: ['b-1', 'b-2'],
      }, CREATOR_ROLE_ID, 'super_admin');

      expect(ds.query).toHaveBeenCalledTimes(3); // COUNT + DELETE + INSERT
    });

    it('rejects when creator tries to assign equal or higher role', async () => {
      roleRepo.findOneBy.mockImplementation(({ id }: { id: string }) => {
        if (id === CREATOR_ROLE_ID) return Promise.resolve({ ...mockCreatorRole, hierarchyLevel: 10 });
        if (id === 'r-1') return Promise.resolve({ ...mockTargetRole, hierarchyLevel: 10 });
        return Promise.resolve(null);
      });

      await expect(
        service.create(TENANT_ID, {
          email: 'hack@example.com',
          authProvider: 'google',
          authProviderId: 'google-hack',
          roleId: 'r-1',
        }, CREATOR_ROLE_ID, 'corp_admin'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects when target role not found', async () => {
      roleRepo.findOneBy.mockImplementation(({ id }: { id: string }) => {
        if (id === CREATOR_ROLE_ID) return Promise.resolve(mockCreatorRole);
        return Promise.resolve(null);
      });

      await expect(
        service.create(TENANT_ID, {
          email: 'test@example.com',
          authProvider: 'google',
          authProviderId: 'google-123',
          roleId: 'r-nonexistent',
        }, CREATOR_ROLE_ID, 'corp_admin'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('super_admin skips hierarchy check entirely', async () => {
      const user = mockUser();
      repo.create.mockReturnValue(user);
      repo.save.mockResolvedValue(user);
      repo.findOne.mockResolvedValue(user);

      // super_admin creating another super_admin — should be allowed
      await expect(
        service.create(TENANT_ID, {
          email: 'admin2@example.com',
          authProvider: 'google',
          authProviderId: 'google-admin2',
          roleId: CREATOR_ROLE_ID,
        }, CREATOR_ROLE_ID, 'super_admin'),
      ).resolves.toEqual(user);
    });
  });

  describe('update', () => {
    it('updates and returns user when found', async () => {
      const user = mockUser();
      repo.findOneBy.mockResolvedValue({ ...user });
      repo.save.mockImplementation((u) => Promise.resolve(u));
      repo.findOne.mockResolvedValue({ ...user, displayName: 'Nuevo' });

      const result = await service.update('u-1', TENANT_ID, { displayName: 'Nuevo' });

      expect(result?.displayName).toBe('Nuevo');
    });

    it('returns null when user not found', async () => {
      repo.findOneBy.mockResolvedValue(null);

      const result = await service.update('missing', TENANT_ID, { displayName: 'X' });
      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    it('returns true when deleted', async () => {
      repo.delete.mockResolvedValue({ affected: 1 });
      expect(await service.remove('u-1', TENANT_ID)).toBe(true);
    });

    it('returns false when not found', async () => {
      repo.delete.mockResolvedValue({ affected: 0 });
      expect(await service.remove('missing', TENANT_ID)).toBe(false);
    });
  });

  describe('getBuildingIds', () => {
    it('returns building IDs from user_building_access', async () => {
      ds.query.mockResolvedValue([{ building_id: 'b-1' }, { building_id: 'b-2' }]);

      const result = await service.getBuildingIds('u-1');

      expect(result).toEqual(['b-1', 'b-2']);
    });
  });

  describe('assignBuildings', () => {
    it('replaces building assignments when all belong to tenant', async () => {
      repo.findOneBy.mockResolvedValue(mockUser());
      ds.query
        .mockResolvedValueOnce([{ count: 2 }])  // ownership check
        .mockResolvedValueOnce([])               // DELETE
        .mockResolvedValueOnce([]);              // INSERT

      await service.assignBuildings('u-1', TENANT_ID, ['b-1', 'b-3']);

      expect(ds.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT'),
        [TENANT_ID, 'b-1', 'b-3'],
      );
      expect(ds.query).toHaveBeenCalledWith(
        `DELETE FROM user_building_access WHERE user_id = $1`,
        ['u-1'],
      );
    });

    it('rejects when buildings do not belong to tenant', async () => {
      repo.findOneBy.mockResolvedValue(mockUser());
      ds.query.mockResolvedValueOnce([{ count: 1 }]); // only 1 of 2 found

      await expect(
        service.assignBuildings('u-1', TENANT_ID, ['b-1', 'b-foreign']),
      ).rejects.toThrow(BadRequestException);
    });

    it('skips when user not found', async () => {
      repo.findOneBy.mockResolvedValue(null);

      await service.assignBuildings('missing', TENANT_ID, ['b-1']);

      expect(ds.query).not.toHaveBeenCalled();
    });
  });

  /* ------ Tenant isolation ------ */

  describe('tenant isolation', () => {
    const TENANT_A = 'tenant-a';
    const TENANT_B = 'tenant-b';

    it('findAll scopes to tenant — tenant B cannot see tenant A users', async () => {
      repo.find.mockResolvedValue([]);

      await service.findAll(TENANT_B);

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: TENANT_B } }),
      );
    });

    it('findOne enforces tenant — tenant B cannot access tenant A user', async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await service.findOne('u-a', TENANT_B);

      expect(repo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'u-a', tenantId: TENANT_B } }),
      );
      expect(result).toBeNull();
    });

    it('update enforces tenant — tenant B cannot update tenant A user', async () => {
      repo.findOneBy.mockResolvedValue(null);

      const result = await service.update('u-a', TENANT_B, { displayName: 'Hacked' });

      expect(repo.findOneBy).toHaveBeenCalledWith({ id: 'u-a', tenantId: TENANT_B });
      expect(result).toBeNull();
    });

    it('remove enforces tenant — tenant B cannot delete tenant A user', async () => {
      repo.delete.mockResolvedValue({ affected: 0 });

      const result = await service.remove('u-a', TENANT_B);

      expect(repo.delete).toHaveBeenCalledWith({ id: 'u-a', tenantId: TENANT_B });
      expect(result).toBe(false);
    });

    it('assignBuildings rejects foreign buildings', async () => {
      repo.findOneBy.mockResolvedValue(mockUser({ tenantId: TENANT_A }));
      ds.query.mockResolvedValueOnce([{ count: 0 }]); // no buildings match tenant

      await expect(
        service.assignBuildings('u-a', TENANT_A, ['building-of-b']),
      ).rejects.toThrow(BadRequestException);
    });

    it('enforceHierarchy rejects role from another tenant', async () => {
      roleRepo.findOneBy.mockImplementation(({ id, tenantId }: { id: string; tenantId?: string }) => {
        if (id === CREATOR_ROLE_ID) return Promise.resolve({ ...mockCreatorRole, hierarchyLevel: 10 });
        if (tenantId === TENANT_A) return Promise.resolve(null); // role not found in tenant A
        return Promise.resolve(null);
      });

      await expect(
        service.create(TENANT_A, {
          email: 'hack@example.com',
          authProvider: 'google',
          authProviderId: 'g-hack',
          roleId: 'role-from-tenant-b',
        }, CREATOR_ROLE_ID, 'corp_admin'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
