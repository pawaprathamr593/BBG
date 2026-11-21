import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import {
  BusinessApplication,
  BusinessRegistrationApiService,
} from '../../core/business/business-registration-api.service';
import { WorkspaceContextService } from '../../core/workspace/workspace-context.service';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-business-workspace',
  standalone: true,
  imports: [StatusBadgeComponent, PaginationComponent],
  templateUrl: './business-workspace.html',
  styleUrl: './business-workspace.scss',
})
export class BusinessWorkspace implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly api = inject(BusinessRegistrationApiService);
  private readonly workspace = inject(WorkspaceContextService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly applications = signal<BusinessApplication[]>([]);
  readonly currentPage = signal(1);
  readonly pageSize = 3;
  readonly visibleApplications = computed(() => {
    const all = this.applications();
    const totalPages = Math.max(1, Math.ceil(all.length / this.pageSize));
    const safePage = Math.min(this.currentPage(), totalPages);
    const start = (safePage - 1) * this.pageSize;
    return all.slice(start, start + this.pageSize);
  });
  readonly rejectedPaymentBusinessIds = signal<number[]>([]);
  readonly rejectedPaymentReasons = signal<Record<number, string>>({});

  onPageChange(page: number): void {
    this.currentPage.set(page);
  }

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      if (!(await this.auth.restoreSession())) {
        await this.router.navigate(['/']);
        return;
      }
      if (!this.auth.user()) await this.auth.loadProfile();
      const applications = await this.api.getMyApplications();
      if (!applications.length) {
        await this.router.navigate(['/dashboard/businesses/register']);
        return;
      }
      this.applications.set(applications);
      const rejectedPaymentStates = await Promise.all(
        applications
          .filter((business) => business.approval_status === 'PENDING')
          .map(async (business) => {
            try {
              const subscription = await this.api.getCurrentApplicationSubscription(
                business.business_id,
                business.tenant_id,
              );
              return subscription?.subscription_status === 'REJECTED'
                ? { businessId: business.business_id, reason: subscription.rejection_reason ?? '' }
                : null;
            } catch {
              return null;
            }
          }),
      );
      const rejectedPayments = rejectedPaymentStates.filter(
        (item): item is { businessId: number; reason: string } => item !== null,
      );
      this.rejectedPaymentBusinessIds.set(rejectedPayments.map((item) => item.businessId));
      this.rejectedPaymentReasons.set(
        Object.fromEntries(rejectedPayments.map((item) => [item.businessId, item.reason])),
      );
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  locationLabel(business: BusinessApplication): string {
    return (
      [business.city, business.state].filter((part): part is string => !!part).join(', ') ||
      'Not provided'
    );
  }

  statusLabel(status: string): string {
    return status === 'APPROVED'
      ? 'Approved'
      : status === 'REJECTED'
        ? 'Needs attention'
        : status === 'DRAFT'
          ? 'Draft'
          : 'Pending review';
  }

  resumeDraft(business: BusinessApplication): void {
    if (business.approval_status !== 'DRAFT') return;
    void this.router.navigate(['/dashboard/businesses/register'], {
      queryParams: { business_id: business.business_id, tenant_id: business.tenant_id },
    });
  }

  registerAnotherBusiness(): void {
    void this.router.navigate(['/dashboard/businesses/register']);
  }

  resumePayment(business: BusinessApplication): void {
    if (!this.rejectedPaymentBusinessIds().includes(business.business_id)) return;
    void this.router.navigate(['/dashboard/businesses/register'], {
      queryParams: { business_id: business.business_id, tenant_id: business.tenant_id },
    });
  }

  async manageSubscription(business: BusinessApplication): Promise<void> {
    if (business.approval_status !== 'APPROVED') return;
    try {
      await this.workspace.switchWorkspace(business.tenant_id);
      await this.router.navigate(['/dashboard/subscriptions']);
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    }
  }

  async manageStorefront(business: BusinessApplication): Promise<void> {
    if (business.approval_status !== 'APPROVED') return;
    try {
      await this.workspace.switchWorkspace(business.tenant_id);
      await this.router.navigate(['/dashboard/storefront']);
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    }
  }

  async manageTeam(business: BusinessApplication): Promise<void> {
    if (business.approval_status !== 'APPROVED') return;
    try {
      await this.workspace.switchWorkspace(business.tenant_id);
      await this.router.navigate(['/dashboard/members']);
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    }
  }

  async openWorkspace(business: BusinessApplication): Promise<void> {
    if (business.approval_status !== 'APPROVED') return;
    try {
      await this.workspace.initialize();
      await this.workspace.switchWorkspace(business.tenant_id);
      await this.router.navigate(['/dashboard']);
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    }
  }

  visitMarketplace(): void {
    void this.router.navigate(['/']);
  }
}
