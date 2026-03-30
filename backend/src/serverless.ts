import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import serverlessExpress from '@vendia/serverless-express';
import express from 'express';
import { AppModule } from './app.module';
import { setupSwagger } from './swagger';
import { Utf8JsonInterceptor } from './common/utf8-json.interceptor';
import type { Callback, Context, Handler } from 'aws-lambda';

let cachedServer: Handler;

async function bootstrap() {
  const expressApp = express();
  const adapter = new ExpressAdapter(expressApp);

  const app = await NestFactory.create(AppModule, adapter);
  expressApp.set('json charset', 'utf-8');
  app.useGlobalInterceptors(new Utf8JsonInterceptor());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // Siempre incluir Vite local: en Lambda NODE_ENV=production y sin esto el front en :5173 falla CORS contra AWS.
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

  await app.init();
  return serverlessExpress({
    app: expressApp,
    binarySettings: {
      contentTypes: ['application/pdf', 'application/octet-stream'],
    },
  });
}

export const handler: Handler = async (event: unknown, context: Context, callback: Callback) => {
  if (!cachedServer) {
    cachedServer = await bootstrap();
  }
  return cachedServer(event, context, callback);
};
