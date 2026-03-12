---
name: gh-workflow-monitor
description: >-
  Use gh cli to list workflows, list and inspect runs, and fetch job logs for
  GitHub Actions. Use when monitoring CI/CD, checking deploy status, debugging
  failed workflows, or when the user asks to inspect GitHub Actions, workflow
  runs, or deploy/CI status.
---

# gh cli – Monitoreo de workflows (GitHub Actions)

Usar `gh` (GitHub CLI) para consultar workflows y runs sin salir del terminal. Requiere `gh auth status` OK en el repo.

## Flujo rápido

1. **Listar workflows** del repo actual:
   ```bash
   gh workflow list
   ```
   Muestra nombre, ID, estado (active/disabled) y fichero.

2. **Listar runs** (últimos por defecto):
   ```bash
   gh run list [--workflow=<id|nombre>] [--limit=20] [--status=failure|success|in_progress]
   ```
   Ejemplo solo fallidos: `gh run list --status=failure --limit=10`.

3. **Detalle de un run** (status, jobs, conclusión, branch, commit):
   ```bash
   gh run view [<run-id>] [--log] [--log-failed]
   ```
   Sin `<run-id>` usa el último run. `--log` descarga todos los logs; `--log-failed` solo de jobs fallidos.

4. **Logs de un job concreto** (útil cuando hay varios jobs):
   ```bash
   gh run view <run-id> --job <job-id> --log
   ```
   El `<job-id>` aparece en `gh run view <run-id>` en la tabla de jobs.

## Comandos por objetivo

| Objetivo | Comando |
|----------|--------|
| Ver últimos 5 runs | `gh run list --limit=5` |
| Ver solo fallidos | `gh run list --status=failure` |
| Ver runs de un workflow | `gh run list --workflow=deploy-backend.yml` o `--workflow=<workflow-id>` |
| Ver resumen del último run | `gh run view` |
| Ver resumen de un run | `gh run view <run-id>` |
| Descargar logs (todos) | `gh run view <run-id> --log` |
| Descargar solo logs fallidos | `gh run view <run-id> --log-failed` |
| Logs de un job | `gh run view <run-id> --job <job-id> --log` |
| Listar workflows | `gh workflow list` |
| Ver workflow por nombre | `gh workflow view "Deploy Backend"` o por fichero |

## IDs necesarios

- **run-id**: número que sale en `gh run list` (columna izquierda).
- **workflow id**: nombre del fichero (ej. `deploy-backend.yml`) o el ID numérico de `gh workflow list`.
- **job-id**: numérico; se ve en la salida de `gh run view <run-id>` en la tabla de jobs.

## Buenas prácticas

- Empezar por `gh run list --limit=10` para ubicar el run; luego `gh run view <run-id>` para diagnóstico.
- Para errores: `gh run view <run-id> --log-failed` evita descargar logs de jobs que pasaron.
- Si el usuario pregunta "qué pasó con el deploy" o "por qué falló el CI", usar este flujo antes de proponer cambios en código.
- En repos con varios workflows, filtrar con `--workflow=` para no mezclar runs de frontend/backend/otros.

## Ejemplo de sesión típica

```bash
gh run list --limit=5
gh run view 123456789 --log-failed
```

Si hace falta el job concreto:

```bash
gh run view 123456789
# Anotar job-id del job fallido
gh run view 123456789 --job 456789012 --log
```
