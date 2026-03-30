import { useMemo, useState, type ReactElement } from 'react';
import { Drawer } from '../../components/ui/Drawer';
import { useAlerts } from '../../hooks/queries/useAlerts';
import type { Alert } from '../../types';

const PREVIEW_LIMIT = 5;

/**
 * Clasifica severidad para conteos por ícono.
 * @param severity - Valor del backend
 * @returns Bucket visual
 */
function severityBucket(severity: string): 'critical' | 'warning' | 'info' {
  const s = severity.toLowerCase();
  if (['critical', 'high', 'error', 'fatal'].includes(s)) {
    return 'critical';
  }
  if (['warning', 'medium', 'warn'].includes(s)) {
    return 'warning';
  }
  return 'info';
}

/**
 * Formatea timestamp ISO para vista compacta.
 * @param iso - Fecha ISO 8601
 * @returns Texto localizado corto
 */
function formatAlertTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-CL', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/**
 * Franja inferior del panel derecho: resumen de alertas (ícono + cantidad), vista previa al hover y detalle en Drawer.
 * @returns Barra de alertas
 */
export function DashboardAlertsBar(): ReactElement {
  const { data: alerts = [], isFetching, isError } = useAlerts();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const counts = useMemo(() => {
    let critical = 0;
    let warning = 0;
    let info = 0;
    for (const a of alerts) {
      const b = severityBucket(a.severity);
      if (b === 'critical') {
        critical += 1;
      } else if (b === 'warning') {
        warning += 1;
      } else {
        info += 1;
      }
    }
    return { critical, warning, info, total: alerts.length };
  }, [alerts]);

  const previewItems = useMemo(() => alerts.slice(0, PREVIEW_LIMIT), [alerts]);

  return (
    <>
      <div className="group/alerts relative shrink-0 border-t border-pa-border bg-gray-50/90 p-2">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex w-full items-center justify-between gap-2 rounded-lg border border-transparent px-2 py-1.5 text-left transition-colors hover:border-pa-border hover:bg-white"
        >
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <SummaryChip
              label="Total"
              count={counts.total}
              loading={isFetching}
              tone="neutral"
              icon={<BellIcon />}
            />
            {counts.critical > 0 && (
              <SummaryChip
                label="Críticas"
                count={counts.critical}
                loading={false}
                tone="critical"
                icon={<ExclamationTriangleIcon />}
              />
            )}
            {counts.warning > 0 && (
              <SummaryChip
                label="Advertencias"
                count={counts.warning}
                loading={false}
                tone="warning"
                icon={<AlertCircleIcon />}
              />
            )}
            {counts.info > 0 && (
              <SummaryChip label="Informativas" count={counts.info} loading={false} tone="info" icon={<InfoIcon />} />
            )}
          </div>
          <span className="shrink-0 text-[10px] font-semibold text-pa-blue">Ver detalle</span>
        </button>

        <div
          className="pointer-events-none absolute bottom-full left-0 right-0 z-30 mb-1 hidden max-h-64 overflow-hidden rounded-lg border border-pa-border bg-white p-2 text-left shadow-lg group-hover/alerts:pointer-events-auto group-hover/alerts:block"
          role="tooltip"
        >
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-pa-text-muted">Vista previa</p>
          {isError ? (
            <p className="text-xs text-amber-800">No se pudieron cargar las alertas.</p>
          ) : previewItems.length === 0 ? (
            <p className="text-xs text-pa-text-muted">{isFetching ? 'Cargando…' : 'No hay alertas recientes.'}</p>
          ) : (
            <ul className="max-h-52 space-y-2 overflow-y-auto text-xs">
              {previewItems.map((a) => (
                <li key={a.id} className="border-b border-pa-border/40 pb-2 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-pa-navy">{a.alertType}</span>
                    <span className="shrink-0 text-[10px] text-pa-text-muted">{formatAlertTime(a.timestamp)}</span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-pa-text">{a.message ?? a.field}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Alertas" side="right" size="lg">
        {isError ? (
          <p className="text-sm text-pa-text">No se pudieron obtener las alertas.</p>
        ) : alerts.length === 0 ? (
          <p className="text-sm text-pa-text-muted">
            {isFetching ? 'Cargando alertas…' : 'No hay alertas para mostrar.'}
          </p>
        ) : (
          <ul className="space-y-3">
            {alerts.map((a) => (
              <AlertDetailItem key={a.id} alert={a} />
            ))}
          </ul>
        )}
      </Drawer>
    </>
  );
}

/**
 * Chip de conteo con ícono.
 * @param props - Etiqueta, conteo, tono e ícono
 * @returns Chip visual
 */
function SummaryChip(props: {
  label: string;
  count: number;
  loading: boolean;
  tone: 'neutral' | 'critical' | 'warning' | 'info';
  icon: ReactElement;
}): ReactElement {
  const { label, count, loading, tone, icon } = props;
  const toneClass =
    tone === 'critical'
      ? 'text-red-800 bg-red-50'
      : tone === 'warning'
        ? 'text-amber-900 bg-amber-50'
        : tone === 'info'
          ? 'text-sky-900 bg-sky-50'
          : 'text-pa-navy bg-gray-100';

  return (
    <div className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] ${toneClass}`} title={label}>
      <span className="flex h-6 w-6 items-center justify-center [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>
      <span className="font-semibold tabular-nums">{loading ? '…' : count}</span>
    </div>
  );
}

/**
 * Fila de detalle de alerta en el Drawer.
 * @param props - Alerta a mostrar
 * @returns Elemento de lista
 */
function AlertDetailItem(props: { alert: Alert }): ReactElement {
  const { alert: a } = props;
  return (
    <li className="rounded-lg border border-pa-border/50 bg-gray-50/80 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium text-pa-navy">{a.alertType}</span>
        <span className="rounded bg-white px-2 py-0.5 text-[10px] font-medium uppercase text-pa-text-muted">
          {a.severity}
        </span>
      </div>
      <p className="mt-1 text-[10px] text-pa-text-muted">
        {formatAlertTime(a.timestamp)} · {a.meterId}
      </p>
      {a.buildingName ? <p className="mt-1 text-[11px] text-pa-text">Edificio: {a.buildingName}</p> : null}
      {a.storeName ? <p className="text-[11px] text-pa-text">Local: {a.storeName}</p> : null}
      <p className="mt-2 text-sm text-pa-text">
        {a.message ?? `${a.field}${a.value != null ? `: ${a.value}` : ''}`}
      </p>
    </li>
  );
}

function BellIcon(): ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  );
}

function ExclamationTriangleIcon(): ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

function AlertCircleIcon(): ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function InfoIcon(): ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
