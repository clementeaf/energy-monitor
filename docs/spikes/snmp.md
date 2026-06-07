# Spike SNMP — GAP-140

**Fecha:** 2026-06-06  
**Alcance:** Evaluar librerías Node.js para SNMP (v1/v2c) en monitoreo-v2, mapeo OID → `register_mappings`.  
**Veredicto:** **GO** — medidores de red/PowerCenter expuestos por SNMP encajan en el pipeline existente; stub UDP GET suficiente para sync ping (GAP-142); `net-snmp` para polls reales.

## Contexto

Algunos medidores y PDUs exponen energía vía SNMP (MIB-II + vendor MIBs). El stack ya incluye `protocol_types.snmp` y `register_mappings`. Ola 7E agrega inventario `snmp_devices` y conector stub.

## Opciones evaluadas

| Librería | Protocolos | TS | Mantenimiento | OID walk | Notas |
|----------|------------|-----|---------------|----------|-------|
| **net-snmp** | v1, v2c, v3 | No (JS puro) | Activo (~57K dl/sem) | Sí (`get`, `subtree`, `tableColumns`) | Estándar de facto en Node; MIT |
| **snmp-native** | v1/v2c | No | Bajo | Limitado | Menor superficie; v3 ausente |
| **Native dgram + BER manual** | v2c GET only | Sí | N/A | No | Viable para ping stub; no escala a walks |

## Mapeo OID → readings

`register_key` almacena OID numérico o alias lógico acordado por `device_profile`:

| register_key (ejemplo) | target_field | scale_factor | Fuente típica |
|------------------------|--------------|--------------|---------------|
| `1.3.6.1.4.1.x.power.1` | `power_kw` | 0.001 | Vendor MIB (W→kW) |
| `1.3.6.1.2.1.1.3.0` | — | — | MIB-II sysUpTime (solo ping) |
| `1.3.6.1.4.1.637.x` | varios | vendor | Schneider / PowerLogic |

Plantillas globales por `device_profile` (ej. `snmp-pdu-generic`) se clonan al onboarding igual que Modbus/MQTT.

## Recomendación

1. **Ola 7E (ahora):** `SnmpConnector` stub con GET UDP a `sysUpTime.0` (1.3.6.1.2.1.1.3.0) sin dependencia npm.
2. **Post-7E:** instalar `net-snmp` para `session.get` / `subtree` en sync programado; mapear OIDs vía `register_mappings` → `NormalizationService` → `readings` (`source='snmp'`).
3. **Secretos:** community string solo en `integrations.config` (JSON cifrado futuro); **no** persistir en `snmp_devices`.

## Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Community robo en repos/logs | Config en integration; redactar en audit logs |
| UDP 161 bloqueado | SG egress documentado en runbook |
| OID distinto por firmware | `device_profile` + overrides tenant |
| SNMPv3 requerido | Fase 2 con `createV3Session` (net-snmp) |

## No-go (v1)

- SNMP Trap receiver como ingest principal (evaluar Ola 8 webhooks)
- Agente SNMP (responder GET) — fuera de scope

## Próximo paso

Schema `snmp_devices`, stub connector registrado. Pipeline readings (`source=snmp`) en misma línea que BACnet cuando se implemente poll real.
