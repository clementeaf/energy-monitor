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
  getBillingPdf: (storeName: string, buildingName: string, month: string) =>
    `/billing/pdf?storeName=${encodeURIComponent(storeName)}&buildingName=${encodeURIComponent(buildingName)}&month=${month}`,

  // Dashboard
  getDashboardSummary: () => '/dashboard/summary',
  getDashboardPayments: () => '/dashboard/payments',
  getDashboardDocuments: (status: string) => `/dashboard/documents/${status}`,

  // Comparisons
  getComparisonFilters: () => '/comparisons/filters',
  getComparisonByStoreType: (storeTypeIds: number[], month: string) =>
    `/comparisons/by-store-type?storeTypeIds=${storeTypeIds.join(',')}&month=${month}`,
  getComparisonByStoreName: (storeNames: string[], month: string) =>
    `/comparisons/by-store-name?storeNames=${storeNames.map(encodeURIComponent).join(',')}&month=${month}`,

  // Alerts
  getAlerts: (params?: { severity?: string; meter_id?: string }) => {
    const qs = new URLSearchParams();
    if (params?.severity) qs.set('severity', params.severity);
    if (params?.meter_id) qs.set('meter_id', params.meter_id);
    const s = qs.toString();
    return `/alerts${s ? `?${s}` : ''}`;
  },
};
