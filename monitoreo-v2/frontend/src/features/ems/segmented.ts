export const SEGMENT_TRACK_CLASS = 'flex w-fit gap-1 rounded-full bg-raised p-1';

export function segmentClass(isActive: boolean): string {
  return `rounded-full px-3 py-1 text-xs font-medium transition-colors ${isActive ? 'bg-primary text-primary-fg' : 'text-muted hover:text-foreground'}`;
}
