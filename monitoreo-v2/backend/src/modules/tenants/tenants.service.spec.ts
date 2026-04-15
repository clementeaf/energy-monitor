import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { Tenant } from './entities/tenant.entity';

const mockTenant: Tenant = {
  id: 't-1',
  name: 'Globe Power',
  slug: 'globe-power',
  isActive: true,
  primaryColor: '#3D3BF3',
  secondaryColor: '#1E1E2F',
  sidebarColor: '#1E1E2F',
  accentColor: '#10B981',
  appTitle: 'Energy Monitor',
  logoUrl: null,
  faviconUrl: null,
  settings: {},
  timezone: 'America/Santiago',
  createdAt: new Date(),
  updatedAt: new Date(),
  users: [],
};

describe('TenantsService', () => {
  let service: TenantsService;
  let repo: Record<string, jest.Mock>;
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    repo = {
      find: jest.fn(),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      create: jest.fn((data) => ({ ...data })),
      save: jest.fn((entity) => Promise.resolve({ ...entity, id: entity.id ?? 'new-id' })),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    dataSource = {
      transaction: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        TenantsService,
        { provide: getRepositoryToken(Tenant), useValue: repo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(TenantsService);
  });

  /* ------ Read ------ */

  describe('findAll', () => {
    it('returns active tenants ordered by name', async () => {
      repo.find.mockResolvedValue([mockTenant]);
      const result = await service.findAll();
      expect(result).toEqual([mockTenant]);
      expect(repo.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { name: 'ASC' },
      });
    });
  });

  describe('findById', () => {
    it('returns tenant when found', async () => {
      repo.findOne.mockResolvedValue(mockTenant);
      expect(await service.findById('t-1')).toEqual(mockTenant);
    });

    it('throws NotFoundException when not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findById('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findBySlug', () => {
    it('returns tenant when found', async () => {
      repo.findOne.mockResolvedValue(mockTenant);
      expect(await service.findBySlug('globe-power')).toEqual(mockTenant);
    });

    it('throws NotFoundException when not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findBySlug('nope')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTheme', () => {
    it('returns all theme fields including new ones', async () => {
      repo.findOne.mockResolvedValue(mockTenant);
      const theme = await service.getTheme('t-1');
      expect(theme).toEqual({
        primaryColor: '#3D3BF3',
        secondaryColor: '#1E1E2F',
        sidebarColor: '#1E1E2F',
        accentColor: '#10B981',
        appTitle: 'Energy Monitor',
        logoUrl: null,
        faviconUrl: null,
      });
    });
  });

  /* ------ Update ------ */

  describe('update', () => {
    it('returns null when not found', async () => {
      repo.findOneBy.mockResolvedValue(null);
      const result = await service.update('missing', { name: 'x' });
      expect(result).toBeNull();
    });

    it('updates specified fields only', async () => {
      repo.findOneBy.mockResolvedValue({ ...mockTenant });
      await service.update('t-1', { name: 'New Name', primaryColor: '#FF0000' });
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Name', primaryColor: '#FF0000' }),
      );
    });

    it('preserves unchanged fields', async () => {
      repo.findOneBy.mockResolvedValue({ ...mockTenant });
      await service.update('t-1', { appTitle: 'Custom Title' });
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Globe Power',
          primaryColor: '#3D3BF3',
          appTitle: 'Custom Title',
        }),
      );
    });

    it('can update isActive', async () => {
      repo.findOneBy.mockResolvedValue({ ...mockTenant });
      await service.update('t-1', { isActive: false });
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });

    it('can update settings', async () => {
      repo.findOneBy.mockResolvedValue({ ...mockTenant });
      await service.update('t-1', { settings: { locale: 'es-CL' } });
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ settings: { locale: 'es-CL' } }),
      );
    });
  });

  /* ------ Deactivate ------ */

  describe('deactivate', () => {
    it('returns true when deactivated', async () => {
      const result = await service.deactivate('t-1');
      expect(result).toBe(true);
      expect(repo.update).toHaveBeenCalledWith('t-1', { isActive: false });
    });

    it('returns false when not found', async () => {
      repo.update.mockResolvedValue({ affected: 0 });
      const result = await service.deactivate('missing');
      expect(result).toBe(false);
    });
  });

  /* ------ Onboard ------ */

  describe('onboard', () => {
    it('throws ConflictException when slug exists', async () => {
      repo.findOneBy.mockResolvedValue(mockTenant);
      await expect(
        service.onboard({
          name: 'Globe Power',
          slug: 'globe-power',
          adminEmail: 'admin@test.com',
          adminAuthProvider: 'google',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('auto-generates slug from name', async () => {
      repo.findOneBy.mockResolvedValue(null);

      const mockManager = {
        create: jest.fn().mockReturnValue({ id: 'new-t' }),
        save: jest.fn().mockResolvedValue({ id: 'new-t', name: 'Acme Corp', slug: 'acme-corp' }),
        query: jest.fn()
          // cloneRoles: get template tenant
          .mockResolvedValueOnce([{ id: 't-1' }])
          // cloneRoles: clone roles
          .mockResolvedValueOnce([{ id: 'r-new', slug: 'super_admin' }])
          // cloneRoles: get template roles
          .mockResolvedValueOnce([{ id: 'r-old', slug: 'super_admin' }])
          // cloneRoles: clone permissions for super_admin
          .mockResolvedValueOnce([])
          // get super_admin role
          .mockResolvedValueOnce([{ id: 'r-new' }])
          // create admin user
          .mockResolvedValueOnce([{ id: 'u-new' }]),
      };

      dataSource.transaction.mockImplementation(async (fn: (m: unknown) => Promise<unknown>) => fn(mockManager));

      const result = await service.onboard({
        name: 'Acme Corp',
        adminEmail: 'admin@acme.com',
        adminAuthProvider: 'microsoft',
      });

      expect(result.tenant.slug).toBe('acme-corp');
      expect(result.adminUserId).toBe('u-new');
      expect(result.rolesCreated).toBe(1);
    });

    it('creates tenant with custom theme', async () => {
      repo.findOneBy.mockResolvedValue(null);

      const mockManager = {
        create: jest.fn().mockReturnValue({ id: 'new-t' }),
        save: jest.fn().mockResolvedValue({ id: 'new-t', primaryColor: '#FF0000' }),
        query: jest.fn()
          .mockResolvedValueOnce([{ id: 't-1' }])
          .mockResolvedValueOnce([{ id: 'r-new', slug: 'super_admin' }])
          .mockResolvedValueOnce([{ id: 'r-old', slug: 'super_admin' }])
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([{ id: 'r-new' }])
          .mockResolvedValueOnce([{ id: 'u-new' }]),
      };

      dataSource.transaction.mockImplementation(async (fn: (m: unknown) => Promise<unknown>) => fn(mockManager));

      await service.onboard({
        name: 'Red Corp',
        slug: 'red-corp',
        primaryColor: '#FF0000',
        appTitle: 'Red Platform',
        adminEmail: 'admin@red.com',
        adminAuthProvider: 'google',
      });

      expect(mockManager.create).toHaveBeenCalledWith(
        Tenant,
        expect.objectContaining({
          primaryColor: '#FF0000',
          appTitle: 'Red Platform',
        }),
      );
    });
  });
});
