import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import {
  ApplicationSubscription,
  BusinessRegistrationApiService,
  SubscriptionPlan,
} from '../../core/business/business-registration-api.service';
import {
  GracePeriodInfo,
  getGracePeriodInfo,
  parseOfferedPlanFeatures,
} from '../../core/subscription/subscription-plan.utils';
import { BcnBadgeComponent } from '../../shared/components/bcn-badge/bcn-badge.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';

export interface SubscriptionDetail extends ApplicationSubscription {
  approved_on?: string | null;
  proofs?: Array<{
    id: number;
    payment_reference?: string | null;
    proof_file_path?: string | null;
    proof_file_url?: string | null;
    submitted_on?: string | null;
    review_status?: string | null;
    review_notes?: string | null;
  }>;
}

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

  // Checkout Drawer state signals
  readonly drawerOpen = signal(false);
  readonly selectedPlan = signal<SubscriptionPlan | null>(null);
  readonly drawerMode = signal<'renewal' | 'upgrade'>('renewal');
  readonly drawerReference = signal('');
  readonly drawerProofFile = signal<File | null>(null);
  readonly drawerBusy = signal(false);
  readonly drawerError = signal('');
  readonly cancellingPending = signal(false);
  readonly copiedUpi = signal(false);
  readonly paymentInstructions = signal<{
    payment_payee_name: string;
    payment_upi_id: string;
    payment_qr_url: string | null;
    payment_instructions: string | null;
  } | null>(null);

  // Subscription Details Drawer state signals
  readonly detailDrawerOpen = signal(false);
  readonly selectedDetail = signal<SubscriptionDetail | null>(null);
  readonly loadingDetail = signal(false);
  readonly detailError = signal('');
  readonly detailNotice = signal('');
  readonly resubmitReference = signal('');
  readonly resubmitProofFile = signal<File | null>(null);
  readonly resubmitting = signal(false);

  activeSubscription(): ApplicationSubscription | null {
    return (
      this.subscriptions().find(
        (item) =>
          item.subscription_status === 'ACTIVE' || item.subscription_status === 'GRACE_PERIOD',
      ) ?? null
    );
  }

  expiredSubscription(): ApplicationSubscription | null {
    return this.subscriptions().find((item) => item.subscription_status === 'EXPIRED') ?? null;
  }

  pendingSubscription(): ApplicationSubscription | null {
    return this.subscriptions().find((item) => item.subscription_status === 'PENDING') ?? null;
  }

  graceInfo(subscription?: ApplicationSubscription | null): GracePeriodInfo {
    const target = subscription ?? this.activeSubscription();
    return getGracePeriodInfo(target?.subscription_status, target?.ends_on);
  }

  planFeatures(rawEntitlements: string | null | undefined): string[] {
    return parseOfferedPlanFeatures(rawEntitlements);
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
      if (pending && pending.subscription_status === 'PENDING') {
        if (pending.latest_proof_review_status === 'PENDING') {
          this.step.set('submitted');
        } else {
          this.step.set('overview');
        }
      } else {
        this.step.set('overview');
      }
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  async loadPaymentInstructions(): Promise<void> {
    if (this.paymentInstructions()) return;
    try {
      const instructions = await this.api.getPaymentInstructions();
      this.paymentInstructions.set(instructions);
    } catch {
      // Fallback instructions if API is not yet populated
      this.paymentInstructions.set({
        payment_payee_name: 'Bavdhan Business Group',
        payment_upi_id: 'payments@bbg',
        payment_qr_url: null,
        payment_instructions:
          'Scan with any UPI application (Google Pay, PhonePe, Paytm, or BHIM) and upload screenshot.',
      });
    }
  }

  openRenewalDrawer(subscription: ApplicationSubscription): void {
    const matchingPlan =
      this.plans().find((p) => p.id === subscription.plan_id) ??
      ({
        id: subscription.plan_id,
        plan_code: subscription.plan_code || 'RENEWAL',
        plan_name: subscription.plan_name,
        price: String(subscription.amount),
        currency: subscription.currency,
        billing_cycle: subscription.billing_cycle,
        description: subscription.description || subscription.plan_description || '',
        entitlements: subscription.entitlements || subscription.plan_entitlements || '',
      } as SubscriptionPlan);

    this.selectedPlan.set(matchingPlan);
    this.drawerMode.set('renewal');
    this.drawerReference.set('');
    this.drawerProofFile.set(null);
    this.drawerError.set('');
    this.drawerOpen.set(true);
    void this.loadPaymentInstructions();
  }

  openUpgradeDrawer(plan: SubscriptionPlan): void {
    this.selectedPlan.set(plan);
    this.drawerMode.set('upgrade');
    this.drawerReference.set('');
    this.drawerProofFile.set(null);
    this.drawerError.set('');
    this.drawerOpen.set(true);
    void this.loadPaymentInstructions();
  }

  selectPlanInDrawer(plan: SubscriptionPlan): void {
    this.selectedPlan.set(plan);
    const active = this.activeSubscription();
    if (active && plan.id === active.plan_id) {
      this.drawerMode.set('renewal');
    } else {
      this.drawerMode.set('upgrade');
    }
  }

  onPlanSelectChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const planId = Number(select.value);
    const chosen = this.plans().find((p) => p.id === planId);
    if (chosen) {
      this.selectPlanInDrawer(chosen);
    }
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
    this.drawerError.set('');
    this.drawerProofFile.set(null);
    this.drawerReference.set('');
  }

  onDrawerProofSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.drawerProofFile.set(input.files?.[0] ?? null);
  }

  async copyUpiId(upiId: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(upiId);
      this.copiedUpi.set(true);
      setTimeout(() => this.copiedUpi.set(false), 2000);
    } catch {
      // Ignore clipboard write failure
    }
  }

  async submitDrawerPayment(): Promise<void> {
    const plan = this.selectedPlan();
    const file = this.drawerProofFile();
    if (!plan) {
      this.drawerError.set('Please select a subscription plan.');
      return;
    }
    if (!file) {
      this.drawerError.set('Please select and upload your payment receipt before submitting.');
      return;
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      this.drawerError.set('Only JPG, PNG, WebP or PDF files are supported.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.drawerError.set('File size exceeds the 10MB limit.');
      return;
    }
    if (this.drawerBusy()) return;

    this.drawerBusy.set(true);
    this.drawerError.set('');
    try {
      const active = this.activeSubscription();
      const expired = this.expiredSubscription();
      let createdPending: ApplicationSubscription;

      if (active) {
        if (plan.id === active.plan_id) {
          createdPending = await this.api.requestApplicationSubscriptionRenewal(
            this.tenantId,
            active.id,
          );
        } else {
          createdPending = await this.api.requestApplicationSubscriptionUpgrade(
            this.tenantId,
            active.id,
            plan.id,
          );
        }
      } else if (expired) {
        if (plan.id === expired.plan_id) {
          createdPending = await this.api.requestApplicationSubscriptionRenewal(
            this.tenantId,
            expired.id,
          );
        } else {
          createdPending = await this.api.requestApplicationSubscriptionUpgrade(
            this.tenantId,
            expired.id,
            plan.id,
          );
        }
      } else {
        // Fallback: renew or choose
        createdPending = await this.api.requestApplicationSubscriptionUpgrade(
          this.tenantId,
          0,
          plan.id,
        );
      }

      try {
        await this.api.uploadApplicationPaymentProof(
          null,
          this.tenantId,
          createdPending.id,
          file,
          this.drawerReference(),
        );
      } catch (uploadErr) {
        // Rollback newly created pending subscription request if proof upload fails
        try {
          await this.api.cancelApplicationSubscription(this.tenantId, createdPending.id);
        } catch {
          await this.load();
        }
        throw uploadErr;
      }

      this.closeDrawer();
      this.notice.set(
        'Your subscription request and payment proof have been submitted for admin verification.',
      );
      await this.load();
    } catch (error) {
      this.drawerError.set(this.auth.errorMessage(error));
    } finally {
      this.drawerBusy.set(false);
    }
  }

  async cancelPendingRequest(subscriptionId: number): Promise<void> {
    if (this.cancellingPending()) return;
    this.cancellingPending.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      await this.api.cancelApplicationSubscription(this.tenantId, subscriptionId);
      this.notice.set('The pending subscription request has been cancelled.');
      await this.load();
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    } finally {
      this.cancellingPending.set(false);
    }
  }

  async openDetail(subscription: ApplicationSubscription): Promise<void> {
    this.selectedDetail.set(subscription);
    this.detailDrawerOpen.set(true);
    this.detailError.set('');
    this.detailNotice.set('');
    this.resubmitReference.set('');
    this.resubmitProofFile.set(null);
    this.loadingDetail.set(true);
    try {
      const fullDetail = await this.api.getSubscriptionDetail(this.tenantId, subscription.id);
      this.selectedDetail.set({ ...subscription, ...fullDetail });
    } catch {
      // Keep basic subscription info if detail API call fails
    } finally {
      this.loadingDetail.set(false);
    }
  }

  closeDetailDrawer(): void {
    this.detailDrawerOpen.set(false);
    this.selectedDetail.set(null);
    this.resubmitProofFile.set(null);
    this.resubmitReference.set('');
    this.detailError.set('');
    this.detailNotice.set('');
  }

  onResubmitFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.resubmitProofFile.set(input.files?.[0] ?? null);
  }

  async submitResubmittedProof(): Promise<void> {
    const detail = this.selectedDetail();
    const file = this.resubmitProofFile();
    if (!detail || !file || this.resubmitting()) {
      this.detailError.set('Choose your revised payment receipt before submitting.');
      return;
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      this.detailError.set('Only JPG, PNG, WebP or PDF files are supported.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.detailError.set('File size exceeds the 10MB limit.');
      return;
    }
    this.resubmitting.set(true);
    this.detailError.set('');
    this.detailNotice.set('');
    try {
      await this.api.uploadApplicationPaymentProof(
        null,
        this.tenantId,
        detail.id,
        file,
        this.resubmitReference(),
      );
      this.detailNotice.set('Your revised payment proof has been submitted for admin review.');
      await this.load();
      try {
        const updated = await this.api.getSubscriptionDetail(this.tenantId, detail.id);
        this.selectedDetail.set({ ...detail, ...updated });
      } catch {
        // Fallback
      }
      this.resubmitProofFile.set(null);
    } catch (error) {
      this.detailError.set(this.auth.errorMessage(error));
    } finally {
      this.resubmitting.set(false);
    }
  }

  // Compatibility handlers for step === 'payment'
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
