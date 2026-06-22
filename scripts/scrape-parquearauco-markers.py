"""
Enrich 29 Parauco malls (without MapVX indoor) with geocoded coordinates.
Uses Nominatim (OSM) geocoding — no API key needed.

Usage:
  .venv/bin/python scripts/scrape-parquearauco-markers.py

Output:
  scripts/parquearauco-all-malls.json — all 33 malls, 4 with indoor + 29 markers-only
"""

import json
import asyncio
from pathlib import Path

try:
    import httpx
except ImportError:
    print("pip install httpx")
    raise

NOMINATIM = "https://nominatim.openstreetmap.org/search"
HEADERS = {"User-Agent": "EnergyMonitor/1.0 (clemente@hoktus.ai)"}

FULL_DATA_FILE = Path(__file__).parent / "parquearauco-full-data.json"
OUTPUT_FILE = Path(__file__).parent / "parquearauco-all-malls.json"

# Manual coords for malls with missing/bad addresses
MANUAL_COORDS = {
    "Arauco Express Boulevard Ciudad Empresarial": (-33.3979, -70.6093),
    "Arauco Express Rosario": (-33.4489, -70.6627),
    "Arauco Express El Peñon": (-33.5741, -70.5559),
    "Arauco Express": (-33.4489, -70.6627),  # generic, skip
    "Mall de Prueba TI": None,  # test entry, skip
}


async def geocode(client: httpx.AsyncClient, name: str, address: str) -> tuple[float, float] | None:
    """Geocode address via Nominatim. Falls back to name + Chile."""
    queries = []
    if address and address != "test":
        queries.append(address)
    queries.append(f"{name}, Chile")
    queries.append(f"{name} mall Chile")

    for q in queries:
        try:
            r = await client.get(NOMINATIM, params={
                "q": q,
                "format": "json",
                "limit": 1,
                "countrycodes": "cl",
            }, headers=HEADERS)
            data = r.json()
            if data:
                return float(data[0]["lat"]), float(data[0]["lon"])
        except Exception:
            pass
        await asyncio.sleep(1.1)  # Nominatim rate limit: 1 req/s

    return None


async def main():
    # Load indoor malls
    with open(FULL_DATA_FILE, encoding="utf-8") as f:
        indoor_malls = json.load(f)

    indoor_names = {m["name"].lower() for m in indoor_malls}

    # Load Parauco malls
    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        r = await client.get(
            "https://api.parauco.com/v1/malls/country/1?limit=100&page=1&order=ASC&sortBy=position"
        )
        parauco_data = r.json()
        parauco_malls = parauco_data.get("data", parauco_data)

        # Filter out malls that already have indoor data
        marker_malls = [
            m for m in parauco_malls
            if m["name"].lower() not in indoor_names
        ]

        print(f"Indoor malls (MapVX): {len(indoor_malls)}")
        print(f"Marker-only malls: {len(marker_malls)}")

        # Geocode each
        results = []
        for m in marker_malls:
            name = m["name"]

            # Skip test entry
            if name == "Mall de Prueba TI":
                print(f"  SKIP: {name} (test)")
                continue

            # Check manual coords
            if name in MANUAL_COORDS:
                coords = MANUAL_COORDS[name]
                if coords is None:
                    print(f"  SKIP: {name}")
                    continue
                lat, lng = coords
                print(f"  MANUAL: {name} → ({lat}, {lng})")
            else:
                address = m.get("address", "")
                result = await geocode(client, name, address)
                if result:
                    lat, lng = result
                    print(f"  OK: {name} → ({lat:.5f}, {lng:.5f})")
                else:
                    print(f"  FAIL: {name} — no coords found")
                    continue

            results.append({
                "name": name,
                "lat": lat,
                "lng": lng,
                "has_indoor": False,
                "parauco": {
                    "id": m["id"],
                    "code": m.get("code", ""),
                    "address": m.get("address", ""),
                    "size": m.get("size", ""),
                    "inaugurated": m.get("inaugurated", ""),
                    "image": m.get("image", ""),
                    "webPage": m.get("webPage", ""),
                    "description": m.get("description", ""),
                },
            })

    # Combine: indoor malls + marker malls
    all_malls = []

    # Indoor malls (simplified for map use)
    for m in indoor_malls:
        all_malls.append({
            "name": m["name"],
            "lat": m["lat"],
            "lng": m["lng"],
            "has_indoor": True,
            "mapvx_id": m["mapvx_id"],
            "stores_count": m["stores_count"],
            "floors_count": len(m["floors"]),
            "floors": m["floors"],
            "building_polygon": m["building_polygon"],
            "parauco": m.get("parauco"),
        })

    # Marker-only malls
    all_malls.extend(results)

    # Sort by name
    all_malls.sort(key=lambda x: x["name"])

    # Summary
    print(f"\n{'='*60}")
    print(f"ALL MALLS: {len(all_malls)}")
    print(f"{'='*60}")
    for m in all_malls:
        indoor = "INDOOR" if m["has_indoor"] else "marker"
        stores = m.get("stores_count", "—")
        size = m.get("parauco", {}).get("size", "—") if m.get("parauco") else "—"
        print(f"  {m['name']:<50} {indoor:<7} stores={str(stores):>5}  size={size}")

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(all_malls, f, ensure_ascii=False, indent=2)
    print(f"\nSaved: {OUTPUT_FILE}")


if __name__ == "__main__":
    asyncio.run(main())
