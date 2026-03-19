import axios from 'axios';
import { PublicClientApplication } from '@azure/msal-browser';
import { msalConfig, loginRequest } from '../auth/msalConfig';
import { useAuthStore } from '../store/useAuthStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 25_000,
  headers: { 'Content-Type': 'application/json' },
});

// Inject Bearer token on every request
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Track whether a silent refresh is already in progress to avoid concurrent attempts
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

/** Attempt to silently refresh the Microsoft token. Returns new token or null. */
async function tryMsalRefresh(): Promise<string | null> {
  try {
    const msalInstance = new PublicClientApplication(msalConfig);
    await msalInstance.initialize();
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length === 0) return null;
    const result = await msalInstance.acquireTokenSilent({
      ...loginRequest,
      account: accounts[0],
    });
    if (result.idToken) {
      sessionStorage.setItem('access_token', result.idToken);
      return result.idToken;
    }
    return null;
  } catch {
    return null;
  }
}

// Handle 401 — try silent refresh, then redirect if refresh fails
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Attempt silent token refresh (only for Microsoft — Google JWTs can't be refreshed)
      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = tryMsalRefresh();
      }

      const newToken = await refreshPromise;
      isRefreshing = false;
      refreshPromise = null;

      if (newToken) {
        // Retry the original request with the new token
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }

      // Refresh failed — clear auth and redirect
      sessionStorage.removeItem('access_token');
      useAuthStore.getState().clearUser();
      const { pathname } = window.location;
      if (pathname !== '/login') {
        window.location.replace('/login');
      }
    }

    return Promise.reject(error);
  },
);

export default api;
