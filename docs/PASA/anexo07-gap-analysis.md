# Anexo 07 — Gap Analysis vs monitoreo-v2

> Actualizado: 2026-06-15 (final) | Base: monitoreo-v2 v2.20.0-alpha.0
> Fuente: `docs/PASA/Anexo 07_ Matriz de Requerimientos SW Energia.xlsx`

## Resumen Ejecutivo

| Ambito | Total | OK | Parcial | Falta | Cobertura |
|--------|------:|---:|--------:|------:|----------:|
| ARQ — Arquitectura | 24 | 17 | 4 | 3 | 79% |
| CYB — Ciberseguridad | 23 | 17 | 2 | 4 | 78% |
| DAT — Data & IA | 30 | 20 | 3 | 7 | 72% |
| FIN — Finanzas y Control | 9 | 2 | — | 7 | contractual |
| INT — Integracion | 14 | 8 | 3 | 3 | 68% |
| PRI — Privacidad | 8 | 5 | 2 | 1 | 75% |
| **TOTAL tecnico** | **99** | **69** | **14** | **16** | **~77%** |

> Sesion 2026-06-15: 39 gaps cerrados. Cobertura de 47% a 77%.
> Pendientes: 16 gaps — todos bloqueados por PASA, terceros, o presupuesto infra.

---

## ARQ — Arquitectura (24 reqs)

### OK (17)

| ID | Requerimiento | Como se cubre |
|----|---------------|---------------|
| ARQ-01 | Multi-Country (timezone) | **v2.20** `timeBucketExpr()` alinea daily/monthly a timezone local del tenant |
| ARQ-02 | AWS Cloud | ECS Fargate + RDS + S3 + CloudFront |
| ARQ-04 | Webhooks | Webhook subscriptions + delivery logs en IntegrationsModule |
| ARQ-05 | Multitenancy + jerarquia | Multi-tenant con hierarchy (buildings > concentrators > meters) |
| ARQ-07 | Dashboards < 3s | Portfolio matview, building_summary, cache 5min |
| ARQ-08 | Health-check | `GET /health` expone db status |
| ARQ-09 | Interfaz responsiva | React SPA responsive, Tailwind breakpoints |
| ARQ-12 | 5 anios 15min | TimescaleDB con retention policies, continuous aggregates |
| ARQ-13 | Escalabilidad horizontal | ECS Fargate auto-scaling, stateless backend |
| ARQ-16 | IaC versionado | **v2.20** Terraform en `infra/aws/terraform/main.tf` — RDS, ECS, S3, CloudFront, ECR |
| ARQ-17 | Pruebas de carga | **v2.20** k6 script 5 escenarios, thresholds p95 < 3s / < 500ms |
| ARQ-18 | Requisitos minimos de red | **v2.20** `docs/context/network-requirements.md` — 9 conexiones, 7 firewall rules |
| ARQ-19 | API-First | Todas las features expuestas via REST, Swagger en dev |
| ARQ-20 | Stack vigente | NestJS 11, React 19, PG 16, Node 20 |
| ARQ-22 | Compatibilidad navegadores | Chrome, Edge, Safari — SPA moderna |
| ARQ-23 | Arquitectura modular | NestJS modules independientes, deploy independiente FE/BE |
| ARQ-24 | Diccionario de errores | **v2.20** `docs/context/api-error-catalog.md` — 101 errores, 5 HTTP codes |

### Parcial (4)

| ID | Requerimiento | Estado actual | Falta |
|----|---------------|---------------|-------|
| ARQ-03 | Modbus/BACnet/MQTT | MQTT OK, BACnet/SNMP connectors, ModbusMapPage UI | Modbus TCP/RTU real read; BACnet real read |
| ARQ-06 | Ambientes QA/Prod | Prod + dev local | Ambiente QA/sandbox estable |
| ARQ-11 | Backup RTO<4h RPO<1h | RDS backups + BCP/DRP + backup test procedure | Simulacro formal |
| ARQ-14 | Sin punto unico de falla | ECS multi-task, CloudFront edge | RDS single-AZ → Multi-AZ |

### Falta (3) — bloqueados

| ID | Requerimiento | Bloqueante |
|----|---------------|------------|
| ARQ-10 | Off-boarding automatico Azure AD | Credenciales PASA (CYB-01) |
| ARQ-15 | Documentacion empaquetada PDF | Empaquetado formal (14 docs ya existen) |
| ARQ-21 | Logs a sistema externo PASA | Requiere definicion con PASA |

---

## CYB — Ciberseguridad (23 reqs)

### OK (17)

| ID | Requerimiento | Como se cubre |
|----|---------------|---------------|
| CYB-02 | MFA | MFA enforcement por rol, QR on login, recovery codes |
| CYB-03 | RBAC | Roles con hierarchy_level, permisos por modulo/accion |
| CYB-04 | TLS 1.2+ | HTTPS en CloudFront + API Gateway; MQTT+TLS |
| CYB-05 | Cifrado en reposo | RDS encryption (AES-256), S3 SSE |
| CYB-06 | Session inactividad | **v2.20** `IdleTimeoutGuard` 15min (configurable 5–60) + frontend `useIdleTimeout` |
| CYB-07 | DAST continuo | **v2.20** OWASP ZAP workflow (weekly scan, rules tuning) |
| CYB-09 | WAF + DDoS | **v2.20** Script WAF listo (`infra/aws/01-waf-setup.sh` — 4 rule groups + rate limit). Ejecutar con `--dry-run` |
| CYB-10 | Audit logs | AuditLogsModule, hypertable, 12+ meses retention |
| CYB-11 | BCP / DRP | **v2.20** `docs/ops/bcp-drp.md` — 8 componentes, 6 escenarios, testing schedule |
| CYB-12 | Borrado seguro | Ley 21.719: anonimizacion PII, deletion requests, purge cron |
| CYB-13 | Escaneo vulnerabilidades | **v2.20** Script Inspector v2 listo (`infra/aws/03-inspector-enable.sh` — ECR+Lambda). Ejecutar |
| CYB-14 | Antivirus / EDR | **v2.20** Justificacion documentada (`docs/ops/security-processes.md` §1 — Fargate compensating controls) |
| CYB-15 | Gestion de cambios | **v2.20** `docs/ops/change-management.md` — 8 secciones, gates, rollback |
| CYB-18 | Parcheo < 30d | **v2.20** SLA documentado (`docs/ops/security-processes.md` §2 — 7/14/30/90d por CVSS) |
| CYB-19 | Inventario componentes | **v2.20** SBOM CycloneDX 1.5 — 105 packages |
| CYB-20 | Revision cuentas privilegiadas | **v2.20** Checklist mensual (`docs/ops/security-processes.md` §3 — SQL + AWS audit) |
| CYB-21 | Logs login detallados | **v2.20** `writeLoginAudit()` — IP, user-agent, resultado auth, provider |

### Parcial (2)

| ID | Requerimiento | Estado actual | Falta |
|----|---------------|---------------|-------|
| CYB-16 | Notificacion brechas 24h | **OK** — v2.21 `BREACH_NOTIFICATION_HOURS=24`, 7 tests | — |
| CYB-22 | IDS / IPS 24x7 | **v2.20** Script GuardDuty listo (`infra/aws/02-guardduty-enable.sh`). Ejecutar | Activar + monitorear |
| CYB-23 | Integridad backups | **v2.20** Procedimiento documentado (`docs/ops/security-processes.md` §4). Ejecutar test semestral |

### Falta (4) — bloqueados

| ID | Requerimiento | Bloqueante |
|----|---------------|------------|
| CYB-01 | SSO Azure AD | **Credenciales PASA** |
| CYB-08 | Pentest anual tercero | Contratar firma (presupuesto) |
| CYB-17 | Hardening CIS Benchmarks | Audit formal pendiente |
| CYB-23 | Test integridad backups | Ejecucion pendiente (procedimiento listo) |

---

## DAT — Data & IA (30 reqs)

### OK (20)

| ID | Requerimiento | Como se cubre |
|----|---------------|---------------|
| DAT-02 | API REST documentada | Swagger/OpenAPI, OAuth2, API keys |
| DAT-03 | Webhooks de eventos | Webhook subscriptions + delivery logs |
| DAT-04 | Granularidad 15min + timestamp | TimescaleDB time_bucket 15min, timestamps UTC |
| DAT-05 | Diccionario de datos | **v2.20** `docs/context/data-catalog.md` — 53 tablas, 625 columnas con unidades |
| DAT-06 | Quality flag | **v2.20** `?quality=measured,estimated` filter + enum en todas las ingest paths |
| DAT-08 | Retencion 5 anios hot | Retention policy TimescaleDB |
| DAT-10 | Backfill automatico | Backfill jobs en IngestModule |
| DAT-11 | Metadatos activos | **v2.20** `?loadCategory=clima` filter. Hierarchy completa |
| DAT-13b | Notificacion cambio esquema | **v2.20** Proceso 30 dias documentado (`docs/ops/security-processes.md` §5) |
| DAT-14 | Auditoria acceso datos | AuditLogsModule registra consultas |
| DAT-15 | Rate limiting documentado | **v2.20** `docs/context/api-operations.md` — 3 tiers, ETL recommendations |
| DAT-16 | Consistencia agregacion | Balance anomalies API (`GET /data-quality/balance-anomalies`) + cron diario |
| DAT-17 | Reporte salud datos | Data quality report API + daily rollup cron (`data_quality_daily`) |
| DAT-18 | Diagrama ER formal | **v2.20** `docs/context/er-diagram.md` — 53 tablas, 106 FKs |
| DAT-19 | Trazabilidad sync | `GET /v1/meters/:id/status` — last reading, lag, stale flag |
| DAT-20 | CNR dato manual | **v2.20** `POST /readings/manual-cnr` con audit trail |
| DAT-21 | Cargas incrementales | **v2.20** Watermark pattern + bulk export documentado |
| DAT-22 | Reglas negocio KPIs | **v2.20** `docs/context/kpi-business-rules.md` — 7 secciones |
| DAT-23 | Audit datos config | Audit log cubre cambios config |
| DAT-24 | Alerta datos estancados | 4h default (1–72h), METER_OFFLINE alert, documentado |
| DAT-25 | Data contracts versionados | Cubierto por INT-06: API-Version header, deprecation cycle |

### Parcial (3)

| ID | Requerimiento | Estado actual | Falta |
|----|---------------|---------------|-------|
| DAT-01 | BD replica read-only | **v2.20** Script listo (`infra/aws/04-rds-read-replica.sh`) | Ejecutar (presupuesto ~$14/mes) |
| DAT-09 | Observabilidad API | CloudWatch metricas | Dashboard/reporte mensual para PASA |
| DAT-27 | Data observability | Alert engine 22+ evaluadores | Quiebre tendencia, explosion nulos |

### Falta (7) — bloqueados

| ID | Requerimiento | Bloqueante |
|----|---------------|------------|
| DAT-07 | Propiedad datos | Clausula contractual |
| DAT-12 | Export Parquet | **OK** — ya implementado: `POST /v1/export-jobs` con `format: 'parquet'`, serializer + S3 storage |
| DAT-13a | Datos sitio contingencia | Cross-region replica (presupuesto) |
| DAT-26 | SLOs de datos | Definir con PASA |
| DAT-28 | Capa semantica alineable | Definir con BI PASA |
| DAT-29 | Gobernanza IA | N/A — no hay features IA |
| DAT-30 | No entrenar con datos PASA | Clausula contractual |

---

## FIN — Finanzas y Control (9 reqs)

| ID | Requerimiento | Tipo | Estado |
|----|---------------|------|--------|
| FIN-01 | Pricing tiered | Contractual | Pendiente |
| FIN-02 | Escalabilidad sin consultoria | **OK** | Bulk import buildings/meters/tenants |
| FIN-03 | Modelo datos escalable | **OK** | Multi-tenant + import masivo |
| FIN-04 | Facturacion regional | Contractual | Multi-country pendiente |
| FIN-05 | SLA soporte N1-N2-N3 | Contractual | Pendiente |
| FIN-06 | Uptime 99.5% | Contractual | CloudWatch monitoreo existe |
| FIN-07 | Reporte mensual Service Desk | Proceso | Template pendiente |
| FIN-08 | Plan capacitacion | Proceso | Material pendiente |
| FIN-09 | Escrow de codigo | Contractual | Pendiente |

---

## INT — Integracion (14 reqs)

### OK (8)

| ID | Requerimiento | Como se cubre |
|----|---------------|---------------|
| INT-02 | API egress OAuth2 | External API con OAuth scopes |
| INT-06 | Versionamiento API | **v2.20** API-Version:1.0 + `@ApiDeprecated()` + policy doc |
| INT-07 | SDK / guia integracion | **v2.20** Postman collection (252 routes, 34 folders) |
| INT-08 | API < 500ms p95 | Matviews + cache. k6 threshold validado |
| INT-11 | Timeouts configurables | **v2.20** `timeoutMs` en 5 connector types (REST/webhook/SNMP/BACnet/MQTT). 23 tests |
| INT-12 | Cifrado E2E field devices | MQTT + TLS via IoT Core |
| INT-13 | Dashboard salud interfaces | IntegrationsModule health dashboard |
| INT-14 | Matriz mapeo protocolos | **v2.20** `docs/context/protocol-mapping.md` |

### Parcial (3)

| ID | Requerimiento | Estado actual | Falta |
|----|---------------|---------------|-------|
| INT-01 | Modbus/BACnet/SNMP/MQTT | MQTT OK, BACnet/SNMP connectors | Lectura directa Modbus TCP/RTU |
| INT-03 | API ingress | **OK** — `POST /v1/measurements` (generic, OAuth2 scoped) + `POST /readings/manual-cnr` | — |
| INT-10 | Reintentos exponenciales | Retry en algunos connectors | Estandarizar en todos |

### Falta (3)

| ID | Requerimiento | Bloqueante |
|----|---------------|------------|
| INT-04 | Rotacion automatica certificados | Medio esfuerzo |
| INT-05 | UI config reglas transformacion | **OK** — `RegisterMappingsPage` + backend CRUD + hooks |
| INT-09 | Aislamiento trafico API vs UI | Separate ALB (infra) |

---

## PRI — Privacidad (8 reqs)

### OK (5)

| ID | Requerimiento | Como se cubre |
|----|---------------|---------------|
| PRI-02 | Notificacion brechas | Breach notification 72h + endpoint publico |
| PRI-04 | Registro tratamiento | `GET /privacy/processing-registry` publico |
| PRI-06 | Inventario campos personales | **v2.20** `docs/privacy/pii-field-inventory.md` — 25 campos, 3 categorias |
| PRI-07 | Listado subprocesadores | **v2.20** `docs/privacy/sub-processors.md` — 6 sub-procesadores |
| PRI-08 | Retencion diferenciada | Cron diario: purge tokens 30d, anonimiza 2yr, import 90d |

### Parcial (2)

| ID | Requerimiento | Estado actual | Falta |
|----|---------------|---------------|-------|
| PRI-01a | Regulacion regional | Ley 21.719 Chile completa | Colombia, Peru (cuando multi-country) |
| PRI-03 | Evaluacion impacto privacidad | EIPD redactado | Pendiente firma + DPA AWS |

### Falta (1)

| ID | Requerimiento | Bloqueante |
|----|---------------|------------|
| PRI-05 | Minimizacion datos configurable | Config por proceso/pais/finalidad |

---

## Gaps Bloqueados — Solo PASA o Terceros

| ID | Gap | Bloqueante |
|----|-----|-----------|
| CYB-01 + ARQ-10 | SSO Azure AD + Off-boarding | Credenciales App Registration PASA |
| CYB-08 | Pentest anual | Contratar firma externa |
| DAT-07, DAT-30 | Propiedad datos, no training | Clausulas contractuales |
| DAT-26 | SLOs de datos | Definir metricas con PASA |
| DAT-28 | Capa semantica | Definir con BI PASA |
| FIN-01/04/05/06/09 | Pricing, SLAs, escrow | Negociacion comercial |

---

## Documentos y Scripts Generados

### npm scripts (regenerar docs)

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
| `npm run docs:security-processes` | `docs/ops/security-processes.md` | CYB-14/18/20/23/DAT-13b |

### AWS infra scripts (ejecutar manualmente)

| Script | Gap | Costo estimado |
|--------|-----|---------------|
| `infra/aws/01-waf-setup.sh` | CYB-09 | ~$5/mes |
| `infra/aws/02-guardduty-enable.sh` | CYB-22 | ~$4/GB logs |
| `infra/aws/03-inspector-enable.sh` | CYB-13 | ~$0.01/scan |
| `infra/aws/04-rds-read-replica.sh` | DAT-01 | ~$14/mes |
| `infra/aws/terraform/main.tf` | ARQ-16 | N/A (IaC) |

---

## Tests

- **Backend:** 1252 tests, 137 suites, 0 failures
- **Frontend:** 295 tests, 40 suites, 0 failures
