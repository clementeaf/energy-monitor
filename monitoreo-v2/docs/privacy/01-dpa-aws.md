# Acuerdo de Procesamiento de Datos (DPA) — AWS

## Contexto
Globe Power SpA utiliza Amazon Web Services como procesador de datos personales para la plataforma Energy Monitor (monitoreo-v2). La Ley 21.719 (Art. 15 bis) exige un contrato escrito con cada procesador.

## Estado Actual
- **Cuenta AWS:** 058310292956
- **Región principal:** us-east-1 (N. Virginia)
- **Servicios utilizados:** ECS Fargate, RDS PostgreSQL, S3, CloudFront, ECR, CloudWatch, Secrets Manager, IoT Core
- **Datos personales procesados:** email, nombre, IP, user-agent, auth provider ID, audit logs

## AWS Data Processing Addendum (DPA)

AWS ofrece un DPA preconfigurado que cumple con GDPR y es compatible con la Ley 21.719.

### Pasos para formalizar

- [ ] **1. Acceder al AWS DPA**
  - URL: https://aws.amazon.com/compliance/data-processing-addendum/
  - El DPA de AWS aplica automáticamente bajo los AWS Service Terms
  - Verificar que la versión vigente cubre: objeto, duración, finalidad, tipos de datos, categorías de titulares

- [ ] **2. Verificar cobertura contractual**
  - [ ] AWS Customer Agreement firmado (ver AWS Console → Account → Agreements)
  - [ ] DPA referenciado en los Service Terms
  - [ ] Cláusulas contractuales tipo (SCCs) incluidas como Anexo del DPA
  - [ ] Sub-procesadores listados en: https://aws.amazon.com/compliance/sub-processors/

- [ ] **3. Documentar internamente**
  - [ ] Registrar en el registro de tratamiento: AWS como procesador
  - [ ] Archivar copia del DPA + SCCs vigentes
  - [ ] Registrar lista de sub-procesadores de AWS (fecha de descarga)

- [ ] **4. Configurar notificaciones de cambios**
  - Suscribirse a actualizaciones de sub-procesadores: https://aws.amazon.com/compliance/sub-processors/
  - AWS notifica cambios con 30 días de anticipación

## Cláusulas requeridas por Ley 21.719 (Art. 15 bis)

| Cláusula | Cobertura AWS DPA |
|----------|-------------------|
| Objeto y duración del tratamiento | ✅ Definido en Service Terms |
| Naturaleza y finalidad | ✅ Prestación de servicios cloud |
| Tipos de datos personales | ✅ Categorías definidas en DPA Anexo |
| Categorías de titulares | ✅ End users del cliente |
| Obligaciones y derechos del responsable | ✅ Sección del DPA |
| Instrucciones del responsable | ✅ Solo procesa según instrucciones documentadas |
| Medidas de seguridad | ✅ AWS Shared Responsibility Model + ISO 27001/SOC2 |
| Sub-procesadores | ✅ Lista pública + notificación de cambios |
| Asistencia al responsable | ✅ Cooperación para derechos ARCO+ y breach notification |
| Eliminación/devolución al término | ✅ Eliminación de datos al cerrar cuenta |

## Responsable de completar
- **Quién:** Representante legal Globe Power SpA
- **Plazo sugerido:** Antes del 1 de diciembre 2026 (full enforcement Ley 21.719)
- **Archivo:** Guardar evidencia en este directorio o sistema documental corporativo
