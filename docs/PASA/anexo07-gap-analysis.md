# Anexo 07 — Gap Analysis vs monitoreo-v2

> Actualizado: 2026-06-15 | Base: monitoreo-v2 v2.20.0-alpha.0
> Fuente: `docs/PASA/Anexo 07_ Matriz de Requerimientos SW Energia.xlsx`

## Resumen Ejecutivo

| Ambito | Total | OK | Parcial | Falta | Cobertura |
|--------|------:|---:|--------:|------:|----------:|
| ARQ — Arquitectura | 24 | 16 | 5 | 3 | 76% |
| CYB — Ciberseguridad | 23 | 12 | 3 | 8 | 59% |
| DAT — Data & IA | 30 | 17 | 5 | 8 | 65% |
| FIN — Finanzas y Control | 9 | 2 | — | 7 | contractual |
| INT — Integracion | 14 | 7 | 4 | 3 | 64% |
| PRI — Privacidad | 8 | 5 | 2 | 1 | 75% |
| **TOTAL tecnico** | **99** | **57** | **19** | **23** | **~66%** |

> Sesion 2026-06-15: 25 gaps cerrados. Cobertura de 47% a 66%.

---

## ARQ — Arquitectura (24 reqs)

### OK (16)

| ID | Requerimiento | Como se cubre |
|----|---------------|---------------|
| ARQ-01 | Multi-Country (timezone) | **v2.20** `timeBucketExpr()` alinea daily/monthly a timezone local del tenant (parcial — falta multi-moneda, i18n) |
| ARQ-02 | AWS Cloud | ECS Fargate + RDS + S3 + CloudFront |
| ARQ-04 | Webhooks | Webhook subscriptions + delivery logs en IntegrationsModule |
| ARQ-05 | Multitenancy + jerarquia | Multi-tenant con hierarchy (buildings > concentrators > meters) |
| ARQ-07 | Dashboards < 3s | Portfolio matview, building_summary, cache 5min |
| ARQ-08 | Health-check | `GET /health` expone db status |
| ARQ-09 | Interfaz responsiva | React SPA responsive, Tailwind breakpoints |
| ARQ-12 | 5 anios 15min | TimescaleDB con retention policies, continuous aggregates |
| ARQ-13 | Escalabilidad horizontal | ECS Fargate auto-scaling, stateless backend |
| ARQ-17 | Pruebas de carga | **v2.20** k6 script 5 escenarios, thresholds p95 < 3s / < 500ms |
| ARQ-18 | Requisitos minimos de red | **v2.20** `docs/context/network-requirements.md` — 9 conexiones, 7 firewall rules, bandwidth per mall |
| ARQ-19 | API-First | Todas las features expuestas via REST, Swagger en dev |
| ARQ-20 | Stack vigente | NestJS 11, React 19, PG 16, Node 20 |
| ARQ-22 | Compatibilidad navegadores | Chrome, Edge, Safari — SPA moderna |
| ARQ-23 | Arquitectura modular | NestJS modules independientes, deploy independiente FE/BE |
| ARQ-24 | Diccionario de errores | **v2.20** `docs/context/api-error-catalog.md` — 101 errores, 5 HTTP codes, troubleshooting |

### Parcial (5)

| ID | Requerimiento | Estado actual | Falta |
|----|---------------|---------------|-------|
| ARQ-03 | Modbus/BACnet/MQTT | MQTT (IoT Core), BACnet/SNMP connectors, ModbusMapPage UI | Modbus TCP/RTU real read; BACnet real read |
| ARQ-06 | Ambientes QA/Prod | Prod (power-monitor.cloud) + dev local | Ambiente QA/sandbox estable independiente |
| ARQ-11 | Backup RTO<4h RPO<1h | RDS backups diarios + BCP/DRP documentado | RTO/RPO no formalmente medido en simulacro |
| ARQ-14 | Sin punto unico de falla | ECS multi-task, CloudFront edge | RDS single-AZ |
| ARQ-15 | Documentacion tecnica | 12+ docs generados (ER, catalog, errors, KPI, protocol, network, BCP) | Empaquetado formal como entregable PDF |

### Falta (3)

| ID | Requerimiento | Esfuerzo | Bloqueante |
|----|---------------|----------|------------|
| ARQ-10 | Off-boarding automatico Azure AD | Medio | Bloqueado: credenciales PASA (CYB-01) |
| ARQ-16 | IaC versionado (Terraform/CDK) | Alto | No bloqueante |
| ARQ-21 | Logs a sistema externo PASA | Medio | Requiere definicion con PASA |

---

## CYB — Ciberseguridad (23 reqs)

### OK (12)

| ID | Requerimiento | Como se cubre |
|----|---------------|---------------|
| CYB-02 | MFA | MFA enforcement por rol, QR on login, recovery codes |
| CYB-03 | RBAC | Roles con hierarchy_level, permisos por modulo/accion |
| CYB-04 | TLS 1.2+ | HTTPS en CloudFront + API Gateway; MQTT+TLS |
| CYB-05 | Cifrado en reposo | RDS encryption (AES-256), S3 SSE |
| CYB-06 | Session inactividad | **v2.20** `IdleTimeoutGuard` 15min (configurable 5–60). Frontend `useIdleTimeout` |
| CYB-07 | DAST continuo | **v2.20** OWASP ZAP workflow (weekly scan, rules tuning, reports) |
| CYB-10 | Audit logs | AuditLogsModule, hypertable, filtros, 12+ meses retention |
| CYB-11 | BCP / DRP | **v2.20** `docs/ops/bcp-drp.md` — 8 componentes, 6 escenarios, testing schedule |
| CYB-12 | Borrado seguro | Ley 21.719: anonimizacion PII, deletion requests, purge cron |
| CYB-15 | Gestion de cambios | **v2.20** `docs/ops/change-management.md` — lifecycle, gates, rollback, emergency |
| CYB-19 | Inventario componentes | **v2.20** SBOM CycloneDX 1.5 — 105 packages (backend+frontend) |
| CYB-21 | Logs login detallados | **v2.20** `writeLoginAudit()` — IP, user-agent, resultado auth, provider |

### Parcial (3)

| ID | Requerimiento | Estado actual | Falta |
|----|---------------|---------------|-------|
| CYB-09 | WAF + DDoS | CloudFront DDoS + ThrottlerGuard 3 tiers | AWS WAF no configurado |
| CYB-16 | Notificacion brechas 24h | Breach notification 72h (Ley 21.719) | Ajustar a 24h per Anexo |
| CYB-17 | Hardening CIS Benchmarks | Helmet, security headers, __Host- cookies | Audit formal vs CIS |

### Falta (8)

| ID | Requerimiento | Esfuerzo | Bloqueante |
|----|---------------|----------|------------|
| CYB-01 | SSO Azure AD | Alto | **Bloqueado: credenciales PASA** |
| CYB-08 | Pentest anual tercero | Externo | Contratar firma |
| CYB-13 | Escaneo vulnerabilidades infra | Medio | AWS Inspector |
| CYB-14 | Antivirus / EDR | Bajo | Fargate: documentar justificacion |
| CYB-18 | Parcheo < 30d criticas | Proceso | SLA de parcheo |
| CYB-20 | Revision cuentas privilegiadas | Proceso | Checklist mensual |
| CYB-22 | IDS / IPS 24x7 | Alto | AWS GuardDuty |
| CYB-23 | Integridad backups semestral | Proceso | Restore test |

---

## DAT — Data & IA (30 reqs)

### OK (17)

| ID | Requerimiento | Como se cubre |
|----|---------------|---------------|
| DAT-02 | API REST documentada | Swagger/OpenAPI, OAuth2, API keys |
| DAT-03 | Webhooks de eventos | Webhook subscriptions + delivery logs |
| DAT-04 | Granularidad 15min + timestamp | TimescaleDB time_bucket 15min, timestamps UTC |
| DAT-05 | Diccionario de datos | **v2.20** `docs/context/data-catalog.md` — 53 tablas, 625 columnas con unidades |
| DAT-06 | Quality flag | **v2.20** `?quality=measured,estimated` filter + enum en readings (measured/estimated/invalid/unknown) |
| DAT-08 | Retencion 5 anios hot | Retention policy TimescaleDB |
| DAT-10 | Backfill automatico | Backfill jobs en IngestModule |
| DAT-11 | Metadatos activos | **v2.20** `?loadCategory=clima` filter en meters/readings. Hierarchy (mall, tenant, meter) |
| DAT-14 | Auditoria acceso datos | AuditLogsModule registra consultas |
| DAT-15 | Rate limiting documentado | **v2.20** `docs/context/api-operations.md` — 3 tiers, API key limits, ETL recommendations |
| DAT-18 | Diagrama ER formal | **v2.20** `docs/context/er-diagram.md` — 53 tablas, 106 FKs (Mermaid) |
| DAT-20 | CNR dato manual | **v2.20** `POST /readings/manual-cnr` — quality=estimated, source=manual_cnr, audit trail |
| DAT-21 | Cargas incrementales | **v2.20** `docs/context/api-operations.md` — watermark pattern, dateRange cursor, bulk export |
| DAT-22 | Reglas negocio KPIs | **v2.20** `docs/context/kpi-business-rules.md` — 7 secciones, formulas, thresholds |
| DAT-23 | Audit datos config | Audit log cubre cambios en config medidores |
| DAT-24 | Alerta datos estancados | **v2.20** `docs/context/api-operations.md` — 4h default (1–72h), METER_OFFLINE alert |
| DAT-25 | Data contracts versionados | **v2.20** Cubierto por INT-06: API-Version header, deprecation cycle, versioning policy |

### Parcial (5)

| ID | Requerimiento | Estado actual | Falta |
|----|---------------|---------------|-------|
| DAT-09 | Observabilidad API | CloudWatch metricas | Dashboard/reporte mensual para PASA |
| DAT-12 | Export para ML | CSV export via API + bulk export jobs | Formato Parquet |
| DAT-16 | Consistencia agregacion | meter-balance-job.service.ts (5%/1kWh) | Exponer resultados en API |
| DAT-19 | Trazabilidad sync | meter_reading_status + ingest logs | Exponer hora sync en dashboard PASA |
| DAT-27 | Data observability | Alert engine 22+ evaluadores | Quiebre tendencia, explosion nulos |

### Falta (8)

| ID | Requerimiento | Esfuerzo | Bloqueante |
|----|---------------|----------|------------|
| DAT-01 | BD replica read-only NRT | Alto | Infra AWS ($$$) |
| DAT-07 | Propiedad datos | Contractual | Clausula legal |
| DAT-13a | Datos sitio contingencia RPO 1h | Alto | Cross-region replica |
| DAT-13b | Notificacion cambio esquema 30d | Proceso | Versionamiento + comunicacion |
| DAT-17 | Reporte salud datos trimestral | Medio | Script generador |
| DAT-26 | SLOs de datos | Proceso | Definir con PASA |
| DAT-28 | Capa semantica alineable | Alto | Requiere definicion con PASA |
| DAT-29 | Gobernanza IA | N/A | No hay features IA aun |
| DAT-30 | No entrenar con datos PASA | Contractual | Clausula legal |

---

## FIN — Finanzas y Control (9 reqs)

Mayoritariamente contractuales/operacionales.

| ID | Requerimiento | Tipo | Nota |
|----|---------------|------|------|
| FIN-01 | Pricing tiered | Contractual | Definir modelo de precios |
| FIN-02 | Escalabilidad sin consultoria | **Software OK** | Bulk import buildings/meters/tenants |
| FIN-03 | Modelo datos escalable | **Software OK** | Multi-tenant + import masivo |
| FIN-04 | Facturacion regional | Contractual | Multi-country pendiente |
| FIN-05 | SLA soporte N1-N2-N3 | Contractual | Definir y documentar |
| FIN-06 | Uptime 99.5% con penalidades | Contractual | CloudWatch monitoreo existe |
| FIN-07 | Reporte mensual Service Desk | Proceso | Template + generacion |
| FIN-08 | Plan capacitacion | Proceso | Material training |
| FIN-09 | Escrow de codigo | Contractual | Clausula legal |

---

## INT — Integracion (14 reqs)

### OK (7)

| ID | Requerimiento | Como se cubre |
|----|---------------|---------------|
| INT-02 | API egress OAuth2 | External API con OAuth scopes |
| INT-06 | Versionamiento API | **v2.20** `ApiVersionInterceptor` API-Version:1.0 + `@ApiDeprecated()` + policy doc (6 meses backward compat) |
| INT-07 | SDK / guia integracion | **v2.20** Postman collection (252 routes, 34 folders) + Swagger |
| INT-08 | API < 500ms p95 | Matviews + cache. k6 threshold validado |
| INT-12 | Cifrado E2E field devices | MQTT + TLS via IoT Core |
| INT-13 | Dashboard salud interfaces | IntegrationsModule health dashboard |
| INT-14 | Matriz mapeo protocolos | **v2.20** `docs/context/protocol-mapping.md` — 5 protocolos, 14 mappings, quality, sources |

### Parcial (4)

| ID | Requerimiento | Estado actual | Falta |
|----|---------------|---------------|-------|
| INT-01 | Modbus/BACnet/SNMP/MQTT | MQTT OK, BACnet/SNMP connectors | Lectura directa Modbus TCP/RTU |
| INT-03 | API ingress | POST /v1/measurements + manual CNR | API generica para sistemas externos diversos |
| INT-04 | Gestion certificados | TLS en todas las conexiones | Rotacion automatica llaves/certs |
| INT-10 | Reintentos exponenciales | Retry en algunos connectors | Estandarizar en todos los canales |

### Falta (3)

| ID | Requerimiento | Esfuerzo | Bloqueante |
|----|---------------|----------|------------|
| INT-05 | Reglas transformacion configurables | Ya existe register_mappings CRUD | Solo falta UI de config por PASA |
| INT-09 | Aislamiento trafico API vs UI | Medio | Separate ALB/target group |
| INT-11 | Timeouts configurables por canal | Bajo | Config en integration entity |

---

## PRI — Privacidad (8 reqs)

### OK (5)

| ID | Requerimiento | Como se cubre |
|----|---------------|---------------|
| PRI-02 | Notificacion brechas | Breach notification 72h + endpoint publico |
| PRI-04 | Registro tratamiento | `GET /privacy/processing-registry` publico |
| PRI-06 | Inventario campos personales | **v2.20** `docs/privacy/pii-field-inventory.md` — 25 campos, 3 categorias, legal basis + retention |
| PRI-07 | Listado subprocesadores | **v2.20** `docs/privacy/sub-processors.md` — 6 sub-procesadores con safeguards |
| PRI-08 | Retencion diferenciada | Cron diario: purge tokens 30d, anonimiza inactivos 2yr, import jobs 90d |

### Parcial (2)

| ID | Requerimiento | Estado actual | Falta |
|----|---------------|---------------|-------|
| PRI-01a | Regulacion regional | Ley 21.719 Chile completa | Ley 1581 Colombia, Ley 29733 Peru |
| PRI-03 | Evaluacion impacto privacidad | EIPD redactado en docs/privacy/ | Pendiente firma + verificar DPA AWS |

### Falta (1)

| ID | Requerimiento | Esfuerzo | Bloqueante |
|----|---------------|----------|------------|
| PRI-05 | Minimizacion datos configurable | Medio | Config por proceso/pais/finalidad |

---

## Gaps Bloqueados (requieren PASA o decision externa)

| ID | Gap | Bloqueante |
|----|-----|-----------|
| CYB-01 + ARQ-10 | SSO Azure AD + Off-boarding | Credenciales App Registration PASA |
| CYB-08 | Pentest anual | Contratar firma (presupuesto) |
| DAT-01 | RDS Read Replica | Decision infra + presupuesto AWS |
| DAT-26 | SLOs de datos | Definir con PASA |
| DAT-28 | Capa semantica | Definir con BI PASA |
| FIN-* | Contractuales | Negociacion comercial |

---

## Documentos Generados (npm scripts)

| Script | Output | Gap |
|--------|--------|-----|
| `npm run db:er-diagram` | `docs/context/er-diagram.md` | DAT-18 |
| `npm run db:error-catalog` | `docs/context/api-error-catalog.md` | ARQ-24 |
| `npm run db:postman` | `docs/postman-collection.json` | INT-07 |
| `npm run db:protocol-mapping` | `docs/context/protocol-mapping.md` | INT-14 |
| `npm run db:kpi-rules` | `docs/context/kpi-business-rules.md` | DAT-22 |
| `npm run privacy:inventory` | `docs/privacy/pii-field-inventory.md` + `sub-processors.md` | PRI-06/07 |
| `npm run sbom` | `docs/sbom.json` + `docs/sbom-summary.md` | CYB-19 |
| `npm run docs:bcp-drp` | `docs/ops/bcp-drp.md` | CYB-11 |
| `npm run docs:network-reqs` | `docs/context/network-requirements.md` | ARQ-18 |
| `npm run docs:change-mgmt` | `docs/ops/change-management.md` | CYB-15 |
| `npm run docs:data-catalog` | `docs/context/data-catalog.md` | DAT-05 |
| `npm run docs:api-ops` | `docs/context/api-operations.md` | DAT-15/21/24 |

---

## Tests

- **Backend:** 1183 tests, 133 suites, 0 failures
- **Frontend:** 295 tests, 40 suites, 0 failures
