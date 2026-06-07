/** Preset integration connector types for create/edit forms. */
export interface IntegrationTypePreset {
  value: string;
  label: string;
  stub?: boolean;
}

export const INTEGRATION_TYPE_PRESETS: IntegrationTypePreset[] = [
  { value: 'mqtt', label: 'MQTT' },
  { value: 'api_rest', label: 'REST API' },
  { value: 'ftp', label: 'FTP' },
  { value: 'webhook', label: 'Webhook entrante' },
  { value: 'datalake', label: 'Data Lake' },
  { value: 'bacnet', label: 'BACnet', stub: true },
  { value: 'snmp', label: 'SNMP', stub: true },
];

/**
 * Returns whether an integration type is a dev/stub connector.
 */
export function isStubIntegrationType(type: string): boolean {
  return INTEGRATION_TYPE_PRESETS.some((p) => p.value === type && p.stub);
}
