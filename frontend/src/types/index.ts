export interface Building {
  id: string;
  name: string;
  address: string;
  totalArea: number;
  metersCount: number;
}

export interface Meter {
  id: string;
  buildingId: string;
  model: string;
  phaseType: string;
  busId: string;
  modbusAddress: number;
  uplinkRoute: string;
  status: string;
  lastReadingAt: string | null;
}

export interface Reading {
  timestamp: string;
  voltageL1: number | null;
  voltageL2: number | null;
  voltageL3: number | null;
  currentL1: number | null;
  currentL2: number | null;
  currentL3: number | null;
  powerKw: number;
  reactivePowerKvar: number | null;
  powerFactor: number | null;
  frequencyHz: number | null;
  energyKwhTotal: number;
  thdVoltagePct: number | null;
  thdCurrentPct: number | null;
  phaseImbalancePct: number | null;
  breakerStatus: string | null;
  digitalInput1: number | null;
  digitalInput2: number | null;
  digitalOutput1: number | null;
  digitalOutput2: number | null;
  alarm: string | null;
  modbusCrcErrors: number | null;
}

export interface ConsumptionPoint {
  timestamp: string;
  totalPowerKw: number;
  avgPowerKw: number;
  peakPowerKw: number;
}

// --- Hierarchy ---

export interface HierarchyNode {
  id: string;
  parentId: string | null;
  buildingId: string;
  name: string;
  level: number;
  nodeType: 'building' | 'panel' | 'subpanel' | 'circuit';
  meterId: string | null;
  sortOrder: number;
}

export interface HierarchyChildSummary extends HierarchyNode {
  totalKwh: number;
  avgPowerKw: number;
  peakPowerKw: number;
  meterCount: number;
  status: 'online' | 'offline' | 'partial';
  /** Number of readings rows in range for this subtree (backend diagnostic). */
  readingsInRange?: number;
}

export interface HierarchyNodeWithPath {
  node: HierarchyNode;
  path: HierarchyNode[];
}

// --- Uptime ---

export interface UptimeSummary {
  period: 'daily' | 'weekly' | 'monthly';
  totalSeconds: number;
  uptimeSeconds: number;
  downtimeSeconds: number;
  uptimePercent: number;
  downtimeEvents: number;
}

export interface UptimeAll {
  daily: UptimeSummary;
  weekly: UptimeSummary;
  monthly: UptimeSummary;
}

export interface DowntimeEvent {
  downtimeStart: string;
  downtimeEnd: string;
  durationSeconds: number;
}

// --- Alarms ---

export interface AlarmEvent {
  timestamp: string;
  alarm: string;
  voltageL1: number | null;
  currentL1: number | null;
  powerFactor: number | null;
  thdCurrentPct: number | null;
  modbusCrcErrors: number | null;
}

export interface AlarmSummary {
  total: number;
  byType: { alarm: string; count: number }[];
}

// --- Meter Overview ---

export interface MeterOverview {
  id: string;
  buildingId: string;
  model: string;
  phaseType: string;
  busId: string;
  status: string;
  lastReadingAt: string | null;
  uptime24h: number;
  alarmCount30d: number;
}

// --- Alerts ---

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';

export interface Alert {
  id: string;
  type: string;
  severity: AlertSeverity;
  status: AlertStatus;
  meterId: string | null;
  buildingId: string | null;
  title: string;
  message: string;
  triggeredAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  metadata: Record<string, unknown>;
}

export interface AlertsSyncSummary {
  scannedMeters: number;
  createdAlerts: number;
  resolvedAlerts: number;
  activeOfflineAlerts: number;
  scannedAt: string;
}

// --- Billing ---

export interface BillingCenterSummary {
  id: number;
  centerName: string;
  year: number;
  month: number;
  totalConsumptionKwh: number | null;
  peakMaxKw: number | null;
  demandPuntaKwh: number | null;
  pctPunta: number | null;
  avgDailyKwh: number | null;
  topConsumerLocal: string | null;
}

export interface BillingMonthlyDetail {
  id: number;
  centerName: string;
  year: number;
  month: number;
  meterId: string;
  storeType: string | null;
  storeName: string | null;
  phase: string | null;
  consumptionKwh: number | null;
  peakKw: number | null;
  demandPuntaKwh: number | null;
  pctPunta: number | null;
  avgDailyKwh: number | null;
  energyChargeClp: number | null;
  demandMaxKw: number | null;
  demandPuntaKw: number | null;
  fixedChargeClp: number | null;
  totalNetClp: number | null;
  ivaClp: number | null;
  totalWithIvaClp: number | null;
}

export interface BillingTariff {
  id: number;
  tariffName: string;
  year: number;
  month: number;
  consumptionEnergyKwh: number | null;
  demandMaxKw: number | null;
  demandPuntaKw: number | null;
  kwhTroncal: number | null;
  fixedChargeClp: number | null;
}

// --- Domain types (future use) ---

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

export interface AdminUserAccount {
  id: string;
  email: string;
  name: string;
  roleId: number;
  role: string;
  roleLabel: string;
  provider: 'microsoft' | 'google' | null;
  isActive: boolean;
  siteIds: string[];
  invitationStatus: 'invited' | 'active' | 'disabled' | 'expired';
  invitationExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInvitationResult extends AdminUserAccount {
  invitationToken: string;
}

export interface InvitationValidationResult {
  email: string;
  name: string;
  role: string;
  roleLabel: string;
  invitationStatus: 'invited' | 'active' | 'disabled' | 'expired';
  invitationExpiresAt: string | null;
}

export interface RoleOption {
  id: number;
  name: string;
  labelEs: string;
  requiresSiteScope: boolean;
}

export interface CreateUserInvitationInput {
  email: string;
  name: string;
  roleId: number;
  siteIds: string[];
  isActive?: boolean;
}
