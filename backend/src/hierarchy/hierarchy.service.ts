import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { HierarchyNode } from './hierarchy-node.entity';
import { Meter } from '../meters/meter.entity';
import { hasSiteAccess, type AccessScope } from '../auth/access-scope';
import { useStaging, STAGING_LIMITS } from '../readings-source.config';

@Injectable()
export class HierarchyService {
  constructor(
    @InjectRepository(HierarchyNode)
    private readonly nodeRepo: Repository<HierarchyNode>,
    @InjectRepository(Meter)
    private readonly meterRepo: Repository<Meter>,
    private readonly dataSource: DataSource,
  ) {}

  /** Get all nodes for a building (flat array, frontend builds tree) */
  async findTree(buildingId: string, scope: AccessScope) {
    if (!hasSiteAccess(scope, buildingId)) return null;

    return this.nodeRepo.find({
      where: { buildingId },
      order: { level: 'ASC', sortOrder: 'ASC' },
    });
  }

  /** Get a single node with its ancestor path. Resolves B-{BUILDING_ID} to root node by building_id when id differs (e.g. frontend sends B-PARQUE-ARAUCO-KENNEDY, DB has B-parque-arauco-ken). */
  async findNode(nodeId: string, scope: AccessScope) {
    let rows = await this.dataSource.query(
      `WITH RECURSIVE ancestors AS (
        SELECT * FROM hierarchy_nodes WHERE id = $1
        UNION ALL
        SELECT h.* FROM hierarchy_nodes h
        INNER JOIN ancestors a ON a.parent_id = h.id
      )
      SELECT * FROM ancestors ORDER BY level ASC`,
      [nodeId],
    );

    if (rows.length === 0 && nodeId.startsWith('B-')) {
      const buildingIdSlug = nodeId.slice(2).toLowerCase();
      const rootRows = await this.dataSource.query(
        `SELECT * FROM hierarchy_nodes WHERE LOWER(TRIM(building_id)) = $1 AND parent_id IS NULL`,
        [buildingIdSlug],
      );
      if (rootRows.length > 0) rows = rootRows;
    }

    if (rows.length === 0) return null;
    if (!hasSiteAccess(scope, rows[0].building_id as string)) return null;

    const mapped = rows.map((r: Record<string, unknown>) => this.mapRow(r));
    return {
      node: mapped[mapped.length - 1],
      path: mapped,
    };
  }

  /** Get direct children of a node with aggregated consumption */
  async findChildrenWithConsumption(nodeId: string, scope: AccessScope, from?: string, to?: string) {
    const nodeResult = await this.findNode(nodeId, scope);
    if (!nodeResult) return null;

    const resolvedId = nodeResult.node.id;
    const children = await this.nodeRepo.find({
      where: { parentId: resolvedId },
      order: { sortOrder: 'ASC' },
    });

    if (children.length === 0) return [];

    const results = await Promise.all(
      children.map(async (child) => {
        const summary = await this.getSubtreeConsumption(child.id, from, to);
        const meterCount = await this.getSubtreeMeterCount(child.id);
        const status = await this.getSubtreeStatus(child.id);
        const readingsInRange =
          from && to ? await this.getSubtreeReadingsCount(child.id, from, to) : 0;
        return { ...child, ...summary, meterCount, status, readingsInRange };
      }),
    );

    return results;
  }

  /** Time-series consumption for a node (aggregates all meters in subtree) */
  async findNodeConsumption(
    nodeId: string,
    scope: AccessScope,
    resolution: 'hourly' | 'daily' = 'hourly',
    from?: string,
    to?: string,
  ) {
    const nodeResult = await this.findNode(nodeId, scope);
    if (!nodeResult) return null;

    const resolvedId = nodeResult.node.id;

    if (useStaging()) {
      if (!from || !to) return null;
      const maxRangeMs = STAGING_LIMITS.maxRangeDays * 24 * 60 * 60 * 1000;
      if (new Date(to).getTime() - new Date(from).getTime() > maxRangeMs) return null;
      return this.findNodeConsumptionFromStaging(resolvedId, resolution, from, to);
    }

    const trunc = resolution === 'daily' ? 'day' : 'hour';

    let query = `
      WITH RECURSIVE subtree AS (
        SELECT id, meter_id FROM hierarchy_nodes WHERE id = $1
        UNION ALL
        SELECT h.id, h.meter_id FROM hierarchy_nodes h
        INNER JOIN subtree s ON h.parent_id = s.id
      )
      SELECT
        date_trunc('${trunc}', r.timestamp) as timestamp,
        SUM(r.power_kw) as "totalPowerKw",
        AVG(r.power_kw) as "avgPowerKw",
        MAX(r.power_kw) as "peakPowerKw"
      FROM readings r
      INNER JOIN subtree s ON s.meter_id = r.meter_id
      WHERE s.meter_id IS NOT NULL`;

    const params: (string | undefined)[] = [resolvedId];
    let paramIdx = 2;

    if (from) {
      query += ` AND r.timestamp >= $${paramIdx}`;
      params.push(from);
      paramIdx++;
    }
    if (to) {
      query += ` AND r.timestamp <= $${paramIdx}`;
      params.push(to);
      paramIdx++;
    }

    query += ` GROUP BY 1 ORDER BY 1 ASC`;

    const rows = await this.dataSource.query(query, params);
    const num = (rec: Record<string, unknown>, k: string): number =>
      Number(Number(rec?.[k] ?? rec?.[k.toLowerCase()] ?? 0).toFixed(3));
    return rows.map((r: Record<string, unknown>) => ({
      timestamp: r.timestamp,
      totalPowerKw: num(r, 'totalPowerKw'),
      avgPowerKw: num(r, 'avgPowerKw'),
      peakPowerKw: num(r, 'peakPowerKw'),
    }));
  }

  private async findNodeConsumptionFromStaging(
    nodeId: string,
    resolution: 'hourly' | 'daily',
    from: string,
    to: string,
  ): Promise<Array<{ timestamp: string; totalPowerKw: number; avgPowerKw: number; peakPowerKw: number }>> {
    const trunc = resolution === 'daily' ? 'day' : 'hour';
    const cap = STAGING_LIMITS.defaultMaxRows * 2;
    const rows = await this.dataSource.query(
      `WITH RECURSIVE subtree AS (
         SELECT id, meter_id FROM hierarchy_nodes WHERE id = $1
         UNION ALL
         SELECT h.id, h.meter_id FROM hierarchy_nodes h
         INNER JOIN subtree s ON h.parent_id = s.id
       ),
       capped AS (
         SELECT r.timestamp, r.power_kw
         FROM readings_import_staging r
         INNER JOIN subtree s ON s.meter_id = r.meter_id
         WHERE s.meter_id IS NOT NULL AND r.timestamp >= $2 AND r.timestamp <= $3
         ORDER BY r.timestamp ASC
         LIMIT $4
       )
       SELECT
         date_trunc('${trunc}', r.timestamp) AS "timestamp",
         SUM(r.power_kw)::double precision AS "totalPowerKw",
         AVG(r.power_kw)::double precision AS "avgPowerKw",
         MAX(r.power_kw)::double precision AS "peakPowerKw"
       FROM capped r
       GROUP BY 1 ORDER BY 1 ASC`,
      [nodeId, from, to, cap],
    );
    const num = (rec: Record<string, unknown>, k: string): number =>
      Number(Number(rec?.[k] ?? rec?.[k.toLowerCase()] ?? 0).toFixed(3));
    return rows.map((r: Record<string, unknown>) => ({
      timestamp: String(r.timestamp),
      totalPowerKw: num(r, 'totalPowerKw'),
      avgPowerKw: num(r, 'avgPowerKw'),
      peakPowerKw: num(r, 'peakPowerKw'),
    }));
  }

  /** Get total kWh, avg/peak power for a subtree */
  private async getSubtreeConsumption(nodeId: string, from?: string, to?: string) {
    if (useStaging()) {
      if (!from || !to) return { totalKwh: 0, avgPowerKw: 0, peakPowerKw: 0 };
      const cap = STAGING_LIMITS.defaultMaxRows;
      const [row] = await this.dataSource.query(
        `WITH RECURSIVE subtree AS (
           SELECT id, meter_id FROM hierarchy_nodes WHERE id = $1
           UNION ALL
           SELECT h.id, h.meter_id FROM hierarchy_nodes h
           INNER JOIN subtree s ON h.parent_id = s.id
         ),
         capped AS (
           SELECT r.power_kw FROM readings_import_staging r
           INNER JOIN subtree s ON s.meter_id = r.meter_id
           WHERE s.meter_id IS NOT NULL AND r.timestamp >= $2 AND r.timestamp <= $3
           LIMIT $4
         )
         SELECT
           COALESCE(SUM(c.power_kw), 0)::double precision AS "totalKwh",
           COALESCE(AVG(c.power_kw), 0)::double precision AS "avgPowerKw",
           COALESCE(MAX(c.power_kw), 0)::double precision AS "peakPowerKw"
         FROM capped c`,
        [nodeId, from, to, cap],
      );
      const raw = row as Record<string, unknown> | undefined;
      const n = (k: string): number =>
        Number(Number(raw?.[k] ?? raw?.[k.toLowerCase()] ?? 0).toFixed(3));
      return {
        totalKwh: n('totalKwh'),
        avgPowerKw: n('avgPowerKw'),
        peakPowerKw: n('peakPowerKw'),
      };
    }

    if (!from || !to) {
      return { totalKwh: 0, avgPowerKw: 0, peakPowerKw: 0 };
    }

    const maxTsRow = await this.dataSource.query<Array<{ max_ts: string | null }>>(
      `WITH RECURSIVE subtree AS (
        SELECT id, meter_id FROM hierarchy_nodes WHERE id = $1
        UNION ALL
        SELECT h.id, h.meter_id FROM hierarchy_nodes h
        INNER JOIN subtree s ON h.parent_id = s.id
      )
      SELECT MAX(r.timestamp)::text AS max_ts FROM readings r
      INNER JOIN subtree s ON s.meter_id = r.meter_id WHERE s.meter_id IS NOT NULL`,
      [nodeId],
    );
    const r = maxTsRow[0] as Record<string, unknown> | undefined;
    const maxTsRaw = r?.max_ts ?? (r && (r as Record<string, string>)['max_ts']);
    const maxTs = maxTsRaw != null ? String(maxTsRaw).trim() : null;
    if (maxTs && new Date(to) > new Date(maxTs)) {
      to = maxTs;
    }

    const query = `
      WITH RECURSIVE subtree AS (
        SELECT id, meter_id FROM hierarchy_nodes WHERE id = $1
        UNION ALL
        SELECT h.id, h.meter_id FROM hierarchy_nodes h
        INNER JOIN subtree s ON h.parent_id = s.id
      ),
      meter_delta AS (
        SELECT s.meter_id, MAX(r.energy_kwh_total) - MIN(r.energy_kwh_total) AS delta
        FROM readings r
        INNER JOIN subtree s ON s.meter_id = r.meter_id
        WHERE s.meter_id IS NOT NULL
          AND r.timestamp >= $2 AND r.timestamp <= $3
        GROUP BY s.meter_id
      ),
      power_stats AS (
        SELECT AVG(r.power_kw) AS avg_pw, MAX(r.power_kw) AS peak_pw
        FROM readings r
        INNER JOIN subtree s ON s.meter_id = r.meter_id
        WHERE s.meter_id IS NOT NULL
          AND r.timestamp >= $2 AND r.timestamp <= $3
      )
      SELECT
        COALESCE((SELECT SUM(delta) FROM meter_delta), 0) AS "totalKwh",
        COALESCE((SELECT avg_pw FROM power_stats), 0) AS "avgPowerKw",
        COALESCE((SELECT peak_pw FROM power_stats), 0) AS "peakPowerKw"`;
    const [row] = await this.dataSource.query(query, [nodeId, from, to]);
    const raw = row as Record<string, unknown> | undefined;
    const num = (camel: string): number =>
      Number(Number(raw?.[camel] ?? raw?.[camel.toLowerCase()] ?? 0).toFixed(3));
    return {
      totalKwh: num('totalKwh'),
      avgPowerKw: num('avgPowerKw'),
      peakPowerKw: num('peakPowerKw'),
    };
  }

  /** Count readings rows in range for the subtree (diagnostic when totalKwh is 0). */
  private async getSubtreeReadingsCount(nodeId: string, from: string, to: string): Promise<number> {
    const table = useStaging() ? 'readings_import_staging' : 'readings';
    const [row] = await this.dataSource.query(
      `WITH RECURSIVE subtree AS (
        SELECT id, meter_id FROM hierarchy_nodes WHERE id = $1
        UNION ALL
        SELECT h.id, h.meter_id FROM hierarchy_nodes h
        INNER JOIN subtree s ON h.parent_id = s.id
      )
      SELECT COUNT(*)::bigint AS cnt FROM ${table} r
      INNER JOIN subtree s ON s.meter_id = r.meter_id
      WHERE s.meter_id IS NOT NULL AND r.timestamp >= $2 AND r.timestamp <= $3`,
      [nodeId, from, to],
    );
    return Number(row?.cnt ?? 0);
  }

  /** Count meters in a subtree */
  private async getSubtreeMeterCount(nodeId: string): Promise<number> {
    const [row] = await this.dataSource.query(
      `WITH RECURSIVE subtree AS (
        SELECT id, meter_id FROM hierarchy_nodes WHERE id = $1
        UNION ALL
        SELECT h.id, h.meter_id FROM hierarchy_nodes h
        INNER JOIN subtree s ON h.parent_id = s.id
      )
      SELECT COUNT(*) as count FROM subtree WHERE meter_id IS NOT NULL`,
      [nodeId],
    );
    return Number(row.count);
  }

  /** Determine status of a subtree based on meter last_reading_at */
  private async getSubtreeStatus(nodeId: string): Promise<'online' | 'offline' | 'partial'> {
    const rows = await this.dataSource.query(
      `WITH RECURSIVE subtree AS (
        SELECT id, meter_id FROM hierarchy_nodes WHERE id = $1
        UNION ALL
        SELECT h.id, h.meter_id FROM hierarchy_nodes h
        INNER JOIN subtree s ON h.parent_id = s.id
      )
      SELECT m.last_reading_at FROM meters m
      INNER JOIN subtree s ON s.meter_id = m.id
      WHERE s.meter_id IS NOT NULL`,
      [nodeId],
    );

    if (rows.length === 0) return 'offline';

    const now = Date.now();
    const threshold = 5 * 60 * 1000;
    let online = 0;
    for (const r of rows) {
      if (r.last_reading_at && now - new Date(r.last_reading_at).getTime() < threshold) {
        online++;
      }
    }

    if (online === rows.length) return 'online';
    if (online === 0) return 'offline';
    return 'partial';
  }

  private mapRow(r: Record<string, unknown>): HierarchyNode {
    const node = new HierarchyNode();
    node.id = r.id as string;
    node.parentId = r.parent_id as string | null;
    node.buildingId = r.building_id as string;
    node.name = r.name as string;
    node.level = Number(r.level);
    node.nodeType = r.node_type as string;
    node.meterId = r.meter_id as string | null;
    node.sortOrder = Number(r.sort_order);
    return node;
  }
}
