export type MeterPhaseType = 'single_phase' | 'three_phase';

export interface Meter {
  id: string;
  buildingId: string;
  name: string;
  code: string;
  meterType: string;
  isActive: boolean;
  metadata: Record<string, unknown>;
  externalId: string | null;
  model: string | null;
  serialNumber: string | null;
  ipAddress: string | null;
  modbusAddress: number | null;
  busId: string | null;
  uplinkRoute?: string | null;
  crcErrorsLastPoll?: number;
  phaseType: MeterPhaseType;
  nominalVoltage: string | null;
  nominalCurrent: string | null;
  contractedDemandKw: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMeterPayload {
  buildingId: string;
  name: string;
  code: string;
  meterType?: string;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
  externalId?: string;
  model?: string;
  serialNumber?: string;
  ipAddress?: string;
  modbusAddress?: number;
  busId?: string;
  phaseType?: MeterPhaseType;
  uplinkRoute?: string;
  nominalVoltage?: number;
  nominalCurrent?: number;
  contractedDemandKw?: number;
}

export interface UpdateMeterPayload {
  name?: string;
  meterType?: string;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
  externalId?: string;
  model?: string;
  serialNumber?: string;
  ipAddress?: string;
  modbusAddress?: number;
  busId?: string;
  phaseType?: MeterPhaseType;
  uplinkRoute?: string;
  nominalVoltage?: number;
  nominalCurrent?: number;
  contractedDemandKw?: number;
}
