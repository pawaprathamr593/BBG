import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../config/api-base-url';
import { AuthService } from '../auth/auth.service';

export interface BusinessApplication {
  business_id: number;
  tenant_id: number;
  business_name: string;
  business_slug: string;
  business_description: string | null;
  primary_category_id: number | null;
  business_phone: string;
  whatsapp_number: string;
  business_email: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  postal_code: string;
  country_code: string;
  latitude: number | null;
  longitude: number | null;
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  approved_on: string | null;
  rejection_reason: string | null;
  publication_status: string;
  tenant_name: string;
  tenant_status: string;
}

interface BusinessApiResponse<T> {
  status: 'SUCCESS' | 'FAILED' | 'EXCEPTION';
  msgArr: string[];
  data: T | [];
}

export interface BusinessApplicationPayload {
  business_name: string;
  business_slug: string;
  tenant_type: 'BUSINESS';
  business_description: string;
  business_phone: string;
  whatsapp_number: string;
  business_email: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  postal_code: string;
  country_code: string;
  latitude: number | null;
  longitude: number | null;
}

@Injectable({ providedIn: 'root' })
export class BusinessRegistrationApiService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  private get headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.accessToken() ?? ''}` });
  }


  async getMyApplications(): Promise<BusinessApplication[]> {
    const response = await firstValueFrom(this.http.post<BusinessApiResponse<{ items: BusinessApplication[] }>>(
      `${this.apiBaseUrl}/api/v1/business/application/list`,
      { businessParam: { actionData: {} } },
      { headers: this.headers },
    ));
    if (response.status !== 'SUCCESS' || !response.data || Array.isArray(response.data)) {
      throw new Error(response.msgArr?.join(' ') || 'Unable to load your business applications.');
    }
    return (response.data as { items: BusinessApplication[] }).items ?? [];
  }

  async getMyApplication(tenantId = 0): Promise<BusinessApplication | null> {
    try {
      const response = await firstValueFrom(this.http.post<BusinessApiResponse<BusinessApplication>>(
        `${this.apiBaseUrl}/api/v1/business/application/get`,
        { businessParam: { actionData: tenantId > 0 ? { tenant_id: tenantId } : {} } },
        { headers: this.headers },
      ));
      if (response.status !== 'SUCCESS' || !response.data || Array.isArray(response.data)) {
        throw new Error(response.msgArr?.join(' ') || 'Unable to load your business application.');
      }
      return response.data as BusinessApplication;
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 400) {
        const messages = Array.isArray(error.error?.msgArr) ? error.error.msgArr.join(' ') : '';
        if (messages.includes('No business application is associated')) return null;
      }
      throw error;
    }
  }

  async submitApplication(payload: BusinessApplicationPayload): Promise<{ business_id: number; tenant_id: number; approval_status: string }> {
    const response = await firstValueFrom(this.http.post<BusinessApiResponse<{ business_id: number; tenant_id: number; approval_status: string }>>(
      `${this.apiBaseUrl}/api/v1/business/application/submit`,
      { businessParam: { actionData: payload } },
      { headers: this.headers },
    ));
    if (response.status !== 'SUCCESS' || !response.data || Array.isArray(response.data)) {
      throw new Error(response.msgArr?.join(' ') || 'Your business application could not be submitted.');
    }
    return response.data as { business_id: number; tenant_id: number; approval_status: string };
  }
}
