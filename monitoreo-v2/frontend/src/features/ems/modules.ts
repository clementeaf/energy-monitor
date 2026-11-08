import type { ModuloId } from '../../store/useAppStore';

interface AddonModule {
  addon: string;
  sub: string;
  colorClass: string;
  features: readonly string[];
}

export const ADDON_MODULES: Record<ModuloId, AddonModule> = {
  consumo: {
    colorClass: 'text-info bg-info-bg',
    addon: 'Analítica de Consumo',
    sub: 'Picos y curvas de carga',
    features: ['Curvas de carga por hora', 'Detección de picos', 'Comparativa entre centros'],
  },
  margenes: {
    colorClass: 'text-warning-ink bg-warning-bg',
    addon: 'Márgenes',
    sub: 'Compra vs venta por centro',
    features: ['Compra vs venta por centro', 'Margen por cliente', 'Alerta de margen mínimo'],
  },
  sostenibilidad: {
    colorClass: 'text-success bg-success-bg',
    addon: 'Sostenibilidad',
    sub: 'Huella de CO₂ y eficiencia',
    features: ['Huella de CO₂ por centro', 'Índice de eficiencia', 'Recomendaciones de ahorro'],
  },
  alertas: {
    colorClass: 'text-danger bg-danger-bg',
    addon: 'Alertas',
    sub: 'Reglas y notificaciones',
    features: ['Reglas de pico y umbral', 'Aviso de desconexión', 'Notificación por correo y app'],
  },
  reportes: {
    colorClass: 'text-module-reportes-ink bg-module-reportes-bg',
    addon: 'Reportes',
    sub: 'Export y programación',
    features: ['Export PDF y Excel', 'Reportes programados', 'Envío automático a clientes'],
  },
  facturacion: {
    colorClass: 'text-module-facturacion-ink bg-module-facturacion-bg',
    addon: 'Facturación',
    sub: 'Notas de cobro y facturas para backoffice',
    features: ['Notas de cobro por centro', 'Factura vinculada (ERP o carga manual)', 'Descarga PDF, Excel y ZIP'],
  },
};

export function isAddonSection(section: string): section is ModuloId {
  return section in ADDON_MODULES;
}
