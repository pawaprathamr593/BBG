import { Component, OnInit, computed, effect, inject, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { DashboardApiService } from '../../core/dashboard/dashboard-api.service';
import { WorkspaceContextService } from '../../core/workspace/workspace-context.service';
import { BusinessRegistrationApiService } from '../../core/business/business-registration-api.service';


@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="workspace">
      <section class="workspace-heading">
        <div>
          <p class="heading-copy">Good {{ greeting() }}, {{ firstName() }}.</p>
          
        </div>
      </section>

      @if (loading()) {
        <section class="loading-panel" role="status"><span class="loader"></span><div><strong>Preparing your account</strong><p>Checking your roles and available permissions…</p></div></section>
      } @else if (error()) {
        <section class="message-panel error-panel" role="alert"><strong>We couldn’t load this area.</strong><p>{{ error() }}</p><button type="button" (click)="reload()">Try again</button></section>
      } @else {
        <section class="context-banner">
          <div class="context-symbol" aria-hidden="true">{{ selectedTenant() ? '⌂' : '◎' }}</div>
          <div class="context-copy">
            <span>{{ isPersonalContext() ? 'PERSONAL ACCOUNT' : isPlatformContext() ? 'PLATFORM ADMINISTRATION' : 'BUSINESS WORKSPACE' }}</span>
            <strong>{{ selectedTenant() ? 'Business Workspace' : isPlatformContext() ? 'BBG Platform' : 'My Account' }}</strong>
            <p>{{ isPersonalContext() ? 'Your personal orders, enquiries, payments and profile in one place.' : isPlatformContext() ? 'Manage BBG platform operations using your assigned administrator permissions.' : 'Manage your business operations using your assigned permissions.' }}</p>
          </div>
          @if (!isPersonalContext()) {
            <div class="role-list">
              @for (role of roleCodes(); track role) { <span class="role-chip">{{ roleLabel(role) }}</span> }
              @if (!roleCodes().length) { <span class="role-chip muted">No assigned roles in this context</span> }
            </div>
          }
        </section>

        @if (summaryLoading()) {
          <div class="summary-loading">Loading available activity…</div>
        } @else if (summaryError()) {
          <div class="summary-notice">{{ summaryError() }}</div>
        } @else if (summaryCards().length) {
          <section class="metrics-grid" aria-label="Account and business summary">
            @for (metric of summaryCards(); track metric.label) {
              <article class="metric-card">
                <span class="metric-icon">{{ metric.icon }}</span>
                <div><strong>{{ metric.value }}</strong><span>{{ metric.label }}</span></div>
              </article>
            }
          </section>
        }

        @if (isPersonalContext() && personalShortcuts().length) {
          <section class="personal-shortcuts">
            <div><p class="eyebrow">MY ACCOUNT</p><h2>Your activity</h2><p>View your customer activity and personal account details.</p></div>
            <div class="shortcut-grid">
              @for (shortcut of personalShortcuts(); track shortcut.route) {
                <a [routerLink]="shortcut.route"><span>{{ shortcut.icon }}</span><strong>{{ shortcut.title }}</strong><small>{{ shortcut.description }}</small></a>
              }
            </div>
          </section>
        }


      }
    </main>
  `,
  styles: [`
    :host{display:block;min-height:100%;background:var(--surface-page);color:var(--text-primary)}
    .workspace{width:100%;max-width:none;box-sizing:border-box;margin:0;padding:36px 32px 60px}
    .workspace-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:30px}
    .eyebrow{margin:0 0 10px;color:var(--brand);font-size:.69rem;font-weight:800;letter-spacing:.14em}
    h1{margin:0;font-size:clamp(2rem,4vw,3rem);line-height:1.12;letter-spacing:-.055em}
    .heading-copy{margin:12px 0 0;color:var(--text-secondary);font-size:.98rem}
    .heading-actions{display:flex;align-items:flex-end;gap:12px}
    .context-picker{display:grid;gap:6px;min-width:210px;color:var(--text-secondary);font-size:.72rem;font-weight:700}
    select{height:42px;padding:0 34px 0 12px;color:var(--text-primary);background:var(--surface-card);border:1px solid var(--border);border-radius:9px;font:inherit;font-size:.82rem}
    .market-link{display:inline-flex;height:42px;align-items:center;gap:10px;padding:0 15px;color:#fff;background:var(--brand);border-radius:9px;font-size:.8rem;font-weight:750;text-decoration:none;white-space:nowrap}
    .context-banner{display:flex;align-items:center;gap:18px;padding:22px 24px;background:var(--surface-card);border:1px solid var(--border);border-radius:16px;box-shadow:0 5px 22px rgba(20,35,26,.035)}
    .context-symbol{display:grid;flex:0 0 48px;width:48px;height:48px;place-items:center;color:var(--brand);background:var(--brand-soft);border-radius:13px;font-size:1.5rem}
    .context-copy{display:grid;gap:4px;min-width:180px;flex:1}
    .context-copy>span{color:var(--text-secondary);font-size:.63rem;font-weight:800;letter-spacing:.12em}
    .context-copy strong{font-size:1.05rem}.context-copy p{margin:0;color:var(--text-secondary);font-size:.78rem}
    .role-list{display:flex;justify-content:flex-end;flex-wrap:wrap;gap:7px}
    .role-chip{padding:7px 10px;color:var(--brand);background:var(--brand-soft);border:1px solid color-mix(in srgb,var(--brand) 18%,transparent);border-radius:7px;font-size:.68rem;font-weight:800}
    .role-chip.muted{color:var(--text-secondary);background:var(--surface-subtle);border-color:var(--border)}
    .metrics-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-top:18px}
    .metric-card{display:flex;align-items:center;gap:14px;min-height:102px;padding:18px;background:var(--surface-card);border:1px solid var(--border);border-radius:13px}
    .metric-icon{display:grid;flex:0 0 42px;width:42px;height:42px;place-items:center;background:var(--surface-subtle);border-radius:11px;font-size:1.15rem}
    .metric-card div{display:grid;gap:3px}.metric-card strong{font-size:1.55rem;letter-spacing:-.04em}.metric-card div span{color:var(--text-secondary);font-size:.75rem}
    .personal-shortcuts{margin-top:28px;padding:22px;background:var(--surface-card);border:1px solid var(--border);border-radius:15px}.personal-shortcuts h2{margin:0;font-size:1.35rem;letter-spacing:-.035em}.personal-shortcuts>div:first-child>p:last-child{margin:7px 0 0;color:var(--text-secondary);font-size:.8rem}.shortcut-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:11px;margin-top:18px}.shortcut-grid a{display:grid;gap:7px;padding:15px;color:var(--text-primary);background:var(--surface-subtle);border:1px solid var(--border);border-radius:11px;text-decoration:none}.shortcut-grid a:hover{border-color:var(--brand)}.shortcut-grid span{color:var(--brand);font-size:1.2rem}.shortcut-grid strong{font-size:.82rem}.shortcut-grid small{color:var(--text-secondary);font-size:.69rem;line-height:1.45}.modules-section{margin-top:42px}.section-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:18px}
    .section-heading .eyebrow{margin-bottom:7px}.section-heading h2{margin:0;font-size:1.55rem;letter-spacing:-.035em}.section-heading p:not(.eyebrow){margin:7px 0 0;color:var(--text-secondary);font-size:.82rem}
    .module-count{padding:7px 10px;color:var(--text-secondary);background:var(--surface-subtle);border:1px solid var(--border);border-radius:8px;font-size:.72rem;font-weight:750;white-space:nowrap}
    .module-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:15px}
    .module-card{min-height:190px;padding:20px;background:var(--surface-card);border:1px solid var(--border);border-radius:14px;transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}
    .module-card:hover{transform:translateY(-2px);border-color:color-mix(in srgb,var(--brand) 38%,var(--border));box-shadow:0 10px 26px rgba(20,35,26,.06)}
    .module-top{display:flex;align-items:center;justify-content:space-between;gap:10px}.module-icon{display:grid;width:42px;height:42px;place-items:center;color:var(--brand);background:var(--brand-soft);border-radius:11px;font-size:1.2rem}
    .access-indicator{display:flex;align-items:center;gap:6px;color:var(--text-secondary);font-size:.65rem;font-weight:700}.access-indicator i{width:7px;height:7px;background:#2e9c67;border-radius:50%}
    .module-card h3{margin:17px 0 6px;font-size:1rem}.module-card p{min-height:38px;margin:0;color:var(--text-secondary);font-size:.78rem;line-height:1.55}
    .module-foot{display:flex;justify-content:space-between;gap:12px;margin-top:17px;padding-top:12px;color:var(--text-secondary);border-top:1px solid var(--border);font-size:.63rem;font-weight:750}.module-foot span:last-child{color:#2e9c67}
    .empty-modules,.loading-panel,.message-panel{padding:38px 24px;text-align:center;background:var(--surface-card);border:1px solid var(--border);border-radius:14px}
    .empty-icon{display:grid;width:48px;height:48px;place-items:center;margin:0 auto 12px;color:var(--brand);background:var(--brand-soft);border-radius:13px;font-size:1.5rem}
    .empty-modules h3{margin:0 0 8px;font-size:1rem}.empty-modules p{max-width:510px;margin:0 auto;color:var(--text-secondary);font-size:.82rem;line-height:1.6}
    .loading-panel{display:flex;align-items:center;justify-content:center;gap:15px;text-align:left}.loading-panel p,.message-panel p{margin:5px 0 0;color:var(--text-secondary);font-size:.82rem}
    .loader{width:25px;height:25px;border:3px solid var(--border);border-top-color:var(--brand);border-radius:50%;animation:spin .8s linear infinite}
    .message-panel button{margin-top:15px;padding:9px 14px;color:#fff;background:var(--brand);border:0;border-radius:8px;font-weight:700;cursor:pointer}
    .error-panel{border-color:#d88a83}.summary-loading,.summary-notice{margin-top:16px;padding:13px 16px;color:var(--text-secondary);background:var(--surface-subtle);border-radius:9px;font-size:.78rem}
    .workspace-hint{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:24px;padding:17px 20px;background:var(--surface-subtle);border:1px solid var(--border);border-radius:12px}
    .workspace-hint strong{font-size:.82rem}.workspace-hint p{margin:5px 0 0;color:var(--text-secondary);font-size:.76rem}.workspace-hint>span{color:var(--brand);font-size:1.25rem}
    @keyframes spin{to{transform:rotate(360deg)}}
    @media(max-width:900px){.shortcut-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.metrics-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.module-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.context-banner{align-items:flex-start;flex-wrap:wrap}.role-list{justify-content:flex-start;width:100%;padding-left:66px}}
    @media(max-width:650px){.workspace{padding:32px 17px 54px}.personal-shortcuts{padding:17px}.shortcut-grid{grid-template-columns:1fr 1fr}.workspace-heading{align-items:flex-start;flex-direction:column}.heading-actions{align-items:stretch;flex-direction:column;width:100%}.context-picker{width:100%}.context-picker select{width:100%}.market-link{justify-content:center}.context-banner{padding:18px}.context-copy{min-width:calc(100% - 70px)}.role-list{padding-left:0}.metrics-grid{gap:9px}.metric-card{min-height:88px;padding:12px;gap:9px}.metric-icon{width:35px;height:35px;flex-basis:35px}.metric-card strong{font-size:1.25rem}.metric-card div span{font-size:.68rem}.modules-section{margin-top:32px}.module-grid{grid-template-columns:1fr}.module-card{min-height:170px}.section-heading{align-items:flex-start}.workspace-hint{align-items:flex-start}}
  `],
})
export class Dashboard implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly api = inject(DashboardApiService);
  private readonly workspace = inject(WorkspaceContextService);
  private readonly businessApi = inject(BusinessRegistrationApiService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly summaryLoading = signal(false);
  readonly error = signal('');
  readonly summaryError = signal('');
  readonly tenants = this.workspace.tenants;
  readonly selectedTenantId = this.workspace.activeTenantId;
  readonly permissions = this.workspace.permissions;
  readonly summary = signal<Record<string, string | number | null> | null>(null);

  private activeContextObserved = false;

  constructor() {
    effect(() => {
      const tenantId = this.workspace.activeTenantId();
      const permissions = untracked(() => this.workspace.permissions());
      if (!this.activeContextObserved) {
        this.activeContextObserved = true;
        return;
      }
      this.selectedTenantId.set(tenantId);
      this.permissions.set(permissions);
      this.summary.set(null);
      this.summaryError.set('');
      if (tenantId !== null && permissions.some((permission) => permission.permission_code === 'TENANT_MEMBERS_VIEW')) {
        void this.loadTenantSummary(tenantId);
      } else if (tenantId === null && !this.isPlatformContext()) {
        void this.loadConsumerSummary();
      }
    });
  }

  readonly selectedTenant = computed(() => this.tenants().find((tenant) => tenant.id === this.selectedTenantId()) ?? null);
  readonly isPlatformContext = computed(() => this.selectedTenantId() === null && this.permissions().some((permission) => permission.scope_type === 'PLATFORM'));
  readonly isPersonalContext = computed(() => this.selectedTenantId() === null && !this.isPlatformContext());
  readonly personalShortcuts = computed(() => {
    const definitions = [
      { permission: 'CUSTOMER_PROFILE_VIEW', title: 'My Profile & Addresses', description: 'Manage your details and saved delivery addresses.', icon: '♙', route: '/dashboard/customers' },
      { permission: 'ORDERS_VIEW', title: 'My Orders', description: 'Track orders placed with BBG businesses.', icon: '▤', route: '/dashboard/orders' },
      { permission: 'ENQUIRIES_VIEW', title: 'My Enquiries', description: 'Continue your conversations with businesses.', icon: '↗', route: '/dashboard/enquiries' },
      { permission: 'PAYMENTS_VIEW', title: 'My Payments', description: 'Review your customer payment activity.', icon: '₹', route: '/dashboard/payments' },
    ];
    return this.isPersonalContext() ? definitions : [];
  });
  readonly roleCodes = computed(() => [...new Set(this.permissions().map((permission) => permission.role_code))]);
  readonly firstName = computed(() => (this.auth.user()?.full_name || 'there').trim().split(/\s+/)[0]);
  readonly greeting = computed(() => {
    const hour = new Date().getHours();
    return hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  });

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const restored = await this.auth.restoreSession();
      if (!restored) {
        await this.router.navigate(['/login'], { queryParams: { returnUrl: '/dashboard' } });
        return;
      }
      if (!this.auth.user()) await this.auth.loadProfile();
      await this.workspace.initialize();
      const ownerTenant = this.workspace.tenants().find((tenant) =>
        (tenant.role_codes ?? '').split(',').map((role) => role.trim()).includes('TENANT_OWNER'),
      );
      if (ownerTenant) {
        const application = await this.businessApi.getMyApplication(ownerTenant.id);
        if (application && application.approval_status !== 'APPROVED') {
          await this.router.navigate(['/workspace']);
          return;
        }
      }
      const permissions = this.workspace.permissions();
      this.tenants.set(this.workspace.tenants());
      this.selectedTenantId.set(this.workspace.activeTenantId());
      this.permissions.set(permissions);
      this.summary.set(null);
      this.summaryError.set('');
      this.loading.set(false);
      if (this.selectedTenantId() !== null && permissions.some((permission) => permission.permission_code === 'TENANT_MEMBERS_VIEW')) {
        await this.loadTenantSummary(this.selectedTenantId()!);
      } else if (this.isPersonalContext()) {
        await this.loadConsumerSummary();
      }
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
      this.loading.set(false);
    }
  }

  async onTenantChange(event: Event): Promise<void> {
    const value = (event.target as HTMLSelectElement).value;
    const tenantId = value ? Number(value) : null;
    if (tenantId !== null && (!Number.isInteger(tenantId) || !this.tenants().some((tenant) => tenant.id === tenantId))) return;
    this.summary.set(null);
    this.summaryError.set('');
    this.loading.set(true);
    try {
      await this.workspace.switchWorkspace(tenantId);
      this.selectedTenantId.set(this.workspace.activeTenantId());
      this.permissions.set(this.workspace.permissions());
      this.tenants.set(this.workspace.tenants());
      this.loading.set(false);
      // Summary refresh follows the shared active-workspace signal.
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
      this.loading.set(false);
    }
  }

  private async loadConsumerSummary(): Promise<void> {
    this.summaryLoading.set(true);
    try {
      this.summary.set(await this.api.getConsumerSummary());
    } catch (error) {
      this.summaryError.set(this.auth.errorMessage(error));
    } finally {
      this.summaryLoading.set(false);
    }
  }

  private async loadTenantSummary(tenantId: number): Promise<void> {
    this.summaryLoading.set(true);
    try {
      this.summary.set(await this.api.getTenantSummary(tenantId));
    } catch (error) {
      this.summaryError.set(this.auth.errorMessage(error));
    } finally {
      this.summaryLoading.set(false);
    }
  }

  readonly summaryCards = computed(() => {
    const data = this.summary();
    if (!data) return [];
    if (this.selectedTenantId() !== null) {
      return [
        { label: 'Products', value: data['total_products'] ?? 0, icon: '▦' },
        { label: 'Pending orders', value: data['pending_orders'] ?? 0, icon: '▤' },
        { label: 'Open enquiries', value: data['open_enquiries'] ?? 0, icon: '↗' },
        { label: 'Published promotions', value: data['published_promotions'] ?? 0, icon: '✳' },
      ];
    }
    return [
      { label: 'My orders', value: data['total_orders'] ?? 0, icon: '▤' },
      { label: 'Active orders', value: data['active_orders'] ?? 0, icon: '↗' },
      { label: 'Paid orders', value: data['paid_orders'] ?? 0, icon: '₹' },
      { label: 'Open enquiries', value: data['open_enquiries'] ?? 0, icon: '✉' },
    ];
  });

  roleLabel(role: string): string {
    return role.toLowerCase().split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
  }
}
