import type { Building, Local, MonthlyConsumption } from '../types';
import { buildings } from '../mocks/buildings';
import { locals } from '../mocks/locals';
import { consumptionByLocal } from '../mocks/consumption';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchBuildings(): Promise<Building[]> {
  await delay(300);
  return buildings;
}

export async function fetchBuilding(id: string): Promise<Building | undefined> {
  await delay(200);
  return buildings.find((b) => b.id === id);
}

export async function fetchLocalsByBuilding(buildingId: string): Promise<Local[]> {
  await delay(200);
  return locals.filter((l) => l.buildingId === buildingId);
}

export async function fetchLocal(localId: string): Promise<Local | undefined> {
  await delay(200);
  return locals.find((l) => l.id === localId);
}

export async function fetchConsumption(localId: string): Promise<MonthlyConsumption[]> {
  await delay(250);
  return consumptionByLocal[localId] ?? [];
}

export async function fetchBuildingConsumption(buildingId: string): Promise<MonthlyConsumption[]> {
  await delay(300);
  const buildingLocals = locals.filter((l) => l.buildingId === buildingId);
  const months = consumptionByLocal[buildingLocals[0]?.id] ?? [];

  return months.map((m, i) => ({
    month: m.month,
    consumption: buildingLocals.reduce(
      (sum, local) => sum + (consumptionByLocal[local.id]?.[i]?.consumption ?? 0),
      0,
    ),
    unit: 'kWh',
  }));
}
