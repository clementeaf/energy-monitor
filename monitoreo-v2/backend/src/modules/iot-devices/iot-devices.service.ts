import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IotDevice } from '../platform/entities/iot-device.entity';
import { Meter } from '../platform/entities/meter.entity';

@Injectable()
export class IotDevicesService {
  constructor(
    @InjectRepository(IotDevice)
    private readonly repo: Repository<IotDevice>,
    @InjectRepository(Meter)
    private readonly meterRepo: Repository<Meter>,
  ) {}

  async findAll(): Promise<IotDevice[]> {
    return this.repo.find({
      relations: ['assignedMeter'],
      order: { lastSeen: 'DESC' },
    });
  }

  async findOne(id: string): Promise<IotDevice | null> {
    return this.repo.findOne({ where: { id }, relations: ['assignedMeter'] });
  }

  async assign(id: string, meterId: string): Promise<IotDevice | null> {
    const device = await this.repo.findOneBy({ id });
    if (!device) return null;

    const meter = await this.meterRepo.findOneBy({ id: meterId });
    if (!meter) return null;

    // Set iot_device_id on meter + assigned_meter_id on device
    meter.iotDeviceId = device.deviceClientId;
    await this.meterRepo.save(meter);

    device.assignedMeterId = meterId;
    return this.repo.save(device);
  }

  async unassign(id: string): Promise<IotDevice | null> {
    const device = await this.repo.findOneBy({ id });
    if (!device) return null;

    // Clear iot_device_id on meter
    if (device.assignedMeterId) {
      await this.meterRepo.update(device.assignedMeterId, { iotDeviceId: null });
    }

    device.assignedMeterId = null;
    return this.repo.save(device);
  }
}
