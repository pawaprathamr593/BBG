import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { DashboardApiService } from '../../core/dashboard/dashboard-api.service';
import { WorkspaceContextService } from '../../core/workspace/workspace-context.service';
import { BusinessRegistrationApiService } from '../../core/business/business-registration-api.service';
import { WorkspaceNavIconComponent } from '../workspace/workspace-nav-icon';
import { getWorkspaceNavItems } from '../workspace/workspace-navigation';
import { MetricCardComponent } from '../../shared/components/metric-card/metric-card.component';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, WorkspaceNavIconComponent, MetricCardComponent, SkeletonLoaderComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
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
  readonly myBusinessesCount = signal(0);

  private activeContextObserved = false;
  private summaryLoadSequence = 0;
  private readonly summaryRefreshVersion = signal(0);

  constructor() {
    effect(() => {
      const tenantId = this.workspace.activeTenantId();
      const context = this.workspace.activeContext();
      const permissions = untracked(() => this.workspace.permissions());
      this.summaryRefreshVersion();

      if (!this.activeContextObserved) {
        this.activeContextObserved = true;
        return;
      }

      // Invalidate requests from the previous context before starting a new
      // summary load. Personal and Platform contexts both have a null tenant ID.
      this.summaryLoadSequence += 1;
      this.selectedTenantId.set(tenantId);
      this.permissions.set(permissions);
      this.summary.set(null);
      this.summaryError.set('');

      if (tenantId !== null && context === 'BUSINESS') {
        void this.loadTenantSummary(tenantId);
      } else if (context === 'PERSONAL') {
        void this.loadConsumerSummary();
      } else if (context === 'PLATFORM') {
        void this.loadPlatformSummary();
      } else {
        this.summaryLoading.set(false);
      }
    });
  }

  readonly selectedTenant = computed(
    () => {
      const selId = this.selectedTenantId();
      if (selId === null || selId === undefined) return null;
      return this.tenants().find((tenant) => Number(tenant.id) === Number(selId)) ?? null;
    },
  );
  readonly isPlatformContext = computed(() => this.workspace.activeContext() === 'PLATFORM');
  readonly isPersonalContext = computed(() => this.workspace.activeContext() === 'PERSONAL');
  readonly isBusinessContext = computed(() => this.workspace.activeContext() === 'BUSINESS');
  readonly moduleCards = computed(() => {
    const context = this.workspace.activeContext();
    if (!context) return [];
    return getWorkspaceNavItems(
      context,
      this.permissions(),
      this.selectedTenant()?.active_entitlements ?? null,
    );
  });
  readonly roleCodes = computed(() => [
    ...new Set(this.permissions().map((permission) => permission.role_code)),
  ]);
  readonly firstName = computed(
    () => (this.auth.user()?.full_name || 'there').trim().split(/\s+/)[0],
  );
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
      const previousContext = this.workspace.activeContext();
      const previousTenantId = this.workspace.activeTenantId();
      await this.workspace.initialize();
      const activeTenant = this.workspace.activeTenant();
      const activeTenantIsOwned = (activeTenant?.role_codes ?? '')
        .split(',')
        .map((role) => role.trim())
        .includes('TENANT_OWNER');
      if (activeTenant && activeTenantIsOwned) {
        const application = await this.businessApi.getMyApplication(activeTenant.id);
        if (application && application.approval_status !== 'APPROVED') {
          await this.router.navigate(['/dashboard/businesses']);
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

      if (
        previousContext === this.workspace.activeContext() &&
        previousTenantId === this.workspace.activeTenantId()
      ) {
        this.summaryRefreshVersion.update((version) => version + 1);
      }
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
      this.loading.set(false);
    }
  }

  private async loadConsumerSummary(): Promise<void> {
    const requestId = ++this.summaryLoadSequence;
    this.summaryLoading.set(true);
    try {
      const [summary, applications] = await Promise.all([
        this.api.getConsumerSummary(),
        this.businessApi.getMyApplications().catch(() => []),
      ]);
      if (requestId === this.summaryLoadSequence && this.workspace.activeContext() === 'PERSONAL') {
        this.myBusinessesCount.set(applications.length);
        this.summary.set(summary);
      }
    } catch (error) {
      if (requestId === this.summaryLoadSequence) {
        this.summaryError.set(this.auth.errorMessage(error));
      }
    } finally {
      if (requestId === this.summaryLoadSequence) this.summaryLoading.set(false);
    }
  }

  private async loadTenantSummary(tenantId: number): Promise<void> {
    const requestId = ++this.summaryLoadSequence;
    this.summaryLoading.set(true);
    try {
      const summary = await this.api.getTenantSummary(tenantId);
      if (requestId === this.summaryLoadSequence && this.workspace.activeTenantId() === tenantId) {
        this.summary.set(summary);
      }
    } catch (error) {
      if (requestId === this.summaryLoadSequence) {
        this.summaryError.set(this.auth.errorMessage(error));
      }
    } finally {
      if (requestId === this.summaryLoadSequence) this.summaryLoading.set(false);
    }
  }

  private async loadPlatformSummary(): Promise<void> {
    const requestId = ++this.summaryLoadSequence;
    this.summaryLoading.set(true);
    try {
      const summary = await this.api.getPlatformSummary();
      if (requestId === this.summaryLoadSequence && this.workspace.activeContext() === 'PLATFORM') {
        this.summary.set(summary);
      }
    } catch (error) {
      if (requestId === this.summaryLoadSequence) {
        this.summaryError.set(this.auth.errorMessage(error));
      }
    } finally {
      if (requestId === this.summaryLoadSequence) this.summaryLoading.set(false);
    }
  }

  readonly summaryCards = computed(() => {
    const data = this.summary();
    const context = this.workspace.activeContext();
    if (!data) return [];

    if (context === 'BUSINESS') {
      const planName = String(data['current_plan'] || '').trim();
      const planDisplay = planName ? planName.toUpperCase() : 'ACTIVE PLAN';
      const subStatus = String(data['subscription_status'] || 'Active').trim();
      const openEnq = data['open_enquiries'] ?? 0;
      const pubPromo = data['published_promotions'] ?? 0;

      return [
        {
          label: 'Subscription Plan',
          value: planDisplay,
          icon: '★',
          subtitle: `Status: ${subStatus}`,
        },
        {
          label: 'Catalogue Products',
          value: data['total_products'] ?? 0,
          icon: '▦',
          subtitle: 'Active products listed',
        },
        {
          label: 'Enquiries & Feed',
          value: `${openEnq} Enquiries`,
          icon: '✉',
          subtitle: `${pubPromo} published promotions`,
        },
      ];
    }

    if (context === 'PLATFORM') {
      const totalUsers = data['total_users'] ?? 0;
      const totalBiz = data['total_businesses'] ?? 0;
      return [
        {
          label: 'Pending Approvals',
          value: data['pending_businesses'] ?? 0,
          icon: '⏳',
          subtitle: 'Registrations awaiting review',
        },
        {
          label: 'Active Subscriptions',
          value: data['active_subscriptions'] ?? 0,
          icon: '★',
          subtitle: 'Approved merchant plans',
        },
        {
          label: 'Platform Users',
          value: totalUsers,
          icon: '👥',
          subtitle: `${totalBiz} registered businesses`,
        },
      ];
    }

    // PERSONAL CONTEXT
    const openEnq = data['open_enquiries'] ?? 0;
    return [
      {
        label: 'My Businesses',
        value: this.myBusinessesCount(),
        icon: '🏛',
        subtitle: 'Registered business entities',
      },
      {
        label: 'Open Enquiries',
        value: openEnq,
        icon: '✉',
        subtitle: 'Marketplace enquiries sent',
      },
      {
        label: 'Account Status',
        value: 'Active',
        icon: '✓',
        subtitle: 'Verified consumer profile',
      },
    ];
  });

  roleLabel(role: string): string {
    return role
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
}
