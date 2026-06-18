import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import type { Building } from '../../types/building';

const mockAddControl = vi.fn();
const mockRemove = vi.fn();
const mockMarkerSetLngLat = vi.fn().mockReturnThis();
const mockMarkerSetPopup = vi.fn().mockReturnThis();
const mockMarkerAddTo = vi.fn().mockReturnThis();
const mockMarkerRemove = vi.fn();
const mockPopupSetHTML = vi.fn().mockReturnThis();

vi.mock('maplibre-gl', () => ({
  default: {
    Map: vi.fn().mockImplementation(() => ({
      addControl: mockAddControl,
      remove: mockRemove,
    })),
    NavigationControl: vi.fn(),
    Marker: vi.fn().mockImplementation(() => ({
      setLngLat: mockMarkerSetLngLat,
      setPopup: mockMarkerSetPopup,
      addTo: mockMarkerAddTo,
      remove: mockMarkerRemove,
    })),
    Popup: vi.fn().mockImplementation(() => ({
      setHTML: mockPopupSetHTML,
    })),
  },
}));

vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}));

const BUILDING_WITH_COORDS: Building = {
  id: 'b1',
  tenantId: 't1',
  name: 'Test Building',
  code: 'TB',
  address: 'Av. Test 123',
  areaSqm: '5000',
  regionId: null,
  countryCode: 'CL',
  timezone: 'America/Santiago',
  externalSiteId: null,
  siteKind: null,
  latitude: -33.45,
  longitude: -70.67,
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const BUILDING_NO_COORDS: Building = {
  ...BUILDING_WITH_COORDS,
  id: 'b2',
  name: 'No Coords',
  latitude: null,
  longitude: null,
};

describe('MapView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders container div', async () => {
    const { MapView } = await import('./MapView');
    const { container } = render(<MapView buildings={[]} />);
    expect(container.firstElementChild).toBeTruthy();
  });

  it('creates map instance on mount', async () => {
    const maplibregl = (await import('maplibre-gl')).default;
    const { MapView } = await import('./MapView');
    render(<MapView buildings={[]} />);
    expect(maplibregl.Map).toHaveBeenCalledTimes(1);
    expect(mockAddControl).toHaveBeenCalledTimes(1);
  });

  it('removes map on unmount', async () => {
    const { MapView } = await import('./MapView');
    const { unmount } = render(<MapView buildings={[]} />);
    unmount();
    expect(mockRemove).toHaveBeenCalledTimes(1);
  });

  it('creates markers only for buildings with coordinates', async () => {
    const maplibregl = (await import('maplibre-gl')).default;
    const { MapView } = await import('./MapView');
    render(<MapView buildings={[BUILDING_WITH_COORDS, BUILDING_NO_COORDS]} />);
    expect(maplibregl.Marker).toHaveBeenCalledTimes(1);
    expect(mockMarkerSetLngLat).toHaveBeenCalledWith([-70.67, -33.45]);
    expect(mockMarkerAddTo).toHaveBeenCalledTimes(1);
  });

  it('creates popup with escaped building name and address', async () => {
    const { MapView } = await import('./MapView');
    render(<MapView buildings={[BUILDING_WITH_COORDS]} />);
    expect(mockPopupSetHTML).toHaveBeenCalledTimes(1);
    const html = mockPopupSetHTML.mock.calls[0][0] as string;
    expect(html).toContain('Test Building');
    expect(html).toContain('Av. Test 123');
    expect(html).toContain('TB');
  });

  it('escapes HTML in building names', async () => {
    const xssBuilding: Building = {
      ...BUILDING_WITH_COORDS,
      name: '<script>alert("xss")</script>',
    };
    const { MapView } = await import('./MapView');
    render(<MapView buildings={[xssBuilding]} />);
    const html = mockPopupSetHTML.mock.calls[0][0] as string;
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('applies custom className', async () => {
    const { MapView } = await import('./MapView');
    const { container } = render(<MapView buildings={[]} className="custom-class" />);
    expect(container.firstElementChild!.className).toContain('custom-class');
  });
});
