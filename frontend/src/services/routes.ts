export const routes = {
  // Buildings
  getBuildings:            ()                       => '/buildings',
  getBuilding:             (id: string)             => `/buildings/${id}`,
  getBuildingConsumption:  (id: string)             => `/buildings/${id}/consumption`,
  getBuildingMeters:       (buildingId: string)     => `/buildings/${buildingId}/meters`,

  // Meters
  getMeter:                (id: string)             => `/meters/${id}`,
  getMeterReadings:        (id: string)             => `/meters/${id}/readings`,

  // Hierarchy
  getHierarchy:            (buildingId: string)     => `/hierarchy/${buildingId}`,
  getHierarchyNode:        (nodeId: string)         => `/hierarchy/node/${nodeId}`,
  getHierarchyChildren:    (nodeId: string)         => `/hierarchy/node/${nodeId}/children`,
  getHierarchyConsumption: (nodeId: string)         => `/hierarchy/node/${nodeId}/consumption`,

  // Auth
  getMe:                   ()                       => '/auth/me',
  getPermissions:          ()                       => '/auth/permissions',
};
