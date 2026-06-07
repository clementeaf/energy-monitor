import * as dgram from 'dgram';

/** Default MIB-II sysUpTime OID for reachability probes. */
export const SNMP_PING_OID = '1.3.6.1.2.1.1.3.0';

/** Result of an SNMP GET reachability check. */
export interface SnmpPingResult {
  readonly reachable: boolean;
  readonly errorMessage: string | null;
}

/** Abstraction for SNMP GET probes (stub / future net-snmp adapter). */
export interface SnmpPingClient {
  /**
   * Sends SNMPv2c GET for one OID and treats any valid response as reachable.
   * @param host - Target IPv4/hostname
   * @param port - SNMP UDP port (default 161)
   * @param community - SNMP community string
   * @param oid - Numeric OID to GET
   * @param timeoutMs - Max wait for response
   */
  ping(
    host: string,
    port: number,
    community: string,
    oid: string,
    timeoutMs?: number,
  ): Promise<SnmpPingResult>;
}

/**
 * Encodes BER length octets.
 */
function encodeBerLength(length: number): Buffer {
  if (length < 128) {
    return Buffer.from([length]);
  }
  const bytes: number[] = [];
  let remaining = length;
  while (remaining > 0) {
    bytes.unshift(remaining & 0xff);
    remaining >>= 8;
  }
  return Buffer.from([0x80 | bytes.length, ...bytes]);
}

/**
 * Encodes a non-negative BER integer.
 */
function encodeBerInteger(value: number): Buffer {
  if (value === 0) {
    return Buffer.from([0x02, 0x01, 0x00]);
  }
  if (value > 0 && value < 128) {
    return Buffer.from([0x02, 0x01, value]);
  }
  const bytes: number[] = [];
  let n = value;
  while (n > 0) {
    bytes.unshift(n & 0xff);
    n >>= 8;
  }
  return Buffer.concat([Buffer.from([0x02, bytes.length]), Buffer.from(bytes)]);
}

/**
 * Encodes BER sub-identifiers for an OID string.
 */
function encodeOidSubIdentifiers(parts: number[]): number[] {
  const out: number[] = [40 * parts[0] + parts[1]];
  for (let i = 2; i < parts.length; i++) {
    let value = parts[i];
    if (value < 128) {
      out.push(value);
      continue;
    }
    const stack: number[] = [];
    while (value > 0) {
      stack.unshift(value & 0x7f);
      value >>= 7;
    }
    for (let j = 0; j < stack.length - 1; j++) {
      stack[j] |= 0x80;
    }
    out.push(...stack);
  }
  return out;
}

/**
 * Encodes a numeric OID as BER OBJECT IDENTIFIER.
 */
function encodeBerOid(oid: string): Buffer {
  const parts = oid.split('.').map((segment) => Number(segment));
  const body = Buffer.from(encodeOidSubIdentifiers(parts));
  return Buffer.concat([Buffer.from([0x06]), encodeBerLength(body.length), body]);
}

/**
 * Wraps children in a BER SEQUENCE (tag 0x30).
 */
function encodeBerSequence(children: Buffer[]): Buffer {
  const body = Buffer.concat(children);
  return Buffer.concat([Buffer.from([0x30]), encodeBerLength(body.length), body]);
}

/**
 * Encodes an SNMPv2c GET-Request PDU for a single OID.
 */
export function buildSnmpV2cGetPacket(community: string, oid: string, requestId: number): Buffer {
  const version = encodeBerInteger(1);
  const communityOctets = Buffer.from(community, 'ascii');
  const communityField = Buffer.concat([
    Buffer.from([0x04]),
    encodeBerLength(communityOctets.length),
    communityOctets,
  ]);

  const varbind = encodeBerSequence([encodeBerOid(oid), Buffer.from([0x05, 0x00])]);
  const varbindList = encodeBerSequence([varbind]);
  const pduBody = Buffer.concat([
    encodeBerInteger(requestId),
    encodeBerInteger(0),
    encodeBerInteger(0),
    varbindList,
  ]);
  const pdu = Buffer.concat([Buffer.from([0xa0]), encodeBerLength(pduBody.length), pduBody]);

  return encodeBerSequence([version, communityField, pdu]);
}

/**
 * UDP SNMPv2c GET ping without external library (GAP-142 stub).
 */
export class UdpSnmpPingClient implements SnmpPingClient {
  /**
   * Probes agent by SNMP GET and accepts the first UDP reply.
   */
  async ping(
    host: string,
    port: number,
    community: string,
    oid: string,
    timeoutMs = 6_000,
  ): Promise<SnmpPingResult> {
    const packet = buildSnmpV2cGetPacket(community, oid, Math.floor(Math.random() * 1_000_000) + 1);

    return new Promise((resolve) => {
      const socket = dgram.createSocket('udp4');
      let settled = false;

      const finish = (result: SnmpPingResult): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        socket.close();
        resolve(result);
      };

      const timer = setTimeout(() => {
        finish({
          reachable: false,
          errorMessage: `SNMP ping timeout after ${timeoutMs}ms`,
        });
      }, timeoutMs);

      socket.on('error', (err: Error) => {
        finish({ reachable: false, errorMessage: err.message });
      });

      socket.on('message', () => {
        finish({ reachable: true, errorMessage: null });
      });

      socket.send(packet, port, host, (err) => {
        if (err) {
          finish({ reachable: false, errorMessage: err.message });
        }
      });
    });
  }
}
