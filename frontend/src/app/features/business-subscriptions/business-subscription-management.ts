import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ApplicationSubscription, BusinessRegistrationApiService, SubscriptionPlan } from '../../core/business/business-registration-api.service';

@Component({
  selector: 'app-business-subscription-management',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <main class="subscription-page">
      <section class="subscription-card">
        <a class="back-link" routerLink="/workspace">← Back to your businesses</a>
        <p class="eyebrow">BUSINESS WORKSPACE</p>
        <h1>Subscriptions &amp; billing</h1>
        <p class="intro">Review your current plan, request an upgrade or renewal, and submit payment proof for admin review.</p>
        @if (error()) { <div class="notice error" role="alert">{{ error() }}</div> }
        @if (notice()) { <div class="notice success" role="status">{{ notice() }}</div> }

        @if (loading()) {
          <p class="state-message">Loading subscription details…</p>
        } @else if (step() === 'overview') {
          @if (activeSubscription(); as active) {
            <section class="current-plan">
              <div><span>Current plan</span><h2>{{ active.plan_name }}</h2><p>{{ active.billing_cycle }} · {{ active.currency }} {{ active.amount }}</p></div>
              <span class="status-pill active">ACTIVE</span>
            </section>
            <div class="section-heading"><div><h2>Upgrade your plan</h2><p>Your current subscription stays active until the replacement is approved.</p></div></div>
            <div class="plan-grid">
              @for (plan of plans(); track plan.id) {
                <article class="plan-option">
                  <div><span>{{ plan.plan_code }}</span><h3>{{ plan.plan_name }}</h3><p>{{ plan.description || 'Business subscription plan' }}</p></div>
                  <strong>{{ plan.currency }} {{ plan.price }}</strong>
                  <small>{{ plan.billing_cycle }}</small>
                  <button class="primary-button" type="button" (click)="requestUpgrade(plan)" [disabled]="busy() || plan.id === active.plan_id">{{ plan.id === active.plan_id ? 'Current plan' : 'Upgrade to this plan' }}</button>
                </article>
              }
            </div>
            <section class="renew-section"><div><h2>Renew current plan</h2><p>Request another billing period on your current plan.</p></div><button class="secondary-button" type="button" (click)="requestRenewal(active)" [disabled]="busy()">Request renewal</button></section>
          } @else if (expiredSubscription(); as expired) {
            <section class="current-plan"><div><span>Last subscription</span><h2>{{ expired.plan_name }}</h2><p>{{ expired.billing_cycle }} · {{ expired.currency }} {{ expired.amount }}</p></div><span class="status-pill expired">EXPIRED</span></section>
            <section class="renew-section"><div><h2>Renew your plan</h2><p>Submit a renewal request. Your subscription becomes active after payment proof approval.</p></div><button class="primary-button" type="button" (click)="requestRenewal(expired)" [disabled]="busy()">Renew current plan</button></section>
          } @else {
            <p class="state-message">No active or expired subscription was found for this business.</p>
          }
          <section class="history-section">
            <h2>Subscription history</h2>
            @for (item of subscriptions(); track item.id) {
              <div class="history-row"><div><strong>{{ item.plan_name }}</strong><span>{{ item.created_on }}</span></div><span class="status-pill">{{ item.subscription_status }}</span></div>
            }
          </section>
        } @else if (step() === 'payment') {
          @if (payment(); as item) {
            <section class="payment-panel">
              <div class="payment-summary"><div><span>Selected plan</span><strong>{{ item.plan_name }}</strong></div><div><span>Amount due</span><strong>{{ item.currency }} {{ item.amount }}</strong></div></div>
              @if (item.subscription_status === 'REJECTED' && item.rejection_reason) { <div class="notice error">Previous payment proof was rejected: {{ item.rejection_reason }}</div> }
              @if (item.payment_qr_url) { <div class="qr-panel"><img [src]="item.payment_qr_url" alt="BBG subscription payment QR code" /><span>Scan using your UPI app</span></div> }
              @if (item.payment_payee_name) { <p class="payment-line"><strong>Payee:</strong> {{ item.payment_payee_name }}</p> }
              @if (item.payment_upi_id) { <p class="payment-line"><strong>UPI ID:</strong> {{ item.payment_upi_id }}</p> }
              @if (item.payment_instructions) { <p class="payment-line">{{ item.payment_instructions }}</p> }
              <label class="field"><span>Payment reference / UTR (optional)</span><input [value]="paymentReference()" (input)="paymentReference.set($any($event.target).value)" maxlength="120" placeholder="Enter UTR or transaction reference" /></label>
              <label class="field"><span>Payment receipt *</span><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" (change)="onProofSelected($event)" /><small>{{ proofFile()?.name || 'JPG, PNG, WEBP or PDF' }}</small></label>
              <button class="primary-button" type="button" (click)="submitProof()" [disabled]="busy() || !proofFile()">{{ busy() ? 'Uploading…' : 'Submit payment proof' }}</button>
            </section>
          }
        } @else {
          <section class="submitted-panel"><div class="success-icon">✓</div><h2>Payment proof submitted</h2><p>Your subscription request is awaiting BBG admin review. Your existing plan remains active until the replacement is approved.</p><button class="primary-button" type="button" (click)="returnToOverview()">Back to subscriptions</button></section>
        }
      </section>
    </main>
  `,
  styles: [`
    :host{display:block;min-height:100%;background:var(--surface-page);color:var(--text-primary)}
    .subscription-page{display:grid;place-items:start center;padding:clamp(20px,4vw,48px) 16px}.subscription-card{width:min(1000px,100%);padding:clamp(20px,4vw,38px);background:var(--surface-card);border:1px solid var(--border);border-radius:18px}
    .back-link{display:inline-block;margin-bottom:26px;color:var(--text-secondary);font-size:.78rem;text-decoration:none}.eyebrow{margin:0 0 9px;color:var(--brand);font-size:.67rem;font-weight:850;letter-spacing:.13em}h1{margin:0;font-size:clamp(1.8rem,4vw,2.35rem);letter-spacing:-.04em}.intro{margin:9px 0 24px;color:var(--text-secondary);font-size:.86rem;line-height:1.55}
    .notice{margin:0 0 16px;padding:11px 13px;border-radius:9px;font-size:.78rem}.notice.error{color:#a32929;background:#fceeee}.notice.success{color:#176b43;background:#e8f5ed}.state-message{color:var(--text-secondary);font-size:.8rem}
    .current-plan,.renew-section{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px;background:var(--surface-subtle);border:1px solid var(--border);border-radius:12px}.current-plan span:not(.status-pill){color:var(--text-secondary);font-size:.7rem}.current-plan h2{margin:5px 0;font-size:1.2rem}.current-plan p,.renew-section p{margin:0;color:var(--text-secondary);font-size:.75rem}.status-pill{padding:6px 9px;color:var(--text-secondary);background:var(--surface-page);border:1px solid var(--border);border-radius:7px;font-size:.65rem;font-weight:850}.status-pill.active{color:#176b43;background:#e8f5ed}.status-pill.expired{color:#98630b;background:#fff4dd}
    .section-heading{margin:24px 0 12px}.section-heading h2,.renew-section h2,.history-section h2{margin:0;font-size:1rem}.section-heading p{margin:5px 0 0;color:var(--text-secondary);font-size:.74rem}
    .plan-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}.plan-option{display:grid;align-content:start;gap:9px;padding:16px;background:var(--surface-card);border:1px solid var(--border);border-radius:12px}.plan-option>div>span{color:var(--brand);font-size:.65rem;font-weight:850}.plan-option h3{margin:5px 0;font-size:.98rem}.plan-option p{margin:0;color:var(--text-secondary);font-size:.73rem;line-height:1.45}.plan-option strong{font-size:1.05rem}.plan-option small{color:var(--text-secondary);font-size:.7rem}
    .primary-button,.secondary-button{padding:11px 14px;border:0;border-radius:9px;font:inherit;font-size:.77rem;font-weight:800;cursor:pointer}.primary-button{color:#fff;background:var(--brand)}.secondary-button{color:var(--text-primary);background:var(--surface-page);border:1px solid var(--border)}button:disabled{opacity:.55;cursor:wait}
    .renew-section{margin-top:16px}.history-section{display:grid;gap:10px;margin-top:24px}.history-row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px;background:var(--surface-subtle);border-radius:9px}.history-row>div{display:grid;gap:4px}.history-row strong{font-size:.78rem}.history-row span:not(.status-pill){color:var(--text-secondary);font-size:.68rem}
    .payment-panel{display:grid;gap:14px}.payment-summary{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:15px;background:var(--surface-subtle);border:1px solid var(--border);border-radius:10px}.payment-summary div{display:grid;gap:5px}.payment-summary span{color:var(--text-secondary);font-size:.7rem}.payment-summary strong{font-size:.9rem}.qr-panel{display:grid;justify-items:center;gap:8px;padding:18px;background:#fff;border:1px solid var(--border);border-radius:10px}.qr-panel img{width:min(230px,100%);height:auto}.qr-panel span{color:#4b5563;font-size:.72rem}.payment-line{margin:0;padding:10px 12px;background:var(--surface-subtle);border-radius:8px;font-size:.76rem;line-height:1.5}.field{display:grid;gap:7px}.field span{font-size:.75rem;font-weight:750}.field input{width:100%;padding:11px 12px;color:var(--text-primary);background:var(--surface-page);border:1px solid var(--border);border-radius:8px;font:inherit;font-size:.82rem}
    .submitted-panel{display:grid;justify-items:center;text-align:center;padding:30px 10px}.success-icon{display:grid;width:56px;height:56px;place-items:center;color:#176b43;background:#e8f5ed;border-radius:50%;font-size:1.7rem;font-weight:850}.submitted-panel h2{margin:15px 0 5px}.submitted-panel p{max-width:520px;color:var(--text-secondary);font-size:.8rem;line-height:1.6}
    @media(max-width:620px){.current-plan,.renew-section{align-items:stretch;flex-direction:column}.current-plan .status-pill{align-self:flex-start}.payment-summary{grid-template-columns:1fr}.history-row{align-items:flex-start}}
  `],
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
      if (!await this.auth.restoreSession()) {
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
        this.step.set(pending.subscription_status === 'PENDING' && pending.latest_proof_review_status === 'PENDING'
          ? 'submitted'
          : 'payment');
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
      const pending = await this.api.requestApplicationSubscriptionUpgrade(this.tenantId, active.id, plan.id);
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
      const pending = await this.api.requestApplicationSubscriptionRenewal(this.tenantId, subscription.id);
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
      await this.api.uploadApplicationPaymentProof(null, this.tenantId, payment.id, file, this.paymentReference());
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
