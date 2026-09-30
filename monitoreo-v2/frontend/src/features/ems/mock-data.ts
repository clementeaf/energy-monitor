interface Centro {
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

export const CENTROS: Centro[] = [
  { id: 'c1', name: 'Centro Costanera', cliente: 'Retail Costanera SpA', comuna: 'Santiago', superficie: 14200, consumoMes: 184.2, margen: 5.6, margenPct: 21.0, estado: 'operativo', remarcadores: 2, costoCompra: 21.1, precioVenta: 26.7, intensidad: 13.0 },
  { id: 'c2', name: 'Sucursal Maipú', cliente: 'Retail Costanera SpA', comuna: 'Maipú', superficie: 8500, consumoMes: 96.4, margen: 2.2, margenPct: 16.7, estado: 'operativo', remarcadores: 1, costoCompra: 11.1, precioVenta: 13.3, intensidad: 11.3 },
  { id: 'c3', name: 'Planta Quilicura', cliente: 'Alimentos Andes Ltda.', comuna: 'Quilicura', superficie: 22000, consumoMes: 342.7, margen: 5.7, margenPct: 12.7, estado: 'advertencia', remarcadores: 2, costoCompra: 39.2, precioVenta: 44.9, intensidad: 15.6 },
  { id: 'c4', name: 'Centro Vitacura', cliente: 'Grupo Norte S.A.', comuna: 'Vitacura', superficie: 6800, consumoMes: 71.8, margen: 2.7, margenPct: 24.3, estado: 'operativo', remarcadores: 1, costoCompra: 8.4, precioVenta: 11.1, intensidad: 10.6 },
  { id: 'c5', name: 'Bodega San Bernardo', cliente: 'Logística Sur SpA', comuna: 'San Bernardo', superficie: 18500, consumoMes: 128.9, margen: 1.2, margenPct: 7.4, estado: 'alarma', remarcadores: 2, costoCompra: 15.0, precioVenta: 16.2, intensidad: 7.0 },
  { id: 'c6', name: 'Local Providencia', cliente: 'Grupo Norte S.A.', comuna: 'Providencia', superficie: 3200, consumoMes: 43.5, margen: 1.9, margenPct: 27.2, estado: 'operativo', remarcadores: 1, costoCompra: 5.1, precioVenta: 7.0, intensidad: 13.6 },
];
