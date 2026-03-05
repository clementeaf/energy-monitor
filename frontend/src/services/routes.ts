export const routes = {
  // Buildings
  getBuildings:            ()                       => '/buildings',
  getBuilding:             (id: string)             => `/buildings/${id}`,
  getBuildingConsumption:  (id: string)             => `/buildings/${id}/consumption`,
  getBuildingMeters:       (buildingId: string)     => `/buildings/${buildingId}/meters`,

  // Meters
  getMeter:                (id: string)             => `/meters/${id}`,
  getMeterReadings:        (id: string)             => `/meters/${id}/readings`,

  // Auth
  getMe:                   ()                       => '/auth/me',
  getPermissions:          ()                       => '/auth/permissions',
};
