# Plan de negocio: consumo de los datos nuevos en RDS

Objetivo: definir el alcance, las fases y los criterios de éxito para que el backend (y con él la plataforma) consuma y exponga de forma sostenible los datos cargados en RDS desde Google Drive, además de los datos legacy de telemetría Siemens.

---

## 1. Contexto y estado actual

### 1.1 Dos orígenes de datos en RDS

| Origen | Descripción | buildings | meters | readings |
|--------|-------------|-----------|--------|----------|
| **Legacy** | Telemetría Siemens (PAC1670/PAC1651), 2 edificios, 15 medidores | 2 (`pac4220`, `s7-1200`) | 15 (`M001`–`M015`) | Sintéticos (1/min) + histórico |
| **Drive (CSV)** | Importación masiva desde pipeline Fargate (malls, outlets, strip centers) | N (por `center_name`) | Cientos (ej. MG-001, MM-045, SC52-*) | Millones (granularidad 15 min) |

Tras el pipeline de promoción, **readings**, **meters** y **buildings** están unificados: una misma tabla `readings` y unas mismas tablas `meters`/`buildings` sirven ambos orígenes. El backend **ya consume** esos datos: no existe un “backend legacy” y un “backend Drive” separados.

### 1.2 Lo que el backend ya hace hoy

- **Listados**: `GET /buildings`, `GET /buildings/:id/meters`, `GET /meters/overview` devuelven todos los edificios y medidores a los que el usuario tiene acceso (legacy + Drive), con scope por `siteIds` y `X-Site-Context`.
- **Consumo agregado**: `GET /buildings/:id/consumption` con `resolution` (15min/hourly/daily) y opcionalmente `from`/`to`. Funciona para cualquier edificio que exista en `buildings` con medidores en `meters` y filas en `readings`.
- **Series por medidor**: `GET /meters/:id/readings` con `resolution` y `from`/`to`. Raw limitado a 2000 filas; agregados sin límite de filas pero acotados por rango.
- **Uptime, alarmas, eventos**: Endpoints por medidor siguen siendo válidos para cualquier `meter_id` en `meters` (los medidores Drive no tienen telemetría en tiempo real ni offlineAlerts hoy; se pueden tratar como “sin eventos” o extender reglas más adelante).

Por tanto, el “consumo de los datos nuevos” a nivel backend está **ya soportado** por la API actual. El plan de negocio se centra en **cerrar brechas**, **validar** uso en producción y **evolucionar** según necesidades (jerarquía, reporting, escala).

---

## 2. Objetivos de negocio

- **Operar** con un único modelo de datos (RDS unificado) para legacy y Drive, sin duplicar lógica ni endpoints.
- **Exponer** consumo, series y listados de todos los sitios/medidores accesibles, con rangos de fechas y resoluciones adecuadas para evitar sobrecarga.
- **Preparar** la base para reporting, comparativas entre sitios y (opcional) jerarquía en sitios Drive.
- **Mantener** seguridad y gobernanza: RBAC y scope por sitio aplicados igual a datos legacy y Drive.

---

## 3. Brechas identificadas

| Brecha | Impacto | Prioridad |
|--------|---------|------------|
| **Jerarquía solo legacy** | La vista Drill-down (`/monitoring/drilldown/:siteId`) no muestra árbol ni consumo por nodo para edificios creados desde Drive (no hay filas en `hierarchy_nodes`). | Alta si se quiere drill-down en malls/outlets. |
| **Rangos from/to** | El frontend no envía siempre `from`/`to` en consumo y lecturas; el backend puede devolver rangos por defecto muy amplios y costosos con millones de filas. | Alta: rendimiento y coste. |
| **Paginación** | `GET /buildings` y overview de medidores devuelven todo el conjunto; con muchos sitios/medidores puede ser lento. | Media cuando el número de edificios/medidores crezca. |
| **Metadata en staging** | `center_type`, `store_type`, `store_name` solo existen en `readings_import_staging`; no se exponen por API. | Baja/media si se requiere “por tienda” o “por tipo de local” en reportes. |
| **Alertas/uptime en medidores Drive** | Los medidores importados no tienen `last_reading_at` actualizado por telemetría en tiempo real; uptime/alarmas pueden quedar vacíos o fijos. | Baja si solo se usan para histórico; media si se quiere coherencia en vista Dispositivos. |

---

## 4. Fases propuestas

### Fase 1: Validación y uso responsable (corto plazo)

**Objetivo:** Asegurar que el consumo actual de datos nuevos sea correcto, seguro y eficiente.

- **Backend:** Mantener contratos actuales; documentar que todos los endpoints de buildings/meters/readings/consumption aplican por igual a datos legacy y Drive.
- **Frontend:** Garantizar que todas las llamadas a consumo y lecturas envíen `from` y `to` (p. ej. derivados del rango visible del chart o de un selector de fechas). Ref. `docs/data-drive-aws-review.md` y CLAUDE.md.
- **Verificación:** Usar `GET /api/db-verify` (con token) o Lambda/script de verificación para comprobar conteos y distribución de buildings/meters/readings tras cada carga Drive.
- **Criterio de éxito:** Ningún request de consumo/lecturas sin acotar rango en producción; documentación actualizada (CLAUDE, data-drive-aws-review).

### Fase 2: Jerarquía y drill-down para datos Drive (medio plazo)

**Objetivo:** Que la vista Drill-down sea útil para sitios cuyo origen es Drive.

- **Opciones:**  
  - **A)** Definir e importar `hierarchy_nodes` para edificios Drive (p. ej. desde CSV o reglas por `center_name`/`store_name` en staging). **Implementado:** script `infra/drive-import-staging/hierarchy-from-staging.mjs` que lee `readings_import_staging` (center_type, store_type, store_name, meter_id) y escribe la jerarquía en 4 niveles: Building → Panel (center_type) → Subpanel (store_type) → Circuit (meter_id). Uso: `npm run hierarchy-from-staging` (mismo env que promote). Ver `docs/hierarchy-from-staging.md`.  
  - **B)** Generar una jerarquía mínima automática (edificio → “Panel” único → medidores como hojas) a partir de `meters.building_id`.  
  - **C)** Documentar que el drill-down solo aplica a sitios con jerarquía configurada y ofrecer en la UI un aviso o enlace a “Detalle edificio” para el resto.
- **Backend:** Sin cambios de contrato si la jerarquía se alimenta en `hierarchy_nodes`; los endpoints actuales de hierarchy ya sirven cualquier building_id.
- **Criterio de éxito:** Al menos un sitio Drive con jerarquía visible en drill-down (ejecutar hierarchy-from-staging tras promote), o decisión explícita de no soportarlo con mensaje claro en frontend.

### Fase 3: Escala y opciones de reporting (largo plazo)

**Objetivo:** Soportar muchos edificios/medidores y, si aplica, metadata o agregados avanzados.

- **Paginación:** Introducir paginación en `GET /buildings` y en overview de medidores (p. ej. `limit`/`offset` o cursor) cuando el volumen lo justifique.
- **Metadata staging (opcional):** Si el negocio requiere filtros o reportes por “tienda” o “tipo de local”, evaluar: vista materializada, tabla derivada o endpoint de solo lectura que consulte staging con cuidado de no bloquear el pipeline.
- **Export/Reporting:** Si se pide exportación masiva o reportes precalculados, valorar jobs asíncronos o agregaciones precomputadas (p. ej. tablas diarias/mensuales por edificio o medidor).
- **Criterio de éxito:** Definición de requisitos de reporting y escala; implementación acotada a lo acordado (paginación, opcionalmente metadata o export).

---

## 5. Riesgos y dependencias

- **Volumen de readings:** Sin partición por tiempo, consultas con rangos muy amplios pueden ser lentas. Mitigación: uso estricto de `from`/`to` y resoluciones agregadas (hourly/daily) para rangos largos.
- **Pipeline Drive:** El backend depende de que el pipeline Fargate (ingest + promote) siga poblando `readings`/`meters`/`buildings` de forma idempotente. Cualquier cambio de schema o de convención de IDs debe coordinarse con este documento y con la spec de import (`docs/drive-csv-import-spec.md`).
- **RBAC y permisos:** Los usuarios deben tener asignados los `siteIds` correspondientes a los edificios Drive si se quiere que los vean; sin asignación, el scope los excluirá. Mantener procesos de alta de usuarios y asignación de sitios alineados con el catálogo de buildings.

---

## 6. Resumen ejecutivo

- El backend **ya consume** los datos nuevos de RDS (legacy + Drive) a través de los mismos endpoints de edificios, medidores, consumo y lecturas.
- El plan se centra en **validar** el uso (rangos from/to), **cerrar la brecha de jerarquía** para sitios Drive y **preparar** escala y reporting según demanda.
- Fase 1 es prioritaria (uso responsable y documentación); Fases 2 y 3 se ejecutan en función de prioridad de producto y recursos.

Referencias: `docs/data-drive-aws-review.md`, `docs/drive-csv-import-spec.md`, `docs/hierarchy-from-staging.md`, `CLAUDE.md` (sección Bulk CSV Ingest y Frontend: vistas, gráficos, datos y flujo).
