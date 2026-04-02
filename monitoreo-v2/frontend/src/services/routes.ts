export const API_ROUTES = {
  auth: {
    login: '/auth/login',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    me: '/auth/me',
  },
  buildings: '/buildings',
  meters: '/meters',
  alerts: '/alerts',
  alertRules: '/alert-rules',
  readings: '/readings',
  hierarchy: '/hierarchy',
  concentrators: '/concentrators',
  faultEvents: '/fault-events',
} as const;
