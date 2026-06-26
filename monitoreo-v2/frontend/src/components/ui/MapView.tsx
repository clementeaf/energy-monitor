import { useRef, useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Building } from '../../types/building';
import type { MapvxMall } from '../../types/mapvx';

const SANTIAGO_CENTER: [number, number] = [-70.6693, -33.4489];
const DEFAULT_ZOOM = 6;
const DEFAULT_PITCH = 50;

const INDOOR_TILES_URL = 'http://localhost:4000/api/mapvx/tiles/{z}/{x}/{y}.pbf';

const HIGHLIGHT_SOURCE = 'highlight-area';
const HIGHLIGHT_FILL = 'highlight-area-fill';
const HIGHLIGHT_LINE = 'highlight-area-line';

function clearHighlight(map: maplibregl.Map | null) {
  if (!map) return;
  try {
    if (map.getLayer(HIGHLIGHT_FILL)) map.removeLayer(HIGHLIGHT_FILL);
    if (map.getLayer(HIGHLIGHT_LINE)) map.removeLayer(HIGHLIGHT_LINE);
    if (map.getSource(HIGHLIGHT_SOURCE)) map.removeSource(HIGHLIGHT_SOURCE);
  } catch { /* map destroyed */ }
}

export interface MapPolygon {
  id: string;
  label: string;
  /** Each coordinate is [lat, lng] */
  coordinates: [number, number][];
  color?: string;
  opacity?: number;
}

export interface IndoorConfig {
  floorKey: string;
}

export interface SelectedPoint {
  lng: number;
  lat: number;
  label: string;
}

/** Per-building enrichment for markers (color, popup content, click handler). */
export interface BuildingMarkerMeta {
  color: string;
  popupHtml?: string;
}

interface MapViewProps {
  buildings: Building[];
  mallMarkers?: MapvxMall[];
  polygons?: MapPolygon[];
  indoor?: IndoorConfig;
  selectedPoint?: SelectedPoint | null;
  center?: [number, number];
  zoom?: number;
  pitch?: number;
  className?: string;
  /** Per-building marker overrides keyed by building.id */
  buildingMeta?: ReadonlyMap<string, BuildingMarkerMeta>;
  /** Fires when a building marker is clicked */
  onBuildingClick?: (buildingId: string) => void;
}

function buildStyle(
  polygons: MapPolygon[],
  indoor?: IndoorConfig,
): maplibregl.StyleSpecification {
  const sources: Record<string, maplibregl.SourceSpecification> = {
    osm: {
      type: 'raster',
      tiles: ['https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
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

  // Indoor vector tiles from our cached PBF endpoint
  if (indoor) {
    sources['indoor'] = {
      type: 'vector',
      tiles: [INDOOR_TILES_URL],
      minzoom: 14,
      maxzoom: 19,
    };

    const floorFilter: maplibregl.FilterSpecification = ['==', ['get', 'floor_key'], indoor.floorKey] as maplibregl.FilterSpecification;

    layers.push({
      id: 'indoor-area-fill',
      type: 'fill',
      source: 'indoor',
      'source-layer': 'area',
      filter: floorFilter,
      paint: { 'fill-color': '#e0e7ff', 'fill-opacity': 0.6 },
      minzoom: 15,
    });

    layers.push({
      id: 'indoor-area-line',
      type: 'line',
      source: 'indoor',
      'source-layer': 'area',
      filter: floorFilter,
      paint: { 'line-color': '#6366f1', 'line-width': 1, 'line-opacity': 0.7 },
      minzoom: 15,
    });

    layers.push({
      id: 'indoor-label',
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
      id: 'indoor-poi-circle',
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

    layers.push({
      id: 'indoor-transport-line',
      type: 'line',
      source: 'indoor',
      'source-layer': 'transportation',
      filter: ['==', ['get', 'floor_key'], indoor.floorKey],
      paint: { 'line-color': '#a5b4fc', 'line-width': 2, 'line-dasharray': [2, 2] },
      minzoom: 16,
    });
  }

  return { version: 8, sources, layers };
}

export function MapView({
  buildings,
  mallMarkers = [],
  polygons = [],
  indoor,
  selectedPoint,
  center = SANTIAGO_CENTER,
  zoom = DEFAULT_ZOOM,
  pitch = DEFAULT_PITCH,
  className = '',
  buildingMeta,
  onBuildingClick,
}: Readonly<MapViewProps>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const mallMarkersRef = useRef<maplibregl.Marker[]>([]);
  const selectedMarkerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const map = new maplibregl.Map({
      container,
      style: buildStyle(polygons, indoor),
      center,
      zoom,
      pitch,
      bearing: 0,
      maxZoom: 18.5,
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
      const meta = buildingMeta?.get(b.id);
      const popupContent = meta?.popupHtml ?? `<div style="font-family:Inter,system-ui,sans-serif;padding:4px 0">
          <strong style="font-size:14px">${escapeHtml(b.name)}</strong>
          ${b.address ? `<p style="margin:4px 0 0;font-size:12px;color:#666">${escapeHtml(b.address)}</p>` : ''}
          <p style="margin:4px 0 0;font-size:11px;color:#999">${b.code}</p>
        </div>`;
      const popup = new maplibregl.Popup({ offset: 25 }).setHTML(popupContent);
      const markerColor = meta?.color ?? '#22c55e';

      const marker = new maplibregl.Marker({ color: markerColor })
        .setLngLat([b.longitude, b.latitude])
        .setPopup(popup)
        .addTo(map);

      if (onBuildingClick) {
        marker.getElement().addEventListener('click', () => onBuildingClick(b.id));
      }

      return marker;
    });
  }, [buildings, buildingMeta, onBuildingClick]);

  // Mall markers (marker-only malls without indoor)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    mallMarkersRef.current.forEach((m) => m.remove());
    mallMarkersRef.current = [];

    mallMarkersRef.current = mallMarkers.map((m) => {
      const sizeHtml = m.sizeText
        ? `<p style="margin:4px 0 0;font-size:12px;color:#6366f1;font-weight:600">${escapeHtml(m.sizeText)}</p>`
        : '';
      const addrHtml = m.address
        ? `<p style="margin:4px 0 0;font-size:11px;color:#666">${escapeHtml(m.address)}</p>`
        : '';

      const popup = new maplibregl.Popup({ offset: 25 }).setHTML(
        `<div style="font-family:Inter,system-ui,sans-serif;padding:4px 0">
          <strong style="font-size:13px">${escapeHtml(m.name)}</strong>
          ${sizeHtml}${addrHtml}
        </div>`,
      );

      return new maplibregl.Marker({ color: '#f59e0b' })
        .setLngLat([m.centerLng, m.centerLat])
        .setPopup(popup)
        .addTo(map);
    });
  }, [mallMarkers]);

  useEffect(() => {
    const map = mapRef.current;
    selectedMarkerRef.current?.remove();
    selectedMarkerRef.current = null;
    clearHighlight(map);

    if (!map || !selectedPoint) return;

    selectedMarkerRef.current = new maplibregl.Marker({ color: '#ef4444', scale: 1.2 })
      .setLngLat([selectedPoint.lng, selectedPoint.lat])
      .addTo(map);

    map.flyTo({
      center: [selectedPoint.lng, selectedPoint.lat],
      zoom: 18.5,
      speed: 1.5,
    });

    const highlightArea = () => {
      const point = map.project([selectedPoint.lng, selectedPoint.lat]);
      const features = map.queryRenderedFeatures(point, { layers: ['indoor-area-fill'] });
      const match = features[0];

      const areaSqm = match ? getPolygonArea(match.geometry) : 0;
      const areaText = areaSqm > 0
        ? `<p style="margin:4px 0 0;font-size:12px;color:#6366f1;font-weight:600">${formatArea(areaSqm)} m²</p>`
        : '';

      const popup = new maplibregl.Popup({ offset: 30 }).setHTML(
        `<div style="font-family:Inter,system-ui,sans-serif;padding:4px 0">
          <strong style="font-size:13px">${escapeHtml(selectedPoint.label)}</strong>
          ${areaText}
        </div>`,
      );
      selectedMarkerRef.current?.setPopup(popup).togglePopup();

      if (!match) return;

      clearHighlight(map);

      map.addSource(HIGHLIGHT_SOURCE, {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: match.geometry },
      });

      map.addLayer({
        id: HIGHLIGHT_FILL,
        type: 'fill',
        source: HIGHLIGHT_SOURCE,
        paint: { 'fill-color': '#ef4444', 'fill-opacity': 0.35 },
      });

      map.addLayer({
        id: HIGHLIGHT_LINE,
        type: 'line',
        source: HIGHLIGHT_SOURCE,
        paint: { 'line-color': '#ef4444', 'line-width': 3, 'line-opacity': 0.9 },
      });
    };

    map.once('idle', highlightArea);
  }, [selectedPoint]);

  return <div ref={containerRef} className={`h-full w-full ${className}`} />;
}

/** Geodesic polygon area via Shoelace on spherical coordinates (m²). */
function computeAreaSqm(coords: number[][]): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  let area = 0;
  const n = coords.length;
  for (let i = 0; i < n; i++) {
    const [lng1, lat1] = coords[i];
    const [lng2, lat2] = coords[(i + 1) % n];
    area += toRad(lng2 - lng1) * (2 + Math.sin(toRad(lat1)) + Math.sin(toRad(lat2)));
  }
  return Math.abs((area * R * R) / 2);
}

function getPolygonArea(geometry: { type: string; coordinates: number[][][] | number[][][][] }): number {
  if (geometry.type === 'Polygon') return computeAreaSqm((geometry.coordinates as number[][][])[0]);
  if (geometry.type === 'MultiPolygon') {
    return (geometry.coordinates as number[][][][]).reduce((sum: number, poly: number[][][]) => sum + computeAreaSqm(poly[0]), 0);
  }
  return 0;
}

function formatArea(sqm: number): string {
  return sqm.toLocaleString('es-CL', { maximumFractionDigits: 1 });
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}
