const CONTINUOUS_AGGREGATES = ['readings_15min', 'readings_hourly', 'readings_daily'];

/**
 * Refresh Timescale continuous aggregates and portfolio_summary for a date window.
 * @param {import('pg').Client} client - DB client
 * @param {string} fromDate - ISO lower bound
 * @param {string} toDate - ISO upper bound
 * @returns {Promise<void>}
 */
export async function refreshAggregates(client, fromDate, toDate) {
  const start = new Date(fromDate);
  start.setUTCDate(start.getUTCDate() - 1);
  const end = new Date(toDate);
  end.setUTCDate(end.getUTCDate() + 1);

  for (const viewName of CONTINUOUS_AGGREGATES) {
    try {
      await client.query(`CALL refresh_continuous_aggregate($1, $2::timestamptz, $3::timestamptz)`, [
        viewName,
        start.toISOString(),
        end.toISOString(),
      ]);
      console.log(`[refresh] ${viewName} OK (${start.toISOString()} → ${end.toISOString()})`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[refresh] ${viewName} skipped: ${message}`);
    }
  }

  const portfolioExists = await client.query(
    `SELECT 1 FROM pg_class WHERE relname = 'portfolio_summary' AND relkind = 'm'`,
  );
  if (portfolioExists.rowCount === 0) {
    console.warn('[refresh] portfolio_summary not found — apply migration 16');
    return;
  }

  try {
    await client.query('REFRESH MATERIALIZED VIEW CONCURRENTLY portfolio_summary');
    console.log('[refresh] portfolio_summary OK (concurrent)');
  } catch {
    await client.query('REFRESH MATERIALIZED VIEW portfolio_summary');
    console.log('[refresh] portfolio_summary OK');
  }
}

/**
 * Print post-import counts for verification.
 * @param {import('pg').Client} client - DB client
 * @param {string} tenantId - PASA tenant UUID
 * @returns {Promise<void>}
 */
export async function printSummary(client, tenantId) {
  const meters = await client.query(
    `SELECT COUNT(*)::bigint AS n FROM meters WHERE tenant_id = $1`,
    [tenantId],
  );
  const readings = await client.query(
    `SELECT COUNT(*)::bigint AS n FROM readings WHERE tenant_id = $1`,
    [tenantId],
  );
  const portfolio = await client.query(
    `SELECT COUNT(*)::bigint AS n FROM portfolio_summary WHERE tenant_id = $1`,
    [tenantId],
  );

  console.log('[summary] meters:', meters.rows[0].n);
  console.log('[summary] readings:', readings.rows[0].n);
  console.log('[summary] portfolio_summary rows:', portfolio.rows[0].n);
}
