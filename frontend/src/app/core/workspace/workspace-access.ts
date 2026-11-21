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

const ENTITLEMENT_ALIASES: Record<string, string[]> = {
  'business.profile': ['business.profile', 'BUSINESS_LISTING'],
  'BUSINESS_LISTING': ['BUSINESS_LISTING', 'business.profile'],
  'storefront.enabled': ['storefront.enabled', 'STOREFRONT_ACCESS'],
  'STOREFRONT_ACCESS': ['STOREFRONT_ACCESS', 'storefront.enabled'],
  'catalogue.enabled': ['catalogue.enabled', 'PRODUCT_MANAGEMENT'],
  'PRODUCT_MANAGEMENT': ['PRODUCT_MANAGEMENT', 'catalogue.enabled'],
  'promotions.enabled': ['promotions.enabled', 'PROMOTIONAL_POSTS', 'DAILY_PROMOTION_LIMIT'],
  'PROMOTIONAL_POSTS': ['PROMOTIONAL_POSTS', 'DAILY_PROMOTION_LIMIT', 'promotions.enabled'],
  'DAILY_PROMOTION_LIMIT': ['DAILY_PROMOTION_LIMIT', 'PROMOTIONAL_POSTS', 'promotions.enabled'],
  'advanced.reports.enabled': ['advanced.reports.enabled', 'SEO_SUGGESTIONS', 'ADVANCED_ANALYTICS'],
  'SEO_SUGGESTIONS': ['SEO_SUGGESTIONS', 'ADVANCED_ANALYTICS', 'advanced.reports.enabled'],
  'ADVANCED_ANALYTICS': ['ADVANCED_ANALYTICS', 'SEO_SUGGESTIONS', 'advanced.reports.enabled'],
};

export function hasActiveEntitlement(
  activeEntitlements: string | null | undefined,
  entitlementCode: string,
): boolean {
  if (!activeEntitlements) return false;
  const targetCodes = ENTITLEMENT_ALIASES[entitlementCode] ?? [entitlementCode];
  return activeEntitlements.split(';').some((entry) => {
    const [code, value] = entry.split('=', 2);
    const trimmedCode = code?.trim() ?? '';
    const trimmedValue = value?.trim().toLowerCase() ?? '';
    const isAffirmative =
      trimmedValue === 'true' ||
      trimmedValue === '1' ||
      trimmedValue === 'yes' ||
      Number(trimmedValue) > 0;
    return targetCodes.includes(trimmedCode) && isAffirmative;
  });
}
