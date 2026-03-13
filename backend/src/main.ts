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
  const corsOrigins: string[] = ['https://energymonitor.click'];
  if (process.env.NODE_ENV !== 'production') {
    corsOrigins.push('http://localhost:5173');
  }
  app.enableCors({ origin: corsOrigins, credentials: true });

  setupSwagger(app);

  await app.listen(4000);
}
bootstrap();
