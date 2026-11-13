import { TestBed } from '@angular/core/testing';
import { PermissionService } from './permission.service';

describe('PermissionService', () => {
  let service: PermissionService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [PermissionService] });
    service = TestBed.inject(PermissionService);
  });

  it('denies access when no verified permission has been loaded', () => {
    expect(service.has('business.view', 'TENANT')).toBe(false);
    expect(service.has('', 'PLATFORM')).toBe(false);
  });

  it('retains platform permissions while replacing the selected tenant permission snapshot', () => {
    service.replaceFromVerifiedResponse({
      tenant_id: 0,
      permissions: [
        { role_code: 'PLATFORM_ADMIN', scope_type: 'PLATFORM', permission_code: 'PLATFORM_USERS_MANAGE', module_code: 'ADMIN' },
      ],
    });
    service.replaceFromVerifiedResponse({
      tenant_id: 12,
      permissions: [
        { role_code: 'TENANT_OWNER', scope_type: 'TENANT', permission_code: 'CATALOGUE_MANAGE', module_code: 'CATALOGUE' },
      ],
    });

    expect(service.has('PLATFORM_USERS_MANAGE', 'PLATFORM')).toBe(true);
    expect(service.has('CATALOGUE_MANAGE', 'TENANT')).toBe(true);

    service.replaceFromVerifiedResponse({
      tenant_id: 24,
      permissions: [
        { role_code: 'TENANT_OWNER', scope_type: 'TENANT', permission_code: 'ORDERS_MANAGE', module_code: 'ORDERS' },
      ],
    });
    expect(service.has('PLATFORM_USERS_MANAGE', 'PLATFORM')).toBe(true);
    expect(service.has('ORDERS_MANAGE', 'TENANT')).toBe(true);
    expect(service.has('CATALOGUE_MANAGE', 'TENANT')).toBe(false);
  });

  it('keeps platform and tenant permissions in separate scopes', () => {
    service.replaceFromVerifiedResponse({
      tenant_id: null,
      permissions: [
        { role_code: 'PLATFORM_ADMIN', scope_type: 'PLATFORM', permission_code: 'admin.review', module_code: 'ADMIN' },
      ],
    });

    expect(service.has('admin.review', 'PLATFORM')).toBe(true);
    expect(service.has('admin.review', 'TENANT')).toBe(false);
    expect(service.has('business.manage', 'TENANT')).toBe(false);

    service.clear();
    expect(service.has('admin.review', 'PLATFORM')).toBe(false);
  });
});
