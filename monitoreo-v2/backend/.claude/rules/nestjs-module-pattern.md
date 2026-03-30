---
paths:
  - "monitoreo-v2/backend/**/*.ts"
---
# NestJS Module Pattern — monitoreo-v2

Every new feature module follows this exact structure. Do NOT deviate.

## File Structure (4+2 files)

```
modules/<name>/
  <name>.module.ts        # Module registration
  <name>.service.ts       # Business logic
  <name>.controller.ts    # HTTP layer
  <name>.service.spec.ts  # Service unit tests
  <name>.controller.spec.ts # Controller unit tests
  dto/
    create-<name>.dto.ts  # class-validator DTO
    update-<name>.dto.ts  # partial DTO
```

Entity lives in `modules/platform/entities/<name>.entity.ts` (already created).

## Module

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([Entity])],
  controllers: [Controller],
  providers: [Service],
  exports: [Service],
})
export class XModule {}
```

Register in `app.module.ts` under `// Feature modules`.

## Service Pattern

- Inject `Repository<Entity>` via `@InjectRepository(Entity)`
- Name the field `private readonly repo: Repository<Entity>`
- **Tenant scoping**: every query MUST filter by `tenantId`
- **BuildingIds RBAC**: if entity has `buildingId`, apply `IN (:...buildingIds)` when array is non-empty
- Methods: `findAll(tenantId, buildingIds, ...filters)`, `findOne(id, tenantId, buildingIds)`, `create(tenantId, dto)`, `update(id, tenantId, dto)`, `remove(id, tenantId)`
- Use `createQueryBuilder` for findAll/findOne (allows conditional andWhere)
- Use `findOneBy` for update (simpler, no scoping needed after tenant check)
- Use `repo.delete({ id, tenantId })` for remove
- Return `Entity | null` from findOne/update, `boolean` from remove
- Nullables: `dto.field ?? null` in create, `if (dto.field !== undefined)` in update
- Decimals: `String(dto.numericField)` when mapping to TypeORM decimal columns

## Controller Pattern

- `@Controller('<plural-name>')`
- Inject only the service
- `@CurrentUser() user: JwtPayload` on every method
- Read endpoints: `@RequireAnyPermission('admin_<name>:read', 'dashboard_executive:read', 'dashboard_technical:read')`
- Write endpoints: `@RequirePermission('admin_<name>', 'create|update|delete')`
- `@Param('id', ParseUUIDPipe)` for UUID params
- Null check: `if (!result) throw new NotFoundException('<Entity> not found')`
- `@HttpCode(HttpStatus.NO_CONTENT)` on DELETE endpoints (204, no body)
- No return value on successful delete (void)

## DTOs

- Use `class-validator` decorators: `@IsString()`, `@IsOptional()`, `@IsNumber()`, `@MaxLength()`, `@IsUUID()`, `@IsBoolean()`, `@IsEnum()`, `@Min()`, `@IsArray()`
- CreateDto: required fields without `?`, optional with `@IsOptional()` + `?`
- UpdateDto: all fields optional with `@IsOptional()` + `?`
- Do NOT use `PartialType` — write explicit DTOs to control exactly which fields are updatable

## Service Tests

```typescript
const TENANT_ID = 'tenant-1';

const mockEntity = (overrides: Partial<Entity> = {}): Entity => ({
  // all fields with sensible defaults
  ...overrides,
});

describe('XService', () => {
  let service: XService;
  let repo: Record<string, jest.Mock>;

  beforeEach(async () => {
    repo = {
      createQueryBuilder: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      findOneBy: jest.fn(),
      delete: jest.fn(),
    };
    const module = await Test.createTestingModule({
      providers: [
        XService,
        { provide: getRepositoryToken(Entity), useValue: repo },
      ],
    }).compile();
    service = module.get(XService);
  });

  // Test categories:
  // findAll: tenant filter, buildingIds scoping, extra filters
  // findOne: found, not found, buildingIds scoping
  // create: correct fields, tenant assignment
  // update: found + patched, not found → null
  // remove: affected=1 → true, affected=0 → false
});
```

## Controller Tests

```typescript
const user: JwtPayload = {
  sub: 'u-1', email: 'test@test.com', tenantId: 't-1',
  roleId: 'r-1', roleSlug: 'super_admin',
  permissions: ['admin_<name>:read', ...], buildingIds: [],
};

describe('XController', () => {
  let controller: XController;
  let service: Record<string, jest.Mock>;

  beforeEach(async () => {
    service = { findAll: jest.fn(), findOne: jest.fn(), create: jest.fn(), update: jest.fn(), remove: jest.fn() };
    const module = await Test.createTestingModule({
      controllers: [XController],
      providers: [{ provide: XService, useValue: service }],
    }).compile();
    controller = module.get(XController);
  });

  // Test: delegates to service, NotFoundException on null, correct params
});
```

## Checklist Before Done

- [ ] Entity already exists in `platform/entities/`
- [ ] Service: tenant + buildingIds scoping on every query
- [ ] Controller: permission decorators on every endpoint
- [ ] DTOs: class-validator, no `any`
- [ ] Module registered in `app.module.ts`
- [ ] Service spec: mock repo, test all branches
- [ ] Controller spec: mock service, test null → NotFoundException
- [ ] `npm run test` passes, no regressions
