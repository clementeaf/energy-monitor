# Usuario de prueba y token de sesión para consumo API

## Aplicar migraciones en la API

**Opción recomendada:** llamar al endpoint desde la API (tras desplegar o con la API en local con DB accesible):

```bash
# Sin secreto (dev o si MIGRATE_SECRET no está definida)
curl -X POST https://energymonitor.click/api/db-verify/apply-auth-migrations

# Con secreto (producción: definir MIGRATE_SECRET en Lambda y pasar la cabecera)
curl -X POST -H "X-Migrate-Secret: <tu-MIGRATE_SECRET>" \
  https://energymonitor.click/api/db-verify/apply-auth-migrations
```

Respuesta: `{ "applied": ["011_sessions", "012_seed_test_user", "012_seed_session"] }`.

**Opción B (automática en cada deploy):** El workflow de GitHub Actions (`.github/workflows/deploy.yml`) aplica las migraciones de auth justo después de desplegar el backend: al hacer push a `main`, se ejecuta `sls deploy` y luego una llamada a `POST /api/db-verify/apply-auth-migrations`. Opcional: en GitHub → Settings → Secrets, define `MIGRATE_SECRET` y la Lambda exigirá la cabecera `X-Migrate-Secret` en ese endpoint; el workflow la envía automáticamente.

**Opción alternativa (script desde backend):**

```bash
cd backend && npm run migrate:auth
```

Requiere `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD` en `.env` o en el entorno (y túnel a RDS si aplica).

**Opción manual con psql:**

```bash
psql -h <DB_HOST> -U <DB_USER> -d <DB_NAME> -f sql/011_sessions.sql
psql -h <DB_HOST> -U <DB_USER> -d <DB_NAME> -f sql/012_seed_test_user_and_session.sql
```

## Token de prueba (sin OAuth)

Tras aplicar el seed, puedes consumir la API con:

```
Authorization: Bearer test-token-energy-monitor
```

Ejemplo:

```bash
curl -s -H "Authorization: Bearer test-token-energy-monitor" \
  https://energymonitor.click/api/auth/me
```

El usuario de prueba tiene rol **SUPER_ADMIN** y acceso a todos los endpoints.

## Emitir más tokens (con JWT de admin)

Si ya tienes un JWT de un usuario con `ADMIN_USERS.view`:

```bash
curl -s -X POST -H "Authorization: Bearer <tu-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"userId": "<uuid-del-usuario>", "expiresInDays": 90}' \
  https://energymonitor.click/api/session/issue-token
```

Respuesta: `{ "token": "<token-en-claro>", "expiresAt": "..." }`. Usa ese `token` como Bearer para consumir la API como ese usuario.
