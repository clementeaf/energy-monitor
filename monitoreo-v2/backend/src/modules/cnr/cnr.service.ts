import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CnrRecord } from './entities/cnr-record.entity';
import { CreateCnrDto } from './dto/create-cnr.dto';
import { UpdateCnrStatusDto } from './dto/update-cnr-status.dto';

@Injectable()
export class CnrService {
  constructor(private readonly dataSource: DataSource) {}

  async findAll(tenantId: string, crossTenant = false): Promise<CnrRecord[]> {
    const where = crossTenant ? '' : 'WHERE tenant_id = $1';
    const params = crossTenant ? [] : [tenantId];
    const rows = await this.dataSource.query(
      `SELECT * FROM cnr_records ${where} ORDER BY created_at DESC LIMIT 200`,
      params,
    );
    return rows;
  }

  async create(dto: CreateCnrDto, tenantId: string, userId: string): Promise<CnrRecord> {
    const [row] = await this.dataSource.query(
      `INSERT INTO cnr_records (tenant_id, meter_id, building_id, period_start, period_end, value_kwh, motivo, justification, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9)
       RETURNING *`,
      [tenantId, dto.meterId, dto.buildingId, dto.periodStart, dto.periodEnd, dto.valueKwh ?? null, dto.motivo, dto.justification, userId],
    );
    return row;
  }

  async updateStatus(id: string, dto: UpdateCnrStatusDto, userId: string): Promise<CnrRecord> {
    const [row] = await this.dataSource.query(
      `UPDATE cnr_records SET status = $1, reviewed_by = $2, reviewed_at = NOW() WHERE id = $3 RETURNING *`,
      [dto.status, userId, id],
    );
    if (!row) throw new NotFoundException(`CNR record ${id} not found`);
    return row;
  }
}
