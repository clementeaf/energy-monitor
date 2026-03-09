# Codebase Concerns

**Analysis Date:** 2026-03-09

## Tech Debt

**No Authentication on API Endpoints (except /auth):**
- Issue: All data endpoints (`/meters/*`, `/buildings/*`, `/hierarchy/*`, `/alerts/*`) have no auth guards. Any request to the API Gateway can read all meter data without a Bearer token. The auth flow exists only for `/auth/me` and `/auth/permissions` where the controller manually extracts and verifies tokens.
- Files: `backend/src/meters/meters.controller.ts`, `backend/src/buildings/buildings.controller.ts`, `backend/src/hierarchy/hierarchy.controller.ts`, `backend/src/alerts/alerts.controller.ts`
- Impact: All energy data is publicly accessible to anyone who knows the API URL. RBAC permissions (7 roles, 10 modules, 3 actions) are fetched but never enforced server-side.
- Fix approach: Create a NestJS `AuthGuard` that verifies the Bearer token on every request. Apply it globally or per-controller with `@UseGuards()`. Create a `PermissionsGuard` / `@RequirePermission()` decorator that checks RBAC before allowing access.

**SQL Injection in `findBuildingConsumption`:**
- Issue: `buildingId`, `from`, and `to` parameters are interpolated directly into SQL via string concatenation instead of parameterized queries. The `buildingId` has a minimal `replaceAll("'", "''")` escape, but `from` and `to` have no protection at all.
- Files: `backend/src/meters/meters.service.ts` (lines 277-279)
- Impact: Potential SQL injection if an attacker can control `from`/`to` query parameters (which they can, since the endpoint has no auth guard).
- Fix approach: Refactor to use parameterized queries (`$1`, `$2`, etc.) like the other methods in the same service. Use `this.readingRepo.query(sql, [buildingId, from, to])`.

**SQL Injection in `getUptimeSummary` via Template Literal:**
- Issue: The `interval '${iv}'` is built from a mapped value (so it is controlled), but using string interpolation in SQL is a dangerous pattern that could break if the mapping logic changes.
- Files: `backend/src/meters/meters.service.ts` (lines 130-148)
- Impact: Currently safe because `iv` comes from a fixed map, but fragile — any future modification to `intervalMap` could introduce injection.
- Fix approach: Use parameterized interval: `NOW() - $2::interval` with the interval passed as a parameter.

**Synthetic Generator is a Temporary Workaround:**
- Issue: The synthetic-generator Lambda explicitly marks itself as `TEMPORARY: replace with real MQTT -> Lambda -> RDS pipeline`. All meter data is fabricated using Box-Muller statistical distributions rather than real sensor readings.
- Files: `infra/synthetic-generator/index.mjs` (line 42)
- Impact: The platform shows realistic-looking but entirely synthetic data. No real IoT integration exists. The `UPDATE meters SET last_reading_at = $1, status = 'online'` on line 141-143 updates ALL meters to online on every run, masking any real connectivity issues.
- Fix approach: Implement MQTT/Modbus gateway integration. Until then, this is acceptable for demo/staging but must not be mistaken for production telemetry.

**N+1 Query Pattern in Hierarchy Children:**
- Issue: `findChildrenWithConsumption` executes 3 separate recursive CTE queries per child node (consumption, meter count, status). For a node with N children, this runs 3N+1 queries.
- Files: `backend/src/hierarchy/hierarchy.service.ts` (lines 48-66)
- Impact: With the current 15 meters across 2 buildings, the cost is low. But adding more hierarchy depth or more buildings would cause linear query growth.
- Fix approach: Combine the three subtree queries into a single CTE query that returns consumption, meter count, and status in one pass per child, or batch all children into a single query.

**Offline Alerts Lambda Bootstraps Full NestJS App:**
- Issue: The `offlineAlerts` Lambda handler creates a full NestJS application context on every invocation (`NestFactory.createApplicationContext`). Unlike the API Lambda which caches the bootstrap, this one does a cold start every 5 minutes.
- Files: `backend/src/offline-alerts.ts`
- Impact: Each invocation pays the full NestJS + TypeORM bootstrap cost (~2-5 seconds). This runs 288 times/day.
- Fix approach: Either cache the app context like `serverless.ts` does, or rewrite as a lightweight standalone script (like the synthetic-generator) that uses `pg` directly.

**No Test Suite Exists:**
- Issue: Zero test files in the entire codebase. No unit tests, no integration tests, no e2e tests. No test framework is configured.
- Files: No `*.test.ts`, `*.spec.ts`, `*.test.tsx`, or `*.spec.tsx` files found anywhere.
- Impact: Any refactoring (especially the SQL queries and auth flow) carries high regression risk. The complex aggregation queries in `meters.service.ts` and `hierarchy.service.ts` are untested.
- Fix approach: Add Jest/Vitest for backend unit tests. Priority: test `meters.service.ts` aggregation queries, `auth.service.ts` token verification, `alerts.service.ts` scan logic. Add component tests for frontend with Vitest + Testing Library.

**`common/` Directory is Empty:**
- Issue: `backend/src/common/` exists but contains no files. This suggests planned shared utilities (guards, decorators, pipes) that were never implemented.
- Files: `backend/src/common/` (empty)
- Impact: Cross-cutting concerns (auth guard, validation pipes, logging interceptors) that should live here are missing.
- Fix approach: Populate with `AuthGuard`, `PermissionsGuard`, `LoggingInterceptor`, and shared DTOs/decorators.

## Security Considerations

**No Authentication on Data Endpoints:**
- Risk: All energy telemetry, building info, meter status, and alert data is publicly readable. The RBAC system (roles, permissions, user-site assignments) exists in the database but is never enforced on API requests.
- Files: `backend/src/meters/meters.controller.ts`, `backend/src/buildings/buildings.controller.ts`, `backend/src/hierarchy/hierarchy.controller.ts`, `backend/src/alerts/alerts.controller.ts`
- Current mitigation: API is behind API Gateway with CORS restricted to `energymonitor.click` and `localhost:5173`, but CORS only affects browsers — direct API calls bypass it entirely.
- Recommendations: Implement global `AuthGuard` immediately. Enforce RBAC permissions per endpoint. Add site-scoped access (users can only see buildings in their `siteIds`).

**SSL Certificate Verification Disabled Everywhere:**
- Risk: All database connections use `ssl: { rejectUnauthorized: false }`, which accepts any certificate and is vulnerable to MITM attacks.
- Files: `backend/src/app.module.ts` (line 28), `infra/synthetic-generator/index.mjs` (line 51), `infra/backfill-gap/index.mjs`, `infra/reimport-readings/index.mjs`, `infra/reimport-readings/regen-synthetic.mjs`, `sql/import-readings.mjs`
- Current mitigation: Database is in a VPC with security groups, so the risk is reduced.
- Recommendations: Download the RDS CA certificate and set `ssl: { ca: rdsCA }` instead of disabling verification.

**Token Stored in sessionStorage:**
- Risk: `sessionStorage` is accessible to any JavaScript running on the page. An XSS vulnerability would expose the JWT token.
- Files: `frontend/src/services/api.ts` (line 12), `frontend/src/hooks/auth/useAuth.ts` (lines 21, 83)
- Current mitigation: No user-generated content is rendered as HTML (low XSS surface).
- Recommendations: Consider using httpOnly cookies for token storage, or ensure strong CSP headers are in place.

**No Helmet or Security Headers:**
- Risk: No HTTP security headers (X-Frame-Options, Content-Security-Policy, X-Content-Type-Options, etc.) are set on the backend.
- Files: `backend/src/serverless.ts`, `backend/src/main.ts`
- Current mitigation: CloudFront may add some headers, but the API responses have none.
- Recommendations: Add `@nestjs/helmet` or configure security headers in CloudFront.

**No Rate Limiting:**
- Risk: No rate limiting on any endpoint. The unauthenticated API is vulnerable to abuse or scraping.
- Files: `backend/src/serverless.ts` (no throttle middleware)
- Current mitigation: API Gateway has default AWS throttling limits.
- Recommendations: Add `@nestjs/throttler` for application-level rate limiting, especially on `/auth/me` which performs JWKS verification.

## Performance Bottlenecks

**Overview Query Scans Entire Readings Table:**
- Problem: `getOverview()` runs a single large query with `LATERAL` subqueries that scan the readings table for each meter (alarm counts for 30 days, uptime gaps for 24 hours).
- Files: `backend/src/meters/meters.service.ts` (lines 213-263)
- Cause: No query pagination, no materialized views, no caching. The query joins meters with two subqueries scanning readings for alarm counts and gap analysis.
- Improvement path: Add a database index on `readings(meter_id, timestamp)` if missing. Consider a materialized view or a scheduled summary table for alarm counts and uptime percentages. Add server-side caching (even 60-second TTL would help).

**Recursive CTE Queries Without Caching:**
- Problem: Every hierarchy drill-down request runs recursive CTEs. The hierarchy tree (buildings -> gateways -> meters) is static and rarely changes, but the CTE runs on every request.
- Files: `backend/src/hierarchy/hierarchy.service.ts` (multiple methods)
- Cause: No caching layer exists in the backend.
- Improvement path: Cache hierarchy tree structure in memory (invalidate on schema changes). Only run the readings aggregation dynamically.

**No Query Result Caching:**
- Problem: The backend has no caching layer. Every API request hits the database directly. TanStack Query provides client-side caching, but the Lambda + RDS round-trip happens on every request.
- Files: All service files in `backend/src/`
- Cause: No Redis/ElastiCache integration, no in-memory cache.
- Improvement path: Add a simple in-memory cache (e.g., `node-cache` or NestJS `CacheModule`) for frequently-accessed data like overview, building list, and hierarchy tree.

**Readings Table Growth is Unbounded:**
- Problem: The synthetic generator inserts 15 readings per minute (1 per meter). That is 21,600 readings/day, ~7.9M readings/year. There is no retention policy, partitioning, or archival strategy.
- Files: `infra/synthetic-generator/index.mjs`, `sql/004_meters_readings.sql`
- Cause: No TTL, no partitioning, no cleanup job.
- Improvement path: Add time-based table partitioning on `readings.timestamp`. Create a retention policy (e.g., keep raw data 90 days, roll up to hourly after that). Add a scheduled cleanup Lambda.

## Fragile Areas

**Meters Service — Raw SQL Aggregations:**
- Files: `backend/src/meters/meters.service.ts` (309 lines)
- Why fragile: Contains 7 different raw SQL queries with manual column mapping (`Record<string, unknown>` casts). The `findBuildingConsumption` method uses string interpolation for SQL. Any schema change to the `readings` table requires updating multiple raw queries.
- Safe modification: Always test SQL changes against real data. Verify column aliases match the manual mapping objects.
- Test coverage: None.

**Auth Flow — Dual Provider Token Resolution:**
- Files: `frontend/src/hooks/auth/useAuth.ts`, `frontend/src/hooks/auth/useMicrosoftAuth.ts`, `frontend/src/hooks/auth/useGoogleAuth.ts`, `frontend/src/store/useAuthStore.ts`
- Why fragile: The Microsoft redirect flow uses a `useEffect` with a ref guard (`resolving.current`) to avoid double-resolution. Race conditions between MSAL's redirect callback and React's render cycle have caused bugs before (see ISSUES_&_FIXES.md). The `eslint-disable-next-line react-hooks/exhaustive-deps` on line 58 suppresses a legitimate dependency warning.
- Safe modification: Test both Microsoft and Google login flows after any change. Verify redirect flow with page refresh.
- Test coverage: None.

**Highcharts StockChart Integration:**
- Files: `frontend/src/components/ui/StockChart.tsx`, `frontend/src/features/meters/MeterDetailPage.tsx`
- Why fragile: Multiple Highcharts-specific bugs have been encountered and patched (see ISSUES_&_FIXES.md: hoverPoint crash, zoom blocking, rangeSelector reset). The component wraps `HighchartsReact` with custom range-change callbacks that drive resolution changes via parent state.
- Safe modification: Wrap chart interactions in try-catch. Test zoom/pan interactions manually after changes.
- Test coverage: None.

## Scaling Limits

**Lambda Memory/Timeout:**
- Current capacity: 256 MB memory, 10s timeout for API, 30s for offlineAlerts.
- Limit: Complex aggregation queries on growing readings table may exceed 10s timeout as data grows.
- Scaling path: Increase timeout for read-heavy endpoints. Consider provisioned concurrency to avoid cold starts. Add pagination to readings queries.

**Single RDS Instance:**
- Current capacity: Single PostgreSQL 16 instance in VPC.
- Limit: All Lambdas (API, synthetic-generator, offlineAlerts) share the same connection pool. Lambda concurrency spikes could exhaust RDS connections.
- Scaling path: Add RDS Proxy for connection pooling. Consider read replicas for read-heavy aggregation queries.

## Dependencies at Risk

**Serverless Framework v3:**
- Risk: Serverless Framework v3 is nearing end of life. v4 introduced a licensing change (paid for commercial use).
- Impact: Security patches and compatibility updates may stop.
- Migration plan: Evaluate migration to AWS SAM, AWS CDK, or SST as alternatives.

**@vendia/serverless-express:**
- Risk: The `@vendia/serverless-express` package has had irregular maintenance cycles.
- Impact: Compatibility issues with newer NestJS versions or API Gateway changes.
- Migration plan: Consider `@codegenie/serverless-express` (the maintained fork) or native Lambda handlers.

## Test Coverage Gaps

**All Backend Services:**
- What's not tested: Every service, controller, entity, and utility function. Zero test coverage.
- Files: `backend/src/meters/meters.service.ts`, `backend/src/hierarchy/hierarchy.service.ts`, `backend/src/alerts/alerts.service.ts`, `backend/src/auth/auth.service.ts`
- Risk: SQL aggregation bugs (like the 550kW spike from ISSUES_&_FIXES.md) can only be caught by manual inspection. Auth token verification has no automated tests. Alert scan logic is untested.
- Priority: High

**All Frontend Components:**
- What's not tested: Every page, component, hook, and store. Zero test coverage.
- Files: `frontend/src/features/meters/MeterDetailPage.tsx`, `frontend/src/hooks/auth/useAuth.ts`, `frontend/src/features/drilldown/DrilldownPage.tsx`
- Risk: Auth flow regressions (multiple documented in ISSUES_&_FIXES.md) cannot be caught automatically. Chart configuration errors are only visible at runtime.
- Priority: Medium

**SQL Migrations:**
- What's not tested: No validation that migrations produce the expected schema. No rollback scripts.
- Files: `sql/001_schema.sql` through `sql/006_alerts.sql`
- Risk: Schema drift between environments.
- Priority: Low

---

*Concerns audit: 2026-03-09*
