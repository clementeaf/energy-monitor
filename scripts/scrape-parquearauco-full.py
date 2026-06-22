"""
Full scraper: Parque Arauco malls — indoor maps, stores, polygons, m².

Sources:
  1. MapVX availablePlaces → malls with floors + building polygon
  2. MapVX subPlaces → stores per mall (name, floor, category, coords)
  3. Parauco API → metadata (address, total m², code, image)
  4. MapVX PBF tiles → store polygons + m² calculation

Usage:
  pip install httpx shapely  # or: uv pip install httpx shapely
  .venv/bin/python scripts/scrape-parquearauco-full.py

Output:
  scripts/parquearauco-full-data.json
"""

import json
import math
import asyncio
import struct
from pathlib import Path

try:
    import httpx
except ImportError:
    print("Install httpx: pip install httpx")
    raise

try:
    from shapely.geometry import shape
    from shapely.ops import transform
    import pyproj
    HAS_SHAPELY = True
except ImportError:
    HAS_SHAPELY = False
    print("WARNING: shapely/pyproj not installed — m² calculation disabled")
    print("  Install: pip install shapely pyproj")

# ── Config ──

MAPVX_TOKEN = "7xgzQwyhJzXEEx5IslsO"
MAPVX_API = "https://public-api.mapvx.com/api/sdk"
TILES_URL = "https://tiles.mapvx.com/tiles"
PARAUCO_API = "https://api.parauco.com"
TILE_ZOOMS = [18, 19]
GRID_RADIUS = 2  # 5×5 grid per zoom level

OUTPUT_FILE = Path(__file__).parent / "parquearauco-full-data.json"


# ── Geometry helpers ──

def decode_polyline(encoded: str) -> list[list[float]]:
    """Decode Google encoded polyline → [[lat, lng], ...]"""
    index = 0
    lat = 0
    lng = 0
    coords = []
    while index < len(encoded):
        shift = 0
        result = 0
        while True:
            b = ord(encoded[index]) - 63
            index += 1
            result |= (b & 0x1F) << shift
            shift += 5
            if b < 0x20:
                break
        lat += (~(result >> 1) if (result & 1) else (result >> 1))

        shift = 0
        result = 0
        while True:
            b = ord(encoded[index]) - 63
            index += 1
            result |= (b & 0x1F) << shift
            shift += 5
            if b < 0x20:
                break
        lng += (~(result >> 1) if (result & 1) else (result >> 1))

        coords.append([lat / 1e5, lng / 1e5])
    return coords


def lat_lng_to_tile(lat: float, lng: float, z: int) -> tuple[int, int]:
    n = 2 ** z
    x = int((lng + 180) / 360 * n)
    y = int((1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * n)
    return x, y


def calc_area_m2(geojson_geometry: dict) -> float:
    """Calculate area in m² from GeoJSON geometry using UTM projection."""
    if not HAS_SHAPELY:
        return 0.0
    try:
        geom = shape(geojson_geometry)
        if geom.is_empty or geom.geom_type not in ("Polygon", "MultiPolygon"):
            return 0.0
        # Get centroid for UTM zone
        centroid = geom.centroid
        utm_zone = int((centroid.x + 180) / 6) + 1
        hemisphere = "south" if centroid.y < 0 else "north"
        utm_crs = pyproj.CRS(f"+proj=utm +zone={utm_zone} +{hemisphere} +datum=WGS84")
        project = pyproj.Transformer.from_crs("EPSG:4326", utm_crs, always_xy=True).transform
        projected = transform(project, geom)
        return round(projected.area, 2)
    except Exception:
        return 0.0


# ── PBF tile decoder (minimal, no external deps) ──

def decode_varint(data: bytes, pos: int) -> tuple[int, int]:
    result = 0
    shift = 0
    while pos < len(data):
        b = data[pos]
        pos += 1
        result |= (b & 0x7F) << shift
        if not (b & 0x80):
            break
        shift += 7
    return result, pos


def decode_pbf_field(data: bytes, pos: int) -> tuple[int, int, any, int]:
    """Decode one protobuf field. Returns (field_number, wire_type, value, new_pos)."""
    tag, pos = decode_varint(data, pos)
    field_number = tag >> 3
    wire_type = tag & 0x07
    if wire_type == 0:  # varint
        value, pos = decode_varint(data, pos)
    elif wire_type == 2:  # length-delimited
        length, pos = decode_varint(data, pos)
        value = data[pos:pos + length]
        pos += length
    elif wire_type == 5:  # 32-bit
        value = struct.unpack('<f', data[pos:pos+4])[0]
        pos += 4
    elif wire_type == 1:  # 64-bit
        value = struct.unpack('<d', data[pos:pos+8])[0]
        pos += 8
    else:
        value = None
    return field_number, wire_type, value, pos


def decode_zigzag(n: int) -> int:
    return (n >> 1) ^ -(n & 1)


def tile_to_geojson_coords(tile_coords: list[tuple[int, int]], extent: int, x: int, y: int, z: int) -> list[list[float]]:
    """Convert tile pixel coords to [lng, lat] GeoJSON coords."""
    n = 2 ** z
    result = []
    for tx, ty in tile_coords:
        lng = (x + tx / extent) / n * 360 - 180
        lat_rad = math.atan(math.sinh(math.pi * (1 - 2 * (y + ty / extent) / n)))
        lat = math.degrees(lat_rad)
        result.append([lng, lat])
    return result


def decode_mvt_geometry(geom_data: bytes, geom_type: int, extent: int, tile_x: int, tile_y: int, tile_z: int) -> dict | None:
    """Decode MVT geometry commands into GeoJSON."""
    # Parse packed uint32 values
    integers = []
    pos = 0
    while pos < len(geom_data):
        val, pos = decode_varint(geom_data, pos)
        integers.append(val)

    if not integers:
        return None

    # Decode geometry commands
    cursor_x = 0
    cursor_y = 0
    rings = []
    current_ring = []
    i = 0

    while i < len(integers):
        cmd = integers[i]
        cmd_id = cmd & 0x07
        cmd_count = cmd >> 3
        i += 1

        if cmd_id == 1:  # MoveTo
            for _ in range(cmd_count):
                if i + 1 >= len(integers):
                    break
                dx = decode_zigzag(integers[i])
                dy = decode_zigzag(integers[i + 1])
                i += 2
                cursor_x += dx
                cursor_y += dy
                if current_ring:
                    rings.append(current_ring)
                current_ring = [(cursor_x, cursor_y)]

        elif cmd_id == 2:  # LineTo
            for _ in range(cmd_count):
                if i + 1 >= len(integers):
                    break
                dx = decode_zigzag(integers[i])
                dy = decode_zigzag(integers[i + 1])
                i += 2
                cursor_x += dx
                cursor_y += dy
                current_ring.append((cursor_x, cursor_y))

        elif cmd_id == 7:  # ClosePath
            if current_ring and len(current_ring) > 2:
                current_ring.append(current_ring[0])
                rings.append(current_ring)
                current_ring = []

    if current_ring and len(current_ring) > 2:
        rings.append(current_ring)

    if not rings:
        return None

    # Convert to GeoJSON coordinates
    if geom_type == 3:  # POLYGON
        geojson_rings = [tile_to_geojson_coords(ring, extent, tile_x, tile_y, tile_z) for ring in rings]
        return {"type": "Polygon", "coordinates": geojson_rings}
    elif geom_type == 1:  # POINT
        coords = tile_to_geojson_coords(rings[0][:1], extent, tile_x, tile_y, tile_z)
        return {"type": "Point", "coordinates": coords[0]} if coords else None

    return None


def decode_mvt_tile(data: bytes, tile_x: int, tile_y: int, tile_z: int) -> dict[str, list[dict]]:
    """Decode MVT/PBF tile into layers with GeoJSON features."""
    import gzip
    import zlib

    # Try decompression
    try:
        data = gzip.decompress(data)
    except Exception:
        try:
            data = zlib.decompress(data)
        except Exception:
            pass

    if len(data) < 4:
        return {}

    layers = {}
    pos = 0
    while pos < len(data):
        try:
            field_num, wire_type, value, pos = decode_pbf_field(data, pos)
        except Exception:
            break

        if field_num == 3 and wire_type == 2:  # layer
            layer = decode_mvt_layer(value, tile_x, tile_y, tile_z)
            if layer:
                layers[layer["name"]] = layer["features"]

    return layers


def decode_mvt_layer(data: bytes, tile_x: int, tile_y: int, tile_z: int) -> dict | None:
    """Decode a single MVT layer."""
    name = ""
    keys = []
    values = []
    features_raw = []
    extent = 4096
    pos = 0

    while pos < len(data):
        try:
            field_num, wire_type, value, pos = decode_pbf_field(data, pos)
        except Exception:
            break

        if field_num == 15:  # version
            pass
        elif field_num == 1 and wire_type == 2:  # name
            name = value.decode("utf-8", errors="replace")
        elif field_num == 2 and wire_type == 2:  # feature
            features_raw.append(value)
        elif field_num == 3 and wire_type == 2:  # keys
            keys.append(value.decode("utf-8", errors="replace"))
        elif field_num == 4 and wire_type == 2:  # values
            values.append(decode_mvt_value(value))
        elif field_num == 5:  # extent
            extent = value if isinstance(value, int) else 4096

    features = []
    for feat_data in features_raw:
        feat = decode_mvt_feature(feat_data, keys, values, extent, tile_x, tile_y, tile_z)
        if feat:
            features.append(feat)

    return {"name": name, "features": features} if name else None


def decode_mvt_value(data: bytes) -> str | int | float:
    pos = 0
    while pos < len(data):
        try:
            field_num, wire_type, value, pos = decode_pbf_field(data, pos)
        except Exception:
            break
        if field_num == 1:  # string
            return value.decode("utf-8", errors="replace") if isinstance(value, bytes) else str(value)
        elif field_num == 2:  # float
            return value
        elif field_num == 3:  # double
            return value
        elif field_num == 4:  # int64
            return value
        elif field_num == 5:  # uint64
            return value
        elif field_num == 6:  # sint64
            return decode_zigzag(value) if isinstance(value, int) else value
        elif field_num == 7:  # bool
            return bool(value)
    return ""


def decode_mvt_feature(data: bytes, keys: list, values: list, extent: int, tile_x: int, tile_y: int, tile_z: int) -> dict | None:
    geom_type = 0
    tags_raw = []
    geom_raw = b""
    feat_id = None
    pos = 0

    while pos < len(data):
        try:
            field_num, wire_type, value, pos = decode_pbf_field(data, pos)
        except Exception:
            break

        if field_num == 1:  # id
            feat_id = value
        elif field_num == 2 and wire_type == 2:  # tags (packed uint32)
            # Decode packed tags
            tpos = 0
            while tpos < len(value):
                v, tpos = decode_varint(value, tpos)
                tags_raw.append(v)
        elif field_num == 3:  # type
            geom_type = value
        elif field_num == 4 and wire_type == 2:  # geometry
            geom_raw = value

    # Build properties from tags
    properties = {}
    for j in range(0, len(tags_raw) - 1, 2):
        k_idx = tags_raw[j]
        v_idx = tags_raw[j + 1]
        if k_idx < len(keys) and v_idx < len(values):
            properties[keys[k_idx]] = values[v_idx]

    # Decode geometry
    geometry = decode_mvt_geometry(geom_raw, geom_type, extent, tile_x, tile_y, tile_z)
    if not geometry:
        return None

    return {
        "type": "Feature",
        "id": feat_id,
        "properties": properties,
        "geometry": geometry,
    }


# ── API fetchers ──

async def fetch_mapvx_places(client: httpx.AsyncClient) -> list[dict]:
    url = f"{MAPVX_API}/availablePlaces?token={MAPVX_TOKEN}&lang=es"
    r = await client.get(url)
    r.raise_for_status()
    return r.json()


async def fetch_mapvx_stores(client: httpx.AsyncClient, place_id: str) -> list[dict]:
    url = f"{MAPVX_API}/subPlaces?token={MAPVX_TOKEN}&targetPlace={place_id}&lang=es"
    r = await client.get(url)
    r.raise_for_status()
    return r.json()


async def fetch_parauco_malls(client: httpx.AsyncClient) -> list[dict]:
    url = f"{PARAUCO_API}/v1/malls/country/1?limit=100&page=1&order=ASC&sortBy=position"
    r = await client.get(url)
    r.raise_for_status()
    data = r.json()
    return data.get("data", data) if isinstance(data, dict) else data


async def fetch_tile(client: httpx.AsyncClient, z: int, x: int, y: int) -> bytes | None:
    url = f"{TILES_URL}/{z}/{x}/{y}.pbf"
    try:
        r = await client.get(url, timeout=10)
        if r.status_code == 200 and len(r.content) > 20:
            return r.content
    except Exception:
        pass
    return None


# ── Main ──

async def main():
    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        # 1. Fetch all data sources in parallel
        print("Fetching MapVX places + Parauco malls...")
        mapvx_places, parauco_malls = await asyncio.gather(
            fetch_mapvx_places(client),
            fetch_parauco_malls(client),
        )

        print(f"  MapVX: {len(mapvx_places)} places")
        print(f"  Parauco: {len(parauco_malls)} malls")

        # Build Parauco lookup by name (fuzzy match)
        parauco_by_name = {}
        for m in parauco_malls:
            parauco_by_name[m["name"].lower().strip()] = m

        # 2. For each MapVX place, fetch stores
        print("\nFetching stores per mall...")
        results = []

        for place in mapvx_places:
            place_id = place["id"]
            title = place.get("title", "Unknown")
            print(f"  {title} ({place_id})...")

            # Fetch stores
            stores_raw = await fetch_mapvx_stores(client, place_id)
            print(f"    → {len(stores_raw)} stores")

            # Parse floors
            floors = []
            inner_floors = place.get("innerFloors", {})
            for fk, fv in inner_floors.items():
                floors.append({
                    "id": fk,
                    "name": fv.get("name", ""),
                    "shortName": fv.get("shortName", ""),
                    "level": fv.get("level", 0),
                    "vectorTile": fv.get("vectorTile", False),
                })
            floors.sort(key=lambda f: f["level"])

            # Decode building polygon
            building_polygon = None
            polygons_encoded = place.get("polygons", [])
            if polygons_encoded:
                coords = decode_polyline(polygons_encoded[0])
                if len(coords) >= 3:
                    # Close ring
                    if coords[0] != coords[-1]:
                        coords.append(coords[0])
                    # Convert to GeoJSON [lng, lat]
                    geojson_coords = [[c[1], c[0]] for c in coords]
                    building_polygon = {"type": "Polygon", "coordinates": [geojson_coords]}

            # Parse stores
            stores = []
            for s in stores_raw:
                store = {
                    "id": s.get("id", ""),
                    "alias": s.get("alias", ""),
                    "name": s.get("title", ""),
                    "lat": s.get("lat", 0),
                    "lng": s.get("lng", 0),
                    "category": s.get("localizedCategory", ""),
                    "floor_ids": s.get("inFloor", []),
                    "indoor": s.get("indoorOutdoor", "") == "indoor",
                    "logo": s.get("logo", ""),
                }
                stores.append(store)

            # Match Parauco metadata
            parauco_match = None
            title_lower = title.lower().strip()
            for pname, pdata in parauco_by_name.items():
                if pname in title_lower or title_lower in pname:
                    parauco_match = pdata
                    break

            # Fetch PBF tiles for this mall
            center_lat = place.get("lat", 0)
            center_lng = place.get("lng", 0)
            tile_features = {}
            total_tiles = 0

            if center_lat and center_lng:
                for z in TILE_ZOOMS:
                    cx, cy = lat_lng_to_tile(center_lat, center_lng, z)
                    tile_tasks = []
                    for dx in range(-GRID_RADIUS, GRID_RADIUS + 1):
                        for dy in range(-GRID_RADIUS, GRID_RADIUS + 1):
                            tx, ty = cx + dx, cy + dy
                            tile_tasks.append((z, tx, ty))

                    # Fetch tiles in parallel (batches of 10)
                    for batch_start in range(0, len(tile_tasks), 10):
                        batch = tile_tasks[batch_start:batch_start + 10]
                        tile_results = await asyncio.gather(
                            *[fetch_tile(client, tz, tx, ty) for tz, tx, ty in batch]
                        )
                        for (tz, tx, ty), tile_data in zip(batch, tile_results):
                            if tile_data:
                                total_tiles += 1
                                try:
                                    layers = decode_mvt_tile(tile_data, tx, ty, tz)
                                    for layer_name, features in layers.items():
                                        if layer_name not in tile_features:
                                            tile_features[layer_name] = []
                                        tile_features[layer_name].extend(features)
                                except Exception as e:
                                    pass  # Skip bad tiles

            print(f"    → {total_tiles} tiles fetched, {sum(len(v) for v in tile_features.values())} tile features")

            # Calculate m² for polygon features
            store_polygons = []
            area_features = tile_features.get("area", []) + tile_features.get("area_name", [])
            for feat in area_features:
                geom = feat.get("geometry", {})
                props = feat.get("properties", {})
                if geom.get("type") == "Polygon":
                    area_m2 = calc_area_m2(geom)
                    store_polygons.append({
                        "name": props.get("name", props.get("class", "")),
                        "class": props.get("class", ""),
                        "area_m2": area_m2,
                        "geometry": geom,
                    })

            # Sort by area descending
            store_polygons.sort(key=lambda x: x["area_m2"], reverse=True)

            mall_entry = {
                "mapvx_id": place_id,
                "name": title,
                "lat": center_lat,
                "lng": center_lng,
                "address": place.get("address", ""),
                "indoor_outdoor": place.get("indoorOutdoor", ""),
                "building_polygon": building_polygon,
                "floors": floors,
                "stores_count": len(stores),
                "stores": stores,
                "tile_polygons_count": len(store_polygons),
                "tile_polygons": store_polygons,
                "tiles_fetched": total_tiles,
                "tile_layers": list(tile_features.keys()),
                # Parauco metadata
                "parauco": {
                    "id": parauco_match["id"] if parauco_match else None,
                    "code": parauco_match.get("code", "") if parauco_match else "",
                    "address": parauco_match.get("address", "") if parauco_match else "",
                    "size": parauco_match.get("size", "") if parauco_match else "",
                    "inaugurated": parauco_match.get("inaugurated", "") if parauco_match else "",
                    "image": parauco_match.get("image", "") if parauco_match else "",
                    "webPage": parauco_match.get("webPage", "") if parauco_match else "",
                } if parauco_match else None,
            }
            results.append(mall_entry)

            # Rate limit
            await asyncio.sleep(0.5)

        # 3. Summary
        print(f"\n{'='*60}")
        print(f"RESULTS: {len(results)} malls processed")
        print(f"{'='*60}")
        total_stores = 0
        total_polygons = 0
        for r in results:
            total_stores += r["stores_count"]
            total_polygons += r["tile_polygons_count"]
            has_parauco = "✓" if r["parauco"] else "✗"
            has_tiles = "✓" if r["tiles_fetched"] > 0 else "✗"
            size = r["parauco"]["size"] if r["parauco"] else "—"
            print(f"  {r['name']:<45} stores={r['stores_count']:>4}  polys={r['tile_polygons_count']:>4}  tiles={has_tiles}  parauco={has_parauco}  size={size}")

        print(f"\n  Total stores: {total_stores}")
        print(f"  Total polygons: {total_polygons}")

        # 4. Save
        # Strip large geometry arrays for readable output, keep summary
        output = []
        for r in results:
            entry = {**r}
            # Keep only top-20 polygons with area > 1m²
            entry["tile_polygons"] = [
                {**p, "geometry": p["geometry"]["type"]}  # just type, not full coords
                for p in r["tile_polygons"][:20]
                if p["area_m2"] > 1
            ]
            # Full polygons in separate file
            output.append(entry)

        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(output, f, ensure_ascii=False, indent=2)
        print(f"\nSaved summary: {OUTPUT_FILE}")

        # Save full data with geometries
        full_file = OUTPUT_FILE.with_name("parquearauco-full-geometries.json")
        with open(full_file, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        print(f"Saved full (with geometries): {full_file}")


if __name__ == "__main__":
    asyncio.run(main())
