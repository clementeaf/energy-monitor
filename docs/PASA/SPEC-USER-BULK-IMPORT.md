# SPEC — Importación masiva de usuarios (self-admin multi-tenant)

**Objetivo:** un admin de tenant entra con Microsoft/Google y carga un CSV/XLSX con usuarios a invitar, ve preview con errores por fila, confirma (Ley 21.719) y el sistema crea usuarios + envía invitaciones — sin intervención Globe Power.

**Alcance v1:** solo **usuarios** (`users` + `user_building_access`).  
**Fuera de v1:** PDF, import edificios/medidores/locatarios, auto-registro sin admin, dominio corporativo JIT.

**Referencias:** `CreateUserDto`, `UsersService.create`, `NotificationService.notifyUserCreated`, patrón jobs `backfill_jobs`, `ROADMAP-TECNICO-GAPS.md`.

**IDs:** `IMP-###` — ticket atómico 0.5–1 día dev.

---

## Flujo funcional

```
Admin → descarga plantilla CSV
     → sube CSV/XLSX (≤500 filas, ≤1 MB)
     → POST validate → job + staging rows + summary
     → revisa preview (valid / error / duplicate)
     → marca ageVerified + Confirmar
     → POST commit → crea users + assign buildings + notifyUserCreated
     → job status committed + audit log
```

**Plantilla v1 (cabeceras canónicas en inglés snake_case):**

| Columna | Obligatorio | Ejemplo | Notas |
|---------|-------------|---------|-------|
| `email` | Sí | `juan@empresa.cl` | Único por tenant |
| `auth_provider` | Sí | `microsoft` | `microsoft` \| `google` (aliases: `ms`, `azure`, `google`) |
| `role_slug` | Sí | `operator` | Slug rol del tenant (no UUID) |
| `display_name` | No | `Juan Pérez` | |
| `building_codes` | No | `MM446,MG254` | Separados por `;` o `,`. Resuelve: `buildings.code` → `external_site_id` → nombre exacto |
| `phone` | No | `+56912345678` | Solo para SMS invitación (no persiste en `users` v1) |

**XLSX:** primera hoja; fila 1 = headers; mismas columnas. Headers alias ES/EN mapeados en código (ver IMP-020).

**PDF:** explícitamente **rechazado** en v1 (`415` + mensaje “exporte a Excel/CSV”).

---

## Convenciones multi-tenant

1. Todo job y staging row lleva `tenant_id` + FK cascade.
2. Resolución de edificios/roles **scoped al tenant** del JWT.
3. `super_admin` cross-tenant: header `x-tenant-id` obligatorio en validate/commit.
4. Jerarquía roles: mismo `enforceHierarchy` que `POST /users`.
5. Usuario existente por email → fila `duplicate` (skip en commit, no error fatal).
6. Placeholder OAuth: `auth_provider_id = 'pending-import'` hasta primer login (ver IMP-001).

---

## Dependencias entre olas

```
Ola IMP-0 (DB)
  └──► Ola IMP-1 (parser/lib)
         └──► Ola IMP-2 (API + service)
                └──► Ola IMP-3 (frontend)
```

---

## Ola IMP-0 — Base de datos

| ID | Tarea | Archivos | Deps | Done |
|----|-------|----------|------|------|
| IMP-001 | Hacer `users.auth_provider_id` nullable; backfill filas invitación con `'pending-import'` donde falte | `database/migrations/41-user-import-prereq.sql` | — | `ALTER COLUMN ... DROP NOT NULL`; entity `user.entity.ts` `nullable: true` |
| IMP-002 | Enum `user_import_job_status`: `pending_parse`, `ready`, `committing`, `committed`, `failed`, `cancelled` | misma migración | — | Tipo PG creado |
| IMP-003 | Enum `user_import_row_status`: `pending`, `valid`, `error`, `duplicate`, `skipped`, `created` | misma migración | — | Tipo PG creado |
| IMP-004 | Tabla `user_import_jobs`: `id`, `tenant_id`, `created_by_user_id`, `original_filename`, `file_format` (`csv`\|`xlsx`), `status`, `total_rows`, `valid_rows`, `error_rows`, `duplicate_rows`, `created_rows`, `age_verified_at_commit` bool, `error_summary` text, `committed_at`, timestamps | `41-user-import-prereq.sql` | IMP-002 | FK tenants, users; index `(tenant_id, created_at DESC)` |
| IMP-005 | Tabla `user_import_staging_rows`: `id`, `job_id`, `tenant_id`, `row_number`, raw JSONB `raw_cells`, campos parseados (`email`, `display_name`, `auth_provider`, `role_slug`, `building_codes_raw`, `phone`), `status`, `error_codes` text[], `resolved_role_id`, `resolved_building_ids` uuid[], `created_user_id`, `created_at` | misma | IMP-003, IMP-004 | FK job CASCADE; index `(job_id, row_number)` unique |
| IMP-006 | Registrar migración en `schema_migrations` | misma | IMP-004 | Insert `41-user-import-prereq` |
| IMP-007 | Documentar tablas en `docs/context/db-schema.md` | db-schema.md | IMP-004 | Sección user_import_* |
| IMP-008 | Job retention: cron diario purga jobs `committed`/`failed`/`cancelled` > 90 días (+ staging cascade) | `data-retention.service.ts` + spec test | IMP-004 | Test purge count |

**Verificación Ola 0:** `psql` — tablas existen; insert job + 3 staging rows manual OK.

---

## Ola IMP-1 — Backend: parser y validación (sin HTTP)

| ID | Tarea | Archivos | Deps | Done |
|----|-------|----------|------|------|
| IMP-010 | Constantes: `MAX_IMPORT_ROWS=500`, `MAX_IMPORT_BYTES=1_048_576`, formatos permitidos | `backend/src/modules/user-import/user-import.constants.ts` | — | Exportadas |
| IMP-011 | Mapa alias headers → canónico (`email`↔`correo`, `role_slug`↔`rol`, etc.) | `user-import-column-map.ts` | — | Unit test ≥10 aliases |
| IMP-012 | Parser CSV: `csv-parse` sync, detecta delimiter `,`/`;`, UTF-8 BOM | `user-import.parser.ts` | IMP-010, IMP-011 | Test fixture 5 filas |
| IMP-013 | Parser XLSX: primera hoja, `xlsx` (SheetJS); rechaza >1 hoja con datos | mismo | IMP-012 | Test `.xlsx` mínimo |
| IMP-014 | Normalizador fila → `ParsedUserImportRow` (email lower trim, provider enum, split building_codes) | `user-import.types.ts` + normalizer | IMP-011 | Test aliases ES |
| IMP-015 | Validador fila: email format, provider in enum, role_slug non-empty, phone E.164 opcional | `user-import.validator.ts` | IMP-014 | Códigos error: `INVALID_EMAIL`, `INVALID_PROVIDER`, `MISSING_ROLE`, `INVALID_PHONE` |
| IMP-016 | Resolver `role_slug` → `role_id` UUID tenant-scoped | `user-import.resolver.ts` | — | 404 code `ROLE_NOT_FOUND` |
| IMP-017 | Resolver `building_codes` → UUID[] (orden: `code`, `external_site_id`, `name` case-insensitive) | mismo | — | Code `BUILDING_NOT_FOUND`; partial match lista cuáles fallaron |
| IMP-018 | Detector duplicados: email ya en `users` tenant (+ email_hmac) → status `duplicate` | `user-import.validator.ts` | IMP-015 | Test email existente |
| IMP-019 | Validador jerarquía: creator no puede asignar rol superior | reutiliza `UsersService.enforceHierarchy` o extract helper | IMP-016 | Test operator crea super_admin → error fila |
| IMP-020 | Función `parseAndValidateFile(buffer, mime, tenantId, creatorRoleId, creatorRoleSlug)` → `{ rows, summary }` sin persistir | `user-import-parse.service.ts` | IMP-012–019 | Test integración 20 filas mixed |

**Verificación Ola 1:** `npm test -- user-import` verde sin controller.

---

## Ola IMP-2 — Backend: API, persistencia y commit

| ID | Tarea | Archivos | Deps | Done |
|----|-------|----------|------|------|
| IMP-021 | Entities TypeORM: `UserImportJob`, `UserImportStagingRow` | `entities/` | IMP-004 | Compilan + registradas en module |
| IMP-022 | `UserImportModule` + import en `app.module.ts` | module | IMP-021 | App bootstrap OK |
| IMP-023 | `UserImportService.createJobFromUpload(file, user)` — guarda buffer metadata, status `pending_parse` | service | IMP-020 | — |
| IMP-024 | `UserImportService.parseJob(jobId, tenantId)` — parse → bulk insert staging → status `ready` + counts | service | IMP-023 | Transacción; failed → `failed` + error_summary |
| IMP-025 | `UserImportService.getJobPreview(jobId, tenantId, limit, offset)` — paginated staging + summary | service | IMP-024 | JSON `{ job, rows, pagination }` |
| IMP-026 | `UserImportService.commitJob(jobId, tenantId, { ageVerified }, creator)` — requiere `ageVerified===true` | service | IMP-024 | Ley 21.719 400 si false |
| IMP-027 | Commit loop: filas `valid` only → `UsersService.create` o método interno sin double-notify; filas `duplicate` → skip; buildings assign | service | IMP-026 | `created_rows` count; status `committed` |
| IMP-028 | En create importado: `authProviderId: 'pending-import'`, `ageVerified: true` (admin confirmó batch) | service | IMP-001 | Primer OAuth enlaza por email (auth existente) |
| IMP-029 | Notificaciones: batch con límite concurrencia 5 (`notifyUserCreated` por fila creada) | service | IMP-027 | Log `[USER_IMPORT]` por job |
| IMP-030 | Audit log: `action=user_import.commit`, `resourceType=user_import_job`, details `{ created, skipped, errors }` | service | IMP-027 | Fila en audit_logs |
| IMP-031 | `GET /users/import/template` — descarga CSV plantilla con header + 1 fila ejemplo comentada | controller | — | `Content-Disposition: attachment` |
| IMP-032 | `POST /users/import/validate` — multipart `file`; `@RequirePermission('admin_users','create')`; 201 `{ jobId, summary }` | controller + DTO | IMP-023–024 | Swagger; 413 si >1MB; 400 PDF |
| IMP-033 | `GET /users/import/:jobId` — preview job + summary | controller | IMP-025 | 404 cross-tenant |
| IMP-034 | `GET /users/import/:jobId/rows?limit&offset&status` — filas staging filtrables | controller | IMP-025 | — |
| IMP-035 | `POST /users/import/:jobId/commit` — body `{ ageVerified: boolean }` | controller | IMP-026 | 409 si job no `ready`; 202 si committing async (sync v1 OK) |
| IMP-036 | `DELETE /users/import/:jobId` — cancel draft (`ready`/`pending_parse` → `cancelled`) | controller | IMP-023 | 409 si ya committed |
| IMP-037 | `GET /users/import` — list jobs tenant paginado (últimos 20) | controller | IMP-004 | — |
| IMP-038 | Tests controller: validate happy path, commit sin ageVerified 400, cross-tenant 404 | `user-import.controller.spec.ts` | IMP-032–035 | ≥8 tests |
| IMP-039 | Tests service commit: 3 valid + 1 duplicate + 1 error → created=3 | `user-import.service.spec.ts` | IMP-027 | — |
| IMP-040 | Documentar endpoints en `docs/context/api-endpoints.md` | docs | IMP-032–037 | Tabla completa |

**Verificación Ola 2:** curl validate + commit con CSV 3 filas; users en DB; emails log `[USER_INVITE]`.

---

## Ola IMP-3 — Frontend

| ID | Tarea | Archivos | Deps | Done |
|----|-------|----------|------|------|
| IMP-050 | Tipos TS: `UserImportJob`, `UserImportRow`, `UserImportSummary`, payloads | `types/user-import.ts` | IMP-032 | Export en `types/index.ts` |
| IMP-051 | Rutas API en `services/routes.ts` | routes.ts | — | `usersImport`, `usersImportTemplate`, etc. |
| IMP-052 | `userImportEndpoints` + hooks `useUserImportJobsQuery`, `useUserImportPreviewQuery`, mutations validate/commit/cancel | endpoints + hooks | IMP-051 | Patrón 3-file |
| IMP-053 | Util descarga plantilla: `GET template` → blob → `usuarios-import-v1.csv` | hook helper | IMP-052 | Click descarga OK |
| IMP-054 | Componente `UserImportDropzone` — acepta `.csv,.xlsx`, max 1MB, rechaza PDF con toast | `components/user-import/` | — | Vitest: reject pdf |
| IMP-055 | Tab `Importar` en `UsersPage` o ruta `/admin/users/import` (preferir **tab** para no proliferar sidebar) | `UsersPage.tsx` o subcomponente | IMP-052 | Tab visible con perm `admin_users:create` |
| IMP-056 | Paso 1 UI: dropzone + link “Descargar plantilla” + texto columnas requeridas | `UserImportTab.tsx` | IMP-053–054 | — |
| IMP-057 | Paso 2 UI: tras validate — cards summary (total/valid/error/duplicate) + tabla preview paginada | mismo | IMP-052 | Badges status por fila; columna `error_codes` legible ES |
| IMP-058 | Paso 3 UI: checkbox Ley 21.719 “Confirmo que todos los usuarios son mayores de 14 años” + botón **Crear N usuarios** disabled sin check | mismo | IMP-035 | — |
| IMP-059 | Paso 4 UI: resultado commit — toast + resumen created/skipped; link “Ver usuarios” | mismo | IMP-027 | Invalida `useUsersQuery` |
| IMP-060 | Historial: lista últimos imports del tenant (fecha, archivo, status, created_rows) colapsable | mismo | IMP-037 | — |
| IMP-061 | Estado loading/error con `QueryStateView` / skeleton coherente con admin | mismo | — | — |
| IMP-062 | Vitest: `UserImportTab` render + validate mock + commit disabled sin checkbox | `UserImportTab.test.tsx` | IMP-058 | ≥4 tests |
| IMP-063 | Actualizar `docs/context/frontend-views.md` — flujo import usuarios | docs | IMP-055 | — |

**Verificación Ola 3:** admin sube CSV 2 filas → preview → commit → aparecen en tabla usuarios.

---

## Ola IMP-4 — Backlog (post v1)

| ID | Tarea | Notas |
|----|-------|-------|
| IMP-070 | Import edificios CSV (`buildings` + geo fields) | Misma maquinaria jobs/staging |
| IMP-071 | Import locatarios (`tenant_units` + `external_unit_id`) | Resolver building |
| IMP-072 | Import medidores | Jerarquía + parent_meter |
| IMP-073 | Mapeo columnas UI (column mapper) si cliente trae headers distintos no cubiertos por alias | Fase 2 |
| IMP-074 | Persistir `phone` en `users.phone` cifrado | Migración + perfil |
| IMP-075 | Commit async con worker (jobs >200 filas) | Reusar patrón `data_export_jobs` |
| IMP-076 | Permiso dedicado `users:import` en RBAC | Opcional split de `admin_users:create` |

---

## Criterios de aceptación (UAT)

1. Admin tenant descarga plantilla sin autenticación especial (solo perm create).
2. CSV 10 usuarios válidos → 10 filas `valid` en preview.
3. Fila email duplicado → `duplicate`, no bloquea commit del resto.
4. Fila rol inexistente → `error` con mensaje claro; no se crea en commit.
5. Commit sin checkbox ageVerified → 400 backend + botón disabled frontend.
6. Usuario importado entra con MS/Google mismo email → login OK, MFA si rol lo exige.
7. Operador con edificios en CSV → `user_building_access` correcto.
8. Job otro tenant → 404.

---

## Riesgos y decisiones

| Tema | Decisión v1 |
|------|-------------|
| PDF | Rechazar; pedir CSV/XLSX |
| Email case | Normalizar lowercase; match OAuth por email_hmac existente |
| PII encryption | Reutilizar `encryptPii` en create path existente |
| SSO tenants | `auth_provider` import solo `microsoft`/`google`; SSO users pre-creados por admin PASA con provider oidc en UI manual (fuera import v1) |
| Límite filas | 500 — documentar en UI |

---

## Estimación

| Ola | Tasks | Días dev |
|-----|-------|----------|
| IMP-0 DB | 8 | 0.5–1 |
| IMP-1 Parser | 11 | 1.5–2 |
| IMP-2 API | 20 | 2–3 |
| IMP-3 Frontend | 14 | 1.5–2 |
| **Total v1** | **53** | **~5–8 días** |

---

## Próximo paso

Ejecutar **Ola IMP-0** (migración `41-user-import-prereq.sql`) en Docker local `:5434` antes de cualquier código backend.

---

## Deploy AWS (ligero)

Sin ECS redeploy: **solo SQL idempotente** contra RDS. Mismo script que local.

```bash
cd monitoreo-v2/backend
DB_HOST=<rds-endpoint> DB_PORT=5432 DB_NAME=monitoreo_v2 \
DB_USERNAME=... DB_PASSWORD=... DB_SSL=true \
npm run db:migrate -- 41-user-import-prereq
```

Alternativa sin Node (útil en CI/ECS Exec):

```bash
psql "postgresql://USER:PASS@HOST:5432/monitoreo_v2?sslmode=require" \
  -f monitoreo-v2/database/migrations/41-user-import-prereq.sql
```

Verificar: `SELECT version FROM schema_migrations WHERE version = '41-user-import-prereq';`

Desplegar backend con código IMP-2+ **después** de aplicar la migración. El cron de retención tolera ausencia de tabla hasta IMP-0 esté aplicado.
