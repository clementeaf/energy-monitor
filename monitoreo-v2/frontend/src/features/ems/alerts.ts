import type { Remarcador, RemarcadorEstado } from './fleet';
import { formatDateTime } from './format';

export type AlertaSeveridad = 'critica' | 'advertencia' | 'informativa';

export interface Alerta {
  id: string;
  severidad: AlertaSeveridad;
  titulo: string;
  detalle: string;
  centroId: string;
  remarcadorId: string;
}

const ALERTA_BY_ESTADO: Partial<Record<RemarcadorEstado, { severidad: AlertaSeveridad; titulo: (code: string) => string }>> = {
  caido: { severidad: 'critica', titulo: (code) => `Remarcador ${code} sin conexión` },
  sin_senal: { severidad: 'advertencia', titulo: (code) => `Señal degradada en ${code}` },
};

export function buildAlertas(remarcadores: Remarcador[]): Alerta[] {
  return remarcadores.flatMap((remarcador) => {
    const alerta = ALERTA_BY_ESTADO[remarcador.estado];
    if (!alerta) return [];
    return [{
      id: `auto-${remarcador.id}`,
      severidad: alerta.severidad,
      titulo: alerta.titulo(remarcador.code),
      detalle: `Sin lecturas desde ${formatDateTime(remarcador.ultimaLectura)} en ${remarcador.centroName}.`,
      centroId: remarcador.centroId,
      remarcadorId: remarcador.id,
    }];
  });
}

export interface Regla {
  id: string;
  nombre: string;
  tipo: string;
  aplicaA: string;
  notifica: string;
  activa: boolean;
}

export const REGLAS_INICIALES: Regla[] = [
  { id: 'r1', nombre: 'Pico sobre 1.150 kW', tipo: 'Pico de demanda', aplicaA: 'Quilicura', notifica: 'Correo + app', activa: true },
  { id: 'r2', nombre: 'Desconexión > 30 min', tipo: 'Desconexión', aplicaA: 'Todos los centros', notifica: 'App', activa: true },
  { id: 'r3', nombre: 'Margen bajo 10%', tipo: 'Margen contractual', aplicaA: 'Todos los centros', notifica: 'Correo + app', activa: true },
  { id: 'r4', nombre: 'Consumo nocturno anómalo', tipo: 'Umbral consumo', aplicaA: 'Alto Peñalolén', notifica: 'App', activa: false },
];
