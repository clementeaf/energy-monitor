import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlertRule } from '../platform/entities/alert-rule.entity';
import { CreateAlertRuleDto } from './dto/create-alert-rule.dto';
import { UpdateAlertRuleDto } from './dto/update-alert-rule.dto';

@Injectable()
export class AlertRulesService {
  constructor(
    @InjectRepository(AlertRule)
    private readonly repo: Repository<AlertRule>,
  ) {}

  async findAll(
    tenantId: string,
    buildingIds: string[],
    filterBuildingId?: string,
  ): Promise<AlertRule[]> {
    const qb = this.repo
      .createQueryBuilder('r')
      .where('r.tenant_id = :tenantId', { tenantId })
      .orderBy('r.created_at', 'DESC');

    if (buildingIds.length > 0) {
      qb.andWhere(
        '(r.building_id IN (:...buildingIds) OR r.building_id IS NULL)',
        { buildingIds },
      );
    }

    if (filterBuildingId) {
      qb.andWhere('r.building_id = :filterBuildingId', { filterBuildingId });
    }

    return qb.getMany();
  }

  async findOne(
    id: string,
    tenantId: string,
    buildingIds: string[],
  ): Promise<AlertRule | null> {
    const qb = this.repo
      .createQueryBuilder('r')
      .where('r.id = :id', { id })
      .andWhere('r.tenant_id = :tenantId', { tenantId });

    if (buildingIds.length > 0) {
      qb.andWhere(
        '(r.building_id IN (:...buildingIds) OR r.building_id IS NULL)',
        { buildingIds },
      );
    }

    return qb.getOne();
  }

  async create(
    tenantId: string,
    dto: CreateAlertRuleDto,
    createdBy?: string,
  ): Promise<AlertRule> {
    const rule = this.repo.create({
      tenantId,
      alertTypeCode: dto.alertTypeCode,
      name: dto.name,
      description: dto.description ?? null,
      severity: dto.severity as AlertRule['severity'],
      buildingId: dto.buildingId ?? null,
      isActive: dto.isActive ?? true,
      checkIntervalSeconds: dto.checkIntervalSeconds ?? 900,
      config: dto.config ?? {},
      escalationL1Minutes: dto.escalationL1Minutes ?? 0,
      escalationL2Minutes: dto.escalationL2Minutes ?? 60,
      escalationL3Minutes: dto.escalationL3Minutes ?? 1440,
      notifyEmail: dto.notifyEmail ?? true,
      notifyPush: dto.notifyPush ?? false,
      notifyWhatsapp: dto.notifyWhatsapp ?? false,
      notifySms: dto.notifySms ?? false,
      createdBy: createdBy ?? null,
    });
    return this.repo.save(rule);
  }

  async update(
    id: string,
    tenantId: string,
    dto: UpdateAlertRuleDto,
  ): Promise<AlertRule | null> {
    const rule = await this.repo.findOneBy({ id, tenantId });
    if (!rule) return null;

    if (dto.name !== undefined) rule.name = dto.name;
    if (dto.description !== undefined) rule.description = dto.description ?? null;
    if (dto.severity !== undefined) rule.severity = dto.severity as AlertRule['severity'];
    if (dto.isActive !== undefined) rule.isActive = dto.isActive;
    if (dto.checkIntervalSeconds !== undefined) rule.checkIntervalSeconds = dto.checkIntervalSeconds;
    if (dto.config !== undefined) rule.config = dto.config ?? {};
    if (dto.escalationL1Minutes !== undefined) rule.escalationL1Minutes = dto.escalationL1Minutes;
    if (dto.escalationL2Minutes !== undefined) rule.escalationL2Minutes = dto.escalationL2Minutes;
    if (dto.escalationL3Minutes !== undefined) rule.escalationL3Minutes = dto.escalationL3Minutes;
    if (dto.notifyEmail !== undefined) rule.notifyEmail = dto.notifyEmail;
    if (dto.notifyPush !== undefined) rule.notifyPush = dto.notifyPush;
    if (dto.notifyWhatsapp !== undefined) rule.notifyWhatsapp = dto.notifyWhatsapp;
    if (dto.notifySms !== undefined) rule.notifySms = dto.notifySms;

    return this.repo.save(rule);
  }

  async remove(id: string, tenantId: string): Promise<boolean> {
    const result = await this.repo.delete({ id, tenantId });
    return (result.affected ?? 0) > 0;
  }
}
