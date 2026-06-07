import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DataContract, type DataContractSchema } from '../platform/entities/data-contract.entity';
import { parseContractHeader } from '../../common/constants/data-contracts';

export interface ContractValidationInput {
  tenantId: string;
  headerValue: string | undefined;
  exportFormat?: string;
}

/**
 * Resolves and validates data export contracts (GAP-165–166).
 */
@Injectable()
export class DataContractService {
  constructor(
    @InjectRepository(DataContract)
    private readonly contractRepo: Repository<DataContract>,
  ) {}

  /**
   * Validates contract header when provided; no-op when header absent.
   * @param input - Tenant scope and optional header
   */
  async validateExportContract(input: ContractValidationInput): Promise<void> {
    if (!input.headerValue) return;

    const parsed = parseContractHeader(input.headerValue);
    if (!parsed) {
      throw new BadRequestException('Invalid X-Data-Contract-Version; expected name@version');
    }

    const contract = await this.findActiveContract(
      input.tenantId,
      parsed.name,
      parsed.version,
    );
    if (!contract) {
      throw new BadRequestException(
        `Unknown or inactive data contract: ${parsed.name}@${parsed.version}`,
      );
    }

    if (input.exportFormat) {
      this.assertFormatAllowed(contract.schemaJson, input.exportFormat);
    }
  }

  /**
   * Finds tenant-specific or global contract effective at now.
   */
  async findActiveContract(
    tenantId: string,
    name: string,
    version: string,
  ): Promise<DataContract | null> {
    return this.contractRepo
      .createQueryBuilder('c')
      .where('c.name = :name', { name })
      .andWhere('c.version = :version', { version })
      .andWhere('c.effective_from <= NOW()')
      .andWhere('(c.tenant_id = :tenantId OR c.tenant_id IS NULL)', { tenantId })
      .orderBy('c.tenant_id', 'DESC', 'NULLS LAST')
      .getOne();
  }

  /**
   * Ensures export format is listed in contract schema.
   */
  private assertFormatAllowed(schema: DataContractSchema, format: string): void {
    const formats = schema.formats;
    if (!formats || formats.length === 0) return;
    if (!formats.includes(format)) {
      throw new BadRequestException(
        `Export format '${format}' not allowed by data contract`,
      );
    }
  }
}
