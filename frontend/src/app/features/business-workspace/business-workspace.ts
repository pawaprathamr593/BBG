import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { BusinessApplication, BusinessRegistrationApiService } from '../../core/business/business-registration-api.service';
import { WorkspaceContextService } from '../../core/workspace/workspace-context.service';

@Component({
  selector: 'app-business-workspace',
  standalone: true,
  template: `
    <main class="status-page">
      @if (loading()) {
        <section class="status-card loading"><span class="spinner"></span><div><strong>Opening your business workspace</strong><p>Checking your registration status…</p></div></section>
      } @else if (error()) {
        <section class="status-card"><p class="eyebrow">BBG BUSINESS WORKSPACE</p><h1>We couldn’t load your registration</h1><p>{{ error() }}</p><button type="button" (click)="load()">Try again</button></section>
      } @else if (application(); as business) {
        <section class="status-card">
          <p class="eyebrow">BBG BUSINESS WORKSPACE</p>
          <div class="status-heading"><div><h1>{{ business.business_name }}</h1><p>{{ business.business_slug }}</p></div><span class="status-pill" [attr.data-status]="business.approval_status">{{ statusLabel(business.approval_status) }}</span></div>
          <div class="status-symbol" [attr.data-status]="business.approval_status">{{ business.approval_status === 'APPROVED' ? '✓' : business.approval_status === 'REJECTED' ? '!' : '…' }}</div>
          @if (business.approval_status === 'PENDING') {
            <h2>Registration under review</h2><p>Your business registration has been submitted successfully. Our team is reviewing the information. This workspace is currently limited to checking your registration status.</p>
          } @else if (business.approval_status === 'REJECTED') {
            <h2>Further information is required</h2><p>Your business registration was not approved in its current form. Please contact BBG support for guidance.</p>
            @if (business.rejection_reason) { <div class="reason"><strong>Review note</strong><span>{{ business.rejection_reason }}</span></div> }
          } @else {
            <h2>Business approved</h2><p>Your business registration is approved. Opening your business workspace…</p>
          }
          <div class="business-summary"><span><small>Business</small><strong>{{ business.business_name }}</strong></span><span><small>Registration status</small><strong>{{ statusLabel(business.approval_status) }}</strong></span><span><small>Location</small><strong>{{ locationLabel(business) }}</strong></span></div>
          <button class="market-button" type="button" (click)="visitMarketplace()">Visit marketplace <span aria-hidden="true">↗</span></button>
        </section>
      }
    </main>
  `,
  styles: [`
    :host{display:block;min-height:100%;background:var(--surface-page);color:var(--text-primary)}.status-page{display:grid;min-height:65vh;place-items:start center;padding:54px 18px 76px}
    .status-card{width:min(760px,100%);padding:clamp(22px,4vw,42px);background:var(--surface-card);border:1px solid var(--border);border-radius:18px;box-shadow:0 16px 48px rgba(18,45,30,.055)}
    .eyebrow{margin:0 0 12px;color:var(--brand);font-size:.68rem;font-weight:800;letter-spacing:.14em}.status-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}.status-heading h1{margin:0;font-size:clamp(1.8rem,4vw,2.5rem);letter-spacing:-.05em}.status-heading p{margin:7px 0 0;color:var(--text-secondary);font-size:.8rem}
    .status-pill{padding:7px 11px;border-radius:999px;background:var(--surface-subtle);border:1px solid var(--border);font-size:.7rem;font-weight:800;white-space:nowrap}.status-pill[data-status="PENDING"]{color:#8a6412;background:#fff8e4;border-color:#ead9a7}.status-pill[data-status="APPROVED"]{color:#176b43;background:#e8f5ed;border-color:#c8e6d2}.status-pill[data-status="REJECTED"]{color:#a3322b;background:#fff2f0;border-color:#f0c8c2}
    .status-symbol{display:grid;width:54px;height:54px;place-items:center;margin:30px 0 16px;color:#8a6412;background:#fff8e4;border-radius:15px;font-size:1.6rem;font-weight:850}.status-symbol[data-status="APPROVED"]{color:#176b43;background:#e8f5ed}.status-symbol[data-status="REJECTED"]{color:#a3322b;background:#fff2f0}
    h2{margin:0 0 8px;font-size:1.2rem}.status-card>p:not(.eyebrow){max-width:620px;color:var(--text-secondary);font-size:.88rem;line-height:1.65}
    .business-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:25px;padding:17px;background:var(--surface-subtle);border:1px solid var(--border);border-radius:12px}.business-summary span{display:grid;gap:5px;min-width:0}.business-summary small{color:var(--text-secondary);font-size:.68rem}.business-summary strong{overflow-wrap:anywhere;font-size:.8rem}
    .reason{display:grid;gap:5px;margin-top:15px;padding:14px;background:var(--surface-subtle);border-radius:9px;font-size:.8rem}.reason span{color:var(--text-secondary);line-height:1.55}
    .market-button,.status-card button{margin-top:24px;padding:11px 16px;color:#fff;background:var(--brand);border:0;border-radius:9px;font:inherit;font-size:.8rem;font-weight:750;cursor:pointer}.loading{display:flex;align-items:center;gap:15px}.loading p{margin:4px 0 0;color:var(--text-secondary);font-size:.8rem}.spinner{width:25px;height:25px;border:3px solid var(--border);border-top-color:var(--brand);border-radius:50%;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
    @media(max-width:600px){.status-page{padding:28px 12px 50px}.status-heading{flex-direction:column}.business-summary{grid-template-columns:1fr}}
  `],
})
export class BusinessWorkspace implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly api = inject(BusinessRegistrationApiService);
  private readonly workspace = inject(WorkspaceContextService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly application = signal<BusinessApplication | null>(null);

  ngOnInit(): void { void this.load(); }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      if (!await this.auth.restoreSession()) {
        await this.router.navigate(['/']);
        return;
      }
      if (!this.auth.user()) await this.auth.loadProfile();
      const application = await this.api.getMyApplication();
      if (!application) {
        await this.router.navigate(['/business/register']);
        return;
      }
      this.application.set(application);
      if (application.approval_status === 'APPROVED') {
        await this.workspace.initialize();
        await this.workspace.switchWorkspace(application.tenant_id);
        await this.router.navigate(['/dashboard']);
        return;
      }
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  locationLabel(business: BusinessApplication): string {
    return [business.city, business.state].filter((part): part is string => !!part).join(', ') || 'Not provided';
  }

  statusLabel(status: string): string {
    return status === 'APPROVED' ? 'Approved' : status === 'REJECTED' ? 'Needs attention' : 'Pending review';
  }

  visitMarketplace(): void { void this.router.navigate(['/']); }
}
