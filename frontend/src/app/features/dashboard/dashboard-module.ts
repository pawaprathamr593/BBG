import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api-base-url';
import { S3UploadService } from '../../core/storage/s3-upload.service';
import { AuthService } from '../../core/auth/auth.service';
import { WorkspaceContextService } from '../../core/workspace/workspace-context.service';
import {
  hasActiveEntitlement,
  hasWorkspacePermission,
} from '../../core/workspace/workspace-access';
import { WorkspaceDrawer } from '../../shared/workspace-drawer/workspace-drawer';
import { BusinessProfileModule } from './components/business-profile-module/business-profile-module';
import { StorefrontModule } from './components/storefront-module/storefront-module';
import {
  WorkspaceRecordsModule,
  WorkspaceRecordCardModel,
} from './components/workspace-records-module/workspace-records-module';
import { PersonalAccountModule } from './components/personal-account-module/personal-account-module';
import { SubscriptionPlansModule } from './components/subscription-plans-module/subscription-plans-module';
import { PromotionComposerModule } from './components/promotion-composer-module/promotion-composer-module';
import { PlatformAnalyticsModule } from './components/platform-analytics-module/platform-analytics-module';
import {
  ModerationHistoryModule,
  ModerationHistoryItem,
} from './components/moderation-history-module/moderation-history-module';
import {
  WorkspaceSummaryModule,
  WorkspaceSummaryItem,
} from './components/workspace-summary-module/workspace-summary-module';
import { PaymentQrSettingsModule } from './components/payment-qr-settings-module/payment-qr-settings-module';
import { PlatformCategoriesModule } from './components/platform-categories-module/platform-categories-module';
import { PersonalAddressesModule } from './components/personal-addresses-module/personal-addresses-module';

type EnvelopeKey =
  | 'authParam'
  | 'businessParam'
  | 'customerParam'
  | 'orderParam'
  | 'enquiryParam'
  | 'paymentParam'
  | 'promotionParam'
  | 'subscriptionParam'
  | 'adminParam'
  | 'tenantParam'
  | 'dashboardParam';
interface ApiEnvelope<T = unknown> {
  status: 'SUCCESS' | 'FAILED' | 'EXCEPTION';
  msgArr?: string[];
  data?: T | [];
}
interface DataRecord {
  [key: string]: unknown;
}
interface ListResult {
  items?: DataRecord[];
  pagination?: { page?: number; page_size?: number; total?: number };
}
type DecisionKind = 'reject-business' | 'approve-subscription' | 'reject-subscription' | 'moderate';
class StaleWorkspaceRequestError extends Error {}

const ACTION_PERMISSION_CODES: Record<string, string> = {
  'confirm-order': 'order.update',
  'cancel-order': 'order.update',
  'reply-enquiry': 'enquiry.update',
  'close-enquiry': 'enquiry.update',
  'manage-post-media': 'promotion.update',
  'publish-promotion': 'promotion.update',
  'unpublish-promotion': 'promotion.update',
  'suspend-user': 'user.update',
  'restore-user': 'user.update',
  'approve-business': 'business.approve',
  'reject-business': 'business.approve',
  'reopen-business': 'business.approve',
  'renew-subscription': 'subscription.create',
  'approve-subscription': 'subscription.approve',
  'reject-subscription': 'subscription.approve',
  'edit-plan': 'subscription.update',
  'create-plan': 'subscription.update',
  'change-member-role': 'tenant.update',
  'remove-member': 'tenant.update',
  moderate: 'admin.update',
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-dashboard-module',
  standalone: true,
  imports: [
    WorkspaceDrawer,
    BusinessProfileModule,
    StorefrontModule,
    WorkspaceRecordsModule,
    PersonalAccountModule,
    SubscriptionPlansModule,
    PromotionComposerModule,
    PlatformAnalyticsModule,
    ModerationHistoryModule,
    WorkspaceSummaryModule,
    PaymentQrSettingsModule,
    PlatformCategoriesModule,
    PersonalAddressesModule,
  ],
  templateUrl: './dashboard-module.html',
  styleUrl: './dashboard-module.scss',
})
export class DashboardModule implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly s3Upload = inject(S3UploadService);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly auth = inject(AuthService);
  private readonly workspace = inject(WorkspaceContextService);
  private readonly destroyRef = inject(DestroyRef);

  readonly section = signal('profile');
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly activeTenantId = this.workspace.activeTenantId;
  readonly isPersonalContext = computed(() => this.workspace.activeContext() === 'PERSONAL');
  readonly error = signal('');
  readonly notice = signal('');
  readonly unsupported = signal('');
  readonly unsupportedTitle = signal('This section is not available');
  readonly items = signal<DataRecord[]>([]);
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly totalItems = signal(0);
  readonly paginationPageSize = computed(() => this.pageSize());
  readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.totalItems() / this.paginationPageSize())),
  );
  private loadSequence = 0;
  private loadedContextKey: string | null = null;
  private lastLoadedPage = 1;

  setPageSize(size: number): void {
    if (this.pageSize() === size) return;
    this.pageSize.set(size);
    this.currentPage.set(1);
    void this.load();
  }
  readonly filterSearch = signal('');
  readonly filterStatus = signal('');
  readonly filterFrom = signal('');
  readonly filterTo = signal('');
  readonly filteredItems = computed(() => {
    const search = this.filterSearch().trim().toLowerCase();
    const status = this.filterStatus().toUpperCase();
    const from = this.filterFrom();
    const to = this.filterTo();
    return this.items().filter((item) => {
      if (
        search &&
        !Object.values(item).some(
          (value) =>
            value !== null &&
            typeof value !== 'object' &&
            String(value).toLowerCase().includes(search),
        )
      )
        return false;
      const statusValue = [
        'order_status',
        'payment_status',
        'enquiry_status',
        'publication_status',
        'approval_status',
        'subscription_status',
        'status',
      ]
        .map((key) => item[key])
        .find((value) => value !== undefined && value !== null);
      if (status && String(statusValue ?? '').toUpperCase() !== status) return false;
      const dateValue = [
        'created_on',
        'created_at',
        'order_date',
        'enquiry_date',
        'payment_date',
        'updated_on',
      ]
        .map((key) => item[key])
        .find((value) => value !== undefined && value !== null);
      if (from || to) {
        const date = dateValue ? new Date(String(dateValue)) : null;
        if (!date || Number.isNaN(date.getTime())) return false;
        const day = date.toISOString().slice(0, 10);
        if (from && day < from) return false;
        if (to && day > to) return false;
      }
      return true;
    });
  });
  readonly summary = signal<DataRecord | null>(null);
  readonly summaryCardModels = computed<WorkspaceSummaryItem[]>(() =>
    this.summaryEntries().map((entry) => ({
      key: entry.key,
      label: this.humanize(entry.key),
      value: this.formatValue(entry.value),
    })),
  );
  readonly storefrontDetails = computed(() => {
    const value = this.summary()?.['storefront'];
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as DataRecord)
      : null;
  });
  readonly showReplyDrawer = signal(false);
  readonly showPaymentQrDrawer = signal(false);
  readonly showPlanEditDrawer = signal(false);
  readonly editingPlanId = signal<number | null>(null);
  readonly editingPlanCode = signal('');
  readonly editingPlanName = signal('');
  readonly editingPlanPrice = signal('');
  readonly editingPlanCycle = signal('');
  readonly editingPlanDescription = signal('');
  readonly editingPlanStatus = signal('ACTIVE');
  readonly editingPlanEntitlements = signal<Record<string, unknown>>({});
  readonly showPlanCreateDrawer = signal(false);
  readonly newPlanCode = signal('');
  readonly newPlanName = signal('');
  readonly newPlanCycle = signal('QUARTERLY');
  readonly newPlanPrice = signal('');
  readonly newPlanDescription = signal('');
  readonly newPlanStatus = signal('ACTIVE');
  readonly newPlanEntitlements = signal<Record<string, unknown>>({
    'business.profile': true,
    'storefront.enabled': true,
    'catalogue.enabled': true,
    'product.limit': '50',
    'promotions.enabled': true,
    'promotions.limit': '10',
    'advanced.reports.enabled': false,
    'support.level': 'STANDARD',
  });
  readonly showTeamMemberDrawer = signal(false);
  readonly teamMemberMode = signal<'add' | 'invite'>('add');
  readonly teamSearchEmail = signal('');
  readonly teamSearchResults = signal<DataRecord[]>([]);
  readonly teamSearchLoading = signal(false);
  readonly teamSelectedUserId = signal<number | null>(null);
  readonly teamSelectedUserName = signal('');
  readonly teamInviteEmail = signal('');
  readonly teamSelectedRole = signal('STAFF');
  readonly createdInvitationToken = signal<string | null>(null);
  readonly showChangeRoleDrawer = signal(false);
  readonly targetMemberId = signal<number | null>(null);
  readonly targetMemberName = signal('');
  readonly targetMemberRole = signal('STAFF');
  readonly replyEnquiryId = signal<number | null>(null);
  readonly replyMessage = signal('');
  readonly showDecisionDrawer = signal(false);
  readonly decisionKind = signal<DecisionKind>('reject-business');
  readonly decisionItem = signal<DataRecord | null>(null);
  readonly decisionReason = signal('');
  readonly decisionStartsOn = signal('');
  readonly decisionEndsOn = signal('');
  readonly moderationAction = signal('DISMISS_REPORT');
  readonly showProofDrawer = signal(false);
  readonly proofFile = signal<File | null>(null);
  readonly proofSubscription = signal<DataRecord | null>(null);
  readonly proofPaymentReference = signal('');
  readonly plans = signal<DataRecord[]>([]);
  readonly pendingPlanId = signal<number | null>(null);
  readonly proofDrafts = signal<
    Record<number, { objectKey: string; paymentReference: string; fileName: string }>
  >({});
  readonly qrPayeeName = signal('');
  readonly qrUpiId = signal('');
  readonly qrInstructions = signal('');
  readonly qrFile = signal<File | null>(null);
  readonly qrPreviewUrl = signal<string | null>(null);
  readonly subscriptionReview = signal<DataRecord | null>(null);
  readonly recordDetail = signal<DataRecord | null>(null);
  readonly recordDetailTitle = signal('');
  readonly moderationHistory = signal<DataRecord[]>([]);
  readonly moderationHistoryLoading = signal(false);
  readonly analyticsTrends = signal<DataRecord[]>([]);
  readonly moderationHistoryItems = computed<ModerationHistoryItem[]>(() =>
    this.moderationHistory().map((entry) => ({
      id: this.recordId(entry, 'history_id'),
      title: this.recordTitle(entry),
      subtitle: this.recordSubtitle(entry),
      status: this.statusOf(entry) ? this.humanize(this.statusOf(entry)) : '',
      statusClass: this.statusClass(this.statusOf(entry)),
      fields: this.recordEntries(entry).map((field) => ({
        key: field.key,
        label: this.humanize(field.key),
        value: this.formatValue(field.value),
      })),
    })),
  );
  readonly showPromotionComposer = signal(false);
  readonly promotionTitle = signal('');
  readonly promotionContent = signal('');
  readonly promotionValidUntil = signal('');
  readonly originalPromotionValidUntil = signal('');
  readonly promotionFiles = signal<File[]>([]);
  readonly promotionMediaPreviews = signal<Map<File, string>>(new Map());
  readonly promotionMediaBusy = signal(false);
  readonly promotionUploadProgress = signal(0);
  readonly promotionError = signal('');
  readonly draftPromotionId = signal<number | null>(null);
  readonly promotionUploadedCount = signal(0);

  readonly title = computed(() => {
    const section = this.section();
    if (this.isPersonalContext()) {
      const personalTitles: Record<string, string> = {
        customers: 'My Profile & Addresses',
        enquiries: 'My Enquiries',
        orders: 'My Orders',
        payments: 'My Payments',
      };
      if (personalTitles[section]) return personalTitles[section];
    }
    return (
      this.config[section]?.title ??
      (this.workspace.activeTenantId() === null ? 'My Account' : 'Business Workspace')
    );
  });
  readonly description = computed(() => {
    const personalDescriptions: Record<string, string> = {
      customers: 'Manage your personal details and saved delivery addresses.',
      enquiries: 'Review your enquiries and conversations with businesses.',
      orders: 'Track orders you have placed with businesses on BBG.',
      payments: 'Review payments associated with your customer orders.',
    };
    return this.isPersonalContext()
      ? (personalDescriptions[this.section()] ?? 'Manage your personal BBG account.')
      : (this.config[this.section()]?.description ?? 'Manage your business operations.');
  });
  readonly contextLabel = computed(() =>
    this.workspace.activeTenantId() !== null
      ? 'BUSINESS WORKSPACE'
      : this.workspace.permissions().some((permission) => permission.scope_type === 'PLATFORM')
        ? 'PLATFORM ADMINISTRATION'
        : 'MY ACCOUNT',
  );
  readonly summaryEntries = computed(() => {
    const source = this.summary();
    if (!source) return [];
    const entries: Array<{ key: string; value: unknown }> = [];
    for (const [key, value] of Object.entries(source)) {
      if (this.isInternalField(key)) continue;
      if (value !== null && typeof value !== 'object') entries.push({ key, value });
      else if (value && typeof value === 'object' && !Array.isArray(value)) {
        for (const [nestedKey, nestedValue] of Object.entries(value as DataRecord)) {
          if (
            !this.isInternalField(nestedKey) &&
            (nestedValue === null || typeof nestedValue !== 'object')
          ) {
            entries.push({ key: nestedKey, value: nestedValue });
          }
        }
      }
    }
    return entries.slice(0, 16);
  });
  readonly navLinks = computed(() => {
    const links = [
      { key: 'profile', label: 'Business profile', path: '/dashboard/profile' },
      { key: 'storefront', label: 'Storefront', path: '/dashboard/storefront' },
      { key: 'catalogue', label: 'Catalogue', path: '/dashboard/catalogue' },
      { key: 'members', label: 'Team & access', path: '/dashboard/members' },
      { key: 'customers', label: 'Customers', path: '/dashboard/customers' },
      { key: 'enquiries', label: 'Enquiries', path: '/dashboard/enquiries' },
      { key: 'promotions', label: 'Promotions', path: '/dashboard/promotions' },
      { key: 'subscriptions', label: 'Subscriptions', path: '/dashboard/subscriptions' },
      { key: 'payments', label: 'Payments', path: '/dashboard/payments' },
      { key: 'analytics', label: 'Analytics', path: '/dashboard/analytics' },
      { key: 'platform-users', label: 'Users', path: '/dashboard/platform-users' },
      { key: 'business-approval', label: 'Business reviews', path: '/dashboard/business-approval' },
      {
        key: 'subscription-approval',
        label: 'Business onboarding & payments',
        path: '/dashboard/subscription-approval',
      },
      {
        key: 'subscription-plans',
        label: 'Subscription plans',
        path: '/dashboard/subscription-plans',
      },
      {
        key: 'payment-qr-settings',
        label: 'Payment QR settings',
        path: '/dashboard/payment-qr-settings',
      },
      { key: 'moderation', label: 'Moderation', path: '/dashboard/moderation' },
      { key: 'system-health', label: 'System health', path: '/dashboard/system-health' },
      {
        key: 'platform-analytics',
        label: 'Platform analytics',
        path: '/dashboard/platform-analytics',
      },
      { key: 'categories', label: 'Categories', path: '/dashboard/categories' },
    ];
    const context = this.workspace.activeContext();
    if (!context) return [];
    const permissions = this.workspace.permissions();
    const activeTenant = context === 'BUSINESS';
    const scope = activeTenant ? 'TENANT' : context === 'PLATFORM' ? 'PLATFORM' : 'GLOBAL';
    const entitlements = this.workspace.activeTenant()?.active_entitlements ?? null;
    const tenantRequirements: Record<string, string> = {
      profile: 'business.view',
      storefront: 'business.view',
      catalogue: 'catalogue.view',
      customers: 'customer.view',
      enquiries: 'enquiry.view',
      orders: 'order.view',
      promotions: 'promotion.view',
      subscriptions: 'subscription.view',
      payments: 'payment.view',
      analytics: 'report.view',
      members: 'tenant.view',
    };
    const tenantEntitlements: Record<string, string> = {
      profile: 'business.profile',
      storefront: 'storefront.enabled',
      catalogue: 'catalogue.enabled',
      promotions: 'promotions.enabled',
      analytics: 'advanced.reports.enabled',
    };
    const platformRequirements: Record<string, string> = {
      'platform-users': 'user.view',
      'business-approval': 'business.approve',
      'subscription-approval': 'subscription.approve',
      'subscription-plans': 'subscription.view',
      'payment-qr-settings': 'subscription.update',
      moderation: 'admin.view',
      categories: 'admin.view',
      'platform-analytics': 'report.view',
      'system-health': 'admin.view',
    };
    const personalRequirements: Record<string, string> = {
      customers: 'user.view',
      enquiries: 'enquiry.own.view',
      orders: 'order.own.view',
    };
    return links
      .filter((link) => {
        const requiredPermission =
          scope === 'TENANT'
            ? tenantRequirements[link.key]
            : scope === 'PLATFORM'
              ? platformRequirements[link.key]
              : personalRequirements[link.key];
        if (!requiredPermission || !hasWorkspacePermission(permissions, scope, requiredPermission))
          return false;
        const entitlement = scope === 'TENANT' ? tenantEntitlements[link.key] : undefined;
        return entitlement === undefined || hasActiveEntitlement(entitlements, entitlement);
      })
      .map((link) => {
        if (scope !== 'GLOBAL') return link;
        const personalLabels: Record<string, string> = {
          customers: 'My Profile & Addresses',
          enquiries: 'My Enquiries',
          orders: 'My Orders',
        };
        return personalLabels[link.key] ? { ...link, label: personalLabels[link.key] } : link;
      });
  });

  private readonly config: Record<string, { title: string; description: string }> = {
    profile: {
      title: 'Business profile',
      description: 'Review your approved business information and account details.',
    },
    storefront: {
      title: 'Storefront',
      description:
        'Review the public storefront information and publication status for this business.',
    },
    customers: {
      title: 'Customers',
      description: 'Review customer information and available customer records.',
    },
    enquiries: {
      title: 'Enquiries',
      description: 'Review incoming enquiries and manage sales conversations.',
    },
    orders: {
      title: 'Order management',
      description: 'Process, update and track orders for this business.',
    },
    promotions: {
      title: 'Promotions',
      description: 'Review campaigns and publish or pause eligible promotions.',
    },
    subscriptions: {
      title: 'Subscriptions & plans',
      description: 'Review available plans and the subscription history for this business.',
    },
    payments: {
      title: 'Payments',
      description: 'Review payment activity and related business records.',
    },
    analytics: {
      title: 'Analytics',
      description: 'Review the summary metrics available in this area.',
    },
    members: {
      title: 'Team & access',
      description: 'Review the members assigned to this business workspace.',
    },
    'platform-analytics': {
      title: 'Platform analytics',
      description: 'Review platform-wide metrics exposed to authorized administrators.',
    },
    categories: {
      title: 'Marketplace categories',
      description: 'Review the category taxonomy used by marketplace listings.',
    },
    'platform-users': {
      title: 'Platform users',
      description: 'Review platform accounts and suspend or restore eligible users.',
    },
    'business-approval': {
      title: 'Business approvals',
      description: 'Review pending business applications and process approval decisions.',
    },
    'subscription-approval': {
      title: 'Business onboarding reviews',
      description:
        'Review submitted business details, selected plans and payment receipts before activating a business workspace.',
    },
    'subscription-plans': {
      title: 'Subscription plans',
      description: 'Manage platform subscription plans, tier pricing, and availability.',
    },
    'payment-qr-settings': {
      title: 'Payment QR settings',
      description: 'Manage the UPI payment QR used for new subscription requests.',
    },
    moderation: {
      title: 'Marketplace moderation',
      description: 'Review reported marketplace content and record moderation decisions.',
    },
    'system-health': {
      title: 'System health',
      description: 'Review safe operational health information exposed to platform staff.',
    },
  };

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.filterSearch.set(params.get('search') ?? '');
      this.filterStatus.set(params.get('status') ?? '');
      this.filterFrom.set(params.get('from') ?? '');
      this.filterTo.set(params.get('to') ?? '');
    });
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.section.set(params.get('section') ?? 'profile');
      this.currentPage.set(1);
      this.notice.set('');
      void this.load();
    });
  }

  private async request<T = unknown>(
    path: string,
    key: EnvelopeKey,
    actionType: string,
    actionData: DataRecord = {},
  ): Promise<T> {
    const loadId = this.loading() ? this.loadSequence : null;
    const section = this.section();
    const tenantId = this.workspace.activeTenantId();
    const context = this.workspace.activeContext();
    const response = await firstValueFrom(
      this.http.post<ApiEnvelope<T>>(`${this.apiBaseUrl}${path}`, {
        [key]: { actionType, actionData },
      }),
    );
    if (loadId !== null && loadId !== this.loadSequence) throw new StaleWorkspaceRequestError();
    if (
      section !== this.section() ||
      tenantId !== this.workspace.activeTenantId() ||
      context !== this.workspace.activeContext()
    ) {
      throw new StaleWorkspaceRequestError();
    }
    if (response.status !== 'SUCCESS')
      throw new Error(response.msgArr?.join(' ') || 'The request could not be completed.');
    return response.data as T;
  }

  private setListResult(result: ListResult): void {
    const items = Array.isArray(result.items) ? result.items : [];
    const total = Number(result.pagination?.total);
    this.items.set(items);
    this.totalItems.set(Number.isFinite(total) && total >= 0 ? total : items.length);
  }

  goToPage(page: number): void {
    if (this.loading() || page < 1 || page > this.pageCount() || page === this.currentPage())
      return;
    this.currentPage.set(page);
    void this.load();
  }

  async load(): Promise<void> {
    const loadId = ++this.loadSequence;
    let contextKey: string | null = null;
    this.loading.set(true);
    this.error.set('');
    this.unsupported.set('');
    try {
      await this.workspace.initialize();
      if (loadId !== this.loadSequence) return;
      const tenantId = this.workspace.activeTenantId();
      contextKey = [
        this.section(),
        this.workspace.activeContext() ?? 'UNKNOWN',
        tenantId ?? 'none',
      ].join(':');
      if (this.loadedContextKey !== contextKey) {
        this.items.set([]);
        this.totalItems.set(0);
        this.summary.set(null);
        this.plans.set([]);
        this.moderationHistory.set([]);
        this.analyticsTrends.set([]);
      }
      const pageData = {
        page: this.currentPage(),
        page_size: this.pageSize(),
        ...(tenantId ? { tenant_id: tenantId } : {}),
      };
      switch (this.section()) {
        case 'members': {
          if (!tenantId)
            return this.setUnsupported('Open Business Workspace to view team members.');
          const data = await this.request<ListResult>(
            '/api/v1/tenants/members/list',
            'tenantParam',
            'listTenantMembers',
            pageData,
          );
          this.setListResult(data);
          break;
        }
        case 'profile':
          if (!tenantId)
            return this.setUnsupported('Open Business Workspace to view your business profile.');
          this.summary.set(
            await this.request<DataRecord>(
              '/api/v1/business/profile/get',
              'businessParam',
              'getMyBusinessProfile',
              { tenant_id: tenantId },
            ),
          );
          break;
        case 'storefront':
          if (!tenantId)
            return this.setUnsupported('Open Business Workspace to view your storefront.');
          this.summary.set(
            await this.request<DataRecord>(
              '/api/v1/business/storefront/get',
              'businessParam',
              'getMyStorefront',
              { tenant_id: tenantId },
            ),
          );
          break;
        case 'customers':
          if (tenantId) {
            const data = await this.request<ListResult>(
              '/api/v1/customers/tenant/list',
              'customerParam',
              'listTenantCustomers',
              pageData,
            );
            this.setListResult(data);
            break;
          }
          {
            const profile = await this.auth.loadProfile();
            if (loadId !== this.loadSequence) return;
            this.summary.set(profile as unknown as DataRecord);
            try {
              const addresses = await this.request<ListResult>(
                '/api/v1/customers/addresses/list',
                'customerParam',
                'listMyAddresses',
              );
              this.setListResult(addresses);
            } catch (addressError) {
              this.setListResult({ items: [] });
              this.notice.set(
                'Your account details loaded, but saved addresses are temporarily unavailable. ' +
                  this.auth.errorMessage(addressError),
              );
            }
          }
          break;
        case 'orders':
          this.unsupportedTitle.set('Order Management Inactive');
          this.unsupported.set(
            'Order workflows and shopping cart are deactivated in this deployment. Please use product catalogue and direct business enquiries.',
          );
          this.setListResult({ items: [] });
          break;
        case 'enquiries':
          if (tenantId) {
            const data = await this.request<ListResult>(
              '/api/v1/enquiries/tenant/list',
              'enquiryParam',
              'listTenantEnquiries',
              pageData,
            );
            this.setListResult(data);
          } else {
            const data = await this.request<ListResult>(
              '/api/v1/enquiries/mine/list',
              'enquiryParam',
              'listMyEnquiries',
              pageData,
            );
            this.setListResult(data);
          }
          break;
        case 'payments': {
          const data = tenantId
            ? await this.request<ListResult>(
                '/api/v1/payments/tenant/list',
                'paymentParam',
                'listTenantPayments',
                pageData,
              )
            : await this.request<ListResult>(
                '/api/v1/payments/mine/list',
                'paymentParam',
                'listMyPayments',
                pageData,
              );
          this.setListResult(data);
          break;
        }
        case 'promotions':
          if (!tenantId)
            return this.setUnsupported('Open Business Workspace to manage promotions.');
          {
            const data = await this.request<ListResult>(
              '/api/v1/promotions/mine/list',
              'promotionParam',
              'listMyPromotions',
              pageData,
            );
            this.setListResult(data);
          }
          break;
        case 'subscriptions':
          if (!tenantId)
            return this.setUnsupported(
              'Open Business Workspace to review plans and subscriptions.',
            );
          {
            const [plans, subscriptions] = await Promise.all([
              this.request<{ items?: DataRecord[] }>(
                '/api/v1/subscriptions/plans/list',
                'subscriptionParam',
                'listActivePlans',
              ),
              this.request<ListResult>(
                '/api/v1/subscriptions/application/list',
                'subscriptionParam',
                'listApplicationSubscriptions',
                pageData,
              ),
            ]);
            this.plans.set(plans.items ?? []);
            this.setListResult(subscriptions);
          }
          break;
        case 'analytics':
          if (tenantId)
            this.summary.set(
              await this.request<DataRecord>(
                '/api/v1/dashboard/entrepreneur/summary',
                'dashboardParam',
                'getEntrepreneurDashboard',
                { tenant_id: tenantId },
              ),
            );
          else return this.setUnsupported('Business analytics require Business Workspace access.');
          break;
        case 'platform-analytics': {
          const endDate = new Date().toISOString().slice(0, 10);
          const startDate = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10);
          const [summary, trends] = await Promise.all([
            this.request<DataRecord>(
              '/api/v1/admin/analytics/summary',
              'adminParam',
              'getAdminAnalyticsSummary',
            ),
            this.request<{ items?: DataRecord[] }>(
              '/api/v1/admin/analytics/trends',
              'adminParam',
              'getAdminAnalyticsTrends',
              {
                start_date: startDate,
                end_date: endDate,
              },
            ),
          ]);
          this.summary.set(summary);
          this.analyticsTrends.set(trends.items ?? []);
          break;
        }
        case 'categories': {
          const data = await this.request<ListResult>(
            '/api/v1/admin/categories/list',
            'adminParam',
            'listAdminCategories',
            { page: this.currentPage(), page_size: this.pageSize() },
          );
          this.setListResult(data);
          break;
        }
        case 'platform-users': {
          const data = await this.request<ListResult>(
            '/api/v1/admin/users/list',
            'adminParam',
            'listPlatformUsers',
            { page: this.currentPage(), page_size: this.pageSize() },
          );
          this.setListResult(data);
          break;
        }
        case 'business-approval': {
          const data = await this.request<ListResult>(
            '/api/v1/admin/businesses/pending/list',
            'adminParam',
            'listPendingBusinesses',
            { page: this.currentPage(), page_size: this.pageSize() },
          );
          this.setListResult(data);
          break;
        }
        case 'subscription-approval': {
          const [pending, active] = await Promise.all([
            this.request<ListResult>(
              '/api/v1/admin/subscriptions/pending/list',
              'adminParam',
              'listPendingSubscriptions',
              { page: 1, page_size: 50 },
            ),
            this.request<ListResult>(
              '/api/v1/admin/subscriptions/active/list',
              'adminParam',
              'listActiveSubscriptions',
              { page: 1, page_size: 50 },
            ),
          ]);
          const combined = [...(pending.items ?? []), ...(active.items ?? [])];
          const start = (this.currentPage() - 1) * this.pageSize();
          this.setListResult({
            items: combined.slice(start, start + this.pageSize()),
            pagination: {
              total: combined.length,
            },
          });
          break;
        }
        case 'subscription-plans': {
          const data = await this.request<ListResult>(
            '/api/v1/admin/plans/list',
            'adminParam',
            'listAdminPlans',
            { page: this.currentPage(), page_size: this.pageSize() },
          );
          this.setListResult(data);
          break;
        }
        case 'payment-qr-settings': {
          const data = await this.request<DataRecord>(
            '/api/v1/admin/subscriptions/payment-qr/current',
            'adminParam',
            'getCurrentPaymentQrConfig',
          );
          this.summary.set(data);
          this.qrPayeeName.set(String(data['payee_name'] ?? ''));
          this.qrUpiId.set(String(data['upi_id'] ?? ''));
          this.qrInstructions.set(String(data['payment_instructions'] ?? ''));
          this.qrFile.set(null);
          break;
        }
        case 'moderation': {
          const data = await this.request<ListResult>(
            '/api/v1/admin/moderation/queue',
            'adminParam',
            'listModerationQueue',
            { page: this.currentPage(), page_size: this.pageSize() },
          );
          this.setListResult(data);
          break;
        }
        case 'system-health':
          this.summary.set(
            await this.request<DataRecord>(
              '/api/v1/admin/health/summary',
              'adminParam',
              'getSafeSystemHealth',
            ),
          );
          break;
        default:
          this.setUnsupported('This dashboard section is not configured.');
      }
      this.loadedContextKey = contextKey;
      this.lastLoadedPage = this.currentPage();
    } catch (error) {
      if (loadId === this.loadSequence && !(error instanceof StaleWorkspaceRequestError)) {
        if (contextKey === this.loadedContextKey && this.currentPage() !== this.lastLoadedPage) {
          this.currentPage.set(this.lastLoadedPage);
        }
        this.error.set(this.auth.errorMessage(error));
      }
    } finally {
      if (loadId === this.loadSequence) this.loading.set(false);
    }
  }

  private setUnsupported(message: string): void {
    this.unsupported.set(message);
    this.unsupportedTitle.set('Not available in this area');
    this.loading.set(false);
  }

  readonly recordsHeading = computed(() =>
    this.section() === 'customers' ? 'Saved addresses' : this.title(),
  );
  readonly recordCardModels = computed(() =>
    this.filteredItems().map((item) => this.toRecordCardModel(item)),
  );

  private toRecordCardModel(item: DataRecord): WorkspaceRecordCardModel {
    const status = this.statusOf(item);
    const subscriptionId = this.recordId(item, 'subscription_id');
    const proof = this.proofDrafts()[subscriptionId];
    const media = this.mediaOf(item).map((entry) => ({
      id: String(entry['id'] ?? ''),
      type: String(entry['media_type'] ?? 'FILE'),
      url: entry['url'] ? this.asUrl(entry['url']) : null,
      canRemove: status.toUpperCase() !== 'PUBLISHED' && this.can('promotion.update'),
    }));
    const paymentQr = item['payment_qr_url']
      ? {
          url: this.asUrl(item['payment_qr_url']),
          payeeName: String(item['payment_payee_name'] ?? ''),
          upiId: String(item['payment_upi_id'] ?? ''),
          version: String(item['payment_qr_version'] ?? ''),
          instructions: String(item['payment_instructions'] ?? ''),
        }
      : null;
    return {
      id: this.recordId(item, 'id'),
      record: item,
      title: this.recordTitle(item),
      subtitle: this.recordSubtitle(item),
      status: status ? this.humanize(status) : '',
      statusClass: this.statusClass(status),
      fields: this.recordEntries(item).map((entry) => ({
        key: entry.key,
        label: this.humanize(entry.key),
        value: this.formatValue(entry.value),
      })),
      bcn: this.hasBcn(item) ? String(item['bcn']) : null,
      showBcn: ['subscriptions', 'subscription-approval'].includes(this.section()),
      showDetail:
        [
          'platform-users',
          'business-approval',
          'orders',
          'enquiries',
          'payments',
          'members',
        ].includes(this.section()) ||
        (this.section() === 'subscriptions' && this.activeTenantId() !== null),
      showSubscriptionReview: this.section() === 'subscription-approval',
      paymentQr,
      media,
      showProofUpload:
        this.section() === 'subscriptions' &&
        this.canManageOwnedSubscription() &&
        ['PENDING', 'REJECTED'].includes(status.toUpperCase()) &&
        item['latest_proof_review_status'] !== 'PENDING',
      proofFileName: proof?.fileName ?? null,
      actions: this.visibleActionsFor(item),
    };
  }
  recordId(item: DataRecord, preferred = 'id'): number {
    const value =
      item[preferred] ??
      item['id'] ??
      item['address_id'] ??
      item['category_id'] ??
      item['business_id'] ??
      item['subscription_id'] ??
      item['promotion_id'] ??
      item['order_id'] ??
      item['enquiry_id'] ??
      item['payment_id'] ??
      item['report_id'] ??
      item['user_id'];
    return Number(value ?? 0);
  }
  valueOf(item: DataRecord, keys: string[]): string {
    for (const key of keys)
      if (item[key] !== null && item[key] !== undefined && item[key] !== '')
        return this.formatValue(item[key]);
    return '—';
  }
  recordTitle(item: DataRecord): string {
    const title = this.valueOf(item, [
      'business_name',
      'tenant_name',
      'display_name',
      'address_label',
      'plan_name',
      'post_title',
      'category_name',
      'order_number',
      'enquiry_number',
      'payment_reference',
      'full_name',
      'name',
      'email',
      'report_number',
    ]);
    return title === '—' ? 'Record' : title;
  }
  recordSubtitle(item: DataRecord): string {
    if (this.section() === 'subscription-plans') {
      const cycle = String(item['billing_cycle'] ?? '');
      const price =
        item['price'] !== undefined ? `${item['currency'] ?? '₹'} ${item['price']}` : '';
      return [this.humanize(cycle), price].filter(Boolean).join(' · ');
    }
    if (this.section() === 'subscription-approval') {
      const plan = String(item['plan_name'] ?? 'Plan not available');
      const status = String(item['subscription_status'] ?? 'PENDING');
      return plan + ' · ' + this.humanize(status);
    }
    return this.valueOf(item, [
      'email',
      'business_category',
      'category_type',
      'customer_name',
      'address_line_1',
      'city',
      'mobile',
      'created_at',
      'created_on',
      'order_status',
      'enquiry_status',
      'subscription_status',
    ]);
  }
  statusOf(item: DataRecord): string {
    return String(
      item['approval_status'] ??
        item['subscription_status'] ??
        item['publication_status'] ??
        item['order_status'] ??
        item['enquiry_status'] ??
        item['payment_status'] ??
        item['report_status'] ??
        item['account_status'] ??
        item['customer_status'] ??
        item['status'] ??
        '',
    );
  }
  private isInternalField(key: string): boolean {
    return (
      /^(?:id|.*_id|id_.*|uuid|.*_uuid)$/i.test(key) ||
      /^(?:created_by|updated_by|deleted_by|bcn|password_hash|access_token|refresh_token|authorization|raw_payload)$/i.test(
        key,
      ) ||
      /(?:password|token|secret|credential|authorization|hash|raw_payload)/i.test(key)
    );
  }

  recordEntries(item: DataRecord): Array<{ key: string; value: unknown }> {
    return Object.entries(item)
      .filter(
        ([key, value]) => !this.isInternalField(key) && value !== null && typeof value !== 'object',
      )
      .slice(0, 8)
      .map(([key, value]) => ({ key, value }));
  }

  detailEntries(item: DataRecord): Array<{ key: string; value: unknown }> {
    const entries: Array<{ key: string; value: unknown }> = [];
    const visit = (value: unknown, path: string, depth: number): void => {
      if (value === null || value === undefined || depth > 8) return;
      if (Array.isArray(value)) {
        value.forEach((entry, index) =>
          visit(entry, path ? path + ' ' + (index + 1) : String(index + 1), depth + 1),
        );
        return;
      }
      if (typeof value === 'object') {
        for (const [key, nested] of Object.entries(value as DataRecord)) {
          if (this.isInternalField(key)) continue;
          visit(nested, path ? path + '.' + key : key, depth + 1);
        }
        return;
      }
      if (path) entries.push({ key: path, value });
    };
    visit(item, '', 0);
    return entries;
  }

  detailGroups(
    item: DataRecord,
  ): Array<{ title: string; entries: Array<{ key: string; value: unknown }> }> {
    const groups = new Map<string, Array<{ key: string; value: unknown }>>();
    const labels: Array<{ title: string; pattern: RegExp }> = [
      {
        title: 'Contact information',
        pattern: /(email|phone|mobile|whatsapp|contact|website|social)/i,
      },
      {
        title: 'Address information',
        pattern:
          /(address|street|city|state|province|postal|zip|country|latitude|longitude|location)/i,
      },
      {
        title: 'Status & timeline',
        pattern:
          /(status|approval|publication|verified|active|created|updated|submitted|reviewed|expires|expiry|date|time)/i,
      },
      {
        title: 'Business & profile',
        pattern: /(business|tenant|company|profile|category|description|logo|cover|name|slug)/i,
      },
      {
        title: 'Payment & order',
        pattern:
          /(payment|amount|currency|price|tax|total|order|invoice|transaction|billing|subscription|plan)/i,
      },
    ];
    for (const entry of this.detailEntries(item)) {
      const separator = entry.key.indexOf('.');
      const root = separator >= 0 ? entry.key.slice(0, separator) : '';
      const field = separator >= 0 ? entry.key.slice(separator + 1) : entry.key;
      const title = root
        ? this.humanize(root)
        : (labels.find((label) => label.pattern.test(field))?.title ?? 'Additional information');
      const entries = groups.get(title) ?? [];
      entries.push({
        key: field.replace(/\.(\d+)/g, ' · Item $1').replace(/\./g, ' · '),
        value: entry.value,
      });
      groups.set(title, entries);
    }
    return Array.from(groups, ([title, entries]) => ({ title, entries }));
  }

  isLongDetail(value: unknown): boolean {
    return typeof value === 'string' && (value.length > 120 || value.includes('\\n'));
  }
  can(permissionCode: string): boolean {
    const context = this.workspace.activeContext();
    if (!context) return false;
    const scope =
      context === 'BUSINESS' ? 'TENANT' : context === 'PLATFORM' ? 'PLATFORM' : 'GLOBAL';
    return hasWorkspacePermission(this.workspace.permissions(), scope, permissionCode);
  }

  private canManageOwnedSubscription(): boolean {
    const tenant = this.workspace.activeTenant();
    const roles = String(tenant?.role_codes ?? '')
      .split(',')
      .map((role) => role.trim());
    return this.workspace.activeContext() === 'BUSINESS' && roles.includes('TENANT_OWNER');
  }

  canRequestSubscriptionChange(): boolean {
    return this.canManageOwnedSubscription();
  }

  canAction(action: string): boolean {
    if (action === 'renew-subscription') return this.canManageOwnedSubscription();
    const permissionCode = ACTION_PERMISSION_CODES[action];
    return permissionCode !== undefined && this.can(permissionCode);
  }

  visibleActionsFor(item: DataRecord): Array<{ key: string; label: string; danger?: boolean }> {
    return this.actionsFor(item).filter((action) => this.canAction(action.key));
  }

  actionsFor(item: DataRecord): Array<{ key: string; label: string; danger?: boolean }> {
    const status = this.statusOf(item).toUpperCase();
    if (
      this.section() === 'orders' &&
      this.workspace.activeTenantId() !== null &&
      !['CANCELLED', 'COMPLETED', 'DELIVERED'].includes(status)
    )
      return [
        { key: 'confirm-order', label: 'Confirm order' },
        { key: 'cancel-order', label: 'Cancel order', danger: true },
      ];
    if (
      this.section() === 'enquiries' &&
      this.workspace.activeTenantId() !== null &&
      status !== 'CLOSED'
    )
      return [
        { key: 'reply-enquiry', label: 'Reply' },
        { key: 'close-enquiry', label: 'Close enquiry', danger: true },
      ];
    if (this.section() === 'promotions')
      return status === 'PUBLISHED'
        ? [{ key: 'unpublish-promotion', label: 'Unpublish' }]
        : [
            { key: 'manage-post-media', label: 'Manage media' },
            { key: 'publish-promotion', label: 'Publish' },
          ];
    if (this.section() === 'platform-users')
      return status === 'SUSPENDED'
        ? [{ key: 'restore-user', label: 'Restore account' }]
        : [{ key: 'suspend-user', label: 'Suspend account', danger: true }];
    if (this.section() === 'members' && this.workspace.activeTenantId() !== null) {
      const roleCode = String(item['role_code'] ?? '').toUpperCase();
      if (roleCode !== 'TENANT_OWNER') {
        return [
          { key: 'change-member-role', label: 'Change role' },
          { key: 'remove-member', label: 'Remove member', danger: true },
        ];
      }
      return [];
    }
    if (this.section() === 'business-approval') {
      if (status === 'PENDING') {
        return [
          { key: 'approve-business', label: 'Approve' },
          { key: 'reject-business', label: 'Reject', danger: true },
        ];
      }
      if (status === 'REJECTED') {
        return [{ key: 'reopen-business', label: 'Reopen application' }];
      }
    }
    if (this.section() === 'subscription-approval' && status === 'PENDING')
      return [
        { key: 'approve-subscription', label: 'Approve' },
        { key: 'reject-subscription', label: 'Reject', danger: true },
      ];
    if (this.section() === 'subscription-plans') return [{ key: 'edit-plan', label: 'Edit plan' }];
    if (this.section() === 'subscriptions' && ['ACTIVE', 'EXPIRED'].includes(status))
      return [{ key: 'renew-subscription', label: 'Renew subscription' }];
    if (this.section() === 'moderation' && status === 'OPEN')
      return [{ key: 'moderate', label: 'Review report' }];
    return [];
  }

  async runAction(action: string, item: DataRecord): Promise<void> {
    if (this.busy() || !this.canAction(action)) return;
    const tenantId = this.workspace.activeTenantId();
    const id = this.recordId(item);
    let path = '';
    let key: EnvelopeKey = 'adminParam';
    let actionType = '';
    let data: DataRecord = {};
    switch (action) {
      case 'manage-post-media':
        this.addMediaToPromotion(item);
        return;
      case 'confirm-order':
      case 'cancel-order':
        path =
          action === 'confirm-order'
            ? '/api/v1/orders/tenant/confirm'
            : '/api/v1/orders/tenant/cancel';
        key = 'orderParam';
        actionType = 'changeTenantOrderStatus';
        data = { tenant_id: tenantId, order_id: id };
        break;
      case 'reply-enquiry':
        this.replyEnquiryId.set(id);
        this.replyMessage.set('');
        this.error.set('');
        this.showReplyDrawer.set(true);
        return;
      case 'close-enquiry':
        if (!window.confirm('Close this enquiry?')) return;
        path = '/api/v1/enquiries/tenant/close';
        key = 'enquiryParam';
        actionType = 'closeEnquiry';
        data = { tenant_id: tenantId, enquiry_id: id };
        break;
      case 'publish-promotion':
      case 'unpublish-promotion':
        path =
          action === 'publish-promotion'
            ? '/api/v1/promotions/publish'
            : '/api/v1/promotions/unpublish';
        key = 'promotionParam';
        actionType = action === 'publish-promotion' ? 'publishPromotion' : 'unpublishPromotion';
        data = { tenant_id: tenantId, promotion_id: id };
        break;
      case 'suspend-user':
      case 'restore-user':
        path =
          action === 'suspend-user' ? '/api/v1/admin/users/suspend' : '/api/v1/admin/users/restore';
        actionType = action === 'suspend-user' ? 'suspendPlatformUser' : 'restorePlatformUser';
        data = { user_id: id };
        break;
      case 'approve-business':
        path = '/api/v1/admin/businesses/approve';
        actionType = 'approveBusiness';
        data = { business_id: Number(item['business_id'] ?? item['id']) };
        break;
      case 'reject-business':
        this.openDecisionDrawer('reject-business', item);
        return;
      case 'reopen-business':
        path = '/api/v1/admin/businesses/reopen';
        actionType = 'reopenBusinessReview';
        data = { business_id: Number(item['business_id'] ?? item['id']) };
        break;
      case 'change-member-role':
        this.openChangeRoleDrawer(item);
        return;
      case 'remove-member':
        if (
          !window.confirm(
            `Are you sure you want to remove ${this.recordTitle(item)} from this workspace?`,
          )
        )
          return;
        path = '/api/v1/tenants/members/remove';
        key = 'tenantParam';
        actionType = 'removeTenantMember';
        data = { tenant_id: tenantId, user_id: Number(item['user_id'] ?? item['id']) };
        break;
      case 'renew-subscription':
        path = '/api/v1/subscriptions/application/renewal/request';
        key = 'subscriptionParam';
        actionType = 'requestApplicationSubscriptionRenewal';
        data = { tenant_id: tenantId, subscription_id: id };
        break;
      case 'approve-subscription':
      case 'reject-subscription':
        this.openDecisionDrawer(action, item);
        return;
      case 'moderate':
        this.openDecisionDrawer('moderate', item);
        return;
      case 'edit-plan':
        this.openPlanEditDrawer(item);
        return;
      default:
        return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      await this.request<DataRecord>(path, key, actionType, data);
      this.notice.set('The requested action was completed.');
      await this.load();
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  addMediaToPromotion(item: DataRecord): void {
    const localValidUntil = this.utcDateTimeToLocalInput(item['valid_until']);
    this.draftPromotionId.set(this.recordId(item, 'id'));
    this.promotionUploadedCount.set(this.mediaOf(item).length);
    this.promotionTitle.set(String(item['post_title'] ?? ''));
    this.promotionContent.set(String(item['post_content'] ?? ''));
    this.promotionValidUntil.set(localValidUntil);
    this.originalPromotionValidUntil.set(localValidUntil);
    this.clearPromotionPreviews();
    this.promotionFiles.set([]);
    this.promotionError.set('');
    this.showPromotionComposer.set(true);
  }

  async removePromotionAttachment(item: DataRecord, media: DataRecord): Promise<void> {
    const tenantId = this.workspace.activeTenantId();
    const promotionId = this.recordId(item, 'id');
    const mediaId = Number(media['id'] ?? 0);
    if (!tenantId || !promotionId || !mediaId || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.request(
        '/api/v1/promotions/media/delete',
        'promotionParam',
        'deletePromotionMedia',
        {
          tenant_id: tenantId,
          promotion_id: promotionId,
          media_id: mediaId,
        },
      );
      this.notice.set('Post attachment removed.');
      await this.load();
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  async createPromotion(): Promise<void> {
    this.draftPromotionId.set(null);
    this.promotionUploadedCount.set(0);
    this.promotionTitle.set('');
    this.promotionContent.set('');
    this.promotionValidUntil.set('');
    this.originalPromotionValidUntil.set('');
    this.clearPromotionPreviews();
    this.promotionFiles.set([]);
    this.promotionError.set('');
    this.showPromotionComposer.set(true);
  }

  closePromotionComposer(): void {
    if (this.promotionMediaBusy()) return;
    this.showPromotionComposer.set(false);
    this.draftPromotionId.set(null);
    this.originalPromotionValidUntil.set('');
    this.promotionUploadedCount.set(0);
    this.clearPromotionPreviews();
  }

  private clearPromotionPreviews(): void {
    for (const url of this.promotionMediaPreviews().values()) URL.revokeObjectURL(url);
    this.promotionMediaPreviews.set(new Map());
  }

  promotionPreview(file: File): string | null {
    return this.promotionMediaPreviews().get(file) ?? null;
  }

  setPromotionField(field: 'title' | 'content' | 'validUntil', event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    if (field === 'title') this.promotionTitle.set(value);
    else if (field === 'content') this.promotionContent.set(value);
    else this.promotionValidUntil.set(value);
  }

  selectPromotionMedia(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.addPromotionMedia(Array.from(input.files ?? []));
    input.value = '';
  }

  allowPromotionMediaDrop(event: DragEvent): void {
    event.preventDefault();
  }

  dropPromotionMedia(event: DragEvent): void {
    event.preventDefault();
    this.addPromotionMedia(Array.from(event.dataTransfer?.files ?? []));
  }

  private addPromotionMedia(files: File[]): void {
    const allowed = new Set([
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'video/mp4',
      'video/webm',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'application/pdf',
      'text/plain',
      'text/csv',
      'application/rtf',
    ]);
    const invalid = files.find(
      (file) => !allowed.has(file.type) || file.size < 1 || file.size > 100 * 1024 * 1024,
    );
    if (invalid)
      this.promotionError.set(
        `"${invalid.name}" is not supported or exceeds the 100 MB per-file limit.`,
      );
    else {
      this.promotionError.set('');
      for (const file of files) {
        if (
          file.type.startsWith('image/') ||
          file.type.startsWith('video/') ||
          file.type.startsWith('audio/')
        ) {
          this.promotionMediaPreviews.update((current) =>
            new Map(current).set(file, URL.createObjectURL(file)),
          );
        }
      }
      this.promotionFiles.update((current) => [...current, ...files]);
    }
  }

  removePromotionMedia(index: number): void {
    const file = this.promotionFiles()[index];
    const preview = file ? this.promotionMediaPreviews().get(file) : undefined;
    if (preview) URL.revokeObjectURL(preview);
    if (file)
      this.promotionMediaPreviews.update((current) => {
        const next = new Map(current);
        next.delete(file);
        return next;
      });
    this.promotionFiles.update((files) => files.filter((_, position) => position !== index));
  }

  private utcDateTimeToLocalInput(raw: unknown): string {
    if (typeof raw !== 'string' || !raw.trim()) return '';
    const trimmed = raw.trim();
    const isoUtc = trimmed.includes('T')
      ? /(?:Z|[+-]\d\d:\d\d)$/.test(trimmed)
        ? trimmed
        : trimmed + 'Z'
      : trimmed.replace(' ', 'T') + 'Z';
    const parsed = new Date(isoUtc);
    if (Number.isNaN(parsed.getTime())) return trimmed.replace(' ', 'T').slice(0, 16);
    const pad = (n: number): string => String(n).padStart(2, '0');
    return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
  }

  private localInputToUtcIso(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString();
  }

  async submitPromotion(): Promise<void> {
    const tenantId = this.workspace.activeTenantId();
    if (!tenantId || !this.promotionContent().trim() || this.promotionMediaBusy()) return;

    const existingId = this.draftPromotionId();
    const validUntilInput = this.promotionValidUntil().trim();
    const validUntilChanged = !existingId || validUntilInput !== this.originalPromotionValidUntil();
    const validUntilUtc = validUntilInput ? this.localInputToUtcIso(validUntilInput) : null;

    if (validUntilInput && !validUntilUtc) {
      this.promotionError.set('Enter a valid expiry date and time.');
      return;
    }
    if (validUntilUtc && validUntilChanged && new Date(validUntilUtc).getTime() <= Date.now()) {
      this.promotionError.set('Valid until date and time must be in the future.');
      return;
    }

    this.promotionMediaBusy.set(true);
    this.promotionError.set('');
    try {
      let promotionId = existingId;
      if (!promotionId) {
        const result = await this.request<{ id: number }>(
          '/api/v1/promotions/create',
          'promotionParam',
          'createPromotion',
          {
            tenant_id: tenantId,
            post_title: this.promotionTitle().trim(),
            post_content: this.promotionContent().trim(),
            ...(validUntilUtc ? { valid_until: validUntilUtc } : {}),
          },
        );
        promotionId = Number(result.id);
        if (!promotionId)
          throw new Error('The draft was created but its identifier was not returned.');
        this.draftPromotionId.set(promotionId);
      } else {
        const updatePayload: DataRecord = {
          tenant_id: tenantId,
          promotion_id: promotionId,
          post_title: this.promotionTitle().trim(),
          post_content: this.promotionContent().trim(),
        };
        if (validUntilChanged) {
          updatePayload['valid_until'] = validUntilUtc;
        }
        await this.request(
          '/api/v1/promotions/update',
          'promotionParam',
          'updatePromotion',
          updatePayload,
        );
      }
      const files = this.promotionFiles();
      for (let index = 0; index < files.length; index++) {
        const file = files[index];
        const upload = await this.request<{
          upload_url: string;
          object_key: string;
          headers: Record<string, string>;
        }>(
          '/api/v1/promotions/media/upload-url',
          'promotionParam',
          'generatePromotionMediaUploadUrl',
          {
            tenant_id: tenantId,
            promotion_id: promotionId,
            original_file_name: file.name,
            mime_type: file.type,
            file_size_bytes: file.size,
          },
        );
        this.promotionUploadProgress.set(0);
        await this.s3Upload.upload(
          upload.upload_url,
          file,
          upload.headers ?? { 'Content-Type': file.type },
          (progress) => this.promotionUploadProgress.set(progress),
        );
        const mediaType = file.type.startsWith('image/')
          ? 'IMAGE'
          : file.type.startsWith('video/')
            ? 'VIDEO'
            : file.type.startsWith('audio/')
              ? 'AUDIO'
              : 'DOCUMENT';
        await this.request(
          '/api/v1/promotions/media/link',
          'promotionParam',
          'linkPromotionMedia',
          {
            tenant_id: tenantId,
            promotion_id: promotionId,
            file_path: upload.object_key,
            mime_type: file.type,
            file_size_bytes: file.size,
            display_order: index,
            media_type: mediaType,
          },
        );
        this.promotionFiles.update((remaining) =>
          remaining.filter((candidate) => candidate !== file),
        );
        this.promotionUploadedCount.update((count) => count + 1);
      }
      this.notice.set('Promotion draft and attachments saved. Publish it when ready.');
      this.showPromotionComposer.set(false);
      this.draftPromotionId.set(null);
      this.clearPromotionPreviews();
      await this.load();
    } catch (error) {
      this.promotionError.set(this.auth.errorMessage(error));
    } finally {
      this.promotionMediaBusy.set(false);
      this.promotionUploadProgress.set(0);
    }
  }

  mediaOf(item: DataRecord): DataRecord[] {
    const media = item['media'];
    return Array.isArray(media) ? (media as DataRecord[]) : [];
  }
  mediaLabel(mime: string): string {
    return mime.startsWith('image/')
      ? 'IMAGE'
      : mime.startsWith('video/')
        ? 'VIDEO'
        : mime.startsWith('audio/')
          ? 'AUDIO'
          : mime === 'application/pdf'
            ? 'PDF'
            : 'DOC';
  }
  fileSize(bytes: number): string {
    return bytes < 1024 * 1024
      ? `${Math.max(1, Math.round(bytes / 1024))} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  openPaymentQrDrawer(): void {
    if (!this.can('subscription.update')) return;
    this.error.set('');
    this.showPaymentQrDrawer.set(true);
  }

  openDecisionDrawer(kind: DecisionKind, item: DataRecord): void {
    this.decisionKind.set(kind);
    this.decisionItem.set(item);
    this.decisionReason.set('');
    this.decisionStartsOn.set('');
    this.decisionEndsOn.set('');
    this.moderationAction.set('DISMISS_REPORT');
    this.error.set('');
    this.showDecisionDrawer.set(true);
  }

  decisionTitle(): string {
    const titles: Record<DecisionKind, string> = {
      'reject-business': 'Reject business application',
      'approve-subscription': 'Approve subscription',
      'reject-subscription': 'Reject subscription',
      moderate: 'Review reported content',
    };
    return titles[this.decisionKind()];
  }

  async saveDecision(): Promise<void> {
    const kind = this.decisionKind();
    const item = this.decisionItem();
    if (!item || this.busy()) return;
    const reason = this.decisionReason().trim();
    let path = '';
    let actionType = '';
    let key: EnvelopeKey = 'adminParam';
    let data: DataRecord = {};
    if (kind === 'reject-business') {
      if (!reason) {
        this.error.set('A rejection reason is required.');
        return;
      }
      path = '/api/v1/admin/businesses/reject';
      actionType = 'rejectBusiness';
      data = { business_id: Number(item['business_id'] ?? item['id']), reason };
    } else if (kind === 'approve-subscription') {
      if (!this.decisionStartsOn() || !this.decisionEndsOn()) {
        this.error.set('Enter both subscription start and end dates.');
        return;
      }
      path = '/api/v1/admin/subscriptions/approve';
      actionType = 'approveSubscription';
      data = {
        subscription_id: Number(item['subscription_id'] ?? item['id']),
        starts_on: this.decisionStartsOn().replace('T', ' ') + ':00',
        ends_on: this.decisionEndsOn().replace('T', ' ') + ':00',
      };
    } else if (kind === 'reject-subscription') {
      if (!reason) {
        this.error.set('A rejection reason is required.');
        return;
      }
      path = '/api/v1/admin/subscriptions/reject';
      actionType = 'rejectSubscription';
      data = { subscription_id: Number(item['subscription_id'] ?? item['id']), reason };
    } else {
      const contentType = String(item['content_type'] ?? '').toUpperCase();
      const moderationAction = this.moderationAction();
      if (!reason) {
        this.error.set('A reason for this moderation decision is required.');
        return;
      }
      if (!['UNPUBLISH_POST', 'UNPUBLISH_PRODUCT', 'DISMISS_REPORT'].includes(moderationAction)) {
        this.error.set('Choose a valid moderation action.');
        return;
      }
      if (
        (moderationAction === 'UNPUBLISH_POST' && contentType !== 'POST') ||
        (moderationAction === 'UNPUBLISH_PRODUCT' && contentType !== 'PRODUCT')
      ) {
        this.error.set('That moderation action does not match the reported content type.');
        return;
      }
      path = '/api/v1/admin/moderation/action';
      actionType = 'applyModerationAction';
      data = { report_id: this.recordId(item), action_type: moderationAction, reason };
    }
    this.busy.set(true);
    this.error.set('');
    try {
      const result = await this.request<DataRecord>(path, key, actionType, data);
      this.notice.set(
        kind === 'approve-subscription' && typeof result['bcn'] === 'string' && result['bcn']
          ? `Subscription approved. BBG Contribution Number: ${result['bcn']}`
          : 'The requested decision was completed.',
      );
      this.showDecisionDrawer.set(false);
      await this.load();
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  async saveEnquiryReply(): Promise<void> {
    const tenantId = this.workspace.activeTenantId();
    const enquiryId = this.replyEnquiryId();
    const message = this.replyMessage().trim();
    if (!tenantId || !enquiryId || !message) {
      this.error.set('Enter a reply before submitting.');
      return;
    }
    const saved = await this.performAction(
      '/api/v1/enquiries/tenant/respond',
      'enquiryParam',
      'respondToEnquiry',
      {
        tenant_id: tenantId,
        enquiry_id: enquiryId,
        message,
      },
    );
    if (saved) {
      this.showReplyDrawer.set(false);
      this.replyEnquiryId.set(null);
      this.replyMessage.set('');
    }
  }

  private async performAction(
    path: string,
    key: EnvelopeKey,
    actionType: string,
    data: DataRecord,
  ): Promise<boolean> {
    if (this.busy()) return false;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.request(path, key, actionType, data);
      this.notice.set('Changes saved successfully.');
      await this.load();
      return true;
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
      return false;
    } finally {
      this.busy.set(false);
    }
  }

  hasBcn(item: DataRecord): boolean {
    return typeof item['bcn'] === 'string' && item['bcn'].trim() !== '';
  }

  async copyBcn(value: unknown): Promise<void> {
    if (typeof value !== 'string' || value === '') return;
    try {
      await navigator.clipboard.writeText(value);
      this.notice.set('BBG Contribution Number copied.');
    } catch {
      this.error.set('Could not copy the BCN. Please select and copy it manually.');
    }
  }

  subscriptionReviewDetail(): DataRecord | null {
    const detail = this.subscriptionReview()?.['subscription'];
    return detail && typeof detail === 'object' && !Array.isArray(detail)
      ? (detail as DataRecord)
      : null;
  }

  subscriptionReviewProofs(): DataRecord[] {
    const proofs = this.subscriptionReview()?.['proofs'];
    return Array.isArray(proofs) ? (proofs as DataRecord[]) : [];
  }

  subscriptionReviewHistory(): DataRecord[] {
    const history = this.subscriptionReview()?.['review_history'];
    return Array.isArray(history) ? (history as DataRecord[]) : [];
  }

  async loadModerationHistory(): Promise<void> {
    if (this.moderationHistoryLoading()) return;
    this.moderationHistoryLoading.set(true);
    this.error.set('');
    try {
      const data = await this.request<{ items?: DataRecord[] }>(
        '/api/v1/admin/moderation/history',
        'adminParam',
        'listModerationHistory',
        { page: 1, page_size: 25 },
      );
      this.moderationHistory.set(data.items ?? []);
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    } finally {
      this.moderationHistoryLoading.set(false);
    }
  }

  async openRecordDetail(item: DataRecord): Promise<void> {
    if (this.busy()) return;
    const section = this.section();
    const tenantId = this.workspace.activeTenantId();
    let path = '';
    let key: EnvelopeKey = 'adminParam';
    let actionType = '';
    let actionData: DataRecord = {};

    if (section === 'platform-users') {
      path = '/api/v1/admin/users/detail';
      actionType = 'getPlatformUser';
      actionData = { user_id: Number(item['user_id'] ?? item['id']) };
      this.recordDetailTitle.set('Platform user details');
    } else if (section === 'business-approval') {
      path = '/api/v1/admin/businesses/detail';
      actionType = 'getBusinessForReview';
      actionData = { business_id: Number(item['business_id'] ?? item['id']) };
      this.recordDetailTitle.set('Business application details');
    } else if (section === 'orders') {
      const orderId = Number(item['order_id'] ?? item['id'] ?? 0);
      if (!orderId) return;
      key = 'orderParam';
      path = tenantId ? '/api/v1/orders/tenant/detail' : '/api/v1/orders/detail';
      actionType = tenantId ? 'getTenantOrder' : 'getMyOrder';
      actionData = { order_id: orderId, ...(tenantId ? { tenant_id: tenantId } : {}) };
      this.recordDetailTitle.set('Order details');
    } else if (section === 'enquiries') {
      const enquiryId = Number(item['enquiry_id'] ?? item['id'] ?? 0);
      if (!enquiryId) return;
      key = 'enquiryParam';
      path = tenantId ? '/api/v1/enquiries/tenant/detail' : '/api/v1/enquiries/mine/detail';
      actionType = tenantId ? 'getTenantEnquiry' : 'getMyEnquiry';
      actionData = { enquiry_id: enquiryId, ...(tenantId ? { tenant_id: tenantId } : {}) };
      this.recordDetailTitle.set('Enquiry details');
    } else if (section === 'payments') {
      const paymentId = Number(item['payment_id'] ?? item['id'] ?? 0);
      if (!paymentId) return;
      key = 'paymentParam';
      path = tenantId ? '/api/v1/payments/tenant/detail' : '/api/v1/payments/mine/detail';
      actionType = tenantId ? 'getTenantPayment' : 'getMyPayment';
      actionData = { payment_id: paymentId, ...(tenantId ? { tenant_id: tenantId } : {}) };
      this.recordDetailTitle.set('Payment details');
    } else if (section === 'subscriptions' && tenantId !== null) {
      const subscriptionId = Number(item['subscription_id'] ?? item['id'] ?? 0);
      if (!subscriptionId) return;
      key = 'subscriptionParam';
      path = '/api/v1/subscriptions/mine/detail';
      actionType = 'getMySubscription';
      actionData = { tenant_id: tenantId, subscription_id: subscriptionId };
      this.recordDetailTitle.set('Subscription details');
    } else if (section === 'members') {
      this.recordDetail.set(item);
      this.recordDetailTitle.set('Team member details');
      return;
    } else {
      return;
    }

    this.busy.set(true);
    this.error.set('');
    this.recordDetail.set(null);
    try {
      this.recordDetail.set(await this.request<DataRecord>(path, key, actionType, actionData));
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  async openSubscriptionReview(item: DataRecord): Promise<void> {
    const subscriptionId = this.recordId(item, 'subscription_id');
    if (!subscriptionId || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const detail = await this.request<DataRecord>(
        '/api/v1/admin/subscriptions/detail',
        'adminParam',
        'getSubscriptionForReview',
        { subscription_id: subscriptionId },
      );
      this.subscriptionReview.set(detail);
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  setPaymentQrFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (
      file &&
      (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
        file.size < 1 ||
        file.size > 10 * 1024 * 1024)
    ) {
      this.error.set('Choose a JPG, PNG or WEBP image up to 10 MB.');
      this.clearPaymentQrPreview();
    } else {
      this.error.set('');
      this.clearPaymentQrPreview();
      this.qrFile.set(file);
      this.qrPreviewUrl.set(file ? URL.createObjectURL(file) : null);
    }
    input.value = '';
  }

  private clearPaymentQrPreview(): void {
    const preview = this.qrPreviewUrl();
    if (preview) URL.revokeObjectURL(preview);
    this.qrPreviewUrl.set(null);
    this.qrFile.set(null);
  }

  closePaymentQrDrawer(): void {
    if (this.busy()) return;
    this.showPaymentQrDrawer.set(false);
    this.clearPaymentQrPreview();
  }

  async savePaymentQrConfig(): Promise<void> {
    const file = this.qrFile();
    if (!file || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const upload = await this.request<{
        upload_url: string;
        object_key: string;
        headers: Record<string, string>;
      }>(
        '/api/v1/admin/subscriptions/payment-qr/upload-url',
        'adminParam',
        'generatePaymentQrUploadUrl',
        {
          original_file_name: file.name,
          mime_type: file.type,
          file_size_bytes: file.size,
        },
      );
      await this.s3Upload.upload(
        upload.upload_url,
        file,
        upload.headers ?? { 'Content-Type': file.type },
      );
      await this.request(
        '/api/v1/admin/subscriptions/payment-qr/save',
        'adminParam',
        'savePaymentQrConfig',
        {
          payee_name: this.qrPayeeName().trim(),
          upi_id: this.qrUpiId().trim(),
          payment_instructions: this.qrInstructions().trim(),
          qr_file_path: upload.object_key,
        },
      );
      this.notice.set('A new payment QR configuration is active for new subscription requests.');
      this.clearPaymentQrPreview();
      await this.load();
      this.showPaymentQrDrawer.set(false);
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  openPlanEditDrawer(item: DataRecord): void {
    if (!this.can('subscription.update')) return;
    this.editingPlanId.set(Number(item['id'] ?? 0));
    this.editingPlanCode.set(String(item['plan_code'] ?? ''));
    this.editingPlanName.set(String(item['plan_name'] ?? ''));
    this.editingPlanPrice.set(String(item['price'] ?? '0.00'));
    this.editingPlanCycle.set(String(item['billing_cycle'] ?? ''));
    this.editingPlanDescription.set(String(item['description'] ?? ''));
    this.editingPlanStatus.set(String(item['plan_status'] ?? 'ACTIVE'));

    const entStr = String(item['entitlements'] ?? '');
    const entMap: Record<string, unknown> = {
      'business.profile': true,
      'storefront.enabled': true,
      'catalogue.enabled': true,
      'product.limit': '50',
      'promotions.enabled': true,
      'promotions.limit': '10',
      'advanced.reports.enabled': false,
      'support.level': 'STANDARD',
    };
    if (entStr) {
      entStr.split(';').forEach((pair) => {
        const [k, v] = pair.split('=');
        if (k && v !== undefined) {
          if (v === '1' || v.toLowerCase() === 'true') entMap[k] = true;
          else if (v === '0' || v.toLowerCase() === 'false') entMap[k] = false;
          else entMap[k] = v;
        }
      });
    }
    this.editingPlanEntitlements.set(entMap);
    this.error.set('');
    this.showPlanEditDrawer.set(true);
  }

  closePlanEditDrawer(): void {
    if (this.busy()) return;
    this.showPlanEditDrawer.set(false);
    this.editingPlanId.set(null);
  }

  setEditPlanEntitlement(code: string, value: unknown): void {
    this.editingPlanEntitlements.update((prev) => ({ ...prev, [code]: value }));
  }

  async savePlanEdit(): Promise<void> {
    const planId = this.editingPlanId();
    if (!planId || this.busy() || !this.can('subscription.update')) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.request('/api/v1/admin/plans/update', 'adminParam', 'updateAdminPlan', {
        plan_id: planId,
        plan_name: this.editingPlanName().trim(),
        price: Number(this.editingPlanPrice()),
        description: this.editingPlanDescription().trim(),
        plan_status: this.editingPlanStatus(),
        entitlements: this.editingPlanEntitlements(),
      });
      this.notice.set('Subscription plan updated successfully.');
      this.showPlanEditDrawer.set(false);
      this.editingPlanId.set(null);
      await this.load();
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  openPlanCreateDrawer(): void {
    if (!this.can('subscription.update')) return;
    this.newPlanCode.set('');
    this.newPlanName.set('');
    this.newPlanCycle.set('QUARTERLY');
    this.newPlanPrice.set('');
    this.newPlanDescription.set('');
    this.newPlanStatus.set('ACTIVE');
    this.newPlanEntitlements.set({
      'business.profile': true,
      'storefront.enabled': true,
      'catalogue.enabled': true,
      'product.limit': '50',
      'promotions.enabled': true,
      'promotions.limit': '10',
      'advanced.reports.enabled': false,
      'support.level': 'STANDARD',
    });
    this.error.set('');
    this.showPlanCreateDrawer.set(true);
  }

  closePlanCreateDrawer(): void {
    if (this.busy()) return;
    this.showPlanCreateDrawer.set(false);
  }

  setNewPlanEntitlement(code: string, value: unknown): void {
    this.newPlanEntitlements.update((prev) => ({ ...prev, [code]: value }));
  }

  async submitCreatePlan(): Promise<void> {
    if (!this.can('subscription.update') || this.busy()) return;
    const planCode = this.newPlanCode().trim().toUpperCase();
    const planName = this.newPlanName().trim();
    const price = Number(this.newPlanPrice());
    const billingCycle = this.newPlanCycle();
    const description = this.newPlanDescription().trim();
    const planStatus = this.newPlanStatus();
    const entitlements = this.newPlanEntitlements();

    if (!planCode || !planName || Number.isNaN(price) || price < 0) {
      this.error.set('Please provide a valid plan code, name, and non-negative price.');
      return;
    }

    this.busy.set(true);
    this.error.set('');
    try {
      await this.request('/api/v1/admin/plans/create', 'adminParam', 'createAdminPlan', {
        plan_code: planCode,
        plan_name: planName,
        billing_cycle: billingCycle,
        price,
        description,
        plan_status: planStatus,
        currency: 'INR',
        entitlements,
      });
      this.notice.set(`Subscription plan "${planName}" created successfully.`);
      this.closePlanCreateDrawer();
      await this.load();
    } catch (err) {
      this.error.set(this.auth.errorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }

  openTeamMemberDrawer(): void {
    if (!this.can('tenant.update')) return;
    this.teamMemberMode.set('add');
    this.teamSearchEmail.set('');
    this.teamSearchResults.set([]);
    this.teamSearchLoading.set(false);
    this.teamSelectedUserId.set(null);
    this.teamSelectedUserName.set('');
    this.teamInviteEmail.set('');
    this.teamSelectedRole.set('STAFF');
    this.createdInvitationToken.set(null);
    this.error.set('');
    this.showTeamMemberDrawer.set(true);
  }

  closeTeamMemberDrawer(): void {
    if (this.busy()) return;
    this.showTeamMemberDrawer.set(false);
    this.teamSearchResults.set([]);
    this.teamSelectedUserId.set(null);
    this.createdInvitationToken.set(null);
  }

  async searchEligibleUsers(): Promise<void> {
    const email = this.teamSearchEmail().trim().toLowerCase();
    const tenantId = this.workspace.activeTenantId();
    if (!email || !tenantId) return;
    this.teamSearchLoading.set(true);
    this.teamSearchResults.set([]);
    this.teamSelectedUserId.set(null);
    this.error.set('');
    try {
      const result = await this.request<{ items?: DataRecord[] }>(
        '/api/v1/tenants/members/search',
        'tenantParam',
        'searchEligibleTenantUsers',
        { tenant_id: tenantId, email },
      );
      this.teamSearchResults.set(result.items ?? []);
      if (!result.items?.length) {
        this.notice.set('No active users found with that email address.');
      }
    } catch (err) {
      this.error.set(this.auth.errorMessage(err));
    } finally {
      this.teamSearchLoading.set(false);
    }
  }

  selectUserToAdd(user: DataRecord): void {
    this.teamSelectedUserId.set(Number(user['id'] ?? user['user_id']));
    this.teamSelectedUserName.set(String(user['full_name'] ?? user['name'] ?? user['email']));
  }

  async submitAddMember(): Promise<void> {
    const tenantId = this.workspace.activeTenantId();
    const userId = this.teamSelectedUserId();
    const roleCode = this.teamSelectedRole();
    if (!tenantId || !userId || !roleCode || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.request('/api/v1/tenants/members/add', 'tenantParam', 'addExistingTenantMember', {
        tenant_id: tenantId,
        user_id: userId,
        role_code: roleCode,
      });
      this.notice.set('Team member successfully added.');
      this.closeTeamMemberDrawer();
      await this.load();
    } catch (err) {
      this.error.set(this.auth.errorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }

  async submitInviteMember(): Promise<void> {
    const tenantId = this.workspace.activeTenantId();
    const email = this.teamInviteEmail().trim().toLowerCase();
    const roleCode = this.teamSelectedRole();
    if (!tenantId || !email || !roleCode || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const result = await this.request<{ token?: string }>(
        '/api/v1/tenants/members/invite',
        'tenantParam',
        'createTenantInvitation',
        { tenant_id: tenantId, email, role_code: roleCode },
      );
      this.createdInvitationToken.set(result.token ?? 'INVITATION_RECORDED');
      this.notice.set(`Invitation created for ${email}.`);
      await this.load();
    } catch (err) {
      this.error.set(this.auth.errorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }

  openChangeRoleDrawer(member: DataRecord): void {
    if (!this.can('tenant.update')) return;
    const userId = Number(member['user_id'] ?? member['id']);
    this.targetMemberId.set(userId);
    this.targetMemberName.set(this.recordTitle(member));
    this.targetMemberRole.set(String(member['role_code'] ?? 'STAFF'));
    this.error.set('');
    this.showChangeRoleDrawer.set(true);
  }

  closeChangeRoleDrawer(): void {
    if (this.busy()) return;
    this.showChangeRoleDrawer.set(false);
    this.targetMemberId.set(null);
  }

  async submitChangeRole(): Promise<void> {
    const tenantId = this.workspace.activeTenantId();
    const userId = this.targetMemberId();
    const roleCode = this.targetMemberRole();
    if (!tenantId || !userId || !roleCode || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.request('/api/v1/tenants/members/role', 'tenantParam', 'changeTenantMemberRole', {
        tenant_id: tenantId,
        user_id: userId,
        role_code: roleCode,
      });
      this.notice.set('Member role updated successfully.');
      this.closeChangeRoleDrawer();
      await this.load();
    } catch (err) {
      this.error.set(this.auth.errorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }

  prepareProofUpload(event: Event, subscription: DataRecord): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type) || file.size < 1 || file.size > 10 * 1024 * 1024) {
      this.error.set('Choose a non-empty JPG, PNG, WEBP or PDF file up to 10 MB.');
      input.value = '';
      return;
    }
    const subscriptionId = this.recordId(subscription, 'subscription_id');
    if (!subscriptionId || !this.workspace.activeTenantId()) {
      this.error.set('Subscription or workspace details are unavailable.');
      input.value = '';
      return;
    }
    this.proofFile.set(file);
    this.proofSubscription.set(subscription);
    this.proofPaymentReference.set('');
    this.error.set('');
    this.showProofDrawer.set(true);
    input.value = '';
  }

  closeProofDrawer(): void {
    if (this.busy()) return;
    this.showProofDrawer.set(false);
    this.proofFile.set(null);
    this.proofSubscription.set(null);
    this.proofPaymentReference.set('');
  }

  async uploadProof(): Promise<void> {
    const file = this.proofFile();
    const subscription = this.proofSubscription();
    const subscriptionId = subscription ? this.recordId(subscription, 'subscription_id') : 0;
    const tenantId = this.workspace.activeTenantId();
    if (!file || !subscriptionId || !tenantId || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const upload = await this.request<{
        upload_url: string;
        object_key: string;
        method: string;
        headers: Record<string, string>;
      }>(
        '/api/v1/subscriptions/application/proofs/upload-url',
        'subscriptionParam',
        'generateApplicationProofUploadUrl',
        {
          tenant_id: tenantId,
          subscription_id: subscriptionId,
          original_file_name: file.name,
          mime_type: file.type,
          file_size_bytes: file.size,
        },
      );
      await this.s3Upload.upload(
        upload.upload_url,
        file,
        upload.headers ?? { 'Content-Type': file.type },
      );
      this.proofDrafts.update((drafts) => ({
        ...drafts,
        [subscriptionId]: {
          objectKey: upload.object_key,
          paymentReference: this.proofPaymentReference().trim(),
          fileName: file.name,
        },
      }));
      this.notice.set(
        'Receipt uploaded. Select “Submit for Review” when you are ready to send it to the BBG team.',
      );
      this.showProofDrawer.set(false);
      this.proofFile.set(null);
      this.proofSubscription.set(null);
      this.proofPaymentReference.set('');
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  async submitProof(subscription: DataRecord): Promise<void> {
    const subscriptionId = this.recordId(subscription, 'subscription_id');
    const tenantId = this.workspace.activeTenantId();
    const draft = this.proofDrafts()[subscriptionId];
    if (!subscriptionId || !tenantId || !draft || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.request(
        '/api/v1/subscriptions/application/proofs/submit',
        'subscriptionParam',
        'submitApplicationSubscriptionProof',
        {
          tenant_id: tenantId,
          subscription_id: subscriptionId,
          proof_file_path: draft.objectKey,
          ...(draft.paymentReference ? { payment_reference: draft.paymentReference } : {}),
        },
      );
      this.proofDrafts.update((drafts) => {
        const next = { ...drafts };
        delete next[subscriptionId];
        return next;
      });
      this.notice.set('Payment proof submitted for review.');
      await this.load();
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  async requestPlan(plan: DataRecord): Promise<void> {
    const planId = this.recordId(plan, 'plan_id');
    const tenantId = this.workspace.activeTenantId();
    const activeSubscription = this.items().find(
      (item) => String(item['subscription_status'] ?? '').toUpperCase() === 'ACTIVE',
    );
    const subscriptionId = activeSubscription
      ? this.recordId(activeSubscription, 'subscription_id')
      : 0;
    if (
      !planId ||
      !tenantId ||
      !subscriptionId ||
      !this.canManageOwnedSubscription() ||
      this.busy()
    ) {
      this.error.set(
        'An active subscription and business-owner access are required to request a plan upgrade.',
      );
      return;
    }
    this.pendingPlanId.set(planId);
    this.busy.set(true);
    this.error.set('');
    try {
      await this.request(
        '/api/v1/subscriptions/application/upgrade/request',
        'subscriptionParam',
        'requestApplicationSubscriptionUpgrade',
        { tenant_id: tenantId, subscription_id: subscriptionId, plan_id: planId },
      );
      this.notice.set(
        'Your upgrade request and payment instructions are ready. Upload the receipt to submit it for review.',
      );
      await this.load();
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    } finally {
      this.pendingPlanId.set(null);
      this.busy.set(false);
    }
  }

  humanize(value: string): string {
    return value
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
  inputValue(event: Event): string {
    return (event.target as HTMLInputElement | HTMLTextAreaElement).value;
  }
  asUrl(value: unknown): string {
    return typeof value === 'string' ? value : String(value ?? '');
  }
  formatValue(value: unknown): string {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'string' && /^\d{4}-\d\d-\d\d/.test(value))
      return new Date(value).toLocaleString();
    return String(value);
  }
  statusClass(status: string): string {
    const value = status.toUpperCase();
    if (
      ['ACTIVE', 'APPROVED', 'PUBLISHED', 'CONFIRMED', 'RESPONDED', 'PAID', 'RESOLVED'].includes(
        value,
      )
    )
      return 'status-chip good';
    if (['PENDING', 'DRAFT', 'PROCESSING', 'OPEN'].includes(value)) return 'status-chip warn';
    if (['REJECTED', 'CANCELLED', 'SUSPENDED', 'FAILED', 'DISMISSED'].includes(value))
      return 'status-chip bad';
    return 'status-chip';
  }
  asString(value: unknown): string {
    return typeof value === 'string' ? value : String(value ?? '');
  }
  asNumber(value: unknown): number {
    return Number(value ?? 0);
  }
  initials(value: unknown): string {
    const str = typeof value === 'string' ? value.trim() : '';
    return (str ? str.charAt(0) : 'B').toUpperCase();
  }
}
