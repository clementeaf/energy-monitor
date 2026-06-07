import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  buildHeaderIndex,
  missingRequiredColumns,
} from './building-import-column-map';
import {
  normalizeCountryCode,
  normalizeSiteKind,
  parseAreaSqm,
  parseTabularImportRows,
} from './building-import.normalizer';
import {
  detectUserImportFormat,
  parseFileToRows,
} from '../user-import/user-import.parser';
import {
  detectDuplicateCode,
  detectDuplicateExternalSiteId,
  resolveRegionCode,
} from './building-import.resolver';
import type {
  BuildingImportParseResult,
  BuildingImportRowStatus,
  BuildingImportSummary,
  BuildingImportTenantContext,
  ParsedBuildingImportRow,
} from './building-import.types';
import { collectFieldValidationErrors } from './building-import.validator';

interface DbRegionRow {
  id: string;
  code: string;
  name: string;
}

interface DbBuildingRow {
  id: string;
  code: string;
  external_site_id: string | null;
}

/**
 * Parses and validates building import files against tenant catalogs.
 */
@Injectable()
export class BuildingImportParseService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Loads tenant-scoped region and building catalogs for duplicate detection.
   * @param tenantId - Target tenant UUID
   * @returns Import validation context
   */
  async loadTenantContext(tenantId: string): Promise<BuildingImportTenantContext> {
    const [regionRows, buildingRows] = await Promise.all([
      this.dataSource.query<DbRegionRow[]>(
        `SELECT id, code, name FROM regions WHERE tenant_id = $1`,
        [tenantId],
      ),
      this.dataSource.query<DbBuildingRow[]>(
        `SELECT id, code, external_site_id FROM buildings WHERE tenant_id = $1`,
        [tenantId],
      ),
    ]);

    const regionsByCode = new Map<string, BuildingImportRegionRef>();
    for (const row of regionRows) {
      regionsByCode.set(row.code.toLowerCase(), {
        id: row.id,
        code: row.code,
        name: row.name,
      });
    }

    const existingCodes = new Set<string>();
    const existingExternalSiteIds = new Set<string>();
    for (const row of buildingRows) {
      existingCodes.add(row.code.toLowerCase());
      if (row.external_site_id?.trim()) {
        existingExternalSiteIds.add(row.external_site_id.trim().toLowerCase());
      }
    }

    return {
      tenantId,
      regionsByCode,
      existingCodes,
      existingExternalSiteIds,
    };
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
    context: BuildingImportTenantContext,
  ): Promise<BuildingImportParseResult> {
    const format = detectUserImportFormat(buffer, filename, mimeType);
    const { headers, rows } = await parseFileToRows(buffer, format);

    const headerIndex = buildHeaderIndex(headers);
    const missing = missingRequiredColumns(headerIndex);
    if (missing.length > 0) {
      throw new BadRequestException(
        `Missing required columns: ${missing.join(', ')}`,
      );
    }

    const rawRows = parseTabularImportRows(headers, rows);
    const seenCodes = new Set<string>();
    const seenExternalIds = new Set<string>();
    const parsedRows: ParsedBuildingImportRow[] = rawRows.map((raw) =>
      this.validateRow(raw.rowNumber, raw.cells, context, seenCodes, seenExternalIds),
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
   * @param seenCodes - Codes already processed in this file
   * @param seenExternalIds - External site ids already processed in this file
   * @returns Fully validated import row
   */
  private validateRow(
    rowNumber: number,
    cells: Record<string, string>,
    context: BuildingImportTenantContext,
    seenCodes: Set<string>,
    seenExternalIds: Set<string>,
  ): ParsedBuildingImportRow {
    const name = cells.name?.trim() || null;
    const code = cells.code?.trim() || null;
    const address = cells.address?.trim() || null;
    const areaSqm = parseAreaSqm(cells.area_sqm);
    const regionCode = cells.region_code?.trim() || null;
    const countryCode = normalizeCountryCode(cells.country_code);
    const timezone = cells.timezone?.trim() || null;
    const externalSiteId = cells.external_site_id?.trim() || null;
    const rawSiteKind = cells.site_kind?.trim() || null;
    const siteKind = normalizeSiteKind(cells.site_kind);

    const errorCodes = collectFieldValidationErrors({
      name,
      code,
      areaSqm,
      countryCode,
      rawSiteKind,
      siteKind,
      timezone,
    });

    let resolvedRegionId: string | null = null;
    let status: BuildingImportRowStatus = 'valid';

    if (errorCodes.length === 0 && code) {
      const duplicateCode = detectDuplicateCode(code, context.existingCodes, seenCodes);
      if (duplicateCode) {
        errorCodes.push(duplicateCode);
      } else {
        seenCodes.add(code.toLowerCase());
      }
    }

    if (errorCodes.length === 0 && externalSiteId) {
      const duplicateExternal = detectDuplicateExternalSiteId(
        externalSiteId,
        context.existingExternalSiteIds,
        seenExternalIds,
      );
      if (duplicateExternal) {
        errorCodes.push(duplicateExternal);
      } else {
        seenExternalIds.add(externalSiteId.toLowerCase());
      }
    }

    if (errorCodes.length === 0 && regionCode) {
      const { regionId, error } = resolveRegionCode(regionCode, context.regionsByCode);
      if (error) {
        errorCodes.push(error);
      } else {
        resolvedRegionId = regionId;
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
      code,
      address,
      areaSqm: areaSqm !== null && !Number.isNaN(areaSqm) ? areaSqm : null,
      regionCode,
      countryCode,
      timezone,
      externalSiteId,
      siteKind,
      status,
      errorCodes,
      resolvedRegionId,
    };
  }
}

/**
 * Aggregates row status counts for preview summary.
 * @param rows - Validated import rows
 * @returns Summary totals
 */
export function summarizeRows(rows: ParsedBuildingImportRow[]): BuildingImportSummary {
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
