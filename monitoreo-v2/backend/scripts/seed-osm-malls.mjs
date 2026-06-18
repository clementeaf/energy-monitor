#!/usr/bin/env node
/**
 * Seed OSM Mallplaza buildings into mapvx_malls table.
 * Fetches building polygons from Overpass API + checks indoor tiles availability.
 *
 *   DB_HOST=127.0.0.1 DB_PORT=5434 DB_NAME=monitoreo_v2 \
 *   DB_USERNAME=postgres DB_PASSWORD=monitoreo2026 \
 *   node scripts/seed-osm-malls.mjs
 */

import pg from 'pg';

const OVERPASS = 'https://overpass-api.de/api/interpreter';
const TILES_URL = 'https://tiles.mapvx.com/tiles';
const TILE_ZOOM = 18;
const LAYERS = ['area', 'area_name', 'poi', 'transportation'];

// ── Overpass ──

async function fetchMallPolygons() {
  let data;
  try {
    const query = `[out:json][timeout:30];(way["name"~"Mall Plaza|Mallplaza"]["building"](-40.0,-74.0,-30.0,-69.0);way["name"~"Mall Plaza|Mallplaza"]["shop"="mall"](-40.0,-74.0,-30.0,-69.0););out body;>;out skel qt;`;
    const res = await fetch(OVERPASS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    });
    data = await res.json();
    console.log('  Fetched from Overpass API.');
  } catch {
    console.log('  Overpass unavailable, using cached /tmp/mallplaza-osm.json');
    const { readFileSync } = await import('fs');
    data = JSON.parse(readFileSync('/tmp/mallplaza-osm.json', 'utf8'));
  }

  const nodes = new Map();
  data.elements.filter((e) => e.type === 'node').forEach((n) => nodes.set(n.id, [n.lat, n.lon]));

  return data.elements
    .filter((e) => e.type === 'way' && e.tags?.name)
    .map((w) => {
      const coords = (w.nodes ?? []).map((nid) => nodes.get(nid)).filter(Boolean);
      const center = coords.reduce(
        (acc, [lat, lng]) => [acc[0] + lat / coords.length, acc[1] + lng / coords.length],
        [0, 0],
      );
      return {
        osmId: `osm-${w.id}`,
        name: w.tags.name,
        city: w.tags['addr:city'] ?? '',
        centerLat: center[0],
        centerLng: center[1],
        coords,
      };
    })
    .filter((m) => m.coords.length > 2);
}

// ── Indoor tiles check ──

function latLngToTile(lat, lng, z) {
  const n = Math.pow(2, z);
  return {
    x: Math.floor((lng + 180) / 360 * n),
    y: Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n),
  };
}

async function fetchAndDecodeTile(z, x, y) {
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

function deduplicateFeatures(features) {
  const seen = new Set();
  return features.filter((f) => {
    const key = JSON.stringify(f.geometry.coordinates) + '|' + (f.properties?.name ?? '') + '|' + (f.properties?.floor_key ?? '');
    const dup = seen.has(key);
    seen.add(key);
    return !dup;
  });
}

async function fetchIndoorGeometry(lat, lng) {
  const center = latLngToTile(lat, lng, TILE_ZOOM);
  const allFeatures = {};
  let totalFeatures = 0;

  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      try {
        const tileFeatures = await fetchAndDecodeTile(TILE_ZOOM, center.x + dx, center.y + dy);
        for (const [layer, feats] of Object.entries(tileFeatures)) {
          allFeatures[layer] = allFeatures[layer] ?? [];
          allFeatures[layer].push(...feats);
          totalFeatures += feats.length;
        }
      } catch { /* tile empty or error */ }
    }
  }

  return { allFeatures, totalFeatures };
}

// ── DB ──

function buildDbConfig() {
  return {
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 5432),
    database: process.env.DB_NAME ?? 'monitoreo_v2',
    user: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? '',
  };
}

async function main() {
  console.log('Fetching Mallplaza polygons from OSM...');
  const malls = await fetchMallPolygons();
  console.log(`Found ${malls.length} malls with building polygons.\n`);

  const client = new pg.Client(buildDbConfig());
  await client.connect();

  for (const mall of malls) {
    console.log(`=== ${mall.name} (${mall.city}) ===`);

    // Check if already exists (from MapVX seed)
    const existing = await client.query(
      `SELECT id FROM mapvx_malls WHERE name = $1`,
      [mall.name],
    );

    // Skip if already seeded via MapVX (those have indoor data)
    if (existing.rows.length > 0) {
      console.log(`  Already exists (MapVX), updating polygon only.`);
      await client.query(
        `UPDATE mapvx_malls SET polygon_coords = $1 WHERE id = $2`,
        [JSON.stringify(mall.coords), existing.rows[0].id],
      );
      continue;
    }

    // Upsert mall
    const result = await client.query(
      `INSERT INTO mapvx_malls (external_id, name, center_lat, center_lng, polygon_coords)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (external_id) DO UPDATE
         SET name = EXCLUDED.name, center_lat = EXCLUDED.center_lat,
             center_lng = EXCLUDED.center_lng, polygon_coords = EXCLUDED.polygon_coords
       RETURNING id`,
      [mall.osmId, mall.name, mall.centerLat, mall.centerLng, JSON.stringify(mall.coords)],
    );
    const mallId = result.rows[0].id;

    // Check for indoor tiles at this location
    console.log(`  Checking indoor tiles at ${mall.centerLat.toFixed(4)}, ${mall.centerLng.toFixed(4)}...`);
    const { allFeatures, totalFeatures } = await fetchIndoorGeometry(mall.centerLat, mall.centerLng);

    if (totalFeatures === 0) {
      console.log(`  No indoor data available.`);
      // Add a default floor so the mall appears in the UI
      await client.query(
        `INSERT INTO mapvx_floors (mall_id, external_key, label, level, is_default, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (mall_id, external_key) DO NOTHING`,
        [mallId, `${mall.osmId}-floor-1`, 'Nivel 1', 1, true, 0],
      );
      continue;
    }

    console.log(`  Indoor data found: ${totalFeatures} features!`);

    // Extract unique floor_keys from features
    const floorKeys = new Set();
    for (const feats of Object.values(allFeatures)) {
      feats.forEach((f) => {
        const fk = f.properties?.floor_key;
        if (fk) floorKeys.add(fk);
      });
    }

    // Insert floors
    let idx = 0;
    for (const fk of [...floorKeys].sort()) {
      const levelMatch = allFeatures.area?.find((f) => f.properties?.floor_key === fk);
      const level = Number(levelMatch?.properties?.level ?? idx + 1);
      await client.query(
        `INSERT INTO mapvx_floors (mall_id, external_key, label, level, is_default, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (mall_id, external_key) DO NOTHING`,
        [mallId, fk, `Nivel ${level}`, level, idx === 0, idx],
      );
      idx++;
    }
    console.log(`  Floors: ${floorKeys.size}`);

    // Store geometry by floor + layer
    await client.query(`DELETE FROM mapvx_geometries WHERE mall_id = $1`, [mallId]);

    let geoCount = 0;
    for (const layerName of LAYERS) {
      const features = allFeatures[layerName] ?? [];
      const deduped = deduplicateFeatures(features);

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
    console.log(`  Geometry: ${geoCount} features`);

    // Extract stores from area_name features
    const areaNames = allFeatures.area_name ?? [];
    const storeFeatures = areaNames.filter((f) => f.properties?.name && f.geometry?.coordinates);
    await client.query(`DELETE FROM mapvx_stores WHERE mall_id = $1`, [mallId]);
    for (const f of storeFeatures) {
      const ref = f.properties.ref ?? `area-${f.properties.name}-${f.properties.floor_key ?? ''}`;
      await client.query(
        `INSERT INTO mapvx_stores (mall_id, external_id, title, lat, lng, floor_key, category)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (mall_id, external_id) DO NOTHING`,
        [mallId, ref, f.properties.name, f.geometry.coordinates[1], f.geometry.coordinates[0], f.properties.floor_key ?? '', ''],
      );
    }
    console.log(`  Stores: ${storeFeatures.length}`);
  }

  // Summary
  const summary = await client.query(`SELECT count(*) as c FROM mapvx_malls`);
  const geoSummary = await client.query(`SELECT count(*) as c FROM mapvx_geometries`);
  console.log(`\n=== Done. ${summary.rows[0].c} malls, ${geoSummary.rows[0].c} geometry rows ===`);

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
