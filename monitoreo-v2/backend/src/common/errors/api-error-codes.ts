/**
 * Central API error code catalog (GAP-202).
 * Source of truth for HTTP error responses across modules.
 */
export enum ApiErrorCode {
  AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED',
  AUTH_MFA_REQUIRED = 'AUTH_MFA_REQUIRED',
  AUTH_SSO_DISABLED = 'AUTH_SSO_DISABLED',
  AUTH_FORBIDDEN = 'AUTH_FORBIDDEN',
  AUTH_CROSS_TENANT = 'AUTH_CROSS_TENANT',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  DATA_CONTRACT_MISMATCH = 'DATA_CONTRACT_MISMATCH',
  EXPORT_SCOPE_MISSING = 'EXPORT_SCOPE_MISSING',
  INGEST_DUPLICATE = 'INGEST_DUPLICATE',
  INGEST_METER_FORBIDDEN = 'INGEST_METER_FORBIDDEN',
  BILLING_TARIFF_INVALID = 'BILLING_TARIFF_INVALID',
  BILLING_INVOICE_STATUS = 'BILLING_INVOICE_STATUS',
  OAUTH_CLIENT_INVALID = 'OAUTH_CLIENT_INVALID',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export interface ApiErrorDefinition {
  code: ApiErrorCode;
  httpStatus: number;
  message: string;
  module: string;
}

export const API_ERROR_CATALOG: readonly ApiErrorDefinition[] = [
  {
    code: ApiErrorCode.AUTH_INVALID_CREDENTIALS,
    httpStatus: 401,
    message: 'Authentication failed.',
    module: 'auth',
  },
  {
    code: ApiErrorCode.AUTH_TOKEN_EXPIRED,
    httpStatus: 401,
    message: 'Invalid or expired refresh token.',
    module: 'auth',
  },
  {
    code: ApiErrorCode.AUTH_MFA_REQUIRED,
    httpStatus: 401,
    message: 'Invalid MFA code.',
    module: 'auth',
  },
  {
    code: ApiErrorCode.AUTH_SSO_DISABLED,
    httpStatus: 400,
    message: 'SSO is not enabled for this tenant.',
    module: 'auth',
  },
  {
    code: ApiErrorCode.AUTH_FORBIDDEN,
    httpStatus: 403,
    message: 'Missing permission.',
    module: 'auth',
  },
  {
    code: ApiErrorCode.AUTH_CROSS_TENANT,
    httpStatus: 403,
    message: 'Cross-tenant access denied.',
    module: 'auth',
  },
  {
    code: ApiErrorCode.VALIDATION_FAILED,
    httpStatus: 400,
    message: 'Request validation failed.',
    module: 'common',
  },
  {
    code: ApiErrorCode.RESOURCE_NOT_FOUND,
    httpStatus: 404,
    message: 'Resource not found.',
    module: 'common',
  },
  {
    code: ApiErrorCode.RESOURCE_CONFLICT,
    httpStatus: 409,
    message: 'Resource conflict.',
    module: 'common',
  },
  {
    code: ApiErrorCode.RATE_LIMIT_EXCEEDED,
    httpStatus: 429,
    message: 'Too many requests.',
    module: 'common',
  },
  {
    code: ApiErrorCode.DATA_CONTRACT_MISMATCH,
    httpStatus: 400,
    message: 'Data contract version mismatch.',
    module: 'data-governance',
  },
  {
    code: ApiErrorCode.EXPORT_SCOPE_MISSING,
    httpStatus: 403,
    message: 'Missing permission: readings:export',
    module: 'external-api',
  },
  {
    code: ApiErrorCode.INGEST_DUPLICATE,
    httpStatus: 409,
    message: 'Duplicate measurement.',
    module: 'readings',
  },
  {
    code: ApiErrorCode.INGEST_METER_FORBIDDEN,
    httpStatus: 403,
    message: 'Meter not accessible for this API key.',
    module: 'readings',
  },
  {
    code: ApiErrorCode.BILLING_TARIFF_INVALID,
    httpStatus: 400,
    message: 'Tariff not found or has no blocks configured.',
    module: 'invoices',
  },
  {
    code: ApiErrorCode.BILLING_INVOICE_STATUS,
    httpStatus: 400,
    message: 'Invoice cannot be updated in current status.',
    module: 'invoices',
  },
  {
    code: ApiErrorCode.OAUTH_CLIENT_INVALID,
    httpStatus: 401,
    message: 'Invalid client credentials.',
    module: 'oauth-clients',
  },
  {
    code: ApiErrorCode.INTERNAL_ERROR,
    httpStatus: 500,
    message: 'Internal server error.',
    module: 'common',
  },
];

/**
 * Looks up an error definition by code.
 */
export function getApiErrorDefinition(code: ApiErrorCode): ApiErrorDefinition | undefined {
  return API_ERROR_CATALOG.find((entry) => entry.code === code);
}
