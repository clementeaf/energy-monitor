import * as dgram from 'dgram';

/** Result of a BACnet device reachability check. */
export interface BacnetPingResult {
  readonly reachable: boolean;
  readonly respondedDeviceId: number | null;
  readonly errorMessage: string | null;
}

/** Abstraction for BACnet Who-Is / I-Am reachability probes. */
export interface BacnetPingClient {
  /**
   * Sends Who-Is to host:port and waits for any BACnet/IP response.
   * @param host - Target IPv4/hostname
   * @param port - BACnet/IP UDP port (default 47808)
   * @param deviceId - Expected device instance (used for logging; optional filter future)
   * @param timeoutMs - Max wait for response
   */
  ping(
    host: string,
    port: number,
    deviceId: number,
    timeoutMs?: number,
  ): Promise<BacnetPingResult>;
}

/** Minimal BACnet/IP Original-Unicast-NPDU Who-Is (no device range). */
const WHO_IS_UNICAST = Buffer.from([0x81, 0x0a, 0x00, 0x08, 0x01, 0x00, 0x10, 0x08]);

/**
 * UDP Who-Is ping without external BACnet library (GAP-132 stub).
 */
export class UdpBacnetPingClient implements BacnetPingClient {
  /**
   * Probes device by sending Who-Is and accepting the first UDP reply.
   */
  async ping(
    host: string,
    port: number,
    _deviceId: number,
    timeoutMs = 6_000,
  ): Promise<BacnetPingResult> {
    return new Promise((resolve) => {
      const socket = dgram.createSocket('udp4');
      let settled = false;

      const finish = (result: BacnetPingResult): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        socket.close();
        resolve(result);
      };

      const timer = setTimeout(() => {
        finish({
          reachable: false,
          respondedDeviceId: null,
          errorMessage: `BACnet ping timeout after ${timeoutMs}ms`,
        });
      }, timeoutMs);

      socket.on('error', (err: Error) => {
        finish({
          reachable: false,
          respondedDeviceId: null,
          errorMessage: err.message,
        });
      });

      socket.on('message', () => {
        finish({
          reachable: true,
          respondedDeviceId: null,
          errorMessage: null,
        });
      });

      socket.send(WHO_IS_UNICAST, port, host, (err) => {
        if (err) {
          finish({
            reachable: false,
            respondedDeviceId: null,
            errorMessage: err.message,
          });
        }
      });
    });
  }
}
