# Architecture Overview

## Frontend

**Tech:** React 19 + TypeScript + Vite + Tailwind CSS v4

**Módulos principales:**
- **Routing:** React Router v7 (lazy loading, rutas protegidas por rol)
- **Estado servidor:** TanStack Query v5 (cache, refetch automático)
- **Estado cliente:** Zustand (auth, modo usuario, operador/edificio seleccionado)
- **Tablas:** TanStack Table v8
- **Gráficos:** Highcharts Stock 12 (series temporales con zoom)
- **Auth:** MSAL v5 (Microsoft) + @react-oauth/google

**Patrón por feature:**
```
features/<domain>/
  ├── <Domain>Page.tsx
  ├── components/
  ├── services/routes.ts → endpoints.ts
  └── hooks/queries/use<Entity>.ts
```

---

## Backend

**Tech:** NestJS 11 + TypeORM 0.3 + PostgreSQL 16

**Módulos:** buildings, meters, meter-monthly, meter-readings, billing, stores, raw-readings, alerts, auth, users

**Patrón por módulo:**
```
entity → service (raw SQL) → controller → module
```

**Auth:** JWT validado contra JWKS de Microsoft/Google. Guard global + `@RequirePermissions(module, action)` + RBAC por rol.

---

## Infraestructura AWS

```
CloudFront (ECR03RA6F872Q)
├── globepower-platform.com / energymonitor.click
├── /*           → S3 "energy-monitor-hoktus-mvp" (frontend SPA)
├── /landing/*   → S3 "globe-landing-hoktus" (landing page)
└── /api/*       → API Gateway → Lambda "power-digital-api-dev-api" (NestJS)
                                   └── RDS PostgreSQL (VPC, db.t3.micro)

EventBridge cada 15min → Lambda "synthetic-readings-generator"
EventBridge cada 5min  → Lambda "offlineAlerts"
Lambda standalone      → "billing-pdf-generator" (Python)
Lambda standalone      → "dbVerify" (migraciones SQL)
```

**DB:** RDS PostgreSQL 16, 875 medidores, 30.7M lecturas, 5 edificios. Solo accesible dentro de VPC.

**DNS:** Route53 → CloudFront. Certificado ACM cubre ambos dominios.

**CI/CD:** GitHub Actions en push a `main` → build + deploy frontend (S3) y backend (Serverless Framework). Globe Landing y billing-pdf-generator son deploy manual.
