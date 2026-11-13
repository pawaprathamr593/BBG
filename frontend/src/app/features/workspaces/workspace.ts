import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiError } from '../../core/http/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeService } from '../../core/theme/theme.service';
import { WorkspaceApiService } from './workspace-api.service';
import { WorkspaceAction, WorkspaceConfig, WorkspaceSection } from './workspace.config';

interface TenantOption {
  id: number;
  tenant_name: string;
  tenant_code: string;
  tenant_status: string;
  membership_status: string;
  role_codes: string;
}

const listTenantsAction: WorkspaceAction = {
  label: 'List my businesses',
  path: '/api/v1/tenants/mine/list',
  envelope: 'tenantParam',
  actionType: 'listMyTenants',
};

@Component({
  selector: 'app-workspace',
  imports: [FormsModule, JsonPipe],
  templateUrl: './workspace.html',
  styleUrl: './workspace.scss',
})
export class Workspace implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly api = inject(WorkspaceApiService);
  protected readonly theme = inject(ThemeService);
  protected readonly config = this.route.snapshot.data['workspace'] as WorkspaceConfig;
  protected readonly activeSectionId = signal(this.config.sections[0]?.id ?? '');
  protected readonly activeSection = computed(
    () => this.config.sections.find((section) => section.id === this.activeSectionId()) ?? this.config.sections[0],
  );
  protected readonly activeAction = signal<WorkspaceAction | null>(this.activeSection()?.actions[0] ?? null);
  protected readonly payload = signal('{}');
  protected readonly result = signal<unknown>(null);
  protected readonly hasResult = signal(false);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly tenantOptions = signal<TenantOption[]>([]);
  protected readonly selectedTenantId = signal<number | null>(null);
  protected readonly tenantLoading = signal(false);

  protected get accountName(): string {
    return this.auth.user()?.full_name || 'Signed in';
  }

  protected async signOut(): Promise<void> {
    try {
      await this.auth.logout();
    } finally {
      await this.router.navigateByUrl('/');
    }
  }

  ngOnInit(): void {
    if (this.config.eyebrow === 'BUSINESS WORKSPACE') {
      void this.loadTenants();
      return;
    }
    const initial = this.activeAction();
    if (initial && !initial.requiresPayload) void this.run(initial);
  }

  protected async loadTenants(): Promise<void> {
    this.tenantLoading.set(true);
    this.error.set('');
    try {
      const response = await this.api.execute(listTenantsAction, { page: 1, page_size: 50 });
      if (!this.isRecord(response) || !Array.isArray(response['items'])) {
        throw new Error('The business membership response has an unexpected format.');
      }
      const tenants = response['items'].filter((item): item is Record<string, unknown> =>
        this.isRecord(item) && Number.isInteger(Number(item['id'])) && Number(item['id']) > 0
        && typeof item['tenant_name'] === 'string',
      ).map((item) => ({
        id: Number(item['id']),
        tenant_name: String(item['tenant_name']),
        tenant_code: String(item['tenant_code'] ?? ''),
        tenant_status: String(item['tenant_status'] ?? ''),
        membership_status: String(item['membership_status'] ?? ''),
        role_codes: String(item['role_codes'] ?? ''),
      }));
      this.tenantOptions.set(tenants);
      if (tenants.length === 1) {
        await this.activateTenant(tenants[0].id);
      } else if (tenants.length > 1) {
        this.notice.set('Choose the business you want to manage. All tenant-scoped requests will use this selection.');
      } else {
        this.notice.set('No active business membership was found. You can start or review a business application from Business profile.');
      }
    } catch (cause) {
      this.error.set(cause instanceof Error ? cause.message : 'Unable to load your business memberships.');
    } finally {
      this.tenantLoading.set(false);
    }
  }

  protected async onTenantChange(event: Event): Promise<void> {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    const tenantId = Number(target.value);
    if (!Number.isInteger(tenantId) || tenantId < 1) {
      this.selectedTenantId.set(null);
      await this.auth.loadPermissions(0).catch(() => undefined);
      return;
    }
    await this.activateTenant(tenantId);
  }

  private async activateTenant(tenantId: number): Promise<void> {
    if (!this.tenantOptions().some((tenant) => tenant.id === tenantId)) return;
    this.tenantLoading.set(true);
    this.selectedTenantId.set(null);
    this.error.set('');
    this.notice.set('');
    try {
      await this.auth.loadPermissions(tenantId);
      this.selectedTenantId.set(tenantId);
      const selected = this.tenantOptions().find((tenant) => tenant.id === tenantId);
      this.notice.set(selected ? `Managing ${selected.tenant_name}. Tenant access is checked again by BBG on every request.` : 'Business context updated.');
      const action = this.activeAction();
      if (action?.tenantScoped && !action.requiresPayload) await this.run(action);
    } catch (cause) {
      this.selectedTenantId.set(null);
      this.error.set(cause instanceof Error ? cause.message : 'Unable to load permissions for this business.');
    } finally {
      this.tenantLoading.set(false);
    }
  }

  protected selectSection(section: WorkspaceSection): void {
    this.activeSectionId.set(section.id);
    this.activeAction.set(section.actions[0] ?? null);
    this.result.set(null);
    this.hasResult.set(false);
    this.error.set('');
    this.notice.set('');
    this.payload.set('{}');
    const first = section.actions[0];
    if (first && !first.requiresPayload) void this.run(first);
  }

  protected selectAction(action: WorkspaceAction): void {
    this.activeAction.set(action);
    this.result.set(null);
    this.hasResult.set(false);
    this.error.set('');
    this.notice.set('');
    this.payload.set('{}');
    if (!action.requiresPayload) void this.run(action);
  }

  protected async run(action = this.activeAction()): Promise<void> {
    if (!action || this.loading()) return;
    this.loading.set(true);
    this.result.set(null);
    this.hasResult.set(false);
    this.error.set('');
    this.notice.set('');
    try {
      let data: Record<string, unknown> = {};
      if (action.requiresPayload) {
        const parsed: unknown = JSON.parse(this.payload());
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error('Enter a JSON object for the request payload.');
        }
        data = parsed as Record<string, unknown>;
        if (Object.keys(data).length === 0 && !action.tenantScoped) {
          throw new Error('This action requires request fields. Add the fields defined by the backend contract before submitting.');
        }
      }
      if (action.tenantScoped) {
        const tenantId = this.selectedTenantId();
        if (!tenantId) throw new Error('Choose an active business before running this tenant-scoped action.');
        data = { ...data, tenant_id: tenantId };
      }
      const response = await this.api.execute(action, data);
      this.result.set(response);
      this.hasResult.set(true);
      this.notice.set(`${action.label} completed successfully.`);
    } catch (cause) {
      this.error.set(cause instanceof ApiError || cause instanceof Error ? cause.message : 'The request could not be completed.');
    } finally {
      this.loading.set(false);
    }
  }

  protected isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  protected isPrimitive(value: unknown): boolean {
    return value === null || ['string', 'number', 'boolean'].includes(typeof value);
  }

  protected resultEntries(value: unknown): [string, unknown][] {
    return this.isRecord(value) ? Object.entries(value as Record<string, unknown>) : [];
  }
}
