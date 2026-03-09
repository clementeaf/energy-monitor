# Backend Patterns

## NestJS Module Pattern (4-file)

```
<domain>/
  <entity>.entity.ts      ← TypeORM entity, @ApiProperty decorators
  <domain>.service.ts      ← @Injectable(), business logic, raw SQL
  <domain>.controller.ts   ← HTTP handlers, Swagger decorators, manual token extraction
  <domain>.module.ts       ← TypeOrmModule.forFeature([Entity]), exports service
```

Registrar en `app.module.ts` imports array.

## TypeORM Configuration

```typescript
// app.module.ts
TypeOrmModule.forRoot({
  type: 'postgres',
  autoLoadEntities: true,   // no explicit entity array
  synchronize: false,        // schema via SQL migrations
  ssl: { rejectUnauthorized: false },  // TODO: usar RDS CA cert
})
```

Entities: definite assignment assertion (`id!: string`).
Raw SQL: `this.readingRepo.query(sql, [param1, param2])` para CTEs y agregaciones.

## Raw SQL Patterns

### Aggregation con date_trunc
```sql
SELECT date_trunc($1, r.timestamp) AS bucket,
       AVG(r.power_kw) AS avg_power_kw
FROM readings r
WHERE r.meter_id = $2 AND r.timestamp BETWEEN $3 AND $4
GROUP BY bucket ORDER BY bucket
```

### CTE Recursivo (hierarchy)
```sql
WITH RECURSIVE subtree AS (
  SELECT id FROM hierarchy_nodes WHERE id = $1
  UNION ALL
  SELECT hn.id FROM hierarchy_nodes hn
  JOIN subtree s ON hn.parent_id = s.id
)
SELECT SUM(r.energy_kwh) FROM readings r
JOIN hierarchy_nodes hn ON hn.meter_id = r.meter_id
WHERE hn.id IN (SELECT id FROM subtree)
```

### Manual camelCase mapping
```typescript
rows.map((r: Record<string, unknown>) => ({
  buildingId: r.buildingId,
  voltageL1: r.voltageL1 != null ? Number(r.voltageL1) : null,
}));
```

## Auth Pattern (sin guards)

```typescript
// En cada controller que necesita auth (solo AuthController actualmente):
@Get('me')
async getMe(@Req() req: Request) {
  const token = this.extractToken(req);        // manual
  const payload = await this.authService.verifyToken(token);  // jose JWKS
  // ...
}
```

**NO hay `@UseGuards(AuthGuard)`.** Data endpoints son públicos.

Token verification:
1. `detectProvider(token)` → iss claim → 'microsoft' | 'google'
2. `jwtVerify(token, jwksUri)` con RS256
3. `resolveUser()` → upsert user, load permissions

## Validation

```typescript
// Global pipe en serverless.ts
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

// DTOs con class-validator (uso ligero)
@IsString() @IsNotEmpty() email: string;
```

## Swagger

```typescript
// Cada controller method:
@ApiOperation({ summary: 'Descripción en español' })
@ApiOkResponse({ type: MeterResponseDto })
@ApiParam({ name: 'id', description: 'ID del medidor' })
@ApiQuery({ name: 'from', required: false })
```

Entities con `@ApiProperty({ example: '...' })`.
Setup en `backend/src/swagger.ts`, UI en `/api/docs`.

## Scheduled Lambda Pattern

### API Lambda (cached bootstrap)
```typescript
// serverless.ts
let cachedApp: INestApplication;
export async function handler(event, context) {
  if (!cachedApp) cachedApp = await bootstrap();
  return serverlessExpress({ app: cachedApp })(event, context);
}
```

### Offline Alerts Lambda (NO cached — tech debt)
```typescript
// offline-alerts.ts — cold start cada invocación
export async function handler() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const alertsService = app.get(AlertsService);
  await alertsService.scanOfflineMeters();
  await app.close();
}
```

## Logging

```typescript
private readonly logger = new Logger(ClassName.name);
this.logger.warn('Token verification failed', error);
this.logger.log(`Synced: ${created} created, ${resolved} resolved`);
```

## Error Handling

- `throw new NotFoundException('Medidor no encontrado')`
- `throw new UnauthorizedException('Token inválido')`
- Service methods return `null` para not-found → controller lanza excepción
- Auth `verifyToken()` retorna `null` on failure (no throw)
- NestJS built-in exception filters manejan el resto como 500

## Key Service Methods (meters.service.ts)

| Method | SQL Type | Params | Returns |
|---|---|---|---|
| `findAll()` | QueryBuilder | — | Meter[] con live status |
| `findOne(id)` | QueryBuilder | id | Meter \| null |
| `findReadings(id, res, from, to)` | Raw SQL | parametrized | Reading[] aggregated |
| `getUptimeSummary(id)` | Raw SQL | template literal (controlled) | { period, pct }[] |
| `getOverview()` | Raw SQL LATERAL | — | MeterOverview[] |
| `findBuildingConsumption()` | Raw SQL | **string interpolation (SQL injection)** | ConsumptionBucket[] |
| `findAlarmEvents()` | Raw SQL | parametrized | AlarmEvent[] |

## API Endpoints (completo)

### Auth (`/auth`) — requiere Bearer token
| Method | Path | Query Params | Response | Service |
|---|---|---|---|---|
| GET | `/auth/me` | — | `{ user, permissions }` | `verifyToken()` → `resolveUser()` |
| GET | `/auth/permissions` | — | `{ role, permissions }` | `verifyToken()` → `resolvePermissions()` |

### Buildings (`/buildings`) — sin auth
| Method | Path | Query Params | Response | Service |
|---|---|---|---|---|
| GET | `/buildings` | — | `BuildingSummaryDto[]` | `findAll()` |
| GET | `/buildings/:id` | — | `BuildingSummaryDto` | `findOne()` |
| GET | `/buildings/:id/meters` | — | `Meter[]` | `findMeters()` |
| GET | `/buildings/:id/consumption` | `resolution?`, `from?`, `to?` | `ConsumptionPointDto[]` | `findConsumption()` |

### Meters (`/meters`) — sin auth
| Method | Path | Query Params | Response | Service |
|---|---|---|---|---|
| GET | `/meters/overview` | — | `MeterOverview[]` | `getOverview()` |
| GET | `/meters/:id` | — | `Meter` | `findOne()` |
| GET | `/meters/:id/readings` | `resolution?`, `from?`, `to?` | `Reading[]` | `findReadings()` |
| GET | `/meters/:id/uptime` | `period?` (daily/weekly/monthly/all) | `UptimeSummary[]` | `getUptimeAll()` / `getUptimeSummary()` |
| GET | `/meters/:id/downtime-events` | `from`, `to` | `DowntimeEvent[]` | `getDowntimeEvents()` |
| GET | `/meters/:id/alarm-events` | `from`, `to` | `AlarmEvent[]` | `getAlarmEvents()` |
| GET | `/meters/:id/alarm-summary` | `from`, `to` | `AlarmSummary` | `getAlarmSummary()` |

### Hierarchy (`/hierarchy`) — sin auth
| Method | Path | Query Params | Response | Service |
|---|---|---|---|---|
| GET | `/hierarchy/:buildingId` | — | `HierarchyNode[]` (tree) | `findTree()` |
| GET | `/hierarchy/node/:nodeId` | — | `{ node, path }` | `findNode()` |
| GET | `/hierarchy/node/:nodeId/children` | `from?`, `to?` | `HierarchyChildSummary[]` | `findChildrenWithConsumption()` |
| GET | `/hierarchy/node/:nodeId/consumption` | `resolution?`, `from?`, `to?` | time-series | `findNodeConsumption()` |

### Alerts (`/alerts`) — sin auth
| Method | Path | Query Params | Response | Service |
|---|---|---|---|---|
| GET | `/alerts` | `status?`, `type?`, `meterId?`, `buildingId?`, `limit?` | `Alert[]` | `findAll()` |
| POST | `/alerts/sync-offline` | — | `AlertsSyncSummary` | `scanOfflineMeters()` |
| PATCH | `/alerts/:id/acknowledge` | — | `Alert` | `acknowledge()` |

Resolutions válidas: `raw`, `15min`, `hourly`, `daily`. Fechas en ISO 8601.

## Database Schema (completo)

### Tablas

**roles**
| Column | Type | Notes |
|---|---|---|
| id | smallint PK | |
| name | varchar(30) | unique |
| label_es | varchar(50) | |
| is_active | boolean | default true |
| created_at | timestamptz | default now() |

**modules** — id: smallint PK, code: varchar(40) unique, label: varchar(60)

**actions** — id: smallint PK, code: varchar(20) unique

**role_permissions** — PK compuesto (role_id, module_id, action_id). FK role_id → roles.

**users**
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | auto-generated |
| external_id | varchar(255) | OAuth provider ID |
| provider | varchar(20) | 'microsoft' \| 'google' |
| email | varchar(255) | |
| name | varchar(255) | |
| avatar_url | text | nullable |
| role_id | smallint FK → roles | default 4 |
| is_active | boolean | default true |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**user_sites** — PK (user_id, site_id). FK user_id → users CASCADE.

**buildings**
| Column | Type | Notes |
|---|---|---|
| id | varchar(50) PK | e.g. 'pac4220' |
| name | varchar(200) | |
| address | varchar(300) | |
| total_area | numeric(10,2) | |

**meters**
| Column | Type | Notes |
|---|---|---|
| id | varchar(10) PK | e.g. 'M001' |
| building_id | varchar(50) FK → buildings | |
| model | varchar(20) | 'PAC1670' \| 'PAC1651' |
| phase_type | varchar(5) | '1P' \| '3P' |
| bus_id | varchar(30) | |
| modbus_address | smallint | |
| uplink_route | varchar(100) | |
| status | varchar(10) | default 'online' |
| last_reading_at | timestamptz | nullable |

**readings**
| Column | Type | Notes |
|---|---|---|
| id | integer PK | auto-increment |
| meter_id | varchar(10) FK → meters | |
| timestamp | timestamptz | |
| voltage_l1/l2/l3 | numeric(7,2) | nullable (l2/l3 null para 1P) |
| current_l1/l2/l3 | numeric(8,3) | nullable |
| power_kw | numeric(10,3) | NOT NULL |
| reactive_power_kvar | numeric(10,3) | nullable |
| power_factor | numeric(5,3) | nullable |
| frequency_hz | numeric(6,3) | nullable |
| energy_kwh_total | numeric(14,3) | NOT NULL, acumulativo |
| thd_voltage_pct | numeric(5,2) | nullable |
| thd_current_pct | numeric(5,2) | nullable |
| phase_imbalance_pct | numeric(5,2) | nullable |
| breaker_status | varchar(10) | nullable |
| digital_input_1/2 | smallint | nullable |
| digital_output_1/2 | smallint | nullable |
| alarm | varchar(50) | nullable |
| modbus_crc_errors | integer | nullable |

**hierarchy_nodes**
| Column | Type | Notes |
|---|---|---|
| id | varchar(20) PK | e.g. 'TG-PAC4220' |
| parent_id | varchar(20) FK → self | nullable (root = null) |
| building_id | varchar(50) | |
| name | varchar(100) | |
| level | smallint | 1=Building, 2=Panel, 3=Subpanel, 4=Circuit |
| node_type | varchar(20) | 'building' \| 'panel' \| 'subpanel' \| 'circuit' |
| meter_id | varchar(10) FK → meters | nullable (solo leaf nodes) |
| sort_order | smallint | default 0 |

**alerts**
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | auto-generated |
| type | varchar(50) | e.g. 'METER_OFFLINE' |
| severity | varchar(20) | default 'high' |
| status | varchar(20) | 'active' \| 'acknowledged' \| 'resolved' |
| meter_id | varchar(10) FK → meters | nullable |
| building_id | varchar(50) | nullable |
| title | varchar(200) | |
| message | text | |
| triggered_at | timestamptz | default now() |
| acknowledged_at | timestamptz | nullable |
| resolved_at | timestamptz | nullable |
| metadata | jsonb | default '{}' |

### Relaciones
```
roles 1──N users
roles 1──N role_permissions
users 1──N user_sites
buildings 1──N meters
meters 1──N readings
meters 1──N alerts (nullable)
hierarchy_nodes N──1 hierarchy_nodes (parent)
hierarchy_nodes N──1 meters (nullable, leaf only)
```

### SQL Migrations
```
sql/001_schema.sql          → users, roles, role_permissions, modules, actions
sql/002_seed.sql            → seed 7 roles, 10 modules, 3 actions
sql/003_buildings_locals.sql → buildings, locals
sql/004_meters_readings.sql → meters, readings, seed 15 meters
sql/005_hierarchy_nodes.sql → hierarchy tree (adjacency list)
sql/006_alerts.sql          → alerts
```
