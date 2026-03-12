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
   * Lista edificios con conteo de medidores. Usa raw query para ser compatible
   * con BD sin migración 013 (columnas center_type, store_type, store_name).
   */
  async findAll(scope: AccessScope) {
    const scopedSiteIds = getScopedSiteIds(scope);
    const hasFilter = Array.isArray(scopedSiteIds) && scopedSiteIds.length > 0;
    const rows = await this.dataSource.query(
      `SELECT b.id, b.name, b.address, b.total_area,
              (SELECT COUNT(*)::int FROM meters m WHERE m.building_id = b.id) AS meters_count
       FROM buildings b
       ${hasFilter ? 'WHERE b.id = ANY($1)' : ''}
       ORDER BY b.id`,
      hasFilter ? [scopedSiteIds] : [],
    );
    return rows.map((r: { id: string; name: string; address: string; total_area: string; meters_count: number }) => ({
      id: r.id,
      name: r.name,
      address: r.address,
      centerType: null as string | null,
      totalArea: Number(r.total_area),
      metersCount: r.meters_count,
    }));
  }

  /**
   * Obtiene un edificio por id. Usa raw query para compatibilidad con BD sin migración 013.
   */
  async findOne(id: string, scope: AccessScope) {
    if (!hasSiteAccess(scope, id)) return null;

    const rows = await this.dataSource.query(
      `SELECT b.id, b.name, b.address, b.total_area,
              (SELECT COUNT(*)::int FROM meters m WHERE m.building_id = b.id) AS meters_count
       FROM buildings b WHERE b.id = $1`,
      [id],
    );
    const r = rows[0] as { id: string; name: string; address: string; total_area: string; meters_count: number } | undefined;
    if (!r) return null;
    return {
      id: r.id,
      name: r.name,
      address: r.address,
      centerType: null as string | null,
      totalArea: Number(r.total_area),
      metersCount: r.meters_count,
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
