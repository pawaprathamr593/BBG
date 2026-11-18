import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { WorkspaceContextService } from '../workspace/workspace-context.service';

const BUSINESS_PERMISSIONS: Record<string, string> = {
  profile: 'BUSINESS_PROFILE_MANAGE',
  storefront: 'BUSINESS_PROFILE_MANAGE',
  catalogue: 'CATALOGUE_MANAGE',
  customers: 'CUSTOMERS_MANAGE',
  enquiries: 'ENQUIRIES_MANAGE',
  orders: 'ORDERS_MANAGE',
  payments: 'PAYMENTS_VIEW',
  promotions: 'PROMOTIONS_MANAGE',
  subscriptions: 'SUBSCRIPTIONS_MANAGE',
  members: 'TENANT_MEMBERS_VIEW',
  analytics: 'ANALYTICS_VIEW',
};

const PLATFORM_PERMISSIONS: Record<string, string> = {
  'platform-users': 'PLATFORM_USERS_MANAGE',
  'business-approval': 'BUSINESS_APPROVE',
  'subscription-approval': 'SUBSCRIPTIONS_APPROVE',
  'payment-qr-settings': 'SUBSCRIPTIONS_APPROVE',
  moderation: 'MODERATION_MANAGE',
  categories: 'CATEGORIES_MANAGE',
  'platform-analytics': 'ANALYTICS_VIEW',
  'system-health': 'SYSTEM_HEALTH_VIEW',
};

const PERSONAL_SECTIONS = new Set(['customers', 'enquiries', 'orders', 'payments']);

/**
 * Prevents direct navigation to workspace sections that are not available in
 * the active context. The backend remains authoritative for resource access.
 */
export const workspacePermissionGuard: CanActivateChildFn = async (route) => {
  const workspace = inject(WorkspaceContextService);
  const router = inject(Router);

  try {
    await workspace.initialize();
  } catch {
    return router.createUrlTree(['/dashboard']);
  }

  const section = route.paramMap.get('section') ?? route.routeConfig?.path ?? '';
  if (!section) return true;

  const context = workspace.activeContext();
  if (context === 'PERSONAL') {
    return PERSONAL_SECTIONS.has(section) ? true : router.createUrlTree(['/dashboard']);
  }

  const requiredPermission = context === 'BUSINESS'
    ? BUSINESS_PERMISSIONS[section]
    : context === 'PLATFORM'
      ? PLATFORM_PERMISSIONS[section]
      : undefined;

  if (!requiredPermission) return router.createUrlTree(['/dashboard']);

  const requiredScope = context === 'BUSINESS' ? 'TENANT' : 'PLATFORM';
  const allowed = workspace.permissions().some(
    (permission) => permission.scope_type === requiredScope
      && permission.permission_code === requiredPermission,
  );

  return allowed ? true : router.createUrlTree(['/dashboard']);
};
