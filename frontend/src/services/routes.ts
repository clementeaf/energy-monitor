export const routes = {
  // Auth
  getMe: () => '/auth/me',
  getPermissions: () => '/auth/permissions',

  // Buildings
  getBuildings: () => '/buildings',
  getBuilding:  (name: string) => `/buildings/${encodeURIComponent(name)}`,
  createBuilding: () => '/buildings',
  updateBuilding: (name: string) => `/buildings/${encodeURIComponent(name)}`,
  deleteBuilding: (name: string) => `/buildings/${encodeURIComponent(name)}`,

  // Meters
  getMeterInfo: (meterId: string) => `/meters/${meterId}/info`,
  getMetersByBuilding: (buildingName: string) => `/meters/building/${buildingName}`,
  getMetersLatest: (buildingName: string) => `/meters/building/${buildingName}/latest`,

  // Meter monthly
  getMeterMonthly: (meterId: string) => `/meter-monthly/${meterId}`,

  // Meter readings (15-min)
  getMeterReadings: (meterId: string, from: string, to: string) =>
    `/meter-readings/${meterId}?from=${from}&to=${to}`,

  // Billing
  getBilling: (buildingName: string) => `/billing/${buildingName}`,
  getBillingStores: (buildingName: string, month: string) =>
    `/billing/${buildingName}/stores?month=${month}`,
  getBillingPdf: (storeName: string, buildingName: string, month: string) =>
    `/billing/pdf?storeName=${encodeURIComponent(storeName)}&buildingName=${encodeURIComponent(buildingName)}&month=${month}`,

  // Dashboard
  getDashboardSummary: () => '/dashboard/summary',
  getDashboardPayments: () => '/dashboard/payments',
  getDashboardDocuments: (status: string) => `/dashboard/documents/${status}`,

  // Comparisons
  getComparisonFilters: (buildingNames?: string[]) => {
    if (buildingNames && buildingNames.length > 0) {
      return `/comparisons/filters?buildingNames=${buildingNames.join(',')}`;
    }
    return '/comparisons/filters';
  },
  getComparisonByStore: (month: string, buildingNames?: string[], storeTypeIds?: number[], storeNames?: string[]) => {
    const params = new URLSearchParams({ month });
    if (buildingNames && buildingNames.length > 0) params.set('buildingNames', buildingNames.join(','));
    if (storeTypeIds && storeTypeIds.length > 0) params.set('storeTypeIds', storeTypeIds.join(','));
    if (storeNames && storeNames.length > 0) params.set('storeNames', storeNames.map(encodeURIComponent).join(','));
    return `/comparisons/by-store?${params}`;
  },
  getComparisonGroupedByType: (month: string, buildingNames?: string[]) => {
    const params = new URLSearchParams({ month });
    if (buildingNames && buildingNames.length > 0) params.set('buildingNames', buildingNames.join(','));
    return `/comparisons/grouped-by-type?${params}`;
  },
  getComparisonByStoreType: (storeTypeIds: number[], month: string) =>
    `/comparisons/by-store-type?storeTypeIds=${storeTypeIds.join(',')}&month=${month}`,
  getComparisonByStoreName: (storeNames: string[], month: string) =>
    `/comparisons/by-store-name?storeNames=${storeNames.map(encodeURIComponent).join(',')}&month=${month}`,

  // Stores
  getStores: () => '/stores',
  getStoreTypes: () => '/stores/types',
  bulkCreateStores: () => '/stores/bulk',
  createStore: () => '/stores',
  updateStore: (meterId: string) => `/stores/${meterId}`,
  deleteStore: (meterId: string) => `/stores/${meterId}`,

  // Operators
  getOperators: (buildingName: string) => `/stores/operators/${encodeURIComponent(buildingName)}`,
  renameOperator: (buildingName: string, operatorName: string) =>
    `/stores/operators/${encodeURIComponent(buildingName)}/${encodeURIComponent(operatorName)}`,
  deleteOperator: (buildingName: string, operatorName: string) =>
    `/stores/operators/${encodeURIComponent(buildingName)}/${encodeURIComponent(operatorName)}`,

  // Users (admin)
  getUsers: () => '/users',
  createUser: () => '/users',
  createDirectUser: () => '/users/direct',

  deleteUsers: () => '/users',
  resendInvitation: (userId: string) => `/users/${userId}/resend`,

  // Invitations
  validateInvitation: (token: string) => `/invitations/${encodeURIComponent(token)}`,

  // IoT Readings (Siemens)
  getIotLatest: (deviceId: string) =>
    `/iot-readings/latest?deviceId=${deviceId}`,
  getIotTimeSeries: (deviceId: string, from: string, to: string, columns: string, resolution = 'raw') =>
    `/iot-readings/timeseries?deviceId=${deviceId}&from=${from}&to=${to}&columns=${columns}&resolution=${resolution}`,
  getIotReadings: (deviceId: string, from: string, to: string, limit = 100, offset = 0) =>
    `/iot-readings?deviceId=${deviceId}&from=${from}&to=${to}&limit=${limit}&offset=${offset}`,
  getIotStats: (deviceId: string, from: string, to: string) =>
    `/iot-readings/stats?deviceId=${deviceId}&from=${from}&to=${to}`,
  getIotBuildings: () => '/iot-readings/buildings',
  getIotMetersLatest: () => '/iot-readings/meters-latest',
  getIotMonthly: (deviceId: string) => `/iot-readings/monthly?deviceId=${deviceId}`,
  getIotMeterReadings: (deviceId: string, from: string, to: string) =>
    `/iot-readings/meter-readings?deviceId=${deviceId}&from=${from}&to=${to}`,

  // Alerts
  getAlerts: (params?: { severity?: string; meter_id?: string }) => {
    const qs = new URLSearchParams();
    if (params?.severity) qs.set('severity', params.severity);
    if (params?.meter_id) qs.set('meter_id', params.meter_id);
    const s = qs.toString();
    return `/alerts${s ? `?${s}` : ''}`;
  },
};
