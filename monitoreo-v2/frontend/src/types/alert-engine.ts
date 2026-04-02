export interface EvaluateResult {
  created: number;
  autoResolved: number;
}

export type AlertFamily = 'communication' | 'electrical' | 'consumption' | 'operational' | 'generation' | 'bus';

export const ALERT_FAMILIES: Record<AlertFamily, string[]> = {
  communication: ['METER_OFFLINE', 'CONCENTRATOR_OFFLINE', 'COMM_DEGRADED'],
  electrical: ['VOLTAGE_OUT_OF_RANGE', 'LOW_POWER_FACTOR', 'HIGH_THD', 'PHASE_IMBALANCE', 'FREQUENCY_OUT_OF_RANGE', 'OVERCURRENT', 'BREAKER_TRIP', 'NEUTRAL_FAULT'],
  consumption: ['ABNORMAL_CONSUMPTION', 'PEAK_DEMAND_EXCEEDED', 'ENERGY_DEVIATION'],
  operational: ['METER_TAMPER', 'CONFIG_CHANGE', 'FIRMWARE_MISMATCH'],
  generation: ['GENERATION_LOW', 'INVERTER_FAULT', 'GRID_EXPORT_LIMIT'],
  bus: ['BUS_ERROR', 'MODBUS_TIMEOUT', 'CRC_ERROR'],
};

export const FAMILY_LABELS: Record<AlertFamily, string> = {
  communication: 'Comunicación',
  electrical: 'Eléctrica',
  consumption: 'Consumo',
  operational: 'Operativa',
  generation: 'Generación',
  bus: 'Bus / Concentrador',
};

export const ALERT_TYPE_LABELS: Record<string, string> = {
  METER_OFFLINE: 'Medidor sin comunicación',
  CONCENTRATOR_OFFLINE: 'Concentrador sin heartbeat',
  COMM_DEGRADED: 'Comunicación degradada',
  VOLTAGE_OUT_OF_RANGE: 'Voltaje fuera de rango',
  LOW_POWER_FACTOR: 'Factor de potencia bajo',
  HIGH_THD: 'Distorsión armónica alta',
  PHASE_IMBALANCE: 'Desequilibrio de fases',
  FREQUENCY_OUT_OF_RANGE: 'Frecuencia fuera de rango',
  OVERCURRENT: 'Sobrecorriente',
  BREAKER_TRIP: 'Disparo de breaker',
  NEUTRAL_FAULT: 'Falla de neutro',
  ABNORMAL_CONSUMPTION: 'Consumo anormal',
  PEAK_DEMAND_EXCEEDED: 'Demanda peak excedida',
  ENERGY_DEVIATION: 'Desviación de energía',
  METER_TAMPER: 'Manipulación de medidor',
  CONFIG_CHANGE: 'Cambio de configuración',
  FIRMWARE_MISMATCH: 'Firmware no coincide',
  GENERATION_LOW: 'Generación baja',
  INVERTER_FAULT: 'Falla de inversor',
  GRID_EXPORT_LIMIT: 'Límite exportación red',
  BUS_ERROR: 'Error de bus',
  MODBUS_TIMEOUT: 'Timeout Modbus',
  CRC_ERROR: 'Errores CRC excesivos',
};
