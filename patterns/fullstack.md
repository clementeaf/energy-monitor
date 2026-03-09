# Fullstack Patterns

## Data Flow: Endpoint completo

```
1. Frontend: routes.ts      → meterReadings(id, { resolution, from, to })
2. Frontend: endpoints.ts   → fetchMeterReadings(id, params) → api.get<Reading[]>(url)
3. Frontend: useMeters.ts   → useMeterReadings(id, res, from, to) → useQuery(...)
4. Network:  Axios Bearer   → CloudFront /api/* → API Gateway → Lambda
5. Backend:  controller.ts  → @Get(':id/readings') findReadings(@Param, @Query)
6. Backend:  service.ts     → raw SQL date_trunc + AVG/MAX aggregation
7. Backend:  PostgreSQL     → readings table scan + aggregation
8. Return:   JSON array     → TanStack Query cache → React render → Highcharts
```

## Agregar nueva feature (checklist)

### Backend
1. `sql/00N_<name>.sql` — migration
2. `backend/src/<domain>/<entity>.entity.ts` — TypeORM entity + @ApiProperty
3. `backend/src/<domain>/<domain>.service.ts` — business logic
4. `backend/src/<domain>/<domain>.controller.ts` — REST + Swagger decorators
5. `backend/src/<domain>/<domain>.module.ts` — TypeOrmModule.forFeature + exports
6. `backend/src/app.module.ts` — register module

### Frontend
1. `frontend/src/types/index.ts` — interfaces
2. `frontend/src/services/routes.ts` — URL builder
3. `frontend/src/services/endpoints.ts` — fetch function
4. `frontend/src/hooks/queries/use<Entity>.ts` — TanStack Query hook
5. `frontend/src/hooks/index.ts` — re-export
6. `frontend/src/features/<feature>/<Name>Page.tsx` — page component
7. `frontend/src/features/<feature>/components/` — supporting components
8. `frontend/src/app/appRoutes.ts` — route + RBAC
9. `frontend/src/app/router.tsx` — lazy import + route entry

## Auth: flujo completo

```
Frontend                              Backend
─────────                             ───────
Microsoft MSAL redirect
  OR Google credential
  → JWT id_token
  → sessionStorage['access_token']
  → Axios interceptor: Bearer token →  AuthController.getMe()
                                        → extractToken(req)
                                        → verifyToken(token)
                                          → detectProvider(iss)
                                          → jose.jwtVerify(jwks)
                                        → resolveUser()
                                          → users.upsert()
                                          → roles.getPermissions()
                                      ← { user, permissions }
  → Zustand useAuthStore.setUser()
  → ProtectedRoute checks roles
```

## Resolución dinámica (charts)

```
StockChart afterSetExtremes callback
  → pickResolution(rangeMs)
    ≤36h  → '15min'    → date_trunc + floor(extract(minute)/15)*15
    ≤7d   → 'hourly'   → date_trunc('hour')
    >7d   → 'daily'    → date_trunc('day')
  → Parent state update → re-fetch con nueva resolución
  → keepPreviousData para evitar flash
```

## Tipo mapping: DB ↔ Backend ↔ Frontend

```
DB (snake_case)         Backend (entity/raw SQL)     Frontend (types/index.ts)
───────────────         ────────────────────────     ─────────────────────────
roles                   Role                         (via auth.ts Role type)
users                   User                         AuthUser
buildings               Building                     Building
meters                  Meter                        Meter
readings                Reading                      Reading
hierarchy_nodes         HierarchyNode                HierarchyNode
alerts                  Alert                        Alert
role_permissions        RolePermission               (permissions map)
user_sites              UserSite                     (siteIds array)
```

Column mapping: TypeORM `@Column({ name: 'snake_case' })`. Raw SQL → manual `Record<string, unknown>` → typed object con `Number()`.

## Endpoints disponibles (referencia rápida)

### Sin auth (públicos)
```
GET  /buildings                              → Building[]
GET  /buildings/:id                          → Building
GET  /buildings/:id/meters                   → Meter[]
GET  /buildings/:id/consumption?res&from&to  → ConsumptionPoint[]
GET  /meters/overview                        → MeterOverview[]
GET  /meters/:id                             → Meter
GET  /meters/:id/readings?res&from&to        → Reading[]
GET  /meters/:id/uptime?period               → UptimeSummary[] | UptimeAll
GET  /meters/:id/downtime-events?from&to     → DowntimeEvent[]
GET  /meters/:id/alarm-events?from&to        → AlarmEvent[]
GET  /meters/:id/alarm-summary?from&to       → AlarmSummary
GET  /hierarchy/:buildingId                  → HierarchyNode[] (tree)
GET  /hierarchy/node/:nodeId                 → { node, path }
GET  /hierarchy/node/:nodeId/children?from&to → HierarchyChildSummary[]
GET  /hierarchy/node/:nodeId/consumption?res&from&to → time-series
GET  /alerts?status&type&meterId&buildingId&limit → Alert[]
POST /alerts/sync-offline                    → AlertsSyncSummary
PATCH /alerts/:id/acknowledge                → Alert
```

### Con auth (Bearer token)
```
GET  /auth/me                                → { user, permissions }
GET  /auth/permissions                       → { role, permissions }
```

## Caching Strategy

```
Layer          Tool              TTL
─────          ────              ───
Browser        —                 —
Frontend       TanStack Query    Infinity (static) / 30s (live) / 0+keepPrevious (charts)
Backend        Ninguno           — (TODO: CacheModule o node-cache)
Database       —                 —
CDN            CloudFront        Default (static assets)
```

## Error Propagation

```
DB error → TypeORM/pg exception
  → Service: propagates (no catch) OR returns null
    → Controller: throws NotFoundException / NestJS 500
      → Lambda: serverless-express → API Gateway → JSON error
        → Axios: 401 → clear auth | 4xx/5xx → TanStack Query error state
          → React: ErrorBoundary catch | query.error display
```

## Seguridad: boundaries actuales

```
✅ CORS: energymonitor.click + localhost:5173 (solo browsers)
✅ JWT verification: JWKS RS256 (Microsoft + Google)
✅ ValidationPipe: whitelist + transform (DTOs)
✅ VPC: Lambda → RDS en security group
❌ Auth guards en data endpoints (público)
❌ RBAC enforcement backend
❌ Rate limiting aplicación
❌ Security headers (Helmet)
❌ SSL cert verification DB
❌ httpOnly cookies (token en sessionStorage)
```
