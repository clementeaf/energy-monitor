import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule, OpenAPIObject } from '@nestjs/swagger';

const PRODUCTION_API = 'https://energymonitor.click/api';
const SWAGGER_UI_URL = 'https://petstore.swagger.io';

/** Cached spec for the /spec endpoint */
let cachedSpec: OpenAPIObject;

/**
 * Configura Swagger/OpenAPI:
 * - GET /api/spec         → JSON spec (para viewers externos)
 * - GET /api/docs         → redirige a Swagger UI con la spec cargada
 * - En dev (localhost)    → monta Swagger UI embebida en /api/docs
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

  cachedSpec = SwaggerModule.createDocument(app, config);

  // Expose raw JSON spec at /api/spec
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/api/spec', (_req: any, res: any) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json(cachedSpec);
  });

  // Redirect /api/docs to Swagger UI with spec URL
  httpAdapter.get('/api/docs', (_req: any, res: any) => {
    const specUrl = encodeURIComponent(`${PRODUCTION_API}/spec`);
    res.redirect(`${SWAGGER_UI_URL}/?url=${specUrl}`);
  });

  // In dev, also mount embedded Swagger UI
  if (process.env.NODE_ENV !== 'production') {
    SwaggerModule.setup('docs', app, cachedSpec, {
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'list',
      },
    });
  }
}
