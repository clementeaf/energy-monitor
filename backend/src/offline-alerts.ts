import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AlertsService } from './alerts/alerts.service';

const logger = new Logger('OfflineAlertsHandler');

export async function handler() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['log', 'warn', 'error'] });

  try {
    const alertsService = app.get(AlertsService);
    const result = await alertsService.scanOfflineMeters();
    logger.log(`Offline alert sync finished: ${JSON.stringify(result)}`);
    return result;
  } finally {
    await app.close();
  }
}
