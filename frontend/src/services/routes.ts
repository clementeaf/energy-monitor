export const routes = {
  // Buildings
  getBuildings:            ()                       => '/buildings',
  getBuilding:             (id: string)             => `/buildings/${id}`,
  getBuildingConsumption:  (id: string)             => `/buildings/${id}/consumption`,
  getBuildingLocals:       (buildingId: string)     => `/buildings/${buildingId}/locals`,

  // Locals
  getLocal:                (id: string)             => `/locals/${id}`,
  getLocalConsumption:     (id: string)             => `/locals/${id}/consumption`,

  // Auth
  getMe:                   ()                       => '/auth/me',
  getPermissions:          ()                       => '/auth/permissions',
};
