import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ApiService } from '../../core/http/api.service';
import { ApiError } from '../../core/http/api-error';
import { ApiEnvelope } from '../../core/http/api.models';
import { AuthService } from '../../core/auth/auth.service';
import { PermissionService } from '../../core/permissions/permission.service';
import { ThemeService } from '../../core/theme/theme.service';
import { WorkspaceContextService, WorkspaceMode, WorkspaceTenant } from './workspace-context.service';

@Component({
  selector: 'app-unified-workspace',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './unified-workspace.html',
  styleUrl: './unified-workspace.scss',
})
export class UnifiedWorkspace implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly permissionService = inject(PermissionService);
  protected readonly theme = inject(ThemeService);
  protected readonly workspace = inject(WorkspaceContextService);

  protected readonly loadingTenants = signal(false);
  protected readonly loadingPermissions = signal(false);
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly accountName = computed(() => this.auth.user()?.full_name || 'Signed in');
  protected readonly hasPlatformAccess = computed(
    () => this.permissionService.context()?.permissions.some((item) => item.scope_type === 'PLATFORM') ?? false,
  );
  protected readonly hasCatalogueAccess = computed(
    () => this.permissionService.has('CATALOGUE_MANAGE', 'TENANT'),
  );
  protected readonly canUseBusinessContext = computed(() => this.workspace.tenants().length > 0);

  ngOnInit(): void {
    void this.loadTenants();
  }

  protected async loadTenants(): Promise<void> {
    this.loadingTenants.set(true);
    this.error.set('');
    try {
      const response = await this.api.post<{ items: WorkspaceTenant[] }>(
        '/api/v1/tenants/mine/list',
        { tenantParam: { actionType: 'listMyTenants', actionData: { page: 1, page_size: 50 } } },
      ).toPromise();
      this.assertSuccess(response, 'Unable to load your business memberships.');
      const data = response?.data;
      const tenants = data && !Array.isArray(data) && Array.isArray(data.items)
        ? data.items.filter((item) => Number.isInteger(Number(item.id)) && Number(item.id) > 0)
          .map((item) => ({
            id: Number(item.id),
            tenant_name: String(item.tenant_name ?? 'Business'),
            tenant_code: String(item.tenant_code ?? ''),
            tenant_status: String(item.tenant_status ?? ''),
            membership_status: String(item.membership_status ?? ''),
            role_codes: String(item.role_codes ?? ''),
          }))
        : [];
      this.workspace.setTenants(tenants);
      if (tenants.length === 1) {
        await this.selectBusiness(tenants[0].id);
        this.notice.set('Your business is ready to manage.');
      } else if (tenants.length > 1) {
        this.notice.set('Choose a business to load its modules and permissions.');
      }
    } catch (cause) {
      this.error.set(cause instanceof Error ? cause.message : 'Unable to load business memberships.');
    } finally {
      this.loadingTenants.set(false);
    }
  }

  protected async changeMode(mode: WorkspaceMode): Promise<void> {
    this.error.set('');
    this.notice.set('');
    if (mode === 'BUSINESS' && !this.canUseBusinessContext()) {
      this.error.set('No active business membership is available for this account.');
      return;
    }
    if (mode === 'PLATFORM' && !this.hasPlatformAccess()) {
      this.error.set('Platform access is not available for this account.');
      return;
    }
    if (mode === 'PERSONAL') {
      this.workspace.setMode(mode);
      this.workspace.setTenant(null);
      this.loadingPermissions.set(true);
      try {
        await this.auth.loadPermissions(0);
        await this.router.navigateByUrl('/dashboard');
      } catch (cause) {
        this.error.set(cause instanceof Error ? cause.message : 'Unable to load personal workspace permissions.');
      } finally {
        this.loadingPermissions.set(false);
      }
      return;
    }
    if (mode === 'PLATFORM') {
      this.workspace.setMode(mode);
      this.workspace.setTenant(null);
      await this.router.navigateByUrl('/dashboard');
      return;
    }
    this.workspace.setMode(mode);
    if (this.workspace.tenantId()) {
      await this.selectBusiness(this.workspace.tenantId()!);
    } else if (this.workspace.tenants().length === 1) {
      await this.selectBusiness(this.workspace.tenants()[0].id);
    } else {
      await this.router.navigateByUrl('/dashboard');
    }
  }

  protected async onBusinessChange(event: Event): Promise<void> {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    const tenantId = Number(target.value);
    if (!Number.isInteger(tenantId) || tenantId < 1) {
      this.workspace.setTenant(null);
      this.notice.set('Select a business to load tenant-specific modules.');
      await this.auth.loadPermissions(0).catch(() => undefined);
      return;
    }
    await this.selectBusiness(tenantId);
  }

  private async selectBusiness(tenantId: number): Promise<void> {
    if (!this.workspace.tenants().some((tenant) => tenant.id === tenantId)) return;
    this.loadingPermissions.set(true);
    this.error.set('');
    this.workspace.setTenant(null);
    try {
      await this.auth.loadPermissions(tenantId);
      this.workspace.setTenant(tenantId);
      this.workspace.setMode('BUSINESS');
      const tenant = this.workspace.tenants().find((item) => item.id === tenantId);
      this.notice.set(tenant ? `Managing ${tenant.tenant_name}. Access is checked again by BBG on every request.` : 'Business context updated.');
      await this.router.navigateByUrl('/dashboard');
    } catch (cause) {
      this.error.set(cause instanceof Error ? cause.message : 'Unable to load business permissions.');
    } finally {
      this.loadingPermissions.set(false);
    }
  }

  protected async signOut(): Promise<void> {
    try {
      await this.auth.logout();
    } finally {
      await this.router.navigateByUrl('/');
    }
  }

  private assertSuccess<T>(response: ApiEnvelope<T> | null | undefined, message: string): asserts response is ApiEnvelope<T> {
    if (!response || response.status !== 'SUCCESS') {
      throw new ApiError(response?.msgArr?.join(' ') || message);
    }
  }
}
