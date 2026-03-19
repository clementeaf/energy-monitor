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

async function createAuthTables(client: Client): Promise<string[]> {
  const log: string[] = [];

  await client.query(`
    CREATE TABLE IF NOT EXISTS roles (
      id smallint PRIMARY KEY,
      name varchar(30) UNIQUE NOT NULL,
      label_es varchar(50) NOT NULL,
      is_active boolean DEFAULT true,
      created_at timestamptz DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      external_id varchar(255),
      provider varchar(20),
      email varchar(255) NOT NULL,
      name varchar(255) NOT NULL,
      avatar_url text,
      role_id smallint DEFAULT 4 REFERENCES roles(id),
      user_mode varchar(20) DEFAULT 'holding',
      is_active boolean DEFAULT true,
      invitation_token_hash varchar(64),
      invitation_expires_at timestamptz,
      invitation_sent_at timestamptz,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS user_sites (
      user_id uuid REFERENCES users(id) ON DELETE CASCADE,
      site_id varchar(50),
      PRIMARY KEY (user_id, site_id)
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash varchar(64) NOT NULL,
      expires_at timestamptz NOT NULL,
      created_at timestamptz DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS actions (
      id smallint PRIMARY KEY,
      code varchar(20) UNIQUE NOT NULL
    );
    CREATE TABLE IF NOT EXISTS modules (
      id smallint PRIMARY KEY,
      code varchar(40) UNIQUE NOT NULL,
      label varchar(60) NOT NULL,
      route_path varchar(120) NOT NULL,
      navigation_group varchar(40) NOT NULL,
      show_in_nav boolean DEFAULT false,
      sort_order smallint DEFAULT 0,
      is_public boolean DEFAULT false,
      is_active boolean DEFAULT true
    );
    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id smallint REFERENCES roles(id),
      module_id smallint REFERENCES modules(id),
      action_id smallint REFERENCES actions(id),
      PRIMARY KEY (role_id, module_id, action_id)
    );
  `);
  log.push('Auth tables created (IF NOT EXISTS)');

  // Seed roles
  await client.query(`
    INSERT INTO roles (id, name, label_es) VALUES
      (1, 'SUPER_ADMIN', 'Super Administrador'),
      (2, 'CORP_ADMIN', 'Administrador Corporativo'),
      (3, 'SITE_ADMIN', 'Administrador de Sitio'),
      (4, 'OPERATOR', 'Operador'),
      (5, 'ANALYST', 'Analista'),
      (6, 'TENANT_USER', 'Usuario Tienda'),
      (7, 'AUDITOR', 'Auditor')
    ON CONFLICT (id) DO NOTHING
  `);

  // Seed actions
  await client.query(`
    INSERT INTO actions (id, code) VALUES (1, 'view'), (2, 'manage')
    ON CONFLICT (id) DO NOTHING
  `);

  // Seed modules
  await client.query(`
    INSERT INTO modules (id, code, label, route_path, navigation_group, show_in_nav, sort_order) VALUES
      (1,  'DASHBOARD_OVERVIEW',    'Dashboard',             '/',                     'main', true,  1),
      (2,  'CONTEXT_SELECT',        'Seleccionar Sitio',     '/context/select',       'main', false, 0),
      (3,  'BUILDINGS_OVERVIEW',    'Activos Inmobiliarios', '/buildings',            'main', true,  2),
      (4,  'BUILDING_DETAIL',       'Detalle Edificio',      '/buildings/:id',        'main', false, 0),
      (5,  'METER_DETAIL',          'Detalle Medidor',       '/meters/:meterId',      'main', false, 0),
      (6,  'MONITORING_REALTIME',   'Monitoreo',             '/monitoring/realtime',  'main', true,  3),
      (7,  'ALERTS_OVERVIEW',       'Alertas',               '/alerts',               'main', false, 4),
      (8,  'ALERT_DETAIL',          'Detalle Alerta',        '/alerts/:id',           'main', false, 0),
      (9,  'MONITORING_DRILLDOWN',  'Drill-down',            '/monitoring/drilldown', 'main', false, 0),
      (10, 'ADMIN_SITES',           'Admin Sitios',          '/admin/sites',          'admin', false, 1),
      (11, 'ADMIN_USERS',           'Admin Usuarios',        '/admin/users',          'admin', false, 2),
      (12, 'ADMIN_METERS',          'Admin Medidores',       '/admin/meters',         'admin', false, 3),
      (13, 'ADMIN_HIERARCHY',       'Admin Jerarquía',       '/admin/hierarchy',      'admin', false, 4),
      (14, 'BILLING_OVERVIEW',      'Facturación',           '/billing',              'main', false, 5),
      (15, 'COMPARISONS_OVERVIEW',  'Comparativas',          '/comparisons',          'main', true,  6)
    ON CONFLICT (id) DO NOTHING
  `);

  // Seed role_permissions
  // ALL_INVITED_ROLES (1-7): view on dashboard, context, buildings, building_detail, comparisons
  await client.query(`
    INSERT INTO role_permissions (role_id, module_id, action_id)
    SELECT r.id, m.id, 1 FROM roles r, modules m
    WHERE m.code IN ('DASHBOARD_OVERVIEW','CONTEXT_SELECT','BUILDINGS_OVERVIEW','BUILDING_DETAIL','COMPARISONS_OVERVIEW')
    ON CONFLICT DO NOTHING
  `);
  // TECHNICAL_ROLES (1-5): view on meter_detail, monitoring_realtime, monitoring_drilldown
  await client.query(`
    INSERT INTO role_permissions (role_id, module_id, action_id)
    SELECT r.id, m.id, 1 FROM roles r, modules m
    WHERE r.id <= 5 AND m.code IN ('METER_DETAIL','MONITORING_REALTIME','MONITORING_DRILLDOWN')
    ON CONFLICT DO NOTHING
  `);
  // ALERTS_VIEW_ROLES (1-5, 7): view alerts
  await client.query(`
    INSERT INTO role_permissions (role_id, module_id, action_id)
    SELECT r.id, m.id, 1 FROM roles r, modules m
    WHERE r.id IN (1,2,3,4,5,7) AND m.code IN ('ALERTS_OVERVIEW','ALERT_DETAIL')
    ON CONFLICT DO NOTHING
  `);
  // SITE_ADMIN_ROLES (1-3): manage alerts, view admin/billing
  await client.query(`
    INSERT INTO role_permissions (role_id, module_id, action_id)
    SELECT r.id, m.id, 2 FROM roles r, modules m
    WHERE r.id <= 3 AND m.code IN ('ALERTS_OVERVIEW','ALERT_DETAIL')
    ON CONFLICT DO NOTHING
  `);
  await client.query(`
    INSERT INTO role_permissions (role_id, module_id, action_id)
    SELECT r.id, m.id, 1 FROM roles r, modules m
    WHERE r.id <= 3 AND m.code IN ('ADMIN_SITES','ADMIN_METERS','ADMIN_HIERARCHY','BILLING_OVERVIEW')
    ON CONFLICT DO NOTHING
  `);
  // ADMIN_USERS: view for 1-2, manage for 1
  await client.query(`
    INSERT INTO role_permissions (role_id, module_id, action_id)
    SELECT r.id, m.id, 1 FROM roles r, modules m WHERE r.id IN (1,2) AND m.code = 'ADMIN_USERS'
    ON CONFLICT DO NOTHING
  `);
  await client.query(`
    INSERT INTO role_permissions (role_id, module_id, action_id)
    SELECT r.id, m.id, 2 FROM roles r, modules m WHERE r.id = 1 AND m.code = 'ADMIN_USERS'
    ON CONFLICT DO NOTHING
  `);

  // Seed initial users (direct access, no invitation needed)
  await client.query(`
    INSERT INTO users (email, name, role_id, user_mode, is_active) VALUES
      ('carriagadafalcone@gmail.com', 'Clemente Falcone', 1, 'holding', true),
      ('carriagada@grupobanados.com', 'Clemente Arriagada', 2, 'holding', true),
      ('darwin@hoktus.com', 'Darwin', 1, 'holding', true),
      ('aportilla@globepower.cl', 'Andrés Portilla', 1, 'holding', true)
    ON CONFLICT DO NOTHING
  `);
  log.push('Seeded roles, actions, modules, permissions, initial users');

  // Verify
  const counts = await client.query(`
    SELECT 'roles' AS t, COUNT(*)::int AS c FROM roles
    UNION ALL SELECT 'users', COUNT(*) FROM users
    UNION ALL SELECT 'modules', COUNT(*) FROM modules
    UNION ALL SELECT 'role_permissions', COUNT(*) FROM role_permissions
  `);
  for (const r of counts.rows) {
    log.push(`  ${r.t}: ${r.c}`);
  }

  return log;
}

async function updateBuildingAreas(client: Client): Promise<string[]> {
  const log: string[] = [];

  const areas: Record<string, number> = {
    'Parque Arauco Kennedy': 120000,
    'Arauco Estación': 68000,
    'Arauco Premium Outlet Buenaventura': 50000,
    'Arauco Express Ciudad Empresarial': 5302,
    'Arauco Express El Carmen de Huechuraba': 5650,
  };

  for (const [name, area] of Object.entries(areas)) {
    const res = await client.query(
      'UPDATE building_summary SET area_sqm = $1 WHERE building_name = $2 AND (area_sqm IS NULL OR area_sqm != $1)',
      [area, name],
    );
    log.push(`${name}: ${res.rowCount} rows updated to ${area} m²`);
  }

  // Verify
  const { rows } = await client.query(
    'SELECT building_name, COUNT(*)::int AS total, COUNT(area_sqm)::int AS with_area FROM building_summary GROUP BY building_name ORDER BY building_name',
  );
  for (const r of rows) {
    log.push(`  ${r.building_name}: ${r.with_area}/${r.total} rows have area`);
  }

  return log;
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
    const log: string[] = [];

    // Run all migrations
    const authLog = await createAuthTables(client);
    log.push('=== Auth Tables ===', ...authLog);

    const areaLog = await updateBuildingAreas(client);
    log.push('=== Building Areas ===', ...areaLog);

    // Diagnostics: table sizes
    const { rows: sizes } = await client.query(`
      SELECT tablename,
        pg_size_pretty(pg_total_relation_size('public.' || tablename)) AS size,
        pg_total_relation_size('public.' || tablename) AS bytes
      FROM pg_tables WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size('public.' || tablename) DESC
    `);
    log.push('=== Table Sizes ===');
    for (const r of sizes) {
      log.push(`  ${r.tablename}: ${r.size}`);
    }

    // Cleanup: drop orphan temp tables and unused old-schema tables
    const dropTargets = ['_vcf_tmp', 'readings_import_staging', 'staging_centers'];
    log.push('=== Cleanup ===');
    for (const t of dropTargets) {
      const { rowCount } = await client.query(`SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = $1`, [t]);
      if (rowCount && rowCount > 0) {
        await client.query(`DROP TABLE IF EXISTS ${t} CASCADE`);
        log.push(`  Dropped ${t}`);
      }
    }

    // Delete Parque Arauco Concon if exists
    const { rowCount: conconRows } = await client.query(`DELETE FROM building_summary WHERE building_name = 'Parque Arauco Concon'`);
    if (conconRows && conconRows > 0) {
      log.push(`  Deleted ${conconRows} Parque Arauco Concon rows`);
    }

    return { statusCode: 200, body: log };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { statusCode: 500, body: { error: message } };
  } finally {
    await client.end();
  }
};
