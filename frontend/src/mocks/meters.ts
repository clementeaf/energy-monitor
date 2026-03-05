import type { Meter } from '../types';

export const meters: Meter[] = [
  { id: 'M001', buildingId: 'pac4220', model: 'PAC1670', phaseType: '3P', busId: 'PAC4220-Bus1', modbusAddress: 1,  uplinkRoute: 'PAC4220→POWER_CENTER_3000→MQTT', status: 'online', lastReadingAt: '2026-03-01T23:45:00Z' },
  { id: 'M002', buildingId: 'pac4220', model: 'PAC1670', phaseType: '3P', busId: 'PAC4220-Bus1', modbusAddress: 2,  uplinkRoute: 'PAC4220→POWER_CENTER_3000→MQTT', status: 'online', lastReadingAt: '2026-03-01T23:45:00Z' },
  { id: 'M004', buildingId: 'pac4220', model: 'PAC1651', phaseType: '1P', busId: 'PAC4220-Bus1', modbusAddress: 4,  uplinkRoute: 'PAC4220→POWER_CENTER_3000→MQTT', status: 'online', lastReadingAt: '2026-03-01T23:45:00Z' },
  { id: 'M005', buildingId: 'pac4220', model: 'PAC1651', phaseType: '1P', busId: 'PAC4220-Bus1', modbusAddress: 5,  uplinkRoute: 'PAC4220→POWER_CENTER_3000→MQTT', status: 'online', lastReadingAt: '2026-03-01T23:45:00Z' },
  { id: 'M008', buildingId: 'pac4220', model: 'PAC1651', phaseType: '1P', busId: 'PAC4220-Bus2', modbusAddress: 8,  uplinkRoute: 'PAC4220→POWER_CENTER_3000→MQTT', status: 'online', lastReadingAt: '2026-03-01T23:45:00Z' },
  { id: 'M009', buildingId: 'pac4220', model: 'PAC1651', phaseType: '1P', busId: 'PAC4220-Bus2', modbusAddress: 9,  uplinkRoute: 'PAC4220→POWER_CENTER_3000→MQTT', status: 'online', lastReadingAt: '2026-03-01T23:45:00Z' },
  { id: 'M012', buildingId: 'pac4220', model: 'PAC1670', phaseType: '3P', busId: 'PAC4220-Bus2', modbusAddress: 12, uplinkRoute: 'PAC4220→POWER_CENTER_3000→MQTT', status: 'online', lastReadingAt: '2026-03-01T23:45:00Z' },
  { id: 'M014', buildingId: 'pac4220', model: 'PAC1651', phaseType: '1P', busId: 'PAC4220-Bus2', modbusAddress: 14, uplinkRoute: 'PAC4220→POWER_CENTER_3000→MQTT', status: 'online', lastReadingAt: '2026-03-01T23:45:00Z' },
  { id: 'M003', buildingId: 's7-1200', model: 'PAC1670', phaseType: '3P', busId: 'S7-1200-Bus1', modbusAddress: 3,  uplinkRoute: 'S7-1200→MQTT_Module→Cloud', status: 'online', lastReadingAt: '2026-03-01T23:45:00Z' },
  { id: 'M006', buildingId: 's7-1200', model: 'PAC1651', phaseType: '1P', busId: 'S7-1200-Bus1', modbusAddress: 6,  uplinkRoute: 'S7-1200→MQTT_Module→Cloud', status: 'online', lastReadingAt: '2026-03-01T23:45:00Z' },
  { id: 'M007', buildingId: 's7-1200', model: 'PAC1651', phaseType: '1P', busId: 'S7-1200-Bus1', modbusAddress: 7,  uplinkRoute: 'S7-1200→MQTT_Module→Cloud', status: 'online', lastReadingAt: '2026-03-01T23:45:00Z' },
  { id: 'M010', buildingId: 's7-1200', model: 'PAC1651', phaseType: '1P', busId: 'S7-1200-Bus1', modbusAddress: 10, uplinkRoute: 'S7-1200→MQTT_Module→Cloud', status: 'online', lastReadingAt: '2026-03-01T23:45:00Z' },
  { id: 'M011', buildingId: 's7-1200', model: 'PAC1670', phaseType: '3P', busId: 'S7-1200-Bus2', modbusAddress: 11, uplinkRoute: 'S7-1200→MQTT_Module→Cloud', status: 'online', lastReadingAt: '2026-03-01T23:45:00Z' },
  { id: 'M013', buildingId: 's7-1200', model: 'PAC1670', phaseType: '3P', busId: 'S7-1200-Bus2', modbusAddress: 13, uplinkRoute: 'S7-1200→MQTT_Module→Cloud', status: 'online', lastReadingAt: '2026-03-01T23:45:00Z' },
  { id: 'M015', buildingId: 's7-1200', model: 'PAC1651', phaseType: '1P', busId: 'S7-1200-Bus2', modbusAddress: 15, uplinkRoute: 'S7-1200→MQTT_Module→Cloud', status: 'online', lastReadingAt: '2026-03-01T23:45:00Z' },
];
