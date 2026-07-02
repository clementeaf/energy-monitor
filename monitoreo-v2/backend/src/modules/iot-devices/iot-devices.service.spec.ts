import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IotDevicesService } from './iot-devices.service';
import { IotDevice } from '../platform/entities/iot-device.entity';
import { Meter } from '../platform/entities/meter.entity';

const mockDevice = (overrides: Partial<IotDevice> = {}): IotDevice => ({
  id: 'dev-1',
  deviceClientId: 'thing-001',
  firstSeen: new Date(),
  lastSeen: new Date(),
  assignedMeterId: null,
  assignedMeter: null,
  payloadSample: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
} as IotDevice);

const mockMeter = (overrides: Partial<Meter> = {}): Meter => ({
  id: 'meter-1',
  tenantId: 'tenant-1',
  buildingId: 'building-1',
  name: 'Test Meter',
  code: 'TM-001',
  meterType: 'electrical',
  isActive: true,
  metadata: {},
  iotDeviceId: null,
  ...overrides,
} as Meter);

describe('IotDevicesService', () => {
  let service: IotDevicesService;
  const deviceRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    save: jest.fn(),
  };
  const meterRepo = {
    findOneBy: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        IotDevicesService,
        { provide: getRepositoryToken(IotDevice), useValue: deviceRepo },
        { provide: getRepositoryToken(Meter), useValue: meterRepo },
      ],
    }).compile();
    service = module.get(IotDevicesService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns devices ordered by lastSeen', async () => {
      const devices = [mockDevice()];
      deviceRepo.find.mockResolvedValue(devices);
      const result = await service.findAll();
      expect(result).toEqual(devices);
      expect(deviceRepo.find).toHaveBeenCalledWith({
        relations: ['assignedMeter'],
        order: { lastSeen: 'DESC' },
      });
    });
  });

  describe('assign', () => {
    it('links device to meter and sets iotDeviceId', async () => {
      const device = mockDevice();
      const meter = mockMeter();
      deviceRepo.findOneBy.mockResolvedValue(device);
      meterRepo.findOneBy.mockResolvedValue(meter);
      deviceRepo.save.mockImplementation((d) => Promise.resolve(d));
      meterRepo.save.mockImplementation((m) => Promise.resolve(m));

      const result = await service.assign('dev-1', 'meter-1');

      expect(meterRepo.save).toHaveBeenCalledWith(expect.objectContaining({ iotDeviceId: 'thing-001' }));
      expect(result!.assignedMeterId).toBe('meter-1');
    });

    it('returns null when device not found', async () => {
      deviceRepo.findOneBy.mockResolvedValue(null);
      expect(await service.assign('bad-id', 'meter-1')).toBeNull();
    });

    it('returns null when meter not found', async () => {
      deviceRepo.findOneBy.mockResolvedValue(mockDevice());
      meterRepo.findOneBy.mockResolvedValue(null);
      expect(await service.assign('dev-1', 'bad-meter')).toBeNull();
    });
  });

  describe('unassign', () => {
    it('clears meter iotDeviceId and device assignedMeterId', async () => {
      const device = mockDevice({ assignedMeterId: 'meter-1' });
      deviceRepo.findOneBy.mockResolvedValue(device);
      deviceRepo.save.mockImplementation((d) => Promise.resolve(d));
      meterRepo.update.mockResolvedValue({ affected: 1 });

      const result = await service.unassign('dev-1');

      expect(meterRepo.update).toHaveBeenCalledWith('meter-1', { iotDeviceId: null });
      expect(result!.assignedMeterId).toBeNull();
    });

    it('returns null when device not found', async () => {
      deviceRepo.findOneBy.mockResolvedValue(null);
      expect(await service.unassign('bad-id')).toBeNull();
    });
  });
});
