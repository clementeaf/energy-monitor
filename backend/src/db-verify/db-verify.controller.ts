/**
 * Endpoint de verificación RDS. Expone los mismos datos que la Lambda dbVerify y el script verify-rds.mjs.
 */

import { Controller, Get, Post, Headers, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, ApiHeader } from '@nestjs/swagger';
import { Public } from '../auth/public.decorator';
import { RequirePermissions } from '../auth/require-permissions.decorator';
import { DbVerifyService, type DbVerifyResult } from './db-verify.service';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('db-verify')
export class DbVerifyController {
  constructor(private readonly dbVerifyService: DbVerifyService) {}

  @Post('apply-auth-migrations')
  @Public()
  @ApiOperation({
    summary: 'Aplicar migraciones de auth',
    description: 'Crea tabla sessions y seed usuario de prueba + sesión (token test-token-energy-monitor). Requiere cabecera X-Migrate-Secret si MIGRATE_SECRET está definida.',
  })
  @ApiHeader({ name: 'X-Migrate-Secret', required: false, description: 'Secreto para autorizar (debe coincidir con MIGRATE_SECRET)' })
  @ApiOkResponse({ description: 'Migraciones aplicadas' })
  async applyAuthMigrations(
    @Headers('x-migrate-secret') migrateSecret?: string,
  ): Promise<{ applied: string[] }> {
    const expected = process.env.MIGRATE_SECRET;
    if (expected && expected !== migrateSecret) {
      throw new ForbiddenException('X-Migrate-Secret inválido o faltante');
    }
    try {
      return await this.dbVerifyService.applyAuthMigrations();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new InternalServerErrorException(`apply-auth-migrations: ${message}`);
    }
  }

  @Get()
  @RequirePermissions('ADMIN_USERS', 'view')
  @ApiOperation({
    summary: 'Verificación RDS',
    description: 'Conteos y distribución de readings, meters, buildings y hierarchy en RDS. Requiere ADMIN_USERS.view.',
  })
  @ApiOkResponse({ description: 'Resumen de datos cargados en RDS' })
  async getVerify(): Promise<DbVerifyResult> {
    return this.dbVerifyService.run();
  }

  @Get('local')
  @ApiOperation({
    summary: 'Verificación RDS (solo desarrollo)',
    description: 'Mismo payload que GET /db-verify pero sin auth. Solo disponible cuando NODE_ENV !== production.',
  })
  @ApiOkResponse({ description: 'Resumen de datos cargados en RDS' })
  async getVerifyLocal(): Promise<DbVerifyResult | { error: string }> {
    if (process.env.NODE_ENV === 'production') {
      return { error: 'No disponible en producción' };
    }
    return this.dbVerifyService.run();
  }
}
