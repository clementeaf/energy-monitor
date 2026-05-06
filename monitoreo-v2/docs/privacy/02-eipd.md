# Evaluación de Impacto en la Protección de Datos (EIPD)

**Plataforma:** Energy Monitor (monitoreo-v2)
**Responsable:** Globe Power SpA
**Fecha:** 2026-05-06
**Versión:** 1.0

---

## 1. Descripción del Tratamiento

### 1.1 Tratamiento evaluado: Registros de Auditoría
- **Qué:** Registro automático de todas las acciones mutantes (POST/PATCH/DELETE) realizadas por usuarios en la plataforma
- **Datos capturados:** user_id, acción HTTP, recurso, resource_id, dirección IP, user-agent, tenant_id, timestamp
- **Almacenamiento:** TimescaleDB hypertable (inmutable, particionado por tiempo)
- **Retención:** 2 años
- **Acceso:** Usuarios con permiso `audit:read`

### 1.2 Tratamiento evaluado: Motor de Alertas Automatizado
- **Qué:** Evaluación automática cada 5 minutos de reglas de alerta sobre lecturas energéticas
- **Datos utilizados:** Lecturas de medidores (no personales), configuración de reglas, escalamiento
- **Notificaciones:** Email (SES) + webhook a destinatarios configurados
- **Decisiones automatizadas:** Escalamiento de severidad basado en tiempo sin resolución

---

## 2. Necesidad y Proporcionalidad

### 2.1 Audit Logging

| Criterio | Evaluación |
|----------|------------|
| **Finalidad legítima** | Seguridad, trazabilidad, cumplimiento ISO 27001, detección de accesos no autorizados |
| **Base legal** | Interés legítimo (Art. 13 letra d, Ley 21.719) |
| **Necesidad** | Sí — sin audit trail no es posible detectar ni investigar incidentes de seguridad |
| **Proporcionalidad** | Se capturan solo datos de la acción (no contenido de requests/responses). IP y user-agent son necesarios para detección de anomalías |
| **Minimización** | PII redactada en logs internos del servidor (email → masked, providerId → masked). Audit logs contienen user_id UUID (no email directamente) |

### 2.2 Motor de Alertas

| Criterio | Evaluación |
|----------|------------|
| **Finalidad legítima** | Monitoreo operativo de infraestructura energética contratada |
| **Base legal** | Ejecución del contrato (Art. 13 letra c) |
| **Datos personales involucrados** | Mínimos — las alertas se basan en datos de medidores, no de personas. Emails de destinatarios para notificaciones |
| **Decisiones automatizadas** | No afectan derechos de personas. Escalamiento de alertas es operativo (voltaje, potencia, etc.) |

---

## 3. Evaluación de Riesgos

### 3.1 Riesgos identificados

| Riesgo | Probabilidad | Impacto | Nivel | Mitigación |
|--------|-------------|---------|-------|------------|
| Acceso no autorizado a audit logs | Baja | Alto | **Medio** | Permiso `audit:read` requerido. JWT httpOnly. Rate limiting |
| Correlación de IPs para rastreo de usuarios | Baja | Medio | **Bajo** | IPs solo accesibles via audit:read. Retención 2 años con purga automática |
| Retención excesiva de datos | Media | Medio | **Medio** | Política de retención documentada: 2 años. Cron automático de purga |
| Breach de audit logs | Baja | Alto | **Medio** | Cifrado RDS at-rest. TLS in-transit. VPC privada. SG restrictivo |
| Re-identificación post-eliminación | Baja | Alto | **Medio** | Anonimización SHA-256 del email. user_id UUID sin correlación directa |

### 3.2 Riesgos del motor de alertas

| Riesgo | Probabilidad | Impacto | Nivel | Mitigación |
|--------|-------------|---------|-------|------------|
| Exposición de emails en notificaciones | Baja | Bajo | **Bajo** | Emails en env vars (SES), no en DB de alertas |
| Decisión automatizada discriminatoria | N/A | N/A | **N/A** | Alertas son sobre equipos eléctricos, no sobre personas |

---

## 4. Medidas de Mitigación Implementadas

### Técnicas
- [x] Cifrado at-rest (RDS encryption, S3 SSE)
- [x] Cifrado in-transit (TLS 1.2+)
- [x] Autenticación MFA obligatoria para roles privilegiados
- [x] Tokens httpOnly con `__Host-` prefix, theft detection
- [x] Rate limiting (3 tiers, Redis-backed)
- [x] Audit logs inmutables (TimescaleDB hypertable)
- [x] PII redaction en logs de servidor
- [x] Anonimización SHA-256 al eliminar cuentas
- [x] VPC privada para RDS (no accesible públicamente)
- [x] Purga automática de tokens expirados (cron diario)
- [x] Anonimización automática de usuarios inactivos >2 años (cron diario)

### Organizativas
- [x] Política de privacidad publicada y aceptada por usuarios
- [x] Registro de actividades de tratamiento documentado
- [x] Flujo de derechos ARCO+ implementado (acceso, rectificación, cancelación, portabilidad)
- [x] Workflow de breach notification con timer 72h
- [ ] DPA con AWS formalizado (en proceso)
- [ ] Capacitación equipo en protección de datos (pendiente)
- [ ] DPO designado (recomendado)

---

## 5. Conclusión

### Tratamiento de audit logs
**Riesgo residual: MEDIO-BAJO**
El tratamiento es necesario y proporcionado. Las medidas técnicas implementadas (cifrado, inmutabilidad, control de acceso, anonimización, retención automática) reducen significativamente el riesgo. Se recomienda:
1. Completar formalización DPA con AWS
2. Capacitar al equipo en manejo de incidentes
3. Revisar esta EIPD anualmente

### Motor de alertas
**Riesgo residual: BAJO**
El motor opera sobre datos de medidores (no personales). Los únicos datos personales involucrados son emails de destinatarios de notificaciones, almacenados en variables de entorno. No se toman decisiones automatizadas que afecten derechos de personas.

---

## 6. Aprobación

| Rol | Nombre | Fecha | Firma |
|-----|--------|-------|-------|
| Responsable del tratamiento | _________________ | __________ | __________ |
| DPO / Asesor privacidad | _________________ | __________ | __________ |

**Próxima revisión:** Mayo 2027 (o ante cambio significativo en el tratamiento)
