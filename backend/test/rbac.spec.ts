import { Controller, Get, Module, Post } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { AuthGuard } from '../src/auth/auth.guard';
import {
  type AuthorizationContext,
  AuthService,
  type TokenPayload,
} from '../src/auth/auth.service';
import { RequirePermissions } from '../src/auth/require-permissions.decorator';
import { RolesGuard } from '../src/auth/roles.guard';

@Controller()
class TestController {
  @Get('protected')
  getProtected() {
    return { ok: true };
  }

  @Get('buildings')
  @RequirePermissions('BUILDINGS', 'view')
  getBuildings() {
    return { ok: true };
  }

  @Post('alerts/manage')
  @RequirePermissions('ALERTS', 'manage')
  manageAlerts() {
    return { ok: true };
  }
}

@Module({
  controllers: [TestController],
  providers: [
    {
      provide: AuthService,
      useValue: {
        verifyToken: jest.fn(),
        resolveAuthorizationContext: jest.fn(),
      },
    },
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
class TestAppModule {}

function buildAuthContext(
  payload: TokenPayload,
  permissions: Record<string, string[]>,
): AuthorizationContext {
  return {
    userId: payload.sub,
    roleId: 4,
    role: 'OPERATOR',
    provider: 'google',
    email: payload.email,
    name: payload.name,
    permissions,
  };
}

describe('RBAC guards', () => {
  let app: INestApplication;
  let baseUrl: string;
  let authService: jest.Mocked<Pick<AuthService, 'verifyToken' | 'resolveAuthorizationContext'>>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.listen(0);

    const address = app.getHttpServer().address();
    baseUrl = `http://127.0.0.1:${String(address.port)}`;
    authService = moduleRef.get(AuthService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    authService.verifyToken.mockReset();
    authService.resolveAuthorizationContext.mockReset();
  });

  it('returns 401 when Authorization header is missing', async () => {
    const response = await fetch(`${baseUrl}/protected`);

    expect(response.status).toBe(401);
  });

  it('returns 401 when token is invalid', async () => {
    authService.verifyToken.mockResolvedValue(null);

    const response = await fetch(`${baseUrl}/protected`, {
      headers: {
        Authorization: 'Bearer invalid-token',
      },
    });

    expect(response.status).toBe(401);
  });

  it('returns 403 when authenticated user lacks module permission', async () => {
    const payload: TokenPayload = {
      sub: 'user-without-buildings',
      email: 'operator@example.com',
      name: 'Operator',
      iss: 'https://accounts.google.com',
    };

    authService.verifyToken.mockResolvedValue(payload);
    authService.resolveAuthorizationContext.mockResolvedValue(
      buildAuthContext(payload, {
        ALERTS: ['view'],
      }),
    );

    const response = await fetch(`${baseUrl}/buildings`, {
      headers: {
        Authorization: 'Bearer valid-no-buildings',
      },
    });

    expect(response.status).toBe(403);
  });

  it('returns 200 when authenticated user has the required permission', async () => {
    const payload: TokenPayload = {
      sub: 'user-with-buildings',
      email: 'analyst@example.com',
      name: 'Analyst',
      iss: 'https://accounts.google.com',
    };

    authService.verifyToken.mockResolvedValue(payload);
    authService.resolveAuthorizationContext.mockResolvedValue(
      buildAuthContext(payload, {
        BUILDINGS: ['view'],
      }),
    );

    const response = await fetch(`${baseUrl}/buildings`, {
      headers: {
        Authorization: 'Bearer valid-buildings',
      },
    });

    expect(response.status).toBe(200);
  });

  it('returns 403 when a mutation lacks manage permission', async () => {
    const payload: TokenPayload = {
      sub: 'alerts-view-only',
      email: 'viewer@example.com',
      name: 'Viewer',
      iss: 'https://accounts.google.com',
    };

    authService.verifyToken.mockResolvedValue(payload);
    authService.resolveAuthorizationContext.mockResolvedValue(
      buildAuthContext(payload, {
        ALERTS: ['view'],
      }),
    );

    const response = await fetch(`${baseUrl}/alerts/manage`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer valid-alerts-view-only',
      },
    });

    expect(response.status).toBe(403);
  });
});