import {
  Controller,
  Get,
  Query,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

interface PeriodStats {
  period: string;
  totalRequests: number;
  errorCount: number;
  errorRate: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
}

interface TopEndpoint {
  action: string;
  count: number;
  avgMs: number;
  errorCount: number;
}

export interface ApiObservabilityReport {
  from: string;
  to: string;
  granularity: string;
  periods: PeriodStats[];
  topEndpoints: TopEndpoint[];
  summary: {
    totalRequests: number;
    errorCount: number;
    errorRate: number;
    p95Ms: number;
  };
}

const VALID_GRANULARITIES = ['hour', 'day', 'week', 'month'] as const;
type Granularity = (typeof VALID_GRANULARITIES)[number];

function toGranularity(input: string | undefined): Granularity {
  const val = (input ?? 'day') as Granularity;
  return VALID_GRANULARITIES.includes(val) ? val : 'day';
}

function buildInterval(granularity: Granularity): string {
  const map: Record<Granularity, string> = {
    hour: '1 hour',
    day: '1 day',
    week: '1 week',
    month: '1 month',
  };
  return map[granularity];
}

/**
 * DAT-09 — API observability report.
 * Aggregates from audit_logs hypertable: request counts, error rates, latency percentiles.
 */
@ApiTags('API Observability (DAT-09)')
@Controller('admin/api-observability')
export class ApiObservabilityController {
  private readonly logger = new Logger(ApiObservabilityController.name);

  constructor(private readonly dataSource: DataSource) {}

  @Get()
  @RequirePermission('audit', 'read')
  @ApiOperation({ summary: 'API usage report with error rates and latency percentiles' })
  @ApiQuery({ name: 'from', required: false, description: 'ISO date start (default: 30 days ago)' })
  @ApiQuery({ name: 'to', required: false, description: 'ISO date end (default: now)' })
  @ApiQuery({ name: 'granularity', required: false, enum: VALID_GRANULARITIES })
  @ApiResponse({ status: 200, description: 'Observability report' })
  async getReport(
    @Query('from') fromParam?: string,
    @Query('to') toParam?: string,
    @Query('granularity') granularityParam?: string,
  ): Promise<ApiObservabilityReport> {
    const to = toParam ?? new Date().toISOString();
    const from = fromParam ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const granularity = toGranularity(granularityParam);
    const interval = buildInterval(granularity);

    const [periods, topEndpoints, summary] = await Promise.all([
      this.queryPeriods(from, to, interval),
      this.queryTopEndpoints(from, to),
      this.querySummary(from, to),
    ]);

    return { from, to, granularity, periods, topEndpoints, summary };
  }

  private async queryPeriods(from: string, to: string, interval: string): Promise<PeriodStats[]> {
    const rows = await this.dataSource.query(
      `SELECT
         time_bucket($1::interval, created_at) AS period,
         COUNT(*)::int AS total_requests,
         COUNT(*) FILTER (WHERE (details->>'statusCode')::int >= 400)::int AS error_count,
         ROUND(100.0 * COUNT(*) FILTER (WHERE (details->>'statusCode')::int >= 400) / NULLIF(COUNT(*), 0), 2) AS error_rate,
         COALESCE(percentile_cont(0.50) WITHIN GROUP (ORDER BY (details->>'duration')::numeric), 0)::int AS p50_ms,
         COALESCE(percentile_cont(0.95) WITHIN GROUP (ORDER BY (details->>'duration')::numeric), 0)::int AS p95_ms,
         COALESCE(percentile_cont(0.99) WITHIN GROUP (ORDER BY (details->>'duration')::numeric), 0)::int AS p99_ms
       FROM audit_logs
       WHERE created_at >= $2::timestamptz AND created_at <= $3::timestamptz
         AND details IS NOT NULL
         AND details->>'duration' IS NOT NULL
       GROUP BY period
       ORDER BY period`,
      [interval, from, to],
    );

    return rows.map((r: Record<string, unknown>) => ({
      period: (r.period as Date).toISOString(),
      totalRequests: Number(r.total_requests),
      errorCount: Number(r.error_count),
      errorRate: Number(r.error_rate),
      p50Ms: Number(r.p50_ms),
      p95Ms: Number(r.p95_ms),
      p99Ms: Number(r.p99_ms),
    }));
  }

  private async queryTopEndpoints(from: string, to: string): Promise<TopEndpoint[]> {
    const rows = await this.dataSource.query(
      `SELECT
         action,
         COUNT(*)::int AS count,
         COALESCE(AVG((details->>'duration')::numeric), 0)::int AS avg_ms,
         COUNT(*) FILTER (WHERE (details->>'statusCode')::int >= 400)::int AS error_count
       FROM audit_logs
       WHERE created_at >= $1::timestamptz AND created_at <= $2::timestamptz
         AND details IS NOT NULL
         AND details->>'duration' IS NOT NULL
       GROUP BY action
       ORDER BY count DESC
       LIMIT 20`,
      [from, to],
    );

    return rows.map((r: Record<string, unknown>) => ({
      action: r.action as string,
      count: Number(r.count),
      avgMs: Number(r.avg_ms),
      errorCount: Number(r.error_count),
    }));
  }

  private async querySummary(from: string, to: string): Promise<ApiObservabilityReport['summary']> {
    const rows = await this.dataSource.query(
      `SELECT
         COUNT(*)::int AS total_requests,
         COUNT(*) FILTER (WHERE (details->>'statusCode')::int >= 400)::int AS error_count,
         ROUND(100.0 * COUNT(*) FILTER (WHERE (details->>'statusCode')::int >= 400) / NULLIF(COUNT(*), 0), 2) AS error_rate,
         COALESCE(percentile_cont(0.95) WITHIN GROUP (ORDER BY (details->>'duration')::numeric), 0)::int AS p95_ms
       FROM audit_logs
       WHERE created_at >= $1::timestamptz AND created_at <= $2::timestamptz
         AND details IS NOT NULL
         AND details->>'duration' IS NOT NULL`,
      [from, to],
    );

    const r = rows[0] ?? {};
    return {
      totalRequests: Number(r.total_requests ?? 0),
      errorCount: Number(r.error_count ?? 0),
      errorRate: Number(r.error_rate ?? 0),
      p95Ms: Number(r.p95_ms ?? 0),
    };
  }
}
