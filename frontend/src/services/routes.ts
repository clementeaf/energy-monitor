export const routes = {
  // Buildings
  getBuildings: () => '/buildings',
  getBuilding:  (name: string) => `/buildings/${name}`,

  // Meters
  getMetersByBuilding: (buildingName: string) => `/meters/building/${buildingName}`,

  // Billing
  getBilling: (buildingName: string) => `/billing/${buildingName}`,
};
