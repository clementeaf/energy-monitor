// Auth
export { useAuth } from './auth/useAuth';
export { useDemoAuth } from './auth/useDemoAuth';
export { useMicrosoftAuth } from './auth/useMicrosoftAuth';
export { useGoogleAuth } from './auth/useGoogleAuth';

// Queries
export { useBuildings, useBuilding, useBuildingConsumption } from './queries/useBuildings';
export { useLocalsByBuilding, useLocal, useLocalConsumption } from './queries/useLocals';
export { useMe, usePermissions } from './queries/useAuthQuery';
