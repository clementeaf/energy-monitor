import api from './api';
import { routes } from './routes';
import type { BuildingSummary } from '../types';

export const fetchBuildings = () =>
  api.get<BuildingSummary[]>(routes.getBuildings()).then((r) => r.data);

export const fetchBuilding = (name: string) =>
  api.get<BuildingSummary[]>(routes.getBuilding(name)).then((r) => r.data);
