import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { Tenant } from './entities/tenant.entity';

const mockTenant: Tenant = {
  id: 't-1',
  name: 'Globe Power',
  slug: 'globe-power',
  isActive: true,
  primaryColor: '#3D3BF3',
  secondaryColor: '#1E1E2F',
  logoUrl: null,
  faviconUrl: null,
  timezone: 'America/Santiago',
  createdAt: new Date(),
  updatedAt: new Date(),
  users: [],
};

describe('TenantsService', () => {
  let service: TenantsService;
  let repo: Record<string, jest.Mock>;

  beforeEach(async () => {
    repo = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        TenantsService,
        { provide: getRepositoryToken(Tenant), useValue: repo },
      ],
    }).compile();

    service = module.get(TenantsService);
  });

  describe('findAll', () => {
    it('returns active tenants', async () => {
      repo.find.mockResolvedValue([mockTenant]);
      const result = await service.findAll();
      expect(result).toEqual([mockTenant]);
      expect(repo.find).toHaveBeenCalledWith({ where: { isActive: true } });
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
    it('returns theme fields', async () => {
      repo.findOne.mockResolvedValue(mockTenant);
      const theme = await service.getTheme('t-1');
      expect(theme).toEqual({
        primaryColor: '#3D3BF3',
        secondaryColor: '#1E1E2F',
        logoUrl: null,
        faviconUrl: null,
      });
    });
  });
});
