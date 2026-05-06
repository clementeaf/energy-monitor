# Transferencia Internacional de Datos

**Plataforma:** Energy Monitor (monitoreo-v2)
**Responsable:** Globe Power SpA
**Fecha:** 2026-05-06

---

## 1. Flujos de Datos Actuales

| Servicio AWS | Región | Datos personales | Justificación |
|-------------|--------|-----------------|---------------|
| ECS Fargate | us-east-1 | Backend API — procesa email, nombre, auth tokens | Ejecución de contrato |
| RDS PostgreSQL | us-east-1 | Users, audit_logs, refresh_tokens, deletion_requests | Almacenamiento principal |
| S3 | us-east-1 | Frontend SPA (sin datos personales) | — |
| CloudFront | Global (edge) | Cacheo de assets estáticos (sin datos personales) | — |
| Secrets Manager | us-east-1 | JWT_SECRET, DB_PASSWORD, COOKIE_SECRET (no datos personales) | — |
| CloudWatch | us-east-1 | Logs de aplicación (PII redactada) | Operación |
| ECR | us-east-1 | Imágenes Docker (sin datos personales) | — |
| IoT Core | us-east-1 | Datos de medidores (no personales) | — |
| SES | us-east-1 | Emails de notificación (email destinatario) | Ejecución de contrato |

**Conclusión:** Los datos personales se procesan y almacenan en **us-east-1 (N. Virginia, EEUU)**.

---

## 2. Marco Legal — Ley 21.719

La Ley 21.719 (Art. 16) permite transferencias internacionales cuando:

1. **País con protección adecuada** — La Agencia publicará lista. EEUU **aún no determinado**.
2. **Cláusulas contractuales tipo (SCCs)** — Publicadas por la Agencia. Mientras no se publiquen, se usan equivalentes.
3. **Consentimiento explícito** — Informando riesgos. No escalable para SaaS.
4. **Ejecución de contrato** — Excepción estrecha para transferencias necesarias.

---

## 3. Salvaguardas Implementadas

### 3.1 AWS Data Processing Addendum (DPA)
- AWS incluye SCCs estándar (modelo EU) como anexo del DPA
- Cobertura: Standard Contractual Clauses (módulo procesador-a-procesador)
- Ver: `01-dpa-aws.md` para checklist de formalización

### 3.2 Medidas técnicas complementarias
- [x] **Cifrado at-rest:** RDS encryption (AES-256), S3 SSE
- [x] **Cifrado in-transit:** TLS 1.2+ obligatorio
- [x] **Pseudonimización:** Audit logs usan UUID (no email directo)
- [x] **Control de acceso:** VPC privada, Security Groups restrictivos
- [x] **Minimización:** Solo datos necesarios para el servicio

### 3.3 Documentación de salvaguardas
- [x] DPA de AWS con SCCs (ver `01-dpa-aws.md`)
- [x] EIPD realizada (ver `02-eipd.md`)
- [x] Registro de tratamiento publicado (`GET /privacy/processing-registry`)
- [x] Política de privacidad informa sobre transferencia internacional

---

## 4. Evaluación: Migrar a sa-east-1 (São Paulo)

### Beneficios
- Datos en Sudamérica — menor riesgo regulatorio
- Menor latencia para usuarios en Chile (~50ms vs ~120ms)
- Brasil tiene ley de protección de datos (LGPD) — posible "adecuado"

### Costos estimados
| Recurso | us-east-1 actual | sa-east-1 estimado | Delta |
|---------|------------------|--------------------|-------|
| RDS db.t3.micro | ~$15/mes | ~$18/mes | +20% |
| ECS Fargate (0.25vCPU/0.5GB) | ~$9/mes | ~$11/mes | +22% |
| Data transfer | — | Migración única ~$5 | — |
| **Total mensual** | **~$24/mes** | **~$29/mes** | **+$5/mes** |

### Esfuerzo de migración
1. Crear RDS en sa-east-1 (~1h)
2. pg_dump/pg_restore (~2h para data actual)
3. Crear ECS cluster + task definition en sa-east-1 (~1h)
4. Actualizar CloudFront origin (~30min)
5. DNS cutover (~15min)
6. **Total estimado: 1 día de trabajo**

### Recomendación
**Migrar a sa-east-1 cuando:**
- La Agencia publique la lista de países adecuados Y EEUU no esté incluido
- O cuando el volumen de datos personales aumente significativamente
- O como medida preventiva antes del full enforcement (dic 2026)

**Por ahora:** Las SCCs del DPA de AWS + medidas técnicas son salvaguarda suficiente según Art. 16.

---

## 5. Plan de Acción

- [ ] Formalizar DPA con AWS (ver `01-dpa-aws.md`) — **antes de dic 2026**
- [ ] Monitorear publicación de lista de países adecuados por la Agencia
- [ ] Si EEUU no es "adecuado": evaluar migración a sa-east-1 o implementar SCCs específicas
- [ ] Revisar este análisis cuando la Agencia publique directrices sobre transferencias
