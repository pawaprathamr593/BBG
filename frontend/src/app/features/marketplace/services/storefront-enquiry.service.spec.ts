import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { StorefrontEnquiryService } from './storefront-enquiry.service';

describe('StorefrontEnquiryService', () => {
  let service: StorefrontEnquiryService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [StorefrontEnquiryService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(StorefrontEnquiryService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends a customer enquiry to the existing endpoint with tenant and message fields', async () => {
    const result = service.create(17, 'Product question', 'Please share the available sizes.');
    const request = http.expectOne('http://localhost:8080/api/v1/enquiries/create');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      enquiryParam: {
        actionType: 'createCustomerEnquiry',
        actionData: {
          tenant_id: 17,
          subject: 'Product question',
          message: 'Please share the available sizes.',
        },
      },
    });
    const confirmation = { id: 4, enquiry_number: 'ENQ-20261113-ABC123', enquiry_status: 'PENDING' };
    request.flush({ status: 'SUCCESS', msgArr: [], data: confirmation });
    await expect(result).resolves.toEqual(confirmation);
  });
});
