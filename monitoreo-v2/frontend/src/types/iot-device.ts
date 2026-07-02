import type { Meter } from './meter';

export interface IotDevice {
  id: string;
  deviceClientId: string;
  firstSeen: string;
  lastSeen: string;
  assignedMeterId: string | null;
  assignedMeter: Meter | null;
  payloadSample: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
