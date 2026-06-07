import axios, { type InternalAxiosRequestConfig } from 'axios';
import { useAppStore } from '../store/useAppStore';

/** Callback set by SessionExpiredModal to show the modal from non-React context. */
let onSessionExpired: (() => void) | null = null;
export function setSessionExpiredHandler(handler: () => void) { onSessionExpired = handler; }

const DEV_BEARER_KEY = 'dev_bearer_token';
let devBearerToken: string | null = null;

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Mirrors dev Bearer into axios defaults so every request carries Authorization.
 */
function syncDevBearerDefaults(): void {
  if (!import.meta.env.DEV) {
    return;
  }
  if (devBearerToken) {
    api.defaults.headers.common.Authorization = `Bearer ${devBearerToken}`;
    return;
  }
  delete api.defaults.headers.common.Authorization;
}

if (import.meta.env.DEV) {
  const storedBearer = sessionStorage.getItem(DEV_BEARER_KEY);
  if (storedBearer) {
    devBearerToken = storedBearer;
    syncDevBearerDefaults();
  }
}

/**
 * Stores in-memory Bearer token for local dev when httpOnly cookies are unavailable.
 */
export function setDevBearerToken(token: string | null): void {
  devBearerToken = token;
  if (!import.meta.env.DEV) {
    return;
  }
  if (token) {
    sessionStorage.setItem(DEV_BEARER_KEY, token);
  } else {
    sessionStorage.removeItem(DEV_BEARER_KEY);
  }
  syncDevBearerDefaults();
}

/**
 * Clears the dev-only in-memory Bearer token.
 */
export function clearDevBearerToken(): void {
  setDevBearerToken(null);
}

const AUTH_PATHS = [
  '/auth/login',
  '/auth/me',
  '/auth/refresh',
  '/auth/logout',
  '/auth/clear-session',
  '/auth/mfa/validate',
  '/auth/mfa/verify-setup',
];

/**
 * Attaches dev Bearer token to outgoing API requests (Axios v1-safe).
 */
function attachDevBearer(config: InternalAxiosRequestConfig): void {
  if (!import.meta.env.DEV || !devBearerToken) {
    return;
  }

  const headers = config.headers;
  const existingAuth =
    typeof headers.get === 'function'
      ? headers.get('Authorization')
      : headers.Authorization;

  if (existingAuth) {
    return;
  }

  if (typeof headers.set === 'function') {
    headers.set('Authorization', `Bearer ${devBearerToken}`);
    return;
  }

  headers.Authorization = `Bearer ${devBearerToken}`;
}

// Inject selectedTenantId as header for super_admin tenant scoping
api.interceptors.request.use((config) => {
  const tenantId = useAppStore.getState().selectedTenantId;
  if (tenantId) {
    if (typeof config.headers.set === 'function') {
      config.headers.set('x-tenant-id', tenantId);
    } else {
      config.headers['x-tenant-id'] = tenantId;
    }
  }
  attachDevBearer(config);
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (v: unknown) => void;
  reject: (e: unknown) => void;
}> = [];

const processQueue = (error: unknown) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(undefined);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const url = original?.url ?? '';

    // Never retry auth endpoints — let callers handle their own errors
    if (error.response?.status !== 401 || original._retry || AUTH_PATHS.some((p) => url.includes(p))) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(() => api(original));
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const { data } = await api.post<{ success: boolean; accessToken?: string }>('/auth/refresh');
      if (import.meta.env.DEV && typeof data.accessToken === 'string') {
        setDevBearerToken(data.accessToken);
      }
      processQueue(null);
      return api(original);
    } catch (refreshError) {
      processQueue(refreshError);
      // Session expired — show modal instead of hard redirect
      if (onSessionExpired) onSessionExpired();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default api;
