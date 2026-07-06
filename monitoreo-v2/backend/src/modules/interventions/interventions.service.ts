import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { createHash } from 'crypto';
import { Intervention } from './entities/intervention.entity';
import { CreateInterventionDto } from './dto/create-intervention.dto';

@Injectable()
export class InterventionsService {
  constructor(private readonly dataSource: DataSource) {}

  async findAll(tenantId: string, crossTenant = false): Promise<Intervention[]> {
    const where = crossTenant ? '' : 'WHERE tenant_id = $1';
    const params = crossTenant ? [] : [tenantId];
    return this.dataSource.query(
      `SELECT * FROM interventions ${where} ORDER BY created_at DESC LIMIT 200`,
      params,
    );
  }

  async create(dto: CreateInterventionDto, tenantId: string, userId: string): Promise<Intervention> {
    const hashInput = `${dto.meterId}|${dto.interventionType}|${dto.description}|${dto.result}|${userId}|${Date.now()}`;
    const integrityHash = createHash('sha256').update(hashInput).digest('hex').slice(0, 16);

    const [row] = await this.dataSource.query(
      `INSERT INTO interventions (tenant_id, meter_id, building_id, intervention_type, description, result, requires_cnr, integrity_hash, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [tenantId, dto.meterId, dto.buildingId, dto.interventionType, dto.description, dto.result, dto.requiresCnr ?? false, integrityHash, userId],
    );
    return row;
  }
}
