export const routes = {
  // Buildings
  getBuildings:            ()                       => '/buildings',
  getBuilding:             (id: string)             => `/buildings/${id}`,
  getBuildingConsumption:  (id: string)             => `/buildings/${id}/consumption`,
  getBuildingMeters:       (buildingId: string)     => `/buildings/${buildingId}/meters`,

  // Meters
  getMetersOverview:       ()                       => '/meters/overview',
  getMeter:                (id: string)             => `/meters/${id}`,
  getMeterReadings:        (id: string)             => `/meters/${id}/readings`,
  getMeterUptime:          (id: string)             => `/meters/${id}/uptime`,
  getMeterDowntimeEvents:  (id: string)             => `/meters/${id}/downtime-events`,
  getMeterAlarmEvents:     (id: string)             => `/meters/${id}/alarm-events`,
  getMeterAlarmSummary:    (id: string)             => `/meters/${id}/alarm-summary`,

  // Alerts
  getAlerts:               ()                       => '/alerts',
  getAlert:                (id: string)             => `/alerts/${id}`,
  acknowledgeAlert:        (id: string)             => `/alerts/${id}/acknowledge`,
  syncOfflineAlerts:       ()                       => '/alerts/sync-offline',

  // Hierarchy
  getHierarchy:            (buildingId: string)     => `/hierarchy/${buildingId}`,
  getHierarchyNode:        (nodeId: string)         => `/hierarchy/node/${nodeId}`,
  getHierarchyChildren:    (nodeId: string)         => `/hierarchy/node/${nodeId}/children`,
  getHierarchyConsumption: (nodeId: string)         => `/hierarchy/node/${nodeId}/consumption`,

  // Users / Roles
  getAdminUsers:           ()                       => '/users',
  getRoles:                ()                       => '/roles',

  // Auth
  getMe:                   ()                       => '/auth/me',
  getPermissions:          ()                       => '/auth/permissions',
};
