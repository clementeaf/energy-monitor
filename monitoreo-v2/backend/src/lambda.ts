import serverlessExpress from '@codegenie/serverless-express';
import type { RequestListener } from 'http';
import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { AppModule } from './app.module';
import { JsonLoggerService } from './common/logging/json-logger.service';
import { validateEnv } from './common/validation/env-validation';
import { configureHttpApp } from './http-app';

type HttpHandler = (
  event: unknown,
  context: unknown,
  callback: unknown,
) => Promise<unknown>;

interface ScheduledJobEvent {
  job: string;
}

interface LambdaApp {
  app: INestApplication;
  httpHandler: HttpHandler;
}

let lambdaApp: Promise<LambdaApp> | undefined;

function isScheduledJobEvent(event: unknown): event is ScheduledJobEvent {
  return typeof (event as Partial<ScheduledJobEvent> | null)?.job === 'string';
}

async function createLambdaApp(): Promise<LambdaApp> {
  validateEnv();
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    logger: new JsonLoggerService(),
  });
  configureHttpApp(app);
  await app.init();
  for (const job of app.get(SchedulerRegistry).getCronJobs().values()) {
    await job.stop();
  }
  const expressApp = app.getHttpAdapter().getInstance() as RequestListener;
  const httpHandler = serverlessExpress({ app: expressApp }) as HttpHandler;
  return { app, httpHandler };
}

async function runScheduledJob(
  app: INestApplication,
  jobName: string,
): Promise<{ job: string; durationMs: number }> {
  const job = app.get(SchedulerRegistry).getCronJob(jobName);
  job.waitForCompletion = true;
  const startedAt = Date.now();
  await job.fireOnTick();
  return { job: jobName, durationMs: Date.now() - startedAt };
}

export const handler: HttpHandler = async (event, context, callback) => {
  lambdaApp ??= createLambdaApp();
  const { app, httpHandler } = await lambdaApp;
  if (isScheduledJobEvent(event)) return runScheduledJob(app, event.job);
  return httpHandler(event, context, callback);
};
