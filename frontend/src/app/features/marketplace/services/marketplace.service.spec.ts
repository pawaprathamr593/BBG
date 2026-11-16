import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MarketplaceService } from './marketplace.service';

describe('MarketplaceService', () => {
  let service: MarketplaceService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MarketplaceService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MarketplaceService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('uses the registered POST route and marketplace action envelope for home summary', async () => {
    const resultPromise = service.getHomeSummary();
    const request = http.expectOne('/api/v1/marketplace/home');

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      marketplaceParam: { actionType: 'getHomeSummary', actionData: {} },
    });

    const summary = { categories: [], businesses: [], promotions: [] };
    request.flush({ status: 'SUCCESS', msgArr: [], data: summary });
    await expect(resultPromise).resolves.toEqual(summary);
  });

  it('passes only backend-supported directory filters', async () => {
    const resultPromise = service.listBusinesses({
      page: 2,
      page_size: 20,
      search: 'studio',
      city: 'Pune',
      state: 'Maharashtra',
      category_id: 4,
    });
    const request = http.expectOne('/api/v1/marketplace/businesses/list');

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      marketplaceParam: {
        actionType: 'listBusinesses',
        actionData: { page: 2, page_size: 20, search: 'studio', city: 'Pune', state: 'Maharashtra', category_id: 4 },
      },
    });

    const result = { items: [], pagination: { page: 2, page_size: 20, total: 0 } };
    request.flush({ status: 'SUCCESS', msgArr: [], data: result });
    await expect(resultPromise).resolves.toEqual(result);
  });
});
