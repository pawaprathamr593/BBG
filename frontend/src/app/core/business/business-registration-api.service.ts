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
  latitude: number | string | null;
  longitude: number | string | null;
  location_accuracy_m: number | string | null;
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
  location_accuracy_m: number | null;
}

export interface SubscriptionPlan {
  id: number;
  plan_code: string;
  plan_name: string;
  description: string | null;
  billing_cycle: string;
  price: string | number;
  currency: string;
}

export interface BusinessSubscription {
  id: number;
  plan_id: number;
  plan_name: string;
  billing_cycle: string;
  subscription_status: string;
  amount: string | number;
  currency: string;
  payment_qr_url?: string;
  payment_qr_version?: number;
  payment_payee_name?: string;
  payment_upi_id?: string;
  payment_instructions?: string;
  latest_proof_review_status?: string | null;
  latest_proof_submitted_on?: string | null;
  rejection_reason?: string | null;
}

export interface SubscriptionProofUpload {
  upload_url: string;
  object_key: string;
  method: 'PUT';
  headers: Record<string, string>;
  expires_in: number;
}

@Injectable({ providedIn: 'root' })
export class BusinessRegistrationApiService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  private get headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.accessToken() ?? ''}` });
  }

  async listActivePlans(): Promise<SubscriptionPlan[]> {
    const data = await this.subscriptionRequest<{ items: SubscriptionPlan[] }>(
      '/api/v1/subscriptions/plans/list',
      'listActivePlans',
      {},
    );
    return Array.isArray(data.items) ? data.items : [];
  }

  async getMySubscriptions(tenantId: number): Promise<BusinessSubscription[]> {
    const data = await this.subscriptionRequest<{ items: BusinessSubscription[] }>(
      '/api/v1/subscriptions/mine/list',
      'listMySubscriptions',
      { tenant_id: tenantId, page: 1, page_size: 20 },
    );
    return Array.isArray(data.items) ? data.items : [];
  }

  async getMySubscriptionDetail(tenantId: number, subscriptionId: number): Promise<BusinessSubscription> {
    return this.subscriptionRequest<BusinessSubscription>(
      '/api/v1/subscriptions/mine/detail',
      'getMySubscription',
      { tenant_id: tenantId, subscription_id: subscriptionId },
    );
  }

  async requestSubscription(tenantId: number, planId: number): Promise<{ id: number }> {
    return this.subscriptionRequest<{ id: number }>(
      '/api/v1/subscriptions/request',
      'requestSubscription',
      { tenant_id: tenantId, plan_id: planId },
    );
  }

  async generateProofUploadUrl(
    tenantId: number,
    subscriptionId: number,
    file: File,
  ): Promise<SubscriptionProofUpload> {
    return this.subscriptionRequest<SubscriptionProofUpload>(
      '/api/v1/subscriptions/proofs/upload-url',
      'generateSubscriptionProofUploadUrl',
      {
        tenant_id: tenantId,
        subscription_id: subscriptionId,
        original_file_name: file.name,
        mime_type: file.type,
        file_size_bytes: file.size,
      },
    );
  }

  async submitSubscriptionProof(
    tenantId: number,
    subscriptionId: number,
    proofFilePath: string,
    paymentReference: string,
  ): Promise<{ id: number }> {
    return this.subscriptionRequest<{ id: number }>(
      '/api/v1/subscriptions/proofs/submit',
      'submitSubscriptionProof',
      {
        tenant_id: tenantId,
        subscription_id: subscriptionId,
        proof_file_path: proofFilePath,
        payment_reference: paymentReference,
      },
    );
  }

  private async subscriptionRequest<T>(
    path: string,
    actionType: string,
    actionData: Record<string, unknown>,
  ): Promise<T> {
    const envelope = await firstValueFrom(this.http.post<BusinessApiResponse<T>>(
      `${this.apiBaseUrl}${path}`,
      { subscriptionParam: { actionType, actionData } },
      { headers: this.headers },
    ));
    if (envelope.status !== 'SUCCESS' || !envelope.data || Array.isArray(envelope.data)) {
      throw new Error(envelope.msgArr?.join(' ') || 'The subscription request could not be completed.');
    }
    return envelope.data as T;
  }

  async getMyApplications(): Promise<BusinessApplication[]> {
    const response = await firstValueFrom(this.http.post<BusinessApiResponse<BusinessApplication[]>>(
      `${this.apiBaseUrl}/api/v1/business/applications/mine/list`,
      { businessParam: { actionData: {} } },
      { headers: this.headers },
    ));
    if (response.status !== 'SUCCESS' || !Array.isArray(response.data)) {
      throw new Error(response.msgArr?.join(' ') || 'Unable to load your businesses.');
    }
    return response.data;
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
