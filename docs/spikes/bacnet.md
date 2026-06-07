# Spike BACnet — GAP-130

**Fecha:** 2026-06-06  
**Alcance:** Evaluar librerías Node.js para BACnet/IP (read-only) en monitoreo-v2.  
**Veredicto:** **GO** — integrar lecturas BACnet vía `register_mappings` + `readings` con `@bacnet-js/client` en fase posterior; stub UDP Who-Is suficiente para ping (GAP-132).

## Contexto

PASA requiere soportar medidores/edificios expuestos por BACnet/IP (ASHRAE 135). El stack ya tiene `protocol_types.bacnet`, `register_mappings` y `NormalizationService`; falta conector y tabla de inventario de dispositivos.

## Opciones evaluadas

| Librería | Lenguaje | Mantenimiento | Who-Is / I-Am | Read Property | TS nativo | Notas |
|----------|----------|---------------|---------------|---------------|-----------|-------|
| **node-bacnet** (ex node-bacstack) | JS puro | Activo (push 2025) | Sí | Sí | No (tipos `@types` limitados) | ~1 MB, API event-based (`whoIs`, `readProperty`), usada en producción IoT |
| **@bacnet-js/client** | TypeScript | Activo (v3.x 2026) | Sí | Sí | Sí | Fork/evolución TS; alinea con strict TS del backend |
| **bacstack** (C + bindings) | C/Native | Estable | Sí | Sí | Parcial | Requiere compile nativo; descartado en ECS Fargate por complejidad de build |

## Recomendación

1. **Corto plazo (Ola 7D):** stub `BacnetConnector` con ping UDP Who-Is sin dependencia npm (validación de reachability en sync).
2. **Mediano plazo:** añadir `@bacnet-js/client` para `readProperty` / `readPropertyMultiple` mapeados por `register_key` (ej. `analog-input:1` → `power_kw`).
3. **Inventario:** tabla `bacnet_devices` (tenant, building, device_id, ip, port) desacoplada de `integrations` — permite N devices por integración futura.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| UDP 47808 bloqueado en VPC | Security group egress + NAT; documentar en runbook |
| Device ID duplicado en subnet | Unique `(tenant_id, device_id, ip)` en DB |
| Escalas distintas por vendor | `device_profile` + `register_mappings` por tenant (patrón Ola 7A) |
| Timeout en redes lentas | `timeoutMs` en config integración (default 6000 ms) |

## Happy path objetivo (GAP-133)

```
bacnet_devices → BacnetConnector.ping → readProperty (mock/prod)
  → register_mappings (protocol=bacnet, device_profile)
  → NormalizationService.apply → INSERT readings (source=bacnet)
```

## No-go items (fuera de scope)

- BACnet MS/TP (serial) — requiere gateway hardware
- Write Property / comandos — solo lectura en v1
- BBMD foreign device registration — solo si cliente exige NAT traversal

## Próximo paso

Ola 7D implementada: schema `bacnet_devices`, stub connector, test de pipeline mappings→readings. Instalar `@bacnet-js/client` cuando se implemente lectura real de propiedades (post-7D).
