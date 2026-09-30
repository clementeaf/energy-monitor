import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

const DEVELOPMENT_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

interface TenantOverrideRequest {
  headers?: Record<string, unknown>;
  query?: Record<string, unknown>;
  _tenantOverride?: string;
}

export function isProductionEnv(): boolean {
  return process.env.NODE_ENV === 'production';
}

function applyTenantOverride(
  req: TenantOverrideRequest,
  _res: unknown,
  next: () => void,
): void {
  const headerTenantId = req.headers?.['x-tenant-id'] as string | undefined;
  const queryTenantId = req.query?.tenantId as string | undefined;
  const tenantId = headerTenantId || queryTenantId;
  if (tenantId) {
    req._tenantOverride = tenantId;
    delete req.query?.tenantId;
  }
  next();
}

export function configureHttpApp(app: INestApplication): void {
  const isProduction = isProductionEnv();

  if (isProduction) {
    const expressApp = app.getHttpAdapter().getInstance() as express.Express;
    expressApp.set('trust proxy', 1);
  }

  app.use(
    helmet({
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
      hsts: isProduction
        ? { maxAge: 31536000, includeSubDomains: true }
        : false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      contentSecurityPolicy: false,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ limit: '1mb', extended: true }));
  app.use(cookieParser(process.env.COOKIE_SECRET));
  app.use(applyTenantOverride);

  app.enableCors({
    origin: isProduction
      ? [process.env.FRONTEND_URL ?? 'https://monitoreo.cl']
      : DEVELOPMENT_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-tenant-id',
      'x-api-key',
    ],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api');
}
