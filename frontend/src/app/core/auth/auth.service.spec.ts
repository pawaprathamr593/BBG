import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';
import { ApiEnvelope } from '../http/api.models';
import { ApiService } from '../http/api.service';
import { PermissionContext, PermissionService } from '../permissions/permission.service';
import { AuthService } from './auth.service';

describe('AuthService permission context', () => {
  let auth: AuthService;
  let permissionService: PermissionService;
  let apiPost: ReturnType<typeof vi.fn>;
  let pendingRequests: Map<number, Subject<ApiEnvelope<PermissionContext>>>;

  const platformContext: PermissionContext = {
    tenant_id: null,
    permissions: [
      {
        role_code: 'PLATFORM_ADMIN',
        scope_type: 'PLATFORM',
        permission_code: 'PLATFORM_USERS_MANAGE',
        module_code: 'ADMIN',
      },
    ],
  };

  beforeEach(() => {
    pendingRequests = new Map();
    apiPost = vi.fn((path: string, body: unknown) => {
      if (path === '/api/v1/auth/login') {
        return of({
          status: 'SUCCESS',
          msgArr: [],
          data: {
            access_token: 'test-access-token',
            token_type: 'Bearer',
            expires_in: 900,
            user: {
              user_id: 7,
              full_name: 'Test User',
              email: 'test@example.com',
              mobile: null,
            },
          },
        });
      }

      if (path === '/api/v1/auth/permissions') {
        const requestBody = body as { authParam: { actionData: { tenant_id: number } } };
        const tenantId = requestBody.authParam.actionData.tenant_id;
        if (tenantId === 0) {
          return of({ status: 'SUCCESS', msgArr: [], data: platformContext });
        }
        const pending = new Subject<ApiEnvelope<PermissionContext>>();
        pendingRequests.set(tenantId, pending);
        return pending.asObservable();
      }

      if (path === '/api/v1/auth/logout') {
        return of({ status: 'SUCCESS', msgArr: [], data: [] });
      }

      throw new Error(`Unexpected API request: ${path}`);
    });

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        PermissionService,
        { provide: ApiService, useValue: { post: apiPost } },
      ],
    });
    auth = TestBed.inject(AuthService);
    permissionService = TestBed.inject(PermissionService);
  });

  async function signIn(): Promise<void> {
    await auth.login({ identifier: 'test@example.com', password: 'password' });
  }

  function resolveTenantRequest(requestTenantId: number, permissionCode: string, responseTenantId = requestTenantId): void {
    const pending = pendingRequests.get(requestTenantId);
    if (!pending) throw new Error(`No pending permission request for tenant ${requestTenantId}.`);
    pending.next({
      status: 'SUCCESS',
      msgArr: [],
      data: {
        tenant_id: responseTenantId,
        permissions: [
          {
            role_code: 'TENANT_OWNER',
            scope_type: 'TENANT',
            permission_code: permissionCode,
            module_code: 'TEST',
          },
        ],
      },
    });
    pending.complete();
  }

  it('applies only the latest tenant permission response', async () => {
    await signIn();
    const firstRequest = auth.loadPermissions(11);
    const secondRequest = auth.loadPermissions(22);

    resolveTenantRequest(22, 'TENANT_22_VIEW');
    await secondRequest;
    resolveTenantRequest(11, 'TENANT_11_VIEW');

    await expect(firstRequest).rejects.toThrow('permission context changed');
    expect(permissionService.context()?.tenant_id).toBe(22);
    expect(permissionService.has('TENANT_22_VIEW', 'TENANT')).toBe(true);
    expect(permissionService.has('TENANT_11_VIEW', 'TENANT')).toBe(false);
    expect(permissionService.has('PLATFORM_USERS_MANAGE', 'PLATFORM')).toBe(true);
  });

  it('does not restore a pending permission response after logout', async () => {
    await signIn();
    const pendingRequest = auth.loadPermissions(33);

    await auth.logout();
    resolveTenantRequest(33, 'TENANT_33_VIEW');

    await expect(pendingRequest).rejects.toThrow('permission context changed');
    expect(auth.isAuthenticated()).toBe(false);
    expect(permissionService.context()).toBeNull();
    expect(permissionService.has('TENANT_33_VIEW', 'TENANT')).toBe(false);
  });

  it('rejects a permission snapshot for a different tenant than the requested context', async () => {
    await signIn();
    const pendingRequest = auth.loadPermissions(44);
    resolveTenantRequest(44, 'TENANT_45_VIEW', 45);

    await expect(pendingRequest).rejects.toThrow('did not match the requested business context');
    expect(permissionService.context()?.tenant_id).toBeNull();
    expect(permissionService.has('PLATFORM_USERS_MANAGE', 'PLATFORM')).toBe(true);
    expect(permissionService.has('TENANT_45_VIEW', 'TENANT')).toBe(false);
  });
});
