import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { HierarchyNode } from './hierarchy-node.entity';
import { Meter } from '../meters/meter.entity';
import { hasSiteAccess, type AccessScope } from '../auth/access-scope';

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

  /** Get a single node with its ancestor path */
  async findNode(nodeId: string, scope: AccessScope) {
    const rows = await this.dataSource.query(
      `WITH RECURSIVE ancestors AS (
        SELECT * FROM hierarchy_nodes WHERE id = $1
        UNION ALL
        SELECT h.* FROM hierarchy_nodes h
        INNER JOIN ancestors a ON a.parent_id = h.id
      )
      SELECT * FROM ancestors ORDER BY level ASC`,
      [nodeId],
    );

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
    const node = await this.findNode(nodeId, scope);
    if (!node) return null;

    const children = await this.nodeRepo.find({
      where: { parentId: nodeId },
      order: { sortOrder: 'ASC' },
    });

    if (children.length === 0) return [];

    const results = await Promise.all(
      children.map(async (child) => {
        const summary = await this.getSubtreeConsumption(child.id, from, to);
        const meterCount = await this.getSubtreeMeterCount(child.id);
        const status = await this.getSubtreeStatus(child.id);
        return { ...child, ...summary, meterCount, status };
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
    const node = await this.findNode(nodeId, scope);
    if (!node) return null;

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

    const params: (string | undefined)[] = [nodeId];
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

    return rows.map((r: Record<string, unknown>) => ({
      timestamp: r.timestamp,
      totalPowerKw: Number(Number(r.totalPowerKw).toFixed(3)),
      avgPowerKw: Number(Number(r.avgPowerKw).toFixed(3)),
      peakPowerKw: Number(Number(r.peakPowerKw).toFixed(3)),
    }));
  }

  /** Get total kWh, avg/peak power for a subtree */
  private async getSubtreeConsumption(nodeId: string, from?: string, to?: string) {
    let query = `
      WITH RECURSIVE subtree AS (
        SELECT id, meter_id FROM hierarchy_nodes WHERE id = $1
        UNION ALL
        SELECT h.id, h.meter_id FROM hierarchy_nodes h
        INNER JOIN subtree s ON h.parent_id = s.id
      )
      SELECT
        COALESCE(SUM(r.power_kw), 0) as "totalKwh",
        COALESCE(AVG(r.power_kw), 0) as "avgPowerKw",
        COALESCE(MAX(r.power_kw), 0) as "peakPowerKw"
      FROM readings r
      INNER JOIN subtree s ON s.meter_id = r.meter_id
      WHERE s.meter_id IS NOT NULL`;

    const params: (string | undefined)[] = [nodeId];
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

    const [row] = await this.dataSource.query(query, params);
    return {
      totalKwh: Number(Number(row.totalKwh).toFixed(3)),
      avgPowerKw: Number(Number(row.avgPowerKw).toFixed(3)),
      peakPowerKw: Number(Number(row.peakPowerKw).toFixed(3)),
    };
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
