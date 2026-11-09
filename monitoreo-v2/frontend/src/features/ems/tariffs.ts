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

export interface BalanceEnergia {
  compraKwh: number;
  ventaKwh: number;
  perdidaKwh: number | null;
}

export interface MedicionKwh {
  isPrincipal: boolean;
  kwh: number;
}

export function balanceEnergia(mediciones: MedicionKwh[]): BalanceEnergia {
  const sumar = (lista: MedicionKwh[]) => lista.reduce((sum, m) => sum + m.kwh, 0);
  const principales = mediciones.filter((m) => m.isPrincipal);
  const ventaKwh = sumar(mediciones.filter((m) => !m.isPrincipal));
  if (principales.length === 0) return { compraKwh: ventaKwh, ventaKwh, perdidaKwh: null };
  const compraKwh = sumar(principales);
  return { compraKwh, ventaKwh, perdidaKwh: compraKwh - ventaKwh };
}

export function perdidaPct(balance: BalanceEnergia): number | null {
  return balance.perdidaKwh === null || balance.compraKwh <= 0 ? null : (balance.perdidaKwh / balance.compraKwh) * 100;
}

export function calcularMargen(balance: BalanceEnergia, tarifa: Tarifa): MargenCentro {
  const costoCompraClp = balance.compraKwh * tarifa.compraClpKwh;
  const precioVentaClp = balance.ventaKwh * tarifa.ventaClpKwh;
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
