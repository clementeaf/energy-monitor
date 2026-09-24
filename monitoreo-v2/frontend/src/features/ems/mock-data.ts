export interface Centro {
  id: string;
  name: string;
  cliente: string;
  comuna: string;
  superficie: number;
  consumoMes: number;
  margen: number;
  margenPct: number;
  estado: 'operativo' | 'advertencia' | 'alarma';
  remarcadores: number;
  costoCompra: number;
  precioVenta: number;
  intensidad: number;
}

export interface Remarcador {
  id: string;
  code: string;
  centroId: string;
  centroName: string;
  modelo: string;
  signal: number;
  ultimaLectura: string;
  estado: 'conectado' | 'sin_senal' | 'caido';
  consumoHoy: number[];
}

export const CENTROS: Centro[] = [
  { id: 'c1', name: 'Centro Costanera', cliente: 'Retail Costanera SpA', comuna: 'Santiago', superficie: 14200, consumoMes: 184.2, margen: 5.6, margenPct: 21.0, estado: 'operativo', remarcadores: 2, costoCompra: 21.1, precioVenta: 26.7, intensidad: 13.0 },
  { id: 'c2', name: 'Sucursal Maipú', cliente: 'Retail Costanera SpA', comuna: 'Maipú', superficie: 8500, consumoMes: 96.4, margen: 2.2, margenPct: 16.7, estado: 'operativo', remarcadores: 1, costoCompra: 11.1, precioVenta: 13.3, intensidad: 11.3 },
  { id: 'c3', name: 'Planta Quilicura', cliente: 'Alimentos Andes Ltda.', comuna: 'Quilicura', superficie: 22000, consumoMes: 342.7, margen: 5.7, margenPct: 12.7, estado: 'advertencia', remarcadores: 2, costoCompra: 39.2, precioVenta: 44.9, intensidad: 15.6 },
  { id: 'c4', name: 'Centro Vitacura', cliente: 'Grupo Norte S.A.', comuna: 'Vitacura', superficie: 6800, consumoMes: 71.8, margen: 2.7, margenPct: 24.3, estado: 'operativo', remarcadores: 1, costoCompra: 8.4, precioVenta: 11.1, intensidad: 10.6 },
  { id: 'c5', name: 'Bodega San Bernardo', cliente: 'Logística Sur SpA', comuna: 'San Bernardo', superficie: 18500, consumoMes: 128.9, margen: 1.2, margenPct: 7.4, estado: 'alarma', remarcadores: 2, costoCompra: 15.0, precioVenta: 16.2, intensidad: 7.0 },
  { id: 'c6', name: 'Local Providencia', cliente: 'Grupo Norte S.A.', comuna: 'Providencia', superficie: 3200, consumoMes: 43.5, margen: 1.9, margenPct: 27.2, estado: 'operativo', remarcadores: 1, costoCompra: 5.1, precioVenta: 7.0, intensidad: 13.6 },
];

export const REMARCADORES: Remarcador[] = [
  { id: 'r1', code: 'MTR-04821', centroId: 'c1', centroName: 'Centro Costanera', modelo: 'PWR-M3', signal: 94, ultimaLectura: '12:45:30', estado: 'conectado', consumoHoy: [12, 15, 18, 22, 45, 78, 110, 142, 165, 180, 175, 168, 155, 148, 152, 160, 172, 185, 153, 120, 95, 72, 48, 28] },
  { id: 'r2', code: 'MTR-04822', centroId: 'c1', centroName: 'Centro Costanera', modelo: 'PWR-M3', signal: 88, ultimaLectura: '12:43:02', estado: 'conectado', consumoHoy: [8, 10, 12, 15, 30, 55, 85, 108, 125, 140, 135, 130, 120, 115, 118, 125, 132, 140, 118, 90, 70, 52, 35, 20] },
  { id: 'r3', code: 'MTR-01180', centroId: 'c2', centroName: 'Sucursal Maipú', modelo: 'PWR-M2', signal: 71, ultimaLectura: '12:41:55', estado: 'conectado', consumoHoy: [5, 6, 7, 9, 20, 38, 62, 80, 95, 105, 100, 98, 90, 85, 88, 92, 98, 104, 88, 65, 50, 38, 25, 15] },
  { id: 'r4', code: 'MTR-02204', centroId: 'c3', centroName: 'Planta Quilicura', modelo: 'PWR-M5i', signal: 96, ultimaLectura: '12:46:10', estado: 'conectado', consumoHoy: [25, 28, 30, 35, 80, 145, 195, 240, 280, 310, 305, 298, 275, 260, 268, 280, 295, 315, 270, 210, 165, 125, 85, 50] },
  { id: 'r5', code: 'MTR-02205', centroId: 'c3', centroName: 'Planta Quilicura', modelo: 'PWR-M5i', signal: 21, ultimaLectura: '12:04:11', estado: 'sin_senal', consumoHoy: [20, 22, 25, 28, 65, 120, 160, 200, 230, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { id: 'r6', code: 'MTR-02610', centroId: 'c4', centroName: 'Centro Vitacura', modelo: 'PWR-M2', signal: 83, ultimaLectura: '12:44:20', estado: 'conectado', consumoHoy: [4, 5, 6, 7, 18, 32, 52, 68, 80, 90, 85, 82, 75, 70, 72, 78, 82, 88, 74, 55, 42, 32, 22, 12] },
  { id: 'r7', code: 'MTR-03310', centroId: 'c5', centroName: 'Bodega San Bernardo', modelo: 'PWR-M3', signal: 0, ultimaLectura: '09:33:02', estado: 'caido', consumoHoy: [18, 20, 22, 25, 58, 105, 140, 175, 200, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { id: 'r8', code: 'MTR-03311', centroId: 'c5', centroName: 'Bodega San Bernardo', modelo: 'PWR-M3', signal: 77, ultimaLectura: '12:42:31', estado: 'conectado', consumoHoy: [15, 17, 19, 22, 50, 92, 125, 155, 180, 195, 190, 185, 172, 165, 168, 175, 185, 198, 170, 130, 100, 78, 55, 32] },
  { id: 'r9', code: 'MTR-00450', centroId: 'c6', centroName: 'Local Providencia', modelo: 'PWR-M2', signal: 91, ultimaLectura: '12:44:58', estado: 'conectado', consumoHoy: [3, 4, 4, 5, 12, 22, 35, 45, 55, 62, 60, 58, 52, 48, 50, 54, 58, 62, 52, 38, 28, 22, 15, 8] },
];

export const RESUMEN_KPIS = {
  consumoMes: 867.5,
  consumoDelta: 4.2,
  gastoCompra: 99.5,
  gastoDelta: 3.1,
  margenEstimado: 19.3,
  margenDelta: 16.2,
  centrosActivos: 6,
  centrosDelta: 1,
  remarcadoresConectados: 7,
  remarcadoresTotal: 9,
  remarcadoresCaidos: 1,
  remarcadoresSinSenal: 1,
  peakDemanda: 1628,
  peakHora: '16:00',
  alertasActivas: 5,
  alertasCriticas: 2,
};

export const CURVA_CARGA_GLOBAL = [
  0, 0, 0, 0, 15, 42, 180, 420, 680, 920, 1050, 1120, 1180, 1220, 1280, 1350, 1628, 1520, 1380, 1100, 850, 580, 320, 120,
];
