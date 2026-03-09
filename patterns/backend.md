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

## Database Schema (SQL migrations)

```
sql/001_schema.sql          → users, roles, role_permissions
sql/002_seed.sql            → seed roles, modules, actions
sql/003_buildings_locals.sql → buildings, locals
sql/004_meters_readings.sql → meters, readings, seed 15 meters
sql/005_hierarchy_nodes.sql → hierarchy tree (adjacency list)
sql/006_alerts.sql          → alerts
```

Hierarchy: adjacency list con `parent_id`, leaf nodes con `meter_id`.
Readings: `meter_id + timestamp` composite, 13 campos eléctricos.
