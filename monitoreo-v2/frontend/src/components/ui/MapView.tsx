import { useRef, useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Building } from '../../types/building';

const SANTIAGO_CENTER: [number, number] = [-70.6693, -33.4489];
const DEFAULT_ZOOM = 6;
const DEFAULT_PITCH = 50;

const INDOOR_TILES_URL = 'https://tiles.mapvx.com/tiles/{z}/{x}/{y}.pbf';

export interface MapPolygon {
  id: string;
  label: string;
  /** Each coordinate is [lat, lng] */
  coordinates: [number, number][];
  color?: string;
  opacity?: number;
}

export interface IndoorConfig {
  /** Floor key to filter indoor areas (e.g. "-Ok-zJ4XAd3cBJhlBZti") */
  floorKey: string;
  /** Fill color for indoor areas */
  fillColor?: string;
  /** Fill opacity */
  fillOpacity?: number;
  /** Line color for borders */
  lineColor?: string;
}

interface MapViewProps {
  buildings: Building[];
  polygons?: MapPolygon[];
  indoor?: IndoorConfig;
  center?: [number, number];
  zoom?: number;
  pitch?: number;
  className?: string;
}

function buildStyle(
  polygons: MapPolygon[],
  indoor?: IndoorConfig,
): maplibregl.StyleSpecification {
  const sources: Record<string, maplibregl.SourceSpecification> = {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    },
  };

  const layers: maplibregl.LayerSpecification[] = [
    {
      id: 'osm-tiles',
      type: 'raster',
      source: 'osm',
      minzoom: 0,
      maxzoom: 19,
    },
  ];

  // Static polygons (e.g. mall perimeters)
  polygons.forEach((poly) => {
    const sourceId = `polygon-${poly.id}`;
    const ring = poly.coordinates.map(([lat, lng]) => [lng, lat] as [number, number]);

    sources[sourceId] = {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: { label: poly.label },
        geometry: { type: 'Polygon', coordinates: [ring] },
      },
    };

    layers.push({
      id: `polygon-fill-${poly.id}`,
      type: 'fill',
      source: sourceId,
      paint: {
        'fill-color': poly.color ?? '#3b82f6',
        'fill-opacity': poly.opacity ?? 0.25,
      },
    });

    layers.push({
      id: `polygon-line-${poly.id}`,
      type: 'line',
      source: sourceId,
      paint: {
        'line-color': poly.color ?? '#3b82f6',
        'line-width': 2,
        'line-opacity': 0.8,
      },
    });
  });

  // Indoor vector tiles (MapVX / indoorequal)
  if (indoor) {
    sources['indoor'] = {
      type: 'vector',
      tiles: [INDOOR_TILES_URL],
      minzoom: 14,
      maxzoom: 20,
    };

    const floorFilter = ['==', ['get', 'floor_key'], indoor.floorKey];

    layers.push({
      id: 'indoor-area-fill',
      type: 'fill',
      source: 'indoor',
      'source-layer': 'area',
      filter: floorFilter,
      paint: {
        'fill-color': indoor.fillColor ?? '#e0e7ff',
        'fill-opacity': indoor.fillOpacity ?? 0.6,
      },
      minzoom: 15,
    });

    layers.push({
      id: 'indoor-area-line',
      type: 'line',
      source: 'indoor',
      'source-layer': 'area',
      filter: floorFilter,
      paint: {
        'line-color': indoor.lineColor ?? '#6366f1',
        'line-width': 1,
        'line-opacity': 0.7,
      },
      minzoom: 15,
    });

    layers.push({
      id: 'indoor-area-label',
      type: 'symbol',
      source: 'indoor',
      'source-layer': 'area_name',
      filter: ['==', ['get', 'floor_key'], indoor.floorKey],
      layout: {
        'text-field': ['get', 'name'],
        'text-size': 11,
        'text-allow-overlap': false,
        'text-padding': 2,
      },
      paint: {
        'text-color': '#1e1b4b',
        'text-halo-color': '#ffffff',
        'text-halo-width': 1.5,
      },
      minzoom: 17,
    });

    layers.push({
      id: 'indoor-poi',
      type: 'circle',
      source: 'indoor',
      'source-layer': 'poi',
      filter: ['==', ['get', 'floor_key'], indoor.floorKey],
      paint: {
        'circle-radius': 3,
        'circle-color': '#818cf8',
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 1,
      },
      minzoom: 17,
    });
  }

  return { version: 8, sources, layers };
}

export function MapView({
  buildings,
  polygons = [],
  indoor,
  center = SANTIAGO_CENTER,
  zoom = DEFAULT_ZOOM,
  pitch = DEFAULT_PITCH,
  className = '',
}: Readonly<MapViewProps>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const map = new maplibregl.Map({
      container,
      style: buildStyle(polygons, indoor),
      center,
      zoom,
      pitch,
      bearing: -10,
      antialias: true,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [center, zoom, pitch, polygons, indoor]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const geoBuildings = buildings.filter(
      (b): b is Building & { latitude: number; longitude: number } =>
        b.latitude != null && b.longitude != null,
    );

    markersRef.current = geoBuildings.map((b) => {
      const popup = new maplibregl.Popup({ offset: 25 }).setHTML(
        `<div style="font-family:Inter,system-ui,sans-serif;padding:4px 0">
          <strong style="font-size:14px">${escapeHtml(b.name)}</strong>
          ${b.address ? `<p style="margin:4px 0 0;font-size:12px;color:#666">${escapeHtml(b.address)}</p>` : ''}
          <p style="margin:4px 0 0;font-size:11px;color:#999">${b.code}</p>
        </div>`,
      );

      return new maplibregl.Marker({ color: '#22c55e' })
        .setLngLat([b.longitude, b.latitude])
        .setPopup(popup)
        .addTo(map);
    });
  }, [buildings]);

  return <div ref={containerRef} className={`h-full w-full ${className}`} />;
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}
