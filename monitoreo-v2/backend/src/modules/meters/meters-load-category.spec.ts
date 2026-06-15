import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MetersService } from './meters.service';
import { Meter } from '../platform/entities/meter.entity';

describe('MetersService — loadCategory filter', () => {
  let service: MetersService;
  let mockQb: Record<string, jest.Mock>;
  let repo: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockQb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };

    repo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQb),
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        MetersService,
        { provide: getRepositoryToken(Meter), useValue: repo },
      ],
    }).compile();

    service = module.get(MetersService);
  });

  it('adds loadCategory filter when provided', async () => {
    await service.findAll('t-1', [], undefined, false, undefined, 'clima');

    const andWhereCalls = mockQb.andWhere.mock.calls;
    const loadCategoryCall = andWhereCalls.find(
      (call: unknown[]) => (call[0] as string).includes('load_category'),
    );
    expect(loadCategoryCall).toBeTruthy();
    expect(loadCategoryCall![1]).toEqual({ filterLoadCategory: 'clima' });
  });

  it('does not add loadCategory filter when undefined', async () => {
    await service.findAll('t-1', [], undefined, false, undefined, undefined);

    const andWhereCalls = mockQb.andWhere.mock.calls;
    const loadCategoryCall = andWhereCalls.find(
      (call: unknown[]) => (call[0] as string).includes('load_category'),
    );
    expect(loadCategoryCall).toBeUndefined();
  });

  it('combines buildingId and loadCategory filters', async () => {
    await service.findAll('t-1', [], 'b-1', false, undefined, 'iluminacion');

    const andWhereCalls = mockQb.andWhere.mock.calls;
    const buildingCall = andWhereCalls.find(
      (call: unknown[]) => (call[0] as string).includes('building_id'),
    );
    const loadCall = andWhereCalls.find(
      (call: unknown[]) => (call[0] as string).includes('load_category'),
    );
    expect(buildingCall).toBeTruthy();
    expect(loadCall).toBeTruthy();
  });
});
