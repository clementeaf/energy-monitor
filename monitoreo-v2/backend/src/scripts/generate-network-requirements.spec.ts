import { execSync } from 'child_process';
import { readFileSync, unlinkSync } from 'fs';
import { resolve } from 'path';

describe('generate-network-requirements', () => {
  const scriptPath = resolve(__dirname, '..', '..', 'scripts', 'generate-network-requirements.mjs');
  const tmpOutput = resolve(__dirname, '..', '..', 'tmp-network-reqs-test.md');

  let markdown: string;

  beforeAll(() => {
    execSync(`node ${scriptPath} --output ${tmpOutput}`, { timeout: 15_000 });
    markdown = readFileSync(tmpOutput, 'utf-8');
  });

  afterAll(() => {
    try { unlinkSync(tmpOutput); } catch { /* noop */ }
  });

  it('generates non-empty output', () => {
    expect(markdown.length).toBeGreaterThan(1000);
  });

  it('documents all connection types', () => {
    const expected = ['MQTT', 'Modbus TCP', 'Modbus RTU', 'BACnet', 'SNMP', 'Web Application', 'External API', 'DNS', 'NTP'];
    for (const conn of expected) {
      expect(markdown).toContain(conn);
    }
  });

  it('specifies key ports', () => {
    const ports = ['443', '8883', '502', '47808', '161', '53', '123'];
    for (const port of ports) {
      expect(markdown).toContain(port);
    }
  });

  it('includes bandwidth requirements per mall size', () => {
    expect(markdown).toContain('Minimum Bandwidth');
    expect(markdown).toContain('5 Mbps');
    expect(markdown).toContain('20 Mbps');
  });

  it('includes latency recommendation', () => {
    expect(markdown).toContain('200ms');
  });

  it('includes firewall rules table', () => {
    expect(markdown).toContain('Firewall Rules');
    expect(markdown).toContain('Outbound');
    expect(markdown).toContain('Internal');
  });

  it('documents connectivity resilience', () => {
    expect(markdown).toContain('offline buffer');
    expect(markdown).toContain('Backfill');
    expect(markdown).toContain('Stale data alert');
  });

  it('each connection has protocol, port, bandwidth, and latency', () => {
    const sections = markdown.split('### ').slice(1);
    expect(sections.length).toBeGreaterThanOrEqual(9);
    for (const section of sections) {
      expect(section).toContain('**Protocol**');
      expect(section).toContain('**Port**');
      expect(section).toContain('**Bandwidth**');
      expect(section).toContain('**Latency**');
    }
  });

  it('references Anexo 07 ARQ-18', () => {
    expect(markdown).toContain('ARQ-18');
  });
});
