#!/usr/bin/env node
/**
 * Seed MapVX indoor map data into local DB.
 * Fetches malls, floors, stores from MapVX API + vector tiles (PBF) for geometry.
 * Idempotent — uses ON CONFLICT DO UPDATE.
 *
 *   DB_HOST=127.0.0.1 DB_PORT=5434 DB_NAME=monitoreo_v2 \
 *   DB_USERNAME=postgres DB_PASSWORD=monitoreo2026 \
 *   node scripts/seed-mapvx-data.mjs
 */

import pg from 'pg';
import { readFileSync } from 'fs';

const MAPVX_TOKEN = '7xgzQwyhJzXEEx5IslsO';
const API = 'https://public-api.mapvx.com/api/sdk';
const TILES_URL = 'https://tiles.mapvx.com/tiles';
const TILE_ZOOM = 18;
const GRID_RADIUS = 1; // 3×3 grid

const MALL_IDS = [
  '-Ok-yw5e32hv59dxorcN',   // Parque Arauco
  '-OsXlNrHww4IRvg1Vqfo',  // Arauco Chillán
  '-OsXmx3WlJMjxVbQ5q-f',  // Arauco Maipú
  '-OsXmapC0hXtd0RrrBWY',  // Arauco Premium Outlet Buenaventura
];

const LAYERS = ['area', 'area_name', 'poi', 'transportation'];

// ── Helpers ──

function latLngToTile(lat, lng, z) {
  const n = Math.pow(2, z);
  return {
    x: Math.floor((lng + 180) / 360 * n),
    y: Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n),
  };
}

function decodePolyline(encoded) {
  let index = 0, lat = 0, lng = 0;
  const coords = [];
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);
    coords.push([lat / 1e5, lng / 1e5]);
  }
  return coords;
}

async function fetchJson(url) {
  const res = await fetch(url);
  return res.json();
}

async function fetchPbf(z, x, y) {
  const url = `${TILES_URL}/${z}/${x}/${y}.pbf`;
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  return Buffer.from(buf);
}

async function decodeTile(buf, x, y, z) {
  const { PbfReader } = await import('pbf');
  const { VectorTile } = await import('@mapbox/vector-tile');
  const tile = new VectorTile(new PbfReader(buf));
  const features = {};

  for (const layerName of Object.keys(tile.layers)) {
    features[layerName] = features[layerName] ?? [];
    const layer = tile.layers[layerName];
    for (let i = 0; i < layer.length; i++) {
      const f = layer.feature(i);
      const geojson = f.toGeoJSON(x, y, z);
      features[layerName].push(geojson);
    }
  }
  return features;
}

function deduplicateFeatures(features) {
  const seen = new Set();
  return features.filter((f) => {
    const key = JSON.stringify(f.geometry.coordinates) + '|' + (f.properties?.name ?? '') + '|' + (f.properties?.floor_key ?? '');
    const dup = seen.has(key);
    seen.add(key);
    return !dup;
  });
}

function buildDbConfig() {
  return {
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 5432),
    database: process.env.DB_NAME ?? 'monitoreo_v2',
    user: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? '',
  };
}

// ── Main ──

async function main() {
  const client = new pg.Client(buildDbConfig());
  await client.connect();
  console.log('Connected to DB.');

  for (const placeId of MALL_IDS) {
    console.log(`\n=== Processing ${placeId} ===`);

    // 1. Fetch mall data
    const mall = await fetchJson(`${API}/place?token=${MAPVX_TOKEN}&place_id=${placeId}&lang=es`);
    console.log(`  Mall: ${mall.title}`);

    const polygonRaw = mall.polygon?.[0] ?? null;
    const polygonCoords = polygonRaw ? decodePolyline(polygonRaw) : null;

    // Upsert mall
    const mallResult = await client.query(
      `INSERT INTO mapvx_malls (external_id, name, center_lat, center_lng, polygon_coords)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (external_id) DO UPDATE
         SET name = EXCLUDED.name, center_lat = EXCLUDED.center_lat,
             center_lng = EXCLUDED.center_lng, polygon_coords = EXCLUDED.polygon_coords
       RETURNING id`,
      [placeId, mall.title, mall.lat, mall.lng, polygonCoords ? JSON.stringify(polygonCoords) : null],
    );
    const mallId = mallResult.rows[0].id;

    // 2. Floors
    const innerFloors = mall.innerFloors ?? {};
    let floorIdx = 0;
    for (const [key, floor] of Object.entries(innerFloors)) {
      await client.query(
        `INSERT INTO mapvx_floors (mall_id, external_key, label, level, is_default, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (mall_id, external_key) DO UPDATE
           SET label = EXCLUDED.label, level = EXCLUDED.level,
               is_default = EXCLUDED.is_default, sort_order = EXCLUDED.sort_order`,
        [mallId, key, floor.name, floor.level, floor.defaultFloor ?? false, floor.index ?? floorIdx],
      );
      floorIdx++;
    }
    console.log(`  Floors: ${Object.keys(innerFloors).length}`);

    // 3. Stores
    const stores = await fetchJson(`${API}/subPlaces?token=${MAPVX_TOKEN}&place_id=${placeId}&lang=es`);
    const validStores = stores.filter((s) => s.lat && s.lng && s.inFloor?.length);

    // Delete old stores for this mall, then bulk insert
    await client.query(`DELETE FROM mapvx_stores WHERE mall_id = $1`, [mallId]);
    for (const s of validStores) {
      await client.query(
        `INSERT INTO mapvx_stores (mall_id, external_id, title, lat, lng, floor_key, category)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (mall_id, external_id) DO UPDATE
           SET title = EXCLUDED.title, lat = EXCLUDED.lat, lng = EXCLUDED.lng,
               floor_key = EXCLUDED.floor_key, category = EXCLUDED.category`,
        [mallId, s.id, s.title, s.lat, s.lng, s.inFloor[0], s.general_category ?? s.category ?? ''],
      );
    }
    console.log(`  Stores: ${validStores.length}`);

    // 4. Vector tiles → geometry
    const center = latLngToTile(mall.lat, mall.lng, TILE_ZOOM);
    const allFeatures = {};

    for (let dx = -GRID_RADIUS; dx <= GRID_RADIUS; dx++) {
      for (let dy = -GRID_RADIUS; dy <= GRID_RADIUS; dy++) {
        const tx = center.x + dx;
        const ty = center.y + dy;
        try {
          const buf = await fetchPbf(TILE_ZOOM, tx, ty);
          const tileFeatures = await decodeTile(buf, tx, ty, TILE_ZOOM);
          for (const [layer, features] of Object.entries(tileFeatures)) {
            allFeatures[layer] = allFeatures[layer] ?? [];
            allFeatures[layer].push(...features);
          }
        } catch (err) {
          console.log(`  Tile ${TILE_ZOOM}/${tx}/${ty} failed: ${err.message}`);
        }
      }
    }

    // Group by floor_key + layer, deduplicate, store
    await client.query(`DELETE FROM mapvx_geometries WHERE mall_id = $1`, [mallId]);

    let geoCount = 0;
    for (const layerName of LAYERS) {
      const features = allFeatures[layerName] ?? [];
      const deduped = deduplicateFeatures(features);

      // Group by floor_key
      const byFloor = new Map();
      deduped.forEach((f) => {
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
          [mallId, floorKey, layerName, JSON.stringify(fc)],
        );
        geoCount += floorFeatures.length;
      }
    }
    console.log(`  Geometry features: ${geoCount}`);
  }

  await client.end();
  console.log('\n=== Done ===');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
