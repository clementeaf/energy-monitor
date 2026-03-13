import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import serverlessExpress from '@vendia/serverless-express';
import express from 'express';
import { AppModule } from './app.module';
import { setupSwagger } from './swagger';
import type { Callback, Context, Handler } from 'aws-lambda';

let cachedServer: Handler;

async function bootstrap() {
  const expressApp = express();
  const adapter = new ExpressAdapter(expressApp);

  const app = await NestFactory.create(AppModule, adapter);
  expressApp.set('json charset', 'utf-8');
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const corsOrigins: string[] = ['https://energymonitor.click'];
  if (process.env.NODE_ENV !== 'production') {
    corsOrigins.push('http://localhost:5173');
  }
  app.enableCors({ origin: corsOrigins, credentials: true });

  setupSwagger(app);

  await app.init();
  return serverlessExpress({ app: expressApp });
}

export const handler: Handler = async (event: unknown, context: Context, callback: Callback) => {
  if (!cachedServer) {
    cachedServer = await bootstrap();
  }
  return cachedServer(event, context, callback);
};
