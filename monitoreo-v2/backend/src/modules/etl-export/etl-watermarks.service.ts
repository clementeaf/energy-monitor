import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EtlWatermark } from '../platform/entities/etl-watermark.entity';

const DEFAULT_STREAM = 'readings';

@Injectable()
export class EtlWatermarksService {
  constructor(
    @InjectRepository(EtlWatermark)
    private readonly repo: Repository<EtlWatermark>,
  ) {}

  /**
   * Upserts the last export cursor for a consumer/tenant/stream.
   * @param consumerId - External consumer identifier (X-Consumer-Id)
   * @param tenantId - Tenant scope
   * @param lastCursor - Encoded cursor token
   * @param stream - Export stream name
   */
  async upsertCursor(
    consumerId: string,
    tenantId: string,
    lastCursor: string,
    stream: string = DEFAULT_STREAM,
  ): Promise<void> {
    await this.repo.upsert(
      {
        consumerId,
        tenantId,
        stream,
        lastCursor,
      },
      ['consumerId', 'tenantId', 'stream'],
    );
  }

  /**
   * Loads a stored watermark cursor when present.
   * @param consumerId - External consumer identifier
   * @param tenantId - Tenant scope
   * @param stream - Export stream name
   * @returns Last cursor or null
   */
  async getCursor(
    consumerId: string,
    tenantId: string,
    stream: string = DEFAULT_STREAM,
  ): Promise<string | null> {
    const row = await this.repo.findOneBy({ consumerId, tenantId, stream });
    return row?.lastCursor ?? null;
  }
}
