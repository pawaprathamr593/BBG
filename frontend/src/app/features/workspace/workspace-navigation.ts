import type { DashboardPermission } from '../../core/dashboard/dashboard-api.service';

export type WorkspaceNavigationContext = 'PERSONAL' | 'BUSINESS' | 'PLATFORM';

export interface WorkspaceNavItem {
  label: string;
  route: string;
  permission: string | null;
  scope: 'TENANT' | 'PLATFORM' | 'GLOBAL';
  icon: string;
  description: string;
}

const WORKSPACE_NAV_ITEMS: WorkspaceNavItem[] = [
  {
    label: 'Profile & storefront',
    route: '/dashboard/profile',
    permission: 'BUSINESS_PROFILE_MANAGE',
    scope: 'TENANT',
    icon: 'store',
    description: 'Manage your business profile and storefront presence.',
  },
  {
    label: 'Catalogue',
    route: '/dashboard/catalogue',
    permission: 'CATALOGUE_MANAGE',
    scope: 'TENANT',
    icon: 'package',
    description: 'Create and maintain products in your business catalogue.',
  },
  {
    label: 'Customers',
    route: '/dashboard/customers',
    permission: 'CUSTOMERS_MANAGE',
    scope: 'TENANT',
    icon: 'users',
    description: 'Review customers connected to your business.',
  },
  {
    label: 'Enquiries',
    route: '/dashboard/enquiries',
    permission: 'ENQUIRIES_MANAGE',
    scope: 'TENANT',
    icon: 'message-square',
    description: 'Respond to incoming customer enquiries.',
  },
  {
    label: 'Orders',
    route: '/dashboard/orders',
    permission: 'ORDERS_MANAGE',
    scope: 'TENANT',
    icon: 'shopping-bag',
    description: 'Review and process business orders.',
  },
  {
    label: 'Payments',
    route: '/dashboard/payments',
    permission: 'PAYMENTS_VIEW',
    scope: 'TENANT',
    icon: 'wallet',
    description: 'Review payment activity for your business.',
  },
  {
    label: 'Promotions',
    route: '/dashboard/promotions',
    permission: 'PROMOTIONS_MANAGE',
    scope: 'TENANT',
    icon: 'megaphone',
    description: 'Create and manage business promotions.',
  },
  {
    label: 'Subscriptions',
    route: '/dashboard/subscriptions',
    permission: 'SUBSCRIPTIONS_MANAGE',
    scope: 'TENANT',
    icon: 'badge-check',
    description: 'Review plans, subscriptions and renewals.',
  },
  {
    label: 'Team & access',
    route: '/dashboard/members',
    permission: 'TENANT_MEMBERS_VIEW',
    scope: 'TENANT',
    icon: 'users-round',
    description: 'View members and their workspace access.',
  },
  {
    label: 'Analytics',
    route: '/dashboard/analytics',
    permission: 'ANALYTICS_VIEW',
    scope: 'TENANT',
    icon: 'chart-no-axes-combined',
    description: 'Review supported business performance metrics.',
  },
  {
    label: 'Platform users',
    route: '/dashboard/platform-users',
    permission: 'PLATFORM_USERS_MANAGE',
    scope: 'PLATFORM',
    icon: 'user-cog',
    description: 'Review and manage platform user accounts.',
  },
  {
    label: 'Business approvals',
    route: '/dashboard/business-approval',
    permission: 'BUSINESS_APPROVE',
    scope: 'PLATFORM',
    icon: 'building-check',
    description: 'Review business registration applications.',
  },
  {
    label: 'Subscription approvals',
    route: '/dashboard/subscription-approval',
    permission: 'SUBSCRIPTIONS_APPROVE',
    scope: 'PLATFORM',
    icon: 'credit-card',
    description: 'Review business subscription requests.',
  },
  {
    label: 'Marketplace categories',
    route: '/dashboard/categories',
    permission: 'CATEGORIES_MANAGE',
    scope: 'PLATFORM',
    icon: 'tags',
    description: 'Manage marketplace categories and taxonomy.',
  },
  {
    label: 'Moderation',
    route: '/dashboard/moderation',
    permission: 'MODERATION_MANAGE',
    scope: 'PLATFORM',
    icon: 'shield-check',
    description: 'Review reported marketplace content.',
  },
  {
    label: 'Platform analytics',
    route: '/dashboard/platform-analytics',
    permission: 'ANALYTICS_VIEW',
    scope: 'PLATFORM',
    icon: 'chart-column',
    description: 'Review platform-level analytics and trends.',
  },
  {
    label: 'System health',
    route: '/dashboard/system-health',
    permission: 'SYSTEM_HEALTH_VIEW',
    scope: 'PLATFORM',
    icon: 'activity',
    description: 'Review safe platform operational health.',
  },
  {
    label: 'My Orders',
    route: '/dashboard/orders',
    permission: null,
    scope: 'GLOBAL',
    icon: 'receipt-text',
    description: 'Track orders placed with BBG businesses.',
  },
  {
    label: 'My Enquiries',
    route: '/dashboard/enquiries',
    permission: null,
    scope: 'GLOBAL',
    icon: 'messages-square',
    description: 'Continue conversations with businesses.',
  },
  {
    label: 'My Payments',
    route: '/dashboard/payments',
    permission: null,
    scope: 'GLOBAL',
    icon: 'hand-coins',
    description: 'Review your customer payment activity.',
  },
  {
    label: 'My Profile & Addresses',
    route: '/dashboard/customers',
    permission: null,
    scope: 'GLOBAL',
    icon: 'contact-round',
    description: 'Manage your personal details and saved addresses.',
  },
];

export function getWorkspaceNavItems(
  context: WorkspaceNavigationContext,
  permissions: DashboardPermission[],
): WorkspaceNavItem[] {
  const scope = context === 'BUSINESS' ? 'TENANT' : context === 'PLATFORM' ? 'PLATFORM' : 'GLOBAL';
  return WORKSPACE_NAV_ITEMS.filter((item) => {
    if (item.scope !== scope) return false;
    if (item.permission === null) return true;
    return permissions.some((permission) =>
      permission.scope_type === item.scope && permission.permission_code === item.permission,
    );
  });
}
