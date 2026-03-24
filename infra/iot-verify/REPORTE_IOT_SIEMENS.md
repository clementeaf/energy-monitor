# Reporte de Conexión IoT Core — Siemens POC3000

**Fecha:** 23 de marzo de 2026

**Elaborado por:** Hoktus

---

## Resumen Ejecutivo

La conexión MQTT entre Siemens y AWS IoT Core se estableció exitosamente el 23 de marzo de 2026. Se recibieron **27 mensajes** con datos del medidor **"Medidor Servidores"** (451 variables eléctricas por mensaje). La transmisión se detuvo a las **00:00 UTC** por una **desconexión iniciada por el cliente (Siemens)**. No ha habido reconexión posterior.

---

## Cronología de Eventos

### Fase 1 — Intentos fallidos (23:26 – 23:33 UTC)

Siemens se conectó exitosamente al broker MQTT desde la IP `148.227.97.205`, pero sus intentos de publicar datos **fallaron por AUTHORIZATION_FAILURE**.

**Causa:** Siemens publicó al topic `powercenter/data`, pero la policy de IoT Core solo permitía el topic `meters/*`. Este fue un desajuste de configuración de nuestra parte, ya que no conocíamos el topic que Siemens utilizaría.

| Hora (UTC) | Evento | Resultado |
|------------|--------|-----------|
| 23:26:44 | Connect | OK |
| 23:27:04 | Publish `powercenter/data` | **AUTHORIZATION_FAILURE** |
| 23:28:08 | Publish `powercenter/data` | **AUTHORIZATION_FAILURE** |
| 23:29:03 | Publish `powercenter/data` | **AUTHORIZATION_FAILURE** |
| 23:30:07 | Publish `powercenter/data` | **AUTHORIZATION_FAILURE** |
| 23:31:02 | Publish `powercenter/data` | **AUTHORIZATION_FAILURE** |
| 23:32:06 | Publish `powercenter/data` | **AUTHORIZATION_FAILURE** |
| 23:33:02 | Publish `powercenter/data` | **AUTHORIZATION_FAILURE** |

**Nota:** durante esta fase, Siemens reintentó automáticamente la conexión múltiples veces (reconexión tras cada error), lo cual es comportamiento normal del cliente MQTT.

### Fase 2 — Corrección de policy (23:33 UTC)

Hoktus detectó el error en los logs de CloudWatch y actualizó la policy de IoT Core para permitir el topic `powercenter/*`.

**Acción:** Se agregó `arn:aws:iot:us-east-1:058310292956:topic/powercenter/*` a la policy `external-meter-provider-policy`.

### Fase 3 — Transmisión exitosa (23:34 – 00:00 UTC)

Tras la corrección, los datos comenzaron a fluir exitosamente. Se recibieron **27 mensajes** en un período de 26 minutos (1 mensaje por minuto).

| Hora (UTC) | Evento | Resultado |
|------------|--------|-----------|
| 23:34:05 | Publish `powercenter/data` | **OK** → S3 |
| 23:35:09 | Publish `powercenter/data` | **OK** → S3 |
| 23:36:04 | Publish `powercenter/data` | **OK** → S3 |
| ... | *(1 mensaje por minuto)* | **OK** → S3 |
| 23:59:01 | Publish `powercenter/data` | **OK** → S3 |
| 00:00:05 | Publish `powercenter/data` | **OK** → S3 (último) |

### Fase 4 — Desconexión (00:00:18 UTC)

```
eventType: Disconnect
clientId: external-meter-povider
disconnectReason: CLIENT_INITIATED_DISCONNECT
```

**Siemens cerró la conexión de forma voluntaria** (`CLIENT_INITIATED_DISCONNECT`). No fue un error de red, timeout, ni problema del broker. El cliente decidió desconectarse.

**Desde entonces no ha habido ningún intento de reconexión.**

---

## Datos Recibidos

| Campo | Valor |
|-------|-------|
| **Medidor** | Medidor Servidores |
| **Device ID** | `6ab27db7-0a61-40c2-8a93-35e9e2376683` |
| **Variables por mensaje** | 451 |
| **Tamaño por mensaje** | ~79 KB |
| **Total mensajes** | 27 |
| **Primer mensaje** | 23:34:05 UTC |
| **Último mensaje** | 00:00:05 UTC |
| **Intervalo** | ~60 segundos |
| **IP origen** | 148.227.97.205 |

### Variables recibidas (muestra)

| Variable | Valor | Unidad |
|----------|-------|--------|
| Voltage L1-N | 233.5 | V |
| Voltage L2-N | 233.0 | V |
| Voltage L3-N | 231.8 | V |
| Total Active Power | 1.286 | kW |
| Total Power Factor | 0.79 | — |
| Total Apparent Power | 1.624 | kVA |
| Total Active Energy Import T1 | 36,540.56 | kWh |
| Ø Current | 2.346 | A |
| Frequency | — | Hz |

---

## Asignación de Responsabilidades

### Error de autorización (Fase 1) — Responsabilidad compartida

- **Hoktus:** Configuró la policy inicial con topic `meters/*`, sin conocer el topic que Siemens utilizaría. Debió consultarse previamente el topic exacto.
- **Siemens:** No comunicó anticipadamente que el topic sería `powercenter/data`.
- **Resolución:** Hoktus corrigió la policy en menos de 7 minutos tras detectar el error.

### Detención de transmisión (Fase 4) — Responsabilidad de Siemens

- El log de AWS IoT Core registra `CLIENT_INITIATED_DISCONNECT` a las 00:00:18 UTC.
- Esto significa que **el dispositivo/software de Siemens decidió cerrar la conexión MQTT**.
- No hay evidencia de error, timeout, ni problema de infraestructura del lado de AWS.
- **No ha habido ningún intento de reconexión posterior.**

---

## Estado Actual de la Infraestructura

| Componente | Estado |
|-----------|--------|
| AWS IoT Core Thing | Activo |
| Certificado TLS | Activo |
| Policy (`powercenter/*`) | Corregida y activa |
| Regla `powercenter_to_s3` | Activa |
| S3 (almacenamiento) | 27 archivos recibidos correctamente |
| RDS (base de datos) | 27 registros insertados en tabla `iot_readings` |
| Lambda de ingesta | Activa (cada 15 min) |
| Logs CloudWatch | Habilitados |

**El sistema está listo para recibir datos. Esperando reconexión de Siemens.**

---

## Acción Requerida

Siemens debe:

1. **Reconectar** el cliente MQTT al broker
2. Confirmar el **intervalo de envío** (se observó 1 min, se acordó 15 min)
3. Verificar que la configuración de su lado no tenga un **límite de tiempo de sesión** que haya causado la desconexión automática a las 00:00 UTC
