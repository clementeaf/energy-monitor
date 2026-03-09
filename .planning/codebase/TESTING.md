# Testing Patterns

**Analysis Date:** 2026-03-09

## Test Framework

**Backend runner:**
- Jest 29.7.0
- ts-jest 29.2.0
- Config: No `jest.config.*` file found in project root or backend directory
- `@nestjs/testing` 11.x available for NestJS integration testing
- `@types/jest` 29.5.0 installed

**Frontend runner:**
- No test runner installed (no jest, vitest, or testing-library in `frontend/package.json`)
- No test-related scripts in `frontend/package.json`

**Run Commands:**
```bash
cd backend && npm test          # Run Jest (backend only)
```

## Current Test Coverage

**ZERO test files exist in the project source code.** No `.test.ts`, `.spec.ts`, `.test.tsx`, or `.spec.tsx` files were found outside of `node_modules/`.

The project has test infrastructure (Jest + ts-jest + @nestjs/testing) installed in the backend but no tests have been written.

## Test File Organization

**Recommended location (based on NestJS conventions and project structure):**
- Backend: co-located with source — `backend/src/<domain>/<domain>.service.spec.ts`
- Frontend: co-located — `frontend/src/hooks/queries/useMeters.test.ts`

**Recommended naming:**
- Backend: `*.spec.ts` (NestJS convention)
- Frontend: `*.test.ts` / `*.test.tsx`

## What to Test (Priority Order)

**Backend high-priority targets:**

1. **`backend/src/meters/meter-status.util.ts`** — Pure utility, easy to unit test
   - `getMeterStatus()` — online/offline threshold logic
   - `getOfflineTriggeredAt()` — date calculation

2. **`backend/src/meters/meters.service.ts`** — Core business logic
   - `findReadings()` — resolution-based aggregation
   - `getUptimeSummary()` — uptime calculation from gaps
   - `getOverview()` — complex SQL aggregation
   - `findBuildingConsumption()` — multi-meter aggregation

3. **`backend/src/alerts/alerts.service.ts`** — Alert lifecycle
   - `scanOfflineMeters()` — create/resolve logic
   - `acknowledge()` — state transitions

4. **`backend/src/auth/auth.service.ts`** — Token verification
   - `verifyToken()` — JWT verification with JWKS
   - `detectProvider()` — issuer detection
   - `resolveUser()` — user upsert and permission loading

5. **`backend/src/hierarchy/hierarchy.service.ts`** — CTE queries
   - `findNode()` — ancestor path resolution
   - `findChildrenWithConsumption()` — subtree aggregation

**Frontend high-priority targets (requires adding vitest or jest):**

1. **`frontend/src/services/routes.ts`** — Pure functions, easy to test
2. **`frontend/src/app/appRoutes.ts`** — `buildPath()`, `getNavItems()` helpers
3. **`frontend/src/auth/permissions.ts`** — Permission logic

## Recommended Test Structure

**Backend NestJS service test:**
```typescript
// backend/src/meters/meter-status.util.spec.ts
import { getMeterStatus, getOfflineTriggeredAt, OFFLINE_THRESHOLD_MS } from './meter-status.util';

describe('getMeterStatus', () => {
  it('should return online when reading is recent', () => {
    const recent = new Date(Date.now() - 60_000); // 1 min ago
    expect(getMeterStatus(recent)).toBe('online');
  });

  it('should return offline when reading is old', () => {
    const old = new Date(Date.now() - 10 * 60_000); // 10 min ago
    expect(getMeterStatus(old)).toBe('offline');
  });

  it('should return offline when lastReadingAt is null', () => {
    expect(getMeterStatus(null)).toBe('offline');
  });
});
```

**Backend NestJS service with mocking:**
```typescript
// backend/src/meters/meters.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MetersService } from './meters.service';
import { Meter } from './meter.entity';
import { Reading } from './reading.entity';

describe('MetersService', () => {
  let service: MetersService;
  let meterRepo: Record<string, jest.Mock>;
  let readingRepo: Record<string, jest.Mock>;

  beforeEach(async () => {
    meterRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
    };
    readingRepo = {
      createQueryBuilder: jest.fn(),
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetersService,
        { provide: getRepositoryToken(Meter), useValue: meterRepo },
        { provide: getRepositoryToken(Reading), useValue: readingRepo },
      ],
    }).compile();

    service = module.get<MetersService>(MetersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should return meter with live status', async () => {
      const meter = { id: 'M001', lastReadingAt: new Date(), status: 'online' };
      meterRepo.findOne.mockResolvedValue(meter);
      const result = await service.findOne('M001');
      expect(result).toBeDefined();
      expect(meterRepo.findOne).toHaveBeenCalledWith({ where: { id: 'M001' } });
    });

    it('should return null when meter not found', async () => {
      meterRepo.findOne.mockResolvedValue(null);
      const result = await service.findOne('INVALID');
      expect(result).toBeNull();
    });
  });
});
```

## Mocking

**Framework:** Jest built-in mocking (`jest.fn()`, `jest.mock()`)

**What to Mock:**
- TypeORM repositories (use `getRepositoryToken()` from `@nestjs/typeorm`)
- External JWKS endpoints (for auth service tests)
- `DataSource` for raw query tests
- Axios for frontend API tests

**What NOT to Mock:**
- Pure utility functions (`meter-status.util.ts`, `routes.ts`)
- Type definitions and interfaces
- Simple data transformations

## Fixtures and Factories

**No fixtures or factories exist.** When creating them:

**Recommended test data location:**
- `backend/src/__test__/fixtures/` or co-located `__fixtures__/` directories

**Sample fixture pattern:**
```typescript
// backend/src/__test__/fixtures/meters.ts
import { Meter } from '../../meters/meter.entity';

export function createMeterFixture(overrides: Partial<Meter> = {}): Meter {
  const meter = new Meter();
  Object.assign(meter, {
    id: 'M001',
    buildingId: 'pac4220',
    model: 'PAC1670',
    phaseType: '3P',
    busId: 'BUS-A1',
    modbusAddress: 1,
    uplinkRoute: 'GW01->BUS-A1->M001',
    status: 'online',
    lastReadingAt: new Date(),
    ...overrides,
  });
  return meter;
}
```

## Coverage

**Requirements:** None enforced (no coverage thresholds configured)

**View Coverage:**
```bash
cd backend && npx jest --coverage
```

## Test Types

**Unit Tests:**
- Not yet implemented
- Target: utility functions, service methods with mocked repositories
- Framework ready: Jest + ts-jest + @nestjs/testing

**Integration Tests:**
- Not yet implemented
- Would require test database setup (PostgreSQL)
- NestJS provides `Test.createTestingModule()` for module-level integration tests

**E2E Tests:**
- Not yet implemented
- NestJS template includes `test/` directory pattern but none created
- Would use `supertest` with NestJS app instance

## Frontend Testing Setup Required

To add frontend tests, install:
```bash
cd frontend && npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

Add to `frontend/vite.config.ts`:
```typescript
/// <reference types="vitest/config" />
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
```

Add script to `frontend/package.json`:
```json
{
  "scripts": {
    "test": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

## Summary

The project has **zero test coverage**. Backend has Jest infrastructure installed but unused. Frontend has no test tooling at all. The codebase has clear separation of concerns (services, controllers, hooks, utilities) that would make it straightforward to add tests. Pure utility functions like `meter-status.util.ts` and `routes.ts` are the lowest-effort starting points.

---

*Testing analysis: 2026-03-09*
