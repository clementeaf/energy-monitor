import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const port = process.env.PORT ?? 4000;
  const isProduction = process.env.NODE_ENV === 'production';

  // ISO 27001: Security headers
  app.use(helmet());

  // ISO 27001: Secure cookie parsing
  app.use(cookieParser(process.env.COOKIE_SECRET));

  // ISO 27001: Strict CORS
  app.enableCors({
    origin: isProduction
      ? [process.env.FRONTEND_URL ?? 'https://monitoreo.cl']
      : ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id'],
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

  await app.listen(port);
  Logger.log(`Server running on port ${port}`, 'Bootstrap');
}

bootstrap();
