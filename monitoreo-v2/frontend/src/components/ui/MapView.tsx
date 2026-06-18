import { useRef, useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Building } from '../../types/building';

const SANTIAGO_CENTER: [number, number] = [-70.6693, -33.4489];
const DEFAULT_ZOOM = 6;
const DEFAULT_PITCH = 50;

export interface MapPolygon {
  id: string;
  label: string;
  /** Each coordinate is [lat, lng] */
  coordinates: [number, number][];
  color?: string;
  opacity?: number;
}

interface MapViewProps {
  buildings: Building[];
  polygons?: MapPolygon[];
  center?: [number, number];
  zoom?: number;
  pitch?: number;
  className?: string;
}

function buildStyle(polygons: MapPolygon[]): maplibregl.StyleSpecification {
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

  return { version: 8, sources, layers };
}

export function MapView({
  buildings,
  polygons = [],
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
      style: buildStyle(polygons),
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
  }, [center, zoom, pitch, polygons]);

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
