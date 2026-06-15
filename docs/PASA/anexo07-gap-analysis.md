# Anexo 07 — Gap Analysis vs monitoreo-v2

> Generado: 2026-06-15 | Base: monitoreo-v2 v2.19.0-alpha.0
> Fuente: `docs/PASA/Anexo 07_ Matriz de Requerimientos SW Energia.xlsx`

## Resumen Ejecutivo

| Ambito | Total | OK | Parcial | Falta | Cobertura |
|--------|------:|---:|--------:|------:|----------:|
| ARQ — Arquitectura | 24 | 12 | 7 | 5 | 65% |
| CYB — Ciberseguridad | 23 | 6 | 5 | 12 | 37% |
| DAT — Data & IA | 30 | 7 | 10 | 13 | 40% |
| FIN — Finanzas y Control | 9 | — | — | — | contractual |
| INT — Integracion | 14 | 4 | 5 | 5 | 46% |
| PRI — Privacidad | 8 | 3 | 3 | 2 | 56% |
| **TOTAL tecnico** | **99** | **32** | **30** | **37** | **~47%** |

---

## ARQ — Arquitectura (24 reqs)

### OK (12)

| ID | Requerimiento | Como se cubre |
|----|---------------|---------------|
| ARQ-02 | AWS Cloud | ECS Fargate + RDS + S3 + CloudFront |
| ARQ-04 | Webhooks | Webhook subscriptions + delivery logs en IntegrationsModule |
| ARQ-05 | Multitenancy + jerarquia | Multi-tenant con hierarchy (buildings > concentrators > meters) |
| ARQ-07 | Dashboards < 3s | Portfolio matview, building_summary, cache 5min |
| ARQ-08 | Health-check | `GET /health` expone db status |
| ARQ-09 | Interfaz responsiva | React SPA responsive, Tailwind breakpoints |
| ARQ-12 | 5 anios 15min | TimescaleDB con retention policies, continuous aggregates |
| ARQ-13 | Escalabilidad horizontal | ECS Fargate auto-scaling, stateless backend |
| ARQ-19 | API-First | Todas las features expuestas via REST, Swagger en dev |
| ARQ-20 | Stack vigente | NestJS 11, React 19, PG 16, Node 20 |
| ARQ-22 | Compatibilidad navegadores | Chrome, Edge, Safari — SPA moderna |
| ARQ-23 | Arquitectura modular | NestJS modules independientes, deploy independiente FE/BE |

### Parcial (7)

| ID | Requerimiento | Estado actual | Falta |
|----|---------------|---------------|-------|
| ARQ-03 | Modbus/BACnet/MQTT | MQTT (IoT Core), BACnet/SNMP connectors, ModbusMapPage UI | Modbus TCP/RTU real read no implementado; BACnet solo config, no lectura directa |
| ARQ-06 | Ambientes QA/Prod | Prod (power-monitor.cloud) + dev local | Ambiente QA/sandbox estable independiente |
| ARQ-11 | Backup RTO<4h RPO<1h | RDS automated backups diarios, retention 7d | RTO/RPO no formalmente garantizado ni medido |
| ARQ-14 | Sin punto unico de falla | ECS multi-task, CloudFront edge | RDS single-AZ (no Multi-AZ confirmado) |
| ARQ-15 | Documentacion tecnica | docs/context/ (7 archivos), CLAUDE.md, deploy.md | No empaquetado como entregable formal con diagramas de arquitectura |
| ARQ-16 | IaC versionado | Scripts deploy, Dockerfiles, compose | No IaC completo (Terraform/CDK) |
| ARQ-21 | Logs a sistema externo | CloudWatch logs + 6 alarmas SNS | No integracion con Splunk/Datadog; no expuesto a PASA |

### Falta (5)

| ID | Requerimiento | Esfuerzo estimado |
|----|---------------|-------------------|
| ARQ-01 | Multi-Country (timezone, multi-moneda) | Alto — requiere timezone per tenant, currency conversion, i18n |
| ARQ-10 | Off-boarding automatico Azure AD | Medio — depende de SSO (CYB-01); SCIM provisioning o sync webhook |
| ARQ-17 | Pruebas de carga documentadas | Medio — k6/Artillery + informe resultados |
| ARQ-18 | Requisitos minimos de red documentados | Bajo — documento tecnico |
| ARQ-24 | Diccionario de errores | Bajo — catalogo codigos error + troubleshooting |

---

## CYB — Ciberseguridad (23 reqs)

### OK (6)

| ID | Requerimiento | Como se cubre |
|----|---------------|---------------|
| CYB-02 | MFA | MFA enforcement por rol, QR on login, recovery codes |
| CYB-03 | RBAC | Roles con hierarchy_level, permisos por modulo/accion, RequirePermissions guard |
| CYB-04 | TLS 1.2+ | HTTPS en CloudFront + API Gateway; IoT Core MQTT+TLS |
| CYB-05 | Cifrado en reposo | RDS encryption (AES-256), S3 SSE |
| CYB-10 | Audit logs | AuditLogsModule, hypertable, filtros, 12+ meses retention |
| CYB-12 | Borrado seguro | Ley 21.719: anonimizacion PII, deletion requests, purge cron |

### Parcial (5)

| ID | Requerimiento | Estado actual | Falta |
|----|---------------|---------------|-------|
| CYB-06 | Session 15min inactividad | Session 24h, cookie 24h | Idle timeout 15min (inactivity tracker), prohibir sesiones concurrentes |
| CYB-09 | WAF + DDoS | CloudFront basic DDoS, ThrottlerGuard 3 tiers | AWS WAF no configurado, no segmentacion de red formal |
| CYB-15 | Gestion de cambios | Git workflow, PRs, CI checks | Proceso formal documentado con aprobacion pre-prod |
| CYB-16 | Notificacion brechas 24h | Breach notification 72h (Ley 21.719) | Anexo pide 24h (mas estricto que ley); ajustar proceso |
| CYB-21 | Logs de login detallados | Audit log registra acciones | Verificar que incluya: IP origen, resultado auth (exito/fallo) |

### Falta (12)

| ID | Requerimiento | Esfuerzo estimado |
|----|---------------|-------------------|
| CYB-01 | SSO Azure AD (SAML/OIDC) | Alto — bloqueado por credenciales PASA |
| CYB-07 | DAST continuo | Medio — OWASP ZAP en CI pipeline |
| CYB-08 | Pentest anual tercero | Externo — contratar firma |
| CYB-11 | BCP / DRP documentado y probado | Medio — documento + simulacro |
| CYB-13 | Escaneo vulnerabilidades infra | Medio — AWS Inspector o Qualys |
| CYB-14 | Antivirus / EDR | Bajo — Fargate containers, no aplica OS tradicional; documentar justificacion |
| CYB-17 | Hardening CIS Benchmarks | Medio — audit RDS/ECS config vs CIS; documentar |
| CYB-18 | Parcheo < 30d criticas | Proceso — SLA de parcheo + tracking |
| CYB-19 | Inventario componentes HW/SW | Bajo — generar SBOM (syft/trivy) |
| CYB-20 | Revision cuentas privilegiadas mensual | Proceso — checklist + evidencia |
| CYB-22 | IDS / IPS 24x7 | Alto — AWS GuardDuty + monitoreo |
| CYB-23 | Prueba integridad backups semestral | Proceso — restore test + evidencia |

---

## DAT — Data & IA (30 reqs)

### OK (7)

| ID | Requerimiento | Como se cubre |
|----|---------------|---------------|
| DAT-02 | API REST documentada | Swagger/OpenAPI, OAuth2, API keys |
| DAT-03 | Webhooks de eventos | Webhook subscriptions + delivery logs |
| DAT-04 | Granularidad 15min + timestamp | TimescaleDB time_bucket 15min, timestamps UTC |
| DAT-08 | Retencion 5 anios hot | Retention policy TimescaleDB, datos accesibles via API |
| DAT-10 | Backfill automatico | Backfill jobs en IngestModule, backfillIotReadings |
| DAT-14 | Auditoria acceso datos | AuditLogsModule registra consultas |
| DAT-23 | Audit datos config | Audit log cubre cambios en config medidores |

### Parcial (10)

| ID | Requerimiento | Estado actual | Falta |
|----|---------------|---------------|-------|
| DAT-05 | Diccionario de datos | docs/context/db-schema.md | Catalogo formal con linaje, unidades, tipos — entregable cliente |
| DAT-09 | Observabilidad API | CloudWatch metricas | Dashboard o reporte mensual para PASA (tasas error, latencia) |
| DAT-11 | Metadatos activos | Hierarchy (mall, tenant, meter) | Tipo_Carga (Clima, Iluminacion), dias festivos, contexto externo |
| DAT-12 | Export para ML | CSV export via API | Parquet o CSV comprimido para volumenes grandes |
| DAT-15 | Rate limiting documentado | ThrottlerGuard 3 tiers | Documentar limites para equipo ETL PASA |
| DAT-16 | Consistencia agregacion | Matviews portfolio/building | Validacion automatica suma parciales = remarcador |
| DAT-19 | Trazabilidad sync | Ingest pipeline logs, watermarks | Exponer hora sync por medidor al cliente |
| DAT-21 | Cargas incrementales | API soporta dateRange | No hay mecanismo formal "desde ultimo cursor" |
| DAT-24 | Alerta datos estancados | offlineAlerts Lambda (5min) | Umbral configurable >4h; notificacion a PASA |
| DAT-27 | Data observability | Alert engine con 22+ evaluadores | Falta: quiebre tendencia, explosion nulos, desalineacion datasets |

### Falta (13)

| ID | Requerimiento | Esfuerzo estimado |
|----|---------------|-------------------|
| DAT-01 | BD replica read-only NRT | Alto — RDS Read Replica + acceso para PASA |
| DAT-06 | Quality flag (real/estimado/erroneo) | Medio — campo en readings + logica clasificacion |
| DAT-07 | Propiedad datos (contractual) | Contractual |
| DAT-13a | Datos en sitio contingencia RPO 1h | Alto — cross-region replica o S3 backup |
| DAT-13b | Notificacion cambio esquema 30d | Proceso — versionamiento + comunicacion |
| DAT-17 | Reporte salud datos trimestral | Medio — script generador + template |
| DAT-18 | Diagrama ER formal | Bajo — generar desde TypeORM entities |
| DAT-20 | CNR / dato manual certificado | Medio — endpoint insert manual + audit trail + flag CNR |
| DAT-22 | Doc reglas negocio KPIs | Bajo — documento formulas prorrateo, factores conversion |
| DAT-25 | Data contracts versionados | Medio — OpenAPI versionado + esquema cambios |
| DAT-26 | SLOs de datos | Proceso — definir frescura, completitud, disponibilidad |
| DAT-28 | Capa semantica alineable | Alto — metricas/dimensiones reutilizables para BI PASA |
| DAT-29 | Gobernanza IA (prompts, auditoria) | N/A hoy — no hay features IA; implementar cuando aplique |
| DAT-30 | No entrenar con datos PASA | Contractual |

---

## FIN — Finanzas y Control (9 reqs)

Mayoritariamente contractuales/operacionales, no gaps de software.

| ID | Requerimiento | Tipo | Nota |
|----|---------------|------|------|
| FIN-01 | Pricing tiered | Contractual | Definir modelo de precios |
| FIN-02 | Escalabilidad sin consultoria | Software OK | Bulk import buildings/meters/tenants existe |
| FIN-03 | Modelo datos escalable | Software OK | Multi-tenant + import masivo |
| FIN-04 | Facturacion regional | Contractual | Multi-country pendiente (ARQ-01) |
| FIN-05 | SLA soporte N1-N2-N3 | Contractual | Definir y documentar |
| FIN-06 | Uptime 99.5% con penalidades | Contractual | Monitoreo CloudWatch existe |
| FIN-07 | Reporte mensual Service Desk | Proceso | Template + generacion |
| FIN-08 | Plan capacitacion | Proceso | Material training |
| FIN-09 | Escrow de codigo | Contractual | Clausula legal |

---

## INT — Integracion (14 reqs)

### OK (4)

| ID | Requerimiento | Como se cubre |
|----|---------------|---------------|
| INT-02 | API egress OAuth2 | External API con OAuth scopes |
| INT-08 | API < 500ms p95 | Optimizado con matviews + cache |
| INT-12 | Cifrado E2E field devices | MQTT + TLS via IoT Core |
| INT-13 | Dashboard salud interfaces | IntegrationsModule health dashboard |

### Parcial (5)

| ID | Requerimiento | Estado actual | Falta |
|----|---------------|---------------|-------|
| INT-01 | Modbus/BACnet/SNMP/MQTT | MQTT OK, BACnet/SNMP connectors (config) | Lectura directa Modbus TCP/RTU; BACnet real read |
| INT-03 | API ingress (medidores virtuales) | IoT ingest pipeline | API generica para recibir datos de sistemas externos |
| INT-04 | Gestion certificados + rotacion | TLS en todas las conexiones | Rotacion automatica de llaves/certs |
| INT-05 | Transformacion/normalizacion datos | Conversion unidades (W>kW, Wh>kWh) | Reglas configurables por PASA (factores escala custom) |
| INT-10 | Reintentos exponenciales | Retry en algunos connectors | Estandarizar retry + dead letter en todos los canales |

### Falta (5)

| ID | Requerimiento | Esfuerzo estimado |
|----|---------------|-------------------|
| INT-06 | Versionamiento API (backward compat 6 meses) | Medio — URL versioning /v1/, /v2/ + deprecation policy |
| INT-07 | SDK / guia integracion (cURL, Python, Postman) | Bajo — Postman collection + ejemplos |
| INT-09 | Aislamiento trafico API vs UI | Medio — separate ALB/target group o API Gateway stage |
| INT-11 | Timeouts configurables por canal | Bajo — config por integration |
| INT-14 | Matriz mapeo Modbus/BACnet > modelo datos | Bajo — documento tecnico |

---

## PRI — Privacidad (8 reqs)

### OK (3)

| ID | Requerimiento | Como se cubre |
|----|---------------|---------------|
| PRI-02 | Notificacion brechas | Breach notification 72h + endpoint publico |
| PRI-04 | Registro tratamiento | `GET /privacy/processing-registry` publico |
| PRI-08 | Retencion diferenciada | Cron diario: purge tokens 30d, anonimiza inactivos 2yr, import jobs 90d |

### Parcial (3)

| ID | Requerimiento | Estado actual | Falta |
|----|---------------|---------------|-------|
| PRI-01a | Regulacion regional | Ley 21.719 Chile completa | Ley 1581 Colombia, Ley 29733 Peru — cuando aplique multi-country |
| PRI-03 | Evaluacion impacto privacidad | EIPD redactado en docs/privacy/ | Pendiente firma + verificar DPA AWS |
| PRI-05 | Minimizacion datos | Campos opcionales en formularios | Configuracion por proceso/pais/finalidad no existe |

### Falta (2)

| ID | Requerimiento | Esfuerzo estimado |
|----|---------------|-------------------|
| PRI-06 | Inventario campos personales/sensibles | Bajo — documento clasificacion campos |
| PRI-07 | Listado subprocesadores actualizado | Bajo — documento AWS services + terceros |

---

## Top 10 Gaps Criticos (orden de impacto)

| # | ID(s) | Gap | Tipo | Bloqueante UAT |
|---|-------|-----|------|----------------|
| 1 | CYB-01, ARQ-10 | SSO Azure AD | Software + cliente | SI — sin credenciales PASA |
| 2 | CYB-06 | Idle timeout 15min + no sesiones concurrentes | Software | SI |
| 3 | DAT-06 | Quality flag en readings (real/estimado/erroneo) | Software | SI |
| 4 | DAT-20 | CNR — insercion dato manual normado | Software | SI |
| 5 | DAT-01 | BD replica read-only para ETL PASA | Infra | SI |
| 6 | CYB-11 | BCP/DRP documentado y probado | Documento + proceso | SI |
| 7 | ARQ-01 | Multi-country (timezone, moneda) | Software | SI para Peru/Colombia |
| 8 | CYB-07, CYB-08 | DAST + Pentest tercero | Proceso + externo | SI |
| 9 | DAT-25, INT-06 | Data contracts + API versioning | Software + proceso | MEDIO |
| 10 | ARQ-17 | Load testing documentado | Proceso | MEDIO |

---

## Plan de Accion Sugerido

### Fase 1 — Quick wins (< 1 semana, solo software)
- CYB-06: Idle timeout 15min + bloqueo sesiones concurrentes
- DAT-18: Generar ER diagram desde entities
- ARQ-24: Catalogo de errores
- INT-07: Postman collection
- PRI-06, PRI-07: Documentos inventario campos + subprocesadores
- INT-14: Documento mapeo protocolos
- DAT-22: Documento reglas negocio KPIs

### Fase 2 — Software medio (2-3 semanas)
- DAT-06: Quality flag en readings table + logica clasificacion
- DAT-20: Endpoint CNR (insert manual + audit + flag)
- INT-06: API versioning /v1/
- DAT-25: OpenAPI versionado + change policy
- CYB-19: SBOM con syft/trivy
- ARQ-17: Load test con k6 + informe

### Fase 3 — Infra + dependencias externas
- CYB-01 + ARQ-10: SSO Azure AD (requiere credenciales PASA)
- DAT-01: RDS Read Replica + acceso PASA
- CYB-09: AWS WAF
- CYB-22: AWS GuardDuty
- CYB-07: OWASP ZAP en CI

### Fase 4 — Multi-country + avanzado
- ARQ-01: Timezone per tenant, multi-moneda, i18n
- DAT-28: Capa semantica
- DAT-11: Tipo_Carga, festivos, contexto externo
- CYB-11: BCP/DRP completo + simulacro

### Contractual (paralelo)
- FIN-01, FIN-04, FIN-05, FIN-06, FIN-09: Modelo precios, SLAs, escrow
- DAT-07, DAT-30: Clausulas propiedad datos + no entrenamiento IA
- CYB-08: Contratar pentest tercero
- PRI-01a: Oficial de privacidad designado
