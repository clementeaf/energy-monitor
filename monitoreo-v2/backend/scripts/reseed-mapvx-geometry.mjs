#!/usr/bin/env node
/**
 * Re-seed mapvx_geometries using a SINGLE z16 tile per mall.
 * Fixes cross-tile coordinate offset from the z18 3×3 grid approach.
 * z16 tile = ~2.4km coverage, contains all indoor data in one tile.
 *
 *   DB_HOST=127.0.0.1 DB_PORT=5434 DB_NAME=monitoreo_v2 \
 *   DB_USERNAME=postgres DB_PASSWORD=monitoreo2026 \
 *   node scripts/reseed-mapvx-geometry.mjs
 */

import pg from 'pg';

const TILES_URL = 'https://tiles.mapvx.com/tiles';
const TILE_ZOOM = 16;
const LAYERS = ['area', 'area_name', 'poi', 'transportation'];

function latLngToTile(lat, lng, z) {
  const n = Math.pow(2, z);
  return {
    x: Math.floor((lng + 180) / 360 * n),
    y: Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n),
  };
}

async function decodeTile(z, x, y) {
  const url = `${TILES_URL}/${z}/${x}/${y}.pbf`;
  const res = await fetch(url);
  const buf = Buffer.from(await res.arrayBuffer());
  const { PbfReader } = await import('pbf');
  const { VectorTile } = await import('@mapbox/vector-tile');
  const tile = new VectorTile(new PbfReader(buf));

  const features = {};
  for (const layerName of Object.keys(tile.layers)) {
    features[layerName] = [];
    const layer = tile.layers[layerName];
    for (let i = 0; i < layer.length; i++) {
      features[layerName].push(layer.feature(i).toGeoJSON(x, y, z));
    }
  }
  return features;
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
  console.log(`Processing ${malls.rows.length} malls at z${TILE_ZOOM} (single tile per mall)\n`);

  for (const mall of malls.rows) {
    const lat = Number(mall.center_lat);
    const lng = Number(mall.center_lng);
    const tile = latLngToTile(lat, lng, TILE_ZOOM);

    console.log(`=== ${mall.name} — z${TILE_ZOOM}/${tile.x}/${tile.y} ===`);

    let allFeatures;
    try {
      allFeatures = await decodeTile(TILE_ZOOM, tile.x, tile.y);
    } catch (err) {
      console.log(`  Tile fetch failed: ${err.message}`);
      continue;
    }

    const totalFeatures = Object.values(allFeatures).reduce((s, f) => s + f.length, 0);
    console.log(`  Total features: ${totalFeatures}`);

    // Clear old geometry
    await client.query(`DELETE FROM mapvx_geometries WHERE mall_id = $1`, [mall.id]);

    // Also update floors from tile data
    const floorKeys = new Set();
    for (const feats of Object.values(allFeatures)) {
      feats.forEach((f) => {
        const fk = f.properties?.floor_key;
        if (fk) floorKeys.add(fk);
      });
    }

    // Upsert floors discovered from tiles (for OSM malls that had placeholder floors)
    let floorIdx = 0;
    for (const fk of [...floorKeys].sort()) {
      const sample = allFeatures.area?.find((f) => f.properties?.floor_key === fk);
      const level = Number(sample?.properties?.level ?? floorIdx + 1);
      await client.query(
        `INSERT INTO mapvx_floors (mall_id, external_key, label, level, is_default, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (mall_id, external_key) DO UPDATE
           SET label = EXCLUDED.label, level = EXCLUDED.level, sort_order = EXCLUDED.sort_order`,
        [mall.id, fk, `Nivel ${level}`, level, floorIdx === 0, floorIdx],
      );
      floorIdx++;
    }

    // Store geometry grouped by floor_key + layer
    let geoCount = 0;
    for (const layerName of LAYERS) {
      const features = allFeatures[layerName] ?? [];

      const byFloor = new Map();
      features.forEach((f) => {
        const fk = f.properties?.floor_key ?? '__no_floor__';
        const list = byFloor.get(fk) ?? [];
        list.push(f);
        byFloor.set(fk, list);
      });

      for (const [floorKey, floorFeatures] of byFloor.entries()) {
        const fc = { type: 'FeatureCollection', features: floorFeatures };
        await client.query(
          `INSERT INTO mapvx_geometries (mall_id, floor_key, layer, geojson)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (mall_id, floor_key, layer) DO UPDATE SET geojson = EXCLUDED.geojson`,
          [mall.id, floorKey, layerName, JSON.stringify(fc)],
        );
        geoCount += floorFeatures.length;
      }
    }
    console.log(`  Stored: ${geoCount} features, ${floorKeys.size} floors`);

    // Extract stores from area_name for malls without MapVX API stores
    const hasStores = await client.query(
      `SELECT count(*) as c FROM mapvx_stores WHERE mall_id = $1`,
      [mall.id],
    );
    const storeCount = Number(hasStores.rows[0].c);
    const areaNames = allFeatures.area_name ?? [];
    const namedFeatures = areaNames.filter((f) => f.properties?.name && f.geometry?.coordinates);

    // Re-populate stores from tiles for malls that had tile-extracted stores (not MapVX API stores)
    // MapVX API malls have 100+ stores, tile-extracted have fewer
    // For consistency, always update from tiles for OSM-sourced malls
    const isMapvxMall = storeCount > 500; // MapVX API malls have 100+ stores
    if (!isMapvxMall && namedFeatures.length > 0) {
      await client.query(`DELETE FROM mapvx_stores WHERE mall_id = $1`, [mall.id]);
      for (const f of namedFeatures) {
        const ref = f.properties.ref ?? `area-${f.properties.name}-${f.properties.floor_key ?? ''}`;
        await client.query(
          `INSERT INTO mapvx_stores (mall_id, external_id, title, lat, lng, floor_key, category)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (mall_id, external_id) DO NOTHING`,
          [mall.id, ref, f.properties.name, f.geometry.coordinates[1], f.geometry.coordinates[0], f.properties.floor_key ?? '', ''],
        );
      }
      console.log(`  Stores refreshed: ${namedFeatures.length}`);
    }
  }

  const summary = await client.query(`SELECT count(*) as c FROM mapvx_geometries`);
  console.log(`\n=== Done. ${summary.rows[0].c} geometry rows total ===`);
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
