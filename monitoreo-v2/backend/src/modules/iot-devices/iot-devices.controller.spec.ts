import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { IotDevicesController } from './iot-devices.controller';
import { IotDevicesService } from './iot-devices.service';
import type { IotDevice } from '../platform/entities/iot-device.entity';

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

describe('IotDevicesController', () => {
  let controller: IotDevicesController;
  const service = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    assign: jest.fn(),
    unassign: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [IotDevicesController],
      providers: [{ provide: IotDevicesService, useValue: service }],
    }).compile();
    controller = module.get(IotDevicesController);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns all devices', async () => {
      const devices = [mockDevice()];
      service.findAll.mockResolvedValue(devices);
      expect(await controller.findAll()).toEqual(devices);
    });
  });

  describe('findOne', () => {
    it('returns device by id', async () => {
      const device = mockDevice();
      service.findOne.mockResolvedValue(device);
      expect(await controller.findOne('dev-1')).toEqual(device);
    });

    it('throws NotFoundException when not found', async () => {
      service.findOne.mockResolvedValue(null);
      await expect(controller.findOne('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('assign', () => {
    it('assigns device to meter', async () => {
      const device = mockDevice({ assignedMeterId: 'meter-1' });
      service.assign.mockResolvedValue(device);
      const result = await controller.assign('dev-1', { meterId: 'meter-1' } as any);
      expect(result.assignedMeterId).toBe('meter-1');
      expect(service.assign).toHaveBeenCalledWith('dev-1', 'meter-1');
    });

    it('throws NotFoundException when assign fails', async () => {
      service.assign.mockResolvedValue(null);
      await expect(controller.assign('dev-1', { meterId: 'bad' } as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('unassign', () => {
    it('unassigns device', async () => {
      const device = mockDevice();
      service.unassign.mockResolvedValue(device);
      expect(await controller.unassign('dev-1')).toEqual(device);
    });

    it('throws NotFoundException when not found', async () => {
      service.unassign.mockResolvedValue(null);
      await expect(controller.unassign('bad-id')).rejects.toThrow(NotFoundException);
    });
  });
});
