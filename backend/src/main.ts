import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { setupSwagger } from './swagger';
import { Utf8JsonInterceptor } from './common/utf8-json.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const expressApp = app.getHttpAdapter().getInstance();
  if (typeof expressApp.set === 'function') {
    expressApp.set('json charset', 'utf-8');
  }

  app.useGlobalInterceptors(new Utf8JsonInterceptor());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const corsOrigins: string[] = [
    'https://energymonitor.click',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ];
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  });

  setupSwagger(app);

  await app.listen(4000);
}
bootstrap();
