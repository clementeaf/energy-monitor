import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { DATA_CONTRACT_VERSION_HEADER } from '../../common/constants/data-contracts';
import { DataContractService } from './data-contract.service';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

/**
 * Validates X-Data-Contract-Version on export routes when header is present (GAP-166).
 */
@Injectable()
export class DataContractGuard implements CanActivate {
  constructor(private readonly dataContractService: DataContractService) {}

  /**
   * Runs contract validation before export handler executes.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user?: JwtPayload }>();
    const user = req.user;
    if (!user?.tenantId) return true;

    const headerRaw = req.headers[DATA_CONTRACT_VERSION_HEADER];
    const headerValue = Array.isArray(headerRaw) ? headerRaw[0] : headerRaw;

    const body = req.body as { format?: string } | undefined;
    const query = req.query as { format?: string };
    const exportFormat = body?.format ?? query.format;

    await this.dataContractService.validateExportContract({
      tenantId: user.tenantId,
      headerValue,
      exportFormat,
    });

    return true;
  }
}
