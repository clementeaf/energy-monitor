export interface Tarifa {
  cliente: string;
  compraClpKwh: number;
  ventaClpKwh: number;
}

export interface MargenCentro {
  costoCompraClp: number;
  precioVentaClp: number;
  margenClp: number;
  margenPct: number;
}

export const TARIFAS_POR_CENTRO: Record<string, Tarifa> = {
  'VE-ALTOPENA': { cliente: 'Cliente Alto Peñalolén', compraClpKwh: 118, ventaClpKwh: 146 },
  'VE-REN': { cliente: 'Cliente Hotel Renaissance', compraClpKwh: 121, ventaClpKwh: 158 },
  'VE-QUILICURA': { cliente: 'Cliente Quilicura', compraClpKwh: 112, ventaClpKwh: 125 },
};

export function calcularMargen(consumoKwh: number, tarifa: Tarifa): MargenCentro {
  const costoCompraClp = consumoKwh * tarifa.compraClpKwh;
  const precioVentaClp = consumoKwh * tarifa.ventaClpKwh;
  const margenClp = precioVentaClp - costoCompraClp;
  return {
    costoCompraClp,
    precioVentaClp,
    margenClp,
    margenPct: precioVentaClp > 0 ? (margenClp / precioVentaClp) * 100 : 0,
  };
}

export function sumarMargenes(margenes: MargenCentro[]): MargenCentro {
  const costoCompraClp = margenes.reduce((sum, m) => sum + m.costoCompraClp, 0);
  const precioVentaClp = margenes.reduce((sum, m) => sum + m.precioVentaClp, 0);
  const margenClp = precioVentaClp - costoCompraClp;
  return { costoCompraClp, precioVentaClp, margenClp, margenPct: precioVentaClp > 0 ? (margenClp / precioVentaClp) * 100 : 0 };
}
