import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import {
  DashboardApiService,
  DashboardPermission,
  DashboardTenant,
} from '../dashboard/dashboard-api.service';

const ACTIVE_WORKSPACE_KEY = 'bbg.activeWorkspaceId';
const ACTIVE_CONTEXT_KEY = 'bbg.activeContext';
const LAST_WORKSPACE_KEY = 'bbg.lastWorkspaceId';

function isPlatformAdministratorPermission(permission: DashboardPermission): boolean {
  return permission.scope_type === 'PLATFORM' && permission.role_code !== 'CONSUMER';
}

function isPersonalPermission(permission: DashboardPermission): boolean {
  return permission.scope_type === 'GLOBAL' || permission.role_code === 'CONSUMER';
}

@Injectable({ providedIn: 'root' })
export class WorkspaceContextService {
  private readonly auth = inject(AuthService);
  private readonly api = inject(DashboardApiService);
  private readonly document = inject(DOCUMENT);
  private initialization?: Promise<void>;
  private observedUserId: number | null = null;
  private authStateObserved = false;

  constructor() {
    effect(() => {
      const authenticated = this.auth.isAuthenticated();
      const userId = this.auth.user()?.user_id ?? null;

      // Workspace permissions and tenant data belong to one authenticated
      // principal. Never carry them across logout or an account switch.
      const principalChanged =
        this.authStateObserved &&
        userId !== null &&
        this.observedUserId !== null &&
        userId !== this.observedUserId;

      if (!authenticated || principalChanged) {
        this.clear();
      }

      // Session restoration can authenticate before loadProfile has populated
      // the user ID. Do not treat that initial null -> known ID transition as
      // an account switch; only compare two known principals.
      if (!authenticated) this.observedUserId = null;
      else if (userId !== null) this.observedUserId = userId;
      this.authStateObserved = true;
    });
  }

  readonly tenants = signal<DashboardTenant[]>([]);
  readonly activeTenantId = signal<number | null>(null);
  readonly activeContext = signal<'PERSONAL' | 'PLATFORM' | 'BUSINESS' | null>(null);
  readonly lastActiveTenantId = signal<number | null>(null);
  readonly permissions = signal<DashboardPermission[]>([]);
  readonly platformPermissions = signal<DashboardPermission[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');

  readonly activeTenant = computed(
    () => {
      const activeId = this.activeTenantId();
      if (activeId === null || activeId === undefined) return null;
      return this.tenants().find((tenant) => Number(tenant.id) === Number(activeId)) ?? null;
    },
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
    if (tenantId === null) {
      await this.switchToMyAccount();
      return;
    }
    const targetId = Number(tenantId);
    if (!this.tenants().some((tenant) => Number(tenant.id) === targetId)) {
      try {
        const freshTenants = await this.api.getMyTenants();
        this.tenants.set(freshTenants);
      } catch {
        // preserve existing tenants on network error
      }
      if (!this.tenants().some((tenant) => Number(tenant.id) === targetId)) {
        throw new Error('You do not have access to Business Workspace.');
      }
    }

    // Fetch permissions before changing the active context. A failed or denied
    // permission request therefore cannot leave the UI in a false active state.
    const permissions = await this.api.getPermissions(targetId);
    this.activeTenantId.set(targetId);
    this.activeContext.set('BUSINESS');
    this.lastActiveTenantId.set(targetId);
    this.permissions.set(permissions);
    this.persistActiveWorkspace(targetId);
    this.persistLastWorkspace(targetId);
    this.persistActiveContext('BUSINESS');
  }

  async switchToMyAccount(): Promise<void> {
    await this.initialize();
    const allPermissions = await this.api.getPermissions(0);
    this.platformPermissions.set(allPermissions.filter(isPlatformAdministratorPermission));
    this.activeTenantId.set(null);
    this.activeContext.set('PERSONAL');
    this.permissions.set(allPermissions.filter(isPersonalPermission));
    this.persistActiveWorkspace(null);
    this.persistActiveContext('PERSONAL');
  }

  async switchToPlatformAdministration(): Promise<void> {
    await this.initialize();
    const allPermissions = await this.api.getPermissions(0);
    const platformPermissions = allPermissions.filter(isPlatformAdministratorPermission);
    if (!platformPermissions.length)
      throw new Error('You do not have Platform Administration access.');
    this.platformPermissions.set(platformPermissions);
    this.activeTenantId.set(null);
    this.activeContext.set('PLATFORM');
    this.permissions.set(platformPermissions);
    this.persistActiveWorkspace(null);
    this.persistActiveContext('PLATFORM');
  }

  clear(): void {
    this.tenants.set([]);
    this.permissions.set([]);
    this.platformPermissions.set([]);
    this.activeTenantId.set(null);
    this.activeContext.set(null);
    this.lastActiveTenantId.set(null);
    this.loading.set(false);
    this.error.set('');
    this.initialization = undefined;
    this.persistActiveWorkspace(null);
    this.persistActiveContext(null);
    this.persistLastWorkspace(null);
  }

  private async loadContext(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const restored = await this.auth.restoreSession();
      if (!restored) {
        this.tenants.set([]);
        this.permissions.set([]);
        this.platformPermissions.set([]);
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
      this.platformPermissions.set(savedPermissions.filter(isPlatformAdministratorPermission));

      const savedId = this.readActiveWorkspace();
      const restoredTenantId =
        savedId !== null && tenants.some((tenant) => Number(tenant.id) === Number(savedId))
          ? Number(savedId)
          : null;
      const savedLastId = this.readLastWorkspace();
      const lastTenantId =
        restoredTenantId ??
        (savedLastId !== null && tenants.some((tenant) => Number(tenant.id) === Number(savedLastId))
          ? Number(savedLastId)
          : null);
      this.lastActiveTenantId.set(lastTenantId);
      if (restoredTenantId !== null) this.persistLastWorkspace(restoredTenantId);
      const savedContext = this.readActiveContext();
      const hasPlatformAccess = savedPermissions.some(isPlatformAdministratorPermission);
      const defaultScope =
        savedContext === 'PERSONAL'
          ? 'GLOBAL'
          : savedContext === 'PLATFORM' && hasPlatformAccess
            ? 'PLATFORM'
            : hasPlatformAccess
              ? 'PLATFORM'
              : 'GLOBAL';
      const permissions =
        restoredTenantId === null
          ? defaultScope === 'PLATFORM'
            ? savedPermissions.filter(isPlatformAdministratorPermission)
            : savedPermissions.filter(isPersonalPermission)
          : await this.api.getPermissions(restoredTenantId);

      this.activeTenantId.set(restoredTenantId);
      this.activeContext.set(
        restoredTenantId !== null
          ? 'BUSINESS'
          : defaultScope === 'PLATFORM'
            ? 'PLATFORM'
            : 'PERSONAL',
      );
      this.permissions.set(permissions);
      if (restoredTenantId !== savedId) this.persistActiveWorkspace(restoredTenantId);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Unable to load workspace access.');
      throw error;
    } finally {
      this.loading.set(false);
    }
  }

  private readLastWorkspace(): number | null {
    try {
      const userId = this.auth.user()?.user_id;
      if (!userId) return null;
      const raw = this.document.defaultView?.sessionStorage.getItem(
        `${LAST_WORKSPACE_KEY}.${userId}`,
      );
      if (!raw) return null;
      const value = Number(raw);
      return Number.isInteger(value) && value > 0 ? value : null;
    } catch {
      return null;
    }
  }

  private persistLastWorkspace(tenantId: number | null): void {
    try {
      const userId = this.auth.user()?.user_id;
      const storage = this.document.defaultView?.sessionStorage;
      if (!storage || !userId) return;
      const key = `${LAST_WORKSPACE_KEY}.${userId}`;
      if (tenantId === null) storage.removeItem(key);
      else storage.setItem(key, String(tenantId));
    } catch {
      // The last business selection is optional session convenience.
    }
  }

  private readActiveContext(): 'PERSONAL' | 'PLATFORM' | 'BUSINESS' | null {
    try {
      const userId = this.auth.user()?.user_id;
      if (!userId) return null;
      const value = this.document.defaultView?.sessionStorage.getItem(
        `${ACTIVE_CONTEXT_KEY}.${userId}`,
      );
      return value === 'PERSONAL' || value === 'PLATFORM' || value === 'BUSINESS' ? value : null;
    } catch {
      return null;
    }
  }

  private persistActiveContext(context: 'PERSONAL' | 'PLATFORM' | 'BUSINESS' | null): void {
    try {
      const userId = this.auth.user()?.user_id;
      const storage = this.document.defaultView?.sessionStorage;
      if (!storage || !userId) return;
      const key = `${ACTIVE_CONTEXT_KEY}.${userId}`;
      if (context) storage.setItem(key, context);
      else storage.removeItem(key);
    } catch {
      // The selected context remains active for the current application session.
    }
  }

  private readActiveWorkspace(): number | null {
    try {
      const userId = this.auth.user()?.user_id;
      if (!userId) return null;
      const raw = this.document.defaultView?.sessionStorage.getItem(
        `${ACTIVE_WORKSPACE_KEY}.${userId}`,
      );
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
