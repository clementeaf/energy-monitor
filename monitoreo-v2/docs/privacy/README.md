# Compliance Ley 21.719 — Protección de Datos Personales

**Plataforma:** Energy Monitor (monitoreo-v2)
**Responsable:** Globe Power SpA
**Última actualización:** 2026-05-06

---

## Estado de Compliance

### Implementado (código en producción)

| Requisito | Implementación | Estado |
|-----------|---------------|--------|
| Consentimiento informado | Modal post-login + `POST /auth/accept-privacy` | ✅ Prod |
| MFA proporcional | `require_mfa` por rol, enforcement en login | ✅ Prod |
| Derecho de acceso | `/profile` + `GET /auth/me` | ✅ Prod |
| Derecho de rectificación | `/profile` editar nombre + `PATCH /auth/me` | ✅ Prod |
| Derecho de portabilidad | `/profile` descargar JSON + `GET /auth/me/export` | ✅ Prod |
| Derecho de cancelación | Solicitud eliminación + admin review + anonimización PII | ✅ Prod |
| Política de privacidad pública | `/privacy-policy` + `GET /privacy/policy` | ✅ Prod |
| Registro de tratamiento | `GET /privacy/processing-registry` | ✅ Prod |
| Retención automática | Cron diario: purga tokens 30d + anonimiza inactivos 2y | ✅ Prod |
| Breach notification | `POST/GET/PATCH /admin/breach-reports` con timer 72h | ✅ Prod |
| Seguridad técnica | MFA, httpOnly, theft detection, rate limiting, cifrado, audit inmutable | ✅ Prod |

### Documentación legal (este directorio)

| Documento | Archivo | Estado |
|-----------|---------|--------|
| DPA con AWS | [`01-dpa-aws.md`](01-dpa-aws.md) | Checklist listo, pendiente formalización |
| EIPD | [`02-eipd.md`](02-eipd.md) | Completo, pendiente firma |
| Transferencia internacional | [`03-transferencia-internacional.md`](03-transferencia-internacional.md) | Análisis completo + plan sa-east-1 |
| Designación DPO | [`04-dpo-designacion.md`](04-dpo-designacion.md) | Template listo, pendiente designación |

### Acciones pendientes (no-código)

- [ ] Formalizar DPA con AWS (verificar Customer Agreement + DPA en consola)
- [ ] Firmar EIPD (representante legal + DPO/asesor)
- [ ] Designar DPO (interno o externo)
- [ ] Monitorear lista de países adecuados de la Agencia
- [ ] Capacitar equipo en protección de datos

---

## Endpoints de Privacidad

```
# Públicos (sin autenticación)
GET /privacy/policy              → Política de privacidad JSON
GET /privacy/processing-registry → Registro de actividades de tratamiento

# Autenticados (usuario)
POST /auth/accept-privacy        → Aceptar política de privacidad
GET  /auth/me/export             → Exportar datos personales (JSON)
POST /auth/me/deletion-request   → Solicitar eliminación de cuenta
PATCH /auth/me                   → Rectificar datos (nombre)

# Admin
GET   /deletion-requests         → Listar solicitudes de eliminación
PATCH /deletion-requests/:id/resolve → Aprobar/rechazar solicitud
PATCH /deletion-requests/:id/execute → Ejecutar anonimización PII

# Breach (admin/auditor)
GET   /admin/breach-reports      → Listar reportes de breach
POST  /admin/breach-reports      → Crear reporte (inicia timer 72h)
PATCH /admin/breach-reports/:id  → Actualizar estado (notificado/resuelto)
```

## Timeline Ley 21.719

| Fecha | Hito |
|-------|------|
| Dic 2024 | Ley publicada |
| Dic 2025 | Agencia operativa, principios generales |
| **Dic 2026** | **Full enforcement: ARCO+, consentimiento, DPO, EIPD, seguridad** |
| Dic 2027 | Régimen sancionatorio completo + transferencias internacionales |
