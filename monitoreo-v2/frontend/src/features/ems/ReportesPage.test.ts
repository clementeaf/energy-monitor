import { describe, expect, it } from 'vitest';
import type { Centro, Remarcador } from './fleet';
import { proximoEnvio, reporteFilas } from './ReportesPage';

describe('proximoEnvio', () => {
  const viernes = new Date(2026, 10, 6, 14, 0);

  it('schedules daily, weekly and monthly sends at 08:00', () => {
    expect(proximoEnvio('Diario · 08:00', viernes)).toEqual(new Date(2026, 10, 7, 8));
    expect(proximoEnvio('Semanal · lunes', viernes)).toEqual(new Date(2026, 10, 9, 8));
    expect(proximoEnvio('Mensual · día 1', viernes)).toEqual(new Date(2026, 11, 1, 8));
    expect(proximoEnvio('Cada hora', viernes)).toBeNull();
  });
});

describe('reporteFilas', () => {
  it('writes only the chosen sections, each with its header', () => {
    const centro = { id: 'b', name: 'Quilicura', consumoMesKwh: 1000, intensidadKwhM2: null, margen: null } as Centro;
    const filas = reporteFilas(['flota'], [centro], [{ centroId: 'b', estado: 'caido' } as Remarcador]);
    expect(filas).toEqual([['Salud de la flota'], ['Centro', 'Remarcadores', 'Conectados', 'Sin señal', 'Caídos'], ['Quilicura', '1', '0', '0', '1'], []]);
  });
});
