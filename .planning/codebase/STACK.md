# Technology Stack

**Analysis Date:** 2026-03-09

## Languages

**Primary:**
- TypeScript ~5.9.3 - Frontend (Vite/React SPA)
- TypeScript ^5.7.0 - Backend (NestJS API)

**Secondary:**
- JavaScript (ESM) - Infrastructure Lambda scripts (`infra/synthetic-generator/index.mjs`, `infra/backfill-gap/index.mjs`, `infra/reimport-readings/index.mjs`)
- SQL - Database migrations (`sql/001_schema.sql` through `sql/006_alerts.sql`)
- Python - Data profiling script (`scripts/perfil_datos.py`)

## Runtime

**Environment:**
- Node.js 20 (pinned in `backend/serverless.yml` as `nodejs20.x` and `.github/workflows/deploy.yml` as `NODE_VERSION: '20'`)

**Package Manager:**
- npm
- Lockfiles: present for both `frontend/package-lock.json` and `backend/package-lock.json`

## Frameworks

**Core:**
- React 19.2.0 - Frontend SPA (`frontend/package.json`)
- NestJS 11.0.0 - Backend API (`backend/package.json`) with modules: Auth, Roles, Users, Buildings, Meters, Hierarchy, Alerts (`backend/src/app.module.ts`)
- Vite 7.3.1 - Frontend build/dev server (`frontend/vite.config.ts`)

**Testing:**
- Jest 29.7.0 - Backend unit testing (`backend/package.json`)
- ts-jest 29.2.0 - TypeScript Jest transform

**Build/Dev:**
- Serverless Framework v3 (`serverless: ^3.40.0`) - Lambda deployment (`backend/serverless.yml`)
- serverless-offline 13.9.0 - Local Lambda emulation
- @vitejs/plugin-react 5.1.1 - Vite React plugin
- @nestjs/cli 11.0.0 - NestJS CLI for build/scaffolding

## Key Dependencies

**Critical (Frontend):**
- `highcharts` 12.5.0 + `highcharts-react-official` 3.2.3 - Interactive stock charts with navigator/range selector (`frontend/src/components/ui/StockChart.tsx`)
- `@tanstack/react-query` 5.90.21 - Server state management, data fetching with caching
- `@tanstack/react-table` 8.21.3 - Headless table with sorting/filtering
- `zustand` 5.0.11 - Client-side state (auth store at `frontend/src/store/useAuthStore.ts`)
- `react-router` 7.13.0 - SPA routing
- `axios` 1.13.5 - HTTP client with interceptors (`frontend/src/services/api.ts`)
- `@azure/msal-browser` 5.4.0 + `@azure/msal-react` 5.0.6 - Microsoft OAuth redirect flow
- `@react-oauth/google` 0.13.4 - Google One Tap / OAuth

**Critical (Backend):**
- `typeorm` 0.3.20 + `@nestjs/typeorm` 11.0.0 - PostgreSQL ORM with auto-loaded entities
- `pg` 8.13.1 - PostgreSQL driver
- `jose` 4.15.9 - JWT verification via JWKS (Microsoft + Google)
- `@vendia/serverless-express` 4.12.6 - Express adapter for AWS Lambda (`backend/src/serverless.ts`)
- `class-validator` 0.14.1 + `class-transformer` 0.5.1 - DTO validation (global ValidationPipe with whitelist + transform)
- `@nestjs/swagger` 11.2.6 - OpenAPI docs at `/api/docs` (`backend/src/swagger.ts`)
- `@nestjs/config` 4.0.0 - Environment configuration (global ConfigModule)

**Infrastructure:**
- `tailwindcss` 4.1.18 + `@tailwindcss/vite` 4.1.18 - Utility-first CSS (v4, Vite plugin)
- `@fontsource-variable/inter` 5.2.8 - Self-hosted Inter font

## Configuration

**TypeScript (Frontend):** `frontend/tsconfig.app.json`
- Target: ES2022, JSX: react-jsx
- Strict mode with noUnusedLocals, noUnusedParameters
- Bundler module resolution (Vite)

**TypeScript (Backend):** `backend/tsconfig.json`
- Target: ES2022, Module: CommonJS
- Decorators enabled (emitDecoratorMetadata, experimentalDecorators)
- Strict mode, output to `./dist`

**Linting:**
- Frontend: ESLint 9 flat config (`frontend/eslint.config.js`) with react-hooks and react-refresh plugins
- Backend: ESLint via `npm run lint` targeting `{src,test}/**/*.ts`

**Environment:**
- Frontend: `.env` file present (VITE_* prefixed vars for auth client IDs)
- Backend: `.env` file present (DB connection, OAuth client IDs)
- CI/CD injects secrets via GitHub Actions secrets/vars

**Build:**
- Frontend: `tsc -b && vite build` -> `frontend/dist/`
- Backend: `nest build` -> `backend/dist/`

**Dev Proxy:**
- Vite proxies `/api` to AWS API Gateway (`https://626lq125eh.execute-api.us-east-1.amazonaws.com`) in dev mode (`frontend/vite.config.ts`)

## Platform Requirements

**Development:**
- Node.js 20
- npm
- PostgreSQL 16 (local or remote RDS)
- Backend `.env` with DB credentials and OAuth client IDs

**Production:**
- AWS Lambda (Node.js 20.x runtime)
- AWS RDS PostgreSQL (VPC, SSL)
- AWS S3 + CloudFront (frontend static hosting)
- AWS EventBridge (scheduled Lambda triggers)
- AWS API Gateway HTTP API

---

*Stack analysis: 2026-03-09*
