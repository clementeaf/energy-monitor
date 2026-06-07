import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { DataContractService } from './data-contract.service';
import { DataContract } from '../platform/entities/data-contract.entity';

describe('DataContractService', () => {
  let service: DataContractService;
  let repo: { createQueryBuilder: jest.Mock };

  beforeEach(async () => {
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({
        id: 'c-1',
        tenantId: null,
        name: 'readings-export',
        version: '1.0.0',
        schemaJson: { formats: ['csv', 'parquet'] },
        effectiveFrom: new Date(),
        createdAt: new Date(),
      }),
    };
    repo = { createQueryBuilder: jest.fn().mockReturnValue(qb) };

    const module = await Test.createTestingModule({
      providers: [
        DataContractService,
        { provide: getRepositoryToken(DataContract), useValue: repo },
      ],
    }).compile();

    service = module.get(DataContractService);
  });

  it('skips validation when header absent', async () => {
    await expect(
      service.validateExportContract({ tenantId: 't-1', headerValue: undefined }),
    ).resolves.toBeUndefined();
  });

  it('accepts valid contract and format', async () => {
    await expect(
      service.validateExportContract({
        tenantId: 't-1',
        headerValue: 'readings-export@1.0.0',
        exportFormat: 'csv',
      }),
    ).resolves.toBeUndefined();
  });

  it('rejects unknown contract', async () => {
    const qb = repo.createQueryBuilder();
    qb.getOne.mockResolvedValueOnce(null);

    await expect(
      service.validateExportContract({
        tenantId: 't-1',
        headerValue: 'unknown@9.9.9',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects disallowed export format', async () => {
    await expect(
      service.validateExportContract({
        tenantId: 't-1',
        headerValue: 'readings-export@1.0.0',
        exportFormat: 'xml',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
