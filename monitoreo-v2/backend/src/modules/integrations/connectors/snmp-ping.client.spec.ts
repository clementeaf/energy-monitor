import { buildSnmpV2cGetPacket } from './snmp-ping.client';

describe('buildSnmpV2cGetPacket', () => {
  it('produces a BER SEQUENCE starting with tag 0x30', () => {
    const packet = buildSnmpV2cGetPacket('public', '1.3.6.1.2.1.1.3.0', 42);
    expect(packet[0]).toBe(0x30);
    expect(packet.length).toBeGreaterThan(20);
  });

  it('embeds the community string', () => {
    const packet = buildSnmpV2cGetPacket('public', '1.3.6.1.2.1.1.3.0', 1);
    expect(packet.includes(Buffer.from('public'))).toBe(true);
  });
});
