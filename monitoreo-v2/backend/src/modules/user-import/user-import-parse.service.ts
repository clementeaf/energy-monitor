import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { decryptPii, hmacPii, isPiiEncrypted } from '../../common/crypto/pii-encryption';
import {
  buildHeaderIndex,
  missingRequiredColumns,
} from './user-import-column-map';
import {
  normalizeAuthProvider,
  normalizeEmail,
  parseTabularImportRows,
  splitBuildingCodes,
} from './user-import.normalizer';
import {
  detectUserImportFormat,
  parseFileToRows,
} from './user-import.parser';
import {
  detectDuplicateEmail,
  resolveBuildingCodes,
  resolveRoleSlug,
  validateRoleHierarchy,
} from './user-import.resolver';
import type {
  ParsedUserImportRow,
  UserImportBuildingRef,
  UserImportParseResult,
  UserImportRoleRef,
  UserImportRowStatus,
  UserImportSummary,
  UserImportTenantContext,
} from './user-import.types';
import { collectFieldValidationErrors } from './user-import.validator';

interface DbRoleRow {
  id: string;
  slug: string;
  name: string;
  hierarchy_level: number;
}

interface DbBuildingRow {
  id: string;
  code: string;
  name: string;
  external_site_id: string | null;
}

interface DbUserEmailRow {
  email: string;
  email_hmac: string | null;
}

/**
 * Parses and validates user import files without persisting jobs (IMP-020).
 */
@Injectable()
export class UserImportParseService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Loads tenant-scoped catalogs for role/building resolution and duplicate detection.
   * @param tenantId - Target tenant UUID
   * @param creatorRoleId - Creating user role UUID
   * @param creatorRoleSlug - Creating user role slug
   * @returns Import validation context
   */
  async loadTenantContext(
    tenantId: string,
    creatorRoleId: string,
    creatorRoleSlug: string,
  ): Promise<UserImportTenantContext> {
    const [creatorRows, roleRows, buildingRows, userRows] = await Promise.all([
      this.dataSource.query<{ hierarchy_level: number }[]>(
        `SELECT hierarchy_level FROM roles WHERE id = $1 LIMIT 1`,
        [creatorRoleId],
      ),
      this.dataSource.query<DbRoleRow[]>(
        `SELECT id, slug, name, hierarchy_level
         FROM roles
         WHERE tenant_id = $1 AND is_active = true`,
        [tenantId],
      ),
      this.dataSource.query<DbBuildingRow[]>(
        `SELECT id, code, name, external_site_id
         FROM buildings
         WHERE tenant_id = $1 AND is_active = true`,
        [tenantId],
      ),
      this.dataSource.query<DbUserEmailRow[]>(
        `SELECT email, email_hmac FROM users WHERE tenant_id = $1`,
        [tenantId],
      ),
    ]);

    const creatorHierarchyLevel = creatorRows[0]?.hierarchy_level ?? 99;

    const rolesBySlug = new Map<string, UserImportRoleRef>();
    for (const row of roleRows) {
      rolesBySlug.set(row.slug.toLowerCase(), {
        id: row.id,
        slug: row.slug,
        name: row.name,
        hierarchyLevel: row.hierarchy_level,
      });
    }

    const buildings: UserImportBuildingRef[] = buildingRows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      externalSiteId: row.external_site_id,
    }));

    const existingEmails = this.buildExistingEmailSet(userRows);

    return {
      tenantId,
      creatorRoleId,
      creatorRoleSlug,
      creatorHierarchyLevel,
      rolesBySlug,
      buildings,
      existingEmails,
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
    context: UserImportTenantContext,
  ): Promise<UserImportParseResult> {
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
    const seenInFile = new Set<string>();
    const parsedRows: ParsedUserImportRow[] = rawRows.map((raw) =>
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
   * @param seenInFile - Emails already processed in this file
   * @returns Fully validated import row
   */
  private validateRow(
    rowNumber: number,
    cells: Record<string, string>,
    context: UserImportTenantContext,
    seenInFile: Set<string>,
  ): ParsedUserImportRow {
    const email = normalizeEmail(cells.email);
    const authProvider = normalizeAuthProvider(cells.auth_provider);
    const roleSlug = cells.role_slug?.trim().toLowerCase() ?? null;
    const displayName = cells.display_name?.trim() || null;
    const buildingCodesRaw = cells.building_codes?.trim() || null;
    const buildingCodes = splitBuildingCodes(buildingCodesRaw ?? undefined);
    const phoneRaw = cells.phone?.trim() || null;
    const phone = phoneRaw ? phoneRaw.replace(/\s/g, '') : null;

    const errorCodes = collectFieldValidationErrors({
      email,
      authProvider,
      roleSlug,
      phone,
    });

    let resolvedRoleId: string | null = null;
    let resolvedBuildingIds: string[] = [];
    let status: UserImportRowStatus = 'valid';

    if (errorCodes.length === 0 && email && roleSlug) {
      const duplicateError = detectDuplicateEmail(email, context.existingEmails, seenInFile);
      if (duplicateError) {
        errorCodes.push(duplicateError);
      } else {
        seenInFile.add(email);
      }
    }

    if (errorCodes.length === 0 && roleSlug) {
      const { role, error: roleError } = resolveRoleSlug(roleSlug, context.rolesBySlug);
      if (roleError || !role) {
        errorCodes.push(roleError ?? 'ROLE_NOT_FOUND');
      } else {
        const hierarchyError = validateRoleHierarchy(context, role);
        if (hierarchyError) {
          errorCodes.push(hierarchyError);
        } else {
          resolvedRoleId = role.id;
        }
      }
    }

    if (errorCodes.length === 0 && buildingCodes.length > 0) {
      const { buildingIds, error: buildingError } = resolveBuildingCodes(
        buildingCodes,
        context.buildings,
      );
      if (buildingError) {
        errorCodes.push(buildingError);
      } else {
        resolvedBuildingIds = buildingIds;
      }
    }

    if (errorCodes.some((code) => code === 'DUPLICATE_EMAIL' || code === 'DUPLICATE_EMAIL_IN_FILE')) {
      status = 'duplicate';
    } else if (errorCodes.length > 0) {
      status = 'error';
    }

    return {
      rowNumber,
      rawCells: cells,
      email,
      displayName,
      authProvider,
      roleSlug,
      buildingCodes,
      buildingCodesRaw,
      phone,
      status,
      errorCodes,
      resolvedRoleId,
      resolvedBuildingIds,
    };
  }

  /**
   * Builds a lowercase email set from tenant users (plain + HMAC index).
   * @param rows - User email rows from DB
   * @returns Set of normalized emails
   */
  private buildExistingEmailSet(rows: DbUserEmailRow[]): Set<string> {
    const emails = new Set<string>();
    for (const row of rows) {
      const plain = isPiiEncrypted(row.email) ? decryptPii(row.email) : row.email;
      emails.add(plain.toLowerCase().trim());
    }
    return emails;
  }
}

/**
 * Aggregates row status counts for preview summary.
 * @param rows - Validated import rows
 * @returns Summary totals
 */
export function summarizeRows(rows: ParsedUserImportRow[]): UserImportSummary {
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
