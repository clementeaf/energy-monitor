import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { JsonLoggerService } from './common/logging/json-logger.service';
import { validateEnv } from './common/validation/env-validation';

/**
 * Activa logs en una línea JSON (CloudWatch / agregadores).
 * @returns true si se usa JsonLoggerService
 */
function useJsonLogging(): boolean {
  return (
    process.env.NODE_ENV === 'production' || process.env.LOG_FORMAT === 'json'
  );
}

/**
 * Confía en el primer proxy (ALB / API Gateway) para IP y HSTS correctos.
 * @param app - Aplicación Nest
 */
function configureTrustProxy(app: INestApplication): void {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }
  const expressApp = app.getHttpAdapter().getInstance() as {
    set: (key: string, value: unknown) => void;
  };
  expressApp.set('trust proxy', 1);
}

async function bootstrap() {
  // ISO 27001: validate critical env vars before startup
  validateEnv();

  const jsonLogs = useJsonLogging();
  const jsonLogger = new JsonLoggerService();
  const app = await NestFactory.create(AppModule, {
    bufferLogs: jsonLogs,
    logger: jsonLogs ? jsonLogger : ['error', 'warn', 'log'],
  });

  const port = process.env.PORT ?? 4000;
  const isProduction = process.env.NODE_ENV === 'production';

  configureTrustProxy(app);

  // ISO 27001: Security headers
  app.use(
    helmet({
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }, // OAuth popups
      hsts: isProduction ? { maxAge: 31536000, includeSubDomains: true } : false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      contentSecurityPolicy: false, // Handled by frontend CSP meta tag
    }),
  );

  // ISO 27001: Secure cookie parsing
  app.use(cookieParser(process.env.COOKIE_SECRET));

  // ISO 27001: Strict CORS
  app.enableCors({
    origin: isProduction
      ? [process.env.FRONTEND_URL ?? 'https://monitoreo.cl']
      : [
          'http://localhost:5173',
          'http://127.0.0.1:5173',
          'http://localhost:3000',
          'http://127.0.0.1:3000',
        ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id', 'x-api-key'],
  });

  // Global validation (ISO 27001: input validation at boundary)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // API prefix
  app.setGlobalPrefix('api');

  // Swagger / OpenAPI for external v1 API
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Energy Monitor — External API')
    .setDescription('Read-only API for third-party consumers. Authenticate via X-API-Key header.')
    .setVersion('1.0')
    .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header' }, 'api-key')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig, {
    include: [],  // all modules — Swagger decorators only on ExternalApiController
  });
  if (isProduction) {
    SwaggerModule.setup('api/v1/docs', app, document);
  } else {
    SwaggerModule.setup('api/v1/docs', app, document);
  }

  await app.listen(port);
  Logger.log(`Server running on port ${port}`, 'Bootstrap');
}

bootstrap();
