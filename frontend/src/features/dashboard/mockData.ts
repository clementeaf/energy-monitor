export interface BuildingMonthly {
  name: string;
  consumoKwh: number;
  gastoClp: number;
  metros: number;
  medidores: number;
}

export interface SummaryCard {
  label: string;
  value: string;
  description: string;
  updatedAt: string;
}

export interface OverduePeriod {
  range: string;
  cantidad: number;
  saldoClp: number;
}

export const MONTHS = ['Oct-25', 'Nov-25', 'Dic-25', 'Ene-26', 'Feb-26', 'Mar-26'] as const;

const BUILDING_NAMES = [
  'Parque Arauco Kennedy',
  'Arauco Maipú',
  'Arauco Estación',
  'Arauco Express',
  'Arauco Chillán',
  'Arauco Quilicura',
  'Arauco El Bosque',
  'Arauco Coronel',
  'Arauco Premium Outlet Buenaventura',
  'Arauco San Antonio',
  'Parque Angamos',
  'Arauco Premium Outlet San Pedro',
  'Puerto Nuevo Antofagasta',
  'Arauco Premium Outlet Curauma',
  'Arauco Premium Outlet Coquimbo',
];

// Base data (Mar-26) + factores por mes para variación estacional
const BASE: { consumoKwh: number; gastoClp: number; metros: number; medidores: number }[] = [
  { consumoKwh: 1_245_320, gastoClp: 186_798_000, metros: 120_000, medidores: 446 },
  { consumoKwh: 423_100, gastoClp: 63_465_000, metros: 42_000, medidores: 128 },
  { consumoKwh: 387_640, gastoClp: 58_146_000, metros: 38_500, medidores: 112 },
  { consumoKwh: 198_500, gastoClp: 29_775_000, metros: 18_200, medidores: 64 },
  { consumoKwh: 312_800, gastoClp: 46_920_000, metros: 31_000, medidores: 96 },
  { consumoKwh: 275_400, gastoClp: 41_310_000, metros: 27_500, medidores: 84 },
  { consumoKwh: 245_600, gastoClp: 36_840_000, metros: 24_800, medidores: 76 },
  { consumoKwh: 189_200, gastoClp: 28_380_000, metros: 19_500, medidores: 58 },
  { consumoKwh: 356_700, gastoClp: 53_505_000, metros: 35_200, medidores: 104 },
  { consumoKwh: 167_300, gastoClp: 25_095_000, metros: 16_800, medidores: 52 },
  { consumoKwh: 298_100, gastoClp: 44_715_000, metros: 29_600, medidores: 92 },
  { consumoKwh: 334_500, gastoClp: 50_175_000, metros: 33_400, medidores: 98 },
  { consumoKwh: 412_600, gastoClp: 61_890_000, metros: 41_000, medidores: 124 },
  { consumoKwh: 287_900, gastoClp: 43_185_000, metros: 28_700, medidores: 88 },
  { consumoKwh: 264_300, gastoClp: 39_645_000, metros: 26_300, medidores: 80 },
];

// Factores estacionales por mes (Oct=verano alto, Dic=pico, Feb=bajón)
const SEASONAL = [0.92, 0.95, 1.08, 1.03, 0.97, 1.00];

export const BUILDINGS_BY_MONTH: Record<string, BuildingMonthly[]> = {};
for (let m = 0; m < MONTHS.length; m++) {
  BUILDINGS_BY_MONTH[MONTHS[m]] = BUILDING_NAMES.map((name, i) => ({
    name,
    consumoKwh: Math.round(BASE[i].consumoKwh * SEASONAL[m]),
    gastoClp: Math.round(BASE[i].gastoClp * SEASONAL[m]),
    metros: BASE[i].metros,
    medidores: BASE[i].medidores,
  }));
}

// Retrocompatibilidad: mes actual
export const BUILDINGS_MONTHLY = BUILDINGS_BY_MONTH['Mar-26'];

export const SUMMARY_CARDS: SummaryCard[] = [
  { label: 'Pagos Recibidos', value: '$412.560.000', description: 'Mes actual', updatedAt: '14/03/2026 08:32' },
  { label: 'Docs por Vencer', value: '23', description: 'Próximos 30 días', updatedAt: '14/03/2026 09:15' },
  { label: 'Docs Vencidos', value: '8', description: 'Total pendiente', updatedAt: '14/03/2026 07:45' },
];

export const OVERDUE_BY_PERIOD: OverduePeriod[] = [
  { range: 'Dentro del plazo', cantidad: 12, saldoClp: 18_450_000 },
  { range: 'Vencido 1 a 7 días', cantidad: 4, saldoClp: 5_320_000 },
  { range: 'Vencido 8 a 15 días', cantidad: 3, saldoClp: 4_180_000 },
  { range: 'Vencido 16 a 30 días', cantidad: 2, saldoClp: 3_740_000 },
  { range: 'Vencido 31 a 60 días', cantidad: 2, saldoClp: 3_180_000 },
  { range: 'Vencido 61 a 90 días', cantidad: 1, saldoClp: 1_750_000 },
  { range: 'Vencido sobre 90 días', cantidad: 1, saldoClp: 5_120_000 },
];
