# Device profile conventions (GAP-115)

Register mappings are keyed by **`device_profile`**: a stable string that identifies a hardware/firmware profile independent of tenant. Mappings translate protocol-specific register keys into normalized `readings` fields via `NormalizationService.apply()`.

## Naming rules

| Rule | Example |
|------|---------|
| Lowercase, hyphen-separated | `siemens-poc3000` |
| Vendor + model or product code | `pac1670` |
| No tenant or site names in profile | Avoid `pasa-mall-x` |
| Version suffix when profiles diverge | `pac1670-v2` (future) |

## Seeded profiles (Ola 7A reference)

| device_profile | Protocol | Description |
|----------------|----------|-------------|
| `pac1670` | `modbus` | PASA PAC1670 concentrator / mall meters via Modbus map |
| `siemens-poc3000` | `mqtt` | Siemens PowerCenter POC3000 via IoT Core MQTT (EAV variables) |

Global templates use `tenant_id IS NULL` in `register_mappings`. Tenant-specific copies are created automatically on tenant onboarding via `cloneGlobalRegisterMappings()` (Ola 7B).

## PAC1670 Modbus template (GAP-120)

Global seed in `database/migrations/33-seed-pac1670-modbus.sql` — 14 holding registers:

| register_key | target_field | scale_factor | unit |
|--------------|--------------|--------------|------|
| 40001 | power_kw | 0.001 | kW |
| 40003 | reactive_power_kvar | 0.001 | kVAR |
| 40005 | power_factor | 0.001 | — |
| 40007 | frequency_hz | 0.01 | Hz |
| 40009 | energy_kwh_total | 0.001 | kWh |
| 40101–40111 | voltage_l1–l3, current_l1–l3 | 0.1 / 0.001 | V / A |
| 40201–40205 | thd_voltage_pct, thd_current_pct, phase_imbalance_pct | 0.01 | % |

Adjust per firmware revision via tenant-specific overrides in `/register-mappings`.

## Siemens POC3000 MQTT template (GAP-125)

Global seed in `database/migrations/34-seed-siemens-poc3000-mqtt.sql` — IoT EAV variable names mapped to `readings`:

| register_key | target_field | scale_factor | unit |
|--------------|--------------|--------------|------|
| voltage_l1–l3 | voltage_l1–l3 | 1 | V |
| current_l1–l3 | current_l1–l3 | 1 | A |
| active_power_w | power_kw | 0.001 | kW |
| reactive_power_var | reactive_power_kvar | 0.001 | kVAR |
| power_factor | power_factor | 1 | — |
| frequency_hz | frequency_hz | 1 | Hz |
| energy_import_wh | energy_kwh_total | 0.001 | kWh |
| thd_voltage_l1_pct | thd_voltage_pct | 1 | % |
| thd_current_l1_pct | thd_current_pct | 1 | % |
| peak_demand_w | peak_demand_kw | 0.001 | kW |

Runtime: `IotReadingsService` pivots raw EAV rows and applies `NormalizationService` via `lib/iot-variable-mappings.ts` (no inline `/1000` in SQL). MQTT integration sync promotes payloads to `readings` with `source='mqtt'` via `MqttReadingsIngressService` (GAP-126).

## BACnet inventory (GAP-131)

Table `bacnet_devices` links tenant/building/meter to BACnet `device_id` + `ip:port`. Spike: `docs/spikes/bacnet.md`. Stub connector: `BacnetConnector` (Who-Is ping). Register reads → `BacnetReadingsIngressService` with `source='bacnet'` (GAP-133).

## SNMP inventory (GAP-141)

Table `snmp_devices` links tenant/building/meter to `ip:port` + `snmp_version`. Community string stays in `integrations.config` (never in DB). Spike: `docs/spikes/snmp.md`. Stub: `SnmpConnector` (GET `sysUpTime.0` ping).

## Mapping shape

Each row maps one **register_key** (protocol-native identifier) to a **target_field** on `readings`:

```
register_key=active_power_w  →  target_field=power_kw  scale_factor=0.001  unit=kW
register_key=40001           →  target_field=power_kw  scale_factor=0.001  unit=kW
```

**scale_factor** is applied as: `target = raw × scale_factor`. Store unit conversions in `scale_factor` (e.g. W→kW = `0.001`).

## API

- CRUD: `GET/POST/PATCH/DELETE /register-mappings`
- CSV matrix: `GET /register-mappings/export?protocol=modbus&deviceProfile=pac1670`
- Protocol catalog: `GET /register-mappings/protocol-types`

Permissions: `register_mappings:read|create|update|delete` (super_admin bypasses RBAC).

## Related

- Schema: `database/migrations/32-protocol-mapping.sql`
- Service: `backend/src/lib/normalization.service.ts`
- Constants: `backend/src/common/constants/protocol-mapping.ts`
