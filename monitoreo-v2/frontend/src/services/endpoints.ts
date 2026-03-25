import api from './api';
import { API_ROUTES } from './routes';
import type { AuthProvider, MeResponse } from '../types/auth';

export const authEndpoints = {
  login: (provider: AuthProvider, idToken: string) =>
    api.post<{ success: boolean }>(API_ROUTES.auth.login, { provider, idToken }),

  me: () =>
    api.get<MeResponse>(API_ROUTES.auth.me),

  logout: () =>
    api.post<{ success: boolean }>(API_ROUTES.auth.logout),

  refresh: () =>
    api.post<{ success: boolean }>(API_ROUTES.auth.refresh),
};
