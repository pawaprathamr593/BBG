export type PermissionScope = 'PLATFORM' | 'TENANT';

export interface AuthPermissionRecord {
  role_code: string;
  scope_type: PermissionScope;
  permission_code: string;
  module_code: string;
}

export interface PermissionContext {
  tenant_id: number | null;
  permissions: AuthPermissionRecord[];
}

/**
 * Holds permission codes from the authenticated backend permission endpoint.
 * A role or permission is never inferred from the profile or URL.
 */
@Injectable({ providedIn: 'root' })
export class PermissionService {
  private readonly permissionState = signal<ReadonlySet<string>>(new Set());
  private readonly contextState = signal<PermissionContext | null>(null);
  readonly permissions = this.permissionState.asReadonly();
  readonly context = this.contextState.asReadonly();

  has(permission: string, scope?: PermissionScope): boolean {
    if (!permission.trim() || !this.permissionState().has(permission)) return false;
    if (!scope) return true;
    return this.contextState()?.permissions.some(
      (record) => record.permission_code === permission && record.scope_type === scope,
    ) ?? false;
  }

  hasAll(permissions: readonly string[], scope?: PermissionScope): boolean {
    return permissions.length > 0 && permissions.every((permission) => this.has(permission, scope));
  }

  replaceFromVerifiedResponse(context: PermissionContext): void {
    const validRecords = context.permissions.filter(
      (record) => typeof record.permission_code === 'string'
        && record.permission_code.trim().length > 0
        && (record.scope_type === 'PLATFORM' || record.scope_type === 'TENANT'),
    );
    this.contextState.set({ tenant_id: context.tenant_id, permissions: validRecords });
    this.permissionState.set(new Set(validRecords.map((record) => record.permission_code)));
  }

  clear(): void {
    this.permissionState.set(new Set());
    this.contextState.set(null);
  }
}
