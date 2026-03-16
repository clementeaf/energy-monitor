import { Client } from 'pg';

const BUILDING_CODES: Record<string, string> = {
  'Parque Arauco Kennedy': 'MG',
  'Arauco Estación': 'MM',
  'Arauco Premium Outlet Buenaventura': 'OT',
  'Arauco Express Ciudad Empresarial': 'SC52',
  'Arauco Express El Carmen de Huechuraba': 'SC53',
};

interface MigrationRow {
  store_name: string;
  building_name: string;
  month: Date;
  meter_count: number;
  total_neto: number | null;
  iva: number | null;
  total: number | null;
}

function buildCode(buildingName: string): string {
  return BUILDING_CODES[buildingName] || 'XX';
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function dateFmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function migrateBillingDocuments(client: Client): Promise<string[]> {
  const log: string[] = [];

  // 1. Drop old table
  await client.query('DROP TABLE IF EXISTS billing_document');
  log.push('Dropped old billing_document table');

  // 2. Create new table (with operator_name, without UNIQUE constraint)
  await client.query(`
    CREATE TABLE billing_document (
      id              SERIAL PRIMARY KEY,
      operator_name   VARCHAR(200),
      building_name   VARCHAR(100) NOT NULL,
      month           DATE NOT NULL,
      doc_number      VARCHAR(20) NOT NULL,
      doc_type        VARCHAR(20) NOT NULL DEFAULT 'factura',
      issue_date      DATE NOT NULL,
      due_date        DATE NOT NULL,
      total_neto_clp  NUMERIC(16,2),
      iva_clp         NUMERIC(16,2),
      total_clp       NUMERIC(16,2) NOT NULL,
      status          VARCHAR(20) NOT NULL,
      payment_date    DATE,
      payment_amount  NUMERIC(16,2),
      days_overdue    INT DEFAULT 0,
      meter_count     INT NOT NULL DEFAULT 1
    )
  `);
  await client.query('CREATE INDEX idx_billing_doc_building ON billing_document(building_name)');
  await client.query('CREATE INDEX idx_billing_doc_status ON billing_document(status)');
  await client.query('CREATE INDEX idx_billing_doc_due ON billing_document(due_date)');
  log.push('Created new billing_document table with operator_name');

  // 3. Fetch aggregated data at store level
  const { rows } = await client.query<MigrationRow>(`
    SELECT
      s.store_name,
      b.building_name,
      b.month,
      COUNT(*)::int AS meter_count,
      SUM(b.total_neto_clp) AS total_neto,
      SUM(b.iva_clp) AS iva,
      SUM(b.total_con_iva_clp) AS total
    FROM meter_monthly_billing b
    JOIN store s ON s.meter_id = b.meter_id
    GROUP BY s.store_name, b.building_name, b.month
    ORDER BY s.store_name, b.month
  `);
  log.push(`Fetched ${rows.length} store+month aggregations`);

  // 4. Generate documents with deterministic random (seeded via simple hash)
  const TODAY = new Date('2025-12-15');
  let docSeq = 10000;
  const values: unknown[][] = [];

  for (const row of rows) {
    const total = row.total !== null ? parseFloat(String(row.total)) : 0;
    if (total === 0) continue;

    docSeq += 1;
    const code = buildCode(row.building_name);
    const docNumber = `FE-${code}-${docSeq}`;
    const month = new Date(row.month);

    // Issue date: 5th of next month
    const issueDate = new Date(month.getFullYear(), month.getMonth() + 1, 5);
    // Due date: 30 days after issue
    const dueDate = addDays(issueDate, 30);
    const daysSinceDue = Math.floor((TODAY.getTime() - dueDate.getTime()) / 86400000);

    // Deterministic pseudo-random based on docSeq
    const hash = ((docSeq * 2654435761) >>> 0) / 4294967296;
    let status: string;

    if (daysSinceDue < -30) {
      status = 'pagado';
    } else if (daysSinceDue < 0) {
      status = hash < 0.70 ? 'pagado' : 'por_vencer';
    } else if (daysSinceDue <= 15) {
      status = hash < 0.60 ? 'pagado' : 'vencido';
    } else if (daysSinceDue <= 45) {
      status = hash < 0.85 ? 'pagado' : 'vencido';
    } else {
      status = hash < 0.95 ? 'pagado' : 'vencido';
    }

    let paymentDate: string | null = null;
    let paymentAmount: number | null = null;
    let daysOverdue = 0;

    if (status === 'pagado') {
      const payOffset = Math.floor(hash * 25) - 5; // -5 to 19
      let pd = addDays(dueDate, payOffset);
      if (pd > TODAY) pd = addDays(TODAY, -Math.floor(hash * 5 + 1));
      paymentDate = dateFmt(pd);
      paymentAmount = total;
    } else if (status === 'vencido') {
      daysOverdue = Math.max(1, daysSinceDue);
    }

    const totalNeto = row.total_neto !== null ? parseFloat(String(row.total_neto)) : null;
    const iva = row.iva !== null ? parseFloat(String(row.iva)) : null;

    values.push([
      row.store_name, row.building_name, dateFmt(month), docNumber, 'factura',
      dateFmt(issueDate), dateFmt(dueDate), totalNeto, iva, total,
      status, paymentDate, paymentAmount, daysOverdue, row.meter_count,
    ]);
  }

  // 5. Batch insert
  const BATCH = 500;
  for (let i = 0; i < values.length; i += BATCH) {
    const batch = values.slice(i, i + BATCH);
    const placeholders = batch.map((_, idx) => {
      const base = idx * 15;
      return `(${Array.from({ length: 15 }, (__, j) => `$${base + j + 1}`).join(',')})`;
    });
    await client.query(
      `INSERT INTO billing_document
        (operator_name, building_name, month, doc_number, doc_type,
         issue_date, due_date, total_neto_clp, iva_clp, total_clp,
         status, payment_date, payment_amount, days_overdue, meter_count)
       VALUES ${placeholders.join(',')}`,
      batch.flat(),
    );
  }
  log.push(`Inserted ${values.length} billing documents`);

  // 6. Summary
  const summary = await client.query(`
    SELECT status, COUNT(*)::int AS count, SUM(total_clp)::bigint AS total
    FROM billing_document GROUP BY status ORDER BY status
  `);
  for (const r of summary.rows) {
    log.push(`  ${r.status}: ${r.count} docs, $${r.total} CLP`);
  }

  const total = await client.query('SELECT COUNT(*)::int AS c FROM billing_document');
  log.push(`Total documents: ${total.rows[0].c}`);

  return log;
}

export const handler = async () => {
  const client = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    const log = await migrateBillingDocuments(client);
    return { statusCode: 200, body: log };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { statusCode: 500, body: { error: message } };
  } finally {
    await client.end();
  }
};
