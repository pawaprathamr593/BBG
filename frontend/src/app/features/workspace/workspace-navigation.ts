import type { DashboardPermission } from '../../core/dashboard/dashboard-api.service';
import {
  hasActiveEntitlement,
  hasWorkspacePermission,
} from '../../core/workspace/workspace-access';
import type { WorkspacePermissionScope } from '../../core/workspace/workspace-access';

export type WorkspaceNavigationContext = 'PERSONAL' | 'BUSINESS' | 'PLATFORM';

export interface WorkspaceNavItem {
  label: string;
  route: string;
  permission: string | null;
  scope: WorkspacePermissionScope;
  entitlement: string | null;
  icon: string;
  description: string;
}

export interface WorkspaceNavGroup {
  name: string;
  items: WorkspaceNavItem[];
}

interface DefinedNavGroup {
  name: string;
  context: WorkspaceNavigationContext;
  items: WorkspaceNavItem[];
}

const NAV_GROUPS: DefinedNavGroup[] = [
  // PERSONAL CONTEXT
  {
    name: 'Overview',
    context: 'PERSONAL',
    items: [
      {
        label: 'Account Overview',
        route: '/dashboard',
        permission: null,
        scope: 'GLOBAL',
        entitlement: null,
        icon: 'layout-dashboard',
        description: 'View your account activity, enquiries, and registered businesses.',
      },
    ],
  },
  {
    name: 'My Businesses',
    context: 'PERSONAL',
    items: [
      {
        label: 'All Businesses',
        route: '/dashboard/businesses',
        permission: null,
        scope: 'GLOBAL',
        entitlement: null,
        icon: 'building-2',
        description: 'View and manage all your registered businesses and applications.',
      },
      {
        label: 'Register a Business',
        route: '/dashboard/businesses/register',
        permission: null,
        scope: 'GLOBAL',
        entitlement: null,
        icon: 'plus-circle',
        description: 'Start a new business registration on BBG.',
      },
    ],
  },
  {
    name: 'Personal Activity',
    context: 'PERSONAL',
    items: [
      {
        label: 'My Enquiries',
        route: '/dashboard/enquiries',
        permission: 'enquiry.own.view',
        scope: 'GLOBAL',
        entitlement: null,
        icon: 'message-square',
        description: 'View enquiries you have sent to marketplace businesses.',
      },
    ],
  },
  {
    name: 'Account',
    context: 'PERSONAL',
    items: [
      {
        label: 'My Profile & Addresses',
        route: '/dashboard/profile',
        permission: null,
        scope: 'GLOBAL',
        entitlement: null,
        icon: 'user',
        description: 'Update your personal profile, addresses, and account settings.',
      },
    ],
  },

  // BUSINESS CONTEXT
  {
    name: 'Overview',
    context: 'BUSINESS',
    items: [
      {
        label: 'Business Overview',
        route: '/dashboard',
        permission: null,
        scope: 'TENANT',
        entitlement: null,
        icon: 'layout-dashboard',
        description: 'Executive view of your active business operations.',
      },
    ],
  },
  {
    name: 'Business Management',
    context: 'BUSINESS',
    items: [
      {
        label: 'Business Profile',
        route: '/dashboard/profile',
        permission: 'business.view',
        scope: 'TENANT',
        entitlement: 'business.profile',
        icon: 'store',
        description: 'Manage your business details, branding, and location.',
      },
      {
        label: 'Storefront',
        route: '/dashboard/storefront',
        permission: 'business.view',
        scope: 'TENANT',
        entitlement: 'storefront.enabled',
        icon: 'globe',
        description: 'Configure public storefront appearance and catalog visibility.',
      },
    ],
  },
  {
    name: 'Catalogue',
    context: 'BUSINESS',
    items: [
      {
        label: 'Catalogue',
        route: '/dashboard/catalogue',
        permission: 'catalogue.view',
        scope: 'TENANT',
        entitlement: 'catalogue.enabled',
        icon: 'package',
        description: 'Create and maintain products in your business catalogue.',
      },
    ],
  },
  {
    name: 'Relationships',
    context: 'BUSINESS',
    items: [
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
    ],
  },
  {
    name: 'Marketing',
    context: 'BUSINESS',
    items: [
      {
        label: 'Promotions',
        route: '/dashboard/promotions',
        permission: 'promotion.view',
        scope: 'TENANT',
        entitlement: 'promotions.enabled',
        icon: 'megaphone',
        description: 'Create and manage business promotions.',
      },
    ],
  },
  {
    name: 'Team & Access',
    context: 'BUSINESS',
    items: [
      {
        label: 'Team & Access',
        route: '/dashboard/members',
        permission: 'tenant.view',
        scope: 'TENANT',
        entitlement: null,
        icon: 'users-round',
        description: 'View team members and manage their roles.',
      },
    ],
  },
  {
    name: 'Finance',
    context: 'BUSINESS',
    items: [
      {
        label: 'Subscriptions & Plans',
        route: '/dashboard/subscriptions',
        permission: 'subscription.view',
        scope: 'TENANT',
        entitlement: null,
        icon: 'badge-check',
        description: 'Review plans, subscriptions, and renewal status.',
      },
      {
        label: 'Payments',
        route: '/dashboard/payments',
        permission: 'payment.view',
        scope: 'TENANT',
        entitlement: null,
        icon: 'wallet',
        description: 'Review payment activity and verification records.',
      },
    ],
  },
  {
    name: 'Insights',
    context: 'BUSINESS',
    items: [
      {
        label: 'Analytics',
        route: '/dashboard/analytics',
        permission: 'report.view',
        scope: 'TENANT',
        entitlement: 'advanced.reports.enabled',
        icon: 'chart-no-axes-combined',
        description: 'Review business performance metrics and trends.',
      },
    ],
  },

  // PLATFORM CONTEXT
  {
    name: 'Overview',
    context: 'PLATFORM',
    items: [
      {
        label: 'Platform Overview',
        route: '/dashboard',
        permission: null,
        scope: 'PLATFORM',
        entitlement: null,
        icon: 'layout-dashboard',
        description: 'System-wide operational summary and platform control.',
      },
    ],
  },
  {
    name: 'Users & Businesses',
    context: 'PLATFORM',
    items: [
      {
        label: 'Platform Users',
        route: '/dashboard/platform-users',
        permission: 'user.view',
        scope: 'PLATFORM',
        entitlement: null,
        icon: 'user-cog',
        description: 'Review and manage platform user accounts.',
      },
      {
        label: 'Business Approvals',
        route: '/dashboard/business-approval',
        permission: 'business.approve',
        scope: 'PLATFORM',
        entitlement: null,
        icon: 'building-check',
        description: 'Review and approve business registration applications.',
      },
    ],
  },
  {
    name: 'Subscriptions & Finance',
    context: 'PLATFORM',
    items: [
      {
        label: 'Subscription Approvals',
        route: '/dashboard/subscription-approval',
        permission: 'subscription.approve',
        scope: 'PLATFORM',
        entitlement: null,
        icon: 'credit-card',
        description: 'Review and approve merchant subscription requests.',
      },
      {
        label: 'Subscription Plans',
        route: '/dashboard/subscription-plans',
        permission: 'subscription.view',
        scope: 'PLATFORM',
        entitlement: null,
        icon: 'badge-check',
        description: 'Manage subscription plans, pricing, and active status.',
      },
      {
        label: 'Payment QR Settings',
        route: '/dashboard/payment-qr-settings',
        permission: 'subscription.update',
        scope: 'PLATFORM',
        entitlement: null,
        icon: 'qr-code',
        description: 'Configure platform UPI / QR payment destinations.',
      },
    ],
  },
  {
    name: 'Marketplace',
    context: 'PLATFORM',
    items: [
      {
        label: 'Categories',
        route: '/dashboard/categories',
        permission: 'admin.view',
        scope: 'PLATFORM',
        entitlement: null,
        icon: 'tags',
        description: 'Manage marketplace categories and taxonomy.',
      },
      {
        label: 'Content Moderation',
        route: '/dashboard/moderation',
        permission: 'admin.view',
        scope: 'PLATFORM',
        entitlement: null,
        icon: 'shield-check',
        description: 'Review reported products, reviews, and media.',
      },
    ],
  },
  {
    name: 'Platform Insights',
    context: 'PLATFORM',
    items: [
      {
        label: 'Platform Analytics',
        route: '/dashboard/platform-analytics',
        permission: 'report.view',
        scope: 'PLATFORM',
        entitlement: null,
        icon: 'chart-column',
        description: 'Review platform-level metrics and growth trends.',
      },
      {
        label: 'System Health',
        route: '/dashboard/system-health',
        permission: 'admin.view',
        scope: 'PLATFORM',
        entitlement: null,
        icon: 'activity',
        description: 'Review system infrastructure and API health.',
      },
    ],
  },
];

export function getWorkspaceNavGroups(
  context: WorkspaceNavigationContext,
  permissions: DashboardPermission[],
  activeEntitlements: string | null = null,
): WorkspaceNavGroup[] {
  const matchingGroups = NAV_GROUPS.filter((group) => group.context === context);

  return matchingGroups
    .map((group) => {
      const visibleItems = group.items.filter((item) => {
        if (item.permission === null) return true;
        const hasPerm = hasWorkspacePermission(permissions, item.scope, item.permission);
        if (!hasPerm) return false;
        return (
          item.entitlement === null || hasActiveEntitlement(activeEntitlements, item.entitlement)
        );
      });
      return {
        name: group.name,
        items: visibleItems,
      };
    })
    .filter((group) => group.items.length > 0);
}

export function getWorkspaceNavItems(
  context: WorkspaceNavigationContext,
  permissions: DashboardPermission[],
  activeEntitlements: string | null = null,
): WorkspaceNavItem[] {
  const groups = getWorkspaceNavGroups(context, permissions, activeEntitlements);
  return groups.flatMap((group) => group.items).filter((item) => item.route !== '/dashboard');
}
