import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class MapvxService {
  constructor(private readonly dataSource: DataSource) {}

  async getMalls() {
    const malls = await this.dataSource.query(`
      SELECT m.id, m.external_id, m.name, m.center_lat, m.center_lng, m.polygon_coords
      FROM mapvx_malls m
      ORDER BY m.name
    `);

    const floors = await this.dataSource.query(`
      SELECT f.mall_id, f.external_key, f.label, f.level, f.is_default, f.sort_order
      FROM mapvx_floors f
      ORDER BY f.sort_order
    `);

    const floorsByMall = new Map<string, typeof floors>();
    floors.forEach((f: { mall_id: string }) => {
      const list = floorsByMall.get(f.mall_id) ?? [];
      list.push(f);
      floorsByMall.set(f.mall_id, list);
    });

    return malls.map((m: Record<string, unknown>) => ({
      id: m.id,
      externalId: m.external_id,
      name: m.name,
      centerLat: Number(m.center_lat),
      centerLng: Number(m.center_lng),
      polygonCoords: m.polygon_coords,
      floors: (floorsByMall.get(m.id as string) ?? []).map((f: Record<string, unknown>) => ({
        externalKey: f.external_key,
        label: f.label,
        level: Number(f.level),
        isDefault: f.is_default,
      })),
    }));
  }

  async getStores(mallId: string) {
    const rows = await this.dataSource.query(
      `SELECT external_id, title, lat, lng, floor_key, category
       FROM mapvx_stores
       WHERE mall_id = $1
       ORDER BY title`,
      [mallId],
    );

    return rows.map((r: Record<string, unknown>) => ({
      id: r.external_id,
      title: r.title,
      lat: Number(r.lat),
      lng: Number(r.lng),
      floorKey: r.floor_key,
      category: r.category,
    }));
  }

  async getGeometry(mallId: string, floorKey: string, layer: string) {
    const rows = await this.dataSource.query(
      `SELECT geojson FROM mapvx_geometries
       WHERE mall_id = $1 AND floor_key = $2 AND layer = $3`,
      [mallId, floorKey, layer],
    );

    return rows[0]?.geojson ?? { type: 'FeatureCollection', features: [] };
  }

  async getTile(z: number, x: number, y: number): Promise<Buffer | null> {
    const rows = await this.dataSource.query(
      `SELECT data FROM mapvx_tiles WHERE z = $1 AND x = $2 AND y = $3`,
      [z, x, y],
    );
    return rows[0]?.data ?? null;
  }
}
