import type { AggregatedReading } from '../../types/reading';

export type Granularidad = 'mes' | 'trimestre' | 'anio';

export interface Rango {
  desde: Date;
  hasta: Date;
}

export interface Periodo extends Rango {
  granularidad: Granularidad;
}

const MESES_POR_PERIODO: Record<Granularidad, number> = { mes: 1, trimestre: 3, anio: 12 };
const MESES_POR_TRIMESTRE = 3;

export const GRANULARIDADES: Record<Granularidad, string> = { mes: 'Mes', trimestre: 'Trimestre', anio: 'Año' };

export function desplazarMeses(fecha: Date, meses: number): Date {
  const destino = new Date(fecha.getFullYear(), fecha.getMonth() + meses, 1, fecha.getHours(), fecha.getMinutes(), fecha.getSeconds());
  const ultimoDia = new Date(destino.getFullYear(), destino.getMonth() + 1, 0).getDate();
  destino.setDate(Math.min(fecha.getDate(), ultimoDia));
  return destino;
}

export function periodoQueContiene(granularidad: Granularidad, fecha: Date): Periodo {
  const meses = MESES_POR_PERIODO[granularidad];
  const mesInicio = Math.floor(fecha.getMonth() / meses) * meses;
  const desde = new Date(fecha.getFullYear(), mesInicio, 1);
  return { granularidad, desde, hasta: new Date(desde.getFullYear(), desde.getMonth() + meses, 1) };
}

export function periodoAnterior(periodo: Periodo): Periodo {
  const meses = MESES_POR_PERIODO[periodo.granularidad];
  return { granularidad: periodo.granularidad, desde: desplazarMeses(periodo.desde, -meses), hasta: periodo.desde };
}

export function tramoEquivalente(comparacion: Rango, actual: Rango, ahora: Date): Rango {
  if (ahora >= actual.hasta) return comparacion;
  const transcurrido = Math.max(0, ahora.getTime() - actual.desde.getTime());
  return { desde: comparacion.desde, hasta: new Date(Math.min(comparacion.hasta.getTime(), comparacion.desde.getTime() + transcurrido)) };
}

export function isTramoParcial(tramo: Rango, periodo: Rango): boolean {
  return tramo.hasta < periodo.hasta;
}

export function etiquetaPeriodo(periodo: Periodo): string {
  if (periodo.granularidad === 'anio') return String(periodo.desde.getFullYear());
  if (periodo.granularidad === 'trimestre') return `T${Math.floor(periodo.desde.getMonth() / MESES_POR_TRIMESTRE) + 1} ${periodo.desde.getFullYear()}`;
  const mes = nombreMes(periodo.desde);
  return `${mes.charAt(0).toUpperCase()}${mes.slice(1)} ${periodo.desde.getFullYear()}`;
}

export function nombreMes(fecha: Date): string {
  return fecha.toLocaleDateString('es-CL', { month: 'long' });
}

export function etiquetaComparacion(periodo: Periodo): string {
  return periodo.granularidad === 'mes' ? nombreMes(periodo.desde) : etiquetaPeriodo(periodo);
}

export function etiquetaTramo(tramo: Rango): string {
  const formato = (fecha: Date) => fecha.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }).replace('.', '');
  return `${formato(tramo.desde)} – ${formato(new Date(tramo.hasta.getTime() - 1))}`;
}

export function variacionPct(actual: number, previo: number | null): number | null {
  if (previo === null || previo === 0) return null;
  return ((actual - previo) / Math.abs(previo)) * 100;
}

export function mesDelBucket(bucket: string): Date {
  const fecha = new Date(bucket);
  return new Date(fecha.getUTCFullYear(), fecha.getUTCMonth(), 1);
}

export function filasDelPeriodo(filas: AggregatedReading[], periodo: Rango): AggregatedReading[] {
  return filas.filter((fila) => {
    const mes = mesDelBucket(fila.bucket);
    return mes >= periodo.desde && mes < periodo.hasta;
  });
}

export function periodosDisponibles(filas: AggregatedReading[], granularidad: Granularidad, inicioHistorial: Date): Periodo[] {
  const conEnergia = filas.filter((fila) => Number(fila.energy_delta_kwh ?? 0) > 0);
  const porInicio = new Map<number, Periodo>();
  for (const fila of conEnergia) {
    const periodo = periodoQueContiene(granularidad, mesDelBucket(fila.bucket));
    if (periodoAnterior(periodo).desde >= inicioHistorial) porInicio.set(periodo.desde.getTime(), periodo);
  }
  return [...porInicio.values()].sort((a, b) => b.desde.getTime() - a.desde.getTime());
}
