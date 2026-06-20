export interface MapvxFloor {
  externalKey: string;
  label: string;
  level: number;
  isDefault: boolean;
}

export interface MapvxMall {
  id: string;
  externalId: string;
  name: string;
  centerLat: number;
  centerLng: number;
  polygonCoords: number[][] | null;
  hasIndoor: boolean;
  address: string | null;
  sizeText: string | null;
  imageUrl: string | null;
  floors: MapvxFloor[];
}

export interface MapvxStore {
  id: string;
  title: string;
  lat: number;
  lng: number;
  floorKey: string;
  category: string;
}

export interface MapvxGeometry {
  type: 'FeatureCollection';
  features: unknown[];
}
