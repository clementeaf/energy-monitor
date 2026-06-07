# Matriz de cumplimiento EMS — PASA Anexo 07 vs monitoreo-v2

**Fuente:** `Anexo 07_ Matriz de Requerimientos SW Energia.xlsx` (hoja *III. Alcance no funcional*)
**Baseline:** `monitoreo-v2/backend` + capa DB (`monitoreo-v2/database/`)
**Fecha:** 2026-06-06

## Leyenda

| Estado | Significado |
|--------|-------------|
| **Cubierto** | Implementado en código/schema desplegable hoy |
| **Parcial** | Base existe; no cumple texto PASA al 100% |
| **Falta** | No implementado o sin evidencia |
| **N/A** | Comercial/contrato/proceso fuera de producto |

| Prioridad | Significado |
|-----------|-------------|
| **P0** | Blocker licitación / datos core |
| **P1** | Requerido; planificar sprint cercano |
| **P2** | Documentación, observabilidad, hardening |
| **P3** | Deseable o futuro (ej. IA) |

## Resumen

- **Total requisitos (IDs únicos):** 108
- **Cubierto:** 8 | **Parcial:** 62 | **Falta:** 38 | **N/A:** 0
- **Prioridad P0 (backend/DB):** 17 ítems — ARQ-01, ARQ-03, ARQ-05, ARQ-10, ARQ-12, CYB-01, CYB-10, DAT-01, DAT-04, DAT-06, DAT-08, DAT-10, DAT-11, DAT-19, DAT-24, INT-01, INT-03

### Foco backend/DB — backlog P0 propuesto

1. Retención 5 años @ 15 min (`readings`, CAGG `readings_15min`)
2. Calidad de dato (`readings.quality_status`)
3. Modelo geográfico PASA (country/region/mall IDs, timezone por building)
4. Trazabilidad ingestión + backfill + alerta datos estancados
5. Réplica read-only RDS para ETL
6. API ingress medidores virtuales
7. Protocolos BACnet/SNMP + mapping normalización
8. Alinear retención `audit_logs` (no purgar a 2 años)
9. SSO Azure AD + off-boarding automático

## Arquitectura

| ID | Funcionalidad | Estado | Capa | Evidencia monitoreo-v2 | Acción propuesta | P |
|----|---------------|--------|------|------------------------|------------------|---|
| ARQ-01 | Escalabilidad Regional | **Parcial** | Backend/DB | tenants.timezone; sin country/currency en schema | Agregar country_code, currency en tenants/buildings; soporte multi-zona horaria por building | P0 |
| ARQ-02 | Estándar de Nube | **Parcial** | Infra | ECS Fargate + RDS TimescaleDB AWS us-east-1 | Documentar arquitectura AWS + política soberanía; evaluar región/data residency PASA | P1 |
| ARQ-03 | Protocolos de Campo | **Parcial** | Backend/DB | Modbus en meters; MQTT vía iot_readings; sin BACnet/SNMP | Tablas protocol_mappings + conectores BACnet/SNMP; ampliar ingest | P0 |
| ARQ-04 | Gestión de Webhooks | **Parcial** | Backend | WebhookConnector integraciones; alertas ALERT_WEBHOOK_URL | Webhooks por tipo evento energético configurables por tenant | P1 |
| ARQ-05 | Multitenancy y Jerarquía | **Parcial** | Backend/DB | tenant_id + buildings; sin país/región | Schema regions/countries + rollup views por país/región/mall | P0 |
| ARQ-06 | Ambientes | **Parcial** | Infra | Prod ECS+RDS; dev local Docker | Formalizar ambientes QA/sandbox aislados con datos sintéticos | P1 |
| ARQ-07 | Latencia y Concurrencia | **Parcial** | Mixto | CAGG + portfolio_summary; perf mejorada dashboard | Load tests PASA volumetría; índices/CAGG 15min | P1 |
| ARQ-08 | Monitoreo y Observabilidad | **Cubierto** | Backend | GET /health | Extender health con checks DB/replica | P2 |
| ARQ-09 | Interfaz Responsiva | **Cubierto** | Frontend | React responsive | N/A backend DB | — |
| ARQ-10 | Off-boarding Automático | **Falta** | Backend/Auth | OAuth Google/MS; sin SCIM/Azure AD sync | Integración SSO SAML/OIDC + desprovisionamiento AD | P0 |
| ARQ-11 | Backup y RTO/RPO | **Parcial** | Infra | RDS backups AWS; sin RTO/RPO documentado | Automatizar backup diario 30d; runbook RTO<4h RPO<1h | P1 |
| ARQ-12 | Almacenamiento Histórico | **Falta** | Backend/DB | retention_policy readings 3y; iot 2y | Subir a 5y; CAGG readings_15min; quitar drop prematuro | P0 |
| ARQ-13 | Escalabilidad Horizontal | **Parcial** | Infra | ECS multi-task posible; single RDS | Read replica + escalar ECS; stateless API | P1 |
| ARQ-14 | Sin puntos únicos de falla | **Parcial** | Infra | Single AZ RDS típico | Multi-AZ RDS + redundancia ECS | P1 |
| ARQ-15 | Versionamiento | **Parcial** | Proceso | docs/context/, README backend | Entregar pack PASA: diagramas, flujo datos, stack | P2 |
| ARQ-16 | Gestión de Configuración | **Parcial** | Infra | Terraform/scripts parciales en repo | IaC versionado completo ECS/RDS/CF | P2 |
| ARQ-17 | Pruebas de Carga | **Falta** | Proceso | Sin load test report PASA-scale | Ejecutar y documentar pruebas carga ~2700 medidores | P1 |
| ARQ-18 | Latencia de Red | **Falta** | Proceso | No documentado | Especificar requisitos bandwidth/latencia por mall | P2 |
| ARQ-19 | API-First | **Parcial** | Backend | External API v1 read-only; no 100% UI | Inventariar gaps API vs UI; exponer endpoints faltantes | P1 |
| ARQ-20 | Gestión de Obsolescencia | **Parcial** | Proceso | NestJS 11, PG16, deps actuales | Política obsolescencia + cron dependabot | P2 |
| ARQ-21 | Logs de Errores Técnicos | **Parcial** | Infra | JsonLogger LOG_FORMAT=json | Integración CloudWatch/Splunk export formal | P2 |
| ARQ-22 | Independencia de Navegador | **Parcial** | Frontend | Sin certificación formal | Matriz compatibilidad browsers | P3 |
| ARQ-23 | Acoplamiento Mínimo | **Parcial** | Backend | Monolito NestJS modular | Documentar módulos desacoplables; path a microservicios | P2 |
| ARQ-24 | Diccionario de Errores | **Falta** | Proceso | Sin manual códigos error | Publicar catálogo errores API + troubleshooting | P2 |

## Ciberseguridad

| ID | Funcionalidad | Estado | Capa | Evidencia monitoreo-v2 | Acción propuesta | P |
|----|---------------|--------|------|------------------------|------------------|---|
| CYB-01 | Autenticación SSO | **Parcial** | Backend/Auth | OAuth Microsoft/Google; no SAML enterprise PASA | Azure AD SSO SAML/OIDC obligatorio PASA | P0 |
| CYB-02 | Multi-Factor (MFA) | **Cubierto** | Backend | MFA TOTP + require_mfa por rol | — | — |
| CYB-03 | Mínimo Privilegio | **Cubierto** | Backend/DB | RBAC roles/permissions; audit_logs | Reporte trimestral permisos (proceso) | P2 |
| CYB-04 | Cifrado en Tránsito | **Cubierto** | Infra | TLS RDS + HTTPS CloudFront/ECS | TLS medidores en ingest | P1 |
| CYB-05 | Cifrado en Reposo | **Parcial** | Infra | RDS encryption at rest AWS | Verificar backups cifrados; documentar AES-256 | P1 |
| CYB-06 | Gestión de Sesiones | **Parcial** | Backend | Sesión 24h actual; no 15min idle estricto | Ajustar maxSessionMinutes; sesiones concurrentes | P1 |
| CYB-07 | Escaneo DAST | **Falta** | Proceso | Sin DAST continuo documentado | Pipeline DAST portal/API/webhooks | P2 |
| CYB-08 | Ethical Hacking | **Falta** | Proceso | Sin pentest anual tercero | Contratar pentest anual | P2 |
| CYB-09 | Protección Perimetral | **Parcial** | Infra | Helmet, throttler, CORS; sin WAF explícito | WAF CloudFront + shield | P1 |
| CYB-10 | Logs de Auditoría | **Parcial** | Backend/DB | audit_logs hypertable; cron purga 2y vs req 12m min | Alinear retención audit ≥12m (ideal 5y ISO); no purgar a 2y | P0 |
| CYB-11 | BCP / DRP | **Parcial** | Proceso | DR implícito RDS; sin DRP probado | Documentar y probar BCP/DRP | P1 |
| CYB-12 | Borrado Seguro | **Parcial** | Backend | deletion_requests anonimización | Procedimiento borrado criptográfico fin contrato | P1 |
| CYB-13 | Escaneo de Red y OS | **Falta** | Infra | Sin escaneo vuln OS/red documentado | Programa scanning infra EMS | P2 |
| CYB-14 | Antivirus y EDR | **Falta** | Infra | Fargate managed; sin EDR explícito | Documentar controles AWS/shared responsibility | P2 |
| CYB-15 | Control de Versiones | **Parcial** | Proceso | CI tests; hooks | Formalizar change management prod | P2 |
| CYB-16 | Plan de Comunicación | **Parcial** | Backend | breach_reports tabla + timer 72h Ley 21.719 | Ajustar a 24h notificación PASA CYB-16 | P1 |
| CYB-17 | Configuración Segura | **Parcial** | Infra | Hardening parcial Nest/Helmet | Baseline CIS/hardening RDS/ECS documentado | P2 |
| CYB-18 | Proceso de Parcheo | **Falta** | Proceso | Sin SLA parcheo 30d formal | Política parcheo críticos ≤30d | P2 |
| CYB-19 | Inventario de Componentes | **Parcial** | Proceso | package.json, Dockerfile | Inventario SBOM componentes EMS | P2 |
| CYB-20 | Revisión de Cuentas Privilegiadas | **Falta** | Proceso | Sin revisión mensual cuentas priv | Proceso PAM + revisión mensual | P2 |
| CYB-21 | Recolección de Logs de Acceso | **Cubierto** | Backend/DB | audit_logs IP, user, timestamp en auth | Incluir resultado auth fallo explícito | P2 |
| CYB-22 | IDS / IPS | **Falta** | Infra | Sin IDS/IPS dedicado | AWS GuardDuty/IDS o equivalente | P2 |
| CYB-23 | Integridad de Backups | **Falta** | Infra/DB | Sin prueba integridad backup semestral | Restore test semestral documentado | P1 |
## Data & IA

| ID | Funcionalidad | Estado | Capa | Evidencia monitoreo-v2 | Acción propuesta | P |
|----|---------------|--------|------|------------------------|------------------|---|
| DAT-01 | Base de Datos de Réplica | **Falta** | Infra/DB | Single RDS endpoint | RDS read replica + credenciales read-only ETL | P0 |
| DAT-02 | API REST / GraphQL | **Parcial** | Backend | External API REST + Swagger dev; API keys no OAuth2 | OAuth2 client credentials; OpenAPI prod; GraphQL opcional | P1 |
| DAT-03 | Webhooks de Eventos | **Parcial** | Backend | Webhook connector genérico | Webhooks evento consumo/alarma configurables | P1 |
| DAT-04 | Granularidad y Timestamp | **Parcial** | Backend/DB | timestamptz UTC; sin local_ts en API | Exponer timestamp_utc + timezone + timestamp_local por building | P0 |
| DAT-05 | Diccionario de Datos | **Falta** | Proceso/DB | Sin catálogo datos formal | Documento data dictionary + unidades kWh/kVARh | P1 |
| DAT-06 | Flag de Validación | **Falta** | Backend/DB | iot_readings.quality; readings sin flag | Columna readings.quality_status enum | P0 |
| DAT-07 | Propiedad y Acceso | **Parcial** | Backend | Export JSON perfil; portabilidad ARCO | Script export total historia sin costo; cláusula contractual | P1 |
| DAT-08 | Retención Histórica | **Falta** | Backend/DB | Retención 3y readings | Política 5y hot data accesible API/DB | P0 |
| DAT-09 | Observabilidad de API | **Falta** | Backend | Sin dashboard uso API | Métricas API mensuales error/latencia | P2 |
| DAT-10 | Gestión de Backfill | **Falta** | Backend/DB | Sin backfill automático post-outage | meter_sync_log + job backfill gaps | P0 |
| DAT-11 | Metadatos de Activos | **Parcial** | Backend/DB | buildings/meters/tenant_units; sin load_type e IDs PASA | Campos pasa_mall_id, country, load_type, locatario_id exportables | P0 |
| DAT-12 | Exportación para Modelos | **Parcial** | Backend | Reports CSV/Excel; sin Parquet | Endpoint export Parquet/CSV comprimido bulk | P1 |
| DAT-13 | Disponibilidad de Datos en Contingencia | **Parcial** | Infra/Backend | DR general; validación esquema parcial | BCP datos + notificación breaking schema changes | P1 |
| DAT-14 | Auditoría de Acceso a Datos | **Parcial** | Backend/DB | audit_logs HTTP; no query-level data access | Log consultas datos sensibles consumo | P1 |
| DAT-15 | Throttle y Quotas de API | **Parcial** | Backend | Throttler + api_keys rate_limit | Documentar quotas; tiers ETL | P1 |
| DAT-16 | Consistencia de Agregación | **Falta** | Backend/DB | Jerarquía sin validación suma | Vista/job meter_balance_checks remarcador vs locatarios | P1 |
| DAT-17 | Reporte de Salud de Datos | **Falta** | Backend/DB | Sin reporte calidad trimestral | Tabla data_quality_daily + reporte % real/estimado/erróneo | P1 |
| DAT-18 | Documentación de Modelo Lógico | **Parcial** | Proceso/DB | Entidades TypeORM; sin DER entregable | Publicar DER actualizado PASA | P2 |
| DAT-19 | Trazabilidad de Cargas (Lineage) | **Falta** | Backend/DB | Sin trazabilidad sync por medidor | meter_reading_status (last_sync, source, lag) | P0 |
| DAT-20 | Certificación de Datos | **Parcial** | Backend/DB | Lecturas append-only; sin hash integridad | Checksums/audit trail ingest; certificación no manipulación | P2 |
| DAT-21 | Soporte para Cargas Incrementales | **Parcial** | Backend | API filtros from/to; sin cursor ETL | Tabla etl_watermarks + API incremental | P1 |
| DAT-22 | Documentación de Reglas de Negocio | **Parcial** | Backend | Fórmulas facturación en código | Documento reglas negocio KPIs/prorrateo | P2 |
| DAT-23 | Acceso a Datos de Auditoría | **Parcial** | Backend/DB | audit_logs config changes parcial | Auditar cambios maestro medidores/tarifas completos | P1 |
| DAT-24 | Alerta de Datos Estancados | **Falta** | Backend | offline alerts Lambda legacy; no en v2 DB | Alerta automática flujo sin update >4h por mall/medidor | P0 |
| DAT-25 | Contratos de datos versionados | **Falta** | Backend/DB | Sin contratos versionados | Tabla data_contracts (version, schema_json, changelog) | P1 |
| DAT-26 | SLOs de datos | **Falta** | Backend/DB | Sin SLOs datos formalizados | Tabla data_slo_metrics + monitoreo frescura/completitud | P2 |
| DAT-27 | Data observability avanzada | **Falta** | Backend/DB | Alert engine eléctrico; no data observability | Detección anomalías volumen/quiebres tendencia | P2 |
| DAT-28 | Analítica	Capa semántica alineable con PASA | **Falta** | Backend/DB | Sin capa semántica | Tabla metric_definitions (métricas/dimensiones PASA) | P2 |
| DAT-29 | Gobernanza de prompts, entradas y salidas | **Falta** | Backend | Sin IA generativa hoy | Si se agrega IA: audit prompts I/O | P3 |
| DAT-30 | Restricción de entrenamiento con datos de PASA | **Cubierto** | Proceso | Política privacidad; datos tenant aislados | Cláusula contractual no-entrenamiento explícita | P1 |
## Finanzas y Control

| ID | Funcionalidad | Estado | Capa | Evidencia monitoreo-v2 | Acción propuesta | P |
|----|---------------|--------|------|------------------------|------------------|---|
| FIN-01 | Escalabilidad de Costos | **Falta** | Contrato | N/A producto | Propuesta pricing tiered medidor/mall/usuario | — |
| FIN-02 | Escalabilidad del modelo | **Parcial** | Backend/DB | CRUD buildings/meters/tenant_units | Onboarding self-service mall/medidor sin consultoría | P1 |
| FIN-03 | Escalabilidad del modelo | **Parcial** | Backend/DB | Schema extensible metadata JSONB | Plantillas onboarding por tipo inmueble | P1 |
| FIN-04 | Facturación Regional | **Falta** | Contrato | N/A | Facturación legal CL/PE/CO proveedor | — |
| FIN-05 | Niveles de Soporte (SLA) | **Falta** | Contrato | N/A | Documentar SLA soporte N1-N3 | — |
| FIN-06 | Penalidades | **Parcial** | Infra | Sin SLA 99.5% medido formal | CloudWatch alarms + SLA reporting | P1 |
| FIN-07 | Reporte de Service Desk | **Falta** | Proceso | Sin reporte mensual tickets | Proceso service desk mensual | — |
| FIN-08 | Plan de Training | **Falta** | Proceso | N/A | Plan capacitación multi-país | — |
| FIN-09 | Escrow de Código | **Falta** | Contrato | Opcional | Escrow código+data | — |
## Integración

| ID | Funcionalidad | Estado | Capa | Evidencia monitoreo-v2 | Acción propuesta | P |
|----|---------------|--------|------|------------------------|------------------|---|
| INT-01 | Compatibilidad Industrial | **Parcial** | Backend/DB | Modbus fields; MQTT iot; sin BACnet/SNMP | Igual ARQ-03 protocol_mappings | P0 |
| INT-02 | API de Salida (Egress) | **Parcial** | Backend | External API + api_keys; no OAuth2 | OAuth2 client credentials PASA | P1 |
| INT-03 | API de Entrada (Ingress) | **Falta** | Backend/DB | Readings read-only; sin POST ingress | POST /v1/measurements ingest virtual meters | P0 |
| INT-04 | Gestión de Certificados | **Parcial** | Infra | TLS RDS/HTTPS; rotación manual | Rotación certificados/keys documentada datalake | P1 |
| INT-05 | Mapeo de Datos | **Falta** | Backend/DB | Conversión W→kW IoT; sin reglas configurables | Tabla normalization_rules por tenant/protocolo | P1 |
| INT-06 | Versionamiento de APIs | **Parcial** | Backend | Prefijo /v1 external API | Política deprecación 6 meses versionada | P2 |
| INT-07 | Guía de Integración Técnica | **Parcial** | Proceso | Swagger dev | Postman collection + guía integración PASA | P2 |
| INT-08 | Tiempo de Respuesta de API | **Parcial** | Backend/DB | Queries optimizadas CAGG; sin benchmark p95 | Medir y garantizar p95 <500ms API datos | P1 |
| INT-09 | Aislamiento de Tráfico | **Parcial** | Infra | API Gateway/CF; mismo cluster | Rate limit separado integración vs UI | P2 |
| INT-10 | Estrategia de Reintentos (Retry) | **Parcial** | Backend | retry.util integraciones | Retries exponenciales webhooks/ETL outbound | P1 |
| INT-11 | Time-out Configurable | **Parcial** | Backend | Timeouts parciales axios/connectors | Timeout configurable por integración en config JSON | P2 |
| INT-12 | Cifrado de Extremo a Extremo | **Parcial** | Backend | MQTT TLS IoT Core prod | Documentar TLS Modbus/BACnet field | P1 |
| INT-13 | Dashboard de Salud de Interfaces | **Falta** | Backend | integration_sync_logs; sin UI salud | API/dashboard salud interfaces + latencia | P1 |
| INT-14 | Mapeo de Transformaciones | **Falta** | Proceso/DB | Sin matriz mapping entregable | Export protocol_mappings Modbus/BACnet→API model | P1 |
## Privacidad

| ID | Funcionalidad | Estado | Capa | Evidencia monitoreo-v2 | Acción propuesta | P |
|----|---------------|--------|------|------------------------|------------------|---|
| PRI-01 | Punto de Contacto | **Parcial** | Proceso | DPO docs privacy/; no oficial PASA-dedicated | Designar contacto privacidad proveedor | — |
| PRI-02 | Notificación de Brechas | **Cubierto** | Backend | breach notification 72h Ley 21.719 | Confirmar 24h PASA PRI-02 vs 72h ley CL | P1 |
| PRI-03 | Impacto de Privacidad | **Parcial** | Proceso | EIPD docs existentes | PIA ante cambios software PASA | — |
| PRI-04 | Registro de Tratamiento | **Parcial** | Proceso | processing-registry endpoint | Registro tratamiento flujos PASA actualizado | — |
| PRI-05 | Necesidad y proporcionalidad | **Parcial** | Backend | Minimización PII; campos opcionales users | Config campos obligatorios por país/proceso | P2 |
| PRI-06 | Campos personales y confidenciales | **Parcial** | Proceso/DB | PII encryption migration 13 | Inventario campos PII/sensibles documentado | P1 |
| PRI-07 | Subprocesadores y localización | **Parcial** | Proceso | privacy docs AWS transfer | Listado subprocesadores vivo | — |
| PRI-08 | Política por categoría de dato | **Parcial** | Backend | data-retention cron; políticas parciales | Retención diferenciada por categoría dato en DB | P1 |

## Detalle por requisito

### ARQ-01 — Escalabilidad Regional

**Estado:** Parcial | **Capa:** Backend/DB | **Prioridad:** P0

**Texto PASA:** La plataforma debe ser nativamente Multi-Country (Chile, Perú, Colombia), gestionando diferentes zonas horarias y multi-moneda de forma simultánea.

**Evidencia monitoreo-v2:** tenants.timezone; sin country/currency en schema

**Acción propuesta:** Agregar country_code, currency en tenants/buildings; soporte multi-zona horaria por building

### ARQ-02 — Estándar de Nube

**Estado:** Parcial | **Capa:** Infra | **Prioridad:** P1

**Texto PASA:** Despliegue en AWS. El proveedor debe detallar la arquitectura y asegurar que el almacenamiento de datos cumpla con las políticas de soberanía de datos de PASA.

**Evidencia monitoreo-v2:** ECS Fargate + RDS TimescaleDB AWS us-east-1

**Acción propuesta:** Documentar arquitectura AWS + política soberanía; evaluar región/data residency PASA

### ARQ-03 — Protocolos de Campo

**Estado:** Parcial | **Capa:** Backend/DB | **Prioridad:** P0

**Texto PASA:** El EMS debe ser agnóstico al hardware, integrando medidores vía Modbus TCP/RTU, BACnet/IP y MQTT sin necesidad de gateways propietarios.

**Evidencia monitoreo-v2:** Modbus en meters; MQTT vía iot_readings; sin BACnet/SNMP

**Acción propuesta:** Tablas protocol_mappings + conectores BACnet/SNMP; ampliar ingest

### ARQ-04 — Gestión de Webhooks

**Estado:** Parcial | **Capa:** Backend | **Prioridad:** P1

**Texto PASA:** Capacidad de enviar notificaciones proactivas (HTTP Push/Webhooks) a sistemas externos ante alarmas o cambios de estado.

**Evidencia monitoreo-v2:** WebhookConnector integraciones; alertas ALERT_WEBHOOK_URL

**Acción propuesta:** Webhooks por tipo evento energético configurables por tenant

### ARQ-05 — Multitenancy y Jerarquía

**Estado:** Parcial | **Capa:** Backend/DB | **Prioridad:** P0

**Texto PASA:** Aislamiento lógico de datos por Mall, con estructura jerárquica que permita consolidación automática por País y Región.

**Evidencia monitoreo-v2:** tenant_id + buildings; sin país/región

**Acción propuesta:** Schema regions/countries + rollup views por país/región/mall

### ARQ-06 — Ambientes

**Estado:** Parcial | **Capa:** Infra | **Prioridad:** P1

**Texto PASA:** Disponibilidad de ambientes independientes y estables de QA/sandbox y Producción.

**Evidencia monitoreo-v2:** Prod ECS+RDS; dev local Docker

**Acción propuesta:** Formalizar ambientes QA/sandbox aislados con datos sintéticos

### ARQ-07 — Latencia y Concurrencia

**Estado:** Parcial | **Capa:** Mixto | **Prioridad:** P1

**Texto PASA:** Dashboards deben cargar en < 3 segundos y soportar usuarios concurrentes sin degradación de performance.

**Evidencia monitoreo-v2:** CAGG + portfolio_summary; perf mejorada dashboard

**Acción propuesta:** Load tests PASA volumetría; índices/CAGG 15min

### ARQ-08 — Monitoreo y Observabilidad

**Estado:** Cubierto | **Capa:** Backend | **Prioridad:** P2

**Texto PASA:** La plataforma debe exponer una página de estado o Health-check endpoints compatibles con herramientas de monitoreo externas.

**Evidencia monitoreo-v2:** GET /health

**Acción propuesta:** Extender health con checks DB/replica

### ARQ-09 — Interfaz Responsiva

**Estado:** Cubierto | **Capa:** Frontend | **Prioridad:** —

**Texto PASA:** Interfaz 100% web, compatible con navegadores modernos y optimizada para dispositivos móviles (PWA o Responsive).

**Evidencia monitoreo-v2:** React responsive

**Acción propuesta:** N/A backend DB

### ARQ-10 — Off-boarding Automático

**Estado:** Falta | **Capa:** Backend/Auth | **Prioridad:** P0

**Texto PASA:** El sistema debe deshabilitar accesos automáticamente si el usuario es dado de baja en el Azure AD de Parque Arauco.

**Evidencia monitoreo-v2:** OAuth Google/MS; sin SCIM/Azure AD sync

**Acción propuesta:** Integración SSO SAML/OIDC + desprovisionamiento AD

### ARQ-11 — Backup y RTO/RPO

**Estado:** Parcial | **Capa:** Infra | **Prioridad:** P1

**Texto PASA:** Respaldo diario con retención de 30 días. Tiempo de recuperación (RTO) menor a 4 horas y pérdida de datos máxima (RPO) de 1 hora.

**Evidencia monitoreo-v2:** RDS backups AWS; sin RTO/RPO documentado

**Acción propuesta:** Automatizar backup diario 30d; runbook RTO<4h RPO<1h

### ARQ-12 — Almacenamiento Histórico

**Estado:** Falta | **Capa:** Backend/DB | **Prioridad:** P0

**Texto PASA:** Capacidad de almacenar y consultar data con granularidad de 15 minutos por un periodo mínimo de 5 años sin archivar.

**Evidencia monitoreo-v2:** retention_policy readings 3y; iot 2y

**Acción propuesta:** Subir a 5y; CAGG readings_15min; quitar drop prematuro

### ARQ-13 — Escalabilidad Horizontal

**Estado:** Parcial | **Capa:** Infra | **Prioridad:** P1

**Texto PASA:** La solución debe tener la capacidad de escalar horizontalmente mediante la incorporación de nuevos componentes de infraestructura (nodos/servidores) sin requerir modificaciones del software.

**Evidencia monitoreo-v2:** ECS multi-task posible; single RDS

**Acción propuesta:** Read replica + escalar ECS; stateless API

### ARQ-14 — Sin puntos únicos de falla

**Estado:** Parcial | **Capa:** Infra | **Prioridad:** P1

**Texto PASA:** La solución debe estar diseñada para garantizar la continuidad operativa tras la falla de cualquier componente de hardware o software (High Availability).

**Evidencia monitoreo-v2:** Single AZ RDS típico

**Acción propuesta:** Multi-AZ RDS + redundancia ECS

### ARQ-15 — Versionamiento

**Estado:** Parcial | **Capa:** Proceso | **Prioridad:** P2

**Texto PASA:** El proveedor debe entregar documentación técnica detallada del SaaS, incluyendo diagramas de arquitectura, flujo de datos, infraestructura y stack tecnológico utilizado.

**Evidencia monitoreo-v2:** docs/context/, README backend

**Acción propuesta:** Entregar pack PASA: diagramas, flujo datos, stack

### ARQ-16 — Gestión de Configuración

**Estado:** Parcial | **Capa:** Infra | **Prioridad:** P2

**Texto PASA:** El proveedor debe garantizar que todas las configuraciones de la infraestructura (Infraestructura como Código) estén versionadas y documentadas.

**Evidencia monitoreo-v2:** Terraform/scripts parciales en repo

**Acción propuesta:** IaC versionado completo ECS/RDS/CF

### ARQ-17 — Pruebas de Carga

**Estado:** Falta | **Capa:** Proceso | **Prioridad:** P1

**Texto PASA:** El proveedor debe demostrar resultados de pruebas de carga y estrés realizadas en los últimos 12 meses que aseguren el soporte de la volumetría proyectada para PASA regional.

**Evidencia monitoreo-v2:** Sin load test report PASA-scale

**Acción propuesta:** Ejecutar y documentar pruebas carga ~2700 medidores

### ARQ-18 — Latencia de Red

**Estado:** Falta | **Capa:** Proceso | **Prioridad:** P2

**Texto PASA:** El proveedor debe especificar los requisitos mínimos de conectividad (ancho de banda y latencia) necesarios en los centros comerciales para el correcto funcionamiento de la plataforma.

**Evidencia monitoreo-v2:** No documentado

**Acción propuesta:** Especificar requisitos bandwidth/latencia por mall

### ARQ-19 — API-First

**Estado:** Parcial | **Capa:** Backend | **Prioridad:** P1

**Texto PASA:** El diseño de la solución debe seguir un enfoque "API-First", asegurando que todas las funcionalidades visibles en la UI sean consumibles programáticamente.

**Evidencia monitoreo-v2:** External API v1 read-only; no 100% UI

**Acción propuesta:** Inventariar gaps API vs UI; exponer endpoints faltantes

### ARQ-20 — Gestión de Obsolescencia

**Estado:** Parcial | **Capa:** Proceso | **Prioridad:** P2

**Texto PASA:** El proveedor debe garantizar que el stack tecnológico (S.O., bases de datos, librerías) se mantenga en versiones con soporte vigente del fabricante

**Evidencia monitoreo-v2:** NestJS 11, PG16, deps actuales

**Acción propuesta:** Política obsolescencia + cron dependabot

### ARQ-21 — Logs de Errores Técnicos

**Estado:** Parcial | **Capa:** Infra | **Prioridad:** P2

**Texto PASA:** La plataforma debe permitir el envío de logs de errores de aplicación a un sistema centralizado de PASA (ej. Splunk, CloudWatch, Datadog) para monitoreo proactivo.

**Evidencia monitoreo-v2:** JsonLogger LOG_FORMAT=json

**Acción propuesta:** Integración CloudWatch/Splunk export formal

### ARQ-22 — Independencia de Navegador

**Estado:** Parcial | **Capa:** Frontend | **Prioridad:** P3

**Texto PASA:** La solución debe ser certificada para funcionar sin degradación en las últimas 3 versiones estables de Chrome, Edge y Safari.

**Evidencia monitoreo-v2:** Sin certificación formal

**Acción propuesta:** Matriz compatibilidad browsers

### ARQ-23 — Acoplamiento Mínimo

**Estado:** Parcial | **Capa:** Backend | **Prioridad:** P2

**Texto PASA:** La arquitectura debe ser modular (Microservicios o similar), permitiendo actualizar componentes específicos sin necesidad de bajar toda la plataforma.

**Evidencia monitoreo-v2:** Monolito NestJS modular

**Acción propuesta:** Documentar módulos desacoplables; path a microservicios

### ARQ-24 — Diccionario de Errores

**Estado:** Falta | **Capa:** Proceso | **Prioridad:** P2

**Texto PASA:** Entrega de un manual técnico con la descripción de todos los códigos de error de la plataforma y los pasos recomendados para su resolución (Troubleshooting).

**Evidencia monitoreo-v2:** Sin manual códigos error

**Acción propuesta:** Publicar catálogo errores API + troubleshooting

### CYB-01 — Autenticación SSO

**Estado:** Parcial | **Capa:** Backend/Auth | **Prioridad:** P0

**Texto PASA:** Integración obligatoria con Azure Active Directory (SSO) mediante protocolo SAMLv2 o OpenID Connect, para la gestion de usuarios centralizada

**Evidencia monitoreo-v2:** OAuth Microsoft/Google; no SAML enterprise PASA

**Acción propuesta:** Azure AD SSO SAML/OIDC obligatorio PASA

### CYB-02 — Multi-Factor (MFA)

**Estado:** Cubierto | **Capa:** Backend | **Prioridad:** —

**Texto PASA:** El sistema debe soportar y exigir MFA para perfiles administrativos y de acceso a datos sensibles.

**Evidencia monitoreo-v2:** MFA TOTP + require_mfa por rol

**Acción propuesta:** —

### CYB-03 — Mínimo Privilegio

**Estado:** Cubierto | **Capa:** Backend/DB | **Prioridad:** P2

**Texto PASA:** La plataforma debe permitir la creación de perfiles basados en roles (RBAC) y auditoría trimestral de permisos.

**Evidencia monitoreo-v2:** RBAC roles/permissions; audit_logs

**Acción propuesta:** Reporte trimestral permisos (proceso)

### CYB-04 — Cifrado en Tránsito

**Estado:** Cubierto | **Capa:** Infra | **Prioridad:** P1

**Texto PASA:** Uso obligatorio de TLS 1.2 o superior para todas las comunicaciones (Web, API y Medidores).

**Evidencia monitoreo-v2:** TLS RDS + HTTPS CloudFront/ECS

**Acción propuesta:** TLS medidores en ingest

### CYB-05 — Cifrado en Reposo

**Estado:** Parcial | **Capa:** Infra | **Prioridad:** P1

**Texto PASA:** Datos en bases de datos y archivos de respaldo deben estar cifrados con AES-256 o superior.

**Evidencia monitoreo-v2:** RDS encryption at rest AWS

**Acción propuesta:** Verificar backups cifrados; documentar AES-256

### CYB-06 — Gestión de Sesiones

**Estado:** Parcial | **Capa:** Backend | **Prioridad:** P1

**Texto PASA:** Tiempo de inactividad máximo de 15 min, cierre automático al cerrar navegador y prohibición de sesiones concurrentes.

**Evidencia monitoreo-v2:** Sesión 24h actual; no 15min idle estricto

**Acción propuesta:** Ajustar maxSessionMinutes; sesiones concurrentes

### CYB-07 — Escaneo DAST

**Estado:** Falta | **Capa:** Proceso | **Prioridad:** P2

**Texto PASA:** El proveedor debe realizar pruebas dinámicas de seguridad (DAST) continuas y automatizadas sobre todas las interfaces (Portal, API, Webhooks).

**Evidencia monitoreo-v2:** Sin DAST continuo documentado

**Acción propuesta:** Pipeline DAST portal/API/webhooks

### CYB-08 — Ethical Hacking

**Estado:** Falta | **Capa:** Proceso | **Prioridad:** P2

**Texto PASA:** Entrega anual de informe ejecutivo de Pentest/Ethical Hacking realizado por un tercero independiente.

**Evidencia monitoreo-v2:** Sin pentest anual tercero

**Acción propuesta:** Contratar pentest anual

### CYB-09 — Protección Perimetral

**Estado:** Parcial | **Capa:** Infra | **Prioridad:** P1

**Texto PASA:** El entorno debe contar con WAF (Web Application Firewall), protección contra DDoS y segmentación de red.

**Evidencia monitoreo-v2:** Helmet, throttler, CORS; sin WAF explícito

**Acción propuesta:** WAF CloudFront + shield

### CYB-10 — Logs de Auditoría

**Estado:** Parcial | **Capa:** Backend/DB | **Prioridad:** P0

**Texto PASA:** Registro detallado de logs (quién, cuándo, qué) con retención mínima de 12 meses e integridad garantizada.

**Evidencia monitoreo-v2:** audit_logs hypertable; cron purga 2y vs req 12m min

**Acción propuesta:** Alinear retención audit ≥12m (ideal 5y ISO); no purgar a 2y

### CYB-11 — BCP / DRP

**Estado:** Parcial | **Capa:** Proceso | **Prioridad:** P1

**Texto PASA:** La plataforma debe poseer un plan de continuidad y recuperación de desastres (DRP) documentado y probado

**Evidencia monitoreo-v2:** DR implícito RDS; sin DRP probado

**Acción propuesta:** Documentar y probar BCP/DRP

### CYB-12 — Borrado Seguro

**Estado:** Parcial | **Capa:** Backend | **Prioridad:** P1

**Texto PASA:** Garantía de borrado criptográfico de la información de Parque Arauco al finalizar el contrato.

**Evidencia monitoreo-v2:** deletion_requests anonimización

**Acción propuesta:** Procedimiento borrado criptográfico fin contrato

### CYB-13 — Escaneo de Red y OS

**Estado:** Falta | **Capa:** Infra | **Prioridad:** P2

**Texto PASA:** La plataforma debe realizar escaneos de vulnerabilidades en la infraestructura y sistemas operativos que soportan el EMS, remediando hallazgos según su criticidad.

**Evidencia monitoreo-v2:** Sin escaneo vuln OS/red documentado

**Acción propuesta:** Programa scanning infra EMS

### CYB-14 — Antivirus y EDR

**Estado:** Falta | **Capa:** Infra | **Prioridad:** P2

**Texto PASA:** Todos los componentes del sistema deben contar con software de protección contra código malicioso actualizado automáticamente y con capacidades de respuesta ante incidentes (EDR).

**Evidencia monitoreo-v2:** Fargate managed; sin EDR explícito

**Acción propuesta:** Documentar controles AWS/shared responsibility

### CYB-15 — Control de Versiones

**Estado:** Parcial | **Capa:** Proceso | **Prioridad:** P2

**Texto PASA:** El sistema debe tener un proceso formal de gestión de cambios que asegure que ninguna modificación pase a producción sin pruebas de seguridad y aprobación previa.

**Evidencia monitoreo-v2:** CI tests; hooks

**Acción propuesta:** Formalizar change management prod

### CYB-16 — Plan de Comunicación

**Estado:** Parcial | **Capa:** Backend | **Prioridad:** P1

**Texto PASA:** El fabricante del EMS debe notificar a PASA cualquier brecha de seguridad confirmada en un plazo máximo de 24 horas desde su detección.

**Evidencia monitoreo-v2:** breach_reports tabla + timer 72h Ley 21.719

**Acción propuesta:** Ajustar a 24h notificación PASA CYB-16

### CYB-17 — Configuración Segura

**Estado:** Parcial | **Capa:** Infra | **Prioridad:** P2

**Texto PASA:** Todos los servidores y bases de datos deben estar configurados siguiendo guías de endurecimiento (Hardening) reconocidas internacionalmente (ej. CIS Benchmarks).

**Evidencia monitoreo-v2:** Hardening parcial Nest/Helmet

**Acción propuesta:** Baseline CIS/hardening RDS/ECS documentado

### CYB-18 — Proceso de Parcheo

**Estado:** Falta | **Capa:** Proceso | **Prioridad:** P2

**Texto PASA:** El proveedor debe garantizar un ciclo de vida de parcheo de seguridad no mayor a 30 días para vulnerabilidades críticas en todos los componentes de la solución.

**Evidencia monitoreo-v2:** Sin SLA parcheo 30d formal

**Acción propuesta:** Política parcheo críticos ≤30d

### CYB-19 — Inventario de Componentes

**Estado:** Parcial | **Capa:** Proceso | **Prioridad:** P2

**Texto PASA:** El proveedor debe mantener un inventario actualizado de todos los componentes tecnológicos (HW/SW) que prestan el servicio y entregarlo a PASA cuando se requiera.

**Evidencia monitoreo-v2:** package.json, Dockerfile

**Acción propuesta:** Inventario SBOM componentes EMS

### CYB-20 — Revisión de Cuentas Privilegiadas

**Estado:** Falta | **Capa:** Proceso | **Prioridad:** P2

**Texto PASA:** Las cuentas con privilegios de administrador deben ser revisadas mensualmente y contar con un registro de justificación de uso (Privileged Access Management).

**Evidencia monitoreo-v2:** Sin revisión mensual cuentas priv

**Acción propuesta:** Proceso PAM + revisión mensual

### CYB-21 — Recolección de Logs de Acceso

**Estado:** Cubierto | **Capa:** Backend/DB | **Prioridad:** P2

**Texto PASA:** Los logs de inicio de sesión deben incluir: IP de origen, ID de usuario, marca de tiempo y resultado de la autenticación (éxito/fallo).

**Evidencia monitoreo-v2:** audit_logs IP, user, timestamp en auth

**Acción propuesta:** Incluir resultado auth fallo explícito

### CYB-22 — IDS / IPS

**Estado:** Falta | **Capa:** Infra | **Prioridad:** P2

**Texto PASA:** El entorno debe disponer de sistemas de detección y prevención de intrusiones (IDS/IPS) activos y monitoreados 24x7.

**Evidencia monitoreo-v2:** Sin IDS/IPS dedicado

**Acción propuesta:** AWS GuardDuty/IDS o equivalente

### CYB-23 — Integridad de Backups

**Estado:** Falta | **Capa:** Infra/DB | **Prioridad:** P1

**Texto PASA:** El proveedor debe realizar pruebas de integridad de los respaldos al menos una vez al semestre para asegurar que la data no sea corrupta al restaurar.

**Evidencia monitoreo-v2:** Sin prueba integridad backup semestral

**Acción propuesta:** Restore test semestral documentado

### DAT-01 — Base de Datos de Réplica

**Estado:** Falta | **Capa:** Infra/DB | **Prioridad:** P0

**Texto PASA:** El proveedor debe disponibilizar una BD de réplica (Read-only) en la nube (preferencia AWS) para procesos ETL masivos, garantizando sincronización NRT (Near Real Time).

**Evidencia monitoreo-v2:** Single RDS endpoint

**Acción propuesta:** RDS read replica + credenciales read-only ETL

### DAT-02 — API REST / GraphQL

**Estado:** Parcial | **Capa:** Backend | **Prioridad:** P1

**Texto PASA:** Provisión de APIs documentadas en Swagger/OpenAPI para consumo de datos de consumo, alarmas y estados, con autenticación via API Keys o OAuth2.

**Evidencia monitoreo-v2:** External API REST + Swagger dev; API keys no OAuth2

**Acción propuesta:** OAuth2 client credentials; OpenAPI prod; GraphQL opcional

### DAT-03 — Webhooks de Eventos

**Estado:** Parcial | **Capa:** Backend | **Prioridad:** P1

**Texto PASA:** Capacidad de configurar Webhooks para empujar datos automáticamente a Parque Arauco ante eventos específicos (ej. sobreconsumo, caída de medidor).

**Evidencia monitoreo-v2:** Webhook connector genérico

**Acción propuesta:** Webhooks evento consumo/alarma configurables

### DAT-04 — Granularidad y Timestamp

**Estado:** Parcial | **Capa:** Backend/DB | **Prioridad:** P0

**Texto PASA:** Los datos deben entregarse con granularidad de 15 minutos e incluir obligatoriamente el Timestamp UTC y la zona horaria local de cada mall.

**Evidencia monitoreo-v2:** timestamptz UTC; sin local_ts en API

**Acción propuesta:** Exponer timestamp_utc + timezone + timestamp_local por building

### DAT-05 — Diccionario de Datos

**Estado:** Falta | **Capa:** Proceso/DB | **Prioridad:** P1

**Texto PASA:** Entrega de un Catálogo de Datos que detalle el linaje, descripción de campos, unidades de medida (kWh, kVARh, etc.) y tipos de datos.

**Evidencia monitoreo-v2:** Sin catálogo datos formal

**Acción propuesta:** Documento data dictionary + unidades kWh/kVARh

### DAT-06 — Flag de Validación

**Estado:** Falta | **Capa:** Backend/DB | **Prioridad:** P0

**Texto PASA:** Cada dato debe incluir un flag de calidad (ej. Dato real, Dato estimado, Dato erróneo) para evitar procesar lecturas corruptas en el Data Lake.

**Evidencia monitoreo-v2:** iot_readings.quality; readings sin flag

**Acción propuesta:** Columna readings.quality_status enum

### DAT-07 — Propiedad y Acceso

**Estado:** Parcial | **Capa:** Backend | **Prioridad:** P1

**Texto PASA:** Garantía contractual de que PASA es dueño de la data. El proveedor debe permitir la extracción total de la historia vía script sin costos adicionales.

**Evidencia monitoreo-v2:** Export JSON perfil; portabilidad ARCO

**Acción propuesta:** Script export total historia sin costo; cláusula contractual

### DAT-08 — Retención Histórica

**Estado:** Falta | **Capa:** Backend/DB | **Prioridad:** P0

**Texto PASA:** La plataforma debe mantener la data "caliente" (accesible vía API/DB) por al menos 5 años para permitir análisis de estacionalidad de largo plazo.

**Evidencia monitoreo-v2:** Retención 3y readings

**Acción propuesta:** Política 5y hot data accesible API/DB

### DAT-09 — Observabilidad de API

**Estado:** Falta | **Capa:** Backend | **Prioridad:** P2

**Texto PASA:** El proveedor debe entregar un dashboard o reporte mensual de uso de APIs, tasas de error y tiempos de respuesta.

**Evidencia monitoreo-v2:** Sin dashboard uso API

**Acción propuesta:** Métricas API mensuales error/latencia

### DAT-10 — Gestión de Backfill

**Estado:** Falta | **Capa:** Backend/DB | **Prioridad:** P0

**Texto PASA:** En caso de caída de comunicación, el sistema debe ser capaz de realizar un Backfill automático (reponer los datos faltantes) una vez recuperada la conexión.

**Evidencia monitoreo-v2:** Sin backfill automático post-outage

**Acción propuesta:** meter_sync_log + job backfill gaps

### DAT-11 — Metadatos de Activos

**Estado:** Parcial | **Capa:** Backend/DB | **Prioridad:** P0

**Texto PASA:** La plataforma debe proporcionar la data enriquecida con metadatos de jerarquía: ID_Mall, ID_País, ID_Locatario, Tipo_Carga (Clima, Iluminación, etc.). Además debe considerar días festivos y contexto externo que permitan realizar corrleaciones precisas

**Evidencia monitoreo-v2:** buildings/meters/tenant_units; sin load_type e IDs PASA

**Acción propuesta:** Campos pasa_mall_id, country, load_type, locatario_id exportables

### DAT-12 — Exportación para Modelos

**Estado:** Parcial | **Capa:** Backend | **Prioridad:** P1

**Texto PASA:** La interfaz de datos debe soportar la extracción de grandes volúmenes en formatos optimizados para Data Science (ej. Parquet o CSV comprimido).

**Evidencia monitoreo-v2:** Reports CSV/Excel; sin Parquet

**Acción propuesta:** Endpoint export Parquet/CSV comprimido bulk

### DAT-13 — Disponibilidad de Datos en Contingencia

**Estado:** Parcial | **Capa:** Infra/Backend | **Prioridad:** P1

**Texto PASA:** En caso de desastre o activación de BCP, el proveedor debe garantizar que los datos históricos y de configuración estén disponibles en el sitio de contingencia con un RPO de máximo 1 hora.

**Evidencia monitoreo-v2:** DR general; validación esquema parcial

**Acción propuesta:** BCP datos + notificación breaking schema changes

### DAT-14 — Auditoría de Acceso a Datos

**Estado:** Parcial | **Capa:** Backend/DB | **Prioridad:** P1

**Texto PASA:** El sistema debe registrar cada vez que un usuario o proceso (interno o del proveedor) consulta datos sensibles de consumo o información de locatarios.

**Evidencia monitoreo-v2:** audit_logs HTTP; no query-level data access

**Acción propuesta:** Log consultas datos sensibles consumo

### DAT-15 — Throttle y Quotas de API

**Estado:** Parcial | **Capa:** Backend | **Prioridad:** P1

**Texto PASA:** El sistema debe tener bien definido y documentado los límites de consumo de la API (rate limiting) para asegurar que los procesos de extracción de PASA no sean bloqueados por falsos positivos de seguridad, ni incurren en sobrecostos por consumo. 

**Evidencia monitoreo-v2:** Throttler + api_keys rate_limit

**Acción propuesta:** Documentar quotas; tiers ETL

### DAT-16 — Consistencia de Agregación

**Estado:** Falta | **Capa:** Backend/DB | **Prioridad:** P1

**Texto PASA:** El sistema debe garantizar que la suma de los datos parciales (locatarios) coincida exactamente con el dato del medidor general (remarcador) mediante reglas de validación automática.

**Evidencia monitoreo-v2:** Jerarquía sin validación suma

**Acción propuesta:** Vista/job meter_balance_checks remarcador vs locatarios

### DAT-17 — Reporte de Salud de Datos

**Estado:** Falta | **Capa:** Backend/DB | **Prioridad:** P1

**Texto PASA:** Entrega trimestral de un reporte de calidad de datos que indique el porcentaje de lecturas exitosas vs. lecturas estimadas o erróneas por mall.

**Evidencia monitoreo-v2:** Sin reporte calidad trimestral

**Acción propuesta:** Tabla data_quality_daily + reporte % real/estimado/erróneo

### DAT-18 — Documentación de Modelo Lógico

**Estado:** Parcial | **Capa:** Proceso/DB | **Prioridad:** P2

**Texto PASA:** El proveedor debe entregar el diagrama Entidad-Relación (DER) actualizado y la descripción de los tipos de datos (Strings, Integers, Booleans) para facilitar el mapeo en el Data Lake.

**Evidencia monitoreo-v2:** Entidades TypeORM; sin DER entregable

**Acción propuesta:** Publicar DER actualizado PASA

### DAT-19 — Trazabilidad de Cargas (Lineage)

**Estado:** Falta | **Capa:** Backend/DB | **Prioridad:** P0

**Texto PASA:** El log de medicion debe permitir verificar la hora exacta de sincronizacion de cada medidor y el estado del proceso para su analitica y gobierno

**Evidencia monitoreo-v2:** Sin trazabilidad sync por medidor

**Acción propuesta:** meter_reading_status (last_sync, source, lag)

### DAT-20 — Certificación de Datos

**Estado:** Parcial | **Capa:** Backend/DB | **Prioridad:** P2

**Texto PASA:** El proveedor debe garantizar que los datos entregados no han sido manipulados manualmente (Data Integrity) y coinciden con la lectura en bruto (Raw Data) del hardware. En caso de errores en la medicion por fallas en conectividad o medicion incosistente, esta debe permitir la incoporacion de un dato manual siguiendo la norma de Consumos No registrados (CNR)

**Evidencia monitoreo-v2:** Lecturas append-only; sin hash integridad

**Acción propuesta:** Checksums/audit trail ingest; certificación no manipulación

### DAT-21 — Soporte para Cargas Incrementales

**Estado:** Parcial | **Capa:** Backend | **Prioridad:** P1

**Texto PASA:** La arquitectura de datos debe permitir extracciones incrementales (solo datos nuevos desde la última consulta) para optimizar el tráfico y no sobrecargar el Data Lake.

**Evidencia monitoreo-v2:** API filtros from/to; sin cursor ETL

**Acción propuesta:** Tabla etl_watermarks + API incremental

### DAT-22 — Documentación de Reglas de Negocio

**Estado:** Parcial | **Capa:** Backend | **Prioridad:** P2

**Texto PASA:** Entrega de un documento que explique cómo se calculan los KPIs de energía (ej. fórmulas de prorrateo, factores de conversión utilizados) dentro del sistema.

**Evidencia monitoreo-v2:** Fórmulas facturación en código

**Acción propuesta:** Documento reglas negocio KPIs/prorrateo

### DAT-23 — Acceso a Datos de Auditoría

**Estado:** Parcial | **Capa:** Backend/DB | **Prioridad:** P1

**Texto PASA:** Capacidad de extraer no solo datos de consumo, sino también logs de quién modificó parámetros de configuración en el maestro de medidores.

**Evidencia monitoreo-v2:** audit_logs config changes parcial

**Acción propuesta:** Auditar cambios maestro medidores/tarifas completos

### DAT-24 — Alerta de Datos Estancados

**Estado:** Falta | **Capa:** Backend | **Prioridad:** P0

**Texto PASA:** Notificación automática si un flujo de datos (API o Réplica) no ha recibido actualizaciones en un periodo superior a 4 horas.

**Evidencia monitoreo-v2:** offline alerts Lambda legacy; no en v2 DB

**Acción propuesta:** Alerta automática flujo sin update >4h por mall/medidor

### DAT-25 — Contratos de datos versionados

**Estado:** Falta | **Capa:** Backend/DB | **Prioridad:** P1

**Texto PASA:** Cada API, réplica, archivo, webhook o integración relevante debe contar con una especificación versionada que detalle esquema, campos obligatorios, tipos de dato, claves de negocio, reglas mínimas de validación, política de cambios y compatibilidad hacia atrás

**Evidencia monitoreo-v2:** Sin contratos versionados

**Acción propuesta:** Tabla data_contracts (version, schema_json, changelog)

### DAT-26 — SLOs de datos

**Estado:** Falta | **Capa:** Backend/DB | **Prioridad:** P2

**Texto PASA:** La plataforma debe comprometer niveles de servicio específicos para datos críticos, incluyendo frescura, completitud, disponibilidad, unicidad operativa y tiempo máximo de recuperación de datasets o interfaces, diferenciados de los SLAs de infraestructura o aplicación

**Evidencia monitoreo-v2:** Sin SLOs datos formalizados

**Acción propuesta:** Tabla data_slo_metrics + monitoreo frescura/completitud

### DAT-27 — Data observability avanzada

**Estado:** Falta | **Capa:** Backend/DB | **Prioridad:** P2

**Texto PASA:** La plataforma debe detectar y alertar automáticamente anomalías de datos tales como quiebres de tendencia, variaciones anómalas de volumen, explosión de nulos, duplicación inesperada, atrasos de actualización y desalineación entre datasets relacionados

**Evidencia monitoreo-v2:** Alert engine eléctrico; no data observability

**Acción propuesta:** Detección anomalías volumen/quiebres tendencia

### DAT-28 — Analítica	Capa semántica alineable con PASA

**Estado:** Falta | **Capa:** Backend/DB | **Prioridad:** P2

**Texto PASA:** La plataforma debe exponer definiciones reutilizables de métricas, dimensiones, jerarquías y reglas de agregación para que puedan alinearse o integrarse con la capa semántica corporativa de PASA y evitar múltiples versiones de una misma métricas. 

**Evidencia monitoreo-v2:** Sin capa semántica

**Acción propuesta:** Tabla metric_definitions (métricas/dimensiones PASA)

### DAT-29 — Gobernanza de prompts, entradas y salidas

**Estado:** Falta | **Capa:** Backend | **Prioridad:** P3

**Texto PASA:** Para cualquier capacidad de IA (Generativa, NLP o Analítica Predictiva), el proveedor debe registrar y auditar: el prompt o parámetros de entrada, los datos técnicos procesados, el resultado/predicción generado, la versión específica del modelo y el usuario o proceso que ejecutó la interacción. Esto debe permitir la reproducibilidad de cualquier decisión o alerta emitida por la IA en una fecha determinada.

**Evidencia monitoreo-v2:** Sin IA generativa hoy

**Acción propuesta:** Si se agrega IA: audit prompts I/O

### DAT-30 — Restricción de entrenamiento con datos de PASA

**Estado:** Cubierto | **Capa:** Proceso | **Prioridad:** P1

**Texto PASA:** La plataforma debe garantizar contractual y técnicamente que los datos, documentos, prompts, respuestas y metadatos de PASA no serán utilizados para entrenar modelos fundacionales, modelos compartidos ni servicios de otros clientes sin autorización expresa y escrita de PASA.

**Evidencia monitoreo-v2:** Política privacidad; datos tenant aislados

**Acción propuesta:** Cláusula contractual no-entrenamiento explícita

### FIN-01 — Escalabilidad de Costos

**Estado:** Falta | **Capa:** Contrato | **Prioridad:** —

**Texto PASA:** El modelo de precios debe ser claro y predecible (Tiered pricing), detallando costos por: Nuevo Medidor, Nuevo Mall o Nuevo Usuario.

**Evidencia monitoreo-v2:** N/A producto

**Acción propuesta:** Propuesta pricing tiered medidor/mall/usuario

### FIN-02 — Escalabilidad del modelo

**Estado:** Parcial | **Capa:** Backend/DB | **Prioridad:** P1

**Texto PASA:** El sistema debe permitir de forma transparente la escalabildad del de la compañia, permitiendo la incorporacion de nuevos centros comerciales, espacios de alquiler, y puntos de medida, adaptandose a las necesidades de los inmuebles que esta midiendo, sin necesidad de realizar una consultoría especifica para realizar estas cargas.

**Evidencia monitoreo-v2:** CRUD buildings/meters/tenant_units

**Acción propuesta:** Onboarding self-service mall/medidor sin consultoría

### FIN-03 — Escalabilidad del modelo

**Estado:** Parcial | **Capa:** Backend/DB | **Prioridad:** P1

**Texto PASA:** El sistema debe permitir de forma transparente la escalabildad del de la compañia, permitiendo la incorporacion de nuevos centros comerciales, espacios de alquiler, y puntos de medida, ampliando los modelos de datos y registros en funcion del nuevo inmueble

**Evidencia monitoreo-v2:** Schema extensible metadata JSONB

**Acción propuesta:** Plantillas onboarding por tipo inmueble

### FIN-04 — Facturación Regional

**Estado:** Falta | **Capa:** Contrato | **Prioridad:** —

**Texto PASA:** Capacidad del proveedor para emitir facturación local en cada país (Chile, Perú, Colombia) o centralizada, según definición de PASA.

**Evidencia monitoreo-v2:** N/A

**Acción propuesta:** Facturación legal CL/PE/CO proveedor

### FIN-05 — Niveles de Soporte (SLA)

**Estado:** Falta | **Capa:** Contrato | **Prioridad:** —

**Texto PASA:** El servicio asociado a la plataforma y licenciamiento debe explicitar el modelo de soporte de la plataforma, considernado escalamiento N1-N2-N3, sus tiempos y resolucion especificos 

**Evidencia monitoreo-v2:** N/A

**Acción propuesta:** Documentar SLA soporte N1-N3

### FIN-06 — Penalidades

**Estado:** Parcial | **Capa:** Infra | **Prioridad:** P1

**Texto PASA:** El servicio y licenciamiento debe considerar un cumplimiento de SLA de soporte y disponibilidad minimo del 99,5%. 

**Evidencia monitoreo-v2:** Sin SLA 99.5% medido formal

**Acción propuesta:** CloudWatch alarms + SLA reporting

### FIN-07 — Reporte de Service Desk

**Estado:** Falta | **Capa:** Proceso | **Prioridad:** —

**Texto PASA:** El proveedor debe entregar mensualmente un reporte de tickets, uptime de la plataforma y cumplimiento de SLAs para revisión con Control de Gestión.

**Evidencia monitoreo-v2:** Sin reporte mensual tickets

**Acción propuesta:** Proceso service desk mensual

### FIN-08 — Plan de Training

**Estado:** Falta | **Capa:** Proceso | **Prioridad:** —

**Texto PASA:** El servicio debe incluir un programa de capacitación para administradores y usuarios finales en todos los países de alcance.

**Evidencia monitoreo-v2:** N/A

**Acción propuesta:** Plan capacitación multi-país

### FIN-09 — Escrow de Código

**Estado:** Falta | **Capa:** Contrato | **Prioridad:** —

**Texto PASA:** (Opcional/Deseable) En caso de quiebra del proveedor, el código fuente y la data deben estar disponibles bajo una cláusula de Escrow para asegurar la continuidad.

**Evidencia monitoreo-v2:** Opcional

**Acción propuesta:** Escrow código+data

### INT-01 — Compatibilidad Industrial

**Estado:** Parcial | **Capa:** Backend/DB | **Prioridad:** P0

**Texto PASA:** Soporte nativo y simultáneo para protocolos Modbus (TCP/RTU), BACnet/IP, SNMP y MQTT para la lectura de dispositivos de campo.

**Evidencia monitoreo-v2:** Modbus fields; MQTT iot; sin BACnet/SNMP

**Acción propuesta:** Igual ARQ-03 protocol_mappings

### INT-02 — API de Salida (Egress)

**Estado:** Parcial | **Capa:** Backend | **Prioridad:** P1

**Texto PASA:** Provisión de APIs RESTful con autenticación OAuth2 para que sistemas internos de PASA, consulten consumos validados.

**Evidencia monitoreo-v2:** External API + api_keys; no OAuth2

**Acción propuesta:** OAuth2 client credentials PASA

### INT-03 — API de Entrada (Ingress)

**Estado:** Falta | **Capa:** Backend/DB | **Prioridad:** P0

**Texto PASA:** Capacidad de recibir datos de medidores virtuales o sistemas externos vía API para consolidar información no proveniente de hardware directo en caso que se detecten medidroes no conectados

**Evidencia monitoreo-v2:** Readings read-only; sin POST ingress

**Acción propuesta:** POST /v1/measurements ingest virtual meters

### INT-04 — Gestión de Certificados

**Estado:** Parcial | **Capa:** Infra | **Prioridad:** P1

**Texto PASA:** Soporte para el uso de certificados digitales (SSL/TLS) y rotación de llaves para asegurar las conexiones entre el EMS y el Datalake.

**Evidencia monitoreo-v2:** TLS RDS/HTTPS; rotación manual

**Acción propuesta:** Rotación certificados/keys documentada datalake

### INT-05 — Mapeo de Datos

**Estado:** Falta | **Capa:** Backend/DB | **Prioridad:** P1

**Texto PASA:** El EMS debe permitir reglas de transformación (Normalización) de datos de campo antes de ser expuestos por la API (ej. conversión de unidades o factores de escala), segun requerimiento de Parque Arauco

**Evidencia monitoreo-v2:** Conversión W→kW IoT; sin reglas configurables

**Acción propuesta:** Tabla normalization_rules por tenant/protocolo

### INT-06 — Versionamiento de APIs

**Estado:** Parcial | **Capa:** Backend | **Prioridad:** P2

**Texto PASA:** El proveedor debe garantizar que, ante actualizaciones de la API, se mantenga la compatibilidad con versiones anteriores (Backward Compatibility) por al menos 6 meses.

**Evidencia monitoreo-v2:** Prefijo /v1 external API

**Acción propuesta:** Política deprecación 6 meses versionada

### INT-07 — Guía de Integración Técnica

**Estado:** Parcial | **Capa:** Proceso | **Prioridad:** P2

**Texto PASA:** Entrega de un SDK o guía detallada con ejemplos de código (cURL, Python o Postman Collection) para facilitar el consumo de datos por parte de PASA.

**Evidencia monitoreo-v2:** Swagger dev

**Acción propuesta:** Postman collection + guía integración PASA

### INT-08 — Tiempo de Respuesta de API

**Estado:** Parcial | **Capa:** Backend/DB | **Prioridad:** P1

**Texto PASA:** El 95% de las consultas a la API de datos deben responder en un tiempo inferior a 500ms para asegurar la eficiencia de los procesos ETL.

**Evidencia monitoreo-v2:** Queries optimizadas CAGG; sin benchmark p95

**Acción propuesta:** Medir y garantizar p95 <500ms API datos

### INT-09 — Aislamiento de Tráfico

**Estado:** Parcial | **Capa:** Infra | **Prioridad:** P2

**Texto PASA:** El tráfico de integración (APIs/Webhooks) debe estar aislado lógicamente del tráfico de usuarios de la plataforma para evitar impactos por denegación de servicio.

**Evidencia monitoreo-v2:** API Gateway/CF; mismo cluster

**Acción propuesta:** Rate limit separado integración vs UI

### INT-10 — Estrategia de Reintentos (Retry)

**Estado:** Parcial | **Capa:** Backend | **Prioridad:** P1

**Texto PASA:** El sistema de integración debe implementar una lógica de reintentos exponenciales ante fallos de red, evitando la pérdida de paquetes de datos de consumo.

**Evidencia monitoreo-v2:** retry.util integraciones

**Acción propuesta:** Retries exponenciales webhooks/ETL outbound

### INT-11 — Time-out Configurable

**Estado:** Parcial | **Capa:** Backend | **Prioridad:** P2

**Texto PASA:** La plataforma debe permitir configurar tiempos de espera (time-outs) por cada canal de integración para evitar procesos colgados en el bus de datos de PASA.

**Evidencia monitoreo-v2:** Timeouts parciales axios/connectors

**Acción propuesta:** Timeout configurable por integración en config JSON

### INT-12 — Cifrado de Extremo a Extremo

**Estado:** Parcial | **Capa:** Backend | **Prioridad:** P1

**Texto PASA:** Todas las integraciones con hardware de campo (Gateways/Medidores) deben soportar túneles cifrados o protocolos seguros (ej. MQTT con TLS).

**Evidencia monitoreo-v2:** MQTT TLS IoT Core prod

**Acción propuesta:** Documentar TLS Modbus/BACnet field

### INT-13 — Dashboard de Salud de Interfaces

**Estado:** Falta | **Capa:** Backend | **Prioridad:** P1

**Texto PASA:** Provisión de una consola de monitoreo donde el equipo técnico de PASA pueda ver el estado de salud y la latencia de cada conexión activa.

**Evidencia monitoreo-v2:** integration_sync_logs; sin UI salud

**Acción propuesta:** API/dashboard salud interfaces + latencia

### INT-14 — Mapeo de Transformaciones

**Estado:** Falta | **Capa:** Proceso/DB | **Prioridad:** P1

**Texto PASA:** Entrega de la matriz de equivalencia (Mapping) que detalle cómo se transforman los datos desde el protocolo Modbus/BACnet hacia el modelo de datos de la API.

**Evidencia monitoreo-v2:** Sin matriz mapping entregable

**Acción propuesta:** Export protocol_mappings Modbus/BACnet→API model

### PRI-01 — Punto de Contacto

**Estado:** Parcial | **Capa:** Proceso | **Prioridad:** —

**Texto PASA:** El proveedor debe contar con un departamento o Oficial de Privacidad/Seguridad que actúe como único punto de contacto para incidentes de datos.

**Evidencia monitoreo-v2:** DPO docs privacy/; no oficial PASA-dedicated

**Acción propuesta:** Designar contacto privacidad proveedor

### PRI-02 — Notificación de Brechas

**Estado:** Cubierto | **Capa:** Backend | **Prioridad:** P1

**Texto PASA:** El proveedor debe informar a PASA sobre cualquier sospecha o confirmación de acceso no autorizado a datos personales en un plazo máximo de 24 horas.

**Evidencia monitoreo-v2:** breach notification 72h Ley 21.719

**Acción propuesta:** Confirmar 24h PASA PRI-02 vs 72h ley CL

### PRI-03 — Impacto de Privacidad

**Estado:** Parcial | **Capa:** Proceso | **Prioridad:** —

**Texto PASA:** El proveedor debe realizar evaluaciones de impacto de privacidad (PIA) ante cualquier cambio en el software que afecte el tratamiento de datos personales.

**Evidencia monitoreo-v2:** EIPD docs existentes

**Acción propuesta:** PIA ante cambios software PASA

### PRI-04 — Registro de Tratamiento

**Estado:** Parcial | **Capa:** Proceso | **Prioridad:** —

**Texto PASA:** El proveedor debe mantener un registro de las actividades de tratamiento de datos realizadas por cuenta de PASA (inventario de flujos de datos).

**Evidencia monitoreo-v2:** processing-registry endpoint

**Acción propuesta:** Registro tratamiento flujos PASA actualizado

### PRI-05 — Necesidad y proporcionalidad

**Estado:** Parcial | **Capa:** Backend | **Prioridad:** P2

**Texto PASA:** La solución debe operar bajo el principio de minimización de datos, permitiendo configurar y justificar qué campos son obligatorios, opcionales o no requeridos según proceso, país y finalidad del tratamiento

**Evidencia monitoreo-v2:** Minimización PII; campos opcionales users

**Acción propuesta:** Config campos obligatorios por país/proceso

### PRI-06 — Campos personales y confidenciales

**Estado:** Parcial | **Capa:** Proceso/DB | **Prioridad:** P1

**Texto PASA:** El proveedor debe entregar y mantener un inventario de campos que identifique cuáles contienen datos personales, datos sensibles, secretos comerciales o información confidencial, incluyendo finalidad, base de tratamiento, retención y controles aplicables

**Evidencia monitoreo-v2:** PII encryption migration 13

**Acción propuesta:** Inventario campos PII/sensibles documentado

### PRI-07 — Subprocesadores y localización

**Estado:** Parcial | **Capa:** Proceso | **Prioridad:** —

**Texto PASA:** El proveedor debe informar y mantener actualizado el listado de subprocesadores, servicios de terceros, país de procesamiento o almacenamiento, finalidad del acceso y salvaguardas aplicadas para cada uno

**Evidencia monitoreo-v2:** privacy docs AWS transfer

**Acción propuesta:** Listado subprocesadores vivo

### PRI-08 — Política por categoría de dato

**Estado:** Parcial | **Capa:** Backend | **Prioridad:** P1

**Texto PASA:** La solución debe permitir definir y ejecutar políticas de retención, anonimización y eliminación diferenciadas por tipo de dato, tipo documental, obligación legal, país, criticidad y finalidad de uso analítico u operativo

**Evidencia monitoreo-v2:** data-retention cron; políticas parciales

**Acción propuesta:** Retención diferenciada por categoría dato en DB
