export const routes = {
  // Buildings
  getBuildings: () => '/buildings',
  getBuilding:  (name: string) => `/buildings/${name}`,

  // Billing
  getBilling: (buildingName: string) => `/billing/${buildingName}`,
};
