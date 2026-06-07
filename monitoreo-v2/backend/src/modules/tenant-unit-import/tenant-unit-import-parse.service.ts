import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  buildHeaderIndex,
  hasBuildingReferenceColumn,
  missingRequiredColumns,
} from './tenant-unit-import-column-map';
import { parseTabularImportRows } from './tenant-unit-import.normalizer';
import {
  detectUserImportFormat,
  parseFileToRows,
} from '../user-import/user-import.parser';
import {
  detectDuplicateUnitCode,
  resolveBuildingRef,
} from './tenant-unit-import.resolver';
import type {
  ParsedTenantUnitImportRow,
  TenantUnitImportParseResult,
  TenantUnitImportRowStatus,
  TenantUnitImportSummary,
  TenantUnitImportTenantContext,
} from './tenant-unit-import.types';
import { collectFieldValidationErrors } from './tenant-unit-import.validator';

interface DbBuildingRow {
  id: string;
  code: string;
  external_site_id: string | null;
}

interface DbTenantUnitRow {
  building_id: string;
  unit_code: string;
}

/**
 * Parses and validates tenant unit import files against tenant catalogs.
 */
@Injectable()
export class TenantUnitImportParseService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Loads tenant-scoped building and tenant unit catalogs.
   * @param tenantId - Target tenant UUID
   * @returns Import validation context
   */
  async loadTenantContext(tenantId: string): Promise<TenantUnitImportTenantContext> {
    const [buildingRows, unitRows] = await Promise.all([
      this.dataSource.query<DbBuildingRow[]>(
        `SELECT id, code, external_site_id FROM buildings WHERE tenant_id = $1 AND is_active = true`,
        [tenantId],
      ),
      this.dataSource.query<DbTenantUnitRow[]>(
        `SELECT building_id, unit_code FROM tenant_units WHERE tenant_id = $1`,
        [tenantId],
      ),
    ]);

    const buildings = buildingRows.map((row) => ({
      id: row.id,
      code: row.code,
      externalSiteId: row.external_site_id,
    }));

    const existingUnitKeys = new Set<string>();
    for (const row of unitRows) {
      existingUnitKeys.add(`${row.building_id}|${row.unit_code.toLowerCase()}`);
    }

    return { tenantId, buildings, existingUnitKeys };
  }

  /**
   * Parses CSV/XLSX buffer and validates all rows against tenant context.
   * @param buffer - Upload file bytes
   * @param filename - Original filename
   * @param mimeType - Optional MIME type
   * @param context - Preloaded tenant context
   * @returns Parsed rows and summary counts
   */
  async parseAndValidateFile(
    buffer: Buffer,
    filename: string,
    mimeType: string | undefined,
    context: TenantUnitImportTenantContext,
  ): Promise<TenantUnitImportParseResult> {
    const format = detectUserImportFormat(buffer, filename, mimeType);
    const { headers, rows } = await parseFileToRows(buffer, format);

    const headerIndex = buildHeaderIndex(headers);
    const missing = missingRequiredColumns(headerIndex);
    if (missing.length > 0) {
      throw new BadRequestException(
        `Missing required columns: ${missing.join(', ')}`,
      );
    }
    if (!hasBuildingReferenceColumn(headerIndex)) {
      throw new BadRequestException(
        'Missing building reference column: building_code or external_site_id',
      );
    }

    const rawRows = parseTabularImportRows(headers, rows);
    const seenInFile = new Set<string>();
    const parsedRows: ParsedTenantUnitImportRow[] = rawRows.map((raw) =>
      this.validateRow(raw.rowNumber, raw.cells, context, seenInFile),
    );

    return {
      format,
      rows: parsedRows,
      summary: summarizeRows(parsedRows),
    };
  }

  /**
   * Validates a single normalized row against tenant rules.
   * @param rowNumber - 1-based row index
   * @param cells - Canonical column values
   * @param context - Tenant import context
   * @param seenInFile - Unit keys already processed in this file
   * @returns Fully validated import row
   */
  private validateRow(
    rowNumber: number,
    cells: Record<string, string>,
    context: TenantUnitImportTenantContext,
    seenInFile: Set<string>,
  ): ParsedTenantUnitImportRow {
    const name = cells.name?.trim() || null;
    const unitCode = cells.unit_code?.trim() || null;
    const buildingCode = cells.building_code?.trim() || null;
    const externalSiteId = cells.external_site_id?.trim() || null;
    const contactName = cells.contact_name?.trim() || null;
    const contactEmail = cells.contact_email?.trim() || null;
    const externalUnitId = cells.external_unit_id?.trim() || null;

    const errorCodes = collectFieldValidationErrors({
      name,
      unitCode,
      buildingCode,
      externalSiteId,
      contactEmail,
    });

    let resolvedBuildingId: string | null = null;
    let status: TenantUnitImportRowStatus = 'valid';

    if (errorCodes.length === 0) {
      const { buildingId, error } = resolveBuildingRef(
        buildingCode,
        externalSiteId,
        context.buildings,
      );
      if (error || !buildingId) {
        errorCodes.push(error ?? 'BUILDING_NOT_FOUND');
      } else {
        resolvedBuildingId = buildingId;
      }
    }

    if (errorCodes.length === 0 && resolvedBuildingId && unitCode) {
      const duplicateError = detectDuplicateUnitCode(
        resolvedBuildingId,
        unitCode,
        context.existingUnitKeys,
        seenInFile,
      );
      if (duplicateError) {
        errorCodes.push(duplicateError);
      } else {
        seenInFile.add(`${resolvedBuildingId}|${unitCode.toLowerCase()}`);
      }
    }

    if (errorCodes.some((c) => c.startsWith('DUPLICATE_'))) {
      status = 'duplicate';
    } else if (errorCodes.length > 0) {
      status = 'error';
    }

    return {
      rowNumber,
      rawCells: cells,
      name,
      unitCode,
      buildingCode,
      externalSiteId,
      contactName,
      contactEmail,
      externalUnitId,
      status,
      errorCodes,
      resolvedBuildingId,
    };
  }
}

/**
 * Aggregates row status counts for preview summary.
 * @param rows - Validated import rows
 * @returns Summary totals
 */
export function summarizeRows(rows: ParsedTenantUnitImportRow[]): TenantUnitImportSummary {
  let validRows = 0;
  let errorRows = 0;
  let duplicateRows = 0;

  for (const row of rows) {
    if (row.status === 'valid') {
      validRows += 1;
    } else if (row.status === 'duplicate') {
      duplicateRows += 1;
    } else {
      errorRows += 1;
    }
  }

  return {
    totalRows: rows.length,
    validRows,
    errorRows,
    duplicateRows,
  };
}
