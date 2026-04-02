export type ConcentratorStatus = 'online' | 'offline' | 'error' | 'maintenance';

export interface Concentrator {
  id: string;
  buildingId: string;
  name: string;
  model: string;
  serialNumber: string | null;
  ipAddress: string | null;
  firmwareVersion: string | null;
  status: ConcentratorStatus;
  lastHeartbeatAt: string | null;
  mqttConnected: boolean;
  batteryLevel: number | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ConcentratorMeterLink {
  id: string;
  concentratorId: string;
  meterId: string;
}
