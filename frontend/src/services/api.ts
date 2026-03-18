import axios from 'axios';
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

// Handle 401 — clear auth and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
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
