import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../config/api-base-url';


export interface TenantMember {
  user_id: number;
  full_name: string;
  email: string;
  role_codes: string;
  joined_on: string;
}

export interface EligibleTenantUser {
  user_id: number;
  full_name: string;
  email: string;
}

export interface TenantInvitation {
  invitation_id: number;
  email: string;
  role_code: string;
  invitation_token: string;
  expires_on: string;
}

interface TenantApiResponse<T> {
  status: 'SUCCESS' | 'FAILED' | 'EXCEPTION';
  msgArr?: string[];
  data?: T | [];
}

@Injectable({ providedIn: 'root' })
export class TenantManagementApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);


  async listMembers(tenantId: number): Promise<TenantMember[]> {
    const response = await firstValueFrom(this.http.post<TenantApiResponse<{ items: TenantMember[] }>>(
      `${this.apiBaseUrl}/api/v1/tenants/members/owner-list`,
      { tenantParam: { actionData: { tenant_id: tenantId } } },
    ));
    if (response.status !== 'SUCCESS' || !response.data || Array.isArray(response.data)) {
      throw new Error(response.msgArr?.join(' ') || 'Unable to load team members.');
    }
    return (response.data as { items: TenantMember[] }).items ?? [];
  }

  async searchEligibleUsers(tenantId: number, email: string): Promise<EligibleTenantUser[]> {
    const response = await firstValueFrom(this.http.post<TenantApiResponse<{ items: EligibleTenantUser[] }>>(
      `${this.apiBaseUrl}/api/v1/tenants/members/search`,
      { tenantParam: { actionData: { tenant_id: tenantId, email } } },
    ));
    if (response.status !== 'SUCCESS' || !response.data || Array.isArray(response.data)) {
      throw new Error(response.msgArr?.join(' ') || 'Unable to search BBG users.');
    }
    return (response.data as { items: EligibleTenantUser[] }).items ?? [];
  }

  async addExistingUser(tenantId: number, userId: number): Promise<void> {
    const response = await firstValueFrom(this.http.post<TenantApiResponse<{ tenant_id: number; user_id: number }>>(
      `${this.apiBaseUrl}/api/v1/tenants/members/add`,
      { tenantParam: { actionData: { tenant_id: tenantId, user_id: userId, role_code: 'TENANT_ORDER_MANAGER' } } },
    ));
    if (response.status !== 'SUCCESS') {
      throw new Error(response.msgArr?.join(' ') || 'Unable to add this team member.');
    }
  }

  async createInvitation(tenantId: number, email: string): Promise<TenantInvitation> {
    const response = await firstValueFrom(this.http.post<TenantApiResponse<TenantInvitation>>(
      `${this.apiBaseUrl}/api/v1/tenants/invitations/create`,
      { tenantParam: { actionData: { tenant_id: tenantId, email, role_code: 'TENANT_ORDER_MANAGER' } } },
    ));
    if (response.status !== 'SUCCESS' || !response.data || Array.isArray(response.data)) {
      throw new Error(response.msgArr?.join(' ') || 'Unable to create the invitation.');
    }
    return response.data as TenantInvitation;
  }

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
