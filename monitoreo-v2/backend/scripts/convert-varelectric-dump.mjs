#!/usr/bin/env node
/**
 * Convierte el dump MySQL de Varelectric (tabla `var_electric`) a INSERTs
 * PostgreSQL para la tabla `readings`.
 *
 * Uso (INSERT via ECS Exec — ~4KB/s, solo sirve para volumenes chicos):
 *   node scripts/convert-varelectric-dump.mjs docs/Dump20260727.sql <meter_uuid> <tenant_uuid> > /tmp/ve.sql
 *   node scripts/apply-sql-dump-ecs.mjs /tmp/ve.sql
 *
 * Uso (CSV via S3 — dos ordenes de magnitud mas rapido, usar desde ~50MB):
 *   node scripts/convert-varelectric-dump.mjs --csv docs/Dump20260727.sql <meter_uuid> <tenant_uuid> > /tmp/ve.csv
 *   aws s3 cp /tmp/ve.csv s3://energy-monitor-iot-ingest/readings-import/ve.csv
 *   -- y en la base:
 *   CREATE TEMP TABLE stg (LIKE readings INCLUDING DEFAULTS);
 *   ALTER TABLE stg ALTER COLUMN timestamp TYPE text;
 *   SELECT aws_s3.table_import_from_s3(
 *     'stg', 'tenant_id,meter_id,timestamp,voltage_l1,voltage_l2,voltage_l3,
 *             current_l1,current_l2,current_l3,power_kw,power_factor,energy_kwh_total',
 *     '(format csv)',
 *     aws_commons.create_s3_uri('energy-monitor-iot-ingest','readings-import/ve.csv','us-east-1'));
 *   INSERT INTO readings (tenant_id, meter_id, timestamp, voltage_l1, voltage_l2, voltage_l3,
 *                         current_l1, current_l2, current_l3, power_kw, power_factor, energy_kwh_total)
 *   SELECT tenant_id, meter_id, timestamp::timestamp AT TIME ZONE 'America/Santiago',
 *          voltage_l1, voltage_l2, voltage_l3, current_l1, current_l2, current_l3,
 *          power_kw, power_factor, energy_kwh_total FROM stg;
 *
 * El CSV lleva la hora local tal cual y la conversion de zona la hace Postgres
 * en ese INSERT..SELECT: es la misma expresion de la ruta INSERT, ya validada
 * contra el horario de verano, y evita replicar reglas de DST en JS.
 *
 * Selftest:
 *   node scripts/convert-varelectric-dump.mjs --selftest
 *
 * Mapeo de tags (deducido y validado contra los propios datos del dump):
 *   tag1/2/3  -> voltage_l1/l2/l3    (221-242 V)
 *   tag4/5/6  -> current_l1/l2/l3    (114-559 A)
 *   tag9      -> power_kw            (= tag18+19+20, error mediano 0.3 kW)
 *   tag12     -> power_factor        (0.74-0.97)
 *   tag14     -> energy_kwh_total    (acumulativo; delta ~= tag9 * 0.25h)
 * Descartados: tag7 (duplica tag1), tag16 (Demanda, redundante con tag9),
 *              tag18/19/20 (potencia por fase, sin columna destino),
 *              tag8/10/11/13/15/17 (100% NULL en el dump).
 * Sin fuente: reactive_power_kvar, frequency_hz, thd_*, phase_imbalance_pct.
 */
import { readFileSync } from 'fs';
import assert from 'assert';

// `fecha` viene como datetime naive. El perfil de carga (pico 11h, valle 4h)
// indica hora local de Chile, no UTC. Se delega la conversion a Postgres para
// que resuelva el horario de verano por fecha en vez de un offset fijo.
const TZ = 'America/Santiago';
// apply-sql-dump-ecs.mjs parte el archivo con split('\n') y asume que cada
// linea es un statement completo, con un techo de ~22KB de SQL por chunk.
// Por eso cada INSERT va en UNA sola linea: 100 tuplas ~= 13KB, entra holgado.
// Subir este numero parte los statements por la mitad -> syntax error.
const ROWS_PER_INSERT = 100;

// indice 0-based dentro del array de 20 tags
const TAGS = {
  voltage_l1: 0,
  voltage_l2: 1,
  voltage_l3: 2,
  current_l1: 3,
  current_l2: 4,
  current_l3: 5,
  power_kw: 8,
  power_factor: 11,
  energy_kwh_total: 13,
};
const COLUMNS = Object.keys(TAGS);
// readings define estas dos NOT NULL: la fila sin ellas no se puede insertar
const REQUIRED = ['power_kw', 'energy_kwh_total'];

/** Extrae [{ fecha, tags[] }] de los INSERT de `var_electric` del dump MySQL. */
export function parseDump(sql) {
  const rows = [];
  // el dump viene de MySQL Win64: los saltos son CRLF y Node no los traduce
  const blocks = sql.matchAll(/INSERT INTO `var_electric` VALUES ([\s\S]*?);\r?\n/g);
  for (const block of blocks) {
    const tuples = block[1].matchAll(/\((\d+),(\d+),(\d+),'([^']+)',([^)]*)\)/g);
    for (const t of tuples) {
      const tags = t[5].split(',').map((v) => {
        const s = v.trim();
        return s === 'NULL' ? null : Number(s);
      });
      rows.push({ fecha: t[4], tags });
    }
  }
  return rows;
}

/** true si la fila trae las columnas que `readings` define NOT NULL. */
function isComplete(row) {
  return REQUIRED.every((col) => row.tags[TAGS[col]] != null);
}

/**
 * Una fila -> linea CSV para aws_s3.table_import_from_s3, o null si esta
 * incompleta. El timestamp va como texto local sin zona a proposito: la
 * conversion la hace Postgres al pasar de la staging a `readings` (ver
 * cabecera), que es la misma logica ya validada de la ruta INSERT.
 */
export function toCsvRow(row, meterId, tenantId) {
  if (!isComplete(row)) return null;
  const values = COLUMNS.map((col) => {
    const v = row.tags[TAGS[col]];
    return v == null ? '' : String(v);
  });
  return `${tenantId},${meterId},${row.fecha},${values.join(',')}`;
}

/** Una fila -> tupla SQL, o null si le faltan las columnas NOT NULL. */
export function toTuple(row, meterId, tenantId) {
  if (!isComplete(row)) return null;
  const values = COLUMNS.map((col) => {
    const v = row.tags[TAGS[col]];
    return v == null ? 'NULL' : String(v);
  });
  return (
    `('${tenantId}', '${meterId}', TIMESTAMP '${row.fecha}' AT TIME ZONE '${TZ}', ` +
    `${values.join(', ')})`
  );
}

export function* emit(rows, meterId, tenantId) {
  const tuples = [];
  let skipped = 0;
  for (const row of rows) {
    const t = toTuple(row, meterId, tenantId);
    if (t === null) skipped++;
    else tuples.push(t);
  }

  const fechas = rows.map((r) => r.fecha).sort();
  yield `-- ${tuples.length} lecturas para meter_id='${meterId}' (${skipped} descartadas por power_kw/energy_kwh_total NULL)`;
  yield `-- rango: ${fechas[0]} a ${fechas[fechas.length - 1]} (hora local ${TZ})`;
  yield `-- PREREQUISITO: las filas en \`meters\` y \`tenants\` deben existir o el FK falla.`;
  yield '';
  // idempotencia: re-correr el script no duplica. readings no tiene unique
  // (meter_id, timestamp), asi que no sirve ON CONFLICT.
  yield (
    `DELETE FROM readings WHERE meter_id = '${meterId}'` +
    ` AND timestamp >= TIMESTAMP '${fechas[0]}' AT TIME ZONE '${TZ}'` +
    ` AND timestamp <= TIMESTAMP '${fechas[fechas.length - 1]}' AT TIME ZONE '${TZ}';`
  );

  const header = `INSERT INTO readings (tenant_id, meter_id, timestamp, ${COLUMNS.join(', ')}) VALUES`;
  for (let i = 0; i < tuples.length; i += ROWS_PER_INSERT) {
    // ponytail: sin BEGIN/COMMIT global — apply-sql-dump-ecs.mjs manda cada
    // chunk en su propio psql y la transaccion no sobrevive el corte. Cada
    // INSERT es atomico por si solo; si falla a medias, re-correr el script
    // completo (el DELETE de arriba lo deja consistente).
    yield `${header} ${tuples.slice(i, i + ROWS_PER_INSERT).join(', ')};`;
  }
}

function selftest() {
  const sample = "INSERT INTO `var_electric` VALUES " +
    "(1,0,10,'2025-05-20 20:45:01',230,233,233,232.8,192.9,219.6,230,NULL,127.2,NULL,NULL,0.87,NULL,4035,NULL,NULL,NULL,46.5,38.4,42.3)," +
    "(2,0,10,'2025-05-20 21:00:01',229,232,232,280.2,246.9,262.2,229,NULL,151.2,NULL,NULL,0.84,NULL,4072.8,NULL,151.2,NULL,54.3,47.4,49.2);\n";

  const rows = parseDump(sample);
  assert.equal(rows.length, 2, 'esperaba 2 filas');
  // el dump real es CRLF: parsearlo con LF fue el bug que este caso cubre
  assert.equal(parseDump(sample.replace(/\n/g, '\r\n')).length, 2, 'debe parsear CRLF');
  assert.equal(rows[0].tags.length, 20, 'esperaba 20 tags');

  const M = '6ab27db7-0a61-40c2-8a93-35e9e2376683';
  const T = '84adf8d4-830d-46e1-bef5-e2eac6a19014';
  const t = toTuple(rows[0], M, T);
  // tag1/2/3=230,233,233 | tag4/5/6=232.8,192.9,219.6 | tag9=127.2
  // tag12=0.87 | tag14=4035 — en ese orden y sin los tags descartados
  assert.equal(
    t,
    `('${T}', '${M}', TIMESTAMP '2025-05-20 20:45:01' AT TIME ZONE 'America/Santiago', ` +
      '230, 233, 233, 232.8, 192.9, 219.6, 127.2, 0.87, 4035)',
  );
  // se emiten exactamente tenant_id + meter_id + timestamp + las 9 columnas
  assert.equal(t.split(',').length - 1, COLUMNS.length + 2);

  // fila sin power_kw (tag9) se descarta: readings lo define NOT NULL
  const sinPower = { fecha: '2025-01-01 00:00:00', tags: Array(20).fill(null) };
  assert.equal(toTuple(sinPower, M, T), null);

  // CSV: mismas columnas y mismo orden que la ruta INSERT, sin comillas ni
  // separadores dentro de los valores (son numeros, UUIDs y un timestamp).
  const csv = toCsvRow(rows[0], M, T);
  assert.equal(csv, `${T},${M},2025-05-20 20:45:01,230,233,233,232.8,192.9,219.6,127.2,0.87,4035`);
  assert.equal(csv.split(',').length, COLUMNS.length + 3);
  assert.ok(!csv.includes('"'), 'un valor con comillas rompe el (format csv)');
  assert.equal(toCsvRow(sinPower, M, T), null);

  // Contrato con apply-sql-dump-ecs.mjs: parte por split('\n') y asume que
  // cada linea es un statement entero. Un statement multilinea se corta por la
  // mitad y revienta con syntax error, que es como fallo la primera carga.
  const muchas = Array.from({ length: ROWS_PER_INSERT * 2 }, () => rows[0]);
  for (const stmt of emit(muchas, M, T)) {
    if (stmt.startsWith('--') || stmt === '') continue;
    assert.ok(!stmt.includes('\n'), 'un statement no puede ocupar mas de una linea');
    assert.ok(stmt.endsWith(';'), 'todo statement debe cerrar con ;');
    const b64 = Buffer.from(stmt).toString('base64').length;
    assert.ok(b64 < 30_000, `statement de ${b64}B b64 excede el limite de ECS Exec`);
  }

  console.log('selftest OK');
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const argv = process.argv.slice(2);
const csvMode = argv[0] === '--csv';
const [input, meterId, tenantId] = csvMode ? argv.slice(1) : argv;

if (argv[0] === '--selftest') {
  selftest();
} else if (!input || !meterId || !tenantId) {
  console.error('uso: convert-varelectric-dump.mjs [--csv] <dump.sql> <meter_uuid> <tenant_uuid>   |   --selftest');
  process.exit(1);
} else if (!UUID_RE.test(meterId) || !UUID_RE.test(tenantId)) {
  // en v2 ambos son UUID; un id tipo 'VE-010' es del schema v1 y revienta el FK
  console.error('meter_id y tenant_id deben ser UUID');
  process.exit(1);
} else {
  const rows = parseDump(readFileSync(input, 'utf8'));
  if (rows.length === 0) {
    console.error(`no se encontraron filas de var_electric en ${input}`);
    process.exit(1);
  }
  if (csvMode) {
    let skipped = 0;
    for (const row of rows) {
      const line = toCsvRow(row, meterId, tenantId);
      if (line === null) skipped++;
      else console.log(line);
    }
    // a stderr: stdout es el CSV y no debe llevar cabecera ni comentarios
    console.error(`${rows.length - skipped} filas CSV (${skipped} descartadas)`);
  } else {
    for (const chunk of emit(rows, meterId, tenantId)) console.log(chunk);
  }
}
