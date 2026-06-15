import { useEffect, useRef, useCallback } from 'react';

const ACTIVITY_EVENTS: ReadonlyArray<keyof DocumentEventMap> = [
  'mousemove',
  'keydown',
  'click',
  'scroll',
  'touchstart',
];

/**
 * CYB-06: Fires `onIdle` after `timeoutMinutes` of user inactivity.
 * Tracks mouse, keyboard, click, scroll, and touch events.
 * Resets the timer on any activity.
 */
export function useIdleTimeout(
  timeoutMinutes: number,
  onIdle: () => void,
  enabled: boolean,
): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  const resetTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(
      () => onIdleRef.current(),
      timeoutMinutes * 60_000,
    );
  }, [timeoutMinutes]);

  useEffect(() => {
    if (!enabled) return;

    resetTimer();

    const handler = () => resetTimer();
    for (const event of ACTIVITY_EVENTS) {
      document.addEventListener(event, handler, { passive: true });
    }

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      for (const event of ACTIVITY_EVENTS) {
        document.removeEventListener(event, handler);
      }
    };
  }, [enabled, resetTimer]);
}
