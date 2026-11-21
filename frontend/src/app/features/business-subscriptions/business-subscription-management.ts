import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import {
  ApplicationSubscription,
  BusinessRegistrationApiService,
  SubscriptionPlan,
} from '../../core/business/business-registration-api.service';
import { BcnBadgeComponent } from '../../shared/components/bcn-badge/bcn-badge.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-business-subscription-management',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, BcnBadgeComponent, StatusBadgeComponent],
  templateUrl: './business-subscription-management.html',
  styleUrl: './business-subscription-management.scss',
})
export class BusinessSubscriptionManagement implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly api = inject(BusinessRegistrationApiService);

  readonly tenantId = Number(this.route.snapshot.queryParamMap.get('tenant_id') ?? 0);
  readonly subscriptions = signal<ApplicationSubscription[]>([]);
  readonly plans = signal<SubscriptionPlan[]>([]);
  readonly payment = signal<ApplicationSubscription | null>(null);
  readonly step = signal<'overview' | 'payment' | 'submitted'>('overview');
  readonly paymentReference = signal('');
  readonly proofFile = signal<File | null>(null);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = signal('');

  activeSubscription(): ApplicationSubscription | null {
    return this.subscriptions().find((item) => item.subscription_status === 'ACTIVE') ?? null;
  }

  expiredSubscription(): ApplicationSubscription | null {
    return this.subscriptions().find((item) => item.subscription_status === 'EXPIRED') ?? null;
  }

  async ngOnInit(): Promise<void> {
    if (!Number.isInteger(this.tenantId) || this.tenantId < 1) {
      this.error.set('A valid business workspace is required.');
      return;
    }
    try {
      if (!(await this.auth.restoreSession())) {
        await this.router.navigate(['/login'], {
          queryParams: { returnUrl: '/business/subscriptions?tenant_id=' + this.tenantId },
        });
        return;
      }
      await this.load();
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    }
  }

  async load(): Promise<void> {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    try {
      const [subscriptions, plans, pending] = await Promise.all([
        this.api.listOwnedSubscriptions(this.tenantId),
        this.api.getActivePlans(),
        this.api.getCurrentApplicationSubscription(null, this.tenantId),
      ]);
      this.subscriptions.set(subscriptions);
      this.plans.set(plans);
      this.payment.set(pending);
      if (pending) {
        this.step.set(
          pending.subscription_status === 'PENDING' &&
            pending.latest_proof_review_status === 'PENDING'
            ? 'submitted'
            : 'payment',
        );
      } else {
        this.step.set('overview');
      }
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  async requestUpgrade(plan: SubscriptionPlan): Promise<void> {
    const active = this.activeSubscription();
    if (!active || plan.id === active.plan_id || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      const pending = await this.api.requestApplicationSubscriptionUpgrade(
        this.tenantId,
        active.id,
        plan.id,
      );
      this.payment.set(pending);
      this.step.set('payment');
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  async requestRenewal(subscription: ApplicationSubscription): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      const pending = await this.api.requestApplicationSubscriptionRenewal(
        this.tenantId,
        subscription.id,
      );
      this.payment.set(pending);
      this.step.set('payment');
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  onProofSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.proofFile.set(input.files?.[0] ?? null);
  }

  async submitProof(): Promise<void> {
    const payment = this.payment();
    const file = this.proofFile();
    if (!payment || !file || this.busy()) {
      this.error.set('Choose your payment receipt before submitting.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      await this.api.uploadApplicationPaymentProof(
        null,
        this.tenantId,
        payment.id,
        file,
        this.paymentReference(),
      );
      this.step.set('submitted');
      this.notice.set('Your payment proof has been submitted for admin review.');
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  async returnToOverview(): Promise<void> {
    await this.load();
  }
}
