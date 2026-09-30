import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { JsonLoggerService } from './common/logging/json-logger.service';
import { validateEnv } from './common/validation/env-validation';
import { configureHttpApp, isProductionEnv } from './http-app';

function useJsonLogging(): boolean {
  return isProductionEnv() || process.env.LOG_FORMAT === 'json';
}

async function bootstrap() {
  validateEnv();

  const jsonLogs = useJsonLogging();
  const app = await NestFactory.create(AppModule, {
    bufferLogs: jsonLogs,
    logger: jsonLogs ? new JsonLoggerService() : ['error', 'warn', 'log'],
  });

  configureHttpApp(app);

  if (!isProductionEnv()) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Energy Monitor API')
      .setDescription(
        'Multi-tenant energy monitoring platform. JWT cookie auth for internal, X-API-Key for external.',
      )
      .setVersion('1.1')
      .addCookieAuth('access_token')
      .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header' }, 'api-key')
      .build();
    SwaggerModule.setup(
      'api/docs',
      app,
      SwaggerModule.createDocument(app, swaggerConfig),
    );
  }

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  Logger.log(`Server running on port ${port}`, 'Bootstrap');
}

bootstrap();
