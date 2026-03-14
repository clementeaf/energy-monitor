interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse rounded-lg bg-raised ${className}`} />
  );
}

/** Skeleton for BuildingsPage: title + grid of 4 building cards */
export function BuildingsPageSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="mb-6">
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="grid flex-1 grid-cols-1 content-start gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-surface p-4">
            <Skeleton className="mb-3 h-5 w-3/4" />
            <Skeleton className="mb-2 h-4 w-full" />
            <div className="mt-3 flex justify-between border-t border-border pt-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Skeleton for BuildingDetailPage: header + chart + meter cards */
export function BuildingDetailSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0">
        <div className="mb-6">
          <Skeleton className="mb-2 h-4 w-40" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-8 w-48" />
          </div>
        </div>
        <Skeleton className="mb-3 h-4 w-64" />
      </div>
      <div className="shrink-0">
        <Skeleton className="h-[380px] w-full" />
      </div>
      <div className="mt-4 min-h-0 flex-1">
        <Skeleton className="mb-2 h-6 w-36" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-surface p-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
              <Skeleton className="mt-2 h-4 w-32" />
              <Skeleton className="mt-2 h-4 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Skeleton placeholder for the chart area (reserves 380px) */
export function ChartSkeleton() {
  return <Skeleton className="h-[380px] w-full" />;
}

/** Skeleton placeholder for the meters grid */
export function MetersGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <Skeleton className="mt-2 h-4 w-32" />
          <Skeleton className="mt-2 h-4 w-full" />
        </div>
      ))}
    </div>
  );
}

/** Skeleton for DrilldownPage: header + breadcrumb + 2 charts + table */
export function DrilldownSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0">
        <div className="mb-6">
          <Skeleton className="mb-2 h-4 w-48" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-8 w-56" />
          </div>
        </div>
        <Skeleton className="mb-4 h-4 w-80" />
      </div>
      <div className="min-h-0 flex-1 space-y-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-[300px] w-full" />
          <Skeleton className="h-[300px] w-full" />
        </div>
        <Skeleton className="h-[200px] w-full" />
      </div>
    </div>
  );
}

/** Skeleton for MeterReadingsPage: header + chart + table */
export function MeterReadingsSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0">
        <div className="mb-2 flex items-center gap-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="mb-3 flex gap-2">
          <Skeleton className="h-7 w-48" />
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-4">
        <Skeleton className="h-[380px] w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    </div>
  );
}

/** Skeleton for RealtimePage: card with table header + 8 skeleton rows */
export function RealtimeSkeleton() {
  const cols = 7;
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="mb-3 flex gap-6">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className={`h-3 ${i < 2 ? 'w-16' : 'w-12'}`} />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-6 border-t border-border py-3">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-14 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Skeleton for IoTDevicesPage: placeholder */
export function IoTDevicesSkeleton() {
  return (
    <div className="flex h-full items-center justify-center">
      <Skeleton className="h-5 w-48" />
    </div>
  );
}

/** Skeleton for AlertsPage: placeholder */
export function AlertsSkeleton() {
  return (
    <div className="flex h-full items-center justify-center">
      <Skeleton className="h-5 w-40" />
    </div>
  );
}

/** Skeleton for AlertDetailPage: header + placeholder */
export function AlertDetailSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0">
        <Skeleton className="mb-2 h-4 w-24" />
        <Skeleton className="h-7 w-40" />
      </div>
      <div className="flex flex-1 items-center justify-center">
        <Skeleton className="h-5 w-48" />
      </div>
    </div>
  );
}

/** Skeleton for MeterDetailPage: header + chart(s) */
export function MeterDetailSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0">
        <div className="mb-6">
          <Skeleton className="mb-2 h-4 w-56" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-8 w-40" />
          </div>
        </div>
        <div className="mb-3 flex gap-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-4">
        <Skeleton className="h-[380px] w-full" />
        <Skeleton className="h-[380px] w-full" />
      </div>
    </div>
  );
}
