import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../config/api-base-url';

export interface DashboardPermission {
  role_code: string;
  scope_type: 'PLATFORM' | 'TENANT' | string;
  permission_code: string | null;
  module_code: string | null;
}

export interface DashboardTenant {
  id: number;
  tenant_code: string;
  tenant_name: string;
  tenant_type: string;
  tenant_status: string;
  membership_status: string;
  role_codes: string | null;
  active_entitlements: string | null;
}

export interface DashboardApiResponse<T> {
  status: 'SUCCESS' | 'FAILED' | 'EXCEPTION';
  msgArr: string[];
  data: T | [];
}

@Injectable({ providedIn: 'root' })
export class DashboardApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  async getPermissions(tenantId = 0): Promise<DashboardPermission[]> {
    const response = await firstValueFrom(this.http.post<DashboardApiResponse<{ tenant_id: number | null; permissions: DashboardPermission[] }>>(
      `${this.apiBaseUrl}/api/v1/auth/permissions`,
      { authParam: { actionType: 'getPermissions', actionData: { tenant_id: tenantId } } },
    ));
    if (response.status !== 'SUCCESS' || !response.data || Array.isArray(response.data)) {
      throw new Error(response.msgArr?.join(' ') || 'Unable to load access permissions.');
    }
    return response.data.permissions ?? [];
  }

  async getMyTenants(): Promise<DashboardTenant[]> {
    const response = await firstValueFrom(this.http.post<DashboardApiResponse<{ items: DashboardTenant[] }>>(
      `${this.apiBaseUrl}/api/v1/tenants/mine/list`,
      { tenantParam: { actionType: 'listMyTenants', actionData: { page: 1, page_size: 50 } } },
    ));
    if (response.status !== 'SUCCESS' || !response.data || Array.isArray(response.data)) {
      throw new Error(response.msgArr?.join(' ') || 'Unable to load your business workspaces.');
    }
    return (response.data.items ?? []).map((tenant) => ({
      ...tenant,
      id: Number(tenant.id),
      tenant_name: String(tenant.tenant_name ?? '').trim(),
    })).filter((tenant) => Number.isInteger(tenant.id) && tenant.id > 0);
  }

  async getConsumerSummary(): Promise<Record<string, number>> {
    const response = await firstValueFrom(this.http.post<DashboardApiResponse<Record<string, number>>>(
      `${this.apiBaseUrl}/api/v1/dashboard/consumer/summary`,
      { dashboardParam: { actionData: {} } },
    ));
    if (response.status !== 'SUCCESS' || !response.data || Array.isArray(response.data)) {
      throw new Error(response.msgArr?.join(' ') || 'Consumer summary is unavailable.');
    }
    return response.data;
  }

  async getTenantSummary(tenantId: number): Promise<Record<string, string | number | null>> {
    const response = await firstValueFrom(this.http.post<DashboardApiResponse<Record<string, string | number | null>>>(
      `${this.apiBaseUrl}/api/v1/dashboard/entrepreneur/summary`,
      { dashboardParam: { actionData: { tenant_id: tenantId } } },
    ));
    if (response.status !== 'SUCCESS' || !response.data || Array.isArray(response.data)) {
      throw new Error(response.msgArr?.join(' ') || 'Business summary is unavailable for this workspace.');
    }
    return response.data;
  }
}
