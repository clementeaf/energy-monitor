import { afterEach, describe, expect, it, vi } from 'vitest';
import { useToastStore } from './useToastStore';

describe('useToastStore', () => {
  afterEach(() => vi.useRealTimers());

  it('hides the toast after 2.2 s and restarts the timer on a new message', () => {
    vi.useFakeTimers();
    const { showToast } = useToastStore.getState();

    showToast('Primero');
    vi.advanceTimersByTime(2000);
    showToast('Segundo');
    vi.advanceTimersByTime(2000);
    expect(useToastStore.getState().message).toBe('Segundo');

    vi.advanceTimersByTime(200);
    expect(useToastStore.getState().message).toBeNull();
  });
});
