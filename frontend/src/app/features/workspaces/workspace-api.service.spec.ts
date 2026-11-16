import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { WorkspaceApiService } from './workspace-api.service';

describe('WorkspaceApiService', () => {
  let service: WorkspaceApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [WorkspaceApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(WorkspaceApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends the dashboard request using the backend dashboardParam envelope', async () => {
    const requestPromise = service.execute({
      label: 'Load overview',
      path: '/api/v1/dashboard/consumer/summary',
      envelope: 'dashboardParam',
      actionType: 'getConsumerDashboard',
    }, {});
    const request = http.expectOne('/api/v1/dashboard/consumer/summary');

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      dashboardParam: { actionType: 'getConsumerDashboard', actionData: {} },
    });

    request.flush({ status: 'SUCCESS', msgArr: [], data: { totals: [] } });
    await expect(requestPromise).resolves.toEqual({ totals: [] });
  });

  it('passes user-supplied payload fields without renaming or inventing them', async () => {
    const payload = { product_id: 12, quantity: 2 };
    const requestPromise = service.execute({
      label: 'Add item',
      path: '/api/v1/cart/add',
      envelope: 'cartParam',
      actionType: 'addItem',
      requiresPayload: true,
    }, payload);
    const request = http.expectOne('/api/v1/cart/add');

    expect(request.request.body).toEqual({
      cartParam: { actionType: 'addItem', actionData: payload },
    });
    request.flush({ status: 'SUCCESS', msgArr: [], data: { updated: true } });
    await expect(requestPromise).resolves.toEqual({ updated: true });
  });

  it('rejects backend FAILED responses instead of showing them as successful actions', async () => {
    const requestPromise = service.execute({
      label: 'List users',
      path: '/api/v1/admin/users/list',
      envelope: 'adminParam',
      actionType: 'listPlatformUsers',
    }, {});
    const request = http.expectOne('/api/v1/admin/users/list');
    request.flush({ status: 'FAILED', msgArr: ['Not authorized.'], data: [] }, { status: 400, statusText: 'Bad Request' });

    await expect(requestPromise).rejects.toThrow();
  });
});
