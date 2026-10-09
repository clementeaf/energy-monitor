import type { RemarcadorEstado } from './fleet';

export interface FichaDispositivo {
  modelo: string;
  firmware: string;
  alta: string;
  senalPct: number;
}

const MODELOS = ['PWR-M2', 'PWR-M3', 'PWR-M5i'];
const FIRMWARES = ['3.9.4', '4.1.0', '4.2.1', '4.2.1'];
const SENAL_RANGO: Record<RemarcadorEstado, { min: number; span: number }> = {
  conectado: { min: 70, span: 29 },
  sin_senal: { min: 12, span: 24 },
  caido: { min: 0, span: 0 },
  mantencion: { min: 0, span: 0 },
};

function hashId(id: string): number {
  return [...id].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7);
}

export function buildFichaDispositivo(remarcador: { id: string; estado: RemarcadorEstado }): FichaDispositivo {
  const hash = hashId(remarcador.id);
  const rango = SENAL_RANGO[remarcador.estado];
  const alta = new Date(Date.UTC(2024, 6 + (hash % 18), 1 + (hash % 27)));
  return {
    modelo: MODELOS[hash % MODELOS.length],
    firmware: FIRMWARES[(hash >>> 3) % FIRMWARES.length],
    alta: alta.toISOString().slice(0, 10),
    senalPct: rango.span === 0 ? rango.min : rango.min + ((hash >>> 5) % (rango.span + 1)),
  };
}
