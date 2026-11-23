import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { vi } from 'vitest';
import { AuthService } from '../../core/auth/auth.service';
import { AuthUser } from '../../core/auth/auth.models';
import { PermissionContext } from '../../core/permissions/permission.service';
import { ThemeService } from '../../core/theme/theme.service';
import { WorkspaceApiService } from './workspace-api.service';
import { Workspace } from './workspace';
import { entrepreneurWorkspace, WorkspaceAction } from './workspace.config';

const tenants = [
  { id: 1, tenant_name: 'Business One', tenant_code: 'B1', tenant_status: 'ACTIVE', membership_status: 'ACTIVE', role_codes: 'TENANT_OWNER' },
  { id: 2, tenant_name: 'Business Two', tenant_code: 'B2', tenant_status: 'ACTIVE', membership_status: 'ACTIVE', role_codes: 'TENANT_OWNER' },
];

describe('Workspace tenant context', () => {
  let apiExecute: ReturnType<typeof vi.fn>;
  let loadPermissions: (tenantId: number) => Promise<PermissionContext>;
  let authMock: {
    user: ReturnType<typeof signal<AuthUser | null>>;
    logout: () => Promise<void>;
    loadPermissions: (tenantId: number) => Promise<PermissionContext>;
  };

  beforeEach(async () => {
    apiExecute = vi.fn((action: WorkspaceAction, data: Record<string, unknown>) => {
      if (action.path === '/api/v1/tenants/mine/list') return Promise.resolve({ items: tenants });
      if (action.path === '/api/v1/dashboard/entrepreneur/summary') {
        return Promise.resolve({ business_name: `Business ${data['tenant_id']} private result` });
      }
      return Promise.resolve({});
    });
    loadPermissions = async (tenantId) => ({ tenant_id: tenantId, permissions: [] });
    authMock = {
      user: signal<AuthUser | null>({ user_id: 7, full_name: 'Test User', email: null, mobile: null }),
      logout: async () => undefined,
      loadPermissions: (tenantId) => loadPermissions(tenantId),
    };

    await TestBed.configureTestingModule({
      imports: [Workspace],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { data: { workspace: entrepreneurWorkspace } } } },
        { provide: Router, useValue: { navigateByUrl: vi.fn().mockResolvedValue(true) } },
        { provide: AuthService, useValue: authMock },
        { provide: WorkspaceApiService, useValue: { execute: apiExecute } },
        { provide: ThemeService, useValue: { toggle: vi.fn(), resolvedTheme: signal<'light' | 'dark'>('light') } },
      ],
    }).compileComponents();
  });

  function createFixture() {
    const fixture = TestBed.createComponent(Workspace);
    fixture.detectChanges();
    return fixture;
  }

  async function waitForTenantOptions(fixture: ReturnType<typeof createFixture>) {
    await vi.waitFor(() => {
      fixture.detectChanges();
      const select = fixture.nativeElement.querySelector('#active-tenant') as HTMLSelectElement | null;
      expect(select?.options.length).toBe(3);
    });
  }

  function chooseTenant(fixture: ReturnType<typeof createFixture>, tenantId: number): void {
    const select = fixture.nativeElement.querySelector('#active-tenant') as HTMLSelectElement;
    select.value = String(tenantId);
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  it('clears the previous tenant response immediately while the next context is loading', async () => {
    let resolveSecondPermissions: ((context: PermissionContext) => void) | undefined;
    loadPermissions = (tenantId) => tenantId === 2
      ? new Promise((resolve) => { resolveSecondPermissions = resolve; })
      : Promise.resolve({ tenant_id: tenantId, permissions: [] });

    const fixture = createFixture();
    await waitForTenantOptions(fixture);
    chooseTenant(fixture, 1);
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.result-panel')?.textContent).toContain('Business 1 private result');
    });

    chooseTenant(fixture, 2);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.result-panel')).toBeNull();

    resolveSecondPermissions?.({ tenant_id: 2, permissions: [] });
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.result-panel')?.textContent).toContain('Business 2 private result');
    });
  });

  it('ignores a late response from a tenant that is no longer selected', async () => {
    let resolveFirstTenant: ((value: unknown) => void) | undefined;
    apiExecute.mockImplementation((action: WorkspaceAction, data: Record<string, unknown>) => {
      if (action.path === '/api/v1/tenants/mine/list') return Promise.resolve({ items: tenants });
      if (action.path === '/api/v1/dashboard/entrepreneur/summary' && data['tenant_id'] === 1) {
        return new Promise((resolve) => { resolveFirstTenant = resolve; });
      }
      if (action.path === '/api/v1/dashboard/entrepreneur/summary' && data['tenant_id'] === 2) {
        return Promise.resolve({ business_name: 'Business 2 current result' });
      }
      return Promise.resolve({});
    });

    const fixture = createFixture();
    await waitForTenantOptions(fixture);
    chooseTenant(fixture, 1);
    await vi.waitFor(() => expect(resolveFirstTenant).toBeTypeOf('function'));

    chooseTenant(fixture, 2);
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.result-panel')?.textContent).toContain('Business 2 current result');
    });

    resolveFirstTenant?.({ business_name: 'Business 1 stale result' });
    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();
    const resultText = fixture.nativeElement.querySelector('.result-panel')?.textContent ?? '';
    expect(resultText).toContain('Business 2 current result');
    expect(resultText).not.toContain('Business 1 stale result');
  });
  it('keeps the newest tenant selection when an earlier permission response arrives late', async () => {
    let resolveFirstTenant: ((context: PermissionContext) => void) | undefined;
    let resolveSecondTenant: ((context: PermissionContext) => void) | undefined;
    loadPermissions = (tenantId) => new Promise((resolve) => {
      if (tenantId === 1) resolveFirstTenant = resolve;
      else if (tenantId === 2) resolveSecondTenant = resolve;
      else resolve({ tenant_id: null, permissions: [] });
    });

    const fixture = createFixture();
    await waitForTenantOptions(fixture);
    chooseTenant(fixture, 1);
    chooseTenant(fixture, 2);

    resolveSecondTenant?.({ tenant_id: 2, permissions: [] });
    await vi.waitFor(() => {
      fixture.detectChanges();
      const select = fixture.nativeElement.querySelector('#active-tenant') as HTMLSelectElement;
      expect(select.value).toBe('2');
      expect(fixture.nativeElement.querySelector('.result-panel')?.textContent).toContain('Business 2 private result');
    });

    resolveFirstTenant?.({ tenant_id: 1, permissions: [] });
    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();

    const select = fixture.nativeElement.querySelector('#active-tenant') as HTMLSelectElement;
    expect(select.value).toBe('2');
    expect(fixture.nativeElement.querySelector('.result-panel')?.textContent).toContain('Business 2 private result');
    expect(fixture.nativeElement.querySelector('.result-panel')?.textContent).not.toContain('Business 1 private result');
  });
});
