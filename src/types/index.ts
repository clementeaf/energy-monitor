export interface Building {
  id: string;
  name: string;
  address: string;
  totalArea: number;
  localsCount: number;
}

export interface Local {
  id: string;
  buildingId: string;
  name: string;
  floor: number;
  area: number;
  type: string;
}

export interface MonthlyConsumption {
  month: string;
  consumption: number;
  unit: string;
}

// --- Domain types (based on spec Hoja 5) ---

export interface Meter {
  id: string;
  siteId: string;
  model: string;
  serial: string;
  ip: string;
  protocol: 'modbus-tcp' | 'modbus-rtu' | 'mqtt';
  hierarchyNodeId: string;
  status: 'online' | 'offline' | 'error';
  lastReadingAt: string | null;
}

export interface HierarchyNode {
  id: string;
  siteId: string;
  parentId: string | null;
  name: string;
  level: 'building' | 'main-panel' | 'sub-panel' | 'circuit' | 'meter';
  meterId: string | null;
  status: 'active' | 'inactive';
}

export interface Reading {
  id: string;
  meterId: string;
  timestamp: string;
  kWh: number;
  kW: number;
  kVArh: number;
  powerFactor: number;
  voltageL1: number;
  voltageL2: number;
  voltageL3: number;
  currentL1: number;
  currentL2: number;
  currentL3: number;
  thdV: number;
  thdI: number;
}

export interface Alert {
  id: string;
  siteId: string;
  meterId: string | null;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  status: 'active' | 'acknowledged' | 'resolved';
  assignedTo: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface Invoice {
  id: string;
  siteId: string;
  tenantId: string;
  period: string;
  kWh: number;
  kW: number;
  kVArh: number;
  energyCharge: number;
  demandCharge: number;
  reactiveCharge: number;
  fixedCharge: number;
  netTotal: number;
  tax: number;
  total: number;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  detail: Record<string, unknown>;
  ip: string;
  timestamp: string;
}

export interface Tenant {
  id: string;
  siteId: string;
  name: string;
  rut: string;
  localId: string;
  meterId: string | null;
  contractStart: string;
  contractEnd: string | null;
  status: 'active' | 'inactive';
}

export interface Integration {
  id: string;
  name: string;
  type: 'datalake' | 'erp' | 'sso' | 'mqtt';
  status: 'connected' | 'disconnected' | 'error';
  lastSyncAt: string | null;
  recordsSynced: number;
  errors: number;
}
