export const APP_ROUTES = {
  login: '/login',
  dashboard: '/',
  buildings: '/buildings',
  meters: '/meters',
  alerts: '/alerts',
  billing: '/billing',
  reports: '/reports',
  components: '/components',
  admin: {
    users: '/admin/users',
    tenants: '/admin/tenants',
    hierarchy: '/admin/hierarchy',
    audit: '/admin/audit',
  },
} as const;
