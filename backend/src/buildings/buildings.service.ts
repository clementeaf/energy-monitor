import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Building } from './building.entity';
import { MetersService } from '../meters/meters.service';
import { getScopedSiteIds, hasSiteAccess, type AccessScope } from '../auth/access-scope';

@Injectable()
export class BuildingsService {
  constructor(
    @InjectRepository(Building)
    private readonly buildingRepo: Repository<Building>,
    private readonly metersService: MetersService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Lista edificios con conteo de medidores. Incluye center_type si existe (migración 013).
   */
  async findAll(scope: AccessScope) {
    const scopedSiteIds = getScopedSiteIds(scope);
    const hasFilter = Array.isArray(scopedSiteIds) && scopedSiteIds.length > 0;
    const withCenterType = `SELECT b.id, b.name, b.address, b.center_type, b.total_area,
              (SELECT COUNT(*)::int FROM meters m WHERE m.building_id = b.id) AS meters_count
       FROM buildings b
       ${hasFilter ? 'WHERE b.id = ANY($1)' : ''}
       ORDER BY b.id`;
    const withoutCenterType = `SELECT b.id, b.name, b.address, b.total_area,
              (SELECT COUNT(*)::int FROM meters m WHERE m.building_id = b.id) AS meters_count
       FROM buildings b
       ${hasFilter ? 'WHERE b.id = ANY($1)' : ''}
       ORDER BY b.id`;
    const params = hasFilter ? [scopedSiteIds] : [];
    let rows: Array<Record<string, unknown>>;
    try {
      rows = await this.dataSource.query(withCenterType, params);
    } catch {
      rows = await this.dataSource.query(withoutCenterType, params);
    }
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      address: r.address,
      centerType: (r.center_type as string) ?? null,
      totalArea: Number(r.total_area),
      metersCount: Number(r.meters_count),
    }));
  }

  /**
   * Obtiene un edificio por id. Incluye center_type si existe (migración 013).
   */
  async findOne(id: string, scope: AccessScope) {
    if (!hasSiteAccess(scope, id)) return null;

    let rows: Array<Record<string, unknown>>;
    try {
      rows = await this.dataSource.query(
        `SELECT b.id, b.name, b.address, b.center_type, b.total_area,
                (SELECT COUNT(*)::int FROM meters m WHERE m.building_id = b.id) AS meters_count
         FROM buildings b WHERE b.id = $1`,
        [id],
      );
    } catch {
      rows = await this.dataSource.query(
        `SELECT b.id, b.name, b.address, b.total_area,
                (SELECT COUNT(*)::int FROM meters m WHERE m.building_id = b.id) AS meters_count
         FROM buildings b WHERE b.id = $1`,
        [id],
      );
    }
    const r = rows[0];
    if (!r) return null;
    return {
      id: r.id,
      name: r.name,
      address: r.address,
      centerType: (r.center_type as string) ?? null,
      totalArea: Number(r.total_area),
      metersCount: Number(r.meters_count),
    };
  }

  async findMeters(buildingId: string, scope: AccessScope) {
    if (!hasSiteAccess(scope, buildingId)) return null;

    return this.metersService.findByBuilding(buildingId, scope);
  }

  async findConsumption(
    buildingId: string,
    scope: AccessScope,
    resolution: '15min' | 'hourly' | 'daily' = 'hourly',
    from?: string,
    to?: string,
  ) {
    if (!hasSiteAccess(scope, buildingId)) return null;

    return this.metersService.findBuildingConsumption(buildingId, scope, resolution, from, to);
  }
}
