import type { ReadingQuality } from '../../types/reading';

const QUALITY_LABELS: Record<ReadingQuality, string> = {
  measured: 'Medida',
  estimated: 'Estimada',
  invalid: 'Invalida',
  unknown: 'Desconocida',
};

const QUALITY_STYLES: Record<ReadingQuality, string> = {
  measured: 'bg-success/10 text-success',
  estimated: 'bg-warning/10 text-warning',
  invalid: 'bg-danger/10 text-danger',
  unknown: 'bg-raised text-muted',
};

interface ReadingQualityBadgeProps {
  quality: ReadingQuality | string | null | undefined;
  source?: string | null;
  compact?: boolean;
}

/**
 * Badge for reading data quality and optional ingest source.
 */
export function ReadingQualityBadge({
  quality,
  source,
  compact = false,
}: Readonly<ReadingQualityBadgeProps>) {
  const q = (quality ?? 'unknown') as ReadingQuality;
  const label = QUALITY_LABELS[q] ?? quality ?? 'Desconocida';
  const style = QUALITY_STYLES[q] ?? QUALITY_STYLES.unknown;

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>
        {label}
      </span>
      {!compact && source && (
        <span className="text-xs text-subtle" title="Fuente de ingest">
          {source}
        </span>
      )}
    </span>
  );
}
