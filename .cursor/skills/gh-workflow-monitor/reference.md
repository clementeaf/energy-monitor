# gh workflow – Referencia adicional

## Re-ejecutar y cancelar

- Re-ejecutar un run fallido: `gh run rerun <run-id> [--failed]`
- Cancelar un run en curso: `gh run cancel <run-id>`
- Ejecutar un workflow manualmente: `gh workflow run <workflow-id> [--ref <branch>]`

## Salida JSON

Para scripting o parseo:

- `gh run list --json databaseId,status,conclusion,displayTitle,workflowName,createdAt`
- `gh run view <run-id> --json jobs,databaseId,status,conclusion`

## Otros

- Ver runs de una rama: `gh run list --branch=main`
- Ver runs de un commit: `gh run list --commit=<sha>`
- Ayuda: `gh run list --help`, `gh run view --help`, `gh workflow list --help`
