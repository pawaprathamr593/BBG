import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { DashboardApiService, DashboardPermission, DashboardTenant } from '../dashboard/dashboard-api.service';

const ACTIVE_WORKSPACE_KEY = 'bbg.activeWorkspaceId';

@Injectable({ providedIn: 'root' })
export class WorkspaceContextService {
  private readonly auth = inject(AuthService);
  private readonly api = inject(DashboardApiService);
  private readonly document = inject(DOCUMENT);
  private initialization?: Promise<void>;

  readonly tenants = signal<DashboardTenant[]>([]);
  readonly activeTenantId = signal<number | null>(null);
  readonly permissions = signal<DashboardPermission[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');

  readonly activeTenant = computed(
    () => this.tenants().find((tenant) => tenant.id === this.activeTenantId()) ?? null,
  );

  initialize(): Promise<void> {
    if (!this.initialization) {
      this.initialization = this.loadContext().catch((error: unknown) => {
        this.initialization = undefined;
        throw error;
      });
    }
    return this.initialization;
  }

  async switchWorkspace(tenantId: number | null): Promise<void> {
    await this.initialize();
    if (tenantId !== null && !this.tenants().some((tenant) => tenant.id === tenantId)) {
      throw new Error('You do not have access to that workspace.');
    }

    // Fetch permissions before changing the active context. A failed or denied
    // permission request therefore cannot leave the UI in a false active state.
    const permissions = await this.api.getPermissions(tenantId ?? 0);
    this.activeTenantId.set(tenantId);
    this.permissions.set(permissions);
    this.persistActiveWorkspace(tenantId);
  }

  clear(): void {
    this.tenants.set([]);
    this.permissions.set([]);
    this.activeTenantId.set(null);
    this.initialization = undefined;
    this.persistActiveWorkspace(null);
  }

  private async loadContext(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const restored = await this.auth.restoreSession();
      if (!restored) {
        this.tenants.set([]);
        this.permissions.set([]);
        this.activeTenantId.set(null);
        this.initialization = undefined;
        return;
      }
      if (!this.auth.user()) await this.auth.loadProfile();

      const [tenants, savedPermissions] = await Promise.all([
        this.api.getMyTenants(),
        this.api.getPermissions(0),
      ]);
      this.tenants.set(tenants);

      const savedId = this.readActiveWorkspace();
      const restoredTenantId = savedId !== null && tenants.some((tenant) => tenant.id === savedId)
        ? savedId
        : null;
      const permissions = restoredTenantId === null
        ? savedPermissions
        : await this.api.getPermissions(restoredTenantId);

      this.activeTenantId.set(restoredTenantId);
      this.permissions.set(permissions);
      if (restoredTenantId !== savedId) this.persistActiveWorkspace(restoredTenantId);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Unable to load workspace access.');
      throw error;
    } finally {
      this.loading.set(false);
    }
  }

  private readActiveWorkspace(): number | null {
    try {
      const userId = this.auth.user()?.user_id;
      if (!userId) return null;
      const raw = this.document.defaultView?.sessionStorage.getItem(`${ACTIVE_WORKSPACE_KEY}.${userId}`);
      if (!raw) return null;
      const value = Number(raw);
      return Number.isInteger(value) && value > 0 ? value : null;
    } catch {
      return null;
    }
  }

  private persistActiveWorkspace(tenantId: number | null): void {
    try {
      const userId = this.auth.user()?.user_id;
      const storage = this.document.defaultView?.sessionStorage;
      if (!storage || !userId) return;
      const key = `${ACTIVE_WORKSPACE_KEY}.${userId}`;
      if (tenantId === null) storage.removeItem(key);
      else storage.setItem(key, String(tenantId));
    } catch {
      // Workspace selection still works for the current application session
      // when browser storage is unavailable.
    }
  }
}
