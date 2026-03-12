import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const PRODUCTION_API = 'https://energymonitor.click/api';

/**
 * Configura Swagger/OpenAPI y monta la UI en /api/docs (globalPrefix 'api' + path 'docs').
 * addServer() hace que "Try it out" use la API desplegada en AWS (misma que usa la app; la base está en RDS).
 */
export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('POWER Digital API')
    .setDescription('API de monitoreo energético — POWER Digital®. Autenticación: Bearer JWT (id_token Microsoft/Google) o token de sesión (test-token-energy-monitor).')
    .setVersion('1.0')
    .addServer(PRODUCTION_API, 'Producción (AWS)')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', name: 'Authorization', in: 'header' },
      'bearer',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
    },
  });
}
