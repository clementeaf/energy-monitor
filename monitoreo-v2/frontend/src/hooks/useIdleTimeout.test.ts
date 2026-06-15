import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useIdleTimeout } from './useIdleTimeout';

describe('useIdleTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires onIdle after timeout period', () => {
    const onIdle = vi.fn();
    renderHook(() => useIdleTimeout(15, onIdle, true));

    expect(onIdle).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(15 * 60_000));
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('does not fire when disabled', () => {
    const onIdle = vi.fn();
    renderHook(() => useIdleTimeout(15, onIdle, false));

    act(() => vi.advanceTimersByTime(30 * 60_000));
    expect(onIdle).not.toHaveBeenCalled();
  });

  it('resets timer on user activity', () => {
    const onIdle = vi.fn();
    renderHook(() => useIdleTimeout(15, onIdle, true));

    // Advance 14 minutes
    act(() => vi.advanceTimersByTime(14 * 60_000));
    expect(onIdle).not.toHaveBeenCalled();

    // Simulate activity
    act(() => { document.dispatchEvent(new Event('mousemove')); });

    // Advance another 14 minutes — should NOT fire (timer was reset)
    act(() => vi.advanceTimersByTime(14 * 60_000));
    expect(onIdle).not.toHaveBeenCalled();

    // Advance 1 more minute (total 15 from last activity) — should fire
    act(() => vi.advanceTimersByTime(1 * 60_000));
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('cleans up on unmount', () => {
    const onIdle = vi.fn();
    const { unmount } = renderHook(() => useIdleTimeout(15, onIdle, true));

    unmount();
    act(() => vi.advanceTimersByTime(30 * 60_000));
    expect(onIdle).not.toHaveBeenCalled();
  });

  it('respects configurable timeout', () => {
    const onIdle = vi.fn();
    renderHook(() => useIdleTimeout(5, onIdle, true));

    act(() => vi.advanceTimersByTime(4 * 60_000));
    expect(onIdle).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1 * 60_000));
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('resets on multiple activity types', () => {
    const onIdle = vi.fn();
    renderHook(() => useIdleTimeout(15, onIdle, true));

    const events = ['keydown', 'click', 'scroll', 'touchstart'];
    for (const eventName of events) {
      act(() => vi.advanceTimersByTime(14 * 60_000));
      act(() => { document.dispatchEvent(new Event(eventName)); });
    }

    // Still no idle — each event reset the timer
    expect(onIdle).not.toHaveBeenCalled();
  });
});
