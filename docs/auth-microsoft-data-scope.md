# Login con Microsoft y alcance de datos

## Problema

Si inicias sesión con Microsoft y ves listas vacías (edificios, consumo, etc.) pero con Google sí ves datos, la causa suele ser **qué usuario se resuelve** y **qué sitios tiene asignados**.

## Causas habituales

### 1. Email distinto en el token de Microsoft

El backend identifica al usuario por **email** (y por `provider` + `external_id`). Si el token de Microsoft trae un email distinto al que tiene el usuario en la app, se puede estar resolviendo **otro usuario** (o ninguno).

- En Microsoft Entra, el token puede traer `email`, `preferred_username` o `upn`.
- Si el usuario fue invitado con `usuario@empresa.com` pero el token trae `usuario@empresa.onmicrosoft.com`, el backend puede estar encontrando a otro usuario (invitado con ese UPN) con **sin sitios asignados** → listas vacías.

**Qué hacer:**

- Comprobar en la base de datos qué usuario se usa al entrar con Microsoft: mismo `email` que el de la invitación y que tenga filas en `user_sites` (o un rol con acceso global).
- En Azure AD, configurar **optional claims** para incluir el claim `email` en el ID token y que coincida con el email de la invitación en la app.
- O bien asignar los mismos sitios al usuario que tiene el email/UPN que envía Microsoft (por ejemplo el que tiene `usuario@empresa.onmicrosoft.com`).

### 2. Usuario sin sitios asignados

Si el rol no es global (p. ej. no es `SUPER_ADMIN` ni `CORP_ADMIN`) y el usuario no tiene filas en `user_sites`, el backend filtra todos los edificios y medidores → no hay datos.

**Qué hacer:**

- En Admin → Usuarios, editar al usuario que usa para entrar con Microsoft y asignarle al menos un sitio, o darle un rol con acceso global.

### 3. Backend: fallback de email para Microsoft

Desde el backend se usa este criterio para el “email” del token cuando el proveedor es Microsoft:

- Se usa `email` si viene en el token.
- Si no, se usa `preferred_username` o `upn`.

Así se mejora la identificación cuando Microsoft no envía el claim `email`. Aun así, **el valor que se use debe coincidir con el email (o UPN) del usuario en la app** para que se resuelva el mismo usuario y por tanto el mismo alcance de datos.

## Cómo comprobar

1. Entrar con Microsoft y abrir la respuesta de `GET /api/auth/me`: revisar `user.email` y `user.siteIds` (o `['*']` si es rol global).
2. En la base de datos, buscar el usuario por ese `email` y revisar `user_sites` y `roles`.
3. Si el email del token no coincide con el del usuario que debería tener acceso, ajustar optional claims en Azure o las asignaciones de sitios/roles en la app como arriba.
