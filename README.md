# Energy Monitor

Plataforma de monitoreo energético en tiempo real para edificios comerciales.

## Uso del Repo

### Contexto mínimo
- Base: `Read CLAUDE.md`
- Con tarea: `Read CLAUDE.md. Hoy voy a [tarea].`
- Con objetivo: `Read CLAUDE.md. Hoy voy a [tarea]. Debe quedar logrado [resultado].`

`CLAUDE.md` es la fuente única de contexto operativo.

### Jerarquía documental
- `CLAUDE.md`: contexto base para trabajar rápido y con baja ambigüedad.
- `patterns/`: anexos cortos de ejecución para tareas concretas de frontend, backend, fullstack, data flow y AWS.
- `patterns/playbooks/`: recetas ultracortas para tareas repetidas.
- `docs/POWER_Digital_Especificacion_Modulos-rev2.1.xlsx`: especificación funcional objetivo del producto.
- `PLAN_ACCION.md`: roadmap y prioridades, no contexto operativo.

## Stack
- Frontend: React 19, Vite 7, TypeScript 5.9, Tailwind CSS v4, Highcharts Stock, TanStack Query, Zustand.
- Backend: NestJS 11, TypeORM 0.3, PostgreSQL 16, Swagger, Serverless Express.
- Infra: AWS Lambda, API Gateway HTTP, RDS PostgreSQL, S3, CloudFront, EventBridge.

## Desarrollo Local

### Frontend
```bash
cd frontend
npm ci
npm run dev
```

### Backend
```bash
cd backend
npm ci
npm run start:dev
```

### Serverless local
```bash
cd backend
npx sls offline
```

## Estructura útil
```text
frontend/   → React app
backend/    → NestJS API + Lambdas
infra/      → scripts/lambdas standalone
sql/        → schema y migraciones manuales
patterns/   → recetas de ejecución
docs/       → runbooks y fixes
```

## Flujos de trabajo rápidos

### Crear feature frontend
1. Leer `CLAUDE.md`.
2. Si hace falta receta concreta, leer `patterns/frontend.md`.
3. Si la tarea es muy puntual, usar `patterns/playbooks/new-component.md` o `patterns/playbooks/new-chart.md`.
4. Seguir secuencia: `types` → `routes` → `endpoints` → `hooks` → `feature` → `route`.

### Crear endpoint backend
1. Leer `CLAUDE.md`.
2. Si hace falta receta concreta, leer `patterns/backend.md`.
3. Si la tarea es puntual, usar `patterns/playbooks/new-endpoint.md`.
4. Seguir secuencia: migration → entity → service → controller → module → register.

### Crear feature end-to-end
1. Leer `CLAUDE.md`.
2. Leer `patterns/fullstack.md`.
3. Si es un flujo nuevo, usar `patterns/playbooks/new-fullstack-flow.md`.
4. Ejecutar checklist completa de backend + frontend + validación.

### Tocar AWS o Lambdas
1. Leer `CLAUDE.md`.
2. Leer `patterns/devops.md` y `docs/aws-runbook.md`.
3. Si agregas scheduler o lambda nueva, usar `patterns/playbooks/new-scheduled-lambda.md`.
4. Aplicar cambios en env vars, serverless y deploy.

### Entender alcance funcional objetivo
1. Leer `CLAUDE.md`.
2. Si falta contexto de producto, usar `patterns/playbooks/use-excel-spec.md`.
3. Leer solo las hojas necesarias del XLSX canónico.

## Deploy
- Usar `docs/aws-runbook.md`.
- No usar runbooks antiguos ajenos al flujo AWS actual.

## Regla práctica
Si cambias un patrón real del sistema, actualiza `CLAUDE.md` en la misma tarea.
