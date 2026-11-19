import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { WorkspaceContextService } from '../workspace/workspace-context.service';
import { hasActiveEntitlement, hasWorkspacePermission } from './workspace-access';

const BUSINESS_PERMISSIONS: Record<string, string> = {
  profile: 'business.view',
  storefront: 'business.view',
  catalogue: 'catalogue.view',
  customers: 'customer.view',
  enquiries: 'enquiry.view',
  orders: 'order.view',
  payments: 'payment.view',
  promotions: 'promotion.view',
  subscriptions: 'subscription.view',
  members: 'tenant.view',
  analytics: 'report.view',
};

const BUSINESS_ENTITLEMENTS: Record<string, string> = {
  profile: 'business.profile',
  storefront: 'storefront.enabled',
  catalogue: 'catalogue.enabled',
  promotions: 'promotions.enabled',
  analytics: 'advanced.reports.enabled',
};

const PLATFORM_PERMISSIONS: Record<string, string> = {
  'platform-users': 'user.view',
  'business-approval': 'business.approve',
  'subscription-approval': 'subscription.approve',
  'payment-qr-settings': 'subscription.update',
  moderation: 'admin.view',
  categories: 'admin.view',
  'platform-analytics': 'report.view',
  'system-health': 'admin.view',
};

const PERSONAL_PERMISSIONS: Record<string, string> = {
  customers: 'user.view',
  enquiries: 'enquiry.own.view',
  orders: 'order.own.view',
};

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
    const requiredPermission = PERSONAL_PERMISSIONS[section];
    const allowed = requiredPermission !== undefined
      && hasWorkspacePermission(workspace.permissions(), 'PLATFORM', requiredPermission);
    return allowed ? true : router.createUrlTree(['/dashboard']);
  }

  const requiredPermission = context === 'BUSINESS'
    ? BUSINESS_PERMISSIONS[section]
    : context === 'PLATFORM'
      ? PLATFORM_PERMISSIONS[section]
      : undefined;

  if (!requiredPermission) return router.createUrlTree(['/dashboard']);

  const requiredScope = context === 'BUSINESS' ? 'TENANT' : 'PLATFORM';
  const hasPermission = hasWorkspacePermission(workspace.permissions(), requiredScope, requiredPermission);
  const entitlement = context === 'BUSINESS' ? BUSINESS_ENTITLEMENTS[section] : undefined;
  const hasEntitlement = entitlement === undefined
    || hasActiveEntitlement(workspace.activeTenant()?.active_entitlements, entitlement);
  return hasPermission && hasEntitlement ? true : router.createUrlTree(['/dashboard']);
};
