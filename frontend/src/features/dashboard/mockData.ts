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
}

export interface OverduePeriod {
  range: string;
  cantidad: number;
  saldoClp: number;
}

export const BUILDINGS_MONTHLY: BuildingMonthly[] = [
  { name: 'Parque Arauco Kennedy', consumoKwh: 1_245_320, gastoClp: 186_798_000, metros: 120_000, medidores: 446 },
  { name: 'Arauco Maipú', consumoKwh: 423_100, gastoClp: 63_465_000, metros: 42_000, medidores: 128 },
  { name: 'Arauco Estación', consumoKwh: 387_640, gastoClp: 58_146_000, metros: 38_500, medidores: 112 },
  { name: 'Arauco Express', consumoKwh: 198_500, gastoClp: 29_775_000, metros: 18_200, medidores: 64 },
  { name: 'Arauco Chillán', consumoKwh: 312_800, gastoClp: 46_920_000, metros: 31_000, medidores: 96 },
  { name: 'Arauco Quilicura', consumoKwh: 275_400, gastoClp: 41_310_000, metros: 27_500, medidores: 84 },
  { name: 'Arauco El Bosque', consumoKwh: 245_600, gastoClp: 36_840_000, metros: 24_800, medidores: 76 },
  { name: 'Arauco Coronel', consumoKwh: 189_200, gastoClp: 28_380_000, metros: 19_500, medidores: 58 },
  { name: 'Arauco Premium Outlet Buenaventura', consumoKwh: 356_700, gastoClp: 53_505_000, metros: 35_200, medidores: 104 },
  { name: 'Arauco San Antonio', consumoKwh: 167_300, gastoClp: 25_095_000, metros: 16_800, medidores: 52 },
  { name: 'Parque Angamos', consumoKwh: 298_100, gastoClp: 44_715_000, metros: 29_600, medidores: 92 },
  { name: 'Arauco Premium Outlet San Pedro', consumoKwh: 334_500, gastoClp: 50_175_000, metros: 33_400, medidores: 98 },
  { name: 'Puerto Nuevo Antofagasta', consumoKwh: 412_600, gastoClp: 61_890_000, metros: 41_000, medidores: 124 },
  { name: 'Arauco Premium Outlet Curauma', consumoKwh: 287_900, gastoClp: 43_185_000, metros: 28_700, medidores: 88 },
  { name: 'Arauco Premium Outlet Coquimbo', consumoKwh: 264_300, gastoClp: 39_645_000, metros: 26_300, medidores: 80 },
];

export const SUMMARY_CARDS: SummaryCard[] = [
  { label: 'Pagos Recibidos', value: '$412.560.000', description: 'Mes actual' },
  { label: 'Docs por Vencer', value: '23', description: 'Próximos 30 días' },
  { label: 'Docs Vencidos', value: '8', description: 'Total pendiente' },
];

export const OVERDUE_BY_PERIOD: OverduePeriod[] = [
  { range: '1 – 30 días', cantidad: 3, saldoClp: 4_520_000 },
  { range: '31 – 60 días', cantidad: 2, saldoClp: 3_180_000 },
  { range: '61 – 90 días', cantidad: 1, saldoClp: 1_750_000 },
  { range: '91 – 120 días', cantidad: 1, saldoClp: 2_340_000 },
  { range: '> 120 días', cantidad: 1, saldoClp: 5_120_000 },
];
