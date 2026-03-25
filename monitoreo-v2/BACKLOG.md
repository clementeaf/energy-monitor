# Backlog — Monitoreo V2

## Backend: NestJS + TimescaleDB
- Mismo stack NestJS, reemplazar PostgreSQL vanilla por **TimescaleDB** (extensión de PostgreSQL)
- Hypertables para particionamiento automático por tiempo
- Compresión 90-95% en datos históricos
- Continuous aggregates para pre-cálculo de agregaciones
- Retention policies para purga automática de datos raw antiguos
- TypeORM y queries raw siguen funcionando igual

## API Externa
- Habilitar APIs para consumo por terceros
- Autenticación dedicada (API keys o OAuth client credentials)
- Rate limiting, versionado, documentación pública

## Multi-Tenancy
- Cada cliente/empresa es un tenant aislado dentro de la misma instancia
- Datos segregados por tenant, config independiente, misma base de código
- Estrategia de aislamiento: schema por tenant o discriminador por columna (tenant_id)
- RBAC scoped por tenant
- Theming dinámico por tenant: paleta de colores, logo, favicon (tab del navegador) y título de la app
- CSS variables por tenant (escalar el patrón `[data-theme]` actual a N tenants)

## Ciberseguridad: ISO 27001
- Estándar de gestión de seguridad de la información exigido en Chile, especialmente en energía/utilities y al exponer APIs a terceros
- Cifrado en tránsito (TLS) y en reposo
- Gestión de secretos (no hardcodeados)
- Auditoría de accesos y logging inmutable
- Manejo seguro de tokens (no sessionStorage)
- Rate limiting, security headers, RBAC robusto
- Validación de inputs en todas las fronteras del sistema
