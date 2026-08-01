import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionExpiredModal } from './SessionExpiredModal';
import { setSessionExpiredHandler } from '../../services/api';
import api from '../../services/api';

vi.mock('../../services/api', async () => {
  let handler: () => void = () => {};
  const post = vi.fn();
  return {
    default: { post },
    setSessionExpiredHandler: (fn: () => void) => { handler = fn; },
    // helper de test: dispara el modal como lo haria el interceptor ante un 401
    __expire: () => handler(),
  };
});

// el modal cierra sesion navegando; jsdom no implementa location.href
const navegado: string[] = [];
beforeEach(() => {
  navegado.length = 0;
  vi.mocked(api.post).mockReset();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { get href() { return ''; }, set href(v: string) { navegado.push(v); } },
  });
  // este entorno de test no trae un localStorage funcional y goToLogin lo usa
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn(), clear: vi.fn() },
  });
});

async function abrirModal() {
  render(<SessionExpiredModal />);
  const mod = await import('../../services/api');
  (mod as unknown as { __expire: () => void }).__expire();
  await screen.findByText('Sesión inactiva');
}

describe('SessionExpiredModal', () => {
  it('"Continuar trabajando" refresca el token y cierra el modal sin ir a login', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { success: true } });
    await abrirModal();

    await userEvent.click(screen.getByRole('button', { name: 'Continuar trabajando' }));

    expect(api.post).toHaveBeenCalledWith('/auth/refresh');
    await waitFor(() => expect(screen.queryByText('Sesión inactiva')).not.toBeInTheDocument());
    expect(navegado).toEqual([]);
  });

  it('si el refresh token tambien expiro, manda a login', async () => {
    vi.mocked(api.post).mockRejectedValue(new Error('401'));
    await abrirModal();

    await userEvent.click(screen.getByRole('button', { name: 'Continuar trabajando' }));

    await waitFor(() => expect(navegado).toEqual(['/login']));
  });

  it('"Cerrar sesion" va a login sin intentar refrescar', async () => {
    await abrirModal();

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(api.post).not.toHaveBeenCalled();
    expect(navegado).toEqual(['/login']);
  });
});
