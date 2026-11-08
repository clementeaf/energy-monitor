import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { usePageTitle, usePageTitleStore } from './usePageTitleStore';

describe('usePageTitle', () => {
  it('publishes the page title while mounted and clears it on unmount', () => {
    const { rerender, unmount } = renderHook(({ sub }) => usePageTitle('Centros', sub), { initialProps: { sub: '3 centros activos' } });
    expect(usePageTitleStore.getState().pageTitle).toEqual({ title: 'Centros', sub: '3 centros activos' });

    rerender({ sub: '4 centros activos' });
    expect(usePageTitleStore.getState().pageTitle).toEqual({ title: 'Centros', sub: '4 centros activos' });

    unmount();
    expect(usePageTitleStore.getState().pageTitle).toBeNull();
  });
});
