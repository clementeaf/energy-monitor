#!/usr/bin/env node
/**
 * Seed 27 Parque Arauco marker-only malls into mapvx_malls.
 * Updates 4 existing indoor malls with Parauco metadata.
 * Idempotent — uses ON CONFLICT DO UPDATE.
 *
 *   DB_HOST=127.0.0.1 DB_PORT=5434 DB_NAME=monitoreo_v2 \
 *   DB_USERNAME=postgres DB_PASSWORD=monitoreo2026 \
 *   node scripts/seed-parquearauco-markers.mjs
 */

import pg from 'pg';

// ── Data from scraper output (parquearauco-all-malls.json) ──

const MARKER_MALLS = [
  { name: 'Arauco Chicureo', lat: -33.2723, lng: -70.6181, code: 'CHC', address: 'Avenida Chicureo 125, Chicureo, Colina.', size: '40.000 mt2', image: 'https://api-image-admin-bucket-prod.s3.amazonaws.com/mall_1/2026_5_5/malls/ebf8df63-9853-4405-ac58-4b25a6416578.webp' },
  { name: 'Arauco Coronel', lat: -37.0624, lng: -73.1414, code: 'ACO', address: 'Carlos Pratt González 913, Coronel, Bío Bío.', size: '31.000 m²', image: 'https://ecosis-prd-s3.s3.amazonaws.com/images/mall_picture/ACO.jpg' },
  { name: 'Arauco El Bosque', lat: -33.5535, lng: -70.6781, code: 'AEB', address: 'Gran Av. José Miguel Carrera 10375, El Bosque, Región Metropolitana.', size: '30.000 m²', image: 'https://ecosis-prd-s3.s3.amazonaws.com/images/mall_picture/AEB.jpg' },
  { name: 'Arauco Estación', lat: -33.4527, lng: -70.6799, code: 'MAE', address: 'Av. Libertador Bernardo OHiggins 3250, Estación Central, Región Metropolitana.', size: '68.000 m²', image: 'https://ecosis-prd-s3.s3.amazonaws.com/images/mall_picture/MAE.jpg' },
  { name: 'Arauco Quilicura', lat: -33.3709, lng: -70.7177, code: 'MAQ', address: 'Av. Bernardo OHiggins 581, Quilicura, Región Metropolitana.', size: '31.000 m²', image: 'https://ecosis-prd-s3.s3.amazonaws.com/images/mall_picture/MAQ.jpg' },
  { name: 'Arauco Premium Outlet Coquimbo', lat: -29.9766, lng: -71.2962, code: 'COQ', address: 'La Cantera 2325, 1802263 Coquimbo.', size: '6.000 m²', image: 'https://ecosis-prd-s3.s3.amazonaws.com/images/mall_picture/COQ.jpg' },
  { name: 'Arauco Premium Outlet Curauma', lat: -33.1326, lng: -71.5641, code: 'CUR', address: 'Av. Lomas de la Luz 4650, Curauma, Valparaíso.', size: '8.500 m²', image: 'https://ecosis-prd-s3.s3.amazonaws.com/images/mall_picture/CUR.jpg' },
  { name: 'Arauco Premium Outlet San Pedro', lat: -36.8691, lng: -73.1372, code: 'CON', address: 'Av. Portal San Pedro 4850, San Pedro de la Paz, Concepción.', size: '10.500 m²', image: 'https://ecosis-prd-s3.s3.amazonaws.com/images/mall_picture/CON1.jpg' },
  { name: 'Arauco San Antonio', lat: -33.5818, lng: -71.6137, code: 'ASA', address: 'Barros Luco 105, San Antonio, Valparaíso.', size: '28.500 m²', image: 'https://ecosis-prd-s3.s3.amazonaws.com/images/mall_picture/ASA.jpg' },
  { name: 'Parque Angamos', lat: -23.6950, lng: -70.4155, code: 'PAN', address: 'Av. Angamos 02170, Antofagasta.', size: '10.500 m²', image: 'https://ecosis-prd-s3.s3.amazonaws.com/images/mall_picture/PAN.jpg' },
  { name: 'Puerto Nuevo', lat: -22.4843, lng: -68.9233, code: 'PUE', address: 'Balmaceda 2455, Antofagasta.', size: '8.500 m²', image: 'https://ecosis-prd-s3.s3.amazonaws.com/images/mall_picture/PUE.jpg' },
  { name: 'Arauco Express Antofagasta', lat: -23.7283, lng: -70.4365, code: 'ANT', address: 'Av. Iquique 5201, Antofagasta.', size: '5.943 mt2', image: 'https://ecosis-prd-s3.s3.amazonaws.com/images/mall_picture/ANT.jpg' },
  { name: 'Arauco Express Las Brujas', lat: -33.4406, lng: -70.5362, code: 'BRU', address: 'Carlos Silva Vildósola 9073, La Reina, Región Metropolitana.', size: '3.600 mt2', image: 'https://ecosis-prd-s3.s3.amazonaws.com/images/mall_picture/BRU.jpg' },
  { name: 'Arauco Express El Carmen de Huechuraba', lat: -33.3456, lng: -70.6708, code: 'CDH', address: 'Av. Pedro Fontova 7810, Huechuraba, Región Metropolitana.', size: '5.650 mt2', image: 'https://ecosis-prd-s3.s3.amazonaws.com/images/mall_picture/CDH.jpg' },
  { name: 'Arauco Express Ciudad Empresarial', lat: -33.3900, lng: -70.6206, code: 'CE2', address: 'Av. del Parque 4722, Huechuraba, Región Metropolitana.', size: '4.789 mt2', image: 'https://ecosis-prd-s3.s3.amazonaws.com/images/mall_picture/CE2.jpg' },
  { name: 'Arauco Express Center Colón', lat: -33.4235, lng: -70.5781, code: 'COL', address: 'Av. Cristóbal Colón 4455, Las Condes, Región Metropolitana.', size: '940 mt2', image: 'https://ecosis-prd-s3.s3.amazonaws.com/images/mall_picture/COL.jpg' },
  { name: 'Arauco Express Luis Pasteur', lat: -33.3923, lng: -70.5805, code: 'LUI', address: 'Av. Luis Pasteur 5515, Vitacura, Región Metropolitana.', size: '990 mt2', image: 'https://ecosis-prd-s3.s3.amazonaws.com/images/mall_picture/LUI.jpg' },
  { name: 'Arauco Express Manuel Montt', lat: -33.4481, lng: -70.6132, code: 'MAN', address: 'Manuel Montt 2222, Ñuñoa, Región Metropolitana.', size: '970 mt2', image: 'https://ecosis-prd-s3.s3.amazonaws.com/images/mall_picture/MAN.jpg' },
  { name: 'Arauco Express Palmares', lat: -33.0103, lng: -71.4968, code: 'PLM', address: 'Angamos 242, Viña del Mar, Valparaíso.', size: '700 mt2', image: 'https://ecosis-prd-s3.s3.amazonaws.com/images/mall_picture/PAL.jpg' },
  { name: 'Arauco Express Recoleta', lat: -33.4229, lng: -70.6455, code: 'REC', address: 'Av. Recoleta 806, Recoleta, Región Metropolitana.', size: '3.524 mt2', image: 'https://ecosis-prd-s3.s3.amazonaws.com/images/mall_picture/REC.jpg' },
  { name: 'Arauco Express La Reina', lat: -33.4418, lng: -70.5441, code: 'REI', address: 'Av. Echeñique 8480, La Reina, Región Metropolitana.', size: '1.431 mt2', image: 'https://ecosis-prd-s3.s3.amazonaws.com/images/mall_picture/REI.jpg' },
  { name: 'Arauco Express Pajaritos', lat: -33.4860, lng: -70.7501, code: 'SCP', address: 'Av. Américo Vespucio 51, Maipú, Región Metropolitana.', size: '5.750 mt2', image: 'https://ecosis-prd-s3.s3.amazonaws.com/images/mall_picture/SCP.jpg' },
  { name: 'Arauco Express Boulevard Ciudad Empresarial', lat: -33.3979, lng: -70.6093, code: 'CEM', address: 'Huechuraba, Región Metropolitana.', size: '1.680 mt2', image: 'https://ecosis-prd-s3.s3.amazonaws.com/images/mall_picture/CEM.jpg' },
  { name: 'Arauco Express El Peñon', lat: -33.5741, lng: -70.5559, code: 'SEP', address: 'Camino a San José del Maipo 7788, Puente Alto.', size: '', image: 'https://ecosis-prd-s3.s3.amazonaws.com/images/mall_picture/SEP.jpg' },
  { name: 'Arauco Express Calama', lat: -22.4439, lng: -68.9046, code: 'CAL', address: 'Av. Almirante Grau 1060, Calama, Antofagasta.', size: '800 mt2', image: 'https://ecosis-prd-s3.s3.amazonaws.com/images/mall_picture/CAL.jpg' },
  { name: 'Arauco Express Rosario', lat: -33.4489, lng: -70.6627, code: 'ROS', address: 'Santiago, Región Metropolitana.', size: '', image: 'https://ecosis-prd-s3.s3.amazonaws.com/images/mall_picture/ROS.jpg' },
  { name: 'Arauco Express', lat: -33.4489, lng: -70.6627, code: 'AEX', address: 'Santiago, Región Metropolitana.', size: '', image: '' },
];

// Metadata updates for existing indoor malls
const INDOOR_UPDATES = [
  { external_id: '-Ok-yw5e32hv59dxorcN', code: 'PAK', address: 'Av. Pdte. Kennedy 5413, Las Condes, Región Metropolitana.', size: '120.000 m²', image: 'https://ecosis-prd-s3.s3.amazonaws.com/images/mall_picture/PAK.jpg' },
  { external_id: '-OsXlNrHww4IRvg1Vqfo', code: 'ACH', address: 'El Roble N° 770, Chillán, Ñuble.', size: '32.500 m²', image: 'https://ecosis-prd-s3.s3.amazonaws.com/images/mall_picture/ACH.jpg' },
  { external_id: '-OsXmx3WlJMjxVbQ5q-f', code: 'MAM', address: 'Av. Américo Vespucio 399, Maipú, Región Metropolitana.', size: '75.000 m2', image: 'https://ecosis-prd-s3.s3.amazonaws.com/images/mall_picture/MAM.jpg' },
  { external_id: '-OsXmapC0hXtd0RrrBWY', code: 'BOM', address: 'San Ignacio 500, Quilicura, Región Metropolitana.', size: '29.500 m²', image: 'https://ecosis-prd-s3.s3.amazonaws.com/images/mall_picture/BOM.jpg' },
];

async function main() {
  // SSL config for prod RDS (cert at /app/certs/rds-global-bundle.pem)
  let ssl = undefined;
  const certPath = '/app/certs/rds-global-bundle.pem';
  try {
    const { readFileSync } = await import('fs');
    const ca = readFileSync(certPath);
    ssl = { rejectUnauthorized: true, ca };
  } catch {
    // Local dev — no cert needed
  }

  const pool = new pg.Pool({
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 5434),
    database: process.env.DB_NAME ?? 'monitoreo_v2',
    user: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'monitoreo2026',
    ...(ssl ? { ssl } : {}),
  });

  const client = await pool.connect();

  try {
    // 1. Insert marker-only malls
    console.log(`Inserting ${MARKER_MALLS.length} marker-only malls...`);
    let inserted = 0;
    let updated = 0;

    for (const m of MARKER_MALLS) {
      const result = await client.query(
        `INSERT INTO mapvx_malls (id, external_id, name, center_lat, center_lng, polygon_coords, has_indoor, address, size_text, image_url)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, NULL, false, $5, $6, $7)
         ON CONFLICT (external_id) DO UPDATE SET
           name = EXCLUDED.name,
           center_lat = EXCLUDED.center_lat,
           center_lng = EXCLUDED.center_lng,
           has_indoor = EXCLUDED.has_indoor,
           address = EXCLUDED.address,
           size_text = EXCLUDED.size_text,
           image_url = EXCLUDED.image_url`,
        [`parauco-${m.code}`, m.name, m.lat, m.lng, m.address, m.size, m.image],
      );
      if (result.rowCount > 0) {
        const isInsert = result.command === 'INSERT';
        if (isInsert) inserted++;
        else updated++;
      }
    }
    console.log(`  → ${inserted} inserted, ${updated} updated`);

    // 2. Update existing indoor malls with Parauco metadata
    console.log(`\nUpdating ${INDOOR_UPDATES.length} indoor malls with metadata...`);
    for (const m of INDOOR_UPDATES) {
      const result = await client.query(
        `UPDATE mapvx_malls SET
           address = $2,
           size_text = $3,
           image_url = $4,
           has_indoor = true
         WHERE external_id = $1`,
        [m.external_id, m.address, m.size, m.image],
      );
      console.log(`  ${m.code}: ${result.rowCount > 0 ? 'OK' : 'NOT FOUND'}`);
    }

    // 3. Mark any other existing malls as indoor (OSM/Mallplaza malls)
    await client.query(`UPDATE mapvx_malls SET has_indoor = true WHERE has_indoor IS NULL`);

    // Summary
    const { rows: summary } = await client.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE has_indoor) as indoor,
        COUNT(*) FILTER (WHERE NOT has_indoor) as markers
      FROM mapvx_malls
    `);
    console.log(`\nTotal malls in DB: ${summary[0].total} (${summary[0].indoor} indoor, ${summary[0].markers} markers)`);

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
