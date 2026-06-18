import { useRef, useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Building } from '../../types/building';

const SANTIAGO_CENTER: [number, number] = [-70.6693, -33.4489];
const DEFAULT_ZOOM = 6;
const DEFAULT_PITCH = 50;

const OSM_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    },
  },
  layers: [
    {
      id: 'osm-tiles',
      type: 'raster',
      source: 'osm',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

interface MapViewProps {
  buildings: Building[];
  center?: [number, number];
  zoom?: number;
  pitch?: number;
  className?: string;
}

export function MapView({
  buildings,
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
      style: OSM_STYLE,
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
  }, [center, zoom, pitch]);

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
