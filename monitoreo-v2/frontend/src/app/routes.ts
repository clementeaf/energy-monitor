export const APP_ROUTES = {
  login: '/login',
  dashboard: '/',
  buildings: '/buildings',
  alerts: '/alerts',
  billing: '/billing',
  reports: '/reports',
  components: '/components',
  admin: {
    users: '/admin/users',
    meters: '/admin/meters',
    tenants: '/admin/tenants',
    hierarchy: '/admin/hierarchy',
    audit: '/admin/audit',
  },
} as const;
