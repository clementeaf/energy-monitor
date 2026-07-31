import api from '../api';
import { API_ROUTES } from '../routes';
import type {
  ValidateUserImportResponse,
  UserImportJobDetailResponse,
  UserImportRowsResponse,
  UserImportJobsListResponse,
  CommitUserImportPayload,
  CommitUserImportResponse,
  UserImportRowsQueryParams,
} from '../../types/user-import';
import type {
  ValidateBuildingImportResponse,
  BuildingImportJobDetailResponse,
  BuildingImportRowsResponse,
  BuildingImportJobsListResponse,
  CommitBuildingImportResponse,
  BuildingImportRowsQueryParams,
} from '../../types/building-import';
import type {
  ValidateTenantUnitImportResponse,
  TenantUnitImportJobDetailResponse,
  TenantUnitImportRowsResponse,
  TenantUnitImportJobsListResponse,
  CommitTenantUnitImportResponse,
  TenantUnitImportRowsQueryParams,
} from '../../types/tenant-unit-import';
import type {
  ValidateMeterImportResponse,
  MeterImportJobDetailResponse,
  MeterImportRowsResponse,
  MeterImportJobsListResponse,
  CommitMeterImportResponse,
  MeterImportRowsQueryParams,
} from '../../types/meter-import';

export const userImportEndpoints = {
  downloadTemplate: () =>
    api.get<Blob>(API_ROUTES.usersImport.template, { responseType: 'blob' }),

  validate: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<ValidateUserImportResponse>(API_ROUTES.usersImport.validate, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  listJobs: (params?: { limit?: number; offset?: number }) =>
    api.get<UserImportJobsListResponse>(API_ROUTES.usersImport.base, { params }),

  getJob: (jobId: string) =>
    api.get<UserImportJobDetailResponse>(API_ROUTES.usersImport.job(jobId)),

  getRows: (jobId: string, params?: UserImportRowsQueryParams) =>
    api.get<UserImportRowsResponse>(API_ROUTES.usersImport.rows(jobId), { params }),

  commit: (jobId: string, payload: CommitUserImportPayload) =>
    api.post<CommitUserImportResponse>(API_ROUTES.usersImport.commit(jobId), payload),

  cancel: (jobId: string) =>
    api.delete(API_ROUTES.usersImport.job(jobId)),
};

export const buildingImportEndpoints = {
  downloadTemplate: () =>
    api.get<Blob>(API_ROUTES.buildingsImport.template, { responseType: 'blob' }),

  validate: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<ValidateBuildingImportResponse>(API_ROUTES.buildingsImport.validate, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  listJobs: (params?: { limit?: number; offset?: number }) =>
    api.get<BuildingImportJobsListResponse>(API_ROUTES.buildingsImport.base, { params }),

  getJob: (jobId: string) =>
    api.get<BuildingImportJobDetailResponse>(API_ROUTES.buildingsImport.job(jobId)),

  getRows: (jobId: string, params?: BuildingImportRowsQueryParams) =>
    api.get<BuildingImportRowsResponse>(API_ROUTES.buildingsImport.rows(jobId), { params }),

  commit: (jobId: string) =>
    api.post<CommitBuildingImportResponse>(API_ROUTES.buildingsImport.commit(jobId), {}),

  cancel: (jobId: string) =>
    api.delete(API_ROUTES.buildingsImport.job(jobId)),
};

export const tenantUnitImportEndpoints = {
  downloadTemplate: () =>
    api.get<Blob>(API_ROUTES.tenantUnitsImport.template, { responseType: 'blob' }),

  validate: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<ValidateTenantUnitImportResponse>(API_ROUTES.tenantUnitsImport.validate, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  listJobs: (params?: { limit?: number; offset?: number }) =>
    api.get<TenantUnitImportJobsListResponse>(API_ROUTES.tenantUnitsImport.base, { params }),

  getJob: (jobId: string) =>
    api.get<TenantUnitImportJobDetailResponse>(API_ROUTES.tenantUnitsImport.job(jobId)),

  getRows: (jobId: string, params?: TenantUnitImportRowsQueryParams) =>
    api.get<TenantUnitImportRowsResponse>(API_ROUTES.tenantUnitsImport.rows(jobId), { params }),

  commit: (jobId: string) =>
    api.post<CommitTenantUnitImportResponse>(API_ROUTES.tenantUnitsImport.commit(jobId), {}),

  cancel: (jobId: string) =>
    api.delete(API_ROUTES.tenantUnitsImport.job(jobId)),
};

export const meterImportEndpoints = {
  downloadTemplate: () =>
    api.get<Blob>(API_ROUTES.metersImport.template, { responseType: 'blob' }),

  validate: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<ValidateMeterImportResponse>(API_ROUTES.metersImport.validate, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  listJobs: (params?: { limit?: number; offset?: number }) =>
    api.get<MeterImportJobsListResponse>(API_ROUTES.metersImport.base, { params }),

  getJob: (jobId: string) =>
    api.get<MeterImportJobDetailResponse>(API_ROUTES.metersImport.job(jobId)),

  getRows: (jobId: string, params?: MeterImportRowsQueryParams) =>
    api.get<MeterImportRowsResponse>(API_ROUTES.metersImport.rows(jobId), { params }),

  commit: (jobId: string) =>
    api.post<CommitMeterImportResponse>(API_ROUTES.metersImport.commit(jobId), {}),

  cancel: (jobId: string) =>
    api.delete(API_ROUTES.metersImport.job(jobId)),
};
