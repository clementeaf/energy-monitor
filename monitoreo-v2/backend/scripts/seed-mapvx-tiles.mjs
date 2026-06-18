#!/usr/bin/env node
/**
 * Download and cache raw PBF vector tiles from tiles.mapvx.com.
 * Stores binary blobs in mapvx_tiles table for offline rendering.
 * Downloads z14–z18 tiles covering each mall (single tile per zoom).
 *
 *   DB_HOST=127.0.0.1 DB_PORT=5434 DB_NAME=monitoreo_v2 \
 *   DB_USERNAME=postgres DB_PASSWORD=monitoreo2026 \
 *   node scripts/seed-mapvx-tiles.mjs
 */

import pg from 'pg';

const TILES_URL = 'https://tiles.mapvx.com/tiles';
const ZOOM_RANGE = [14, 15, 16, 17, 18, 19];

function latLngToTile(lat, lng, z) {
  const n = Math.pow(2, z);
  return {
    x: Math.floor((lng + 180) / 360 * n),
    y: Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n),
  };
}

function getTileCoverage(lat, lng, z) {
  const center = latLngToTile(lat, lng, z);
  const radius = 1;
  const tiles = [];
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      tiles.push({ z, x: center.x + dx, y: center.y + dy });
    }
  }
  return tiles;
}

async function main() {
  const client = new pg.Client({
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 5432),
    database: process.env.DB_NAME ?? 'monitoreo_v2',
    user: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? '',
  });
  await client.connect();

  const malls = await client.query(`SELECT id, name, center_lat, center_lng FROM mapvx_malls ORDER BY name`);
  console.log(`Downloading tiles for ${malls.rows.length} malls, zoom ${ZOOM_RANGE[0]}–${ZOOM_RANGE[ZOOM_RANGE.length - 1]}\n`);

  const seen = new Set();
  let downloaded = 0;
  let skipped = 0;

  for (const mall of malls.rows) {
    const lat = Number(mall.center_lat);
    const lng = Number(mall.center_lng);
    console.log(`=== ${mall.name} ===`);

    for (const z of ZOOM_RANGE) {
      const tiles = getTileCoverage(lat, lng, z);
      for (const t of tiles) {
        const key = `${t.z}/${t.x}/${t.y}`;
        if (seen.has(key)) { skipped++; continue; }
        seen.add(key);

        try {
          const res = await fetch(`${TILES_URL}/${t.z}/${t.x}/${t.y}.pbf`);
          const buf = Buffer.from(await res.arrayBuffer());

          if (buf.length === 0) continue;

          await client.query(
            `INSERT INTO mapvx_tiles (z, x, y, data)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (z, x, y) DO UPDATE SET data = EXCLUDED.data, created_at = now()`,
            [t.z, t.x, t.y, buf],
          );
          downloaded++;
        } catch { /* tile not available */ }
      }
    }
    console.log(`  Tiles cached so far: ${downloaded}`);
  }

  console.log(`\n=== Done. ${downloaded} tiles cached, ${skipped} skipped (duplicate). ===`);
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
