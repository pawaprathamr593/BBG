import type { DashboardPermission } from '../../core/dashboard/dashboard-api.service';
import { hasActiveEntitlement, hasWorkspacePermission } from '../../core/workspace/workspace-access';
import type { WorkspacePermissionScope } from '../../core/workspace/workspace-access';

export type WorkspaceNavigationContext = 'PERSONAL' | 'BUSINESS' | 'PLATFORM';

export interface WorkspaceNavItem {
  label: string;
  route: string;
  permission: string;
  scope: WorkspacePermissionScope;
  entitlement: string | null;
  icon: string;
  description: string;
}

const WORKSPACE_NAV_ITEMS: WorkspaceNavItem[] = [
  {
    label: 'Profile & storefront',
    route: '/dashboard/profile',
    permission: 'business.view',
    scope: 'TENANT',
    entitlement: 'business.profile',
    icon: 'store',
    description: 'Manage your business profile and storefront presence.',
  },
  {
    label: 'Catalogue',
    route: '/dashboard/catalogue',
    permission: 'catalogue.view',
    scope: 'TENANT',
    entitlement: 'catalogue.enabled',
    icon: 'package',
    description: 'Create and maintain products in your business catalogue.',
  },
  {
    label: 'Customers',
    route: '/dashboard/customers',
    permission: 'customer.view',
    scope: 'TENANT',
    entitlement: null,
    icon: 'users',
    description: 'Review customers connected to your business.',
  },
  {
    label: 'Enquiries',
    route: '/dashboard/enquiries',
    permission: 'enquiry.view',
    scope: 'TENANT',
    entitlement: null,
    icon: 'message-square',
    description: 'Respond to incoming customer enquiries.',
  },
  {
    label: 'Orders',
    route: '/dashboard/orders',
    permission: 'order.view',
    scope: 'TENANT',
    entitlement: null,
    icon: 'shopping-bag',
    description: 'Review and process business orders.',
  },
  {
    label: 'Payments',
    route: '/dashboard/payments',
    permission: 'payment.view',
    scope: 'TENANT',
    entitlement: null,
    icon: 'wallet',
    description: 'Review payment activity for your business.',
  },
  {
    label: 'Promotions',
    route: '/dashboard/promotions',
    permission: 'promotion.view',
    scope: 'TENANT',
    entitlement: 'promotions.enabled',
    icon: 'megaphone',
    description: 'Create and manage business promotions.',
  },
  {
    label: 'Subscriptions',
    route: '/dashboard/subscriptions',
    permission: 'subscription.view',
    scope: 'TENANT',
    entitlement: null,
    icon: 'badge-check',
    description: 'Review plans, subscriptions and renewals.',
  },
  {
    label: 'Team & access',
    route: '/dashboard/members',
    permission: 'tenant.view',
    scope: 'TENANT',
    entitlement: null,
    icon: 'users-round',
    description: 'View members and their workspace access.',
  },
  {
    label: 'Analytics',
    route: '/dashboard/analytics',
    permission: 'report.view',
    scope: 'TENANT',
    entitlement: 'advanced.reports.enabled',
    icon: 'chart-no-axes-combined',
    description: 'Review supported business performance metrics.',
  },
  {
    label: 'Platform users',
    route: '/dashboard/platform-users',
    permission: 'user.view',
    scope: 'PLATFORM',
    entitlement: null,
    icon: 'user-cog',
    description: 'Review and manage platform user accounts.',
  },
  {
    label: 'Business approvals',
    route: '/dashboard/business-approval',
    permission: 'business.approve',
    scope: 'PLATFORM',
    entitlement: null,
    icon: 'building-check',
    description: 'Review business registration applications.',
  },
  {
    label: 'Subscription approvals',
    route: '/dashboard/subscription-approval',
    permission: 'subscription.approve',
    scope: 'PLATFORM',
    entitlement: null,
    icon: 'credit-card',
    description: 'Review business subscription requests.',
  },
  {
    label: 'Marketplace categories',
    route: '/dashboard/categories',
    permission: 'admin.view',
    scope: 'PLATFORM',
    entitlement: null,
    icon: 'tags',
    description: 'Manage marketplace categories and taxonomy.',
  },
  {
    label: 'Moderation',
    route: '/dashboard/moderation',
    permission: 'admin.view',
    scope: 'PLATFORM',
    entitlement: null,
    icon: 'shield-check',
    description: 'Review reported marketplace content.',
  },
  {
    label: 'Platform analytics',
    route: '/dashboard/platform-analytics',
    permission: 'report.view',
    scope: 'PLATFORM',
    entitlement: null,
    icon: 'chart-column',
    description: 'Review platform-level analytics and trends.',
  },
  {
    label: 'System health',
    route: '/dashboard/system-health',
    permission: 'admin.view',
    scope: 'PLATFORM',
    entitlement: null,
    icon: 'activity',
    description: 'Review safe platform operational health.',
  },
  {
    label: 'My Orders',
    route: '/dashboard/orders',
    permission: 'order.own.view',
    scope: 'GLOBAL',
    entitlement: null,
    icon: 'receipt-text',
    description: 'Track orders placed with BBG businesses.',
  },
  {
    label: 'My Enquiries',
    route: '/dashboard/enquiries',
    permission: 'enquiry.own.view',
    scope: 'GLOBAL',
    entitlement: null,
    icon: 'messages-square',
    description: 'Continue conversations with businesses.',
  },
  {
    label: 'My Profile & Addresses',
    route: '/dashboard/customers',
    permission: 'user.view',
    scope: 'GLOBAL',
    entitlement: null,
    icon: 'contact-round',
    description: 'Manage your personal details and saved addresses.',
  },
];

export function getWorkspaceNavItems(
  context: WorkspaceNavigationContext,
  permissions: DashboardPermission[],
  activeEntitlements: string | null = null,
): WorkspaceNavItem[] {
  const scope = context === 'BUSINESS' ? 'TENANT' : context === 'PLATFORM' ? 'PLATFORM' : 'GLOBAL';
  return WORKSPACE_NAV_ITEMS.filter((item) => {
    if (item.scope !== scope) return false;
    const isOwnerOnlyTeamAccess = context === 'BUSINESS'
      && item.route === '/dashboard/members'
      && permissions.some((permission) => permission.scope_type === 'TENANT' && permission.role_code === 'TENANT_OWNER');
    if (!isOwnerOnlyTeamAccess && !hasWorkspacePermission(permissions, item.scope, item.permission)) return false;
    return item.entitlement === null || hasActiveEntitlement(activeEntitlements, item.entitlement);
  });
}
