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
