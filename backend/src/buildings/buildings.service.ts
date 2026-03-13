import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Building } from './building.entity';
import { MetersService } from '../meters/meters.service';
import { getScopedSiteIds, hasSiteAccess, type AccessScope } from '../auth/access-scope';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

@Injectable()
export class BuildingsService {
  constructor(
    @InjectRepository(Building)
    private readonly buildingRepo: Repository<Building>,
    private readonly metersService: MetersService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Lista edificios. Prioriza centros en staging_centers si la tabla tiene datos;
   * si no, usa tabla buildings (con center_type si existe migración 013).
   */
  async findAll(scope: AccessScope) {
    const fromStaging = await this.findAllFromStaging(scope);
    if (fromStaging.length > 0) return fromStaging;

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

  /** Centros desde tabla de resumen staging_centers (pocas filas). Respeta scope por siteIds. */
  private async findAllFromStaging(scope: AccessScope): Promise<Array<{ id: string; name: string; address: string; centerType: string | null; totalArea: number; metersCount: number }>> {
    try {
      const scopedSiteIds = getScopedSiteIds(scope);
      const hasFilter = Array.isArray(scopedSiteIds) && scopedSiteIds.length > 0;
      const rows = await this.dataSource.query<Array<{ id: string; center_name: string; center_type: string; meters_count: number }>>(
        hasFilter
          ? `SELECT id, center_name, center_type, meters_count FROM staging_centers WHERE id = ANY($1) ORDER BY center_name`
          : `SELECT id, center_name, center_type, meters_count FROM staging_centers ORDER BY center_name`,
        hasFilter ? [scopedSiteIds] : [],
      );
      return rows.map((r) => ({
        id: r.id,
        name: r.center_name,
        address: '',
        centerType: r.center_type ?? null,
        totalArea: 0,
        metersCount: Number(r.meters_count),
      }));
    } catch {
      return [];
    }
  }

  /**
   * Obtiene un edificio por id. Busca primero en staging_centers; si no existe, en buildings.
   */
  async findOne(id: string, scope: AccessScope) {
    const fromStaging = await this.findOneFromStaging(id);
    if (fromStaging) {
      if (!hasSiteAccess(scope, id)) return null;
      return fromStaging;
    }
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

  /** Un centro por id desde staging_centers. */
  private async findOneFromStaging(
    id: string,
  ): Promise<{ id: string; name: string; address: string; centerType: string | null; totalArea: number; metersCount: number } | null> {
    try {
      const rows = await this.dataSource.query<Array<{ id: string; center_name: string; center_type: string; meters_count: number }>>(
        `SELECT id, center_name, center_type, meters_count FROM staging_centers WHERE id = $1`,
        [id],
      );
      const r = rows[0];
      if (!r) return null;
      return {
        id: r.id,
        name: r.center_name,
        address: '',
        centerType: r.center_type ?? null,
        totalArea: 0,
        metersCount: Number(r.meters_count),
      };
    } catch {
      return null;
    }
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
  ): Promise<Array<{ timestamp: string | Date; totalPowerKw: number; avgPowerKw: number; peakPowerKw: number }>> {
    if (!hasSiteAccess(scope, buildingId)) return [];

    return this.metersService.findBuildingConsumption(buildingId, scope, resolution, from, to);
  }
}
