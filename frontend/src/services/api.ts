import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';

const api = axios.create({
  baseURL: '/api',
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

// Inject Bearer token on every request
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const selectedSiteId = useAppStore.getState().selectedSiteId;
  if (selectedSiteId && selectedSiteId !== '*') {
    config.headers['X-Site-Context'] = selectedSiteId;
  }

  return config;
});

// Handle 401 → clear session (don't redirect during login flow)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearUser();
      sessionStorage.removeItem('access_token');
    }
    return Promise.reject(error);
  },
);

export default api;
