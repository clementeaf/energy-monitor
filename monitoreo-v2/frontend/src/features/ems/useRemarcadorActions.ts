import { useAppStore } from '../../store/useAppStore';
import { useToastStore } from '../../store/useToastStore';
import type { Remarcador, RemarcadorOverride } from './fleet';

const REINICIO_MS = 2500;

export function planForzarLectura(remarcadores: Remarcador[], now: Date): Record<string, RemarcadorOverride> {
  const ultimaLectura = now.toISOString();
  return Object.fromEntries(
    remarcadores
      .filter((remarcador) => remarcador.estado !== 'mantencion')
      .map((remarcador) => [
        remarcador.id,
        { estado: remarcador.estado === 'sin_senal' ? 'conectado' : remarcador.estado, ultimaLectura },
      ]),
  );
}

function conectadoAhora(): RemarcadorOverride {
  return { estado: 'conectado', ultimaLectura: new Date().toISOString() };
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

export function useRemarcadorActions() {
  const overrideRemarcadores = useAppStore((s) => s.overrideRemarcadores);
  const showToast = useToastStore((s) => s.showToast);

  return {
    forzarLectura: (remarcadores: Remarcador[]) => {
      overrideRemarcadores(planForzarLectura(remarcadores, new Date()));
      showToast(remarcadores.length === 1 ? 'Lectura solicitada al equipo' : `Lectura forzada en ${plural(remarcadores.length, 'equipo')}`);
    },
    marcarMantencion: (remarcadores: Remarcador[]) => {
      overrideRemarcadores(Object.fromEntries(remarcadores.map((r) => [r.id, { estado: 'mantencion', ultimaLectura: r.ultimaLectura }])));
      showToast(remarcadores.length === 1 ? `${remarcadores[0].code} marcado en mantención` : `${plural(remarcadores.length, 'equipo')} en mantención`);
    },
    reactivar: (remarcador: Remarcador) => {
      overrideRemarcadores({ [remarcador.id]: conectadoAhora() });
      showToast(`${remarcador.code} reactivado`);
    },
    recuperar: (remarcador: Remarcador) => {
      overrideRemarcadores({ [remarcador.id]: conectadoAhora() });
      showToast('Equipo recuperado: su alerta se cerró sola');
    },
    reiniciar: (remarcador: Remarcador) => {
      overrideRemarcadores({ [remarcador.id]: { estado: 'sin_senal', ultimaLectura: remarcador.ultimaLectura } });
      showToast(`${remarcador.code} reiniciándose…`);
      setTimeout(() => {
        overrideRemarcadores({ [remarcador.id]: conectadoAhora() });
        showToast(`${remarcador.code} volvió a reportar`);
      }, REINICIO_MS);
    },
  };
}
