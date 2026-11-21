import type { DashboardPermission } from '../dashboard/dashboard-api.service';

export type WorkspacePermissionScope = 'TENANT' | 'PLATFORM' | 'GLOBAL';

export function hasWorkspacePermission(
  permissions: DashboardPermission[],
  scope: WorkspacePermissionScope,
  permissionCode: string,
): boolean {
  return permissions.some((permission) => {
    const matchesScope =
      permission.scope_type === scope ||
      (scope === 'GLOBAL' &&
        permission.scope_type === 'PLATFORM' &&
        permission.role_code === 'CONSUMER');
    return matchesScope && permission.permission_code === permissionCode;
  });
}

export function hasActiveEntitlement(
  activeEntitlements: string | null | undefined,
  entitlementCode: string,
): boolean {
  if (!activeEntitlements) return false;
  return activeEntitlements.split(';').some((entry) => {
    const [code, value] = entry.split('=', 2);
    return code?.trim() === entitlementCode && value?.trim().toLowerCase() === 'true';
  });
}
