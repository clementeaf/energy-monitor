export const routes = {
  // Auth
  getMe: () => '/auth/me',
  getPermissions: () => '/auth/permissions',

  // Buildings
  getBuildings: () => '/buildings',
  getBuilding:  (name: string) => `/buildings/${name}`,

  // Meters
  getMetersByBuilding: (buildingName: string) => `/meters/building/${buildingName}`,
  getMetersLatest: (buildingName: string) => `/meters/building/${buildingName}/latest`,

  // Meter monthly
  getMeterMonthly: (meterId: string) => `/meter-monthly/${meterId}`,

  // Meter readings (15-min)
  getMeterReadings: (meterId: string, from: string, to: string) =>
    `/meter-readings/${meterId}?from=${from}&to=${to}`,

  // Billing
  getBilling: (buildingName: string) => `/billing/${buildingName}`,

  // Dashboard
  getDashboardSummary: () => '/dashboard/summary',

  // Alerts
  getAlerts: (params?: { severity?: string; meter_id?: string }) => {
    const qs = new URLSearchParams();
    if (params?.severity) qs.set('severity', params.severity);
    if (params?.meter_id) qs.set('meter_id', params.meter_id);
    const s = qs.toString();
    return `/alerts${s ? `?${s}` : ''}`;
  },
};
