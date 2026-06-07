import { NoOpBackfillWorker } from './backfill.worker';

describe('NoOpBackfillWorker', () => {
  it('returns zero rows inserted', async () => {
    const worker = new NoOpBackfillWorker();
    const result = await worker.execute({
      id: 'job-1',
      tenantId: 't-1',
      meterId: 'm-1',
    } as never);
    expect(result.rowsInserted).toBe(0);
  });
});
