import { HttpClient, HttpEventType, HttpHeaders } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, firstValueFrom, lastValueFrom, tap } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api-base-url';
import { AuthService } from '../../core/auth/auth.service';
import { WorkspaceContextService } from '../../core/workspace/workspace-context.service';
import { hasActiveEntitlement, hasWorkspacePermission } from '../../core/workspace/workspace-access';
import { WorkspaceDrawer } from '../../shared/workspace-drawer/workspace-drawer';
import { BusinessProfileModule } from './components/business-profile-module/business-profile-module';
import { StorefrontModule } from './components/storefront-module/storefront-module';
import { WorkspaceRecordsModule, WorkspaceRecordCardModel } from './components/workspace-records-module/workspace-records-module';
import { PersonalAccountModule } from './components/personal-account-module/personal-account-module';
import { SubscriptionPlansModule } from './components/subscription-plans-module/subscription-plans-module';
import { PromotionComposerModule } from './components/promotion-composer-module/promotion-composer-module';
import { PlatformAnalyticsModule } from './components/platform-analytics-module/platform-analytics-module';
import { ModerationHistoryModule, ModerationHistoryItem } from './components/moderation-history-module/moderation-history-module';
import { WorkspaceSummaryModule, WorkspaceSummaryItem } from './components/workspace-summary-module/workspace-summary-module';
import { PaymentQrSettingsModule } from './components/payment-qr-settings-module/payment-qr-settings-module';

type EnvelopeKey = 'authParam' | 'businessParam' | 'customerParam' | 'orderParam' | 'enquiryParam' | 'paymentParam' | 'promotionParam' | 'subscriptionParam' | 'adminParam' | 'tenantParam' | 'dashboardParam';
interface ApiEnvelope<T = unknown> { status: 'SUCCESS' | 'FAILED' | 'EXCEPTION'; msgArr?: string[]; data?: T | []; }
interface DataRecord { [key: string]: unknown; }
interface ListResult {
  items?: DataRecord[];
  pagination?: { page?: number; page_size?: number; total?: number };
}
interface PersonalProfileForm { full_name: string; email: string; mobile: string; }
interface AddressForm {
  recipient_name: string; mobile: string; address_line_1: string; address_line_2: string;
  city: string; state: string; postal_code: string; country_code: string; address_label: string;
  is_default: boolean;
}
interface CategoryForm {
  category_code: string; category_name: string; category_type: 'BUSINESS' | 'PRODUCT';
  description: string; parent_category_id: string; display_order: string;
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
  'edit-address': 'user.update',
  'default-address': 'user.update',
  'delete-address': 'user.update',
  'suspend-user': 'user.update',
  'restore-user': 'user.update',
  'approve-business': 'business.approve',
  'reject-business': 'business.approve',
  'renew-subscription': 'subscription.create',
  'approve-subscription': 'subscription.approve',
  'reject-subscription': 'subscription.approve',
  moderate: 'admin.update',
  'edit-category': 'admin.update',
  'delete-category': 'admin.delete',
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-dashboard-module',
  standalone: true,
  imports: [WorkspaceDrawer, BusinessProfileModule, StorefrontModule, WorkspaceRecordsModule, PersonalAccountModule, SubscriptionPlansModule, PromotionComposerModule, PlatformAnalyticsModule, ModerationHistoryModule, WorkspaceSummaryModule, PaymentQrSettingsModule],
  templateUrl: './dashboard-module.html',
  styleUrl: './dashboard-module.scss',
})
export class DashboardModule implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
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
  readonly pageSize = 25;
  readonly totalItems = signal(0);
  readonly paginationPageSize = computed(() => this.section() === 'subscription-approval' ? this.pageSize * 2 : this.pageSize);
  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.totalItems() / this.paginationPageSize())));
  private loadSequence = 0;
  private loadedContextKey: string | null = null;
  private lastLoadedPage = 1;
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
      if (search && !Object.values(item).some((value) => value !== null && typeof value !== 'object' && String(value).toLowerCase().includes(search))) return false;
      const statusValue = ['order_status','payment_status','enquiry_status','publication_status','approval_status','subscription_status','status'].map((key) => item[key]).find((value) => value !== undefined && value !== null);
      if (status && String(statusValue ?? '').toUpperCase() !== status) return false;
      const dateValue = ['created_on','created_at','order_date','enquiry_date','payment_date','updated_on'].map((key) => item[key]).find((value) => value !== undefined && value !== null);
      if (from || to) {
        const date = dateValue ? new Date(String(dateValue)) : null;
        if (!date || Number.isNaN(date.getTime())) return false;
        const day = date.toISOString().slice(0,10);
        if (from && day < from) return false;
        if (to && day > to) return false;
      }
      return true;
    });
  });
  readonly summary = signal<DataRecord | null>(null);
  readonly summaryCardModels = computed<WorkspaceSummaryItem[]>(() => this.summaryEntries().map((entry) => ({
    key: entry.key, label: this.humanize(entry.key), value: this.formatValue(entry.value),
  })));
  readonly showPersonalProfileDrawer = signal(false);
  readonly showAddressDrawer = signal(false);
  readonly storefrontDetails = computed(() => {
    const value = this.summary()?.['storefront'];
    return value && typeof value === 'object' && !Array.isArray(value) ? value as DataRecord : null;
  });
  readonly addressEditingId = signal<number | null>(null);
  readonly personalProfileForm = signal<PersonalProfileForm>({ full_name: '', email: '', mobile: '' });
  readonly addressForm = signal<AddressForm>({
    recipient_name: '', mobile: '', address_line_1: '', address_line_2: '', city: '', state: '',
    postal_code: '', country_code: 'IN', address_label: 'Home', is_default: false,
  });
  readonly showCategoryDrawer = signal(false);
  readonly editingCategoryId = signal<number | null>(null);
  readonly categoryForm = signal<CategoryForm>({
    category_code: '', category_name: '', category_type: 'BUSINESS', description: '',
    parent_category_id: '', display_order: '0',
  });
  readonly showReplyDrawer = signal(false);
  readonly showPaymentQrDrawer = signal(false);
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
  readonly showPasswordForm = signal(false);
  readonly currentPassword = signal('');
  readonly newPassword = signal('');
  readonly confirmPassword = signal('');
  readonly passwordError = signal('');
  readonly profileInitials = computed(() => String(this.summary()?.['full_name'] ?? 'BB').trim().split(/\s+/).slice(0,2).map((part) => part.charAt(0).toUpperCase()).join('') || 'BB');
  readonly plans = signal<DataRecord[]>([]);
  readonly pendingPlanId = signal<number | null>(null);
  readonly proofDrafts = signal<Record<number,{objectKey:string;paymentReference:string;fileName:string}>>({});
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
  readonly moderationHistoryItems = computed<ModerationHistoryItem[]>(() => this.moderationHistory().map((entry) => ({
    id: this.recordId(entry, 'history_id'),
    title: this.recordTitle(entry),
    subtitle: this.recordSubtitle(entry),
    status: this.statusOf(entry) ? this.humanize(this.statusOf(entry)) : '',
    statusClass: this.statusClass(this.statusOf(entry)),
    fields: this.recordEntries(entry).map((field) => ({
      key: field.key, label: this.humanize(field.key), value: this.formatValue(field.value),
    })),
  })));
  readonly showPromotionComposer = signal(false);
  readonly promotionTitle = signal('');
  readonly promotionContent = signal('');
  readonly promotionValidUntil = signal('');
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
    return this.config[section]?.title ?? (this.workspace.activeTenantId() === null ? 'My Account' : 'Business Workspace');
  });
  readonly description = computed(() => {
    const personalDescriptions: Record<string, string> = {
      customers: 'Manage your personal details and saved delivery addresses.',
      enquiries: 'Review your enquiries and conversations with businesses.',
      orders: 'Track orders you have placed with businesses on BBG.',
      payments: 'Review payments associated with your customer orders.',
    };
    return this.isPersonalContext()
      ? personalDescriptions[this.section()] ?? 'Manage your personal BBG account.'
      : this.config[this.section()]?.description ?? 'Manage your business operations.';
  });
  readonly contextLabel = computed(() => this.workspace.activeTenantId() !== null
    ? 'BUSINESS WORKSPACE'
    : this.workspace.permissions().some((permission) => permission.scope_type === 'PLATFORM')
      ? 'PLATFORM ADMINISTRATION'
      : 'MY ACCOUNT');
  readonly summaryEntries = computed(() => {
    const source = this.summary();
    if (!source) return [];
    const entries: Array<{key:string;value:unknown}> = [];
    for (const [key, value] of Object.entries(source)) {
      if (value !== null && typeof value !== 'object') entries.push({key,value});
      else if (value && typeof value === 'object' && !Array.isArray(value)) {
        for (const [nestedKey, nestedValue] of Object.entries(value as DataRecord)) {
          if (nestedValue === null || typeof nestedValue !== 'object') entries.push({key: nestedKey, value: nestedValue});
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
      { key: 'orders', label: 'Orders', path: '/dashboard/orders' },
      { key: 'promotions', label: 'Promotions', path: '/dashboard/promotions' },
      { key: 'subscriptions', label: 'Subscriptions', path: '/dashboard/subscriptions' },
      { key: 'payments', label: 'Payments', path: '/dashboard/payments' },
      { key: 'analytics', label: 'Analytics', path: '/dashboard/analytics' },
      { key: 'platform-users', label: 'Users', path: '/dashboard/platform-users' },
      { key: 'business-approval', label: 'Business reviews', path: '/dashboard/business-approval' },
      { key: 'subscription-approval', label: 'Plan reviews', path: '/dashboard/subscription-approval' },
      { key: 'payment-qr-settings', label: 'Payment QR settings', path: '/dashboard/payment-qr-settings' },
      { key: 'moderation', label: 'Moderation', path: '/dashboard/moderation' },
      { key: 'system-health', label: 'System health', path: '/dashboard/system-health' },
      { key: 'platform-analytics', label: 'Platform analytics', path: '/dashboard/platform-analytics' },
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
    return links.filter((link) => {
      const requiredPermission = scope === 'TENANT'
        ? tenantRequirements[link.key]
        : scope === 'PLATFORM'
          ? platformRequirements[link.key]
          : personalRequirements[link.key];
      if (!requiredPermission || !hasWorkspacePermission(permissions, scope, requiredPermission)) return false;
      const entitlement = scope === 'TENANT' ? tenantEntitlements[link.key] : undefined;
      return entitlement === undefined || hasActiveEntitlement(entitlements, entitlement);
    }).map((link) => {
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
    profile: { title: 'Business profile', description: 'Review your approved business information and account details.' },
    storefront: { title: 'Storefront', description: 'Review the public storefront information and publication status for this business.' },
    customers: { title: 'Customers', description: 'Review customer information and available customer records.' },
    enquiries: { title: 'Enquiries', description: 'Review incoming enquiries and manage sales conversations.' },
    orders: { title: 'Order management', description: 'Process, update and track orders for this business.' },
    promotions: { title: 'Promotions', description: 'Review campaigns and publish or pause eligible promotions.' },
    subscriptions: { title: 'Subscriptions & plans', description: 'Review available plans and the subscription history for this business.' },
    payments: { title: 'Payments', description: 'Review payment activity and related business records.' },
    analytics: { title: 'Analytics', description: 'Review the summary metrics available in this area.' },
    members: { title: 'Team & access', description: 'Review the members assigned to this business workspace.' },
    'platform-analytics': { title: 'Platform analytics', description: 'Review platform-wide metrics exposed to authorized administrators.' },
    categories: { title: 'Marketplace categories', description: 'Review the category taxonomy used by marketplace listings.' },
    'platform-users': { title: 'Platform users', description: 'Review platform accounts and suspend or restore eligible users.' },
    'business-approval': { title: 'Business approvals', description: 'Review pending business applications and process approval decisions.' },
    'subscription-approval': { title: 'Subscription approvals', description: 'Review pending subscription requests and process decisions.' },
    'payment-qr-settings': { title: 'Payment QR settings', description: 'Manage the UPI payment QR used for new subscription requests.' },
    moderation: { title: 'Marketplace moderation', description: 'Review reported marketplace content and record moderation decisions.' },
    'system-health': { title: 'System health', description: 'Review safe operational health information exposed to platform staff.' },
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

  private async request<T = unknown>(path: string, key: EnvelopeKey, actionType: string, actionData: DataRecord = {}): Promise<T> {
    const loadId = this.loading() ? this.loadSequence : null;
    const section = this.section();
    const tenantId = this.workspace.activeTenantId();
    const context = this.workspace.activeContext();
    const response = await firstValueFrom(this.http.post<ApiEnvelope<T>>(`${this.apiBaseUrl}${path}`, {
      [key]: { actionType, actionData },
    }));
    if (loadId !== null && loadId !== this.loadSequence) throw new StaleWorkspaceRequestError();
    if (section !== this.section() || tenantId !== this.workspace.activeTenantId() || context !== this.workspace.activeContext()) {
      throw new StaleWorkspaceRequestError();
    }
    if (response.status !== 'SUCCESS') throw new Error(response.msgArr?.join(' ') || 'The request could not be completed.');
    return response.data as T;
  }

  private setListResult(result: ListResult): void {
    const items = Array.isArray(result.items) ? result.items : [];
    const total = Number(result.pagination?.total);
    this.items.set(items);
    this.totalItems.set(Number.isFinite(total) && total >= 0 ? total : items.length);
  }

  goToPage(page: number): void {
    if (this.loading() || page < 1 || page > this.pageCount() || page === this.currentPage()) return;
    this.currentPage.set(page);
    void this.load();
  }

  async load(): Promise<void> {
    const loadId = ++this.loadSequence;
    let contextKey: string | null = null;
    this.loading.set(true); this.error.set(''); this.unsupported.set('');
    try {
      await this.workspace.initialize();
      if (loadId !== this.loadSequence) return;
      const tenantId = this.workspace.activeTenantId();
      contextKey = [this.section(), this.workspace.activeContext() ?? 'UNKNOWN', tenantId ?? 'none'].join(':');
      if (this.loadedContextKey !== contextKey) {
        this.items.set([]); this.totalItems.set(0); this.summary.set(null); this.plans.set([]);
        this.moderationHistory.set([]); this.analyticsTrends.set([]);
      }
      const pageData = { page: this.currentPage(), page_size: this.pageSize, ...(tenantId ? { tenant_id: tenantId } : {}) };
      switch (this.section()) {
        case 'members': {
          if (!tenantId) return this.setUnsupported('Open Business Workspace to view team members.');
          const data = await this.request<ListResult>('/api/v1/tenants/members/list','tenantParam','listTenantMembers',pageData);
          this.setListResult(data); break;
        }
        case 'profile':
          if (!tenantId) return this.setUnsupported('Open Business Workspace to view your business profile.');
          this.summary.set(await this.request<DataRecord>('/api/v1/business/profile/get','businessParam','getMyBusinessProfile',{tenant_id:tenantId}));
          break;
        case 'storefront':
          if (!tenantId) return this.setUnsupported('Open Business Workspace to view your storefront.');
          this.summary.set(await this.request<DataRecord>('/api/v1/business/storefront/get','businessParam','getMyStorefront',{tenant_id:tenantId}));
          break;
        case 'customers':
          if (tenantId) {
            const data = await this.request<ListResult>('/api/v1/customers/tenant/list','customerParam','listTenantCustomers',pageData);
            this.setListResult(data);
            break;
          }
          {
            const profile = await this.auth.loadProfile();
            if (loadId !== this.loadSequence) return;
            this.summary.set(profile as unknown as DataRecord);
            try {
              const addresses = await this.request<ListResult>('/api/v1/customers/addresses/list','customerParam','listMyAddresses');
              this.setListResult(addresses);
            } catch (addressError) {
              this.setListResult({ items: [] });
              this.notice.set('Your account details loaded, but saved addresses are temporarily unavailable. ' + this.auth.errorMessage(addressError));
            }
          }
          break;
        case 'orders':
          if (tenantId) {
            const data = await this.request<ListResult>('/api/v1/orders/tenant/list','orderParam','listTenantOrders',pageData);
            this.setListResult(data);
          } else {
            const data = await this.request<ListResult>('/api/v1/orders/list','orderParam','listMyOrders',pageData);
            this.setListResult(data);
          }
          break;
        case 'enquiries':
          if (tenantId) {
            const data = await this.request<ListResult>('/api/v1/enquiries/tenant/list','enquiryParam','listTenantEnquiries',pageData);
            this.setListResult(data);
          } else {
            const data = await this.request<ListResult>('/api/v1/enquiries/mine/list','enquiryParam','listMyEnquiries',pageData);
            this.setListResult(data);
          }
          break;
        case 'payments': {
          const data = tenantId
            ? await this.request<ListResult>('/api/v1/payments/tenant/list','paymentParam','listTenantPayments',pageData)
            : await this.request<ListResult>('/api/v1/payments/mine/list','paymentParam','listMyPayments',pageData);
          this.setListResult(data);
          break;
        }
        case 'promotions':
          if (!tenantId) return this.setUnsupported('Open Business Workspace to manage promotions.');
          {
            const data = await this.request<ListResult>('/api/v1/promotions/mine/list','promotionParam','listMyPromotions',pageData);
            this.setListResult(data);
          }
          break;
        case 'subscriptions':
          if (!tenantId) return this.setUnsupported('Open Business Workspace to review plans and subscriptions.');
          {
            const [plans, subscriptions] = await Promise.all([
              this.request<{items?:DataRecord[]}>('/api/v1/subscriptions/plans/list','subscriptionParam','listActivePlans'),
              this.request<ListResult>('/api/v1/subscriptions/mine/list','subscriptionParam','listMySubscriptions',pageData),
            ]);
            this.plans.set(plans.items ?? []); this.setListResult(subscriptions);
          }
          break;
        case 'analytics':
          if (tenantId) this.summary.set(await this.request<DataRecord>('/api/v1/dashboard/entrepreneur/summary','dashboardParam','getEntrepreneurDashboard',{tenant_id:tenantId}));
          else return this.setUnsupported('Business analytics require Business Workspace access.');
          break;
        case 'platform-analytics': {
          const endDate = new Date().toISOString().slice(0, 10);
          const startDate = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
          const [summary, trends] = await Promise.all([
            this.request<DataRecord>('/api/v1/admin/analytics/summary','adminParam','getAdminAnalyticsSummary'),
            this.request<{items?: DataRecord[]}>('/api/v1/admin/analytics/trends','adminParam','getAdminAnalyticsTrends',{
              start_date:startDate,end_date:endDate,
            }),
          ]);
          this.summary.set(summary);
          this.analyticsTrends.set(trends.items ?? []);
          break;
        }
        case 'categories': {
          const data = await this.request<ListResult>('/api/v1/admin/categories/list','adminParam','listAdminCategories',{page:this.currentPage(),page_size:this.pageSize});
          this.setListResult(data); break;
        }
        case 'platform-users': {
          const data = await this.request<ListResult>('/api/v1/admin/users/list','adminParam','listPlatformUsers',{page:this.currentPage(),page_size:this.pageSize});
          this.setListResult(data); break;
        }
        case 'business-approval': {
          const data = await this.request<ListResult>('/api/v1/admin/businesses/pending/list','adminParam','listPendingBusinesses',{page:this.currentPage(),page_size:this.pageSize});
          this.setListResult(data); break;
        }
        case 'subscription-approval': {
          const [pending, active] = await Promise.all([
            this.request<ListResult>('/api/v1/admin/subscriptions/pending/list','adminParam','listPendingSubscriptions',{page:this.currentPage(),page_size:this.pageSize}),
            this.request<ListResult>('/api/v1/admin/subscriptions/active/list','adminParam','listActiveSubscriptions',{page:this.currentPage(),page_size:this.pageSize}),
          ]);
          this.setListResult({
            items: [...(pending.items ?? []), ...(active.items ?? [])],
            pagination: { total: Number(pending.pagination?.total ?? pending.items?.length ?? 0) + Number(active.pagination?.total ?? active.items?.length ?? 0) },
          }); break;
        }
        case 'payment-qr-settings': {
          const data = await this.request<DataRecord>('/api/v1/admin/subscriptions/payment-qr/current','adminParam','getCurrentPaymentQrConfig');
          this.summary.set(data);
          this.qrPayeeName.set(String(data['payee_name'] ?? ''));
          this.qrUpiId.set(String(data['upi_id'] ?? ''));
          this.qrInstructions.set(String(data['payment_instructions'] ?? ''));
          this.qrFile.set(null);
          break;
        }
        case 'moderation': {
          const data = await this.request<ListResult>('/api/v1/admin/moderation/queue','adminParam','listModerationQueue',{page:this.currentPage(),page_size:this.pageSize});
          this.setListResult(data); break;
        }
        case 'system-health':
          this.summary.set(await this.request<DataRecord>('/api/v1/admin/health/summary','adminParam','getSafeSystemHealth'));
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

  private setUnsupported(message: string): void { this.unsupported.set(message); this.unsupportedTitle.set('Not available in this area'); this.loading.set(false); }

  readonly recordsHeading = computed(() => this.section() === 'customers' ? 'Saved addresses' : this.title());
  readonly recordCardModels = computed(() => this.filteredItems().map((item) => this.toRecordCardModel(item)));

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
    const paymentQr = item['payment_qr_url'] ? {
      url: this.asUrl(item['payment_qr_url']),
      payeeName: String(item['payment_payee_name'] ?? ''),
      upiId: String(item['payment_upi_id'] ?? ''),
      version: String(item['payment_qr_version'] ?? ''),
      instructions: String(item['payment_instructions'] ?? ''),
    } : null;
    return {
      id: this.recordId(item, 'id'),
      record: item,
      title: this.recordTitle(item),
      subtitle: this.recordSubtitle(item),
      status: status ? this.humanize(status) : '',
      statusClass: this.statusClass(status),
      fields: this.recordEntries(item).map((entry) => ({
        key: entry.key, label: this.humanize(entry.key), value: this.formatValue(entry.value),
      })),
      bcn: this.hasBcn(item) ? String(item['bcn']) : null,
      showDetail: ['platform-users','business-approval','orders','enquiries','payments'].includes(this.section())
        || (this.section() === 'subscriptions' && this.activeTenantId() !== null),
      showSubscriptionReview: this.section() === 'subscription-approval',
      paymentQr,
      media,
      showProofUpload: this.section() === 'subscriptions' && this.can('subscription.update')
        && ['PENDING','REJECTED'].includes(status.toUpperCase()) && item['latest_proof_review_status'] !== 'PENDING',
      proofFileName: proof?.fileName ?? null,
      actions: this.visibleActionsFor(item),
    };
  }
  recordId(item: DataRecord, preferred = 'id'): number {
    const value = item[preferred] ?? item['id'] ?? item['address_id'] ?? item['category_id'] ?? item['business_id'] ?? item['subscription_id'] ?? item['promotion_id'] ?? item['order_id'] ?? item['enquiry_id'] ?? item['payment_id'] ?? item['report_id'] ?? item['user_id'];
    return Number(value ?? 0);
  }
  valueOf(item: DataRecord, keys: string[]): string { for (const key of keys) if (item[key] !== null && item[key] !== undefined && item[key] !== '') return this.formatValue(item[key]); return '—'; }
  recordTitle(item: DataRecord): string {
    return this.valueOf(item,['business_name','tenant_name','display_name','address_label','plan_name','post_title','category_name','order_number','enquiry_number','payment_reference','full_name','name','email','report_number','id']);
  }
  recordSubtitle(item: DataRecord): string {
    return this.valueOf(item,['email','business_category','category_type','customer_name','address_line_1','city','mobile','created_at','created_on','order_status','enquiry_status','subscription_status']);
  }
  statusOf(item: DataRecord): string { return String(item['approval_status'] ?? item['subscription_status'] ?? item['publication_status'] ?? item['order_status'] ?? item['enquiry_status'] ?? item['payment_status'] ?? item['report_status'] ?? item['account_status'] ?? item['customer_status'] ?? item['status'] ?? ''); }
  recordEntries(item: DataRecord): Array<{key:string;value:unknown}> {
    const hidden = new Set(['id','tenant_id','user_id','business_id','subscription_id','promotion_id','order_id','enquiry_id','payment_id','report_id','bcn','created_by','updated_by','deleted_by','password_hash','access_token','refresh_token']);
    return Object.entries(item).filter(([key,value]) => !hidden.has(key) && value !== null && typeof value !== 'object').slice(0,8).map(([key,value])=>({key,value}));
  }

  detailEntries(item: DataRecord): Array<{key:string;value:unknown}> {
    const entries: Array<{key:string;value:unknown}> = [];
    const visit = (value: unknown, path: string, depth: number): void => {
      if (value === null || value === undefined || depth > 3 || entries.length >= 60) return;
      if (Array.isArray(value)) {
        value.forEach((entry, index) => visit(entry, path ? path + ' ' + (index + 1) : String(index + 1), depth + 1));
        return;
      }
      if (typeof value === 'object') {
        for (const [key, nested] of Object.entries(value as DataRecord)) {
          if (/password|token|secret|credential|authorization|hash|raw_payload/i.test(key)) continue;
          if (['created_by','updated_by','deleted_by','tenant_id','user_id','business_id'].includes(key)) continue;
          visit(nested, path ? path + '.' + key : key, depth + 1);
          if (entries.length >= 60) break;
        }
        return;
      }
      if (path) entries.push({ key: path, value });
    };
    visit(item, '', 0);
    return entries;
  }
  can(permissionCode: string): boolean {
    const context = this.workspace.activeContext();
    if (!context) return false;
    const scope = context === 'BUSINESS' ? 'TENANT' : context === 'PLATFORM' ? 'PLATFORM' : 'GLOBAL';
    return hasWorkspacePermission(this.workspace.permissions(), scope, permissionCode);
  }

  canAction(action: string): boolean {
    const permissionCode = ACTION_PERMISSION_CODES[action];
    return permissionCode !== undefined && this.can(permissionCode);
  }

  visibleActionsFor(item: DataRecord): Array<{key:string;label:string;danger?:boolean}> {
    return this.actionsFor(item).filter((action) => this.canAction(action.key));
  }

  actionsFor(item: DataRecord): Array<{key:string;label:string;danger?:boolean}> {
    const status = this.statusOf(item).toUpperCase();
    if (this.section()==='orders' && this.workspace.activeTenantId()!==null && !['CANCELLED','COMPLETED','DELIVERED'].includes(status)) return [{key:'confirm-order',label:'Confirm order'},{key:'cancel-order',label:'Cancel order',danger:true}];
    if (this.section()==='enquiries' && this.workspace.activeTenantId()!==null && status!=='CLOSED') return [{key:'reply-enquiry',label:'Reply'},{key:'close-enquiry',label:'Close enquiry',danger:true}];
    if (this.section()==='promotions') return status==='PUBLISHED'
      ? [{key:'unpublish-promotion',label:'Unpublish'}]
      : [{key:'manage-post-media',label:'Manage media'},{key:'publish-promotion',label:'Publish'}];
    if (this.section()==='customers' && this.workspace.activeTenantId()===null && (item['address_id'] || item['id'])) return [{key:'edit-address',label:'Edit address'},{key:'default-address',label:'Set as default'},{key:'delete-address',label:'Delete address',danger:true}];
    if (this.section()==='platform-users') return status==='SUSPENDED' ? [{key:'restore-user',label:'Restore account'}] : [{key:'suspend-user',label:'Suspend account',danger:true}];
    if (this.section()==='business-approval' && status==='PENDING') return [{key:'approve-business',label:'Approve'},{key:'reject-business',label:'Reject',danger:true}];
    if (this.section()==='subscription-approval' && status==='PENDING') return [{key:'approve-subscription',label:'Approve'},{key:'reject-subscription',label:'Reject',danger:true}];
    if (this.section()==='subscriptions' && ['ACTIVE','EXPIRED'].includes(status)) return [{key:'renew-subscription',label:'Renew subscription'}];
    if (this.section()==='moderation' && status==='OPEN') return [{key:'moderate',label:'Review report'}];
    if (this.section()==='categories') return [{key:'edit-category',label:'Edit category'},{key:'delete-category',label:'Delete category',danger:true}];
    return [];
  }

  async runAction(action: string, item: DataRecord): Promise<void> {
    if (this.busy() || !this.canAction(action)) return;
    const tenantId = this.workspace.activeTenantId();
    const id = this.recordId(item);
    let path = ''; let key: EnvelopeKey = 'adminParam'; let actionType = ''; let data: DataRecord = {};
    switch (action) {
      case 'manage-post-media':
        this.addMediaToPromotion(item);
        return;
      case 'confirm-order': case 'cancel-order':
        path = action==='confirm-order'?'/api/v1/orders/tenant/confirm':'/api/v1/orders/tenant/cancel'; key='orderParam'; actionType='changeTenantOrderStatus'; data={tenant_id:tenantId,order_id:id}; break;
      case 'reply-enquiry':
        this.replyEnquiryId.set(id);
        this.replyMessage.set('');
        this.error.set('');
        this.showReplyDrawer.set(true);
        return;
      case 'close-enquiry':
        if (!window.confirm('Close this enquiry?')) return;
        path='/api/v1/enquiries/tenant/close'; key='enquiryParam'; actionType='closeEnquiry'; data={tenant_id:tenantId,enquiry_id:id}; break;
      case 'publish-promotion': case 'unpublish-promotion':
        path=action==='publish-promotion'?'/api/v1/promotions/publish':'/api/v1/promotions/unpublish'; key='promotionParam'; actionType=action==='publish-promotion'?'publishPromotion':'unpublishPromotion'; data={tenant_id:tenantId,promotion_id:id}; break;
      case 'suspend-user': case 'restore-user':
        path=action==='suspend-user'?'/api/v1/admin/users/suspend':'/api/v1/admin/users/restore'; actionType=action==='suspend-user'?'suspendPlatformUser':'restorePlatformUser'; data={user_id:id}; break;
      case 'approve-business':
        path='/api/v1/admin/businesses/approve'; actionType='approveBusiness'; data={business_id:Number(item['business_id'] ?? item['id'])}; break;
      case 'reject-business':
        this.openDecisionDrawer('reject-business', item);
        return;
      case 'renew-subscription':
        path='/api/v1/subscriptions/renewal/request'; key='subscriptionParam'; actionType='requestSubscriptionRenewal';
        data={tenant_id:tenantId,subscription_id:id}; break;
      case 'approve-subscription': case 'reject-subscription':
        this.openDecisionDrawer(action, item);
        return;
      case 'edit-address':
        this.openAddressEditor(item);
        return;
      case 'default-address': case 'delete-address': {
        const remove = action==='delete-address';
        if (remove && !window.confirm('Delete this saved address?')) return;
        path=remove?'/api/v1/customers/addresses/delete':'/api/v1/customers/addresses/default'; key='customerParam'; actionType=remove?'deleteMyAddress':'setDefaultAddress'; data={address_id:Number(item['address_id'] ?? item['id'])}; break;
      }
      case 'edit-category':
        this.editCategory(item);
        return;
      case 'delete-category':
        if (!window.confirm('Soft-delete this category? Categories referenced by active businesses or products cannot be deleted.')) return;
        path='/api/v1/admin/categories/delete'; actionType='deleteCategory'; data={category_id:id}; break;
      case 'moderate':
        this.openDecisionDrawer('moderate', item);
        return;
      default: return;
    }
    this.busy.set(true); this.error.set('');
    try {
      const result = await this.request<DataRecord>(path,key,actionType,data);
      if (action === 'approve-subscription' && typeof result['bcn'] === 'string' && result['bcn'] !== '') {
        this.notice.set(`Subscription approved. BBG Contribution Number: ${result['bcn']}`);
      } else {
        this.notice.set('The requested action was completed.');
      }
      await this.load();
    }
    catch (error) { this.error.set(this.auth.errorMessage(error)); }
    finally { this.busy.set(false); }
  }

  addMediaToPromotion(item: DataRecord): void {
    this.draftPromotionId.set(this.recordId(item, 'id'));
    this.promotionUploadedCount.set(this.mediaOf(item).length);
    this.promotionTitle.set(String(item['post_title'] ?? ''));
    this.promotionContent.set(String(item['post_content'] ?? ''));
    this.promotionValidUntil.set(String(item['valid_until'] ?? '').replace(' ', 'T').slice(0,16));
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
      await this.request('/api/v1/promotions/media/delete','promotionParam','deletePromotionMedia',{
        tenant_id:tenantId,promotion_id:promotionId,media_id:mediaId,
      });
      this.notice.set('Post attachment removed.');
      await this.load();
    } catch (error) { this.error.set(this.auth.errorMessage(error)); }
    finally { this.busy.set(false); }
  }

  async createPromotion(): Promise<void> {
    this.draftPromotionId.set(null);
    this.promotionUploadedCount.set(0);
    this.promotionTitle.set('');
    this.promotionContent.set('');
    this.promotionValidUntil.set('');
    this.clearPromotionPreviews();
    this.promotionFiles.set([]);
    this.promotionError.set('');
    this.showPromotionComposer.set(true);
  }

  closePromotionComposer(): void {
    if (this.promotionMediaBusy()) return;
    this.showPromotionComposer.set(false);
    this.draftPromotionId.set(null);
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

  allowPromotionMediaDrop(event: DragEvent): void { event.preventDefault(); }

  dropPromotionMedia(event: DragEvent): void {
    event.preventDefault();
    this.addPromotionMedia(Array.from(event.dataTransfer?.files ?? []));
  }

  private addPromotionMedia(files: File[]): void {
    const allowed = new Set(['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','audio/mpeg','audio/wav','audio/ogg','application/pdf','text/plain','text/csv','application/rtf']);
    const invalid = files.find((file) => !allowed.has(file.type) || file.size < 1 || file.size > 100 * 1024 * 1024);
    if (invalid) this.promotionError.set(`"${invalid.name}" is not supported or exceeds the 100 MB per-file limit.`);
    else {
      this.promotionError.set('');
      for (const file of files) {
        if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
          this.promotionMediaPreviews.update((current) => new Map(current).set(file, URL.createObjectURL(file)));
        }
      }
      this.promotionFiles.update((current) => [...current, ...files]);
    }
  }

  removePromotionMedia(index: number): void {
    const file = this.promotionFiles()[index];
    const preview = file ? this.promotionMediaPreviews().get(file) : undefined;
    if (preview) URL.revokeObjectURL(preview);
    if (file) this.promotionMediaPreviews.update((current) => {
      const next = new Map(current);
      next.delete(file);
      return next;
    });
    this.promotionFiles.update((files) => files.filter((_, position) => position !== index));
  }

  async submitPromotion(): Promise<void> {
    const tenantId = this.workspace.activeTenantId();
    if (!tenantId || !this.promotionContent().trim() || this.promotionMediaBusy()) return;
    this.promotionMediaBusy.set(true);
    this.promotionError.set('');
    try {
      let promotionId = this.draftPromotionId();
      if (!promotionId) {
        const result = await this.request<{id:number}>('/api/v1/promotions/create','promotionParam','createPromotion',{
          tenant_id:tenantId,post_title:this.promotionTitle().trim(),post_content:this.promotionContent().trim(),
          ...(this.promotionValidUntil() ? {valid_until:this.promotionValidUntil().replace('T',' ') + (this.promotionValidUntil().length === 16 ? ':00' : '')} : {}),
        });
        promotionId = Number(result.id);
        if (!promotionId) throw new Error('The draft was created but its identifier was not returned.');
        this.draftPromotionId.set(promotionId);
      } else {
        await this.request('/api/v1/promotions/update','promotionParam','updatePromotion',{
          tenant_id:tenantId,promotion_id:promotionId,post_title:this.promotionTitle().trim(),
          post_content:this.promotionContent().trim(),
          ...(this.promotionValidUntil() ? {valid_until:this.promotionValidUntil().replace('T',' ') + (this.promotionValidUntil().length === 16 ? ':00' : '')} : {}),
        });
      }
      const files = this.promotionFiles();
      for (let index = 0; index < files.length; index++) {
        const file = files[index];
        const upload = await this.request<{upload_url:string;object_key:string;headers:Record<string,string>}>(
          '/api/v1/promotions/media/upload-url','promotionParam','generatePromotionMediaUploadUrl',{
            tenant_id:tenantId,promotion_id:promotionId,original_file_name:file.name,mime_type:file.type,file_size_bytes:file.size,
          },
        );
        this.promotionUploadProgress.set(0);
        await lastValueFrom(this.http.put(upload.upload_url,file,{
          headers:new HttpHeaders(upload.headers ?? {'Content-Type':file.type}),
          observe:'events',reportProgress:true,responseType:'text',
        }).pipe(
          tap((event) => {
            if (event.type === HttpEventType.UploadProgress && event.total) {
              this.promotionUploadProgress.set(Math.round((event.loaded / event.total) * 100));
            }
          }),
          filter((event) => event.type === HttpEventType.Response),
        ));
        const mediaType = file.type.startsWith('image/') ? 'IMAGE' : file.type.startsWith('video/') ? 'VIDEO'
          : file.type.startsWith('audio/') ? 'AUDIO' : 'DOCUMENT';
        await this.request('/api/v1/promotions/media/link','promotionParam','linkPromotionMedia',{
          tenant_id:tenantId,promotion_id:promotionId,file_path:upload.object_key,mime_type:file.type,
          file_size_bytes:file.size,display_order:index,media_type:mediaType,
        });
        this.promotionFiles.update((remaining) => remaining.filter((candidate) => candidate !== file));
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
    return Array.isArray(media) ? media as DataRecord[] : [];
  }
  mediaLabel(mime: string): string {
    return mime.startsWith('image/') ? 'IMAGE' : mime.startsWith('video/') ? 'VIDEO' : mime.startsWith('audio/') ? 'AUDIO' : mime === 'application/pdf' ? 'PDF' : 'DOC';
  }
  fileSize(bytes: number): string {
    return bytes < 1024 * 1024 ? `${Math.max(1,Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  openPasswordForm(): void {
    this.currentPassword.set(''); this.newPassword.set(''); this.confirmPassword.set('');
    this.passwordError.set(''); this.showPasswordForm.set(true);
  }

  openPaymentQrDrawer(): void {
    if (!this.can('subscription.update')) return;
    this.error.set('');
    this.showPaymentQrDrawer.set(true);
  }

  closePasswordForm(): void {
    this.showPasswordForm.set(false); this.passwordError.set('');
    this.currentPassword.set(''); this.newPassword.set(''); this.confirmPassword.set('');
  }

  async updatePassword(): Promise<void> {
    if (this.busy()) return;
    const newPassword = this.newPassword();
    if (newPassword.length < 8) { this.passwordError.set('Use at least 8 characters for your new password.'); return; }
    if (newPassword !== this.confirmPassword()) { this.passwordError.set('The new password and confirmation do not match.'); return; }
    if (this.summary()?.['has_password'] && !this.currentPassword()) { this.passwordError.set('Enter your current password.'); return; }
    this.busy.set(true); this.passwordError.set(''); this.error.set('');
    try {
      await this.request('/api/v1/auth/password/update','authParam','setPassword',{
        ...(this.summary()?.['has_password'] ? {current_password:this.currentPassword()} : {}),
        new_password:newPassword,
      });
      this.summary.update((profile) => profile ? {...profile,has_password:true} : profile);
      this.notice.set('Your password has been saved successfully.');
      this.closePasswordForm();
    } catch (error) {
      this.passwordError.set(this.auth.errorMessage(error));
    } finally { this.busy.set(false); }
  }

  editPersonalProfile(): void {
    const current = this.summary();
    if (!current || this.busy() || !this.can('user.update')) return;
    this.personalProfileForm.set({
      full_name: String(current['full_name'] ?? ''),
      email: String(current['email'] ?? ''),
      mobile: String(current['mobile'] ?? ''),
    });
    this.error.set('');
    this.showPersonalProfileDrawer.set(true);
  }

  updatePersonalProfileField(field: keyof PersonalProfileForm, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.personalProfileForm.update((form) => ({ ...form, [field]: value }));
  }

  async savePersonalProfile(): Promise<void> {
    const form = this.personalProfileForm();
    if (!form.full_name.trim()) { this.error.set('Full name is required.'); return; }
    const saved = await this.performAction('/api/v1/auth/profile/update', 'authParam', 'updateProfile', {
      full_name: form.full_name.trim(), email: form.email.trim(), mobile: form.mobile.trim(),
    });
    if (saved) this.showPersonalProfileDrawer.set(false);
  }

  createAddress(): void {
    if (!this.can('user.update')) return;
    this.addressEditingId.set(null);
    this.addressForm.set({
      recipient_name: '', mobile: '', address_line_1: '', address_line_2: '', city: '', state: '',
      postal_code: '', country_code: 'IN', address_label: 'Home', is_default: false,
    });
    this.error.set('');
    this.showAddressDrawer.set(true);
  }

  openAddressEditor(item: DataRecord): void {
    const addressId = Number(item['address_id'] ?? item['id'] ?? 0);
    if (!addressId || !this.can('user.update')) return;
    this.addressEditingId.set(addressId);
    this.addressForm.set({
      recipient_name: String(item['recipient_name'] ?? ''), mobile: String(item['mobile'] ?? ''),
      address_line_1: String(item['address_line_1'] ?? ''), address_line_2: String(item['address_line_2'] ?? ''),
      city: String(item['city'] ?? ''), state: String(item['state'] ?? ''),
      postal_code: String(item['postal_code'] ?? ''), country_code: String(item['country_code'] ?? 'IN'),
      address_label: String(item['address_label'] ?? 'Home'), is_default: Number(item['is_default'] ?? 0) === 1,
    });
    this.error.set('');
    this.showAddressDrawer.set(true);
  }

  updateAddressField(field: keyof AddressForm, event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    this.addressForm.update((form) => ({ ...form, [field]: value }) as AddressForm);
  }

  async saveAddress(): Promise<void> {
    const form = this.addressForm();
    if (!form.address_line_1.trim()) { this.error.set('Address line 1 is required.'); return; }
    const editingId = this.addressEditingId();
    const payload = {
      address_line_1: form.address_line_1.trim(), recipient_name: form.recipient_name.trim(),
      mobile: form.mobile.trim(), address_line_2: form.address_line_2.trim(), city: form.city.trim(),
      state: form.state.trim(), postal_code: form.postal_code.trim(),
      country_code: form.country_code.trim().toUpperCase(), address_label: form.address_label.trim(),
      ...(editingId !== null ? { address_id: editingId, is_default: form.is_default ? 1 : 0 } : {}),
    };
    const saved = editingId === null
      ? await this.performAction('/api/v1/customers/addresses/create', 'customerParam', 'createMyAddress', payload)
      : await this.performAction('/api/v1/customers/addresses/update', 'customerParam', 'updateMyAddress', payload);
    if (saved) this.showAddressDrawer.set(false);
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
      if (!reason) { this.error.set('A rejection reason is required.'); return; }
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
      if (!reason) { this.error.set('A rejection reason is required.'); return; }
      path = '/api/v1/admin/subscriptions/reject';
      actionType = 'rejectSubscription';
      data = { subscription_id: Number(item['subscription_id'] ?? item['id']), reason };
    } else {
      const contentType = String(item['content_type'] ?? '').toUpperCase();
      const moderationAction = this.moderationAction();
      if (!reason) { this.error.set('A reason for this moderation decision is required.'); return; }
      if (!['UNPUBLISH_POST', 'UNPUBLISH_PRODUCT', 'DISMISS_REPORT'].includes(moderationAction)) {
        this.error.set('Choose a valid moderation action.');
        return;
      }
      if ((moderationAction === 'UNPUBLISH_POST' && contentType !== 'POST')
        || (moderationAction === 'UNPUBLISH_PRODUCT' && contentType !== 'PRODUCT')) {
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
      this.notice.set(kind === 'approve-subscription' && typeof result['bcn'] === 'string' && result['bcn']
        ? `Subscription approved. BBG Contribution Number: ${result['bcn']}`
        : 'The requested decision was completed.');
      this.showDecisionDrawer.set(false);
      await this.load();
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  createCategory(): void {
    if (!this.can('admin.create')) return;
    this.editingCategoryId.set(null);
    this.categoryForm.set({
      category_code: '', category_name: '', category_type: 'BUSINESS', description: '',
      parent_category_id: '', display_order: '0',
    });
    this.error.set('');
    this.showCategoryDrawer.set(true);
  }

  editCategory(item: DataRecord): void {
    if (!this.can('admin.update')) return;
    const categoryId = Number(item['category_id'] ?? item['id'] ?? 0);
    if (!categoryId) return;
    this.editingCategoryId.set(categoryId);
    this.categoryForm.set({
      category_code: String(item['category_code'] ?? ''),
      category_name: String(item['category_name'] ?? ''),
      category_type: String(item['category_type'] ?? 'BUSINESS').toUpperCase() === 'PRODUCT' ? 'PRODUCT' : 'BUSINESS',
      description: String(item['description'] ?? ''),
      parent_category_id: item['parent_category_id'] == null ? '' : String(item['parent_category_id']),
      display_order: String(item['display_order'] ?? 0),
    });
    this.error.set('');
    this.showCategoryDrawer.set(true);
  }

  updateCategoryField(field: keyof CategoryForm, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value;
    this.categoryForm.update((form) => ({ ...form, [field]: value }) as CategoryForm);
  }

  async saveCategory(): Promise<void> {
    const form = this.categoryForm();
    const categoryId = this.editingCategoryId();
    const parentId = form.parent_category_id.trim() ? Number(form.parent_category_id) : null;
    const displayOrder = Number(form.display_order);
    if (!form.category_code.trim() || !form.category_name.trim()) {
      this.error.set('Category code and name are required.');
      return;
    }
    if ((parentId !== null && (!Number.isInteger(parentId) || parentId < 1 || parentId === categoryId))
      || !Number.isInteger(displayOrder) || displayOrder < 0) {
      this.error.set('Enter a valid parent category ID and a non-negative display order.');
      return;
    }
    const payload = {
      category_code: form.category_code.trim().toUpperCase(),
      category_name: form.category_name.trim(),
      category_type: form.category_type,
      description: form.description.trim(),
      parent_category_id: parentId,
      display_order: displayOrder,
    };
    const saved = categoryId === null
      ? await this.performAction('/api/v1/admin/categories/create', 'adminParam', 'createCategory', payload)
      : await this.performAction('/api/v1/admin/categories/update', 'adminParam', 'updateCategory', {
        category_id: categoryId, ...payload,
      });
    if (saved) this.showCategoryDrawer.set(false);
  }

  async saveEnquiryReply(): Promise<void> {
    const tenantId = this.workspace.activeTenantId();
    const enquiryId = this.replyEnquiryId();
    const message = this.replyMessage().trim();
    if (!tenantId || !enquiryId || !message) {
      this.error.set('Enter a reply before submitting.');
      return;
    }
    const saved = await this.performAction('/api/v1/enquiries/tenant/respond', 'enquiryParam', 'respondToEnquiry', {
      tenant_id: tenantId, enquiry_id: enquiryId, message,
    });
    if (saved) {
      this.showReplyDrawer.set(false);
      this.replyEnquiryId.set(null);
      this.replyMessage.set('');
    }
  }

  private async performAction(path:string,key:EnvelopeKey,actionType:string,data:DataRecord):Promise<boolean> {
    if (this.busy()) return false;
    this.busy.set(true); this.error.set('');
    try { await this.request(path,key,actionType,data); this.notice.set('Changes saved successfully.'); await this.load(); return true; }
    catch(error) { this.error.set(this.auth.errorMessage(error)); return false; }
    finally { this.busy.set(false); }
  }

  hasBcn(item: DataRecord): boolean {
    return typeof item['bcn'] === 'string'
      && item['bcn'] !== ''
      && ['ACTIVE', 'EXPIRED', 'APPROVED'].includes(this.statusOf(item).toUpperCase());
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
    return detail && typeof detail === 'object' && !Array.isArray(detail) ? detail as DataRecord : null;
  }

  subscriptionReviewProofs(): DataRecord[] {
    const proofs = this.subscriptionReview()?.['proofs'];
    return Array.isArray(proofs) ? proofs as DataRecord[] : [];
  }

  subscriptionReviewHistory(): DataRecord[] {
    const history = this.subscriptionReview()?.['review_history'];
    return Array.isArray(history) ? history as DataRecord[] : [];
  }

  async loadModerationHistory(): Promise<void> {
    if (this.moderationHistoryLoading()) return;
    this.moderationHistoryLoading.set(true);
    this.error.set('');
    try {
      const data = await this.request<{items?: DataRecord[]}>(
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
    const subscriptionId = this.recordId(item,'subscription_id');
    if (!subscriptionId || this.busy()) return;
    this.busy.set(true); this.error.set('');
    try {
      const detail = await this.request<DataRecord>(
        '/api/v1/admin/subscriptions/detail','adminParam','getSubscriptionForReview',{subscription_id:subscriptionId},
      );
      this.subscriptionReview.set(detail);
    } catch(error) {
      this.error.set(this.auth.errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  setPaymentQrFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (file && (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size < 1 || file.size > 10 * 1024 * 1024)) {
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
    this.busy.set(true); this.error.set('');
    try {
      const upload = await this.request<{upload_url:string;object_key:string;headers:Record<string,string>}>(
        '/api/v1/admin/subscriptions/payment-qr/upload-url','adminParam','generatePaymentQrUploadUrl',{
          original_file_name:file.name,mime_type:file.type,file_size_bytes:file.size,
        },
      );
      await firstValueFrom(this.http.put(upload.upload_url,file,{
        headers:new HttpHeaders(upload.headers ?? {'Content-Type':file.type}),responseType:'text',
      }));
      await this.request('/api/v1/admin/subscriptions/payment-qr/save','adminParam','savePaymentQrConfig',{
        payee_name:this.qrPayeeName().trim(),upi_id:this.qrUpiId().trim(),
        payment_instructions:this.qrInstructions().trim(),qr_file_path:upload.object_key,
      });
      this.notice.set('A new payment QR configuration is active for new subscription requests.');
      this.clearPaymentQrPreview();
      await this.load();
      this.showPaymentQrDrawer.set(false);
    } catch(error) {
      this.error.set(this.auth.errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  prepareProofUpload(event: Event, subscription: DataRecord): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg','image/png','image/webp','application/pdf'];
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
      const upload = await this.request<{upload_url:string;object_key:string;method:string;headers:Record<string,string>}>(
        '/api/v1/subscriptions/proofs/upload-url','subscriptionParam','generateSubscriptionProofUploadUrl',{
          tenant_id:tenantId,subscription_id:subscriptionId,original_file_name:file.name,mime_type:file.type,file_size_bytes:file.size,
        },
      );
      await firstValueFrom(this.http.put(upload.upload_url,file,{
        headers:new HttpHeaders(upload.headers ?? {'Content-Type':file.type}),responseType:'text',
      }));
      this.proofDrafts.update((drafts) => ({...drafts,[subscriptionId]:{
        objectKey:upload.object_key,paymentReference:this.proofPaymentReference().trim(),fileName:file.name,
      }}));
      this.notice.set('Receipt uploaded. Select “Submit for Review” when you are ready to send it to the BBG team.');
      this.showProofDrawer.set(false);
      this.proofFile.set(null);
      this.proofSubscription.set(null);
      this.proofPaymentReference.set('');
    } catch(error) {
      this.error.set(this.auth.errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }


  async submitProof(subscription: DataRecord): Promise<void> {
    const subscriptionId = this.recordId(subscription,'subscription_id');
    const tenantId = this.workspace.activeTenantId();
    const draft = this.proofDrafts()[subscriptionId];
    if (!subscriptionId || !tenantId || !draft || this.busy()) return;
    this.busy.set(true); this.error.set('');
    try {
      await this.request('/api/v1/subscriptions/proofs/submit','subscriptionParam','submitSubscriptionProof',{
        tenant_id:tenantId,subscription_id:subscriptionId,proof_file_path:draft.objectKey,
        ...(draft.paymentReference ? {payment_reference:draft.paymentReference} : {}),
      });
      this.proofDrafts.update((drafts) => {
        const next = {...drafts};
        delete next[subscriptionId];
        return next;
      });
      this.notice.set('Payment proof submitted for review.');
      await this.load();
    } catch(error) {
      this.error.set(this.auth.errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  async requestPlan(plan: DataRecord): Promise<void> {
    const planId=this.recordId(plan,'plan_id'); if (!planId || this.busy()) return;
    this.pendingPlanId.set(planId); this.busy.set(true); this.error.set('');
    try {
      await this.request('/api/v1/subscriptions/request','subscriptionParam','requestSubscription',{tenant_id:this.workspace.activeTenantId(),plan_id:planId});
      this.notice.set('Your subscription request has been submitted.'); await this.load();
    } catch(error) { this.error.set(this.auth.errorMessage(error)); }
    finally { this.pendingPlanId.set(null); this.busy.set(false); }
  }

  humanize(value: string): string { return value.replace(/_/g,' ').toLowerCase().replace(/\b\w/g,(letter)=>letter.toUpperCase()); }
  inputValue(event: Event): string {
    return (event.target as HTMLInputElement | HTMLTextAreaElement).value;
  }
  asUrl(value: unknown): string {
    return typeof value === 'string' ? value : String(value ?? '');
  }
  formatValue(value: unknown): string {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'string' && /^\d{4}-\d\d-\d\d/.test(value)) return new Date(value).toLocaleString();
    return String(value);
  }
  statusClass(status: string): string {
    const value=status.toUpperCase();
    if (['ACTIVE','APPROVED','PUBLISHED','CONFIRMED','RESPONDED','PAID','RESOLVED'].includes(value)) return 'status-chip good';
    if (['PENDING','DRAFT','PROCESSING','OPEN'].includes(value)) return 'status-chip warn';
    if (['REJECTED','CANCELLED','SUSPENDED','FAILED','DISMISSED'].includes(value)) return 'status-chip bad';
    return 'status-chip';
  }
}
