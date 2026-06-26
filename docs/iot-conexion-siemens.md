# Credenciales de Conexion MQTT — IoT Core

## Parametros de conexion

| Parametro | Valor |
|---|---|
| **Endpoint** | `a3ledoeiifsfil-ats.iot.us-east-1.amazonaws.com` |
| **Puerto** | `8883` |
| **Protocolo** | MQTT over TLS (mutual authentication) |
| **Topic** | `powercenter/data` |

## Certificados adjuntos

| Archivo adjunto | Uso |
|---|---|
| `client-cert.pem` | Certificado del cliente (.crt) |
| `private-key.pem` | Clave privada del cliente (.key) |
| `amazon-root-ca.pem` | Certificado CA raiz de Amazon (.pem) |

Los tres archivos se entregan junto a este documento y son necesarios para establecer la conexion TLS mutua con el broker MQTT.

## Ejemplo de conexion (mosquitto)

```
mosquitto_pub \
  --host a3ledoeiifsfil-ats.iot.us-east-1.amazonaws.com \
  --port 8883 \
  --cafile amazon-root-ca.pem \
  --cert client-cert.pem \
  --key private-key.pem \
  --topic powercenter/data \
  --message '{"deviceId":"test","timestamp":"2026-01-01T00:00:00Z","variables":{"voltage":220}}'
```
