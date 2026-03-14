export const routes = {
  // Buildings
  getBuildings: () => '/buildings',
  getBuilding:  (name: string) => `/buildings/${name}`,

  // Meters
  getMetersByBuilding: (buildingName: string) => `/meters/building/${buildingName}`,

  // Meter monthly
  getMeterMonthly: (meterId: string) => `/meter-monthly/${meterId}`,

  // Billing
  getBilling: (buildingName: string) => `/billing/${buildingName}`,
};
