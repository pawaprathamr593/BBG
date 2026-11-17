import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CatalogueApiService } from './catalogue-api.service';

describe('CatalogueApiService', () => {
  let service: CatalogueApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CatalogueApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CatalogueApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists tenant products using the registered route and exact catalogue envelope', async () => {
    const resultPromise = service.listProducts(18, 2, 20, 'desk');
    const request = http.expectOne('/api/v1/catalogue/products/list');

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      catalogueParam: {
        actionType: 'listTenantProducts',
        actionData: { tenant_id: 18, page: 2, page_size: 20, search: 'desk' },
      },
    });

    const result = { items: [], pagination: { page: 2, page_size: 20, total: 0 } };
    request.flush({ status: 'SUCCESS', msgArr: [], data: result });
    await expect(resultPromise).resolves.toEqual(result);
  });

  it('creates a product with backend-supported fields and tenant context', async () => {
    const payload = {
      product_code: 'DESK-01',
      product_name: 'Office desk',
      description: '',
      category_id: null,
      base_unit_id: 1,
      brand_name: '',
      barcode: '',
      cost_price: 1000,
      selling_price: 1500,
      tax_rate: 18,
      publication_status: 'DRAFT' as const,
    };
    const resultPromise = service.createProduct(18, payload);
    const request = http.expectOne('/api/v1/catalogue/products/create');

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      catalogueParam: {
        actionType: 'createTenantProduct',
        actionData: { tenant_id: 18, ...payload },
      },
    });

    request.flush({ status: 'SUCCESS', msgArr: [], data: { id: 91 } });
    await expect(resultPromise).resolves.toEqual({ id: 91 });
  });

  it('surfaces the backend validation message', async () => {
    const resultPromise = service.deleteProduct(18, 91);
    const request = http.expectOne('/api/v1/catalogue/products/delete');
    request.flush(
      { status: 'FAILED', msgArr: ['CATALOGUE_MANAGE permission is required for this tenant.'], data: [] },
      { status: 400, statusText: 'Bad Request' },
    );

    await expect(resultPromise).rejects.toThrow('CATALOGUE_MANAGE permission is required for this tenant.');
  });
});
