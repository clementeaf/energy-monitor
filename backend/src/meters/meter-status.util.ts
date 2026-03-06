export const OFFLINE_THRESHOLD_MINUTES = 5;
export const OFFLINE_THRESHOLD_MS = OFFLINE_THRESHOLD_MINUTES * 60 * 1000;

export function getMeterStatus(lastReadingAt: Date | string | null | undefined): 'online' | 'offline' {
  if (!lastReadingAt) return 'offline';

  const readingDate = lastReadingAt instanceof Date ? lastReadingAt : new Date(lastReadingAt);
  if (Number.isNaN(readingDate.getTime())) return 'offline';

  return Date.now() - readingDate.getTime() < OFFLINE_THRESHOLD_MS ? 'online' : 'offline';
}

export function getOfflineTriggeredAt(lastReadingAt: Date | string | null | undefined): Date {
  if (!lastReadingAt) return new Date();

  const readingDate = lastReadingAt instanceof Date ? lastReadingAt : new Date(lastReadingAt);
  if (Number.isNaN(readingDate.getTime())) return new Date();

  return new Date(readingDate.getTime() + OFFLINE_THRESHOLD_MS);
}
