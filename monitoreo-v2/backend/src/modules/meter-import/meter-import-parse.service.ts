import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  buildHeaderIndex,
  hasBuildingReferenceColumn,
  missingRequiredColumns,
} from './meter-import-column-map';
import {
  normalizeLoadCategory,
  normalizePhaseType,
  parseIsActive,
  parseModbusAddress,
  parseTabularImportRows,
} from './meter-import.normalizer';
import {
  detectUserImportFormat,
  parseFileToRows,
} from '../user-import/user-import.parser';
import {
  detectDuplicateCode,
  detectDuplicateExternalId,
  resolveBuildingRef,
  resolveHierarchyNode,
  resolveParentMeter,
} from './meter-import.resolver';
import type {
  MeterImportHierarchyRef,
  MeterImportMeterRef,
  MeterImportParseResult,
  MeterImportRowStatus,
  MeterImportSummary,
  MeterImportTenantContext,
  ParsedMeterImportRow,
} from './meter-import.types';
import { collectFieldValidationErrors } from './meter-import.validator';

interface DbBuildingRow {
  id: string;
  code: string;
  external_site_id: string | null;
}

interface DbMeterRow {
  id: string;
  code: string;
  building_id: string;
  external_id: string | null;
}

interface DbHierarchyRow {
  id: string;
  building_id: string;
  name: string;
}

/**
 * Parses and validates meter import files against tenant catalogs.
 */
@Injectable()
export class MeterImportParseService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Loads tenant-scoped building, meter, and hierarchy catalogs.
   * @param tenantId - Target tenant UUID
   * @returns Import validation context
   */
  async loadTenantContext(tenantId: string): Promise<MeterImportTenantContext> {
    const [buildingRows, meterRows, hierarchyRows] = await Promise.all([
      this.dataSource.query<DbBuildingRow[]>(
        `SELECT id, code, external_site_id FROM buildings WHERE tenant_id = $1 AND is_active = true`,
        [tenantId],
      ),
      this.dataSource.query<DbMeterRow[]>(
        `SELECT id, code, building_id, external_id FROM meters WHERE tenant_id = $1`,
        [tenantId],
      ),
      this.dataSource.query<DbHierarchyRow[]>(
        `SELECT id, building_id, name FROM building_hierarchy WHERE tenant_id = $1`,
        [tenantId],
      ),
    ]);

    const buildings = buildingRows.map((row) => ({
      id: row.id,
      code: row.code,
      externalSiteId: row.external_site_id,
    }));

    const existingCodes = new Set<string>();
    const existingExternalIds = new Set<string>();
    const metersByBuildingCode = new Map<string, MeterImportMeterRef>();

    for (const row of meterRows) {
      existingCodes.add(row.code.toLowerCase());
      metersByBuildingCode.set(`${row.building_id}|${row.code.toLowerCase()}`, {
        id: row.id,
        code: row.code,
        buildingId: row.building_id,
      });
      if (row.external_id?.trim()) {
        existingExternalIds.add(row.external_id.trim().toLowerCase());
      }
    }

    const hierarchyByBuildingName = new Map<string, MeterImportHierarchyRef[]>();
    for (const row of hierarchyRows) {
      const key = `${row.building_id}|${row.name.trim().toLowerCase()}`;
      const list = hierarchyByBuildingName.get(key) ?? [];
      list.push({ id: row.id, buildingId: row.building_id, name: row.name });
      hierarchyByBuildingName.set(key, list);
    }

    return {
      tenantId,
      buildings,
      existingCodes,
      existingExternalIds,
      metersByBuildingCode,
      hierarchyByBuildingName,
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
    context: MeterImportTenantContext,
  ): Promise<MeterImportParseResult> {
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
    const seenCodes = new Set<string>();
    const seenExternalIds = new Set<string>();

    const preliminaryRows = rawRows.map((raw) =>
      this.parseRowFields(raw.rowNumber, raw.cells),
    );

    const codesInFile = new Set<string>();
    for (const row of preliminaryRows) {
      if (row.code) {
        codesInFile.add(row.code.toLowerCase());
      }
    }

    const parsedRows: ParsedMeterImportRow[] = preliminaryRows.map((fields) =>
      this.validateRow(fields, context, seenCodes, seenExternalIds, codesInFile),
    );

    return {
      format,
      rows: parsedRows,
      summary: summarizeRows(parsedRows),
    };
  }

  /**
   * Parses canonical cell values for a single row.
   * @param rowNumber - 1-based row index
   * @param cells - Canonical column values
   * @returns Parsed field values before cross-row validation
   */
  private parseRowFields(rowNumber: number, cells: Record<string, string>): {
    rowNumber: number;
    rawCells: Record<string, string>;
    name: string | null;
    code: string | null;
    buildingCode: string | null;
    externalSiteId: string | null;
    meterType: string | null;
    model: string | null;
    serialNumber: string | null;
    phaseType: ParsedMeterImportRow['phaseType'];
    loadCategory: ParsedMeterImportRow['loadCategory'];
    parentMeterCode: string | null;
    hierarchyNodeName: string | null;
    modbusAddress: number | null;
    busId: string | null;
    uplinkRoute: string | null;
    externalId: string | null;
    isActive: boolean | null;
    rawPhaseType: string | null;
    rawLoadCategory: string | null;
    rawModbusAddress: string | null;
    rawIsActive: string | null;
  } {
    const modbusAddress = parseModbusAddress(cells.modbus_address);

    return {
      rowNumber,
      rawCells: cells,
      name: cells.name?.trim() || null,
      code: cells.code?.trim() || null,
      buildingCode: cells.building_code?.trim() || null,
      externalSiteId: cells.external_site_id?.trim() || null,
      meterType: cells.meter_type?.trim() || null,
      model: cells.model?.trim() || null,
      serialNumber: cells.serial_number?.trim() || null,
      phaseType: normalizePhaseType(cells.phase_type),
      loadCategory: normalizeLoadCategory(cells.load_category),
      parentMeterCode: cells.parent_meter_code?.trim() || null,
      hierarchyNodeName: cells.hierarchy_node_name?.trim() || null,
      modbusAddress,
      busId: cells.bus_id?.trim() || null,
      uplinkRoute: cells.uplink_route?.trim() || null,
      externalId: cells.external_id?.trim() || null,
      isActive: parseIsActive(cells.is_active),
      rawPhaseType: cells.phase_type?.trim() || null,
      rawLoadCategory: cells.load_category?.trim() || null,
      rawModbusAddress: cells.modbus_address?.trim() || null,
      rawIsActive: cells.is_active?.trim() || null,
    };
  }

  /**
   * Validates a single normalized row against tenant rules.
   * @param fields - Parsed field values
   * @param context - Tenant import context
   * @param seenCodes - Codes already processed in this file
   * @param seenExternalIds - External ids already processed in this file
   * @param codesInFile - All meter codes in file (lowercase)
   * @returns Fully validated import row
   */
  private validateRow(
    fields: ReturnType<MeterImportParseService['parseRowFields']>,
    context: MeterImportTenantContext,
    seenCodes: Set<string>,
    seenExternalIds: Set<string>,
    codesInFile: Set<string>,
  ): ParsedMeterImportRow {
    const errorCodes = collectFieldValidationErrors({
      name: fields.name,
      code: fields.code,
      buildingCode: fields.buildingCode,
      externalSiteId: fields.externalSiteId,
      rawPhaseType: fields.rawPhaseType,
      phaseType: fields.phaseType,
      rawLoadCategory: fields.rawLoadCategory,
      loadCategory: fields.loadCategory,
      modbusAddress: fields.modbusAddress,
      rawModbusAddress: fields.rawModbusAddress,
      rawIsActive: fields.rawIsActive,
      isActive: fields.isActive,
    });

    let resolvedBuildingId: string | null = null;
    let resolvedParentMeterId: string | null = null;
    let resolvedHierarchyNodeId: string | null = null;
    let parentPendingInFile = false;
    let status: MeterImportRowStatus = 'valid';

    if (errorCodes.length === 0) {
      const { buildingId, error } = resolveBuildingRef(
        fields.buildingCode,
        fields.externalSiteId,
        context.buildings,
      );
      if (error || !buildingId) {
        errorCodes.push(error ?? 'BUILDING_NOT_FOUND');
      } else {
        resolvedBuildingId = buildingId;
      }
    }

    if (errorCodes.length === 0 && fields.code) {
      const duplicateCode = detectDuplicateCode(fields.code, context.existingCodes, seenCodes);
      if (duplicateCode) {
        errorCodes.push(duplicateCode);
      } else {
        seenCodes.add(fields.code.toLowerCase());
      }
    }

    if (errorCodes.length === 0 && fields.externalId) {
      const duplicateExternal = detectDuplicateExternalId(
        fields.externalId,
        context.existingExternalIds,
        seenExternalIds,
      );
      if (duplicateExternal) {
        errorCodes.push(duplicateExternal);
      } else {
        seenExternalIds.add(fields.externalId.toLowerCase());
      }
    }

    if (errorCodes.length === 0) {
      const parentResult = resolveParentMeter(
        fields.parentMeterCode,
        fields.code,
        resolvedBuildingId,
        context.metersByBuildingCode,
        codesInFile,
      );
      if (parentResult.error) {
        errorCodes.push(parentResult.error);
      } else {
        resolvedParentMeterId = parentResult.parentMeterId;
        parentPendingInFile = parentResult.parentPendingInFile;
      }
    }

    if (errorCodes.length === 0) {
      const hierarchyResult = resolveHierarchyNode(
        fields.hierarchyNodeName,
        resolvedBuildingId,
        context.hierarchyByBuildingName,
      );
      if (hierarchyResult.error) {
        errorCodes.push(hierarchyResult.error);
      } else {
        resolvedHierarchyNodeId = hierarchyResult.hierarchyNodeId;
      }
    }

    if (errorCodes.some((c) => c.startsWith('DUPLICATE_'))) {
      status = 'duplicate';
    } else if (errorCodes.length > 0) {
      status = 'error';
    }

    const {
      rawPhaseType: _rawPhaseType,
      rawLoadCategory: _rawLoadCategory,
      rawModbusAddress: _rawModbusAddress,
      rawIsActive: _rawIsActive,
      ...rest
    } = fields;

    return {
      ...rest,
      status,
      errorCodes,
      resolvedBuildingId,
      resolvedParentMeterId,
      resolvedHierarchyNodeId,
      parentPendingInFile,
    };
  }
}

/**
 * Aggregates row status counts for preview summary.
 * @param rows - Validated import rows
 * @returns Summary totals
 */
export function summarizeRows(rows: ParsedMeterImportRow[]): MeterImportSummary {
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
