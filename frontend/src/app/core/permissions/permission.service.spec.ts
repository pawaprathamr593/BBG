import { TestBed } from '@angular/core/testing';
import { PermissionService } from './permission.service';

describe('PermissionService', () => {
  let service: PermissionService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [PermissionService] });
    service = TestBed.inject(PermissionService);
  });

  it('denies access when no verified permission has been loaded', () => {
    expect(service.has('business.view')).toBe(false);
    expect(service.has('')).toBe(false);
  });

  it('accepts only explicitly supplied permission codes and clears them', () => {
    service.replaceFromVerifiedResponse(['business.view']);
    expect(service.has('business.view')).toBe(true);
    expect(service.has('admin.dashboard.view')).toBe(false);

    service.clear();
    expect(service.has('business.view')).toBe(false);
  });
});
