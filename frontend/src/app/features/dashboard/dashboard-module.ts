import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api-base-url';
import { AuthService } from '../../core/auth/auth.service';
import { WorkspaceContextService } from '../../core/workspace/workspace-context.service';

type EnvelopeKey = 'businessParam' | 'customerParam' | 'orderParam' | 'enquiryParam' | 'paymentParam' | 'promotionParam' | 'subscriptionParam' | 'adminParam' | 'tenantParam' | 'dashboardParam';
interface ApiEnvelope<T = unknown> { status: 'SUCCESS' | 'FAILED' | 'EXCEPTION'; msgArr?: string[]; data?: T | []; }
interface DataRecord { [key: string]: unknown; }

@Component({
  selector: 'app-dashboard-module',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="module-page">
      <header class="page-heading">
        <div>
          <a class="back-link" routerLink="/dashboard">← Workspace dashboard</a>
          <p class="eyebrow">{{ contextLabel() }}</p>
          <h1>{{ title() }}</h1>
          <p class="intro">{{ description() }}</p>
        </div>
        <button class="refresh" type="button" (click)="load()" [disabled]="loading()">↻ Refresh</button>
      </header>

      <nav class="section-nav" aria-label="Dashboard sections">
        @for (link of navLinks(); track link.path) {
          <a [routerLink]="link.path" [class.active]="section() === link.key">{{ link.label }}</a>
        }
      </nav>

      @if (notice()) {
        <div class="notice" role="status">{{ notice() }}</div>
      }
      @if (loading()) {
        <section class="state-panel" role="status"><span class="spinner"></span><div><strong>Loading {{ title().toLowerCase() }}</strong><p>Retrieving the latest information from BBG.</p></div></section>
      } @else if (error()) {
        <section class="state-panel error" role="alert"><strong>We couldn’t load this section.</strong><p>{{ error() }}</p><button type="button" (click)="load()">Try again</button></section>
      } @else if (unsupported()) {
        <section class="state-panel"><span class="state-icon">ⓘ</span><strong>{{ unsupportedTitle() }}</strong><p>{{ unsupported() }}</p></section>
      } @else {
        @if (summaryEntries().length) {
          <section class="summary-grid" aria-label="Summary">
            @for (entry of summaryEntries(); track entry.key) {
              <article class="summary-card"><span>{{ humanize(entry.key) }}</span><strong>{{ formatValue(entry.value) }}</strong></article>
            }
          </section>
        }

        @if (section() === 'subscriptions' && plans().length) {
          <section class="plans-section">
            <div class="section-title"><div><p class="eyebrow">AVAILABLE PLANS</p><h2>Choose a business plan</h2></div></div>
            <div class="plans-grid">
              @for (plan of plans(); track recordId(plan, 'plan_id')) {
                <article class="plan-card">
                  <h3>{{ valueOf(plan, ['plan_name', 'name', 'plan_code']) }}</h3>
                  <strong class="plan-price">{{ valueOf(plan, ['price', 'amount']) }} {{ valueOf(plan, ['currency']) }}</strong>
                  <p>{{ valueOf(plan, ['description', 'plan_description']) }}</p>
                  <button type="button" (click)="requestPlan(plan)" [disabled]="busy()">{{ pendingPlanId() === recordId(plan, 'plan_id') ? 'Requesting…' : 'Request this plan' }}</button>
                </article>
              }
            </div>
          </section>
        }

        @if (items().length) {
          <section class="records-section">
            <div class="section-title">
              <div><p class="eyebrow">LIVE RECORDS</p><h2>{{ recordsHeading() }}</h2></div>
              <span class="record-count">{{ items().length }} shown</span>
            </div>
            <div class="records-list">
              @for (item of items(); track recordId(item, 'id')) {
                <article class="record-card">
                  <div class="record-head">
                    <div><strong>{{ recordTitle(item) }}</strong><span>{{ recordSubtitle(item) }}</span></div>
                    @if (statusOf(item)) { <span class="status-chip" [class]="statusClass(statusOf(item))">{{ humanize(statusOf(item)) }}</span> }
                  </div>
                  <div class="record-fields">
                    @for (entry of recordEntries(item); track entry.key) {
                      <div><span>{{ humanize(entry.key) }}</span><strong>{{ formatValue(entry.value) }}</strong></div>
                    }
                  </div>
                  @if (actionsFor(item).length) {
                    <div class="record-actions">
                      @for (action of actionsFor(item); track action.key) {
                        <button type="button" [class.danger]="action.danger" (click)="runAction(action.key, item)" [disabled]="busy()">{{ action.label }}</button>
                      }
                    </div>
                  }
                </article>
              }
            </div>
          </section>
        } @else if (!summaryEntries().length && !(section() === 'subscriptions' && plans().length)) {
          <section class="state-panel empty"><span class="state-icon">⌑</span><strong>Nothing to show yet</strong><p>There are no records available for this section in the current workspace.</p></section>
        }
      }
    </main>
  `,
  styles: [`
    :host{display:block;min-height:100%;background:var(--surface-page);color:var(--text-primary)}
    .module-page{width:min(1320px,100%);margin:0 auto;padding:42px 32px 76px}
    .page-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:25px}
    .back-link{display:inline-block;margin-bottom:20px;color:var(--text-secondary);font-size:.78rem;font-weight:700;text-decoration:none}
    .back-link:hover{color:var(--brand)}.eyebrow{margin:0 0 8px;color:var(--brand);font-size:.67rem;font-weight:850;letter-spacing:.14em}
    h1{margin:0;font-size:clamp(2rem,4vw,2.8rem);letter-spacing:-.05em;line-height:1.12}.intro{max-width:700px;margin:10px 0 0;color:var(--text-secondary);font-size:.9rem;line-height:1.6}
    .refresh,.record-actions button,.state-panel button{min-height:40px;padding:0 14px;color:var(--text-primary);background:var(--surface-card);border:1px solid var(--border);border-radius:9px;font:inherit;font-size:.76rem;font-weight:750;cursor:pointer}
    .refresh:disabled,.record-actions button:disabled{opacity:.55;cursor:wait}
    .section-nav{display:flex;gap:7px;overflow:auto;padding:4px 0 17px;margin-bottom:22px;border-bottom:1px solid var(--border)}
    .section-nav a{flex:0 0 auto;padding:9px 12px;color:var(--text-secondary);border-radius:8px;font-size:.75rem;font-weight:750;text-decoration:none}
    .section-nav a.active{color:var(--brand);background:var(--brand-soft)}
    .notice{margin:0 0 16px;padding:12px 15px;color:var(--text-secondary);background:var(--surface-subtle);border:1px solid var(--border);border-radius:10px;font-size:.8rem}
    .state-panel{display:flex;align-items:center;justify-content:center;gap:14px;min-height:170px;padding:28px;background:var(--surface-card);border:1px solid var(--border);border-radius:14px}
    .state-panel>div{display:grid;gap:4px}.state-panel p{max-width:560px;margin:5px 0 0;color:var(--text-secondary);font-size:.8rem;line-height:1.6}.state-panel.error{display:block;text-align:center;border-color:#d88a83}.state-panel.error button{margin-top:14px}
    .spinner{width:24px;height:24px;border:3px solid var(--border);border-top-color:var(--brand);border-radius:50%;animation:spin .8s linear infinite}
    .state-icon{display:grid;width:42px;height:42px;place-items:center;color:var(--brand);background:var(--brand-soft);border-radius:12px;font-size:1.35rem}
    .summary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:26px}
    .summary-card{display:grid;gap:7px;padding:17px;background:var(--surface-card);border:1px solid var(--border);border-radius:12px}
    .summary-card span,.record-fields span{color:var(--text-secondary);font-size:.68rem;font-weight:700}.summary-card strong{font-size:1.45rem;letter-spacing:-.04em}
    .section-title{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin:30px 0 15px}.section-title .eyebrow{margin-bottom:5px}.section-title h2{margin:0;font-size:1.25rem;letter-spacing:-.03em}
    .record-count{padding:7px 10px;color:var(--text-secondary);background:var(--surface-subtle);border:1px solid var(--border);border-radius:8px;font-size:.7rem;font-weight:750}
    .records-list{display:grid;gap:12px}.record-card{padding:18px 20px;background:var(--surface-card);border:1px solid var(--border);border-radius:13px}
    .record-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.record-head>div{display:grid;gap:5px}.record-head>div strong{font-size:.93rem}.record-head>div span{color:var(--text-secondary);font-size:.72rem}
    .status-chip{flex:0 0 auto;padding:6px 9px;color:var(--text-secondary);background:var(--surface-subtle);border-radius:7px;font-size:.65rem;font-weight:800}
    .status-chip.good{color:#168253;background:#e9f7ef}.status-chip.warn{color:#98691a;background:#fff5df}.status-chip.bad{color:#b34840;background:#fff0ee}
    .record-fields{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:13px;margin-top:16px;padding-top:14px;border-top:1px solid var(--border)}
    .record-fields>div{display:grid;gap:5px;min-width:0}.record-fields strong{overflow-wrap:anywhere;font-size:.76rem;font-weight:700}
    .record-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:15px}.record-actions button{min-height:34px;color:var(--brand);border-color:color-mix(in srgb,var(--brand) 25%,var(--border))}.record-actions button.danger{color:#b34840;border-color:#e7c1bd}
    .plans-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:13px}.plan-card{padding:20px;background:var(--surface-card);border:1px solid var(--border);border-radius:13px}.plan-card h3{margin:0 0 10px;font-size:1rem}.plan-price{font-size:1.35rem;letter-spacing:-.04em}.plan-card p{min-height:38px;color:var(--text-secondary);font-size:.76rem;line-height:1.55}.plan-card button{width:100%;min-height:38px;color:white;background:var(--brand);border:0;border-radius:8px;font-size:.75rem;font-weight:800;cursor:pointer}
    .empty{flex-direction:column;text-align:center}.empty p{max-width:480px}
    @keyframes spin{to{transform:rotate(360deg)}}
    @media(max-width:900px){.summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.record-fields{grid-template-columns:repeat(2,minmax(0,1fr))}.plans-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:600px){.module-page{padding:28px 16px 54px}.page-heading{align-items:flex-start;flex-direction:column}.refresh{width:100%}.summary-grid{gap:8px}.summary-card{padding:13px}.summary-card strong{font-size:1.2rem}.record-card{padding:15px}.record-fields{grid-template-columns:1fr 1fr;gap:11px}.plans-grid{grid-template-columns:1fr}.section-title{align-items:flex-start}}
  `],
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
  readonly error = signal('');
  readonly notice = signal('');
  readonly unsupported = signal('');
  readonly unsupportedTitle = signal('This section is not available');
  readonly items = signal<DataRecord[]>([]);
  readonly summary = signal<DataRecord | null>(null);
  readonly plans = signal<DataRecord[]>([]);
  readonly pendingPlanId = signal<number | null>(null);

  readonly title = computed(() => this.config[this.section()]?.title ?? 'Workspace');
  readonly description = computed(() => this.config[this.section()]?.description ?? 'Manage your BBG workspace.');
  readonly contextLabel = computed(() => this.workspace.activeTenantId() === null ? 'PERSONAL & PLATFORM' : 'BUSINESS WORKSPACE');
  readonly summaryEntries = computed(() => this.summary() ? Object.entries(this.summary()!).filter(([key, value]) => value !== null && typeof value !== 'object').map(([key, value]) => ({ key, value })) : []);
  readonly navLinks = computed(() => {
    const links = [
      { key: 'profile', label: 'Business profile', path: '/dashboard/profile' },
      { key: 'storefront', label: 'Storefront', path: '/dashboard/storefront' },
      { key: 'catalogue', label: 'Catalogue', path: '/dashboard/catalogue' },
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
      { key: 'moderation', label: 'Moderation', path: '/dashboard/moderation' },
      { key: 'system-health', label: 'System health', path: '/dashboard/system-health' },
    ];
    const permissions = new Set(this.workspace.permissions().map((entry) => entry.permission_code));
    const activeTenant = this.workspace.activeTenantId() !== null;
    return links.filter((link) => {
      if (link.key === 'profile' || link.key === 'storefront' || link.key === 'catalogue' || link.key === 'customers' || link.key === 'enquiries' || link.key === 'orders' || link.key === 'promotions' || link.key === 'subscriptions' || link.key === 'payments' || link.key === 'analytics') return activeTenant || ['orders','customers','enquiries','payments'].includes(link.key);
      if (link.key === 'platform-users') return permissions.has('PLATFORM_USERS_MANAGE');
      if (link.key === 'business-approval') return permissions.has('BUSINESS_APPROVE');
      if (link.key === 'subscription-approval') return permissions.has('SUBSCRIPTIONS_APPROVE');
      if (link.key === 'moderation') return permissions.has('MODERATION_MANAGE');
      return permissions.has('SYSTEM_HEALTH_VIEW');
    });
  });

  private readonly config: Record<string, { title: string; description: string }> = {
    profile: { title: 'Business profile', description: 'Review your approved business information and account details.' },
    storefront: { title: 'Storefront', description: 'Review the public storefront information and publication status for this business.' },
    customers: { title: 'Customers & profile', description: 'Review your customer profile and saved delivery addresses.' },
    enquiries: { title: 'Enquiries', description: 'Review incoming business enquiries or your conversations with businesses.' },
    orders: { title: 'Orders', description: 'Track customer orders or process orders received by your business.' },
    promotions: { title: 'Promotions', description: 'Review campaigns and publish or pause eligible promotions.' },
    subscriptions: { title: 'Subscriptions & plans', description: 'Review available plans and the subscription history for this business.' },
    payments: { title: 'Payments', description: 'Review payment records associated with your account or business.' },
    analytics: { title: 'Analytics', description: 'Review the summary metrics available in your current workspace.' },
    members: { title: 'Team & access', description: 'Review the members assigned to this business workspace.' },
    'platform-analytics': { title: 'Platform analytics', description: 'Review platform-wide metrics exposed to authorized administrators.' },
    'platform-users': { title: 'Platform users', description: 'Review platform accounts and suspend or restore eligible users.' },
    'business-approval': { title: 'Business approvals', description: 'Review pending business applications and process approval decisions.' },
    'subscription-approval': { title: 'Subscription approvals', description: 'Review pending subscription requests and process decisions.' },
    moderation: { title: 'Marketplace moderation', description: 'Review reported marketplace content and record moderation decisions.' },
    'system-health': { title: 'System health', description: 'Review safe operational health information exposed to platform staff.' },
  };

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.section.set(params.get('section') ?? 'profile');
      void this.load();
    });
  }

  private get headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.accessToken() ?? ''}` });
  }

  private async request<T = unknown>(path: string, key: EnvelopeKey, actionType: string, actionData: DataRecord = {}): Promise<T> {
    const response = await firstValueFrom(this.http.post<ApiEnvelope<T>>(`${this.apiBaseUrl}${path}`, {
      [key]: { actionType, actionData },
    }, { headers: this.headers }));
    if (response.status !== 'SUCCESS') throw new Error(response.msgArr?.join(' ') || 'The request could not be completed.');
    return response.data as T;
  }

  async load(): Promise<void> {
    this.loading.set(true); this.error.set(''); this.unsupported.set(''); this.notice.set('');
    this.items.set([]); this.summary.set(null); this.plans.set([]);
    try {
      await this.workspace.initialize();
      const tenantId = this.workspace.activeTenantId();
      const pageData = { page: 1, page_size: 25, ...(tenantId ? { tenant_id: tenantId } : {}) };
      switch (this.section()) {
        case 'members': {
          if (!tenantId) return this.setUnsupported('Select a business workspace to view its team members.');
          const data = await this.request<{items?:DataRecord[]}>('/api/v1/tenants/members/list','tenantParam','listTenantMembers',pageData);
          this.items.set(data.items ?? []); break;
        }
        case 'profile':
          if (!tenantId) return this.setUnsupported('Select a business workspace to view its business profile.');
          this.summary.set(await this.request<DataRecord>('/api/v1/business/profile/get','businessParam','getMyBusinessProfile',{tenant_id:tenantId}));
          break;
        case 'storefront':
          if (!tenantId) return this.setUnsupported('Select a business workspace to view its storefront.');
          this.summary.set(await this.request<DataRecord>('/api/v1/business/storefront/get','businessParam','getMyStorefront',{tenant_id:tenantId}));
          break;
        case 'customers':
          if (tenantId) return this.setUnsupported('The current backend exposes customer profile and address endpoints for the signed-in consumer, but does not expose a tenant-wide customer directory. This page will not display fabricated customer records.');
          {
            const [profile, addresses] = await Promise.all([
              this.request<DataRecord>('/api/v1/customers/profile','customerParam','getMyCustomerProfile'),
              this.request<{items?:DataRecord[]}>('/api/v1/customers/addresses/list','customerParam','listMyAddresses'),
            ]);
            this.summary.set(profile); this.items.set(addresses.items ?? []);
          }
          break;
        case 'orders':
          if (tenantId) {
            const data = await this.request<{items?:DataRecord[]}>('/api/v1/orders/tenant/list','orderParam','listTenantOrders',pageData);
            this.items.set(data.items ?? []);
          } else {
            const data = await this.request<{items?:DataRecord[]}>('/api/v1/orders/list','orderParam','listMyOrders',pageData);
            this.items.set(data.items ?? []);
          }
          break;
        case 'enquiries':
          if (tenantId) {
            const data = await this.request<{items?:DataRecord[]}>('/api/v1/enquiries/tenant/list','enquiryParam','listTenantEnquiries',pageData);
            this.items.set(data.items ?? []);
          } else {
            const data = await this.request<{items?:DataRecord[]}>('/api/v1/enquiries/mine/list','enquiryParam','listMyEnquiries',{page:1,page_size:25});
            this.items.set(data.items ?? []);
          }
          break;
        case 'payments': {
          const data = tenantId
            ? await this.request<{items?:DataRecord[]}>('/api/v1/payments/tenant/list','paymentParam','listTenantPayments',pageData)
            : await this.request<{items?:DataRecord[]}>('/api/v1/payments/mine/list','paymentParam','listMyPayments',{page:1,page_size:25});
          this.items.set(data.items ?? []);
          break;
        }
        case 'promotions':
          if (!tenantId) return this.setUnsupported('Select a business workspace to manage promotions.');
          {
            const data = await this.request<{items?:DataRecord[]}>('/api/v1/promotions/mine/list','promotionParam','listMyPromotions',pageData);
            this.items.set(data.items ?? []);
          }
          break;
        case 'subscriptions':
          if (!tenantId) return this.setUnsupported('Select a business workspace to review plans and subscriptions.');
          {
            const [plans, subscriptions] = await Promise.all([
              this.request<{items?:DataRecord[]}>('/api/v1/subscriptions/plans/list','subscriptionParam','listActivePlans'),
              this.request<{items?:DataRecord[]}>('/api/v1/subscriptions/mine/list','subscriptionParam','listMySubscriptions',pageData),
            ]);
            this.plans.set(plans.items ?? []); this.items.set(subscriptions.items ?? []);
          }
          break;
        case 'analytics':
          if (tenantId) this.summary.set(await this.request<DataRecord>('/api/v1/dashboard/entrepreneur/summary','dashboardParam','getTenantSummary',{tenant_id:tenantId}));
          else return this.setUnsupported('Business analytics require an active business workspace.');
          break;
        case 'platform-analytics':
          this.summary.set(await this.request<DataRecord>('/api/v1/admin/analytics/summary','adminParam','getAdminAnalyticsSummary'));
          break;
        case 'platform-users': {
          const data = await this.request<{items?:DataRecord[]}>('/api/v1/admin/users/list','adminParam','listPlatformUsers',{page:1,page_size:25});
          this.items.set(data.items ?? []); break;
        }
        case 'business-approval': {
          const data = await this.request<{items?:DataRecord[]}>('/api/v1/admin/businesses/pending/list','adminParam','listPendingBusinesses',{page:1,page_size:25});
          this.items.set(data.items ?? []); break;
        }
        case 'subscription-approval': {
          const data = await this.request<{items?:DataRecord[]}>('/api/v1/admin/subscriptions/pending/list','adminParam','listPendingSubscriptions',{page:1,page_size:25});
          this.items.set(data.items ?? []); break;
        }
        case 'moderation': {
          const data = await this.request<{items?:DataRecord[]}>('/api/v1/admin/moderation/queue','adminParam','listModerationQueue',{page:1,page_size:25});
          this.items.set(data.items ?? []); break;
        }
        case 'system-health':
          this.summary.set(await this.request<DataRecord>('/api/v1/admin/health/summary','adminParam','getSafeSystemHealth'));
          break;
        default:
          this.setUnsupported('This dashboard section is not configured.');
      }
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  private setUnsupported(message: string): void { this.unsupported.set(message); this.unsupportedTitle.set('Not available in this workspace'); this.loading.set(false); }

  readonly recordsHeading = computed(() => this.section() === 'customers' ? 'Saved addresses' : this.title());
  recordId(item: DataRecord, preferred = 'id'): number {
    const value = item[preferred] ?? item.id ?? item.business_id ?? item.subscription_id ?? item.promotion_id ?? item.order_id ?? item.report_id ?? item.user_id;
    return Number(value ?? 0);
  }
  valueOf(item: DataRecord, keys: string[]): string { for (const key of keys) if (item[key] !== null && item[key] !== undefined && item[key] !== '') return this.formatValue(item[key]); return '—'; }
  recordTitle(item: DataRecord): string {
    return this.valueOf(item,['business_name','tenant_name','plan_name','post_title','order_number','enquiry_number','payment_reference','full_name','name','email','report_number','id']);
  }
  recordSubtitle(item: DataRecord): string {
    return this.valueOf(item,['email','business_category','customer_name','created_at','created_on','order_status','enquiry_status','subscription_status']);
  }
  statusOf(item: DataRecord): string { return String(item.approval_status ?? item.subscription_status ?? item.publication_status ?? item.order_status ?? item.enquiry_status ?? item.payment_status ?? item.report_status ?? item.account_status ?? item.status ?? ''); }
  recordEntries(item: DataRecord): Array<{key:string;value:unknown}> {
    const hidden = new Set(['id','tenant_id','user_id','business_id','subscription_id','promotion_id','order_id','report_id','created_by','updated_by','deleted_by','password_hash','access_token','refresh_token']);
    return Object.entries(item).filter(([key,value]) => !hidden.has(key) && value !== null && typeof value !== 'object').slice(0,8).map(([key,value])=>({key,value}));
  }
  actionsFor(item: DataRecord): Array<{key:string;label:string;danger?:boolean}> {
    const status = this.statusOf(item).toUpperCase();
    if (this.section()==='orders' && this.workspace.activeTenantId()!==null && !['CANCELLED','COMPLETED','DELIVERED'].includes(status)) return [{key:'confirm-order',label:'Confirm order'},{key:'cancel-order',label:'Cancel order',danger:true}];
    if (this.section()==='enquiries' && this.workspace.activeTenantId()!==null && status!=='CLOSED') return [{key:'reply-enquiry',label:'Reply'},{key:'close-enquiry',label:'Close enquiry',danger:true}];
    if (this.section()==='promotions') return status==='PUBLISHED' ? [{key:'unpublish-promotion',label:'Unpublish'}] : [{key:'publish-promotion',label:'Publish'}];
    if (this.section()==='platform-users') return status==='SUSPENDED' ? [{key:'restore-user',label:'Restore account'}] : [{key:'suspend-user',label:'Suspend account',danger:true}];
    if (this.section()==='business-approval' && status==='PENDING') return [{key:'approve-business',label:'Approve'},{key:'reject-business',label:'Reject',danger:true}];
    if (this.section()==='subscription-approval' && status==='PENDING') return [{key:'approve-subscription',label:'Approve'},{key:'reject-subscription',label:'Reject',danger:true}];
    if (this.section()==='moderation' && status==='OPEN') return [{key:'moderate',label:'Review report'}];
    return [];
  }

  async runAction(action: string, item: DataRecord): Promise<void> {
    if (this.busy()) return;
    const tenantId = this.workspace.activeTenantId();
    const id = this.recordId(item);
    let path = ''; let key: EnvelopeKey = 'adminParam'; let actionType = ''; let data: DataRecord = {};
    switch (action) {
      case 'confirm-order': case 'cancel-order':
        path = action==='confirm-order'?'/api/v1/orders/tenant/confirm':'/api/v1/orders/tenant/cancel'; key='orderParam'; actionType='changeTenantOrderStatus'; data={tenant_id:tenantId,order_id:id}; break;
      case 'reply-enquiry': {
        const message = window.prompt('Write your reply to this enquiry:'); if (!message?.trim()) return;
        path='/api/v1/enquiries/tenant/respond'; key='enquiryParam'; actionType='respondToEnquiry'; data={tenant_id:tenantId,enquiry_id:id,message:message.trim()}; break;
      }
      case 'close-enquiry':
        if (!window.confirm('Close this enquiry?')) return;
        path='/api/v1/enquiries/tenant/close'; key='enquiryParam'; actionType='closeEnquiry'; data={tenant_id:tenantId,enquiry_id:id}; break;
      case 'publish-promotion': case 'unpublish-promotion':
        path=action==='publish-promotion'?'/api/v1/promotions/publish':'/api/v1/promotions/unpublish'; key='promotionParam'; actionType=action==='publish-promotion'?'publishPromotion':'unpublishPromotion'; data={tenant_id:tenantId,promotion_id:id}; break;
      case 'suspend-user': case 'restore-user':
        path=action==='suspend-user'?'/api/v1/admin/users/suspend':'/api/v1/admin/users/restore'; actionType=action==='suspend-user'?'suspendPlatformUser':'restorePlatformUser'; data={user_id:id}; break;
      case 'approve-business': case 'reject-business': {
        const reason = action==='reject-business' ? window.prompt('Reason for rejecting this application:') : null;
        if (action==='reject-business' && !reason?.trim()) return;
        path=action==='approve-business'?'/api/v1/admin/businesses/approve':'/api/v1/admin/businesses/reject'; actionType=action==='approve-business'?'approveBusiness':'rejectBusiness'; data={business_id:Number(item.business_id ?? item.id),...(reason?{reason:reason.trim()}:{})}; break;
      }
      case 'approve-subscription': case 'reject-subscription': {
        const reason = action==='reject-subscription' ? window.prompt('Reason for rejecting this subscription:') : null;
        if (action==='reject-subscription' && !reason?.trim()) return;
        path=action==='approve-subscription'?'/api/v1/admin/subscriptions/approve':'/api/v1/admin/subscriptions/reject'; actionType=action==='approve-subscription'?'approveSubscription':'rejectSubscription'; data={subscription_id:Number(item.subscription_id ?? item.id),...(reason?{reason:reason.trim()}:{})}; break;
      }
      case 'moderate': {
        const contentType=String(item.content_type ?? '').toUpperCase();
        const actionTypeChoice=window.prompt('Enter UNPUBLISH_POST, UNPUBLISH_PRODUCT or DISMISS_REPORT:');
        if (!actionTypeChoice || !['UNPUBLISH_POST','UNPUBLISH_PRODUCT','DISMISS_REPORT'].includes(actionTypeChoice.toUpperCase())) return;
        const reason=window.prompt('Reason for this moderation decision:'); if(!reason?.trim()) return;
        path='/api/v1/admin/moderation/action'; actionType='applyModerationAction'; data={report_id:id,action_type:actionTypeChoice.toUpperCase(),reason:reason.trim()};
        if ((actionTypeChoice.toUpperCase()==='UNPUBLISH_POST' && contentType!=='POST') || (actionTypeChoice.toUpperCase()==='UNPUBLISH_PRODUCT' && contentType!=='PRODUCT')) { this.error.set('That moderation action does not match the reported content type.'); return; }
        break;
      }
      default: return;
    }
    this.busy.set(true); this.error.set('');
    try { await this.request(path,key,actionType,data); this.notice.set('The requested action was completed.'); await this.load(); }
    catch (error) { this.error.set(this.auth.errorMessage(error)); }
    finally { this.busy.set(false); }
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
