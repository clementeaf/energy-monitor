import type { BackfillJob } from '../platform/entities/backfill-job.entity';

export interface BackfillWorkerResult {
  rowsInserted: number;
}

/**
 * Pluggable worker for historical re-ingest from external sources.
 */
export interface BackfillWorker {
  execute(job: BackfillJob): Promise<BackfillWorkerResult>;
}

/**
 * No-op backfill worker — marks jobs complete with zero rows until a real source is wired.
 */
export class NoOpBackfillWorker implements BackfillWorker {
  /**
   * Returns zero rows inserted without calling external systems.
   */
  async execute(_job: BackfillJob): Promise<BackfillWorkerResult> {
    return { rowsInserted: 0 };
  }
}

export const BACKFILL_WORKER = Symbol('BACKFILL_WORKER');
