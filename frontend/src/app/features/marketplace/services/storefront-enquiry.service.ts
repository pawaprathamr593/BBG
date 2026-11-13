import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiError } from '../../../core/http/api-error';
import { ApiEnvelope } from '../../../core/http/api.models';
import { ApiService } from '../../../core/http/api.service';

export interface CreateEnquiryResult {
  id: number;
  enquiry_number: string;
  enquiry_status: string;
}

@Injectable({ providedIn: 'root' })
export class StorefrontEnquiryService {
  private readonly api = inject(ApiService);

  async create(tenantId: number, subject: string, message: string): Promise<CreateEnquiryResult> {
    const response = await firstValueFrom(this.api.post<CreateEnquiryResult>(
      '/api/v1/enquiries/create',
      {
        enquiryParam: {
          actionType: 'createCustomerEnquiry',
          actionData: {
            tenant_id: tenantId,
            ...(subject.trim() ? { subject: subject.trim() } : {}),
            message: message.trim(),
          },
        },
      },
    ));

    if (response.status !== 'SUCCESS') {
      throw new ApiError(response.msgArr?.join(' ') || 'Your enquiry could not be sent.');
    }
    if (!response.data || Array.isArray(response.data)) {
      throw new ApiError('The enquiry response did not contain a confirmation.');
    }
    return response.data;
  }
}
