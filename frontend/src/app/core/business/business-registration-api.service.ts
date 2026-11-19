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



export interface StorefrontSettings {
  id: number;
  tenant_id: number;
  storefront_title: string | null;
  storefront_description: string | null;
  theme_code: string | null;
  show_prices: number | boolean;
  accept_online_orders: number | boolean;
  whatsapp_enabled: number | boolean;
  whatsapp_number: string | null;
  storefront_status: 'ACTIVE' | 'INACTIVE';
  publication_status: 'PUBLISHED' | 'DRAFT';
  approval_status: 'APPROVED' | string;
}

export interface OwnedStorefront {
  business: BusinessApplication;
  storefront: StorefrontSettings;
}

export interface StorefrontUpdatePayload {
  storefront_title: string;
  storefront_description: string;
  theme_code: string;
  show_prices: boolean;
  accept_online_orders: boolean;
  whatsapp_enabled: boolean;
  whatsapp_number: string;
}

export interface SubscriptionPlan {
  id: number;
  plan_code: string;
  plan_name: string;
  description: string | null;
  billing_cycle: string;
  price: string | number;
  currency: string;
  entitlements: string | null;
}

export interface ApplicationSubscription {
  id: number;
  plan_id: number;
  plan_name: string;
  billing_cycle: string;
  subscription_status: string;
  rejection_reason?: string | null;
  amount: string | number;
  currency: string;
  payment_payee_name: string;
  payment_upi_id: string;
  payment_qr_url: string | null;
  payment_instructions: string | null;
}

interface UploadUrlResponse {
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



  async getOwnedStorefront(tenantId: number): Promise<OwnedStorefront> {
    const response = await firstValueFrom(this.http.post<BusinessApiResponse<OwnedStorefront>>(
      `${this.apiBaseUrl}/api/v1/business/storefront/owner/get`,
      { businessParam: { actionData: { tenant_id: tenantId } } },
      { headers: this.headers },
    ));
    if (response.status !== 'SUCCESS' || !response.data || Array.isArray(response.data)) {
      throw new Error(response.msgArr?.join(' ') || 'Unable to load storefront settings.');
    }
    return response.data as OwnedStorefront;
  }

  async updateOwnedStorefront(tenantId: number, payload: StorefrontUpdatePayload): Promise<void> {
    const response = await firstValueFrom(this.http.post<BusinessApiResponse<{ tenant_id: number }>>(
      `${this.apiBaseUrl}/api/v1/business/storefront/owner/update`,
      { businessParam: { actionData: { tenant_id: tenantId, ...payload } } },
      { headers: this.headers },
    ));
    if (response.status !== 'SUCCESS') {
      throw new Error(response.msgArr?.join(' ') || 'Unable to save storefront settings.');
    }
  }

  async publishOwnedStorefront(tenantId: number): Promise<{ publication_status: string; storefront_status: string }> {
    const response = await firstValueFrom(this.http.post<BusinessApiResponse<{ tenant_id: number; publication_status: string; storefront_status: string }>>(
      `${this.apiBaseUrl}/api/v1/business/storefront/owner/publish`,
      { businessParam: { actionData: { tenant_id: tenantId } } },
      { headers: this.headers },
    ));
    if (response.status !== 'SUCCESS' || !response.data || Array.isArray(response.data)) {
      throw new Error(response.msgArr?.join(' ') || 'Unable to publish the storefront.');
    }
    return response.data as { tenant_id: number; publication_status: string; storefront_status: string };
  }

  async unpublishOwnedStorefront(tenantId: number): Promise<{ publication_status: string; storefront_status: string }> {
    const response = await firstValueFrom(this.http.post<BusinessApiResponse<{ tenant_id: number; publication_status: string; storefront_status: string }>>(
      `${this.apiBaseUrl}/api/v1/business/storefront/owner/unpublish`,
      { businessParam: { actionData: { tenant_id: tenantId } } },
      { headers: this.headers },
    ));
    if (response.status !== 'SUCCESS' || !response.data || Array.isArray(response.data)) {
      throw new Error(response.msgArr?.join(' ') || 'Unable to unpublish the storefront.');
    }
    return response.data as { tenant_id: number; publication_status: string; storefront_status: string };
  }

  async saveDraft(payload: BusinessApplicationPayload, businessId?: number, tenantId?: number): Promise<{ business_id: number; tenant_id: number; approval_status: string }> {
    const response = await firstValueFrom(this.http.post<BusinessApiResponse<{ business_id: number; tenant_id: number; approval_status: string }>>(
      `${this.apiBaseUrl}/api/v1/business/application/draft/save`,
      { businessParam: { actionData: { ...payload, ...(businessId ? { business_id: businessId, tenant_id: tenantId } : {}) } } },
      { headers: this.headers },
    ));
    if (response.status !== 'SUCCESS' || !response.data || Array.isArray(response.data)) {
      throw new Error(response.msgArr?.join(' ') || 'Your business draft could not be saved.');
    }
    return response.data as { business_id: number; tenant_id: number; approval_status: string };
  }

  async getActivePlans(): Promise<SubscriptionPlan[]> {
    const response = await firstValueFrom(this.http.post<BusinessApiResponse<{ items: SubscriptionPlan[] }>>(
      `${this.apiBaseUrl}/api/v1/subscriptions/plans/list`,
      { subscriptionParam: { actionData: {} } },
      { headers: this.headers },
    ));
    if (response.status !== 'SUCCESS' || !response.data || Array.isArray(response.data)) {
      throw new Error(response.msgArr?.join(' ') || 'Unable to load subscription plans.');
    }
    return (response.data as { items: SubscriptionPlan[] }).items ?? [];
  }


  async getCurrentApplicationSubscription(businessId: number, tenantId: number): Promise<ApplicationSubscription | null> {
    const response = await firstValueFrom(this.http.post<BusinessApiResponse<{ subscription: ApplicationSubscription | null }>>(
      `${this.apiBaseUrl}/api/v1/subscriptions/application/current`,
      { subscriptionParam: { actionData: { business_id: businessId, tenant_id: tenantId } } },
      { headers: this.headers },
    ));
    if (response.status !== 'SUCCESS' || !response.data || Array.isArray(response.data)) {
      throw new Error(response.msgArr?.join(' ') || 'Unable to restore your payment request.');
    }
    return (response.data as { subscription: ApplicationSubscription | null }).subscription ?? null;
  }

  async requestApplicationSubscription(businessId: number, tenantId: number, planId: number): Promise<ApplicationSubscription> {
    const response = await firstValueFrom(this.http.post<BusinessApiResponse<{ subscription: ApplicationSubscription }>>(
      `${this.apiBaseUrl}/api/v1/subscriptions/application/request`,
      { subscriptionParam: { actionData: { business_id: businessId, tenant_id: tenantId, plan_id: planId } } },
      { headers: this.headers },
    ));
    if (response.status !== 'SUCCESS' || !response.data || Array.isArray(response.data)) {
      throw new Error(response.msgArr?.join(' ') || 'Unable to create the subscription payment request.');
    }
    return (response.data as { subscription: ApplicationSubscription }).subscription;
  }

  async uploadApplicationPaymentProof(
    businessId: number,
    tenantId: number,
    subscriptionId: number,
    file: File,
    paymentReference: string,
  ): Promise<void> {
    const uploadResponse = await firstValueFrom(this.http.post<BusinessApiResponse<UploadUrlResponse>>(
      `${this.apiBaseUrl}/api/v1/subscriptions/application/proofs/upload-url`,
      { subscriptionParam: { actionData: {
        business_id: businessId, tenant_id: tenantId, subscription_id: subscriptionId,
        original_file_name: file.name, mime_type: file.type, file_size_bytes: file.size,
      } } },
      { headers: this.headers },
    ));
    if (uploadResponse.status !== 'SUCCESS' || !uploadResponse.data || Array.isArray(uploadResponse.data)) {
      throw new Error(uploadResponse.msgArr?.join(' ') || 'Unable to prepare the payment receipt upload.');
    }
    const upload = uploadResponse.data as UploadUrlResponse;
    await firstValueFrom(this.http.put(upload.upload_url, file, {
      headers: new HttpHeaders(upload.headers),
      responseType: 'text',
    }));
    const submitResponse = await firstValueFrom(this.http.post<BusinessApiResponse<{ proof_id: number }>>(
      `${this.apiBaseUrl}/api/v1/subscriptions/application/proofs/submit`,
      { subscriptionParam: { actionData: {
        business_id: businessId, tenant_id: tenantId, subscription_id: subscriptionId,
        proof_file_path: upload.object_key, payment_reference: paymentReference || null,
      } } },
      { headers: this.headers },
    ));
    if (submitResponse.status !== 'SUCCESS') {
      throw new Error(submitResponse.msgArr?.join(' ') || 'Unable to submit the payment receipt.');
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
