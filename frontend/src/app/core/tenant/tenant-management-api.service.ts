import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../config/api-base-url';

interface TenantApiResponse<T> {
  status: 'SUCCESS' | 'FAILED' | 'EXCEPTION';
  msgArr?: string[];
  data?: T | [];
}

@Injectable({ providedIn: 'root' })
export class TenantManagementApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  async acceptInvitation(invitationToken: string): Promise<number> {
    const response = await firstValueFrom(this.http.post<TenantApiResponse<{ tenant_id: number }>>(
      `${this.apiBaseUrl}/api/v1/tenants/invitations/accept`,
      { tenantParam: { actionData: { invitation_token: invitationToken } } },
    ));
    if (response.status !== 'SUCCESS' || !response.data || Array.isArray(response.data)) {
      throw new Error(response.msgArr?.join(' ') || 'The invitation could not be accepted.');
    }
    const tenantId = Number(response.data.tenant_id ?? 0);
    if (!Number.isInteger(tenantId) || tenantId < 1) {
      throw new Error('The invitation was accepted but the workspace could not be identified.');
    }
    return tenantId;
  }
}
