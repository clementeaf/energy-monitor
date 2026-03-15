export interface StoreComparison {
  brand: string;
  building: string;
  consumoKwh: number;
  gastoClp: number;
  metros: number;
}

export const MONTHS = ['Oct-25', 'Nov-25', 'Dic-25', 'Ene-26', 'Feb-26', 'Mar-26'] as const;

export const BRANDS = [
  'Adidas',
  'Nike',
  'H&M',
  'Zara',
  'Falabella',
  'Ripley',
  'Starbucks',
  'McDonald\'s',
  'Cinemark',
  'Cruz Verde',
] as const;

const BUILDINGS = [
  'Parque Arauco Kennedy',
  'Arauco Maipú',
  'Arauco Estación',
  'Arauco Quilicura',
  'Arauco Premium Outlet Buenaventura',
  'Puerto Nuevo Antofagasta',
];

// Base consumo por marca (kWh/mes) — varía por edificio y mes
const BRAND_BASE: Record<string, { consumoKwh: number; gastoClp: number; metros: number }> = {
  'Adidas':      { consumoKwh: 4_200, gastoClp: 630_000, metros: 180 },
  'Nike':        { consumoKwh: 4_800, gastoClp: 720_000, metros: 210 },
  'H&M':         { consumoKwh: 6_100, gastoClp: 915_000, metros: 350 },
  'Zara':        { consumoKwh: 5_800, gastoClp: 870_000, metros: 320 },
  'Falabella':   { consumoKwh: 18_500, gastoClp: 2_775_000, metros: 2_400 },
  'Ripley':      { consumoKwh: 16_200, gastoClp: 2_430_000, metros: 2_100 },
  'Starbucks':   { consumoKwh: 3_100, gastoClp: 465_000, metros: 85 },
  'McDonald\'s': { consumoKwh: 5_400, gastoClp: 810_000, metros: 140 },
  'Cinemark':    { consumoKwh: 22_000, gastoClp: 3_300_000, metros: 1_800 },
  'Cruz Verde':  { consumoKwh: 2_800, gastoClp: 420_000, metros: 95 },
};

// Qué marcas están en qué edificios (no todas en todos)
const BRAND_BUILDINGS: Record<string, string[]> = {
  'Adidas':      ['Parque Arauco Kennedy', 'Arauco Maipú', 'Arauco Premium Outlet Buenaventura', 'Puerto Nuevo Antofagasta'],
  'Nike':        ['Parque Arauco Kennedy', 'Arauco Estación', 'Arauco Premium Outlet Buenaventura'],
  'H&M':         ['Parque Arauco Kennedy', 'Arauco Maipú', 'Arauco Quilicura', 'Puerto Nuevo Antofagasta'],
  'Zara':        ['Parque Arauco Kennedy', 'Arauco Maipú', 'Arauco Estación', 'Arauco Quilicura'],
  'Falabella':   BUILDINGS,
  'Ripley':      ['Parque Arauco Kennedy', 'Arauco Maipú', 'Arauco Estación', 'Arauco Quilicura', 'Puerto Nuevo Antofagasta'],
  'Starbucks':   BUILDINGS,
  'McDonald\'s': ['Parque Arauco Kennedy', 'Arauco Maipú', 'Arauco Estación', 'Arauco Quilicura', 'Arauco Premium Outlet Buenaventura'],
  'Cinemark':    ['Parque Arauco Kennedy', 'Arauco Maipú', 'Puerto Nuevo Antofagasta'],
  'Cruz Verde':  BUILDINGS,
};

// Factor por edificio (simula diferencias de tamaño/clima)
const BUILDING_FACTOR: Record<string, number> = {
  'Parque Arauco Kennedy': 1.00,
  'Arauco Maipú': 0.85,
  'Arauco Estación': 0.78,
  'Arauco Quilicura': 0.72,
  'Arauco Premium Outlet Buenaventura': 0.90,
  'Puerto Nuevo Antofagasta': 0.95,
};

// Factores estacionales (mismos que dashboard)
const SEASONAL: Record<string, number> = {
  'Oct-25': 0.92,
  'Nov-25': 0.95,
  'Dic-25': 1.08,
  'Ene-26': 1.03,
  'Feb-26': 0.97,
  'Mar-26': 1.00,
};

export function getStoreData(brand: string, month: string): StoreComparison[] {
  const base = BRAND_BASE[brand];
  const buildings = BRAND_BUILDINGS[brand];
  if (!base || !buildings) return [];

  const seasonal = SEASONAL[month] ?? 1.0;

  return buildings.map((building) => {
    const bf = BUILDING_FACTOR[building] ?? 0.8;
    return {
      brand,
      building,
      consumoKwh: Math.round(base.consumoKwh * bf * seasonal),
      gastoClp: Math.round(base.gastoClp * bf * seasonal),
      metros: Math.round(base.metros * (0.85 + bf * 0.15)),
    };
  });
}
